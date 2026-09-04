// --- Sabitler ve Veri Yapıları (Global Kapsamda) ---
// KTÜ Senato Kararı 24.03.2026-363/8 (2026-2027 döneminden itibaren geçerli) — Tablo-3 Mutlak Değerlendirme aralıkları
const MUTLAK_DEGERLENDIRME_ARALIKLARI = { "AA": [86, 100], "BA": [78, 85.99], "BB": [70, 77.99], "CB": [60, 69.99], "CC": [50, 59.99], "DC": [45, 49.99], "DD": [38, 44.99], "FD": [30, 37.99], "FF": [0, 29.99], };
const HARF_NOTU_KATSAYILARI = { "AA": 4.0, "BA": 3.5, "BB": 3.0, "CB": 2.5, "CC": 2.0, "DC": 1.5, "DD": 1.0, "FD": 0.5, "FF": 0.0 };
const MINIMUM_FINAL_NOTU_VARSAYILAN = 45;
// KTÜ Usul ve Esaslar Madde 8 — final/bütünleme sınavından alınması gereken en az puan, fakülteye göre değişir.
const MINIMUM_FINAL_NOTU_FAKULTE = { genel: 45, saglik: 50, eczacilik: 60 };
function getMinimumFinalNotu(formTypeSuffix, formElement) {
    const secili = formElement ? formElement.querySelector(`input[name="fakulte${formTypeSuffix}"]:checked`) : null;
    const deger = secili ? secili.value : 'genel';
    return MINIMUM_FINAL_NOTU_FAKULTE[deger] !== undefined ? MINIMUM_FINAL_NOTU_FAKULTE[deger] : MINIMUM_FINAL_NOTU_VARSAYILAN;
}
const T_SKOR_ARALIKLARI_ORTALAMAYA_GORE = { "0_42.5": { "FF": [-Infinity, 35.99], "FD": [36, 40.99], "DD": [41, 45.99], "DC": [46, 50.99], "CC": [51, 55.99], "CB": [56, 60.99], "BB": [61, 65.99], "BA": [66, 70.99], "AA": [71, Infinity] }, "42.5_47.5": { "FF": [-Infinity, 33.99], "FD": [34, 38.99], "DD": [39, 43.99], "DC": [44, 48.99], "CC": [49, 53.99], "CB": [54, 58.99], "BB": [59, 63.99], "BA": [64, 68.99], "AA": [69, Infinity] }, "47.5_52.5": { "FF": [-Infinity, 31.99], "FD": [32, 36.99], "DD": [37, 41.99], "DC": [42, 46.99], "CC": [47, 51.99], "CB": [52, 56.99], "BB": [57, 61.99], "BA": [62, 66.99], "AA": [67, Infinity] }, "52.5_57.5": { "FF": [-Infinity, 29.99], "FD": [30, 34.99], "DD": [35, 39.99], "DC": [40, 44.99], "CC": [45, 49.99], "CB": [50, 54.99], "BB": [55, 59.99], "BA": [60, 64.99], "AA": [65, Infinity] }, "57.5_62.5": { "FF": [-Infinity, 27.99], "FD": [28, 32.99], "DD": [33, 37.99], "DC": [38, 42.99], "CC": [43, 47.99], "CB": [48, 52.99], "BB": [53, 57.99], "BA": [58, 62.99], "AA": [63, Infinity] }, "62.5_70": { "FF": [-Infinity, 25.99], "FD": [26, 30.99], "DD": [31, 35.99], "DC": [36, 40.99], "CC": [41, 45.99], "CB": [46, 50.99], "BB": [51, 55.99], "BA": [56, 60.99], "AA": [61, Infinity] }, "70_80": { "FF": [-Infinity, 23.99], "FD": [24, 28.99], "DD": [29, 33.99], "DC": [34, 38.99], "CC": [39, 43.99], "CB": [44, 48.99], "BB": [49, 53.99], "BA": [54, 58.99], "AA": [59, Infinity] } };

// --- Form Doğrulama ve Yardımcı Fonksiyonlar ---
function showFieldError(inputElement, message) {
    const formGroup = inputElement.closest('.form-group');
    if (!formGroup) return;
    clearFieldError(inputElement);
    inputElement.classList.add('invalid-input');
    const errorSpan = document.createElement('span');
    errorSpan.className = 'error-feedback fade-in';
    errorSpan.textContent = message;
    const hintElement = formGroup.querySelector('small');
    if (hintElement && hintElement.parentElement === formGroup) {
        hintElement.insertAdjacentElement('afterend', errorSpan);
    } else {
        formGroup.appendChild(errorSpan);
    }
}

function clearFieldError(inputElement) {
    if (!inputElement) return;
    const formGroup = inputElement.closest('.form-group');
    if (!formGroup) return;
    inputElement.classList.remove('invalid-input');
    const errorSpan = formGroup.querySelector('span.error-feedback');
    if (errorSpan) {
        errorSpan.classList.remove('fade-in');
        errorSpan.classList.add('fade-out');
        setTimeout(() => {
            if (errorSpan.parentNode) {
                errorSpan.parentNode.removeChild(errorSpan);
            }
        }, 280);
    }
}

function validateRequiredField(inputElement, fieldName) {
    if (!inputElement) return true;
    const value = inputElement.value;
    if (!value) {
        showFieldError(inputElement, `${fieldName} alanı boş bırakılamaz.`);
        return false;
    }
    clearFieldError(inputElement);
    return true;
}

function validateNumberField(inputElement, fieldName, min, max) {
    if (!inputElement) return true;
    const value = inputElement.value.trim();
    if (!value) {
        if (inputElement.required) {
            showFieldError(inputElement, `${fieldName} alanı boş bırakılamaz.`);
            return false;
        }
        clearFieldError(inputElement);
        return true;
    }
    const numberValue = parseFloat(value);
    if (isNaN(numberValue)) {
        showFieldError(inputElement, `${fieldName} geçerli bir sayı olmalıdır.`);
        return false;
    }
    if (min !== null && numberValue < min) {
        showFieldError(inputElement, `${fieldName} en az ${min} olmalıdır.`);
        return false;
    }
    if (max !== null && numberValue > max) {
        showFieldError(inputElement, `${fieldName} en fazla ${max} olmalıdır.`);
        return false;
    }
    clearFieldError(inputElement);
    return true;
}

function validateDetailedWeights(vizeAgirlikInput, odevAgirlikInput, formTypeSuffix) {
    if (!vizeAgirlikInput || !odevAgirlikInput) return true;

    const vizeAgirlikVal = parseFloat(vizeAgirlikInput.value);
    const odevAgirlikVal = parseFloat(odevAgirlikInput.value);

    if (vizeAgirlikInput.value.trim() && odevAgirlikInput.value.trim() &&
        !isNaN(vizeAgirlikVal) && !isNaN(odevAgirlikVal) &&
        vizeAgirlikVal >= 0 && vizeAgirlikVal <= 50 &&
        odevAgirlikVal >= 0 && odevAgirlikVal <= 50) {  

        if (Math.abs(vizeAgirlikVal + odevAgirlikVal - 50) > 0.01) {
            const message = "Vize ve Ödev ağırlıklarının toplamı 50 olmalıdır.";
            const vizeErrorSpanOld = vizeAgirlikInput.closest('.form-group').querySelector('span.error-feedback[data-type="weight-sum"]');
            if(vizeErrorSpanOld) clearFieldError(vizeAgirlikInput);
            const odevErrorSpanOld = odevAgirlikInput.closest('.form-group').querySelector('span.error-feedback[data-type="weight-sum"]');
            if(odevErrorSpanOld) clearFieldError(odevAgirlikInput);

            showFieldError(vizeAgirlikInput, message);
            let vizeErrorSpanNew = vizeAgirlikInput.closest('.form-group').querySelector('span.error-feedback');
            if(vizeErrorSpanNew) vizeErrorSpanNew.dataset.type = "weight-sum";

            showFieldError(odevAgirlikInput, message);
            let odevErrorSpanNew = odevAgirlikInput.closest('.form-group').querySelector('span.error-feedback');
            if(odevErrorSpanNew) odevErrorSpanNew.dataset.type = "weight-sum";
            return false;
        } else {
            const vizeErrorSpan = vizeAgirlikInput.closest('.form-group').querySelector('span.error-feedback[data-type="weight-sum"]');
            if (vizeErrorSpan) clearFieldError(vizeAgirlikInput);

            const odevErrorSpan = odevAgirlikInput.closest('.form-group').querySelector('span.error-feedback[data-type="weight-sum"]');
            if (odevErrorSpan) clearFieldError(odevAgirlikInput);
        }
    }
    return true;
}


// --- Hesaplama Yardımcı Fonksiyonları ---
function getMutlakDegerlendirmeNotu(hamBasariNotu) {
    const yuvarlanmisHBN = Math.round(hamBasariNotu);
    for (const grade in MUTLAK_DEGERLENDIRME_ARALIKLARI) {
        const [minScore, maxScore] = MUTLAK_DEGERLENDIRME_ARALIKLARI[grade];
        if (yuvarlanmisHBN >= minScore && yuvarlanmisHBN <= maxScore) return grade;
    }
    return "FF";
}

function getBagilDegerlendirmeNotuTskor(tSkoru, sinifOrtalamasi) {
    let hedefAralikAnahtari = null;
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
        if (sinifOrtalamasi >= 0 && sinifOrtalamasi <= 42.5) {
            hedefAralikAnahtari = "0_42.5";
        } else if (sinifOrtalamasi > 80) {
             console.warn("getBagilDegerlendirmeNotuTskor: Sınıf çan ortalaması > 80 ise T-skor anlamsızdır.");
            return null; 
        } else {
            const lastIntervalKey = siraliOrtalamaAraliklari[siraliOrtalamaAraliklari.length-1];
             if (sinifOrtalamasi > parseFloat(lastIntervalKey.split('_')[1])) {
                 console.warn(`Sınıf çan ortalaması (${sinifOrtalamasi}) tanımlı aralıkların üzerinde. En yüksek aralık (${lastIntervalKey}) kullanılacak.`);
                hedefAralikAnahtari = lastIntervalKey;
            } else {
                console.error("Sınıf çan ortalaması (" + sinifOrtalamasi + ") için geçerli bir T-Skor aralığı bulunamadı.");
                return null;
            }
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
    console.error("T-skor için harf notu bulunamadı. T-Skoru:", tSkoru, "Aralık:", hedefAralikAnahtari, "Notlar:", notlar);
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
    if (sinifOrtalamasi >= 80) { 
        return null;
    }
    let hedefAralikAnahtari = null;
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
        if (sinifOrtalamasi >= 0 && sinifOrtalamasi <= 42.5) {
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
    return minT === -Infinity ? 0 : minT;
}

// --- Tablo-2 (29 ve altı öğrencili sınıflar için yüzdelik dilim) Tahmini Hesaplama ---
// KTÜ Usul ve Esaslar Madde 9/1-3: Değerlendirmeye alınan öğrenci sayısı 1-29 arasında olan derslerde
// harfli notların belirlenmesinde Tablo-2 (yüzdelik dilim tablosu) kullanılır. Tablo-2'nin doğru
// uygulanabilmesi için sınıftaki TÜM öğrencilerin notlarının sıralanması gerekir; bu hesaplayıcı ise
// yalnızca tek bir öğrencinin notunu bildiği için Tablo-2'yi BİREBİR uygulayamaz. Bunun yerine, T-Skorunun
// dayandığı normal dağılım varsayımından hareketle öğrencinin yaklaşık bir "yüzdelik dilimi" tahmin edilir
// ve bu tahmini yüzdelik, Tablo-2'nin kümülatif yüzde sınırlarıyla karşılaştırılır. Sonuç KESİN bir sonuç
// değil, İSTATİSTİKSEL BİR TAHMİNDİR; gerçek sonuç dersin öğretim elemanı tarafından tüm sınıf listesine
// göre belirlenir.
const TABLO_2_YUZDELER_ORTALAMAYA_GORE = {
    "0_42.5":    { "FF": 7.0, "FD": 7.0, "DD": 12.8, "DC": 19.2, "CC": 21.6, "CB": 14.4, "BB": 9.0,  "BA": 6.0,  "AA": 3.0  },
    "42.5_47.5": { "FF": 5.0, "FD": 5.0, "DD": 11.6, "DC": 17.4, "CC": 22.2, "CB": 14.8, "BB": 12.0, "BA": 8.0,  "AA": 4.0  },
    "47.5_52.5": { "FF": 3.5, "FD": 3.5, "DD": 9.6,  "DC": 14.4, "CC": 22.8, "CB": 15.2, "BB": 14.4, "BA": 9.6,  "AA": 7.0  },
    "52.5_57.5": { "FF": 2.0, "FD": 2.0, "DD": 8.0,  "DC": 12.0, "CC": 22.2, "CB": 14.8, "BB": 17.4, "BA": 11.6, "AA": 10.0 },
    "57.5_62.5": { "FF": 1.5, "FD": 1.5, "DD": 6.0,  "DC": 9.0,  "CC": 21.6, "CB": 14.4, "BB": 19.2, "BA": 12.8, "AA": 14.0 },
    "62.5_70":   { "FF": 1.0, "FD": 1.0, "DD": 4.8,  "DC": 7.2,  "CC": 19.2, "CB": 12.8, "BB": 21.6, "BA": 14.4, "AA": 18.0 },
    "70_80":     { "FF": 0.5, "FD": 0.5, "DD": 3.2,  "DC": 4.8,  "CC": 17.4, "CB": 11.6, "BB": 22.8, "BA": 15.2, "AA": 24.0 }
};
// Tablo-2 sütun sırası (en düşükten en yükseğe) — kümülatif yüzdelik hesaplamalarında kullanılır.
const TABLO_2_HARF_SIRASI = ["FF", "FD", "DD", "DC", "CC", "CB", "BB", "BA", "AA"];

// Sınıf çan ortalamasına göre ilgili "sınıf düzeyi" aralık anahtarını döndürür (T_SKOR_ARALIKLARI_ORTALAMAYA_GORE
// ile aynı anahtarlar: "0_42.5", "42.5_47.5", ... "70_80"). Ortalama >= 80 ise null döner (o durumda zaten
// Tablo-3/Mutlak Değerlendirme Sistemi kullanılır, Tablo-1/2 anlamsızdır).
function getSinifDuzeyiAnahtari(sinifOrtalamasi) {
    if (sinifOrtalamasi >= 80) return null;
    const siraliAnahtarlar = Object.keys(T_SKOR_ARALIKLARI_ORTALAMAYA_GORE).sort((a, b) => parseFloat(a.split('_')[0]) - parseFloat(b.split('_')[0]));
    for (const key of siraliAnahtarlar) {
        const [minOrtStr, maxOrtStr] = key.split('_');
        const minOrt = parseFloat(minOrtStr);
        const maxOrt = parseFloat(maxOrtStr);
        if (sinifOrtalamasi > minOrt && sinifOrtalamasi <= maxOrt) return key;
    }
    if (sinifOrtalamasi >= 0 && sinifOrtalamasi <= 42.5) return "0_42.5";
    return null;
}

// Standart normal dağılımın kümülatif dağılım fonksiyonu (CDF) — Abramowitz-Stegun sayısal yaklaşımı.
function standartNormalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2); // 1/sqrt(2*pi)
    let olasilik = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (z > 0) olasilik = 1 - olasilik;
    return olasilik;
}

// Standart normal dağılımın ters kümülatif dağılım fonksiyonu (probit) — Acklam sayısal yaklaşımı.
function standartNormalInverseCDF(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pLow = 0.02425, pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
        q = p - 0.5;
        r = q * q;
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
               (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
}

// 29 ve altı öğrencili sınıflar için Tablo-2'ye dayalı YAKLAŞIK harf notu tahmini.
// tSkoru: öğrencinin T-Skoru, sinifOrtalamasi: sınıfın HBN ortalaması.
// Döner: { harfNotu, tahminiYuzdelik } veya null (ortalama tanımlı aralıkların dışındaysa).
function getTablo2TahminiHarfNotu(tSkoru, sinifOrtalamasi) {
    const aralikAnahtari = getSinifDuzeyiAnahtari(sinifOrtalamasi);
    if (!aralikAnahtari || !TABLO_2_YUZDELER_ORTALAMAYA_GORE[aralikAnahtari]) return null;
    const yuzdeler = TABLO_2_YUZDELER_ORTALAMAYA_GORE[aralikAnahtari];
    const z = (tSkoru - 50) / 10;
    const tahminiYuzdelik = standartNormalCDF(z) * 100;
    let kumulatif = 0;
    for (const not of TABLO_2_HARF_SIRASI) {
        kumulatif += yuzdeler[not];
        if (tahminiYuzdelik <= kumulatif || not === "AA") {
            return { harfNotu: not, tahminiYuzdelik: tahminiYuzdelik };
        }
    }
    return { harfNotu: "AA", tahminiYuzdelik: tahminiYuzdelik };
}

// Hedeflenen harf notuna ulaşmak için (Tablo-2 tahmini yöntemiyle) gereken minimum T-Skorunu döndürür.
// Bu, getHedefNotIcinMinTskor() fonksiyonunun Tablo-2 tahmini karşılığıdır ("Gerekli Final Notu" ve
// "Geçme Senaryoları" sekmelerinde, öğrenci sayısı 29 ve altındaysa kullanılır).
function getTablo2TahminiMinTskor(hedefNot, sinifOrtalamasi) {
    const aralikAnahtari = getSinifDuzeyiAnahtari(sinifOrtalamasi);
    if (!aralikAnahtari || !TABLO_2_YUZDELER_ORTALAMAYA_GORE[aralikAnahtari]) return null;
    const yuzdeler = TABLO_2_YUZDELER_ORTALAMAYA_GORE[aralikAnahtari];
    const notIndex = TABLO_2_HARF_SIRASI.indexOf(hedefNot);
    if (notIndex === -1) return null;
    let altSinirYuzde = 0;
    for (let i = 0; i < notIndex; i++) {
        altSinirYuzde += yuzdeler[TABLO_2_HARF_SIRASI[i]];
    }
    if (altSinirYuzde <= 0) return 0;
    if (altSinirYuzde >= 100) return Infinity;
    const z = standartNormalInverseCDF(altSinirYuzde / 100);
    return z * 10 + 50;
}

// --- Hesaplama Sistemi Seçimi (30+ Öğrenci / 1-29 Öğrenci / Mutlak Sistem) ---
// Formun en üstündeki 3'lü seçime göre hangi alanların gösterileceğini belirler.
const SISTEM_ALAN_HARITASI = {
    Harf: { sinifKutuId: 'sinifOrtalamaKutuHarf', mutlakNotuId: 'mutlakBilgiNotuHarf', zorunluAlanIdleri: ['class-avg', 'class-stddev'] },
    Gerekli: { sinifKutuId: 'sinifOrtalamaKutuGerekli', mutlakNotuId: 'mutlakBilgiNotuGerekli', zorunluAlanIdleri: ['req-class-avg', 'req-class-stddev'] },
    Senaryo: { sinifKutuId: null, mutlakNotuId: 'mutlakBilgiNotuSenaryo', zorunluAlanIdleri: [] }
};

function sistemSecimiDegisti(formType) {
    const secili = document.querySelector(`input[name="hesaplamaSistemi${formType}"]:checked`)?.value || 'tablo1';

    // Kart seçili görünümü (CSS :has() desteklemeyen tarayıcılar için fallback)
    document.querySelectorAll(`input[name="hesaplamaSistemi${formType}"]`).forEach(r => {
        const kart = r.closest('.sistem-karti');
        if (kart) kart.classList.toggle('sistem-karti-secili', r.checked);
    });

    // Tahmini öğrenci sayısı kutusu yalnızca "1-29 Öğrenci" seçiliyken görünür
    const ogrKutu = document.getElementById(`ogrenciSayisiKutu${formType}`);
    if (ogrKutu) ogrKutu.style.display = (secili === 'tablo2') ? '' : 'none';

    const harita = SISTEM_ALAN_HARITASI[formType];
    if (!harita) return;
    const mutlakSecili = secili === 'mutlak';

    if (harita.sinifKutuId) {
        const kutu = document.getElementById(harita.sinifKutuId);
        if (kutu) kutu.style.display = mutlakSecili ? 'none' : '';
    }
    if (harita.mutlakNotuId) {
        const not = document.getElementById(harita.mutlakNotuId);
        if (not) not.style.display = mutlakSecili ? '' : 'none';
    }
    harita.zorunluAlanIdleri.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.required = !mutlakSecili;
        if (mutlakSecili) clearFieldError(el);
    });
}

// --- Hesaplama Sistemi Bilgi Modalı ---
const SISTEM_BILGI_METINLERI = {
    tablo1: {
        baslik: "🎓 30 ve Üzeri Öğrenci — T-Skoru Yöntemi",
        icerik: `
            <p>Sınava giren ve değerlendirmeye dâhil edilen öğrenci sayısı <strong>30 veya daha fazla</strong> olan derslerde kullanılır.</p>
            <p>Bu yöntemde önce sınıfın ham başarı notu ortalaması (sınıf çan ortalaması) ve standart sapması hesaplanır. Ardından her öğrencinin notu, sınıf çan ortalamasına göre ne kadar yukarıda ya da aşağıda kaldığını gösteren bir <strong>T-Skoruna</strong> çevrilir:</p>
            <div class="sistem-bilgi-formul">T = ((Notunuz − Sınıf Çan Ortalaması) ÷ Standart Sapma) × 10 + 50</div>
            <p>Bu T-Skoru, sınıfın genel başarı seviyesine göre önceden belirlenmiş sabit aralıklara göre harf notuna dönüştürülür. Sınıf ne kadar kalabalıksa, notların istatistiksel olarak "çan eğrisi"ne (normal dağılıma) uyması o kadar olasıdır; bu yüzden bu yöntem kalabalık sınıflarda güvenilir kabul edilir.</p>
        `
    },
    tablo2: {
        baslik: "👥 1-29 Öğrenci — Yüzdelik Dilim Yöntemi",
        icerik: `
            <p>Sınava giren ve değerlendirmeye dâhil edilen öğrenci sayısı <strong>29 veya daha az</strong> olan derslerde kullanılır.</p>
            <p>Bu yöntemde sınıftaki tüm öğrenciler başarı sırasına göre sıralanır ve harf notları, sınıf düzeyine göre önceden belirlenmiş sabit yüzdelik dilimlere göre paylaştırılır (örneğin en başarılı öğrencilerin belirli bir yüzdesine AA, bir sonraki dilime BA verilmesi gibi). Küçük sınıflarda notların çan eğrisine tam uymayabileceği düşünüldüğünden, T-Skoru yerine doğrudan bu yüzdelik paylaştırma tercih edilir.</p>
            <p class="hesaplama-sonuc-uyari">⚠️ <strong>Önemli:</strong> Bu yöntemin gerçek sonucunu hesaplayabilmek için sınıftaki <strong>tüm öğrencilerin notlarının bilinmesi ve sıralanması</strong> gerekir. Bu hesaplayıcı ise yalnızca sizin notunuzu bildiğinden gerçek sıralamayı bilemez; bunun yerine notunuzun sınıf çan ortalamasına göre konumunu normal dağılım varsayımıyla bir yüzdelik dilime çevirip bu tahmini dilimi tablo sınırlarıyla karşılaştırarak size <strong>istatistiksel bir tahmin</strong> sunar. Gerçek sonucunuz, sınıfın tam not dağılımına bağlı olarak bu tahminden <strong>farklı çıkabilir</strong>.</p>
        `
    },
    mutlak: {
        baslik: "📏 Mutlak Sistem — Doğrudan Puan Değerlendirmesi",
        icerik: `
            <p>Bu sistemde harf notu, sınıftaki diğer öğrencilerin durumuna hiç bakılmaksızın, yalnızca sizin 0-100 arasındaki puanınıza göre önceden belirlenmiş sabit aralıklarla doğrudan belirlenir (örneğin 86 ve üzeri AA, 78-85 arası BA gibi).</p>
            <p>Güncel uygulamada mutlak sistem, göreceli (bağıl) sisteme kıyasla artık daha sınırlı durumlarda kullanılıyor. Başlıca kullanıldığı yerler:</p>
            <ul class="sistem-bilgi-liste">
                <li>Sınıfın ham başarı notu ortalaması belirli bir eşiğin (80 puan) üzerinde çıktığında — sınıf zaten genel olarak çok başarılı sayıldığından ayrıca bağıl bir sıralamaya gerek görülmez.</li>
                <li>Derse yalnızca final/bütünleme notu girilip yarıyıl içi bir değerlendirme yapılmadığında.</li>
                <li>Seminer, bitirme çalışması, staj gibi öğrencinin bireysel olarak değerlendirildiği derslerde.</li>
                <li>Mezuniyet ve ek sınavlarda.</li>
                <li>Harf notunun, ham başarı notunun mutlak karşılığından daha düşük çıkmaması gereken bir alt sınır kontrolü olarak — bu karşılaştırma, bağıl sistemle değerlendirilen derslerde bile arka planda her zaman yapılır.</li>
            </ul>
            <p>Bu yüzden mutlak sistem artık sıradan derslerin çoğunda değil, yukarıdaki özel durumlarda geçerli; derslerin büyük bölümünde göreceli (bağıl) değerlendirme esas alınıyor.</p>
        `
    }
};

