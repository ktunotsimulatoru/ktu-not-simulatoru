import { hsMevcutOturum, hsMevcutProfil, hsGirisModalAc, hsProfilAta } from './account.mjs';
import { getSupabase } from './api.mjs';

// ============================================================
// NOT YAKALA — Mini Oyun (footer easter-egg)
// ============================================================
const NY_IYI_NOTLAR = ['AA', 'BA', 'BB', 'CB', 'CC'];

const NY_KOTU_NOTLAR = ['DD', 'FD', 'FF'];

const NY_NOT_RENKLERI = {
    AA: '#28a745', BA: '#5cb85c', BB: '#82ca9c', CB: '#007bff', CC: '#17a2b8',
    DD: '#ffc107', FD: '#dc3545', FF: '#a21427'
};

const NY_YUKSEK_SKOR_ANAHTARI = 'ktuNotYakalaEnYuksekSkor';


let nyAktif = false;

let nyRafId = null;

let nySpawnTimeout = null;

let nyPuan = 0;

let nyCan = 3;

let nyBasketX = 0.5;
 // 0-1 arası, alanın genişliğine oranla
let nyHedefX = 0.5;
  // sürükleme ile hedeflenen konum
let nyKlavyeSol = false;

let nyKlavyeSag = false;

let nyOgeler = [];
   // { el, x(0-1), y(px), harf, iyi }
let nyBaslangicZamani = 0;

let nySonKareZamani = 0;


function nyModalAc(event) {
    if (event) event.preventDefault();
    document.body.style.overflow = 'hidden';
    const modal = document.getElementById('nyModal');
    modal.classList.add('aktif');
    nyEkranGoster('baslangic');
    const enYuksek = localStorage.getItem(NY_YUKSEK_SKOR_ANAHTARI) || 0;
    document.getElementById('nyEnYuksekGosterge').textContent = enYuksek;
}


function nyModalKapat(event) {
    if (event && event.target !== document.getElementById('nyModal')) return;
    nyOyunuDurdur();
    document.getElementById('nyModal')?.classList.remove('aktif');
    document.body.style.overflow = '';
}


function nyOyunuBaslat() {
    nyOyunuDurdur(); // önceki oyundan kalan varsa temizle

    nyAktif = true;
    nyPuan = 0;
    nyCan = 3;
    nyBasketX = 0.5;
    nyHedefX = 0.5;
    nyOgeler = [];
    nyBaslangicZamani = performance.now();
    nySonKareZamani = nyBaslangicZamani;

    nyEkranGoster('oyun');
    nyPuanGuncelle();
    nyCanGuncelle();

    const alan = document.getElementById('nyOyunAlani');
    alan.querySelectorAll('.ny-item').forEach(el => el.remove());

    document.addEventListener('keydown', nyKlavyeBasildi);
    document.addEventListener('keyup', nyKlavyeBirakildi);
    alan.addEventListener('pointermove', nyPointerHareket);
    alan.addEventListener('pointerdown', nyPointerHareket);

    nyOgeSpawnDongusu();
    nyRafId = requestAnimationFrame(nyOyunDongusu);
}


function nyOyunuDurdur() {
    nyAktif = false;
    if (nyRafId) { cancelAnimationFrame(nyRafId); nyRafId = null; }
    if (nySpawnTimeout) { clearTimeout(nySpawnTimeout); nySpawnTimeout = null; }
    document.removeEventListener('keydown', nyKlavyeBasildi);
    document.removeEventListener('keyup', nyKlavyeBirakildi);
    const alan = document.getElementById('nyOyunAlani');
    if (alan) {
        alan.removeEventListener('pointermove', nyPointerHareket);
        alan.removeEventListener('pointerdown', nyPointerHareket);
        alan.querySelectorAll('.ny-item').forEach(el => el.remove());
    }
    nyOgeler = [];
}


function nyKlavyeBasildi(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') nyKlavyeSol = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') nyKlavyeSag = true;
}

function nyKlavyeBirakildi(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') nyKlavyeSol = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') nyKlavyeSag = false;
}

function nyPointerHareket(e) {
    const alan = document.getElementById('nyOyunAlani');
    const rect = alan.getBoundingClientRect();
    nyHedefX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
}


