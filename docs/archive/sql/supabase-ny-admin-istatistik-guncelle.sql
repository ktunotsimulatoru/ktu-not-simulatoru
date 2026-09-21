-- ============================================================================
-- ny_admin_istatistik GÜNCELLEMESİ — admin panelindeki "kayıtlı oyuncu
-- sayısı" ve oyuncu listesi artık SADECE eski (donuk) ny_kullanicilar
-- sistemini değil, yeni kullanici_profilleri / oyun_skor_loglari sistemini
-- de sayıyor. Diğer üç fonksiyon (ny_liderlik_tablosu(_haftalik),
-- ny_misafir_oyun_kaydet) ve ny_kullanicilar/ny_oyun_loglari tabloları
-- DOKUNULMADAN kalıyor — sadece bu tek fonksiyon değişiyor.
--
-- Desen, supabase-birlesik-profil-oyun.sql'deki oyun_liderlik_tablosu
-- fonksiyonuyla aynı: 'eski' (ny_kullanicilar) + 'yeni' (kullanici_profilleri)
-- birleştiriliyor (union all), 'kaynak' etiketi eklenmiyor çünkü admin
-- panelindeki tablo bunu göstermiyor — sadece sayılar birleşiyor.
--
-- Supabase SQL Editor'da çalıştırın. Var olan fonksiyonu değiştirir
-- (create or replace), veri kaybı YOK.
-- ============================================================================

create or replace function public.ny_admin_istatistik(p_admin_token text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
    v_toplam_oyun integer;
    v_kayitli_oyuncu integer;
    v_misafir_oyun integer;
    v_oyuncular json;
begin
    if not public._admin_token_gecerli_mi(p_admin_token) then
        return json_build_object('hata', 'yetkisiz');
    end if;

    -- Toplam oyun sayısı: eski sistemin oyun logları + yeni sistemin skor logları.
    select
        (select count(*) from public.ny_oyun_loglari) +
        (select count(*) from public.oyun_skor_loglari)
    into v_toplam_oyun;

    -- Kayıtlı oyuncu sayısı: eski sistemdeki hesaplar + yeni sistemde oyun
    -- kullanıcı adı belirlemiş profiller.
    select
        (select count(*) from public.ny_kullanicilar) +
        (select count(*) from public.kullanici_profilleri where oyun_kullanici_adi is not null)
    into v_kayitli_oyuncu;

    -- Misafir oyun sayısı: sadece eski sistemde vardı (yeni sistemde misafir
    -- oyun kaydı/loglaması yok), bu yüzden değişmeden kalıyor.
    select count(*) into v_misafir_oyun
    from public.ny_oyun_loglari
    where kullanici_adi is null;

    -- Oyuncu listesi: eski + yeni sistem birleşik, oyun sayısına göre sıralı,
    -- ilk 100. Yeni sistemde "oyun sayısı" doğrudan bir kolon değil —
    -- oyun_skor_loglari üzerinden sayılıyor.
    select coalesce(json_agg(t), '[]'::json) into v_oyuncular
    from (
        select kullanici_adi, oyun_sayisi, en_yuksek_skor
        from (
            select
                kullanici_adi,
                oyun_sayisi,
                en_yuksek_skor
            from public.ny_kullanicilar
            where oyun_sayisi > 0

            union all

            select
                p.oyun_kullanici_adi as kullanici_adi,
                (select count(*)::integer from public.oyun_skor_loglari sk where sk.kullanici_id = p.id) as oyun_sayisi,
                p.en_yuksek_skor
            from public.kullanici_profilleri p
            where p.oyun_kullanici_adi is not null
              and exists (select 1 from public.oyun_skor_loglari sk where sk.kullanici_id = p.id)
        ) birlesik
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
$function$;
