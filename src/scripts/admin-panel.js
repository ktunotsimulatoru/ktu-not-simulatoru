const SUPABASE_URL = 'https://tsfscfgwbmiouptsljyi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7VUXgTfS6iYY3NU0IVwYpA_FRI0t7MI';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let chartInstances = {};

// ── GİRİŞ ──
// v5 güvenlik güncellemesi: Önceden girişten sonra tüm admin işlemleri (ders
// onaylama, duyuru/anket yönetimi, fakülte/bölüm ekleme vb.) doğrudan tablo
// çağrılarıyla yapılıyordu; asıl yetki sınırı tamamen o tabloların RLS'ine
// kalmıştı ve bazı tablolar (dersler, ders_verileri, ano_* log tabloları)
// RLS'siz (UNRESTRICTED) olduğu için herkes panele hiç girmeden bu tablolara
// doğrudan yazabiliyordu. Artık girişte gerçek bir sunucu oturum token'ı
// (admin_oturum_olustur, ny_oturum_* ile aynı desen) üretiliyor ve panelin
// yaptığı HER yazma/silme işlemi bu token'ı isteyen bir admin_* RPC'si
// üzerinden gidiyor (bkz. supabase-admin-guvenlik-v5.sql).
function adminToken() { return sessionStorage.getItem('admin_token') || ''; }
document.addEventListener('DOMContentLoaded', () => NKDosyaErisim.ayarla({ adminToken }));

// Bir admin_* RPC'si {basarili:false, hata:'yetkisiz'} döndüyse (token süresi
// dolmuş/geçersiz) oturumu temizleyip giriş ekranına döner ve true döner —
// çağıran fonksiyon bu durumda kendi normal akışını (tabloyu yeniden yükleme
// vb.) atlamalı.
function adminYetkisizIseGirisEkraninaDon(sonuc) {
    if (sonuc && sonuc.hata === 'yetkisiz') {
        sessionStorage.removeItem('admin_token');
        alert('Oturum süresi doldu, tekrar giriş yapmalısınız.');
        location.reload();
        return true;
    }
    return false;
}

// admin_ano_gruplari_getir / admin_ano_grup_sayisi gibi "table"/skaler dönen okuma RPC'leri
// geçersiz token'da json {basarili:false} değil, doğrudan bir SQL hatası ('yetkisiz' mesajıyla)
// fırlatıyor — bu yüzden onlar için ayrı, hata mesajını kontrol eden bir yardımcı gerekiyor.
function oturumSuresiDolduMuKontrolEt(errorMesaji) {
    if (errorMesaji && errorMesaji.includes('yetkisiz')) {
        sessionStorage.removeItem('admin_token');
        alert('Oturum süresi doldu, tekrar giriş yapmalısınız.');
        location.reload();
        return true;
    }
    return false;
}

async function girisYap() {
    const sifre = document.getElementById('sifre-input').value.trim();
    if (!sifre) return;
    // Şifre artık client-side'da okunmuyor — admin_config tablosu anon key ile hiç okunamıyor
    // (bkz. check_admin_password SQL fonksiyonu). admin_oturum_olustur şifreyi sunucuda bir kez
    // daha doğrulayıp rastgele bir oturum token'ı üretiyor; panel artık şifreyi değil, sadece
    // bu token'ı saklıyor ve her admin işleminde onu gönderiyor.
    const { data: sonuc, error } = await sb.rpc('admin_oturum_olustur', { p_sifre: sifre });
    if (error) { document.getElementById('giris-hata').textContent = 'Bağlantı hatası.'; return; }
    if (sonuc && sonuc.basarili && sonuc.token) {
        sessionStorage.setItem('admin_token', sonuc.token);
        document.getElementById('giris-ekrani').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        panelBaslat();
    } else {
        document.getElementById('giris-hata').textContent = '❌ Yanlış şifre.';
    }
}

async function cikisYap() {
    NKDosyaErisim.temizle();
    const token = adminToken();
    sessionStorage.removeItem('admin_token');
    if (token) { try { await sb.rpc('admin_oturum_iptal', { p_admin_token: token }); } catch (e) {} }
    location.reload();
}

if (sessionStorage.getItem('admin_token')) {
    document.getElementById('giris-ekrani').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    window.addEventListener('DOMContentLoaded', panelBaslat);
}

async function panelBaslat() {
    await duyuruSuresiBitenleriKapat();
    await istatistikleriYukle();
    platformOzetiYukle();
    onayBekleyenSayisiGoster();
    soruOnayBekleyenSayisiGoster();
    isletimOzetiYukle();
}

