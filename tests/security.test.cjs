const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHmac } = require('node:crypto');
const paths = require('../src/scripts/dosya-guvenligi.js');
const uid = '11111111-1111-4111-8111-111111111111';
const fileId = '22222222-2222-4222-8222-222222222222';
const validPath = `${uid}/${fileId}.pdf`;
test('Dosya yolu doğrulaması HTML, traversal, yabancı URL ve bozuk dizileri reddeder', () => {
    for (const input of [`${validPath}\" onclick=\"alert(1)`, '../file.pdf', 'javascript:alert(1)',
        `https://example.com/${validPath}`, `${uid}/a.pdf`, `${validPath}?x=1`, null, {}, '%2e%2e/x']) {
        assert.equal(paths.gecerliYol(input), false);
        assert.equal(paths.dosyaUrl(input, 'https://example.com'), null);
    }
    assert.equal(paths.gecerliYol(validPath), true);
    assert.deepEqual(paths.guvenliYollar([validPath, '<img src=x onerror=alert(1)>']), [validPath]);
});
const workerSource = fs.readFileSync('worker/worker.js', 'utf8');
const workerPromise = import('data:text/javascript;base64,' + Buffer.from(workerSource).toString('base64'));
const secret = 'test-only-secret-not-a-deployed-key';
const originalNetworkFetch = global.fetch;
let scanVerdict = 'clean';
let cloudmersiveResult = {CleanResult:true,FoundViruses:[]};
const securityEvents = [];
async function rpcMock(url, options) {
    if (url === 'https://scanner.example/scan') return Response.json({verdict:scanVerdict,engine:'test-av',signature:scanVerdict==='clean'?null:'EICAR-Test'});
    if (url === 'https://api.cloudmersive.com/virus/scan/file/advanced') {
        assert.equal(options.headers.Apikey,'cloud-test-key');assert.ok(options.body instanceof FormData);
        return Response.json(cloudmersiveResult);
    }
    if (url === 'https://tsfscfgwbmiouptsljyi.supabase.co/rest/v1/rpc/nk_guvenlik_islem') {
        securityEvents.push(JSON.parse(options.body)); return Response.json({basarili:true});
    }
    assert.equal(url, 'https://tsfscfgwbmiouptsljyi.supabase.co/rest/v1/rpc/nk_dosya_islem');
    const {p_islem, p_veri} = JSON.parse(options.body);
    if (p_islem === 'reserve') return Response.json({yol: p_veri.uid + '/' + fileId + '.' + ({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[p_veri.mime])});
    return Response.json({basarili:true});
}
before(() => { global.fetch = rpcMock; });
after(() => { global.fetch = originalNetworkFetch; });
function bucketMock(saved) {
    return { put: async (...args) => saved.push(args), head: async () => ({ size: saved.at(-1)[1].length,
        httpMetadata: saved.at(-1)[2].httpMetadata, etag: 'verified-etag' }) };
}

function token(overrides = {}) {
    const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000) + 300, role: 'authenticated',
        aud: 'authenticated', iss: 'https://tsfscfgwbmiouptsljyi.supabase.co/auth/v1',
        sub: uid, email: 'test@ogr.ktu.edu.tr', ...overrides })).toString('base64url');
    return `${head}.${body}.${createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
}
async function upload(body, type = 'application/pdf', claims = {}, length, scanner = true, envOverrides = {}) {
    const { default: worker } = await workerPromise;
    const saved = [];
    const headers = { Authorization: `Bearer ${token(claims)}`, 'Content-Type': type };
    if (length !== undefined) headers['Content-Length'] = String(length);
    const response = await worker.fetch(new Request('https://files.example/upload', { method: 'POST', headers, body, duplex: 'half' }), {
        SUPABASE_JWT_SECRET: secret, SUPABASE_SERVICE_ROLE_KEY: 'test-service',
        ...(scanner ? {MALWARE_SCAN_URL:'https://scanner.example/scan',MALWARE_SCAN_TOKEN:'test-scan-token'} : {}),
        NK_ELEMENT_BUCKET: bucketMock(saved), ...envOverrides
    });
    return { response, saved };
}
test('Content-Length yokken ve yanlış küçükken gerçek 3,5 MB sınırı uygulanır', async () => {
    for (const length of [undefined, 5]) {
        const { response, saved } = await upload(new Uint8Array(3_500_001), 'application/pdf', {}, length);
        assert.equal(response.status, 413);
        assert.equal(saved.length, 0);
    }
});
test('Tarama yoksa kapalı kalır; zararlı sonuç dosyayı saklamadan hesabı incelemeye alır', async () => {
    const unavailable = await upload('%PDF-1.7', 'application/pdf', {}, undefined, false);
    assert.equal(unavailable.response.status, 503);
    assert.equal(unavailable.saved.length, 0);
    scanVerdict = 'malicious';
    const malicious = await upload('%PDF-1.7 EICAR');
    assert.equal(malicious.response.status, 422);
    assert.equal(malicious.saved.length, 0);
    assert.equal(securityEvents.at(-1).p_islem, 'zararli_dosya');
    assert.match(securityEvents.at(-1).p_veri.hash, /^[0-9a-f]{64}$/);
    scanVerdict = 'clean';
});
test('Cloudmersive adaptörü temiz sonucu kabul eder, tehdidi R2 öncesinde durdurur', async () => {
    const env={MALWARE_SCAN_PROVIDER:'cloudmersive',MALWARE_SCAN_TOKEN:'cloud-test-key'};
    cloudmersiveResult={CleanResult:true,FoundViruses:[]};
    const clean=await upload('%PDF-1.7','application/pdf',{},undefined,false,env);
    assert.equal(clean.response.status,200);assert.equal(clean.saved.length,1);
    cloudmersiveResult={CleanResult:false,FoundViruses:[{VirusName:'EICAR-Test-File'}]};
    const malicious=await upload('%PDF-1.7 EICAR','application/pdf',{},undefined,false,env);
    assert.equal(malicious.response.status,422);assert.equal(malicious.saved.length,0);
    assert.equal(securityEvents.at(-1).p_veri.engine,'Cloudmersive Advanced Virus Scan');
    assert.equal(securityEvents.at(-1).p_veri.signature,'EICAR-Test-File');
    cloudmersiveResult={CleanResult:true,FoundViruses:[]};
});
test('Sahte MIME ve boş dosya R2’ye yazılmaz', async () => {
    for (const body of ['<html>not a PDF</html>', '']) {
        const { response, saved } = await upload(body);
        assert.equal(response.status, 400);
        assert.equal(saved.length, 0);
    }
});
test('İzin verilen dosya imzaları doğrulanır ve nosniff gönderilir', async () => {
    const fixtures = [
        ['application/pdf', [0x25,0x50,0x44,0x46,0x2d,0x31]],
        ['image/jpeg', [0xff,0xd8,0xff,0xe0]],
        ['image/png', [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]],
        ['image/webp', [0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]]
    ];
    for (const [type, bytes] of fixtures) {
        const { response, saved } = await upload(new Uint8Array(bytes), type);
        assert.equal(response.status, 200);
        assert.equal(saved.length, 1);
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
        assert.equal(paths.gecerliYol(saved[0][0]), true);
    }
});
test('Yanlış issuer, audience, süre, rol ve kullanıcı kimliği reddedilir', async () => {
    for (const claims of [{ iss: 'https://other.example' }, { aud: 'anon' }, { exp: 0 }, { role: 'anon' },
        { nbf: Math.floor(Date.now()/1000) + 300 }, { sub: '../bad' }]) {
        const { response, saved } = await upload('%PDF-1.7', 'application/pdf', claims);
        assert.equal(response.status, 401);
        assert.equal(saved.length, 0);
    }
});
test('Bozuk URL kodlaması ve geçersiz dosya yolu kontrollü yanıt alır', async () => {
    const { default: worker } = await workerPromise;
    assert.equal((await worker.fetch(new Request('https://files.example/%GG'), {})).status, 400);
    assert.equal((await worker.fetch(new Request('https://files.example/invalid.pdf'), {})).status, 404);
});

test('ES256/JWKS yükleme yolu geçerli imzayı kabul eder, bozuk imzayı reddeder', async () => {
    const { default: worker } = await workerPromise;
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    jwk.kid = 'local-test-key';
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
        if (url === 'https://scanner.example/scan') return rpcMock(url, options);
        if (String(url).includes('/rest/v1/')) return rpcMock(url, options);
        assert.equal(url, 'https://tsfscfgwbmiouptsljyi.supabase.co/auth/v1/.well-known/jwks.json');
        return Response.json({ keys: [jwk] });
    };
    try {
        const head = Buffer.from(JSON.stringify({ alg: 'ES256', kid: jwk.kid })).toString('base64url');
        const payload = token().split('.')[1];
        const signature = Buffer.from(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, Buffer.from(`${head}.${payload}`)));
        const signed = `${head}.${payload}.${signature.toString('base64url')}`;
        const saved = [];
        const env = { SUPABASE_SERVICE_ROLE_KEY: 'test-service', MALWARE_SCAN_URL:'https://scanner.example/scan',
            MALWARE_SCAN_TOKEN:'test-scan-token', NK_ELEMENT_BUCKET: bucketMock(saved) };
        const request = auth => new Request('https://files.example/upload', {
            method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/pdf' }, body: '%PDF-1.7'
        });
        assert.equal((await worker.fetch(request(signed), env)).status, 200);
        signature[0] ^= 0xff;
        assert.equal((await worker.fetch(request(`${head}.${payload}.${signature.toString('base64url')}`), env)).status, 401);
        assert.equal((await worker.fetch(request('broken.token.!'), env)).status, 401);
        assert.equal(saved.length, 1);
    } finally { global.fetch = originalFetch; }
});

