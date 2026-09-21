-- ============================================================
-- KULLANICI PROFİLİ + BİRLEŞİK OYUN GİRİŞİ — Kurulum
-- ============================================================
-- Bu dosyayı Supabase projenizde SQL Editor'e yapıştırıp ÇALIŞTIRIN (RUN).
--
-- NE YAPIYOR:
--   Site genelinde tek bir giriş sistemi olsun istendi (Not Kutusu'nun
--   KTÜ öğrenci e-postası + şifre sistemi). Not Yakala oyununun kendi
--   ayrı kullanıcı adı+şifre hesap sistemi bu dosyayla ARTIK KULLANILMIYOR
--   — yeni oyuncular artık aynı (Supabase Auth) oturumu üzerinden, sadece
--   bir "oyun kullanıcı adı" seçerek liderlik tablosuna girebiliyor.
--
--   * Yeni public.kullanici_profilleri tablosu: her auth kullanıcısının
--     (isteğe bağlı) oyun kullanıcı adını ve en yüksek skorunu tutar.
--   * Yeni public.oyun_skor_loglari tablosu: haftalık liderlik tablosu için.
--   * Yeni RPC'ler: oyun_kullanici_adi_ayarla, oyun_skor_gonder,
--     oyun_liderlik_tablosu, oyun_liderlik_tablosu_haftalik.
--   * Eski Not Yakala hesap sistemi (ny_kullanicilar, ny_oyun_loglari)
--     SİLİNMİYOR — kullanıcının kararı: eski skorlar liderlik tablosunda
--     DONUK/GEÇMİŞ olarak görünmeye devam etsin. Sadece yeni hesap
--     açma/giriş yapma/skor gönderme fonksiyonlarının (ny_kayit_ol,
--     ny_giris_yap, ny_skor_gonder) anon/authenticated izinleri iptal
--     ediliyor ki artık kimse bu eski sistemle yeni hesap açamasın —
--     ny_liderlik_tablosu(_haftalik), ny_misafir_oyun_kaydet ve
--     ny_admin_istatistik dokunulmadan kalıyor (admin panel / eski
--     veri hâlâ okunabilir olsun diye).
--
--   Not: script.js'te daha önce referans verilen ny_oturum_olustur /
--   ny_oturum_dogrula / ny_oturum_iptal fonksiyonlarının tanımı bu
--   oturumda elimde değildi (muhtemelen daha önce elle/Supabase panelden
--   eklenmiş, dosyası kaydedilmemiş) — onlara bu dosyada DOKUNULMADI.
--   Artık site tarafında hiç çağrılmayacaklar; istersen ileride Supabase
--   SQL Editor'den elle "drop function" ile temizleyebilirsin, zorunlu
--   değil (çağrılmayan bir fonksiyonun durması zararsızdır).
--
-- Bu dosyayı daha önce çalıştırdıysan sorun değil — tamamı
-- (CREATE OR REPLACE, CREATE TABLE IF NOT EXISTS vb.) baştan
-- çalıştırmak güvenlidir, veri kaybı olmaz.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Kullanıcı profilleri tablosu
-- ------------------------------------------------------------
create table if not exists public.kullanici_profilleri (
    id                  uuid primary key references auth.users(id) on delete cascade,
    oyun_kullanici_adi  text,
    en_yuksek_skor      integer not null default 0,
    olusturulma_tarihi  timestamptz not null default now(),
    guncelleme_tarihi   timestamptz not null default now()
);

-- Oyun kullanıcı adı boş olmayan satırlar arasında, büyük/küçük harf
-- duyarsız şekilde benzersiz olsun (aynı ny_kullanicilar'daki desen).
create unique index if not exists kullanici_profilleri_oyun_adi_lower_idx
    on public.kullanici_profilleri (lower(oyun_kullanici_adi))
    where oyun_kullanici_adi is not null;

alter table public.kullanici_profilleri enable row level security;

-- Kullanıcı sadece KENDİ profil satırını görebilir. Insert/update için
-- policy YOK — bunlar sadece aşağıdaki oyun_kullanici_adi_ayarla() RPC'si
-- üzerinden (SECURITY DEFINER, format+küfür+tekillik kontrolünden geçerek)
-- yapılabiliyor, doğrudan tabloya yazılamıyor.
drop policy if exists "kullanici_profilleri_select_own" on public.kullanici_profilleri;
create policy "kullanici_profilleri_select_own" on public.kullanici_profilleri
    for select
    to authenticated
    using (id = auth.uid());

revoke insert, update, delete on public.kullanici_profilleri from anon, authenticated;

-- ------------------------------------------------------------
-- 2) Oyun skor logları (haftalık liderlik tablosu için) — ny_oyun_loglari
--    ile aynı desen, tamamen kilitli, sadece RPC üzerinden yazılabilir.
-- ------------------------------------------------------------
create table if not exists public.oyun_skor_loglari (
    id             bigint generated always as identity primary key,
    kullanici_id   uuid not null references auth.users(id) on delete cascade,
    skor           integer not null,
    created_at     timestamptz not null default now()
);

alter table public.oyun_skor_loglari enable row level security;
revoke all on public.oyun_skor_loglari from anon, authenticated;

