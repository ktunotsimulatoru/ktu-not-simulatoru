-- ============================================================
-- NOT YAKALA — Hesap Sistemi ve Liderlik Tablosu Kurulumu
-- ============================================================
-- Bu dosyayı Supabase projenizde SQL Editor'e yapıştırıp
-- ÇALIŞTIRIN (RUN). Site tarafındaki kod (script.js) bu
-- fonksiyonların var olduğunu varsayarak çalışır.
--
-- Güvenlik modeli:
--   * ny_kullanicilar tablosunun kendisi RLS ile tamamen kapalı —
--     ne anon ne de authenticated rolü doğrudan SELECT/INSERT/UPDATE
--     yapabilir. Tabloya erişimin tek yolu aşağıdaki fonksiyonlardır.
--   * Şifreler asla düz metin olarak saklanmaz; pgcrypto'nun
--     bcrypt (blowfish) algoritmasıyla hash'lenir.
--   * Fonksiyonlar SECURITY DEFINER olduğu için tablo erişimi
--     fonksiyon içinde, sahibinin (postgres) yetkisiyle olur;
--     dışarıya asla sifre_hash döndürülmez.
--   * Bu, admin panelindeki check_admin_password fonksiyonuyla
--     aynı güvenlik desenini takip eder.
--
-- Not: Bu basit bir "mini oyun liderlik tablosu" içindir, banka
-- seviyesinde bir kimlik doğrulama sistemi değildir. Yine de
-- şifreler asla okunabilir şekilde saklanmaz.
--
-- v2 güncellemesi: ny_kayit_ol fonksiyonuna küfür/uygunsuz kelime
-- filtresi eklendi.
--
-- v3 güncellemesi (ÖNEMLİ DÜZELTME): Bu projede pgcrypto uzantısı
-- "public" şemasına değil "extensions" şemasına kurulu olduğu için
-- fonksiyonlardaki "set search_path = public" satırı gen_salt/crypt
-- fonksiyonlarını bulamıyordu ("function gen_salt(unknown, integer)
-- does not exist" hatası). Artık "set search_path = public,
-- extensions" olarak düzeltildi.
--
-- v4 güncellemesi: Admin paneli için oyun istatistikleri eklendi.
--   * ny_kullanicilar tablosuna oyun_sayisi sütunu eklendi.
--   * Yeni ny_oyun_loglari tablosu: her oynanışı (kayıtlı ya da
--     misafir) kaydeder, sadece istatistik amaçlıdır, o da
--     ny_kullanicilar gibi RLS ile tamamen kilitli.
--   * ny_skor_gonder artık her çağrıda bir log satırı ekliyor ve
--     oyuncunun oyun_sayisi'nı artırıyor.
--   * Yeni ny_misafir_oyun_kaydet(): giriş yapmamış oyuncuların
--     oynayışlarını (skor kaydetmeden, sadece sayaç için) loglar.
--   * Yeni ny_admin_istatistik(): toplam oynanma, kayıtlı oyuncu
--     sayısı, misafir oynanma sayısı ve en çok oynayanlar listesini
--     döndürür (admin panelindeki diğer istatistik fonksiyonlarıyla
--     aynı desende — anon'a açık, korumayı panel şifre ekranı sağlar).
--
-- v5 güncellemesi: Haftalık liderlik tablosu eklendi.
--   * Yeni ny_liderlik_tablosu_haftalik(): ny_oyun_loglari üzerinden,
--     içinde bulunulan haftada (Pazartesi 00:00'dan itibaren) atılan
--     en yüksek skora göre sıralı bir liderlik listesi döndürür.
--     ny_liderlik_tablosu() (tüm zamanlar) olduğu gibi kalıyor.
--
-- Bu dosyayı daha önce çalıştırdıysanız SORUN DEĞİL — tamamını
-- (CREATE OR REPLACE, CREATE TABLE IF NOT EXISTS vb.) baştan
-- çalıştırmak güvenlidir, veri kaybı olmaz.
-- ============================================================

-- 1) pgcrypto uzantısı (bcrypt için gerekli)
create extension if not exists pgcrypto;

-- 2) Kullanıcılar tablosu
create table if not exists public.ny_kullanicilar (
    id              bigint generated always as identity primary key,
    kullanici_adi   text not null,
    sifre_hash      text not null,
    en_yuksek_skor  integer not null default 0,
    oyun_sayisi     integer not null default 0,
    created_at      timestamptz not null default now()
);

-- v4: mevcut tabloya oyun_sayisi eklendi (daha önce kurulmuş projeler için)
alter table public.ny_kullanicilar add column if not exists oyun_sayisi integer not null default 0;

-- v4: her oynanışı (kayıtlı ya da misafir) sayan log tablosu — sadece
-- istatistik amaçlıdır, ny_kullanicilar ile aynı şekilde tamamen kilitli.
create table if not exists public.ny_oyun_loglari (
    id              bigint generated always as identity primary key,
    kullanici_adi   text,               -- null ise misafir oyunu
    skor            integer not null,
    created_at      timestamptz not null default now()
);

alter table public.ny_oyun_loglari enable row level security;
revoke all on public.ny_oyun_loglari from anon, authenticated;

-- Kullanıcı adını büyük/küçük harf duyarsız şekilde benzersiz kıl
create unique index if not exists ny_kullanicilar_ad_lower_idx
    on public.ny_kullanicilar (lower(kullanici_adi));

-- RLS'i aç ve HİÇBİR policy ekleme — bu, anon/authenticated için
-- tabloya doğrudan erişimi tamamen kapatır.
alter table public.ny_kullanicilar enable row level security;
revoke all on public.ny_kullanicilar from anon, authenticated;

-- 3) Kayıt olma fonksiyonu
-- Not: v_yasakli listesi kesin/mükemmel bir küfür filtresi değildir (böyle bir şey
-- yoktur) — yaygın Türkçe/İngilizce küfür ve hakaretlerin köklerini, basit
-- gizleme denemelerini (leetspeak, Türkçe karakter değişimi) de yakalayacak
-- şekilde normalize ederek arar. Listeyi dilediğiniz zaman aşağıdan
-- güncelleyip bu fonksiyonu tekrar çalıştırabilirsiniz (CREATE OR REPLACE
-- güvenlidir, veri kaybetmez).
create or replace function public.ny_kayit_ol(p_kullanici_adi text, p_sifre text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_ad text := trim(coalesce(p_kullanici_adi, ''));
    v_normal text;
    v_kelime text;
    v_yasakli text[] := array[
        'amk', 'aq', 'yarrak', 'yarak', 'siktir', 'sik', 'pic', 'orospu', 'kahpe',
        'ibne', 'gavat', 'got', 'bok', 'salak', 'gerizekali',
        'fuck', 'shit', 'bitch', 'nigger', 'cunt', 'faggot', 'porn', 'sex', 'amcik',
        'surtuk', 'pezevenk', 'yavsak'
    ];
begin
    if v_ad !~ '^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_]{3,20}$' then
        return 'gecersiz_ad';
    end if;
    if p_sifre is null or length(p_sifre) < 4 or length(p_sifre) > 72 then
        return 'gecersiz_sifre';
    end if;

    -- Normalize et: küçük harfe çevir, Türkçe karakterleri sadeleştir,
    -- yaygın rakam/harf gizleme denemelerini (0->o, 1->i, 3->e, 4->a, 5->s, 7->t)
    -- düzelt ve alt çizgiyi kaldır.
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
            return 'yasakli_kelime';
        end if;
    end loop;

    if exists (select 1 from public.ny_kullanicilar where lower(kullanici_adi) = lower(v_ad)) then
        return 'ad_alinmis';
    end if;

    insert into public.ny_kullanicilar (kullanici_adi, sifre_hash)
    values (v_ad, crypt(p_sifre, gen_salt('bf', 10)));

    return 'basarili';
end;
$$;

-- 4) Giriş yapma fonksiyonu
create or replace function public.ny_giris_yap(p_kullanici_adi text, p_sifre text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_kullanici public.ny_kullanicilar%rowtype;
begin
    select * into v_kullanici
    from public.ny_kullanicilar
    where lower(kullanici_adi) = lower(trim(coalesce(p_kullanici_adi, '')));

    if not found then
        return json_build_object('basarili', false, 'hata', 'kullanici_yok');
    end if;

    if v_kullanici.sifre_hash <> crypt(coalesce(p_sifre, ''), v_kullanici.sifre_hash) then
        return json_build_object('basarili', false, 'hata', 'sifre_yanlis');
    end if;

    return json_build_object(
        'basarili', true,
        'kullanici_adi', v_kullanici.kullanici_adi,
        'en_yuksek_skor', v_kullanici.en_yuksek_skor
    );
end;
$$;

-- 5) Skor gönderme fonksiyonu (her seferinde şifreyle yeniden doğrular)
create or replace function public.ny_skor_gonder(p_kullanici_adi text, p_sifre text, p_skor integer)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_kullanici public.ny_kullanicilar%rowtype;
    v_yeni_rekor boolean := false;
    v_guncel_en_yuksek integer;
