-- Bu üç fonksiyonun SECURITY DEFINER mı yoksa SECURITY INVOKER mı
-- olduğunu kontrol ediyoruz — gunah-duvari-kilitleme.sql'i çalıştırmadan
-- önce bunu bilmemiz gerekiyor (ny_oyun_loglari üzerinde RLS/GRANT
-- değişikliği yapıyor).
select routine_name, security_type
from information_schema.routines
where routine_name in ('ny_misafir_oyun_kaydet', 'ny_admin_istatistik', 'ny_liderlik_tablosu_haftalik', 'ny_liderlik_tablosu');
