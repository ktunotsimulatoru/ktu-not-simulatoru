const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('010 migrationı yönetici okumalarını, platform özetini ve beş dosyalı paylaşımı kurar', async t => {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    const owner = '11111111-1111-4111-8111-111111111111';
    try {
        await db.exec(`
            create role anon; create role authenticated; create schema auth;
            create table auth.users(id uuid primary key);
            create table public.admin_token_dokunus(n integer not null default 0);
            insert into public.admin_token_dokunus values(0);
            create function public._admin_token_gecerli_mi(t text) returns boolean language plpgsql volatile as $$
            begin update public.admin_token_dokunus set n=n+1; return t='test-admin'; end $$;
            create function public.nk_ek_yollari_gecerli(p_yollar text[],p_kullanici uuid) returns boolean language sql immutable as $$
                select cardinality(p_yollar) between 1 and 3 and p_kullanici is not null $$;
            create table public.kullanici_profilleri(id uuid primary key,kullanici_adi text);
            create table public.dersler(id integer primary key);
            create table public.ders_verileri(id integer primary key);
            create table public.kayitli_donemler(id integer primary key);
            create table public.nk_dersler(id integer primary key);
            create table public.sorular(
                id uuid primary key,kullanici_id uuid not null,sinav_turu text not null,
                element_yollari text[] not null,durum text not null,
                constraint sorular_sinav_turu_eski check(sinav_turu in('vize','final','butunleme')),
                constraint sorular_element_max3 check(cardinality(element_yollari) between 1 and 3),
                constraint sorular_ek_yolu_guvenli check(public.nk_ek_yollari_gecerli(element_yollari,kullanici_id)));
            create table public.nk_dosyalar(yol text primary key,durum text not null);
            create table public.nk_soru_ifadeleri(id integer);
            create table public.nk_icerik_bildirimleri(id integer,durum text);
            create table public.duzeltme_talepleri(id integer,durum text);

            create function public.admin_nk_moderasyon_gecmisi(text,text,text) returns jsonb language plpgsql stable as $$begin perform public._admin_token_gecerli_mi($1);return '{}'::jsonb;end$$;
            create function public.admin_nk_ders_ara(text,text,integer,integer,integer) returns jsonb language plpgsql stable as $$begin perform public._admin_token_gecerli_mi($1);return '{}'::jsonb;end$$;
            create function public.admin_nk_bildirim_listele(text,text,integer,integer) returns jsonb language plpgsql stable as $$begin perform public._admin_token_gecerli_mi($1);return '{}'::jsonb;end$$;
            create function public.admin_duzeltme_talepleri_listele(text,text,integer,integer) returns jsonb language plpgsql stable as $$begin perform public._admin_token_gecerli_mi($1);return '{}'::jsonb;end$$;
            create function public.admin_isletim_ozeti(text) returns jsonb language plpgsql stable as $$begin perform public._admin_token_gecerli_mi($1);return '{}'::jsonb;end$$;

            insert into auth.users values('${owner}');
            insert into public.kullanici_profilleri values('${owner}','ogrenci');
            insert into public.dersler values(1); insert into public.ders_verileri values(1);
            insert into public.kayitli_donemler values(1); insert into public.nk_dersler values(1);
            insert into public.nk_dosyalar values('ornek','attached');
            insert into public.nk_soru_ifadeleri values(1);
            insert into public.nk_icerik_bildirimleri values(1,'acik');
            insert into public.duzeltme_talepleri values(1,'beklemede');
        `);

        const migration = fs.readFileSync('migrations/010_admin_istatistik_ve_not_kutusu_genisletme.sql', 'utf8');
        await db.exec(migration);
        await db.exec(migration);

        await t.test('Tokena dokunan yönetici okumaları artık VOLATILE çalışır', async () => {
            const { rows } = await db.query(`select proname,provolatile from pg_proc where proname in
                ('admin_nk_moderasyon_gecmisi','admin_nk_ders_ara','admin_nk_bildirim_listele','admin_duzeltme_talepleri_listele','admin_isletim_ozeti')`);
            assert.equal(rows.length, 5);
            assert.ok(rows.every(r => r.provolatile === 'v'));
            await db.exec(`select public.admin_nk_ders_ara('test-admin',null,10,0,null);
                select public.admin_nk_bildirim_listele('test-admin','acik',10,0);
                select public.admin_duzeltme_talepleri_listele('test-admin','beklemede',10,0);`);
            assert.equal((await db.query('select n from public.admin_token_dokunus')).rows[0].n, 3);
        });

        await t.test('Platform özeti içerik göstermeden yeni sayaçları döndürür', async () => {
            const sonuc = (await db.query("select public.admin_platform_ozeti('test-admin') sonuc")).rows[0].sonuc;
            assert.equal(Number(sonuc.kayitli_kullanici), 1);
            assert.equal(Number(sonuc.ders_verisi), 1);
            assert.equal(Number(sonuc.kayitli_agno_donemi), 1);
            assert.equal(Number(sonuc.emoji_tepkisi), 1);
            assert.equal(Number(sonuc.acik_bildirim), 1);
        });

        await t.test('Yeni türler ve beş dosya kabul edilir, altıncı dosya reddedilir', async () => {
            const yollar = Array.from({ length: 6 }, (_, i) => `${owner}/00000000-0000-4000-8000-00000000000${i}.jpg`);
            await db.query('insert into public.sorular values($1,$2,$3,$4,$5)',
                ['22222222-2222-4222-8222-222222222222', owner, 'ders_notu', yollar.slice(0, 5), 'beklemede']);
            await db.query('insert into public.sorular values($1,$2,$3,$4,$5)',
                ['33333333-3333-4333-8333-333333333333', owner, 'diger', [yollar[0]], 'beklemede']);
            await assert.rejects(db.query('insert into public.sorular values($1,$2,$3,$4,$5)',
                ['44444444-4444-4444-8444-444444444444', owner, 'final', yollar, 'beklemede']), e => e.code === '23514');
        });
    } finally {
        await db.close();
    }
});

test('Not Kutusu arayüzü yeni paylaşım seçeneklerini ve istemci sınırını gösterir', () => {
    const html = fs.readFileSync('src/pages/not-kutusu.html', 'utf8');
    const js = fs.readFileSync('src/scripts/not-kutusu.js', 'utf8');
    const admin = fs.readFileSync('src/scripts/admin-panel.js', 'utf8');
    assert.match(html, /value="ders_notu"/);
    assert.match(html, /value="diger"/);
    assert.match(html, /En fazla 5 dosya/);
    assert.match(js, /NK_ELEMENT_MAX_ADET = 5/);
    assert.match(js, /3200/);
    assert.match(js, /0\.94/);
    assert.match(admin, /admin_platform_ozeti/);
});
