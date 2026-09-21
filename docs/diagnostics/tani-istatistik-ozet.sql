-- istatistik_ozet fonksiyonunun tam tanımını ve tipini görüyoruz
select
    p.proname as fonksiyon_adi,
    pg_get_functiondef(p.oid) as tam_tanim
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'istatistik_ozet';
