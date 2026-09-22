// =============================================
// NOT KUTUSU — Üyelik (KTÜ öğrenci e-postası) ve
// çıkmış soru paylaşım sistemi.
//
// Bu dosya SADECE not-kutusu.html tarafından yüklenir. Site genelinde
// paylaşılan getSupabase() / escHtml() gibi yardımcılar script.js'te
// tanımlı olduğundan burada TEKRAR tanımlanmıyor — not-kutusu.html,
// script.min.js'i bu dosyadan ÖNCE yüklüyor.
//
// v5.0 GÜNCELLEMESİ: Giriş / Kayıt / Şifre Sıfırlama artık bu dosyada
// DEĞİL — site genelinde TEK bir hesap sistemi olsun diye (Not Yakala
// oyunuyla ortak) bütün auth mantığı script.js'e taşındı (hs* fonksiyonları,
// paylaşılan giriş modalı, header'daki hesap butonu). Bu dosya artık
// SADECE, giriş yapıldıktan SONRA görünen üye alanını (fakülte > bölüm >
// ders klasörleri, soru paylaşma) yönetiyor — script.js'in yayınladığı
// 'hesapDurumuDegisti' event'ini dinleyip #nk-giris-alani / #nk-uye-alani
// arasında geçiş yapıyor.
//
// Erişim kontrolü sadece istemci tarafında DEĞİL, asıl olarak Supabase RLS
// politikalarında (is_ktu_uyesi()) yapılıyor.
// =============================================

function nkGetirSupabase() {
    // script.js zaten getSupabase() tanımlıyor ve tek bir client'ı paylaşıyoruz —
    // aynı sayfada iki farklı Supabase client'ı oluşturmamak için onu kullanıyoruz.
    return getSupabase();
}

function nkEscHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
}
function nkEscAttr(str) { return nkEscHtml(str).replace(/"/g, '&quot;'); }

function nkSonucGoster(elId, mesaj, hataMi) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.style.display = 'block';
    const paragraf = document.createElement('p');
    paragraf.className = hataMi ? 'error-message' : 'nk-basari';
    paragraf.textContent = mesaj;
    el.replaceChildren(paragraf);
}

// =============================================
// OTURUM DURUMU — script.js'teki paylaşılan hesap sisteminden gelen
// 'hesapDurumuDegisti' event'ini dinler (bkz. script.js: hsOturumDegistiHandler).
// Bu event sayfa ilk yüklendiğinde bir kez, sonra her giriş/çıkışta tekrar
// tetiklenir — burada ayrıca bir oturum kontrolü yapmaya gerek yok.
// =============================================
window.addEventListener('hesapDurumuDegisti', (e) => {
    const oturum = e.detail && e.detail.oturum;
    nkMevcutKullaniciId = oturum?.id || null;
    if (oturum) {
        nkUyeGorunumunuAc(oturum.email);
        nkKotaGuncelle();
    } else {
        nkGirisGorunumunuAc();
    }
});

function nkGirisGorunumunuAc() {
    nkYuklemeSurumu++;
    nkVeriYuklendi = false;
    nkTumFakulteler = []; nkTumBolumler = []; nkTumDersler = [];
    nkKlasorSayilari = { fakulte: {}, bolum: {} };
    nkDersSayfa = { sayfa: 0, boyut: 24, toplam: 0, arama: '', siralama: 'ad' };
    nkSoruSayfa = { sayfa: 0, boyut: 12, toplam: 0, sinav: '', yil: '' };
    nkState = { fakulteId: null, bolumId: null, dersId: null };
    nkSecilenElementler = [];
    nkElementOnizlemeGuncelle();
    document.getElementById('nk-giris-alani').style.display = 'block';
    document.getElementById('nk-uye-alani').style.display = 'none';
}

function nkUyeGorunumunuAc(eposta) {
    document.getElementById('nk-giris-alani').style.display = 'none';
    document.getElementById('nk-uye-alani').style.display = 'block';
    nkUyeVerileriniYukle();
}

// =============================================
// KLASÖR SİSTEMİ: Fakülte > Bölüm > Ders
// fakulteler/bolumler tabloları "Ders Verileri" özelliğiyle ortak; nk_dersler
// ise Not Kutusu'na özel, moderasyonsuz bir tablo — kullanıcılar "Dersim
// listede yok" diyerek kendi ekliyor (bkz. supabase-not-kutusu-klasor-sistemi.sql).
// Sayaçlar (X paylaşım) sadece durum='onaylandi' olan paylaşımlara göre hesaplanıyor,
// yani başkalarının GERÇEKTEN görebileceği sayı gösteriliyor.
// =============================================
let nkState = { fakulteId: null, bolumId: null, dersId: null };
let nkTumFakulteler = [];
let nkTumBolumler = [];
let nkTumDersler = [];
let nkKlasorSayilari = { fakulte: {}, bolum: {} };
let nkDersSayfa = { sayfa: 0, boyut: 24, toplam: 0, arama: '', siralama: 'ad' };
let nkSoruSayfa = { sayfa: 0, boyut: 12, toplam: 0, sinav: '', yil: '' };
let nkMevcutKullaniciId = null;
const nkIfadeIslemleri = new Set();
let nkDersAramaZamanlayici;
let nkVeriYuklendi = false;
let nkYuklemeSurumu = 0;

async function nkUyeVerileriniYukle() {
    if (nkVeriYuklendi) { nkFakulteGridiGoster(); return; }
    const yuklemeSurumu = ++nkYuklemeSurumu;
    document.getElementById('nk-klasor-alani').innerHTML = '<p class="veri-yukle">Yükleniyor...</p>';

    const sb = nkGetirSupabase();
    try {
        const [fakulteYaniti, bolumYaniti, sayacYaniti] = await Promise.all([
            sb.from('fakulteler').select('id, ad').order('ad'),
            sb.from('bolumler').select('id, ad, fakulte_id').order('ad'),
            sb.rpc('nk_klasor_sayaclari')
        ]);
        for (const yanit of [fakulteYaniti, bolumYaniti, sayacYaniti]) if (yanit.error) throw yanit.error;
        if (yuklemeSurumu !== nkYuklemeSurumu) return;
        nkTumFakulteler = fakulteYaniti.data || [];
        nkTumBolumler = bolumYaniti.data || [];
        nkKlasorSayilari = { fakulte: {}, bolum: {} };
        for (const item of sayacYaniti.data?.fakulteler || []) nkKlasorSayilari.fakulte[item.id] = item;
        for (const item of sayacYaniti.data?.bolumler || []) nkKlasorSayilari.bolum[item.id] = item;
        nkVeriYuklendi = true;
        nkFakulteGridiGoster();
    } catch (error) {
        if (yuklemeSurumu !== nkYuklemeSurumu) return;
        nkVeriYuklendi = false;
        document.getElementById('nk-klasor-alani').innerHTML = '<p class="error-message" role="alert">Ders arşivi yüklenemedi. Bağlantını kontrol edip tekrar dene.</p><button type="button" data-nk-click="nkUyeVerileriniYukle">Tekrar dene</button>';
    }
}

function nkKlasorSayisi(seviye, id) {
    if (seviye === 'ders') return nkTumDersler.find(d => String(d.id) === String(id))?.soru_sayisi || 0;
    if (seviye === 'bolum') return nkKlasorSayilari.bolum[id]?.soru_sayisi || 0;
    if (seviye === 'fakulte') return nkKlasorSayilari.fakulte[id]?.soru_sayisi || 0;
    return 0;
}

function nkBreadcrumbGuncelle() {
    const bc = document.getElementById('nk-breadcrumb');
    let html = `<span class="nk-breadcrumb-konum">Konum</span><button type="button" class="nk-breadcrumb-item" data-nk-click="nkFakulteGridiGoster">Fakülteler</button>`;
    if (nkState.fakulteId != null) {
        const f = nkTumFakulteler.find(x => String(x.id) === String(nkState.fakulteId));
        html += `<span class="nk-breadcrumb-ok">›</span><button type="button" class="nk-breadcrumb-item" data-nk-click="nkBolumGridiGoster">${nkEscHtml(f ? f.ad : '')}</button>`;
    }
    if (nkState.bolumId != null) {
        const b = nkTumBolumler.find(x => String(x.id) === String(nkState.bolumId));
        html += `<span class="nk-breadcrumb-ok">›</span><button type="button" class="nk-breadcrumb-item" data-nk-click="nkDersGridiGoster">${nkEscHtml(b ? b.ad : '')}</button>`;
    }
    if (nkState.dersId != null) {
        const d = nkTumDersler.find(x => String(x.id) === String(nkState.dersId));
        html += `<span class="nk-breadcrumb-ok">›</span><span class="nk-breadcrumb-item nk-breadcrumb-aktif">${nkEscHtml(d ? d.ders_adi : '')}</span>`;
    }
    bc.innerHTML = html;
}

function nkKatalogBaslik(baslik, aciklama, adet, etiket) {
    return `<div class="nk-katalog-baslik">
        <div><span>${etiket}</span><h3>${nkEscHtml(baslik)}</h3><p>${aciklama}</p></div>
        <strong>${adet}</strong>
    </div>`;
}

function nkFakulteGridiGoster() {
    nkState.fakulteId = null; nkState.bolumId = null; nkState.dersId = null;
    document.getElementById('nk-ders-alani').style.display = 'none';
    document.getElementById('nk-klasor-alani').style.display = '';
    nkBreadcrumbGuncelle();
    const alan = document.getElementById('nk-klasor-alani');
    if (!nkTumFakulteler.length) { alan.innerHTML = '<div class="nk-katalog-bos"><strong>Henüz fakülte eklenmemiş.</strong><span>Yeni fakülteler eklendiğinde burada listelenecek.</span></div>'; return; }
    alan.innerHTML = nkKatalogBaslik('Fakülteler', 'Bölümünü seçerek ders arşivine ulaş.', nkTumFakulteler.length, 'Başlangıç') + `<div class="nk-klasor-grid">${nkTumFakulteler.map(f => `
        <button type="button" class="nk-klasor-karti" data-nk-click="nkFakulteSec" data-nk-click-arg0="${f.id}">
            <span class="nk-klasor-ikon">🏫</span>
            <span class="nk-klasor-adi">${nkEscHtml(f.ad)}</span>
            <span class="nk-klasor-sayi">${nkKlasorSayisi('fakulte', f.id)} paylaşım</span>
        </button>`).join('')}</div>`;
}

function nkFakulteSec(id) { nkState.fakulteId = id; nkBolumGridiGoster(); }

function nkBolumGridiGoster() {
    nkState.bolumId = null; nkState.dersId = null;
    document.getElementById('nk-ders-alani').style.display = 'none';
    document.getElementById('nk-klasor-alani').style.display = '';
    nkBreadcrumbGuncelle();
    const alan = document.getElementById('nk-klasor-alani');
    const bolumler = nkTumBolumler.filter(b => String(b.fakulte_id) === String(nkState.fakulteId));
    const fakulte = nkTumFakulteler.find(f => String(f.id) === String(nkState.fakulteId));
    if (!bolumler.length) { alan.innerHTML = '<div class="nk-katalog-bos"><strong>Bu fakültede henüz bölüm yok.</strong><span>Bölüm eklendiğinde ders arşivleri burada görünür.</span></div>'; return; }
    alan.innerHTML = nkKatalogBaslik(fakulte ? fakulte.ad : 'Bölümler', 'Bir bölüm seçerek ders kataloğunu aç.', bolumler.length, 'Bölümler') + `<div class="nk-klasor-grid">${bolumler.map(b => `
        <button type="button" class="nk-klasor-karti" data-nk-click="nkBolumSec" data-nk-click-arg0="${b.id}">
            <span class="nk-klasor-ikon">📁</span>
            <span class="nk-klasor-adi">${nkEscHtml(b.ad)}</span>
            <span class="nk-klasor-sayi">${nkKlasorSayisi('bolum', b.id)} paylaşım</span>
        </button>`).join('')}</div>`;
}

function nkBolumSec(id) {
    nkState.bolumId = id;
    nkDersSayfa = { sayfa: 0, boyut: 24, toplam: 0, arama: '', siralama: 'ad' };
    nkDersGridiGoster();
}

async function nkDersGridiGoster() {
    const aramaOdakliydi = document.activeElement?.id === 'nk-ders-arama-input';
    nkState.dersId = null;
    document.getElementById('nk-ders-alani').style.display = 'none';
    document.getElementById('nk-klasor-alani').style.display = '';
    nkBreadcrumbGuncelle();
    const alan = document.getElementById('nk-klasor-alani');
    const bolum = nkTumBolumler.find(b => String(b.id) === String(nkState.bolumId));
    alan.innerHTML = '<p class="veri-yukle">Dersler aranıyor...</p>';
    const { data, error } = await nkGetirSupabase().rpc('nk_ders_ara', {
        p_bolum_id: nkState.bolumId, p_arama: nkDersSayfa.arama || null,
        p_limit: nkDersSayfa.boyut, p_offset: nkDersSayfa.sayfa * nkDersSayfa.boyut,
        p_siralama: nkDersSayfa.siralama
    });
    if (error) { alan.innerHTML = `<p class="error-message">Dersler yüklenemedi: ${nkEscHtml(error.message)}</p>`; return; }
    nkTumDersler = data?.satirlar || [];
    nkDersSayfa.toplam = Number(data?.toplam || 0);
    const dersSatirlari = nkTumDersler.map(d => `
        <button type="button" class="nk-ders-katalog-satir" data-nk-click="nkDersSec" data-nk-click-arg0="${d.id}">
            <span class="nk-ders-katalog-ikon">▤</span>
            <span class="nk-ders-katalog-bilgi"><strong>${nkEscHtml(d.ders_adi)}</strong><small>${d.ders_kodu ? nkEscHtml(d.ders_kodu) : 'Ders kodu belirtilmemiş'}</small></span>
            <span class="nk-ders-katalog-sayi">${nkKlasorSayisi('ders', d.id)} <small>paylaşım</small></span>
            <span class="nk-ders-katalog-ok" aria-hidden="true">→</span>
        </button>`).join('');
    const bosDurum = nkTumDersler.length ? '' : '<div class="nk-katalog-bos"><strong>Aramana uygun ders bulunamadı.</strong><span>Ders yoksa aşağıdaki bağlantıdan ekleyebilirsin.</span></div>';
    const toplamSayfa = Math.max(1, Math.ceil(nkDersSayfa.toplam / nkDersSayfa.boyut));
    alan.innerHTML = nkKatalogBaslik(bolum ? bolum.ad : 'Dersler', 'Arama ve sayaçlar sunucuda hesaplanır.', nkDersSayfa.toplam, 'Ders kataloğu') + `
        <div class="nk-ders-katalog-araclar"><label class="nk-ders-arama"><span aria-hidden="true">⌕</span><input id="nk-ders-arama-input" type="search" value="${nkEscAttr(nkDersSayfa.arama)}" placeholder="Ders adı veya kodu ara" data-nk-input="nkDersListesiniFiltrele" data-nk-input-arg0="@value"></label><select class="nk-ders-siralama" data-nk-change="nkDersleriSirala" data-nk-change-arg0="@value" aria-label="Dersleri sırala"><option value="ad" ${nkDersSayfa.siralama === 'ad' ? 'selected' : ''}>Ada göre sırala</option><option value="soru" ${nkDersSayfa.siralama === 'soru' ? 'selected' : ''}>En çok paylaşım</option></select></div>
        <div class="nk-ders-katalog" id="nk-ders-katalog">${dersSatirlari}</div>${bosDurum}
        ${nkSayfalamaHtml('nkDersSayfasiDegistir', nkDersSayfa.sayfa, toplamSayfa)}
        <button type="button" class="nk-ders-ekle-satir" data-nk-click="nkYeniDersFormunuGoster"><span>＋</span><strong>Dersin listede yok mu?</strong><small>Yeni ders ekle</small></button><div id="nk-yeni-ders-form-alani"></div>`;
    if (aramaOdakliydi) document.getElementById('nk-ders-arama-input')?.focus({ preventScroll: true });
}

function nkDersListesiniFiltrele(arama) {
    nkDersSayfa.arama = String(arama || '').trim(); nkDersSayfa.sayfa = 0;
    clearTimeout(nkDersAramaZamanlayici);
    nkDersAramaZamanlayici = setTimeout(nkDersGridiGoster, 300);
}

function nkDersleriSirala(tur) {
    nkDersSayfa.siralama = tur === 'soru' ? 'soru' : 'ad'; nkDersSayfa.sayfa = 0; nkDersGridiGoster();
}

function nkSayfalamaHtml(islem, sayfa, toplamSayfa) {
    if (toplamSayfa <= 1) return '';
    return `<nav class="nk-sayfalama" aria-label="Sayfalama"><button type="button" data-nk-click="${islem}" data-nk-click-arg0="#${sayfa - 1}" ${sayfa <= 0 ? 'disabled' : ''}>← Önceki</button><span>${sayfa + 1} / ${toplamSayfa}</span><button type="button" data-nk-click="${islem}" data-nk-click-arg0="#${sayfa + 1}" ${sayfa + 1 >= toplamSayfa ? 'disabled' : ''}>Sonraki →</button></nav>`;
}
function nkDersSayfasiDegistir(sayfa) { nkDersSayfa.sayfa = Math.max(0, Number(sayfa) || 0); nkDersGridiGoster(); }

function nkYeniDersFormunuGoster() {
    const alan = document.getElementById('nk-yeni-ders-form-alani');
    alan.innerHTML = `
        <form id="nk-yeni-ders-form" class="nk-yeni-ders-form" novalidate>
            <div class="form-group">
                <label for="nk-yeni-ders-adi">Ders Adı:</label>
                <input type="text" id="nk-yeni-ders-adi" placeholder="Örn. Bilgisayar Ağları" maxlength="120" required>
            </div>
            <div class="form-group">
                <label for="nk-yeni-ders-kodu">Ders Kodu <small>(opsiyonel)</small>:</label>
                <input type="text" id="nk-yeni-ders-kodu" placeholder="Örn. BLM301" maxlength="20">
            </div>
            <div class="btn-grup">
                <button type="submit">Ekle</button>
                <button type="button" data-nk-click="nkElementBosalt" data-nk-click-arg0="nk-yeni-ders-form-alani">Vazgeç</button>
            </div>
        </form>
        <div id="nk-yeni-ders-sonuc" class="result-box" style="display:none;"></div>`;
    document.getElementById('nk-yeni-ders-form').addEventListener('submit', nkYeniDersFormSubmit);
    document.getElementById('nk-yeni-ders-adi').focus();
}

async function nkYeniDersFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const adi = document.getElementById('nk-yeni-ders-adi').value.trim();
    const kodGirdisi = document.getElementById('nk-yeni-ders-kodu').value.trim();
    const kodu = kodGirdisi ? NKDersKodu.standartlastir(kodGirdisi) : null;
    if (!adi) return;
    if (kodGirdisi && !kodu) {
        nkSonucGoster('nk-yeni-ders-sonuc', 'Ders kodu BLM301 gibi harf ve rakamlardan oluşmalı.', true);
        return;
    }

    btn.disabled = true;
    const eskiMetin = btn.textContent;
    btn.textContent = 'Ekleniyor...';

    try {
        const { data, error } = await nkGetirSupabase().from('nk_dersler')
            .insert({ bolum_id: nkState.bolumId, ders_adi: adi, ders_kodu: kodu })
            .select('id, ders_adi, ders_kodu, ders_kodu_standart, bolum_id')
            .single();

        if (error) {
            if (error.code === '23505') {
                // Aynı bölümde aynı isimde (büyük/küçük harf ve boşluk farkı gözetmeksizin) ders
                // zaten var — hata göstermek yerine kullanıcıyı doğrudan o derse yönlendiriyoruz.
                const { data: mevcut } = await nkGetirSupabase().from('nk_dersler')
                    .select('id, ders_adi, ders_kodu, ders_kodu_standart, bolum_id')
                    .eq('bolum_id', nkState.bolumId)
                    .ilike('ders_adi', adi)
                    .maybeSingle();
                if (mevcut) {
                    if (!nkTumDersler.some(d => String(d.id) === String(mevcut.id))) nkTumDersler.push(mevcut);
                    nkSonucGoster('nk-yeni-ders-sonuc', 'Bu ders zaten ekliymiş, ona yönlendiriliyorsun.', false);
                    nkState.dersId = mevcut.id;
                    setTimeout(nkDersDetayiGoster, 500);
                    return;
                }
            }
            nkSonucGoster('nk-yeni-ders-sonuc', 'Ders eklenemedi: ' + error.message, true);
            return;
        }

        data.soru_sayisi = 0;
        nkTumDersler.push(data);
        nkState.dersId = data.id;
        nkDersDetayiGoster();
    } finally {
        btn.disabled = false;
        btn.textContent = eskiMetin;
    }
}

