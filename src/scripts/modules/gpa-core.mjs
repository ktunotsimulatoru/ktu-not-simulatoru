const AGNO_KATSAYILARI = Object.freeze({
    AA:4, BA:3.5, BB:3, CB:2.5, CC:2, DC:1.5, DD:1, FD:0.5, FF:0, D:0
});
const AGNO_HARIC_NOTLAR = Object.freeze(['G','K']);

function sayi(value, ad, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(`${ad} ${min}-${max} arasında olmalı.`);
    return n;
}

function ganoHesaplaSaf({ mevcutAgno, mevcutKredi, hedefAgno = null, dersler = [] }) {
    const oncekiKredi = sayi(mevcutKredi, 'Mevcut kredi', 0, 9999);
    if (oncekiKredi > 0 && (mevcutAgno === '' || mevcutAgno == null)) throw new RangeError('Mevcut kredi varsa mevcut AGNO da girilmeli.');
    const oncekiAgno = oncekiKredi === 0 && (mevcutAgno === '' || mevcutAgno == null)
        ? 0 : sayi(mevcutAgno, 'Mevcut AGNO', 0, 4);
    if (!Array.isArray(dersler) || dersler.length > 50) throw new RangeError('Ders sayısı 0-50 arasında olmalı.');

    const temizDersler = dersler.map((ders, index) => {
        const kredi = sayi(ders.kredi, `${index + 1}. ders kredisi`, 0.5, 30);
        const not = String(ders.not || '').toUpperCase();
        if (!(not in AGNO_KATSAYILARI) && !AGNO_HARIC_NOTLAR.includes(not))
            throw new RangeError(`${index + 1}. dersin harf notu geçersiz.`);
        return { ad:String(ders.ad || '').trim().slice(0,120), kredi, not,
            dahil:!AGNO_HARIC_NOTLAR.includes(not), katsayi:AGNO_KATSAYILARI[not] ?? null };
    });
    const dahil = temizDersler.filter(d => d.dahil);
    const planKredi = dahil.reduce((sum,d) => sum+d.kredi,0);
    const planPuan = dahil.reduce((sum,d) => sum+d.kredi*d.katsayi,0);
    const planAno = planKredi ? planPuan/planKredi : null;
    const toplamKredi = oncekiKredi+planKredi;
    const yeniAgno = toplamKredi ? (oncekiAgno*oncekiKredi+planPuan)/toplamKredi : null;

    let hedef = null;
    if (hedefAgno !== '' && hedefAgno != null) {
        const deger = sayi(hedefAgno,'Hedef AGNO',0,4);
        const gerekenAno = planKredi ? (deger*toplamKredi-oncekiAgno*oncekiKredi)/planKredi : null;
        hedef = { deger, gerekenAno, durum:gerekenAno == null ? 'plan_kredisi_yok'
            : gerekenAno <= 0 ? 'zaten_yeterli' : gerekenAno > 4 ? 'ulasilamaz' : 'ulasilabilir' };
    }
    return { mevcutAgno:oncekiAgno, mevcutKredi:oncekiKredi, dersler:temizDersler,
        planKredi, planPuan, planAno, toplamKredi, yeniAgno, hedef };
}

export { AGNO_KATSAYILARI, AGNO_HARIC_NOTLAR, ganoHesaplaSaf };
