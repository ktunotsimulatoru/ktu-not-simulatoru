


const SUPABASE_URL = 'https://tsfscfgwbmiouptsljyi.supabase.co';

const SUPABASE_KEY = 'sb_publishable_7VUXgTfS6iYY3NU0IVwYpA_FRI0t7MI';

let supabaseClient = null;

const HS_BENI_HATIRLA_KEY = 'ktu-beni-hatirla-v1';

function depoOku(depo, key) {
    try { return depo.getItem(key); } catch { return null; }
}

function depoYaz(depo, key, value) {
    try { depo.setItem(key, value); } catch { /* depolama kapalıysa oturum yalnız bellekte kalır */ }
}

function depoSil(depo, key) {
    try { depo.removeItem(key); } catch { /* sessizce geç */ }
}

function hsBeniHatirlaSeciliMi() {
    return depoOku(sessionStorage, HS_BENI_HATIRLA_KEY) !== '0';
}

function hsOturumKaliciliginiAyarla(kalici) {
    if (kalici) {
        depoSil(sessionStorage, HS_BENI_HATIRLA_KEY);
        depoYaz(localStorage, HS_BENI_HATIRLA_KEY, '1');
    } else {
        depoSil(localStorage, HS_BENI_HATIRLA_KEY);
        depoYaz(sessionStorage, HS_BENI_HATIRLA_KEY, '0');
    }
}

// Supabase varsayılan olarak oturumu localStorage'da kalıcı tutar. Bu adaptör,
// giriş formundaki kullanıcı seçimine göre aynı oturum verisini localStorage
// veya yalnızca açık sekmeye ait sessionStorage içinde saklar. Parola burada
// hiçbir zaman tutulmaz; yalnızca Supabase erişim ve yenileme belirteçleri vardır.
const hsAuthStorage = {
    getItem(key) {
        return depoOku(sessionStorage, key) ?? depoOku(localStorage, key);
    },
    setItem(key, value) {
        if (hsBeniHatirlaSeciliMi()) {
            depoYaz(localStorage, key, value);
            depoSil(sessionStorage, key);
        } else {
            depoYaz(sessionStorage, key, value);
            depoSil(localStorage, key);
        }
    },
    removeItem(key) {
        depoSil(localStorage, key);
        depoSil(sessionStorage, key);
    }
};


// Not Kutusu soru ekleri (fotoğraf/PDF) artık Cloudflare R2'de tutuluyor; bu
// adres hem burada (profil sayfasındaki "Paylaştığım Çıkmışlar") hem de
// not-kutusu.js'te (aynı sayfada script scope paylaşıldığı için) kullanılıyor.
// not-kutusu.js içinde AYRICA tanımlanmamalı — aksi halde "already declared"
// hatası verir (bkz. proje notları: script.js + not-kutusu.js aynı lexical
// script scope'u paylaşıyor). Worker'ı deploy ettikten sonra wrangler'ın
// verdiği gerçek adresi BURAYA yapıştır.
const NK_ELEMENT_WORKER_URL = 'https://not-kutusu.elements0.workers.dev';


// Bir R2 yolunun (ör. "uid/uuid.pdf") PDF olup olmadığını uzantıya bakarak
// anlar — PDF'ler <img> ile gösterilemediği için "Paylaştığım Çıkmışlar"
// listesinde fotoğraflardan farklı (link/ikon) işleniyor. not-kutusu.js'te
// AYNI İŞİ yapan ama FARKLI İSİMLİ (nkElementPdfMi) kendi kopyası var —
// paylaşılan script scope'ta isim çakışması olmasın diye kasıtlı olarak
// burada tekrar tanımlanmadı, ikisi de birbirinden bağımsız çalışıyor.
function hsElementPdfMi(yol) {
    return /\.pdf$/i.test(String(yol || ''));
}


function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                storage: hsAuthStorage,
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }
    return supabaseClient;
}
export { SUPABASE_URL, SUPABASE_KEY, supabaseClient, NK_ELEMENT_WORKER_URL, hsElementPdfMi, getSupabase, hsBeniHatirlaSeciliMi, hsOturumKaliciliginiAyarla };
