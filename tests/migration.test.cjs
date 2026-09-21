const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Güvenlik migrationı veri korur ve yeniden uygulanabilir', async t => {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    const creator = '11111111-1111-4111-8111-111111111111';
    const owner = '22222222-2222-4222-8222-222222222222';
    const file = `${owner}/33333333-3333-4333-8333-333333333333.pdf`;
    try {
        await db.exec(`
            create schema auth;
            create table auth.users(id uuid primary key);
            create table public.nk_dersler(id integer primary key,
                ekleyen_kullanici_id uuid not null references auth.users(id) on delete cascade);
            create table public.sorular(id uuid primary key,
                ders_id integer references public.nk_dersler(id) on delete cascade,
                kullanici_id uuid references auth.users(id) on delete cascade,
                element_yollari text[] not null default '{}');
            create function public._admin_token_gecerli_mi(token text) returns boolean
                language sql as $$ select token = 'test-admin'; $$;
            insert into auth.users values ('${creator}'), ('${owner}');
            insert into public.nk_dersler values (1, '${creator}');
            insert into public.sorular values ('44444444-4444-4444-8444-444444444444', 1, '${owner}', array['${file}']);
            insert into public.sorular values ('55555555-5555-4555-8555-555555555555', 1, '${owner}', array['legacy-invalid-path']);
        `);
        const migration = fs.readFileSync('migrations/001_not_kutusu_guvenlik.sql', 'utf8');
        await db.exec(migration);
        await db.exec(migration);
        await t.test('Eski geçersiz kayıt bile otomatik silinmez', async () => {
            const { rows } = await db.query('select count(*)::integer as n from public.sorular');
            assert.equal(rows[0].n, 2);
        });
        await t.test('Kurucu hesap silinince ortak ders ve diğer öğrencilerin soruları kalır', async () => {
            await db.query('delete from auth.users where id = $1', [creator]);
            assert.equal((await db.query('select ekleyen_kullanici_id from public.nk_dersler')).rows[0].ekleyen_kullanici_id, null);
            assert.equal((await db.query('select count(*)::integer as n from public.sorular')).rows[0].n, 2);
        });
        await t.test('Soru içeren dersin doğrudan ve RPC ile silinmesi engellenir', async () => {
            await assert.rejects(db.query('delete from public.nk_dersler where id = 1'), error => ['23503', '23001'].includes(error.code));
            const { rows } = await db.query("select public.admin_nk_ders_sil('test-admin', 1) as result");
            assert.equal(rows[0].result.basarili, false);
            assert.match(rows[0].result.hata, /soru var/);
        });
        await t.test('Yetkisiz admin RPC çağrısı reddedilir', async () => {
            const { rows } = await db.query("select public.admin_nk_ders_sil('wrong-token', 1) as result");
            assert.equal(rows[0].result.hata, 'yetkisiz');
        });
        await t.test('Yeni kayıtta boş, kötü biçimli, fazla veya başkasına ait ek reddedilir', async () => {
            for (const paths of [[], [null], ['<img onerror=alert(1)>'], [file.replace(owner, creator)], [file,file,file,file]]) {
                await assert.rejects(db.query('insert into public.sorular values ($1, 1, $2, $3::text[])',
                    ['66666666-6666-4666-8666-666666666666', owner, paths]), error => error.code === '23514');
            }
            await db.query('insert into public.sorular values ($1, 1, $2, $3::text[])',
                ['66666666-6666-4666-8666-666666666666', owner, [file]]);
        });
    } finally { await db.close(); }
});
