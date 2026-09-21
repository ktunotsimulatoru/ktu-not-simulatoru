import { sbOnbellekOku, sbOnbellekYaz } from './cache.mjs';
import { getSupabase } from './api.mjs';


// --- Karanlık Mod Yönetimi ---
// Not: Duyurular artık tamamen admin panelinden (Supabase 'duyurular' tablosu) yönetiliyor,
// bkz. dinamikDuyurulariYukle() ve dinamikDuyuruToggle()/dinamikDuyuruKapat() aşağıda.
function dinamikDuyuruKapat(id) {
    const el = document.getElementById('dinamik-duyuru-' + id);
    if (!el) return;
    el.style.transition = 'opacity 0.25s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 260);
    // Kapatılan duyuruyu sessionStorage'a kaydet
    try {
        const kapatilanlar = JSON.parse(sessionStorage.getItem('kapatilanDuyurular') || '[]');
        kapatilanlar.push(id);
        sessionStorage.setItem('kapatilanDuyurular', JSON.stringify(kapatilanlar));
    } catch (e) {
        // Bozuk/eski formatlı bir değer varsa sıfırdan başlat — en azından bu kapatma kaydedilsin.
        sessionStorage.setItem('kapatilanDuyurular', JSON.stringify([id]));
    }
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

        const kapatilanlar = JSON.parse(sessionStorage.getItem('kapatilanDuyurular') || '[]');
        const gosterilecekler = data.filter(d => !kapatilanlar.includes(d.id));
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