// Sayfa yüklenirken bir kez çalışır: her sistem türü için içerik bloğunu (formül kutuları,
// uyarı kutuları, listeler dahil) önceden oluşturup gizli halde DOM'a ekler. Böylece
// sistemBilgiGoster() tıklandığı anda innerHTML ile yeniden inşa etmek zorunda kalmaz —
// sadece hangi bloğun görüneceğini değiştirir, bu da tıklama anındaki kasmayı ortadan kaldırır.
function sistemBilgiIcerikleriOnHazirla() {
    const icerikEl = document.getElementById('sistemBilgiIcerik');
    if (!icerikEl || icerikEl.dataset.hazirlandi) return;
    Object.entries(SISTEM_BILGI_METINLERI).forEach(([tur, bilgi]) => {
        const varyantEl = document.createElement('div');
        varyantEl.className = 'sistem-bilgi-varyant';
        varyantEl.dataset.tur = tur;
        varyantEl.style.display = 'none';
        varyantEl.innerHTML = bilgi.icerik;
        icerikEl.appendChild(varyantEl);
    });
    icerikEl.dataset.hazirlandi = '1';
}

function sistemBilgiGoster(tur) {
    const bilgi = SISTEM_BILGI_METINLERI[tur];
    if (!bilgi) return;
    const modalEl = document.getElementById('sistemBilgiModal');
    const kutuEl = modalEl?.querySelector('.modal-kutu');
    const baslikEl = document.getElementById('sistemBilgiBaslik');
    if (baslikEl) baslikEl.textContent = bilgi.baslik;

    // Normalde bu fonksiyon çağrılana kadar sistemBilgiIcerikleriOnHazirla() zaten sayfa
    // yüklenirken çalışmış olur; yine de (ör. çok erken bir tıklama) güvenlik amacıyla burada
    // da kontrol ediyoruz ki içerik hiçbir zaman eksik kalmasın.
    sistemBilgiIcerikleriOnHazirla();
    document.querySelectorAll('#sistemBilgiIcerik .sistem-bilgi-varyant').forEach(el => {
        el.style.display = (el.dataset.tur === tur) ? '' : 'none';
    });

    document.body.style.overflow = 'hidden';
    if (!modalEl) return;
    if (kutuEl) {
        // Modal görünür olduğu anda (varyant değişimiyle) yerleşim animasyonla aynı ana denk
        // gelmesin diye: önce animasyonu kapatıp göster (yerleşim burada tek seferde biter),
        // sonra animasyonu tekrar açıp zaten yerleşimi bitmiş hafif bir katman üzerinde başlatıyoruz.
        kutuEl.style.animation = 'none';
        modalEl.classList.add('aktif');
        void kutuEl.offsetHeight; // yerleşimi (layout) senkron biçimde zorla tamamlat
        kutuEl.style.animation = '';
    } else {
        modalEl.classList.add('aktif');
    }
}

function sistemBilgiKapat(event) {
    if (event && event.target !== document.getElementById('sistemBilgiModal')) return;
    document.getElementById('sistemBilgiModal')?.classList.remove('aktif');
    document.body.style.overflow = '';
}

// Sonuç kutusunda gösterilen, adım adım "Nasıl Hesaplandı?" açıklama kutusunu oluşturur.
// adimlar: her biri bir hesaplama basamağını anlatan HTML string'lerden oluşan dizi.
// uyariHTML: (opsiyonel) tahmini/istatistiksel sonuç gibi ekstra bir uyarı paragrafı.
function buildHesaplamaMantigiHTML(baslik, adimlar, uyariHTML) {
    let html = `<details class="hesaplama-detaylari-panel">`;
    html += `<summary class="hesaplama-detaylari-baslik">📋 Hesaplama Detayları <span class="hesaplama-detaylari-ipucu">(${baslik.replace(/\?$/, '')})</span></summary>`;
    html += `<div class="hesaplama-mantik-kutu">`;
    html += `<div class="hesaplama-mantik-govde">`;
    adimlar.forEach((adim, i) => {
        html += `<div class="hesaplama-adim"><span class="hesaplama-adim-no">${i + 1}</span><span>${adim}</span></div>`;
    });
    if (uyariHTML) html += uyariHTML;
    html += `</div></div>`;
    html += `</details>`;
    return html;
}

// --- Arayüz Fonksiyonları ---
function openTab(evt, tabName) {
    let i, tabcontent, tabbuttons;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
        tabcontent[i].classList.remove("active");
    }
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].classList.remove("active");
    }
    const currentTab = document.getElementById(tabName);
    if (currentTab) {
        currentTab.style.display = "block";
        currentTab.classList.add("active");
    }
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    }
}

function toggleInputFields(formType) {
    const tekOrtalamaRadioId = `tekOrtalama${formType}`;
    const tekOrtalamaGrupId = `tek-ortalama-grup${formType}`;
    const detayliGirisGrupId = `detayli-giris-grup${formType}`;

    const tekOrtalamaRadio = document.getElementById(tekOrtalamaRadioId);
    const tekOrtalamaGrup = document.getElementById(tekOrtalamaGrupId);
    const detayliGirisGrup = document.getElementById(detayliGirisGrupId);

    if (!tekOrtalamaRadio || !tekOrtalamaGrup || !detayliGirisGrup) {
        console.error(`toggleInputFields: Elementler bulunamadı - Form Tipi: ${formType}`);
        return;
    }

    const tekOrtalamaInput = tekOrtalamaGrup.querySelector('input[type="number"]');
    const detayliInputs = detayliGirisGrup.querySelectorAll('input[type="number"]');

    const formSuffixLower = formType.toLowerCase();
    const vizeNotuInputDetayli = document.getElementById(`vize-notu-${formSuffixLower}`);
    const vizeAgirlikInputDetayli = document.getElementById(`vize-agirlik-${formSuffixLower}`);
    const odevNotuInputDetayli = document.getElementById(`odev-notu-${formSuffixLower}`);
    const odevAgirlikInputDetayli = document.getElementById(`odev-agirlik-${formSuffixLower}`);

    if (tekOrtalamaRadio.checked) {
        tekOrtalamaGrup.classList.add('active');
        detayliGirisGrup.classList.remove('active');
        if (tekOrtalamaInput) tekOrtalamaInput.required = true;
        detayliInputs.forEach(input => {
            input.required = false;
            clearFieldError(input);
        });
    } else {
        tekOrtalamaGrup.classList.remove('active');
        detayliGirisGrup.classList.add('active');
        if (tekOrtalamaInput) {
            tekOrtalamaInput.required = false;
            clearFieldError(tekOrtalamaInput);
        }
        if (vizeNotuInputDetayli) vizeNotuInputDetayli.required = true;
        if (vizeAgirlikInputDetayli) vizeAgirlikInputDetayli.required = true;
        if (odevNotuInputDetayli) odevNotuInputDetayli.required = true;
        if (odevAgirlikInputDetayli) odevAgirlikInputDetayli.required = true;
    }
}

function calculateMidtermContribution(formTypeSuffix, formElement) {
    const methodRadio = formElement.querySelector(`input[name="hesaplamaYontemi${formTypeSuffix}"]:checked`);
    if (!methodRadio) {
        console.error(`Hesaplama yöntemi radio butonu bulunamadı: ${formTypeSuffix}`);
        return NaN;
    }
    const method = methodRadio.value;
    let contribution = 0;
    const formSuffixLower = formTypeSuffix.toLowerCase();

    if (method === 'tek') {
        const avgInputId = formTypeSuffix === 'Harf' ? 'midterm-avg' : (formTypeSuffix === 'Gerekli' ? 'req-midterm-avg' : (formTypeSuffix === 'Matris' ? 'matris-midterm-avg' : 'scenario-midterm-avg'));
        const avgInput = document.getElementById(avgInputId);
        const avgGrade = parseFloat(avgInput.value);
        if (isNaN(avgGrade)) return NaN;
        contribution = avgGrade * 0.50;
    } else {
        const vizeNotu = parseFloat(document.getElementById(`vize-notu-${formSuffixLower}`).value);
        const vizeAgirlik = parseFloat(document.getElementById(`vize-agirlik-${formSuffixLower}`).value);
        const odevNotu = parseFloat(document.getElementById(`odev-notu-${formSuffixLower}`).value);
        const odevAgirlik = parseFloat(document.getElementById(`odev-agirlik-${formSuffixLower}`).value);

        if (isNaN(vizeNotu) || isNaN(vizeAgirlik) || isNaN(odevNotu) || isNaN(odevAgirlik)) return NaN;
        contribution = (vizeNotu * vizeAgirlik / 100) + (odevNotu * odevAgirlik / 100);
    }
    return contribution;
}


// --- Karanlık Mod Yönetimi ---
// Not: Duyurular artık tamamen admin panelinden (Supabase 'duyurular' tablosu) yönetiliyor,
// bkz. dinamikDuyurulariYukle() ve dinamikDuyuruToggle()/dinamikDuyuruKapat() aşağıda.
function dinamikDuyuruKapat(id) {
    const el = document.getElementById('dinamik-duyuru-' + id);
    if (!el) return;
    el.style.transition = 'opacity 0.25s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 260);
    // Kapatılan duyuruyu sessionStorage'a kaydet
    try {
        const kapatilanlar = JSON.parse(sessionStorage.getItem('kapatilanDuyurular') || '[]');
        kapatilanlar.push(id);
        sessionStorage.setItem('kapatilanDuyurular', JSON.stringify(kapatilanlar));
    } catch (e) {
        // Bozuk/eski formatlı bir değer varsa sıfırdan başlat — en azından bu kapatma kaydedilsin.
        sessionStorage.setItem('kapatilanDuyurular', JSON.stringify([id]));
    }
}

function dinamikDuyuruToggle(id) {
    const detay = document.getElementById('dinamik-detay-' + id);
    const tikla = document.getElementById('dinamik-tikla-' + id);
    if (!detay) return;
    const acik = detay.classList.toggle('acik');
    if (tikla) tikla.textContent = acik ? 'Gizle ▲' : 'Detaylar için tıklayın ▼';
}

