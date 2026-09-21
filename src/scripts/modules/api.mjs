


const SUPABASE_URL = 'https://tsfscfgwbmiouptsljyi.supabase.co';

const SUPABASE_KEY = 'sb_publishable_7VUXgTfS6iYY3NU0IVwYpA_FRI0t7MI';

let supabaseClient = null;


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
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return supabaseClient;
}
export { SUPABASE_URL, SUPABASE_KEY, supabaseClient, NK_ELEMENT_WORKER_URL, hsElementPdfMi, getSupabase };
