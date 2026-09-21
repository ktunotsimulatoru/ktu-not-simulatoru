const fs=require('node:fs');
const crypto=require('node:crypto');

const owner='11111111-1111-4111-8111-111111111111';
const question='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const reportPath='docs/diagnostics/yedek-geri-yukleme-sonuc.json';
const tables=['auth.users','public.fakulteler','public.bolumler','public.nk_dersler','public.sorular','public.nk_dosyalar','public.nk_moderasyon_gecmisi','public.kayitli_donemler'];
const normalize=value=>JSON.parse(JSON.stringify(value,(_k,v)=>typeof v==='bigint'?v.toString():v));
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');

async function schema(db){
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function public.nk_dogrulanmis_uye(u uuid) returns boolean language sql stable as $$select exists(select 1 from auth.users where id=u)$$;
      create function public._admin_token_gecerli_mi(t text) returns boolean language sql as $$select t='test-admin'$$;
      create table public.fakulteler(id integer primary key,ad text);
      create table public.bolumler(id integer primary key,ad text,fakulte_id integer references public.fakulteler);
      create table public.nk_dersler(id integer primary key,bolum_id integer references public.bolumler,ders_adi text,ders_kodu text);
      create table public.sorular(id uuid primary key,ders_id integer references public.nk_dersler,kullanici_id uuid references auth.users,element_yollari text[],durum text);
      create table public.nk_dosyalar(yol text primary key,kullanici_id uuid,soru_id uuid,mime text,boyut bigint,durum text);
      create table public.nk_moderasyon_gecmisi(id bigint primary key,hedef_turu text,hedef_id text,islem text,neden text,olusturulma_tarihi timestamptz);`);
    await db.exec(fs.readFileSync('migrations/004_gano_donemler_isletim.sql','utf8'));
}
async function seed(db){
    await db.query('insert into auth.users values($1,$2)',[owner,'test@ogr.ktu.edu.tr']);
    await db.exec(`insert into public.fakulteler values(1,'Mühendislik');insert into public.bolumler values(10,'Bilgisayar',1);insert into public.nk_dersler values(100,10,'Algoritmalar','BLM301')`);
    await db.query(`insert into public.sorular values($1,100,$2,array['${owner}/soru.pdf'],'onaylandi')`,[question,owner]);
    await db.query(`insert into public.nk_dosyalar values($1,$2,$3,'application/pdf',2048,'attached')`,[`${owner}/soru.pdf`,owner,question]);
    await db.query(`insert into public.nk_moderasyon_gecmisi values(1,'soru',$1,'onaylandi','uygun',now())`,[question]);
    await db.query(`insert into public.kayitli_donemler(kullanici_id,ad,akademik_yil,donem,dersler,mevcut_agno,mevcut_kredi,hedef_agno) values($1,'2026 Güz',2026,'guz',$2,2.75,60,3.00)`,[owner,JSON.stringify([{ad:'Algoritmalar',kredi:3,not:'AA'}])]);
}
async function snapshot(db){const out={};for(const table of tables)out[table]=normalize((await db.query(`select * from ${table} order by 1`)).rows);return out;}
async function restore(db,s){
    for(const r of s['auth.users'])await db.query('insert into auth.users values($1,$2)',[r.id,r.email]);
    for(const r of s['public.fakulteler'])await db.query('insert into public.fakulteler values($1,$2)',[r.id,r.ad]);
    for(const r of s['public.bolumler'])await db.query('insert into public.bolumler values($1,$2,$3)',[r.id,r.ad,r.fakulte_id]);
    for(const r of s['public.nk_dersler'])await db.query('insert into public.nk_dersler values($1,$2,$3,$4)',[r.id,r.bolum_id,r.ders_adi,r.ders_kodu]);
    for(const r of s['public.sorular'])await db.query('insert into public.sorular values($1,$2,$3,$4,$5)',[r.id,r.ders_id,r.kullanici_id,r.element_yollari,r.durum]);
    for(const r of s['public.nk_dosyalar'])await db.query('insert into public.nk_dosyalar values($1,$2,$3,$4,$5,$6)',[r.yol,r.kullanici_id,r.soru_id,r.mime,r.boyut,r.durum]);
    for(const r of s['public.nk_moderasyon_gecmisi'])await db.query('insert into public.nk_moderasyon_gecmisi values($1,$2,$3,$4,$5,$6)',[r.id,r.hedef_turu,r.hedef_id,r.islem,r.neden,r.olusturulma_tarihi]);
    for(const r of s['public.kayitli_donemler'])await db.query(`insert into public.kayitli_donemler(id,kullanici_id,ad,akademik_yil,donem,dersler,mevcut_agno,mevcut_kredi,hedef_agno,olusturulma_tarihi,guncelleme_tarihi) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[r.id,r.kullanici_id,r.ad,r.akademik_yil,r.donem,JSON.stringify(r.dersler),r.mevcut_agno,r.mevcut_kredi,r.hedef_agno,r.olusturulma_tarihi,r.guncelleme_tarihi]);
}
(async()=>{
    const {PGlite}=await import('@electric-sql/pglite');const source=new PGlite(),target=new PGlite();
    try{
        await schema(source);await seed(source);const before=await snapshot(source);await schema(target);await restore(target,before);const after=await snapshot(target);
        const r2Objects=[`${owner}/soru.pdf`];const dbPaths=after['public.nk_dosyalar'].filter(x=>x.durum==='attached').map(x=>x.yol);
        const missing=dbPaths.filter(x=>!r2Objects.includes(x)),orphans=r2Objects.filter(x=>!dbPaths.includes(x));
        const checks=tables.map(table=>({table,sourceRows:before[table].length,restoredRows:after[table].length,checksumMatch:digest(before[table])===digest(after[table])}));
        const passed=checks.every(x=>x.sourceRows===x.restoredRows&&x.checksumMatch)&&!missing.length&&!orphans.length;
        const report={drill:'local-pglite-fixture',generatedAt:new Date().toISOString(),passed,checks,r2Inventory:{databasePaths:dbPaths.length,objectPaths:r2Objects.length,missing,orphans},limitations:['Gerçek Supabase auth yedeği kullanılmadı.','Gerçek R2 nesneleri indirilmedi; envanter eşleştirmesi temsili veride yapıldı.','Canlı geri yükleme için ayrı test projesi ve gerçek yedek gerekir.']};
        fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(`Geri yükleme tatbikatı ${passed?'başarılı':'başarısız'}: ${reportPath}`);if(!passed)process.exitCode=1;
    }finally{await source.close();await target.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
