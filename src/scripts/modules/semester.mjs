import { escHtml } from './dom.mjs';
import { hesaplamaLogKaydet, anoDersGrupLogKaydet } from './statistics.mjs';
import { openTab, toggleInputFields, sistemSecimiDegisti } from './calculator-ui.mjs';


// ============================================================
// DÖNEM ORTALAMASI (ANO) — Madde 11 & 13
// ============================================================

const GANO_KATSAYILARI = {
    'AA': 4.0, 'BA': 3.5, 'BB': 3.0, 'CB': 2.5,
    'CC': 2.0, 'DC': 1.5, 'DD': 1.0, 'FD': 0.5, 'FF': 0.0, 'D': 0.0
};

// Tablo-3'ün "Not Ortalaması" sütunu: D (Devamsız) 0.0 katsayı ile ANO'ya katılır;
// G (Geçer) ve K (Kalır) katılmaz. S (Süren Çalışma) "katılır" görünmesine rağmen sayısal
// katsayısı yayımlanmadığı için arayüzde sunulmaz ve uygulama bu not için varsayım üretmez.
const GANO_HARIC_NOTLAR = ['G', 'K'];


let ganoDersSayac = 0;

let ganoLogTimeout = null;

let ganoSonLogAno = null;
 // aynı ANO değerini tekrar loglamamak için

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
                <input type="text" class="gano-ders-adi-input" placeholder="Örn: Matematik I" data-nk-input="ganoSonucGecersizKil">
            </div>
            <div class="form-group gano-kredi-grup">
                <label>Kredi <span class="zorunlu">*</span></label>
                <input type="number" class="gano-kredi-input" min="1" max="10" step="1" placeholder="3" data-nk-input="ganoSonucGecersizKil">
            </div>
            <div class="form-group gano-not-grup">
                <label>Harf Notu <span class="zorunlu">*</span></label>
                <select class="gano-not-input" data-nk-change="ganoSonucGecersizKil">
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
            <button type="button" class="gano-ders-sil-btn" data-nk-click="ganoDersSil" data-nk-click-arg0="#${id}" aria-label="Dersi kaldır">✕</button>
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
    const tabBtn = document.querySelector(`.tab-button[data-nk-click="openTab"][data-nk-click-arg1="${sekme}"]`);
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
            <input type="text" class="gano-ders-adi-input" placeholder="Örn: Matematik I" value="${escAttr(ad)}" data-nk-input="ganoSonucGecersizKil">
        </div>
        <div class="form-group gano-kredi-grup">
            <label>Kredi <span class="zorunlu">*</span></label>
            <input type="number" class="gano-kredi-input" min="1" max="10" step="1" placeholder="3" value="${escAttr(kredi)}" data-nk-input="ganoSonucGecersizKil">
        </div>
        <div class="form-group gano-not-grup">
            <label>Harf Notu <span class="zorunlu">*</span></label>
            <select class="gano-not-input" data-nk-change="ganoSonucGecersizKil">
                <option value="">Seç</option>${opts}
            </select>
        </div>
        <button type="button" class="gano-ders-sil-btn" data-nk-click="ganoDersSil" data-nk-click-arg0="#${id}" aria-label="Dersi kaldır">✕</button>
    </div>`;
}
export { GANO_KATSAYILARI, GANO_HARIC_NOTLAR, ganoDersSayac, ganoLogTimeout, ganoSonLogAno, ganoDersEkle, ganoHesaplaButon, ganoSonucGecersizKil, ganoDersSil, ganoHesapla, urldenHesaplamaYukle, urldenHesaplamaYukleIc, setVal, escAttr, buildGanoDersSatirHTML };
