import { hsElementPdfMi } from './api.mjs';


// Paylaşılan eleman görüntüleyici (lightbox) — hem not-kutusu.html'deki soru
// kartlarında hem profil panelindeki "Paylaştığım Çıkmışlar" sekmesinde
// kullanılıyor. PDF'ler <img> ile gösterilemediği için bunlar zaten ayrı bir
// <a target="_blank"> linkiyle işleniyor ve bu fonksiyona hiç gelmiyor.
//
// Aynı sınavın birden fazla fotoğrafı arasında ok tuşları/kaydırma ile
// gezinmeyi desteklemek için, listeleme fonksiyonları (nkSoruListele,
// hsProfilVerileriniYukle) her soru için görsel URL listesini önce
// hsGaleriKaydet(id, urls) ile burada saklıyor, sonra her <img>'e
// hsElementAc işlevine galeri kimliği ve sıra numarası veriyor. Eski tek-url çağrı şekli de
// (hsElementAc('https://...')) geriye dönük uyumluluk için destekleniyor.
window.hsGaleriler = window.hsGaleriler || {};

function hsGaleriKaydet(id, urls) { window.hsGaleriler[id] = urls; }


let hsLbGaleri = [];

let hsLbIndex = 0;

let hsLbZoom = 1;

let hsLbPanX = 0;

let hsLbPanY = 0;

let hsLbSurukleniyor = false;

let hsLbSuruklemeBaslangic = null;

const HS_LB_ZOOM_MIN = 0.5;

const HS_LB_ZOOM_MAX = 4;


function hsElementAc(galeriIdVeyaUrl, index) {
    let galeri = window.hsGaleriler[galeriIdVeyaUrl];
    if (!Array.isArray(galeri)) {
        // Geriye dönük uyumluluk: doğrudan bir URL ile çağrılmış.
        if (hsElementPdfMi(galeriIdVeyaUrl)) { NKDosyaErisim.ac(galeriIdVeyaUrl); return; }
        galeri = [galeriIdVeyaUrl];
        index = 0;
    }
    if (!galeri.length) return;
    hsLbGaleri = galeri;
    hsLbIndex = Math.max(0, Math.min(index || 0, galeri.length - 1));
    hsFotoLightboxOlustur();
    hsLbGoster();
}


