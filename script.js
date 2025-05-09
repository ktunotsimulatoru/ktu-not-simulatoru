// --- Sabitler ve Veri Yapıları (Global Kapsamda) ---
const MUTLAK_DEGERLENDIRME_ARALIKLARI = { "AA": [90, 100], "BA": [80, 89.99], "BB": [75, 79.99], "CB": [70, 74.99], "CC": [60, 69.99], "DC": [50, 59.99], "DD": [40, 49.99], "FD": [30, 39.99], "FF": [0, 29.99], };
const HARF_NOTU_KATSAYILARI = { "AA": 4.0, "BA": 3.5, "BB": 3.0, "CB": 2.5, "CC": 2.0, "DC": 1.5, "DD": 1.0, "FD": 0.5, "FF": 0.0 };
const MINIMUM_FINAL_NOTU_VARSAYILAN = 45;
const T_SKOR_ARALIKLARI_ORTALAMAYA_GORE = { "0_42.5": { "FF": [-Infinity, 35.99], "FD": [36, 40.99], "DD": [41, 45.99], "DC": [46, 50.99], "CC": [51, 55.99], "CB": [56, 60.99], "BB": [61, 65.99], "BA": [66, 70.99], "AA": [71, Infinity] }, "42.5_47.5": { "FF": [-Infinity, 33.99], "FD": [34, 38.99], "DD": [39, 43.99], "DC": [44, 48.99], "CC": [49, 53.99], "CB": [54, 58.99], "BB": [59, 63.99], "BA": [64, 68.99], "AA": [69, Infinity] }, "47.5_52.5": { "FF": [-Infinity, 31.99], "FD": [32, 36.99], "DD": [37, 41.99], "DC": [42, 46.99], "CC": [47, 51.99], "CB": [52, 56.99], "BB": [57, 61.99], "BA": [62, 66.99], "AA": [67, Infinity] }, "52.5_57.5": { "FF": [-Infinity, 29.99], "FD": [30, 34.99], "DD": [35, 39.99], "DC": [40, 44.99], "CC": [45, 49.99], "CB": [50, 54.99], "BB": [55, 59.99], "BA": [60, 64.99], "AA": [65, Infinity] }, "57.5_62.5": { "FF": [-Infinity, 27.99], "FD": [28, 32.99], "DD": [33, 37.99], "DC": [38, 42.99], "CC": [43, 47.99], "CB": [48, 52.99], "BB": [53, 57.99], "BA": [58, 62.99], "AA": [63, Infinity] }, "62.5_70": { "FF": [-Infinity, 25.99], "FD": [26, 30.99], "DD": [31, 35.99], "DC": [36, 40.99], "CC": [41, 45.99], "CB": [46, 50.99], "BB": [51, 55.99], "BA": [56, 60.99], "AA": [61, Infinity] }, "70_80": { "FF": [-Infinity, 23.99], "FD": [24, 28.99], "DD": [29, 33.99], "DC": [34, 38.99], "CC": [39, 43.99], "CB": [44, 48.99], "BB": [49, 53.99], "BA": [54, 58.99], "AA": [59, Infinity] } };

