// === KOYU MOD YÖNETİMİ ===// === KOYU MOD YÖNETİMİ ===
(function() {
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    
    // Sistem tercihini kontrol et
    function getPreferredTheme() {
        const savedTheme = localStorage.getItem('ktu-theme');
        
        // Eğer kullanıcı daha önce seçim yaptıysa onu kullan
        if (savedTheme) {
            return savedTheme;
        }
        
        // Yoksa cihaz tercihine bak
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }
    
    // İlk yükleme
    const preferredTheme = getPreferredTheme();
    setTheme(preferredTheme);
    
    // Sistem teması değişirse dinle (kullanıcı manuel seçim yapmadıysa)
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Sadece kullanıcı daha önce manuel seçim yapmadıysa
            if (!localStorage.getItem('ktu-theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    // Toggle butonuna tıklama
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }
    
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('ktu-theme', theme);
        updateToggleIcon(theme);
    }
    
    function updateToggleIcon(theme) {
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
            themeToggle.setAttribute('title', 
                theme === 'dark' ? 'Açık Moda Geç (Alt+T)' : 'Koyu Moda Geç (Alt+T)'
            );
        }
    }
    
    // Klavye desteği
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            if (themeToggle) themeToggle.click();
        }
    });
})();

// --- Sabitler ve Veri Yapıları (Global Kapsamda) ---
const MUTLAK_DEGERLENDIRME_ARALIKLARI = { "AA": [90, 100], "BA": [80, 89.99], "BB": [75, 79.99], "CB": [70, 74.99], "CC": [60, 69.99], "DC": [50, 59.99], "DD": [40, 49.99], "FD": [30, 39.99], "FF": [0, 29.99], };
const HARF_NOTU_KATSAYILARI = { "AA": 4.0, "BA": 3.5, "BB": 3.0, "CB": 2.5, "CC": 2.0, "DC": 1.5, "DD": 1.0, "FD": 0.5, "FF": 0.0 };
const MINIMUM_FINAL_NOTU_VARSAYILAN = 45;
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
    const value = inputElement.value; // select için .trim() gereksiz
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

