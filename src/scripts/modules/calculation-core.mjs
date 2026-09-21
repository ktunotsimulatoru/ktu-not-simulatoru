
// --- Sabitler ve Veri Yapıları (Global Kapsamda) ---
// KTÜ Senato Kararı 24.03.2026-363/8 (2026-2027 döneminden itibaren geçerli) — Tablo-3 Mutlak Değerlendirme aralıkları
const MUTLAK_DEGERLENDIRME_ARALIKLARI = { "AA": [86, 100], "BA": [78, 85.99], "BB": [70, 77.99], "CB": [60, 69.99], "CC": [50, 59.99], "DC": [45, 49.99], "DD": [38, 44.99], "FD": [30, 37.99], "FF": [0, 29.99], };

const HARF_NOTU_KATSAYILARI = { "AA": 4.0, "BA": 3.5, "BB": 3.0, "CB": 2.5, "CC": 2.0, "DC": 1.5, "DD": 1.0, "FD": 0.5, "FF": 0.0 };

const MINIMUM_FINAL_NOTU_VARSAYILAN = 45;

// KTÜ Usul ve Esaslar Madde 8 — final/bütünleme sınavından alınması gereken en az puan, fakülteye göre değişir.
const MINIMUM_FINAL_NOTU_FAKULTE = { genel: 45, saglik: 50, eczacilik: 60 };

const T_SKOR_ARALIKLARI_ORTALAMAYA_GORE = { "0_42.5": { "FF": [-Infinity, 35.99], "FD": [36, 40.99], "DD": [41, 45.99], "DC": [46, 50.99], "CC": [51, 55.99], "CB": [56, 60.99], "BB": [61, 65.99], "BA": [66, 70.99], "AA": [71, Infinity] }, "42.5_47.5": { "FF": [-Infinity, 33.99], "FD": [34, 38.99], "DD": [39, 43.99], "DC": [44, 48.99], "CC": [49, 53.99], "CB": [54, 58.99], "BB": [59, 63.99], "BA": [64, 68.99], "AA": [69, Infinity] }, "47.5_52.5": { "FF": [-Infinity, 31.99], "FD": [32, 36.99], "DD": [37, 41.99], "DC": [42, 46.99], "CC": [47, 51.99], "CB": [52, 56.99], "BB": [57, 61.99], "BA": [62, 66.99], "AA": [67, Infinity] }, "52.5_57.5": { "FF": [-Infinity, 29.99], "FD": [30, 34.99], "DD": [35, 39.99], "DC": [40, 44.99], "CC": [45, 49.99], "CB": [50, 54.99], "BB": [55, 59.99], "BA": [60, 64.99], "AA": [65, Infinity] }, "57.5_62.5": { "FF": [-Infinity, 27.99], "FD": [28, 32.99], "DD": [33, 37.99], "DC": [38, 42.99], "CC": [43, 47.99], "CB": [48, 52.99], "BB": [53, 57.99], "BA": [58, 62.99], "AA": [63, Infinity] }, "62.5_70": { "FF": [-Infinity, 25.99], "FD": [26, 30.99], "DD": [31, 35.99], "DC": [36, 40.99], "CC": [41, 45.99], "CB": [46, 50.99], "BB": [51, 55.99], "BA": [56, 60.99], "AA": [61, Infinity] }, "70_80": { "FF": [-Infinity, 23.99], "FD": [24, 28.99], "DD": [29, 33.99], "DC": [34, 38.99], "CC": [39, 43.99], "CB": [44, 48.99], "BB": [49, 53.99], "BA": [54, 58.99], "AA": [59, Infinity] } };



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


