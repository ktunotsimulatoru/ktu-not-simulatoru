-- 004'ün eski bir kopyası 007'den sonra yeniden çalıştırıldıysa kayıtlı dönem
-- politikaları kapalı nk_dogrulanmis_uye(uuid) işlevine geri dönebilir. Bu
-- migration canlı politikaları güvenli yardımcıya yeniden bağlar.
begin;

do $$ begin
    if to_regclass('public.kayitli_donemler') is null
       or to_regprocedure('public.nk_dogrulanmis_uye(uuid)') is null then
        raise exception 'Önce 001-004 migrationlarını çalıştırın.';
    end if;
end $$;

create or replace function public.kayitli_donem_yetkili_mi()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$ select public.nk_dogrulanmis_uye(auth.uid()) $$;

revoke all on function public.kayitli_donem_yetkili_mi() from public, anon, authenticated;
grant execute on function public.kayitli_donem_yetkili_mi() to authenticated;

drop policy if exists kayitli_donemler_select_own on public.kayitli_donemler;
create policy kayitli_donemler_select_own on public.kayitli_donemler for select to authenticated
    using (kullanici_id = auth.uid() and public.kayitli_donem_yetkili_mi());

drop policy if exists kayitli_donemler_insert_own on public.kayitli_donemler;
create policy kayitli_donemler_insert_own on public.kayitli_donemler for insert to authenticated
    with check (kullanici_id = auth.uid() and public.kayitli_donem_yetkili_mi());

drop policy if exists kayitli_donemler_update_own on public.kayitli_donemler;
create policy kayitli_donemler_update_own on public.kayitli_donemler for update to authenticated
    using (kullanici_id = auth.uid() and public.kayitli_donem_yetkili_mi())
    with check (kullanici_id = auth.uid() and public.kayitli_donem_yetkili_mi());

drop policy if exists kayitli_donemler_delete_own on public.kayitli_donemler;
create policy kayitli_donemler_delete_own on public.kayitli_donemler for delete to authenticated
    using (kullanici_id = auth.uid() and public.kayitli_donem_yetkili_mi());

revoke all on public.kayitli_donemler from public, anon;
grant select, insert, update, delete on public.kayitli_donemler to authenticated;

commit;

notify pgrst, 'reload schema';

-- SQL Editor sonuç ekranında iki değer de true olmalıdır.
select
    has_function_privilege('authenticated','public.kayitli_donem_yetkili_mi()','execute') as yardimci_cagrilabilir,
    not has_function_privilege('authenticated','public.nk_dogrulanmis_uye(uuid)','execute') as temel_yardimci_kapali;