function nkDersSec(id) {
    nkState.dersId = id;
    nkSoruSayfa = { sayfa: 0, boyut: 12, toplam: 0, sinav: '', yil: '' };
    nkDersDetayiGoster();
}

function nkDersDetayiGoster() {
    document.getElementById('nk-klasor-alani').style.display = 'none';
    document.getElementById('nk-ders-alani').style.display = '';
    nkBreadcrumbGuncelle();
    const d = nkTumDersler.find(x => String(x.id) === String(nkState.dersId));
    document.getElementById('nk-ders-baslik').textContent = d
        ? (d.ders_kodu ? `${d.ders_kodu} — ${d.ders_adi}` : d.ders_adi)
        : '';
    nkSwitchTab('gor');
}

// =============================================
// SEKME GEÇİŞİ (Soruları Gör / Soru Paylaş)
// =============================================
function nkSwitchTab(tab) {
    const alan = document.getElementById('nk-uye-alani');
    alan.querySelectorAll('.nk-tab-btn').forEach(b => b.classList.remove('active'));
    alan.querySelectorAll('.nk-tab-content').forEach(c => c.classList.remove('active'));
    alan.querySelector(`.nk-tab-btn[data-nk-click="nkSwitchTab"][data-nk-click-arg0="${tab}"]`).classList.add('active');
    document.getElementById(`nk-tab-${tab}`).classList.add('active');
    if (tab === 'gor' && nkState.dersId) nkSoruListele();
}