// Ortak hesaplama çekirdeği. Ekranlar ve ters hesap aynı yuvarlama sırasını kullanır.
function hesaplaDersNotu({ araSinavKatkisi, finalNotu, sistem = 'tablo1', ortalama, standartSapma, minimumFinal = 45 }) {
    if (![araSinavKatkisi, finalNotu, minimumFinal].every(Number.isFinite) ||
        araSinavKatkisi < 0 || araSinavKatkisi > 50 || finalNotu < 0 || finalNotu > 100 ||
        minimumFinal < 0 || minimumFinal > 100 || !['mutlak', 'tablo1', 'tablo2'].includes(sistem)) {
        throw new RangeError('Geçersiz not veya değerlendirme sistemi.');
    }
    if (sistem !== 'mutlak' && (!Number.isFinite(ortalama) || ortalama < 0 || ortalama > 100 ||
        (ortalama < 80 && (!Number.isFinite(standartSapma) || standartSapma <= 0)))) {
        throw new RangeError('Geçersiz sınıf ortalaması veya standart sapma.');
    }
    const hbn = Number((araSinavKatkisi + finalNotu * 0.5).toFixed(2));
    const mutlakNot = getMutlakDegerlendirmeNotu(hbn);
    let harfNotu = mutlakNot, bagilNot = null, tSkoruHam = null, tSkoru = null, tablo2Bilgi = null;
    if (finalNotu < minimumFinal || (sistem !== 'mutlak' && hbn < 30)) {
        harfNotu = 'FF';
    } else if (sistem !== 'mutlak' && ortalama < 80) {
        tSkoruHam = ((hbn - ortalama) / standartSapma) * 10 + 50;
        tSkoru = Math.round(tSkoruHam);
        if (sistem === 'tablo2') tablo2Bilgi = getTablo2TahminiHarfNotu(tSkoru, ortalama);
        bagilNot = sistem === 'tablo2' ? tablo2Bilgi?.harfNotu : getBagilDegerlendirmeNotuTskor(tSkoru, ortalama);
        harfNotu = karsilastirHarfNotlari(bagilNot, mutlakNot);
    }
    return { harfNotu, hbn, mutlakNot, bagilNot, tSkoruHam, tSkoru, tablo2Bilgi };
}


// 0,01 puan çözünürlükte, hedef veya daha yüksek nota ulaşan EN KÜÇÜK final.
// Yuvarlama ve mutlak/bağıl karşılaştırmayı ters formülle yaklaşık hesaplamak
// yerine monoton ortak çekirdekte ikili arama yapılır. Ulaşılamayan hedef null.
function gerekenFinaliHesapla(ayarlar, hedefNot) {
    if (!Object.hasOwn(HARF_NOTU_KATSAYILARI, hedefNot)) throw new RangeError('Geçersiz hedef not.');
    const hedef = HARF_NOTU_KATSAYILARI[hedefNot];
    const yeterli = puan => HARF_NOTU_KATSAYILARI[hesaplaDersNotu({ ...ayarlar, finalNotu: puan / 100 }).harfNotu] >= hedef;
    if (!yeterli(10000)) return null;
    let alt = 0, ust = 10000;
    while (alt < ust) {
        const orta = Math.floor((alt + ust) / 2);
        if (yeterli(orta)) ust = orta;
        else alt = orta + 1;
    }
    return alt / 100;
}


function gerekenFinalAciklamasi(ayarlar, hedefNot, gerekenFinal) {
    const adimlar = ['Harf notu hesaplayıcısıyla aynı HBN ve T-skoru yuvarlamaları, final barajı ve bağıl/mutlak karşılaştırması uygulandı.'];
    if (gerekenFinal === null) {
        adimlar.push(`Finalden 100 alınsa bile hedeflenen <strong>${hedefNot}</strong> notuna ulaşılamıyor.`);
    } else {
        const sonuc = hesaplaDersNotu({ ...ayarlar, finalNotu: gerekenFinal });
        adimlar.push(`Final <strong>${gerekenFinal.toFixed(2)}</strong> olduğunda HBN <strong>${sonuc.hbn.toFixed(2)}</strong>, harf notu <strong>${sonuc.harfNotu}</strong> olur.`);
        adimlar.push('Gösterilen değer, 0,01 puan adımlarıyla hedefe veya daha yüksek bir nota ulaşan en düşük finaldir. Final notları tam sayı giriliyorsa bu değeri yukarı yuvarlayın.');
    }
    return adimlar;
}
export { MUTLAK_DEGERLENDIRME_ARALIKLARI, HARF_NOTU_KATSAYILARI, MINIMUM_FINAL_NOTU_VARSAYILAN, MINIMUM_FINAL_NOTU_FAKULTE, T_SKOR_ARALIKLARI_ORTALAMAYA_GORE, getMutlakDegerlendirmeNotu, getBagilDegerlendirmeNotuTskor, karsilastirHarfNotlari, getHedefNotIcinMinTskor, TABLO_2_YUZDELER_ORTALAMAYA_GORE, TABLO_2_HARF_SIRASI, getSinifDuzeyiAnahtari, standartNormalCDF, standartNormalInverseCDF, getTablo2TahminiHarfNotu, getTablo2TahminiMinTskor, hesaplaDersNotu, gerekenFinaliHesapla, gerekenFinalAciklamasi };
