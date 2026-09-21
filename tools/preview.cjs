// Yalnızca yerel hesaplayıcı önizlemesi: Supabase yerine boş test yanıtları kullanır.
// Böylece tarayıcı testleri canlı istatistik veya veritabanına yazmaz.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.NK_PREVIEW_PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Geçersiz önizleme portu');
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Önce npm run build çalıştırın.');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const stub = `(() => {
 const empty = { data: [], error: null, count: 0 };
 const query = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve => Promise.resolve(empty).then(resolve)) : () => query });
 window.supabase = { createClient: () => ({ from: () => query, rpc: () => query,
   auth: { getSession: async () => ({data:{session:null},error:null}),
     onAuthStateChange: cb => { queueMicrotask(() => cb('INITIAL_SESSION', null)); return { data: { subscription: { unsubscribe(){} } } }; }
   } }) };
})();`;
http.createServer((req, res) => {
    try {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (pathname === '/preview-private-files.html' || pathname === '/preview-private-fixture.js') {
            const fixture = pathname.endsWith('.html') ? 'private-files.html' : 'private-files.js';
            res.setHeader('Content-Type', mime[path.extname(fixture)]);
            res.setHeader('Content-Security-Policy', "connect-src 'none'");
            return res.end(fs.readFileSync(path.join(__dirname, 'fixtures', fixture)));
        }
        if (pathname === '/preview-supabase.js') { res.setHeader('Content-Type', mime['.js']); return res.end(stub); }
        const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
        const relative = path.relative(root, file);
        if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('.')) ||
            relative.includes('node_modules') || !mime[path.extname(file)]) { res.writeHead(404); return res.end(); }
        let content = fs.readFileSync(file);
        if (file.endsWith('.html')) content = content.toString()
            .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"\s]+/g, '/preview-supabase.js')
            .replace(/vendor-supabase\.js/g, 'preview-supabase.js');
        res.setHeader('Content-Type', mime[path.extname(file)]);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src-elem 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' blob: data:; connect-src 'none'; frame-src 'none'; worker-src 'none'");
        res.end(req.method === 'HEAD' ? undefined : content);
    } catch { res.writeHead(404); res.end('Bulunamadı'); }
}).listen(port, '127.0.0.1', () => console.log(`Yerel önizleme: http://127.0.0.1:${port} (Supabase test yanıtları)`));