function hsFotoLightboxOlustur() {
    if (document.getElementById('hsFotoLightbox')) return;
    const overlay = document.createElement('div');
    overlay.id = 'hsFotoLightbox';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="nk-foto-lightbox-arac-cubugu" role="toolbar" aria-label="Görsel araçları">
            <button type="button" data-nk-click="hsLbZoomAyarla" data-nk-click-arg0="#-1" aria-label="Uzaklaştır" title="Uzaklaştır">−</button>
            <button type="button" class="nk-foto-lightbox-yuzde" data-nk-click="hsLbZoomSifirla" aria-label="Ekrana sığdır" title="Ekrana sığdır"><span id="hsFotoLightboxZoomYuzde">100%</span></button>
            <button type="button" data-nk-click="hsLbZoomAyarla" data-nk-click-arg0="#1" aria-label="Yakınlaştır" title="Yakınlaştır">+</button>
            <span class="nk-foto-lightbox-arac-ayrac" aria-hidden="true"></span>
            <button type="button" class="nk-foto-lightbox-sigdir" data-nk-click="hsLbZoomSifirla" aria-label="Ekrana sığdır" title="Ekrana sığdır">⛶</button>
            <button type="button" class="nk-foto-lightbox-kapat" data-nk-click="hsLbKapat" aria-label="Kapat" title="Kapat">✕</button>
        </div>
        <button type="button" class="nk-foto-lightbox-nav nk-foto-lightbox-onceki" data-nk-click="hsLbNav" data-nk-click-arg0="#-1" aria-label="Önceki fotoğraf">‹</button>
        <button type="button" class="nk-foto-lightbox-nav nk-foto-lightbox-sonraki" data-nk-click="hsLbNav" data-nk-click-arg0="#1" aria-label="Sonraki fotoğraf">›</button>
        <div class="modal-kutu nk-foto-lightbox-kutu">
            <div class="nk-foto-lightbox-gorunum" id="hsFotoLightboxGorunum">
                <img id="hsFotoLightboxImg" src="" alt="Soru fotoğrafı" draggable="false">
            </div>
        </div>
        <div class="nk-foto-lightbox-alt"><span class="nk-foto-lightbox-sayac" id="hsFotoLightboxSayac"></span></div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hsLbKapat(); });
    document.body.appendChild(overlay);

    const gorunum = document.getElementById('hsFotoLightboxGorunum');

    // Fare tekerleği ile yakınlaştırma.
    gorunum.addEventListener('wheel', (e) => {
        e.preventDefault();
        hsLbZoomAyarla(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });

    // Çift tık ile yakınlaştır/uzaklaştır.
    gorunum.addEventListener('dblclick', () => {
        hsLbZoomDegerAta(hsLbZoom > 1 ? 1 : 2.2);
    });

    // Fare ile sürükleyerek kaydırma — sadece yakınlaştırılmışken.
    gorunum.addEventListener('mousedown', (e) => {
        if (hsLbZoom <= 1) return;
        e.preventDefault();
        hsLbSurukleniyor = true;
        hsLbSuruklemeBaslangic = { x: e.clientX, y: e.clientY, panX: hsLbPanX, panY: hsLbPanY };
        gorunum.classList.add('nk-lb-surukleniyor');
    });
    window.addEventListener('mousemove', (e) => {
        if (!hsLbSurukleniyor || !hsLbSuruklemeBaslangic) return;
        hsLbPanX = hsLbSuruklemeBaslangic.panX + (e.clientX - hsLbSuruklemeBaslangic.x);
        hsLbPanY = hsLbSuruklemeBaslangic.panY + (e.clientY - hsLbSuruklemeBaslangic.y);
        hsLbUygula();
    });
    window.addEventListener('mouseup', () => {
        hsLbSurukleniyor = false;
        gorunum.classList.remove('nk-lb-surukleniyor');
    });

    // Dokunmatik: tek parmakla, yakınlaştırılmışken kaydırma, değilse galeri
    // içinde bir önceki/sonraki fotoğrafa geçiş; iki parmakla pinch-zoom.
    let dokunmaBaslangic = null;
    let pinchBaslangicMesafe = null;
    let pinchBaslangicZoom = 1;
    gorunum.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            pinchBaslangicMesafe = hsLbDokunmaMesafesi(e.touches);
            pinchBaslangicZoom = hsLbZoom;
            dokunmaBaslangic = null;
        } else if (e.touches.length === 1) {
            dokunmaBaslangic = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: hsLbPanX, panY: hsLbPanY };
        }
    }, { passive: true });
    gorunum.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && pinchBaslangicMesafe) {
            e.preventDefault();
            const yeniMesafe = hsLbDokunmaMesafesi(e.touches);
            hsLbZoomDegerAta(pinchBaslangicZoom * (yeniMesafe / pinchBaslangicMesafe));
        } else if (e.touches.length === 1 && dokunmaBaslangic && hsLbZoom > 1) {
            e.preventDefault();
            hsLbPanX = dokunmaBaslangic.panX + (e.touches[0].clientX - dokunmaBaslangic.x);
            hsLbPanY = dokunmaBaslangic.panY + (e.touches[0].clientY - dokunmaBaslangic.y);
            hsLbUygula();
        }
    }, { passive: false });
    gorunum.addEventListener('touchend', (e) => {
        if (dokunmaBaslangic && hsLbZoom <= 1 && e.changedTouches.length) {
            const dx = e.changedTouches[0].clientX - dokunmaBaslangic.x;
            const dy = e.changedTouches[0].clientY - dokunmaBaslangic.y;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) hsLbNav(dx > 0 ? -1 : 1);
        }
        dokunmaBaslangic = null;
        pinchBaslangicMesafe = null;
    });

    document.addEventListener('keydown', hsLbKlavye);
}