function nyOgeSpawnDongusu() {
    if (!nyAktif) return;
    nyOgeOlustur();

    const gecenSaniye = (performance.now() - nyBaslangicZamani) / 1000;
    // Not: 22 katsayısı ile azalıyor (öncesi 12'ydi) — zorluk daha erken tavan yapıyor
    const araGecikme = Math.max(480, 1150 - gecenSaniye * 22);
    nySpawnTimeout = setTimeout(nyOgeSpawnDongusu, araGecikme);
}


function nyOgeOlustur() {
    const kotuMu = Math.random() < 0.38;
    const havuz = kotuMu ? NY_KOTU_NOTLAR : NY_IYI_NOTLAR;
    const harf = havuz[Math.floor(Math.random() * havuz.length)];
    const alan = document.getElementById('nyOyunAlani');

    const el = document.createElement('div');
    el.className = 'ny-item' + (kotuMu ? ' ny-kotu' : '');
    el.style.background = NY_NOT_RENKLERI[harf];
    el.textContent = harf;
    alan.appendChild(el);

    nyOgeler.push({
        el,
        x: 0.12 + Math.random() * 0.76,
        y: -30,
        harf,
        iyi: !kotuMu
    });
}


function nyOyunDongusu(zaman) {
    if (!nyAktif) return;
    const dt = Math.min(0.05, (zaman - nySonKareZamani) / 1000);
    nySonKareZamani = zaman;
    const gecenSaniye = (zaman - nyBaslangicZamani) / 1000;
    const hiz = 90 + gecenSaniye * 9; // piksel/saniye, zamanla hızlanır (öncesi 4.5'ti — artık daha erken hızlanıyor)

    const alan = document.getElementById('nyOyunAlani');
    const alanGenislik = alan.clientWidth;
    const alanYukseklik = alan.clientHeight;

    // Çantayı hedefe doğru yumuşakça hareket ettir (klavye veya sürükleme)
    if (nyKlavyeSol) nyHedefX = Math.max(0, nyHedefX - dt * 1.6);
    if (nyKlavyeSag) nyHedefX = Math.min(1, nyHedefX + dt * 1.6);
    nyBasketX += (nyHedefX - nyBasketX) * Math.min(1, dt * 12);

    const basketEl = document.getElementById('nyBasket');
    const basketPx = nyBasketX * alanGenislik;
    // Not: basketPx'i doğrudan .style.left'e yazmak her karede sayfa düzenini (layout)
    // yeniden hesaplatıyor ("reflow") ve bu, özellikle masaüstünde oyun sırasında hissedilen
    // kasmanın asıl kaynağıydı. Düşen öğeler zaten transform kullanıyordu (GPU/compositor
    // üzerinden, layout tetiklemez); çantayı da aynı yönteme geçiriyoruz — CSS'teki statik
    // "left: 50%" konumundan px cinsinden farkı transform ile uyguluyoruz.
    const merkezdenFarkPx = basketPx - alanGenislik / 2;
    basketEl.style.transform = `translateX(${merkezdenFarkPx}px) translateX(-50%)`;
    const basketYariGenislik = 30;
    const basketUstY = alanYukseklik - 34;

    for (let i = nyOgeler.length - 1; i >= 0; i--) {
        const oge = nyOgeler[i];
        oge.y += hiz * dt;
        oge.el.style.transform = `translate(${oge.x * alanGenislik}px, ${oge.y}px) translate(-50%, -50%)`;

        const ogePx = oge.x * alanGenislik;
        const carpisti = oge.y >= basketUstY - 10 && oge.y <= basketUstY + 22 &&
                          Math.abs(ogePx - basketPx) < basketYariGenislik;

        if (carpisti) {
            if (oge.iyi) {
                nyPuan++;
                nyPuanGuncelle();
            } else {
                nyCan--;
                nyCanGuncelle();
            }
            oge.el.remove();
            nyOgeler.splice(i, 1);
            if (nyCan <= 0) { nyOyunBitti(); return; }
            continue;
        }

        if (oge.y > alanYukseklik + 30) {
            oge.el.remove();
            nyOgeler.splice(i, 1);
        }
    }

    nyRafId = requestAnimationFrame(nyOyunDongusu);
}


function nyPuanGuncelle() {
    document.getElementById('nyPuanGosterge').textContent = `Puan: ${nyPuan}`;
}

function nyCanGuncelle() {
    document.getElementById('nyCanGosterge').textContent = '❤️'.repeat(Math.max(0, nyCan)) + '🖤'.repeat(3 - Math.max(0, nyCan));
}