// =============================================
// SORULARI LİSTELE
// =============================================
const NK_SINAV_ETIKET = { vize: 'Vize', final: 'Final', butunleme: 'Bütünleme', ders_notu: 'Ders Notu', diger: 'Diğer' };
const NK_DURUM_ETIKET = { beklemede: '⏳ Onay Bekliyor', onaylandi: '✅ Onaylandı', reddedildi: '❌ Reddedildi' };
const NK_IFADELER = [
    { anahtar: 'faydali', emoji: '👍', etiket: 'Faydalı' },
    { anahtar: 'tesekkur', emoji: '❤️', etiket: 'Teşekkür' },
    { anahtar: 'zor', emoji: '🤔', etiket: 'Zor' }
];

function nkIfadeHtml(soru, ozet) {
    const kendiSorusu = String(soru.kullanici_id) === String(nkMevcutKullaniciId);
    const aciklama = kendiSorusu ? 'Kendi paylaşımına tepki veremezsin.' : 'Bir tepki seç veya seçili tepkiye yeniden basarak kaldır.';
    return `<div class="nk-ifade-grubu" aria-label="Paylaşım tepkileri" data-nk-ifade-soru="${nkEscAttr(soru.id)}">
        ${NK_IFADELER.map(ifade => {
            const secili = ozet?.benim_ifadem === ifade.anahtar;
            const sayi = Number(ozet?.[ifade.anahtar] || 0);
            return `<button type="button" class="nk-ifade-btn${secili ? ' secili' : ''}" data-nk-click="nkSoruIfadeDegistir" data-nk-click-arg0="${nkEscAttr(soru.id)}" data-nk-click-arg1="${ifade.anahtar}" data-ifade="${ifade.anahtar}" aria-pressed="${secili}" aria-label="${ifade.etiket}: ${sayi}" title="${nkEscAttr(kendiSorusu ? aciklama : ifade.etiket)}" ${kendiSorusu ? 'disabled' : ''}><span aria-hidden="true">${ifade.emoji}</span><span class="nk-ifade-etiket">${ifade.etiket}</span><strong>${sayi}</strong></button>`;
        }).join('')}
        <span class="nk-ifade-aciklama" role="status" aria-live="polite">${kendiSorusu ? aciklama : ''}</span>
    </div>`;
}

async function nkIfadeOzetleriniYukle(sorular) {
    const onayliSorular = sorular.filter(s => s.durum === 'onaylandi');
    if (!onayliSorular.length) return;
    const { data, error } = await nkGetirSupabase().rpc('nk_soru_ifade_ozetleri', {
        p_soru_ids: onayliSorular.map(s => s.id)
    });
    if (error) {
        console.warn('[Not Kutusu] Tepki özetleri yüklenemedi:', error.message);
        return;
    }
    const ozetler = new Map((Array.isArray(data) ? data : []).map(o => [String(o.soru_id), o]));
    onayliSorular.forEach(soru => {
        const yer = document.querySelector(`[data-nk-ifade-yer="${soru.id}"]`);
        if (yer) yer.innerHTML = nkIfadeHtml(soru, ozetler.get(String(soru.id)));
    });
}

