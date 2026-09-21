


// --- Sayfalar arası hafif önbellek (sessionStorage) ---
// Site çoklu-sayfa bir mimariye sahip: index.html'den harf-notu-hesaplama.html veya
// not-kutusu.html'e geçmek TAM bir sayfa yüklemesi, yani script.js sıfırdan çalışıyor.
// Duyuru bandı ve footer'daki genel istatistik widget'ı gibi "site geneli" veriler normalde
// HER sayfada yeniden sorgulanırdı — bu da kullanıcıya sayfanın yeniden yükleniyormuş hissi
// verir. Bu yüzden bu tür veriler aynı sekme oturumu (tab) boyunca kısa süreliğine
// sessionStorage'da önbelleğe alınıyor; bir sonraki sayfa bu önbellekte veri bulursa ağ
// isteği hiç yapmadan anında gösteriyor.
function sbOnbellekOku(anahtar, sureMs) {
    try {
        const ham = sessionStorage.getItem(anahtar);
        if (!ham) return null;
        const kayit = JSON.parse(ham);
        if (!kayit || (Date.now() - kayit.zaman) > sureMs) return null;
        return kayit.veri;
    } catch (e) {
        return null;
    }
}

function sbOnbellekYaz(anahtar, veri) {
    try {
        sessionStorage.setItem(anahtar, JSON.stringify({ zaman: Date.now(), veri: veri }));
    } catch (e) {
        // Depolama dolu/engelli olabilir (gizli sekme vb.) — önbellek olmadan devam eder.
    }
}
export { sbOnbellekOku, sbOnbellekYaz };