// Her 5 oyunda bir, oyuncuya derslerini de unutmamasını hatırlatan
// eğlenceli/farklı bir not gösteriyoruz — site bir not/ders aracı
// olduğu için oyunun "asıl işten" tamamen koparmaması amaçlanıyor.
const NY_OYUN_SAYAC_ANAHTARI = 'ktuNotYakalaOyunSayaci';

const NY_DERS_HATIRLATMALARI = [
    '📚 Güzel bir ara verdik, şimdi kaldığımız yerden derse dönebiliriz 🙂',
    '⏰ Küçük bir mola bitti, ders de bir yerlerde bizi bekliyor olabilir.',
    '📖 Ara vermek iyi gelir, yeter ki dersi de aklımızın bir köşesinde tutalım.',
    '☕ Bu mola güzeldi, sırada ders çalışmak da olabilir 🙂',
    '🔔 Ara verdik, dersi de unutmayalım.',
    '🧠 Biraz dinlendik, şimdi derse dönmek için iyi bir zaman olabilir.',
    '📝 Küçük bir mola sonrası, kaldığımız yerden derse devam edebiliriz.'
];


function nyOyunBitti() {
    nyOyunuDurdur();
    const enYuksekMevcut = parseInt(localStorage.getItem(NY_YUKSEK_SKOR_ANAHTARI) || '0', 10);
    if (nyPuan > enYuksekMevcut) {
        localStorage.setItem(NY_YUKSEK_SKOR_ANAHTARI, nyPuan);
    }
    const enYuksek = Math.max(nyPuan, enYuksekMevcut);

    let mesaj;
    if (nyPuan >= 10) mesaj = 'Gayet iyi, bu gidişle burs alırsın 👏';
    else if (nyPuan >= 5) mesaj = 'Fena değil, ortalamayı tutturdun 🙂';
    else mesaj = 'Bütünlemeye kalmış gibisin 😅 Tekrar dene!';

    document.getElementById('nySonucMesaji').textContent = mesaj;
    document.getElementById('nySonPuan').textContent = nyPuan;
    document.getElementById('nyEnYuksekGosterge').textContent = enYuksek;

    const oynananSayi = parseInt(localStorage.getItem(NY_OYUN_SAYAC_ANAHTARI) || '0', 10) + 1;
    localStorage.setItem(NY_OYUN_SAYAC_ANAHTARI, oynananSayi);
    const hatirlatmaEl = document.getElementById('nyDersHatirlatma');
    if (hatirlatmaEl) {
        if (oynananSayi % 5 === 0) {
            const secilen = NY_DERS_HATIRLATMALARI[Math.floor(Math.random() * NY_DERS_HATIRLATMALARI.length)];
            hatirlatmaEl.textContent = secilen;
            hatirlatmaEl.style.display = 'block';
        } else {
            hatirlatmaEl.style.display = 'none';
        }
    }

    nyEkranGoster('bitti');

    const kayitAlani = document.getElementById('nySkorKayitAlani');
    if (hsMevcutOturum) {
        kayitAlani.innerHTML = '<p class="ny-ipucu">Skor kaydediliyor...</p>';
        nySkorGonder(nyPuan);
    } else {
        kayitAlani.innerHTML = '<p class="ny-ipucu">Skorunu liderlik tablosuna kaydetmek için:</p><button type="button" class="ny-giris-cta-btn" data-nk-click="nyGirisIsteBitti" data-nk-click-arg0="@event" data-nk-click-prevent="true">🔑 Giriş Yap / Kayıt Ol</button>';
        nyMisafirOyunKaydet(nyPuan);
    }
}


// Giriş yapmamış (misafir) oyuncuların oynayışını, istatistik amaçlı
// olarak arka planda loglar. Skor kaydetmez, hataları sessizce yutar —
// bu bir "nice to have" sayaçtır, oyun deneyimini asla engellememeli.
async function nyMisafirOyunKaydet(skor) {
    try {
        await getSupabase().rpc('ny_misafir_oyun_kaydet', { p_skor: skor });
    } catch (e) {
        // sessizce yut — bu bir "nice to have" sayaç, oyun deneyimini engellememeli
    }
}


