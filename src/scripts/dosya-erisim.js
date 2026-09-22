// Dosyaları kimlik başlığıyla getirir; URL'lerde token veya açık indirme bileti yoktur.
(function () {
    'use strict';
    const origin = 'https://not-kutusu.elements0.workers.dev';
    let adminToken = null;
    let generation = 0;
    let userId = null;
    let baslikSozu = null;
    const images = new Map();
    const urls = new Set();
    const requests = new Set();
    function guvenliUrl(value) {
        const url = new URL(value, origin);
        if (url.origin !== origin || url.search || url.hash || !NKDosya.gecerliYol(url.pathname.slice(1))) throw new Error('Geçersiz dosya adresi.');
        return url.href;
    }
    async function basliklar() {
        const token = adminToken?.();
        if (token) return { 'X-Admin-Token': token };
        // Aynı anda ekrana giren küçük görseller tek bir oturum okumasını paylaşır.
        // Sonraki grup güncel tokenı alabilsin diye söz tamamlanınca önbelleği bırak.
        if (!baslikSozu) {
            baslikSozu = window.getSupabase().auth.getSession().then(({ data: { session } = {} }) => {
                if (!session?.access_token) throw new Error('Dosyayı görmek için giriş yapmalısın.');
                return { Authorization: `Bearer ${session.access_token}` };
            });
        }
        const buSoz = baslikSozu;
        try { return await buSoz; }
        finally { if (baslikSozu === buSoz) baslikSozu = null; }
    }
    async function getir(value) {
        const url = guvenliUrl(value);
        const version = generation;
        const controller = new AbortController();
        requests.add(controller);
        try {
            const headers = await basliklar();
            if (version !== generation) throw new Error('Oturum değişti.');
            const response = await fetch(url, { headers, cache: 'no-store', signal: controller.signal });
            if (!response.ok) throw new Error(response.status === 401 ? 'Tekrar giriş yapmalısın.' : 'Dosya bulunamadı veya görüntüleme iznin yok.');
            const blob = await response.blob();
            if (version !== generation) throw new Error('Oturum değişti.');
            const objectUrl = URL.createObjectURL(blob);
            urls.add(objectUrl);
            return objectUrl;
        } finally { requests.delete(controller); }
    }
    function birak(url) { if (url) { URL.revokeObjectURL(url); urls.delete(url); } }
    function temizle() {
        generation++;
        baslikSozu = null;
        requests.forEach(c => c.abort());
        urls.forEach(url => URL.revokeObjectURL(url));
        urls.clear();
        images.forEach((state, img) => { img.removeAttribute('src'); });
        images.clear();
    }
    async function resim(img) {
        const key = img.dataset.nkUrl;
        if (!key || images.get(img)?.key === key) return;
        birak(images.get(img)?.url);
        img.removeAttribute('src');
        img.classList.remove('nk-dosya-hazir','nk-dosya-hatali');
        img.classList.add('nk-dosya-yukleniyor');
        img.setAttribute('aria-busy','true');
        const state = { key };
        images.set(img, state);
        try {
            const url = await getir(key);
            if (!img.isConnected || images.get(img) !== state) { birak(url); return; }
            state.url = url;
            img.src = url;
            img.classList.remove('nk-dosya-yukleniyor');
            img.classList.add('nk-dosya-hazir');
            img.removeAttribute('aria-busy');
        } catch (error) {
            if (images.get(img) === state) {
                img.classList.remove('nk-dosya-yukleniyor');
                img.classList.add('nk-dosya-hatali');
                img.removeAttribute('aria-busy');
                img.title = error.message;
            }
        }
    }
    const observer = new IntersectionObserver(entries => {
        entries.filter(e => e.isIntersecting).forEach(e => { observer.unobserve(e.target); resim(e.target); });
    }, { rootMargin: '150px' });
    function tara() {
        images.forEach((state, img) => { if (!img.isConnected) { birak(state.url); images.delete(img); observer.unobserve(img); } });
        document.querySelectorAll('img[data-nk-url]').forEach(img => {
            if (images.get(img)?.key !== img.dataset.nkUrl) observer.observe(img);
        });
    }
    async function ac(value) {
        // Kullanıcı tıklaması sırasında açılır; asenkron fetch popup engeline takılmaz.
        const popup = window.open('about:blank', '_blank');
        if (popup) { popup.opener = null; popup.document.body.textContent = 'Dosya yükleniyor…'; }
        try {
            const url = await getir(value);
            if (popup) popup.location.replace(url);
            else throw new Error('Dosyayı açmak için açılır pencereye izin ver.');
            setTimeout(() => birak(url), 5 * 60 * 1000);
        } catch (error) {
            if (popup && !popup.closed) popup.document.body.textContent = error.message;
            else alert(error.message);
        }
    }
    async function indir(value) {
        const kabul = confirm('Dosyalar otomatik zararlı yazılım taramasından geçirilir. Hiçbir tarama yüzde 100 güvence vermez. Dosyayı indirmek ve cihazında açmak kendi sorumluluğundadır. Devam edilsin mi?');
        if (!kabul) return;
        let objectUrl;
        try {
            const guvenli = guvenliUrl(value);
            objectUrl = await getir(guvenli);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = decodeURIComponent(new URL(guvenli).pathname.split('/').pop()) || 'not-kutusu-dosyasi';
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => birak(objectUrl), 60 * 1000);
        } catch (error) { if (objectUrl) birak(objectUrl); alert(error.message); }
    }
    document.addEventListener('click', event => {
        const download = event.target.closest('[data-nk-download]');
        if (download) { event.preventDefault(); indir(download.dataset.nkDownload); return; }
        const link = event.target.closest('a[data-nk-url]');
        if (!link) return;
        event.preventDefault();
        ac(link.dataset.nkUrl);
    });
    window.addEventListener('hesapDurumuDegisti', event => {
        const next = event.detail?.oturum?.id || null;
        if (next !== userId) { userId = next; temizle(); tara(); }
    });
    window.addEventListener('pagehide', temizle);
    document.addEventListener('DOMContentLoaded', () => {
        new MutationObserver(tara).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-nk-url'] });
        tara();
    });
    window.NKDosyaErisim = { ac, indir, temizle, basliklar, ayarla: options => { temizle(); adminToken = options.adminToken || null; } };
})();
