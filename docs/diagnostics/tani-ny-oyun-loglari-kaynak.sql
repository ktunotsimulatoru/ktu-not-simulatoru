-- ============================================================
-- ny_oyun_loglari'ya kim/ne yazıyor? — kaynağını arıyoruz
-- ============================================================
-- anon/authenticated rollerine hiç grant verilmemiş olmasına rağmen
-- tabloda 8 satır var. Bu ya (a) sizin Supabase panelinden manuel
-- eklediğiniz test verisi, ya da (b) service_role key kullanan bir
-- Edge Function / cron job / harici bir script. Aşağıdaki sorgular
-- bunu ayırt etmeye yardımcı olur.
-- ============================================================

-- 1) Bu tabloya yazan/tetiklenen bir trigger var mı?
select trigger_name, event_manipulation, action_statement
from information_schema.triggers
where event_object_table = 'ny_oyun_loglari';

-- 2) Kaynak kodunda "ny_oyun_loglari" geçen başka bir fonksiyon var mı?
--    (örn. bir Edge Function yerine SQL fonksiyonu bu tabloya yazıyor olabilir)
select routine_name, routine_definition
from information_schema.routines
where routine_definition ilike '%ny_oyun_loglari%';

-- 3) Supabase'de tanımlı Edge Function'larınız var mı? (Bu, SQL Editor'den
--    değil, Supabase Dashboard > Edge Functions sekmesinden kontrol edilir —
--    SQL ile görülemez, sadece hatırlatma amaçlı not.)
