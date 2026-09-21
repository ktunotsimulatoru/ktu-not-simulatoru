const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('Kayıtlı dönem ve işletim hatası migrationı',async t=>{
    const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite();
    const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
    try{
        await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
            create table auth.users(id uuid primary key,email text);
            create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
            create function public.nk_dogrulanmis_uye(u uuid) returns boolean language sql stable security definer as $$select exists(select 1 from auth.users where id=u)$$;
            create function public._admin_token_gecerli_mi(t text) returns boolean language sql as $$select t='test-admin'$$;
            create table public.nk_dosyalar(yol text primary key,durum text);
            insert into auth.users values('${owner}','a@ogr.ktu.edu.tr'),('${other}','b@ogr.ktu.edu.tr');`);
        const migration=fs.readFileSync('migrations/004_gano_donemler_isletim.sql','utf8');await db.exec(migration);await db.exec(migration);
        await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
        await t.test('Dönem yalnız sahibine açılır ve ders JSON doğrulanır',async()=>{
            await db.exec('set role authenticated');
            await db.query(`insert into public.kayitli_donemler(kullanici_id,ad,akademik_yil,donem,dersler,mevcut_agno,mevcut_kredi)
                values($1,'Güz planım',2026,'guz',$2,2.5,60)`,[owner,JSON.stringify([{ad:'A',kredi:3,not:'AA'}])]);
            assert.equal((await db.query('select count(*)::integer n from public.kayitli_donemler')).rows[0].n,1);
            await assert.rejects(db.query(`insert into public.kayitli_donemler(kullanici_id,ad,akademik_yil,donem,dersler) values($1,'Bozuk',2026,'guz',$2)`,[owner,JSON.stringify([{kredi:3,not:'ZZ'}])]));
            await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await db.exec('set role authenticated');
            assert.equal((await db.query('select count(*)::integer n from public.kayitli_donemler')).rows[0].n,0);await db.exec('reset role');
        });
        await t.test('Hata mesajı kişisel veriden arınır ve admin özetine girer',async()=>{
            await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
            const result=(await db.query("select public.uygulama_hatasi_kaydet('gano','gano.test.1','a@ogr.ktu.edu.tr https://x.test?q=1','/gano-hesaplama.html','1.1.0') r")).rows[0].r;
            assert.equal(result.basarili,true);await db.exec('reset role');
            const row=(await db.query('select mesaj from public.uygulama_hatalari')).rows[0];assert.equal(row.mesaj,'[eposta] [url]');
            const summary=(await db.query("select public.admin_isletim_ozeti('test-admin') r")).rows[0].r;assert.equal(Number(summary.son_24_saat),1);assert.equal(summary.tekrarli_hatalar[0].kod,'gano.test.1');
        });
    }finally{await db.close();}
});