function sekmeDegistir(bolum, btn) {
    document.querySelectorAll('.panel-bolum').forEach(b => b.classList.remove('aktif'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('aktif'));
    document.getElementById('bolum-' + bolum).classList.add('aktif');
    btn.classList.add('aktif');
    if (bolum === 'dersler') { dersFiltreFakulteDoldur(); dersleriYukle(); }
    else if (bolum === 'sorular') { sorulariYukle(); tumSorulariYukle(); nkAdminDersleriYukle(); bildirimleriYukle(); adminDuzeltmeTalepleriniYukle(); guvenlikOlaylariniYukle(); }
    else if (bolum === 'veriler') { veriFiltreFakulteDoldur(); }
    else if (bolum === 'duyurular') { duyurulariYukle(); duyuruKutulariRenderla(); }
    else if (bolum === 'anketler') { anketleriYukle(); anketSorulariRenderla(); }
    else if (bolum === 'fakulteler') { fakulteleriYukle(); bolumleriYukle(); fakulteSelectDoldur(); }
    else if (bolum === 'istatistik') { istatistikleriYukle(); platformOzetiYukle(); isletimOzetiYukle(); }
    else if (bolum === 'anodersler') anoDersAnalizYukle();
    else if (bolum === 'oyun') oyunIstatistikYukle();
}

async function platformOzetiYukle() {
    const alan = document.getElementById('platform-ozeti');
    if (!alan) return;
    alan.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const { data, error } = await sb.rpc('admin_platform_ozeti', { p_admin_token: adminToken() });
    if (error) {
        if (oturumSuresiDolduMuKontrolEt(error.message)) return;
        const eksik = ['42883', 'PGRST202'].includes(error.code);
        alan.innerHTML = `<div class="bos-mesaj">${eksik ? 'Platform özeti için 010 migrationını çalıştırın.' : 'Platform özeti şu anda alınamadı.'}</div>`;
        return;
    }
    const kartlar = [
        ['👤', 'Kayıtlı kullanıcı', data?.kayitli_kullanici, `${Number(data?.kullanici_adi || 0).toLocaleString('tr-TR')} kullanıcı adı belirledi`],
        ['📚', 'Ders', data?.ders, 'Hesaplama bölümündeki dersler'],
        ['📈', 'Ders verisi', data?.ders_verisi, 'Paylaşılan ortalama ve sınıf verileri'],
        ['🎓', 'Kayıtlı AGNO dönemi', data?.kayitli_agno_donemi, 'Kullanıcıların kaydettiği dönemler'],
        ['🗂️', 'Not Kutusu dersi', data?.not_kutusu_dersi, 'Arşivdeki ders klasörleri'],
        ['📝', 'Toplam paylaşım', data?.paylasim, `${Number(data?.onayli_paylasim || 0).toLocaleString('tr-TR')} onaylı · ${Number(data?.bekleyen_paylasim || 0).toLocaleString('tr-TR')} bekliyor`],
        ['📎', 'Saklanan dosya', data?.saklanan_dosya, 'Silinmiş ve temizliktekiler hariç'],
        ['💬', 'Emoji tepkisi', data?.emoji_tepkisi, 'Paylaşımlara verilen tepkiler'],
        ['🚩', 'Açık bildirim', data?.acik_bildirim, `${Number(data?.bekleyen_duzeltme || 0).toLocaleString('tr-TR')} düzeltme talebi bekliyor`]
    ];
    alan.innerHTML = `<div class="stat-karti-grid platform-ozet-kartlari">${kartlar.map(([ikon, baslik, deger, alt]) => `<div class="stat-karti"><div class="stat-karti-baslik">${ikon} ${baslik}</div><div class="stat-karti-deger">${Number(deger || 0).toLocaleString('tr-TR')}</div><div class="stat-karti-alt">${alt}</div></div>`).join('')}</div>`;
}

async function isletimOzetiYukle() {
    const alan=document.getElementById('isletim-ozeti');if(!alan)return;
    alan.innerHTML='<div class="yukleniyor">Yükleniyor...</div>';
    const {data,error}=await sb.rpc('admin_isletim_ozeti',{p_admin_token:adminToken()});
    if(error){
        if(oturumSuresiDolduMuKontrolEt(error.message))return;
        console.warn('[işletim-özeti] RPC başarısız:',error.code||'bilinmeyen');
        const eksik=['42883','PGRST202'].includes(error.code);
        const yetki=error.code==='42501'||/yetkisiz/i.test(error.message||'');
        alan.innerHTML=`<div class="bos-mesaj">${eksik?'İşletim özeti RPC’si bulunamadı. 007 migrationını çalıştırın.':yetki?'İşletim özetine erişim reddedildi. Yönetici oturumunu yenileyin.':'İşletim özeti şu anda alınamadı.'}</div>`;
        return;
    }
    const tekrar=data?.tekrarli_hatalar||[];
    alan.innerHTML=`<div class="stat-karti-grid isletim-kartlari"><div class="stat-karti"><div class="stat-karti-baslik">Son 24 saat hata</div><div class="stat-karti-deger">${Number(data?.son_24_saat||0)}</div></div><div class="stat-karti"><div class="stat-karti-baslik">Son 7 gün hata</div><div class="stat-karti-deger">${Number(data?.son_7_gun||0)}</div></div><div class="stat-karti"><div class="stat-karti-baslik">Temizlik bekleyen dosya</div><div class="stat-karti-deger">${Number(data?.temizlik_bekleyen||0)}</div></div></div>${tekrar.length?`<table><thead><tr><th>Kategori</th><th>Kod</th><th>Güvenli mesaj</th><th>Adet</th><th>Son görülme</th></tr></thead><tbody>${tekrar.map(h=>`<tr><td>${escHtml(h.kategori)}</td><td><code>${escHtml(h.kod)}</code></td><td>${escHtml(h.mesaj)}</td><td>${Number(h.adet)}</td><td>${new Date(h.son_tarih).toLocaleString('tr-TR')}</td></tr>`).join('')}</tbody></table>`:'<div class="bos-mesaj">Son 7 günde kayıtlı üye hatası yok.</div>'}`;
}

async function onayBekleyenSayisiGoster() {
    const { count } = await sb.from('dersler').select('id', { count: 'exact', head: true }).eq('onaylandi', false);
    const badge = document.getElementById('onay-badge');
    if (count && count > 0) { badge.textContent = count; badge.style.display = 'inline'; }
    else { badge.style.display = 'none'; }
}

function aralikDegisti() {
    const val = document.getElementById('istat-aralik').value;
    const ozelDiv = document.getElementById('filtre-tarih-ozel');
    if (val === 'ozel') {
        ozelDiv.classList.add('aktif');
    } else {
        ozelDiv.classList.remove('aktif');
        istatistikleriYukle();
    }
}

// ── İSTATİSTİKLER ──
// "Uygula"ya art arda basmak ya da sekmeye girer girmez aralık değiştirmek gibi durumlarda
// birden fazla istatistikleriYukle() çağrısı aynı anda uçuşabiliyor. Ağdan geç dönen ESKİ bir
// çağrı, kullanıcının o sırada seçtiği YENİ (ör. özel aralık) sonucun üzerine yazmasın diye
// her çağrıya bir sıra numarası veriyor, yalnızca en son başlatılan çağrının sonucunu uyguluyoruz.
let istatistikIstekSayaci = 0;
async function istatistikleriYukle() {
    const buIstek = ++istatistikIstekSayaci;
    const gecerliMi = () => buIstek === istatistikIstekSayaci;
    const kartlar = document.getElementById('stat-kartlar');
    kartlar.innerHTML = '<div style="color:var(--muted);font-size:0.9em;padding:8px;">Yükleniyor...</div>';

    try {
        const aralikVal = document.getElementById('istat-aralik').value;
        let sinir = null, sinirBitis = null, aralikMetinKisa = 'Tüm zamanlar';

        if (aralikVal === 'ozel') {
            const bas = document.getElementById('istat-baslangic').value;
            const bit = document.getElementById('istat-bitis-tarih').value;
            if (bas) { sinir = new Date(bas); sinir.setHours(0,0,0,0); sinir = sinir.toISOString(); }
            if (bit) { sinirBitis = new Date(bit); sinirBitis.setHours(23,59,59,999); sinirBitis = sinirBitis.toISOString(); }
            aralikMetinKisa = bas && bit ? `${bas} – ${bit}` : bas ? `${bas} sonrası` : bit ? `${bit} öncesi` : 'Özel';
        } else {
            const aralik = parseInt(aralikVal);
            if (aralik === 1) {
                const d = new Date(); d.setHours(d.getHours() - 24);
                sinir = d.toISOString(); aralikMetinKisa = 'Son 24 saat';
            } else if (aralik > 0) {
                const d = new Date(); d.setDate(d.getDate() - aralik);
                sinir = d.toISOString(); aralikMetinKisa = `Son ${aralik} gün`;
            }
        }

        const HARF_LISTESI = ['AA','BA','BB','CB','CC','DC','DD','FD','FF'];
        const HARF_CLR = { AA:'#28a745',BA:'#5cb85c',BB:'#82ca9c',CB:'#007bff',CC:'#17a2b8',DC:'#fd7e14',DD:'#ffc107',FD:'#dc3545',FF:'#a21427' };
        const fmtSure = s => s==null ? '—' : s>=60 ? `${Math.floor(s/60)}dk ${Math.round(s%60)}sn` : `${Math.round(s)}sn`;

        // v6: hesaplama_loglari/paylasim_loglari/sayfa_goruntuleme artık anon'a kapalı — bu
        // yardımcılar artık doğrudan tablo sorgusu yerine admin_log_sayisi RPC'sini çağırıyor,
        // ama geriye dönen şekil ({count: N}) aynı kaldığı için aşağıdaki c(r) okuma kodu
        // değişmeden çalışıyor.
        const adminSayi = (tablo, filtre) => sb.rpc('admin_log_sayisi', {
            p_admin_token: adminToken(), p_tablo: tablo, p_filtre: filtre || {},
            p_baslangic: sinir, p_bitis: sinirBitis
        }).then(({ data, error }) => {
            if (error) { if (oturumSuresiDolduMuKontrolEt(error.message)) throw new Error('yetkisiz'); throw error; }
            return { count: data };
        });
        const qhl = () => adminSayi('hesaplama_loglari', {});
        const qf = (filtre) => adminSayi('hesaplama_loglari', filtre);
        const qp = (filtre) => adminSayi('paylasim_loglari', filtre);

        // ── 1. Count sorguları (limitsiz, sadece sayı) ──
        const SISTEM_LISTESI = ['tablo1','tablo2','mutlak'];
        const FAKULTE_TURU_LISTESI = ['genel','saglik','eczacilik'];
        const [
            countR, harfR, gerekliR, senaryoR, anoR,
            mobilR, masaustuR, final45R,
            paylasimR, paylasimHarfR, paylasimGerekliR, paylasimSenaryoR, paylasimAnoR,
            ...digerCountRler
        ] = await Promise.allSettled([
            qhl(),
            qf({sekme:'harf'}), qf({sekme:'gerekli'}), qf({sekme:'senaryo'}), qf({sekme:'ano'}),
            qf({is_mobile:true}), qf({is_mobile:false}), qf({sekme:'harf',final_notu:45}),
            qp({}), qp({sekme:'harf'}), qp({sekme:'gerekli'}), qp({sekme:'senaryo'}), qp({sekme:'ano'}),
            ...HARF_LISTESI.map(h => qf({harf_notu:h})),
            ...SISTEM_LISTESI.map(s => qf({sistem_secimi:s})),
            ...FAKULTE_TURU_LISTESI.map(f => qf({fakulte_turu:f}))
        ]);
        const harfCountRler = digerCountRler.slice(0, HARF_LISTESI.length);
        const sistemCountRler = digerCountRler.slice(HARF_LISTESI.length, HARF_LISTESI.length + SISTEM_LISTESI.length);
        const fakulteTuruCountRler = digerCountRler.slice(HARF_LISTESI.length + SISTEM_LISTESI.length);

        const c = r => r?.status==='fulfilled' ? (r.value?.count||0) : 0;
        const toplam       = c(countR);
        const sekmeler     = { harf:c(harfR), gerekli:c(gerekliR), senaryo:c(senaryoR), ano:c(anoR) };
        const mobilSayisi  = c(mobilR), masaustuSayisi = c(masaustuR), final45 = c(final45R);
        const paylasimToplam = c(paylasimR), paylasimHarf = c(paylasimHarfR), paylasimGerekli = c(paylasimGerekliR), paylasimSenaryo = c(paylasimSenaryoR), paylasimAno = c(paylasimAnoR);
        const harfSayac    = {}; HARF_LISTESI.forEach((h,i) => { const v=c(harfCountRler[i]); if(v>0) harfSayac[h]=v; });
        const sistemSayac  = {}; SISTEM_LISTESI.forEach((s,i) => { sistemSayac[s]=c(sistemCountRler[i]); });
        const fakulteTuruSayac = {}; FAKULTE_TURU_LISTESI.forEach((f,i) => { fakulteTuruSayac[f]=c(fakulteTuruCountRler[i]); });
        const sistemToplam = SISTEM_LISTESI.reduce((t,s)=>t+sistemSayac[s],0);
        const fakulteTuruToplam = FAKULTE_TURU_LISTESI.reduce((t,f)=>t+fakulteTuruSayac[f],0);
        const mobilBilinmiyor = toplam - mobilSayisi - masaustuSayisi;
        // Paylaşım oranı genelde çok küçük bir yüzde olduğu için ("%0.0" gibi anlamsız görünmesin diye)
        // 1 ondalık yerine gerektiğinde "<0.01" gösteren bir biçimlendirme kullanıyoruz.
        const fmtKucukOran = (pay, tob) => {
            if (!tob || !pay) return '0';
            const o = (pay/tob)*100;
            return o < 0.01 ? '<0.01' : o.toFixed(2);
        };
        const paylasimOran = fmtKucukOran(paylasimToplam, toplam);

        // ── 2. Tek RPC çağrısı — tüm ağır hesaplamalar DB'de ──
        const rpcParams = { p_admin_token: adminToken() };
        if (sinir) rpcParams.sinir_tarihi = sinir;
        if (sinirBitis) rpcParams.sinir_bitis = sinirBitis;
        let { data: fnData, error: fnErr } = await sb.rpc('istatistik_ozet', rpcParams);
        let bitisTarihiUyarisi = false;
        if (fnErr && fnErr.message && fnErr.message.includes('istatistik_ozet') && sinirBitis) {
            // DB'de henüz (sinir_tarihi, sinir_bitis) ikilisini birlikte kabul eden bir fonksiyon
            // tanımı yok (PGRST202). Panel tamamen kırılmasın diye sadece başlangıç sınırıyla tekrar dene.
            const tekParamRes = await sb.rpc('istatistik_ozet', sinir ? { p_admin_token: adminToken(), sinir_tarihi: sinir } : { p_admin_token: adminToken() });
            fnData = tekParamRes.data; fnErr = tekParamRes.error;
            if (!fnErr) bitisTarihiUyarisi = true;
        }
        if (fnErr) { if (oturumSuresiDolduMuKontrolEt(fnErr.message)) return; throw new Error('istatistik_ozet: ' + fnErr.message); }
        const fn = fnData || {};
        if (adminYetkisizIseGirisEkraninaDon(fn)) return;

        const ortVize      = fn.ort_vize   != null ? fn.ort_vize   : '—';
        const ortFinal     = fn.ort_final  != null ? fn.ort_final  : '—';
        const vizeSayisi   = fn.vize_sayisi || 0;
        const finalSayisi  = fn.final_sayisi || 0;
        const ortAno       = fn.ort_ano    != null ? fn.ort_ano    : '—';
        const anoSayisi    = fn.ano_sayisi || 0;
        const ortTekrar    = fn.ort_tekrar != null ? fn.ort_tekrar : '—';
        const tekrarSayisi = fn.tekrar_sayisi || 0;
        const tekrar2Plus  = fn.tekrar2plus || 0;
        const tekrar2PlusOran = tekrarSayisi ? ((tekrar2Plus/tekrarSayisi)*100).toFixed(0) : 0;
        const ortSureStr   = fmtSure(fn.ort_sure);
        const medyanSureStr= fmtSure(fn.medyan_sure != null ? parseFloat(fn.medyan_sure) : null);

        // Dağılımlar — DB'den gelen JSON nesneleri
        const ortBantSira  = ['0-30','30-40','40-50','50-60','60-70','70-80','80+'];
        const ortBantlar   = fn.sinif_ort_bantlar || {};
        const hedefSayac   = fn.hedef_dagilim    || {};
        const vizeHedefOrt = fn.vize_hedef_ort   || {};
        const saatDagilim  = fn.saat_dagilim     || {};
        const gunDagilim   = fn.gun_dagilim      || {};

        // Saatlik/haftalık dizileri oluştur
        const saatBantlar  = Array.from({length:24}, (_,i) => saatDagilim[i] || 0);
        const gunAdlar     = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
        const haftaBantlar = Array.from({length:7},  (_,i) => gunDagilim[i]  || 0);

        // ── 3. Günlük trend ──
        // Tüm zamanlar seçiliyse son 30 gün, aksi halde seçilen aralık kadar gün göster
        const aralik = aralikVal === 'ozel' ? 30 : (parseInt(aralikVal) || 0);
        const gunSayisi2 = aralik > 0 ? Math.min(aralik, 365) : 30;
        const gunlukSinirTarih = new Date(); gunlukSinirTarih.setDate(gunlukSinirTarih.getDate() - gunSayisi2);
        const gunlukSinirStr = aralikVal === 'ozel' && sinir ? sinir : gunlukSinirTarih.toISOString();
        const { data: gunlukData, error: gunlukErr } = await sb.rpc('admin_hesaplama_tarihleri', {
            p_admin_token: adminToken(), p_baslangic: gunlukSinirStr, p_bitis: sinirBitis
        });
        if (gunlukErr) { if (oturumSuresiDolduMuKontrolEt(gunlukErr.message)) return; throw gunlukErr; }
        const gunSayac = {};
        for(let i=gunSayisi2-1;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); gunSayac[d.toISOString().slice(0,10)]=0; }
        (gunlukData||[]).forEach(r => { const g=r.olusturulma_tarihi?.slice(0,10); if(g&&gunSayac[g]!==undefined) gunSayac[g]++; });

        // ── 4. Ziyaretçi verileri ──
        let ziyaretciToplam=0, ziyaretciMobil=0, topReferrerler=[];
        try {
            const [ztR, zmR] = await Promise.all([
                adminSayi('sayfa_goruntuleme', {}),
                adminSayi('sayfa_goruntuleme', {is_mobile:true})
            ]);
            ziyaretciToplam = ztR.count||0;
            ziyaretciMobil  = zmR.count||0;
            // Referrer: sayfalama ile tümünü çek
            const refSayac={};
            let refSayfa=0, refLimit=1000;
            while(true) {
                const { data: refData, error: refErr } = await sb.rpc('admin_sayfa_referrerlari', {
                    p_admin_token: adminToken(), p_baslangic: sinir, p_bitis: sinirBitis,
                    p_limit: refLimit, p_offset: refSayfa*refLimit
                });
                if (refErr) { if (oturumSuresiDolduMuKontrolEt(refErr.message)) return; throw refErr; }
                if(!refData || !refData.length) break;
                refData.forEach(r => { const ref=r.referrer||'direkt'; refSayac[ref]=(refSayac[ref]||0)+1; });
                if(refData.length < refLimit) break;
                refSayfa++;
            }
            topReferrerler = Object.entries(refSayac).sort((a,b)=>b[1]-a[1]).slice(0,8);
        } catch(e) {}

        // ── 5. Ara Sınav Hesaplama Yöntemi kullanımı — sistem bazında (Tek Not Girişi /
        // Detaylı Giriş / Mezuniyet Sınavı). 'giris_yontemi' sütunu henüz eklenmediyse
        // (migration çalıştırılmadıysa) sorgular hatasız biçimde 0 döner, panel kırılmaz.
        const [
            t1TekR, t1DetayliR, t2TekR, t2DetayliR, mTekR, mDetayliR, mMezuniyetR
        ] = await Promise.allSettled([
            qf({sistem_secimi:'tablo1', giris_yontemi:'tek'}), qf({sistem_secimi:'tablo1', giris_yontemi:'detayli'}),
            qf({sistem_secimi:'tablo2', giris_yontemi:'tek'}), qf({sistem_secimi:'tablo2', giris_yontemi:'detayli'}),
            qf({sistem_secimi:'mutlak', giris_yontemi:'tek'}), qf({sistem_secimi:'mutlak', giris_yontemi:'detayli'}),
            qf({sistem_secimi:'mutlak', giris_yontemi:'mezuniyet'})
        ]);
        const yontemSayac = {
            tablo1: { tek: c(t1TekR), detayli: c(t1DetayliR) },
            tablo2: { tek: c(t2TekR), detayli: c(t2DetayliR) },
            mutlak: { tek: c(mTekR), detayli: c(mDetayliR), mezuniyet: c(mMezuniyetR) }
        };

        // ── 6. Mezuniyet Sınavı'na özgü istatistik ──
        // Bilinçli olarak "Ort. Final Notu" / "Ort. Vize Notu" gibi genel sınav istatistiklerine
        // KARIŞTIRILMIYOR (mezuniyet sınavının ara sınav/final ayrımı olmadığından karşılaştırılabilir
        // bir "final notu" değildir) — kendi sinav_notu sütunundan, ayrı bir kart olarak hesaplanır.
        // Toplam hesaplama sayısına (yukarıdaki `toplam`) zaten hesaplama_loglari'na eklenen her satır
        // gibi otomatik dahildir.
        let mezuniyetSayisi = 0, mezuniyetOrtSinavNotu = '—', mezuniyetGecti = 0, mezuniyetDcSartli = 0, mezuniyetKaldi = 0;
        try {
            const GECEN_NOTLAR = ['AA','BA','BB','CB','CC'];
            let mezSayfa = 0, mezLimit = 1000, mezSatirlar = [];
            while (true) {
                const { data: mezData, error: mezErr } = await sb.rpc('admin_mezuniyet_kayitlari', {
                    p_admin_token: adminToken(), p_baslangic: sinir, p_bitis: sinirBitis,
                    p_limit: mezLimit, p_offset: mezSayfa*mezLimit
                });
                if (mezErr || !mezData || !mezData.length) break;
                mezSatirlar = mezSatirlar.concat(mezData);
                if (mezData.length < mezLimit) break;
                mezSayfa++;
            }
            mezuniyetSayisi = mezSatirlar.length;
            if (mezuniyetSayisi > 0) {
                const notlar = mezSatirlar.map(r => r.sinav_notu).filter(v => v !== null && v !== undefined);
                if (notlar.length) mezuniyetOrtSinavNotu = (notlar.reduce((a,b)=>a+b,0) / notlar.length).toFixed(1);
                mezSatirlar.forEach(r => {
                    if (GECEN_NOTLAR.includes(r.harf_notu)) mezuniyetGecti++;
                    else if (r.harf_notu === 'DC') mezuniyetDcSartli++;
                    else mezuniyetKaldi++;
                });
            }
        } catch (e) { /* giris_yontemi/sinav_notu sütunları henüz yoksa sessizce geç */ }

        // Bu sırada daha yeni bir istatistikleriYukle() çağrısı başlamışsa (ör. kullanıcı aralığı
        // tekrar değiştirdi), bu eski sonucu ekrana hiç yazmadan sessizce vazgeçiyoruz.
        if (!gecerliMi()) return;

        // Not: bu, "ziyaretçilerin kaçının en az 1 hesaplama yaptığı" değil — bir ziyaretçi aynı
        // oturumda birden fazla hesaplama yapabildiği için bu oran %100'ü rahatlıkla aşabiliyordu
        // ve "%455 hesaplama yaptı" gibi anlamsız görünüyordu. Bunun yerine ziyaretçi başına
        // ortalama kaç hesaplama yapıldığını (bir oran/katsayı olarak) gösteriyoruz.
        const ziyaretciBasinaHesaplama = ziyaretciToplam ? (toplam/ziyaretciToplam).toFixed(1) : '—';
        const ziyaretciMasaustuSayisi = ziyaretciToplam - ziyaretciMobil;
        const ffSayisi = harfSayac['FF']||0, aaSayisi = harfSayac['AA']||0;
        const ffOran = toplam ? ((ffSayisi/toplam)*100).toFixed(1) : 0;
        const aaOran = toplam ? ((aaSayisi/toplam)*100).toFixed(1) : 0;
        const saatAralikMetin = aralikMetinKisa;

        // ── KARTLAR ──
        kartlar.innerHTML = `
            ${bitisTarihiUyarisi ? `<div style="grid-column:1/-1;background:rgba(245,165,36,0.16);color:#92600b;border:1px solid #f5a524;border-radius:6px;padding:8px 12px;font-size:0.85em;">⚠️ Veritabanındaki <code>istatistik_ozet</code> fonksiyonu henüz bitiş tarihini kabul etmiyor; aşağıdaki ortalama/dağılım kartları (ziyaretçi ve hesaplama sayıları hariç) yalnızca başlangıç tarihine göre hesaplandı. Fonksiyonun güncellenmesi gerekiyor.</div>` : ''}
            <div class="stat-karti"><div class="stat-karti-baslik">👥 Toplam Ziyaretçi</div>
                <div class="stat-karti-deger">${ziyaretciToplam.toLocaleString('tr-TR')}</div>
                <div class="stat-karti-alt">📱 ${ziyaretciMobil.toLocaleString('tr-TR')} mobil · 🖥️ ${ziyaretciMasaustuSayisi.toLocaleString('tr-TR')} masaüstü</div>
                <div class="stat-karti-alt" style="margin-top:2px;color:var(--muted)">Ziyaretçi başına ortalama ${ziyaretciBasinaHesaplama} hesaplama</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">📊 Toplam Hesaplama</div>
                <div class="stat-karti-deger">${toplam.toLocaleString('tr-TR')}</div>
                <div class="stat-karti-alt">Harf: ${sekmeler.harf.toLocaleString('tr-TR')} · Gerekli: ${sekmeler.gerekli.toLocaleString('tr-TR')} · Senaryo: ${sekmeler.senaryo.toLocaleString('tr-TR')} · ANO: ${sekmeler.ano.toLocaleString('tr-TR')}</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">❌ FF Oranı</div>
                <div class="stat-karti-deger" style="color:var(--red)">${ffOran}%</div>
                <div class="stat-karti-alt">${ffSayisi.toLocaleString('tr-TR')} hesaplamada sonuç FF çıktı</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">✅ AA Oranı</div>
                <div class="stat-karti-deger" style="color:var(--green)">${aaOran}%</div>
                <div class="stat-karti-alt">${aaSayisi.toLocaleString('tr-TR')} hesaplamada sonuç AA çıktı</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">📝 Ort. Vize Notu</div>
                <div class="stat-karti-deger">${ortVize}</div>
                <div class="stat-karti-alt">${vizeSayisi.toLocaleString('tr-TR')} kayıt üzerinden hesaplandı</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">📝 Ort. Final Notu</div>
                <div class="stat-karti-deger">${ortFinal}</div>
                <div class="stat-karti-alt">${finalSayisi.toLocaleString('tr-TR')} kayıt üzerinden hesaplandı</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">😅 Final = 45 Girişi</div>
                <div class="stat-karti-deger" style="color:var(--orange)">${final45.toLocaleString('tr-TR')}</div>
                <div class="stat-karti-alt">Tam 45 girerek hesaplayan kullanıcı sayısı</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🎓 Ort. ANO</div>
                <div class="stat-karti-deger" style="color:var(--purple)">${ortAno}</div>
                <div class="stat-karti-alt">${anoSayisi.toLocaleString('tr-TR')} ANO hesaplamasının ortalaması</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🔗 Paylaşılan Link</div>
                <div class="stat-karti-deger" style="color:var(--accent)">${paylasimToplam.toLocaleString('tr-TR')}</div>
                <div class="stat-karti-alt">Sonuç paylaşım oranı: %${paylasimOran} · Tüm hesaplamaların içindeki payı</div>
                <div class="stat-karti-alt">Harf: ${paylasimHarf.toLocaleString('tr-TR')} · Gerekli: ${paylasimGerekli.toLocaleString('tr-TR')} · Senaryo: ${paylasimSenaryo.toLocaleString('tr-TR')} · ANO: ${paylasimAno.toLocaleString('tr-TR')}</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🔄 Oturum Başı Hesaplama</div>
                <div class="stat-karti-deger" style="color:var(--accent)">${ortTekrar}</div>
                <div class="stat-karti-alt">Kullanıcıların %${tekrar2PlusOran}'i aynı oturumda 2+ hesaplama yaptı</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">⏱️ Ort. Sayfa Süresi</div>
                <div class="stat-karti-deger">${ortSureStr}</div>
                <div class="stat-karti-alt">Medyan: ${medyanSureStr}</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🧮 Seçilen Hesaplama Sistemi</div>
                <div class="stat-karti-deger" style="font-size:1.05em;color:var(--accent)">${sistemToplam.toLocaleString('tr-TR')} kayıt</div>
                <div class="stat-karti-alt">30+ Öğr: ${sistemSayac.tablo1.toLocaleString('tr-TR')} (%${sistemToplam?((sistemSayac.tablo1/sistemToplam)*100).toFixed(0):0}) · 1-29 Öğr: ${sistemSayac.tablo2.toLocaleString('tr-TR')} (%${sistemToplam?((sistemSayac.tablo2/sistemToplam)*100).toFixed(0):0}) · Mutlak: ${sistemSayac.mutlak.toLocaleString('tr-TR')} (%${sistemToplam?((sistemSayac.mutlak/sistemToplam)*100).toFixed(0):0})</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🏛️ Seçilen Final Alt Sınırı</div>
                <div class="stat-karti-deger" style="font-size:1.05em;color:var(--accent)">${fakulteTuruToplam.toLocaleString('tr-TR')} kayıt</div>
                <div class="stat-karti-alt">Genel/45: ${fakulteTuruSayac.genel.toLocaleString('tr-TR')} · Sağlık/50: ${fakulteTuruSayac.saglik.toLocaleString('tr-TR')} · Eczacılık/60: ${fakulteTuruSayac.eczacilik.toLocaleString('tr-TR')}</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🎯 T-Skoru — Giriş Yöntemi</div>
                <div class="stat-karti-deger" style="font-size:1.05em;color:var(--accent)">${(yontemSayac.tablo1.tek+yontemSayac.tablo1.detayli).toLocaleString('tr-TR')} kayıt</div>
                <div class="stat-karti-alt">Tek Not Girişi: ${yontemSayac.tablo1.tek.toLocaleString('tr-TR')} · Detaylı Giriş: ${yontemSayac.tablo1.detayli.toLocaleString('tr-TR')}</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🎯 Yüzdelik Dilim — Giriş Yöntemi</div>
                <div class="stat-karti-deger" style="font-size:1.05em;color:var(--accent)">${(yontemSayac.tablo2.tek+yontemSayac.tablo2.detayli).toLocaleString('tr-TR')} kayıt</div>
                <div class="stat-karti-alt">Tek Not Girişi: ${yontemSayac.tablo2.tek.toLocaleString('tr-TR')} · Detaylı Giriş: ${yontemSayac.tablo2.detayli.toLocaleString('tr-TR')}</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🎯 Mutlak Sistem — Giriş Yöntemi</div>
                <div class="stat-karti-deger" style="font-size:1.05em;color:var(--accent)">${(yontemSayac.mutlak.tek+yontemSayac.mutlak.detayli+yontemSayac.mutlak.mezuniyet).toLocaleString('tr-TR')} kayıt</div>
                <div class="stat-karti-alt">Tek Not Girişi: ${yontemSayac.mutlak.tek.toLocaleString('tr-TR')} · Detaylı Giriş: ${yontemSayac.mutlak.detayli.toLocaleString('tr-TR')} · Mezuniyet Sınavı: ${yontemSayac.mutlak.mezuniyet.toLocaleString('tr-TR')}</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🎓 Mezuniyet Sınavı</div>
                <div class="stat-karti-deger" style="color:var(--purple)">${mezuniyetSayisi.toLocaleString('tr-TR')}</div>
                <div class="stat-karti-alt">Ort. Sınav Notu: ${mezuniyetOrtSinavNotu} · ✅ Geçti: ${mezuniyetGecti.toLocaleString('tr-TR')} · ℹ️ DC (şartlı): ${mezuniyetDcSartli.toLocaleString('tr-TR')} · ❌ Kaldı: ${mezuniyetKaldi.toLocaleString('tr-TR')}</div>
                <div class="stat-karti-alt" style="margin-top:2px;color:var(--muted)">Genel sınav istatistiklerine (Ort. Final Notu vb.) dahil edilmez; Toplam Hesaplama sayısına dahildir</div></div>
        `;

        // ── GRAFİKLER ──
        const CHART_IDS = ['sekmeChart','harfChart','cihazChart','gunlukChart','saatChart','haftaChart','hedefChart','ortChart','vizeHedefChart','referrerChart'];
        CHART_IDS.forEach(id => { if(chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } });

        chartInstances['sekmeChart'] = new Chart(document.getElementById('sekmeChart'), {
            type: 'bar',
            data: { labels: ['Harf Notu','Gerekli Final','Senaryo','Dönem Ort.'],
                datasets: [{ label:'Hesaplama', data: [sekmeler.harf,sekmeler.gerekli,sekmeler.senaryo,sekmeler.ano],
                    backgroundColor: ['#006FEE','#17c964','#f5a524','#7828c8'], borderRadius: 5 }] },
            options: { plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: i => ` ${i.raw.toLocaleString('tr-TR')} hesaplama` } } },
                scales:{ x:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'}}, y:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true} } }
        });

        const harfEtiket = HARF_LISTESI.filter(h=>harfSayac[h]);
        chartInstances['harfChart'] = new Chart(document.getElementById('harfChart'), {
            type: 'doughnut',
            data: { labels: harfEtiket, datasets: [{ data: harfEtiket.map(h=>harfSayac[h]),
                backgroundColor: harfEtiket.map(h=>HARF_CLR[h]), borderWidth: 2, borderColor: '#ffffff' }] },
            options: { responsive:true, maintainAspectRatio:true,
                plugins:{ legend:{ position:'right', labels:{ color:'#18181b', font:{family:'Poppins'}, boxWidth:12 } },
                tooltip:{ callbacks:{ label: i => ` ${i.label}: ${i.raw.toLocaleString('tr-TR')} hesaplama` } } } }
        });

        chartInstances['cihazChart'] = new Chart(document.getElementById('cihazChart'), {
            type: 'doughnut',
            data: { labels: ['Mobil','Masaüstü','Bilinmiyor'],
                datasets: [{ data: [mobilSayisi,masaustuSayisi,mobilBilinmiyor],
                    backgroundColor: ['#006FEE','#17c964','#a1a1aa'], borderWidth:2, borderColor:'#ffffff' }] },
            options: { responsive:true, maintainAspectRatio:true,
                plugins:{ legend:{display:false},
                tooltip:{ callbacks:{ label: i => ` ${i.label}: ${i.raw.toLocaleString('tr-TR')}` } } } }
        });
        document.getElementById('cihaz-legend').innerHTML = [
            {label:'Mobil',sayi:mobilSayisi,renk:'#006FEE'},
            {label:'Masaüstü',sayi:masaustuSayisi,renk:'#17c964'},
            {label:'Bilinmiyor',sayi:mobilBilinmiyor,renk:'#a1a1aa'}
        ].map(c=>`<div class="cihaz-legend-item"><span class="cihaz-legend-renk" style="background:${c.renk}"></span><span>${c.label}: <strong>${c.sayi.toLocaleString('tr-TR')}</strong></span></div>`).join('');

        // Günlük trend — DD.MM formatı
        const gunlukBaslikMetin = aralikVal === '0'
            ? `Son 30 Gün — Günlük Hesaplama Sayısı`
            : `${aralikMetinKisa} — Günlük Hesaplama Sayısı`;
        document.getElementById('gunluk-baslik').textContent = gunlukBaslikMetin;
        const gunlukEtiketler = Object.keys(gunSayac).map(d => { const [,ay,gun]=d.split('-'); return `${gun}.${ay}`; });
        chartInstances['gunlukChart'] = new Chart(document.getElementById('gunlukChart'), {
            type: 'line',
            data: { labels: gunlukEtiketler,
                datasets: [{ label:'Hesaplama', data:Object.values(gunSayac), borderColor:'#006FEE', backgroundColor:'rgba(0,111,238,0.1)', fill:true, tension:0.4, pointRadius:3 }] },
            options: { plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: i => ` ${i.raw.toLocaleString('tr-TR')} hesaplama` } } },
                scales:{ x:{ticks:{color:'#71717a',maxTicksLimit:10},grid:{color:'#e4e4e7'}}, y:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true} } }
        });

        chartInstances['saatChart'] = new Chart(document.getElementById('saatChart'), {
            type: 'bar',
            data: { labels: Array.from({length:24},(_,i)=>`${i}:00`),
                datasets: [{ label:'Hesaplama', data:saatBantlar, backgroundColor:'rgba(88,166,255,0.7)', borderRadius:3 }] },
            options: { plugins:{ legend:{display:false},
                subtitle:{ display:true, text:`Türkiye saatiyle (UTC+3) — ${saatAralikMetin}`, color:'#71717a', font:{size:11}, padding:{bottom:8} },
                tooltip:{ callbacks:{ label: i => ` ${i.raw.toLocaleString('tr-TR')} hesaplama` } } },
                scales:{ x:{ticks:{color:'#71717a',maxTicksLimit:12},grid:{color:'#e4e4e7'}}, y:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true} } }
        });

        chartInstances['haftaChart'] = new Chart(document.getElementById('haftaChart'), {
            type: 'bar',
            data: { labels: gunAdlar,
                datasets: [{ label:'Hesaplama', data:haftaBantlar, backgroundColor:'rgba(63,185,80,0.7)', borderRadius:4 }] },
            options: { plugins:{ legend:{display:false},
                subtitle:{ display:true, text:`Türkiye saatiyle (UTC+3) — ${saatAralikMetin}`, color:'#71717a', font:{size:11}, padding:{bottom:8} },
                tooltip:{ callbacks:{ label: i => ` ${i.raw.toLocaleString('tr-TR')} hesaplama` } } },
                scales:{ x:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'}}, y:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true} } }
        });

        const hedefEtiket2 = Object.keys(hedefSayac).sort((a,b)=>(hedefSayac[b]||0)-(hedefSayac[a]||0));
        if(hedefEtiket2.length > 0) {
            chartInstances['hedefChart'] = new Chart(document.getElementById('hedefChart'), {
                type: 'bar',
                data: { labels:hedefEtiket2, datasets:[{ label:'Kişi', data:hedefEtiket2.map(h=>hedefSayac[h]),
                    backgroundColor:hedefEtiket2.map(h=>HARF_CLR[h]||'#71717a'), borderRadius:5 }] },
                options: { plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: i => ` ${i.raw.toLocaleString('tr-TR')} kişi bu notu hedefledi` } } },
                    scales:{ x:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'}}, y:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true} } }
            });
        }

        const ortBantValues = ortBantSira.map(k => ortBantlar[k]||0);
        if(ortBantValues.some(v=>v>0)) {
            chartInstances['ortChart'] = new Chart(document.getElementById('ortChart'), {
                type: 'bar',
                data: { labels:ortBantSira, datasets:[{ label:'Hesaplama', data:ortBantValues, backgroundColor:'#006FEE', borderRadius:5 }] },
                options: { plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: i => ` ${i.raw.toLocaleString('tr-TR')} hesaplama` } } },
                    scales:{ x:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'}}, y:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true} } }
            });
        }

        const HARF_SIRA = ['AA','BA','BB','CB','CC','DC','DD'];
        const vizeHedefNotlar = Object.keys(vizeHedefOrt).sort((a,b)=>HARF_SIRA.indexOf(a)-HARF_SIRA.indexOf(b));
        if(vizeHedefNotlar.length > 0) {
            chartInstances['vizeHedefChart'] = new Chart(document.getElementById('vizeHedefChart'), {
                type: 'bar',
                data: { labels:vizeHedefNotlar, datasets:[{ label:'Ort. Vize', data:vizeHedefNotlar.map(h=>parseFloat(vizeHedefOrt[h])),
                    backgroundColor:vizeHedefNotlar.map(h=>HARF_CLR[h]||'#71717a'), borderRadius:5 }] },
                options: { plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: i => ` Ort. vize: ${i.raw}` } } },
                    scales:{ x:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'}}, y:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true,max:100} } }
            });
        }

        if(topReferrerler.length > 0) {
            chartInstances['referrerChart'] = new Chart(document.getElementById('referrerChart'), {
                type: 'bar',
                data: { labels:topReferrerler.map(r=>r[0]), datasets:[{ label:'Ziyaret', data:topReferrerler.map(r=>r[1]),
                    backgroundColor:['#006FEE','#17c964','#f5a524','#7828c8','#f31260'], borderRadius:5 }] },
                options: { indexAxis:'y', plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: i => ` ${i.raw.toLocaleString('tr-TR')} ziyaret` } } },
                    scales:{ x:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true}, y:{ticks:{color:'#18181b'},grid:{color:'#e4e4e7'}} } }
            });
        }

        // ── Ziyaretçi günlük trendi ──
        try {
            const trendGunSayisi = aralikVal === 'ozel' ? 30 : (aralik > 0 ? Math.min(aralik, 365) : 30);
            const trendSinirTarih = new Date(); trendSinirTarih.setDate(trendSinirTarih.getDate() - trendGunSayisi);
            const trendSinirStr = aralikVal === 'ozel' && sinir ? sinir : trendSinirTarih.toISOString();
            const { data: zTrendData } = await sb.rpc('admin_sayfa_tarihleri', {
                p_admin_token: adminToken(), p_baslangic: trendSinirStr, p_bitis: sinirBitis
            });
            if (!gecerliMi()) return;
            // Not: eskiden bu destroy çağrısı yalnızca "veri varsa" dalının içindeydi — filtre
            // ziyaretçi kaydı olmayan bir aralığa değiştirilince önceki (artık geçersiz) grafik
            // silinmeden ekranda kalıyordu. Artık veri olsun olmasın önce eski grafik temizleniyor.
            if (chartInstances['ziyaretciTrendChart']) { chartInstances['ziyaretciTrendChart'].destroy(); chartInstances['ziyaretciTrendChart'] = null; }
            if (zTrendData && zTrendData.length > 0) {
                const zGunSayac = {};
                for(let i=trendGunSayisi-1;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); zGunSayac[d.toISOString().slice(0,10)]=0; }
                zTrendData.forEach(r => { const g=r.olusturulma_tarihi?.slice(0,10); if(g&&zGunSayac[g]!==undefined) zGunSayac[g]++; });
                const zEtiketler = Object.keys(zGunSayac).map(d => { const [,ay,gun]=d.split('-'); return `${gun}.${ay}`; });
                chartInstances['ziyaretciTrendChart'] = new Chart(document.getElementById('ziyaretciTrendChart'), {
                    type: 'line',
                    data: { labels: zEtiketler,
                        datasets: [{ label:'Ziyaretçi', data:Object.values(zGunSayac), borderColor:'#17c964', backgroundColor:'rgba(23,201,100,0.1)', fill:true, tension:0.4, pointRadius:3 }] },
                    options: { plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: i => ` ${i.raw.toLocaleString('tr-TR')} ziyaretçi` } } },
                        scales:{ x:{ticks:{color:'#71717a',maxTicksLimit:10},grid:{color:'#e4e4e7'}}, y:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true} } }
                });
            }
        } catch(e) {}

    } catch(e) {
        // Bu da diğer tüm DOM-mutasyon noktaları gibi gecerliMi() ile korunmalı — yoksa bayat
        // (stale) bir istekten gelen hata, daha yeni ve başarılı bir isteğin çizdiği ekranın
        // üzerine "⚠️ Hata" mesajı yazabilir.
        if (!gecerliMi()) return;
        console.error('İstatistik hatası:', e);
        document.getElementById('stat-kartlar').innerHTML = `<div style="color:var(--red);padding:12px;font-size:0.9em;">⚠️ Hata: ${escHtml(e.message)}</div>`;
    }
}

