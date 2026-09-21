



// --- Sayfa geçişlerini yumuşatma (mobil uygulama hissi) ---
// Bu site çoklu-sayfa (multi-page) bir mimariye sahip: index.html'den harf-notu-hesaplama.html
// veya not-kutusu.html'e (ya da "📚 Not Kutusu" sekmesine, ya da "← Ana Sayfa"/logoya) geçmek
// HER ZAMAN gerçek bir tarayıcı navigasyonu — tarayıcı eski sayfayı aniden kesip yeni sayfayı
// sıfırdan çiziyor, bu da kullanıcıya "yeniden yükleniyormuş" / sert bir kesinti hissi veriyor.
// Siteyi bir SPA'ya çevirmeden, düşük riskli bir şekilde bunu yumuşatmak için: bir sayfa-içi
// linke tıklandığında sayfa çok kısa süreliğine (140ms) saydamlaşıyor ('sayfa-cikis' sınıfı +
// style.css'teki transition), SONRA gerçek navigasyon gerçekleşiyor; yeni sayfa da açılışta
// CSS animasyonuyla (sayfaGirisFadeIn) saydamlıktan görünür hale geliyor — ani "kesme" hissi
// yerine yumuşak bir crossfade oluyor. Bu saf CSS/JS bir teknik olduğu için hem file:// ile
// yerelde test ederken hem de gerçek bir http(s) sunucusunda aynı şekilde çalışır.
//
// openTab() ile yönetilen sekme linkleri (Harf Notu/Gerekli Final/Geçme Senaryoları/Dönem
// Ortalaması) zaten kendi tıklamalarında evt.preventDefault() çağırıyor ve SAYFA İÇİNDE anında
// sekme değiştiriyor (gerçek navigasyon hiç olmuyor) — bu yüzden bu linkler burada BİLEREK
// dokunulmadan bırakılıyor (aşağıdaki e.defaultPrevented ve data-tab-link kontrolleri).
(function () {
    function sayfaGecisiUygula(e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const a = e.target.closest('a[href]');
        if (!a) return;
        // openTab() gibi kendi tıklama mantığı olan linkler (bildirimsel olayı varsa) burada dokunulmuyor —
        // onlar zaten kendi preventDefault()'larını çağırıyor (bkz. yukarıdaki not).
        if (a.hasAttribute('data-nk-click')) return;
        const targetAttr = a.getAttribute('target');
        if (targetAttr && targetAttr !== '_self') return;
        if (a.hasAttribute('download')) return;

        const href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return;

        let url;
        try {
            url = new URL(href, window.location.href);
        } catch (err) {
            return;
        }

        // Sadece aynı yerdeki (site içi) .html sayfalarına giden linkler — dış linkler dokunulmadan
        // bırakılıyor. file:// altında origin genelde boş/'null' olduğu için (her klasör farklı
        // origin sayılabiliyor), protokol http(s) değilse yol bazlı bir klasör kontrolü yapılıyor.
        if (url.protocol !== window.location.protocol) return;
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            if (url.origin !== window.location.origin) return;
        } else {
            const suAnkiKlasor = window.location.pathname.replace(/[^/]*$/, '');
            if (!url.pathname.startsWith(suAnkiKlasor)) return;
        }
        if (!/\.html?$/i.test(url.pathname)) return;
        if (url.pathname === window.location.pathname && url.hash) return; // sayfa içi çapa linki

        e.preventDefault();
        document.body.classList.add('sayfa-cikis');
        window.setTimeout(function () {
            window.location.href = url.href;
        }, 140);
    }

    document.addEventListener('click', sayfaGecisiUygula);

    // Tarayıcı geri/ileri tuşuyla bfcache'den geri gelindiğinde sayfa saydam takılı kalmasın.
    window.addEventListener('pageshow', function () {
        document.body.classList.remove('sayfa-cikis');
    });
})();
export {  };
