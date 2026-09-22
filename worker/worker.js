// Özel dosya erişimi, kota rezervasyonu ve yeniden denenebilir R2 temizliği.
// Kurulum ve geçiş sırası: docs/DOSYA_YASAM_DONGUSU.md
const IZINLI_TIPLER = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAKS_BOYUT = 3_500_000; // Cloudmersive ücretsiz katmanıyla uyumlu 3,5 MB kesin sunucu sınırı
const UUID_DESENI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Content-Length isteğe bağlıdır; gerçek sınır akış okunurken uygulanır.
async function sinirliGovdeOku(body, limit = MAKS_BOYUT) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        const error = new Error('dosya_cok_buyuk');
        error.status = 413;
        throw error;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function dosyaImzasiGecerli(bytes, tip) {
  const starts = signature => signature.every((byte, index) => bytes[index] === byte);
  if (tip === 'image/jpeg') return bytes.length >= 4 && starts([0xff, 0xd8, 0xff]);
  if (tip === 'image/png') return bytes.length >= 8 && starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (tip === 'image/webp') return bytes.length >= 12 && starts([0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (tip === 'application/pdf') return bytes.length >= 5 && starts([0x25, 0x50, 0x44, 0x46, 0x2d]);
  return false;
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

// Harici tarayıcı sözleşmesi: ham dosya gövdesine karşılık
// { verdict: 'clean'|'malicious'|'suspicious', engine?, signature?, scan_id? }.
// Tarayıcı tanımlı değilse veya kesin "clean" üretemezse yükleme kapalı kalır.
function tarayiciAyari(env, yedek = false) {
  if (yedek) return {
    provider: String(env.MALWARE_SCAN_FALLBACK_PROVIDER || '').toLowerCase(),
    token: env.MALWARE_SCAN_FALLBACK_TOKEN,
    url: env.MALWARE_SCAN_FALLBACK_URL,
    key: env.MALWARE_SCAN_FALLBACK_KEY,
    secret: env.MALWARE_SCAN_FALLBACK_SECRET,
  };
  return {
    provider: String(env.MALWARE_SCAN_PROVIDER || 'generic').toLowerCase(),
    token: env.MALWARE_SCAN_TOKEN,
    url: env.MALWARE_SCAN_URL,
  };
}

function tarayiciHazir(ayar) {
  if (ayar.provider === 'cloudmersive') return Boolean(ayar.token);
  if (ayar.provider === 'generic') return Boolean(ayar.token && ayar.url);
  if (ayar.provider === 'scanii') return Boolean(ayar.key && ayar.secret);
  return false;
}

function taramaSonucu(result) {
  const { retryable, ...publicResult } = result;
  return publicResult;
}

function scaniiBulguMetni(finding) {
  if (typeof finding === 'string') return finding;
  if (!finding || typeof finding !== 'object') return '';
  return String(finding.name || finding.description || finding.type || '');
}

async function tekTarayiciIleTara(bytes, mime, ayar, hash) {
  const provider = ayar.provider;
  if (!tarayiciHazir(ayar)) return { verdict: 'unavailable', hash, retryable: false };
  let response;
  try {
    if (provider === 'cloudmersive') {
      const form = new FormData();
      form.append('inputFile', new Blob([bytes], { type: mime }), `upload.${IZINLI_TIPLER[mime]}`);
      response = await fetch('https://api.cloudmersive.com/virus/scan/file/advanced', {
        method: 'POST',
        headers: {
          Apikey: ayar.token,
          fileName: `upload.${IZINLI_TIPLER[mime]}`,
          allowExecutables: 'false', allowInvalidFiles: 'false', allowScripts: 'false',
        },
        body: form,
        signal: AbortSignal.timeout(30000),
      });
    } else if (provider === 'generic') {
      response = await fetch(ayar.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ayar.token}`,
          'Content-Type': mime,
          'X-Content-SHA256': hash,
        },
        body: bytes,
        signal: AbortSignal.timeout(30000),
      });
    } else if (provider === 'scanii') {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: mime }), `upload.${IZINLI_TIPLER[mime]}`);
      response = await fetch('https://api-eu1.scanii.com/v2.2/files', {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${ayar.key}:${ayar.secret}`)}` },
        body: form,
        signal: AbortSignal.timeout(30000),
      });
    } else return { verdict: 'unavailable', hash, retryable: false };
  } catch { return { verdict: 'unavailable', hash, retryable: true }; }
  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
    return { verdict: 'unavailable', hash, retryable };
  }
  let result;
  try { result = await response.json(); }
  catch { return { verdict: 'unavailable', hash, retryable: true }; }
  if (provider === 'cloudmersive') {
    if (typeof result?.CleanResult !== 'boolean') return { verdict: 'unavailable', hash, retryable: true };
    const viruses = Array.isArray(result.FoundViruses) ? result.FoundViruses : [];
    const reasons = [
      ...viruses.map(value => value?.VirusName).filter(Boolean),
      ...['ContainsExecutable','ContainsInvalidFile','ContainsScript','ContainsPasswordProtectedFile','ContainsUnsafeArchive']
        .filter(key => result[key] === true),
    ];
    return {
      verdict: result.CleanResult ? 'clean' : (viruses.length ? 'malicious' : 'suspicious'),
      hash, engine: 'Cloudmersive Advanced Virus Scan',
      signature: reasons.join(', ').slice(0, 160) || null,
      scan_id: null,
    };
  }
  if (provider === 'scanii') {
    if (!Array.isArray(result?.findings) || typeof result?.id !== 'string') {
      return { verdict: 'unavailable', hash, retryable: true };
    }
    const findings = result.findings.map(scaniiBulguMetni).filter(Boolean);
    return {
      verdict: findings.length ? 'malicious' : 'clean',
      hash, engine: 'Scanii Content Identification',
      signature: findings.join(', ').slice(0, 160) || null,
      scan_id: result.id.slice(0, 160),
    };
  }
  const verdict = String(result?.verdict || '').toLowerCase();
  if (!['clean', 'malicious', 'suspicious'].includes(verdict)) return { verdict: 'unavailable', hash, retryable: true };
  return {
    verdict, hash,
    engine: String(result.engine || 'harici-tarayici').slice(0, 80),
    signature: String(result.signature || '').slice(0, 160) || null,
    scan_id: String(result.scan_id || '').slice(0, 160) || null,
  };
}

async function zararliYazilimTara(bytes, mime, env) {
  const hash = await sha256Hex(bytes);
  const birincilAyar = tarayiciAyari(env);
  const birincil = await tekTarayiciIleTara(bytes, mime, birincilAyar, hash);
  if (birincil.verdict !== 'unavailable' || !birincil.retryable) return taramaSonucu(birincil);

  const yedekAyar = tarayiciAyari(env, true);
  if (!tarayiciHazir(yedekAyar)) return taramaSonucu(birincil);
  console.warn(JSON.stringify({ event: 'malware_scan_failover', primary: birincilAyar.provider, fallback: yedekAyar.provider }));
  const yedek = await tekTarayiciIleTara(bytes, mime, yedekAyar, hash);
  return { ...taramaSonucu(yedek), failover: true };
}

// Supabase projesi ES256 (asimetrik) imzalama anahtarları kullanıyor (canlıda
// doğrulandı — bkz. proje notları). Bu yüzden JWT doğrulaması JWKS (herkese
// açık anahtar seti) üzerinden yapılıyor, HS256 paylaşılan sır ARTIK BİRİNCİL
// yöntem DEĞİL (aşağıda geriye dönük uyumluluk için hâlâ destekleniyor —
// bkz. supabaseTokenDogrula). Proje referansı modules/api.mjs içindeki SUPABASE_URL
// ile AYNI olmalı — değişirse burası da güncellenmeli.
const SUPABASE_JWKS_URL = "https://tsfscfgwbmiouptsljyi.supabase.co/auth/v1/.well-known/jwks.json";
const JWKS_ONBELLEK_SURESI_MS = 60 * 60 * 1000; // 1 saat — anahtar rotasyonu nadir olduğu için makul bir süre
let jwksOnbellek = { anahtarlar: null, alinmaZamani: 0 };

// Yüklemeye izin verilen origin'ler. "null" değeri, file:// üzerinden yerel
// test yaparken tarayıcının gönderdiği Origin başlığıdır — geliştirme/test
// kolaylığı için izin veriyoruz; asıl güvenlik sınırı zaten JWT doğrulaması.
const IZINLI_ORIGINLER = new Set([
  "https://ktunotsimulatoru.com",
  "https://www.ktunotsimulatoru.com",
  "null",
]);

function corsBasliklariAl(request) {
  const origin = request.headers.get("Origin") || "";
  const izinliOrigin = IZINLI_ORIGINLER.has(origin) ? origin : "https://ktunotsimulatoru.com";
  return {
    "Access-Control-Allow-Origin": izinliOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "private, no-store",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
}

function base64UrlDecodeBytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=");
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeJson(b64url) {
  const bytes = base64UrlDecodeBytes(b64url);
  const metin = new TextDecoder().decode(bytes);
  return JSON.parse(metin);
}

// JWKS'i (Supabase'in herkese açık doğrulama anahtarları seti) getirir,
// bellek içi önbellekte tutar. zorlaYenile=true, kid eşleşmediğinde (olası
// anahtar rotasyonu) bir kere zorla tazelemek için kullanılıyor.
async function jwksAl(zorlaYenile) {
  const simdi = Date.now();
  if (!zorlaYenile && jwksOnbellek.anahtarlar && (simdi - jwksOnbellek.alinmaZamani) < JWKS_ONBELLEK_SURESI_MS) {
    return jwksOnbellek.anahtarlar;
  }
  const yanit = await fetch(SUPABASE_JWKS_URL);
  if (!yanit.ok) throw new Error(`jwks_alinamadi (http ${yanit.status})`);
  const veri = await yanit.json();
  jwksOnbellek = { anahtarlar: veri.keys || [], alinmaZamani: simdi };
  return jwksOnbellek.anahtarlar;
}

// Supabase access token'ını doğrular ve payload'ı döner. Geçersizse null
// döner. İki imzalama yöntemini de destekliyor:
//   - ES256 (asimetrik, YENİ — Supabase'in "signing keys" özelliği): JWKS
//     üzerinden, projeye özel bir sır GEREKMİYOR (herkese açık anahtarlarla
//     doğrulanıyor). Bu proje canlıda bunu kullanıyor (doğrulandı).
//   - HS256 (klasik, paylaşılan sır): geriye dönük uyumluluk için hâlâ
//     destekleniyor — SUPABASE_JWT_SECRET set edilmemişse bu yol pasif kalır.
async function supabaseTokenDogrula(token, jwtSecret) {
  const parcalar = token.split(".");
  if (parcalar.length !== 3) {
    console.log("[nk-token] reddedildi: token 3 parçalı değil");
    return null;
  }
  const [headerB64, payloadB64, imzaB64] = parcalar;

  let header, payload;
  try {
    header = base64UrlDecodeJson(headerB64);
    payload = base64UrlDecodeJson(payloadB64);
  } catch {
    console.log("[nk-token] reddedildi: header/payload base64 çözülemedi");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp <= now ||
      (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || payload.nbf > now)) ||
      payload.iss !== 'https://tsfscfgwbmiouptsljyi.supabase.co/auth/v1' ||
      !(payload.aud === 'authenticated' || (Array.isArray(payload.aud) && payload.aud.includes('authenticated')))) {
    console.log('[nk-token] reddedildi: süre, issuer veya audience geçersiz');
    return null;
  }
  if (payload.role !== "authenticated") {
    console.log(`[nk-token] reddedildi: beklenmeyen role='${payload.role}'`);
    return null;
  }

  const imzalananVeri = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const imzaBytes = base64UrlDecodeBytes(imzaB64);

  if (header.alg === "ES256") {
    let anahtarlar;
    try {
      anahtarlar = await jwksAl(false);
    } catch (e) {
      console.log(`[nk-token] reddedildi: JWKS alınamadı (${e.message})`);
      return null;
    }
    let jwk = anahtarlar.find(k => k.kid === header.kid);
    if (!jwk) {
      // kid eşleşmedi — anahtar rotasyonu olmuş olabilir, bir kere zorla tazele.
      try {
        anahtarlar = await jwksAl(true);
      } catch (e) {
        console.log(`[nk-token] reddedildi: JWKS zorla tazeleme başarısız (${e.message})`);
        return null;
      }
      jwk = anahtarlar.find(k => k.kid === header.kid);
    }
    if (!jwk) {
      console.log(`[nk-token] reddedildi: JWKS içinde kid='${header.kid}' bulunamadı`);
      return null;
    }

    let key;
    try {
      key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDSA", namedCurve: jwk.crv || "P-256" },
        false,
        ["verify"]
      );
    } catch (e) {
      console.log(`[nk-token] reddedildi: JWK içe aktarılamadı (${e.message})`);
      return null;
    }

    const gecerliMi = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      imzaBytes,
      imzalananVeri
    );
    if (!gecerliMi) {
      console.log("[nk-token] reddedildi: ES256 imza doğrulaması başarısız");
      return null;
    }
  } else if (header.alg === "HS256") {
    if (!jwtSecret) {
      console.log("[nk-token] reddedildi: token HS256 ama SUPABASE_JWT_SECRET tanımlı değil");
      return null;
    }
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const gecerliMi = await crypto.subtle.verify("HMAC", key, imzaBytes, imzalananVeri);
    if (!gecerliMi) {
      console.log(`[nk-token] reddedildi: HMAC imza doğrulaması başarısız (SUPABASE_JWT_SECRET yanlış/eksik olabilir — uzunluk=${jwtSecret.length})`);
      return null;
    }
  } else {
    console.log(`[nk-token] reddedildi: desteklenmeyen alg='${header.alg}'`);
    return null;
  }

  return payload;
}

const SUPABASE_API_URL = 'https://tsfscfgwbmiouptsljyi.supabase.co';
async function jsonGovdeOku(request) {
  const bytes = await sinirliGovdeOku(request.body, 8192);
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { const error = new Error('gecersiz_json'); error.status = 400; throw error; }
}
function yanit(request, data, status = 200) {
  return Response.json(data, { status, headers: corsBasliklariAl(request) });
}
function yolGecerli(yol) {
  const parts = yol.split('/');
  return parts.length === 2 && UUID_DESENI.test(parts[0]) &&
    /^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(parts[1]) && UUID_DESENI.test(parts[1].split('.')[0]);
}
async function rpc(env, islem, veri = {}) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('worker_yapilandirmasi_eksik');
  const response = await fetch(`${SUPABASE_API_URL}/rest/v1/rpc/nk_dosya_islem`, {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ p_islem: islem, p_veri: veri }), signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('veritabani_erisilemiyor');
  const data = await response.json();
  if (data === null) throw new Error('veritabani_yaniti_gecersiz');
  return data;
}
async function guvenlikRpc(env, islem, veri = {}) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('worker_yapilandirmasi_eksik');
  const response = await fetch(`${SUPABASE_API_URL}/rest/v1/rpc/nk_guvenlik_islem`, {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ p_islem: islem, p_veri: veri }), signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('guvenlik_kaydi_yazilamadi');
  const data = await response.json();
  if (data === null) throw new Error('guvenlik_yaniti_gecersiz');
  return data;
}
async function kimlik(request, env, adminIzinli = false) {
  const admin = request.headers.get('X-Admin-Token');
  if (adminIzinli && admin && admin.length <= 4096) return { admin_token: admin };
  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  let payload;
  try { payload = match && await supabaseTokenDogrula(match[1], env.SUPABASE_JWT_SECRET); }
  catch { payload = null; }
  if (!payload || typeof payload.sub !== 'string' || !UUID_DESENI.test(payload.sub)) return null;
  if (!/^[^@\s]+@ogr\.ktu\.edu\.tr$/i.test(String(payload.email || ''))) return null;
  return { uid: payload.sub };
}
async function uploadIsle(request, env) {
  const user = await kimlik(request, env);
  if (!user) return yanit(request, { hata: 'gecersiz_token' }, 401);
  const mime = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (!IZINLI_TIPLER[mime]) return yanit(request, { hata: 'gecersiz_dosya_tipi' }, 400);
  if (Number(request.headers.get('Content-Length')) > MAKS_BOYUT) return yanit(request, { hata: 'dosya_cok_buyuk' }, 413);
  const bytes = await sinirliGovdeOku(request.body);
  if (!dosyaImzasiGecerli(bytes, mime)) return yanit(request, { hata: 'dosya_icerigi_gecersiz' }, 400);
  const tarama = await zararliYazilimTara(bytes, mime, env);
  if (tarama.verdict === 'unavailable') return yanit(request, { hata: 'virus_taramasi_kullanilamiyor' }, 503);
  if (tarama.verdict !== 'clean') {
    const kayit = await guvenlikRpc(env, 'zararli_dosya', { ...user, mime, ...tarama });
    if (!kayit.basarili) throw new Error('guvenlik_kaydi_yazilamadi');
    return yanit(request, { hata: 'zararli_dosya_algilandi', hesap_durumu: 'incelemede' }, 422);
  }
  // Kota kilidi veritabanında; R2 yazma ancak rezervasyon başarılıysa başlar.
  const reservation = await rpc(env, 'reserve', { ...user, mime, boyut: bytes.length });
  if (reservation.hata) return yanit(request, reservation, reservation.hata === 'kota_asildi' ? 429 : 403);
  const yol = reservation.yol;
  if (!yol || !yolGecerli(yol) || !yol.startsWith(user.uid + '/')) throw new Error('rezervasyon_gecersiz');
  try {
    await env.NK_ELEMENT_BUCKET.put(yol, bytes, { httpMetadata: { contentType: mime } });
    const object = await env.NK_ELEMENT_BUCKET.head(yol);
    if (!object || object.size !== bytes.length || object.httpMetadata?.contentType !== mime || !object.etag) throw new Error('nesne_dogrulanamadi');
    const complete = await rpc(env, 'complete', { ...user, yol, mime, boyut: object.size, etag: object.etag });
    if (!complete.basarili) throw new Error('rezervasyon_tamamlanamadi');
    return yanit(request, { basarili: true, yol });
  } catch (error) {
    // Yanıtı kaybolan başarılı SQL işlemi olabilir; doğrudan R2 silinmez.
    // Yalnızca bağlanmamış rezervasyonu kuyruğa al. DB kapalıysa TTL temizler.
    try { await rpc(env, 'cancel', { ...user, yol }); } catch { /* cron yeniden dener */ }
    throw error;
  }
}
async function okumaIsle(request, env, yol) {
  if (!yolGecerli(yol)) return yanit(request, { hata: 'bulunamadi' }, 404);
  const user = await kimlik(request, env, true);
  if (!user) return yanit(request, { hata: 'giris_gerekli' }, 401);
  const access = await rpc(env, 'read', { ...user, yol });
  if (!access.basarili) return yanit(request, { hata: 'bulunamadi' }, 404);
  const object = await env.NK_ELEMENT_BUCKET.get(yol);
  if (!object) return yanit(request, { hata: 'dosya_bulunamadi' }, 404);
  let body = object.body;
  if (access.durum === 'legacy') {
    // Eski kayıtlar yalnızca yetkili okumada gerçek nesne kontrolünden geçer.
    if (object.size > MAKS_BOYUT || object.size < 1 || object.httpMetadata?.contentType !== access.mime) {
      await body.cancel();
      return yanit(request, { hata: 'eski_dosya_dogrulanamadi' }, 409);
    }
    body = await sinirliGovdeOku(body);
    if (!dosyaImzasiGecerli(body, access.mime)) return yanit(request, { hata: 'eski_dosya_dogrulanamadi' }, 409);
    const verified = await rpc(env, 'legacy_complete', { ...user, yol, mime: access.mime, boyut: object.size, etag: object.etag });
    if (!verified.basarili) return yanit(request, { hata: 'dosya_durumu_degisti' }, 409);
  } else if (object.size !== access.boyut || object.etag !== access.etag || object.httpMetadata?.contentType !== access.mime) {
    await body.cancel();
    return yanit(request, { hata: 'dosya_dogrulanamadi' }, 409);
  }
  const headers = new Headers(corsBasliklariAl(request));
  headers.set('Content-Type', access.mime);
  headers.set('Content-Disposition', `inline; filename="${yol.split('/')[1]}"`);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Vary', 'Origin, Authorization, X-Admin-Token');
  return new Response(body, { status: 200, headers });
}
async function temizle(env) {
  const paths = await rpc(env, 'cleanup_due');
  if (!Array.isArray(paths)) throw new Error('temizlik_listesi_alinamadi');
  let failed = 0;
  for (const yol of paths) {
    try {
      if (!yolGecerli(yol)) throw new Error('gecersiz_yol');
      await env.NK_ELEMENT_BUCKET.delete(yol); // yoksa da başarılı; tekrar çalıştırılabilir
      const ack = await rpc(env, 'cleanup_ack', { yol });
      if (!ack.basarili) throw new Error('temizlik_kaydedilemedi');
    } catch { failed++; }
  }
  if (failed) throw new Error(`temizlik_yeniden_denenecek:${failed}`);
}
async function hataKayitlariniTemizle(env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('worker_yapilandirmasi_eksik');
  const response = await fetch(`${SUPABASE_API_URL}/rest/v1/rpc/uygulama_hatasi_temizle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: '{}', signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('hata_kaydi_temizligi_basarisiz');
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsBasliklariAl(request) });
    try {
      if (request.method === 'POST' && url.pathname === '/upload') return await uploadIsle(request, env);
      if ((request.method === 'GET' && url.pathname === '/inventory') ||
          (request.method === 'POST' && url.pathname === '/orphan-cleanup')) {
        const admin_token = request.headers.get('X-Admin-Token');
        if (!admin_token || admin_token.length > 4096) return yanit(request, { hata: 'yetkisiz' }, 401);
        const auth = await rpc(env, 'inventory', { admin_token, yollar: [] });
        if (!Array.isArray(auth)) return yanit(request, { hata: 'yetkisiz' }, 403);
        if (request.method === 'GET') {
          const cursor = url.searchParams.get('cursor') || undefined;
          if (cursor && cursor.length > 2048) return yanit(request, { hata: 'gecersiz_cursor' }, 400);
          const listed = await env.NK_ELEMENT_BUCKET.list({ limit: 100, cursor });
          const records = await rpc(env, 'inventory', { admin_token, yollar: listed.objects.map(o => o.key) });
          if (!Array.isArray(records)) return yanit(request, { hata: 'yetkisiz' }, 403);
          const rows = listed.objects.map(object => {
            const record = records.find(r => r.yol === object.key);
            const aday = record && !record.durum && !record.referansli && yolGecerli(object.key) &&
              object.size > 0 && object.size <= MAKS_BOYUT && new Date(object.uploaded).getTime() < Date.now() - 86400000;
            return { yol: object.key, boyut: object.size, durum: record?.durum || 'kayitsiz', referansli: !!record?.referansli, aday: !!aday };
          });
          return yanit(request, { dosyalar: rows, cursor: listed.truncated ? listed.cursor : null });
        }
        const data = await jsonGovdeOku(request);
        if (typeof data.yol !== 'string' || !yolGecerli(data.yol)) return yanit(request, { hata: 'gecersiz_yol' }, 400);
        const object = await env.NK_ELEMENT_BUCKET.head(data.yol);
        if (!object || object.size < 1 || object.size > MAKS_BOYUT || !(new Date(object.uploaded).getTime() < Date.now() - 86400000)) {
          return yanit(request, { hata: 'temizlige_uygun_degil' }, 409);
        }
        const mime = Object.keys(IZINLI_TIPLER).find(type => data.yol.endsWith('.' + IZINLI_TIPLER[type]));
        const result = await rpc(env, 'orphan_queue', { admin_token, yol: data.yol, boyut: object.size, mime });
        return yanit(request, result, result.hata ? 409 : 200);
      }
      if (request.method === 'GET' && url.pathname === '/quota') {
        const user = await kimlik(request, env);
        if (!user) return yanit(request, { hata: 'giris_gerekli' }, 401);
        const data = await rpc(env, 'quota', user);
        return yanit(request, data, data.hata ? 403 : 200);
      }
      if (request.method === 'POST' && url.pathname === '/cancel') {
        const user = await kimlik(request, env);
        if (!user) return yanit(request, { hata: 'giris_gerekli' }, 401);
        // Küçük yönetim gövdesi; dosya yükleme sınırını burada da aşamaz.
        const data = await jsonGovdeOku(request);
        if (!Array.isArray(data.yollar) || data.yollar.length > 5 || !data.yollar.every(p => typeof p === 'string' && yolGecerli(p))) return yanit(request, { hata: 'gecersiz_yol' }, 400);
        for (const yol of data.yollar) {
          const result = await rpc(env, 'cancel', { ...user, yol });
          if (result.hata) return yanit(request, result, 403);
        }
        return yanit(request, { basarili: true });
      }
      if (request.method === 'GET') {
        let yol;
        try { yol = decodeURIComponent(url.pathname.slice(1)); }
        catch { return yanit(request, { hata: 'gecersiz_yol' }, 400); }
        return await okumaIsle(request, env, yol);
      }
      return yanit(request, { hata: 'bulunamadi' }, 404);
    } catch (error) {
      // Sırlar, token, kullanıcı kimliği veya dosya yollarını loglama.
      console.error('[nk-dosya] işlem tamamlanamadı');
      return yanit(request, { hata: error.status === 413 ? 'dosya_cok_buyuk' : error.status === 400 ? 'gecersiz_istek' : 'islem_tamamlanamadi' }, [400,413].includes(error.status) ? error.status : 503);
    }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(Promise.all([temizle(env), hataKayitlariniTemizle(env)]));
  }
};
