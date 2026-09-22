import { getSupabase, hsElementPdfMi, NK_ELEMENT_WORKER_URL, hsBeniHatirlaSeciliMi, hsOturumKaliciliginiAyarla } from './api.mjs';
import { escHtml } from './dom.mjs';
import { hsGaleriKaydet } from './gallery.mjs';


// =============================================================
// HESAP SİSTEMİ (site geneli) — v5.0
// =============================================================
// Tek bir giriş sistemi: KTÜ öğrenci e-postası (@ogr.ktu.edu.tr) + şifre.
// Bu, hem Not Kutusu'nun ÜYE alanını hem de Not Yakala oyununun liderlik
// tablosunu besliyor (bkz. supabase-birlesik-profil-oyun.sql). Bu bölüm
// HER sayfada çalışır (index, hesap makinesi sayfaları, not-kutusu) —
// çünkü header'daki hesap butonu ve oyun artık her sayfada bu oturumu
// paylaşıyor. Giriş/kayıt/şifre sıfırlama formları statik HTML'de değil,
// ilk ihtiyaç duyulduğunda (hsModallariEnjekteEt) JS ile enjekte ediliyor
// — böylece 6 sayfada da aynı kodu elle kopyalamak gerekmiyor.
//
// Diğer sayfa/dosyalar (not-kutusu.js, oyun kodu) oturum değişikliklerini
// 'hesapDurumuDegisti' window event'ini dinleyerek öğreniyor — bkz. aşağıda
// hsOturumDegistiHandler. Mail gönderimi SADECE hesap oluştururken (tek
// seferlik kod) ve şifre sıfırlarken oluyor, günlük girişlerde mail YOK.
// =============================================================

const HS_EPOSTA_REGEX = /^[^\s@]+@ogr\.ktu\.edu\.tr$/i;
const HS_PROFIL_CACHE_KEY = 'ktu-hesap-profili-v1';
const HS_KULLANIM_KOSULLARI_SURUMU = '2026-09-22';
const HS_KVKK_AYDINLATMA_SURUMU = '2026-09-22';

let hsBekleyenKayitEposta = '';

let hsBekleyenSifirlamaEposta = '';

let hsMevcutOturum = null;
     // { id, email } ya da null
let hsMevcutProfil = null;
     // { kullanici_adi, en_yuksek_skor } ya da null
let hsModalEnjekteEdildiMi = false;
let hsDuzeltmeHedefleri = new Map();
let hsAktifDuzeltme = null;
let hsOturumSurumu = 0;

function hsProfilOnbelleginiOku(kullaniciId) {
    try {
        const kayit = JSON.parse(localStorage.getItem(HS_PROFIL_CACHE_KEY) || 'null');
        return kayit?.kullanici_id === kullaniciId && typeof kayit.profil === 'object' ? kayit.profil : null;
    } catch { return null; }
}

function hsProfilOnbelleginiYaz() {
    try {
        if (hsMevcutOturum && hsMevcutProfil) localStorage.setItem(HS_PROFIL_CACHE_KEY, JSON.stringify({ kullanici_id: hsMevcutOturum.id, profil: hsMevcutProfil }));
        else localStorage.removeItem(HS_PROFIL_CACHE_KEY);
    } catch { /* Gizli mod veya kapalı depolama hesabı engellemez. */ }
}

function hsAuthBeklemesiniBitir() {
    document.documentElement.classList.remove('hs-auth-bekleniyor');
    const btn = document.getElementById('hesapButonu');
    if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
}


function hsSonucGoster(elId, mesaj, hataMi) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.style.display = 'block';
    const paragraf = document.createElement('p');
    paragraf.className = hataMi ? 'error-message' : 'nk-basari';
    paragraf.textContent = mesaj;
    el.replaceChildren(paragraf);
}


// -------------------------------------------------------------
// Oturum durumu değişince (sayfa ilk açıldığında bir kez, sonra her
// giriş/çıkışta tekrar) tetiklenir — header butonunu günceller ve
// diğer dosyaların dinleyebileceği bir event yayınlar.
// -------------------------------------------------------------
async function hsOturumDegistiHandler(_event, session) {
    const surum = ++hsOturumSurumu;
    if (session && session.user && HS_EPOSTA_REGEX.test(session.user.email || '')) {
        hsMevcutOturum = { id: session.user.id, email: session.user.email };
        hsMevcutProfil = hsProfilOnbelleginiOku(hsMevcutOturum.id);
        // Oturum tarayıcıda yerel olarak hazırdır. Profil ağ sorgusunu beklemeden
        // header'ı ve üyeye özel ana görünümü doğru duruma getir.
        hsHeaderButonuGuncelle();
        hsAuthBeklemesiniBitir();
        window.dispatchEvent(new CustomEvent('hesapDurumuDegisti', { detail: { oturum: hsMevcutOturum, profil: hsMevcutProfil } }));

        // Kullanıcı adını profil sayfası açılmasa da yükle; oyun ve ilerideki
        // topluluk özellikleri aynı genel profil kimliğini kullanır.
        const oncekiAd = hsMevcutProfil?.kullanici_adi || null;
        try {
            const { data } = await getSupabase().from('kullanici_profilleri')
                .select('kullanici_adi, en_yuksek_skor').eq('id', hsMevcutOturum.id).maybeSingle();
            if (surum !== hsOturumSurumu || hsMevcutOturum?.id !== session.user.id) return;
            hsMevcutProfil = data || null;
            hsProfilOnbelleginiYaz();
        } catch (e) {
            // Ağ geçici olarak yoksa önceki sayfadan kalan güvenli profil
            // önizlemesini koru; oturum ve yetki yine Supabase tarafından belirlenir.
        }
        hsHeaderButonuGuncelle();
        if (oncekiAd !== (hsMevcutProfil?.kullanici_adi || null)) {
            window.dispatchEvent(new CustomEvent('kullaniciAdiDegisti', { detail: { kullanici_adi: hsMevcutProfil?.kullanici_adi || null } }));
        }
    } else {
        if (session) {
            // Oturum var ama KTÜ öğrenci maili değil — siteye erişemez, çıkış yaptır.
            getSupabase().auth.signOut();
        }
        hsMevcutOturum = null;
        hsMevcutProfil = null;
        hsProfilOnbelleginiYaz();
        hsHeaderButonuGuncelle();
        hsAuthBeklemesiniBitir();
        window.dispatchEvent(new CustomEvent('hesapDurumuDegisti', { detail: { oturum: null, profil: null } }));
    }
    hsProfilSayfasiBaslat();
}


