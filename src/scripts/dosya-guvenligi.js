(function (root) {
    'use strict';
    const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
    const pathPattern = new RegExp(`^${uuid}/${uuid}\\.(jpg|png|webp|pdf)$`);
    function gecerliYol(yol) {
        return typeof yol === 'string' && pathPattern.test(yol);
    }
    function guvenliYollar(yollar) {
        return Array.isArray(yollar) ? yollar.filter(gecerliYol).slice(0, 3) : [];
    }
    function dosyaUrl(yol, taban) {
        if (!gecerliYol(yol)) return null;
        const url = new URL(taban);
        if (url.protocol !== 'https:') return null;
        return `${url.origin}/${yol}`;
    }
    // URL ve görünen metinler HTML olarak yorumlanmaz.
    function baglantiOlustur(yol, taban, metin, sinif = '') {
        const url = dosyaUrl(yol, taban);
        if (!url) return null;
        const link = document.createElement('a');
        link.href = '#';
        link.dataset.nkUrl = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = sinif;
        link.textContent = metin;
        return link;
    }
    const api = { gecerliYol, guvenliYollar, dosyaUrl, baglantiOlustur };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NKDosya = api;
})(typeof globalThis === 'object' ? globalThis : this);