begin
    select * into v_kullanici
    from public.ny_kullanicilar
    where lower(kullanici_adi) = lower(trim(coalesce(p_kullanici_adi, '')));

    if not found or v_kullanici.sifre_hash <> crypt(coalesce(p_sifre, ''), v_kullanici.sifre_hash) then
        return json_build_object('basarili', false, 'hata', 'yetkisiz');
    end if;

    if p_skor is null or p_skor < 0 or p_skor > 100000 then
        return json_build_object('basarili', false, 'hata', 'gecersiz_skor');
    end if;

    if p_skor > v_kullanici.en_yuksek_skor then
        v_yeni_rekor := true;
        v_guncel_en_yuksek := p_skor;
    else
        v_guncel_en_yuksek := v_kullanici.en_yuksek_skor;
    end if;

    -- Her skor gönderiminde oyun_sayisi bir artar (yeni rekor olsun olmasın —
    -- bu, oyuncunun kaç kez oynadığını sayar, kaç kez rekor kırdığını değil).
    update public.ny_kullanicilar
    set en_yuksek_skor = v_guncel_en_yuksek,
        oyun_sayisi = oyun_sayisi + 1
    where id = v_kullanici.id;

    insert into public.ny_oyun_loglari (kullanici_adi, skor)
    values (v_kullanici.kullanici_adi, p_skor);

    return json_build_object('basarili', true, 'yeni_rekor', v_yeni_rekor, 'en_yuksek_skor', v_guncel_en_yuksek);