-- ------------------------------------------------------------
-- 3) Oyun kullanıcı adı belirleme/değiştirme
--    (ny_kayit_ol'daki format + küfür filtresiyle aynı desen; ayrıca
--    hem yeni sistemdeki hem DONUK eski sistemdeki adlarla çakışmayı
--    engeller ki liderlik tablosunda aynı isim iki kez görünmesin.)
-- ------------------------------------------------------------
create or replace function public.oyun_kullanici_adi_ayarla(p_ad text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_uid uuid := auth.uid();
    v_ad text := trim(coalesce(p_ad, ''));
    v_normal text;
    v_kelime text;
    v_yasakli text[] := array[
        'amk', 'aq', 'yarrak', 'yarak', 'siktir', 'sik', 'pic', 'orospu', 'kahpe',
        'ibne', 'gavat', 'got', 'bok', 'salak', 'gerizekali',
        'fuck', 'shit', 'bitch', 'nigger', 'cunt', 'faggot', 'porn', 'sex', 'amcik',
        'surtuk', 'pezevenk', 'yavsak'
    ];
begin
    if v_uid is null then
        return json_build_object('basarili', false, 'hata', 'giris_gerekli');
    end if;

    if v_ad !~ '^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_]{3,20}$' then
        return json_build_object('basarili', false, 'hata', 'gecersiz_ad');
    end if;

    v_normal := lower(v_ad);
    v_normal := translate(v_normal, 'çğıöşü', 'cgiosu');
    v_normal := replace(v_normal, '0', 'o');
    v_normal := replace(v_normal, '1', 'i');
    v_normal := replace(v_normal, '3', 'e');
    v_normal := replace(v_normal, '4', 'a');
    v_normal := replace(v_normal, '5', 's');
    v_normal := replace(v_normal, '7', 't');
    v_normal := replace(v_normal, '_', '');

    foreach v_kelime in array v_yasakli loop
        if position(v_kelime in v_normal) > 0 then
            return json_build_object('basarili', false, 'hata', 'yasakli_kelime');
        end if;
    end loop;

    if exists (
        select 1 from public.kullanici_profilleri
        where lower(oyun_kullanici_adi) = lower(v_ad) and id <> v_uid
    ) or exists (
        select 1 from public.ny_kullanicilar where lower(kullanici_adi) = lower(v_ad)
    ) then
        return json_build_object('basarili', false, 'hata', 'ad_alinmis');
    end if;

    insert into public.kullanici_profilleri (id, oyun_kullanici_adi, guncelleme_tarihi)
    values (v_uid, v_ad, now())
    on conflict (id) do update
        set oyun_kullanici_adi = excluded.oyun_kullanici_adi,
            guncelleme_tarihi = now();

    return json_build_object('basarili', true, 'oyun_kullanici_adi', v_ad);
end;
$$;

-- ------------------------------------------------------------
-- 4) Skor gönderme — artık kullanıcı adı/şifre almıyor, oturum (auth.uid())
--    üzerinden çalışıyor. Oyun kullanıcı adı ayarlanmamışsa reddeder
--    ('ad_gerekli') — site tarafı bu durumda kullanıcıya adı belirleme
--    formunu gösterecek.
-- ------------------------------------------------------------
create or replace function public.oyun_skor_gonder(p_skor integer)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_uid uuid := auth.uid();
    v_profil public.kullanici_profilleri%rowtype;
    v_yeni_rekor boolean := false;
    v_guncel_en_yuksek integer;
begin
    if v_uid is null then
        return json_build_object('basarili', false, 'hata', 'giris_gerekli');
    end if;

    if p_skor is null or p_skor < 0 or p_skor > 100000 then
        return json_build_object('basarili', false, 'hata', 'gecersiz_skor');
    end if;

    select * into v_profil from public.kullanici_profilleri where id = v_uid;

    if not found or v_profil.oyun_kullanici_adi is null then
        return json_build_object('basarili', false, 'hata', 'ad_gerekli');
    end if;

    if p_skor > v_profil.en_yuksek_skor then
        v_yeni_rekor := true;
        v_guncel_en_yuksek := p_skor;
    else
        v_guncel_en_yuksek := v_profil.en_yuksek_skor;
    end if;

    update public.kullanici_profilleri
    set en_yuksek_skor = v_guncel_en_yuksek,
        guncelleme_tarihi = now()
    where id = v_uid;

    insert into public.oyun_skor_loglari (kullanici_id, skor) values (v_uid, p_skor);

    return json_build_object(
        'basarili', true,
        'yeni_rekor', v_yeni_rekor,
        'en_yuksek_skor', v_guncel_en_yuksek,
        'oyun_kullanici_adi', v_profil.oyun_kullanici_adi
    );
end;
$$;

