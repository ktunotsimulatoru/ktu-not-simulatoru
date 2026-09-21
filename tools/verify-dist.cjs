const path = require('node:path');
const fs = require('node:fs');
function verifyFiles(files) {
    const errors = [];
    for (const [name, data] of files) {
        if (/(^|\/)(?:node_modules|worker|migrations|tests|tools|docs)(\/|$)|\.(?:sql|toml|cjs|md|map)$|(^|\/)\.env/.test(name)) {
            errors.push(`Yayın paketinde geliştirme dosyası: ${name}`);
        }
        if (name.endsWith('.html')) {
            const html = data.toString();
            if (/\son[a-z]+\s*=/i.test(html)) errors.push(`${name}: inline olay özniteliği var`);
            if (/<style\b/i.test(html)) errors.push(`${name}: inline style bloğu var`);
            if (/<head\b/i.test(html)) {
                const metaCsp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] || '';
                if (!metaCsp.includes("script-src 'self'") || /script-src[^;]*unsafe-(?:inline|eval)/.test(metaCsp))
                    errors.push(`${name}: katı meta CSP eksik`);
            }
            for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
                if (!/\bsrc\s*=|application\/ld\+json/i.test(script[1]) && script[2].trim())
                    errors.push(`${name}: çalıştırılabilir inline script var`);
                const src = script[1].match(/\bsrc\s*=\s*["']([^"']+)/i)?.[1];
                if (src && /^(?:https?:)?\/\//i.test(src)) errors.push(`${name}: harici script var: ${src}`);
            }
        }
        if (!/\.(html|css)$/.test(name)) continue;
        const content = data.toString().replace(/<!--[^]*?-->/g, '').replace(/\/\*[^]*?\*\//g, '')
            .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
        const urls = [...content.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
        for (const match of content.matchAll(/\burl\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) urls.push(match[1]);
        for (const url of urls) {
            if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url) || url.includes('${')) continue;
            const withoutQuery = decodeURIComponent(url.split(/[?#]/)[0]);
            if (!withoutQuery) continue;
            let target = path.posix.normalize(withoutQuery.startsWith('/') ? withoutQuery.slice(1) : path.posix.join(path.posix.dirname(name), withoutQuery));
            if (target === '.' || target.endsWith('/')) target = target === '.' ? 'index.html' : target + 'index.html';
            if (!files.has(target)) errors.push(`${name}: eksik yerel dosya ${url}`);
        }
    }
    for (const required of ['index.html', 'CNAME', 'robots.txt', 'sitemap.xml', '_headers', 'script.min.js',
        'not-kutusu.min.js', 'admin-panel.js', 'event-bindings.js', 'theme-boot.js', 'privacy.js', 'course-code.js',
        'modal-accessibility.js',
        'vendor-supabase.js', 'vendor-chart.js', 'style.min.css', 'privacy.css', 'admin.css', 'dosya-guvenligi.js']) {
        if (!files.has(required)) errors.push(`Gerekli yayın dosyası yok: ${required}`);
    }
    const headers = files.get('_headers')?.toString() || '';
    const csp = headers.match(/Content-Security-Policy:\s*([^\r\n]+)/i)?.[1] || '';
    if (!csp.includes("script-src 'self'") || /script-src[^;]*unsafe-(?:inline|eval)/.test(csp))
        errors.push('_headers: script CSP katı değil');
    for (const header of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy',
        'Permissions-Policy', 'Cross-Origin-Opener-Policy']) {
        if (!headers.includes(header + ':')) errors.push(`_headers: ${header} eksik`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
}
module.exports = { verifyFiles };
if (require.main === module) {
    const root = path.resolve(__dirname, '../dist');
    const files = new Map();
    function walk(dir, prefix = '') {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name), name = prefix + entry.name;
            if (entry.isDirectory()) walk(file, name + '/');
            else files.set(name, fs.readFileSync(file));
        }
    }
    walk(root); verifyFiles(files); console.log('dist: bağlantılar ve yayın içeriği geçerli.');
}