// ------------------------------------------------------------
// Hesap sistemi ve liderlik tablosu
// ------------------------------------------------------------
// v5.0: Not Yakala'nın kendi ayrı kullanıcı adı+şifre hesap sistemi
// KALDIRILDI — oyun artık site geneli hesap sistemini (script.js'in
// başındaki hs* fonksiyonları, hsMevcutOturum/hsMevcutProfil) kullanıyor.
// Giriş/kayıt ekranları (nyGirisEkrani/nyKayitEkrani) artık kullanılmıyor,
// bunun yerine paylaşılan giriş modalı (hsGirisModalAc) açılıyor. Skor
// kaydetmek için giriş yapmış olmak YETMEZ, ayrıca bir kullanıcı adı
// belirlenmiş olması gerekiyor (profil panelinden) — bkz. nySkorGonder.
const NY_EKRAN_ID = {
    baslangic: 'nyBaslangicEkrani',
    liderlik: 'nyLiderlikEkrani',
    bitti: 'nyBittiEkrani'
};


let nyBekleyenSkor = null;


function nyEkranGoster(ad, event) {
    if (event) event.preventDefault();
    Object.values(NY_EKRAN_ID).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const hedefId = NY_EKRAN_ID[ad];
    if (hedefId) {
        const hedef = document.getElementById(hedefId);
        if (hedef) hedef.style.display = 'flex';
    }
    if (ad === 'baslangic') nyHesapDurumuGuncelle();
}


function nyEscapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}


function nyHesapDurumuGuncelle() {
    const el = document.getElementById('nyHesapDurumu');
    if (!el) return;
    if (hsMevcutOturum) {
        const ad = hsMevcutProfil && hsMevcutProfil.kullanici_adi;
        el.innerHTML = ad
            ? `Merhaba, <strong>${nyEscapeHtml(ad)}</strong> &nbsp;·&nbsp; <a href="#" data-nk-click="hsProfilModalAc">Profilim</a>`
            : `Giriş yaptın, skorunu kaydetmek için kullanıcı adını belirle &nbsp;·&nbsp; <a href="#" data-nk-click="hsProfilModalAc">Kullanıcı Adı Belirle</a>`;
    } else {
        el.innerHTML = `<a href="#" data-nk-click="hsGirisModalAc" data-nk-click-arg0="giris">Giriş Yap</a> &nbsp;·&nbsp; <a href="#" data-nk-click="hsGirisModalAc" data-nk-click-arg0="kayit">Kayıt Ol</a>`;
    }
}


// Not Kutusu'nda kullanılan paylaşılan hesap sisteminden gelen olaylara göre
// oyunun ekranlarını güncel tutar — kullanıcı oyun ekranı açıkken giriş
// yapar ya da kullanıcı adı belirlerse, bekleyen bir skor varsa otomatik gönderilir.
window.addEventListener('hesapDurumuDegisti', (e) => {
    nyHesapDurumuGuncelle();
    if (e.detail && e.detail.oturum && nyBekleyenSkor !== null) {
        const skor = nyBekleyenSkor;
        nyBekleyenSkor = null;
        const kayitAlani = document.getElementById('nySkorKayitAlani');
        if (kayitAlani) kayitAlani.innerHTML = '<p class="ny-ipucu">Skor kaydediliyor...</p>';
        nySkorGonder(skor);
    }
});

window.addEventListener('kullaniciAdiDegisti', () => {
    nyHesapDurumuGuncelle();
    if (nyBekleyenSkor !== null) {
        const skor = nyBekleyenSkor;
        nyBekleyenSkor = null;
        const kayitAlani = document.getElementById('nySkorKayitAlani');
        if (kayitAlani) kayitAlani.innerHTML = '<p class="ny-ipucu">Skor kaydediliyor...</p>';
        nySkorGonder(skor);
    }
});


function nyGirisIsteBitti(event) {
    if (event) event.preventDefault();
    nyBekleyenSkor = nyPuan;
    hsGirisModalAc('giris');
}