-- ------------------------------------------------------------
-- 5) Liderlik tablosu — TÜM ZAMANLAR: yeni sistem + DONUK eski sistem
--    birlikte, skora göre sıralı. 'kaynak' alanı site tarafında
--    kullanılmıyor ama ileride "eski hesap" rozeti göstermek istenirse
--    diye bırakıldı.
-- ------------------------------------------------------------
create or replace function public.oyun_liderlik_tablosu(p_limit integer default 10)
returns table(kullanici_adi text, en_yuksek_skor integer, kaynak text)
language sql
security definer
set search_path = public, extensions
as $$
    select kullanici_adi, en_yuksek_skor, kaynak from (
        select oyun_kullanici_adi as kullanici_adi, en_yuksek_skor, 'yeni'::text as kaynak
        from public.kullanici_profilleri
        where oyun_kullanici_adi is not null and en_yuksek_skor > 0
        union all
        select kullanici_adi, en_yuksek_skor, 'eski'::text as kaynak
        from public.ny_kullanicilar
        where en_yuksek_skor > 0
    ) birlesik
    order by en_yuksek_skor desc
    limit least(coalesce(p_limit, 10), 50);
$$;

-- ------------------------------------------------------------
-- 6) Liderlik tablosu — HAFTALIK: bu hafta (Pazartesi 00:00'dan itibaren)
--    atılan skorlar. Geçiş haftasında eski sistemden kalan (henüz bu
--    hafta içinde atılmış) skorlar da dahil edilir — eski sistem
--    donduğu için bu doğal olarak birkaç hafta içinde kendiliğinden
--    sadece yeni sistemi gösterir hale gelir, ekstra bir şey yapmaya
--    gerek yok.
-- ------------------------------------------------------------
create or replace function public.oyun_liderlik_tablosu_haftalik(p_limit integer default 10)
returns table(kullanici_adi text, en_yuksek_skor integer, kaynak text)
language sql
security definer
set search_path = public, extensions
as $$
    select kullanici_adi, en_yuksek_skor, kaynak from (
        select p.oyun_kullanici_adi as kullanici_adi, max(l.skor) as en_yuksek_skor, 'yeni'::text as kaynak
        from public.oyun_skor_loglari l
        join public.kullanici_profilleri p on p.id = l.kullanici_id
        where l.created_at >= date_trunc('week', now())
          and p.oyun_kullanici_adi is not null
        group by p.oyun_kullanici_adi
        union all
        select kullanici_adi, max(skor) as en_yuksek_skor, 'eski'::text as kaynak
        from public.ny_oyun_loglari
        where kullanici_adi is not null
          and created_at >= date_trunc('week', now())
        group by kullanici_adi
    ) birlesik
    where en_yuksek_skor > 0
    order by en_yuksek_skor desc
    limit least(coalesce(p_limit, 10), 50);
$$;

-- ------------------------------------------------------------
-- 7) Yetkilendirme
-- ------------------------------------------------------------
revoke all on function public.oyun_kullanici_adi_ayarla(text) from public;
revoke all on function public.oyun_skor_gonder(integer) from public;
revoke all on function public.oyun_liderlik_tablosu(integer) from public;
revoke all on function public.oyun_liderlik_tablosu_haftalik(integer) from public;

grant execute on function public.oyun_kullanici_adi_ayarla(text) to authenticated;
grant execute on function public.oyun_skor_gonder(integer) to authenticated;
grant execute on function public.oyun_liderlik_tablosu(integer) to anon, authenticated;
grant execute on function public.oyun_liderlik_tablosu_haftalik(integer) to anon, authenticated;

-- ------------------------------------------------------------
-- 8) Eski Not Yakala hesap sistemini DONDUR — yeni hesap açma / giriş /
--    skor gönderme artık kapalı. Mevcut veriler (ny_kullanicilar,
--    ny_oyun_loglari) SİLİNMEDİ, yukarıdaki liderlik fonksiyonları
--    onları hâlâ (donuk/geçmiş olarak) okuyor. ny_liderlik_tablosu(_haftalik),
--    ny_misafir_oyun_kaydet ve ny_admin_istatistik'e DOKUNULMADI.
-- ------------------------------------------------------------
-- Bu üç eski fonksiyonun gerçek parametre imzası elimizde kayıtlı değildi
-- (muhtemelen elle/panelden eklenmiş), bu yüzden isme göre pg_proc'tan
-- bulup dinamik olarak revoke ediyoruz — imza tahmin etmeye gerek kalmıyor
-- ve fonksiyon zaten yoksa/adı farklıysa sessizce atlanır, hata vermez.
do $$
declare
    r record;
begin
    for r in
        select p.oid::regprocedure as imza
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('ny_kayit_ol', 'ny_giris_yap', 'ny_skor_gonder')
    loop
        execute format('revoke execute on function %s from anon, authenticated', r.imza);
    end loop;
end $$;

-- ============================================================
-- Kurulum tamam. Test etmek için (kendi hesabınla giriş yapmış olarak,
-- Supabase SQL Editor'de "Run as" ile gerçek bir kullanıcı JWT'si
-- simüle edemeyeceğin için bu üç fonksiyonu site üzerinden test etmen
-- gerekiyor — SQL Editor'den çağırırsan auth.uid() NULL döner ve
-- 'giris_gerekli' alırsın, bu normaldir):
--   select oyun_liderlik_tablosu();
--   select oyun_liderlik_tablosu_haftalik();
-- ============================================================