function hsLbDokunmaMesafesi(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}


function hsLbKlavye(e) {
    if (!document.getElementById('hsFotoLightbox')?.classList.contains('aktif')) return;
    if (e.key === 'Escape') hsLbKapat();
    else if (e.key === 'ArrowLeft') hsLbNav(-1);
    else if (e.key === 'ArrowRight') hsLbNav(1);
}


function hsLbGoster() {
    const overlay = document.getElementById('hsFotoLightbox');
    document.getElementById('hsFotoLightboxImg').dataset.nkUrl = hsLbGaleri[hsLbIndex];
    hsLbZoomSifirla();
    hsLbSayacGuncelle();
    overlay.classList.add('aktif');
}


function hsLbSayacGuncelle() {
    const sayac = document.getElementById('hsFotoLightboxSayac');
    const cokluGaleri = hsLbGaleri.length > 1;
    if (sayac) {
        sayac.textContent = `${hsLbIndex + 1} / ${hsLbGaleri.length}`;
        sayac.style.display = cokluGaleri ? '' : 'none';
    }
    document.querySelectorAll('#hsFotoLightbox .nk-foto-lightbox-nav').forEach(b => {
        b.style.display = cokluGaleri ? '' : 'none';
    });
}


function hsLbNav(yon) {
    if (hsLbGaleri.length < 2) return;
    hsLbIndex = (hsLbIndex + yon + hsLbGaleri.length) % hsLbGaleri.length;
    document.getElementById('hsFotoLightboxImg').dataset.nkUrl = hsLbGaleri[hsLbIndex];
    hsLbZoomSifirla();
    hsLbSayacGuncelle();
}


function hsLbZoomAyarla(yon) { hsLbZoomDegerAta(hsLbZoom + yon * 0.25); }


function hsLbZoomDegerAta(deger) {
    hsLbZoom = Math.min(HS_LB_ZOOM_MAX, Math.max(HS_LB_ZOOM_MIN, deger));
    if (hsLbZoom <= 1) { hsLbPanX = 0; hsLbPanY = 0; }
    hsLbUygula();
}


function hsLbZoomSifirla() {
    hsLbZoom = 1;
    hsLbPanX = 0;
    hsLbPanY = 0;
    hsLbUygula();
}


function hsLbUygula() {
    const img = document.getElementById('hsFotoLightboxImg');
    if (!img) return;
    img.style.transform = `translate(${hsLbPanX}px, ${hsLbPanY}px) scale(${hsLbZoom})`;
    const gorunum = document.getElementById('hsFotoLightboxGorunum');
    if (gorunum) gorunum.classList.toggle('nk-lb-yakin', hsLbZoom > 1);
    const yuzde = document.getElementById('hsFotoLightboxZoomYuzde');
    if (yuzde) yuzde.textContent = `${Math.round(hsLbZoom * 100)}%`;
}


function hsLbKapat() {
    document.getElementById('hsFotoLightbox')?.classList.remove('aktif');
    hsLbZoomSifirla();
}
export { hsGaleriKaydet, hsLbGaleri, hsLbIndex, hsLbZoom, hsLbPanX, hsLbPanY, hsLbSurukleniyor, hsLbSuruklemeBaslangic, HS_LB_ZOOM_MIN, HS_LB_ZOOM_MAX, hsElementAc, hsFotoLightboxOlustur, hsLbDokunmaMesafesi, hsLbKlavye, hsLbGoster, hsLbSayacGuncelle, hsLbNav, hsLbZoomAyarla, hsLbZoomDegerAta, hsLbZoomSifirla, hsLbUygula, hsLbKapat };