end;
$$;

-- 5b) Misafir (giriş yapmamış) oyuncuların oynayışını loglar — skor
-- kaydetmez, hesap gerektirmez, sadece "kaç kere oynandı" sayacı içindir.
create or replace function public.ny_misafir_oyun_kaydet(p_skor integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if p_skor is null or p_skor < 0 or p_skor > 100000 then
        return;
    end if;
    insert into public.ny_oyun_loglari (kullanici_adi, skor) values (null, p_skor);
end;
$$;

-- 6) Liderlik tablosu (sadece kullanıcı adı + skor — şifre hash'i asla döndürülmez)
create or replace function public.ny_liderlik_tablosu(p_limit integer default 10)
returns table(kullanici_adi text, en_yuksek_skor integer)
language sql
security definer
set search_path = public, extensions
as $$
    select kullanici_adi, en_yuksek_skor
    from public.ny_kullanicilar
    where en_yuksek_skor > 0
    order by en_yuksek_skor desc, created_at asc
    limit least(coalesce(p_limit, 10), 50);
$$;

-- 6a) Haftalık liderlik tablosu — bu hafta (Pazartesi 00:00'dan itibaren)
-- atılan skorlar arasından, kişi başına en yüksek skora göre sıralar.
-- Şifre hash'i içermez, ny_oyun_loglari üzerinden hesaplanır.
create or replace function public.ny_liderlik_tablosu_haftalik(p_limit integer default 10)
returns table(kullanici_adi text, en_yuksek_skor integer)
language sql
security definer
set search_path = public, extensions
as $$
    select kullanici_adi, max(skor) as en_yuksek_skor
    from public.ny_oyun_loglari
    where kullanici_adi is not null
      and created_at >= date_trunc('week', now())
    group by kullanici_adi
    having max(skor) > 0
    order by en_yuksek_skor desc, min(created_at) asc
    limit least(coalesce(p_limit, 10), 50);
$$;

-- 6b) Admin paneli istatistikleri — toplam oynanma, kayıtlı oyuncu sayısı,
-- misafir oynanma sayısı ve en çok oynayan kayıtlı oyuncular. Sifre_hash
-- asla döndürülmez. Admin panelindeki diğer istatistik fonksiyonlarıyla
-- (ör. istatistik_ozet) aynı desende — anon'a açık, koruma panelin şifre
-- ekranı tarafından sağlanır.
create or replace function public.ny_admin_istatistik()
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_toplam_oyun integer;
    v_kayitli_oyuncu integer;
    v_misafir_oyun integer;
    v_oyuncular json;
