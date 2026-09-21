import { getSupabase } from './api.mjs';
import { sbOnbellekOku, sbOnbellekYaz } from './cache.mjs';


async function sayfaGoruntulemeLogKaydet() {
    try {
        const referrerHam = document.referrer;
        let referrer = 'direkt';
        if (referrerHam) {
            try {
                const host = new URL(referrerHam).hostname.replace('www.', '');
                if (host.includes('google')) referrer = 'google';
                else if (host.includes('bing')) referrer = 'bing';
                else if (host.includes('yandex')) referrer = 'yandex';
                else if (host.includes('instagram')) referrer = 'instagram';
                else if (host.includes('twitter') || host.includes('x.com')) referrer = 'twitter';
                else if (host.includes('whatsapp')) referrer = 'whatsapp';
                else if (host.includes('t.me') || host.includes('telegram')) referrer = 'telegram';
                else referrer = host;
            } catch { referrer = 'diger'; }
        }
        await getSupabase().from('sayfa_goruntuleme').insert({
            is_mobile: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
            referrer
        });
    } catch (e) { /* sessizce geç */ }
}


// ============================================================
// HESAPLAMA LOGLAMA & İSTATİSTİKSEVER
// ============================================================

// ============================================================
// ENGAGEMENT TRACKING — tekrar_hesaplama & hesaplama_suresi
// ============================================================
const _sayfaYuklemZamani = Date.now();

const _sekmeSayaclari = {};
 // { 'harf': 3, 'gerekli': 1, ... }

function _engagementVerisiAl(sekme) {
    _sekmeSayaclari[sekme] = (_sekmeSayaclari[sekme] || 0) + 1;
    const sure = Math.round((Date.now() - _sayfaYuklemZamani) / 1000);
    return {
        tekrar_hesaplama: _sekmeSayaclari[sekme],
        hesaplama_suresi: Math.min(sure, 7200) // max 2 saat
    };
}


async function hesaplamaLogKaydet(sekme, harfNotu, vizeNotu, finalNotu, ekstra = {}) {
    try {
        const { tekrar_hesaplama, hesaplama_suresi } = _engagementVerisiAl(sekme);
        const insertData = { sekme, tekrar_hesaplama, hesaplama_suresi };
        if (harfNotu) insertData.harf_notu = harfNotu;
        if (vizeNotu !== null && vizeNotu !== undefined) insertData.vize_notu = Math.round(vizeNotu);
        if (finalNotu !== null && finalNotu !== undefined) insertData.final_notu = Math.round(finalNotu);
        if (ekstra.ano !== undefined)             insertData.ano             = parseFloat(ekstra.ano.toFixed(2));
        if (ekstra.ders_sayisi !== undefined)     insertData.ders_sayisi     = ekstra.ders_sayisi;
        if (ekstra.toplam_kredi !== undefined)    insertData.toplam_kredi    = ekstra.toplam_kredi;
        if (ekstra.basarisiz_sayi !== undefined)  insertData.basarisiz_sayi  = ekstra.basarisiz_sayi;
        if (ekstra.dc_sayi !== undefined)         insertData.dc_sayi         = ekstra.dc_sayi;
        if (ekstra.hedef_harf_notu !== undefined) insertData.hedef_harf_notu = ekstra.hedef_harf_notu;
        if (ekstra.sinif_ortalamasi !== undefined) insertData.sinif_ortalamasi = ekstra.sinif_ortalamasi;
        if (ekstra.std_sapma !== undefined)       insertData.std_sapma       = ekstra.std_sapma;
        if (ekstra.sistem_secimi !== undefined)   insertData.sistem_secimi   = ekstra.sistem_secimi;
        if (ekstra.fakulte_turu !== undefined)    insertData.fakulte_turu    = ekstra.fakulte_turu;
        // Ara Sınav Hesaplama Yöntemi (tek / detayli / mezuniyet) — sistem bazlı yöntem kullanım
        // istatistikleri için. Mezuniyet Sınavı'nın notu ise final_notu'ya KARIŞTIRILMAZ; kendi
        // sütununda (sinav_notu) tutulur ki genel "Ort. Final Notu" istatistiğini bozmasın.
        if (ekstra.giris_yontemi !== undefined)   insertData.giris_yontemi   = ekstra.giris_yontemi;
        if (ekstra.sinav_notu !== undefined && ekstra.sinav_notu !== null) insertData.sinav_notu = Math.round(ekstra.sinav_notu);
        insertData.is_mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        await getSupabase().from('hesaplama_loglari').insert(insertData);
    } catch (e) { /* sessizce geç */ }
}


