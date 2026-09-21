-- ============================================================
-- NOT KUTUSU — Çıkmış Soru Elemanları (fotoğraf/PDF ekleri)
-- ============================================================
-- Bu dosyayı Supabase projenizde SQL Editor'e yapıştırıp ÇALIŞTIRIN (RUN).
--
-- ÖNEMLİ (v5.2/v5.3 güncellemesi): Ekler (fotoğraf VE PDF) artık Supabase
-- Storage'da DEĞİL, Cloudflare R2'de tutuluyor (gerekçe: Supabase'in
-- ücretsiz planındaki 5GB/ay egress sınırı, R2'nin egress'i her zaman
-- ücretsiz olduğu için bizim kullanım şeklimizde daha sürdürülebilir).
-- Bu yüzden bu dosyada artık bir Storage bucket'ı veya storage.objects
-- RLS policy'si YOK — yükleme/okuma tamamen ayrı bir Cloudflare Worker
-- üzerinden yapılıyor (bkz. cloudflare-worker/worker.js). Bu SQL dosyası
-- sadece veritabanı tarafını (sütun + admin RPC'ler) hazırlar.
--
-- NE YAPIYOR:
--   * public.sorular.fotograf_yolu (tekil, hep NULL kalan eski sütun)
--     KALDIRILIYOR, yerine public.sorular.element_yollari (text[],
--     en fazla 3 eleman, check constraint ile sınırlı) EKLENİYOR.
--     Bu sütun artık Supabase Storage yolu değil, R2'deki nesne
--     anahtarını tutuyor (ör. "3f2a.../8b1c-....jpg" veya "....pdf") —
--     Worker'ın GET /<yol> ucuyla birleştirilerek görüntülenebilir/
--     indirilebilir URL üretilir. Fotoğraf VEYA PDF olabilir; uzantıya
--     bakılarak istemci tarafında ayırt edilir.
--   * admin_soru_listele fonksiyonu, admin panelinin soruları
--     onaylarken/reddederken eklenen dosyaları da görebilmesi için
--     element_yollari döndürecek şekilde güncellendi.
--   * YENİ: admin_nk_dersler_listele(p_admin_token) — admin panelde
--     kullanıcıların "Dersim listede yok" ile ekledikleri nk_dersler
--     kayıtlarını listelemek için (Dersler yönetim arayüzü bunu kullanıyor).
--
-- Not: Bir soru admin tarafından reddedilir/silinirse veya kullanıcı
-- "beklemede" durumundaki sorusunu silerse, ilgili R2 dosyaları OTOMATİK
-- silinmiyor (bilerek eklenmedi — ileride bir "temizlik" script'i ile
-- eklenebilir). Şimdilik zararsız artık dosyalar birikebilir, sadece
-- R2'deki (ücretsiz 10GB'a kadar olan) depolama alanını kullanır.
--
-- Bu dosyayı daha önce (Storage bucket'lı eski haliyle) çalıştırdıysanız
-- sorun değil — bu sürüm o bucket'a/policy'lere dokunmuyor, sadece
-- artık kullanılmıyorlar. İsterseniz Supabase panelinden Storage →
-- nk-soru-fotograflari bucket'ını elle silebilirsiniz (zorunlu değil;
-- bu eski isim sadece o zamanlar oluşturulmuş Storage bucket'ına ait,
-- yeni R2 sistemiyle bir ilgisi yok).
--
-- Tamamı (create or replace, if not exists vb.) baştan çalıştırmak
-- güvenlidir.
-- ============================================================

-- ------------------------------------------------------------
-- 1) public.sorular — tekil fotograf_yolu yerine çoklu element_yollari
-- ------------------------------------------------------------
alter table public.sorular drop column if exists fotograf_yolu;

alter table public.sorular
    add column if not exists element_yollari text[] not null default '{}'::text[];

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'sorular_element_max3'
    ) then
        alter table public.sorular add constraint sorular_element_max3
            check (array_length(element_yollari, 1) is null or array_length(element_yollari, 1) <= 3);
    end if;
end $$;

-- ------------------------------------------------------------
-- 2) admin_soru_listele GÜNCELLENDİ — artık element_yollari döndürüyor
--    (supabase-not-kutusu-klasor-sistemi.sql'deki tanımın yerine geçer,
--    aynı imza/davranış, sadece bu tek alan değişti)
-- ------------------------------------------------------------
create or replace function public.admin_soru_listele(p_admin_token text, p_durum text default 'beklemede')
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
    sonuc json;
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then
        raise exception 'yetkisiz';
    end if;

    select coalesce(json_agg(x.satir order by x.olusturulma_tarihi asc), '[]'::json)
    into sonuc
    from (
        select
            s.olusturulma_tarihi,
            json_build_object(
                'id', s.id,
                'ders_id', s.ders_id,
                'ders_adi', d.ders_adi,
                'ders_kodu', d.ders_kodu,
                'bolum_adi', b.ad,
                'fakulte_adi', f.ad,
                'kullanici_email', u.email,
                'sinav_turu', s.sinav_turu,
                'akademik_yil', s.akademik_yil,
                'element_yollari', s.element_yollari,
                'durum', s.durum,
                'olusturulma_tarihi', s.olusturulma_tarihi
            ) as satir
        from public.sorular s
        join public.nk_dersler d on d.id = s.ders_id
        join public.bolumler b on b.id = d.bolum_id
        join public.fakulteler f on f.id = b.fakulte_id
        left join auth.users u on u.id = s.kullanici_id
        where p_durum is null or s.durum = p_durum
    ) x;

    return sonuc;
end;
$function$;

-- ------------------------------------------------------------
-- 3) YENİ — admin_nk_dersler_listele: admin panelin "Not Kutusu
--    Dersleri" arayüzü için, kullanıcıların moderasyonsuz eklediği
--    nk_dersler kayıtlarını (kim eklemiş, kaç soru var vb.) listeler.
--    admin_nk_ders_sil / admin_nk_ders_duzenle zaten mevcuttu
--    (supabase-not-kutusu-klasor-sistemi.sql) — bu sadece listeleme.
-- ------------------------------------------------------------
create or replace function public.admin_nk_dersler_listele(p_admin_token text)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
    sonuc json;
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then
        raise exception 'yetkisiz';
    end if;

    select coalesce(json_agg(x.satir order by x.olusturulma_tarihi desc), '[]'::json)
    into sonuc
    from (
        select
            d.olusturulma_tarihi,
            json_build_object(
                'id', d.id,
                'ders_adi', d.ders_adi,
                'ders_kodu', d.ders_kodu,
                'bolum_adi', b.ad,
                'fakulte_adi', f.ad,
                'ekleyen_email', u.email,
                'soru_sayisi', (select count(*) from public.sorular s where s.ders_id = d.id),
                'olusturulma_tarihi', d.olusturulma_tarihi
            ) as satir
        from public.nk_dersler d
        join public.bolumler b on b.id = d.bolum_id
        join public.fakulteler f on f.id = b.fakulte_id
        left join auth.users u on u.id = d.ekleyen_kullanici_id
    ) x;

    return sonuc;
end;
$function$;

-- ============================================================
-- Kurulum tamam. Bundan sonra not-kutusu.html'deki "Soru Paylaş"
-- formunda en fazla 3 dosya (fotoğraf VEYA PDF) seçilip yüklenebilecek
-- (Cloudflare Worker üzerinden R2'ye), admin panelde de hem "Not Kutusu
-- Onayları" sekmesinde soruların ekleri hem de yeni "Not Kutusu
-- Dersleri" alt-tablosu görünecek.
-- ============================================================
