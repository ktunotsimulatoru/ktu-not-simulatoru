import { sbOnbellekOku, sbOnbellekYaz } from './cache.mjs';
import { getSupabase } from './api.mjs';

const DUYURU_KAPATMA_ANAHTARI = 'ktu-kapatilan-duyurular-v2';
let duyuruKullaniciId = null;

function duyuruDepoAnahtari() {
    return `${DUYURU_KAPATMA_ANAHTARI}:${duyuruKullaniciId || 'misafir'}`;
}

function kapatilanDuyurulariOku() {
    try {
        const yeniler = JSON.parse(localStorage.getItem(duyuruDepoAnahtari()) || '[]');
        const eskiler = JSON.parse(sessionStorage.getItem('kapatilanDuyurular') || '[]');
        return [...new Set([...yeniler, ...eskiler].map(String))];
    } catch { return []; }
}

function kapatilanDuyurulariYaz(idler) {
    try { localStorage.setItem(duyuruDepoAnahtari(), JSON.stringify([...new Set(idler.map(String))])); }
    catch { /* Depolama kapalıysa sunucu kaydı yine denenir. */ }
}

function kapatilanlariEkrandanKaldir(idler) {
    idler.forEach(id => document.getElementById('dinamik-duyuru-' + id)?.remove());
}

async function hesapDuyuruTercihleriniEsitle() {
    if (!duyuruKullaniciId) return;
    const yerel = kapatilanDuyurulariOku();
    if (yerel.length) {
        await Promise.allSettled(yerel.map(id => getSupabase().rpc('duyuru_kapat', { p_duyuru_id: id })));
    }
    const { data, error } = await getSupabase().rpc('kapatilan_duyurularim');
    if (error) return;
    const birlesik = [...new Set([...yerel, ...(Array.isArray(data) ? data : [])].map(String))];
    kapatilanDuyurulariYaz(birlesik);
    try { sessionStorage.removeItem('kapatilanDuyurular'); } catch { /* eski kayıt sonraki açılışta yeniden birleştirilir */ }
    kapatilanlariEkrandanKaldir(birlesik);
}

window.addEventListener('hesapDurumuDegisti', event => {
    duyuruKullaniciId = event.detail?.oturum?.id || null;
    if (duyuruKullaniciId) hesapDuyuruTercihleriniEsitle();
});


// --- Karanlık Mod Yönetimi ---
// Not: Duyurular artık tamamen admin panelinden (Supabase 'duyurular' tablosu) yönetiliyor,
// bkz. dinamikDuyurulariYukle() ve dinamikDuyuruToggle()/dinamikDuyuruKapat() aşağıda.
function dinamikDuyuruKapat(id) {
    const el = document.getElementById('dinamik-duyuru-' + id);
    if (!el) return;
    el.style.transition = 'opacity 0.25s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 260);
    const kapatilanlar = [...kapatilanDuyurulariOku(), String(id)];
    kapatilanDuyurulariYaz(kapatilanlar);
    if (duyuruKullaniciId) getSupabase().rpc('duyuru_kapat', { p_duyuru_id: String(id) });
}


function dinamikDuyuruToggle(id) {
    const detay = document.getElementById('dinamik-detay-' + id);
    const tikla = document.getElementById('dinamik-tikla-' + id);
    if (!detay) return;
    const acik = detay.classList.toggle('acik');
    if (tikla) tikla.textContent = acik ? 'Gizle ▲' : 'Detaylar için tıklayın ▼';
}


async function dinamikDuyurulariYukle() {
    try {
        const ONBELLEK_ANAHTARI = 'ktuDuyurularOnbellek';
        const ONBELLEK_SURESI_MS = 5 * 60 * 1000; // 5 dk — admin yeni duyuru eklerse en geç bu sürede yansır

        let data = sbOnbellekOku(ONBELLEK_ANAHTARI, ONBELLEK_SURESI_MS);
        if (data === null) {
            const sonuc = await getSupabase()
                .from('duyurular')
                .select('*')
                .eq('aktif', true)
                .order('olusturulma_tarihi', { ascending: false });

            if (sonuc.error || !sonuc.data) return;
            data = sonuc.data;
            sbOnbellekYaz(ONBELLEK_ANAHTARI, data);
        }

        if (data.length === 0) return;

        const kapatilanlar = kapatilanDuyurulariOku();
        const gosterilecekler = data.filter(d => !kapatilanlar.includes(String(d.id)));
        if (gosterilecekler.length === 0) return;

        const wrapper = document.getElementById('dinamik-duyurular-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = gosterilecekler.map(d => `
            <div class="duyuru-wrapper" id="dinamik-duyuru-${d.id}">
                <div class="duyuru-bandi">
                    <div class="duyuru-ozet" data-nk-click="dinamikDuyuruToggle" data-nk-click-arg0="${d.id}" role="button" tabindex="0">
                        <span class="duyuru-etiket">📢 Duyuru</span>
                        <span class="duyuru-ozet-metin">
                            <strong>${d.baslik}</strong>
                            <span class="duyuru-tikla" id="dinamik-tikla-${d.id}">Detaylar için tıklayın ▼</span>
                        </span>
                        <button class="duyuru-kapat" data-nk-click="dinamikDuyuruKapat" data-nk-click-arg0="${d.id}" data-nk-click-stop="true" aria-label="Duyuruyu kapat">✕</button>
                    </div>
                    <div class="duyuru-detay" id="dinamik-detay-${d.id}">
                        <div class="duyuru-detay-icerik">${d.icerik}</div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (e) {
        // Sessizce geç
    }
}
export { dinamikDuyuruKapat, dinamikDuyuruToggle, dinamikDuyurulariYukle };
