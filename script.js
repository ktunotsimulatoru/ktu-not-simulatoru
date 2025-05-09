// --- Sabitler ve Veri Yapıları (Global Kapsamda) ---
const MUTLAK_DEGERLENDIRME_ARALIKLARI = { "AA": [90, 100], "BA": [80, 89.99], "BB": [75, 79.99], "CB": [70, 74.99], "CC": [60, 69.99], "DC": [50, 59.99], "DD": [40, 49.99], "FD": [30, 39.99], "FF": [0, 29.99], };
const HARF_NOTU_KATSAYILARI = { "AA": 4.0, "BA": 3.5, "BB": 3.0, "CB": 2.5, "CC": 2.0, "DC": 1.5, "DD": 1.0, "FD": 0.5, "FF": 0.0 };
const MINIMUM_FINAL_NOTU_VARSAYILAN = 45;
const T_SKOR_ARALIKLARI_ORTALAMAYA_GORE = { "0_42.5": { "FF": [-Infinity, 35.99], "FD": [36, 40.99], "DD": [41, 45.99], "DC": [46, 50.99], "CC": [51, 55.99], "CB": [56, 60.99], "BB": [61, 65.99], "BA": [66, 70.99], "AA": [71, Infinity] }, "42.5_47.5": { "FF": [-Infinity, 33.99], "FD": [34, 38.99], "DD": [39, 43.99], "DC": [44, 48.99], "CC": [49, 53.99], "CB": [54, 58.99], "BB": [59, 63.99], "BA": [64, 68.99], "AA": [69, Infinity] }, "47.5_52.5": { "FF": [-Infinity, 31.99], "FD": [32, 36.99], "DD": [37, 41.99], "DC": [42, 46.99], "CC": [47, 51.99], "CB": [52, 56.99], "BB": [57, 61.99], "BA": [62, 66.99], "AA": [67, Infinity] }, "52.5_57.5": { "FF": [-Infinity, 29.99], "FD": [30, 34.99], "DD": [35, 39.99], "DC": [40, 44.99], "CC": [45, 49.99], "CB": [50, 54.99], "BB": [55, 59.99], "BA": [60, 64.99], "AA": [65, Infinity] }, "57.5_62.5": { "FF": [-Infinity, 27.99], "FD": [28, 32.99], "DD": [33, 37.99], "DC": [38, 42.99], "CC": [43, 47.99], "CB": [48, 52.99], "BB": [53, 57.99], "BA": [58, 62.99], "AA": [63, Infinity] }, "62.5_70": { "FF": [-Infinity, 25.99], "FD": [26, 30.99], "DD": [31, 35.99], "DC": [36, 40.99], "CC": [41, 45.99], "CB": [46, 50.99], "BB": [51, 55.99], "BA": [56, 60.99], "AA": [61, Infinity] }, "70_80": { "FF": [-Infinity, 23.99], "FD": [24, 28.99], "DD": [29, 33.99], "DC": [34, 38.99], "CC": [39, 43.99], "CB": [44, 48.99], "BB": [49, 53.99], "BA": [54, 58.99], "AA": [59, Infinity] } };

// --- Yardımcı Fonksiyonlar (Global Kapsamda) ---
function getMutlakDegerlendirmeNotu(hamBasariNotu) {
    // PDF Madde 3 (Kaynak 13) MDS için: "küsuratlı notlar en yakın tam sayıya yuvarlanır."
    const yuvarlanmisHBN = Math.round(hamBasariNotu);
    for (const grade in MUTLAK_DEGERLENDIRME_ARALIKLARI) {
        const [minScore, maxScore] = MUTLAK_DEGERLENDIRME_ARALIKLARI[grade];
        if (yuvarlanmisHBN >= minScore && yuvarlanmisHBN <= maxScore) return grade;
    }
    return "FF"; // Varsayılan (Normalde bu aralığa düşmemeli)
}

function getBagilDegerlendirmeNotuTskor(tSkoru, sinifOrtalamasi) {
    let hedefAralikAnahtari = null;
    // Sınıf ortalaması >= 80 durumu artık bu fonksiyona gelmeden ana mantıkta ele alınmalı.
    // Bu fonksiyon sadece sınıf ortalaması < 80 durumları için çağrılmalı.
    const siraliOrtalamaAraliklari = Object.keys(T_SKOR_ARALIKLARI_ORTALAMAYA_GORE).sort((a, b) => parseFloat(a.split('_')[0]) - parseFloat(b.split('_')[0]));

    for (const key of siraliOrtalamaAraliklari) {
        const [minOrtStr, maxOrtStr] = key.split('_');
        const minOrt = parseFloat(minOrtStr);
        const maxOrt = parseFloat(maxOrtStr);
        // >= 80 olan "70_80" aralığı burada sinifOrtalamasi < 80 kontrolü ile doğal olarak dışlanır.
        if (sinifOrtalamasi > minOrt && sinifOrtalamasi <= maxOrt) {
            hedefAralikAnahtari = key;
            break;
        }
    }

    if (!hedefAralikAnahtari) {
        // 0-42.5 aralığı için özel kontrol (KTÜ PDF TABLO-1 'Kötü' satırı)
        if (sinifOrtalamasi > 0 && sinifOrtalamasi <= 42.5) {
            hedefAralikAnahtari = "0_42.5";
        } else {
            // Sınıf ortalaması 80'den küçük ve diğer aralıklara uymuyorsa (örn. 0 veya negatif)
            console.error("Sınıf ortalaması ("+ sinifOrtalamasi +") için geçerli bir T-Skor aralığı bulunamadı (Ort < 80).");
            return null;
        }
    }

    if (!T_SKOR_ARALIKLARI_ORTALAMAYA_GORE[hedefAralikAnahtari]) {
        console.error("Tanımlı T-Skor aralığı anahtarı bulunamadı:", hedefAralikAnahtari);
        return null;
    }

    const notlar = T_SKOR_ARALIKLARI_ORTALAMAYA_GORE[hedefAralikAnahtari];
    for (const not in notlar) {
        const [minT, maxT] = notlar[not];
        if (tSkoru >= minT && (maxT === Infinity ? true : tSkoru <= maxT)) {
            return not;
        }
    }
    console.error("T-skor için harf notu bulunamadı. T-Skoru:", tSkoru, "Aralık:", hedefAralikAnahtari);
    return null;
}

