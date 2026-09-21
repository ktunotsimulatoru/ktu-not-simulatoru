const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderPage } = require('../tools/templates.cjs');
const { HEADER_CSP, META_CSP } = require('../tools/security-config.cjs');

test('HTML çalıştırılabilir inline script, inline olay ve harici JavaScript içermez', () => {
    for (const name of fs.readdirSync('src/pages').filter(name => name.endsWith('.html'))) {
        const html = renderPage(fs.readFileSync(path.join('src/pages', name), 'utf8'));
        assert.doesNotMatch(html, /\son[a-z]+\s*=/i, name);
        assert.doesNotMatch(html, /<style\b/i, name);
        assert.match(html, /<meta\s+http-equiv="Content-Security-Policy"/i, name);
        for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            if (!/application\/ld\+json/i.test(script[1])) assert.equal(script[2].trim(), '', name);
            const src = script[1].match(/\bsrc=["']([^"']+)/i)?.[1];
            if (src) assert.doesNotMatch(src, /^(?:https?:)?\/\//i, name);
        }
    }
});

test('Meta CSP başlık CSP ile aynı kaynaktan gelir ve meta için geçersiz direktif içermez', () => {
    assert.equal(META_CSP, HEADER_CSP.replace(/; frame-ancestors 'none'/, ''));
    assert.doesNotMatch(META_CSP, /frame-ancestors/);
    assert.doesNotMatch(META_CSP, /script-src[^;]*unsafe-(?:inline|eval)/);
});

test('CSP script için unsafe-inline ve unsafe-eval açmaz; temel başlıklar vardır', () => {
    const headers = fs.readFileSync('public/_headers', 'utf8');
    const csp = headers.match(/Content-Security-Policy:\s*([^\r\n]+)/)[1];
    assert.equal(csp, HEADER_CSP);
    assert.match(csp, /script-src 'self'/);
    assert.doesNotMatch(csp, /script-src[^;]*unsafe-(?:inline|eval)/);
    for (const name of ['default-src', 'base-uri', 'object-src', 'frame-ancestors', 'form-action', 'connect-src'])
        assert.match(csp, new RegExp(`(?:^|; )${name} `));
    for (const name of ['Strict-Transport-Security', 'Referrer-Policy', 'X-Content-Type-Options',
        'Permissions-Policy', 'Cross-Origin-Opener-Policy']) assert.match(headers, new RegExp(name + ':'));
});

test('Olay köprüsündeki her işlem sabit izin listesinde bulunur', () => {
    const bridge = fs.readFileSync('src/scripts/event-bindings.js', 'utf8');
    const allowed = new Set(JSON.parse(bridge.match(/new Set\((\[[^;]+\])\)/)[1]));
    const roots = ['src/pages', 'src/templates', 'src/scripts'];
    function walk(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) walk(file);
            else if (/\.(html|js|mjs)$/.test(file)) {
                const source = fs.readFileSync(file, 'utf8');
                for (const match of source.matchAll(/data-nk-(?:click|change|input|keydown)="([\w$]+)"/g))
                    assert.ok(allowed.has(match[1]), `${file}: ${match[1]}`);
            }
        }
    }
    roots.forEach(walk);
});
