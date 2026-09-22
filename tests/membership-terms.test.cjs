const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Üyelik koşulları sunucuda doğrulanır ve sürümlü kabul kaydı oluşturur', async t => {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    const oldUser = '11111111-1111-4111-8111-111111111111';
    const newUser = '22222222-2222-4222-8222-222222222222';
    const validMeta = {
        kullanim_kosullari_kabul: true,
        kullanim_kosullari_surumu: '2026-09-22',
        kvkk_aydinlatma_okundu: true,
        kvkk_aydinlatma_surumu: '2026-09-22'
    };
    const event = (email, user_metadata) => JSON.stringify({ user: { email, user_metadata } });
    try {
        await db.exec(`
            create role anon; create role authenticated; create role supabase_auth_admin;
            create schema auth;
            create table auth.users(
                id uuid primary key,
                email text,
                raw_user_meta_data jsonb not null default '{}'::jsonb
            );
            insert into auth.users(id,email) values ('${oldUser}','eski@ogr.ktu.edu.tr');
        `);
        const migration = fs.readFileSync('migrations/013_uyelik_kosullari_kabulu.sql', 'utf8');
        await db.exec(migration);
        await db.exec(migration);

        await t.test('Eksik beyan ve yabancı alan adı hesap oluşturulmadan reddedilir', async () => {
            const missing = (await db.query(
                'select public.uyelik_kosullari_kontrol($1::jsonb) sonuc',
                [event('yeni@ogr.ktu.edu.tr', {})]
            )).rows[0].sonuc;
            assert.equal(missing.error.http_code, 403);
            assert.match(missing.error.message, /Kullanım Koşulları/);

            const foreign = (await db.query(
                'select public.uyelik_kosullari_kontrol($1::jsonb) sonuc',
                [event('yeni@example.com', validMeta)]
            )).rows[0].sonuc;
            assert.equal(foreign.error.http_code, 403);
        });

        await t.test('Güncel iki beyan hook tarafından kabul edilir', async () => {
            const allowed = (await db.query(
                'select public.uyelik_kosullari_kontrol($1::jsonb) sonuc',
                [event('yeni@ogr.ktu.edu.tr', validMeta)]
            )).rows[0].sonuc;
            assert.deepEqual(allowed, {});
        });

        await t.test('Yeni kabul sunucu zamanıyla yazılır, eski kullanıcıya geriye dönük kayıt üretilmez', async () => {
            await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3::jsonb)',
                [newUser, 'yeni@ogr.ktu.edu.tr', JSON.stringify(validMeta)]);
            const { rows } = await db.query(`select kullanici_id::text, kullanim_kosullari_surumu,
                kvkk_aydinlatma_surumu, kabul_tarihi is not null as tarih_var
                from public.uyelik_kabulleri order by kullanici_id`);
            assert.deepEqual(rows, [{ kullanici_id: newUser, kullanim_kosullari_surumu: '2026-09-22',
                kvkk_aydinlatma_surumu: '2026-09-22', tarih_var: true }]);
        });

        await t.test('Kabul tablosu ve hook tarayıcı rollerine kapalıdır', async () => {
            const { rows } = await db.query(`select
                has_table_privilege('authenticated','public.uyelik_kabulleri','select') tablo,
                has_function_privilege('anon','public.uyelik_kosullari_kontrol(jsonb)','execute') anon_hook,
                has_function_privilege('supabase_auth_admin','public.uyelik_kosullari_kontrol(jsonb)','execute') auth_hook`);
            assert.deepEqual(rows[0], { tablo: false, anon_hook: false, auth_hook: true });
        });
    } finally { await db.close(); }
});

test('Kayıt arayüzü ayrı koşul kabulü ve KVKK bilgilendirme beyanı gönderir', () => {
    const account = fs.readFileSync('src/scripts/modules/account.mjs', 'utf8');
    const terms = fs.readFileSync('src/pages/kullanim-kosullari.html', 'utf8');
    const privacy = fs.readFileSync('src/pages/gizlilik-politikasi.html', 'utf8');
    const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
    assert.match(account, /id="hs-kullanim-kosullari-kabul"/);
    assert.match(account, /id="hs-kvkk-aydinlatma-okundu"/);
    assert.match(account, /kullanim_kosullari_surumu: HS_KULLANIM_KOSULLARI_SURUMU/);
    assert.match(account, /kvkk_aydinlatma_surumu: HS_KVKK_AYDINLATMA_SURUMU/);
    assert.match(terms, /Sürüm: 2026-09-22/);
    assert.doesNotMatch(privacy, /adımları tamamlamanız açık rızanız anlamına gelir/i);
    assert.match(sitemap, /kullanim-kosullari\.html/);
});