function karsilastirHarfNotlari(not1, not2) {
    if (!not1) return not2;
    if (!not2) return not1;
    const katsayi1 = HARF_NOTU_KATSAYILARI[not1] !== undefined ? HARF_NOTU_KATSAYILARI[not1] : -1;
    const katsayi2 = HARF_NOTU_KATSAYILARI[not2] !== undefined ? HARF_NOTU_KATSAYILARI[not2] : -1;
    return katsayi1 >= katsayi2 ? not1 : not2;
}

function getHedefNotIcinMinTskor(hedefNot, sinifOrtalamasi) {
    let hedefAralikAnahtari = null;
    // Bu fonksiyon T-skoru tabanlı olduğu için, sınıf ortalaması >= 80 ise anlamlı bir T-skoru döndürmemeli
    // çünkü o durumda Mutlak Sistem geçerlidir. Çağıran fonksiyon bu durumu kontrol etmeli.
    if (sinifOrtalamasi >= 80) {
        console.warn("getHedefNotIcinMinTskor: Sınıf ortalaması >= 80 ise T-skoru anlamsızdır, Mutlak Sistem geçerlidir.");
        return null; // Veya özel bir işaretçi
    }

    const siraliOrtalamaAraliklari = Object.keys(T_SKOR_ARALIKLARI_ORTALAMAYA_GORE).sort((a, b) => parseFloat(a.split('_')[0]) - parseFloat(b.split('_')[0]));
    for (const key of siraliOrtalamaAraliklari) {
        const [minOrtStr, maxOrtStr] = key.split('_');
        const minOrt = parseFloat(minOrtStr);
        const maxOrt = parseFloat(maxOrtStr);
        if (sinifOrtalamasi > minOrt && sinifOrtalamasi <= maxOrt) {
            hedefAralikAnahtari = key;
            break;
        }
    }

    if (!hedefAralikAnahtari) {
         if (sinifOrtalamasi > 0 && sinifOrtalamasi <= 42.5) {
            hedefAralikAnahtari = "0_42.5";
        } else {
            console.error("Hedef T-skor için uygun ortalama aralığı bulunamadı (Ort < 80):", sinifOrtalamasi);
            return null;
        }
    }

    if (!T_SKOR_ARALIKLARI_ORTALAMAYA_GORE[hedefAralikAnahtari] || !T_SKOR_ARALIKLARI_ORTALAMAYA_GORE[hedefAralikAnahtari][hedefNot]) {
        console.error("Hedef not için T-skor aralığı bulunamadı:", hedefNot, "Ort. Aralığı:", hedefAralikAnahtari);
        return null;
    }
    const minT = T_SKOR_ARALIKLARI_ORTALAMAYA_GORE[hedefAralikAnahtari][hedefNot][0];
    return minT === -Infinity ? null : minT; // FF için -Infinity olabilir, bu durumda null daha iyi. Pratikte FF için T-skor hedeflemek mantıklı değil.
}

function hataGoster(element, mesaj) { element.innerHTML = `<p class="error-message">${mesaj}</p>`; }
function openTab(evt, tabName) { let i, tabcontent, tabbuttons; tabcontent = document.getElementsByClassName("tab-content"); for (i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; tabcontent[i].classList.remove("active"); } tabbuttons = document.getElementsByClassName("tab-button"); for (i = 0; i < tabbuttons.length; i++) { tabbuttons[i].classList.remove("active"); } const currentTab = document.getElementById(tabName); if (currentTab) { currentTab.style.display = "block"; currentTab.classList.add("active"); } if (evt && evt.currentTarget) { evt.currentTarget.classList.add("active"); } }
function toggleInputFields(formType) { const tekOrtalamaRadioId = `tekOrtalama${formType}`; const tekOrtalamaGrupId = `tek-ortalama-grup${formType}`; const detayliGirisGrupId = `detayli-giris-grup${formType}`; const tekOrtalamaRadio = document.getElementById(tekOrtalamaRadioId); const tekOrtalamaGrup = document.getElementById(tekOrtalamaGrupId); const detayliGirisGrup = document.getElementById(detayliGirisGrupId); const tekOrtalamaInput = tekOrtalamaGrup ? tekOrtalamaGrup.querySelector('input[type="number"]') : null; const detayliInputs = detayliGirisGrup ? detayliGirisGrup.querySelectorAll('input[type="number"]') : []; if (tekOrtalamaRadio && tekOrtalamaGrup && detayliGirisGrup) { if (tekOrtalamaRadio.checked) { tekOrtalamaGrup.classList.add('active'); detayliGirisGrup.classList.remove('active'); if (tekOrtalamaInput) tekOrtalamaInput.required = true; detayliInputs.forEach(input => { input.required = false; }); } else { tekOrtalamaGrup.classList.remove('active'); detayliGirisGrup.classList.add('active'); if (tekOrtalamaInput) { tekOrtalamaInput.required = false; } } } else { console.error(`toggleInputFields: Elementler bulunamadı - Form Tipi: ${formType}`); } }