async function dersleriYukle() {
    await onayliDersleriYukle();
    const icerik = document.getElementById('ders-onay-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const { data } = await sb.from('dersler')
        .select('id, ders_adi, ders_kodu, bolumler(ad, fakulteler(ad))')
        .eq('onaylandi', false).order('id', { ascending: false });

    if (!data || data.length === 0) {
        icerik.innerHTML = '<div class="bos-mesaj">✅ Onay bekleyen ders yok.</div>';
        document.getElementById('onay-badge').style.display = 'none';
        return;
    }
    document.getElementById('onay-badge').textContent = data.length;
    document.getElementById('onay-badge').style.display = 'inline';

    // Not: ders_adi/ders_kodu ziyaretçilerin serbestçe yazdığı metin — escHtml olmadan
    // buraya yazılırsa bir XSS vektörü olur (bkz. sekmeDegistir/dersleriYukle inceleme notu).
    icerik.innerHTML = `<table><thead><tr><th>Ders Adı</th><th>Kod</th><th>Bölüm</th><th>Fakülte</th><th>İşlem</th></tr></thead><tbody>
        ${data.map(d => `<tr>
            <td>${escHtml(d.ders_adi)}</td><td>${escHtml(d.ders_kodu||'—')}</td>
            <td>${escHtml(d.bolumler?.ad||'—')}</td><td>${escHtml(d.bolumler?.fakulteler?.ad||'—')}</td>
            <td><div class="btn-grup">
                <button class="btn btn-yesil" data-nk-click="dersiOnayla" data-nk-click-arg0="${d.id}">✓ Onayla</button>
                <button class="btn btn-kirmizi" data-nk-click="dersiReddet" data-nk-click-arg0="${d.id}">✕ Reddet</button>
            </div></td>
        </tr>`).join('')}
    </tbody></table>`;
}

let tumOnayliDersler = [];
async function onayliDersleriYukle() {
    const icerik = document.getElementById('ders-onayli-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const { data } = await sb.from('dersler')
        .select('id, ders_adi, ders_kodu, bolum_id, bolumler(id, ad, fakulte_id, fakulteler(id, ad))')
        .eq('onaylandi', true).order('ders_adi');
    tumOnayliDersler = data || [];
    onayliDersleriFiltrele();
}

async function dersFiltreFakulteDoldur() {
    fakulteSelectiDoldurBasit('filtre-fakulte-ders', await tumFakulteleriGetir());
}

async function dersFiltreFakulteDegisti() {
    const fakulteId = document.getElementById('filtre-fakulte-ders').value;
    bolumSelectiDoldur('filtre-bolum-ders', fakulteId, await tumBolumleriGetir());
    onayliDersleriFiltrele();
}

function onayliDersleriFiltrele() {
    const arama = (document.getElementById('ders-arama').value || '').toLowerCase();
    const fakulteId = document.getElementById('filtre-fakulte-ders')?.value || '';
    const bolumId = document.getElementById('filtre-bolum-ders')?.value || '';
    let filtrelenmis = arama
        ? tumOnayliDersler.filter(d => d.ders_adi.toLowerCase().includes(arama) || (d.ders_kodu||'').toLowerCase().includes(arama))
        : tumOnayliDersler;
    if (bolumId) filtrelenmis = filtrelenmis.filter(d => String(d.bolum_id) === String(bolumId));
    else if (fakulteId) filtrelenmis = filtrelenmis.filter(d => String(d.bolumler?.fakulte_id) === String(fakulteId));
    const icerik = document.getElementById('ders-onayli-icerik');
    if (!filtrelenmis.length) { icerik.innerHTML = '<div class="bos-mesaj">Ders bulunamadı.</div>'; return; }
    icerik.innerHTML = `<table><thead><tr><th>Ders Adı</th><th>Kod</th><th>Bölüm</th><th>Fakülte</th><th>İşlem</th></tr></thead><tbody>
        ${filtrelenmis.map(d => `<tr>
            <td>${escHtml(d.ders_adi)}</td><td>${escHtml(d.ders_kodu||'—')}</td>
            <td>${escHtml(d.bolumler?.ad||'—')}</td><td>${escHtml(d.bolumler?.fakulteler?.ad||'—')}</td>
            <td><div class="btn-grup">
                <button class="btn btn-mor" data-nk-click="dersDuzenleModal" data-nk-click-arg0="${d.id}">✏️</button>
                <button class="btn btn-kirmizi" data-nk-click="onayliDersiSil" data-nk-click-arg0="${d.id}">✕</button>
            </div></td>
        </tr>`).join('')}
    </tbody></table>`;
}

async function dersiOnayla(id) {
    const { data: sonuc, error } = await sb.rpc('admin_ders_onayla', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Ders onaylandı ✓', 'basari'); dersleriYukle();
}
async function dersiReddet(id) {
    if (!confirm('Bu dersi silmek istediğine emin misin?')) return;
    const { data: sonuc, error } = await sb.rpc('admin_ders_reddet', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Ders silindi.', 'hata'); dersleriYukle();
}
async function onayliDersiSil(id) {
    if (!confirm('Bu dersi ve tüm verilerini silmek istediğine emin misin?')) return;
    const { data: sonuc, error } = await sb.rpc('admin_ders_sil', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Ders silindi.', 'hata'); onayliDersleriYukle();
}
// Not: id'yi ve düzenlenecek metinleri onclick attribute'una gömmek yerine (eskiden
// dersDuzenleModal(id, adi, kodu) şeklindeydi) sadece id geçiyoruz ve veriyi zaten bellekte
// duran tumOnayliDersler'den buluyoruz — hem HTML-escape hem JS-string-escape hatalarından
// (ör. ders adında tek tırnak veya ters slash olması) tamamen kaçınmış oluyoruz.
function dersDuzenleModal(id) {
    const d = tumOnayliDersler.find(x => String(x.id) === String(id));
    if (!d) return;
    document.getElementById('modal-ders-id').value = d.id;
    document.getElementById('modal-ders-adi').value = d.ders_adi;
    document.getElementById('modal-ders-kodu').value = d.ders_kodu || '';
    document.getElementById('ders-modal').classList.add('aktif');
}
function modalKapat() { document.getElementById('ders-modal').classList.remove('aktif'); }
async function dersiKaydet() {
    const id = document.getElementById('modal-ders-id').value;
    const adi = document.getElementById('modal-ders-adi').value.trim();
    const kodu = document.getElementById('modal-ders-kodu').value.trim();
    if (!adi) { bildirimGoster('Ders adı boş olamaz.', 'hata'); return; }
    const { data: sonuc, error } = await sb.rpc('admin_ders_duzenle', { p_admin_token: adminToken(), p_id: id, p_adi: adi, p_kodu: kodu || null });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Ders güncellendi ✓', 'basari'); modalKapat(); onayliDersleriYukle();
}

// ── NOT KUTUSU ONAYLARI ──
// sorular tablosunun RLS'i normal ziyaretçilerin/anon key'in SADECE onaylanmış soruları
// görmesine izin veriyor (bkz. supabase-not-kutusu-kurulum.sql) — bu yüzden ders onayının
// aksine burada anon sb.from('sorular') ile doğrudan sorgu YAPILAMIYOR, hepsi admin_soru_*
// RPC'leri (SECURITY DEFINER, admin_token doğrulamalı) üzerinden gidiyor.
// admin_soru_listele bir "okuma" RPC'si olduğu için (admin_ano_gruplari_getir gibi) geçersiz
// token'da json {basarili:false} değil, 'yetkisiz' mesajlı bir SQL exception fırlatıyor —
// o yüzden mutasyonlarda adminYetkisizIseGirisEkraninaDon(sonuc), listelemede ise
// oturumSuresiDolduMuKontrolEt(error.message) kullanılıyor.

function soruDurumRozeti(durum) {
    if (durum === 'onaylandi') return '<span class="rozet rozet-yesil">Onaylandı</span>';
    if (durum === 'reddedildi') return '<span class="rozet rozet-kirmizi">Reddedildi</span>';
    return '<span class="rozet rozet-turuncu">Beklemede</span>';
}

const SINAV_TURU_ETIKET = { vize: 'Vize', final: 'Final', butunleme: 'Bütünleme', ders_notu: 'Ders Notu', diger: 'Diğer' };

async function guvenlikOlaylariniYukle() {
    const alan = document.getElementById('nk-guvenlik-olaylari');
    if (!alan) return;
    alan.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const { data, error } = await sb.rpc('admin_nk_guvenlik_olaylari', { p_admin_token: adminToken(), p_durum: null, p_limit: 50, p_offset: 0 });
    if (error) {
        if (oturumSuresiDolduMuKontrolEt(error.message)) return;
        alan.innerHTML = `<div class="bos-mesaj">${['42883','PGRST202'].includes(error.code) ? 'Güvenlik incelemesi için 011 migrationını çalıştırın.' : 'Güvenlik olayları alınamadı.'}</div>`;
        return;
    }
    const satirlar = data?.satirlar || [];
    if (!satirlar.length) { alan.innerHTML = '<div class="bos-mesaj">Zararlı veya şüpheli dosya tespiti yok.</div>'; return; }
    alan.innerHTML = `<table><thead><tr><th>Kullanıcı</th><th>Tarama</th><th>Durum</th><th>İtiraz</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>${satirlar.map(o => {
        const acik = ['acik','itirazda'].includes(o.durum);
        return `<tr><td>${escHtml(o.email || o.kullanici_id)}<br><small>${Number(o.tespit_sayisi || 0)} tespit · hesap: ${escHtml(o.hesap_durumu || '—')}</small></td><td>${escHtml(o.tarama_sonucu)}<br><small>${escHtml(o.tarayici)}${o.imza ? ' · '+escHtml(o.imza) : ''}</small></td><td>${escHtml(o.durum)}</td><td>${escHtml(o.kullanici_aciklamasi || '—')}</td><td>${new Date(o.olusturulma_tarihi).toLocaleString('tr-TR')}</td><td>${acik ? `<div class="aksiyonlar"><button class="btn btn-yesil" data-nk-click="guvenlikOlayiKarar" data-nk-click-arg0="${o.id}" data-nk-click-arg1="yanlis_pozitif">Yanlış pozitif</button><button class="btn btn-kirmizi" data-nk-click="guvenlikOlayiKarar" data-nk-click-arg0="${o.id}" data-nk-click-arg1="onaylandi">Tespiti doğrula</button></div>` : escHtml(o.yonetici_notu || 'Sonuçlandı')}</td></tr>`;
    }).join('')}</tbody></table>`;
}

async function guvenlikOlayiKarar(id, karar) {
    const soru = karar === 'yanlis_pozitif' ? 'Yanlış pozitif kararının gerekçesi:' : 'Tespiti doğrulama ve hesap dondurma gerekçesi:';
    const not = prompt(soru);
    if (!not || not.trim().length < 5) return;
    const { data, error } = await sb.rpc('admin_nk_guvenlik_sonuclandir', { p_admin_token: adminToken(), p_id: id, p_karar: karar, p_not: not.trim() });
    if (error || !data?.basarili) { bildirimGoster('Güvenlik olayı sonuçlandırılamadı.', 'hata'); return; }
    bildirimGoster(karar === 'yanlis_pozitif' ? 'Hesabın paylaşım erişimi yeniden değerlendirildi.' : 'Tespit doğrulandı; hesap donduruldu.', karar === 'yanlis_pozitif' ? 'basari' : 'hata');
    guvenlikOlaylariniYukle();
}
const MODERASYON_NEDEN_ETIKET = { uygun:'Uygun',okunmuyor:'Okunmuyor',yanlis_ders:'Yanlış ders',yanlis_bilgi:'Yanlış bilgi',tekrar:'Tekrar içerik',telif:'Telif hakkı',kisisel_veri:'Kişisel veri',spam:'Spam',diger:'Diğer' };
const ADMIN_SAYFA_BOYUTU = 25;
let soruBekleyenSayfa = 0, soruTumSayfa = 0, soruAramaZamanlayici;
const adminSoruKayitlari = new Map();

function adminSayfalamaHtml(islem, sayfa, toplam, boyut = ADMIN_SAYFA_BOYUTU) {
    const toplamSayfa = Math.max(1, Math.ceil(Number(toplam || 0) / boyut));
    if (toplamSayfa <= 1) return '';
    return `<nav class="admin-sayfalama"><button class="btn btn-gri" data-nk-click="${islem}" data-nk-click-arg0="#${sayfa - 1}" ${sayfa <= 0 ? 'disabled' : ''}>← Önceki</button><span>${sayfa + 1} / ${toplamSayfa}</span><button class="btn btn-gri" data-nk-click="${islem}" data-nk-click-arg0="#${sayfa + 1}" ${sayfa + 1 >= toplamSayfa ? 'disabled' : ''}>Sonraki →</button></nav>`;
}

// Ekler (fotoğraf/PDF) artık Supabase Storage'da değil, Cloudflare R2'de
// tutuluyor (bkz. cloudflare-worker/worker.js). Worker'ı deploy ettikten
// sonra wrangler'ın verdiği gerçek adresi BURAYA yapıştır.
const NK_SORU_ELEMENT_WORKER_URL = 'https://not-kutusu.elements0.workers.dev';
function nkSoruElementUrlAl(yol) { return NKDosya.dosyaUrl(yol, NK_SORU_ELEMENT_WORKER_URL); }
function nkSoruElementPdfMi(yol) { return /\.pdf$/i.test(String(yol || '')); }

function soruSatiriOlustur(s, mod) {
    adminSoruKayitlari.set(String(s.id), s);
    const dersEtiket = s.ders_kodu ? `${escHtml(s.ders_kodu)} — ${escHtml(s.ders_adi)}` : escHtml(s.ders_adi || '—');
    const sinavEtiket = SINAV_TURU_ETIKET[s.sinav_turu] || escHtml(s.sinav_turu || '—');
    const yilEtiket = s.akademik_yil ? `${s.akademik_yil}-${s.akademik_yil + 1}` : '—';
    const tarih = s.olusturulma_tarihi ? new Date(s.olusturulma_tarihi).toLocaleDateString('tr-TR') : '—';
    const elementler = NKDosya.guvenliYollar(s.element_yollari);
    const fotoEtiket = elementler.length
        ? elementler.map((yol, i) => NKDosya.baglantiOlustur(yol, NK_SORU_ELEMENT_WORKER_URL, `${nkSoruElementPdfMi(yol) ? '📄' : '📷'} ${i + 1}`).outerHTML).join(' ')
        : '<span style="color:var(--muted)">—</span>';
    const gecmis = `<button class="btn btn-gri" data-nk-click="moderasyonGecmisiGoster" data-nk-click-arg0="soru" data-nk-click-arg1="${s.id}">Geçmiş</button>`;
    const islemler = mod === 'bekleyen'
        ? `<div class="btn-grup">
            <button class="btn btn-yesil" data-nk-click="soruyuOnayla" data-nk-click-arg0="${s.id}">✓ Onayla</button>
            <button class="btn btn-kirmizi" data-nk-click="soruyuReddet" data-nk-click-arg0="${s.id}">✕ Reddet</button>
            ${gecmis}
        </div>`
        : `<div class="btn-grup"><button class="btn btn-mavi" data-nk-click="adminSoruDuzenleAc" data-nk-click-arg0="${s.id}">✏️ Düzenle</button>${gecmis}<button class="btn btn-kirmizi" data-nk-click="soruyuSil" data-nk-click-arg0="${s.id}">✕ Sil</button></div>`;
    const neden = s.moderasyon_nedeni ? `<small class="moderasyon-nedeni">${escHtml(MODERASYON_NEDEN_ETIKET[s.moderasyon_nedeni] || s.moderasyon_nedeni)}${s.moderasyon_notu ? ': ' + escHtml(s.moderasyon_notu) : ''}</small>` : '';
    return `<tr>
        <td>${dersEtiket}</td>
        <td style="font-size:0.8em;color:var(--muted)">${escHtml(s.bolum_adi || '—')} / ${escHtml(s.fakulte_adi || '—')}</td>
        <td>${sinavEtiket}</td>
        <td>${yilEtiket}<br><small>${s.goruntuleme_sirasi == null ? 'Otomatik sıra' : `Sıra: ${s.goruntuleme_sirasi}`}</small></td>
        <td style="font-size:0.8em;color:var(--muted)">${escHtml(s.kullanici_email || '—')}</td>
        <td style="font-size:0.8em;color:var(--muted)">${tarih}</td>
        <td style="font-size:0.85em;white-space:nowrap;">${fotoEtiket}</td>
        ${mod === 'tum' ? `<td>${soruDurumRozeti(s.durum)}${neden}</td>` : ''}
        <td>${islemler}</td>
    </tr>`;
}

async function sorulariYukle() {
    const icerik = document.getElementById('soru-onay-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const { data, error } = await sb.rpc('admin_soru_ara', { p_admin_token: adminToken(), p_durum: 'beklemede', p_arama: null, p_limit: ADMIN_SAYFA_BOYUTU, p_offset: soruBekleyenSayfa * ADMIN_SAYFA_BOYUTU });
    const badge = document.getElementById('soru-onay-badge');
    if (error) {
        if (oturumSuresiDolduMuKontrolEt(error.message)) return;
        icerik.innerHTML = `<div style="color:var(--red);padding:12px;font-size:0.9em;">⚠️ Hata: ${escHtml(error.message)}</div>`;
        return;
    }
    const satirlar = data?.satirlar || [], toplam = Number(data?.toplam || 0);
    if (!satirlar.length) {
        icerik.innerHTML = '<div class="bos-mesaj">✅ Onay bekleyen soru yok.</div>';
        badge.style.display = 'none';
        return;
    }
    badge.textContent = toplam;
    badge.style.display = 'inline';
    icerik.innerHTML = `<table><thead><tr><th>Ders</th><th>Bölüm / Fakülte</th><th>Sınav</th><th>Akademik Yıl</th><th>Öğrenci</th><th>Tarih</th><th>Ekler</th><th>İşlem</th></tr></thead><tbody>
        ${satirlar.map(s => soruSatiriOlustur(s, 'bekleyen')).join('')}
    </tbody></table>${adminSayfalamaHtml('soruBekleyenSayfaDegistir', soruBekleyenSayfa, toplam)}`;
}

async function tumSorulariYukle() {
    const icerik = document.getElementById('soru-tum-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const durum = document.getElementById('soru-durum-filtre').value || null;
    const arama = document.getElementById('soru-arama')?.value.trim() || null;
    const { data, error } = await sb.rpc('admin_soru_ara', { p_admin_token: adminToken(), p_durum: durum, p_arama: arama, p_limit: ADMIN_SAYFA_BOYUTU, p_offset: soruTumSayfa * ADMIN_SAYFA_BOYUTU });
    if (error) {
        if (oturumSuresiDolduMuKontrolEt(error.message)) return;
        icerik.innerHTML = `<div style="color:var(--red);padding:12px;font-size:0.9em;">⚠️ Hata: ${escHtml(error.message)}</div>`;
        return;
    }
    const satirlar = data?.satirlar || [], toplam = Number(data?.toplam || 0);
    if (!satirlar.length) { icerik.innerHTML = '<div class="bos-mesaj">Soru bulunamadı.</div>'; return; }
    icerik.innerHTML = `<table><thead><tr><th>Ders</th><th>Bölüm / Fakülte</th><th>Sınav</th><th>Akademik Yıl</th><th>Öğrenci</th><th>Tarih</th><th>Ekler</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>
        ${satirlar.map(s => soruSatiriOlustur(s, 'tum')).join('')}
    </tbody></table>${adminSayfalamaHtml('soruTumSayfaDegistir', soruTumSayfa, toplam)}`;
}

function soruBekleyenSayfaDegistir(sayfa) { soruBekleyenSayfa = Math.max(0, Number(sayfa) || 0); sorulariYukle(); }
function soruTumSayfaDegistir(sayfa) { soruTumSayfa = Math.max(0, Number(sayfa) || 0); tumSorulariYukle(); }
function adminSoruAramaPlanla() { soruTumSayfa = 0; clearTimeout(soruAramaZamanlayici); soruAramaZamanlayici = setTimeout(tumSorulariYukle, 300); }
function adminSoruFiltresiDegisti() { soruTumSayfa = 0; tumSorulariYukle(); }

function adminSoruDuzenleAc(id) {
    const soru = adminSoruKayitlari.get(String(id));
    if (!soru) return;
    document.getElementById('soru-duzenle-id').value = soru.id;
    document.getElementById('soru-duzenle-tur').value = soru.sinav_turu;
    document.getElementById('soru-duzenle-yil').value = soru.akademik_yil;
    document.getElementById('soru-duzenle-sira').value = soru.goruntuleme_sirasi ?? '';
    document.getElementById('soru-duzenle-modal').classList.add('aktif');
}
function adminSoruDuzenleKapat() { document.getElementById('soru-duzenle-modal').classList.remove('aktif'); }
async function adminSoruDuzenleKaydet() {
    const id = document.getElementById('soru-duzenle-id').value;
    const tur = document.getElementById('soru-duzenle-tur').value;
    const yil = Number(document.getElementById('soru-duzenle-yil').value);
    const siraDegeri = document.getElementById('soru-duzenle-sira').value.trim();
    const sira = siraDegeri === '' ? null : Number(siraDegeri);
    if (!Number.isInteger(yil) || yil < 2000 || !Number.isInteger(sira ?? 0)) { bildirimGoster('Yıl ve sıra değerlerini kontrol et.', 'hata'); return; }
    const { data, error } = await sb.rpc('admin_soru_duzenle', {
        p_admin_token: adminToken(), p_id: id, p_sinav_turu: tur,
        p_akademik_yil: yil, p_goruntuleme_sirasi: sira
    });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(data)) return;
    if (!data?.basarili) { bildirimGoster(data?.hata || 'Paylaşım güncellenemedi.', 'hata'); return; }
    adminSoruDuzenleKapat(); bildirimGoster('Paylaşım bilgileri güncellendi.', 'basari');
    sorulariYukle(); tumSorulariYukle();
}

async function soruyuOnayla(id) {
    const { data: sonuc, error } = await sb.rpc('admin_soru_modere_et', { p_admin_token: adminToken(), p_id: id, p_karar: 'onaylandi', p_neden: 'uygun', p_not: null });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Soru onaylandı ✓', 'basari'); sorulariYukle(); tumSorulariYukle(); bildirimleriYukle();
}
async function soruyuReddet(id) {
    document.getElementById('moderasyon-soru-id').value = id;
    document.getElementById('moderasyon-neden').value = 'okunmuyor';
    document.getElementById('moderasyon-not').value = '';
    document.getElementById('moderasyon-modal').classList.add('aktif');
}
function moderasyonModalKapat() { document.getElementById('moderasyon-modal').classList.remove('aktif'); }
async function soruModerasyonKaydet() {
    const id = document.getElementById('moderasyon-soru-id').value;
    const neden = document.getElementById('moderasyon-neden').value;
    const not = document.getElementById('moderasyon-not').value.trim();
    const { data: sonuc, error } = await sb.rpc('admin_soru_modere_et', { p_admin_token: adminToken(), p_id: id, p_karar: 'reddedildi', p_neden: neden, p_not: not || null });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    if (!sonuc?.basarili) { bildirimGoster(sonuc?.hata || 'Karar kaydedilemedi.', 'hata'); return; }
    moderasyonModalKapat(); bildirimGoster('Soru gerekçesiyle reddedildi.', 'hata'); sorulariYukle(); tumSorulariYukle(); bildirimleriYukle();
}
async function soruyuSil(id) {
    if (!confirm('Bu soruyu kalıcı olarak silmek istediğine emin misin?')) return;
    const { data: sonuc, error } = await sb.rpc('admin_soru_sil', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Soru silindi.', 'hata'); sorulariYukle(); tumSorulariYukle();
}

async function soruOnayBekleyenSayisiGoster() {
    try {
        const { data, error } = await sb.rpc('admin_soru_ara', { p_admin_token: adminToken(), p_durum: 'beklemede', p_arama: null, p_limit: 1, p_offset: 0 });
        if (error) return;
        const badge = document.getElementById('soru-onay-badge');
        if (Number(data?.toplam || 0) > 0) { badge.textContent = data.toplam; badge.style.display = 'inline'; }
        else { badge.style.display = 'none'; }
    } catch (e) {}
}

// ── NOT KUTUSU DERSLERİ (kullanıcıların "Dersim listede yok" ile eklediği nk_dersler) ──
let tumNkDersler = [];
let nkAdminDersSayfa = 0, nkAdminDersAramaZamanlayici;
function nkAdminDersSatiriOlustur(d) {
    const dersEtiket = d.ders_kodu ? `${escHtml(d.ders_kodu)} — ${escHtml(d.ders_adi)}` : escHtml(d.ders_adi || '—');
    const tarih = d.olusturulma_tarihi ? new Date(d.olusturulma_tarihi).toLocaleDateString('tr-TR') : '—';
    return `<tr>
        <td>${dersEtiket}</td>
        <td style="font-size:0.8em;color:var(--muted)">${escHtml(d.bolum_adi || '—')} / ${escHtml(d.fakulte_adi || '—')}</td>
        <td style="font-size:0.8em;color:var(--muted)">${escHtml(d.ekleyen_email || '—')}</td>
        <td>${d.soru_sayisi || 0}</td>
        <td style="font-size:0.8em;color:var(--muted)">${tarih}</td>
        <td>
            <div class="btn-grup">
                <button class="btn btn-gri" data-nk-click="nkAdminDersDuzenleAc" data-nk-click-arg0="${d.id}">✏️ Düzenle</button>
                <button class="btn btn-gri" data-nk-click="nkAdminDersBirlestirAc" data-nk-click-arg0="${d.id}">Birleştir</button>
                <button class="btn btn-gri" data-nk-click="moderasyonGecmisiGoster" data-nk-click-arg0="ders" data-nk-click-arg1="${d.id}">Geçmiş</button>
                <button class="btn btn-kirmizi" data-nk-click="nkAdminDersiSil" data-nk-click-arg0="${d.id}">✕ Sil</button>
            </div>
        </td>
    </tr>`;
}

async function nkAdminDersleriYukle() {
    const icerik = document.getElementById('nk-ders-icerik');
    if (!icerik) return;
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const arama = document.getElementById('nk-ders-admin-arama')?.value.trim() || null;
    const { data, error } = await sb.rpc('admin_nk_ders_ara', {
        p_admin_token: adminToken(), p_arama: arama, p_limit: ADMIN_SAYFA_BOYUTU,
        p_offset: nkAdminDersSayfa * ADMIN_SAYFA_BOYUTU, p_bolum_id: null
    });
    if (error) {
        if (oturumSuresiDolduMuKontrolEt(error.message)) return;
        icerik.innerHTML = `<div style="color:var(--red);padding:12px;font-size:0.9em;">⚠️ Hata: ${escHtml(error.message)}</div>`;
        return;
    }
    tumNkDersler = data?.satirlar || [];
    const toplam = Number(data?.toplam || 0);
    if (!tumNkDersler.length) { icerik.innerHTML = '<div class="bos-mesaj">Kullanıcı tarafından eklenmiş ders yok.</div>'; return; }
    icerik.innerHTML = `<table><thead><tr><th>Ders</th><th>Bölüm / Fakülte</th><th>Ekleyen</th><th>Soru Sayısı</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>
        ${tumNkDersler.map(d => nkAdminDersSatiriOlustur(d)).join('')}
    </tbody></table>${adminSayfalamaHtml('nkAdminDersSayfaDegistir', nkAdminDersSayfa, toplam)}`;
}

function nkAdminDersSayfaDegistir(sayfa) { nkAdminDersSayfa = Math.max(0, Number(sayfa) || 0); nkAdminDersleriYukle(); }
function nkAdminDersAramaPlanla() { nkAdminDersSayfa = 0; clearTimeout(nkAdminDersAramaZamanlayici); nkAdminDersAramaZamanlayici = setTimeout(nkAdminDersleriYukle, 300); }

function nkAdminDersDuzenleAc(id) {
    const d = tumNkDersler.find(x => String(x.id) === String(id));
    if (!d) return;
    document.getElementById('nk-modal-ders-id').value = d.id;
    document.getElementById('nk-modal-ders-adi').value = d.ders_adi;
    document.getElementById('nk-modal-ders-kodu').value = d.ders_kodu || '';
    document.getElementById('nk-ders-modal').classList.add('aktif');
}
function nkAdminDersModalKapat() { document.getElementById('nk-ders-modal').classList.remove('aktif'); }

async function nkAdminDersiKaydet() {
    const id = document.getElementById('nk-modal-ders-id').value;
    const adi = document.getElementById('nk-modal-ders-adi').value.trim();
    const kodHam = document.getElementById('nk-modal-ders-kodu').value.trim();
    const kodu = kodHam ? NKDersKodu.standartlastir(kodHam) : null;
    if (!adi) { bildirimGoster('Ders adı boş olamaz.', 'hata'); return; }
    if (kodHam && !kodu) { bildirimGoster('Ders kodu BLM301 gibi harf ve rakamlardan oluşmalı.', 'hata'); return; }
    const { data: sonuc, error } = await sb.rpc('admin_nk_ders_duzenle', { p_admin_token: adminToken(), p_id: id, p_ders_adi: adi, p_ders_kodu: kodu });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Ders güncellendi ✓', 'basari'); nkAdminDersModalKapat(); nkAdminDersleriYukle();
}

async function nkAdminDersiSil(id) {
    const ders = tumNkDersler.find(d => String(d.id) === String(id));
    if (Number(ders?.soru_sayisi) > 0) { bildirimGoster('Bu derste soru var. Önce soruları başka derse taşıyın veya ayrı ayrı silin.', 'hata'); return; }
    if (!confirm('Bu dersi silmek istediğine emin misin? İçinde soru bulunan dersler silinemez.')) return;
    const { data: sonuc, error } = await sb.rpc('admin_nk_ders_sil', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    if (!sonuc?.basarili) { bildirimGoster(sonuc?.hata || 'Ders silinemedi.', 'hata'); return; }
    bildirimGoster('Ders silindi.', 'hata'); nkAdminDersleriYukle();
}

async function nkAdminDersBirlestirAc(id) {
    const kaynak = tumNkDersler.find(d => String(d.id) === String(id));
    if (!kaynak) return;
    const { data, error } = await sb.rpc('admin_nk_ders_ara', { p_admin_token: adminToken(), p_arama: null, p_limit: 100, p_offset: 0, p_bolum_id: kaynak.bolum_id });
    if (error) { bildirimGoster('Hedef dersler yüklenemedi: ' + error.message, 'hata'); return; }
    const hedefler = (data?.satirlar || []).filter(d => String(d.id) !== String(id));
    if (!hedefler.length) { bildirimGoster('Aynı bölümde birleştirilebilecek başka ders yok.', 'hata'); return; }
    document.getElementById('nk-birlestir-kaynak-id').value = id;
    document.getElementById('nk-birlestir-kaynak').textContent = kaynak.ders_kodu ? `${kaynak.ders_kodu} — ${kaynak.ders_adi}` : kaynak.ders_adi;
    document.getElementById('nk-birlestir-hedef').innerHTML = hedefler.map(d => `<option value="${d.id}">${escHtml(d.ders_kodu ? `${d.ders_kodu} — ${d.ders_adi}` : d.ders_adi)} (${d.soru_sayisi || 0} soru)</option>`).join('');
    document.getElementById('nk-birlestir-neden').value = 'tekrar';
    document.getElementById('nk-birlestir-not').value = '';
    document.getElementById('nk-ders-birlestir-modal').classList.add('aktif');
}
function nkAdminDersBirlestirKapat() { document.getElementById('nk-ders-birlestir-modal').classList.remove('aktif'); }
async function nkAdminDersBirlestirKaydet() {
    const kaynakId = Number(document.getElementById('nk-birlestir-kaynak-id').value);
    const hedefId = Number(document.getElementById('nk-birlestir-hedef').value);
    const neden = document.getElementById('nk-birlestir-neden').value;
    const not = document.getElementById('nk-birlestir-not').value.trim() || null;
    const { data: sonuc, error } = await sb.rpc('admin_nk_ders_birlestir', { p_admin_token: adminToken(), p_kaynak_id: kaynakId, p_hedef_id: hedefId, p_neden: neden, p_not: not });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    if (!sonuc?.basarili) { bildirimGoster(sonuc?.hata || 'Dersler birleştirilemedi.', 'hata'); return; }
    nkAdminDersBirlestirKapat();
    bildirimGoster(`${sonuc.tasinan_soru || 0} soru hedef derse taşındı.`, 'basari');
    nkAdminDersleriYukle(); tumSorulariYukle();
}

async function moderasyonGecmisiGoster(hedefTuru, hedefId) {
    const icerik = document.getElementById('moderasyon-gecmis-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    document.getElementById('moderasyon-gecmis-modal').classList.add('aktif');
    const { data, error } = await sb.rpc('admin_nk_moderasyon_gecmisi', { p_admin_token: adminToken(), p_hedef_turu: hedefTuru, p_hedef_id: String(hedefId) });
    if (error) { icerik.innerHTML = `<div class="bos-mesaj">${escHtml(error.message)}</div>`; return; }
    if (!data?.length) { icerik.innerHTML = '<div class="bos-mesaj">Bu kayıt için işlem geçmişi yok.</div>'; return; }
    icerik.innerHTML = `<div class="moderasyon-gecmisi">${data.map(g => `<article><strong>${escHtml(g.islem)}</strong><time>${new Date(g.olusturulma_tarihi).toLocaleString('tr-TR')}</time><div>${escHtml(MODERASYON_NEDEN_ETIKET[g.neden] || g.neden)}</div>${g.aciklama ? `<p>${escHtml(g.aciklama)}</p>` : ''}${g.iliskili_hedef_id ? `<small>İlişkili kayıt: ${escHtml(g.iliskili_hedef_id)}</small>` : ''}</article>`).join('')}</div>`;
}
function moderasyonGecmisiKapat() { document.getElementById('moderasyon-gecmis-modal').classList.remove('aktif'); }

let bildirimSayfa = 0;
async function bildirimleriYukle() {
    const icerik = document.getElementById('nk-bildirim-icerik');
    if (!icerik) return;
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const durum = document.getElementById('nk-bildirim-durum')?.value || null;
    const { data, error } = await sb.rpc('admin_nk_bildirim_listele', { p_admin_token: adminToken(), p_durum: durum, p_limit: ADMIN_SAYFA_BOYUTU, p_offset: bildirimSayfa * ADMIN_SAYFA_BOYUTU });
    if (error) { icerik.innerHTML = `<div class="bos-mesaj">${escHtml(error.message)}</div>`; return; }
    const satirlar = data?.satirlar || [], toplam = Number(data?.toplam || 0);
    if (!satirlar.length) { icerik.innerHTML = '<div class="bos-mesaj">Bu durumda içerik bildirimi yok.</div>'; return; }
    icerik.innerHTML = `<table><thead><tr><th>Ders</th><th>Neden</th><th>Açıklama</th><th>Bildiren</th><th>Soru</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>${satirlar.map(r => `<tr><td>${escHtml(r.ders_kodu ? `${r.ders_kodu} — ${r.ders_adi}` : r.ders_adi)}</td><td>${escHtml(MODERASYON_NEDEN_ETIKET[r.neden] || r.neden)}</td><td>${escHtml(r.aciklama || '—')}</td><td>${escHtml(r.bildiren_email || '—')}</td><td>${soruDurumRozeti(r.soru_durumu)}</td><td>${new Date(r.olusturulma_tarihi).toLocaleDateString('tr-TR')}</td><td><div class="btn-grup"><button class="btn btn-gri" data-nk-click="moderasyonGecmisiGoster" data-nk-click-arg0="soru" data-nk-click-arg1="${r.soru_id}">Soru geçmişi</button>${r.durum === 'acik' ? `<button class="btn btn-yesil" data-nk-click="bildirimKapat" data-nk-click-arg0="${r.id}">İncelendi</button>` : ''}</div></td></tr>`).join('')}</tbody></table>${adminSayfalamaHtml('bildirimSayfaDegistir', bildirimSayfa, toplam)}`;
}
function bildirimSayfaDegistir(sayfa) { bildirimSayfa = Math.max(0, Number(sayfa) || 0); bildirimleriYukle(); }
function bildirimFiltresiDegisti() { bildirimSayfa = 0; bildirimleriYukle(); }
async function bildirimKapat(id) {
    const { data: sonuc, error } = await sb.rpc('admin_nk_bildirim_kapat', { p_admin_token: adminToken(), p_id: id, p_not: 'Yönetici tarafından incelendi.' });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    if (!sonuc?.basarili) { bildirimGoster(sonuc?.hata || 'Bildirim kapatılamadı.', 'hata'); return; }
    bildirimGoster('Bildirim incelendi olarak kapatıldı.', 'basari'); bildirimleriYukle();
}

// ── KULLANICI DÜZELTME TALEPLERİ ──
let adminDuzeltmeSayfa=0;
function adminDuzeltmeDegerMetni(t,deger){
    const o=deger||{};
    if(t.hedef_turu==='soru')return `${SINAV_TURU_ETIKET[o.sinav_turu]||o.sinav_turu||'—'} · ${o.akademik_yil?`${o.akademik_yil}-${Number(o.akademik_yil)+1}`:'—'}`;
    if(t.hedef_turu==='ders_verisi')return [o.ortalama!==undefined?`HBN: ${o.ortalama}`:'',o.std_sapma!==undefined?`Std: ${o.std_sapma}`:'',o.ogrenci_sayisi!==undefined?`Öğrenci: ${o.ogrenci_sayisi}`:''].filter(Boolean).join(' · ');
    return `${o.ders_kodu?o.ders_kodu+' — ':''}${o.ders_adi||'—'}`;
}
async function adminDuzeltmeTalepleriniYukle(){
    const alan=document.getElementById('duzeltme-talebi-icerik');if(!alan)return;alan.innerHTML='<div class="yukleniyor">Yükleniyor...</div>';
    const durum=document.getElementById('duzeltme-talebi-durum')?.value||null;
    const {data,error}=await sb.rpc('admin_duzeltme_talepleri_listele',{p_admin_token:adminToken(),p_durum:durum,p_limit:ADMIN_SAYFA_BOYUTU,p_offset:adminDuzeltmeSayfa*ADMIN_SAYFA_BOYUTU});
    if(error){alan.innerHTML=`<div style="color:var(--red);padding:12px;font-size:.9em;">⚠️ ${escHtml(error.message)}</div>`;return;}
    const satirlar=data?.satirlar||[],toplam=Number(data?.toplam||0);if(!satirlar.length){alan.innerHTML='<div class="bos-mesaj">Bu durumda düzeltme talebi yok.</div>';return;}
    const tur={soru:'Not Kutusu paylaşımı',nk_ders:'Not Kutusu dersi',ders:'Ders',ders_verisi:'Ders verisi'};
    alan.innerHTML=`<table><thead><tr><th>Tür / Kayıt</th><th>Mevcut → Öneri</th><th>Gerekçe</th><th>Gönderen</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${satirlar.map(t=>`<tr><td>${escHtml(tur[t.hedef_turu]||t.hedef_turu)} #${escHtml(t.hedef_id)}</td><td><div style="color:var(--muted);font-size:.78em;">${escHtml(adminDuzeltmeDegerMetni(t,t.mevcut))}</div><strong>→ ${escHtml(adminDuzeltmeDegerMetni(t,t.oneri))}</strong></td><td>${escHtml(t.aciklama)}</td><td>${escHtml(t.email||'—')}</td><td>${escHtml(t.durum)}</td><td>${t.durum==='beklemede'?`<div class="btn-grup"><button class="btn btn-yesil" data-nk-click="adminDuzeltmeKarar" data-nk-click-arg0="${t.id}" data-nk-click-arg1="onaylandi">Onayla</button><button class="btn btn-kirmizi" data-nk-click="adminDuzeltmeKarar" data-nk-click-arg0="${t.id}" data-nk-click-arg1="reddedildi">Reddet</button></div>`:escHtml(t.sonuc_notu||'—')}</td></tr>`).join('')}</tbody></table>${adminSayfalamaHtml('adminDuzeltmeSayfaDegistir',adminDuzeltmeSayfa,toplam)}`;
}
function adminDuzeltmeFiltresiDegisti(){adminDuzeltmeSayfa=0;adminDuzeltmeTalepleriniYukle();}
function adminDuzeltmeSayfaDegistir(sayfa){adminDuzeltmeSayfa=Math.max(0,Number(sayfa)||0);adminDuzeltmeTalepleriniYukle();}
async function adminDuzeltmeKarar(id,karar){
    const not=prompt(karar==='onaylandi'?'Onay notu (isteğe bağlı):':'Ret gerekçesi:')?.trim();if(karar==='reddedildi'&&!not){bildirimGoster('Ret gerekçesi zorunludur.','hata');return;}
    const {data,error}=await sb.rpc('admin_duzeltme_talebi_sonuclandir',{p_admin_token:adminToken(),p_id:id,p_karar:karar,p_not:not||null});
    if(error){bildirimGoster('Hata: '+error.message,'hata');return;}if(adminYetkisizIseGirisEkraninaDon(data))return;if(!data?.basarili){bildirimGoster(data?.hata||'Talep sonuçlandırılamadı.','hata');return;}
    bildirimGoster(karar==='onaylandi'?'Düzeltme uygulandı.':'Talep reddedildi.',karar==='onaylandi'?'basari':'hata');adminDuzeltmeTalepleriniYukle();
}

// ── PAYLAŞILAN VERİLER ──
// Fakülte/bölüm seçim kutularını dolduran ortak yardımcılar (Paylaşılan Veriler + Ders Yönetimi sekmelerinde kullanılır)
let tumFakulteCache = null;
let tumBolumCache = null;
async function tumFakulteleriGetir() {
    if (!tumFakulteCache) {
        const { data } = await sb.from('fakulteler').select('id, ad').order('ad');
        tumFakulteCache = data || [];
    }
    return tumFakulteCache;
}
async function tumBolumleriGetir() {
    if (!tumBolumCache) {
        const { data } = await sb.from('bolumler').select('id, ad, fakulte_id').order('ad');
        tumBolumCache = data || [];
    }
    return tumBolumCache;
}
function fakulteSelectiDoldurBasit(selId, fakulteler) {
    const sel = document.getElementById(selId);
    if (!sel || sel.options.length > 1) return;
    fakulteler.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.ad; sel.appendChild(o); });
}
function bolumSelectiDoldur(selId, fakulteId, bolumler) {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const mevcut = sel.value;
    sel.innerHTML = '<option value="">Tüm Bölümler</option>';
    bolumler.filter(b => !fakulteId || String(b.fakulte_id) === String(fakulteId)).forEach(b => {
        const o = document.createElement('option'); o.value = b.id; o.textContent = b.ad; sel.appendChild(o);
    });
    if ([...sel.options].some(o => o.value === mevcut)) sel.value = mevcut;
}

async function veriFiltreFakulteDoldur() {
    fakulteSelectiDoldurBasit('filtre-fakulte', await tumFakulteleriGetir());
    verileriYukleGuncelGorunum();
}

async function veriFiltreFakulteDegisti() {
    const fakulteId = document.getElementById('filtre-fakulte').value;
    bolumSelectiDoldur('filtre-bolum', fakulteId, await tumBolumleriGetir());
    verileriYukleGuncelGorunum();
}

// "Paylaşılan Veriler" sekmesinde iki görünüm var: ham liste (tek tek her paylaşım) ve ders
// bazlı istatistik (aynı derse ait tüm paylaşımların özeti). Filtre değiştiğinde veya "Yenile"ye
// basıldığında hangi görünüm açıksa o yeniden yüklenir.
let veriAktifGorunum = 'liste';

function veriGorunumDegistir(mod, btn) {
    veriAktifGorunum = mod;
    document.querySelectorAll('.gorunum-toggle-btn').forEach(b => b.classList.remove('aktif'));
    btn.classList.add('aktif');
    document.getElementById('veri-liste-gorunumu').style.display = mod === 'liste' ? 'block' : 'none';
    document.getElementById('veri-istatistik-gorunumu').style.display = mod === 'istatistik' ? 'block' : 'none';
    verileriYukleGuncelGorunum();
}

function verileriYukleGuncelGorunum() {
    if (veriAktifGorunum === 'istatistik') dersIstatistikleriYukle();
    else verileriYukle();
}

async function verileriYukle() {
    const icerik = document.getElementById('veri-tablo-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const fakulteId = document.getElementById('filtre-fakulte').value;
    const bolumId = document.getElementById('filtre-bolum')?.value || '';
    const canTuru = document.getElementById('filtre-can-turu').value;

    // Fakülte/bölüme göre filtreleme yapılacaksa dersler/bolumler embed'lerini !inner yapıyoruz ki
    // filtre gerçekten üst satırları da eleyebilsin (aksi halde PostgREST sadece eşleşmeyen embed'i boş bırakır, satırı elemez).
    const dersEmbed = 'dersler' + ((fakulteId || bolumId) ? '!inner' : '');
    const bolumEmbed = 'bolumler' + (fakulteId ? '!inner' : '');
    const selectStr = `id, ortalama, std_sapma, ogrenci_sayisi, can_turu, donem, yil, ${dersEmbed}(ders_adi, ders_kodu, ${bolumEmbed}(ad, fakulteler(id, ad)))`;

    let query = sb.from('ders_verileri').select(selectStr).order('id', { ascending: false }).limit(200);
    if (bolumId) query = query.eq('dersler.bolum_id', bolumId);
    else if (fakulteId) query = query.eq('dersler.bolumler.fakulte_id', fakulteId);
    if (canTuru) query = query.eq('can_turu', canTuru);

    const { data, error } = await query;
    if (error) { icerik.innerHTML = `<div style="color:var(--red);padding:12px;font-size:0.9em;">⚠️ Hata: ${escHtml(error.message)}</div>`; return; }

    const f = data || [];
    if (!f.length) { icerik.innerHTML = '<div class="bos-mesaj">Veri bulunamadı.</div>'; return; }
    icerik.innerHTML = `<table><thead><tr><th>Ders</th><th>Bölüm</th><th>Dönem/Yıl</th><th>Tür</th><th>Ort.</th><th>Std.</th><th>Öğrenci</th><th>Sil</th></tr></thead><tbody>
        ${f.map(v => `<tr>
            <td>${escHtml(v.dersler?.ders_kodu?v.dersler.ders_kodu+' — ':'')}${escHtml(v.dersler?.ders_adi||'—')}</td>
            <td style="font-size:0.8em;color:var(--muted)">${escHtml(v.dersler?.bolumler?.ad||'—')}</td>
            <td>${v.yil}-${v.yil+1} ${v.donem}</td>
            <td><span class="rozet ${v.can_turu==='but'?'rozet-turuncu':'rozet-mavi'}">${v.can_turu==='but'?'Büt':'Final'}</span></td>
            <td>${v.ortalama!=null?v.ortalama.toFixed(2):'—'}</td>
            <td>${v.std_sapma!=null?v.std_sapma.toFixed(2):'—'}</td>
            <td>${v.ogrenci_sayisi!=null?v.ogrenci_sayisi:'—'}</td>
            <td><button class="btn btn-kirmizi" data-nk-click="veriSil" data-nk-click-arg0="${v.id}">✕</button></td>
        </tr>`).join('')}
    </tbody></table>`;
}

// Ders bazlı istatistik görünümü: aynı fakülte/bölüm/çan-türü filtreleriyle en son 2000 paylaşımı
// çekip ders_id'ye göre client-side gruplayarak her ders için özet (paylaşım sayısı, ortalama HBN/
// std. sapma/öğrenci sayısı, yıl aralığı) çıkarır. PostgREST üzerinden anon key ile GROUP BY
// yapılamadığı için (ör. yeni bir view/RPC eklemeden) aggregation client-side yapılıyor; ders_verileri
// tablosunun büyüklüğü göz önüne alındığında 2000 satır limiti pratikte yeterli.
async function dersIstatistikleriYukle() {
    const icerik = document.getElementById('veri-istatistik-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const fakulteId = document.getElementById('filtre-fakulte').value;
    const bolumId = document.getElementById('filtre-bolum')?.value || '';
    const canTuru = document.getElementById('filtre-can-turu').value;

    const dersEmbed = 'dersler' + ((fakulteId || bolumId) ? '!inner' : '');
    const bolumEmbed = 'bolumler' + (fakulteId ? '!inner' : '');
    const selectStr = `id, ders_id, ortalama, std_sapma, ogrenci_sayisi, can_turu, yil, ${dersEmbed}(ders_adi, ders_kodu, ${bolumEmbed}(ad, fakulteler(id, ad)))`;

    let query = sb.from('ders_verileri').select(selectStr).order('id', { ascending: false }).limit(2000);
    if (bolumId) query = query.eq('dersler.bolum_id', bolumId);
    else if (fakulteId) query = query.eq('dersler.bolumler.fakulte_id', fakulteId);
    if (canTuru) query = query.eq('can_turu', canTuru);

    const { data, error } = await query;
    if (error) { icerik.innerHTML = `<div style="color:var(--red);padding:12px;font-size:0.9em;">⚠️ Hata: ${escHtml(error.message)}</div>`; return; }

    const f = data || [];
    if (!f.length) { icerik.innerHTML = '<div class="bos-mesaj">Veri bulunamadı.</div>'; return; }

    const gruplar = new Map();
    f.forEach(v => {
        if (!v.ders_id) return;
        if (!gruplar.has(v.ders_id)) {
            gruplar.set(v.ders_id, {
                dersAdi: v.dersler?.ders_adi || '—',
                dersKodu: v.dersler?.ders_kodu || '',
                bolumAdi: v.dersler?.bolumler?.ad || '—',
                kayitlar: []
            });
        }
        gruplar.get(v.ders_id).kayitlar.push(v);
    });

    const ort = arr => arr.length > 0 ? arr.reduce((s, x) => s + x, 0) / arr.length : null;

    const satirlar = [...gruplar.values()].map(g => {
        const ortalamalar = g.kayitlar.map(k => k.ortalama).filter(v => v != null);
        const stdSapmalar = g.kayitlar.map(k => k.std_sapma).filter(v => v != null);
        const ogrenciSayilari = g.kayitlar.map(k => k.ogrenci_sayisi).filter(v => v != null);
        const yillar = g.kayitlar.map(k => k.yil).filter(v => v != null);
        return {
            dersAdi: g.dersAdi,
            dersKodu: g.dersKodu,
            bolumAdi: g.bolumAdi,
            sayisi: g.kayitlar.length,
            ortHBN: ort(ortalamalar),
            ortStd: ort(stdSapmalar),
            ortOgrenci: ort(ogrenciSayilari),
            minYil: yillar.length ? Math.min(...yillar) : null,
            maxYil: yillar.length ? Math.max(...yillar) : null
        };
    }).sort((a, b) => b.sayisi - a.sayisi);

    const uyari = f.length >= 2000
        ? `<div style="color:var(--orange);font-size:0.8em;margin-bottom:8px;">⚠️ 2000 kayıt limitine ulaşıldı; çok eski paylaşımlar bu özete dahil edilmemiş olabilir.</div>`
        : '';

    icerik.innerHTML = uyari + `<table><thead><tr><th>Ders</th><th>Bölüm</th><th>Paylaşım</th><th>Ort. HBN</th><th>Ort. Std.</th><th>Ort. Öğrenci</th><th>Yıl Aralığı</th></tr></thead><tbody>
        ${satirlar.map(g => `<tr>
            <td>${escHtml(g.dersKodu ? g.dersKodu + ' — ' : '')}${escHtml(g.dersAdi)}</td>
            <td style="font-size:0.8em;color:var(--muted)">${escHtml(g.bolumAdi)}</td>
            <td><strong>${g.sayisi}</strong></td>
            <td>${g.ortHBN != null ? g.ortHBN.toFixed(2) : '—'}</td>
            <td>${g.ortStd != null ? g.ortStd.toFixed(2) : '—'}</td>
            <td>${g.ortOgrenci != null ? Math.round(g.ortOgrenci) : '—'}</td>
            <td>${g.minYil != null ? (g.minYil === g.maxYil ? `${g.minYil}-${g.minYil+1}` : `${g.minYil}-${g.minYil+1} … ${g.maxYil}-${g.maxYil+1}`) : '—'}</td>
        </tr>`).join('')}
    </tbody></table>`;
}

async function veriSil(id) {
    if (!confirm('Bu veriyi silmek istediğine emin misin?')) return;
    const { data: sonuc, error } = await sb.rpc('admin_ders_verisi_sil', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Veri silindi.', 'hata'); verileriYukle();
}

// ── DUYURULAR ──
// Duyurular artık zengin içerikli olabilir: bir "ana metin" + isteğe bağlı bir resmi link +
// isteğe bağlı bir dizi "değişiklik kutusu" (başlık/açıklama/örnek). Bunlar tek bir HTML dizgisi
// olarak `icerik` sütununda saklanır (site tarafında zaten HTML olarak basılıyordu), böylece
// veritabanı şeması değişmeden sitedeki gibi vurgulu kutular içeren duyurular üretilebiliyor.
let tumDuyurular = [];
let duyuruKutuState = [];

function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return escHtml(s).replace(/"/g,'&quot;'); }
function stripHtml(s) { const d = document.createElement('div'); d.innerHTML = s || ''; return d.textContent || ''; }

function duyuruKutuEkle() {
    duyuruKutuState.push({ baslik: '', aciklama: '', ornek: '' });
    duyuruKutulariRenderla();
}
function duyuruKutuSil(i) {
    duyuruKutuState.splice(i, 1);
    duyuruKutulariRenderla();
}
function duyuruKutuAlanGuncelle(i, alan, deger) {
    duyuruKutuState[i][alan] = deger;
    duyuruOnizlemeGuncelle();
}
function duyuruKutulariRenderla() {
    const cont = document.getElementById('duyuru-kutular-container');
    cont.innerHTML = duyuruKutuState.length ? duyuruKutuState.map((k, i) => `
        <div class="duyuru-kutu-row">
            <div class="form-row-admin" style="margin-bottom:8px;">
                <div class="form-group-admin" style="flex:2"><label>Kutu Başlığı</label><input type="text" value="${escAttr(k.baslik)}" placeholder="⚠️ Değişiklik: ..." data-nk-input="duyuruKutuAlanGuncelle" data-nk-input-arg0="#${i}" data-nk-input-arg1="baslik" data-nk-input-arg2="@value"></div>
                <div class="form-group-admin" style="flex:0 0 90px;display:flex;align-items:flex-end;"><button type="button" class="btn btn-kirmizi" style="width:100%;" data-nk-click="duyuruKutuSil" data-nk-click-arg0="#${i}">✕ Sil</button></div>
            </div>
            <div class="form-group-admin" style="margin-bottom:8px;"><label>Açıklama</label><textarea data-nk-input="duyuruKutuAlanGuncelle" data-nk-input-arg0="#${i}" data-nk-input-arg1="aciklama" data-nk-input-arg2="@value">${escHtml(k.aciklama)}</textarea></div>
            <div class="form-group-admin"><label>Örnek <span style="color:var(--muted);font-weight:400;">(opsiyonel, italik gösterilir)</span></label><input type="text" value="${escAttr(k.ornek)}" placeholder="Örnek: ..." data-nk-input="duyuruKutuAlanGuncelle" data-nk-input-arg0="#${i}" data-nk-input-arg1="ornek" data-nk-input-arg2="@value"></div>
        </div>
    `).join('') : '<p style="font-size:0.82em;color:var(--muted);">Henüz kutu eklenmedi.</p>';
    duyuruOnizlemeGuncelle();
}

function duyuruIcerikOlustur() {
    const anaMetin = document.getElementById('duyuru-icerik').value.trim();
    const linkUrl = document.getElementById('duyuru-link-url').value.trim();
    const linkMetin = document.getElementById('duyuru-link-metin').value.trim();
    let html = `<p class="duyuru-alt-metin">${escHtml(anaMetin)}`;
    if (linkUrl) html += ` <a href="${escAttr(linkUrl)}" target="_blank" rel="noopener" class="duyuru-link">${escHtml(linkMetin || 'Detaylar →')}</a>`;
    html += `</p>`;
    duyuruKutuState.forEach(k => {
        if (!k.baslik && !k.aciklama && !k.ornek) return;
        html += `<div class="duyuru-degisiklik-kutu">`;
        if (k.baslik) html += `<div class="duyuru-degisiklik-baslik">${escHtml(k.baslik)}</div>`;
        if (k.aciklama) html += `<p>${escHtml(k.aciklama)}</p>`;
        if (k.ornek) html += `<div class="duyuru-ornek">📌 <em>${escHtml(k.ornek)}</em></div>`;
        html += `</div>`;
    });
    return html;
}

// Var olan (zengin HTML veya eski düz metin) bir duyuruyu forma geri doldurmak için çözümler.
function duyuruIcerikCoz(icerikHTML) {
    const div = document.createElement('div');
    div.innerHTML = icerikHTML || '';
    let anaMetin = '', linkUrl = '', linkMetin = '';
    const ilkP = div.querySelector('p');
    if (ilkP) {
        const a = ilkP.querySelector('a');
        if (a) { linkUrl = a.getAttribute('href') || ''; linkMetin = a.textContent.trim(); a.remove(); }
        anaMetin = ilkP.textContent.trim();
    } else {
        anaMetin = div.textContent.trim();
    }
    const kutular = [];
    div.querySelectorAll('.duyuru-degisiklik-kutu').forEach(kutu => {
        const baslikEl = kutu.querySelector('.duyuru-degisiklik-baslik');
        const pEl = kutu.querySelector('p');
        const ornekEl = kutu.querySelector('.duyuru-ornek em') || kutu.querySelector('.duyuru-ornek');
        kutular.push({
            baslik: baslikEl ? baslikEl.textContent.trim() : '',
            aciklama: pEl ? pEl.textContent.trim() : '',
            ornek: ornekEl ? ornekEl.textContent.replace(/^📌\s*/,'').trim() : ''
        });
    });
    return { anaMetin, linkUrl, linkMetin, kutular };
}

function duyuruOnizlemeGuncelle() {
    const baslik = document.getElementById('duyuru-baslik')?.value.trim() || '(Başlık girilmedi)';
    const anaMetin = document.getElementById('duyuru-icerik')?.value.trim() || '';
    const linkUrl = document.getElementById('duyuru-link-url')?.value.trim() || '';
    const linkMetin = document.getElementById('duyuru-link-metin')?.value.trim() || '';
    let html = `<div class="don-baslik">📢 ${escHtml(baslik)}</div>`;
    if (anaMetin) {
        html += `<p>${escHtml(anaMetin)}`;
        if (linkUrl) html += ` <a href="#" data-nk-click="nkOlayEngelle" data-nk-click-prevent="true">${escHtml(linkMetin || 'Detaylar →')}</a>`;
        html += `</p>`;
    }
    duyuruKutuState.forEach(k => {
        if (!k.baslik && !k.aciklama && !k.ornek) return;
        html += `<div class="don-kutu">`;
        if (k.baslik) html += `<div class="don-kutu-baslik">${escHtml(k.baslik)}</div>`;
        if (k.aciklama) html += `<p style="margin:0;">${escHtml(k.aciklama)}</p>`;
        if (k.ornek) html += `<div class="don-ornek">📌 <em>${escHtml(k.ornek)}</em></div>`;
        html += `</div>`;
    });
    document.getElementById('duyuru-onizleme').innerHTML = `<div class="duyuru-onizleme-kutu">${html}</div>`;
}

async function duyurulariYukle() {
    const icerik = document.getElementById('duyuru-tablo-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const { data } = await sb.from('duyurular').select('*').order('olusturulma_tarihi', { ascending: false });
    tumDuyurular = data || [];
    if (!tumDuyurular.length) { icerik.innerHTML = '<div class="bos-mesaj">Henüz duyuru yok.</div>'; return; }
    const bugun = new Date().toISOString().slice(0,10);
    icerik.innerHTML = `<table><thead><tr><th>Başlık</th><th>İçerik</th><th>Durum</th><th>Tarih</th><th>Son Kullanma</th><th>İşlem</th></tr></thead><tbody>
        ${tumDuyurular.map(d => {
            const bitis = d.gecerlilik_tarihi?.slice(0,10);
            const suresi = bitis && bitis < bugun;
            const bitisMetin = bitis
                ? `<span style="color:${suresi?'var(--red)':'var(--muted)'};font-size:0.82em;">${suresi?'⏰ Süresi doldu':'📅 '+bitis}</span>`
                : '<span style="color:var(--muted);font-size:0.82em;">—</span>';
            const onizMetin = stripHtml(d.icerik);
            return `<tr>
                <td><strong>${d.baslik}</strong></td>
                <td style="font-size:0.82em;color:var(--muted);max-width:200px;">${onizMetin.slice(0,60)}${onizMetin.length>60?'...':''}</td>
                <td><span class="rozet ${d.aktif?'rozet-yesil':'rozet-sari'}">${d.aktif?'✅ Aktif':'⏸️ Pasif'}</span></td>
                <td style="font-size:0.8em;color:var(--muted)">${d.olusturulma_tarihi?.slice(0,10)}</td>
                <td>${bitisMetin}</td>
                <td><div class="btn-grup">
                    <button class="btn btn-mor" data-nk-click="duyuruDuzenle" data-nk-click-arg0="${d.id}">✏️</button>
                    <button class="btn ${d.aktif?'btn-turuncu':'btn-yesil'}" data-nk-click="duyuruDurumDegistir" data-nk-click-arg0="${d.id}" data-nk-click-arg1="?${!d.aktif}">${d.aktif?'⏸️':'✅'}</button>
                    <button class="btn btn-kirmizi" data-nk-click="duyuruSil" data-nk-click-arg0="${d.id}">✕</button>
                </div></td>
            </tr>`;
        }).join('')}
    </tbody></table>`;
}

function duyuruDuzenle(id) {
    const d = tumDuyurular.find(x => String(x.id) === String(id));
    if (!d) return;
    const cozulmus = duyuruIcerikCoz(d.icerik);
    document.getElementById('duyuru-duzenleme-id').value = d.id;
    document.getElementById('duyuru-baslik').value = d.baslik || '';
    document.getElementById('duyuru-aktif').value = d.aktif ? 'true' : 'false';
    document.getElementById('duyuru-bitis').value = d.gecerlilik_tarihi ? d.gecerlilik_tarihi.slice(0,10) : '';
    document.getElementById('duyuru-icerik').value = cozulmus.anaMetin;
    document.getElementById('duyuru-link-url').value = cozulmus.linkUrl;
    document.getElementById('duyuru-link-metin').value = cozulmus.linkMetin;
    duyuruKutuState = cozulmus.kutular;
    duyuruKutulariRenderla();
    document.getElementById('duyuru-form-baslik').textContent = '✏️ Duyuruyu Düzenle';
    document.getElementById('duyuru-submit-btn').textContent = '💾 Güncelle';
    document.getElementById('duyuru-iptal-btn').style.display = 'inline-block';
    document.getElementById('bolum-duyurular').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function duyuruDuzenlemeIptal() {
    document.getElementById('duyuru-duzenleme-id').value = '';
    document.getElementById('duyuru-baslik').value = '';
    document.getElementById('duyuru-aktif').value = 'true';
    document.getElementById('duyuru-bitis').value = '';
    document.getElementById('duyuru-icerik').value = '';
    document.getElementById('duyuru-link-url').value = '';
    document.getElementById('duyuru-link-metin').value = '';
    duyuruKutuState = [];
    duyuruKutulariRenderla();
    document.getElementById('duyuru-form-baslik').textContent = '➕ Yeni Duyuru Yayınla';
    document.getElementById('duyuru-submit-btn').textContent = '📢 Duyuruyu Yayınla';
    document.getElementById('duyuru-iptal-btn').style.display = 'none';
}

async function duyuruKaydet() {
    const duzenlemeId = document.getElementById('duyuru-duzenleme-id').value;
    const baslik = document.getElementById('duyuru-baslik').value.trim();
    const anaMetin = document.getElementById('duyuru-icerik').value.trim();
    const aktif = document.getElementById('duyuru-aktif').value === 'true';
    const bitis = document.getElementById('duyuru-bitis').value || null;
    if (!baslik || !anaMetin) { bildirimGoster('Başlık ve ana metin zorunlu!', 'hata'); return; }
    const icerik = duyuruIcerikOlustur();
    const { data: sonuc, error } = await sb.rpc('admin_duyuru_kaydet', {
        p_admin_token: adminToken(),
        p_id: duzenlemeId || null,
        p_baslik: baslik,
        p_icerik: icerik,
        p_aktif: aktif,
        p_gecerlilik_tarihi: bitis
    });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    const guncellemeMi = !!duzenlemeId;
    duyuruDuzenlemeIptal();
    bildirimGoster(guncellemeMi ? 'Duyuru güncellendi ✓' : 'Duyuru yayınlandı! 📢', 'basari');
    duyurulariYukle();
}

async function duyuruSuresiBitenleriKapat() {
    try {
        await sb.rpc('admin_duyuru_suresi_bitenleri_kapat', { p_admin_token: adminToken() });
    } catch(e) {}
}

async function duyuruDurumDegistir(id, aktif) {
    const { data: sonuc, error } = await sb.rpc('admin_duyuru_durum_degistir', { p_admin_token: adminToken(), p_id: id, p_aktif: aktif });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster(aktif?'Duyuru aktif edildi.':'Duyuru pasif yapıldı.', 'basari'); duyurulariYukle();
}
async function duyuruSil(id) {
    if (!confirm('Bu duyuruyu silmek istediğine emin misin?')) return;
    const { data: sonuc, error } = await sb.rpc('admin_duyuru_sil', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    if (document.getElementById('duyuru-duzenleme-id').value === String(id)) duyuruDuzenlemeIptal();
    bildirimGoster('Duyuru silindi.', 'hata'); duyurulariYukle();
}

// ── ANKETLER ──
// Not: aynı anda yalnızca 1 anket aktif olabilsin diye Supabase tarafında da
// `anketler(aktif) where aktif` üzerinde bir partial unique index var — bu yüzden bir anketi
// aktif ederken önce diğer tüm aktif anketleri pasif yapıyoruz (bkz. anketKaydet / anketDurumDegistir).
let anketSoruState = [];
let tumAnketler = [];

function anketSoruEkle() {
    anketSoruState.push({ id: null, soru_metni: '', soru_tipi: 'coktan_secmeli', secenekler: ['', ''], zorunlu: false });
    anketSorulariRenderla();
}
function anketSoruSil(i) {
    anketSoruState.splice(i, 1);
    anketSorulariRenderla();
}
function anketSoruMetniGuncelle(i, deger) { anketSoruState[i].soru_metni = deger; }
function anketSoruZorunluGuncelle(i, deger) { anketSoruState[i].zorunlu = (deger === 'true'); }
function anketSoruTipiGuncelle(i, deger) {
    anketSoruState[i].soru_tipi = deger;
    if (deger === 'coktan_secmeli' && (!anketSoruState[i].secenekler || !anketSoruState[i].secenekler.length)) {
        anketSoruState[i].secenekler = ['', ''];
    }
    anketSorulariRenderla();
}
function anketSecenekEkle(i) {
    anketSoruState[i].secenekler.push('');
    anketSorulariRenderla();
}
function anketSecenekSil(i, j) {
    if (anketSoruState[i].secenekler.length <= 1) return;
    anketSoruState[i].secenekler.splice(j, 1);
    anketSorulariRenderla();
}
function anketSecenekGuncelle(i, j, deger) { anketSoruState[i].secenekler[j] = deger; }

function anketSorulariRenderla() {
    const cont = document.getElementById('anket-sorular-container');
    cont.innerHTML = anketSoruState.length ? anketSoruState.map((soru, i) => `
        <div class="duyuru-kutu-row">
            <div class="form-row-admin">
                <div class="form-group-admin" style="flex:3"><label>Soru ${i+1}</label><input type="text" value="${escAttr(soru.soru_metni)}" placeholder="Soru metni..." data-nk-input="anketSoruMetniGuncelle" data-nk-input-arg0="#${i}" data-nk-input-arg1="@value"></div>
                <div class="form-group-admin" style="flex:0 0 170px"><label>Tip</label>
                    <select data-nk-change="anketSoruTipiGuncelle" data-nk-change-arg0="#${i}" data-nk-change-arg1="@value">
                        <option value="coktan_secmeli" ${soru.soru_tipi==='coktan_secmeli'?'selected':''}>🔘 Çoktan Seçmeli</option>
                        <option value="yorum" ${soru.soru_tipi==='yorum'?'selected':''}>✏️ Yorum Yazma</option>
                    </select>
                </div>
                <div class="form-group-admin" style="flex:0 0 110px"><label>Zorunlu</label>
                    <select data-nk-change="anketSoruZorunluGuncelle" data-nk-change-arg0="#${i}" data-nk-change-arg1="@value">
                        <option value="false" ${!soru.zorunlu?'selected':''}>Hayır</option>
                        <option value="true" ${soru.zorunlu?'selected':''}>Evet</option>
                    </select>
                </div>
                <div class="form-group-admin" style="flex:0 0 60px;display:flex;align-items:flex-end;"><button type="button" class="btn btn-kirmizi" style="width:100%;" data-nk-click="anketSoruSil" data-nk-click-arg0="#${i}">✕</button></div>
            </div>
            ${soru.soru_tipi === 'coktan_secmeli' ? `
            <div style="margin-top:6px;">
                <label style="font-size:0.78em;color:var(--muted);font-weight:600;">Seçenekler</label>
                ${soru.secenekler.map((sec, j) => `
                    <div style="display:flex;gap:6px;margin-top:6px;">
                        <input type="text" style="flex:1;padding:7px 10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:'Poppins',sans-serif;font-size:0.85em;" value="${escAttr(sec)}" placeholder="Seçenek ${j+1}" data-nk-input="anketSecenekGuncelle" data-nk-input-arg0="#${i}" data-nk-input-arg1="#${j}" data-nk-input-arg2="@value">
                        <button type="button" class="btn btn-kirmizi" data-nk-click="anketSecenekSil" data-nk-click-arg0="#${i}" data-nk-click-arg1="#${j}" ${soru.secenekler.length<=1?'disabled':''}>✕</button>
                    </div>`).join('')}
                <button type="button" class="btn btn-gri" style="margin-top:6px;font-size:0.8em;padding:5px 10px;" data-nk-click="anketSecenekEkle" data-nk-click-arg0="#${i}">➕ Seçenek Ekle</button>
            </div>` : ''}
        </div>
    `).join('') : '<p style="font-size:0.82em;color:var(--muted);">Henüz soru eklenmedi.</p>';
}

async function anketKaydet() {
    const hataEl = document.getElementById('anket-form-hata');
    hataEl.textContent = '';
    const duzenlemeId = document.getElementById('anket-duzenleme-id').value;
    const baslik = document.getElementById('anket-baslik').value.trim();
    const aciklama = document.getElementById('anket-aciklama').value.trim();
    const aktif = document.getElementById('anket-aktif').value === 'true';

    if (!baslik) { hataEl.textContent = 'Başlık zorunlu.'; return; }
    if (!anketSoruState.length) { hataEl.textContent = 'En az 1 soru eklemelisin.'; return; }
    for (const s of anketSoruState) {
        if (!s.soru_metni.trim()) { hataEl.textContent = 'Tüm soruların metni doldurulmalı.'; return; }
        if (s.soru_tipi === 'coktan_secmeli' && s.secenekler.filter(sec => sec.trim()).length < 2) {
            hataEl.textContent = `"${s.soru_metni}" sorusunda en az 2 seçenek olmalı.`; return;
        }
    }

    try {
        // Soru id'lerini (varsa) koruyarak tek bir RPC'ye gönderiyoruz — ekle/güncelle/sil
        // diff'i artık sunucu tarafında (admin_anket_kaydet içinde) yapılıyor. Id'lerin
        // korunması önemli: her yanıt hangi soruya ait olduğunu soru_id ile tutuyor, id'ler
        // her düzenlemede sıfırdan üretilseydi geçmiş yanıtlar hiçbir soruyla eşleşmezdi.
        const soruPayload = anketSoruState.map(s => ({
            id: s.id != null ? s.id : null,
            soru_metni: s.soru_metni.trim(),
            soru_tipi: s.soru_tipi,
            secenekler: s.soru_tipi === 'coktan_secmeli' ? s.secenekler.map(x => x.trim()).filter(Boolean) : null,
            zorunlu: !!s.zorunlu
        }));

        const { data: sonuc, error } = await sb.rpc('admin_anket_kaydet', {
            p_admin_token: adminToken(),
            p_id: duzenlemeId || null,
            p_baslik: baslik,
            p_aciklama: aciklama || null,
            p_aktif: aktif,
            p_sorular: soruPayload
        });
        if (error) throw error;
        if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;

        bildirimGoster(duzenlemeId ? 'Anket güncellendi.' : 'Anket yayınlandı.', 'basari');
        anketDuzenlemeIptal();
        anketleriYukle();
    } catch (e) {
        hataEl.textContent = 'Hata: ' + e.message;
    }
}

function anketDuzenlemeIptal() {
    document.getElementById('anket-duzenleme-id').value = '';
    document.getElementById('anket-baslik').value = '';
    document.getElementById('anket-aciklama').value = '';
    document.getElementById('anket-aktif').value = 'false';
    anketSoruState = [];
    anketSorulariRenderla();
    document.getElementById('anket-form-baslik').textContent = '➕ Yeni Anket Oluştur';
    document.getElementById('anket-submit-btn').textContent = '📊 Anketi Yayınla';
    document.getElementById('anket-iptal-btn').style.display = 'none';
    document.getElementById('anket-form-hata').textContent = '';
}

async function anketleriYukle() {
    const icerik = document.getElementById('anket-tablo-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    // v6: anket_yanitlari artık anon'a kapalı, embedded "anket_yanitlari(count)" ile birlikte
    // gelmiyor — yanıt sayıları ayrı bir admin RPC'sinden (tüm anketler için tek seferde) çekilip
    // anket id'sine göre eşleniyor.
    const [{ data, error }, { data: yanitSayilariData, error: yanitSayiHata }] = await Promise.all([
        sb.from('anketler')
            .select('id, baslik, aktif, olusturulma_tarihi, anket_sorulari(count)')
            .order('olusturulma_tarihi', { ascending: false }),
        sb.rpc('admin_anket_yanit_sayilari', { p_admin_token: adminToken() })
    ]);
    if (error) { icerik.innerHTML = `<div class="bos-mesaj">Hata: ${escHtml(error.message)}</div>`; return; }
    if (yanitSayiHata && oturumSuresiDolduMuKontrolEt(yanitSayiHata.message)) return;
    const yanitSayisiMap = new Map((yanitSayilariData || []).map(r => [String(r.anket_id), r.sayi]));
    tumAnketler = data || [];
    if (!tumAnketler.length) { icerik.innerHTML = '<div class="bos-mesaj">Henüz anket yok.</div>'; return; }

    icerik.innerHTML = `<table><thead><tr><th>Başlık</th><th>Soru</th><th>Yanıt</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>
        ${tumAnketler.map(a => {
            const soruSayisi = a.anket_sorulari?.[0]?.count ?? 0;
            const yanitSayisi = yanitSayisiMap.get(String(a.id)) ?? 0;
            return `<tr>
                <td><strong>${escHtml(a.baslik)}</strong></td>
                <td>${soruSayisi}</td>
                <td>${yanitSayisi}</td>
                <td><span class="rozet ${a.aktif?'rozet-yesil':'rozet-sari'}">${a.aktif?'✅ Aktif':'⏸️ Pasif'}</span></td>
                <td style="font-size:0.8em;color:var(--muted)">${a.olusturulma_tarihi?.slice(0,10)}</td>
                <td><div class="btn-grup">
                    <button class="btn btn-mor" data-nk-click="anketYanitlariGoster" data-nk-click-arg0="${a.id}" title="Yanıtları Gör">📊</button>
                    <button class="btn btn-mor" data-nk-click="anketDuzenle" data-nk-click-arg0="${a.id}" title="Düzenle">✏️</button>
                    <button class="btn ${a.aktif?'btn-turuncu':'btn-yesil'}" data-nk-click="anketDurumDegistir" data-nk-click-arg0="${a.id}" data-nk-click-arg1="?${!a.aktif}" title="${a.aktif?'Pasif yap':'Aktif et'}">${a.aktif?'⏸️':'✅'}</button>
                    <button class="btn btn-kirmizi" data-nk-click="anketSil" data-nk-click-arg0="${a.id}" title="Sil">✕</button>
                </div></td>
            </tr>`;
        }).join('')}
    </tbody></table>`;
}

async function anketDuzenle(id) {
    const { data: anket, error } = await sb.from('anketler').select('*').eq('id', id).single();
    if (error || !anket) return;
    const { data: sorular } = await sb.from('anket_sorulari').select('*').eq('anket_id', id).order('sira');

    document.getElementById('anket-duzenleme-id').value = anket.id;
    document.getElementById('anket-baslik').value = anket.baslik || '';
    document.getElementById('anket-aciklama').value = anket.aciklama || '';
    document.getElementById('anket-aktif').value = anket.aktif ? 'true' : 'false';
    anketSoruState = (sorular || []).map(s => ({
        id: s.id,
        soru_metni: s.soru_metni,
        soru_tipi: s.soru_tipi,
        secenekler: Array.isArray(s.secenekler) && s.secenekler.length ? s.secenekler.slice() : ['', ''],
        zorunlu: !!s.zorunlu
    }));
    anketSorulariRenderla();
    document.getElementById('anket-form-baslik').textContent = '✏️ Anketi Düzenle';
    document.getElementById('anket-submit-btn').textContent = '💾 Güncelle';
    document.getElementById('anket-iptal-btn').style.display = 'inline-block';
    document.getElementById('bolum-anketler').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function anketDurumDegistir(id, aktif) {
    const { data: sonuc, error } = await sb.rpc('admin_anket_durum_degistir', { p_admin_token: adminToken(), p_id: id, p_aktif: aktif });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster(aktif ? 'Anket aktif edildi.' : 'Anket pasif yapıldı.', 'basari');
    anketleriYukle();
}

async function anketSil(id) {
    if (!confirm('Bu anketi silmek istediğine emin misin? Soruları ve toplanan yanıtları da silinecek.')) return;
    const { data: sonuc, error } = await sb.rpc('admin_anket_sil', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    if (document.getElementById('anket-duzenleme-id').value === String(id)) anketDuzenlemeIptal();
    bildirimGoster('Anket silindi.', 'hata');
    anketleriYukle();
}

async function anketYanitlariGoster(id) {
    const wrapper = document.getElementById('anket-yanit-wrapper');
    const icerik = document.getElementById('anket-yanit-icerik');
    const baslikEl = document.getElementById('anket-yanit-baslik');
    wrapper.style.display = 'block';
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const anket = tumAnketler.find(a => String(a.id) === String(id));
    baslikEl.textContent = '📊 Yanıtlar' + (anket ? ' — ' + anket.baslik : '');

    try {
        const { data: sorular, error: soruHata } = await sb.from('anket_sorulari').select('*').eq('anket_id', id).order('sira');
        if (soruHata) throw soruHata;

        const tumYanitlar = [];
        const pageSize = 1000;
        for (let sayfa = 0; sayfa < 100; sayfa++) {
            const { data, error } = await sb.rpc('admin_anket_yanitlari_getir', {
                p_admin_token: adminToken(), p_anket_id: id, p_limit: pageSize, p_offset: sayfa*pageSize
            });
            if (error) { if (oturumSuresiDolduMuKontrolEt(error.message)) return; throw error; }
            if (!data || !data.length) break;
            tumYanitlar.push(...data);
            if (data.length < pageSize) break;
        }

        if (!tumYanitlar.length) { icerik.innerHTML = '<div class="bos-mesaj">Henüz yanıt yok.</div>'; return; }

        icerik.innerHTML = `<p style="font-size:0.85em;color:var(--muted);margin-bottom:14px;">Toplam <strong>${tumYanitlar.length}</strong> yanıt.</p>` +
            (sorular || []).map(soru => {
                const cevaplar = tumYanitlar
                    .map(y => (y.yanitlar || []).find(c => String(c.soru_id) === String(soru.id)))
                    .filter(Boolean);
                if (soru.soru_tipi === 'coktan_secmeli') {
                    const sayaclar = {};
                    (soru.secenekler || []).forEach(sec => { sayaclar[sec] = 0; });
                    cevaplar.forEach(c => { sayaclar[c.cevap] = (sayaclar[c.cevap] || 0) + 1; });
                    const toplam = cevaplar.length || 1;
                    return `<div style="margin-bottom:22px;">
                        <div style="font-weight:700;font-size:0.9em;margin-bottom:8px;">${escHtml(soru.soru_metni)} <span style="color:var(--muted);font-weight:400;">(${cevaplar.length} yanıt)</span></div>
                        ${Object.entries(sayaclar).map(([sec, sayi]) => {
                            const oran = ((sayi/toplam)*100).toFixed(0);
                            return `<div style="margin-bottom:6px;">
                                <div style="display:flex;justify-content:space-between;font-size:0.82em;margin-bottom:3px;"><span>${escHtml(sec)}</span><span>${sayi} · %${oran}</span></div>
                                <div style="background:var(--bg);border-radius:4px;height:8px;overflow:hidden;"><div style="background:var(--accent);height:100%;width:${oran}%;"></div></div>
                            </div>`;
                        }).join('')}
                    </div>`;
                }
                return `<div style="margin-bottom:22px;">
                    <div style="font-weight:700;font-size:0.9em;margin-bottom:8px;">${escHtml(soru.soru_metni)} <span style="color:var(--muted);font-weight:400;">(${cevaplar.length} yanıt)</span></div>
                    <div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
                        ${cevaplar.length ? cevaplar.map(c => `<div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:0.85em;">${escHtml(c.cevap)}</div>`).join('') : '<span style="font-size:0.82em;color:var(--muted);">Yorum yapılmamış.</span>'}
                    </div>
                </div>`;
            }).join('');
    } catch (e) {
        icerik.innerHTML = `<div class="bos-mesaj">Hata: ${escHtml(e.message)}</div>`;
    }
}

// ── FAKÜLTE & BÖLÜM ──
async function fakulteSelectDoldur() {
    const { data } = await sb.from('fakulteler').select('id, ad').order('ad');
    if (!data) return;
    ['bolum-fakulte-sec','bolum-filtre-fakulte'].forEach(id => {
        const sel = document.getElementById(id);
        const ilk = sel.options[0];
        sel.innerHTML = ''; sel.appendChild(ilk);
        data.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = f.ad; sel.appendChild(o); });
    });
}

async function fakulteleriYukle() {
    const icerik = document.getElementById('fakulte-tablo-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const { data } = await sb.from('fakulteler').select('id, ad').order('ad');
    if (!data || !data.length) { icerik.innerHTML = '<div class="bos-mesaj">Fakülte yok.</div>'; return; }
    icerik.innerHTML = `<table><thead><tr><th>Fakülte Adı</th><th>Sil</th></tr></thead><tbody>
        ${data.map(f => `<tr><td>${escHtml(f.ad)}</td><td><button class="btn btn-kirmizi" data-nk-click="fakulteSil" data-nk-click-arg0="${f.id}">✕</button></td></tr>`).join('')}
    </tbody></table>`;
}

async function fakulteEkle() {
    const ad = document.getElementById('yeni-fakulte-adi').value.trim();
    if (!ad) { bildirimGoster('Fakülte adı boş olamaz.', 'hata'); return; }
    const { data: sonuc, error } = await sb.rpc('admin_fakulte_ekle', { p_admin_token: adminToken(), p_ad: ad });
    if (error) { bildirimGoster('Hata: '+error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    document.getElementById('yeni-fakulte-adi').value = '';
    bildirimGoster('Fakülte eklendi ✓', 'basari'); fakulteleriYukle(); fakulteSelectDoldur();
}

async function fakulteSil(id) {
    if (!confirm('Bu fakülteyi silmek istediğine emin misin? Bağlı tüm bölümler ve dersler de silinir!')) return;
    const { data: sonuc, error } = await sb.rpc('admin_fakulte_sil', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Fakülte silindi.', 'hata'); fakulteleriYukle(); fakulteSelectDoldur();
}

async function bolumleriYukle() {
    const icerik = document.getElementById('bolum-tablo-icerik');
    icerik.innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    const filtreFakulte = document.getElementById('bolum-filtre-fakulte').value;
    let query = sb.from('bolumler').select('id, ad, fakulteler(ad)').order('ad');
    if (filtreFakulte) query = query.eq('fakulte_id', filtreFakulte);
    const { data } = await query;
    if (!data || !data.length) { icerik.innerHTML = '<div class="bos-mesaj">Bölüm yok.</div>'; return; }
    icerik.innerHTML = `<table><thead><tr><th>Bölüm Adı</th><th>Fakülte</th><th>Sil</th></tr></thead><tbody>
        ${data.map(b => `<tr>
            <td>${escHtml(b.ad)}</td>
            <td style="font-size:0.82em;color:var(--muted)">${escHtml(b.fakulteler?.ad||'—')}</td>
            <td><button class="btn btn-kirmizi" data-nk-click="bolumSil" data-nk-click-arg0="${b.id}">✕</button></td>
        </tr>`).join('')}
    </tbody></table>`;
}

async function bolumEkle() {
    const fakulteId = document.getElementById('bolum-fakulte-sec').value;
    const ad = document.getElementById('yeni-bolum-adi').value.trim();
    if (!fakulteId) { bildirimGoster('Fakülte seçin.', 'hata'); return; }
    if (!ad) { bildirimGoster('Bölüm adı boş olamaz.', 'hata'); return; }
    const { data: sonuc, error } = await sb.rpc('admin_bolum_ekle', { p_admin_token: adminToken(), p_ad: ad, p_fakulte_id: fakulteId });
    if (error) { bildirimGoster('Hata: '+error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    document.getElementById('yeni-bolum-adi').value = '';
    bildirimGoster('Bölüm eklendi ✓', 'basari'); bolumleriYukle();
}

async function bolumSil(id) {
    if (!confirm('Bu bölümü silmek istediğine emin misin?')) return;
    const { data: sonuc, error } = await sb.rpc('admin_bolum_sil', { p_admin_token: adminToken(), p_id: id });
    if (error) { bildirimGoster('Hata: ' + error.message, 'hata'); return; }
    if (adminYetkisizIseGirisEkraninaDon(sonuc)) return;
    bildirimGoster('Bölüm silindi.', 'hata'); bolumleriYukle();
}

// ── CSV EXPORT ──
function csvSatirOlustur(obj) {
    return Object.values(obj).map(v => {
        if (v === null || v === undefined) return '';
        // jsonb sütunlar (ör. anket_yanitlari.yanitlar) supabase-js'ten dizi/obje olarak gelir;
        // String() bunları "[object Object]" gibi anlamsız bir metne çevirir — onun yerine
        // geçerli bir JSON metni yazalım ki hücrede gerçek veri görünsün.
        const s = (typeof v === 'object' ? JSON.stringify(v) : String(v)).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    }).join(',');
}
function csvIndir(icerik, dosyaAdi) {
    const blob = new Blob(['\uFEFF' + icerik], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = dosyaAdi; a.click();
    URL.revokeObjectURL(url);
}
async function csvExport(tablo) {
    const mesaj = document.getElementById('csv-mesaj');
    mesaj.textContent = '⏳ Veriler çekiliyor...';
    try {
        // tumSatirlariCek'teki gibi bir üst sınır: tablo sürekli büyüyen bir log tablosuysa
        // (ör. hesaplama_loglari) bu döngü sınırsız büyüyüp tarayıcı belleğini zorlamasın.
        // v6: hesaplama_loglari / anket_yanitlari (ve paylasim_loglari / sayfa_goruntuleme)
        // artık anon'a kapalı, admin_tablo_dump RPC'si üzerinden okunuyor. ders_verileri ve
        // duyurular hâlâ herkese açık okunabildiği için onlar doğrudan tablo sorgusuyla kalıyor.
        const KILITLI_TABLOLAR = ['hesaplama_loglari', 'anket_yanitlari', 'paylasim_loglari', 'sayfa_goruntuleme'];
        let tumVeri = [], sayfa = 0, limit = 1000;
        while (sayfa < 200) {
            let data, error;
            if (KILITLI_TABLOLAR.includes(tablo)) {
                ({ data, error } = await sb.rpc('admin_tablo_dump', {
                    p_admin_token: adminToken(), p_tablo: tablo, p_limit: limit, p_offset: sayfa*limit
                }));
            } else {
                ({ data, error } = await sb.from(tablo).select('*').range(sayfa*limit, (sayfa+1)*limit-1));
            }
            if (error) { if (oturumSuresiDolduMuKontrolEt(error.message)) return; throw error; }
            if (!data || !data.length) break;
            tumVeri = tumVeri.concat(data);
            if (data.length < limit) break;
            sayfa++;
        }
        if (!tumVeri.length) { mesaj.textContent = '⚠️ Veri bulunamadı.'; return; }
        const basliklar = Object.keys(tumVeri[0]).join(',');
        const satirlar = tumVeri.map(csvSatirOlustur).join('\n');
        csvIndir(basliklar + '\n' + satirlar, `${tablo}_${new Date().toISOString().slice(0,10)}.csv`);
        mesaj.textContent = `✅ ${tumVeri.length.toLocaleString('tr-TR')} kayıt indirildi.`;
        setTimeout(() => { mesaj.textContent = ''; }, 3000);
    } catch(e) { mesaj.textContent = '❌ Hata: ' + e.message; }
}
// admin_ano_gruplari_getir'i sayfalayarak TÜM ANO gruplarını (ders adlarıyla birlikte) çeken
// ortak yardımcı — v5'ten sonra ano_hesaplama_gruplari/ano_ders_loglari anon'a kapalı olduğu
// için hem istatistik ekranı hem CSV export artık bu RPC üzerinden okuyor.
async function tumAnoGruplariniCek() {
    let tumVeri = [], sayfa = 0, limit = 1000;
    while (sayfa < 200) {
        const { data, error } = await sb.rpc('admin_ano_gruplari_getir', {
            p_admin_token: adminToken(), p_limit: limit, p_offset: sayfa * limit
        });
        if (error) {
            if (oturumSuresiDolduMuKontrolEt(error.message)) throw new Error('yetkisiz');
            throw error;
        }
        if (!data || !data.length) break;
        tumVeri = tumVeri.concat(data);
        if (data.length < limit) break;
        sayfa++;
    }
    return tumVeri;
}

async function csvExportAno() {
    const mesaj = document.getElementById('csv-mesaj');
    mesaj.textContent = '⏳ ANO verileri çekiliyor...';
    try {
        const tumVeri = await tumAnoGruplariniCek();
        if (!tumVeri.length) { mesaj.textContent = '⚠️ Veri bulunamadı.'; return; }
        const satirlar = tumVeri.map(g => {
            // ders_adi serbest metin olduğu için içinde çift tırnak geçebilir — CSV'de bunu
            // ikiye katlamazsak (RFC 4180) hücre sınırı bozulur, sonraki sütunlar kayar.
            const dersler = (g.dersler||[]).join(' | ').replace(/"/g, '""');
            return [g.id, g.ano_degeri, g.toplam_kredi, g.olusturulma_tarihi, `"${dersler}"`].join(',');
        });
        csvIndir('id,ano_degeri,toplam_kredi,olusturulma_tarihi,dersler\n' + satirlar.join('\n'), `ano_gruplari_${new Date().toISOString().slice(0,10)}.csv`);
        mesaj.textContent = `✅ ${tumVeri.length.toLocaleString('tr-TR')} kayıt indirildi.`;
        setTimeout(() => { mesaj.textContent = ''; }, 3000);
    } catch(e) { mesaj.textContent = '❌ Hata: ' + e.message; }
}

// ── ANO DERS ANALİZİ ──
// Tasarım: "Toplam Hesaplama", "Ort. ANO", "Benzersiz Ders", "Top 15 Ders" gibi tüm özet
// istatistikler TÜM kayıtlar üzerinden hesaplanır (join'siz, tek sütunlu, sayfalanmış sorgularla —
// böylece 18 binin üzerindeki kayıt sayısında bile ne zaman aşımı ne de ağır bir sayfa yükü olur).
// Aşağıdaki tablo ise sadece en son 10 hesaplamayı (ders adlarıyla birlikte) gösteren kısa bir
// "Son Hesaplamalar" listesidir — tüm kayıtları tek tabloda basmak hem gereksiz hem yavaş olurdu.
let anoDersSonKayitlar = [];
let anoGercekToplamHesaplama = 0;
let anoDersGercekToplam = 0;
let anoDersOrtAno = '—';
let anoDersBenzersizSayisi = 0;
let anoDersAdliGrupSayisi = 0;
let anoDersFrekans = {};

// range() ile sayfalayarak bir tablonun TÜM satırlarını çeken küçük yardımcı.
// pageSize=1000 (Supabase'in tipik sayfa üst sınırı), guvenlikAmacliUstSinir ise sonsuz döngüye
// karşı bir emniyet (örn. 100 sayfa = 100.000 satır — bu sınıra normal şartlarda hiç ulaşılmaz).
async function tumSatirlariCek(tabloAdi, secim) {
    const sonuc = [];
    const pageSize = 1000;
    for (let sayfa = 0; sayfa < 100; sayfa++) {
        const { data, error } = await sb.from(tabloAdi).select(secim).range(sayfa*pageSize, (sayfa+1)*pageSize - 1);
        if (error) throw error;
        if (!data || !data.length) break;
        sonuc.push(...data);
        if (data.length < pageSize) break;
    }
    return sonuc;
}

async function anoDersAnalizYukle() {
    document.getElementById('ano-ders-stat-kartlar').innerHTML = '<div style="color:var(--muted);font-size:0.9em;padding:8px;">Yükleniyor...</div>';
    document.getElementById('ano-ders-tablo-icerik').innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    try {
        // 0) Gerçek TOPLAM ANO hesaplaması sayısı — ders adı girilsin girilmesin, hesaplanan HER ANO
        //    burada (hesaplama_loglari, sekme='ano') loglanıyor. ano_hesaplama_gruplari ise SADECE
        //    en az bir ders adı girilen hesaplamalarda ayrıca bir kayıt alıyor (script.js'te
        //    anoDersGrupLogKaydet yalnızca dersAdlari.length > 0 iken çağrılıyor) — bu yüzden bu iki
        //    sayı KASITLI olarak farklı: biri "tüm ANO hesaplamaları", diğeri "ders adı da girilenler".
        const { data: gercekAnoToplamSayi, error: anoToplamErr } = await sb.rpc('admin_log_sayisi', {
            p_admin_token: adminToken(), p_tablo: 'hesaplama_loglari', p_filtre: { sekme: 'ano' }
        });
        if (anoToplamErr) { if (oturumSuresiDolduMuKontrolEt(anoToplamErr.message)) return; throw anoToplamErr; }
        anoGercekToplamHesaplama = gercekAnoToplamSayi || 0;

        // v5: ano_hesaplama_gruplari / ano_ders_loglari artık anon'a kapalı (sadece admin
        // RPC'siyle okunabiliyor). Sayaç ucuz bir RPC'den, geri kalan tüm istatistikler
        // (ortalama ANO, ders frekansı, son 10 kayıt) TEK bir tumAnoGruplariniCek() sonucundan
        // çıkarılıyor.
        const { data: toplamGrup, error: countErr } = await sb.rpc('admin_ano_grup_sayisi', { p_admin_token: adminToken() });
        if (countErr) { if (oturumSuresiDolduMuKontrolEt(countErr.message)) return; throw countErr; }
        anoDersGercekToplam = toplamGrup || 0;

        const tumGruplar = await tumAnoGruplariniCek();

        let toplamAno = 0, anoAdedi = 0;
        const frekans = {}; const benzersizSet = new Set(); const grupIdSet = new Set();
        tumGruplar.forEach(g => {
            if (g.ano_degeri != null) { toplamAno += g.ano_degeri; anoAdedi++; }
            (g.dersler || []).forEach(dersAdi => {
                if (!dersAdi) return;
                const key = dersAdi.trim().toLowerCase();
                if (!frekans[key]) frekans[key] = { goruntu: dersAdi.trim(), sayi: 0 };
                frekans[key].sayi++;
                benzersizSet.add(key);
                grupIdSet.add(g.id);
            });
        });
        anoDersOrtAno = anoAdedi ? (toplamAno/anoAdedi).toFixed(2) : '—';
        anoDersFrekans = frekans;
        anoDersBenzersizSayisi = benzersizSet.size;
        anoDersAdliGrupSayisi = grupIdSet.size;

        // Son 10 hesaplama — tumAnoGruplariniCek() zaten id'ye göre azalan sırada döndüğü için
        // ilk 10 kayıt en yeni kayıtlardır.
        anoDersSonKayitlar = tumGruplar.slice(0, 10).map(g => ({
            id: g.id, ano: g.ano_degeri, kredi: g.toplam_kredi,
            tarih: g.olusturulma_tarihi, dersler: g.dersler || []
        }));

        anoDersStat();
        anoDersGrafik();
        anoDersTablo(anoDersSonKayitlar);
    } catch(e) {
        const zamanAsimiMi = /timeout/i.test(e.message || '');
        const mesaj = zamanAsimiMi
            ? 'Bu sorgu veritabanında zaman aşımına uğruyor (statement timeout).'
            : `Hata: ${e.message}`;
        document.getElementById('ano-ders-stat-kartlar').innerHTML = '';
        document.getElementById('ano-ders-tablo-icerik').innerHTML = `<div class="bos-mesaj">${mesaj}</div>`;
    }
}

// ── NOT YAKALA (OYUN) İSTATİSTİKLERİ ──
function oyunEscapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
}
async function oyunIstatistikYukle() {
    document.getElementById('oyun-stat-kartlar').innerHTML = '<div style="color:var(--muted);font-size:0.9em;padding:8px;">Yükleniyor...</div>';
    document.getElementById('oyun-oyuncu-tablo-icerik').innerHTML = '<div class="yukleniyor">Yükleniyor...</div>';
    try {
        const { data, error } = await sb.rpc('ny_admin_istatistik', { p_admin_token: adminToken() });
        if (error) { if (oturumSuresiDolduMuKontrolEt(error.message)) return; throw error; }
        if (adminYetkisizIseGirisEkraninaDon(data)) return;

        const toplamOyun = (data && data.toplam_oyun) || 0;
        const kayitliOyuncu = (data && data.kayitli_oyuncu_sayisi) || 0;
        const misafirOyun = (data && data.misafir_oyun_sayisi) || 0;
        const oyuncular = (data && data.oyuncular) || [];

        document.getElementById('oyun-stat-kartlar').innerHTML = `
            <div class="stat-karti"><div class="stat-karti-baslik">🎮 Toplam Oynanma</div><div class="stat-karti-deger">${toplamOyun.toLocaleString('tr-TR')}</div><div class="stat-karti-alt">kayıtlı + misafir, tüm oynanışlar</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">👤 Kayıtlı Oyuncu</div><div class="stat-karti-deger">${kayitliOyuncu.toLocaleString('tr-TR')}</div><div class="stat-karti-alt">hesap açmış oyuncu sayısı</div></div>
            <div class="stat-karti"><div class="stat-karti-baslik">🕶️ Misafir Oynanma</div><div class="stat-karti-deger">${misafirOyun.toLocaleString('tr-TR')}</div><div class="stat-karti-alt">giriş yapmadan oynanan oyunlar</div></div>`;

        if (!oyuncular.length) {
            document.getElementById('oyun-oyuncu-tablo-icerik').innerHTML = '<div class="bos-mesaj">Henüz kayıtlı bir oyuncu skor göndermemiş.</div>';
            return;
        }
        const satirlar = oyuncular.map(o => `<tr><td>${oyunEscapeHtml(o.kullanici_adi)}</td><td>${(o.oyun_sayisi||0).toLocaleString('tr-TR')}</td><td>${(o.en_yuksek_skor||0).toLocaleString('tr-TR')}</td></tr>`).join('');
        document.getElementById('oyun-oyuncu-tablo-icerik').innerHTML =
            `<table><thead><tr><th>Kullanıcı Adı</th><th>Oynama Sayısı</th><th>En Yüksek Skor</th></tr></thead><tbody>${satirlar}</tbody></table>`;
    } catch (e) {
        document.getElementById('oyun-stat-kartlar').innerHTML = '';
        document.getElementById('oyun-oyuncu-tablo-icerik').innerHTML = `<div class="bos-mesaj">Hata: ${oyunEscapeHtml(e.message)}</div>`;
    }
}
function anoDersStat() {
    const girilenOran = anoGercekToplamHesaplama ? ((anoDersAdliGrupSayisi/anoGercekToplamHesaplama)*100).toFixed(0) : 0;
    document.getElementById('ano-ders-stat-kartlar').innerHTML = `
        <div class="stat-karti"><div class="stat-karti-baslik">Toplam ANO Hesaplaması</div><div class="stat-karti-deger">${anoGercekToplamHesaplama.toLocaleString('tr-TR')}</div><div class="stat-karti-alt">ders adı girilsin girilmesin, tüm ANO hesaplamaları</div></div>
        <div class="stat-karti"><div class="stat-karti-baslik">Ders Adı Girilen</div><div class="stat-karti-deger">${anoDersAdliGrupSayisi.toLocaleString('tr-TR')}</div><div class="stat-karti-alt">%${girilenOran} — en az 1 ders adı girilen hesaplamalar</div></div>
        <div class="stat-karti"><div class="stat-karti-baslik">Benzersiz Ders</div><div class="stat-karti-deger">${anoDersBenzersizSayisi.toLocaleString('tr-TR')}</div><div class="stat-karti-alt">farklı ders adı, ders girilen kayıtlarda</div></div>
        <div class="stat-karti"><div class="stat-karti-baslik">Ort. ANO (Ders Girilenler)</div><div class="stat-karti-deger">${anoDersOrtAno}</div><div class="stat-karti-alt">yalnızca ders adı girilen ${anoDersGercekToplam.toLocaleString('tr-TR')} hesaplama üzerinden</div></div>`;
}
function anoDersGrafik() {
    const sirali = Object.values(anoDersFrekans).sort((a,b) => b.sayi-a.sayi).slice(0,15);
    if (chartInstances['anoDersChart']) chartInstances['anoDersChart'].destroy();
    chartInstances['anoDersChart'] = new Chart(document.getElementById('anoDersChart'), {
        type: 'bar',
        data: { labels: sirali.map(d=>d.goruntu), datasets: [{ label:'Kullanım', data: sirali.map(d=>d.sayi), backgroundColor:'#006FEE', borderRadius:4 }] },
        options: { indexAxis:'y', plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: i => ` ${i.raw} kez girildi` } } },
            scales:{ x:{ticks:{color:'#71717a'},grid:{color:'#e4e4e7'},beginAtZero:true}, y:{ticks:{color:'#18181b',font:{size:11}},grid:{display:false}} } }
    });
}
function anoDersTablo(veri) {
    if (!veri.length) { document.getElementById('ano-ders-tablo-icerik').innerHTML = '<div class="bos-mesaj">Henüz veri yok.</div>'; return; }
    const satirlar = veri.map(g => {
        const tarih = g.tarih ? new Date(g.tarih).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
        const dersMetin = g.dersler.length > 0
            ? g.dersler.map(d=>`<span style="display:inline-block;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 7px;font-size:0.78em;margin:2px 2px 2px 0;">${escHtml(d)}</span>`).join('')
            : '<span style="color:var(--muted);font-size:0.82em;">—</span>';
        const anoStyle = !g.ano?'':g.ano>=3.0?'color:var(--green)':g.ano>=2.0?'color:var(--orange)':'color:var(--red)';
        return `<tr>
            <td style="font-weight:700;${anoStyle}">${g.ano!=null?parseFloat(g.ano).toFixed(2):'—'}</td>
            <td>${g.kredi!=null?g.kredi+' kr':'—'}</td>
            <td>${dersMetin}</td>
            <td style="white-space:nowrap;color:var(--muted);font-size:0.82em;">${tarih}</td>
        </tr>`;
    }).join('');
    document.getElementById('ano-ders-tablo-icerik').innerHTML = `
        <table><thead><tr><th>ANO</th><th>Kredi</th><th>Dersler</th><th>Tarih</th></tr></thead><tbody>${satirlar}</tbody></table>`;
}

// ── AYARLAR ──
async function sifreDegistir() {
    const mevcut = document.getElementById('mevcut-sifre').value;
    const yeni = document.getElementById('yeni-sifre').value;
    const yeniTekrar = document.getElementById('yeni-sifre-tekrar').value;
    const mesajEl = document.getElementById('sifre-mesaj');
    if (!mevcut || !yeni || !yeniTekrar) { mesajEl.style.color='var(--red)'; mesajEl.textContent='Tüm alanları doldurun.'; return; }
    if (yeni !== yeniTekrar) { mesajEl.style.color='var(--red)'; mesajEl.textContent='Yeni şifreler eşleşmiyor.'; return; }
    if (yeni.length < 6) { mesajEl.style.color='var(--red)'; mesajEl.textContent='Şifre en az 6 karakter olmalı.'; return; }
    // Aynı şekilde şifre değişimi de artık tek bir RPC çağrısıyla sunucu tarafında doğrulanıp
    // güncelleniyor — mevcut şifre hiçbir zaman düz metin olarak client'a dönmüyor.
    const { data: basariliMi, error } = await sb.rpc('change_admin_password', { p_admin_token: adminToken(), current_attempt: mevcut, new_password: yeni });
    if (error) { if (oturumSuresiDolduMuKontrolEt(error.message)) return; mesajEl.style.color='var(--red)'; mesajEl.textContent='❌ Şifre güncellenemedi: ' + error.message; return; }
    if (basariliMi !== true) { mesajEl.style.color='var(--red)'; mesajEl.textContent='❌ Mevcut şifre yanlış.'; return; }
    mesajEl.style.color='var(--green)'; mesajEl.textContent='✓ Şifre güncellendi!';
    document.getElementById('mevcut-sifre').value='';
    document.getElementById('yeni-sifre').value='';
    document.getElementById('yeni-sifre-tekrar').value='';
}

// ── BİLDİRİM ──
function bildirimGoster(mesaj, tur) {
    const el = document.createElement('div');
    el.className = `bildirim bildirim-${tur==='basari'?'basari':'hata'}`;
    el.textContent = mesaj;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

document.addEventListener('keydown', e => { if (e.key==='Escape') modalKapat(); });
