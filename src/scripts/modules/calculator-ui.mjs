import { clearFieldError } from './validation.mjs';


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

    // "Mezuniyet Sınavı" giriş yöntemi yalnızca Harf Notu Hesaplama sekmesinde ve
    // Mutlak Sistem seçiliyken sunulur. Sistem Mutlak dışına alınırsa, seçili kalmış
    // olabilecek Mezuniyet Sınavı yöntemini "Tek Not Girişi"ne geri döndürüp arayüzü
    // güncelliyoruz ki gizli kalan bir yöntemle form kilitlenmesin.
    if (formType === 'Harf') {
        const mezuniyetSecenegi = document.getElementById('mezuniyetSinaviSecenegiHarf');
        if (mezuniyetSecenegi) mezuniyetSecenegi.style.display = mutlakSecili ? '' : 'none';
        if (!mutlakSecili) {
            const mezuniyetRadio = document.getElementById('mezuniyetSinaviHarf');
            const tekRadio = document.getElementById('tekOrtalamaHarf');
            if (mezuniyetRadio && mezuniyetRadio.checked && tekRadio) tekRadio.checked = true;
        }
        toggleInputFields('Harf');
    }
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
    if (evt) evt.preventDefault();
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
    // Olaylar ortak belge dinleyicisinden yönlendirildiğinde currentTarget belgeyi
    // gösterir. Köprü işlevi tıklanan öğeyi `this` olarak bağladığı için önce onu
    // kullan; doğrudan yapılan çağrılarda eski currentTarget desteğini koru.
    const tetikleyici = this?.classList ? this : evt?.currentTarget;
    tetikleyici?.classList?.add("active");
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

    // --- Mezuniyet Sınavı (yalnızca Harf Notu sekmesinde, Mutlak Sistem seçiliyken sunulur) ---
    // Bu yöntemde ara sınav/final ayrımı, sınıf ortalaması ve final alt sınırı hiç aranmaz;
    // tek bir "Sınav Notu" girilir ve doğrudan Mutlak Değerlendirme aralıklarıyla karşılaştırılır.
    if (formType === 'Harf') {
        const secilenYontemHarf = document.querySelector(`input[name="hesaplamaYontemi${formType}"]:checked`)?.value || 'tek';
        const mezuniyetSecili = secilenYontemHarf === 'mezuniyet';
        const mezuniyetGrup = document.getElementById('mezuniyet-sinav-grupHarf');
        const normalDegerlendirmeBlok = document.getElementById('normal-degerlendirme-blokHarf');
        const mezuniyetBilgiNotu = document.getElementById('mezuniyetBilgiNotuHarf');
        const sinavNotuInput = document.getElementById('sinav-notu-harf');
        const finalGradeInput = document.getElementById('final-grade');

        if (mezuniyetGrup) mezuniyetGrup.classList.toggle('active', mezuniyetSecili);
        if (normalDegerlendirmeBlok) normalDegerlendirmeBlok.style.display = mezuniyetSecili ? 'none' : '';
        if (mezuniyetBilgiNotu) mezuniyetBilgiNotu.style.display = mezuniyetSecili ? '' : 'none';
        if (sinavNotuInput) {
            sinavNotuInput.required = mezuniyetSecili;
            if (!mezuniyetSecili) clearFieldError(sinavNotuInput);
        }
        if (finalGradeInput) {
            finalGradeInput.required = !mezuniyetSecili;
            if (mezuniyetSecili) clearFieldError(finalGradeInput);
        }

        if (mezuniyetSecili) {
            tekOrtalamaGrup.classList.remove('active');
            detayliGirisGrup.classList.remove('active');
            if (tekOrtalamaInput) { tekOrtalamaInput.required = false; clearFieldError(tekOrtalamaInput); }
            detayliInputs.forEach(input => { input.required = false; clearFieldError(input); });
            return;
        }
    }

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
export { SISTEM_ALAN_HARITASI, sistemSecimiDegisti, SISTEM_BILGI_METINLERI, sistemBilgiIcerikleriOnHazirla, sistemBilgiGoster, sistemBilgiKapat, buildHesaplamaMantigiHTML, openTab, toggleInputFields, calculateMidtermContribution };
