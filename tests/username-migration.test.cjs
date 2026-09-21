const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('Genel kullanıcı adı migrationı eski oyun adını kaybetmeden eşitler',async()=>{
    const {PGlite}=await import('@electric-sql/pglite');
    const db=new PGlite();
    try{
        await db.exec(`create role anon; create role authenticated; create schema auth;
            create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
            create table public.kullanici_profilleri(id uuid primary key,oyun_kullanici_adi text,en_yuksek_skor integer not null default 0);
            create function public.oyun_kullanici_adi_ayarla(p_ad text) returns json language plpgsql security definer as $$
            declare u uuid:=auth.uid(); begin insert into public.kullanici_profilleri(id,oyun_kullanici_adi) values(u,p_ad)
            on conflict(id) do update set oyun_kullanici_adi=excluded.oyun_kullanici_adi;
            return json_build_object('basarili',true,'oyun_kullanici_adi',p_ad); end $$;`);
        const sql=fs.readFileSync('migrations/005_genel_kullanici_adi.sql','utf8');
        await db.exec(sql);await db.exec(sql);
        const uid='11111111-1111-4111-8111-111111111111';
        await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false); set role authenticated;`);
        const sonuc=(await db.query("select public.kullanici_adi_ayarla('ktulu_ogrenci') r")).rows[0].r;
        await db.exec('reset role');
        const profil=(await db.query('select kullanici_adi,oyun_kullanici_adi from public.kullanici_profilleri')).rows[0];
        assert.equal(sonuc.kullanici_adi,'ktulu_ogrenci');
        assert.deepEqual(profil,{kullanici_adi:'ktulu_ogrenci',oyun_kullanici_adi:'ktulu_ogrenci'});
    }finally{await db.close();}
});