async function dinamikDuyurulariYukle() {
    try {
        const { data, error } = await getSupabase()
            .from('duyurular')
            .select('*')
            .eq('aktif', true)
            .order('olusturulma_tarihi', { ascending: false });

        if (error || !data || data.length === 0) return;

        const kapatilanlar = JSON.parse(sessionStorage.getItem('kapatilanDuyurular') || '[]');
        const gosterilecekler = data.filter(d => !kapatilanlar.includes(d.id));
        if (gosterilecekler.length === 0) return;

        const wrapper = document.getElementById('dinamik-duyurular-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = gosterilecekler.map(d => `
            <div class="duyuru-wrapper" id="dinamik-duyuru-${d.id}">
                <div class="duyuru-bandi">
                    <div class="duyuru-ozet" onclick="dinamikDuyuruToggle('${d.id}')" role="button" tabindex="0">
                        <span class="duyuru-etiket">📢 Duyuru</span>
                        <span class="duyuru-ozet-metin">
                            <strong>${d.baslik}</strong>
                            <span class="duyuru-tikla" id="dinamik-tikla-${d.id}">Detaylar için tıklayın ▼</span>
                        </span>
                        <button class="duyuru-kapat" onclick="event.stopPropagation(); dinamikDuyuruKapat('${d.id}');" aria-label="Duyuruyu kapat">✕</button>
                    </div>
                    <div class="duyuru-detay" id="dinamik-detay-${d.id}">
                        <div class="duyuru-detay-icerik">${d.icerik}</div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (e) {
        // Sessizce geç
    }
}

// =============================================
// ANKET (admin panelinden aktifleştirilen anketler)
// Not: Aktif anket yokken sitede hiçbir iz bırakmaz — sadece bir anket 'aktif' olarak
// işaretlendiğinde (bkz. admin panelde 'anketler' tablosu) sağ altta bir buton belirir.
// Hem yanıt veren HEM DE butonu (✕ ile) kapatan ama yanıt vermeyen ziyaretçi için anket
// id'si localStorage'a kalıcı olarak kaydedilir — böylece o anketi bir kez kapatan/yanıtlayan
// kişiyi bir sonraki ziyaretinde tekrar rahatsız etmez. (Farklı, yeni bir anket açıldığında
// farklı bir id taşıdığı için yine gösterilir.)
// =============================================
let anketAktifVeri = null; // { id, baslik, aciklama, sorular: [...] }

function anketYanitVerilenler() {
    try { return JSON.parse(localStorage.getItem('anketYanitVerilenler') || '[]'); } catch (e) { return []; }
}
function anketYanitVerildiIsaretle(anketId) {
    const liste = anketYanitVerilenler();
    if (!liste.includes(anketId)) { liste.push(anketId); localStorage.setItem('anketYanitVerilenler', JSON.stringify(liste)); }
}
function anketBuOturumdaKapatildiMi(anketId) {
    try { return JSON.parse(localStorage.getItem('anketKapatilanlar') || '[]').includes(anketId); } catch (e) { return false; }
}
function anketKapatildiIsaretle(anketId) {
    try {
        const liste = JSON.parse(localStorage.getItem('anketKapatilanlar') || '[]');
        if (!liste.includes(anketId)) { liste.push(anketId); localStorage.setItem('anketKapatilanlar', JSON.stringify(liste)); }
    } catch (e) { /* localStorage kullanılamıyorsa sessizce geç */ }
}

// Basit HTML/attribute kaçışı — script.js'te genel amaçlı bir escHtml zaten yok, bu yüzden
// anket alanında karışıklık olmasın diye kendi adıyla tanımlandı.
function anketEscHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
}
function anketEscAttr(str) { return anketEscHtml(str).replace(/"/g, '&quot;'); }

async function anketAktifOlanYukle() {
    try {
        const { data: anket, error } = await getSupabase()
            .from('anketler')
            .select('id, baslik, aciklama, anket_sorulari(id, soru_metni, soru_tipi, secenekler, zorunlu, sira)')
            .eq('aktif', true)
            .maybeSingle();

        if (error || !anket) return;
        if (anketYanitVerilenler().includes(anket.id)) return;
        if (anketBuOturumdaKapatildiMi(anket.id)) return;

        const sorular = (anket.anket_sorulari || []).slice().sort((a, b) => (a.sira || 0) - (b.sira || 0));
        if (sorular.length === 0) return;

        anketAktifVeri = { id: anket.id, baslik: anket.baslik, aciklama: anket.aciklama, sorular };
        anketPillGoster();
    } catch (e) {
        // Sessizce geç — anket sistemi opsiyonel, hata sayfanın geri kalanını etkilemesin.
    }
}

function anketPillGoster() {
    const wrapper = document.getElementById('anket-pill-wrapper');
    if (!wrapper || !anketAktifVeri) return;
    wrapper.innerHTML = `
        <div class="anket-pill-wrapper">
            <button class="anket-pill-btn" onclick="anketModalAc()">
                📊 <span class="anket-pill-metin">${anketEscHtml(anketAktifVeri.baslik)}</span>
            </button>
            <button class="anket-pill-kapat" onclick="anketPillKapat()" aria-label="Anketi kapat">✕</button>
        </div>`;
}

function anketPillKapat() {
    if (anketAktifVeri) anketKapatildiIsaretle(anketAktifVeri.id);
    const wrapper = document.getElementById('anket-pill-wrapper');
    if (wrapper) wrapper.innerHTML = '';
}

function anketModalIcerikOlustur() {
    if (!anketAktifVeri) return '';
    const aciklamaHtml = anketAktifVeri.aciklama
        ? `<p style="color:var(--small-text);font-size:0.9em;margin-bottom:1.2rem;">${anketEscHtml(anketAktifVeri.aciklama)}</p>`
        : '';
    const sorularHtml = anketAktifVeri.sorular.map(s => {
        const zorunluIsaret = s.zorunlu ? '<span class="anket-zorunlu-yildiz">*</span>' : '';
        let girdiHtml;
        if (s.soru_tipi === 'yorum') {
            girdiHtml = `<textarea class="anket-yorum-textarea" placeholder="Görüşünüzü yazabilirsiniz..."></textarea>`;
        } else {
            const secenekler = Array.isArray(s.secenekler) ? s.secenekler : [];
            girdiHtml = `<div class="anket-secenekler">${secenekler.map(sec => `
                <label class="anket-secenek-label">
                    <input type="radio" name="anket-soru-${s.id}" value="${anketEscAttr(sec)}" onchange="anketSecenekSecildi(this)">
                    <span>${anketEscHtml(sec)}</span>
                </label>`).join('')}</div>`;
        }
        return `
            <div class="anket-soru-blok" data-soru-id="${s.id}">
                <div class="anket-soru-baslik">${anketEscHtml(s.soru_metni)}${zorunluIsaret}</div>
                ${girdiHtml}
                <div class="anket-hata-metni">Bu alanın doldurulması zorunlu.</div>
            </div>`;
    }).join('');
    return `
        ${aciklamaHtml}
        <div id="anket-form-alani">
            ${sorularHtml}
            <div class="anket-genel-hata" id="anket-genel-hata">Lütfen zorunlu alanları doldurun.</div>
            <button type="button" class="anket-gonder-btn" id="anket-gonder-btn" onclick="anketGonder()">Gönder</button>
        </div>`;
}

function anketModalAc() {
    if (!anketAktifVeri) return;
    document.getElementById('anket-modal-baslik').textContent = '📊 ' + anketAktifVeri.baslik;
    document.getElementById('anket-modal-icerik').innerHTML = anketModalIcerikOlustur();

    const modal = document.getElementById('anketModal');
    const kutu = modal.querySelector('.modal-kutu');
    document.body.style.overflow = 'hidden';
    if (kutu) {
        kutu.style.animation = 'none';
        modal.classList.add('aktif');
        void kutu.offsetHeight;
        kutu.style.animation = '';
    } else {
        modal.classList.add('aktif');
    }
}

// :has() seçicisini desteklemeyen eski tarayıcılar (Safari <15.4, Firefox <103 vb.) için — CSS'teki
// .anket-secenek-label:has(input:checked) kuralının JS ile uygulanan bir yedeği. Böyle bir tarayıcıda
// bu olmasaydı, kullanıcı bir seçeneği işaretlediğinde seçili olduğuna dair hiçbir görsel ipucu olmazdı.
function anketSecenekSecildi(input) {
    const grup = input.closest('.anket-secenekler');
    if (grup) grup.querySelectorAll('.anket-secenek-label').forEach(l => l.classList.remove('anket-secenek-secili'));
    const label = input.closest('.anket-secenek-label');
    if (label) label.classList.add('anket-secenek-secili');
}

function anketModalKapat(event) {
    if (event && event.target !== document.getElementById('anketModal')) return;
    document.getElementById('anketModal').classList.remove('aktif');
    document.body.style.overflow = '';
}

async function anketGonder() {
    if (!anketAktifVeri) return;
    const genelHata = document.getElementById('anket-genel-hata');
    genelHata.classList.remove('gorunur');

    let gecerliMi = true;
    const yanitlar = [];

    anketAktifVeri.sorular.forEach(s => {
        const blok = document.querySelector(`.anket-soru-blok[data-soru-id="${s.id}"]`);
        const hataEl = blok ? blok.querySelector('.anket-hata-metni') : null;
        let cevap = null;

        if (s.soru_tipi === 'yorum') {
            const textarea = blok ? blok.querySelector('.anket-yorum-textarea') : null;
            cevap = textarea ? textarea.value.trim() : '';
        } else {
            const secili = blok ? blok.querySelector(`input[name="anket-soru-${s.id}"]:checked`) : null;
            cevap = secili ? secili.value : null;
        }

        const bosMu = cevap === null || cevap === '';
        if (s.zorunlu && bosMu) {
            gecerliMi = false;
            if (hataEl) hataEl.classList.add('gorunur');
        } else if (hataEl) {
            hataEl.classList.remove('gorunur');
        }

        if (!bosMu) yanitlar.push({ soru_id: s.id, soru_metni: s.soru_metni, soru_tipi: s.soru_tipi, cevap });
    });

    if (!gecerliMi) { genelHata.classList.add('gorunur'); return; }

    const btn = document.getElementById('anket-gonder-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Gönderiliyor...'; }

    try {
        const { error } = await getSupabase().from('anket_yanitlari').insert({ anket_id: anketAktifVeri.id, yanitlar });
        if (error) throw error;

        anketYanitVerildiIsaretle(anketAktifVeri.id);
        document.getElementById('anket-modal-icerik').innerHTML = `
            <div class="anket-tesekkur">
                <div class="anket-tesekkur-emoji">🎉</div>
                <div style="font-weight:700;font-size:1.05em;margin-bottom:6px;">Teşekkürler!</div>
                <p>Anketimize katıldığınız için teşekkür ederiz.</p>
            </div>`;
        const wrapper = document.getElementById('anket-pill-wrapper');
        if (wrapper) wrapper.innerHTML = '';
        setTimeout(() => anketModalKapat(null), 1600);
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = 'Gönder'; }
        genelHata.textContent = 'Gönderilirken bir hata oluştu, lütfen tekrar deneyin.';
        genelHata.classList.add('gorunur');
    }
}

function initTheme() {
    const saved = localStorage.getItem('ktu-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        const label = btn.querySelector('.toggle-label');
        if (label) label.textContent = theme === 'dark' ? 'Aydınlık' : 'Karanlık';
    }
    localStorage.setItem('ktu-theme', theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

initTheme();

// --- DOM Yüklendiğinde Çalışacak Kodlar ---
document.addEventListener('DOMContentLoaded', () => {

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    dinamikDuyurulariYukle();
    anketAktifOlanYukle();

    const harfNotuFormu = document.getElementById('grade-calculator-form');
    const gerekliNotFormu = document.getElementById('required-grade-form');
    const senaryoFormu = document.getElementById('scenario-form');
    const harfNotuSonucAlani = document.getElementById('grade-result');
    const gerekliNotSonucAlani = document.getElementById('required-result');
    const senaryoTabloAlani = document.getElementById('scenario-table-output');

    // Hesaplama sistemi seçim kartlarının başlangıç görünümünü ayarla (varsayılan: 30+ Öğrenci)
    ['Harf', 'Gerekli', 'Senaryo'].forEach(sistemSecimiDegisti);

    // --- Harf Notu Formu İşlemleri ---
    if (harfNotuFormu) {
        const midtermAvgInput = document.getElementById('midterm-avg');
        const vizeNotuHarfInput = document.getElementById('vize-notu-harf');
        const vizeAgirlikHarfInput = document.getElementById('vize-agirlik-harf');
        const odevNotuHarfInput = document.getElementById('odev-notu-harf');
        const odevAgirlikHarfInput = document.getElementById('odev-agirlik-harf');
        const finalGradeInput = document.getElementById('final-grade');
        const classAvgInput = document.getElementById('class-avg');
        const classStdDevInput = document.getElementById('class-stddev');

        const inputsToValidateHarf = [
            { el: midtermAvgInput, name: 'Ara Sınav Ortalaması', min: 0, max: 100, isTekOrtalamaOnly: true },
            { el: vizeNotuHarfInput, name: 'Vize Notu', min: 0, max: 100, isDetayliOnly: true },
            { el: vizeAgirlikHarfInput, name: 'Vize Ağırlığı', min: 0, max: 50, isDetayliOnly: true, isWeight: true },
            { el: odevNotuHarfInput, name: 'Ödev/Proje Notu', min: 0, max: 100, isDetayliOnly: true },
            { el: odevAgirlikHarfInput, name: 'Ödev/Proje Ağırlığı', min: 0, max: 50, isDetayliOnly: true, isWeight: true },
            { el: finalGradeInput, name: 'Final Notu', min: 0, max: 100 },
            { el: classAvgInput, name: 'Sınıf Çan Ortalaması', min: 0, max: 100 },
            { el: classStdDevInput, name: 'Standart Sapma', min: 0.0001, max: null }
        ];

        inputsToValidateHarf.forEach(item => {
            if (item.el) {
                item.el.addEventListener('blur', () => {
                    const secilenYontem = harfNotuFormu.querySelector('input[name="hesaplamaYontemiHarf"]:checked').value;
                    const isTekOrtalamaActive = secilenYontem === 'tek';

                    if ((item.isTekOrtalamaOnly && !isTekOrtalamaActive) || (item.isDetayliOnly && isTekOrtalamaActive)) {
                        clearFieldError(item.el); return;
                    }

                    let isValid = validateNumberField(item.el, item.name, item.min, item.max);

                    if (isValid && item.isWeight && !isTekOrtalamaActive) {
                        validateDetailedWeights(vizeAgirlikHarfInput, odevAgirlikHarfInput, 'Harf');
                    }
                    if (item.el === classStdDevInput && parseFloat(classAvgInput.value) < 80 && parseFloat(item.el.value) === 0) {
                        showFieldError(item.el, "Sınıf çan ortalaması 80'den düşükse standart sapma 0 olamaz.");
                    } else if (item.el === classStdDevInput && parseFloat(item.el.value) !== 0) {
                        const errorSpan = item.el.closest('.form-group').querySelector('span.error-feedback');
                        if (errorSpan && errorSpan.textContent.includes("0 olamaz")) {
                           clearFieldError(item.el);
                        }
                    }
                });
            }
        });

        harfNotuFormu.addEventListener('submit', (event) => {
            event.preventDefault();
            harfNotuSonucAlani.innerHTML = "<p>Hesaplanıyor...</p>";
            let formGecerli = true;
            const secilenYontem = harfNotuFormu.querySelector('input[name="hesaplamaYontemiHarf"]:checked').value;

            if (secilenYontem === 'tek') {
                if (!validateNumberField(midtermAvgInput, 'Ara Sınav Ortalaması', 0, 100)) formGecerli = false;
            } else {
                if (!validateNumberField(vizeNotuHarfInput, 'Vize Notu', 0, 100)) formGecerli = false;
                if (!validateNumberField(vizeAgirlikHarfInput, 'Vize Ağırlığı', 0, 50)) formGecerli = false;
                if (!validateNumberField(odevNotuHarfInput, 'Ödev/Proje Notu', 0, 100)) formGecerli = false;
                if (!validateNumberField(odevAgirlikHarfInput, 'Ödev/Proje Ağırlığı', 0, 50)) formGecerli = false;
                if (formGecerli) {
                    if (!validateDetailedWeights(vizeAgirlikHarfInput, odevAgirlikHarfInput, 'Harf')) formGecerli = false;
                }
            }
            if (!validateNumberField(finalGradeInput, 'Final Notu', 0, 100)) formGecerli = false;
            if (!validateNumberField(classAvgInput, 'Sınıf Çan Ortalaması', 0, 100)) formGecerli = false;

            const sinifOrtalamasiVal = parseFloat(classAvgInput.value);
            const minStdDev = (formGecerli && !isNaN(sinifOrtalamasiVal) && sinifOrtalamasiVal < 80) ? 0.0001 : 0;
            if (!validateNumberField(classStdDevInput, 'Standart Sapma', minStdDev, null)) formGecerli = false;

            if (formGecerli && sinifOrtalamasiVal < 80 && parseFloat(classStdDevInput.value) === 0) {
                 showFieldError(classStdDevInput, "Sınıf çan ortalaması 80'den düşükse standart sapma 0 olamaz.");
                 formGecerli = false;
            }


            if (!formGecerli) {
                harfNotuSonucAlani.innerHTML = `<p class="error-message">Lütfen formdaki işaretli hataları düzeltin.</p>`;
                const firstInvalidInput = harfNotuFormu.querySelector('input.invalid-input, select.invalid-input');
                if (firstInvalidInput) firstInvalidInput.focus();
                return;
            }

            const araSinavHBNKatkisi = calculateMidtermContribution('Harf', harfNotuFormu);
            const finalNotu = parseFloat(finalGradeInput.value);
            // Madde 4(3): "Bağıl değerlendirme sisteminde hesaplama sonucu ortaya çıkan ham başarı
            // notunun virgülden iki basamak sonrasına ... yuvarlanır." — HBN, sonraki tüm hesaplamalarda
            // (T-Skoru formülü, 30 altı kontrolü, mutlak tablo karşılaştırması) kullanılmadan önce burada
            // 2 ondalık basamağa yuvarlanıyor. Bu, T-Skoru yuvarlaması (aşağıda Math.round(tSkoruHam)) ve
            // mutlak sistemin tam sayıya yuvarlaması (getMutlakDegerlendirmeNotu) gibi var olan yuvarlama
            // adımlarının YERİNE geçmiyor, onlara EK bir adım.
            const hamBasariNotu = parseFloat((araSinavHBNKatkisi + (finalNotu * 0.50)).toFixed(2));
            const minimumFinalNotu = getMinimumFinalNotu('Harf', harfNotuFormu);
            const sistemSeciliHarf = harfNotuFormu.querySelector('input[name="hesaplamaSistemiHarf"]:checked')?.value || 'tablo1';
            const ogrenciSayisiInputHarf = document.getElementById('ogrenci-sayisi-harf');
            const ogrenciSayisiHarfVal = (sistemSeciliHarf === 'tablo2' && ogrenciSayisiInputHarf && ogrenciSayisiInputHarf.value.trim() !== '') ? parseInt(ogrenciSayisiInputHarf.value, 10) : null;

            let harfNotu = null;
            let mantikAdimlari = [];
            let uyariHTML = "";
            const sinifStandartSapmaVal = parseFloat(classStdDevInput.value);

            if (finalNotu < minimumFinalNotu) {
                harfNotu = "FF";
                mantikAdimlari.push(`Final notunuz (<strong>${finalNotu.toFixed(2)}</strong>), bu ders için gereken minimum final notunun (<strong>${minimumFinalNotu}</strong>) altında kaldı. Yarıyıl içi notlarınız ne olursa olsun bu durumda doğrudan <strong>FF</strong> alırsınız.`);
            } else if (sistemSeciliHarf === 'mutlak') {
                const mutlakNotKarsiligi = getMutlakDegerlendirmeNotu(hamBasariNotu);
                harfNotu = mutlakNotKarsiligi;
                mantikAdimlari.push(`Final notunuz (${finalNotu.toFixed(2)}) gereken minimum sınırı (${minimumFinalNotu}) geçtiği için hesaplamaya devam edildi.`);
                mantikAdimlari.push(`Ham Başarı Notunuz = Yarıyıl içi katkısı (${araSinavHBNKatkisi.toFixed(2)}) + Final katkısı (${(finalNotu * 0.50).toFixed(2)}) = <strong>${hamBasariNotu.toFixed(2)}</strong>.`);
                mantikAdimlari.push(`Mutlak Sistem seçildiği için bu puan, sınıftaki diğer öğrencilere bakılmaksızın doğrudan sabit puan aralıklarıyla karşılaştırıldı ve harf notunuz <strong>${harfNotu}</strong> olarak belirlendi.`);
            } else if (hamBasariNotu < 30) {
                harfNotu = "FF";
                mantikAdimlari.push(`Ham Başarı Notunuz (<strong>${hamBasariNotu.toFixed(2)}</strong>) 30'un altında kaldığı için, seçtiğiniz sisteme bakılmaksızın doğrudan <strong>FF</strong> alırsınız.`);
            } else {
                const mutlakNotKarsiligi = getMutlakDegerlendirmeNotu(hamBasariNotu);
                mantikAdimlari.push(`Final notunuz (${finalNotu.toFixed(2)}) gereken minimum sınırı (${minimumFinalNotu}) geçtiği için hesaplamaya devam edildi.`);
                mantikAdimlari.push(`Ham Başarı Notunuz = Yarıyıl içi katkısı (${araSinavHBNKatkisi.toFixed(2)}) + Final katkısı (${(finalNotu * 0.50).toFixed(2)}) = <strong>${hamBasariNotu.toFixed(2)}</strong>.`);

                if (sinifOrtalamasiVal >= 80) {
                    harfNotu = mutlakNotKarsiligi;
                    mantikAdimlari.push(`Girdiğiniz sınıf çan ortalaması (${sinifOrtalamasiVal.toFixed(2)}) 80 veya üzerinde olduğu için, seçtiğiniz sistemden bağımsız olarak bu ders otomatik biçimde Mutlak Sisteme göre değerlendirildi ve harf notunuz <strong>${harfNotu}</strong> oldu.`);
                    uyariHTML = `<p class="hesaplama-sonuc-uyari">ℹ️ Sınıf çan ortalaması yüksek olan derslerde mutlak sistem otomatik olarak devreye girer; bu yüzden üstte seçtiğiniz sistem bu hesaplamada dikkate alınmadı.</p>`;
                } else {
                    const tSkoruHam = ((hamBasariNotu - sinifOrtalamasiVal) / sinifStandartSapmaVal) * 10 + 50;
                    const tSkoru = Math.round(tSkoruHam);
                    mantikAdimlari.push(`Notunuz, sınıf çan ortalaması (${sinifOrtalamasiVal.toFixed(2)}) ve standart sapmaya (${sinifStandartSapmaVal.toFixed(2)}) göre bir T-Skoruna çevrildi: <strong>${tSkoruHam.toFixed(2)}</strong> (yuvarlanmış: <strong>${tSkoru}</strong>).`);

                    let bagilNot = null;
                    if (sistemSeciliHarf === 'tablo2') {
                        const tablo2Bilgi = getTablo2TahminiHarfNotu(tSkoru, sinifOrtalamasiVal);
                        bagilNot = tablo2Bilgi ? tablo2Bilgi.harfNotu : null;
                        if (tablo2Bilgi) {
                            mantikAdimlari.push(`1-29 Öğrenci sistemi seçildiği için bu T-Skoru, normal dağılım varsayımıyla yaklaşık bir yüzdelik dilime (<strong>%${tablo2Bilgi.tahminiYuzdelik.toFixed(1)}</strong>) çevrildi ve bu tahmini dilim, yüzdelik dilim tablosunun sınırlarıyla karşılaştırılarak tahmini bağıl notunuz <strong>${bagilNot}</strong> olarak bulundu.`);
                            uyariHTML = `<p class="hesaplama-sonuc-uyari">⚠️ <strong>Bu sonuç bir tahmindir.</strong> 1-29 öğrencili derslerde harf notu, sınıftaki tüm öğrencilerin notlarının sıralanmasıyla belirlenir. Bu hesaplayıcı yalnızca sizin notunuzu bildiği için sınıfın tam sıralamasını bilemez ve size istatistiksel bir tahmin sunar${ogrenciSayisiHarfVal ? ` (girdiğiniz tahmini öğrenci sayısı: ${ogrenciSayisiHarfVal})` : ''}. Gerçek sonucunuz bu tahminden <strong>farklı çıkabilir</strong>; kesin sonuç için dersin öğretim elemanına danışın.</p>`;
                        } else {
                            mantikAdimlari.push(`1-29 Öğrenci sistemi için tahmini bir bağıl not bulunamadı; bu durumda Mutlak Değerlendirme sonucunuz (${mutlakNotKarsiligi}) esas alındı.`);
                        }
                    } else {
                        bagilNot = getBagilDegerlendirmeNotuTskor(tSkoru, sinifOrtalamasiVal);
                        if (bagilNot !== null) {
                            mantikAdimlari.push(`30+ Öğrenci sistemi seçildiği için bu T-Skoru, sabit T-Skoru aralıklarıyla karşılaştırılarak bağıl notunuz <strong>${bagilNot}</strong> olarak belirlendi.`);
                        } else {
                            mantikAdimlari.push(`T-Skorunuz için tanımlı bir bağıl not aralığı bulunamadı; bu durumda Mutlak Değerlendirme sonucunuz (${mutlakNotKarsiligi}) esas alındı.`);
                        }
                    }

                    if (bagilNot === null) {
                        harfNotu = mutlakNotKarsiligi;
                    } else {
                        harfNotu = karsilastirHarfNotlari(bagilNot, mutlakNotKarsiligi);
                        mantikAdimlari.push(`Notunuzun mutlak sistemdeki karşılığı da hesaplandı: <strong>${mutlakNotKarsiligi}</strong>. Kurallar gereği harf notunuz, bağıl (${bagilNot}) ve mutlak (${mutlakNotKarsiligi}) sonuçlardan yüksek olanına eşitlenir.`);
                        if (harfNotu === mutlakNotKarsiligi && harfNotu !== bagilNot) {
                            mantikAdimlari.push(`Mutlak değerlendirme sonucunuz (${mutlakNotKarsiligi}), bağıl sonucunuzdan (${bagilNot}) daha yüksek çıktığı için esas alındı.`);
                        } else if (harfNotu === bagilNot && harfNotu !== mutlakNotKarsiligi) {
                            mantikAdimlari.push(`Bağıl değerlendirme sonucunuz (${bagilNot}), mutlak sonucunuzdan (${mutlakNotKarsiligi}) daha yüksek çıktığı için esas alındı.`);
                        } else {
                            mantikAdimlari.push(`Bağıl ve mutlak değerlendirme sonuçlarınız aynı (${harfNotu}) çıktı.`);
                        }
                    }
                }
            }
            mantikAdimlari.push(`Sonuç: Harf notunuz <strong>${harfNotu}</strong>.`);

            let sonucMesaji = "";
            sonucMesaji += `Hesaplanan Ham Başarı Notu: <strong>${hamBasariNotu.toFixed(2)}</strong><br>`;
            let harfNotuBadgeHTML = harfNotu ? `<span class="grade-display-badge grade-display-${harfNotu.toLowerCase()}">${harfNotu}</span>` : "Hesaplanamadı";
            sonucMesaji += `Harf Notu: <strong style="font-size: 1.1em; vertical-align: middle;">${harfNotuBadgeHTML}</strong>`;
            sonucMesaji += buildHesaplamaMantigiHTML('Nasıl Hesaplandı?', mantikAdimlari, uyariHTML);

            if (harfNotu === "DC") {
                sonucMesaji += "<br><strong>Not:</strong> DC ile geçme durumu dönemlik ağırlıklı genel not ortalamanızın 2.00 ve üzeri olmasına bağlıdır.";
            } else if (["DD", "FD", "FF"].includes(harfNotu)) {
                sonucMesaji += `<br><strong>Not:</strong> ${harfNotu} notu başarısız anlamına gelir.`;
            }
            harfNotuSonucAlani.innerHTML = sonucMesaji;
            dersiLinkGoster('ders-link-harf');
            const vizeLogHarf = secilenYontem === 'tek'
                ? parseFloat(document.getElementById('midterm-avg').value)
                : parseFloat(document.getElementById('vize-notu-harf').value);
            const sinifOrtLog = parseFloat(classAvgInput.value);
            const stdSapmaLog = parseFloat(classStdDevInput.value);
            hesaplamaLogKaydet('harf', harfNotu, isNaN(vizeLogHarf) ? null : vizeLogHarf, isNaN(finalNotu) ? null : finalNotu, {
                sinif_ortalamasi: isNaN(sinifOrtLog) ? undefined : sinifOrtLog,
                std_sapma: isNaN(stdSapmaLog) ? undefined : stdSapmaLog,
                sistem_secimi: sistemSeciliHarf,
                fakulte_turu: harfNotuFormu.querySelector('input[name="fakulteHarf"]:checked')?.value || 'genel'
            });
            sonucIndirButonuGoster('harf');
        });
    }

    // --- Gerekli Final Notu Formu İşlemleri ---
    if (gerekliNotFormu) {
        const reqMidtermAvgInput = document.getElementById('req-midterm-avg');
        const vizeNotuGerekliInput = document.getElementById('vize-notu-gerekli');
        const vizeAgirlikGerekliInput = document.getElementById('vize-agirlik-gerekli');
        const odevNotuGerekliInput = document.getElementById('odev-notu-gerekli');
        const odevAgirlikGerekliInput = document.getElementById('odev-agirlik-gerekli');
        const targetGradeSelect = document.getElementById('target-grade');
        const reqClassAvgInput = document.getElementById('req-class-avg');
        const reqClassStdDevInput = document.getElementById('req-class-stddev');

        const inputsToValidateGerekli = [
            { el: reqMidtermAvgInput, name: 'Ara Sınav Ortalaması', min: 0, max: 100, isTekOrtalamaOnly: true },
            { el: vizeNotuGerekliInput, name: 'Vize Notu', min: 0, max: 100, isDetayliOnly: true },
            { el: vizeAgirlikGerekliInput, name: 'Vize Ağırlığı', min: 0, max: 50, isDetayliOnly: true, isWeight: true },
            { el: odevNotuGerekliInput, name: 'Ödev/Proje Notu', min: 0, max: 100, isDetayliOnly: true },
            { el: odevAgirlikGerekliInput, name: 'Ödev/Proje Ağırlığı', min: 0, max: 50, isDetayliOnly: true, isWeight: true },
            { el: targetGradeSelect, name: 'Hedeflenen Harf Notu', isSelect: true },
            { el: reqClassAvgInput, name: 'Sınıf Çan Ortalaması', min: 0, max: 100 },
            { el: reqClassStdDevInput, name: 'Standart Sapma', min: 0.0001, max: null }
        ];

        inputsToValidateGerekli.forEach(item => {
            if (item.el) {
                item.el.addEventListener('blur', () => {
                    const secilenYontem = gerekliNotFormu.querySelector('input[name="hesaplamaYontemiGerekli"]:checked').value;
                    const isTekOrtalamaActive = secilenYontem === 'tek';

                    if ((item.isTekOrtalamaOnly && !isTekOrtalamaActive) || (item.isDetayliOnly && isTekOrtalamaActive)) {
                        clearFieldError(item.el); return;
                    }
                    let isValid;
                    if(item.isSelect){
                        isValid = validateRequiredField(item.el, item.name);
                    } else {
                        isValid = validateNumberField(item.el, item.name, item.min, item.max);
                    }

                    if (isValid && item.isWeight && !isTekOrtalamaActive) {
                        validateDetailedWeights(vizeAgirlikGerekliInput, odevAgirlikGerekliInput, 'Gerekli');
                    }
                     if (item.el === reqClassStdDevInput && parseFloat(reqClassAvgInput.value) < 80 && parseFloat(item.el.value) === 0) {
                        showFieldError(item.el, "Sınıf çan ortalaması 80'den düşükse standart sapma 0 olamaz.");
                    } else if (item.el === reqClassStdDevInput && parseFloat(item.el.value) !== 0) {
                        const errorSpan = item.el.closest('.form-group').querySelector('span.error-feedback');
                        if (errorSpan && errorSpan.textContent.includes("0 olamaz")) {
                           clearFieldError(item.el);
                        }
                    }
                });
            }
        });

        gerekliNotFormu.addEventListener('submit', (event) => {
            event.preventDefault();
            gerekliNotSonucAlani.innerHTML = "<p>Hesaplanıyor...</p>";
            let formGecerli = true;
            const secilenYontem = gerekliNotFormu.querySelector('input[name="hesaplamaYontemiGerekli"]:checked').value;

            if (secilenYontem === 'tek') {
                if (!validateNumberField(reqMidtermAvgInput, 'Ara Sınav Ortalaması', 0, 100)) formGecerli = false;
            } else {
                if (!validateNumberField(vizeNotuGerekliInput, 'Vize Notu', 0, 100)) formGecerli = false;
                if (!validateNumberField(vizeAgirlikGerekliInput, 'Vize Ağırlığı', 0, 50)) formGecerli = false;
                if (!validateNumberField(odevNotuGerekliInput, 'Ödev/Proje Notu', 0, 100)) formGecerli = false;
                if (!validateNumberField(odevAgirlikGerekliInput, 'Ödev/Proje Ağırlığı', 0, 50)) formGecerli = false;
                if (formGecerli) {
                    if (!validateDetailedWeights(vizeAgirlikGerekliInput, odevAgirlikGerekliInput, 'Gerekli')) formGecerli = false;
                }
            }
            if (!validateRequiredField(targetGradeSelect, 'Hedeflenen Harf Notu')) formGecerli = false;
            if (!validateNumberField(reqClassAvgInput, 'Sınıf Çan Ortalaması', 0, 100)) formGecerli = false;

            const sinifOrtalamasiVal = parseFloat(reqClassAvgInput.value);
            const minStdDevGerekli = (formGecerli && !isNaN(sinifOrtalamasiVal) && sinifOrtalamasiVal < 80) ? 0.0001 : 0;
            if (!validateNumberField(reqClassStdDevInput, 'Standart Sapma', minStdDevGerekli, null)) formGecerli = false;

            if (formGecerli && sinifOrtalamasiVal < 80 && parseFloat(reqClassStdDevInput.value) === 0) {
                 showFieldError(reqClassStdDevInput, "Sınıf çan ortalaması 80'den düşükse standart sapma 0 olamaz.");
                 formGecerli = false;
            }


            if (!formGecerli) {
                gerekliNotSonucAlani.innerHTML = `<p class="error-message">Lütfen formdaki işaretli hataları düzeltin.</p>`;
                const firstInvalidInput = gerekliNotFormu.querySelector('input.invalid-input, select.invalid-input');
                if (firstInvalidInput) firstInvalidInput.focus();
                return;
            }

            const araSinavHBNKatkisi = calculateMidtermContribution('Gerekli', gerekliNotFormu);
            const hedefHarfNotu = targetGradeSelect.value;
            const sinifStandartSapmaVal = parseFloat(reqClassStdDevInput.value);
            const minimumFinalNotu = getMinimumFinalNotu('Gerekli', gerekliNotFormu);
            const sistemSeciliGerekli = gerekliNotFormu.querySelector('input[name="hesaplamaSistemiGerekli"]:checked')?.value || 'tablo1';
            const ogrenciSayisiInputGerekli = document.getElementById('ogrenci-sayisi-gerekli');
            const ogrenciSayisiGerekliVal = (sistemSeciliGerekli === 'tablo2' && ogrenciSayisiInputGerekli && ogrenciSayisiInputGerekli.value.trim() !== '') ? parseInt(ogrenciSayisiInputGerekli.value, 10) : null;

            let sonucMetni = "";
            let mantikAdimlariReq = [];
            let uyariHTMLReq = "";
            let sistemTuru = "";

            function gerekliFinalSonucMetniOlustur(hedefHamBasariNotu, adimOnEk) {
                let gerekenFinalNotu = (hedefHamBasariNotu - araSinavHBNKatkisi) / 0.50;
                gerekenFinalNotu = Math.max(0, gerekenFinalNotu);
                const gerekenFinalNotuYuvarla = Math.ceil(gerekenFinalNotu * 100) / 100;
                mantikAdimlariReq.push(`${adimOnEk} hedeflenen Ham Başarı Notuna (<strong>${hedefHamBasariNotu.toFixed(2)}</strong>) ulaşmak için, yarıyıl içi katkınız (${araSinavHBNKatkisi.toFixed(2)}) çıkarılıp final ağırlığına (%50) bölünerek gereken final notu hesaplandı.`);
                if (gerekenFinalNotuYuvarla > 100) {
                    mantikAdimlariReq.push(`Hesaplanan final notu (${gerekenFinalNotuYuvarla.toFixed(2)}) <strong>100'den yüksek</strong> çıktı; bu hedefe bu yarıyıl içi notlarla ulaşmak mümkün değil.`);
                    sonucMetni = "İmkansız (>100)";
                } else if (gerekenFinalNotuYuvarla < minimumFinalNotu) {
                    mantikAdimlariReq.push(`Hesaplanan final notu (${gerekenFinalNotuYuvarla.toFixed(2)}), bu ders için gereken minimum final sınırının (${minimumFinalNotu}) altında çıktı. Final sınırı yarıyıl içi notlarınıza bakılmaksızın geçerli olduğundan finalden <strong>en az ${minimumFinalNotu}</strong> almanız gerekir.`);
                    sonucMetni = `En az ${minimumFinalNotu} <small>(Hesaplanan: ${gerekenFinalNotuYuvarla.toFixed(2)})</small>`;
                } else {
                    mantikAdimlariReq.push(`Sonuç: Bu hedefe ulaşmak için finalden <strong>en az ${gerekenFinalNotuYuvarla.toFixed(2)}</strong> almanız gerekiyor.`);
                    sonucMetni = gerekenFinalNotuYuvarla.toFixed(2);
                }
            }

            if (sistemSeciliGerekli === 'mutlak') {
                sistemTuru = "Mutlak Sistem";
                const mutlakAralik = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                if (!mutlakAralik) {
                    gerekliNotSonucAlani.innerHTML = `<p class="error-message">Hata: Hedeflenen harf notu (${hedefHarfNotu}) için mutlak değerlendirme aralığı bulunamadı.</p>`;
                    return;
                }
                mantikAdimlariReq.push(`Mutlak Sistem seçildiği için, hedeflediğiniz <strong>${hedefHarfNotu}</strong> notuna karşılık gelen sabit puan aralığının alt sınırı (<strong>${mutlakAralik[0].toFixed(2)}</strong>) hedef Ham Başarı Notu olarak alındı.`);
                gerekliFinalSonucMetniOlustur(mutlakAralik[0], "Mutlak Sistemde");
            } else if (sinifOrtalamasiVal >= 80) {
                sistemTuru = "Mutlak Sistem";
                const mutlakAralik = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                if (!mutlakAralik) {
                    gerekliNotSonucAlani.innerHTML = `<p class="error-message">Hata: Hedeflenen harf notu (${hedefHarfNotu}) için mutlak değerlendirme aralığı bulunamadı.</p>`;
                    return;
                }
                mantikAdimlariReq.push(`Girdiğiniz sınıf çan ortalaması (${sinifOrtalamasiVal.toFixed(2)}) 80 veya üzerinde olduğu için, seçtiğiniz sistemden bağımsız olarak bu ders otomatik biçimde Mutlak Sisteme göre değerlendirilir. Hedeflediğiniz <strong>${hedefHarfNotu}</strong> notuna karşılık gelen sabit puan aralığının alt sınırı (<strong>${mutlakAralik[0].toFixed(2)}</strong>) hedef Ham Başarı Notu olarak alındı.`);
                uyariHTMLReq = `<p class="hesaplama-sonuc-uyari">ℹ️ Sınıf çan ortalaması yüksek olan derslerde mutlak sistem otomatik olarak devreye girer; bu yüzden üstte seçtiğiniz sistem bu hesaplamada dikkate alınmadı.</p>`;
                gerekliFinalSonucMetniOlustur(mutlakAralik[0], "Mutlak Sistemde");
            } else {
                sistemTuru = "Bağıl Sistem";
                const minimumTskor = (sistemSeciliGerekli === 'tablo2')
                    ? getTablo2TahminiMinTskor(hedefHarfNotu, sinifOrtalamasiVal)
                    : getHedefNotIcinMinTskor(hedefHarfNotu, sinifOrtalamasiVal);
                if (minimumTskor === null) {
                    gerekliNotSonucAlani.innerHTML = `<p class="error-message">Hata: Hedeflenen "${hedefHarfNotu}" notu için T-skor aralığı bulunamadı (Sınıf Çan Ort: ${sinifOrtalamasiVal.toFixed(2)}).</p>`;
                    return;
                }
                let hedefHamBasariNotuBagil = ((minimumTskor - 50) / 10) * sinifStandartSapmaVal + sinifOrtalamasiVal;

                if (sistemSeciliGerekli === 'tablo2') {
                    mantikAdimlariReq.push(`1-29 Öğrenci sistemi seçildiği için, hedeflediğiniz <strong>${hedefHarfNotu}</strong> notunun yüzdelik dilim tablosundaki alt sınırı, normal dağılım varsayımıyla tahmini bir T-Skoruna (<strong>${minimumTskor.toFixed(2)}</strong>) çevrildi.`);
                    uyariHTMLReq = `<p class="hesaplama-sonuc-uyari">⚠️ <strong>Bu sonuç bir tahmindir.</strong> 1-29 öğrencili derslerde harf notu, sınıftaki tüm öğrencilerin notlarının sıralanmasıyla belirlenir. Bu hesaplayıcı yalnızca sizin durumunuzu bildiği için sınıfın tam sıralamasını bilemez ve size istatistiksel bir tahmin sunar${ogrenciSayisiGerekliVal ? ` (girdiğiniz tahmini öğrenci sayısı: ${ogrenciSayisiGerekliVal})` : ''}. Gerçek sonucunuz bu tahminden <strong>farklı çıkabilir</strong>; kesin sonuç için dersin öğretim elemanına danışın.</p>`;
                } else {
                    mantikAdimlariReq.push(`30+ Öğrenci sistemi seçildiği için, hedeflediğiniz <strong>${hedefHarfNotu}</strong> notu için gereken minimum T-Skoru (<strong>${minimumTskor.toFixed(2)}</strong>) sabit T-Skoru aralıklarından bulundu.`);
                }
                mantikAdimlariReq.push(`Bu T-Skoruna, sınıf çan ortalamanız (${sinifOrtalamasiVal.toFixed(2)}) ve standart sapmanız (${sinifStandartSapmaVal.toFixed(2)}) üzerinden karşılık gelen Ham Başarı Notu hesaplandı: <strong>${hedefHamBasariNotuBagil.toFixed(2)}</strong>.`);
                const mutlakNotKarsiligiHBN = getMutlakDegerlendirmeNotu(hedefHamBasariNotuBagil);
                mantikAdimlariReq.push(`Bilginize: bu Ham Başarı Notu, mutlak sistemde yaklaşık <strong>${mutlakNotKarsiligiHBN}</strong> notuna denk gelir. Gerçek harf notunuz, bağıl ve mutlak sonuçlardan yüksek olanına eşitlenir.`);

                gerekliFinalSonucMetniOlustur(hedefHamBasariNotuBagil, "Bağıl Sistemde");
            }
            let finalSonucHTML = `Gereken Final Notu (${sistemTuru}): <strong style="font-size: 1.2em;">${sonucMetni}</strong>`;
            finalSonucHTML += buildHesaplamaMantigiHTML('Nasıl Hesaplandı?', mantikAdimlariReq, uyariHTMLReq);
            gerekliNotSonucAlani.innerHTML = finalSonucHTML;
            dersiLinkGoster('ders-link-gerekli');
            const vizeLogGerekli = secilenYontem === 'tek'
                ? parseFloat(document.getElementById('req-midterm-avg').value)
                : parseFloat(document.getElementById('vize-notu-gerekli').value);
            const reqOrtLog = parseFloat(reqClassAvgInput.value);
            const reqStdLog = parseFloat(reqClassStdDevInput.value);
            hesaplamaLogKaydet('gerekli', null, isNaN(vizeLogGerekli) ? null : vizeLogGerekli, null, {
                hedef_harf_notu: hedefHarfNotu || undefined,
                sinif_ortalamasi: isNaN(reqOrtLog) ? undefined : reqOrtLog,
                std_sapma: isNaN(reqStdLog) ? undefined : reqStdLog,
                sistem_secimi: sistemSeciliGerekli,
                fakulte_turu: gerekliNotFormu.querySelector('input[name="fakulteGerekli"]:checked')?.value || 'genel'
            });
            sonucIndirButonuGoster('gerekli');
        });
    }


    // --- Geçme Senaryoları Formu İşlemleri ---
    if (senaryoFormu) {
        const scenarioMidtermAvgInput = document.getElementById('scenario-midterm-avg');
        const vizeNotuSenaryoInput = document.getElementById('vize-notu-senaryo');
        const vizeAgirlikSenaryoInput = document.getElementById('vize-agirlik-senaryo');
        const odevNotuSenaryoInput = document.getElementById('odev-notu-senaryo');
        const odevAgirlikSenaryoInput = document.getElementById('odev-agirlik-senaryo');
        
        const inputsToValidateSenaryo = [
            { el: scenarioMidtermAvgInput, name: 'Ara Sınav Ortalaması', min: 0, max: 100, isTekOrtalamaOnly: true },
            { el: vizeNotuSenaryoInput, name: 'Vize Notu', min: 0, max: 100, isDetayliOnly: true },
            { el: vizeAgirlikSenaryoInput, name: 'Vize Ağırlığı', min: 0, max: 50, isDetayliOnly: true, isWeight: true },
            { el: odevNotuSenaryoInput, name: 'Ödev/Proje Notu', min: 0, max: 100, isDetayliOnly: true },
            { el: odevAgirlikSenaryoInput, name: 'Ödev/Proje Ağırlığı', min: 0, max: 50, isDetayliOnly: true, isWeight: true }
        ];

        inputsToValidateSenaryo.forEach(item => {
            if (item.el) {
                item.el.addEventListener('blur', () => {
                    const secilenYontem = senaryoFormu.querySelector('input[name="hesaplamaYontemiSenaryo"]:checked').value;
                    const isTekOrtalamaActive = secilenYontem === 'tek';

                    if ((item.isTekOrtalamaOnly && !isTekOrtalamaActive) || (item.isDetayliOnly && isTekOrtalamaActive)) {
                        clearFieldError(item.el); return;
                    }
                    let isValid = validateNumberField(item.el, item.name, item.min, item.max);
                    if (isValid && item.isWeight && !isTekOrtalamaActive) {
                        validateDetailedWeights(vizeAgirlikSenaryoInput, odevAgirlikSenaryoInput, 'Senaryo');
                    }
                });
            }
        });

        senaryoFormu.addEventListener('submit', (event) => {
            event.preventDefault();
            senaryoTabloAlani.innerHTML = "<p>Senaryolar Hesaplanıyor...</p>";
            let formGecerli = true;
            const secilenYontem = senaryoFormu.querySelector('input[name="hesaplamaYontemiSenaryo"]:checked').value;

            if (secilenYontem === 'tek') {
                if (!validateNumberField(scenarioMidtermAvgInput, 'Ara Sınav Ortalaması', 0, 100)) formGecerli = false;
            } else {
                if (!validateNumberField(vizeNotuSenaryoInput, 'Vize Notu', 0, 100)) formGecerli = false;
                if (!validateNumberField(vizeAgirlikSenaryoInput, 'Vize Ağırlığı', 0, 50)) formGecerli = false;
                if (!validateNumberField(odevNotuSenaryoInput, 'Ödev/Proje Notu', 0, 100)) formGecerli = false;
                if (!validateNumberField(odevAgirlikSenaryoInput, 'Ödev/Proje Ağırlığı', 0, 50)) formGecerli = false;
                if (formGecerli) {
                    if (!validateDetailedWeights(vizeAgirlikSenaryoInput, odevAgirlikSenaryoInput, 'Senaryo')) formGecerli = false;
                }
            }
            
            if (!formGecerli) {
                senaryoTabloAlani.innerHTML = `<p class="error-message">Lütfen ara sınav bilgilerinizi doğru girin.</p>`;
                 const firstInvalidInput = senaryoFormu.querySelector('input.invalid-input');
                if (firstInvalidInput) firstInvalidInput.focus();
                return;
            }

            const araSinavHBNKatkisi = calculateMidtermContribution('Senaryo', senaryoFormu);
            const hedefHarfNotuRadio = senaryoFormu.querySelector('input[name="scenarioTargetGrade"]:checked');
            if (!hedefHarfNotuRadio) {
                 senaryoTabloAlani.innerHTML = `<p class="error-message">Lütfen hedef harf notunu seçin.</p>`;
                 return;
            }
            const hedefHarfNotu = hedefHarfNotuRadio.value;
            const minimumFinalNotu = getMinimumFinalNotu('Senaryo', senaryoFormu);
            const sistemSeciliSenaryo = senaryoFormu.querySelector('input[name="hesaplamaSistemiSenaryo"]:checked')?.value || 'tablo1';
            const ogrenciSayisiInputSenaryo = document.getElementById('ogrenci-sayisi-senaryo');
            const ogrenciSayisiSenaryoVal = (sistemSeciliSenaryo === 'tablo2' && ogrenciSayisiInputSenaryo && ogrenciSayisiInputSenaryo.value.trim() !== '') ? parseInt(ogrenciSayisiInputSenaryo.value, 10) : null;

            // Mutlak Sistem seçiliyse senaryo tablosu (sınıf çan ortalaması varsayımları) anlamsızdır;
            // doğrudan tek bir sonuç gösterilir.
            if (sistemSeciliSenaryo === 'mutlak') {
                const mutlakAralikSenaryoTek = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                let mantikAdimlariMutlakSenaryo = [];
                let sonucMetniMutlakSenaryo = "-";
                if (!mutlakAralikSenaryoTek) {
                    senaryoTabloAlani.innerHTML = `<p class="error-message">Hata: Hedeflenen "${hedefHarfNotu}" notu için mutlak değerlendirme aralığı bulunamadı.</p>`;
                    return;
                }
                mantikAdimlariMutlakSenaryo.push(`Mutlak Sistem seçildiği için, hedeflediğiniz <strong>${hedefHarfNotu}</strong> notuna karşılık gelen sabit puan aralığının alt sınırı (<strong>${mutlakAralikSenaryoTek[0].toFixed(2)}</strong>) hedef Ham Başarı Notu olarak alındı.`);
                let hesaplananFinalMutlakTek = (mutlakAralikSenaryoTek[0] - araSinavHBNKatkisi) / 0.50;
                hesaplananFinalMutlakTek = Math.max(0, hesaplananFinalMutlakTek);
                const yuvarlanmisFinalMutlakTek = Math.ceil(hesaplananFinalMutlakTek * 100) / 100;
                mantikAdimlariMutlakSenaryo.push(`Yarıyıl içi katkınız (${araSinavHBNKatkisi.toFixed(2)}) çıkarılıp final ağırlığına (%50) bölünerek gereken final notu hesaplandı.`);
                if (yuvarlanmisFinalMutlakTek > 100) {
                    mantikAdimlariMutlakSenaryo.push(`Hesaplanan final notu (${yuvarlanmisFinalMutlakTek.toFixed(2)}) <strong>100'den yüksek</strong> çıktı; bu hedefe bu yarıyıl içi notlarla ulaşmak mümkün değil.`);
                    sonucMetniMutlakSenaryo = "İmkansız (>100)";
                } else if (yuvarlanmisFinalMutlakTek < minimumFinalNotu) {
                    mantikAdimlariMutlakSenaryo.push(`Hesaplanan final notu (${yuvarlanmisFinalMutlakTek.toFixed(2)}), bu ders için gereken minimum final sınırının (${minimumFinalNotu}) altında çıktı; finalden <strong>en az ${minimumFinalNotu}</strong> almanız gerekir.`);
                    sonucMetniMutlakSenaryo = `En az ${minimumFinalNotu} <small>(Hesaplanan: ${yuvarlanmisFinalMutlakTek.toFixed(2)})</small>`;
                } else {
                    mantikAdimlariMutlakSenaryo.push(`Sonuç: Bu hedefe ulaşmak için finalden <strong>en az ${yuvarlanmisFinalMutlakTek.toFixed(2)}</strong> almanız gerekiyor.`);
                    sonucMetniMutlakSenaryo = yuvarlanmisFinalMutlakTek.toFixed(2);
                }
                let mutlakSenaryoHTML = `Gereken Final Notu (Mutlak Sistem): <strong style="font-size: 1.2em;">${sonucMetniMutlakSenaryo}</strong>`;
                mutlakSenaryoHTML += buildHesaplamaMantigiHTML('Nasıl Hesaplandı?', mantikAdimlariMutlakSenaryo, '');
                mutlakSenaryoHTML += `<p style="color:var(--small-text);font-size:0.85em;margin-top:10px;">Mutlak Sistemde sonuç sınıf çan ortalamasından bağımsız olduğu için, diğer sistemlerdeki gibi bir senaryo tablosu gösterilmez.</p>`;
                senaryoTabloAlani.innerHTML = mutlakSenaryoHTML;
                const vizeLogSenaryoMutlak = secilenYontem === 'tek'
                    ? parseFloat(document.getElementById('scenario-midterm-avg').value)
                    : parseFloat(document.getElementById('vize-notu-senaryo').value);
                hesaplamaLogKaydet('senaryo', null, isNaN(vizeLogSenaryoMutlak) ? null : vizeLogSenaryoMutlak, null, {
                    hedef_harf_notu: hedefHarfNotu || undefined,
                    sistem_secimi: sistemSeciliSenaryo,
                    fakulte_turu: senaryoFormu.querySelector('input[name="fakulteSenaryo"]:checked')?.value || 'genel'
                });
                return;
            }

            const senaryoOrtalamalar = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
            const senaryoStdSapmalar = [8, 10, 12, 15, 18, 20, 22, 25];

            let tabloHTML = `<table><thead><tr>`;
            tabloHTML += `<th scope="col" style="text-align:center; min-width:140px; vertical-align: middle;">
                                 <div style='font-weight:bold; font-size:0.9em; padding-bottom:2px;'>Sınıf Çan Ort. (→)</div>
                                 <hr style='margin:0; border-style: solid; border-width: 0 0 1px 0; border-color: var(--input-focus-border);'>
                                 <div style='font-weight:bold; font-size:0.9em; padding-top:2px;'>Std. Sapma (↓)</div>
                             </th>`;
            senaryoOrtalamalar.forEach(ort => { tabloHTML += `<th scope="col" title="Sınıf Çan Ortalaması: ${ort}">${ort}</th>`; });
            tabloHTML += `<th scope="col" title="Sınıf Çan Ort. ≥ 80 (Mutlak Değerlendirme)">&ge;80 <br><small style='font-weight:normal'>(Mutlak)</small></th>`;
            tabloHTML += `</tr></thead><tbody>`;

            let ornekOrtalama = null, ornekStdSapma = null, ornekGerekenNot = null;
            let ilkUygunOrnekBulundu = false;

            senaryoStdSapmalar.forEach(stdSapma => {
                tabloHTML += `<tr><th scope="row" title="Standart Sapma: ${stdSapma}">${stdSapma}</th>`;
                senaryoOrtalamalar.forEach(ortalama => {
                    let gerekenFinalNotu = "-"; let cellClass = "impossible";
                    if (ortalama < 80 && stdSapma === 0) {
                         gerekenFinalNotu = "-"; cellClass = "impossible";
                    } else {
                        const minimumTskor = (sistemSeciliSenaryo === 'tablo2')
                            ? getTablo2TahminiMinTskor(hedefHarfNotu, ortalama)
                            : getHedefNotIcinMinTskor(hedefHarfNotu, ortalama);
                        if (minimumTskor !== null && stdSapma > 0) {
                            let hedefHamBasariNotuNihai = ((minimumTskor - 50) / 10) * stdSapma + ortalama;
                            let hesaplananFinal = (hedefHamBasariNotuNihai - araSinavHBNKatkisi) / 0.50;
                            hesaplananFinal = Math.max(0, hesaplananFinal);
                            const yuvarlanmisFinal = Math.ceil(hesaplananFinal * 100) / 100;


                            if (yuvarlanmisFinal > 100) { gerekenFinalNotu = "100+"; cellClass = "impossible"; }
                            else if (yuvarlanmisFinal < minimumFinalNotu) { gerekenFinalNotu = `Min ${minimumFinalNotu}`; cellClass = "min-final"; }
                            else { gerekenFinalNotu = Math.ceil(yuvarlanmisFinal).toString(); cellClass = ""; }

                            if (!ilkUygunOrnekBulundu && cellClass === "") {
                                ornekOrtalama = ortalama; ornekStdSapma = stdSapma; ornekGerekenNot = gerekenFinalNotu;
                                ilkUygunOrnekBulundu = true;
                            }
                        } else {
                             gerekenFinalNotu = "-"; cellClass = "impossible";
                        }
                    }
                    tabloHTML += `<td class="${cellClass}">${gerekenFinalNotu}</td>`;
                });

                const mutlakAralikSenaryo = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                let gerekenFinalMutlak = "-"; let cellClassMutlak = "impossible";
                if (mutlakAralikSenaryo) {
                    const hedefHBNSenaryoMutlak = mutlakAralikSenaryo[0];
                    let hesaplananFinalMutlak = (hedefHBNSenaryoMutlak - araSinavHBNKatkisi) / 0.50;
                    hesaplananFinalMutlak = Math.max(0, hesaplananFinalMutlak);
                    const yuvarlanmisFinalMutlak = Math.ceil(hesaplananFinalMutlak*100)/100;

                    if (yuvarlanmisFinalMutlak > 100) { gerekenFinalMutlak = "100+"; }
                    else if (yuvarlanmisFinalMutlak < minimumFinalNotu) { gerekenFinalMutlak = `Min ${minimumFinalNotu}`; cellClassMutlak = "min-final"; }
                    else { gerekenFinalMutlak = Math.ceil(yuvarlanmisFinalMutlak).toString(); cellClassMutlak = ""; }
                }
                tabloHTML += `<td class="${cellClassMutlak}" title="Sınıf Çan Ort. ≥ 80 (Mutlak Sistem). Std. Sapma bu durumda anlamsızdır.">${gerekenFinalMutlak}</td>`;
                tabloHTML += `</tr>`;
            });
            tabloHTML += `</tbody></table>`;
            
            let aciklamaHTML = `<div class="scenario-explanation">`;
            if (sistemSeciliSenaryo === 'tablo2') {
                aciklamaHTML += `<p class="hesaplama-sonuc-uyari">⚠️ <strong>Bu tablo bir tahmindir.</strong> 1-29 öğrencili derslerde harf notu, sınıftaki tüm öğrencilerin notlarının sıralanmasıyla belirlenir. Bu hesaplayıcı sınıfın tam sıralamasını bilemediği için yukarıdaki tablonun tamamı istatistiksel bir tahminle hesaplanmıştır${ogrenciSayisiSenaryoVal ? ` (girdiğiniz tahmini öğrenci sayısı: ${ogrenciSayisiSenaryoVal})` : ''}; gerçek sonuç farklı çıkabilir. Kesin sonuç için dersin öğretim elemanına danışın.</p>`;
            }
            if (ornekGerekenNot !== null) {
                aciklamaHTML += `<p>📊 Örnek: Sınıf çan ort. <strong>${ornekOrtalama}</strong>, std. sapma <strong>${ornekStdSapma}</strong> ise <strong>${hedefHarfNotu}</strong> için gereken final ≈ <strong>${ornekGerekenNot}</strong></p>`;
            }
            aciklamaHTML += `<p>⚠️ <strong>Çan ortalaması</strong>, vize/final sınıf ortalamalarının basit ortalaması <em>değildir</em>. Bağıl değerlendirmeye katılan öğrencilerin HBN ortalamasıdır.</p>`;
            aciklamaHTML += `<p>📌 <strong>Min ${minimumFinalNotu}:</strong> Final alt sınırı. &nbsp; <strong>≥80 (Mutlak):</strong> Sınıf çan ort. 80+ ise mutlak sistem. &nbsp; <strong>100+:</strong> Ulaşılamaz hedef.</p>`;
            aciklamaHTML += `<p style="color:var(--small-text);font-size:0.85em;">Bu tablo tahmin aracıdır, resmi sonuç değildir. Güvende olmak için tablodaki nottan birkaç puan fazlasını hedefle.</p>`;
            aciklamaHTML += `</div>`;

            senaryoTabloAlani.innerHTML = `
                 <div class="table-scroll-wrapper" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                     ${tabloHTML}
                 </div>
                 ${aciklamaHTML}
             `;
            const vizeLogSenaryo = secilenYontem === 'tek'
                ? parseFloat(document.getElementById('scenario-midterm-avg').value)
                : parseFloat(document.getElementById('vize-notu-senaryo').value);
            hesaplamaLogKaydet('senaryo', null, isNaN(vizeLogSenaryo) ? null : vizeLogSenaryo, null, {
                hedef_harf_notu: hedefHarfNotu || undefined,
                sistem_secimi: sistemSeciliSenaryo,
                fakulte_turu: senaryoFormu.querySelector('input[name="fakulteSenaryo"]:checked')?.value || 'genel'
            });
        });
    }

    const firstTabButton = document.querySelector('.tab-button.active') || document.querySelector('.tab-button');
    if (firstTabButton) {
        const tabName = firstTabButton.getAttribute('onclick').match(/'([^']+)'/)[1];
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        firstTabButton.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = "none";
            content.classList.remove("active");
        });
        const activeTabContent = document.getElementById(tabName);
        if(activeTabContent) {
            activeTabContent.style.display = "block";
            activeTabContent.classList.add("active");
        }
    } else {
         const firstButton = document.querySelector('.tab-button');
         if(firstButton){
            const tabName = firstButton.getAttribute('onclick').match(/'([^']+)'/)[1];
            openTab({currentTarget: firstButton}, tabName);
         }
    }


    toggleInputFields('Harf');
    toggleInputFields('Gerekli');
    toggleInputFields('Senaryo');

    // --- Sayfa görüntüleme logu ---
    sayfaGoruntulemeLogKaydet();

    // --- Dönem Ortalaması başlat ---
    ganoDersEkle(); // İlk ders otomatik eklensin

    // --- Paylaşma linki varsa yükle ---
    urldenHesaplamaYukle();

    // Supabase başlat
    fakulteleriYukle();
    yilSecenekleriniDoldur();
    istatistikleriYukle();
    const veriEkleFormu = document.getElementById('veri-ekle-form');
    if (veriEkleFormu) veriEkleFormu.addEventListener('submit', veriEkleSubmit);

    // "Bu Dersin Paylaşılan Verilerini Gör" modalını tıklandığı anda kasmadan açabilmek için,
    // fakülte listesini kullanıcı modalı ilk açmayı beklemeden, sayfa yüklenirken çekiyoruz.
    modalFakulteleriHazirla();

    // Bilgilendirme (sistem bilgisi) modalının içeriğini de sayfa yüklenirken bir kere hazırlayıp
    // gizli halde DOM'a ekliyoruz; tıklandığında sadece görünürlüğü değiştiriliyor, yeniden
    // oluşturulmuyor — böylece tıklama anında hiçbir ağır işlem yapılmıyor.
    sistemBilgiIcerikleriOnHazirla();

});