async function nySkorGonder(skor) {
    const kayitAlani = document.getElementById('nySkorKayitAlani');
    if (!hsMevcutOturum) { nyBekleyenSkor = skor; return; }
    try {
        const { data, error } = await getSupabase().rpc('oyun_skor_gonder', { p_skor: skor });
        if (error || !data || !data.basarili) {
            if (data && data.hata === 'ad_gerekli') {
                nyBekleyenSkor = skor;
                if (kayitAlani) {
                    kayitAlani.innerHTML = '<p class="ny-ipucu">Skorunu liderlik tablosuna kaydetmek için önce bir kullanıcı adı belirlemen gerekiyor:</p><button type="button" class="ny-giris-cta-btn" data-nk-click="hsProfilModalAc">Kullanıcı Adı Belirle</button>';
                }
                return;
            }
            if (kayitAlani) kayitAlani.innerHTML = '<p class="ny-form-hata">Skor kaydedilemedi, bağlantını kontrol et.</p>';
            return;
        }
        hsProfilAta({ ...(hsMevcutProfil || {}), kullanici_adi: data.kullanici_adi || data.oyun_kullanici_adi, en_yuksek_skor: data.en_yuksek_skor });
        if (kayitAlani) {
            kayitAlani.innerHTML = data.yeni_rekor
                ? '<p class="ny-basarili">🎉 Yeni kişisel rekor! Skorun kaydedildi.</p>'
                : '<p class="ny-basarili">✅ Skorun kaydedildi.</p>';
        }
    } catch (e) {
        if (kayitAlani) kayitAlani.innerHTML = '<p class="ny-form-hata">Skor kaydedilemedi, bağlantını kontrol et.</p>';
    }
}


let nyLiderlikAralik = 'haftalik';


async function nyLiderlikGoster(event) {
    if (event) event.preventDefault();
    nyEkranGoster('liderlik');
    await nyLiderlikYukle();
}


function nyLiderlikSekmeDegistir(aralik) {
    if (aralik === nyLiderlikAralik) return;
    nyLiderlikAralik = aralik;
    document.getElementById('nyLiderlikSekmeHaftalik').classList.toggle('aktif', aralik === 'haftalik');
    document.getElementById('nyLiderlikSekmeTum').classList.toggle('aktif', aralik === 'tum');
    nyLiderlikYukle();
}


async function nyLiderlikYukle() {
    const el = document.getElementById('nyLiderlikListesi');
    el.innerHTML = '<p class="ny-ipucu">Yükleniyor...</p>';
    const fonksiyon = nyLiderlikAralik === 'haftalik' ? 'oyun_liderlik_tablosu_haftalik' : 'oyun_liderlik_tablosu';
    const kendiAdim = hsMevcutProfil && hsMevcutProfil.kullanici_adi;
    try {
        const { data, error } = await getSupabase().rpc(fonksiyon, { p_limit: 10 });
        if (error) throw error;
        if (!data || !data.length) {
            el.innerHTML = nyLiderlikAralik === 'haftalik'
                ? '<p class="ny-ipucu">Bu hafta henüz kimse skor göndermemiş. İlk sen ol!</p>'
                : '<p class="ny-ipucu">Henüz kimse skor göndermemiş. İlk sen ol!</p>';
            return;
        }
        el.innerHTML = data.map((satir, i) => `
            <div class="ny-liderlik-satir${kendiAdim && satir.kullanici_adi === kendiAdim ? ' ny-liderlik-ben' : ''}">
                <span class="ny-liderlik-sira">${i + 1}.</span>
                <span class="ny-liderlik-ad">${nyEscapeHtml(satir.kullanici_adi)}</span>
                <span class="ny-liderlik-skor">${satir.en_yuksek_skor}</span>
            </div>
        `).join('');
    } catch (e) {
        el.innerHTML = '<p class="ny-form-hata">Liderlik tablosu yüklenemedi.</p>';
    }
}
export { NY_IYI_NOTLAR, NY_KOTU_NOTLAR, NY_NOT_RENKLERI, NY_YUKSEK_SKOR_ANAHTARI, nyAktif, nyRafId, nySpawnTimeout, nyPuan, nyCan, nyBasketX, nyHedefX, nyKlavyeSol, nyKlavyeSag, nyOgeler, nyBaslangicZamani, nySonKareZamani, nyModalAc, nyModalKapat, nyOyunuBaslat, nyOyunuDurdur, nyKlavyeBasildi, nyKlavyeBirakildi, nyPointerHareket, nyOgeSpawnDongusu, nyOgeOlustur, nyOyunDongusu, nyPuanGuncelle, nyCanGuncelle, NY_OYUN_SAYAC_ANAHTARI, NY_DERS_HATIRLATMALARI, nyOyunBitti, nyMisafirOyunKaydet, NY_EKRAN_ID, nyBekleyenSkor, nyEkranGoster, nyEscapeHtml, nyHesapDurumuGuncelle, nyGirisIsteBitti, nySkorGonder, nyLiderlikAralik, nyLiderlikGoster, nyLiderlikSekmeDegistir, nyLiderlikYukle };
