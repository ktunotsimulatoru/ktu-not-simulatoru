// Canlı Data API'ye yalnızca publishable anahtarla salt okunur/yetkisiz erişim propları yapar.
// Satır gövdelerini yazdırmaz veya dosyaya kaydetmez.
const fs = require('node:fs');
const source = fs.readFileSync('src/scripts/modules/api.mjs', 'utf8');
const base = source.match(/SUPABASE_URL\s*=\s*'([^']+)'/)[1];
const key = source.match(/SUPABASE_KEY\s*=\s*'([^']+)'/)[1];
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const privateTables = ['sorular', 'nk_dosyalar', 'nk_dosya_ayarlari', 'kullanici_profilleri',
    'anket_yanitlari', 'hesaplama_loglari', 'sayfa_goruntuleme', 'ano_ders_loglari', 'ano_hesaplama_gruplari',
    'kayitli_donemler', 'katki_sahipligi', 'duzeltme_talepleri'];
const publicTables = ['fakulteler', 'bolumler', 'dersler', 'nk_dersler', 'ders_verileri', 'duyurular',
    'anketler', 'anket_sorulari'];

async function table(name, expected) {
    const response = await fetch(`${base}/rest/v1/${name}?select=*&limit=1`, {
        headers: { ...headers, Prefer: 'count=exact', Range: '0-0' }, signal: AbortSignal.timeout(15000)
    });
    const range = response.headers.get('content-range') || '';
    const totalText = range.split('/')[1];
    const total = /^\d+$/.test(totalText) ? Number(totalText) : null;
    const blocked = [401, 403, 404].includes(response.status);
    const pass = expected === 'private' ? blocked || (response.ok && total === 0) : response.ok;
    return { tur: 'tablo', ad: name, beklenti: expected, durum: response.status, toplam: total, basarili: pass };
}

async function rpc(name, body, acceptUnauthorizedJson = false) {
    const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    let unauthorized = [401, 403, 404].includes(response.status);
    let code = null;
    if (acceptUnauthorizedJson) {
        try {
            const value = await response.json();
            code = typeof value?.code === 'string' ? value.code : null;
            unauthorized ||= value === false || value?.hata === 'yetkisiz' || value?.basarili === false ||
                /yetkisiz/i.test(String(value?.message || ''));
        } catch { unauthorized = false; }
    }
    return { tur: 'rpc', ad: name, beklenti: 'anon reddedilmeli', durum: response.status,
        hata_kodu: code, yetkisiz_yaniti: unauthorized, basarili: unauthorized };
}

(async () => {
    const results = [];
    for (const name of privateTables) results.push(await table(name, 'private'));
    for (const name of publicTables) results.push(await table(name, 'public-read'));
    results.push(await rpc('nk_dosya_islem', { p_islem: 'quota', p_veri: { uid: '00000000-0000-4000-8000-000000000000' } }));
    results.push(await rpc('admin_soru_listele', { p_admin_token: 'invalid-audit-token', p_durum: 'beklemede' }, true));
    results.push(await rpc('admin_nk_dersler_listele', { p_admin_token: 'invalid-audit-token' }, true));
    results.push(await rpc('admin_isletim_ozeti', { p_admin_token: 'invalid-audit-token' }, true));
    results.push(await rpc('admin_duzeltme_talepleri_listele', {
        p_admin_token: 'invalid-audit-token', p_durum: 'beklemede', p_limit: 1, p_offset: 0
    }, true));
    const report = { zaman: new Date().toISOString(), hedef: new URL(base).host,
        not: 'Satır gövdeleri ve anahtar kaydedilmedi. authenticated/service_role denetimi değildir.', results,
        basarili: results.every(item => item.basarili) };
    fs.writeFileSync('docs/diagnostics/canli-anon-denetimi-sonuc.json', JSON.stringify(report, null, 2) + '\n');
    console.table(results.map(({ ad, beklenti, durum, toplam, basarili }) => ({ ad, beklenti, durum, toplam, basarili })));
    if (!report.basarili) process.exitCode = 1;
})().catch(error => { console.error(`Canlı anon denetimi tamamlanamadı: ${error.message}`); process.exitCode = 2; });