// ============================================================
// DÖNEM ORTALAMASI (ANO) — Madde 11 & 13
// ============================================================

const GANO_KATSAYILARI = {
    'AA': 4.0, 'BA': 3.5, 'BB': 3.0, 'CB': 2.5,
    'CC': 2.0, 'DC': 1.5, 'DD': 1.0, 'FD': 0.5, 'FF': 0.0, 'D': 0.0
};
// Tablo-3'ün "Not Ortalaması" sütunu: D (Devamsız) 0.0 katsayı ile ANO'ya KATILIR (aynı FF gibi
// kredisi ortalamaya dahil edilir); yalnızca G (Geçer) ve K (Kalır) ortalamaya KATILMAZ. S (Süren
// Çalışma) tabloda yer alsa da arayüzdeki harf notu seçeneklerinde sunulmuyor, güvenlik amacıyla
// listede tutuluyor.
const GANO_HARIC_NOTLAR = ['G', 'K', 'S'];

let ganoDersSayac = 0;
let ganoLogTimeout = null;
let ganoSonLogAno = null; // aynı ANO değerini tekrar loglamamak için

function ganoDersEkle() {
    ganoDersSayac++;
    const id = ganoDersSayac;
    const liste = document.getElementById('gano-dersler-listesi');
    if (!liste) return;

    const dersDiv = document.createElement('div');
    dersDiv.className = 'gano-ders-satir';
    dersDiv.id = `gano-ders-${id}`;
    dersDiv.innerHTML = `
        <div class="gano-ders-icerik">
            <div class="form-group gano-ders-adi-grup">
                <label>Ders Adı <span class="gano-opsiyonel">(opsiyonel)</span></label>
                <input type="text" class="gano-ders-adi-input" placeholder="Örn: Matematik I" oninput="ganoSonucGecersizKil()">
            </div>
            <div class="form-group gano-kredi-grup">
                <label>Kredi <span class="zorunlu">*</span></label>
                <input type="number" class="gano-kredi-input" min="1" max="10" step="1" placeholder="3" oninput="ganoSonucGecersizKil()">
            </div>
            <div class="form-group gano-not-grup">
                <label>Harf Notu <span class="zorunlu">*</span></label>
                <select class="gano-not-input" onchange="ganoSonucGecersizKil()">
                    <option value="">Seç</option>
                    <option value="AA">AA — 4.0</option>
                    <option value="BA">BA — 3.5</option>
                    <option value="BB">BB — 3.0</option>
                    <option value="CB">CB — 2.5</option>
                    <option value="CC">CC — 2.0</option>
                    <option value="DC">DC — 1.5 ⚠</option>
                    <option value="DD">DD — 1.0</option>
                    <option value="FD">FD — 0.5</option>
                    <option value="FF">FF — 0.0</option>
                    <option value="D">D — Devamsız (0.0)</option>
                    <option value="G">G — Geçer</option>
                    <option value="K">K — Kalır</option>
                </select>
            </div>
            <button type="button" class="gano-ders-sil-btn" onclick="ganoDersSil(${id})" aria-label="Dersi kaldır">✕</button>
        </div>
    `;
    liste.appendChild(dersDiv);
    ganoHesapla();
}

