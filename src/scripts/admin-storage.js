(function () {
    'use strict';
    let cursor = null;
    let busy = false;
    const base = 'https://not-kutusu.elements0.workers.dev';
    async function listele(devam) {
        if (busy) return;
        busy = true;
        const area = document.getElementById('nk-depolama-liste');
        const status = document.getElementById('nk-depolama-durum');
        const next = document.getElementById('nk-depolama-devam');
        if (!devam) { cursor = null; area.replaceChildren(); }
        status.textContent = 'Depolama taranıyor…';
        next.disabled = true;
        try {
            const response = await fetch(base + '/inventory' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''),
                { headers: { 'X-Admin-Token': adminToken() }, cache: 'no-store' });
            if (!response.ok) throw new Error('Depolama raporu alınamadı.');
            const result = await response.json();
            for (const file of result.dosyalar) {
                const row = document.createElement('p');
                row.textContent = file.yol + ' · ' + (file.boyut / 1048576).toFixed(2) + ' MB · ' +
                    (file.referansli ? 'Soruya bağlı' : file.durum === 'kayitsiz' ? 'Kayıtsız' : file.durum);
                if (file.aday) {
                    const button = document.createElement('button');
                    button.type = 'button'; button.className = 'btn btn-kirmizi'; button.textContent = 'Sahipsiz dosyayı temizle';
                    button.addEventListener('click', async () => {
                        if (!confirm('Hiçbir soruya bağlı olmayan bu dosya kalıcı olarak silinmek üzere kuyruğa alınsın mı?')) return;
                        button.disabled = true;
                        try {
                            const response = await fetch(base + '/orphan-cleanup', { method: 'POST',
                                headers: { 'X-Admin-Token': adminToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ yol: file.yol }) });
                            if (!response.ok) throw new Error();
                            button.textContent = 'Temizlik kuyruğunda';
                        } catch { button.disabled = false; status.textContent = 'Dosya temizliğe alınamadı. Raporu yenileyin.'; }
                    });
                    row.append(' ', button);
                }
                area.append(row);
            }
            cursor = result.cursor;
            next.hidden = !cursor;
            status.textContent = cursor ? 'Bu sayfa tarandı; kalan dosyalar için devam edin.' : 'Tarama tamamlandı. Kayıtlı soru ekleri korunur; 24 saatten yeni sahipsiz dosyalar bekletilir.';
        } catch (error) { status.textContent = error.message; }
        finally { busy = false; next.disabled = false; }
    }
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('nk-depolama-tara').addEventListener('click', () => listele(false));
        document.getElementById('nk-depolama-devam').addEventListener('click', () => listele(true));
    });
})();
