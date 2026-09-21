-- 006 sonrasında uygulanır.
-- 004'teki kayıtlı dönem RLS politikaları, 002'de tarayıcı rollerine kapatılan
-- nk_dogrulanmis_uye(uuid) yardımcısını doğrudan çağırıyordu. Bu durum canlıda
-- authenticated rolü için 42501 (permission denied for function) üretebilir.
begin;

do $$ begin
    if to_regclass('public.kayitli_donemler') is null
       or to_regclass('public.uygulama_hatalari') is null then
        raise exception 'Önce 004_gano_donemler_isletim.sql migrationını çalıştırın.';
    end if;
end $$;

-- Yalnız çağıran kullanıcının kendi üyelik durumunu döndürür. Böylece temel
-- üyelik yardımcısını ve başka kullanıcı kimliklerini tarayıcıya açmayız.
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

-- 004 daha önce çalışmış olsa bile RPC görünürlüğünü ve rollerini onar.
revoke all on function public.admin_isletim_ozeti(text) from public;
grant execute on function public.admin_isletim_ozeti(text) to anon, authenticated;
revoke all on function public.uygulama_hatasi_kaydet(text,text,text,text,text) from public, anon;
grant execute on function public.uygulama_hatasi_kaydet(text,text,text,text,text) to authenticated;

commit;

-- Yeni tablo/fonksiyon izinlerinin PostgREST'e hemen yansımasını iste.
notify pgrst, 'reload schema';

-- SQL Editor sonuç ekranında iki değer de true görünmelidir.
select
    to_regclass('public.kayitli_donemler') is not null as agno_tablosu_hazir,
    to_regprocedure('public.admin_isletim_ozeti(text)') is not null as isletim_rpc_hazir;
