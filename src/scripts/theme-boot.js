// Tema (açık/koyu) rengini ilk boyamadan (paint) önce, senkron olarak uygular.
        // Bu sayede sayfa açılışında bir an için yanlış temanın görünüp sonra doğru
        // temaya geçmesi (FOUC/tema flaşı) önlenir. Chart.js/Supabase gibi ağır ve
        // "defer" ile yüklenen scriptleri beklemez, kendi başına anında çalışır.
        (function () {
            try {
                var t = localStorage.getItem('ktu-theme');
                if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', t);
            } catch (e) {}
        })();