begin
    select count(*) into v_toplam_oyun from public.ny_oyun_loglari;
    select count(*) into v_kayitli_oyuncu from public.ny_kullanicilar;
    select count(*) into v_misafir_oyun from public.ny_oyun_loglari where kullanici_adi is null;

    select coalesce(json_agg(t), '[]'::json) into v_oyuncular
    from (
        select kullanici_adi, oyun_sayisi, en_yuksek_skor
        from public.ny_kullanicilar
        where oyun_sayisi > 0
        order by oyun_sayisi desc, en_yuksek_skor desc
        limit 100
    ) t;

    return json_build_object(
        'toplam_oyun', v_toplam_oyun,
        'kayitli_oyuncu_sayisi', v_kayitli_oyuncu,
        'misafir_oyun_sayisi', v_misafir_oyun,
        'oyuncular', v_oyuncular
    );
end;
$$;

-- 7) Yetkilendirme — sadece bu fonksiyonları çağırabilsinler,
--    tabloya asla doğrudan dokunamasınlar.
revoke all on function public.ny_kayit_ol(text, text) from public;
revoke all on function public.ny_giris_yap(text, text) from public;
revoke all on function public.ny_skor_gonder(text, text, integer) from public;
revoke all on function public.ny_liderlik_tablosu(integer) from public;
revoke all on function public.ny_misafir_oyun_kaydet(integer) from public;
revoke all on function public.ny_admin_istatistik() from public;
revoke all on function public.ny_liderlik_tablosu_haftalik(integer) from public;

grant execute on function public.ny_kayit_ol(text, text) to anon, authenticated;
grant execute on function public.ny_giris_yap(text, text) to anon, authenticated;
grant execute on function public.ny_skor_gonder(text, text, integer) to anon, authenticated;
grant execute on function public.ny_liderlik_tablosu(integer) to anon, authenticated;
grant execute on function public.ny_misafir_oyun_kaydet(integer) to anon, authenticated;
grant execute on function public.ny_admin_istatistik() to anon, authenticated;
grant execute on function public.ny_liderlik_tablosu_haftalik(integer) to anon, authenticated;

-- ============================================================
-- Kurulum tamam. Test etmek için:
--   select ny_kayit_ol('test_kullanici', '1234');
--   select ny_giris_yap('test_kullanici', '1234');
--   select ny_giris_yap('test_kullanici', 'yanlis_sifre');
--   select ny_liderlik_tablosu();
--   select ny_kayit_ol('siktir_git', '1234');   -- 'yasakli_kelime' dönmeli
--   select ny_misafir_oyun_kaydet(7);
--   select ny_admin_istatistik();
--   select ny_liderlik_tablosu_haftalik();
-- ============================================================
