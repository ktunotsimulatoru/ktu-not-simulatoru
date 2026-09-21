-- Not Kutusu için admin onay/red RPC'lerini (admin_soru_listele,
-- admin_soru_onayla, admin_soru_reddet vb.) projenin GERÇEK admin_token
-- doğrulama mantığıyla birebir aynı şekilde yazabilmem için, mevcut bir
-- admin fonksiyonunun tam tanımını görmem gerekiyor.
--
-- Bu sorguyu Supabase SQL Editor'de çalıştırıp "tam_tanim" sütununun
-- tam çıktısını bana yapıştırır mısın? (Daha önce aynı amaçla
-- kullandığımız tani-change-admin-password.sql ile aynı mantık.)

select
    p.proname as fonksiyon_adi,
    pg_get_functiondef(p.oid) as tam_tanim
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'admin_ders_onayla';
