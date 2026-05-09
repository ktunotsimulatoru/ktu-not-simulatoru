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
function duyuruToggle() {
    const detay = document.getElementById('duyuruDetay');
    const btn = document.getElementById('duyuruOzetBtn');
    const tikla = document.querySelector('.duyuru-tikla');
    if (!detay) return;
    const acik = detay.classList.toggle('acik');
    if (btn) btn.setAttribute('aria-expanded', acik);
    if (tikla) tikla.textContent = acik ? 'Gizle ▲' : 'Detaylar için tıklayın ▼';
}

function duyuruKapat() {
    const wrapper = document.getElementById('duyuruWrapper');
    if (wrapper) {
        wrapper.style.transition = 'opacity 0.25s ease';
        wrapper.style.opacity = '0';
        setTimeout(() => { wrapper.style.display = 'none'; }, 260);
        sessionStorage.setItem('duyuruKapatildi', '1');
    }
}

function duyuruDurumKontrol() {
    if (sessionStorage.getItem('duyuruKapatildi') === '1') {
        const wrapper = document.getElementById('duyuruWrapper');
        if (wrapper) wrapper.style.display = 'none';
    }
}

function dinamikDuyuruKapat(id) {
    const el = document.getElementById('dinamik-duyuru-' + id);
    if (!el) return;
    el.style.transition = 'opacity 0.25s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 260);
    // Kapatılan duyuruyu sessionStorage'a kaydet
    const kapatilanlar = JSON.parse(sessionStorage.getItem('kapatilanDuyurular') || '[]');
    kapatilanlar.push(id);
    sessionStorage.setItem('kapatilanDuyurular', JSON.stringify(kapatilanlar));
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
                        <div class="duyuru-detay-icerik">
                            <p class="duyuru-alt-metin">${d.icerik}</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (e) {
        // Sessizce geç
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
    duyuruDurumKontrol();
    dinamikDuyurulariYukle();

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
                    const tSkoruHam = ((hamBasariNotu - sinifOrtalamasiVal) / sinifStandartSapmaVal) * 10 + 50;
                    tSkoru = Math.round(tSkoruHam);

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
            dersiLinkGoster('ders-link-harf');
            const vizeLogHarf = secilenYontem === 'tek'
                ? parseFloat(document.getElementById('midterm-avg').value)
                : parseFloat(document.getElementById('vize-notu-harf').value);
            hesaplamaLogKaydet('harf', harfNotu, isNaN(vizeLogHarf) ? null : vizeLogHarf, isNaN(finalNotu) ? null : finalNotu);
            paylasimButonuGoster('harf');
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
            dersiLinkGoster('ders-link-gerekli');
            const vizeLogGerekli = secilenYontem === 'tek'
                ? parseFloat(document.getElementById('req-midterm-avg').value)
                : parseFloat(document.getElementById('vize-notu-gerekli').value);
            hesaplamaLogKaydet('gerekli', null, isNaN(vizeLogGerekli) ? null : vizeLogGerekli, null);
            paylasimButonuGoster('gerekli');
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
            
            let aciklamaHTML = `<div class="scenario-explanation">`;
            if (ornekGerekenNot !== null) {
                aciklamaHTML += `<p>📊 Örnek: Sınıf ort. <strong>${ornekOrtalama}</strong>, std. sapma <strong>${ornekStdSapma}</strong> ise <strong>${hedefHarfNotu}</strong> için gereken final ≈ <strong>${ornekGerekenNot}</strong></p>`;
            }
            aciklamaHTML += `<p>⚠️ <strong>Çan ortalaması</strong>, vize/final sınıf ortalamalarının basit ortalaması <em>değildir</em>. Bağıl değerlendirmeye katılan öğrencilerin HBN ortalamasıdır.</p>`;
            aciklamaHTML += `<p>📌 <strong>Min ${MINIMUM_FINAL_NOTU_VARSAYILAN}:</strong> Final alt sınırı. &nbsp; <strong>≥80 (Mutlak):</strong> Sınıf ort. 80+ ise mutlak sistem. &nbsp; <strong>100+:</strong> Ulaşılamaz hedef.</p>`;
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
            hesaplamaLogKaydet('senaryo', null, isNaN(vizeLogSenaryo) ? null : vizeLogSenaryo, null);
            paylasimButonuGoster('senaryo');
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

});

