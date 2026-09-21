-- Salt okunur canlı Supabase denetimi. SQL Editor'da çalıştırılır; veri değiştirmez.
-- Sonuçları tarih damgasıyla saklayın. Beklenmeyen her satır dağıtım engelidir.

-- 1) public şemasında RLS kapalı tablolar. Data API'de açığa çıkan tablolar için boş olmalı.
select n.nspname as sema, c.relname as nesne, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity
order by c.relname;

-- 2) RLS açık olup hiç policy'si olmayan tablolar. Bilinçli tam kapatma dışında incelenmeli.
select c.relname as tablo
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity
and not exists (select 1 from pg_catalog.pg_policy p where p.polrelid=c.oid)
order by c.relname;

-- 3) Bütün policy'ler: roller, işlem ve ifadeler elle beklenen erişim modeliyle karşılaştırılır.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies where schemaname='public'
order by tablename, policyname;

-- 4) SECURITY DEFINER işlevler: sabit search_path ve çağrı yetkisi incelenir.
select p.oid::regprocedure::text as islev,
       pg_catalog.pg_get_userbyid(p.proowner) as sahip,
       p.proconfig as ayarlar,
       pg_catalog.has_function_privilege('anon', p.oid, 'execute') as anon,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       pg_catalog.has_function_privilege('service_role', p.oid, 'execute') as service_role,
       pg_catalog.has_function_privilege('public', p.oid, 'execute') as public_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
order by 1;

-- 5) Geniş tablo ayrıcalıkları. RLS satırları sınırlar; gereksiz işlem grant'leri yine kaldırılmalı.
select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as yetkiler
from information_schema.role_table_grants
where table_schema='public' and grantee in ('PUBLIC','anon','authenticated','service_role')
group by grantee, table_name order by table_name, grantee;

-- 6) Güvenlik sınırı için zorunlu özel kontroller. Her satır true olmalı.
select 'sorular_rls' as kontrol, c.relrowsecurity as basarili
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='sorular'
union all
select 'nk_dosyalar_rls', c.relrowsecurity
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='nk_dosyalar'
union all
select 'anon_dosya_rpc_yok', not pg_catalog.has_function_privilege('anon','public.nk_dosya_islem(text,jsonb)','execute')
union all
select 'uye_dosya_rpc_yok', not pg_catalog.has_function_privilege('authenticated','public.nk_dosya_islem(text,jsonb)','execute')
union all
select 'service_dosya_rpc_var', pg_catalog.has_function_privilege('service_role','public.nk_dosya_islem(text,jsonb)','execute');
