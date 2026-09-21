import { toggleTheme } from './theme.mjs';
import { dinamikDuyurulariYukle } from './announcements.mjs';
import { anketAktifOlanYukle } from './surveys.mjs';
import { sistemSecimiDegisti, buildHesaplamaMantigiHTML, calculateMidtermContribution, openTab, toggleInputFields, sistemBilgiIcerikleriOnHazirla } from './calculator-ui.mjs';
import { clearFieldError, validateNumberField, validateDetailedWeights, showFieldError, getMinimumFinalNotu, validateRequiredField } from './validation.mjs';
import { getMutlakDegerlendirmeNotu, hesaplaDersNotu, gerekenFinaliHesapla, gerekenFinalAciklamasi } from './calculation-core.mjs';
import { hesaplamaLogKaydet, sayfaGoruntulemeLogKaydet, istatistikleriYukle } from './statistics.mjs';
import { urldenHesaplamaYukle } from './semester.mjs';
import { agnoSayfasiBaslat } from './gpa.mjs';
import { hataIzlemeyiBaslat } from './error-monitor.mjs';
import { fakulteleriYukle, yilSecenekleriniDoldur, veriEkleSubmit, modalFakulteleriHazirla } from './courses.mjs';


// --- DOM Yüklendiğinde Çalışacak Kodlar ---
document.addEventListener('DOMContentLoaded', () => {
    hataIzlemeyiBaslat();

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    dinamikDuyurulariYukle();
    anketAktifOlanYukle();

    // Footer'daki telif yılını otomatik güncelle (site 2025'te açıldı, bugünün
    // yılı farklıysa "2025-2026" gibi bir aralık gösterir; her yıl elle değiştirmeye gerek kalmaz)
    const telifYiliEl = document.getElementById('telif-yili');
    if (telifYiliEl) {
        const baslangicYili = 2025;
        const guncelYil = new Date().getFullYear();
        telifYiliEl.textContent = guncelYil > baslangicYili ? `${baslangicYili}-${guncelYil}` : `${baslangicYili}`;
    }

    const harfNotuFormu = document.getElementById('grade-calculator-form');
    const gerekliNotFormu = document.getElementById('required-grade-form');
    const senaryoFormu = document.getElementById('scenario-form');
    const harfNotuSonucAlani = document.getElementById('grade-result');
    const gerekliNotSonucAlani = document.getElementById('required-result');
    const senaryoTabloAlani = document.getElementById('scenario-table-output');

    // Hesaplama sistemi seçim kartlarının başlangıç görünümünü ayarla (varsayılan: 30+ Öğrenci)
    [[harfNotuFormu, 'Harf'], [gerekliNotFormu, 'Gerekli'], [senaryoFormu, 'Senaryo']]
        .forEach(([form, tur]) => { if (form) sistemSecimiDegisti(tur); });

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
            // Sınıf çan ortalaması/standart sapma doğrulaması yalnızca Bağıl (Tablo-1/Tablo-2) sistemde
            // anlamlıdır; bu yüzden hangi sistemin seçili olduğu, o doğrulamadan ÖNCE okunuyor (aşağıda
            // tekrar hesaplanmıyor).
            const sistemSeciliHarf = harfNotuFormu.querySelector('input[name="hesaplamaSistemiHarf"]:checked')?.value || 'tablo1';

            // --- Mezuniyet Sınavı: tamamen ayrı, sade bir hesaplama akışı ---
            // Ara sınav/final ayrımı, sınıf ortalaması ve final alt sınırı bu yöntemde hiç
            // aranmaz; girilen tek "Sınav Notu" doğrudan Mutlak Değerlendirme aralıklarıyla
            // karşılaştırılıp harf notu bulunur, ardından geçiş koşuluna göre mesaj üretilir.
            if (secilenYontem === 'mezuniyet') {
                const sinavNotuInputHarf = document.getElementById('sinav-notu-harf');
                if (!validateNumberField(sinavNotuInputHarf, 'Sınav Notu', 0, 100)) {
                    harfNotuSonucAlani.innerHTML = `<p class="error-message">Lütfen formdaki işaretli hataları düzeltin.</p>`;
                    sinavNotuInputHarf.focus();
                    return;
                }

                const sinavNotu = parseFloat(sinavNotuInputHarf.value);
                const harfNotuMezuniyet = getMutlakDegerlendirmeNotu(sinavNotu);

                const mantikAdimlariMezuniyet = [
                    `Mezuniyet sınavında ara sınav/final ayrımı ve sınıf ortalaması aranmaz; girdiğiniz Sınav Notu (<strong>${sinavNotu.toFixed(2)}</strong>) doğrudan Mutlak Değerlendirme aralıklarıyla karşılaştırıldı.`,
                    `Bu karşılaştırma sonucunda harf notunuz <strong>${harfNotuMezuniyet}</strong> olarak belirlendi.`
                ];

                let sonucMesajiMezuniyet = "";
                const harfNotuBadgeHTMLMezuniyet = `<span class="grade-display-badge grade-display-${harfNotuMezuniyet.toLowerCase()}">${harfNotuMezuniyet}</span>`;
                sonucMesajiMezuniyet += `Sınav Notu: <strong>${sinavNotu.toFixed(2)}</strong><br>`;
                sonucMesajiMezuniyet += `Harf Notu: <strong style="font-size: 1.1em; vertical-align: middle;">${harfNotuBadgeHTMLMezuniyet}</strong>`;
                sonucMesajiMezuniyet += buildHesaplamaMantigiHTML('Nasıl Hesaplandı?', mantikAdimlariMezuniyet);

                if (["AA", "BA", "BB", "CB", "CC"].includes(harfNotuMezuniyet)) {
                    sonucMesajiMezuniyet += `<p class="hesaplama-sonuc-uyari">🎉 <strong>Tebrikler!</strong> Mezuniyet sınavını başarıyla geçtiniz. Diplomanızın hayırlı olmasını, önünüzdeki hayatta da başarılar dileriz.</p>`;
                } else if (harfNotuMezuniyet === "DC") {
                    sonucMesajiMezuniyet += `<p class="hesaplama-sonuc-uyari">ℹ️ Mezuniyet sınavından <strong>DC</strong> aldınız. Bu durumda iki ihtimal söz konusu: bu dersi aldığınız <strong>son dönemdeki dönem ortalamanız (ANO) 2.00 ve üzerindeyse</strong> mezuniyet sınavını geçmiş olursunuz; o dönemdeki ortalamanız <strong>2.00'ın altındaysa</strong>, maalesef mezuniyet sınavını geçememiş olursunuz.</p>`;
                } else {
                    sonucMesajiMezuniyet += `<p class="hesaplama-sonuc-uyari">❌ Maalesef mezuniyet sınavını geçemediniz.</p>`;
                }

                harfNotuSonucAlani.innerHTML = sonucMesajiMezuniyet;
                hesaplamaLogKaydet('harf', harfNotuMezuniyet, null, null, {
                    sistem_secimi: 'mutlak',
                    fakulte_turu: harfNotuFormu.querySelector('input[name="fakulteHarf"]:checked')?.value || 'genel',
                    giris_yontemi: 'mezuniyet',
                    sinav_notu: sinavNotu
                });
                return;
            }

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

            const sinifOrtalamasiVal = parseFloat(classAvgInput.value);
            if (sistemSeciliHarf !== 'mutlak') {
                if (!validateNumberField(classAvgInput, 'Sınıf Çan Ortalaması', 0, 100)) formGecerli = false;

                const minStdDev = (formGecerli && !isNaN(sinifOrtalamasiVal) && sinifOrtalamasiVal < 80) ? 0.0001 : 0;
                if (!validateNumberField(classStdDevInput, 'Standart Sapma', minStdDev, null)) formGecerli = false;

                if (formGecerli && sinifOrtalamasiVal < 80 && parseFloat(classStdDevInput.value) === 0) {
                     showFieldError(classStdDevInput, "Sınıf çan ortalaması 80'den düşükse standart sapma 0 olamaz.");
                     formGecerli = false;
                }
            } else {
                // Mutlak Sistem seçiliyken bu alanlar gizli ve zorunlu değildir; Bağıl sistemden kalma
                // eski bir değer (ör. std. sapma "0") görünmeyen bir hataya takılıp formu kilitlemesin.
                clearFieldError(classAvgInput);
                clearFieldError(classStdDevInput);
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
            // 2 ondalık basamağa yuvarlanıyor. Bu, T-Skoru yuvarlaması (aşağıda ortakSonuc.tSkoru) ve
            // mutlak sistemin tam sayıya yuvarlaması (getMutlakDegerlendirmeNotu) gibi var olan yuvarlama
            // adımlarının YERİNE geçmiyor, onlara EK bir adım.
            const minimumFinalNotu = getMinimumFinalNotu('Harf', harfNotuFormu);
            const ogrenciSayisiInputHarf = document.getElementById('ogrenci-sayisi-harf');
            const ogrenciSayisiHarfVal = (sistemSeciliHarf === 'tablo2' && ogrenciSayisiInputHarf && ogrenciSayisiInputHarf.value.trim() !== '') ? parseInt(ogrenciSayisiInputHarf.value, 10) : null;


            let mantikAdimlari = [];
            let uyariHTML = "";
            const sinifStandartSapmaVal = parseFloat(classStdDevInput.value);
            const ortakSonuc = hesaplaDersNotu({ araSinavKatkisi: araSinavHBNKatkisi, finalNotu,
                sistem: sistemSeciliHarf, ortalama: sinifOrtalamasiVal, standartSapma: sinifStandartSapmaVal, minimumFinal: minimumFinalNotu });
            const hamBasariNotu = ortakSonuc.hbn;
            const harfNotu = ortakSonuc.harfNotu;

            if (finalNotu < minimumFinalNotu) {

                mantikAdimlari.push(`Final notunuz (<strong>${finalNotu.toFixed(2)}</strong>), bu ders için gereken minimum final notunun (<strong>${minimumFinalNotu}</strong>) altında kaldı. Yarıyıl içi notlarınız ne olursa olsun bu durumda doğrudan <strong>FF</strong> alırsınız.`);
            } else if (sistemSeciliHarf === 'mutlak') {
                const mutlakNotKarsiligi = ortakSonuc.mutlakNot;

                mantikAdimlari.push(`Final notunuz (${finalNotu.toFixed(2)}) gereken minimum sınırı (${minimumFinalNotu}) geçtiği için hesaplamaya devam edildi.`);
                mantikAdimlari.push(`Ham Başarı Notunuz = Yarıyıl içi katkısı (${araSinavHBNKatkisi.toFixed(2)}) + Final katkısı (${(finalNotu * 0.50).toFixed(2)}) = <strong>${hamBasariNotu.toFixed(2)}</strong>.`);
                mantikAdimlari.push(`Mutlak Sistem seçildiği için bu puan, sınıftaki diğer öğrencilere bakılmaksızın doğrudan sabit puan aralıklarıyla karşılaştırıldı ve harf notunuz <strong>${harfNotu}</strong> olarak belirlendi.`);
            } else if (hamBasariNotu < 30) {

                mantikAdimlari.push(`Ham Başarı Notunuz (<strong>${hamBasariNotu.toFixed(2)}</strong>) 30'un altında kaldığı için, seçtiğiniz sisteme bakılmaksızın doğrudan <strong>FF</strong> alırsınız.`);
            } else {
                const mutlakNotKarsiligi = ortakSonuc.mutlakNot;
                mantikAdimlari.push(`Final notunuz (${finalNotu.toFixed(2)}) gereken minimum sınırı (${minimumFinalNotu}) geçtiği için hesaplamaya devam edildi.`);
                mantikAdimlari.push(`Ham Başarı Notunuz = Yarıyıl içi katkısı (${araSinavHBNKatkisi.toFixed(2)}) + Final katkısı (${(finalNotu * 0.50).toFixed(2)}) = <strong>${hamBasariNotu.toFixed(2)}</strong>.`);

                if (sinifOrtalamasiVal >= 80) {

                    mantikAdimlari.push(`Girdiğiniz sınıf çan ortalaması (${sinifOrtalamasiVal.toFixed(2)}) 80 veya üzerinde olduğu için, seçtiğiniz sistemden bağımsız olarak bu ders otomatik biçimde Mutlak Sisteme göre değerlendirildi ve harf notunuz <strong>${harfNotu}</strong> oldu.`);
                    uyariHTML = `<p class="hesaplama-sonuc-uyari">ℹ️ Sınıf çan ortalaması yüksek olan derslerde mutlak sistem otomatik olarak devreye girer; bu yüzden üstte seçtiğiniz sistem bu hesaplamada dikkate alınmadı.</p>`;
                } else {
                    const tSkoruHam = ortakSonuc.tSkoruHam;
                    const tSkoru = ortakSonuc.tSkoru;
                    mantikAdimlari.push(`Notunuz, sınıf çan ortalaması (${sinifOrtalamasiVal.toFixed(2)}) ve standart sapmaya (${sinifStandartSapmaVal.toFixed(2)}) göre bir T-Skoruna çevrildi: <strong>${tSkoruHam.toFixed(2)}</strong> (yuvarlanmış: <strong>${tSkoru}</strong>).`);

                    let bagilNot = null;
                    if (sistemSeciliHarf === 'tablo2') {
                        const tablo2Bilgi = ortakSonuc.tablo2Bilgi;
                        bagilNot = tablo2Bilgi ? tablo2Bilgi.harfNotu : null;
                        if (tablo2Bilgi) {
                            mantikAdimlari.push(`1-29 Öğrenci sistemi seçildiği için bu T-Skoru, normal dağılım varsayımıyla yaklaşık bir yüzdelik dilime (<strong>%${tablo2Bilgi.tahminiYuzdelik.toFixed(1)}</strong>) çevrildi ve bu tahmini dilim, yüzdelik dilim tablosunun sınırlarıyla karşılaştırılarak tahmini bağıl notunuz <strong>${bagilNot}</strong> olarak bulundu.`);
                            uyariHTML = `<p class="hesaplama-sonuc-uyari">⚠️ <strong>Bu sonuç bir tahmindir.</strong> 1-29 öğrencili derslerde harf notu, sınıftaki tüm öğrencilerin notlarının sıralanmasıyla belirlenir. Bu hesaplayıcı yalnızca sizin notunuzu bildiği için sınıfın tam sıralamasını bilemez ve size istatistiksel bir tahmin sunar${ogrenciSayisiHarfVal ? ` (girdiğiniz tahmini öğrenci sayısı: ${ogrenciSayisiHarfVal})` : ''}. Gerçek sonucunuz bu tahminden <strong>farklı çıkabilir</strong>; kesin sonuç için dersin öğretim elemanına danışın.</p>`;
                        } else {
                            mantikAdimlari.push(`1-29 Öğrenci sistemi için tahmini bir bağıl not bulunamadı; bu durumda Mutlak Değerlendirme sonucunuz (${mutlakNotKarsiligi}) esas alındı.`);
                        }
                    } else {
                        bagilNot = ortakSonuc.bagilNot;
                        if (bagilNot !== null) {
                            mantikAdimlari.push(`30+ Öğrenci sistemi seçildiği için bu T-Skoru, sabit T-Skoru aralıklarıyla karşılaştırılarak bağıl notunuz <strong>${bagilNot}</strong> olarak belirlendi.`);
                        } else {
                            mantikAdimlari.push(`T-Skorunuz için tanımlı bir bağıl not aralığı bulunamadı; bu durumda Mutlak Değerlendirme sonucunuz (${mutlakNotKarsiligi}) esas alındı.`);
                        }
                    }

                    if (bagilNot !== null) {
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
            const vizeLogHarf = secilenYontem === 'tek'
                ? parseFloat(document.getElementById('midterm-avg').value)
                : parseFloat(document.getElementById('vize-notu-harf').value);
            const sinifOrtLog = parseFloat(classAvgInput.value);
            const stdSapmaLog = parseFloat(classStdDevInput.value);
            hesaplamaLogKaydet('harf', harfNotu, isNaN(vizeLogHarf) ? null : vizeLogHarf, isNaN(finalNotu) ? null : finalNotu, {
                sinif_ortalamasi: isNaN(sinifOrtLog) ? undefined : sinifOrtLog,
                std_sapma: isNaN(stdSapmaLog) ? undefined : stdSapmaLog,
                sistem_secimi: sistemSeciliHarf,
                fakulte_turu: harfNotuFormu.querySelector('input[name="fakulteHarf"]:checked')?.value || 'genel',
                giris_yontemi: secilenYontem
            });
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
            // Sınıf çan ortalaması/standart sapma doğrulaması yalnızca Bağıl (Tablo-1/Tablo-2) sistemde
            // anlamlıdır; bu yüzden hangi sistemin seçili olduğu, o doğrulamadan ÖNCE okunuyor (aşağıda
            // tekrar hesaplanmıyor).
            const sistemSeciliGerekli = gerekliNotFormu.querySelector('input[name="hesaplamaSistemiGerekli"]:checked')?.value || 'tablo1';

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

            const sinifOrtalamasiVal = parseFloat(reqClassAvgInput.value);
            if (sistemSeciliGerekli !== 'mutlak') {
                if (!validateNumberField(reqClassAvgInput, 'Sınıf Çan Ortalaması', 0, 100)) formGecerli = false;

                const minStdDevGerekli = (formGecerli && !isNaN(sinifOrtalamasiVal) && sinifOrtalamasiVal < 80) ? 0.0001 : 0;
                if (!validateNumberField(reqClassStdDevInput, 'Standart Sapma', minStdDevGerekli, null)) formGecerli = false;

                if (formGecerli && sinifOrtalamasiVal < 80 && parseFloat(reqClassStdDevInput.value) === 0) {
                     showFieldError(reqClassStdDevInput, "Sınıf çan ortalaması 80'den düşükse standart sapma 0 olamaz.");
                     formGecerli = false;
                }
            } else {
                // Mutlak Sistem seçiliyken bu alanlar gizli ve zorunlu değildir; Bağıl sistemden kalma
                // eski bir değer (ör. std. sapma "0") görünmeyen bir hataya takılıp formu kilitlemesin.
                clearFieldError(reqClassAvgInput);
                clearFieldError(reqClassStdDevInput);
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
            const ogrenciSayisiInputGerekli = document.getElementById('ogrenci-sayisi-gerekli');
            const ogrenciSayisiGerekliVal = (sistemSeciliGerekli === 'tablo2' && ogrenciSayisiInputGerekli && ogrenciSayisiInputGerekli.value.trim() !== '') ? parseInt(ogrenciSayisiInputGerekli.value, 10) : null;

            let sonucMetni = "";
            let mantikAdimlariReq = [];
            let uyariHTMLReq = "";
            let sistemTuru = "";

            const hesapAyarlari = { araSinavKatkisi: araSinavHBNKatkisi, sistem: sistemSeciliGerekli,
                ortalama: sinifOrtalamasiVal, standartSapma: sinifStandartSapmaVal, minimumFinal: minimumFinalNotu };
            const gerekenFinal = gerekenFinaliHesapla(hesapAyarlari, hedefHarfNotu);
            sonucMetni = gerekenFinal === null ? 'İmkansız (>100)' : gerekenFinal.toFixed(2);
            mantikAdimlariReq = gerekenFinalAciklamasi(hesapAyarlari, hedefHarfNotu, gerekenFinal);
            sistemTuru = sistemSeciliGerekli === 'mutlak' || sinifOrtalamasiVal >= 80 ? 'Mutlak Sistem' : 'Bağıl Sistem';
            if (sistemSeciliGerekli !== 'mutlak' && sinifOrtalamasiVal >= 80) {
                uyariHTMLReq = '<p class="hesaplama-sonuc-uyari">ℹ️ Sınıf çan ortalaması 80 veya üzerinde olduğu için mutlak sistem uygulandı.</p>';
            } else if (sistemSeciliGerekli === 'tablo2') {
                uyariHTMLReq = '<p class="hesaplama-sonuc-uyari">⚠️ <strong>Bu sonuç bir tahmindir.</strong> 1-29 öğrencili derslerde gerçek harf notu sınıfın tam sıralamasına bağlıdır; bu hesaplayıcı normal dağılım varsayımı kullanır.</p>';
            }
            let finalSonucHTML = `Gereken Final Notu (${sistemTuru}): <strong style="font-size: 1.2em;">${sonucMetni}</strong>`;
            finalSonucHTML += buildHesaplamaMantigiHTML('Nasıl Hesaplandı?', mantikAdimlariReq, uyariHTMLReq);
            gerekliNotSonucAlani.innerHTML = finalSonucHTML;
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
                fakulte_turu: gerekliNotFormu.querySelector('input[name="fakulteGerekli"]:checked')?.value || 'genel',
                giris_yontemi: secilenYontem
            });
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
                const hesapAyarlari = { araSinavKatkisi: araSinavHBNKatkisi, sistem: 'mutlak', minimumFinal: minimumFinalNotu };
                const gerekenFinal = gerekenFinaliHesapla(hesapAyarlari, hedefHarfNotu);
                const sonucMetniMutlakSenaryo = gerekenFinal === null ? 'İmkansız (>100)' : gerekenFinal.toFixed(2);
                const mantikAdimlariMutlakSenaryo = gerekenFinalAciklamasi(hesapAyarlari, hedefHarfNotu, gerekenFinal);
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
                    fakulte_turu: senaryoFormu.querySelector('input[name="fakulteSenaryo"]:checked')?.value || 'genel',
                    giris_yontemi: secilenYontem
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
                    const final = gerekenFinaliHesapla({ araSinavKatkisi: araSinavHBNKatkisi,
                        sistem: sistemSeciliSenaryo, ortalama, standartSapma: stdSapma, minimumFinal: minimumFinalNotu }, hedefHarfNotu);
                    if (final === null) gerekenFinalNotu = '100+';
                    else {
                        gerekenFinalNotu = final.toFixed(2);
                        cellClass = final === minimumFinalNotu ? 'min-final' : '';
                        if (!ilkUygunOrnekBulundu) {
                            ornekOrtalama = ortalama; ornekStdSapma = stdSapma; ornekGerekenNot = gerekenFinalNotu;
                            ilkUygunOrnekBulundu = true;
                        }
                    }
                    tabloHTML += `<td class="${cellClass}">${gerekenFinalNotu}</td>`;
                });

                const finalMutlak = gerekenFinaliHesapla({ araSinavKatkisi: araSinavHBNKatkisi,
                    sistem: sistemSeciliSenaryo, ortalama: 80, standartSapma: 0, minimumFinal: minimumFinalNotu }, hedefHarfNotu);
                const gerekenFinalMutlak = finalMutlak === null ? '100+' : finalMutlak.toFixed(2);
                const cellClassMutlak = finalMutlak === null ? 'impossible' : finalMutlak === minimumFinalNotu ? 'min-final' : '';
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
            aciklamaHTML += `<p>📌 <strong>Final alt sınırı:</strong> ${minimumFinalNotu}. Değerler 0,01 puan adımlarıyla hesaplanır; tam sayı not gerekiyorsa yukarı yuvarlayın. &nbsp; <strong>≥80 (Mutlak):</strong> Sınıf çan ort. 80+ ise mutlak sistem. &nbsp; <strong>100+:</strong> Ulaşılamaz hedef.</p>`;
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
                fakulte_turu: senaryoFormu.querySelector('input[name="fakulteSenaryo"]:checked')?.value || 'genel',
                giris_yontemi: secilenYontem
            });
        });
    }

    const firstTabButton = document.querySelector('.tab-button.active') || document.querySelector('.tab-button');
    if (firstTabButton) {
        const tabName = firstTabButton.dataset.nkClickArg1;
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
            const tabName = firstButton.dataset.nkClickArg1;
            openTab({currentTarget: firstButton}, tabName);
         }
    }


    // --- Sayfa görüntüleme logu --- (her sayfada çalışsın: hesap makinesi, Not Kutusu, karşılama ekranı)
    sayfaGoruntulemeLogKaydet();

    // Footer'daki "İstatistiksever" widget'ı tüm sayfalarda ortak (footer paylaşılıyor) — bu yüzden
    // hesap makinesine özel guard'ın DIŞINDA, her sayfada çalışıyor. istatistikleriGoster() zaten
    // 'footer-istatistikler' elementi yoksa sessizce çıkıyor.
    istatistikleriYukle();

    // Aşağıdaki başlatma kodu (form toggle'ları, AGNO dersleri, Ders Verileri sekmesi vb.)
    // SADECE hesap makinesi sekmelerinin bulunduğu sayfalarda gerekli. index.html (artık sadece
    // "Not Hesaplama / Not Kutusu" karşılama ekranı) ve not-kutusu.html'de bu sekmeler/formlar
    // hiç yok — '#harfNotu' varlığını bir "bu bir hesap makinesi sayfası mı" işareti olarak
    // kullanıyoruz (tüm hesap makinesi sayfalarında bu sekme hep var, sadece hangisinin aktif
    // olduğu değişiyor).
    if (document.getElementById('harfNotu')) {
        toggleInputFields('Harf');
        toggleInputFields('Gerekli');
        toggleInputFields('Senaryo');

        // --- Birleşik ANO / AGNO hesaplayıcısını başlat ---
        agnoSayfasiBaslat();

        // --- Paylaşma linki varsa yükle ---
        urldenHesaplamaYukle();

        // Supabase başlat
        fakulteleriYukle();
        yilSecenekleriniDoldur();
        const veriEkleFormu = document.getElementById('veri-ekle-form');
        if (veriEkleFormu) veriEkleFormu.addEventListener('submit', veriEkleSubmit);

        // "Bu Dersin Paylaşılan Verilerini Gör" modalını tıklandığı anda kasmadan açabilmek için,
        // fakülte listesini kullanıcı modalı ilk açmayı beklemeden, sayfa yüklenirken çekiyoruz.
        modalFakulteleriHazirla();

        // Bilgilendirme (sistem bilgisi) modalının içeriğini de sayfa yüklenirken bir kere hazırlayıp
        // gizli halde DOM'a ekliyoruz; tıklandığında sadece görünürlüğü değiştiriliyor, yeniden
        // oluşturulmuyor — böylece tıklama anında hiçbir ağır işlem yapılmıyor.
        sistemBilgiIcerikleriOnHazirla();
    }

});
export {  };
