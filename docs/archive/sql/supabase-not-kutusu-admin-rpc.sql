-- ============================================================
-- NOT KUTUSU — Admin Onay/Red RPC'leri
-- ============================================================
-- admin_ders_onayla fonksiyonunun tam tanımı incelenerek AYNI kalıp takip edildi:
--
--   - Mutasyon RPC'leri (admin_soru_onayla / admin_soru_reddet / admin_soru_sil):
--     admin_ders_onayla ile BİREBİR aynı şekil — geçersiz token'da
--     json {"basarili": false, "hata": "yetkisiz"} DÖNERLER (exception fırlatmazlar).
--     Panel tarafında bunlar adminYetkisizIseGirisEkraninaDon(sonuc) ile kontrol ediliyor.
--
--   - Listeleme RPC'si (admin_soru_listele): panel kodundaki
--     "admin_ano_gruplari_getir / admin_ano_grup_sayisi gibi liste/skaler dönen okuma
--     RPC'leri" kalıbını takip ediyor — geçersiz token'da json değil, 'yetkisiz'
--     mesajlı bir SQL EXCEPTION fırlatıyor. Panel tarafında bu, error.message içinde
--     'yetkisiz' aranarak (oturumSuresiDolduMuKontrolEt) kontrol ediliyor.
--
-- NEDEN SECURITY DEFINER GEREKİYOR:
-- public.sorular tablosunun RLS'i (supabase-not-kutusu-kurulum.sql) normal kullanıcıların
-- SADECE onaylanmış soruları + kendi sorularını görmesine izin veriyor. Admin paneli KTÜ
-- öğrenci oturumu açmadan, sadece admin_token ile anon key üzerinden çalıştığı için, bekleyen/
-- tüm soruları görebilmesi için bu RLS'i SECURITY DEFINER ile bypass eden fonksiyonlara
-- ihtiyaç var — admin_ders_onayla'nın dersler tablosunda yaptığı işin aynısı.
--
-- ŞEMA (not-kutusu.js'teki sorgulardan doğrulandı):
--   fakulteler(id, ad)
--   bolumler(id, ad, fakulte_id)
--   dersler(id, ders_adi, ders_kodu, bolum_id, onaylandi)
--   sorular(id, ders_id, kullanici_id, sinav_turu, akademik_yil, fotograf_yolu, durum, olusturulma_tarihi)

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
                'fotograf_yolu', s.fotograf_yolu,
                'durum', s.durum,
                'olusturulma_tarihi', s.olusturulma_tarihi
            ) as satir
        from public.sorular s
        join public.dersler d on d.id = s.ders_id
        join public.bolumler b on b.id = d.bolum_id
        join public.fakulteler f on f.id = b.fakulte_id
        left join auth.users u on u.id = s.kullanici_id
        where p_durum is null or s.durum = p_durum
    ) x;

    return sonuc;
end;
$function$;

create or replace function public.admin_soru_onayla(p_admin_token text, p_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then
        return json_build_object('basarili', false, 'hata', 'yetkisiz');
    end if;
    update public.sorular set durum = 'onaylandi' where id = p_id;
    return json_build_object('basarili', true);
end;
$function$;

create or replace function public.admin_soru_reddet(p_admin_token text, p_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then
        return json_build_object('basarili', false, 'hata', 'yetkisiz');
    end if;
    -- Not: admin_ders_reddet dersi tamamen SİLİYOR, ama sorular tablosunda 'reddedildi'
    -- diye ayrı bir durum zaten var (bkz. kurulum SQL'indeki check constraint) — o yüzden
    -- burada silmek yerine durumu güncelliyoruz; kayıt izi kalıyor. Kalıcı silme için
    -- ayrıca admin_soru_sil eklendi (onaylı/reddedilmiş bir soruyu tamamen kaldırmak için).
    update public.sorular set durum = 'reddedildi' where id = p_id;
    return json_build_object('basarili', true);
end;
$function$;

create or replace function public.admin_soru_sil(p_admin_token text, p_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then
        return json_build_object('basarili', false, 'hata', 'yetkisiz');
    end if;
    delete from public.sorular where id = p_id;
    return json_build_object('basarili', true);
end;
$function$;

-- ============================================================
-- Bu dosyayı Supabase SQL Editor'de çalıştırdıktan sonra panel-mtas-7f5t.html
-- dosyasındaki yeni "🗃️ Not Kutusu Onayları" sekmesi çalışmaya başlayacak.
-- Ekstra bir GRANT gerekmiyor — admin_ders_onayla'nın tanımında da açık bir GRANT
-- yoktu, fonksiyonlar varsayılan olarak PUBLIC'e (dolayısıyla anon key'e) EXECUTE
-- izniyle oluşuyor; gerçek yetki kontrolü zaten fonksiyon içindeki
-- _admin_token_gecerli_mi() kontrolünde yapılıyor.
-- ============================================================