function ganoHesaplaButon() {
    // Sonucu göster
    document.getElementById('gano-sonuc').style.display = 'block';
    ganoHesapla();
}

// Ders satırlarından biri (kredi/harf notu/ders adı) değiştirildiğinde ekranda duran ANO
// sonucunu gizler — aksi halde kullanıcı "Hesapla"ya tekrar basmazsa artık yanlış olan eski
// sonucu doğruymuş gibi görmeye devam eder (bkz. ganoDersSil'deki aynı mantık).
function ganoSonucGecersizKil() {
    const sonucEl = document.getElementById('gano-sonuc');
    if (sonucEl) sonucEl.style.display = 'none';
    const indirKutu = document.getElementById('ano-indir-kutu');
    if (indirKutu) indirKutu.style.display = 'none';
}

function ganoDersSil(id) {
    const el = document.getElementById(`gano-ders-${id}`);
    if (el) el.remove();
    // Sonucu gizle — içerik değişti, tekrar hesaplansın
    ganoSonucGecersizKil();
}

function ganoHesapla() {
    const sonucEl = document.getElementById('gano-sonuc');
    if (!sonucEl) return;

    const dersler = document.querySelectorAll('.gano-ders-satir');
    let gecerliDersler = [];

    dersler.forEach(satir => {
        const ad = satir.querySelector('.gano-ders-adi-input')?.value.trim() || '';
        const kredi = parseFloat(satir.querySelector('.gano-kredi-input')?.value);
        const not = satir.querySelector('.gano-not-input')?.value;
        if (!isNaN(kredi) && kredi > 0 && not) {
            const dahil = !GANO_HARIC_NOTLAR.includes(not);
            const katsayi = dahil ? (GANO_KATSAYILARI[not] ?? null) : null;
            gecerliDersler.push({ ad, kredi, not, dahil, katsayi });
        }
    });

    if (gecerliDersler.length === 0) {
        sonucEl.style.display = 'none';
        return;
    }

    const dahilDersler = gecerliDersler.filter(d => d.dahil);
    const toplamKredi = dahilDersler.reduce((s, d) => s + d.kredi, 0);
    const toplamKrediXKatsayi = dahilDersler.reduce((s, d) => s + d.kredi * d.katsayi, 0);
    const ano = toplamKredi > 0 ? toplamKrediXKatsayi / toplamKredi : null;

    // DC koşullu geçme kontrolü (Madde 13)
    const dcDersler = gecerliDersler.filter(d => d.not === 'DC');
    const dcUyarilar = dcDersler.map(d => ({
        ad: d.ad || 'İsimsiz ders',
        durum: (ano !== null && ano >= 2.00) ? 'gecti' : 'kaldi',
        ano
    }));

    // Başarısız dersler — FF/FD/DD (Madde 13) ve koşulu sağlamayan DC (Madde 13) tekrar gerektirir;
    // "D" (Devamsız, Madde 7) bir başarısızlık notu olmasa da öğrencinin o dersi (seçmeli ise
    // dilerse başka bir seçmeli dersi) tekrar almasını gerektirdiği için aynı listede gösteriliyor.
    const basarisizlar = gecerliDersler.filter(d => {
        if (['FF', 'FD', 'DD', 'D'].includes(d.not)) return true;
        if (d.not === 'DC' && ano !== null && ano < 2.00) return true;
        return false;
    });

    let html = '';

    // ANO sonuç kutusu
    if (ano !== null) {
        const anoClass = ano >= 3.0 ? 'gano-iyi' : ano >= 2.0 ? 'gano-orta' : 'gano-dusuk';
        html += `<div class="gano-sonuc-grid">
            <div class="gano-sonuc-kutu gano-agno-kutu">
                <div class="gano-sonuc-etiket">Dönem Ağırlıklı Not Ortalaması (ANO)</div>
                <div class="gano-sonuc-deger ${anoClass}">${ano.toFixed(2)}</div>
                <div class="gano-sonuc-alt">${toplamKredi} kredi üzerinden hesaplandı</div>
            </div>
        </div>`;
    } else {
        html += `<p style="color:var(--small-text); font-size:0.9em;">Hesaplamaya dahil edilecek ders bulunamadı (G, K notları ANO'ya dahil edilmez).</p>`;
    }

    // DC uyarıları
    if (dcUyarilar.length > 0) {
        html += `<div class="gano-dc-uyari-kutu">`;
        dcUyarilar.forEach(u => {
            if (u.durum === 'gecti') {
                html += `<div class="gano-dc-gecti">✅ <strong>${u.ad}</strong> — DC ile ANO ${u.ano.toFixed(2)} ≥ 2.00 olduğu için <strong>geçtiniz</strong>.</div>`;
            } else {
                html += `<div class="gano-dc-kaldi">❌ <strong>${u.ad}</strong> — DC ile ANO ${u.ano !== null ? u.ano.toFixed(2) : '—'} &lt; 2.00 olduğu için <strong>kaldınız</strong>. Bu dersi tekrar almanız gerekiyor.</div>`;
            }
        });
        html += `</div>`;
    }

    // Başarısız dersler
    if (basarisizlar.length > 0) {
        html += `<div class="gano-basarisiz-kutu">
            <div class="gano-basarisiz-baslik">⚠️ Tekrar Almanız Gereken Dersler</div>`;
        basarisizlar.forEach(d => {
            const not = escHtml(d.not);
            const ad = escHtml(d.ad || 'İsimsiz ders');
            html += `<div class="gano-basarisiz-ders"><span class="grade-display-badge grade-display-${d.not.toLowerCase()}">${not}</span> ${ad} (${d.kredi} kredi)`;
            if (d.not === 'D') {
                html += ` <span style="color:var(--small-text); font-size:0.85em;">— devamsızlık nedeniyle bu dersi tekrar almanız, ders seçmeli ise dilerseniz başka bir seçmeli ders almanız gerekir.</span>`;
            }
            html += `</div>`;
        });
        html += `</div>`;
    }

    sonucEl.style.display = 'block';
    sonucEl.innerHTML = html;
    sonucIndirButonuGoster('ano');

    // ANO hesaplamasını logla — debounced (2sn sonra, aynı değer tekrar loglanmaz)
    if (ano !== null) {
        const anoRounded = parseFloat(ano.toFixed(2));
        clearTimeout(ganoLogTimeout);
        ganoLogTimeout = setTimeout(() => {
            if (anoRounded !== ganoSonLogAno) {
                ganoSonLogAno = anoRounded;
                hesaplamaLogKaydet('ano', null, null, null, {
                    ano: anoRounded,
                    ders_sayisi: gecerliDersler.length,
                    toplam_kredi: toplamKredi,
                    basarisiz_sayi: basarisizlar.length,
                    dc_sayi: dcDersler.length
                });
                // Ders adlarını grup olarak logla
                const dersAdlari = gecerliDersler
                    .map(d => d.ad)
                    .filter(ad => ad && ad.length > 0);
                if (dersAdlari.length > 0) {
                    anoDersGrupLogKaydet(anoRounded, toplamKredi, dersAdlari);
                }
            }
        }, 2000);
    }
}


// ============================================================================
// SONUÇ KARTI — hesaplama sonucunu Instagram Hikaye formatında (1080×1920),
// sonucun harf notuyla/renk skalasıyla uyumlu bir gradyan arka plana sahip,
// paylaşılabilir bir "anı kartı" olarak çizer. Kullanıcı; ders adını girebilir,
// kartta hangi alanların görüneceğini seçebilir (Vize/Final/Sınıf Ort. vb.)
// ve ANO sekmesinde isterse hesaba giren derslerin listesini de ekleyebilir.
// ============================================================================

// Harf notu -> tema rengi eşlemesi. style.css'teki --grade-*-bg değişkenleriyle
// birebir aynı tutuluyor ki kartın rengi sonucun (rozetin) rengiyle her zaman
// uyumlu olsun — ör. FF alındığında kart kırmızıya, AA alındığında yeşile döner.
const GRADE_KART_RENK = {
    AA: '#28a745', BA: '#5cb85c', BB: '#82ca9c', CB: '#007bff', CC: '#17a2b8',
    DC: '#fd7e14', DD: '#ffc107', FD: '#dc3545', FF: '#a21427', D: '#a21427'
};
const VARSAYILAN_KART_RENK = '#6f42c1';

// O an modalda önizlenen/indirilecek kartın verisi ({ sekme, veri, dersAdi, baslik }).
let kartAktifVeri = null;

// Harf notuna göre kartın tema rengini belirler. "onerilenMesaj", kullanıcının kendi
// mesajını yazmasını kolaylaştırmak için yalnızca giriş alanının placeholder'ında
// gösterilir — kullanıcı bir şey yazmadığı sürece kartın üzerine ASLA otomatik çizilmez.
function harfRenkVeMesaj(harf) {
    const renk = GRADE_KART_RENK[harf] || VARSAYILAN_KART_RENK;
    let onerilenMesaj;
    if (['AA', 'BA'].includes(harf)) onerilenMesaj = 'Harika bir sonuç!';
    else if (['BB', 'CB'].includes(harf)) onerilenMesaj = 'Gayet iyi gidiyorum!';
    else if (['CC', 'DC'].includes(harf)) onerilenMesaj = 'Geçtim, emek boşa gitmedi';
    else if (harf === 'D') onerilenMesaj = 'Bu ders için yeni bir şansım var';
    else onerilenMesaj = 'Bu sefer olmadı, pes yok';
    return { renk, onerilenMesaj };
}

function hedefOnerilenMesaj(degerMetni) {
    if (degerMetni && /İmkansız/i.test(degerMetni)) {
        return 'Bu hedefe ulaşmak zor ama yeni bir plan yapılabilir';
    }
    return 'Hedefime giden yol belli, başarabilirim!';
}

function anoRenkVeMesaj(ano) {
    if (ano === null || isNaN(ano)) return { renk: VARSAYILAN_KART_RENK, onerilenMesaj: 'Bu dönem devam ediyor' };
    if (ano >= 3.5) return { renk: '#28a745', onerilenMesaj: 'Muhteşem bir dönem geçirdim!' };
    if (ano >= 3.0) return { renk: '#28a745', onerilenMesaj: 'Çok iyi gidiyorum!' };
    if (ano >= 2.0) return { renk: '#fd7e14', onerilenMesaj: 'Fena değil, devam!' };
    return { renk: '#dc3545', onerilenMesaj: 'Zor bir dönemdi, toparlayacağım' };
}

// İlgili sekmenin sonuç kutusundaki ve form girdilerindeki DOM'dan kart verisini toplar.
// (Hesaplama fonksiyonlarının kendi içindeki closure değişkenlerine buradan erişilemediği
// için, zaten ekranda görünen değerler yeniden okunur.) Hesaplama yapılmamışsa null döner.
function sonucKartiVeriTopla(sekme) {
    if (sekme === 'harf') {
        const kutu = document.getElementById('grade-result');
        const badge = kutu?.querySelector('.grade-display-badge');
        const harfNotu = badge ? badge.textContent.trim() : null;
        if (!harfNotu) return null;
        const { renk, onerilenMesaj } = harfRenkVeMesaj(harfNotu);
        const yontem = document.querySelector('input[name="hesaplamaYontemiHarf"]:checked')?.value || 'tek';
        const vize = yontem === 'tek' ? document.getElementById('midterm-avg')?.value : document.getElementById('vize-notu-harf')?.value;
        const final = document.getElementById('final-grade')?.value;
        const sinif = document.getElementById('class-avg')?.value;
        return {
            baslik: 'Harf Notu Sonucu',
            heroEtiket: 'Harf Notunuz',
            heroDeger: harfNotu,
            heroAlt: '',
            renk, onerilenMesaj,
            alanlar: [
                { key: 'vize', label: 'Vize / Ara Sınav', deger: vize, tip: 'metin' },
                { key: 'final', label: 'Final Notu', deger: final, tip: 'metin' },
                { key: 'sinif', label: 'Sınıf Ortalaması', deger: sinif, tip: 'metin' }
            ]
        };
    }

    if (sekme === 'gerekli') {
        const kutu = document.getElementById('required-result');
        const strongEl = kutu?.querySelector('strong[style*="1.2em"]');
        if (!strongEl) return null;
        const gerekliFinal = strongEl.textContent.trim().replace(/([a-zA-Z0-9])\(/g, '$1 (');
        const hedefSelect = document.getElementById('target-grade');
        const hedefHarfNotu = hedefSelect?.value || null;
        const { renk } = harfRenkVeMesaj(hedefHarfNotu);
        const yontem = document.querySelector('input[name="hesaplamaYontemiGerekli"]:checked')?.value || 'tek';
        const vize = yontem === 'tek' ? document.getElementById('req-midterm-avg')?.value : document.getElementById('vize-notu-gerekli')?.value;
        const sinif = document.getElementById('req-class-avg')?.value;
        return {
            baslik: 'Gereken Final Notu',
            heroEtiket: 'Gereken Final Notu',
            heroDeger: gerekliFinal,
            heroAlt: hedefHarfNotu ? `Hedef: ${hedefHarfNotu}` : '',
            renk, onerilenMesaj: hedefOnerilenMesaj(gerekliFinal),
            alanlar: [
                { key: 'vize', label: 'Vize / Ara Sınav', deger: vize, tip: 'metin' },
                { key: 'sinif', label: 'Sınıf Ortalaması', deger: sinif, tip: 'metin' }
            ]
        };
    }


    if (sekme === 'ano') {
        const anoDegerEl = document.querySelector('#gano-sonuc .gano-sonuc-deger');
        const anoAltEl = document.querySelector('#gano-sonuc .gano-sonuc-alt');
        const anoDegerMetin = anoDegerEl ? anoDegerEl.textContent.trim() : null;
        const anoSayi = anoDegerMetin ? parseFloat(anoDegerMetin.replace(',', '.')) : null;
        const { renk, onerilenMesaj } = anoRenkVeMesaj(anoSayi);
        const dersAdlari = Array.from(document.querySelectorAll('.gano-ders-satir')).map(satir => {
            const ad = satir.querySelector('.gano-ders-adi-input')?.value.trim();
            const not = satir.querySelector('.gano-not-input')?.value;
            const kredi = satir.querySelector('.gano-kredi-input')?.value;
            if (!not || !kredi) return null;
            return `${ad || 'Ders'} · ${not}`;
        }).filter(Boolean);
        if (!anoDegerMetin && dersAdlari.length === 0) return null;
        return {
            baslik: 'Dönem Ortalaması (ANO)',
            heroEtiket: 'Dönem Ağırlıklı Not Ortalaması',
            heroDeger: anoDegerMetin || '—',
            heroAlt: anoAltEl ? anoAltEl.textContent.trim() : (anoDegerMetin ? '' : 'Bu derslerle ANO hesaplanamadı'),
            renk, onerilenMesaj,
            alanlar: dersAdlari.length > 0 ? [
                { key: 'dersler', label: `Dersler (${dersAdlari.length})`, deger: dersAdlari, tip: 'liste' }
            ] : []
        };
    }

    return null;
}

// --- Canvas çizim yardımcıları ---

// Modern (Chromium tabanlı) tarayıcılarda Canvas 2D'nin harf aralığı (letter-spacing)
// özelliğini uygular; desteklenmiyorsa sessizce hiçbir şey yapmaz. ctx.save()/restore()
// bu değeri de kapsadığı için, bir save/restore bloğu içinde çağırmak güvenlidir.
function harfAraligiUygula(ctx, deger) {
    try { ctx.letterSpacing = deger; } catch (e) { /* desteklenmiyor, yoksay */ }
}

// Ortalanmış metin: kutuya sığmıyorsa önce font küçültülür, hâlâ sığmıyorsa "…" ile kısaltılır.
// harfAraligi (opsiyonel) verilirse, harfler arasına ince bir boşluk eklenir (ör. '1px').
function ortalanmisYaziCiz(ctx, text, cx, y, font, renk, maxGenislik, harfAraligi) {
    ctx.save();
    ctx.fillStyle = renk;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (harfAraligi) harfAraligiUygula(ctx, harfAraligi);
    const sizeMatch = font.match(/([\d.]+)px/);
    let size = sizeMatch ? parseFloat(sizeMatch[1]) : 40;
    const fontAilesi = font.replace(/^[^\d]*[\d.]+px\s*/, '');
    let uygulananFont = font;
    ctx.font = uygulananFont;
    while (ctx.measureText(text).width > maxGenislik && size > 18) {
        size -= 2;
        uygulananFont = uygulananFont.replace(/[\d.]+px/, `${size}px`);
        ctx.font = uygulananFont;
    }
    let gosterilecek = text;
    if (ctx.measureText(gosterilecek).width > maxGenislik) {
        while (gosterilecek.length > 1 && ctx.measureText(gosterilecek + '…').width > maxGenislik) {
            gosterilecek = gosterilecek.slice(0, -1);
        }
        gosterilecek += '…';
    }
    ctx.fillText(gosterilecek, cx, y);
    ctx.restore();
}

// Sola yaslı, tek satırlık, taşarsa "…" ile kısaltılan metin (istatistik kutucukları için).
function solaYasliSigdirYaziCiz(ctx, text, x, y, maxGenislik, font, renk, harfAraligi) {
    ctx.save();
    ctx.fillStyle = renk;
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (harfAraligi) harfAraligiUygula(ctx, harfAraligi);
    let gosterilecek = String(text);
    if (ctx.measureText(gosterilecek).width > maxGenislik) {
        while (gosterilecek.length > 1 && ctx.measureText(gosterilecek + '…').width > maxGenislik) {
            gosterilecek = gosterilecek.slice(0, -1);
        }
        gosterilecek += '…';
    }
    ctx.fillText(gosterilecek, x, y);
    ctx.restore();
}

// Yuvarlatılmış dikdörtgen yolu oluşturur; dolgu/çizgi çağıran fonksiyon tarafından yapılır.
function yuvarlatilmisDikdortgenCiz(ctx, x, y, w, h, r) {
    const yaricap = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + yaricap, y);
    ctx.arcTo(x + w, y, x + w, y + h, yaricap);
    ctx.arcTo(x + w, y + h, x, y + h, yaricap);
    ctx.arcTo(x, y + h, x, y, yaricap);
    ctx.arcTo(x, y, x + w, y, yaricap);
    ctx.closePath();
}