async function nkSoruIfadeDegistir(soruId, ifade) {
    if (!/^[0-9a-f-]{36}$/i.test(soruId) || !NK_IFADELER.some(x => x.anahtar === ifade) || nkIfadeIslemleri.has(soruId)) return;
    const grup = document.querySelector(`[data-nk-ifade-soru="${soruId}"]`);
    if (!grup) return;
    nkIfadeIslemleri.add(soruId);
    grup.querySelectorAll('button').forEach(b => { b.disabled = true; });
    grup.classList.add('yukleniyor');
    try {
        const { data, error } = await nkGetirSupabase().rpc('nk_soru_ifade_ayarla', { p_soru_id: soruId, p_ifade: ifade });
        if (error) throw error;
        const mesajlar = {
            uyelik_gerekli: 'Tepki vermek için doğrulanmış KTÜ üyeliği gerekiyor.',
            kendi_icerigin: 'Kendi paylaşımına tepki veremezsin.',
            soru_kapali: 'Bu paylaşım artık tepkilere açık değil.',
            gecersiz_ifade: 'Bu tepki kullanılamıyor.'
        };
        if (!data?.basarili) throw new Error(mesajlar[data?.hata] || 'Tepki kaydedilemedi.');
        grup.querySelectorAll('.nk-ifade-btn').forEach(b => {
            const tur = b.dataset.ifade;
            const sayi = Number(data[tur] || 0);
            const secili = data.benim_ifadem === tur;
            b.classList.toggle('secili', secili);
            b.setAttribute('aria-pressed', String(secili));
            b.setAttribute('aria-label', `${NK_IFADELER.find(x => x.anahtar === tur)?.etiket || tur}: ${sayi}`);
            const sayac = b.querySelector('strong');
            if (sayac) sayac.textContent = String(sayi);
        });
        grup.querySelector('.nk-ifade-aciklama').textContent = data.benim_ifadem ? 'Tepkin kaydedildi.' : 'Tepkin kaldırıldı.';
        grup.classList.remove('hatali');
    } catch (error) {
        grup.querySelector('.nk-ifade-aciklama').textContent = error.message || 'Tepki kaydedilemedi.';
        grup.classList.add('hatali');
    } finally {
        nkIfadeIslemleri.delete(soruId);
        grup.classList.remove('yukleniyor');
        grup.querySelectorAll('button').forEach(b => { b.disabled = false; });
    }
}

