'use strict';
(function (root) {
    function standartlastir(value) {
        const compact = String(value || '').trim().toLocaleUpperCase('tr-TR')
            .replace(/[ÇĞİÖŞÜ]/g, letter => ({ Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' })[letter])
            .replace(/[^A-Z0-9]/g, '');
        if (!compact) return null;
        return /^[A-Z]{2,10}[0-9]{2,4}[A-Z]?$/.test(compact) ? compact : null;
    }
    root.NKDersKodu = Object.freeze({ standartlastir });
})(window);
