// Tema (açık/koyu) rengini ilk boyamadan (paint) önce, senkron olarak uygular.
        // Bu sayede sayfa açılışında bir an için yanlış temanın görünüp sonra doğru
        // temaya geçmesi (FOUC/tema flaşı) önlenir. Chart.js/Supabase gibi ağır ve
        // "defer" ile yüklenen scriptleri beklemez, kendi başına anında çalışır.
        (function () {
            // Supabase ilk oturumu bildirene kadar header'da yanlışlıkla
            // "Giriş Yap" gösterilmesini önle. Hesap modülü hazır olunca bu
            // sınıfı kaldırır; yükleme hatasında arayüz kilitli kalmasın diye
            // emniyet zaman aşımı da vardır.
            document.documentElement.classList.add('hs-auth-bekleniyor');
            window.setTimeout(function () {
                document.documentElement.classList.remove('hs-auth-bekleniyor');
            }, 4000);
            try {
                var t = localStorage.getItem('ktu-theme');
                if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', t);
            } catch (e) {}
        })();