// --- Yardımcı Fonksiyonlar (Global Kapsamda) ---
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
        if (sinifOrtalamasi > 0 && sinifOrtalamasi <= 42.5) {
            hedefAralikAnahtari = "0_42.5";
        } else {
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
    if (sinifOrtalamasi >= 80) {
        console.warn("getHedefNotIcinMinTskor: Sınıf ortalaması >= 80 ise T-skoru anlamsızdır, Mutlak Sistem geçerlidir.");
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
    return minT === -Infinity ? null : minT;
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

            if (secilenYontem === 'tek') {
                const araSinavOrtalamasiInput = document.getElementById('midterm-avg');
                araSinavKatkisi = parseFloat(araSinavOrtalamasiInput.value);
                araSinavOrtalamasiInput.required = true;
                if (isNaN(araSinavKatkisi) || araSinavKatkisi < 0 || araSinavKatkisi > 100) {
                    hataGoster(harfNotuSonucAlani, "Hata: Geçerli bir ara sınav ortalaması girin (0-100).");
                    gecerliGiris = false;
                }
                document.getElementById('vize-notu-harf').required = false;
                document.getElementById('vize-agirlik-harf').required = false;
                document.getElementById('odev-notu-harf').required = false;
                document.getElementById('odev-agirlik-harf').required = false;
            } else {
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
                } else if (Math.abs(vizeAgirlik + odevAgirlik - 50) > 0.01) {
                    hataGoster(harfNotuSonucAlani, "Hata: Detaylı girişteki ağırlıkların (vize+ödev) HBN'ye toplam katkısı %50 olmalıdır.");
                    gecerliGiris = false;
                } else {
                    araSinavKatkisi = (vizeNotu * vizeAgirlik / 100) + (odevNotu * odevAgirlik / 100);
                }
            }

            if (isNaN(finalNotu) || isNaN(sinifOrtalamasi) || isNaN(sinifStandartSapma)) {
                hataGoster(harfNotuSonucAlani, "Hata: Lütfen Final Notu, Sınıf Ortalaması ve Standart Sapma alanlarını sayısal olarak doldurun.");
                gecerliGiris = false;
            }
            if (finalNotu < 0 || finalNotu > 100 || sinifOrtalamasi < 0 || sinifOrtalamasi > 100 || sinifStandartSapma < 0) {
                hataGoster(harfNotuSonucAlani, "Hata: Final Notu ve ortalama 0-100, standart sapma 0 veya üzeri olmalıdır.");
                gecerliGiris = false;
            }
            if (!gecerliGiris) return;

            let hamBasariNotu = 0;
            if (secilenYontem === 'tek') {
                 hamBasariNotu = (araSinavKatkisi * 0.50) + (finalNotu * 0.50);
            } else {
                 hamBasariNotu = araSinavKatkisi + (finalNotu * 0.50);
            }

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
                if (sinifOrtalamasi >= 80) {
                    harfNotu = mutlakNotKarsiligi;
                    anaMesaj = `Sınıf ortalaması (${sinifOrtalamasi.toFixed(2)}) 80 veya üzeri olduğu için notunuz doğrudan Mutlak Değerlendirme Sistemine (Tablo-3) göre belirlenmiştir.`;
                    hesaplamaDetaylari = `Mutlak Değerlendirme (Tablo-3) sonucu: <strong>${mutlakNotKarsiligi}</strong>.`;
                } else {
                    if (sinifStandartSapma === 0) {
                        hataGoster(harfNotuSonucAlani, "Hata: Sınıf Ortalaması 80'den düşük olduğunda Standart Sapma 0 olamaz. Bu durumda bağıl değerlendirme yapılamaz.");
                        return;
                    }
                    tSkoru = ((hamBasariNotu - sinifOrtalamasi) / sinifStandartSapma) * 10 + 50;
                    tSkoru = Math.round(tSkoru * 100) / 100;
                    const bagilNot = getBagilDegerlendirmeNotuTskor(tSkoru, sinifOrtalamasi);
                    if (bagilNot === null) {
                        anaMesaj = `Bağıl değerlendirme için T-Skor (${tSkoru.toFixed(2)}) karşılığı bir harf notu aralığı bulunamadı (Sınıf Ort: ${sinifOrtalamasi.toFixed(2)}). Bu durumda Mutlak Değerlendirme (Tablo-3) notunuz esas alınmıştır.`;
                        harfNotu = mutlakNotKarsiligi;
                        hesaplamaDetaylari = `Mutlak Değerlendirme (Tablo-3) sonucu: <strong>${mutlakNotKarsiligi}</strong>.`;
                    } else {
                        harfNotu = karsilastirHarfNotlari(bagilNot, mutlakNotKarsiligi);
                        hesaplamaDetaylari = `Hesaplanan T-Skoru: <strong>${tSkoru.toFixed(2)}</strong>.<br>`;
                        hesaplamaDetaylari += `T-skoruna göre Bağıl Değerlendirme notu: <strong>${bagilNot}</strong>.<br>`;
                        hesaplamaDetaylari += `Ham Başarı Notunun Mutlak Değerlendirme (Tablo-3) karşılığı: <strong>${mutlakNotKarsiligi}</strong>.<br>`;
                        if (harfNotu === mutlakNotKarsiligi && harfNotu !== bagilNot && bagilNot !== null) {
                            hesaplamaDetaylari += `Mutlak değerlendirme notunuz (${mutlakNotKarsiligi}), bağıl notunuzdan (${bagilNot}) daha iyi olduğu için esas alınmıştır (KTÜ Yön. Madde 9, Alt Madde 6).<br>`;
                        } else if (harfNotu === bagilNot && harfNotu !== mutlakNotKarsiligi) {
                             hesaplamaDetaylari += `Bağıl değerlendirme notunuz (${bagilNot}) esas alınmıştır.<br>`;
                        } else if (harfNotu === bagilNot && harfNotu === mutlakNotKarsiligi && bagilNot !== null) {
                            hesaplamaDetaylari += `Bağıl ve Mutlak değerlendirme notlarınız aynı (${harfNotu}) olduğu için bu not esas alınmıştır.<br>`;
                        }
                    }
                }
            }
            let sonucMesaji = "";
            if (anaMesaj) {
                sonucMesaji += `<p>${anaMesaj}</p><hr class="input-separator">`;
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

    if (gerekliNotFormu) {
        gerekliNotFormu.addEventListener('submit', (event) => {
            event.preventDefault();
            gerekliNotSonucAlani.innerHTML = "<p>Hesaplanıyor...</p>";
            let araSinavHBNKatkisi = 0;
            let gecerliGiris = true;
            const secilenYontem = gerekliNotFormu.querySelector('input[name="hesaplamaYontemiGerekli"]:checked').value;

            if (secilenYontem === 'tek') {
                const araSinavOrtalamasiInput = document.getElementById('req-midterm-avg');
                const araSinavOrtalamasi = parseFloat(araSinavOrtalamasiInput.value);
                araSinavOrtalamasiInput.required = true;
                if (isNaN(araSinavOrtalamasi) || araSinavOrtalamasi < 0 || araSinavOrtalamasi > 100) {
                    hataGoster(gerekliNotSonucAlani, "Hata: Geçerli bir ara sınav ortalaması girin (0-100)."); gecerliGiris = false;
                } else {
                    araSinavHBNKatkisi = araSinavOrtalamasi * 0.50;
                }
                document.getElementById('vize-notu-gerekli').required = false; document.getElementById('vize-agirlik-gerekli').required = false;
                document.getElementById('odev-notu-gerekli').required = false; document.getElementById('odev-agirlik-gerekli').required = false;
            } else {
                document.getElementById('req-midterm-avg').required = false;
                const vizeNotu = parseFloat(document.getElementById('vize-notu-gerekli').value);
                const vizeAgirlik = parseFloat(document.getElementById('vize-agirlik-gerekli').value);
                const odevNotu = parseFloat(document.getElementById('odev-notu-gerekli').value);
                const odevAgirlik = parseFloat(document.getElementById('odev-agirlik-gerekli').value);
                document.getElementById('vize-notu-gerekli').required = true; document.getElementById('vize-agirlik-gerekli').required = true;
                document.getElementById('odev-notu-gerekli').required = true; document.getElementById('odev-agirlik-gerekli').required = true;
                if (isNaN(vizeNotu) || isNaN(vizeAgirlik) || isNaN(odevNotu) || isNaN(odevAgirlik) ||
                    vizeNotu < 0 || vizeNotu > 100 || odevNotu < 0 || odevNotu > 100 ||
                    vizeAgirlik < 0 || vizeAgirlik > 50 || odevAgirlik < 0 || odevAgirlik > 50) {
                    hataGoster(gerekliNotSonucAlani, "Hata: Lütfen detaylı giriş alanlarını (notlar 0-100, ağırlıklar 0-50) doğru şekilde doldurun."); gecerliGiris = false;
                } else if (Math.abs(vizeAgirlik + odevAgirlik - 50) > 0.01) {
                    hataGoster(gerekliNotSonucAlani, "Hata: Detaylı girişteki ağırlıkların (vize+ödev) HBN'ye toplam katkısı %50 olmalıdır."); gecerliGiris = false;
                } else {
                    araSinavHBNKatkisi = (vizeNotu * vizeAgirlik / 100) + (odevNotu * odevAgirlik / 100);
                }
            }
            const hedefHarfNotu = document.getElementById('target-grade').value;
            const sinifOrtalamasi = parseFloat(document.getElementById('req-class-avg').value);
            const sinifStandartSapma = parseFloat(document.getElementById('req-class-stddev').value);
            if (!hedefHarfNotu || isNaN(sinifOrtalamasi) || isNaN(sinifStandartSapma)) {
                hataGoster(gerekliNotSonucAlani, "Hata: Lütfen Hedef Not, Sınıf Ortalaması ve Standart Sapma alanlarını doğru şekilde doldurun."); gecerliGiris = false;
            }
            if (sinifOrtalamasi < 0 || sinifOrtalamasi > 100 || sinifStandartSapma < 0) {
                hataGoster(gerekliNotSonucAlani, "Hata: Sınıf Ortalaması 0-100, standart sapma 0 veya üzeri olmalıdır."); gecerliGiris = false;
            }
            if (!gecerliGiris) return;

            let sonucMetni = "";
            let anaMesaj = "";
            let hesaplamaDetaylari = "";
            let sistemTuru = "";

            if (sinifOrtalamasi >= 80) {
                sistemTuru = "Mutlak Sistem";
                const mutlakAralik = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                if (!mutlakAralik) {
                    hataGoster(gerekliNotSonucAlani, `Hata: Hedeflenen harf notu (${hedefHarfNotu}) için mutlak değerlendirme aralığı bulunamadı.`);
                    return;
                }
                const hedefHamBasariNotu = mutlakAralik[0];
                let gerekenFinalNotu = (hedefHamBasariNotu - araSinavHBNKatkisi) / 0.50;
                gerekenFinalNotu = Math.max(0, gerekenFinalNotu);
                const gerekenFinalNotuYuvarla = Math.ceil(gerekenFinalNotu * 100) / 100;
                hesaplamaDetaylari = `Sınıf ortalaması (${sinifOrtalamasi.toFixed(2)}) 80 veya üzeri olduğu için Mutlak Değerlendirme (Tablo-3) hedeflenmiştir.<br>`;
                hesaplamaDetaylari += `Hedeflenen <strong>${hedefHarfNotu}</strong> notu için Mutlak Sistemde gereken Ham Başarı Notu alt sınırı: <strong>${hedefHamBasariNotu.toFixed(2)}</strong>.<br>`;
                if (gerekenFinalNotuYuvarla > 100) {
                    anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotu.toFixed(2)}) ulaşmak için gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}) <strong>100'den yüksek</strong>. Bu hedefe ulaşmak imkansız.`;
                    sonucMetni = "İmkansız (>100)";
                } else if (gerekenFinalNotuYuvarla < MINIMUM_FINAL_NOTU_VARSAYILAN) {
                     anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotu.toFixed(2)}) ulaşmak için teorik olarak gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}), minimum final (${MINIMUM_FINAL_NOTU_VARSAYILAN}) sınırının altındadır. Yine de finalden <strong>en az ${MINIMUM_FINAL_NOTU_VARSAYILAN}</strong> almalısınız.`;
                    sonucMetni = `En az ${MINIMUM_FINAL_NOTU_VARSAYILAN} <small>(Hesap: ${gerekenFinalNotuYuvarla.toFixed(2)})</small>`;
                } else {
                    anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotu.toFixed(2)}) ulaşmak için finalden <strong>en az ${gerekenFinalNotuYuvarla.toFixed(2)}</strong> almanız gerekmektedir.`;
                    sonucMetni = gerekenFinalNotuYuvarla.toFixed(2);
                }
            } else {
                sistemTuru = "Bağıl Sistem";
                if (sinifStandartSapma === 0) {
                    hataGoster(gerekliNotSonucAlani, "Hata: Sınıf Ortalaması 80'den düşük ise Standart Sapma 0 olamaz. Bağıl hesaplama yapılamaz."); return;
                }
                const minimumTskor = getHedefNotIcinMinTskor(hedefHarfNotu, sinifOrtalamasi);
                if (minimumTskor === null) {
                    hataGoster(gerekliNotSonucAlani, `Hata: Hedeflenen "${hedefHarfNotu}" notu için T-skor aralığı bulunamadı (Sınıf Ort: ${sinifOrtalamasi.toFixed(2)}).`);
                    return;
                }
                let hedefHamBasariNotuBagil = ((minimumTskor - 50) / 10) * sinifStandartSapma + sinifOrtalamasi;
                let gerekenFinalNotu = (hedefHamBasariNotuBagil - araSinavHBNKatkisi) / 0.50;
                gerekenFinalNotu = Math.max(0, gerekenFinalNotu);
                const gerekenFinalNotuYuvarla = Math.ceil(gerekenFinalNotu * 100) / 100;
                hesaplamaDetaylari = `Hedeflenen <strong>${hedefHarfNotu}</strong> notu (Bağıl Değerlendirme) için;<br>`;
                hesaplamaDetaylari += `- Gerekli min. T-Skoru: ${minimumTskor.toFixed(2)} (Sınıf Ort: ${sinifOrtalamasi.toFixed(2)}, Std Sapma: ${sinifStandartSapma.toFixed(2)})<br>`;
                hesaplamaDetaylari += `- Bu T-skoruna ulaşmak için gereken minimum Ham Başarı Notu (Bağıl): <strong>${hedefHamBasariNotuBagil.toFixed(2)}</strong><br>`;
                const mutlakNotKarsiligiHBN = getMutlakDegerlendirmeNotu(hedefHamBasariNotuBagil);
                hesaplamaDetaylari += `<small style='color:#555;'>(Bu HBN (${hedefHamBasariNotuBagil.toFixed(2)}) Mutlak Sistemde yaklaşık ${mutlakNotKarsiligiHBN} notuna denk gelir.)</small>`;
                if (gerekenFinalNotuYuvarla > 100) {
                    anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}) <strong>100'den yüksek</strong>. Bu hedefe ulaşmak imkansız.`;
                    sonucMetni = "İmkansız (>100)";
                } else if (gerekenFinalNotuYuvarla < MINIMUM_FINAL_NOTU_VARSAYILAN) {
                    anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için teorik olarak gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}), minimum final (${MINIMUM_FINAL_NOTU_VARSAYILAN}) sınırının altındadır. Finalden <strong>en az ${MINIMUM_FINAL_NOTU_VARSAYILAN}</strong> almanız gerekmektedir. Bu durumda hedeflediğiniz ${hedefHarfNotu} notuna ulaşamayabilirsiniz.`;
                    sonucMetni = `En az ${MINIMUM_FINAL_NOTU_VARSAYILAN} <small>(Hesap: ${gerekenFinalNotuYuvarla.toFixed(2)})</small>`;
                } else {
                    anaMesaj = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için finalden <strong>en az ${gerekenFinalNotuYuvarla.toFixed(2)}</strong> almanız gerekmektedir.`;
                    sonucMetni = gerekenFinalNotuYuvarla.toFixed(2);
                }
            }
            let sonucMesaji = `Gereken Final Notu (${sistemTuru}): <strong style="font-size: 1.2em;">${sonucMetni}</strong><br><hr class="input-separator">`;
            sonucMesaji += `<p>${anaMesaj}</p>`;
            sonucMesaji += `<details style="margin-top: 10px; font-size: 0.9em; color: #555;"><summary>Hesaplama Detayları</summary><p style="margin-top: 5px;">${hesaplamaDetaylari}</p></details>`;
            gerekliNotSonucAlani.innerHTML = sonucMesaji;
        });
    }

    if (senaryoFormu) {
        senaryoFormu.addEventListener('submit', (event) => {
            event.preventDefault();
            senaryoTabloAlani.innerHTML = "<p>Senaryolar Hesaplanıyor...</p>";
            let araSinavHBNKatkisi = 0;
            let gecerliGiris = true;
            const secilenYontem = senaryoFormu.querySelector('input[name="hesaplamaYontemiSenaryo"]:checked').value;

            if (secilenYontem === 'tek') {
                const araSinavOrtalamasiInput = document.getElementById('scenario-midterm-avg');
                const araSinavOrtalamasi = parseFloat(araSinavOrtalamasiInput.value);
                araSinavOrtalamasiInput.required = true;
                if (isNaN(araSinavOrtalamasi) || araSinavOrtalamasi < 0 || araSinavOrtalamasi > 100) {
                    hataGoster(senaryoTabloAlani, "Hata: Geçerli bir ara sınav ortalaması girin (0-100)."); gecerliGiris = false;
                } else {
                    araSinavHBNKatkisi = araSinavOrtalamasi * 0.50;
                }
                document.getElementById('vize-notu-senaryo').required = false; document.getElementById('vize-agirlik-senaryo').required = false;
                document.getElementById('odev-notu-senaryo').required = false; document.getElementById('odev-agirlik-senaryo').required = false;
            } else {
                document.getElementById('scenario-midterm-avg').required = false;
                const vizeNotu = parseFloat(document.getElementById('vize-notu-senaryo').value);
                const vizeAgirlik = parseFloat(document.getElementById('vize-agirlik-senaryo').value);
                const odevNotu = parseFloat(document.getElementById('odev-notu-senaryo').value);
                const odevAgirlik = parseFloat(document.getElementById('odev-agirlik-senaryo').value);
                document.getElementById('vize-notu-senaryo').required = true; document.getElementById('vize-agirlik-senaryo').required = true;
                document.getElementById('odev-notu-senaryo').required = true; document.getElementById('odev-agirlik-senaryo').required = true;
                if (isNaN(vizeNotu) || isNaN(vizeAgirlik) || isNaN(odevNotu) || isNaN(odevAgirlik) ||
                    vizeNotu < 0 || vizeNotu > 100 || odevNotu < 0 || odevNotu > 100 ||
                    vizeAgirlik < 0 || vizeAgirlik > 50 || odevAgirlik < 0 || odevAgirlik > 50) {
                    hataGoster(senaryoTabloAlani, "Hata: Lütfen detaylı giriş alanlarını (notlar 0-100, ağırlıklar 0-50) doğru şekilde doldurun."); gecerliGiris = false;
                } else if (Math.abs(vizeAgirlik + odevAgirlik - 50) > 0.01) {
                    hataGoster(senaryoTabloAlani, "Hata: Detaylı girişteki ağırlıkların (vize+ödev) HBN'ye toplam katkısı %50 olmalıdır."); gecerliGiris = false;
                } else {
                    araSinavHBNKatkisi = (vizeNotu * vizeAgirlik / 100) + (odevNotu * odevAgirlik / 100);
                }
            }
            if (!gecerliGiris) return;

            const hedefHarfNotu = senaryoFormu.querySelector('input[name="scenarioTargetGrade"]:checked').value;
            const senaryoOrtalamalar = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
            const senaryoStdSapmalar = [8, 10, 12, 15, 18, 20, 22, 25];

            let tabloHTML = `<table>`;
            // CAPTION KALDIRILDI

            tabloHTML += `<thead><tr>`;
            tabloHTML += `<th scope="col" style="text-align:center; min-width:140px; vertical-align: middle;">
                                <div style='font-weight:bold; font-size:0.9em; padding-bottom:2px;'>Sınıf Ortalaması (→)</div>
                                <hr style='margin:0; border-style: solid; border-width: 0 0 1px 0; border-color: var(--input-focus-border);'>
                                <div style='font-weight:bold; font-size:0.9em; padding-top:2px;'>Std. Sapma (↓)</div>
                           </th>`;
            senaryoOrtalamalar.forEach(ort => {
                tabloHTML += `<th scope="col" title="Bu sütun, Sınıf Ortalamasının ${ort} olduğu senaryoyu gösterir">${ort}</th>`;
            });
            tabloHTML += `<th scope="col" title="Sınıf Ortalaması 80 ve üzeri olduğunda Mutlak Değerlendirme Sistemi geçerlidir. Bu sütun bu durumu gösterir.">&ge;80 <br><small style='font-weight:normal'>(Mutlak)</small></th>`;
            tabloHTML += `</tr></thead><tbody>`;

            let ornekOrtalama = null, ornekStdSapma = null, ornekGerekenNot = null;
            let ilkUygunOrnekBulundu = false;

            senaryoStdSapmalar.forEach(stdSapma => {
                tabloHTML += `<tr><th scope="row" title="Bu satır, Standart Sapmanın ${stdSapma} olduğu senaryoyu gösterir">${stdSapma}</th>`;
                senaryoOrtalamalar.forEach(ortalama => {
                    let gerekenFinalNotu = "-"; let cellClass = "impossible";
                    if (ortalama < 80) {
                         if (stdSapma === 0) {
                            gerekenFinalNotu = "-"; 
                            cellClass = "impossible";
                        } else {
                            const minimumTskor = getHedefNotIcinMinTskor(hedefHarfNotu, ortalama);
                            if (minimumTskor !== null) {
                                let hedefHamBasariNotuNihai = ((minimumTskor - 50) / 10) * stdSapma + ortalama;
                                let hesaplananFinal = (hedefHamBasariNotuNihai - araSinavHBNKatkisi) / 0.50;
                                hesaplananFinal = Math.max(0, hesaplananFinal);
                                if (hesaplananFinal > 100) { gerekenFinalNotu = "100+"; cellClass = "impossible"; }
                                else if (hesaplananFinal < MINIMUM_FINAL_NOTU_VARSAYILAN) { gerekenFinalNotu = `Min ${MINIMUM_FINAL_NOTU_VARSAYILAN}`; cellClass = "min-final"; }
                                else { gerekenFinalNotu = Math.ceil(hesaplananFinal).toString(); cellClass = ""; }

                                if (!ilkUygunOrnekBulundu && cellClass === "") {
                                    ornekOrtalama = ortalama;
                                    ornekStdSapma = stdSapma;
                                    ornekGerekenNot = gerekenFinalNotu;
                                    ilkUygunOrnekBulundu = true;
                                }
                            } else { 
                                 gerekenFinalNotu = "-"; cellClass = "impossible";
                            }
                        }
                    } else {
                        gerekenFinalNotu = "-"; cellClass = "impossible";
                    }
                    tabloHTML += `<td class="${cellClass}">${gerekenFinalNotu}</td>`;
                });

                const mutlakAralikSenaryo = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                let gerekenFinalMutlak = "-"; let cellClassMutlak = "impossible";
                if (mutlakAralikSenaryo) {
                    const hedefHBNSenaryoMutlak = mutlakAralikSenaryo[0];
                    let hesaplananFinalMutlak = (hedefHBNSenaryoMutlak - araSinavHBNKatkisi) / 0.50;
                    hesaplananFinalMutlak = Math.max(0, hesaplananFinalMutlak);
                    if (hesaplananFinalMutlak > 100) { gerekenFinalMutlak = "100+"; }
                    else if (hesaplananFinalMutlak < MINIMUM_FINAL_NOTU_VARSAYILAN) { gerekenFinalMutlak = `Min ${MINIMUM_FINAL_NOTU_VARSAYILAN}`; cellClassMutlak = "min-final"; }
                    else { gerekenFinalMutlak = Math.ceil(hesaplananFinalMutlak).toString(); cellClassMutlak = ""; }
                }
                tabloHTML += `<td class="${cellClassMutlak}" title="Sınıf Ort. ≥ 80 (Mutlak Sistem). Std. Sapma bu durumda anlamsızdır.">${gerekenFinalMutlak}</td>`;
                tabloHTML += `</tr>`;
            });
            tabloHTML += `</tbody></table>`;

            // --- KULLANICININ SEÇTİĞİ "ALTERNATİF C" METNİ ---
            let aciklamaHTML = `<div class="scenario-explanation" style="margin-top: 20px; font-size: 0.9em; line-height: 1.5; text-align: left;">`;
            aciklamaHTML += `<p style="margin-bottom: 8px;">🎯 <strong>"${hedefHarfNotu}" İçin Finalde Kaç Alman Gerek? (Senaryo Tablosu)</strong></p>`;
            aciklamaHTML += `<p style="margin-bottom: 8px;">Bu tablo, bu sekmede verdiğin ara sınav bilgilerine dayanarak, çeşitli "Sınıf Ortalaması" ve "Standart Sapma" ihtimallerine göre finalde alman gereken en düşük notu görmene yardımcı olur.</p>`;
            aciklamaHTML += `<p style="margin-bottom: 8px;">Tabloyu şöyle kullanabilirsin:<br>Soldan bir "Standart Sapma" değeri, üstten de bir "Sınıf Ortalaması" değeri seç. İkisinin kesiştiği yerdeki sayı, "${hedefHarfNotu}" için o durumda alman gereken final notunu gösterir.</p>`;

            if (ornekGerekenNot !== null && ornekOrtalama !== null && ornekStdSapma !== null) {
                aciklamaHTML += `<p style="margin-bottom: 8px;">📊 <em>Mesela, sınıf ortalaması <strong>${ornekOrtalama}</strong>, standart sapma <strong>${ornekStdSapma}</strong> ise, "${hedefHarfNotu}" için alman gereken final notu yaklaşık <strong>${ornekGerekenNot}</strong> olur.</em></p>`;
            } else {
                 aciklamaHTML += `<p style="margin-bottom: 8px;">📊 <em>Örnek bir senaryo için tabloya göz atın; örneğin, belirli bir standart sapma satırı ile sınıf ortalaması sütununun kesişimine bakarak gereken final notunu görebilirsiniz.</em></p>`;
            }
            aciklamaHTML += `</div>`;

            aciklamaHTML += `<div class="scenario-notes" style="margin-top: 15px; font-size: 0.9em; line-height: 1.5; text-align: left;">`;
            aciklamaHTML += `<p style="font-weight:bold; margin-bottom:8px;">⚠️ DİKKAT! BU BİLGİLER HAYAT KURTARIR:</p>`;
            aciklamaHTML += `<ul style="margin:0; padding-left:0; list-style-type: none;">`;

            aciklamaHTML += `<li style="margin-bottom: 12px; padding-left:1.5em; text-indent:-1.5em;">
                                📌 <strong>"SINIF ORTALAMASI" DEDİĞİMİZ ŞEY (ÇAN ORTALAMASI) NEDİR? AMAN DİKKAT!</strong><br>
                                Bu tablodaki "Sınıf Ortalaması" değerleri (ve diğer hesaplamalarda kullandığın "Sınıf Ortalaması") öğrencilerin tek tek hesaplanan Ham Başarı Notlarının (HBN) ortalamasıdır. Yani her öğrencinin vize, ödev, final gibi notlarının ağırlıklarıyla oluşan kendi kişisel başarı puanının ortalamasıdır.<br>
                                <strong>SAKIN ŞU HATAYA DÜŞME:</strong> Vize sınavının sınıfça ortalamasıyla Final sınavının sınıfça ortalamasını toplayıp ikiye bölerek "Çan Ortalaması"nı bulamazsın! Gerçek "Çan Ortalaması" böyle hesaplanmaz. Çünkü finale girmeyenler, devamsızlar, HBN'si çok düşük olanlar gibi bağıl değerlendirmeye dahil edilmeyen kişiler bu ortalamanın dışında tutulur. Bu yüzden, senin tahmininle gerçek "Çan Ortalaması" arasında fark olabilir. Bu fark, senin harf notunu doğrudan etkiler!
                            </li>`;

            aciklamaHTML += `<li style="margin-bottom: 12px; padding-left:1.5em; text-indent:-1.5em;">
                                🛡️ <strong>BU BİR TAHMİN ARACI, RESMİ SONUÇ DEĞİL! HER ZAMAN İŞİNİ SAĞLAMA AL!</strong><br>
                                Bu hesaplayıcı sana yol göstermek için var. Ama unutma, tablodaki "Sınıf Ortalaması" veya "Standart Sapma" senin dersindeki gerçek değerlerden biraz farklı olabilir. Üniversitenin sistemindeki küsurat hesapları da sonucu milimetrik değiştirebilir.<br>
                                <strong>ALTIN KURAL:</strong> Tabloda çıkan nota güvenirken, her zaman finalden birkaç puan daha fazlasını almaya çalış ki sonra üzülmeyesin!
                            </li>`;

            aciklamaHTML += `<li style="margin-bottom: 5px; padding-left:1.5em; text-indent:-1.5em;">
                                ➡️ <strong>TABLODAKİ DİĞER İŞARETLER NE ANLAMA GELİYOR?</strong>
                                <ul style="padding-left: 1.8em; margin-top: 5px; list-style-type: none;">
                                    <li style="margin-bottom:3px; padding-left:1.5em; text-indent:-1.5em;">▪️ <strong>"Min ${MINIMUM_FINAL_NOTU_VARSAYILAN}":</strong> Finalden en az bu notu almak zorundasın, hesaplama daha düşüğünü gösterse bile!</li>
                                    <li style="margin-bottom:3px; padding-left:1.5em; text-indent:-1.5em;">▪️ <strong>"Ort. &ge;80 (Mutlak)":</strong> Eğer sınıfın genel ortalaması 80 veya üstüyse, işler değişir ve Mutlak Sistem devreye girer. Bu sütun sana o durumu gösterir. (Standart sapma burada önemsizdir).</li>
                                    <li style="padding-left:1.5em; text-indent:-1.5em;">▪️ <strong>"100+":</strong> O durumda finalden 100'den fazla alman gerekiyor demek, yani o hedef biraz zor görünüyor!</li>
                                </ul>
                            </li>`;
            aciklamaHTML += `</ul></div>`;
            // --- KULLANICININ SEÇTİĞİ "ALTERNATİF C" METNİ SONU ---

            senaryoTabloAlani.innerHTML = `
                <div class="table-scroll-wrapper" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    ${tabloHTML}
                </div>
                ${aciklamaHTML}
            `;
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