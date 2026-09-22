const HEADER_CSP = "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://static.cloudflareinsights.com/beacon.min.js; style-src-elem 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' blob: data:; connect-src 'self' https://tsfscfgwbmiouptsljyi.supabase.co wss://tsfscfgwbmiouptsljyi.supabase.co https://not-kutusu.elements0.workers.dev; media-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'self'; upgrade-insecure-requests";

// frame-ancestors yalnızca HTTP başlığında çalışır; meta CSP içinde kullanılmaz.
const META_CSP = HEADER_CSP.replace(/; frame-ancestors 'none'/, '');

module.exports = { HEADER_CSP, META_CSP };
