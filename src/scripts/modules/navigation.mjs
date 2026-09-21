



// Site çoklu-sayfa yapısını korur. Bağlantıya basmayı geciktirmeden, kullanıcı
// bir iç bağlantıya yöneldiğinde hedef HTML tarayıcı önbelleğine alınır.
(function () {
    const getirilenler = new Set();
    function adayUrl(e) {
        const a = e.target.closest('a[href]');
        if (!a || a.hasAttribute('data-nk-click') || a.hasAttribute('download')) return null;
        const targetAttr = a.getAttribute('target');
        if (targetAttr && targetAttr !== '_self') return null;

        const href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return null;

        let url;
        try { url = new URL(href, window.location.href); } catch { return null; }
        if (url.protocol !== window.location.protocol) return null;
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            if (url.origin !== window.location.origin) return null;
        } else {
            const suAnkiKlasor = window.location.pathname.replace(/[^/]*$/, '');
            if (!url.pathname.startsWith(suAnkiKlasor)) return null;
        }
        if (!/\.html?$/i.test(url.pathname) || url.pathname === window.location.pathname) return null;
        return url;
    }

    function onGetir(e) {
        const url = adayUrl(e);
        if (!url || getirilenler.has(url.href)) return;
        getirilenler.add(url.href);
        const link = document.createElement('link');
        link.rel = 'prefetch'; link.as = 'document'; link.href = url.href;
        document.head.appendChild(link);
    }

    document.addEventListener('pointerover', onGetir, { passive: true });
    document.addEventListener('focusin', onGetir);
})();
export {  };
