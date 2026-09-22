'use strict';
// CSP uyumlu bildirimsel olay köprüsü. data-nk-* yalnızca bu izinli işlevleri çağırabilir.
const NK_OLAY_ISLEMLERI = new Set(["adminDuzeltmeFiltresiDegisti","adminDuzeltmeKarar","adminDuzeltmeSayfaDegistir","adminDuzeltmeTalepleriniYukle","adminSoruAramaPlanla","adminSoruFiltresiDegisti","agnoDonemKaydet","agnoDonemSil","agnoDonemYukle","agnoGirisAc","agnoHesapla","agnoKayitliDonemleriYukle","agnoPlanDersEkle","agnoPlanDersSil","agnoSonucuGizle","agnoYeniDonem","anketDurumDegistir","anketDuzenle","anketDuzenlemeIptal","anketGonder","anketKaydet","anketModalAc","anketModalKapat","anketPillKapat","anketSecenekEkle","anketSecenekGuncelle","anketSecenekSecildi","anketSecenekSil","anketSil","anketSoruEkle","anketSoruMetniGuncelle","anketSoruSil","anketSoruTipiGuncelle","anketSoruZorunluGuncelle","anketYanitlariGoster","anketleriYukle","anoDersAnalizYukle","aralikDegisti","bildirimFiltresiDegisti","bildirimKapat","bildirimSayfaDegistir","bildirimleriYukle","bolumEkle","bolumSil","bolumleriYukle","cikisYap","csvExport","csvExportAno","dersDuzenleModal","dersFiltreFakulteDegisti","dersSecimSifirla","dersVeriModalPaylasaGit","dersiKaydet","dersiOnayla","dersiReddet","dersleriYukle","dinamikDuyuruKapat","dinamikDuyuruToggle","duyuruDurumDegistir","duyuruDuzenle","duyuruDuzenlemeIptal","duyuruKaydet","duyuruKutuAlanGuncelle","duyuruKutuEkle","duyuruKutuSil","duyuruOnizlemeGuncelle","duyuruSil","duyurulariYukle","fakulteEkle","fakulteSil","fakulteleriYukle","ganoDersEkle","ganoDersSil","ganoHesaplaButon","ganoSonucGecersizKil","girisYap","hesapButonTiklandi","hesapCikisYap","hsAuthGoster","hsDuzeltmeModalAc","hsDuzeltmeModalKapat","hsDuzeltmeTalebiIptal","hsElementAc","hsGirisModalAc","hsGirisModalKapat","hsLbKapat","hsLbNav","hsLbZoomAyarla","hsLbZoomSifirla","hsProfilModalAc","hsProfilModalKapat","hsProfilSekmeGoster","isletimOzetiYukle","istatistikleriYukle","platformOzetiYukle","modalAc","modalBolumYukle","modalDersYukle","modalKapat","modalVeriListele","modalVeriyiDoldur","moderasyonGecmisiGoster","moderasyonGecmisiKapat","moderasyonModalKapat","nkAdminDersAramaPlanla","nkAdminDersBirlestirAc","nkAdminDersBirlestirKapat","nkAdminDersBirlestirKaydet","nkAdminDersDuzenleAc","nkAdminDersModalKapat","nkAdminDersSayfaDegistir","nkAdminDersiKaydet","nkAdminDersiSil","nkAdminDersleriYukle","nkBildirimModalAc","nkBildirimModalKapat","nkBolumGridiGoster","nkBolumSec","nkDersGridiGoster","nkDersListesiniFiltrele","nkDersSayfasiDegistir","nkDersSec","nkDersleriSirala","nkElementBosalt","nkElementGizle","nkElementSil","nkFakulteGridiGoster","nkFakulteSec","nkOlayEngelle","nkSoruFiltresiDegistir","nkSoruIfadeDegistir","nkSoruSayfasiDegistir","nkSwitchTab","nkUyeVerileriniYukle","nkYeniDersFormunuGoster","nyEkranGoster","nyGirisIsteBitti","nyLiderlikGoster","nyLiderlikSekmeDegistir","nyModalAc","nyModalKapat","nyOyunuBaslat","onayliDersiSil","onayliDersleriFiltrele","onayliDersleriYukle","openTab","oyunIstatistikYukle","paylasimBolumYukle","paylasimDersSecildi","paylasimDersYukle","sekmeDegistir","sifreDegistir","sistemBilgiGoster","sistemBilgiKapat","sistemSecimiDegisti","soruBekleyenSayfaDegistir","soruModerasyonKaydet","soruTumSayfaDegistir","sorulariYukle","soruyuOnayla","soruyuReddet","soruyuSil","switchVeriTab","toggleInputFields","tumSorulariYukle","veriFiltreFakulteDegisti","veriGorunumDegistir","veriSil","verileriYukleGuncelGorunum"]);
function nkElementGizle(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function nkElementBosalt(id) { const el = document.getElementById(id); if (el) el.replaceChildren(); }
function nkOlayEngelle() { return false; }
function nkOlayArguman(element, value, event) {
    if (value === '@event') return event;
    if (value === '@this') return element;
    if (value === '@value') return element.value;
    if (value === '@null') return null;
    if (value.startsWith('#')) return Number(value.slice(1));
    if (value.startsWith('?')) return value.slice(1) === 'true';
    return value;
}
for (const type of ['click', 'change', 'input', 'keydown']) {
    document.addEventListener(type, event => {
        const element = event.target.closest?.('[data-nk-' + type + ']');
        if (!element) return;
        if (element.dataset['nk' + type[0].toUpperCase() + type.slice(1) + 'Self'] === 'true' && event.target !== element) return;
        const prefix = 'nk' + type[0].toUpperCase() + type.slice(1);
        if (element.dataset[prefix + 'Key'] && event.key !== element.dataset[prefix + 'Key']) return;
        if (element.dataset[prefix + 'Prevent'] === 'true') event.preventDefault();
        if (element.dataset[prefix + 'Stop'] === 'true') event.stopPropagation();
        const name = element.dataset['nk' + type[0].toUpperCase() + type.slice(1)];
        if (!NK_OLAY_ISLEMLERI.has(name)) return;
        const fn = window[name];
        if (typeof fn !== 'function') { console.error('[olay] İşlev bulunamadı:', name); return; }
        const args = [];
        for (let i = 0; Object.hasOwn(element.dataset, prefix + 'Arg' + i); i++)
            args.push(nkOlayArguman(element, element.dataset[prefix + 'Arg' + i], event));
        const result = fn.apply(element, args);
        if (result === false) { event.preventDefault(); event.stopPropagation(); }
    });
}


