import { getSupabase } from './api.mjs';


// =============================================
// ANKET (admin panelinden aktifleştirilen anketler)
// Not: Aktif anket yokken sitede hiçbir iz bırakmaz — sadece bir anket 'aktif' olarak
// işaretlendiğinde (bkz. admin panelde 'anketler' tablosu) sağ altta bir buton belirir.
// Hem yanıt veren HEM DE butonu (✕ ile) kapatan ama yanıt vermeyen ziyaretçi için anket
// id'si localStorage'a kalıcı olarak kaydedilir — böylece o anketi bir kez kapatan/yanıtlayan
// kişiyi bir sonraki ziyaretinde tekrar rahatsız etmez. (Farklı, yeni bir anket açıldığında
// farklı bir id taşıdığı için yine gösterilir.)
// =============================================
let anketAktifVeri = null;
 // { id, baslik, aciklama, sorular: [...] }

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
            <button class="anket-pill-btn" data-nk-click="anketModalAc">
                📊 <span class="anket-pill-metin">${anketEscHtml(anketAktifVeri.baslik)}</span>
            </button>
            <button class="anket-pill-kapat" data-nk-click="anketPillKapat" aria-label="Anketi kapat">✕</button>
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
                    <input type="radio" name="anket-soru-${s.id}" value="${anketEscAttr(sec)}" data-nk-change="anketSecenekSecildi" data-nk-change-arg0="@this">
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
            <button type="button" class="anket-gonder-btn" id="anket-gonder-btn" data-nk-click="anketGonder">Gönder</button>
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
export { anketAktifVeri, anketYanitVerilenler, anketYanitVerildiIsaretle, anketBuOturumdaKapatildiMi, anketKapatildiIsaretle, anketEscHtml, anketEscAttr, anketAktifOlanYukle, anketPillGoster, anketPillKapat, anketModalIcerikOlustur, anketModalAc, anketSecenekSecildi, anketModalKapat, anketGonder };