function hsHeaderButonuGuncelle() {
    const btn = document.getElementById('hesapButonu');
    if (!btn) return;
    if (hsMevcutOturum) {
        btn.classList.remove('hb-cikis-yapilmis');
        btn.classList.add('hb-giris-yapilmis');
        const adKismi = hsMevcutProfil?.kullanici_adi || hsMevcutOturum.email.split('@')[0];
        btn.innerHTML = `<span class="hesap-buton-ikon">👤</span><span class="hesap-buton-metin">${escHtml(adKismi)}</span>`;
        btn.setAttribute('aria-label', 'Hesabım: ' + hsMevcutOturum.email);
    } else {
        btn.classList.remove('hb-giris-yapilmis');
        btn.classList.add('hb-cikis-yapilmis');
        btn.innerHTML = `<span class="hesap-buton-ikon">🔑</span><span class="hesap-buton-metin">Giriş Yap</span>`;
        btn.setAttribute('aria-label', 'Giriş Yap');
    }
}


// Header'daki hesap butonuna tıklanınca giriş yapılmamışsa giriş penceresi,
// yapılmışsa ayrı profil sayfası açılır.
function hesapButonTiklandi(event) {
    if (event) event.preventDefault();
    if (hsMevcutOturum) {
        hsProfilModalAc();
    } else {
        hsGirisModalAc();
    }
}