// mulberry32 tabanlı, tohumlu (seeded) sözde rastgele sayı üreteci — her yeniden çizimde
// konfeti noktalarının aynı yerde kalmasını (titreşim olmamasını) sağlar.
function tohumluRastgele(tohum) {
    let durum = tohum >>> 0;
    return function () {
        durum = (durum + 0x6D2B79F5) | 0;
        let t = Math.imul(durum ^ (durum >>> 15), 1 | durum);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Kartı "boş" hissettirmemek için üst yarıya serpiştirilmiş, soluk konfeti noktaları çizer.
function konfetiCiz(ctx, genislik, yukseklik) {
    const rnd = tohumluRastgele(42);
    ctx.save();
    for (let i = 0; i < 46; i++) {
        const x = rnd() * genislik;
        const y = rnd() * yukseklik * 0.62;
        const r = 3 + rnd() * 9;
        const opaklik = 0.05 + rnd() * 0.12;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${opaklik.toFixed(2)})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// #rrggbb renk kodundan HSL renk tonunu (hue, 0-360) çıkarır — gradyanı sonucun rengiyle
// uyumlu (aynı ton, farklı açıklık) üretmek için kullanılır.
function renkHexHueCikar(hex) {
    if (!hex) return null;
    const temiz = hex.replace('#', '');
    if (temiz.length !== 6) return null;
    const r = parseInt(temiz.substring(0, 2), 16) / 255;
    const g = parseInt(temiz.substring(2, 4), 16) / 255;
    const b = parseInt(temiz.substring(4, 6), 16) / 255;
    const maxV = Math.max(r, g, b), minV = Math.min(r, g, b);
    if (maxV === minV) return 0;
    const fark = maxV - minV;
    let hue;
    if (maxV === r) hue = ((g - b) / fark) % 6;
    else if (maxV === g) hue = (b - r) / fark + 2;
    else hue = (r - g) / fark + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
    return hue;
}

// Sonucun rengiyle (harf notu / ANO skalası) uyumlu, koyudan açığa diyagonal gradyan üretir.
// FF gibi kötü bir sonuçta kart kırmızıya, AA gibi iyi bir sonuçta yeşile bürünür — kart
// artık sabit mor kalmıyor, her zaman sonuçla renk uyumu içinde.
function kartGradyanOlustur(ctx, genislik, yukseklik, renkHex) {
    const hue = renkHexHueCikar(renkHex);
    const h = hue === null ? 258 : hue;
    const grad = ctx.createLinearGradient(0, 0, genislik, yukseklik);
    grad.addColorStop(0, `hsl(${h.toFixed(0)}, 58%, 16%)`);
    grad.addColorStop(0.5, `hsl(${h.toFixed(0)}, 62%, 32%)`);
    grad.addColorStop(1, `hsl(${h.toFixed(0)}, 68%, 48%)`);
    return grad;
}

// Ders adı gibi liste değerlerini, satır satır sarılan "hap" (pill) etiketler halinde çizer.
// Çok fazla öğe varsa 12'de keser ve "+N daha" etiketiyle özetler. Çizimden sonraki Y
// konumunu döndürür ki çağıran taraf bir sonraki bloğu ondan devam ettirebilsin.
// sadeceOlc=true verilirse hiçbir şey çizmez, yalnızca kaplayacağı yüksekliği hesaplar
// (kartın toplam içerik yüksekliğini önceden ölçüp dikeyde ortalamak için kullanılır).
function pilListesiCiz(ctx, ogeler, x, y, maxGenislik, renk, sadeceOlc) {
    const yukseklikPil = 52;
    const aralik = 12;
    const dikeyAralik = 14;
    const maxGosterilecek = 12;
    const gosterilenler = ogeler.slice(0, maxGosterilecek);
    const fazlaSayi = ogeler.length - gosterilenler.length;
    ctx.save();
    ctx.font = '600 30px Poppins, Arial, sans-serif';
    let curX = x, curY = y;
    const satirSonu = x + maxGenislik;

    function pilCiz(metinHam) {
        let metin = metinHam.length > 30 ? metinHam.slice(0, 29) + '…' : metinHam;
        const metinGenislik = ctx.measureText(metin).width;
        const pilGenislik = metinGenislik + 48;
        if (curX + pilGenislik > satirSonu && curX > x) {
            curX = x;
            curY += yukseklikPil + dikeyAralik;
        }
        if (!sadeceOlc) {
            yuvarlatilmisDikdortgenCiz(ctx, curX, curY, pilGenislik, yukseklikPil, yukseklikPil / 2);
            ctx.fillStyle = 'rgba(255,255,255,0.16)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(metin, curX + 24, curY + yukseklikPil / 2 + 1);
        }
        curX += pilGenislik + aralik;
    }

    gosterilenler.forEach(pilCiz);
    if (fazlaSayi > 0) pilCiz(`+${fazlaSayi} daha`);

    ctx.restore();
    return curY + yukseklikPil;
}

// Hero panelinden sonraki içeriğin (istatistik satırları + liste) bittiği Y konumunu,
// hiçbir şey çizmeden yalnızca ölçerek tahmin eder. kartCiz bunu, içerik azken kartın alt
// tarafında büyük bir boşluk kalmaması için içeriği dikeyde dengelemekte kullanır.
function tahminiIcerikSonY(ctx, veri, metinAlanlari, listeAlanlari, genislik, heroY, heroYukseklik, heroSonrasiBosluk) {
    let y = heroY + heroYukseklik + heroSonrasiBosluk;
    if (metinAlanlari.length > 0) {
        const kutuYukseklik = 140, kutuAralik = 22;
        y += Math.min(metinAlanlari.length, 4) * (kutuYukseklik + kutuAralik) + 20;
    }
    if (listeAlanlari.length > 0) {
        listeAlanlari.forEach(alan => {
            y += 40;
            y = pilListesiCiz(ctx, alan.deger, 80, y, genislik - 160, veri.renk, true) + 30;
        });
    }
    return y;
}

// Kartı Instagram Hikaye oranında (1080×1920) baştan çizer: gradyan zemin, dekoratif
// daireler + konfeti, ders adı (veya sekme adı) başlığı, "cam" hero paneli (büyük sonuç
// değeri), kullanıcının kendi yazdığı opsiyonel mesaj, seçili istatistik satırları,
// (varsa) ders listesi ve alt bilgi.
// İçerik azsa (ör. hiçbir ek alan seçilmemişse), kalan boşluk hesaplanıp içerik dikeyde
// dengelenir — böylece kart, seçilen alan sayısından bağımsız olarak "dolu" hissettirir.
function kartCiz(veri, dersAdi, kullaniciMesaji, seciliAlanlar) {
    const canvas = document.getElementById('kart-canvas');
    if (!canvas || !veri) return;
    const GENISLIK = 1080, YUKSEKLIK = 1920;
    canvas.width = GENISLIK;
    canvas.height = YUKSEKLIK;
    const ctx = canvas.getContext('2d');

    const metinAlanlari = (seciliAlanlar || []).filter(a => a.tip !== 'liste' && a.deger !== null && a.deger !== undefined && String(a.deger).trim() !== '');
    const listeAlanlari = (seciliAlanlar || []).filter(a => a.tip === 'liste' && Array.isArray(a.deger) && a.deger.length > 0);

    // --- Dikey dengeleme: önce (çizmeden) tahmini bitiş Y'sini hesapla, kalan boşluğu
    // başlangıç ve hero-sonrası aralığa dağıt ki içerik footer'a yapışık kalmasın. ---
    const TABAN_BASLANGIC = 150;
    const TABAN_HERO_SONRASI = 130;
    const HERO_YUKSEKLIK = 430;
    const FOOTER_SINIRI = YUKSEKLIK - 90 - 36 - 40;
    const tahminiHeroY = TABAN_BASLANGIC + 104 + (dersAdi ? 66 : 30);
    const tahminiSonY = tahminiIcerikSonY(ctx, veri, metinAlanlari, listeAlanlari, GENISLIK, tahminiHeroY, HERO_YUKSEKLIK, TABAN_HERO_SONRASI);
    const bosluk = Math.max(0, FOOTER_SINIRI - tahminiSonY);
    const ekstraUst = Math.min(bosluk * 0.3, 260);
    const ekstraOrta = Math.min(bosluk * 0.55, 400);
    const heroSonrasiBosluk = TABAN_HERO_SONRASI + ekstraOrta;

    // Zemin: sonucun rengiyle uyumlu gradyan
    ctx.fillStyle = kartGradyanOlustur(ctx, GENISLIK, YUKSEKLIK, veri.renk);
    ctx.fillRect(0, 0, GENISLIK, YUKSEKLIK);

    // Dekoratif yumuşak ışık daireleri — tüm yüksekliğe yayılmış
    ctx.save();
    [
        { x: GENISLIK * 0.85, y: YUKSEKLIK * 0.06, r: 260, o: 0.10 },
        { x: GENISLIK * 0.08, y: YUKSEKLIK * 0.32, r: 220, o: 0.08 },
        { x: GENISLIK * 0.9, y: YUKSEKLIK * 0.56, r: 340, o: 0.11 },
        { x: GENISLIK * 0.1, y: YUKSEKLIK * 0.74, r: 300, o: 0.10 },
        { x: GENISLIK * 0.65, y: YUKSEKLIK * 0.9, r: 320, o: 0.12 }
    ].forEach(d => {
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        g.addColorStop(0, `rgba(255,255,255,${d.o})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();

    konfetiCiz(ctx, GENISLIK, YUKSEKLIK);

    let cursorY = TABAN_BASLANGIC + ekstraUst;

    // İnce, küçük bir dekoratif vurgu çizgisi — sade ve zarif bir üst açılış
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(GENISLIK / 2 - 44, cursorY);
    ctx.lineTo(GENISLIK / 2 + 44, cursorY);
    ctx.stroke();
    ctx.restore();
    cursorY += 60;

    // Kart başlığı: ders adı girildiyse o büyük ve karizmatik şekilde öne çıkar;
    // girilmediyse sekmenin adı (ör. "Harf Notu Sonucu") aynı stille gösterilir.
    const kartBasligi = dersAdi || veri.baslik;
    ortalanmisYaziCiz(ctx, kartBasligi, GENISLIK / 2, cursorY, '700 60px Poppins, Arial, sans-serif', '#ffffff', GENISLIK - 140, '0.5px');
    cursorY += 20;

    // Ders adı girildiyse, sekmeyi altında küçük, harf aralıklı bir alt başlık olarak hatırlat
    if (dersAdi) {
        ctx.save();
        ctx.font = '600 24px Poppins, Arial, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.62)';
        ctx.textAlign = 'center';
        harfAraligiUygula(ctx, '3px');
        ctx.fillText(veri.baslik.toLocaleUpperCase('tr-TR'), GENISLIK / 2 + 2, cursorY + 30);
        ctx.restore();
        cursorY += 66;
    } else {
        cursorY += 30;
    }

    // Hero paneli (cam efektli kutu) — büyük sonuç değeri
    const heroY = cursorY + 24;
    const heroYukseklik = HERO_YUKSEKLIK;
    const heroX = 80, heroGenislik = GENISLIK - 160;
    yuvarlatilmisDikdortgenCiz(ctx, heroX, heroY, heroGenislik, heroYukseklik, 40);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Hero içeriği (etiket + büyük değer + varsa alt metin), heroAlt olsun ya da olmasın
    // panelin içinde dikeyde ortalanır — heroAlt yoksa (ör. Harf Notu sekmesi) panelin
    // altında boş bir alan kalmaz.
    const heroIcerikYukseklik = veri.heroAlt ? 300 : 190;
    const heroIcerikBaslangicY = heroY + Math.max(20, (heroYukseklik - heroIcerikYukseklik) / 2);

    ctx.save();
    ctx.font = '600 28px Poppins, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    harfAraligiUygula(ctx, '2px');
    ctx.fillText(veri.heroEtiket.toLocaleUpperCase('tr-TR'), GENISLIK / 2 + 2, heroIcerikBaslangicY + 30);
    ctx.restore();

    ortalanmisYaziCiz(ctx, String(veri.heroDeger), GENISLIK / 2, heroIcerikBaslangicY + 192, '800 190px Poppins, Arial, sans-serif', '#ffffff', heroGenislik - 80);

    if (veri.heroAlt) {
        ortalanmisYaziCiz(ctx, veri.heroAlt, GENISLIK / 2, heroIcerikBaslangicY + 262, '500 32px Poppins, Arial, sans-serif', 'rgba(255,255,255,0.85)', heroGenislik - 100);
    }

    // Kullanıcının kendi yazdığı opsiyonel mesaj — yazılmadıysa hiçbir şey çizilmez
    if (kullaniciMesaji) {
        ortalanmisYaziCiz(ctx, kullaniciMesaji, GENISLIK / 2, heroY + heroYukseklik + 72, '600 36px Poppins, Arial, sans-serif', '#ffffff', GENISLIK - 200);
    }

    cursorY = heroY + heroYukseklik + heroSonrasiBosluk;

    // Seçili metin alanları: her biri tam genişlikte, tek satırlık, alt alta bir satır —
    // solda etiket, sağda değer (vize/final gibi alanlar artık yan yana değil, alt alta).
    if (metinAlanlari.length > 0) {
        const kutuGenislik = heroGenislik;
        const kutuYukseklik = 140, kutuAralik = 22;
        metinAlanlari.slice(0, 4).forEach((alan, i) => {
            const x = 80;
            const y = cursorY + i * (kutuYukseklik + kutuAralik);
            yuvarlatilmisDikdortgenCiz(ctx, x, y, kutuGenislik, kutuYukseklik, 28);
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.10)';
            ctx.fill();
            ctx.restore();
            solaYasliSigdirYaziCiz(ctx, alan.label.toLocaleUpperCase('tr-TR'), x + 36, y + kutuYukseklik / 2 + 9, kutuGenislik * 0.42, '600 27px Poppins, Arial, sans-serif', 'rgba(255,255,255,0.72)', '2px');
            ctx.save();
            ctx.font = '800 58px Poppins, Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(String(alan.deger), x + kutuGenislik - 36, y + kutuYukseklik / 2 + 20);
            ctx.restore();
        });
        cursorY += Math.min(metinAlanlari.length, 4) * (kutuYukseklik + kutuAralik) + 20;
    }

    // Liste alanları (ör. ANO sekmesindeki ders adları) — sarılan hap/etiket listesi
    if (listeAlanlari.length > 0) {
        listeAlanlari.forEach(alan => {
            ctx.save();
            ctx.font = '600 26px Poppins, Arial, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.textAlign = 'left';
            harfAraligiUygula(ctx, '2px');
            ctx.fillText(alan.label.toLocaleUpperCase('tr-TR'), 80, cursorY);
            ctx.restore();
            cursorY += 40;
            cursorY = pilListesiCiz(ctx, alan.deger, 80, cursorY, GENISLIK - 160, veri.renk) + 30;
        });
    }

    // Alt bilgi — sabit konumda (tarih + site adı)
    const footerY = YUKSEKLIK - 90;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, footerY - 36);
    ctx.lineTo(GENISLIK - 80, footerY - 36);
    ctx.stroke();
    ctx.restore();

    const tarihMetni = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.save();
    ctx.font = '500 26px Poppins, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.textAlign = 'left';
    ctx.fillText(tarihMetni, 80, footerY + 10);
    ctx.restore();

    ctx.save();
    ctx.font = '700 30px Poppins, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    harfAraligiUygula(ctx, '0.5px');
    ctx.fillText('ktunotsimulatoru.com', GENISLIK - 80, footerY + 12);
    ctx.restore();
}

// "Kart İndir"e tıklanınca önizleme modalını açar: sonucu toplar, alan seçim
// kutucuklarını (checkbox'ları) oluşturur ve ilk önizlemeyi çizer.
function sonucKartModalAc(sekme) {
    const veri = sonucKartiVeriTopla(sekme);
    if (!veri) {
        toastGoster('⚠️ Önce bir hesaplama yapmalısınız.');
        return;
    }
    kartAktifVeri = { sekme, veri, dersAdi: '', mesaj: '', baslik: veri.baslik };
    const dersInput = document.getElementById('kart-ders-adi');
    const dersEtiket = document.getElementById('kart-ders-adi-etiket');
    if (dersInput) dersInput.value = '';
    // ANO sekmesinde "ders adı" değil, dönemi anlatan bir "başlık" giriliyor (ör. "Bahar Dönemi 2026").
    if (sekme === 'ano') {
        if (dersEtiket) dersEtiket.innerHTML = 'Başlık <span class="gano-opsiyonel">(opsiyonel)</span>';
        if (dersInput) dersInput.placeholder = 'Örn: Bahar Dönemi 2026';
    } else {
        if (dersEtiket) dersEtiket.innerHTML = 'Ders Adı <span class="gano-opsiyonel">(opsiyonel)</span>';
        if (dersInput) dersInput.placeholder = 'Örn: Matematik I';
    }
    const mesajInput = document.getElementById('kart-mesaj');
    if (mesajInput) {
        mesajInput.value = '';
        // Önerilen mesaj yalnızca placeholder olarak gösterilir; kullanıcı bir şey
        // yazmadığı sürece kartın üzerine hiçbir mesaj otomatik olarak çizilmez.
        mesajInput.placeholder = veri.onerilenMesaj ? `Örn: ${veri.onerilenMesaj}` : 'Kendi mesajını yaz';
    }
    kartAlanKutucuklariOlustur(veri);
    const modal = document.getElementById('kartOnizlemeModal');
    if (modal) modal.classList.add('aktif');
    document.body.style.overflow = 'hidden';
    kartOnizlemeGuncelle();
}

function kartModalKapat(event) {
    if (event && event.target !== document.getElementById('kartOnizlemeModal')) return;
    document.getElementById('kartOnizlemeModal')?.classList.remove('aktif');
    document.body.style.overflow = '';
}

// Sonuç verisindeki her alan için bir "Kartta Görünsün" checkbox satırı oluşturur.
function kartAlanKutucuklariOlustur(veri) {
    const kutu = document.getElementById('kart-alan-secim-alani');
    if (!kutu) return;
    kutu.innerHTML = '';
    veri.alanlar.forEach(alan => {
        const label = document.createElement('label');
        label.className = 'kart-checkbox-satir';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.alanKey = alan.key;
        checkbox.addEventListener('change', kartOnizlemeGuncelle);
        const span = document.createElement('span');
        span.textContent = alan.label;
        label.appendChild(checkbox);
        label.appendChild(span);
        kutu.appendChild(label);
    });
}

// Ders adı, mesaj girişi veya alan checkbox'ları değiştikçe kart önizlemesini yeniden çizer.
function kartOnizlemeGuncelle() {
    if (!kartAktifVeri) return;
    const dersInput = document.getElementById('kart-ders-adi');
    const dersAdi = dersInput ? dersInput.value.trim() : '';
    const mesajInput = document.getElementById('kart-mesaj');
    const mesaj = mesajInput ? mesajInput.value.trim() : '';
    kartAktifVeri.dersAdi = dersAdi;
    kartAktifVeri.mesaj = mesaj;
    kartAktifVeri.baslik = dersAdi || kartAktifVeri.veri.baslik;
    const kutu = document.getElementById('kart-alan-secim-alani');
    const seciliAnahtarlar = new Set();
    if (kutu) {
        kutu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.checked) seciliAnahtarlar.add(cb.dataset.alanKey);
        });
    }
    const seciliAlanlar = kartAktifVeri.veri.alanlar.filter(a => seciliAnahtarlar.has(a.key));
    kartCiz(kartAktifVeri.veri, dersAdi, mesaj, seciliAlanlar);
}

// Modaldaki güncel görünümü (o an ekranda duran #kart-canvas) PNG olarak indirir.
function kartPngIndir() {
    const canvas = document.getElementById('kart-canvas');
    if (!canvas) return;
    canvas.toBlob(blob => {
        if (!blob) { toastGoster('⚠️ Kart oluşturulamadı.'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ktu-not-sonucu-${kartAktifVeri ? kartAktifVeri.baslik.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/g, '-') : 'kart'}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toastGoster('✅ Kart indirildi!');
    }, 'image/png');
}

function urldenHesaplamaYukle() {
    try {
        urldenHesaplamaYukleIc();
    } catch (e) {
        // Bu fonksiyon, URL parametrelerini (özellikle fakülte/sistem/hedef değerlerini) doğrudan
        // querySelector seçici string'ine gömüyor; değerde bir tırnak (") karakteri geçen, bozuk
        // veya kasıtlı olarak hazırlanmış bir paylaşım linki burada bir SyntaxError fırlatabilirdi.
        // Bu fonksiyon DOMContentLoaded'ın başında, fakülte listesi/istatistik yüklemesinden ÖNCE
        // çağrıldığı için, yakalanmayan bir hata sayfanın geri kalan tüm başlangıç kodunun
        // (fakulteleriYukle, istatistikleriYukle, veri ekleme formunun submit dinleyicisi vb.)
        // hiç çalışmamasına yol açardı — bu yüzden burada sessizce yutuluyor.
        console.warn('urldenHesaplamaYukle: paylaşım linki işlenirken hata oluştu', e);
    }
}

function urldenHesaplamaYukleIc() {
    const params = new URLSearchParams(window.location.search);
    const sekme = params.get('sekme');
    if (!sekme) return;

    // Sekmeyi aç
    const tabBtn = document.querySelector(`.tab-button[onclick*="'${sekme}'"],[onclick*='"${sekme}"']`);
    if (tabBtn) openTab({ currentTarget: tabBtn }, sekme);

    if (sekme === 'harf') {
        const detay = params.get('detay');
        if (detay === '1') {
            const radio = document.getElementById('detayliGirisHarf');
            if (radio) { radio.checked = true; toggleInputFields('Harf'); }
            setVal('vize-notu-harf', params.get('vize'));
            setVal('vize-agirlik-harf', params.get('va'));
            setVal('odev-notu-harf', params.get('odev'));
            setVal('odev-agirlik-harf', params.get('oa'));
        } else {
            setVal('midterm-avg', params.get('vize'));
        }
        setVal('final-grade', params.get('final'));
        setVal('class-avg', params.get('ort'));
        setVal('class-stddev', params.get('std'));
        const fakulteHarf = params.get('fakulte');
        if (fakulteHarf) { const r = document.querySelector(`input[name="fakulteHarf"][value="${fakulteHarf}"]`); if (r) r.checked = true; }
        const sistemHarf = params.get('sistem');
        if (sistemHarf) { const r = document.querySelector(`input[name="hesaplamaSistemiHarf"][value="${sistemHarf}"]`); if (r) r.checked = true; }
        setVal('ogrenci-sayisi-harf', params.get('ogrsayi'));
        sistemSecimiDegisti('Harf');
        // Formu otomatik gönder
        setTimeout(() => document.getElementById('grade-calculator-form')?.dispatchEvent(new Event('submit', { bubbles: true })), 300);

    } else if (sekme === 'gerekli') {
        setVal('req-midterm-avg', params.get('vize'));
        setVal('req-class-avg', params.get('ort'));
        setVal('req-class-stddev', params.get('std'));
        const hedef = params.get('hedef');
        if (hedef) { const s = document.getElementById('target-grade'); if (s) s.value = hedef; }
        const fakulteGerekli = params.get('fakulte');
        if (fakulteGerekli) { const r = document.querySelector(`input[name="fakulteGerekli"][value="${fakulteGerekli}"]`); if (r) r.checked = true; }
        const sistemGerekli = params.get('sistem');
        if (sistemGerekli) { const r = document.querySelector(`input[name="hesaplamaSistemiGerekli"][value="${sistemGerekli}"]`); if (r) r.checked = true; }
        setVal('ogrenci-sayisi-gerekli', params.get('ogrsayi'));
        sistemSecimiDegisti('Gerekli');
        setTimeout(() => document.getElementById('required-grade-form')?.dispatchEvent(new Event('submit', { bubbles: true })), 300);

    } else if (sekme === 'senaryo') {
        setVal('scenario-midterm-avg', params.get('vize'));
        const hedef = params.get('hedef');
        if (hedef) {
            const r = document.querySelector(`input[name="scenarioTargetGrade"][value="${hedef}"]`);
            if (r) r.checked = true;
        }
        const fakulteSenaryo = params.get('fakulte');
        if (fakulteSenaryo) { const r = document.querySelector(`input[name="fakulteSenaryo"][value="${fakulteSenaryo}"]`); if (r) r.checked = true; }
        const sistemSenaryo = params.get('sistem');
        if (sistemSenaryo) { const r = document.querySelector(`input[name="hesaplamaSistemiSenaryo"][value="${sistemSenaryo}"]`); if (r) r.checked = true; }
        setVal('ogrenci-sayisi-senaryo', params.get('ogrsayi'));
        sistemSecimiDegisti('Senaryo');
        setTimeout(() => document.getElementById('scenario-form')?.dispatchEvent(new Event('submit', { bubbles: true })), 300);

    } else if (sekme === 'ano') {
        const derslerStr = params.get('dersler');
        if (!derslerStr) return;
        // Mevcut dersleri temizle
        document.getElementById('gano-dersler-listesi').innerHTML = '';
        ganoDersSayac = 0;
        const dersler = derslerStr.split(',');
        dersler.forEach(d => {
            const [ad, kredi, not] = d.split(':');
            ganoDersSayac++;
            const id = ganoDersSayac;
            const liste = document.getElementById('gano-dersler-listesi');
            const div = document.createElement('div');
            div.className = 'gano-ders-satir';
            div.id = `gano-ders-${id}`;
            div.innerHTML = buildGanoDersSatirHTML(id, decodeURIComponent(ad || ''), kredi || '', not || '');
            liste.appendChild(div);
        });
        ganoHesapla();
    }
}

function setVal(id, val) {
    if (!val) return;
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function escAttr(str) { return escHtml(str).replace(/"/g, '&quot;'); }

function buildGanoDersSatirHTML(id, ad, kredi, not) {
    const notler = ['AA','BA','BB','CB','CC','DC','DD','FD','FF','D','G','K'];
    const notLabels = { AA:'AA — 4.0', BA:'BA — 3.5', BB:'BB — 3.0', CB:'CB — 2.5', CC:'CC — 2.0',
        DC:'DC — 1.5 ⚠', DD:'DD — 1.0', FD:'FD — 0.5', FF:'FF — 0.0', D:'D — Devamsız', G:'G — Geçer', K:'K — Kalır' };
    // not (harf notu) sabit bir listeden (notler) geldiği için doğrudan karşılaştırılabilir;
    // ad ve kredi ise paylaşım linkindeki URL parametresinden geliyor (bkz. urldenHesaplamaYukle) —
    // kullanıcı kontrolünde oldukları için value attribute'una escAttr ile yazılıyor, aksi halde
    // özel hazırlanmış bir paylaşım linki HTML/JS enjekte edebilirdi.
    const opts = notler.map(n => `<option value="${n}" ${n === not ? 'selected' : ''}>${notLabels[n]}</option>`).join('');
    return `<div class="gano-ders-icerik">
        <div class="form-group gano-ders-adi-grup">
            <label>Ders Adı <span class="gano-opsiyonel">(opsiyonel)</span></label>
            <input type="text" class="gano-ders-adi-input" placeholder="Örn: Matematik I" value="${escAttr(ad)}" oninput="ganoSonucGecersizKil()">
        </div>
        <div class="form-group gano-kredi-grup">
            <label>Kredi <span class="zorunlu">*</span></label>
            <input type="number" class="gano-kredi-input" min="1" max="10" step="1" placeholder="3" value="${escAttr(kredi)}" oninput="ganoSonucGecersizKil()">
        </div>
        <div class="form-group gano-not-grup">
            <label>Harf Notu <span class="zorunlu">*</span></label>
            <select class="gano-not-input" onchange="ganoSonucGecersizKil()">
                <option value="">Seç</option>${opts}
            </select>
        </div>
        <button type="button" class="gano-ders-sil-btn" onclick="ganoDersSil(${id})" aria-label="Dersi kaldır">✕</button>
    </div>`;
}

// "Kart İndir" özelliği şimdilik pasif — kod (modal, canvas çizimi vb.) tamamen duruyor,
// yalnızca buton hiçbir sekmede görünmüyor. İleride tekrar açmak için bu satırı true yapmak yeterli.
const KART_INDIR_OZELLIGI_AKTIF = false;

// "Kart İndir" butonunu sonuç gelince göster
function sonucIndirButonuGoster(sekme) {
    if (!KART_INDIR_OZELLIGI_AKTIF) return;
    const idler = { harf: 'grade-indir-kutu', gerekli: 'gerekli-indir-kutu', ano: 'ano-indir-kutu' };
    const el = document.getElementById(idler[sekme]);
    if (el) el.style.display = 'flex';
}
async function sayfaGoruntulemeLogKaydet() {
    try {
        const referrerHam = document.referrer;
        let referrer = 'direkt';
        if (referrerHam) {
            try {
                const host = new URL(referrerHam).hostname.replace('www.', '');
                if (host.includes('google')) referrer = 'google';
                else if (host.includes('bing')) referrer = 'bing';
                else if (host.includes('yandex')) referrer = 'yandex';
                else if (host.includes('instagram')) referrer = 'instagram';
                else if (host.includes('twitter') || host.includes('x.com')) referrer = 'twitter';
                else if (host.includes('whatsapp')) referrer = 'whatsapp';
                else if (host.includes('t.me') || host.includes('telegram')) referrer = 'telegram';
                else referrer = host;
            } catch { referrer = 'diger'; }
        }
        await getSupabase().from('sayfa_goruntuleme').insert({
            is_mobile: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
            referrer
        });
    } catch (e) { /* sessizce geç */ }
}

const SUPABASE_URL = 'https://tsfscfgwbmiouptsljyi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7VUXgTfS6iYY3NU0IVwYpA_FRI0t7MI';
let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return supabaseClient;
}

const DERS_KODU_REGEX = /^[A-ZÇĞİÖŞÜ]{2,4}\d{3,4}$/;

function baslikFormatla(str) {
    return str.trim().replace(/\s+/g, ' ')
        .split(' ')
        .map(k => k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1).toLocaleLowerCase('tr-TR'))
        .join(' ');
}

function yilSecenekleriniDoldur() {
    const select = document.getElementById('ekle-yil');
    if (!select) return;
    const simdikiYil = new Date().getFullYear();
    for (let y = simdikiYil; y >= 2015; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `${y}-${y + 1}`;
        select.appendChild(opt);
    }
}

// === PAYLAŞIM SEKMESİ ===
// Ders adı, ziyaretçilerin "Dersim listede yok" alanına serbestçe yazdığı bir metin — admin
// onayladıktan sonra bu dersi seçen HERKESİN tarayıcısında görüntüleniyor. Bu yüzden ekrana
// yazılırken mutlaka kaçışlı (escaped) olmalı, yoksa ders adı bir XSS vektörüne dönüşür.
function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
}

let paylasimState = { fakulteId: null, bolumId: null, dersId: null, dersAdi: '', bolumAdi: '', fakulteAdi: '' };

async function fakulteleriYukle() {
    const { data, error } = await getSupabase().from('fakulteler').select('id, ad').order('ad');
    if (error || !data) return;
    const sel = document.getElementById('paylasim-fakulte');
    if (!sel) return;
    data.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.ad;
        sel.appendChild(opt);
    });
}

async function paylasimBolumYukle() {
    const sel = document.getElementById('paylasim-fakulte');
    const fakulteId = sel.value;
    const fakulteAdi = sel.options[sel.selectedIndex]?.text || '';
    paylasimState.fakulteId = fakulteId;
    paylasimState.fakulteAdi = fakulteAdi;
    paylasimState.bolumId = null;
    paylasimState.dersId = null;

    const bolumSel = document.getElementById('paylasim-bolum');
    const dersSel = document.getElementById('paylasim-ders');
    bolumSel.innerHTML = '<option value="">-- Bölüm Seçin --</option>';
    dersSel.innerHTML = '<option value="">-- Önce Bölüm Seçin --</option>';
    bolumSel.disabled = !fakulteId;
    dersSel.disabled = true;
    document.getElementById('yeni-ders-alani').style.display = 'none';
    paylasimSecimGuncelle(null);

    if (!fakulteId) return;
    const { data } = await getSupabase().from('bolumler').select('id, ad').eq('fakulte_id', fakulteId).order('ad');
    if (!data) return;
    data.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.ad;
        bolumSel.appendChild(opt);
    });
}

async function paylasimDersYukle() {
    const sel = document.getElementById('paylasim-bolum');
    const bolumId = sel.value;
    const bolumAdi = sel.options[sel.selectedIndex]?.text || '';
    paylasimState.bolumId = bolumId;
    paylasimState.bolumAdi = bolumAdi;
    paylasimState.dersId = null;

    const dersSel = document.getElementById('paylasim-ders');
    dersSel.innerHTML = '<option value="">-- Ders Seçin --</option>';
    dersSel.disabled = !bolumId;
    document.getElementById('yeni-ders-alani').style.display = 'none';
    paylasimSecimGuncelle(null);

    if (!bolumId) return;
    const { data } = await getSupabase().from('dersler').select('id, ders_adi, ders_kodu')
        .eq('bolum_id', bolumId).eq('onaylandi', true).order('ders_adi');
    if (!data) return;
    data.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.ders_kodu ? `${d.ders_kodu} — ${d.ders_adi}` : d.ders_adi;
        dersSel.appendChild(opt);
    });
    const yeniOpt = document.createElement('option');
    yeniOpt.value = 'yeni';
    yeniOpt.textContent = '➕ Dersim listede yok, önermek istiyorum';
    dersSel.appendChild(yeniOpt);
}

function paylasimDersSecildi() {
    const sel = document.getElementById('paylasim-ders');
    const dersId = sel.value;
    const dersAdi = sel.options[sel.selectedIndex]?.text || '';

    if (dersId === 'yeni') {
        paylasimState.dersId = 'yeni';
        paylasimState.dersAdi = '';
        document.getElementById('yeni-ders-alani').style.display = 'block';
        paylasimSecimGuncelle(null);
    } else if (dersId) {
        paylasimState.dersId = dersId;
        paylasimState.dersAdi = dersAdi;
        document.getElementById('yeni-ders-alani').style.display = 'none';
        paylasimSecimGuncelle({ id: dersId, ad: dersAdi });
        const goruntuleAktif = document.getElementById('veri-goruntule').classList.contains('active');
        if (goruntuleAktif) veriListele();
    } else {
        paylasimState.dersId = null;
        paylasimState.dersAdi = '';
        document.getElementById('yeni-ders-alani').style.display = 'none';
        paylasimSecimGuncelle(null);
    }
}

function paylasimSecimGuncelle(ders) {
    const gorAlan = document.getElementById('veri-goruntule');
    const ekleAlan = document.getElementById('veri-ekle');
    let mevcutBannerGor = gorAlan.querySelector('.secili-ders-banner');
    let mevcutBannerEkle = ekleAlan.querySelector('.secili-ders-banner');

    if (ders) {
        const bannerHTML = `<div class="secili-ders-banner">
            <div>
                <div class="secili-ders-banner-ad">📚 ${escHtml(ders.ad)}</div>
                <div class="secili-ders-banner-alt">${escHtml(paylasimState.bolumAdi)} · ${escHtml(paylasimState.fakulteAdi)}</div>
            </div>
            <button class="secili-ders-degistir" onclick="dersSecimSifirla()">Dersi Değiştir</button>
        </div>`;

        if (!mevcutBannerGor) {
            gorAlan.insertAdjacentHTML('afterbegin', bannerHTML);
        } else {
            mevcutBannerGor.outerHTML = bannerHTML;
        }
        if (!mevcutBannerEkle) {
            ekleAlan.insertAdjacentHTML('afterbegin', bannerHTML);
        } else {
            mevcutBannerEkle.outerHTML = bannerHTML;
        }
    } else {
        if (mevcutBannerGor) mevcutBannerGor.remove();
        if (mevcutBannerEkle) mevcutBannerEkle.remove();
    }
}

function dersSecimSifirla() {
    document.getElementById('paylasim-ders').value = '';
    paylasimState.dersId = null;
    paylasimState.dersAdi = '';
    paylasimSecimGuncelle(null);
    document.getElementById('veri-listesi').innerHTML = '<p class="veri-bos">Yukarıdan fakülte, bölüm ve ders seçerek verileri görüntüleyin.</p>';
}

// Bir dersin tüm paylaşılan çan verilerinden (canVerileri) küçük bir özet kutusu oluşturur:
// toplam paylaşım sayısı, ortalama HBN ortalaması/standart sapması, ortalama öğrenci sayısı ve
// hangi yıllar arasında veri olduğu. Hem "Ders Verileri" sekmesindeki (veriListele) hem de
// hesaplama formlarındaki "Bu Dersin Paylaşılan Verilerini Gör" modalında (modalVeriListele)
// aynı özet gösterilir.
function dersVeriOzetiOlustur(canVerileri) {
    const ortalamalar = canVerileri.map(v => v.ortalama).filter(v => v != null);
    const stdSapmalar = canVerileri.map(v => v.std_sapma).filter(v => v != null);
    const ogrenciSayilari = canVerileri.map(v => v.ogrenci_sayisi).filter(v => v != null);
    const yillar = canVerileri.map(v => v.yil).filter(v => v != null);

    const ort = arr => arr.length > 0 ? arr.reduce((s, x) => s + x, 0) / arr.length : null;
    const ortalamaHBN = ort(ortalamalar);
    const ortalamaStd = ort(stdSapmalar);
    const ortalamaOgrenci = ort(ogrenciSayilari);
    const finalSayisi = canVerileri.filter(v => v.can_turu !== 'but').length;
    const butSayisi = canVerileri.filter(v => v.can_turu === 'but').length;

    let yilAraligi = '';
    if (yillar.length > 0) {
        const minYil = Math.min(...yillar), maxYil = Math.max(...yillar);
        yilAraligi = minYil === maxYil ? `${minYil}-${minYil + 1}` : `${minYil}-${minYil + 1} … ${maxYil}-${maxYil + 1}`;
    }

    return `<div class="veri-ozet-kutu">
        <div class="veri-ozet-baslik">📊 ${canVerileri.length} paylaşım${yilAraligi ? ` <span class="veri-ozet-yil">(${yilAraligi})</span>` : ''}</div>
        <div class="veri-ozet-degerler">
            ${ortalamaHBN != null ? `<div class="veri-ozet-deger"><span class="veri-ozet-etiket">Ort. HBN</span><strong>${ortalamaHBN.toFixed(2)}</strong></div>` : ''}
            ${ortalamaStd != null ? `<div class="veri-ozet-deger"><span class="veri-ozet-etiket">Ort. Std. Sapma</span><strong>${ortalamaStd.toFixed(2)}</strong></div>` : ''}
            ${ortalamaOgrenci != null ? `<div class="veri-ozet-deger"><span class="veri-ozet-etiket">Ort. Öğrenci</span><strong>${Math.round(ortalamaOgrenci)}</strong></div>` : ''}
            <div class="veri-ozet-deger"><span class="veri-ozet-etiket">Final / Büt</span><strong>${finalSayisi} / ${butSayisi}</strong></div>
        </div>
    </div>`;
}

async function veriListele() {
    const dersId = paylasimState.dersId;
    const alan = document.getElementById('veri-listesi');

    if (!dersId || dersId === 'yeni') {
        alan.innerHTML = '<p class="veri-bos">Lütfen bir ders seçin.</p>';
        return;
    }

    alan.innerHTML = '<p class="veri-yukle">Yükleniyor...</p>';
    const { data, error } = await getSupabase()
        .from('ders_verileri')
        .select('veri_turu, ortalama, std_sapma, ogrenci_sayisi, can_turu, vize_ort, final_ort, but_ort, donem, yil')
        .eq('ders_id', dersId)
        .order('yil', { ascending: false })
        .order('donem');

    if (error || !data || data.length === 0) {
        alan.innerHTML = '<p class="veri-bos">Bu ders için henüz veri paylaşılmamış. "Veri Ekle" sekmesinden ilk sen paylaş!</p>';
        return;
    }

    // Sadece çan verilerini göster
    const canVerileri = data.filter(v => v.veri_turu === 'can' || (!v.veri_turu && v.ortalama != null));
    let html = canVerileri.length > 0 ? dersVeriOzetiOlustur(canVerileri) : '';
    html += '<div class="veri-kart-wrapper">';

    if (canVerileri.length > 0) {
        canVerileri.forEach(v => {
            const canEtiketi = v.can_turu === 'but' ? 'Bütünleme Çanı' : 'Final Çanı';
            html += `<div class="veri-kart">
                <div class="veri-kart-baslik">📅 ${v.yil}-${v.yil + 1} ${v.donem} — ${canEtiketi}</div>
                <div class="veri-kart-detay">
                    ${v.std_sapma != null ? `<span>Std. Sapma: <strong>${v.std_sapma.toFixed(2)}</strong></span>` : ''}
                    ${v.ortalama != null ? `<span>HBN Ort: <strong>${v.ortalama.toFixed(2)}</strong></span>` : ''}
                    ${v.ogrenci_sayisi != null ? `<span>Öğrenci: <strong>${v.ogrenci_sayisi}</strong></span>` : ''}
                </div>
            </div>`;
        });
    } else {
        html += '<p class="veri-bos">Bu ders için henüz çan verisi paylaşılmamış. "Veri Ekle" sekmesinden ilk sen paylaş!</p>';
    }

    html += '</div>';
    alan.innerHTML = html;
}

// Veri ekle formu submit
let veriEkleGonderiliyor = false;
async function veriEkleSubmit(e) {
    e.preventDefault();
    // Çift tıklama / yavaş bağlantıda sabırsız tekrar tıklama koruması — bu olmadan iki eşzamanlı
    // gönderim aynı yeni dersi iki kez onay bekleyen listesine ekleyebiliyordu.
    if (veriEkleGonderiliyor) return;
    veriEkleGonderiliyor = true;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const eskiBtnMetni = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Gönderiliyor...'; }
    try {
    const sonucAlani = document.getElementById('veri-ekle-sonuc');
    sonucAlani.style.display = 'block';
    sonucAlani.innerHTML = '<p>Gönderiliyor...</p>';

    let dersId = paylasimState.dersId;
    const bolumId = paylasimState.bolumId;
    const donem = document.getElementById('ekle-donem').value;
    const yil = parseInt(document.getElementById('ekle-yil').value);

    if (!bolumId || !dersId) { sonucAlani.innerHTML = '<p class="error-message">Lütfen yukarıdan fakülte, bölüm ve ders seçin.</p>'; return; }
    if (!donem) { sonucAlani.innerHTML = '<p class="error-message">Lütfen dönem seçin.</p>'; return; }
    if (!yil) { sonucAlani.innerHTML = '<p class="error-message">Lütfen yıl seçin.</p>'; return; }

    // Sadece çan verisi — sıra: std → ortalama → öğrenci sayısı
    const std = document.getElementById('ekle-std').value;
    const ortalama = document.getElementById('ekle-ortalama').value;
    const ogrenciSayisi = document.getElementById('ekle-ogrenci-sayisi').value;
    const canTuru = document.querySelector('input[name="canTuru"]:checked').value;

    if (!ortalama) { sonucAlani.innerHTML = '<p class="error-message">Ham başarı ortalaması (HBN) zorunludur.</p>'; return; }

    const ortVal = parseFloat(ortalama);
    if (isNaN(ortVal) || ortVal < 0 || ortVal > 100) { sonucAlani.innerHTML = '<p class="error-message">Ortalama 0-100 arasında olmalıdır.</p>'; return; }

    let insertData = {
        donem,
        yil,
        veri_turu: 'can',
        ortalama: ortVal,
        can_turu: canTuru
    };

    if (std) {
        const stdVal = parseFloat(std);
        if (isNaN(stdVal) || stdVal < 0 || stdVal > 50) { sonucAlani.innerHTML = '<p class="error-message">Standart sapma 0-50 arasında olmalıdır.</p>'; return; }
        insertData.std_sapma = stdVal;
    }

    if (ogrenciSayisi) {
        const n = parseInt(ogrenciSayisi);
        if (isNaN(n) || n < 1) { sonucAlani.innerHTML = '<p class="error-message">Öğrenci sayısı en az 1 olmalıdır.</p>'; return; }
        insertData.ogrenci_sayisi = n;
    }

    // Yeni ders eklenecekse
    if (dersId === 'yeni') {
        let dersAdi = document.getElementById('yeni-ders-adi').value.trim();
        let dersKodu = document.getElementById('yeni-ders-kodu').value.trim().toLocaleUpperCase('tr-TR');

        if (!dersAdi || dersAdi.length < 5) { sonucAlani.innerHTML = '<p class="error-message">Ders adı en az 5 karakter olmalıdır.</p>'; return; }
        if (dersKodu && !DERS_KODU_REGEX.test(dersKodu)) { sonucAlani.innerHTML = '<p class="error-message">Ders kodu formatı hatalı. Örnek: BLM301, MAT201</p>'; return; }

        dersAdi = baslikFormatla(dersAdi);
        document.getElementById('yeni-ders-adi').value = dersAdi;

        const { data: mevcutOnay } = await getSupabase()
            .from('dersler').select('id, onaylandi')
            .eq('bolum_id', bolumId).ilike('ders_adi', dersAdi).maybeSingle();

        if (mevcutOnay) {
            if (!mevcutOnay.onaylandi) { sonucAlani.innerHTML = '<p class="error-message">Bu ders zaten onay bekliyor. Onaylandıktan sonra veri ekleyebilirsin.</p>'; return; }
            dersId = mevcutOnay.id;
        } else {
            const { data: yeniDers, error: dersHata } = await getSupabase()
                .from('dersler')
                .insert({ bolum_id: bolumId, ders_adi: dersAdi, ders_kodu: dersKodu || null, onaylandi: false })
                .select('id').single();
            if (dersHata || !yeniDers) {
                console.error('Ders insert hatası:', dersHata);
                sonucAlani.innerHTML = `<p class="error-message">Ders eklenirken hata oluştu: ${dersHata?.message || 'Bilinmeyen hata'} (kod: ${dersHata?.code || '-'})</p>`;
                return;
            }
            dersId = yeniDers.id;
            sonucAlani.innerHTML = `<p>✅ <strong>"${escHtml(dersAdi)}"</strong> dersi onay için gönderildi. Verini de kaydettik, ders onaylandıktan sonra görünecek.</p>`;
        }
    }

    insertData.ders_id = dersId;
    const { error: veriHata } = await getSupabase().from('ders_verileri').insert(insertData);
    if (veriHata) { sonucAlani.innerHTML = '<p class="error-message">Veri kaydedilirken hata oluştu: ' + veriHata.message + '</p>'; return; }

    if (paylasimState.dersId !== 'yeni') {
        sonucAlani.innerHTML = '<p>✅ Veriniz başarıyla kaydedildi. Teşekkürler! 🎉</p>';
    }

    // Formu sıfırla ve ders seçimini temizle
    document.getElementById('veri-ekle-form').reset();

    // Ders seçimini tamamen sıfırla
    paylasimState.dersId = null;
    paylasimState.dersAdi = '';
    document.getElementById('paylasim-ders').value = '';
    document.getElementById('yeni-ders-alani').style.display = 'none';
    paylasimSecimGuncelle(null);
    document.getElementById('veri-listesi').innerHTML = '<p class="veri-bos">Yukarıdan fakülte, bölüm ve ders seçerek verileri görüntüleyin.</p>';
    } finally {
        veriEkleGonderiliyor = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = eskiBtnMetni; }
    }
}

// Sekme geçişi
function switchVeriTab(tab) {
    document.querySelectorAll('.veri-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.veri-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.veri-tab-btn[onclick="switchVeriTab('${tab}')"]`).classList.add('active');
    document.getElementById(`veri-${tab}`).classList.add('active');
    if (tab === 'goruntule' && paylasimState.dersId && paylasimState.dersId !== 'yeni') {
        veriListele();
    }
}

function dersiGoruntule(dersAdi, bolumAdi, fakulteAdi) {
    openTab(null, 'veriPaylasim');
    document.querySelectorAll('.tab-button').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('onclick')?.includes('veriPaylasim')) b.classList.add('active');
    });
    switchVeriTab('goruntule');
}

function dersiLinkGoster(containerId, dersAdiBilgisi) {
    const alan = document.getElementById(containerId);
    if (!alan) return;
    alan.innerHTML = `<button class="ders-verisi-link-btn" onclick="openTab(null,'veriPaylasim'); document.querySelectorAll('.tab-button').forEach(b=>{b.classList.remove('active'); if(b.getAttribute('onclick')?.includes('veriPaylasim')) b.classList.add('active');}); switchVeriTab('goruntule');">
        📊 Bu Dersin Paylaşılan Verilerini Gör
    </button>`;
}


// =============================================
// DERS VERİSİ MODAL
// =============================================
let modalFakulteleriYuklendi = false;
let modalFakulteleriPromise = null;
let aktifModalForm = null;

// Fakülte listesini yalnızca bir kez çeker; sayfa yüklenirken başlatılan ön-yükleme ile
// modalAc()'ın kendi çağrısı aynı anda gelirse bile (kullanıcı çok hızlı tıklarsa) iki kez
// fetch edilip seçim kutusuna yinelenen seçenekler eklenmesini önler.
function modalFakulteleriHazirla() {
    if (modalFakulteleriYuklendi) return Promise.resolve();
    if (!modalFakulteleriPromise) {
        modalFakulteleriPromise = modalFakulteleriYukle().then(() => { modalFakulteleriYuklendi = true; });
    }
    return modalFakulteleriPromise;
}

async function modalAc(formTipi) {
    aktifModalForm = formTipi;
    const modal = document.getElementById('dersVeriModal');
    const kutu = modal.querySelector('.modal-kutu');
    document.body.style.overflow = 'hidden';
    if (kutu) {
        kutu.style.animation = 'none';
        modal.classList.add('aktif');
        void kutu.offsetHeight;
        kutu.style.animation = '';
    } else {
        modal.classList.add('aktif');
    }

    await modalFakulteleriHazirla();

    document.getElementById('modal-veri-alani').innerHTML = '<p class="veri-bos">Fakülte, bölüm ve ders seçerek verileri görüntüleyin.</p>';
}

function modalKapat(event) {
    if (event && event.target !== document.getElementById('dersVeriModal')) return;
    document.getElementById('dersVeriModal').classList.remove('aktif');
    document.body.style.overflow = '';
}

// Modalda görüntülenen dersin verisini paylaşmak isteyen kullanıcıyı, aynı ders seçiliyken
// "Ders Verileri" sekmesinin "Veri Ekle" ekranına yönlendirir.
async function dersVeriModalPaylasaGit() {
    const fakulteId = document.getElementById('modal-fakulte')?.value || '';
    const bolumId = document.getElementById('modal-bolum')?.value || '';
    const dersId = document.getElementById('modal-ders')?.value || '';

    modalKapat(null);
    openTab(null, 'veriPaylasim');
    document.querySelectorAll('.tab-button').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('onclick')?.includes('veriPaylasim')) b.classList.add('active');
    });

    if (fakulteId) {
        const paylasimFakulteSel = document.getElementById('paylasim-fakulte');
        if (paylasimFakulteSel && [...paylasimFakulteSel.options].some(o => o.value === fakulteId)) {
            paylasimFakulteSel.value = fakulteId;
            await paylasimBolumYukle();
            if (bolumId) {
                const paylasimBolumSel = document.getElementById('paylasim-bolum');
                if (paylasimBolumSel && [...paylasimBolumSel.options].some(o => o.value === bolumId)) {
                    paylasimBolumSel.value = bolumId;
                    await paylasimDersYukle();
                    if (dersId) {
                        const paylasimDersSel = document.getElementById('paylasim-ders');
                        if (paylasimDersSel && [...paylasimDersSel.options].some(o => o.value === dersId)) {
                            paylasimDersSel.value = dersId;
                            paylasimDersSecildi();
                        }
                    }
                }
            }
        }
    }
    switchVeriTab('ekle');

    // Hangi dersi seçtiğini görebilmesi için sekmenin en üstüne (fakülte/bölüm/ders seçim alanına) kaydır.
    const veriPaylasimAlani = document.getElementById('veriPaylasim');
    if (veriPaylasimAlani) veriPaylasimAlani.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function modalFakulteleriYukle() {
    const { data } = await getSupabase().from('fakulteler').select('id, ad').order('ad');
    if (!data) return;
    const sel = document.getElementById('modal-fakulte');
    data.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.ad;
        sel.appendChild(opt);
    });
}

