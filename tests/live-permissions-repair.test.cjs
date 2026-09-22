const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('AGNO RLS kurulumu ve canlı onarımı kapalı üyelik yardımcısını açmadan çalışır',async()=>{
    const {PGlite}=await import('@electric-sql/pglite');
    const db=new PGlite();
    const owner='11111111-1111-4111-8111-111111111111';
    try{
        await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
            create table auth.users(id uuid primary key,email text);insert into auth.users values('${owner}','a@ogr.ktu.edu.tr');
            create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
            create function public.nk_dogrulanmis_uye(u uuid) returns boolean language sql stable security definer as $$select exists(select 1 from auth.users where id=u)$$;
            revoke all on function public.nk_dogrulanmis_uye(uuid) from public,anon,authenticated;
            create function public._admin_token_gecerli_mi(t text) returns boolean language sql as $$select t='test-admin'$$;
            create table public.nk_dosyalar(yol text primary key,durum text);`);
        await db.exec(fs.readFileSync('migrations/004_gano_donemler_isletim.sql','utf8'));
        await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
        await db.exec('set role authenticated');
        assert.equal((await db.query('select count(*)::integer n from public.kayitli_donemler')).rows[0].n,0);
        await db.exec('reset role');

        // Eski 004 kopyasının 007'den sonra çalıştırılmasını taklit et.
        await db.exec(`drop policy kayitli_donemler_select_own on public.kayitli_donemler;
            create policy kayitli_donemler_select_own on public.kayitli_donemler for select to authenticated
            using (kullanici_id=auth.uid() and public.nk_dogrulanmis_uye(auth.uid()));`);
        await db.exec('set role authenticated');
        await assert.rejects(db.query('select count(*) from public.kayitli_donemler'),/permission denied/i);
        await db.exec('reset role');

        const repair=fs.readFileSync('migrations/015_agno_yetki_onarimi.sql','utf8');
        await db.exec(repair);await db.exec(repair);
        await db.exec('set role authenticated');
        assert.equal((await db.query('select count(*)::integer n from public.kayitli_donemler')).rows[0].n,0);
        assert.equal((await db.query("select has_function_privilege('authenticated','public.nk_dogrulanmis_uye(uuid)','execute') ok")).rows[0].ok,false);
        assert.equal((await db.query("select has_function_privilege('authenticated','public.kayitli_donem_yetkili_mi()','execute') ok")).rows[0].ok,true);
    }finally{await db.close();}
});
