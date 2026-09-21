const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Soru emoji tepkileri üyelik, sahiplik ve tek tepki kurallarını uygular', async t => {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    const owner = '11111111-1111-4111-8111-111111111111';
    const member = '22222222-2222-4222-8222-222222222222';
    const other = '33333333-3333-4333-8333-333333333333';
    const approved = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const pending = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    try {
        await db.exec(`
            create role anon; create role authenticated;
            create schema auth;
            create table auth.users(id uuid primary key, email text not null);
            create function auth.uid() returns uuid language sql stable as
                $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
            create table public.sorular(
                id uuid primary key,
                kullanici_id uuid not null references auth.users(id),
                durum text not null
            );
            create function public.nk_dogrulanmis_uye(u uuid) returns boolean language sql stable as
                $$ select u is not null and exists(select 1 from auth.users where id = u and email like '%@ogr.ktu.edu.tr') $$;
            insert into auth.users values
                ('${owner}', 'owner@ogr.ktu.edu.tr'),
                ('${member}', 'member@ogr.ktu.edu.tr'),
                ('${other}', 'other@example.com');
            insert into public.sorular values
                ('${approved}', '${owner}', 'onaylandi'),
                ('${pending}', '${owner}', 'beklemede');
        `);
        const migration = fs.readFileSync('migrations/008_soru_emoji_tepkileri.sql', 'utf8');
        await db.exec(migration);
        await db.exec(migration);

        await t.test('Tablo doğrudan tarayıcı rollerine açılmaz; RPC yalnız üyeye verilir', async () => {
            const { rows } = await db.query(`select
                has_table_privilege('authenticated', 'public.nk_soru_ifadeleri', 'select') as tablo_okuma,
                has_function_privilege('anon', 'public.nk_soru_ifade_ayarla(uuid,text)', 'execute') as anon_rpc,
                has_function_privilege('authenticated', 'public.nk_soru_ifade_ayarla(uuid,text)', 'execute') as uye_rpc`);
            assert.deepEqual(rows[0], { tablo_okuma: false, anon_rpc: false, uye_rpc: true });
        });

        await db.query("select set_config('request.jwt.claim.sub', $1, false)", [member]);
        await t.test('Özet, tepkisiz onaylı soruyu sıfır sayaçlarla döndürür', async () => {
            const result = (await db.query('select public.nk_soru_ifade_ozetleri(array[$1]::uuid[]) r', [approved])).rows[0].r;
            assert.equal(result.length, 1);
            assert.deepEqual(result[0], { soru_id: approved, faydali: 0, tesekkur: 0, zor: 0, benim_ifadem: null });
        });

        await t.test('Aynı kullanıcı tepkisini değiştirebilir ve yeniden basarak kaldırabilir', async () => {
            const first = (await db.query("select public.nk_soru_ifade_ayarla($1, 'faydali') r", [approved])).rows[0].r;
            assert.equal(first.basarili, true);
            assert.equal(first.faydali, 1);
            assert.equal(first.benim_ifadem, 'faydali');

            const changed = (await db.query("select public.nk_soru_ifade_ayarla($1, 'tesekkur') r", [approved])).rows[0].r;
            assert.equal(changed.faydali, 0);
            assert.equal(changed.tesekkur, 1);
            assert.equal(changed.benim_ifadem, 'tesekkur');
            assert.equal((await db.query('select count(*)::integer n from public.nk_soru_ifadeleri')).rows[0].n, 1);

            const removed = (await db.query("select public.nk_soru_ifade_ayarla($1, 'tesekkur') r", [approved])).rows[0].r;
            assert.equal(removed.tesekkur, 0);
            assert.equal(removed.benim_ifadem, null);
        });

        await t.test('Kendi sorusu, bekleyen soru ve doğrulanmamış hesap reddedilir', async () => {
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
            const own = (await db.query("select public.nk_soru_ifade_ayarla($1, 'zor') r", [approved])).rows[0].r;
            assert.equal(own.hata, 'kendi_icerigin');

            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [member]);
            const closed = (await db.query("select public.nk_soru_ifade_ayarla($1, 'zor') r", [pending])).rows[0].r;
            assert.equal(closed.hata, 'soru_kapali');

            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other]);
            const unverified = (await db.query("select public.nk_soru_ifade_ayarla($1, 'zor') r", [approved])).rows[0].r;
            assert.equal(unverified.hata, 'uyelik_gerekli');
            await assert.rejects(
                db.query('select public.nk_soru_ifade_ozetleri(array[$1]::uuid[])', [approved]),
                error => error.code === '42501'
            );
        });

        await t.test('Soru silinince bağlı tepkiler de silinir', async () => {
            await db.query("select set_config('request.jwt.claim.sub', $1, false)", [member]);
            await db.query("select public.nk_soru_ifade_ayarla($1, 'faydali')", [approved]);
            await db.query('delete from public.sorular where id = $1', [approved]);
            assert.equal((await db.query('select count(*)::integer n from public.nk_soru_ifadeleri')).rows[0].n, 0);
        });
    } finally {
        await db.close();
    }
});