async function modalBolumYukle() {
    const fakulteId = document.getElementById('modal-fakulte').value;
    const bolumSel = document.getElementById('modal-bolum');
    const dersSel = document.getElementById('modal-ders');
    bolumSel.innerHTML = '<option value="">-- Bölüm Seçin --</option>';
    dersSel.innerHTML = '<option value="">-- Önce Bölüm Seçin --</option>';
    bolumSel.disabled = !fakulteId;
    dersSel.disabled = true;
    document.getElementById('modal-veri-alani').innerHTML = '<p class="veri-bos">Bölüm ve ders seçin.</p>';
    if (!fakulteId) return;
    const { data } = await getSupabase().from('bolumler').select('id, ad').eq('fakulte_id', fakulteId).order('ad');
    if (!data) return;
    data.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.ad;
        bolumSel.appendChild(opt);
    });
}

async function modalDersYukle() {
    const bolumId = document.getElementById('modal-bolum').value;
    const dersSel = document.getElementById('modal-ders');
    dersSel.innerHTML = '<option value="">-- Ders Seçin --</option>';
    dersSel.disabled = !bolumId;
    document.getElementById('modal-veri-alani').innerHTML = '<p class="veri-bos">Ders seçin.</p>';
    if (!bolumId) return;
    const { data } = await getSupabase().from('dersler').select('id, ders_adi, ders_kodu')
        .eq('bolum_id', bolumId).eq('onaylandi', true).order('ders_adi');
    if (!data) return;
    data.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.ders_kodu ? `${d.ders_kodu} — ${d.ders_adi}` : d.ders_adi;
        dersSel.appendChild(opt);
    });
}