// -------------------------------------------------------------
// Giriş modalı markup'ının enjeksiyonu — ilk çağrıda bir kereliğine document.body'e
// eklenir. Var olan .modal-overlay /
// .modal-kutu / .nk-tab-bar / .form-group gibi sınıflar zaten sitede
// tanımlı olduğu için burada yeni bir görsel dil icat etmeye gerek yok.
// -------------------------------------------------------------
function hsModallariEnjekteEt() {
    if (hsModalEnjekteEdildiMi || document.getElementById('hsGirisModal')) { hsModalEnjekteEdildiMi = true; return; }
    hsModalEnjekteEdildiMi = true;

    const sarmalayici = document.createElement('div');
    sarmalayici.innerHTML = `
        <div class="modal-overlay" id="hsGirisModal" data-nk-click="hsGirisModalKapat" data-nk-click-arg0="@event">
            <div class="modal-kutu" style="max-width:480px;">
                <div class="modal-baslik">
                    <span>🔑 Giriş Yap / Kayıt Ol</span>
                    <button class="modal-kapat-btn" data-nk-click="hsGirisModalKapat" data-nk-click-arg0="@null">✕</button>
                </div>
                <div class="modal-icerik">
                    <div class="nk-uyari">
                        🔒 KTÜ öğrenci e-postan (<strong>@ogr.ktu.edu.tr</strong>) ile giriş yapabilirsin. Şifren uygulama tarafından düz metin olarak saklanmaz; kimlik doğrulama Supabase Auth tarafından güvenli, tek yönlü parola özetiyle yürütülür.
                    </div>
                    <div class="nk-tab-bar" id="hs-auth-tab-bar">
                        <button type="button" class="nk-tab-btn active" data-nk-click="hsAuthGoster" data-nk-click-arg0="giris" data-nk-click-prevent="true">Giriş Yap</button>
                        <button type="button" class="nk-tab-btn" data-nk-click="hsAuthGoster" data-nk-click-arg0="kayit" data-nk-click-prevent="true">Kayıt Ol</button>
                    </div>

                    <div id="hs-auth-giris" class="nk-tab-content active">
                        <form id="hs-giris-form" novalidate>
                            <div class="form-group">
                                <label for="hs-giris-eposta">KTÜ Öğrenci E-postan:</label>
                                <input type="email" id="hs-giris-eposta" placeholder="ornek@ogr.ktu.edu.tr" autocomplete="username" required>
                            </div>
                            <div class="form-group">
                                <label for="hs-giris-sifre">Şifre:</label>
                                <input type="password" id="hs-giris-sifre" autocomplete="current-password" required>
                            </div>
                            <label class="hs-beni-hatirla"><input type="checkbox" id="hs-beni-hatirla" checked><span><strong>Beni hatırla</strong><small>Bu cihazda oturumum açık kalsın.</small></span></label>
                            <button type="submit">Giriş Yap</button>
                            <p style="text-align:center; margin-top:0.75rem;">
                                <a href="#" class="nk-geri-link" data-nk-click="hsAuthGoster" data-nk-click-arg0="sifirlama" data-nk-click-arg1="@event" data-nk-click-prevent="true">Şifremi unuttum</a>
                            </p>
                        </form>
                        <div id="hs-giris-sonuc" class="result-box" style="display:none;"></div>
                    </div>

                    <div id="hs-auth-kayit" class="nk-tab-content">
                        <form id="hs-kayit-form" novalidate>
                            <div class="form-group">
                                <label for="hs-kayit-eposta">KTÜ Öğrenci E-postan:</label>
                                <input type="email" id="hs-kayit-eposta" placeholder="ornek@ogr.ktu.edu.tr" required>
                                <small>Sadece @ogr.ktu.edu.tr uzantılı adresler kabul edilir.</small>
                            </div>
                            <div class="form-group">
                                <label for="hs-kayit-sifre">Şifre:</label>
                                <input type="password" id="hs-kayit-sifre" minlength="8" autocomplete="new-password" required>
                                <small>En az 8 karakter; başka sitelerde kullanmadığın bir şifre seç.</small>
                            </div>
                            <div class="form-group">
                                <label for="hs-kayit-sifre-tekrar">Şifre (Tekrar):</label>
                                <input type="password" id="hs-kayit-sifre-tekrar" minlength="8" autocomplete="new-password" required>
                            </div>
                            <div class="hs-yasal-beyanlar">
                                <label class="hs-yasal-onay">
                                    <input type="checkbox" id="hs-kullanim-kosullari-kabul" required>
                                    <span><a href="kullanim-kosullari.html" target="_blank" rel="noopener">Kullanım Koşulları</a>'nı okudum ve kabul ediyorum.</span>
                                </label>
                                <label class="hs-yasal-onay">
                                    <input type="checkbox" id="hs-kvkk-aydinlatma-okundu" required>
                                    <span><a href="gizlilik-politikasi.html" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a>'ni okudum ve kişisel verilerimin işlenmesi hakkında bilgilendirildim.</span>
                                </label>
                                <small>KVKK beyanı açık rıza değildir; hangi verilerin neden işlendiği konusunda bilgilendirildiğini gösterir.</small>
                            </div>
                            <button type="submit">Kayıt Ol</button>
                        </form>
                        <form id="hs-kayit-kod-form" novalidate style="display:none; margin-top:1.25rem;">
                            <div class="form-group">
                                <label for="hs-kayit-kod">E-postana gelen doğrulama kodu:</label>
                                <div class="nk-kod-satiri">
                                    <input type="text" id="hs-kayit-kod" inputmode="numeric" maxlength="8" placeholder="Kodu gir" required>
                                    <button type="submit">Hesabı Onayla</button>
                                </div>
                                <small>Bu kod sadece hesabını ilk oluştururken bir kereliğine gönderiliyor.</small>
                            </div>
                        </form>
                        <div id="hs-kayit-sonuc" class="result-box" style="display:none;"></div>
                    </div>

                    <div id="hs-auth-sifirlama" class="nk-tab-content">
                        <form id="hs-sifirlama-istek-form" novalidate>
                            <div class="form-group">
                                <label for="hs-sifirlama-eposta">KTÜ Öğrenci E-postan:</label>
                                <input type="email" id="hs-sifirlama-eposta" placeholder="ornek@ogr.ktu.edu.tr" required>
                            </div>
                            <button type="submit">Sıfırlama Kodu Gönder</button>
                            <p style="text-align:center; margin-top:0.75rem;">
                                <a href="#" class="nk-geri-link" data-nk-click="hsAuthGoster" data-nk-click-arg0="giris" data-nk-click-arg1="@event" data-nk-click-prevent="true">Girişe dön</a>
                            </p>
                        </form>
                        <form id="hs-sifirlama-kod-form" novalidate style="display:none; margin-top:1rem;">
                            <div class="form-group">
                                <label for="hs-sifirlama-kod">E-postana gelen kod:</label>
                                <input type="text" id="hs-sifirlama-kod" inputmode="numeric" maxlength="8" placeholder="Kodu gir" required>
                            </div>
                            <div class="form-group">
                                <label for="hs-sifirlama-yeni-sifre">Yeni Şifre:</label>
                                <input type="password" id="hs-sifirlama-yeni-sifre" minlength="8" autocomplete="new-password" required>
                            </div>
                            <button type="submit">Şifreyi Güncelle</button>
                        </form>
                        <div id="hs-sifirlama-sonuc" class="result-box" style="display:none;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    while (sarmalayici.firstChild) {
        document.body.appendChild(sarmalayici.firstChild);
    }

    const formlar = [
        ['hs-giris-form', hsGirisFormSubmit],
        ['hs-kayit-form', hsKayitFormSubmit],
        ['hs-kayit-kod-form', hsKayitKodFormSubmit],
        ['hs-sifirlama-istek-form', hsSifirlamaIstekFormSubmit],
        ['hs-sifirlama-kod-form', hsSifirlamaKodFormSubmit]
    ];
    formlar.forEach(([id, handler]) => {
        const form = document.getElementById(id);
        if (form) form.addEventListener('submit', handler);
    });
    const beniHatirla = document.getElementById('hs-beni-hatirla');
    if (beniHatirla) beniHatirla.checked = hsBeniHatirlaSeciliMi();
}


function hsGirisModalAc(sekme) {
    hsModallariEnjekteEt();
    document.getElementById('hsGirisModal').classList.add('aktif');
    hsAuthGoster(sekme || 'giris');
}

function hsGirisModalKapat(event) {
    if (event && event.target !== document.getElementById('hsGirisModal')) return;
    document.getElementById('hsGirisModal')?.classList.remove('aktif');
}

function hsAuthGoster(hangi, event) {
    if (event) event.preventDefault();
    const alan = document.getElementById('hsGirisModal');
    alan.querySelectorAll('.nk-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`hs-auth-${hangi}`).classList.add('active');
    const tabBar = document.getElementById('hs-auth-tab-bar');
    tabBar.querySelectorAll('.nk-tab-btn').forEach(b => b.classList.remove('active'));
    if (hangi === 'giris' || hangi === 'kayit') {
        tabBar.querySelector(`.nk-tab-btn[data-nk-click="hsAuthGoster"][data-nk-click-arg0="${hangi}"]`).classList.add('active');
    }
}


// -------------------------------------------------------------
// GİRİŞ / KAYIT / ŞİFRE SIFIRLAMA — not-kutusu.js'te daha önce sadece
// not-kutusu.html'de çalışan bu mantığın birebir aynısı, artık site
// geneli. Başarılı giriş/kayıt/sıfırlama sonrası ekstra bir "görünümü aç"
// çağrısına gerek yok — supabase-js'in onAuthStateChange'i zaten
// hsOturumDegistiHandler'ı tetikleyip her yerde arayüzü güncelliyor.
// -------------------------------------------------------------
async function hsGirisFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const eposta = document.getElementById('hs-giris-eposta').value.trim().toLowerCase();
    const sifre = document.getElementById('hs-giris-sifre').value;
    const beniHatirla = document.getElementById('hs-beni-hatirla')?.checked !== false;

    if (!HS_EPOSTA_REGEX.test(eposta)) {
        hsSonucGoster('hs-giris-sonuc', 'Lütfen geçerli bir @ogr.ktu.edu.tr adresi gir.', true);
        return;
    }

    btn.disabled = true;
    const eskiMetin = btn.textContent;
    btn.textContent = 'Giriş yapılıyor...';
    try {
        hsOturumKaliciliginiAyarla(beniHatirla);
        const { data, error } = await getSupabase().auth.signInWithPassword({ email: eposta, password: sifre });
        if (error) {
            const mesaj = /email not confirmed/i.test(error.message)
                ? 'Hesabın henüz onaylanmamış. "Kayıt Ol" sekmesinden e-postana gelen kodu girerek onaylayabilirsin.'
                : 'Giriş yapılamadı: ' + error.message;
            hsSonucGoster('hs-giris-sonuc', mesaj, true);
            return;
        }
        e.target.reset();
        hsGirisModalKapat(null);
    } finally {
        btn.disabled = false;
        btn.textContent = eskiMetin;
    }
}


async function hsKayitFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const eposta = document.getElementById('hs-kayit-eposta').value.trim().toLowerCase();
    const sifre = document.getElementById('hs-kayit-sifre').value;
    const sifreTekrar = document.getElementById('hs-kayit-sifre-tekrar').value;
    const kosullarKabul = document.getElementById('hs-kullanim-kosullari-kabul')?.checked === true;
    const kvkkOkundu = document.getElementById('hs-kvkk-aydinlatma-okundu')?.checked === true;

    if (!HS_EPOSTA_REGEX.test(eposta)) {
        hsSonucGoster('hs-kayit-sonuc', 'Lütfen geçerli bir @ogr.ktu.edu.tr adresi gir.', true);
        return;
    }
    if (sifre.length < 8) {
        hsSonucGoster('hs-kayit-sonuc', 'Şifre en az 8 karakter olmalıdır.', true);
        return;
    }
    if (sifre !== sifreTekrar) {
        hsSonucGoster('hs-kayit-sonuc', 'Şifreler eşleşmiyor.', true);
        return;
    }
    if (!kosullarKabul) {
        hsSonucGoster('hs-kayit-sonuc', 'Üyelik oluşturmak için Kullanım Koşulları’nı kabul etmelisin.', true);
        document.getElementById('hs-kullanim-kosullari-kabul')?.focus();
        return;
    }
    if (!kvkkOkundu) {
        hsSonucGoster('hs-kayit-sonuc', 'Kayıttan önce KVKK Aydınlatma Metni’ni okuyup bilgilendirildiğini belirtmelisin.', true);
        document.getElementById('hs-kvkk-aydinlatma-okundu')?.focus();
        return;
    }

    btn.disabled = true;
    const eskiMetin = btn.textContent;
    btn.textContent = 'Kayıt oluşturuluyor...';
    try {
        const { data, error } = await getSupabase().auth.signUp({
            email: eposta,
            password: sifre,
            options: { data: {
                kullanim_kosullari_kabul: true,
                kullanim_kosullari_surumu: HS_KULLANIM_KOSULLARI_SURUMU,
                kvkk_aydinlatma_okundu: true,
                kvkk_aydinlatma_surumu: HS_KVKK_AYDINLATMA_SURUMU
            } }
        });
        if (error) {
            hsSonucGoster('hs-kayit-sonuc', 'Kayıt oluşturulamadı: ' + error.message, true);
            return;
        }
        if (data.session) {
            e.target.reset();
            hsGirisModalKapat(null);
            return;
        }
        const zatenKayitli = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
        if (zatenKayitli) {
            hsSonucGoster('hs-kayit-sonuc', 'Bu e-posta ile zaten bir hesabın var. "Giriş Yap" sekmesinden giriş yapmayı dene; şifreni bilmiyorsan veya hiç belirlemediysen "Şifremi Unuttum" ile yeni bir şifre oluşturabilirsin.', true);
            return;
        }
        hsBekleyenKayitEposta = eposta;
        document.getElementById('hs-kayit-kod-form').style.display = 'block';
        document.getElementById('hs-kayit-kod').focus();
        hsSonucGoster('hs-kayit-sonuc', `E-postana bir doğrulama kodu gönderdik. Bu, alacağın son kod — bundan sonra e-posta ve şifrenle doğrudan giriş yapacaksın.`, false);
    } finally {
        btn.disabled = false;
        btn.textContent = eskiMetin;
    }
}


async function hsKayitKodFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const kod = document.getElementById('hs-kayit-kod').value.trim();

    if (!hsBekleyenKayitEposta) {
        hsSonucGoster('hs-kayit-sonuc', 'Önce kayıt formunu gönder.', true);
        return;
    }
    if (!/^\d{6,8}$/.test(kod)) {
        hsSonucGoster('hs-kayit-sonuc', 'Kod 6-8 haneli bir sayı olmalıdır.', true);
        return;
    }

    btn.disabled = true;
    const eskiMetin = btn.textContent;
    btn.textContent = 'Onaylanıyor...';
    try {
        const { data, error } = await getSupabase().auth.verifyOtp({
            email: hsBekleyenKayitEposta,
            token: kod,
            type: 'signup'
        });
        if (error || !data || !data.session) {
            hsSonucGoster('hs-kayit-sonuc', 'Kod doğrulanamadı: ' + (error?.message || 'Bilinmeyen hata'), true);
            return;
        }
        hsGirisModalKapat(null);
    } finally {
        btn.disabled = false;
        btn.textContent = eskiMetin;
    }
}


async function hsSifirlamaIstekFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const eposta = document.getElementById('hs-sifirlama-eposta').value.trim().toLowerCase();

    if (!HS_EPOSTA_REGEX.test(eposta)) {
        hsSonucGoster('hs-sifirlama-sonuc', 'Lütfen geçerli bir @ogr.ktu.edu.tr adresi gir.', true);
        return;
    }

    btn.disabled = true;
    const eskiMetin = btn.textContent;
    btn.textContent = 'Gönderiliyor...';
    try {
        const { error } = await getSupabase().auth.resetPasswordForEmail(eposta);
        if (error) {
            hsSonucGoster('hs-sifirlama-sonuc', 'Kod gönderilemedi: ' + error.message, true);
            return;
        }
        hsBekleyenSifirlamaEposta = eposta;
        document.getElementById('hs-sifirlama-kod-form').style.display = 'block';
        document.getElementById('hs-sifirlama-kod').focus();
        hsSonucGoster('hs-sifirlama-sonuc', `${eposta} adresine bir sıfırlama kodu gönderdik.`, false);
    } finally {
        btn.disabled = false;
        btn.textContent = eskiMetin;
    }
}


async function hsSifirlamaKodFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const kod = document.getElementById('hs-sifirlama-kod').value.trim();
    const yeniSifre = document.getElementById('hs-sifirlama-yeni-sifre').value;

    if (!hsBekleyenSifirlamaEposta) {
        hsSonucGoster('hs-sifirlama-sonuc', 'Önce e-posta adresini gönder.', true);
        return;
    }
    if (!/^\d{6,8}$/.test(kod)) {
        hsSonucGoster('hs-sifirlama-sonuc', 'Kod 6-8 haneli bir sayı olmalıdır.', true);
        return;
    }
    if (yeniSifre.length < 8) {
        hsSonucGoster('hs-sifirlama-sonuc', 'Yeni şifre en az 8 karakter olmalıdır.', true);
        return;
    }

    btn.disabled = true;
    const eskiMetin = btn.textContent;
    btn.textContent = 'Güncelleniyor...';
    try {
        const { data, error } = await getSupabase().auth.verifyOtp({
            email: hsBekleyenSifirlamaEposta,
            token: kod,
            type: 'recovery'
        });
        if (error || !data || !data.session) {
            hsSonucGoster('hs-sifirlama-sonuc', 'Kod doğrulanamadı: ' + (error?.message || 'Bilinmeyen hata'), true);
            return;
        }
        const { error: guncelHata } = await getSupabase().auth.updateUser({ password: yeniSifre });
        if (guncelHata) {
            hsSonucGoster('hs-sifirlama-sonuc', 'Şifre güncellenemedi: ' + guncelHata.message, true);
            return;
        }
        hsGirisModalKapat(null);
    } finally {
        btn.disabled = false;
        btn.textContent = eskiMetin;
    }
}


async function hesapCikisYap() {
    await getSupabase().auth.signOut();
    hsProfilModalKapat(null);
}


// -------------------------------------------------------------
// PROFİL SAYFASI — genel kullanıcı adı + Not Kutusu paylaşımları +
// "Paylaştığım Ders Verileri". Veriler sayfaya girildiğinde taze çekilir.
// -------------------------------------------------------------
function hsProfilModalAc() {
    if (!hsMevcutOturum) { hsGirisModalAc(); return; }
    if (location.pathname.endsWith('/profil.html') || location.pathname.endsWith('profil.html')) hsProfilSayfasiBaslat();
    else location.href = 'profil.html';
}

function hsProfilModalKapat() { /* Eski olay köprüsüyle geriye dönük uyumluluk. */ }

function hsProfilSekmeGoster(hangi, event) {
    if (event) event.preventDefault();
    const sayfa = document.getElementById('hs-profil-sayfa');
    if (!sayfa) return;
    sayfa.querySelectorAll('.nk-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`hs-profil-${hangi}`)?.classList.add('active');
    const tabBar = document.getElementById('hs-profil-tab-bar');
    tabBar.querySelectorAll('.nk-tab-btn').forEach(b => b.classList.remove('active'));
    tabBar.querySelector(`.nk-tab-btn[data-nk-click="hsProfilSekmeGoster"][data-nk-click-arg0="${hangi}"]`)?.classList.add('active');
}

function hsProfilSayfasiBaslat() {
    const sayfa = document.getElementById('hs-profil-sayfa');
    if (!sayfa) return;
    const yukleniyor = document.getElementById('hs-profil-yukleniyor');
    const giris = document.getElementById('hs-profil-giris-gerekli');
    const icerik = document.getElementById('hs-profil-icerik');
    if (yukleniyor) yukleniyor.hidden = true;
    if (!hsMevcutOturum) {
        if (giris) giris.hidden = false;
        if (icerik) icerik.hidden = true;
        return;
    }
    if (giris) giris.hidden = true;
    if (icerik) icerik.hidden = false;
    const eposta = document.getElementById('hs-profil-eposta');
    if (eposta) eposta.textContent = hsMevcutOturum.email;
    const avatar = document.getElementById('hs-profil-avatar');
    if (avatar) avatar.textContent = String(hsMevcutProfil?.kullanici_adi || hsMevcutOturum.email || 'K').charAt(0).toLocaleUpperCase('tr-TR');
    const form = document.getElementById('hs-kullanici-adi-form');
    if (form && !form.dataset.hazir) { form.dataset.hazir = 'true'; form.addEventListener('submit', hsKullaniciAdiFormSubmit); }
    const duzeltmeFormu = document.getElementById('hs-duzeltme-form');
    if (duzeltmeFormu && !duzeltmeFormu.dataset.hazir) { duzeltmeFormu.dataset.hazir = 'true'; duzeltmeFormu.addEventListener('submit', hsDuzeltmeFormSubmit); }
    const guvenlikFormu = document.getElementById('hs-guvenlik-itiraz-form');
    if (guvenlikFormu && !guvenlikFormu.dataset.hazir) { guvenlikFormu.dataset.hazir = 'true'; guvenlikFormu.addEventListener('submit', hsGuvenlikItiraziGonder); }
    hsProfilSekmeGoster('genel');
    hsProfilVerileriniYukle();
}


async function hsProfilVerileriniYukle() {
    if (!hsMevcutOturum) return;
    const sb = getSupabase();

    const guvenlikEl = document.getElementById('hs-guvenlik-durumu');
    if (guvenlikEl) {
        const { data: guvenlik, error: guvenlikHata } = await sb.rpc('nk_guvenlik_durumum');
        if (!guvenlikHata && guvenlik?.durum && guvenlik.durum !== 'aktif') {
            const itirazAcik = guvenlik.durum === 'incelemede';
            guvenlikEl.hidden = false;
            guvenlikEl.innerHTML = `<strong>Hesabın güvenlik incelemesinde</strong><p>Zararlı veya şüpheli dosya tespiti nedeniyle yeni paylaşım ve Not Kutusu erişimin geçici olarak donduruldu. Dosya kaydedilmedi ve diğer kullanıcılara açılmadı.</p>${itirazAcik ? `<form id="hs-guvenlik-itiraz-form" class="profil-form"><label for="hs-guvenlik-itiraz">Tespitin hatalı olduğunu düşünüyorsan dosyanın kaynağını ve neden güvenli olduğunu açıkla.</label><textarea id="hs-guvenlik-itiraz" minlength="20" maxlength="2000" rows="4" required></textarea><button type="submit" class="profil-birincil-buton">İtirazı gönder</button><div id="hs-guvenlik-itiraz-sonuc" class="result-box" role="status" style="display:none"></div></form>` : `<p>Durum: <strong>${guvenlik.durum === 'itirazda' ? 'İtirazın inceleniyor' : 'Tespit doğrulandı'}</strong>. Ek bilgi için <a href="mailto:ktunotsimulatoru@gmail.com?subject=Hesap%20güvenlik%20incelemesi">ktunotsimulatoru@gmail.com</a> adresine yazabilirsin.</p>`}`;
            const form = document.getElementById('hs-guvenlik-itiraz-form');
            if (form) { form.dataset.hazir = 'true'; form.addEventListener('submit', hsGuvenlikItiraziGonder); }
        } else guvenlikEl.hidden = true;
    }

    const { data: profilData } = await sb.from('kullanici_profilleri')
        .select('kullanici_adi, en_yuksek_skor').eq('id', hsMevcutOturum.id).maybeSingle();
    hsMevcutProfil = profilData || null;
    const input = document.getElementById('hs-kullanici-adi');
    if (input) input.value = hsMevcutProfil?.kullanici_adi || '';
    const gorunenAd = document.getElementById('hs-profil-kullanici-adi');
    if (gorunenAd) gorunenAd.textContent = hsMevcutProfil?.kullanici_adi || 'Henüz kullanıcı adı belirlenmedi';

    const agnoEl = document.getElementById('hs-agno-listesi');
    if (agnoEl) {
        const { data: donemler, error: donemHata } = await sb.from('kayitli_donemler')
            .select('id,ad,akademik_yil,donem,dersler,guncelleme_tarihi').order('guncelleme_tarihi',{ascending:false});
        if (donemHata) {
            const altyapiEksik=['42P01','42703','PGRST204','PGRST205'].includes(donemHata.code);
            const yetkiSorunu=donemHata.code==='42501';
            console.warn('[profil-agno] Kayıt sorgusu başarısız:', donemHata.code || 'bilinmeyen');
            const baslik=altyapiEksik?'AGNO kayıt altyapısı henüz etkin değil.':yetkiSorunu?'AGNO kayıt izni tamamlanmamış.':'AGNO kayıtları şu anda yüklenemedi.';
            const aciklama=altyapiEksik?'Veritabanı kurulumu tamamlandıktan sonra kayıtların burada görünecek.':yetkiSorunu?'Veritabanı yöneticisinin 007 yetki onarımını uygulaması gerekiyor.':'Sayfayı yenileyerek tekrar deneyebilirsin.';
            agnoEl.innerHTML = `<div class="profil-yukleme-hatasi"><strong>${baslik}</strong><span>${aciklama}</span><a class="profil-ikincil-buton" href="gano-hesaplama.html">AGNO hesaplayıcıyı aç</a></div>`;
        }
        else if (!donemler?.length) agnoEl.innerHTML = '<p class="ny-ipucu">Henüz kaydettiğin bir AGNO dönemi yok. <a href="gano-hesaplama.html">İlk hesabını oluştur</a>.</p>';
        else agnoEl.innerHTML = donemler.map(d => `<article class="hs-liste-satir profil-kayit-satir"><div><strong>${escHtml(d.ad)}</strong><div class="ny-ipucu">${d.akademik_yil}-${d.akademik_yil+1} · ${d.donem==='guz'?'Güz':d.donem==='bahar'?'Bahar':'Yaz'} · ${Array.isArray(d.dersler)?d.dersler.length:0} ders</div></div><div class="profil-kayit-eylemler"><a class="profil-ikincil-buton" href="gano-hesaplama.html?kayit=${encodeURIComponent(d.id)}">Hesaplamayı aç</a></div></article>`).join('');
    }

    const cikmislarEl = document.getElementById('hs-cikmislar-listesi');
    if (cikmislarEl) {
        cikmislarEl.innerHTML = '<p class="veri-yukle">Yükleniyor...</p>';
        const { data: sorularData, error: sorularHata } = await sb.from('sorular')
            .select('id, sinav_turu, akademik_yil, durum, element_yollari, olusturulma_tarihi, nk_dersler(ders_adi, ders_kodu, bolumler(ad))')
            .eq('kullanici_id', hsMevcutOturum.id)
            .order('olusturulma_tarihi', { ascending: false });
        if (sorularHata) {
            cikmislarEl.innerHTML = '<p class="ny-form-hata">Yüklenemedi, tekrar dene.</p>';
        } else if (!sorularData || !sorularData.length) {
            cikmislarEl.innerHTML = '<p class="ny-ipucu">Henüz Not Kutusu içeriği paylaşmadın.</p>';
        } else {
            const durumRozeti = { onaylandi: '✅ Onaylandı', beklemede: '⏳ Beklemede', reddedildi: '❌ Reddedildi' };
            const turEtiketi = { vize: 'Vize', final: 'Final', butunleme: 'Bütünleme', ders_notu: 'Ders Notu', diger: 'Diğer' };
            cikmislarEl.innerHTML = sorularData.map(s => {
                const elementler = NKDosya.guvenliYollar(s.element_yollari);
                const galeriId = `hs-soru-${s.id}`;
                hsGaleriKaydet(galeriId, elementler.filter(yol => !hsElementPdfMi(yol)).map(yol => NKDosya.dosyaUrl(yol, NK_ELEMENT_WORKER_URL)));
                let gorselSira = -1;
                const fotoHtml = elementler.length
                    ? `<div class="nk-soru-fotograflar">${elementler.map(yol => {
                        const url = NKDosya.dosyaUrl(yol, NK_ELEMENT_WORKER_URL);
                        if (hsElementPdfMi(yol)) {
                            return `<a class="nk-soru-element-pdf" href="#" data-nk-url="${url}">📄 PDF</a>`;
                        }
                        gorselSira++;
                        return `<img class="nk-soru-fotograf-kucuk" data-nk-url="${url}" alt="Paylaşım görseli" data-nk-click="hsElementAc" data-nk-click-arg0="${galeriId}" data-nk-click-arg1="${gorselSira}">`;
                    }).join('')}</div>`
                    : '';
                const indirmeHtml = elementler.length ? `<div class="nk-dosya-indirmeler">${elementler.map((yol,index) => `<button type="button" class="nk-dosya-indir-btn" data-nk-download="${escHtml(NKDosya.dosyaUrl(yol, NK_ELEMENT_WORKER_URL))}">↓ Ek ${index + 1}'i indir</button>`).join('')}</div>` : '';
                return `
                <div class="hs-liste-satir">
                    <div><strong>${escHtml(s.nk_dersler?.ders_adi || 'Ders')}</strong> <span class="ny-ipucu">${escHtml(s.nk_dersler?.bolumler?.ad || '')}</span></div>
                    <div class="ny-ipucu">${turEtiketi[s.sinav_turu] || escHtml(s.sinav_turu)} · ${s.akademik_yil}-${s.akademik_yil + 1} · ${durumRozeti[s.durum] || escHtml(s.durum)}</div>
                    ${fotoHtml}${indirmeHtml}
                </div>
            `;
            }).join('');
        }
    }

    hsDuzeltmeHedefleri = new Map();
    const {data:anaKatkilar,error:anaKatkiHata}=await sb.rpc('profil_katkilarim');
    const derslerEl = document.getElementById('hs-dersler-listesi');
    if (derslerEl) {
        derslerEl.innerHTML = '<p class="veri-yukle">Yükleniyor...</p>';
        const nkSonuc = await sb.from('nk_dersler').select('id,ders_adi,ders_kodu,olusturulma_tarihi,bolumler(ad)').eq('ekleyen_kullanici_id',hsMevcutOturum.id).order('olusturulma_tarihi',{ascending:false});
        const derslerData = [ ...(nkSonuc.data||[]).map(d=>({...d,_tur:'nk_ders'})), ...((anaKatkilar?.dersler)||[]).map(d=>({...d,bolumler:{ad:d.bolum_adi},_tur:'ders'})) ];
        if (nkSonuc.error && anaKatkiHata) {
            derslerEl.innerHTML = '<p class="ny-form-hata">Yüklenemedi, tekrar dene.</p>';
        } else if (!derslerData.length) {
            derslerEl.innerHTML = '<p class="ny-ipucu">Henüz bir ders eklemedin.</p>';
        } else {
            derslerEl.innerHTML = derslerData.map(d => {
                const anahtar=`${d._tur}:${d.id}`; hsDuzeltmeHedefleri.set(anahtar,d);
                return `<article class="hs-liste-satir profil-kayit-satir"><div><strong>${escHtml(d.ders_adi)}</strong>${d.ders_kodu?' · '+escHtml(d.ders_kodu):''}<div class="ny-ipucu">${escHtml(d.bolumler?.ad||'')} ${d._tur==='ders'?(d.onaylandi?'· Onaylandı':'· Onay bekliyor'):'· Not Kutusu'}</div></div><div class="profil-kayit-eylemler"><button type="button" class="profil-ikincil-buton" data-nk-click="hsDuzeltmeModalAc" data-nk-click-arg0="${d._tur}" data-nk-click-arg1="#${d.id}">Düzeltme iste</button></div></article>`;
            }).join('');
        }
    }

    const verilerEl=document.getElementById('hs-ders-verileri-listesi');
    if(verilerEl){
        const veriler=(anaKatkilar?.veriler||[]).map(v=>({...v,dersler:{ders_adi:v.ders_adi,ders_kodu:v.ders_kodu}}));
        if(anaKatkiHata)verilerEl.innerHTML='<p class="ny-form-hata">Ders verilerin yüklenemedi. 006 migrationının uygulandığını kontrol et.</p>';
        else if(!veriler?.length)verilerEl.innerHTML='<p class="ny-ipucu">Henüz hesabına bağlı bir ders verisi paylaşmadın.</p>';
        else verilerEl.innerHTML=veriler.map(v=>{hsDuzeltmeHedefleri.set(`ders_verisi:${v.id}`,v);return `<article class="hs-liste-satir profil-kayit-satir"><div><strong>${escHtml(v.dersler?.ders_kodu?v.dersler.ders_kodu+' — ':'')}${escHtml(v.dersler?.ders_adi||'Ders')}</strong><div class="ny-ipucu">${v.yil}-${v.yil+1} ${escHtml(v.donem)} · ${v.can_turu==='but'?'Bütünleme':'Final'} · HBN ${v.ortalama??'—'} · Std. ${v.std_sapma??'—'} · ${v.ogrenci_sayisi??'—'} öğrenci</div></div><div class="profil-kayit-eylemler"><button type="button" class="profil-ikincil-buton" data-nk-click="hsDuzeltmeModalAc" data-nk-click-arg0="ders_verisi" data-nk-click-arg1="#${v.id}">Düzeltme iste</button></div></article>`}).join('');
    }
    await hsDuzeltmeTalepleriniYukle();
}

async function hsGuvenlikItiraziGonder(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const aciklama = form.querySelector('#hs-guvenlik-itiraz')?.value.trim() || '';
    const btn = form.querySelector('button[type="submit"]');
    if (aciklama.length < 20) { hsSonucGoster('hs-guvenlik-itiraz-sonuc','Açıklama en az 20 karakter olmalı.',true); return; }
    btn.disabled = true;
    try {
        const { data, error } = await getSupabase().rpc('nk_guvenlik_itirazi_gonder',{p_aciklama:aciklama});
        if (error || !data?.basarili) throw new Error('İtiraz gönderilemedi.');
        hsSonucGoster('hs-guvenlik-itiraz-sonuc','İtirazın yönetici incelemesine gönderildi.',false);
        setTimeout(hsProfilVerileriniYukle,800);
    } catch (error) { hsSonucGoster('hs-guvenlik-itiraz-sonuc',error.message,true); }
    finally { btn.disabled=false; }
}

async function hsDuzeltmeTalepleriniYukle(){
    const alan=document.getElementById('hs-duzeltme-talepleri-listesi');if(!alan||!hsMevcutOturum)return;
    const {data,error}=await getSupabase().rpc('duzeltme_taleplerim');
    if(error){alan.innerHTML='<p class="ny-form-hata">Düzeltme talepleri yüklenemedi.</p>';return;}
    if(!data?.length){alan.innerHTML='<p class="ny-ipucu">Henüz düzeltme talebin yok.</p>';return;}
    const etiket={nk_ders:'Not Kutusu dersi',ders:'Ders',ders_verisi:'Ders verisi'};
    alan.innerHTML=data.map(t=>`<article class="hs-liste-satir profil-kayit-satir"><div><strong>${etiket[t.hedef_turu]||'Kayıt'} düzeltmesi</strong><div class="ny-ipucu">${escHtml(t.aciklama)}</div><span class="profil-talep-rozet ${t.durum}">${t.durum==='beklemede'?'İncelemede':t.durum==='onaylandi'?'Onaylandı':t.durum==='reddedildi'?'Reddedildi':'İptal edildi'}</span>${t.sonuc_notu?`<div class="ny-ipucu">Moderasyon: ${escHtml(t.sonuc_notu)}</div>`:''}</div>${t.durum==='beklemede'?`<div class="profil-kayit-eylemler"><button type="button" class="profil-ikincil-buton" data-nk-click="hsDuzeltmeTalebiIptal" data-nk-click-arg0="${t.id}">İptal et</button></div>`:''}</article>`).join('');
}

function hsDuzeltmeModalAc(tur,id){
    const hedef=hsDuzeltmeHedefleri.get(`${tur}:${id}`);if(!hedef)return;
    hsAktifDuzeltme={tur,id:String(id)};
    const alan=document.getElementById('hs-duzeltme-alanlari');
    if(tur==='ders_verisi')alan.innerHTML=`<div class="form-group"><label for="hs-duzeltme-ortalama">HBN ortalaması</label><input id="hs-duzeltme-ortalama" type="number" min="0" max="100" step="0.01" value="${hedef.ortalama??''}"></div><div class="form-group"><label for="hs-duzeltme-std">Standart sapma</label><input id="hs-duzeltme-std" type="number" min="0" max="50" step="0.01" value="${hedef.std_sapma??''}"></div><div class="form-group"><label for="hs-duzeltme-ogrenci">Öğrenci sayısı</label><input id="hs-duzeltme-ogrenci" type="number" min="1" max="10000" step="1" value="${hedef.ogrenci_sayisi??''}"></div>`;
    else { alan.innerHTML='<div class="form-group"><label for="hs-duzeltme-ders-adi">Ders adı</label><input id="hs-duzeltme-ders-adi" type="text" maxlength="160" required></div><div class="form-group"><label for="hs-duzeltme-ders-kodu">Ders kodu</label><input id="hs-duzeltme-ders-kodu" type="text" maxlength="30"></div>'; document.getElementById('hs-duzeltme-ders-adi').value=hedef.ders_adi||'';document.getElementById('hs-duzeltme-ders-kodu').value=hedef.ders_kodu||''; }
    document.getElementById('hs-duzeltme-aciklama').value='';document.getElementById('hs-duzeltme-sonuc').style.display='none';document.getElementById('hs-duzeltme-modal').classList.add('aktif');
}
function hsDuzeltmeModalKapat(){document.getElementById('hs-duzeltme-modal')?.classList.remove('aktif');hsAktifDuzeltme=null;}
async function hsDuzeltmeFormSubmit(e){
    e.preventDefault();if(!hsAktifDuzeltme)return;
    const aciklama=document.getElementById('hs-duzeltme-aciklama').value.trim();if(aciklama.length<5){hsSonucGoster('hs-duzeltme-sonuc','Lütfen en az 5 karakterlik bir gerekçe yaz.',true);return;}
    let oneri;
    if(hsAktifDuzeltme.tur==='ders_verisi'){
        oneri={};const alanlar=[['ortalama','hs-duzeltme-ortalama'],['std_sapma','hs-duzeltme-std'],['ogrenci_sayisi','hs-duzeltme-ogrenci']];alanlar.forEach(([k,id])=>{const v=document.getElementById(id).value;if(v!=='')oneri[k]=Number(v);});
    }else oneri={ders_adi:document.getElementById('hs-duzeltme-ders-adi').value.trim(),ders_kodu:document.getElementById('hs-duzeltme-ders-kodu').value.trim()};
    const btn=e.target.querySelector('button[type="submit"]'),eski=btn.textContent;btn.disabled=true;btn.textContent='Gönderiliyor...';
    try{const {data,error}=await getSupabase().rpc('duzeltme_talebi_olustur',{p_hedef_turu:hsAktifDuzeltme.tur,p_hedef_id:hsAktifDuzeltme.id,p_oneri:oneri,p_aciklama:aciklama});
        const mesaj={zaten_bekliyor:'Bu kayıt için zaten incelenen bir talebin var.',gecersiz_oneri:'Önerilen değerleri kontrol et.',gecersiz_veri:'Formdaki bilgileri kontrol et.',yetkisiz:'Bu kayıt için talep gönderemezsin.',kayit_bulunamadi:'Kayıt bulunamadı.'};
        if(error||!data?.basarili){hsSonucGoster('hs-duzeltme-sonuc',mesaj[data?.hata]||'Talep gönderilemedi.',true);return;}
        hsDuzeltmeModalKapat();await hsDuzeltmeTalepleriniYukle();
    }finally{btn.disabled=false;btn.textContent=eski;}
}
async function hsDuzeltmeTalebiIptal(id){
    const {data,error}=await getSupabase().rpc('duzeltme_talebi_iptal',{p_id:id});if(error||!data?.basarili)return;await hsDuzeltmeTalepleriniYukle();
}


async function hsKullaniciAdiFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ad = document.getElementById('hs-kullanici-adi').value.trim();
    if (!/^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_]{3,20}$/.test(ad)) {
        hsSonucGoster('hs-kullanici-adi-sonuc', 'Kullanıcı adı 3-20 karakter olmalı; boşluk kullanmadan harf, rakam veya alt çizgi içermeli. Örnek: Mustafa_TAŞ', true);
        return;
    }
    btn.disabled = true;
    const eskiMetin = btn.textContent;
    btn.textContent = 'Kaydediliyor...';
    try {
        const { data, error } = await getSupabase().rpc('kullanici_adi_ayarla', { p_ad: ad });
        if (error || !data || !data.basarili) {
            const hatalar = {
                gecersiz_ad: 'Kullanıcı adı 3-20 karakter olmalı (harf, rakam, alt çizgi).',
                yasakli_kelime: 'Kullanıcı adında uygunsuz bir ifade var, farklı bir ad dene.',
                ad_alinmis: 'Bu kullanıcı adı alınmış.',
                giris_gerekli: 'Bu işlem için giriş yapmalısın.'
            };
            const teknikHatalar = {
                '23505': 'Bu kullanıcı adı alınmış.',
                '42501': 'Kullanıcı adı kaydetme izni etkin değil. Son veritabanı migrationını kontrol et.',
                '42883': 'Kullanıcı adı altyapısı bulunamadı. Son veritabanı migrationını çalıştır.',
                PGRST202: 'Kullanıcı adı altyapısı Supabase şemasında görünmüyor. Son migrationı çalıştır.'
            };
            hsSonucGoster('hs-kullanici-adi-sonuc', hatalar[data?.hata] || teknikHatalar[error?.code] || 'Kullanıcı adı kaydedilemedi. Bağlantını kontrol edip tekrar dene.', true);
            return;
        }
        hsMevcutProfil = { ...(hsMevcutProfil || {}), kullanici_adi: data.kullanici_adi };
        hsProfilOnbelleginiYaz();
        hsHeaderButonuGuncelle();
        hsSonucGoster('hs-kullanici-adi-sonuc', 'Kullanıcı adın kaydedildi: ' + data.kullanici_adi, false);
        const gorunenAd = document.getElementById('hs-profil-kullanici-adi');
        if (gorunenAd) gorunenAd.textContent = data.kullanici_adi;
        window.dispatchEvent(new CustomEvent('kullaniciAdiDegisti', { detail: { kullanici_adi: data.kullanici_adi } }));
    } finally {
        btn.disabled = false;
        btn.textContent = eskiMetin;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('hesapButonu');
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    getSupabase().auth.onAuthStateChange((event, session) => hsOturumDegistiHandler(event, session));
});
function hsProfilAta(profil) { hsMevcutProfil = profil; }

export { HS_EPOSTA_REGEX, hsBekleyenKayitEposta, hsBekleyenSifirlamaEposta, hsMevcutOturum, hsMevcutProfil, hsModalEnjekteEdildiMi, hsSonucGoster, hsOturumDegistiHandler, hsHeaderButonuGuncelle, hesapButonTiklandi, hsModallariEnjekteEt, hsGirisModalAc, hsGirisModalKapat, hsAuthGoster, hsGirisFormSubmit, hsKayitFormSubmit, hsKayitKodFormSubmit, hsSifirlamaIstekFormSubmit, hsSifirlamaKodFormSubmit, hesapCikisYap, hsProfilModalAc, hsProfilModalKapat, hsProfilSekmeGoster, hsProfilSayfasiBaslat, hsProfilVerileriniYukle, hsKullaniciAdiFormSubmit, hsDuzeltmeModalAc, hsDuzeltmeModalKapat, hsDuzeltmeTalebiIptal, hsProfilAta };