async function nkSoruListele() {
    const alan = document.getElementById('nk-soru-listesi');
    if (!nkState.dersId) {
        alan.innerHTML = '<p class="veri-bos">Lütfen bir ders seçin.</p>';
        return;
    }
    alan.innerHTML = '<p class="veri-yukle">Yükleniyor...</p>';

    let sorgu = nkGetirSupabase()
        .from('sorular')
        .select('id, kullanici_id, sinav_turu, akademik_yil, durum, element_yollari, olusturulma_tarihi, moderasyon_nedeni, moderasyon_notu', { count: 'exact' })
        .eq('ders_id', nkState.dersId)
        .order('akademik_yil', { ascending: false })
        .order('olusturulma_tarihi', { ascending: false });
    if (nkSoruSayfa.sinav) sorgu = sorgu.eq('sinav_turu', nkSoruSayfa.sinav);
    if (nkSoruSayfa.yil) sorgu = sorgu.eq('akademik_yil', Number(nkSoruSayfa.yil));
    const baslangic = nkSoruSayfa.sayfa * nkSoruSayfa.boyut;
    const { data, error, count } = await sorgu.range(baslangic, baslangic + nkSoruSayfa.boyut - 1);

    if (error) {
        alan.innerHTML = `<p class="error-message">Sorular yüklenirken hata oluştu: ${nkEscHtml(error.message)}</p>`;
        return;
    }
    nkSoruSayfa.toplam = Number(count || 0);
    const simdikiYil = new Date().getFullYear();
    const yilSecenekleri = Array.from({ length: Math.max(1, simdikiYil - 2014) }, (_, i) => simdikiYil - i)
        .map(y => `<option value="${y}" ${String(y) === String(nkSoruSayfa.yil) ? 'selected' : ''}>${y}-${y + 1}</option>`).join('');
    const toplamSayfa = Math.max(1, Math.ceil(nkSoruSayfa.toplam / nkSoruSayfa.boyut));
    let html = `<div class="nk-arsiv-ust">
        <div><span>Paylaşımlar</span><strong>${nkSoruSayfa.toplam} kayıt</strong></div>
        <small>Süzme ve sayfalama sunucuda uygulanır.</small>
    </div><div class="nk-arsiv-filtreleri">
        <select aria-label="Paylaşım türü" data-nk-change="nkSoruFiltresiDegistir" data-nk-change-arg0="sinav" data-nk-change-arg1="@value"><option value="">Tüm türler</option><option value="vize" ${nkSoruSayfa.sinav === 'vize' ? 'selected' : ''}>Vize</option><option value="final" ${nkSoruSayfa.sinav === 'final' ? 'selected' : ''}>Final</option><option value="butunleme" ${nkSoruSayfa.sinav === 'butunleme' ? 'selected' : ''}>Bütünleme</option><option value="ders_notu" ${nkSoruSayfa.sinav === 'ders_notu' ? 'selected' : ''}>Ders Notu</option><option value="diger" ${nkSoruSayfa.sinav === 'diger' ? 'selected' : ''}>Diğer</option></select>
        <select aria-label="Akademik yıl" data-nk-change="nkSoruFiltresiDegistir" data-nk-change-arg0="yil" data-nk-change-arg1="@value"><option value="">Tüm yıllar</option>${yilSecenekleri}</select>
    </div>`;
    if (!data || data.length === 0) {
        const filtreVar = nkSoruSayfa.sinav || nkSoruSayfa.yil;
        alan.innerHTML = html + `<p class="veri-bos">${filtreVar ? 'Bu filtrelere uyan paylaşım bulunamadı.' : 'Bu ders için henüz içerik paylaşılmamış. “Paylaş” sekmesinden ilk sen paylaş!'}</p>`;
        return;
    }
    html += '<div class="nk-soru-kart-wrapper">';
    data.forEach(s => {
        const durumSinifi = s.durum || 'beklemede';
        const elementler = NKDosya.guvenliYollar(s.element_yollari);
        const galeriId = `nk-soru-${s.id}`;
        hsGaleriKaydet(galeriId, elementler.filter(yol => !nkElementPdfMi(yol)).map(yol => nkElementUrlAl(yol)));
        let gorselSira = -1;
        const fotoHtml = elementler.length
            ? `<div class="nk-soru-fotograflar">${elementler.map(yol => {
                const url = nkElementUrlAl(yol);
                if (nkElementPdfMi(yol)) {
                    return `<a class="nk-soru-element-pdf" href="#" data-nk-url="${url}" title="PDF'i aç">PDF</a>`;
                }
                gorselSira++;
                return `<img class="nk-soru-fotograf-kucuk" data-nk-url="${url}" alt="Paylaşım görseli" data-nk-click="hsElementAc" data-nk-click-arg0="${galeriId}" data-nk-click-arg1="${gorselSira}">`;
            }).join('')}</div>`
            : '<span class="nk-soru-alt">Dosya eklenmemiş</span>';
        const indirmeHtml = elementler.length ? `<div class="nk-dosya-indirmeler">${elementler.map((yol,index) => {
            const url = nkElementUrlAl(yol);
            return `<button type="button" class="nk-dosya-indir-btn" data-nk-download="${nkEscAttr(url)}">↓ Ek ${index + 1}'i indir</button>`;
        }).join('')}</div>` : '';
        const bildirButonu = s.durum === 'onaylandi' ? `<button type="button" class="nk-bildir-btn" data-nk-click="nkBildirimModalAc" data-nk-click-arg0="${s.id}">⚑ Bildir</button>` : '';
        const moderasyon = s.durum === 'reddedildi' && s.moderasyon_nedeni
            ? `<span class="nk-soru-alt">Neden: ${nkEscHtml(NK_MODERASYON_ETIKET[s.moderasyon_nedeni] || s.moderasyon_nedeni)}</span>` : '';
        html += `<article class="nk-soru-kart">
            <div class="nk-soru-tarih">${s.akademik_yil}<small>${s.akademik_yil + 1}</small></div>
            <div class="nk-soru-kart-sol">
                <span class="nk-soru-etiket">${NK_SINAV_ETIKET[s.sinav_turu] || s.sinav_turu}</span>
                <span class="nk-soru-alt">${elementler.length ? `${elementler.length} ek` : 'Ek yok'}</span>
            </div>
            <div class="nk-soru-onizlemeler">${fotoHtml}${indirmeHtml}</div>
            <div class="nk-soru-kart-islem"><span class="nk-soru-durum ${nkEscHtml(durumSinifi)}">${NK_DURUM_ETIKET[durumSinifi] || durumSinifi}</span>${moderasyon}${bildirButonu}</div>
            ${s.durum === 'onaylandi' ? `<div class="nk-ifade-yer" data-nk-ifade-yer="${nkEscAttr(s.id)}"></div>` : ''}
        </article>`;
    });
    html += `</div>${nkSayfalamaHtml('nkSoruSayfasiDegistir', nkSoruSayfa.sayfa, toplamSayfa)}`;
    alan.innerHTML = html;
    nkIfadeOzetleriniYukle(data);
}

const NK_MODERASYON_ETIKET = {
    uygun: 'Uygun', okunmuyor: 'Okunmuyor', yanlis_ders: 'Yanlış ders', yanlis_bilgi: 'Yanlış bilgi',
    tekrar: 'Tekrar içerik', telif: 'Telif hakkı', kisisel_veri: 'Kişisel veri', spam: 'Spam', diger: 'Diğer'
};
function nkSoruFiltresiDegistir(alan, deger) {
    if (alan === 'sinav') nkSoruSayfa.sinav = deger;
    if (alan === 'yil') nkSoruSayfa.yil = deger;
    nkSoruSayfa.sayfa = 0; nkSoruListele();
}
function nkSoruSayfasiDegistir(sayfa) { nkSoruSayfa.sayfa = Math.max(0, Number(sayfa) || 0); nkSoruListele(); }

let nkBildirilenSoruId = null;
function nkBildirimModalAc(soruId) {
    nkBildirilenSoruId = soruId;
    document.getElementById('nk-bildirim-form')?.reset();
    const sonuc = document.getElementById('nk-bildirim-sonuc');
    if (sonuc) sonuc.replaceChildren();
    document.getElementById('nk-bildirim-modal')?.classList.add('aktif');
}
function nkBildirimModalKapat(event) {
    const modal = document.getElementById('nk-bildirim-modal');
    if (event && event.target !== modal) return;
    modal?.classList.remove('aktif'); nkBildirilenSoruId = null;
}
async function nkBildirimGonder(event) {
    event.preventDefault();
    if (!nkBildirilenSoruId) return;
    const form = event.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    const neden = form.elements.neden.value;
    const aciklama = form.elements.aciklama.value.trim();
    btn.disabled = true;
    try {
        const { data, error } = await nkGetirSupabase().rpc('nk_icerik_bildir', {
            p_soru_id: nkBildirilenSoruId, p_neden: neden, p_aciklama: aciklama || null
        });
        if (error) throw error;
        const mesajlar = { zaten_bildirildi: 'Bu içeriği daha önce bildirdin.', kendi_icerigin: 'Kendi paylaşımını bildiremezsin.', sinir_asildi: 'Günlük bildirim sınırına ulaştın.' };
        if (!data?.basarili) throw new Error(mesajlar[data?.hata] || 'Bildirim gönderilemedi.');
        nkSonucGoster('nk-bildirim-sonuc', 'Bildirimin inceleme kuyruğuna alındı. Teşekkürler.', false);
        setTimeout(() => nkBildirimModalKapat(null), 900);
    } catch (error) { nkSonucGoster('nk-bildirim-sonuc', error.message, true); }
    finally { btn.disabled = false; }
}

// =============================================
// SORU ELEMANLARI (fotoğraf/PDF) — Cloudflare R2'ye yükleme
// (bkz. supabase-soru-fotograflari.sql ve cloudflare-worker/worker.js: sadece
// giriş yapmış KTÜ üyeleri kendi klasörüne (auth.uid()) yükleyebiliyor.)
// =============================================
const NK_ELEMENT_MAX_ADET = 5;
const NK_ELEMENT_MAX_BOYUT = 5 * 1024 * 1024;
const NK_FOTO_KAYNAK_MAX_BOYUT = 20 * 1024 * 1024;
const NK_ELEMENT_IZINLI_TIPLER = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const NK_ELEMENT_UZANTI = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const NK_FOTO_MAX_KENAR = 3200;
const NK_FOTO_KALITE = 0.94;

// NK_ELEMENT_WORKER_URL: script.js'te tanımlı, aynı sayfada paylaşılan global
// (script.min.js, not-kutusu.min.js'ten önce yükleniyor — bkz. not-kutusu.html).
// Ekler (fotoğraf/PDF) Cloudflare R2'de tutuluyor; yükleme/okuma bu Worker
// adresi üzerinden yapılıyor (bkz. cloudflare-worker/worker.js).
function nkElementUrlAl(yol) {
    return NKDosya.dosyaUrl(yol, NK_ELEMENT_WORKER_URL);
}

// Bir R2 yolunun (ör. "uid/uuid.pdf") PDF olup olmadığını uzantıya bakarak
// anlar — PDF'ler <img> ile gösterilemediği için listeleme/önizlemede
// fotoğraflardan farklı (link/ikon) işleniyor.
function nkElementPdfMi(yolVeyaDosya) {
    const ad = typeof yolVeyaDosya === 'string' ? yolVeyaDosya : (yolVeyaDosya?.name || '');
    return /\.pdf$/i.test(ad) || yolVeyaDosya?.type === 'application/pdf';
}

// Küçük görsellere dokunulmaz. Büyük görseller aynı en-boy oranıyla, yüksek
// kalite WebP olarak kodlanır; yalnızca gerçekten küçülürse yeni dosya kullanılır.
async function nkFotografSikistir(dosya) {
    if (typeof createImageBitmap !== 'function') return dosya;
    let bitmap;
    try {
        bitmap = await createImageBitmap(dosya);
        const enBuyukKenar = Math.max(bitmap.width, bitmap.height);
        const zatenKucuk = enBuyukKenar <= NK_FOTO_MAX_KENAR && dosya.size <= 1024 * 1024;
        if (zatenKucuk) return dosya;

        const olcek = Math.min(1, NK_FOTO_MAX_KENAR / enBuyukKenar);
        const genislik = Math.max(1, Math.round(bitmap.width * olcek));
        const yukseklik = Math.max(1, Math.round(bitmap.height * olcek));
        const canvas = document.createElement('canvas');
        canvas.width = genislik;
        canvas.height = yukseklik;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, genislik, yukseklik);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', NK_FOTO_KALITE));
        if (!blob || blob.size >= dosya.size) return dosya; // sıkıştırma faydalı olmadıysa orijinali kullan
        const yeniAd = dosya.name.replace(/\.\w+$/, '') + '.webp';
        const yeniDosya = new File([blob], yeniAd, { type: 'image/webp' });
        yeniDosya._nkOrijinalBoyut = dosya.size;
        return yeniDosya;
    } catch (e) {
        return dosya;
    } finally {
        bitmap?.close?.();
    }
}

let nkSecilenElementler = [];
let nkOnizlemeUrlleri = [];

function nkElementBoyutMetni(dosya) {
    const kb = n => Math.max(1, Math.round(n / 1024));
    if (dosya._nkOrijinalBoyut && dosya._nkOrijinalBoyut > dosya.size) {
        return `${kb(dosya._nkOrijinalBoyut)}KB → ${kb(dosya.size)}KB`;
    }
    return `${kb(dosya.size)}KB`;
}

function nkElementOnizlemeGuncelle() {
    nkOnizlemeUrlleri.forEach(url => URL.revokeObjectURL(url));
    nkOnizlemeUrlleri = [];
    const alan = document.getElementById('nk-fotograf-onizleme');
    if (!alan) return;
    alan.innerHTML = nkSecilenElementler.map((dosya, i) => {
        const onizlemeIcerik = nkElementPdfMi(dosya)
            ? `<div class="nk-element-onizleme-pdf">📄<span>${nkEscHtml(dosya.name)}</span></div>`
            : `<img src="${(() => { const url = URL.createObjectURL(dosya); nkOnizlemeUrlleri.push(url); return url; })()}" alt="Önizleme">`;
        return `
        <div class="nk-fotograf-onizleme-tekil">
            <div class="nk-fotograf-onizleme-item">
                ${onizlemeIcerik}
                <button type="button" class="nk-fotograf-onizleme-sil" data-nk-click="nkElementSil" data-nk-click-arg0="#${i}">✕</button>
            </div>
            <div class="nk-fotograf-onizleme-boyut">${nkElementBoyutMetni(dosya)}</div>
        </div>
    `;
    }).join('');
}

function nkElementSil(index) {
    nkSecilenElementler.splice(index, 1);
    nkElementOnizlemeGuncelle();
}

async function nkElementSecildi(e) {
    const yeniDosyalar = Array.from(e.target.files || []);
    e.target.value = ''; // aynı dosyayı silip tekrar seçebilsin diye
    for (const dosya of yeniDosyalar) {
        if (nkSecilenElementler.length >= NK_ELEMENT_MAX_ADET) {
            nkSonucGoster('nk-soru-sonuc', `En fazla ${NK_ELEMENT_MAX_ADET} dosya ekleyebilirsin.`, true);
            break;
        }
        if (!NK_ELEMENT_IZINLI_TIPLER.includes(dosya.type)) {
            nkSonucGoster('nk-soru-sonuc', `${dosya.name}: sadece JPG/PNG/WEBP/PDF kabul ediliyor.`, true);
            continue;
        }
        const fotograf = dosya.type.startsWith('image/');
        const secimSiniri = fotograf ? NK_FOTO_KAYNAK_MAX_BOYUT : NK_ELEMENT_MAX_BOYUT;
        if (dosya.size > secimSiniri) {
            nkSonucGoster('nk-soru-sonuc', `${dosya.name}: ${fotograf ? 'görsel 20MB' : 'dosya 5MB'} sınırını aşıyor.`, true);
            continue;
        }
        const islenmisDosya = fotograf ? await nkFotografSikistir(dosya) : dosya;
        if (islenmisDosya.size > NK_ELEMENT_MAX_BOYUT) {
            nkSonucGoster('nk-soru-sonuc', `${dosya.name}: yüksek kaliteli optimizasyondan sonra da 5MB sınırını aşıyor.`, true);
            continue;
        }
        nkSecilenElementler.push(islenmisDosya);
        nkElementOnizlemeGuncelle();
    }
    nkElementOnizlemeGuncelle();
}

// hsMevcutOturum: script.js'te tanımlı, aynı sayfada paylaşılan global (bkz. script.js).
async function nkElementleriYukle(dosyalar) {
    if (!dosyalar.length) return [];
    const sb = nkGetirSupabase();
    const { data: { session } = {} } = await sb.auth.getSession();
    const erisimTokeni = session?.access_token;
    if (!erisimTokeni) throw new Error('Dosya yüklemek için giriş yapmış olman gerekiyor.');

    const yollar = [];
    try {
    for (const dosya of dosyalar) {
        const yanit = await fetch(`${NK_ELEMENT_WORKER_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${erisimTokeni}`,
                'Content-Type': dosya.type,
            },
            body: dosya,
        });
        let sonuc;
        try {
            sonuc = await yanit.json();
        } catch {
            sonuc = null;
        }
        if (!yanit.ok || !sonuc?.basarili) {
            const mesajlar = {
                kota_asildi: 'Yükleme kotan doldu. Depolama ve günlük sınırları kontrol et.',
                virus_taramasi_kullanilamiyor: 'Güvenlik taraması şu anda kullanılamıyor. Dosya kaydedilmedi; daha sonra tekrar dene.',
                zararli_dosya_algilandi: 'Dosya zararlı veya şüpheli bulundu. Dosya kaydedilmedi ve hesabın güvenlik incelemesine alındı. Yanlış tespit olduğunu düşünüyorsan profilinden itiraz edebilirsin.',
                ktu_uyesi_degil: 'Hesabın güvenlik incelemesinde veya yükleme yetkin bulunmuyor.'
            };
            throw new Error(mesajlar[sonuc?.hata] || `Dosya yüklenemedi (${dosya.name}): ${sonuc?.hata || yanit.status}`);
        }
        yollar.push(sonuc.yol);
    }
    return yollar;
    } catch (error) {
        await nkYuklemeleriIptalEt(yollar, erisimTokeni);
        throw error;
    }
}

async function nkYuklemeleriIptalEt(yollar, token) {
    if (!yollar.length) return;
    try {
        const headers = token ? { Authorization: 'Bearer ' + token } : await NKDosyaErisim.basliklar();
        await fetch(NK_ELEMENT_WORKER_URL + '/cancel', { method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ yollar }) });
    } catch { /* Sunucu, bağlanmayan dosyaları bir saat sonra temizler. */ }
}
async function nkKotaGuncelle() {
    const el = document.getElementById('nk-kota');
    if (!el) return;
    const version = nkYuklemeSurumu;
    try {
        const response = await fetch(NK_ELEMENT_WORKER_URL + '/quota', { headers: await NKDosyaErisim.basliklar(), cache: 'no-store' });
        if (!response.ok) throw new Error();
        const q = await response.json();
        if (version !== nkYuklemeSurumu) return;
        el.textContent = 'Depolama: ' + (q.kullanilan_bayt / 1048576).toFixed(1) + ' / ' + (q.kota_bayt / 1048576) +
            ' MB · ' + q.kullanilan_adet + ' / ' + q.kota_adet + ' dosya · Son 24 saat: ' + q.gunluk_adet + ' / ' + q.gunluk_limit + ' yükleme.';
    } catch { if (version === nkYuklemeSurumu) el.textContent = 'Kota bilgisi şu anda alınamadı.'; }
}

// =============================================
// SORU PAYLAŞ (form submit)
// =============================================
function nkYilSecenekleriniDoldur() {
    const select = document.getElementById('nk-soru-yil');
    if (!select || select.dataset.yuklendi) return;
    const simdikiYil = new Date().getFullYear();
    for (let y = simdikiYil; y >= 2015; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `${y}-${y + 1}`;
        select.appendChild(opt);
    }
    select.dataset.yuklendi = '1';
}

let nkSoruGonderiliyor = false;
async function nkSoruFormSubmit(e) {
    e.preventDefault();
    if (nkSoruGonderiliyor) return;

    if (!nkState.dersId) {
        nkSonucGoster('nk-soru-sonuc', 'Lütfen yukarıdan fakülte, bölüm ve ders seç.', true);
        return;
    }

    const sinavTuru = document.querySelector('input[name="nkSinavTuru"]:checked')?.value;
    const akademikYil = parseInt(document.getElementById('nk-soru-yil').value);
    if (!sinavTuru || !akademikYil) {
        nkSonucGoster('nk-soru-sonuc', 'Lütfen sınav türü ve akademik yıl seç.', true);
        return;
    }
    if (!nkSecilenElementler.length) {
        nkSonucGoster('nk-soru-sonuc', 'En az bir görsel veya PDF ekle.', true);
        return;
    }
    if (!document.getElementById('nk-guvenlik-onayi')?.checked) {
        nkSonucGoster('nk-soru-sonuc', 'Dosya güvenliği ve hesap incelemesi bilgilendirmesini kabul etmelisin.', true);
        return;
    }

    nkSoruGonderiliyor = true;
    const btn = e.target.querySelector('button[type="submit"]');
    const eskiMetin = btn.textContent;
    btn.disabled = true;

    let elementYollari = [];
    let kaydedildi = false;
    try {
        if (nkSecilenElementler.length) {
            btn.textContent = 'Dosyalar yükleniyor...';
            try {
                elementYollari = await nkElementleriYukle(nkSecilenElementler);
            } catch (elementHata) {
                nkSonucGoster('nk-soru-sonuc', elementHata.message, true);
                return;
            }
        }

        btn.textContent = 'Kaydediliyor...';
        const { error } = await nkGetirSupabase().from('sorular').insert({
            ders_id: nkState.dersId,
            sinav_turu: sinavTuru,
            akademik_yil: akademikYil,
            element_yollari: elementYollari
        });
        if (error) {
            nkSonucGoster('nk-soru-sonuc', 'Soru kaydedilemedi: ' + error.message, true);
            return;
        }
        kaydedildi = true;
        nkSonucGoster('nk-soru-sonuc', 'Paylaşımın kaydedildi! Admin onayından sonra diğer üyelere görünecek. 🎉', false);
        document.getElementById('nk-soru-form').reset();
        nkSecilenElementler = [];
        nkElementOnizlemeGuncelle();
        if (document.getElementById('nk-tab-gor').classList.contains('active')) nkSoruListele();
    } catch (error) {
        nkSonucGoster('nk-soru-sonuc', 'İşlem tamamlanamadı. Profilindeki paylaşımları kontrol ederek tekrar dene.', true);
    } finally {
        if (!kaydedildi) await nkYuklemeleriIptalEt(elementYollari);
        nkKotaGuncelle();
        nkSoruGonderiliyor = false;
        btn.disabled = false;
        btn.textContent = eskiMetin;
    }
}

// =============================================
// BAŞLANGIÇ
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    const formlar = [
        ['nk-soru-form', nkSoruFormSubmit],
        ['nk-bildirim-form', nkBildirimGonder]
    ];
    formlar.forEach(([id, handler]) => {
        const form = document.getElementById(id);
        if (form) form.addEventListener('submit', handler);
    });

    const fotoInput = document.getElementById('nk-soru-foto');
    if (fotoInput) fotoInput.addEventListener('change', nkElementSecildi);

    nkYilSecenekleriniDoldur();
    // Oturum durumu artık script.js'teki paylaşılan hesap sisteminden
    // 'hesapDurumuDegisti' event'iyle geliyor (yukarıda dinleniyor) —
    // burada ayrı bir oturum kontrolü tetiklemeye gerek yok.
});
