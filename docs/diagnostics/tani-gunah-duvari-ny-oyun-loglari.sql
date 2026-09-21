-- ============================================================
-- TANI SORGUSU — gunah_duvari ve ny_oyun_loglari nedir?
-- ============================================================
-- Bu iki tablo script.js ve panel-mtas-7f5t.html içinde HİÇBİR
-- yerde referans edilmiyor. Ne işe yaradıklarını anlamak için
-- önce sütun yapılarına, sonra satır sayısı ve birkaç örnek
-- kayda bakıyoruz. Bu sorgu SADECE OKUMA yapar, hiçbir şeyi
-- değiştirmez — güvenle çalıştırabilirsiniz.
--
-- Sonuçları (üç sorgunun çıktısını da) buraya yapıştırın, birlikte
-- yorumlayalım.
-- ============================================================

-- 1) Sütun yapıları
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('gunah_duvari', 'ny_oyun_loglari')
order by table_name, ordinal_position;

-- 2) Satır sayıları
select 'gunah_duvari' as tablo, count(*) as satir_sayisi from public.gunah_duvari
union all
select 'ny_oyun_loglari', count(*) from public.ny_oyun_loglari;

-- 3) Örnek kayıtlar (en yeni 10'ar tane — tabloda bir tarih/id sütunu
--    varsa ona göre sıralanır; sütun adı bilinmediği için burada id'ye
--    göre sıralıyoruz, hata verirse tablo adını ve gerçek sütun adını
--    bana söyleyin, sorguyu düzeltelim)
select * from public.gunah_duvari order by id desc limit 10;
select * from public.ny_oyun_loglari order by id desc limit 10;

-- 4) Bu tabloların RLS/GRANT durumu — dışarıdan (anon key ile) okunabilir
--    mi, yazılabilir mi? (Diğer tüm tablolarda olduğu gibi burada da
--    "herkese açık" olup olmadığını görmek istiyoruz)
select
    schemaname, tablename, rowsecurity as rls_acik_mi
from pg_tables
where schemaname = 'public' and tablename in ('gunah_duvari', 'ny_oyun_loglari');

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('gunah_duvari', 'ny_oyun_loglari')
  and grantee in ('anon', 'authenticated', 'public')
order by table_name, grantee, privilege_type;
