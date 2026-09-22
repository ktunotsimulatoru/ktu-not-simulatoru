const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHmac,randomUUID}=require('node:crypto');
const uid='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const unconfirmed='33333333-3333-4333-8333-333333333333';
const secret='local-worker-test';
function token(sub=uid){const head=Buffer.from(JSON.stringify({alg:'HS256'})).toString('base64url');
    const body=Buffer.from(JSON.stringify({sub,email:'test@ogr.ktu.edu.tr',role:'authenticated',aud:'authenticated',iss:'https://tsfscfgwbmiouptsljyi.supabase.co/auth/v1',exp:Math.floor(Date.now()/1000)+300})).toString('base64url');
    return `${head}.${body}.${createHmac('sha256',secret).update(`${head}.${body}`).digest('base64url')}`;
}
test('Dosya yaşam döngüsü: gerçek SQL + Worker + bellek R2',async t=>{
    const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite();
    const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('worker/worker.js','utf8')).toString('base64'))).default;
    const originalFetch=global.fetch;const objects=new Map();let puts=0,deletes=0,errorPurges=0,failDelete=false,failComplete=false,missingHead=false;
    const legacy=`${uid}/${randomUUID()}.pdf`, legacyQuestion=randomUUID();
    try{
        await db.exec(`create role anon; create role authenticated; create role service_role;
            create schema auth;
            create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
            create table public.nk_dersler(id int primary key,ekleyen_kullanici_id uuid not null references auth.users(id));
            create table public.sorular(id uuid primary key default gen_random_uuid(),ders_id int references public.nk_dersler(id),
                kullanici_id uuid references auth.users(id) on delete cascade,element_yollari text[] not null,durum text default 'beklemede');
            create function public._admin_token_gecerli_mi(t text) returns boolean language sql as $$ select t='test-admin' $$;
            insert into auth.users values('${uid}','owner@ogr.ktu.edu.tr',now(),null),('${other}','other@ogr.ktu.edu.tr',now(),null),('${unconfirmed}','no@ogr.ktu.edu.tr',null,null);
            insert into public.nk_dersler values(1,'${uid}');
            insert into public.sorular values('${legacyQuestion}',1,'${uid}',array['${legacy}'],'beklemede');`);
        await db.exec(fs.readFileSync('migrations/001_not_kutusu_guvenlik.sql','utf8'));
        await db.exec(fs.readFileSync('migrations/002_dosya_yasam_dongusu.sql','utf8'));
        await db.exec(fs.readFileSync('migrations/002_dosya_yasam_dongusu.sql','utf8'));
        const eskiFonksiyon=(await db.query("select pg_get_functiondef('public.nk_dosya_islem(text,jsonb)'::regprocedure) d")).rows[0].d.replaceAll('3500000','5242880');
        await db.exec(eskiFonksiyon); // canlıdaki eski 5 MiB fonksiyonundan geçişi de sınar
        await db.exec(fs.readFileSync('migrations/012_dosya_boyutu_35mb.sql','utf8'));
        await db.exec(fs.readFileSync('migrations/012_dosya_boyutu_35mb.sql','utf8'));
        async function rpc(op,data={}){return (await db.query('select public.nk_dosya_islem($1,$2::jsonb) as r',[op,JSON.stringify(data)])).rows[0].r;}
        global.fetch=async(url,options)=>{
            if(url==='https://scanner.example/scan')return Response.json({verdict:'clean',engine:'test-av'});
            if(url==='https://tsfscfgwbmiouptsljyi.supabase.co/rest/v1/rpc/uygulama_hatasi_temizle'){
                assert.equal(options.headers.apikey,'test-service');assert.equal(options.body,'{}');errorPurges++;return Response.json(0);
            }
            assert.equal(url,'https://tsfscfgwbmiouptsljyi.supabase.co/rest/v1/rpc/nk_dosya_islem');
            assert.equal(options.headers.apikey,'test-service');
            const {p_islem,p_veri}=JSON.parse(options.body);
            if(failComplete && p_islem==='complete')return new Response('',{status:503});
            return Response.json(await rpc(p_islem,p_veri));
        };
        const env={SUPABASE_JWT_SECRET:secret,SUPABASE_SERVICE_ROLE_KEY:'test-service',MALWARE_SCAN_URL:'https://scanner.example/scan',MALWARE_SCAN_TOKEN:'test-scan-token',NK_ELEMENT_BUCKET:{
            put:async(yol,bytes,meta)=>{puts++;objects.set(yol,{bytes:new Uint8Array(bytes),size:bytes.length,etag:randomUUID(),uploaded:new Date(),...meta});},
            head:async yol=>missingHead?null:objects.get(yol),
            get:async yol=>{const o=objects.get(yol);return o?{...o,body:new Response(o.bytes).body}:null;},
            list:async()=>({objects:[...objects].map(([key,o])=>({key,...o})),truncated:false}),
            delete:async yol=>{deletes++;if(failDelete)throw Error('temporary');objects.delete(yol);}
        }};
        async function upload(who=uid){return worker.fetch(new Request('https://files.example/upload',{method:'POST',headers:{Authorization:'Bearer '+token(who),'Content-Type':'application/pdf'},body:'%PDF-1.7 test'}),env);}
        async function get(yol,who=uid,admin){return worker.fetch(new Request('https://files.example/'+yol,{headers:admin?{'X-Admin-Token':admin}:who?{Authorization:'Bearer '+token(who)}:{}}),env);}
        async function attach(yol,who=uid){const id=randomUUID();await db.query('insert into public.sorular(id,ders_id,kullanici_id,element_yollari) values($1,1,$2,$3)',[id,who,[yol]]);return id;}
        async function cleanup(){let task;await worker.scheduled({},env,{waitUntil:p=>{task=p;}});await task;}
        async function state(yol){return (await db.query('select * from public.nk_dosyalar where yol=$1',[yol])).rows[0];}
        let uploaded,question;
        await t.test('Veritabanı rezervasyonu 3,5 MB üstünü reddeder',async()=>{
            const result=await rpc('reserve',{uid,mime:'application/pdf',boyut:3_500_001});
            assert.equal(result.hata,'dosya_cok_buyuk');
        });
        await t.test('Anon ve doğrulanmamış üye yükleyemez; rezervasyon dışında R2 yazılmaz',async()=>{
            assert.equal((await upload(unconfirmed)).status,403);assert.equal(puts,0);
            const response=await worker.fetch(new Request('https://files.example/upload',{method:'POST',body:'%PDF-1.7'}),env);
            assert.equal(response.status,401);assert.equal(puts,0);
        });
        await t.test('Yüklenen nesne doğrulanır; yalnızca bir soruya ve sahibine bağlanabilir',async()=>{
            const response=await upload();assert.equal(response.status,200);uploaded=(await response.json()).yol;
            assert.equal((await state(uploaded)).durum,'ready');
            await assert.rejects(attach(`${uid}/${randomUUID()}.pdf`),/doğrulanmamış/);
            await assert.rejects(attach(uploaded,other),/ekler|doğrulanmamış|sahibi/i);
            question=await attach(uploaded);assert.equal((await state(uploaded)).durum,'attached');
            await assert.rejects(attach(uploaded),/doğrulanmamış/);
            await assert.rejects(db.query('update public.sorular set element_yollari=$1 where id=$2',[[legacy],question]),/değiştirilemez/);
        });
        await t.test('Bekleyen: sahibi ve yönetici; onaylı: üyeler; misafir hiçbirini okuyamaz',async()=>{
            assert.equal((await get(uploaded,null)).status,401);
            assert.equal((await get(uploaded,other)).status,404);
            assert.equal((await get(uploaded,uid,'wrong-admin')).status,404);
            const owner=await get(uploaded);assert.equal(owner.status,200);assert.equal(await owner.text(),'%PDF-1.7 test');
            assert.equal(owner.headers.get('Cache-Control'),'private, no-store');
            assert.equal((await get(uploaded,uid,'test-admin')).status,200);
            await db.query("update public.sorular set durum='onaylandi' where id=$1",[question]);
            assert.equal((await get(uploaded,other)).status,200);
            assert.equal((await get(uploaded,unconfirmed)).status,404);
            await db.query("update public.sorular set durum='reddedildi' where id=$1",[question]);
            assert.equal((await get(uploaded,other)).status,404);assert.equal((await get(uploaded)).status,200);
        });
        await t.test('R2 nesnesi kayıttan farklıysa veya yoksa erişim kapalı',async()=>{
            const object=objects.get(uploaded);const etag=object.etag;object.etag='tampered';
            assert.equal((await get(uploaded)).status,409);object.etag=etag;
            objects.delete(uploaded);assert.equal((await get(uploaded)).status,404);objects.set(uploaded,object);
        });
        await t.test('Eski kayıtlar korunur; yetkili okumada gerçek nesneyle doğrulanır',async()=>{
            assert.equal((await state(legacy)).durum,'legacy');
            await env.NK_ELEMENT_BUCKET.put(legacy,new TextEncoder().encode('%PDF-legacy'),{httpMetadata:{contentType:'application/pdf'}});
            assert.equal((await get(legacy,other)).status,404);assert.equal((await state(legacy)).durum,'legacy');
            assert.equal((await get(legacy)).status,200);assert.equal((await state(legacy)).durum,'attached');
        });
        await t.test('Kota bayt/adet/günlük sınırında R2 yazmadan reddeder',async()=>{
            const q=await rpc('quota',{uid});
            for(const [field,value]of [['kota_bayt',q.kullanilan_bayt],['kota_adet',q.kullanilan_adet],['gunluk_adet',q.gunluk_adet]]){
                await db.query(`update public.nk_dosya_ayarlari set ${field}=$1`,[value]);
                const before=puts;assert.equal((await upload()).status,429);assert.equal(puts,before);
                await db.exec('update public.nk_dosya_ayarlari set kota_bayt=104857600,kota_adet=100,gunluk_adet=30');
            }
        });
        await t.test('Silme hemen erişimi keser; R2 hatası yeniden denenir; başarılı temizlik kotayı bırakır',async()=>{
            const before=await rpc('quota',{uid});
            await db.query('delete from public.sorular where id=$1',[question]);
            assert.equal((await get(uploaded)).status,404);assert.equal((await state(uploaded)).durum,'deleting');
            failDelete=true;await assert.rejects(cleanup(),/yeniden_denenecek/);failDelete=false;
            assert.equal((await state(uploaded)).durum,'deleting');
            await db.query("update public.nk_dosyalar set sonraki_temizlik=now()-interval '1 minute' where yol=$1",[uploaded]);
            await cleanup();assert.equal(objects.has(uploaded),false);assert.equal((await state(uploaded)).durum,'deleted');
            assert.equal((await rpc('quota',{uid})).kullanilan_adet,before.kullanilan_adet-1);
        });
        await t.test('İptal bağlı dosyayı silmez; yarım yükleme ve süre aşımı temizlenir',async()=>{
            await rpc('cancel',{uid,yol:legacy});assert.equal((await state(legacy)).durum,'attached');
            const res=await upload();const yol=(await res.json()).yol;
            assert.equal((await rpc('cancel',{uid:other,yol})).hata,'yetkisiz');
            await rpc('cancel',{uid,yol});await cleanup();assert.equal(objects.has(yol),false);
            const res2=await upload();const path2=(await res2.json()).yol;
            await db.query("update public.nk_dosyalar set son_tarih=now()-interval '1 second' where yol=$1",[path2]);
            await assert.rejects(attach(path2),/süresi dolmuş/);await cleanup();assert.equal(objects.has(path2),false);
        });
        await t.test('R2 HEAD/DB finalizasyon hataları sahipsiz başarılı yükleme sayılmaz',async()=>{
            missingHead=true;assert.equal((await upload()).status,503);missingHead=false;
            failComplete=true;assert.equal((await upload()).status,503);failComplete=false;
            const pending=(await db.query("select yol from public.nk_dosyalar where durum='deleting'")).rows;
            assert.equal(pending.length,2);await cleanup();for(const p of pending)assert.equal(objects.has(p.yol),false);
        });
        await t.test('Geç gelen R2 yazımı tombstone tekrarında silinir; silinen yol okunamaz',async()=>{
            await env.NK_ELEMENT_BUCKET.put(uploaded,new TextEncoder().encode('%PDF-late'),{httpMetadata:{contentType:'application/pdf'}});
            await db.query("update public.nk_dosyalar set sonraki_temizlik=now()-interval '1 minute' where yol=$1",[uploaded]);
            assert.equal((await get(uploaded)).status,404);await cleanup();assert.equal(objects.has(uploaded),false);
        });
        await t.test('Eski sahipsiz dosya envanteri yöneticiye özeldir; referanslı veya yeni dosya silinmez',async()=>{
            const orphan=uid+'/'+randomUUID()+'.pdf',fresh=uid+'/'+randomUUID()+'.pdf';
            for(const yol of [orphan,fresh])await env.NK_ELEMENT_BUCKET.put(yol,new TextEncoder().encode('%PDF-old'),{httpMetadata:{contentType:'application/pdf'}});
            objects.get(orphan).uploaded=new Date(Date.now()-2*86400000);
            objects.get(legacy).uploaded=new Date(Date.now()-2*86400000);
            const inventory=admin=>worker.fetch(new Request('https://files.example/inventory',{headers:admin?{'X-Admin-Token':admin}:{}}),env);
            assert.equal((await inventory()).status,401);assert.equal((await inventory('wrong')).status,403);
            const report=await (await inventory('test-admin')).json();
            assert.equal(report.dosyalar.find(f=>f.yol===orphan).aday,true);
            assert.equal(report.dosyalar.find(f=>f.yol===fresh).aday,false);
            assert.equal(report.dosyalar.find(f=>f.yol===legacy).aday,false);
            const enqueue=yol=>worker.fetch(new Request('https://files.example/orphan-cleanup',{method:'POST',headers:{'X-Admin-Token':'test-admin'},body:JSON.stringify({yol})}),env);
            assert.equal((await enqueue(fresh)).status,409);assert.equal((await enqueue(legacy)).status,409);
            assert.equal((await enqueue(orphan)).status,200);await cleanup();assert.equal(objects.has(orphan),false);assert.equal(objects.has(legacy),true);
        });
        await t.test('Hesap silinmesi soru eklerini temizliğe alır; Worker RPC tarayıcı rollerine kapalı',async()=>{
            for(const role of ['anon','authenticated']){
                await db.exec('set role '+role);
                await assert.rejects(rpc('read',{uid,yol:legacy}),/permission denied/);
                await assert.rejects(db.query('select * from public.nk_dosyalar'),/permission denied/);
                await db.exec('reset role');
            }
            await db.query('delete from auth.users where id=$1',[uid]);
            assert.equal((await state(legacy)).durum,'deleting');await cleanup();assert.equal(objects.has(legacy),false);
        });
        assert.ok(errorPurges>0,'zamanlanmış bakım eski hata kayıtlarını da temizlemeli');
    }finally{global.fetch=originalFetch;await db.close();}
});