async function anoDersGrupLogKaydet(anoDegeri, toplamKredi, dersAdlari) {
    try {
        const sb = getSupabase();
        // Önce grup oluştur
        const { data: grup, error: grupHata } = await sb
            .from('ano_hesaplama_gruplari')
            .insert({ ano_degeri: anoDegeri, toplam_kredi: toplamKredi })
            .select('id')
            .single();
        if (grupHata || !grup) return;
        // Sonra dersleri ekle
        const dersRows = dersAdlari.map(ad => ({ grup_id: grup.id, ders_adi: ad }));
        await sb.from('ano_ders_loglari').insert(dersRows);
    } catch (e) { /* sessizce geç */ }
}


async function istatistikleriYukle() {
    try {
        // v6 güvenlik güncellemesiyle hesaplama_loglari tablosundan anon/authenticated'in
        // doğrudan SELECT yetkisi kaldırıldı (bkz. supabase-admin-guvenlik-v6-log-tablolari.sql).
        // Bu genel/herkese-açık özet artık tek bir public RPC'den (genel_istatistikler) geliyor —
        // fonksiyon sadece toplam/ortalama gibi anonim özet değerler döndürüyor, hiçbir ham satır
        // (kişisel veri barındırmasa bile) client'a gelmiyor. Ayrıca eskiden vize/final en çok
        // girilenler ilk 1000 kayıtla, ANO ortalaması ise sayfalama ile client'ta hesaplanıyordu —
        // şimdi ikisi de sunucu tarafında TÜM kayıtlar üzerinden (group by / avg) hesaplanıyor.
        //
        // Bu widget her sayfada (index.html, harf-notu-hesaplama.html, not-kutusu.html, ...)
        // footer'da ortak olduğu için, sayfalar arası geçişte yeniden yükleniyormuş hissi
        // vermemesi için sessionStorage'da kısa süreliğine önbelleğe alınıyor (bkz. sbOnbellekOku/Yaz).
        const ONBELLEK_ANAHTARI = 'ktuGenelIstatistiklerOnbellek';
        const ONBELLEK_SURESI_MS = 5 * 60 * 1000;

        let fn = sbOnbellekOku(ONBELLEK_ANAHTARI, ONBELLEK_SURESI_MS);
        if (fn === null) {
            const sb = getSupabase();
            const { data, error } = await sb.rpc('genel_istatistikler');
            if (error) throw error;
            if (!data) return;
            fn = data;
            sbOnbellekYaz(ONBELLEK_ANAHTARI, fn);
        }

        const sekmeSayilari = {
            harf: fn.harf_sayisi || 0,
            gerekli: fn.gerekli_sayisi || 0,
            senaryo: fn.senaryo_sayisi || 0,
            ano: fn.ano_sayisi_sekme || 0
        };

        const harfSayac = fn.harf_sayac || {};
        const topHarfler = Object.entries(harfSayac)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([not]) => not);

        const topVize = fn.top_vize != null ? [String(fn.top_vize)] : null;
        const topFinal = fn.top_final != null ? [String(fn.top_final)] : null;
        const anoOrtalama = fn.ano_ortalama != null ? parseFloat(fn.ano_ortalama) : null;
        const anoSayisi = fn.ano_ortalama_sayisi || 0;

        istatistikleriGoster(fn.genel_toplam || 0, sekmeSayilari, topHarfler, topVize, topFinal, harfSayac, fn.final45_sayisi || 0, anoOrtalama, anoSayisi);

    } catch (e) {
        console.error('İstatistik yükleme hatası:', e);
    }
}