// ============================================================
// DÖNEM ORTALAMASI (ANO) — Madde 11 & 12
// ============================================================

const GANO_KATSAYILARI = {
    'AA': 4.0, 'BA': 3.5, 'BB': 3.0, 'CB': 2.5,
    'CC': 2.0, 'DC': 1.5, 'DD': 1.0, 'FD': 0.5, 'FF': 0.0
};
const GANO_HARIC_NOTLAR = ['D', 'G', 'K', 'S'];

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
                <input type="text" class="gano-ders-adi-input" placeholder="Örn: Matematik I" oninput="ganoHesapla()">
            </div>
            <div class="form-group gano-kredi-grup">
                <label>Kredi <span class="zorunlu">*</span></label>
                <input type="number" class="gano-kredi-input" min="1" max="10" step="1" placeholder="3" oninput="ganoHesapla()">
            </div>
            <div class="form-group gano-not-grup">
                <label>Harf Notu <span class="zorunlu">*</span></label>
                <select class="gano-not-input" onchange="ganoHesapla()">
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
                    <option value="D">D — Devamsız</option>
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

function ganoDersSil(id) {
    const el = document.getElementById(`gano-ders-${id}`);
    if (el) el.remove();
    ganoHesapla();
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

    // DC koşullu geçme kontrolü (Madde 12)
    const dcDersler = gecerliDersler.filter(d => d.not === 'DC');
    const dcUyarilar = dcDersler.map(d => ({
        ad: d.ad || 'İsimsiz ders',
        durum: (ano !== null && ano >= 2.00) ? 'gecti' : 'kaldi',
        ano
    }));

    // Başarısız dersler
    const basarisizlar = gecerliDersler.filter(d => {
        if (['FF', 'FD', 'DD'].includes(d.not)) return true;
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
        html += `<p style="color:var(--small-text); font-size:0.9em;">Hesaplamaya dahil edilecek ders bulunamadı (D, G, K, S notları ANO'ya dahil edilmez).</p>`;
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
            <div class="gano-basarisiz-baslik">⚠️ Tekrar Almanız Gereken Dersler (Madde 12)</div>`;
        basarisizlar.forEach(d => {
            html += `<div class="gano-basarisiz-ders"><span class="grade-display-badge grade-display-${d.not.toLowerCase()}">${d.not}</span> ${d.ad || 'İsimsiz ders'} (${d.kredi} kredi)</div>`;
        });
        html += `</div>`;
    }

    sonucEl.style.display = 'block';
    sonucEl.innerHTML = html;
    paylasimButonuGoster('ano');

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
            }
        }, 2000);
    }
}

// ============================================================
// PAYLAŞMA LİNKİ
// ============================================================

function paylasimUrlOlustur(sekme) {
    const url = new URL(window.location.href.split('?')[0]);
    if (sekme === 'harf') {
        const yontem = document.querySelector('input[name="hesaplamaYontemiHarf"]:checked')?.value;
        if (yontem === 'tek') {
            const vize = document.getElementById('midterm-avg')?.value;
            if (vize) url.searchParams.set('vize', vize);
        } else {
            const vn = document.getElementById('vize-notu-harf')?.value;
            const va = document.getElementById('vize-agirlik-harf')?.value;
            const on = document.getElementById('odev-notu-harf')?.value;
            const oa = document.getElementById('odev-agirlik-harf')?.value;
            if (vn) url.searchParams.set('vize', vn);
            if (va) url.searchParams.set('va', va);
            if (on) url.searchParams.set('odev', on);
            if (oa) url.searchParams.set('oa', oa);
            url.searchParams.set('detay', '1');
        }
        const final = document.getElementById('final-grade')?.value;
        const ort = document.getElementById('class-avg')?.value;
        const std = document.getElementById('class-stddev')?.value;
        if (final) url.searchParams.set('final', final);
        if (ort) url.searchParams.set('ort', ort);
        if (std) url.searchParams.set('std', std);
    } else if (sekme === 'gerekli') {
        const vize = document.getElementById('req-midterm-avg')?.value;
        const ort = document.getElementById('req-class-avg')?.value;
        const std = document.getElementById('req-class-stddev')?.value;
        const hedef = document.getElementById('target-grade')?.value;
        if (vize) url.searchParams.set('vize', vize);
        if (ort) url.searchParams.set('ort', ort);
        if (std) url.searchParams.set('std', std);
        if (hedef) url.searchParams.set('hedef', hedef);
    } else if (sekme === 'senaryo') {
        const yontem = document.querySelector('input[name="hesaplamaYontemiSenaryo"]:checked')?.value;
        if (yontem === 'tek') {
            const vize = document.getElementById('scenario-midterm-avg')?.value;
            if (vize) url.searchParams.set('vize', vize);
        }
        const hedefNot = document.querySelector('input[name="scenarioTargetGrade"]:checked')?.value;
        if (hedefNot) url.searchParams.set('hedef', hedefNot);
    } else if (sekme === 'ano') {
        const satirlar = document.querySelectorAll('.gano-ders-satir');
        const dersler = [];
        satirlar.forEach(s => {
            const ad = s.querySelector('.gano-ders-adi-input')?.value.trim() || '';
            const kredi = s.querySelector('.gano-kredi-input')?.value;
            const not = s.querySelector('.gano-not-input')?.value;
            if (kredi && not) dersler.push(`${encodeURIComponent(ad)}:${kredi}:${not}`);
        });
        if (dersler.length) url.searchParams.set('dersler', dersler.join(','));
    }
    url.searchParams.set('sekme', sekme);
    return url.toString();
}

function paylasimHarfNotunuAl(sekme) {
    if (sekme === 'harf') {
        const m = document.getElementById('grade-result')?.textContent.match(/\b(AA|BA|BB|CB|CC|DC|DD|FD|FF)\b/);
        return m ? m[1] : null;
    }
    return null;
}

function paylasimAnoAl() {
    const el = document.querySelector('.gano-sonuc-deger');
    return el ? parseFloat(el.textContent) : null;
}

function paylasimMenuAc(sekme, btn) {
    const paylasimUrl = paylasimUrlOlustur(sekme);
    const harfNotu = paylasimHarfNotunuAl(sekme);
    const anoVal = sekme === 'ano' ? paylasimAnoAl() : null;
    const sekmAdlar = { harf: 'Harf Notu Hesabı', gerekli: 'Gerekli Final Hesabı', senaryo: 'Senaryo Tablosu', ano: 'Dönem Ortalaması' };
    const baslik = `KTÜ Not Simülatörü — ${sekmAdlar[sekme] || 'Hesaplama'}`;

    // Web Share API varsa direkt sistem paylaşım ekranını aç
    if (navigator.share) {
        navigator.share({ title: baslik, url: paylasimUrl })
            .then(() => paylasimLogKaydet(sekme, harfNotu, anoVal))
            .catch(() => {}); // kullanıcı iptal etti
        return;
    }

    // Fallback: panoya kopyala
    navigator.clipboard.writeText(paylasimUrl).then(() => {
        toastGoster('🔗 Link kopyalandı!');
        paylasimLogKaydet(sekme, harfNotu, anoVal);
    }).catch(() => {
        prompt('Linki kopyala:', paylasimUrl);
        paylasimLogKaydet(sekme, harfNotu, anoVal);
    });
}

function toastGoster(mesaj) {
    const t = document.getElementById('paylasim-toast');
    if (!t) return;
    t.textContent = mesaj;
    t.style.display = 'block';
    t.classList.add('toast-goster');
    setTimeout(() => { t.classList.remove('toast-goster'); t.style.display = 'none'; }, 2500);
}

async function paylasimLogKaydet(sekme, harfNotu, anoVal) {
    try {
        const sb = getSupabase();
        const insertData = {
            sekme,
            is_mobile: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        };
        if (harfNotu) insertData.harf_notu = harfNotu;
        if (anoVal && !isNaN(anoVal)) insertData.ano_degeri = parseFloat(anoVal.toFixed(2));
        await sb.from('paylasim_loglari').insert(insertData);
    } catch (e) { /* sessizce geç */ }
}

function urldenHesaplamaYukle() {
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
        // Formu otomatik gönder
        setTimeout(() => document.getElementById('grade-form')?.dispatchEvent(new Event('submit', { bubbles: true })), 300);

    } else if (sekme === 'gerekli') {
        setVal('req-midterm-avg', params.get('vize'));
        setVal('req-class-avg', params.get('ort'));
        setVal('req-class-stddev', params.get('std'));
        const hedef = params.get('hedef');
        if (hedef) { const s = document.getElementById('target-grade'); if (s) s.value = hedef; }
        setTimeout(() => document.getElementById('required-grade-form')?.dispatchEvent(new Event('submit', { bubbles: true })), 300);

    } else if (sekme === 'senaryo') {
        setVal('scenario-midterm-avg', params.get('vize'));
        const hedef = params.get('hedef');
        if (hedef) {
            const r = document.querySelector(`input[name="scenarioTargetGrade"][value="${hedef}"]`);
            if (r) r.checked = true;
        }
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

function buildGanoDersSatirHTML(id, ad, kredi, not) {
    const notler = ['AA','BA','BB','CB','CC','DC','DD','FD','FF','D','G','K'];
    const notLabels = { AA:'AA — 4.0', BA:'BA — 3.5', BB:'BB — 3.0', CB:'CB — 2.5', CC:'CC — 2.0',
        DC:'DC — 1.5 ⚠', DD:'DD — 1.0', FD:'FD — 0.5', FF:'FF — 0.0', D:'D — Devamsız', G:'G — Geçer', K:'K — Kalır' };
    const opts = notler.map(n => `<option value="${n}" ${n === not ? 'selected' : ''}>${notLabels[n]}</option>`).join('');
    return `<div class="gano-ders-icerik">
        <div class="form-group gano-ders-adi-grup">
            <label>Ders Adı <span class="gano-opsiyonel">(opsiyonel)</span></label>
            <input type="text" class="gano-ders-adi-input" placeholder="Örn: Matematik I" value="${ad}" oninput="ganoHesapla()">
        </div>
        <div class="form-group gano-kredi-grup">
            <label>Kredi <span class="zorunlu">*</span></label>
            <input type="number" class="gano-kredi-input" min="1" max="10" step="1" placeholder="3" value="${kredi}" oninput="ganoHesapla()">
        </div>
        <div class="form-group gano-not-grup">
            <label>Harf Notu <span class="zorunlu">*</span></label>
            <select class="gano-not-input" onchange="ganoHesapla()">
                <option value="">Seç</option>${opts}
            </select>
        </div>
        <button type="button" class="gano-ders-sil-btn" onclick="ganoDersSil(${id})" aria-label="Dersi kaldır">✕</button>
    </div>`;
}

// Paylaşım butonlarını sonuç gelince göster
function paylasimButonuGoster(sekme) {
    const idler = { harf: 'grade-paylasim-kutu', gerekli: 'gerekli-paylasim-kutu', senaryo: 'senaryo-paylasim-kutu', ano: 'ano-paylasim-kutu' };
    const el = document.getElementById(idler[sekme]);
    if (el) el.style.display = 'block';
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
                <div class="secili-ders-banner-ad">📚 ${ders.ad}</div>
                <div class="secili-ders-banner-alt">${paylasimState.bolumAdi} · ${paylasimState.fakulteAdi}</div>
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
    let html = '<div class="veri-kart-wrapper">';

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
async function veriEkleSubmit(e) {
    e.preventDefault();
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
            sonucAlani.innerHTML = `<p>✅ <strong>"${dersAdi}"</strong> dersi onay için gönderildi. Verini de kaydettik, ders onaylandıktan sonra görünecek.</p>`;
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
let aktifModalForm = null;

async function modalAc(formTipi) {
    aktifModalForm = formTipi;
    const modal = document.getElementById('dersVeriModal');
    modal.classList.add('aktif');
    document.body.style.overflow = 'hidden';

    if (!modalFakulteleriYuklendi) {
        await modalFakulteleriYukle();
        modalFakulteleriYuklendi = true;
    }

    document.getElementById('modal-veri-alani').innerHTML = '<p class="veri-bos">Fakülte, bölüm ve ders seçerek verileri görüntüleyin.</p>';
}

function modalKapat(event) {
    if (event && event.target !== document.getElementById('dersVeriModal')) return;
    document.getElementById('dersVeriModal').classList.remove('aktif');
    document.body.style.overflow = '';
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
    let html = '<div class="veri-kart-wrapper">';

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
        document.body.style.overflow = '';
    }
});

// ============================================================
// HESAPLAMA LOGLAMA & İSTATİSTİKSEVER
// ============================================================

async function hesaplamaLogKaydet(sekme, harfNotu, vizeNotu, finalNotu, ekstra = {}) {
    try {
        const insertData = { sekme };
        if (harfNotu) insertData.harf_notu = harfNotu;
        if (vizeNotu !== null && vizeNotu !== undefined) insertData.vize_notu = Math.round(vizeNotu);
        if (finalNotu !== null && finalNotu !== undefined) insertData.final_notu = Math.round(finalNotu);
        // ANO alanları
        if (ekstra.ano !== undefined)            insertData.ano            = parseFloat(ekstra.ano.toFixed(2));
        if (ekstra.ders_sayisi !== undefined)    insertData.ders_sayisi    = ekstra.ders_sayisi;
        if (ekstra.toplam_kredi !== undefined)   insertData.toplam_kredi   = ekstra.toplam_kredi;
        if (ekstra.basarisiz_sayi !== undefined) insertData.basarisiz_sayi = ekstra.basarisiz_sayi;
        if (ekstra.dc_sayi !== undefined)        insertData.dc_sayi        = ekstra.dc_sayi;
        insertData.is_mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        await getSupabase().from('hesaplama_loglari').insert(insertData);
    } catch (e) { /* sessizce geç */ }
}

async function istatistikleriYukle() {
    try {
        const sb = getSupabase();

        // Tüm kayıtları çek — yeni sütunlar migration'dan önce yoksa da çalışır
        const { data: tumData, error: tumError } = await sb
            .from('hesaplama_loglari')
            .select('sekme, harf_notu, vize_notu, final_notu, ano, basarisiz_sayi');

        // Yeni sütunlar henüz yoksa eski sütunlarla tekrar dene
        let logData = tumData;
        if (tumError || !tumData) {
            const { data: eskiData } = await sb
                .from('hesaplama_loglari')
                .select('sekme, harf_notu, vize_notu, final_notu');
            logData = eskiData;
        }

        if (!logData) return;

        const sekmeSayilari = { harf: 0, gerekli: 0, senaryo: 0, ano: 0 };
        const harfSayac = {};
        const vizeSayac = {};
        const finalSayac = {};
        let final45Sayisi = 0;
        let anoToplam = 0;
        let anoSayisi = 0;

        logData.forEach(r => {
            if (sekmeSayilari[r.sekme] !== undefined) sekmeSayilari[r.sekme]++;
            if (r.harf_notu) harfSayac[r.harf_notu] = (harfSayac[r.harf_notu] || 0) + 1;

            if (r.sekme === 'harf') {
                if (r.vize_notu !== null) vizeSayac[r.vize_notu] = (vizeSayac[r.vize_notu] || 0) + 1;
                if (r.final_notu !== null) finalSayac[r.final_notu] = (finalSayac[r.final_notu] || 0) + 1;
                if (r.final_notu === 45) final45Sayisi++;
            }

            if (r.sekme === 'ano' && r.ano != null) {
                anoToplam += parseFloat(r.ano);
                anoSayisi++;
            }
        });

        const genelToplam = logData.length;

        const topHarfler = Object.entries(harfSayac)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([not]) => not);

        const topVize = Object.entries(vizeSayac).sort((a, b) => b[1] - a[1])[0];
        const topFinal = Object.entries(finalSayac).sort((a, b) => b[1] - a[1])[0];

        const anoOrtalama = anoSayisi > 0 ? anoToplam / anoSayisi : null;

        istatistikleriGoster(genelToplam, sekmeSayilari, topHarfler, topVize, topFinal, harfSayac, final45Sayisi, anoOrtalama, anoSayisi);

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