// =================================================================================
// DEĞİŞİKLİK: Bu fonksiyon artık kendisine zaten yuvarlanmış (tam sayı) olarak 
// gelen tSkoru'nu kullanacak şekilde güncellendi. İçerisindeki yuvarlama kaldırıldı.
// =================================================================================
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
             console.warn("getBagilDegerlendirmeNotuTskor: Sınıf ortalaması > 80 ise T-skor anlamsızdır.");
            return null; 
        } else {
            const lastIntervalKey = siraliOrtalamaAraliklari[siraliOrtalamaAraliklari.length-1];
             if (sinifOrtalamasi > parseFloat(lastIntervalKey.split('_')[1])) {
                 console.warn(`Sınıf ortalaması (${sinifOrtalamasi}) tanımlı aralıkların üzerinde. En yüksek aralık (${lastIntervalKey}) kullanılacak.`);
                hedefAralikAnahtari = lastIntervalKey;
            } else {
                console.error("Sınıf ortalaması (" + sinifOrtalamasi + ") için geçerli bir T-Skor aralığı bulunamadı.");
                return null;
            }
        }
    }
    if (!T_SKOR_ARALIKLARI_ORTALAMAYA_GORE[hedefAralikAnahtari]) {
        console.error("Tanımlı T-Skor aralığı anahtarı bulunamadı:", hedefAralikAnahtari);
        return null;
    }
    const notlar = T_SKOR_ARALIKLARI_ORTALAMAYA_GORE[hedefAralikAnahtari];
    // DEĞİŞİKLİK: Aşağıdaki ondalık yuvarlama satırı kaldırıldı.
    // const yuvarlanmisTskor = Math.round(tSkoru * 100) / 100; 
    for (const not in notlar) {
        const [minT, maxT] = notlar[not];
        // DEĞİŞİKLİK: Karşılaştırmada doğrudan fonksiyona gelen 'tSkoru' (artık tam sayı) kullanılıyor.
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
        const avgInputId = formTypeSuffix === 'Harf' ? 'midterm-avg' : (formTypeSuffix === 'Gerekli' ? 'req-midterm-avg' : 'scenario-midterm-avg');
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


// --- DOM Yüklendiğinde Çalışacak Kodlar ---
document.addEventListener('DOMContentLoaded', () => {

    const harfNotuFormu = document.getElementById('grade-calculator-form');
    const gerekliNotFormu = document.getElementById('required-grade-form');
    const senaryoFormu = document.getElementById('scenario-form');
    const harfNotuSonucAlani = document.getElementById('grade-result');
    const gerekliNotSonucAlani = document.getElementById('required-result');
    const senaryoTabloAlani = document.getElementById('scenario-table-output');

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
            { el: classAvgInput, name: 'Sınıf Ortalaması', min: 0, max: 100 },
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
                        showFieldError(item.el, "Sınıf ortalaması 80'den düşükse standart sapma 0 olamaz.");
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
            if (!validateNumberField(classAvgInput, 'Sınıf Ortalaması', 0, 100)) formGecerli = false;

            const sinifOrtalamasiVal = parseFloat(classAvgInput.value);
            const minStdDev = (formGecerli && !isNaN(sinifOrtalamasiVal) && sinifOrtalamasiVal < 80) ? 0.0001 : 0;
            if (!validateNumberField(classStdDevInput, 'Standart Sapma', minStdDev, null)) formGecerli = false;

            if (formGecerli && sinifOrtalamasiVal < 80 && parseFloat(classStdDevInput.value) === 0) {
                 showFieldError(classStdDevInput, "Sınıf ortalaması 80'den düşükse standart sapma 0 olamaz.");
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
            const hamBasariNotu = araSinavHBNKatkisi + (finalNotu * 0.50);

            let harfNotu = null;
            let anaMesaj = "";
            let tSkoru = null;
            let hesaplamaDetaylari = "";
            const sinifStandartSapmaVal = parseFloat(classStdDevInput.value);


            if (finalNotu < MINIMUM_FINAL_NOTU_VARSAYILAN) {
                harfNotu = "FF";
                anaMesaj = `Final notunuz (${finalNotu.toFixed(2)}) minimum (${MINIMUM_FINAL_NOTU_VARSAYILAN}) sınırının altında olduğu için harf notunuz doğrudan <strong>FF</strong> olarak belirlenmiştir.`;
            } else if (hamBasariNotu <= 15) {
                harfNotu = "FF";
                anaMesaj = `Hesaplanan Ham Başarı Notu (${hamBasariNotu.toFixed(2)}) 15 veya altında olduğu için harf notunuz doğrudan <strong>FF</strong> olarak belirlenmiştir.`;
            } else {
                const mutlakNotKarsiligi = getMutlakDegerlendirmeNotu(hamBasariNotu);
                if (sinifOrtalamasiVal >= 80) {
                    harfNotu = mutlakNotKarsiligi;
                    anaMesaj = `Sınıf ortalaması (${sinifOrtalamasiVal.toFixed(2)}) 80 veya üzeri olduğu için notunuz doğrudan Mutlak Değerlendirme Sistemine (Tablo-3) göre belirlenmiştir.`;
                    hesaplamaDetaylari = `Mutlak Değerlendirme (Tablo-3) sonucu: <strong>${mutlakNotKarsiligi}</strong>.`;
                } else {
                    // =================================================================================
                    // DEĞİŞİKLİK: T-Skoru yuvarlama kuralı burada uygulanıyor.
                    // =================================================================================
                    const tSkoruHam = ((hamBasariNotu - sinifOrtalamasiVal) / sinifStandartSapmaVal) * 10 + 50;
                    tSkoru = Math.round(tSkoruHam); // T-Skoru en yakın tam sayıya yuvarlandı.

                    const bagilNot = getBagilDegerlendirmeNotuTskor(tSkoru, sinifOrtalamasiVal);
                    
                    if (bagilNot === null) {
                        anaMesaj = `Bağıl değerlendirme için T-Skor (${tSkoru}) karşılığı bir harf notu aralığı bulunamadı (Sınıf Ort: ${sinifOrtalamasiVal.toFixed(2)}). Bu durumda Mutlak Değerlendirme (Tablo-3) notunuz (${mutlakNotKarsiligi}) esas alınmıştır.`;
                        harfNotu = mutlakNotKarsiligi;
                        hesaplamaDetaylari = `Hesaplanan Ham T-Skoru: <strong>${tSkoruHam.toFixed(2)}</strong>.<br>Yuvarlanmış T-Skoru: <strong>${tSkoru}</strong> (Bağıl not bulunamadı).<br>Mutlak Değerlendirme (Tablo-3) sonucu: <strong>${mutlakNotKarsiligi}</strong>.`;
                    } else {
                        harfNotu = karsilastirHarfNotlari(bagilNot, mutlakNotKarsiligi);
                        hesaplamaDetaylari = `Hesaplanan Ham T-Skoru: <strong>${tSkoruHam.toFixed(2)}</strong>.<br>`;
                        hesaplamaDetaylari += `Yuvarlanmış T-Skoru: <strong>${tSkoru}</strong>.<br>`;
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
            let harfNotuBadgeHTML = harfNotu ? `<span class="grade-display-badge grade-display-${harfNotu.toLowerCase()}">${harfNotu}</span>` : "Hesaplanamadı";
            sonucMesaji += `Harf Notu: <strong style="font-size: 1.1em; vertical-align: middle;">${harfNotuBadgeHTML}</strong>`;

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
            { el: reqClassAvgInput, name: 'Sınıf Ortalaması', min: 0, max: 100 },
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
                        showFieldError(item.el, "Sınıf ortalaması 80'den düşükse standart sapma 0 olamaz.");
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
            if (!validateNumberField(reqClassAvgInput, 'Sınıf Ortalaması', 0, 100)) formGecerli = false;

            const sinifOrtalamasiVal = parseFloat(reqClassAvgInput.value);
            const minStdDevGerekli = (formGecerli && !isNaN(sinifOrtalamasiVal) && sinifOrtalamasiVal < 80) ? 0.0001 : 0;
            if (!validateNumberField(reqClassStdDevInput, 'Standart Sapma', minStdDevGerekli, null)) formGecerli = false;

            if (formGecerli && sinifOrtalamasiVal < 80 && parseFloat(reqClassStdDevInput.value) === 0) {
                 showFieldError(reqClassStdDevInput, "Sınıf ortalaması 80'den düşükse standart sapma 0 olamaz.");
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

            let sonucMetni = "";
            let anaMesajReq = "";
            let hesaplamaDetaylariReq = "";
            let sistemTuru = ""; 

            if (sinifOrtalamasiVal >= 80) {
                sistemTuru = "Mutlak Sistem";
                const mutlakAralik = MUTLAK_DEGERLENDIRME_ARALIKLARI[hedefHarfNotu];
                if (!mutlakAralik) {
                    gerekliNotSonucAlani.innerHTML = `<p class="error-message">Hata: Hedeflenen harf notu (${hedefHarfNotu}) için mutlak değerlendirme aralığı bulunamadı.</p>`;
                    return;
                }
                const hedefHamBasariNotu = mutlakAralik[0];
                let gerekenFinalNotu = (hedefHamBasariNotu - araSinavHBNKatkisi) / 0.50;
                gerekenFinalNotu = Math.max(0, gerekenFinalNotu);
                const gerekenFinalNotuYuvarla = Math.ceil(gerekenFinalNotu * 100) / 100;

                hesaplamaDetaylariReq = `Sınıf ortalaması (${sinifOrtalamasiVal.toFixed(2)}) 80 veya üzeri olduğu için Mutlak Değerlendirme (Tablo-3) hedeflenmiştir.<br>`;
                hesaplamaDetaylariReq += `Hedeflenen <strong>${hedefHarfNotu}</strong> notu için Mutlak Sistemde gereken Ham Başarı Notu alt sınırı: <strong>${hedefHamBasariNotu.toFixed(2)}</strong>.<br>`;

                if (gerekenFinalNotuYuvarla > 100) {
                    anaMesajReq = `Bu Ham Başarı Notuna (${hedefHamBasariNotu.toFixed(2)}) ulaşmak için gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}) <strong>100'den yüksek</strong>. Bu hedefe ulaşmak imkansız.`;
                    sonucMetni = "İmkansız (>100)";
                } else if (gerekenFinalNotuYuvarla < MINIMUM_FINAL_NOTU_VARSAYILAN) {
                    anaMesajReq = `Bu Ham Başarı Notuna (${hedefHamBasariNotu.toFixed(2)}) ulaşmak için teorik olarak gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}), minimum final (${MINIMUM_FINAL_NOTU_VARSAYILAN}) sınırının altındadır. Finalden <strong>en az ${MINIMUM_FINAL_NOTU_VARSAYILAN}</strong> almalısınız. Bu durumda, hedeflediğiniz ${hedefHarfNotu} notuna ulaşmanız, Ham Başarı Notunuzun Mutlak Değerlendirme'de bu nota denk gelmesine bağlı olacaktır.`;
                    sonucMetni = `En az ${MINIMUM_FINAL_NOTU_VARSAYILAN} <small>(Hesaplanan: ${gerekenFinalNotuYuvarla.toFixed(2)})</small>`;
                } else {
                    anaMesajReq = `Bu Ham Başarı Notuna (${hedefHamBasariNotu.toFixed(2)}) ulaşmak için finalden <strong>en az ${gerekenFinalNotuYuvarla.toFixed(2)}</strong> almanız gerekmektedir.`;
                    sonucMetni = gerekenFinalNotuYuvarla.toFixed(2);
                }
            } else { 
                sistemTuru = "Bağıl Sistem";
                const minimumTskor = getHedefNotIcinMinTskor(hedefHarfNotu, sinifOrtalamasiVal);
                if (minimumTskor === null) { 
                    gerekliNotSonucAlani.innerHTML = `<p class="error-message">Hata: Hedeflenen "${hedefHarfNotu}" notu için T-skor aralığı bulunamadı (Sınıf Ort: ${sinifOrtalamasiVal.toFixed(2)}).</p>`;
                    return;
                }
                let hedefHamBasariNotuBagil = ((minimumTskor - 50) / 10) * sinifStandartSapmaVal + sinifOrtalamasiVal;
                let gerekenFinalNotu = (hedefHamBasariNotuBagil - araSinavHBNKatkisi) / 0.50;
                gerekenFinalNotu = Math.max(0, gerekenFinalNotu);
                const gerekenFinalNotuYuvarla = Math.ceil(gerekenFinalNotu * 100) / 100;

                hesaplamaDetaylariReq = `Hedeflenen <strong>${hedefHarfNotu}</strong> notu (Bağıl Değerlendirme) için;<br>`;
                hesaplamaDetaylariReq += `- Gerekli min. T-Skoru: ${minimumTskor.toFixed(2)} (Sınıf Ort: ${sinifOrtalamasiVal.toFixed(2)}, Std Sapma: ${sinifStandartSapmaVal.toFixed(2)})<br>`;
                hesaplamaDetaylariReq += `- Bu T-skoruna ulaşmak için gereken minimum Ham Başarı Notu (Bağıl): <strong>${hedefHamBasariNotuBagil.toFixed(2)}</strong><br>`;
                const mutlakNotKarsiligiHBN = getMutlakDegerlendirmeNotu(hedefHamBasariNotuBagil);
                hesaplamaDetaylariReq += `<small style='color:#555;'>(Bu HBN (${hedefHamBasariNotuBagil.toFixed(2)}) Mutlak Sistemde yaklaşık ${mutlakNotKarsiligiHBN} notuna denk gelir. Notunuz, bağıl ve mutlak karşılaştırmasında yüksek olan olacaktır.)</small>`;

                if (gerekenFinalNotuYuvarla > 100) {
                    anaMesajReq = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}) <strong>100'den yüksek</strong>. Bu hedefe ulaşmak imkansız.`;
                    sonucMetni = "İmkansız (>100)";
                } else if (gerekenFinalNotuYuvarla < MINIMUM_FINAL_NOTU_VARSAYILAN) {
                    anaMesajReq = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için teorik olarak gereken final notu (${gerekenFinalNotuYuvarla.toFixed(2)}), minimum final (${MINIMUM_FINAL_NOTU_VARSAYILAN}) sınırının altındadır. Finalden <strong>en az ${MINIMUM_FINAL_NOTU_VARSAYILAN}</strong> almanız gerekmektedir. Bu durumda hedeflediğiniz ${hedefHarfNotu} notuna ulaşamayabilirsiniz veya Ham Başarı Notunuzun Mutlak Değerlendirme karşılığı daha yüksekse o geçerli olabilir.`;
                    sonucMetni = `En az ${MINIMUM_FINAL_NOTU_VARSAYILAN} <small>(Hesaplanan: ${gerekenFinalNotuYuvarla.toFixed(2)})</small>`;
                } else {
                    anaMesajReq = `Bu Ham Başarı Notuna (${hedefHamBasariNotuBagil.toFixed(2)}) ulaşmak için finalden <strong>en az ${gerekenFinalNotuYuvarla.toFixed(2)}</strong> almanız gerekmektedir.`;
                    sonucMetni = gerekenFinalNotuYuvarla.toFixed(2);
                }
            }
            let finalSonucHTML = `Gereken Final Notu (${sistemTuru}): <strong style="font-size: 1.2em;">${sonucMetni}</strong><hr class="input-separator">`;
            finalSonucHTML += `<p>${anaMesajReq}</p>`;
            finalSonucHTML += `<details style="margin-top: 10px; font-size: 0.9em; color: #555;"><summary>Hesaplama Detayları</summary><p style="margin-top: 5px;">${hesaplamaDetaylariReq}</p></details>`;
            gerekliNotSonucAlani.innerHTML = finalSonucHTML;
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

            const senaryoOrtalamalar = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
            const senaryoStdSapmalar = [8, 10, 12, 15, 18, 20, 22, 25];

            let tabloHTML = `<table><thead><tr>`;
            tabloHTML += `<th scope="col" style="text-align:center; min-width:140px; vertical-align: middle;">
                                 <div style='font-weight:bold; font-size:0.9em; padding-bottom:2px;'>Sınıf Ort. (→)</div>
                                 <hr style='margin:0; border-style: solid; border-width: 0 0 1px 0; border-color: var(--input-focus-border);'>
                                 <div style='font-weight:bold; font-size:0.9em; padding-top:2px;'>Std. Sapma (↓)</div>
                             </th>`;
            senaryoOrtalamalar.forEach(ort => { tabloHTML += `<th scope="col" title="Sınıf Ortalaması: ${ort}">${ort}</th>`; });
            tabloHTML += `<th scope="col" title="Sınıf Ort. ≥ 80 (Mutlak Değerlendirme)">&ge;80 <br><small style='font-weight:normal'>(Mutlak)</small></th>`;
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
                        const minimumTskor = getHedefNotIcinMinTskor(hedefHarfNotu, ortalama);
                        if (minimumTskor !== null && stdSapma > 0) {
                            let hedefHamBasariNotuNihai = ((minimumTskor - 50) / 10) * stdSapma + ortalama;
                            let hesaplananFinal = (hedefHamBasariNotuNihai - araSinavHBNKatkisi) / 0.50;
                            hesaplananFinal = Math.max(0, hesaplananFinal);
                            const yuvarlanmisFinal = Math.ceil(hesaplananFinal * 100) / 100;


                            if (yuvarlanmisFinal > 100) { gerekenFinalNotu = "100+"; cellClass = "impossible"; }
                            else if (yuvarlanmisFinal < MINIMUM_FINAL_NOTU_VARSAYILAN) { gerekenFinalNotu = `Min ${MINIMUM_FINAL_NOTU_VARSAYILAN}`; cellClass = "min-final"; }
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
                    else if (yuvarlanmisFinalMutlak < MINIMUM_FINAL_NOTU_VARSAYILAN) { gerekenFinalMutlak = `Min ${MINIMUM_FINAL_NOTU_VARSAYILAN}`; cellClassMutlak = "min-final"; }
                    else { gerekenFinalMutlak = Math.ceil(yuvarlanmisFinalMutlak).toString(); cellClassMutlak = ""; }
                }
                tabloHTML += `<td class="${cellClassMutlak}" title="Sınıf Ort. ≥ 80 (Mutlak Sistem). Std. Sapma bu durumda anlamsızdır.">${gerekenFinalMutlak}</td>`;
                tabloHTML += `</tr>`;
            });
            tabloHTML += `</tbody></table>`;
            
             let aciklamaHTML = `<div class="scenario-explanation" style="margin-top: 20px; font-size: 0.9em; line-height: 1.5; text-align: left;">`;
             aciklamaHTML += `<p style="margin-bottom: 8px;">🎯 <strong>"${hedefHarfNotu}" İçin Finalde Kaç Alman Gerek? (Senaryo Tablosu)</strong></p>`;
             aciklamaHTML += `<p style="margin-bottom: 8px;">Bu tablo, bu sekmede verdiğin ara sınav bilgilerine dayanarak, çeşitli "Sınıf Ortalaması" ve "Standart Sapma" ihtimallerine göre finalde alman gereken en düşük notu görmene yardımcı olur.</p>`;
             aciklamaHTML += `<p style="margin-bottom: 8px;">Tabloyu şöyle kullanabilirsin:<br>Soldan bir "Standart Sapma" değeri, üstten de bir "Sınıf Ortalaması" değeri seç. İkisinin kesiştiği yerdeki sayı, "${hedefHarfNotu}" için o durumda alman gereken final notunu gösterir.</p>`;
             if (ornekGerekenNot !== null && ornekOrtalama !== null && ornekStdSapma !== null) {
                 aciklamaHTML += `<p style="margin-bottom: 8px;">📊 <em>Mesela, sınıf ortalaması <strong>${ornekOrtalama}</strong>, standart sapma <strong>${ornekStdSapma}</strong> ise, "${hedefHarfNotu}" için alman gereken final notu yaklaşık <strong>${ornekGerekenNot}</strong> olur.</em></p>`;
             } else {
                 aciklamaHTML += `<p style="margin-bottom: 8px;">📊 <em>Örnek bir senaryo için tabloya göz atın. Ara sınav notlarınız ve hedeflediğiniz harf notuna göre ulaşılabilir bir senaryo bulunmuyorsa, tabloda uygun bir örnek gösterilemeyebilir.</em></p>`;
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
                                          <li style="padding-left:1.5em; text-indent:-1.5em;">▪️ <strong>"-":</strong> Bu senaryoda hedeflenen nota ulaşmak mümkün değil veya standart sapma 0 gibi geçersiz bir durum var.</li>
                                     </ul>
                                 </li>`;
             aciklamaHTML += `</ul></div>`;

            senaryoTabloAlani.innerHTML = `
                 <div class="table-scroll-wrapper" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                     ${tabloHTML}
                 </div>
                 ${aciklamaHTML}
             `;
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

});
});