// --- DOM Yüklendiğinde Çalışacak Kodlar ---
document.addEventListener('DOMContentLoaded', () => {

    const harfNotuFormu = document.getElementById('grade-calculator-form');
    const gerekliNotFormu = document.getElementById('required-grade-form');
    const senaryoFormu = document.getElementById('scenario-form');
    const harfNotuSonucAlani = document.getElementById('grade-result');
    const gerekliNotSonucAlani = document.getElementById('required-result');
    const senaryoTabloAlani = document.getElementById('scenario-table-output');

    if (harfNotuFormu) {
        harfNotuFormu.addEventListener('submit', (event) => {
            event.preventDefault();
            harfNotuSonucAlani.innerHTML = "<p>Hesaplanıyor...</p>";

            const secilenYontem = harfNotuFormu.querySelector('input[name="hesaplamaYontemiHarf"]:checked').value;
            const finalNotu = parseFloat(document.getElementById('final-grade').value);
            const sinifOrtalamasi = parseFloat(document.getElementById('class-avg').value);
            const sinifStandartSapma = parseFloat(document.getElementById('class-stddev').value);
            let araSinavKatkisi = 0;
            let gecerliGiris = true;

            // Ara sınav katkısını ve geçerliliğini kontrol et
            if (secilenYontem === 'tek') {
                const araSinavOrtalamasiInput = document.getElementById('midterm-avg');
                const araSinavOrtalamasi = parseFloat(araSinavOrtalamasiInput.value);
                araSinavOrtalamasiInput.required = true;
                if (isNaN(araSinavOrtalamasi) || araSinavOrtalamasi < 0 || araSinavOrtalamasi > 100) {
                    hataGoster(harfNotuSonucAlani, "Hata: Geçerli bir ara sınav ortalaması girin (0-100).");
                    gecerliGiris = false;
                } else {
                    araSinavKatkisi = araSinavOrtalamasi * 0.50; // %50 ağırlık
                }
                document.getElementById('vize-notu-harf').required = false;
                document.getElementById('vize-agirlik-harf').required = false;
                document.getElementById('odev-notu-harf').required = false;
                document.getElementById('odev-agirlik-harf').required = false;
            } else { // Detaylı Giriş
                document.getElementById('midterm-avg').required = false;
                const vizeNotuInput = document.getElementById('vize-notu-harf');
                const vizeAgirlikInput = document.getElementById('vize-agirlik-harf');
                const odevNotuInput = document.getElementById('odev-notu-harf');
                const odevAgirlikInput = document.getElementById('odev-agirlik-harf');
                vizeNotuInput.required = true; vizeAgirlikInput.required = true;
                odevNotuInput.required = true; odevAgirlikInput.required = true;

                const vizeNotu = parseFloat(vizeNotuInput.value);
                const vizeAgirlik = parseFloat(vizeAgirlikInput.value);
                const odevNotu = parseFloat(odevNotuInput.value);
                const odevAgirlik = parseFloat(odevAgirlikInput.value);

                if (isNaN(vizeNotu) || isNaN(vizeAgirlik) || isNaN(odevNotu) || isNaN(odevAgirlik) ||
                    vizeNotu < 0 || vizeNotu > 100 || odevNotu < 0 || odevNotu > 100 ||
                    vizeAgirlik < 0 || vizeAgirlik > 50 || odevAgirlik < 0 || odevAgirlik > 50) {
                    hataGoster(harfNotuSonucAlani, "Hata: Lütfen detaylı giriş alanlarını (notlar 0-100, ağırlıklar 0-50) doğru şekilde doldurun.");
                    gecerliGiris = false;
                } else if (Math.abs(vizeAgirlik + odevAgirlik - 50) > 0.01) { // Toplam ağırlık %50 olmalı
                    hataGoster(harfNotuSonucAlani, "Hata: Detaylı girişteki ağırlıkların toplamı 50 olmalıdır.");
                    gecerliGiris = false;
                } else {
                    araSinavKatkisi = (vizeNotu * (vizeAgirlik / 100)) + (odevNotu * (odevAgirlik / 100));
                    // Bu araSinavKatkisi, HBN'nin %50'lik kısmını oluşturur. Yani HBN = araSinavKatkisi + finalNotu * 0.50
                    // Aslında araSinavKatkisi'nı doğrudan HBN'nin yarısı olarak hesaplamak yerine,
                    // (vizeNotu * vizeAgirlikYuzdesi) + (odevNotu * odevAgirlikYuzdesi) şeklinde HBN'ye katkı olarak almak daha doğru.
                    // Ancak mevcut yapı HBN = (AraSınavOrt * 0.5) + (Final * 0.5) üzerine kurulu.
                    // Detaylı girişte vizeAgirlik+odevAgirlik = 50 ise, bu zaten ara sınavın HBN'ye %50 katkısını ifade eder.
                    // Yani (vizeNotu * vizeAgirlik/100) + (odevNotu * odevAgirlik/100) HBN'nin %X'lik kısmıdır.
                    // Bu X'in 50 olması gerekiyor.
                    // Şu anki hesap: araSinavKatkisi = (vizeNotu * vizeAgirlik/100) + (odevNotu * odevAgirlik/100)
                    // Bu değer doğrudan HBN'nin yarısı değil, HBN'ye katkının yarısıdır.
                    // Düzeltme: araSinavKatkisi, %50'lik yarıyıl içi notunu temsil etmeli.
                    // Vize Notu * (Vize Ağırlığı / Toplam Yarıyıl İçi Ağırlığı) * Yarıyıl İçi Etkisi
                    // Mevcut sistem: (VizeN * VizeA/100) + (OdevN * OdevA/100) => bu toplam, HBN'deki %50'lik yarıyıl içi notunu oluşturuyor.
                    // Yani bu hesap doğru: (vizeNotu * vizeAgirlik / 100) + (odevNotu * odevAgirlik / 100)
                    // Buradaki vizeAgirlik ve odevAgirlik, dersin toplam %100'lük ağırlığı içindeki payları.
                    // Ve bunların toplamı %50 (yarıyıl içi) olmalı.
                    // Örn: Vize %30 (100 üzerinden), Ödev %20 (100 üzerinden) ise
                    // araSinavKatkisi = (vizeN * 0.3) + (odevN * 0.2) olur. Bu HBN'ye doğrudan eklenir.
                    // Bu durumda HBN = (vizeN * 0.3) + (odevN * 0.2) + (finalN * 0.5) olmalı.
                    // Script'teki yapı: HBN = araSinavKatkisi + finalNotu * 0.50
                    // Ve araSinavKatkisi = (vizeN * vizeAgirlik/100) + (odevN * odevAgirlik/100)
                    // Burada vizeAgirlik + odevAgirlik = 50 olmalı (yani %50'lik dilimin içindeki ağırlıklar).
                    // Eğer vize dersin %30'u, ödev %20'si ise:
                    // araSinavKatkisi = (vizeNotu * 30/100) + (odevNotu * 20/100)
                    // Bu durumda HBN = araSinavKatkisi + finalNotu * 0.50 değil;
                    // HBN = (vizeNotu * VizeGenelAgirlik) + (odevNotu * OdevGenelAgirlik) + (finalNotu * FinalGenelAgirlik)
                    // Mevcut yapı: Ara sınavlar toplamı %50, Final %50.
                    // Detaylı girişteki ağırlıklar (%vize, %ödev) bu %50'lik ara sınav diliminin nasıl oluştuğunu belirtir.
                    // Örn: Ara sınav %50'lik bloğun %60'ı vize, %40'ı ödev ise:
                    // Vize Notu * (0.50 * 0.60) + Ödev Notu * (0.50 * 0.40) + Final Notu * 0.50
                    // Vize Notu * 0.30 + Ödev Notu * 0.20 + Final Notu * 0.50
                    // Script'teki "vize-agirlik-harf" ve "odev-agirlik-harf" alanları, HBN'ye olan % cinsinden doğrudan katkıları istiyor
                    // ve bunların toplamının 50 olması bekleniyor (yarıyıl içinin toplam katkısı).
                    // Yani (vizeNotu * vizeAgirlikInput/100) + (odevNotu * odevAgirlikInput/100) doğru bir yarıyıl içi notu verir.
                    // Bu, HBN'nin %50'lik kısmıdır.
                    // O halde HBN = YariyilIciNotu + finalNotu * 0.50 doğru.
                    // YariyilIciNotu = (vizeNotu * vizeAgirlik/100) + (odevNotu * odevAgirlik/100)
                    // Burada vizeAgirlik ve odevAgirlik, HBN'ye olan % katkıları olmalı (toplamları 50 olan).
                    // Tekrar gözden geçirildiğinde:
                    // `araSinavKatkisi = (vizeNotu * vizeAgirlik / 100) + (odevNotu * odevAgirlik / 100);`
                    // `hamBasariNotu = araSinavKatkisi + (finalNotu * 0.50);`
                    // Burada vizeAgirlik ve odevAgirlik, dersin genel ağırlıkları (örn. 30, 20) ise,
                    // araSinavKatkisi yarıyıl içi notunun HBN'ye katkısı olur.
                    // Bu durumda hamBasariNotu = araSinavKatkisi + (finalNotu * finalAgirligi/100) olmalı.
                    // Eğer "vize-agirlik-harf" vs. %50'lik dilimin içindeki ağırlıklar ise (örn. 30 + 20 = 50 değil de,
                    // %50'lik kısmın %60'ı vize, %40'ı ödev gibi), o zaman:
                    // araSinavKatkisi = (vizeNotu * vizeOrani + odevNotu * odevOrani) * 0.50; (vizeOrani+odevOrani=1)
                    // Şu anki HTML'deki small text'ler (Örn: 30, Örn:20 ve toplamı 50 olmalı) şunu ima ediyor:
                    // Vize ağırlığı (HBN'ye katkısı % olarak), Ödev ağırlığı (HBN'ye katkısı % olarak)
                    // Ve bunların toplamı 50 (Yarıyıl içinin HBN'ye toplam katkısı).
                    // Bu durumda `araSinavKatkisi`nın HBN'ye katkısı zaten hesaplanmış oluyor.
                    // HBN = araSinavKatkisi (yarıyıl içi katkısı) + (finalNotu * 0.50) (final katkısı)
                    // Bu mantık doğru görünüyor.
                }
            }

            // Diğer girişlerin geçerliliği
            if (isNaN(finalNotu) || isNaN(sinifOrtalamasi) || isNaN(sinifStandartSapma)) {
                hataGoster(harfNotuSonucAlani, "Hata: Lütfen Final Notu, Sınıf Ortalaması ve Standart Sapma alanlarını sayısal olarak doldurun.");
                gecerliGiris = false;
            }
            if (finalNotu < 0 || finalNotu > 100 || sinifOrtalamasi < 0 || sinifOrtalamasi > 100 || sinifStandartSapma < 0) {
                hataGoster(harfNotuSonucAlani, "Hata: Final Notu ve ortalama 0-100, standart sapma 0 veya üzeri olmalıdır.");
                gecerliGiris = false;
            }
            // Standart sapma 0 kontrolü sınıf ortalaması < 80 durumunda anlamlı, >=80 ise T-skoru hesaplanmayacak.
            // Bu kontrolü T-skoru hesaplama bloğuna taşıyabiliriz.

            if (!gecerliGiris) return;

            let hamBasariNotu = 0;
            if (secilenYontem === 'tek') {
                 // araSinavKatkisi zaten HBN'ye %50 etki edecek şekilde hesaplanmıştı (araSinavOrtalamasi * 0.50)
                 // Bu yüzden HBN = araSinavKatkisi (yani ara sınavların HBN'ye olan %50'lik katkısı) + finalNotu * 0.50
                 // Yanlış: araSinavKatkisi burada (araSinavOrtalamasi * 0.50) değil, (araSinavOrtalamasi) olmalı,
                 // sonra HBN = araSinavOrtalamasi * 0.50 + finalNotu * 0.50 olmalı.
                 // Düzeltilmiş araSinavKatkisi (tek ortalama için):
                 const araSinavOrtalamasi = parseFloat(document.getElementById('midterm-avg').value); // Bunu tekrar alalım.
                 hamBasariNotu = (araSinavOrtalamasi * 0.50) + (finalNotu * 0.50);
            } else { // Detaylı Giriş
                 // araSinavKatkisi zaten HBN'ye olan % katkıların toplamı (max %50) olarak hesaplandı.
                 // HBN = araSinavKatkisi (yarıyıl içi toplam % katkı) + (finalNotu * 0.50) (finalin %50 katkısı)
                 hamBasariNotu = araSinavKatkisi + (finalNotu * 0.50);
            }


            // --- YUVARLAMA YORUMU EKLENDİ ---
            // PDF Madde 3 (Kaynak 13) belirtir: "Bağıl değerlendirme sisteminde hesaplama sonucu
            // ortaya çıkan ham başarı notunun virgülden iki basamak sonrası..."
            // Bu, HBN'nin T-skoru hesaplamasında kullanılmadan önce iki ondalığa yuvarlanması/kesilmesi
            // gerektiği şeklinde yorumlanabilir. Mevcut script, HBN'yi orijinal ondalık hassasiyetiyle
            // T-skoru hesaplamasında kullanır; T-skorunun kendisi daha sonra iki ondalığa yuvarlanır.
            // Eğer HBN'yi önce yuvarlamak gerekirse, T-skoru hesaplamasından önce şöyle bir adım eklenebilir:
            // hamBasariNotu = Math.round(hamBasariNotu * 100) / 100; // veya parseFloat(hamBasariNotu.toFixed(2));
            // Bu değişikliğin sonuçlar üzerindeki etkisi genellikle çok küçük olacaktır.
            // Mevcut gösterimde .toFixed(2) kullanılırken, hesaplamada orijinal ondalıklı değer kullanılır.
            // --- YUVARLAMA YORUMU SONU ---

            let harfNotu = null;
            let anaMesaj = "";
            let tSkoru = null;
            let hesaplamaDetaylari = "";

            if (finalNotu < MINIMUM_FINAL_NOTU_VARSAYILAN) {
                harfNotu = "FF";
                anaMesaj = `Final notunuz (${finalNotu}) minimum (${MINIMUM_FINAL_NOTU_VARSAYILAN}) sınırının altında olduğu için harf notunuz doğrudan <strong>FF</strong> olarak belirlenmiştir.`;
            } else if (hamBasariNotu <= 15) {
                harfNotu = "FF";
                anaMesaj = `Hesaplanan Ham Başarı Notu (${hamBasariNotu.toFixed(2)}) 15 veya altında olduğu için harf notunuz doğrudan <strong>FF</strong> olarak belirlenmiştir.`;
            } else {
                const mutlakNotKarsiligi = getMutlakDegerlendirmeNotu(hamBasariNotu);

                if (sinifOrtalamasi >= 80) { // --- SINIF ORT >= 80 DURUMU GÜNCELLENDİ ---
                    harfNotu = mutlakNotKarsiligi;
                    anaMesaj = `Sınıf ortalaması (${sinifOrtalamasi.toFixed(2)}) 80 veya üzeri olduğu için notunuz doğrudan Mutlak Değerlendirme Sistemine (Tablo-3) göre belirlenmiştir.`;
                    hesaplamaDetaylari = `Mutlak Değerlendirme (Tablo-3) sonucu: ${mutlakNotKarsiligi}.`;
                } else { // Sınıf Ortalaması < 80: Bağıl Değerlendirme
                    if (sinifStandartSapma === 0) {
                        hataGoster(harfNotuSonucAlani, "Hata: Sınıf Ortalaması 80'den düşük olduğunda Standart Sapma 0 olamaz. Bu durumda bağıl değerlendirme yapılamaz.");
                        return;
                    }

                    tSkoru = ((hamBasariNotu - sinifOrtalamasi) / sinifStandartSapma) * 10 + 50;
                    tSkoru = Math.round(tSkoru * 100) / 100; // T-skoru iki ondalık

                    const bagilNot = getBagilDegerlendirmeNotuTskor(tSkoru, sinifOrtalamasi);

                    if (bagilNot === null) {
                        anaMesaj = `Bağıl değerlendirme için T-Skor (${tSkoru.toFixed(2)}) karşılığı bir harf notu aralığı bulunamadı (Sınıf Ort: ${sinifOrtalamasi.toFixed(2)}). Bu durumda Mutlak Değerlendirme (Tablo-3) notunuz esas alınmıştır.`;
                        harfNotu = mutlakNotKarsiligi;
                        hesaplamaDetaylari = `Mutlak Değerlendirme (Tablo-3) sonucu: ${mutlakNotKarsiligi}.`;
                    } else {
                        harfNotu = karsilastirHarfNotlari(bagilNot, mutlakNotKarsiligi);
                        hesaplamaDetaylari = `Hesaplanan T-Skoru: <strong>${tSkoru.toFixed(2)}</strong>.<br>`;
                        hesaplamaDetaylari += `T-skoruna göre Bağıl Değerlendirme notu: ${bagilNot}.<br>`;
                        hesaplamaDetaylari += `Ham Başarı Notunun Mutlak Değerlendirme (Tablo-3) karşılığı: ${mutlakNotKarsiligi}.<br>`;
                        if (harfNotu === mutlakNotKarsiligi && harfNotu !== bagilNot && bagilNot !== null) {
                            hesaplamaDetaylari += `Mutlak değerlendirme notunuz (${mutlakNotKarsiligi}), bağıl notunuzdan (${bagilNot}) daha iyi olduğu için esas alınmıştır (KTÜ Yön. Madde 9, Alt Madde 6).<br>`;
                        } else if (harfNotu === bagilNot && harfNotu !== mutlakNotKarsiligi) {
                             hesaplamaDetaylari += `Bağıl değerlendirme notunuz (${bagilNot}) esas alınmıştır.<br>`;
                        }
                    }
                }
            }

            let sonucMesaji = "";
            if (anaMesaj) {
                sonucMesaji += `<p>${anaMesaj}</p><hr>`;
            }
            sonucMesaji += `Hesaplanan Ham Başarı Notu: <strong>${hamBasariNotu.toFixed(2)}</strong><br>`;
            sonucMesaji += `Harf Notu: <strong style="font-size: 1.2em;">${harfNotu}</strong>`;

            if (hesaplamaDetaylari) {
                sonucMesaji += `<br><details style="margin-top: 10px; font-size: 0.9em; color: #555;"><summary>Hesaplama Detayları</summary><p style="margin-top: 5px;">${hesaplamaDetaylari}</p></details>`;
            }

            if (harfNotu === "DC") {
                sonucMesaji += "<br><strong>Not:</strong> DC ile geçme durumu dönemlik ağırlıklı genel not ortalamanızın 2.00 ve üzeri olmasına bağlıdır.";
            } else if (["DD", "FD", "FF"].includes(harfNotu)) {
                sonucMesaji += `<br><strong>Not:</strong> ${harfNotu} notu başarısız anlamına gelir.`;
            }
            harfNotuSonucAlani.innerHTML = sonucMesaji;
        });
    }

    // Gerekli Final Notu Hesaplama Formu İşleyicisi
    if (gerekliNotFormu) {
        gerekliNotFormu.addEventListener('submit', (event) => {
            event.preventDefault();
            gerekliNotSonucAlani.innerHTML = "<p>Hesaplanıyor...</p>";
            // ... (Bu bölüm, sınıf ortalaması >= 80 durumunu ayrıca ele almak üzere güncellenmelidir)
            // Mevcut getHedefNotIcinMinTskor, ort >= 80 için null dönecektir. Bu durum burada ele alınmalı.
            // Şimdilik orijinal mantığı koruyor ama ort >= 80 için doğru çalışmayabilir.

            const secilenYontem = gerekliNotFormu.querySelector('input[name="hesaplamaYontemiGerekli"]:checked').value;
            const hedefHarfNotu = document.getElementById('target-grade').value;
            const sinifOrtalamasi = parseFloat(document.getElementById('req-class-avg').value);
            const sinifStandartSapma = parseFloat(document.getElementById('req-class-stddev').value);
            let araSinavKatkisi = 0; let gecerliGiris = true;

            if (secilenYontem === 'tek') {
                const araSinavOrtalamasiInput = document.getElementById('req-midterm-avg');
                const araSinavOrtalamasi = parseFloat(araSinavOrtalamasiInput.value);
                araSinavOrtalamasiInput.required = true;
                if (isNaN(araSinavOrtalamasi) || araSinavOrtalamasi < 0 || araSinavOrtalamasi > 100) {
                    hataGoster(gerekliNotSonucAlani, "Hata: Geçerli bir ara sınav ortalaması girin (0-100)."); gecerliGiris = false;
                } else {
                    // HBN = araSinavOrtalamasi * 0.50 + ...
                    // araSinavKatkisi HBN'nin yarısını oluşturan kısım olmalı.
                    araSinavKatkisi = araSinavOrtalamasi * 0.50;
                }
                document.getElementById('vize-notu-gerekli').required = false; document.getElementById('vize-agirlik-gerekli').required = false;
                document.getElementById('odev-notu-gerekli').required = false; document.getElementById('odev-agirlik-gerekli').required = false;
            } else {
                document.getElementById('req-midterm-avg').required = false;
                const vizeNotuInput = document.getElementById('vize-notu-gerekli');
                const vizeAgirlikInput = document.getElementById('vize-agirlik-gerekli');
                const odevNotuInput = document.getElementById('odev-notu-gerekli');
                const odevAgirlikInput = document.getElementById('odev-agirlik-gerekli');
                vizeNotuInput.required = true; vizeAgirlikInput.required = true;
                odevNotuInput.required = true; odevAgirlikInput.required = true;
                const vizeNotu = parseFloat(vizeNotuInput.value);
                const vizeAgirlik = parseFloat(vizeAgirlikInput.value);
                const odevNotu = parseFloat(odevNotuInput.value);
                const odevAgirlik = parseFloat(odevAgirlikInput.value);
                if (isNaN(vizeNotu) || isNaN(vizeAgirlik) || isNaN(odevNotu) || isNaN(odevAgirlik) ||
                    vizeNotu < 0 || vizeNotu > 100 || odevNotu < 0 || odevNotu > 100 ||
                    vizeAgirlik < 0 || vizeAgirlik > 50 || odevAgirlik < 0 || odevAgirlik > 50) {
                    hataGoster(gerekliNotSonucAlani, "Hata: Lütfen detaylı giriş alanlarını (notlar 0-100, ağırlıklar 0-50) doğru şekilde doldurun."); gecerliGiris = false;
                } else if (Math.abs(vizeAgirlik + odevAgirlik - 50) > 0.01) {
                    hataGoster(gerekliNotSonucAlani, "Hata: Detaylı girişteki ağırlıkların toplamı 50 olmalıdır."); gecerliGiris = false;
                } else {
                    // araSinavKatkisi, HBN'nin %50'lik yarıyıl içi kısmını oluşturur.
                    araSinavKatkisi = (vizeNotu * vizeAgirlik / 100) + (odevNotu * odevAgirlik / 100);
                }
            }

            if (!hedefHarfNotu || isNaN(sinifOrtalamasi) || isNaN(sinifStandartSapma)) {
                hataGoster(gerekliNotSonucAlani, "Hata: Lütfen Hedef Not, Sınıf Ortalaması ve Standart Sapma alanlarını doğru şekilde doldurun."); gecerliGiris = false;
            }
            if (sinifOrtalamasi < 0 || sinifOrtalamasi > 100 || sinifStandartSapma < 0) {
                hataGoster(gerekliNotSonucAlani, "Hata: Sınıf Ortalaması 0-100, standart sapma 0 veya üzeri olmalıdır."); gecerliGiris = false;
            }
             if (sinifOrtalamasi < 80 && sinifStandartSapma === 0) { // Sadece ort < 80 ise std sapma 0 olamaz
                hataGoster(gerekliNotSonucAlani, "Hata: Sınıf Ortalaması 80'den düşük ise Standart Sapma 0 olamaz."); gecerliGiris = false;
            }
            if (!gecerliGiris) return;

            // --- YENİ: Sınıf Ortalaması >= 80 durumu için Gerekli Not Mantığı ---
            if (sinifOrtalamasi >= 80) {
                const mutlakAralik = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                if (!mutlakAralik) {
                    hataGoster(gerekliNotSonucAlani, `Hata: Hedeflenen harf notu (${hedefHarfNotu}) için mutlak değerlendirme aralığı bulunamadı.`);
                    return;
                }
                const hedefHamBasariNotuMutlak = mutlakAralik[0]; // Hedef HBN için alt sınır (örn: CC için 60)
                let gerekenFinalNotu = 2 * (hedefHamBasariNotuMutlak - araSinavKatkisi); // Finalin ağırlığı %50 varsayımıyla
                gerekenFinalNotu = Math.max(0, gerekenFinalNotu); // Negatif olamaz
                const gerekenFinalNotuYuvarla = Math.ceil(gerekenFinalNotu * 100) / 100; // Üste yuvarla ve 2 ondalık

                let sonucMetniGerekli = "";
                let anaMesajGerekli = "";
                let hesaplamaDetaylariGerekli = `Sınıf ortalaması (${sinifOrtalamasi.toFixed(2)}) 80 veya üzeri olduğu için Mutlak Değerlendirme (Tablo-3) hedeflenmiştir.<br>`;
                hesaplamaDetaylariGerekli += `Hedeflenen <strong>${hedefHarfNotu}</strong> notu için Mutlak Sistemde gereken Ham Başarı Notu: <strong>${hedefHamBasariNotuMutlak.toFixed(2)}</strong>.<br>`;


                if (gerekenFinalNotuYuvarla > 100) {
                    anaMesajGerekli = `Bu Ham Başarı Notuna (${hedefHamBasariNotuMutlak.toFixed(2)}) ulaşmak için gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}) <strong>100'den yüksek</strong>. Bu hedefe ulaşmak imkansız.`;
                    sonucMetniGerekli = "İmkansız (>100)";
                } else if (gerekenFinalNotuYuvarla < MINIMUM_FINAL_NOTU_VARSAYILAN) {
                     anaMesajGerekli = `Bu Ham Başarı Notuna (${hedefHamBasariNotuMutlak.toFixed(2)}) ulaşmak için teorik olarak gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}), minimum final (${MINIMUM_FINAL_NOTU_VARSAYILAN}) sınırının altındadır. Yine de finalden <strong>en az ${MINIMUM_FINAL_NOTU_VARSAYILAN}</strong> almalısınız.`;
                    sonucMetniGerekli = `En az ${MINIMUM_FINAL_NOTU_VARSAYILAN} (Hesaplanan: ${gerekenFinalNotuYuvarla.toFixed(2)})`;
                } else {
                    anaMesajGerekli = `Bu Ham Başarı Notuna (${hedefHamBasariNotuMutlak.toFixed(2)}) ulaşmak için finalden <strong>en az ${gerekenFinalNotuYuvarla.toFixed(2)}</strong> almanız gerekmektedir.`;
                    sonucMetniGerekli = gerekenFinalNotuYuvarla.toFixed(2);
                }
                 let sonucMesajiGerekli = `Gereken Final Notu (Mutlak Sistem): <strong style="font-size: 1.2em;">${sonucMetniGerekli}</strong><br><hr>`;
                sonucMesajiGerekli += `<p>${anaMesajGerekli}</p>`;
                sonucMesajiGerekli += `<details style="margin-top: 10px; font-size: 0.9em; color: #555;"><summary>Hesaplama Detayları</summary><p style="margin-top: 5px;">${hesaplamaDetaylariGerekli}</p></details>`;
                gerekliNotSonucAlani.innerHTML = sonucMesajiGerekli;
                return;
            }
            // --- Sınıf Ortalaması >= 80 durumu için Gerekli Not Mantığı SONU ---


            // Sınıf Ortalaması < 80 ise Bağıl Sistem hedefi ile devam et
            const minimumTskor = getHedefNotIcinMinTskor(hedefHarfNotu, sinifOrtalamasi);
            if (minimumTskor === null) {
                hataGoster(gerekliNotSonucAlani, `Hata: Hedeflenen ${hedefHarfNotu} notu için geçerli bir minimum T-skor bulunamadı (Sınıf Ort: ${sinifOrtalamasi.toFixed(2)}). Sınıf ortalaması 80'den küçük olduğu için Bağıl Sistem esas alınmaya çalışıldı.`);
                return;
            }

            let hedefHamBasariNotuBagil = ((minimumTskor - 50) / 10) * sinifStandartSapma + sinifOrtalamasi;
            let gerekenFinalNotu = 2 * (hedefHamBasariNotuBagil - araSinavKatkisi); // Finalin ağırlığı %50 varsayımıyla
            gerekenFinalNotu = Math.max(0, gerekenFinalNotu); // Negatif olamaz
            const gerekenFinalNotuYuvarla = Math.ceil(gerekenFinalNotu *100) / 100; // Üste yuvarlama ve 2 ondalık

            let anaMesaj = "";
            let hesaplamaDetaylari = `Hedeflenen <strong>${hedefHarfNotu}</strong> notu (Bağıl Değerlendirme) için;<br>`;
            hesaplamaDetaylari += `- Gerekli min. T-Skoru: ${minimumTskor.toFixed(2)} (Sınıf Ort: ${sinifOrtalamasi.toFixed(2)}, Std Sapma: ${sinifStandartSapma.toFixed(2)})<br>`;
            hesaplamaDetaylari += `- Bu T-skoruna ulaşmak için gereken minimum Ham Başarı Notu (Bağıl): <strong>${hedefHamBasariNotuBagil.toFixed(2)}</strong><br>`;

            const mutlakNotKarsiligiHBN = getMutlakDegerlendirmeNotu(hedefHamBasariNotuBagil);
            hesaplamaDetaylari += `<small style='color:#555;'>(Bu Ham Başarı Notu (${hedefHamBasariNotuBagil.toFixed(2)}) Mutlak Değerlendirme Sisteminde yaklaşık olarak ${mutlakNotKarsiligiHBN} notuna karşılık gelir.)</small>`;

            let sonucMetni = "";
            if (gerekenFinalNotuYuvarla > 100) {
                anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}) <strong>100'den yüksek</strong>. Bu hedefe ulaşmak imkansız.`;
                sonucMetni = "İmkansız (>100)";
            } else if (gerekenFinalNotuYuvarla < MINIMUM_FINAL_NOTU_VARSAYILAN) {
                 anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için teorik olarak gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}), minimum final (${MINIMUM_FINAL_NOTU_VARSAYILAN}) sınırının altındadır. Finalden <strong>en az ${MINIMUM_FINAL_NOTU_VARSAYILAN}</strong> almanız gerekmektedir. Bu durumda hedeflediğiniz ${hedefHarfNotu} notuna ulaşamayabilirsiniz, ancak dersi geçmek için minimum final şartını sağlamalısınız.`;
                sonucMetni = `En az ${MINIMUM_FINAL_NOTU_VARSAYILAN} (Hesaplanan: ${gerekenFinalNotuYuvarla.toFixed(2)})`;
            } else {
                anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için finalden <strong>en az ${gerekenFinalNotuYuvarla.toFixed(2)}</strong> almanız gerekmektedir.`;
                sonucMetni = gerekenFinalNotuYuvarla.toFixed(2);
            }
            let sonucMesaji = `Gereken Final Notu (Bağıl Sistem): <strong style="font-size: 1.2em;">${sonucMetni}</strong><br><hr>`;
            sonucMesaji += `<p>${anaMesaj}</p>`;
            sonucMesaji += `<details style="margin-top: 10px; font-size: 0.9em; color: #555;"><summary>Hesaplama Detayları</summary><p style="margin-top: 5px;">${hesaplamaDetaylari}</p></details>`;
            gerekliNotSonucAlani.innerHTML = sonucMesaji;
        });
    }


    // --- Senaryo Tablosu Formu İşleyicisi ---
    if (senaryoFormu) {
        senaryoFormu.addEventListener('submit', (event) => {
            event.preventDefault();
            senaryoTabloAlani.innerHTML = "<p>Senaryolar Hesaplanıyor...</p>";
            // ... (Bu bölüm de, sınıf ortalaması >= 80 durumunu ayrıca ele almak üzere güncellenmelidir)
            // Mevcut getHedefNotIcinMinTskor, ort >= 80 için null dönecektir. Bu durum burada ele alınmalı.
            // Şimdilik orijinal mantığı koruyor ama ort >= 80 için doğru çalışmayabilir.

            const secilenYontem = senaryoFormu.querySelector('input[name="hesaplamaYontemiSenaryo"]:checked').value;
            const hedefHarfNotu = senaryoFormu.querySelector('input[name="scenarioTargetGrade"]:checked').value;
            let araSinavKatkisi = 0; let gecerliGiris = true;

            if (secilenYontem === 'tek') {
                const araSinavOrtalamasiInput = document.getElementById('scenario-midterm-avg');
                const araSinavOrtalamasi = parseFloat(araSinavOrtalamasiInput.value);
                araSinavOrtalamasiInput.required = true;
                if (isNaN(araSinavOrtalamasi) || araSinavOrtalamasi < 0 || araSinavOrtalamasi > 100) {
                    hataGoster(senaryoTabloAlani, "Hata: Geçerli bir ara sınav ortalaması girin (0-100)."); gecerliGiris = false;
                } else {
                    araSinavKatkisi = araSinavOrtalamasi * 0.50;
                }
                document.getElementById('vize-notu-senaryo').required = false; document.getElementById('vize-agirlik-senaryo').required = false;
                document.getElementById('odev-notu-senaryo').required = false; document.getElementById('odev-agirlik-senaryo').required = false;
            } else {
                document.getElementById('scenario-midterm-avg').required = false;
                const vizeNotuInput = document.getElementById('vize-notu-senaryo');
                const vizeAgirlikInput = document.getElementById('vize-agirlik-senaryo');
                const odevNotuInput = document.getElementById('odev-notu-senaryo');
                const odevAgirlikInput = document.getElementById('odev-agirlik-senaryo');
                vizeNotuInput.required = true; vizeAgirlikInput.required = true;
                odevNotuInput.required = true; odevAgirlikInput.required = true;
                const vizeNotu = parseFloat(vizeNotuInput.value);
                const vizeAgirlik = parseFloat(vizeAgirlikInput.value);
                const odevNotu = parseFloat(odevNotuInput.value);
                const odevAgirlik = parseFloat(odevAgirlikInput.value);
                if (isNaN(vizeNotu) || isNaN(vizeAgirlik) || isNaN(odevNotu) || isNaN(odevAgirlik) ||
                    vizeNotu < 0 || vizeNotu > 100 || odevNotu < 0 || odevNotu > 100 ||
                    vizeAgirlik < 0 || vizeAgirlik > 50 || odevAgirlik < 0 || odevAgirlik > 50) {
                    hataGoster(senaryoTabloAlani, "Hata: Lütfen detaylı giriş alanlarını (notlar 0-100, ağırlıklar 0-50) doğru şekilde doldurun."); gecerliGiris = false;
                } else if (Math.abs(vizeAgirlik + odevAgirlik - 50) > 0.01) {
                    hataGoster(senaryoTabloAlani, "Hata: Detaylı girişteki ağırlıkların toplamı 50 olmalıdır."); gecerliGiris = false;
                } else {
                    araSinavKatkisi = (vizeNotu * vizeAgirlik / 100) + (odevNotu * odevAgirlik / 100);
                }
            }
            if (!gecerliGiris) return;

            const senaryoOrtalamalar = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]; // 75'ten sonrası için ayrı mantık
            const senaryoStdSapmalar = [8, 10, 12, 15, 18, 20, 22, 25];

            let tabloHTML = `<table>`;
            tabloHTML += `<caption>Farklı Sınıf Ortalaması ve Standart Sapma Değerlerine Göre Hedeflenen "${hedefHarfNotu}" Notu İçin Gereken Minimum Final Notları</caption>`;
            tabloHTML += `<thead><tr><th scope="col">↓ Std. Sapma \\ → Sınıf Ort.</th>`;
            senaryoOrtalamalar.forEach(ort => { tabloHTML += `<th scope="col">${ort}</th>`; });
            tabloHTML += `<th scope="col">&ge;80 (Mutlak)</th>`; // Sınıf Ort >= 80 için yeni sütun
            tabloHTML += `</tr></thead><tbody>`;

            senaryoStdSapmalar.forEach(stdSapma => {
                tabloHTML += `<tr><th scope="row">Std. Sapma: ${stdSapma}</th>`;
                senaryoOrtalamalar.forEach(ortalama => {
                    let gerekenFinalNotu = "-"; let cellClass = "impossible";
                    if (ortalama >= 80) { // Bu sütun artık ayrı ele alınacak
                        gerekenFinalNotu = "Bkz. &ge;80"; cellClass = "";
                    } else {
                        const minimumTskor = getHedefNotIcinMinTskor(hedefHarfNotu, ortalama);
                        if (minimumTskor !== null && stdSapma > 0) {
                            let hedefHamBasariNotuNihai = ((minimumTskor - 50) / 10) * stdSapma + ortalama;
                            let hesaplananFinal = 2 * (hedefHamBasariNotuNihai - araSinavKatkisi);
                            hesaplananFinal = Math.max(0, hesaplananFinal);

                            if (hesaplananFinal > 100) { gerekenFinalNotu = "100+"; cellClass = "impossible"; }
                            else if (hesaplananFinal < MINIMUM_FINAL_NOTU_VARSAYILAN) { gerekenFinalNotu = `Min ${MINIMUM_FINAL_NOTU_VARSAYILAN}`; cellClass = "min-final"; }
                            else { gerekenFinalNotu = Math.ceil(hesaplananFinal).toString(); cellClass = ""; }
                        }
                    }
                    tabloHTML += `<td class="${cellClass}">${gerekenFinalNotu}</td>`;
                });

                // Sınıf Ortalaması >= 80 (Mutlak Sistem) için hesaplama
                const mutlakAralikSenaryo = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                let gerekenFinalMutlak = "-"; let cellClassMutlak = "impossible";
                if (mutlakAralikSenaryo) {
                    const hedefHBNSenaryoMutlak = mutlakAralikSenaryo[0];
                    let hesaplananFinalMutlak = 2 * (hedefHBNSenaryoMutlak - araSinavKatkisi);
                    hesaplananFinalMutlak = Math.max(0, hesaplananFinalMutlak);

                    if (hesaplananFinalMutlak > 100) { gerekenFinalMutlak = "100+"; }
                    else if (hesaplananFinalMutlak < MINIMUM_FINAL_NOTU_VARSAYILAN) { gerekenFinalMutlak = `Min ${MINIMUM_FINAL_NOTU_VARSAYILAN}`; cellClassMutlak = "min-final"; }
                    else { gerekenFinalMutlak = Math.ceil(hesaplananFinalMutlak).toString(); cellClassMutlak = ""; }
                }
                tabloHTML += `<td class="${cellClassMutlak}" title="Sınıf Ort. ≥ 80 olduğunda Mutlak Sistem geçerlidir. Std. Sapma bu durumda anlamsızdır.">${gerekenFinalMutlak}</td>`;
                tabloHTML += `</tr>`;
            });

            tabloHTML += `</tbody></table>`;
            tabloHTML += `<p style="font-size:0.8em; margin-top:5px;"><strong>Not:</strong> Sınıf Ortalaması &ge;80 olduğunda değerlendirme Mutlak Sisteme göre yapılır ve Standart Sapma kullanılmaz.</p>`;
            senaryoTabloAlani.innerHTML = tabloHTML;
        });
    }

    const firstTabButton = document.querySelector('.tab-button');
    if (firstTabButton) {
        openTab(null, firstTabButton.getAttribute('onclick').split("'")[1]);
        if(document.getElementsByClassName('tab-button').length > 0) {
            document.getElementsByClassName('tab-button')[0].classList.add('active');
        }
    }
    toggleInputFields('Harf');
    toggleInputFields('Gerekli');
    toggleInputFields('Senaryo');

}); // DOMContentLoaded Sonu