async function modalVeriListele() {
    const dersId = document.getElementById('modal-ders').value;
    const alan = document.getElementById('modal-veri-alani');
    if (!dersId) { alan.innerHTML = '<p class="veri-bos">Ders seçin.</p>'; return; }

    alan.innerHTML = '<p class="veri-yukle">Yükleniyor...</p>';
    const { data, error } = await getSupabase()
        .from('ders_verileri')
        .select('veri_turu, ortalama, std_sapma, ogrenci_sayisi, can_turu, donem, yil')
        .eq('ders_id', dersId)
        .order('yil', { ascending: false })
        .order('donem');

    if (error || !data || data.length === 0) {
        alan.innerHTML = '<p class="veri-bos">Bu ders için henüz veri paylaşılmamış.</p>';
        return;
    }

    // Sadece çan verilerini göster
    const canVerileri = data.filter(v => v.veri_turu === 'can' || (!v.veri_turu && v.ortalama != null));
    let html = canVerileri.length > 0 ? dersVeriOzetiOlustur(canVerileri) : '';
    html += '<div class="veri-kart-wrapper">';

    if (canVerileri.length > 0) {
        canVerileri.forEach(v => {
            const canEtiketi = v.can_turu === 'but' ? 'Bütünleme Çanı' : 'Final Çanı';
            const doldurmaBilgi = (v.ortalama != null && v.std_sapma != null)
                ? `<button class="veri-doldur-btn" onclick="modalVeriyiDoldur(${v.ortalama}, ${v.std_sapma})">↙ Forma Doldur</button>`
                : '';
            html += `<div class="veri-kart">
                <div class="veri-kart-baslik">📅 ${v.yil}-${v.yil+1} ${v.donem} — ${canEtiketi}</div>
                <div class="veri-kart-detay">
                    ${v.std_sapma != null ? `<span>Std. Sapma: <strong>${v.std_sapma.toFixed(2)}</strong></span>` : ''}
                    ${v.ortalama != null ? `<span>HBN Ort: <strong>${v.ortalama.toFixed(2)}</strong></span>` : ''}
                    ${v.ogrenci_sayisi != null ? `<span>Öğrenci: <strong>${v.ogrenci_sayisi}</strong></span>` : ''}
                </div>
                ${doldurmaBilgi}
            </div>`;
        });
    } else {
        html += '<p class="veri-bos">Bu ders için henüz çan verisi paylaşılmamış.</p>';
    }

    html += '</div>';
    alan.innerHTML = html;
}

function modalVeriyiDoldur(ort, std) {
    if (aktifModalForm === 'harf') {
        document.getElementById('class-avg').value = ort;
        document.getElementById('class-stddev').value = std;
    } else if (aktifModalForm === 'gerekli') {
        document.getElementById('req-class-avg').value = ort;
        document.getElementById('req-class-stddev').value = std;
    }
    document.getElementById('dersVeriModal').classList.remove('aktif');
    document.body.style.overflow = '';
}

// ESC ile modal kapat
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById('dersVeriModal')?.classList.remove('aktif');
        document.getElementById('sistemBilgiModal')?.classList.remove('aktif');
        document.body.style.overflow = '';
    }
});

// ============================================================
// HESAPLAMA LOGLAMA & İSTATİSTİKSEVER
// ============================================================

// ============================================================
// ENGAGEMENT TRACKING — tekrar_hesaplama & hesaplama_suresi
// ============================================================
const _sayfaYuklemZamani = Date.now();
const _sekmeSayaclari = {}; // { 'harf': 3, 'gerekli': 1, ... }

function _engagementVerisiAl(sekme) {
    _sekmeSayaclari[sekme] = (_sekmeSayaclari[sekme] || 0) + 1;
    const sure = Math.round((Date.now() - _sayfaYuklemZamani) / 1000);
    return {
        tekrar_hesaplama: _sekmeSayaclari[sekme],
        hesaplama_suresi: Math.min(sure, 7200) // max 2 saat
    };
}

async function hesaplamaLogKaydet(sekme, harfNotu, vizeNotu, finalNotu, ekstra = {}) {
    try {
        const { tekrar_hesaplama, hesaplama_suresi } = _engagementVerisiAl(sekme);
        const insertData = { sekme, tekrar_hesaplama, hesaplama_suresi };
        if (harfNotu) insertData.harf_notu = harfNotu;
        if (vizeNotu !== null && vizeNotu !== undefined) insertData.vize_notu = Math.round(vizeNotu);
        if (finalNotu !== null && finalNotu !== undefined) insertData.final_notu = Math.round(finalNotu);
        if (ekstra.ano !== undefined)             insertData.ano             = parseFloat(ekstra.ano.toFixed(2));
        if (ekstra.ders_sayisi !== undefined)     insertData.ders_sayisi     = ekstra.ders_sayisi;
        if (ekstra.toplam_kredi !== undefined)    insertData.toplam_kredi    = ekstra.toplam_kredi;
        if (ekstra.basarisiz_sayi !== undefined)  insertData.basarisiz_sayi  = ekstra.basarisiz_sayi;
        if (ekstra.dc_sayi !== undefined)         insertData.dc_sayi         = ekstra.dc_sayi;
        if (ekstra.hedef_harf_notu !== undefined) insertData.hedef_harf_notu = ekstra.hedef_harf_notu;
        if (ekstra.sinif_ortalamasi !== undefined) insertData.sinif_ortalamasi = ekstra.sinif_ortalamasi;
        if (ekstra.std_sapma !== undefined)       insertData.std_sapma       = ekstra.std_sapma;
        if (ekstra.sistem_secimi !== undefined)   insertData.sistem_secimi   = ekstra.sistem_secimi;
        if (ekstra.fakulte_turu !== undefined)    insertData.fakulte_turu    = ekstra.fakulte_turu;
        insertData.is_mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        await getSupabase().from('hesaplama_loglari').insert(insertData);
    } catch (e) { /* sessizce geç */ }
}

async function anoDersGrupLogKaydet(anoDegeri, toplamKredi, dersAdlari) {
    try {
        const sb = getSupabase();
        // Önce grup oluştur
        const { data: grup, error: grupHata } = await sb
            .from('ano_hesaplama_gruplari')
            .insert({ ano_degeri: anoDegeri, toplam_kredi: toplamKredi })
            .select('id')
            .single();
        if (grupHata || !grup) return;
        // Sonra dersleri ekle
        const dersRows = dersAdlari.map(ad => ({ grup_id: grup.id, ders_adi: ad }));
        await sb.from('ano_ders_loglari').insert(dersRows);
    } catch (e) { /* sessizce geç */ }
}

async function istatistikleriYukle() {
    try {
        const sb = getSupabase();

        const HARF_LISTESI = ['AA','BA','BB','CB','CC','DC','DD','FD','FF'];

        // Tüm sorgular paralel — count tabanlı, satır limiti yok
        const [
            { count: genelToplam },
            { count: harfSayisi },
            { count: gerekliSayisi },
            { count: senaryoSayisi },
            { count: anoSayisiSekme },
            ...harfCountler
        ] = await Promise.all([
            sb.from('hesaplama_loglari').select('*', { count: 'exact', head: true }),
            sb.from('hesaplama_loglari').select('*', { count: 'exact', head: true }).eq('sekme', 'harf'),
            sb.from('hesaplama_loglari').select('*', { count: 'exact', head: true }).eq('sekme', 'gerekli'),
            sb.from('hesaplama_loglari').select('*', { count: 'exact', head: true }).eq('sekme', 'senaryo'),
            sb.from('hesaplama_loglari').select('*', { count: 'exact', head: true }).eq('sekme', 'ano'),
            ...HARF_LISTESI.map(h =>
                sb.from('hesaplama_loglari').select('*', { count: 'exact', head: true }).eq('harf_notu', h)
            )
        ]);

        const sekmeSayilari = {
            harf: harfSayisi || 0,
            gerekli: gerekliSayisi || 0,
            senaryo: senaryoSayisi || 0,
            ano: anoSayisiSekme || 0
        };

        // Harf dağılımı — her harf için count
        const harfSayac = {};
        HARF_LISTESI.forEach((h, i) => {
            if (harfCountler[i]?.count > 0) harfSayac[h] = harfCountler[i].count;
        });

        // Vize/final en çok girilen — bunlar az veri, 1000 yeterli
        const { data: notData } = await sb
            .from('hesaplama_loglari')
            .select('vize_notu, final_notu')
            .eq('sekme', 'harf')
            .not('final_notu', 'is', null)
            .limit(1000);

        const vizeSayac = {}, finalSayac = {};
        let final45Sayisi = 0;
        notData?.forEach(r => {
            if (r.vize_notu !== null) vizeSayac[r.vize_notu] = (vizeSayac[r.vize_notu] || 0) + 1;
            if (r.final_notu !== null) finalSayac[r.final_notu] = (finalSayac[r.final_notu] || 0) + 1;
            if (r.final_notu === 45) final45Sayisi++;
        });

        // final45 doğru sayım için count sorgusu
        const { count: final45Count } = await sb
            .from('hesaplama_loglari')
            .select('*', { count: 'exact', head: true })
            .eq('sekme', 'harf')
            .eq('final_notu', 45);

        // ANO ortalaması — Supabase tek istekte varsayılan olarak en fazla 1000 satır döndürdüğü için
        // (limit(10000) verilse bile), tüm kayıtları sayfalama (range) ile çekip öyle ortalıyoruz.
        let anoToplam = 0, anoSayisi = 0;
        {
            let anoSayfa = 0;
            const anoSayfaBoyutu = 1000;
            while (true) {
                const { data: anoSayfaVerisi } = await sb
                    .from('hesaplama_loglari')
                    .select('ano')
                    .eq('sekme', 'ano')
                    .not('ano', 'is', null)
                    .range(anoSayfa * anoSayfaBoyutu, anoSayfa * anoSayfaBoyutu + anoSayfaBoyutu - 1);
                if (!anoSayfaVerisi || anoSayfaVerisi.length === 0) break;
                anoSayfaVerisi.forEach(r => { anoToplam += parseFloat(r.ano); anoSayisi++; });
                if (anoSayfaVerisi.length < anoSayfaBoyutu) break;
                anoSayfa++;
            }
        }

        const topHarfler = Object.entries(harfSayac).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([not]) => not);
        const topVize = Object.entries(vizeSayac).sort((a, b) => b[1] - a[1])[0];
        const topFinal = Object.entries(finalSayac).sort((a, b) => b[1] - a[1])[0];
        const anoOrtalama = anoSayisi > 0 ? anoToplam / anoSayisi : null;

        istatistikleriGoster(genelToplam || 0, sekmeSayilari, topHarfler, topVize, topFinal, harfSayac, final45Count || 0, anoOrtalama, anoSayisi);

    } catch (e) {
        console.error('İstatistik yükleme hatası:', e);
    }
}

function istatistikleriGoster(toplam, sekmeler, topHarfler, topVize, topFinal, harfSayac, final45Sayisi, anoOrtalama, anoSayisi) {
    const el = document.getElementById('footer-istatistikler');
    if (!el) return;

    const harfBadge = (not) => not
        ? `<span class="stat-harf-badge stat-badge-${not.toLowerCase()}">${not}</span>`
        : '<span style="color:var(--small-text)">—</span>';

    const HARF_SIRALAMA = ['AA','BA','BB','CB','CC','DC','DD','FD','FF'];
    const HARF_RENKLER = {
        AA: '#28a745', BA: '#5cb85c', BB: '#82ca9c',
        CB: '#007bff', CC: '#17a2b8', DC: '#fd7e14',
        DD: '#ffc107', FD: '#dc3545', FF: '#a21427'
    };

    const grafikEtiketler = HARF_SIRALAMA.filter(h => harfSayac[h]);
    const grafikVeriler = grafikEtiketler.map(h => harfSayac[h]);
    const grafikRenkler = grafikEtiketler.map(h => HARF_RENKLER[h]);

    el.innerHTML = `
        <div class="stat-grid">
            <div class="stat-blok">
                <div class="stat-blok-baslik">🔢 Toplam Hesaplama</div>
                <div class="stat-buyuk">${toplam.toLocaleString('tr-TR')}</div>
                <div class="stat-alt-satirlar">
                    <span>Harf Notu: <strong>${sekmeler.harf.toLocaleString('tr-TR')}</strong></span>
                    <span>Gerekli Final: <strong>${sekmeler.gerekli.toLocaleString('tr-TR')}</strong></span>
                    <span>Senaryo: <strong>${sekmeler.senaryo.toLocaleString('tr-TR')}</strong></span>
                    <span>Dönem Ort.: <strong>${sekmeler.ano.toLocaleString('tr-TR')}</strong></span>
                </div>
            </div>
            <div class="stat-blok">
                <div class="stat-blok-baslik">🏆 En Çok Çıkan Notlar</div>
                <div class="stat-harfler">
                    <div class="stat-harf-item"><span class="stat-sira">1.</span>${harfBadge(topHarfler[0])}</div>
                    <div class="stat-harf-item"><span class="stat-sira">2.</span>${harfBadge(topHarfler[1])}</div>
                    <div class="stat-harf-item"><span class="stat-sira">3.</span>${harfBadge(topHarfler[2])}</div>
                </div>
            </div>
            <div class="stat-blok">
                <div class="stat-blok-baslik">📝 En Çok Girilen Notlar <span class="stat-kucuk-not">(Harf Notu Hesaplama)</span></div>
                <div class="stat-not-satirlar">
                    <div class="stat-not-satir">
                        <span class="stat-not-etiket">Vize</span>
                        <span class="stat-not-deger">${topVize ? topVize[0] : '—'}</span>
                    </div>
                    <div class="stat-not-satir">
                        <span class="stat-not-etiket">Final</span>
                        <span class="stat-not-deger">${topFinal ? topFinal[0] : '—'}</span>
                    </div>
                </div>
            </div>
            <div class="stat-blok">
                <div class="stat-blok-baslik">😅 "Finalden 45 Alırsam Ne Gelir?"</div>
                <div class="stat-buyuk">${final45Sayisi.toLocaleString('tr-TR')}</div>
                <div class="stat-alt-satirlar">
                    <span>kez hesaplandı</span>
                </div>
            </div>
            <div class="stat-blok">
                <div class="stat-blok-baslik">🎓 Ortalama ANO</div>
                <div class="stat-buyuk ${anoOrtalama !== null ? (anoOrtalama >= 3.0 ? 'stat-ano-iyi' : anoOrtalama >= 2.0 ? 'stat-ano-orta' : 'stat-ano-dusuk') : ''}">
                    ${anoOrtalama !== null ? anoOrtalama.toFixed(2) : '—'}
                </div>
                <div class="stat-alt-satirlar">
                    <span>${anoSayisi.toLocaleString('tr-TR')} hesaplamadan</span>
                </div>
            </div>
        </div>

        ${grafikEtiketler.length > 0 ? `
        <div class="stat-grafik-wrapper">
            <div class="stat-blok-baslik" style="margin-bottom:12px;">🍩 Harf Notu Dağılımı</div>
            <div class="stat-grafik-icerik">
                <div class="stat-pasta-container">
                    <canvas id="harfDagilimChart"></canvas>
                </div>
                <div class="stat-pasta-legend">
                    ${grafikEtiketler.map((h, i) => {
                        const yuzde = ((grafikVeriler[i] / grafikVeriler.reduce((a,b) => a+b, 0)) * 100).toFixed(1);
                        return `<div class="stat-legend-item">
                            <span class="stat-legend-renk" style="background:${grafikRenkler[i]}"></span>
                            <span class="stat-legend-etiket">${h}</span>
                            <span class="stat-legend-deger">${yuzde}%</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>` : ''}

        <div class="stat-gizlilik">
            🔒 Bu istatistikler tamamen anonimdir. Kişisel hiçbir veri (isim, öğrenci numarası, IP adresi vb.) toplanmamaktadır.
        </div>
        <div class="stat-kaynak-notu">📅 09.05.2026 tarihinden itibaren</div>
    `;

    if (grafikEtiketler.length > 0) {
        setTimeout(() => {
            const canvas = document.getElementById('harfDagilimChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: grafikEtiketler,
                    datasets: [{
                        data: grafikVeriler,
                        backgroundColor: grafikRenkler,
                        borderWidth: 2,
                        borderColor: getComputedStyle(document.documentElement)
                            .getPropertyValue('--main-bg').trim() || '#fff',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '60%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const toplam = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const yuzde = ((ctx.parsed / toplam) * 100).toFixed(1);
                                    return ` ${ctx.label}: ${ctx.parsed} hesaplama (${yuzde}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }, 100);
    }
}