function istatistikleriGoster(toplam, sekmeler, topHarfler, topVize, topFinal, harfSayac, final45Sayisi, anoOrtalama, anoSayisi) {
    const el = document.getElementById('footer-istatistikler');
    if (!el) return;

    const harfBadge = (not) => not
        ? `<span class="stat-harf-badge stat-badge-${not.toLowerCase()}">${not}</span>`
        : '<span style="color:var(--small-text)">—</span>';

    const HARF_SIRALAMA = ['AA','BA','BB','CB','CC','DC','DD','FD','FF'];
    const HARF_RENKLER = {
        AA: '#28a745', BA: '#5cb85c', BB: '#82ca9c',
        CB: '#007bff', CC: '#17a2b8', DC: '#fd7e14',
        DD: '#ffc107', FD: '#dc3545', FF: '#a21427'
    };

    const grafikEtiketler = HARF_SIRALAMA.filter(h => harfSayac[h]);
    const grafikVeriler = grafikEtiketler.map(h => harfSayac[h]);
    const grafikRenkler = grafikEtiketler.map(h => HARF_RENKLER[h]);

    el.innerHTML = `
        <div class="stat-grid">
            <div class="stat-blok">
                <div class="stat-blok-baslik">🔢 Toplam Hesaplama</div>
                <div class="stat-buyuk">${toplam.toLocaleString('tr-TR')}</div>
                <div class="stat-alt-satirlar">
                    <span>Harf Notu: <strong>${sekmeler.harf.toLocaleString('tr-TR')}</strong></span>
                    <span>Gerekli Final: <strong>${sekmeler.gerekli.toLocaleString('tr-TR')}</strong></span>
                    <span>Senaryo: <strong>${sekmeler.senaryo.toLocaleString('tr-TR')}</strong></span>
                    <span>Dönem Ort.: <strong>${sekmeler.ano.toLocaleString('tr-TR')}</strong></span>
                </div>
            </div>
            <div class="stat-blok">
                <div class="stat-blok-baslik">🏆 En Çok Çıkan Notlar</div>
                <div class="stat-harfler">
                    <div class="stat-harf-item"><span class="stat-sira">1.</span>${harfBadge(topHarfler[0])}</div>
                    <div class="stat-harf-item"><span class="stat-sira">2.</span>${harfBadge(topHarfler[1])}</div>
                    <div class="stat-harf-item"><span class="stat-sira">3.</span>${harfBadge(topHarfler[2])}</div>
                </div>
            </div>
            <div class="stat-blok">
                <div class="stat-blok-baslik">📝 En Çok Girilen Notlar <span class="stat-kucuk-not">(Harf Notu Hesaplama)</span></div>
                <div class="stat-not-satirlar">
                    <div class="stat-not-satir">
                        <span class="stat-not-etiket">Vize</span>
                        <span class="stat-not-deger">${topVize ? topVize[0] : '—'}</span>
                    </div>
                    <div class="stat-not-satir">
                        <span class="stat-not-etiket">Final</span>
                        <span class="stat-not-deger">${topFinal ? topFinal[0] : '—'}</span>
                    </div>
                </div>
            </div>
            <div class="stat-blok">
                <div class="stat-blok-baslik">😅 "Finalden 45 Alırsam Ne Gelir?"</div>
                <div class="stat-buyuk">${final45Sayisi.toLocaleString('tr-TR')}</div>
                <div class="stat-alt-satirlar">
                    <span>kez hesaplandı</span>
                </div>
            </div>
            <div class="stat-blok">
                <div class="stat-blok-baslik">🎓 Ortalama ANO</div>
                <div class="stat-buyuk ${anoOrtalama !== null ? (anoOrtalama >= 3.0 ? 'stat-ano-iyi' : anoOrtalama >= 2.0 ? 'stat-ano-orta' : 'stat-ano-dusuk') : ''}">
                    ${anoOrtalama !== null ? anoOrtalama.toFixed(2) : '—'}
                </div>
                <div class="stat-alt-satirlar">
                    <span>${anoSayisi.toLocaleString('tr-TR')} hesaplamadan</span>
                </div>
            </div>
        </div>

        ${grafikEtiketler.length > 0 ? `
        <div class="stat-grafik-wrapper">
            <div class="stat-blok-baslik" style="margin-bottom:12px;">🍩 Harf Notu Dağılımı</div>
            <div class="stat-grafik-icerik">
                <div class="stat-pasta-container">
                    <canvas id="harfDagilimChart"></canvas>
                </div>
                <div class="stat-pasta-legend">
                    ${grafikEtiketler.map((h, i) => {
                        const yuzde = ((grafikVeriler[i] / grafikVeriler.reduce((a,b) => a+b, 0)) * 100).toFixed(1);
                        return `<div class="stat-legend-item">
                            <span class="stat-legend-renk" style="background:${grafikRenkler[i]}"></span>
                            <span class="stat-legend-etiket">${h}</span>
                            <span class="stat-legend-deger">${yuzde}%</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>` : ''}

        <div class="stat-gizlilik">
            🔒 Bu istatistikler tamamen anonimdir. Kişisel hiçbir veri (isim, öğrenci numarası, IP adresi vb.) toplanmamaktadır.
        </div>
        <div class="stat-kaynak-notu">📅 09.05.2026 tarihinden itibaren</div>
    `;

    if (grafikEtiketler.length > 0) {
        setTimeout(() => {
            const canvas = document.getElementById('harfDagilimChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: grafikEtiketler,
                    datasets: [{
                        data: grafikVeriler,
                        backgroundColor: grafikRenkler,
                        borderWidth: 2,
                        borderColor: getComputedStyle(document.documentElement)
                            .getPropertyValue('--main-bg').trim() || '#fff',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '60%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const toplam = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const yuzde = ((ctx.parsed / toplam) * 100).toFixed(1);
                                    return ` ${ctx.label}: ${ctx.parsed} hesaplama (${yuzde}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }, 100);
    }
}
export { sayfaGoruntulemeLogKaydet, _sayfaYuklemZamani, _sekmeSayaclari, _engagementVerisiAl, hesaplamaLogKaydet, anoDersGrupLogKaydet, istatistikleriYukle, istatistikleriGoster };
