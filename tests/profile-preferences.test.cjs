const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Kullanıcı adı ve hesaba bağlı duyuru tercihleri güvenli çalışır', async t => {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    const member = '11111111-1111-4111-8111-111111111111';
    const other = '22222222-2222-4222-8222-222222222222';
    try {
        await db.exec(`
            create role anon; create role authenticated;
            create schema auth;
            create table auth.users(id uuid primary key, email text);
            create function auth.uid() returns uuid language sql stable as
                $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
            create table public.kullanici_profilleri(
                id uuid primary key references auth.users(id),
                oyun_kullanici_adi text,
                guncelleme_tarihi timestamptz not null default now()
            );
            create table public.ny_kullanicilar(kullanici_adi text);
            create table public.duyurular(id bigint primary key, baslik text);
            insert into auth.users values
                ('${member}', 'member@ogr.ktu.edu.tr'), ('${other}', 'other@ogr.ktu.edu.tr');
            insert into public.kullanici_profilleri values
                ('${member}', 'EskiAd', now()), ('${other}', 'Ali', now());
            insert into public.ny_kullanicilar values('EskiAd'), ('DonukAd');
            insert into public.duyurular values(1, 'Bakım'), (2, 'Yeni özellik');
        `);
        const migration = fs.readFileSync('migrations/009_profil_ve_duyuru_tercihleri.sql', 'utf8');
        await db.exec(migration);
        await db.exec(migration);

        await db.query("select set_config('request.jwt.claim.sub', $1, false)", [member]);
        await t.test('Adlar büyük-küçük harfe duyarsız benzersizdir ve boşluk reddedilir', async () => {
            const invalid = (await db.query("select public.kullanici_adi_ayarla('Mustafa TAŞ') r")).rows[0].r;
            assert.equal(invalid.hata, 'gecersiz_ad');
            const taken = (await db.query("select public.kullanici_adi_ayarla('aLI') r")).rows[0].r;
            assert.equal(taken.hata, 'ad_alinmis');
            const frozen = (await db.query("select public.kullanici_adi_ayarla('DonukAd') r")).rows[0].r;
            assert.equal(frozen.hata, 'ad_alinmis');
            const unchanged = (await db.query("select public.kullanici_adi_ayarla('eskiad') r")).rows[0].r;
            assert.equal(unchanged.basarili, true);
            assert.equal(unchanged.kullanici_adi, 'EskiAd');
            const saved = (await db.query("select public.kullanici_adi_ayarla('Mustafa_TAŞ') r")).rows[0].r;
            assert.equal(saved.kullanici_adi, 'Mustafa_TAŞ');
        });

        await t.test('Kapatılan duyuru yalnız hesaba bağlanır', async () => {
            const closed = (await db.query("select public.duyuru_kapat('1') r")).rows[0].r;
            assert.equal(closed.basarili, true);
            assert.deepEqual((await db.query('select public.kapatilan_duyurularim() r')).rows[0].r, ['1']);
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other]);
            assert.deepEqual((await db.query('select public.kapatilan_duyurularim() r')).rows[0].r, []);
        });

        await t.test('Tercih tablosu tarayıcıya doğrudan açılmaz', async () => {
            const { rows } = await db.query(`select
                has_table_privilege('authenticated','public.kullanici_duyuru_kapatmalari','select') tablo,
                has_function_privilege('anon','public.duyuru_kapat(text)','execute') anon_rpc,
                has_function_privilege('authenticated','public.duyuru_kapat(text)','execute') uye_rpc`);
            assert.deepEqual(rows[0], { tablo: false, anon_rpc: false, uye_rpc: true });
        });
    } finally { await db.close(); }
});
