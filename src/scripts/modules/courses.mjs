import { getSupabase } from './api.mjs';
import { escHtml } from './dom.mjs';
import { openTab } from './calculator-ui.mjs';
import { nyModalKapat } from './game.mjs';


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
            <button class="secili-ders-degistir" data-nk-click="dersSecimSifirla">Dersi Değiştir</button>
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
                sonucAlani.innerHTML = `<p class="error-message">Ders eklenirken hata oluştu: ${escHtml(dersHata?.message || 'Bilinmeyen hata')} (kod: ${escHtml(dersHata?.code || '-')})</p>`;
                return;
            }
            dersId = yeniDers.id;
            sonucAlani.innerHTML = `<p>✅ <strong>"${escHtml(dersAdi)}"</strong> dersi onay için gönderildi. Verini de kaydettik, ders onaylandıktan sonra görünecek.</p>`;
        }
    }

    insertData.ders_id = dersId;
    const { error: veriHata } = await getSupabase().from('ders_verileri').insert(insertData);
    if (veriHata) { sonucAlani.innerHTML = '<p class="error-message">Veri kaydedilirken hata oluştu: ' + escHtml(veriHata.message) + '</p>'; return; }

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
    document.querySelector(`.veri-tab-btn[data-nk-click="switchVeriTab"][data-nk-click-arg0="${tab}"]`).classList.add('active');
    document.getElementById(`veri-${tab}`).classList.add('active');
    if (tab === 'goruntule' && paylasimState.dersId && paylasimState.dersId !== 'yeni') {
        veriListele();
    }
}


function dersiGoruntule(dersAdi, bolumAdi, fakulteAdi) {
    openTab(null, 'veriPaylasim');
    document.querySelectorAll('.tab-button').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.nkClick === 'openTab' && b.dataset.nkClickArg1 === 'veriPaylasim') b.classList.add('active');
    });
    switchVeriTab('goruntule');
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
        if (b.dataset.nkClick === 'openTab' && b.dataset.nkClickArg1 === 'veriPaylasim') b.classList.add('active');
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
                ? `<button class="veri-doldur-btn" data-nk-click="modalVeriyiDoldur" data-nk-click-arg0="#${v.ortalama}" data-nk-click-arg1="#${v.std_sapma}">↙ Forma Doldur</button>`
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
        if (document.getElementById('nyModal')?.classList.contains('aktif')) {
            nyModalKapat(null);
        }
        document.body.style.overflow = '';
    }
});
export { DERS_KODU_REGEX, baslikFormatla, yilSecenekleriniDoldur, paylasimState, fakulteleriYukle, paylasimBolumYukle, paylasimDersYukle, paylasimDersSecildi, paylasimSecimGuncelle, dersSecimSifirla, dersVeriOzetiOlustur, veriListele, veriEkleGonderiliyor, veriEkleSubmit, switchVeriTab, dersiGoruntule, modalFakulteleriYuklendi, modalFakulteleriPromise, aktifModalForm, modalFakulteleriHazirla, modalAc, modalKapat, dersVeriModalPaylasaGit, modalFakulteleriYukle, modalBolumYukle, modalDersYukle, modalVeriListele, modalVeriyiDoldur };
