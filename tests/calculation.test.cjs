const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let grade, required;
before(async () => {
    const core = await import('../src/scripts/modules/calculation-core.mjs');
    grade = core.hesaplaDersNotu;
    required = core.gerekenFinaliHesapla;
});
const ranks = { FF: 0, FD: .5, DD: 1, DC: 1.5, CC: 2, CB: 2.5, BB: 3, BA: 3.5, AA: 4 };

test('Mutlak BA: vize 70, final 85 yeterlidir; gereken final bunu aşmaz', () => {
    const settings = { araSinavKatkisi: 35, sistem: 'mutlak' };
    assert.equal(grade({ ...settings, finalNotu: 85 }).harfNotu, 'BA');
    assert.ok(required(settings, 'BA') <= 85);
});
test('Bağıl AA: mutlak karşılık sayesinde ulaşılabilen hedef imkânsız sayılmaz', () => {
    const settings = { araSinavKatkisi: 36, sistem: 'tablo1', ortalama: 79, standartSapma: 20 };
    assert.equal(grade({ ...settings, finalNotu: 99 }).harfNotu, 'AA');
    assert.ok(required(settings, 'AA') <= 99);
});
test('Final barajları ve HBN 30 sınırı korunur', () => {
    for (const minimumFinal of [45, 50, 60]) {
        assert.equal(grade({ araSinavKatkisi: 50, finalNotu: minimumFinal - .01, minimumFinal, sistem: 'mutlak' }).harfNotu, 'FF');
        assert.notEqual(grade({ araSinavKatkisi: 50, finalNotu: minimumFinal, minimumFinal, sistem: 'mutlak' }).harfNotu, 'FF');
    }
    assert.equal(grade({ araSinavKatkisi: 7.49, finalNotu: 45, sistem: 'tablo1', ortalama: 10, standartSapma: 5 }).harfNotu, 'FF');
    assert.notEqual(grade({ araSinavKatkisi: 7.5, finalNotu: 45, sistem: 'tablo1', ortalama: 10, standartSapma: 5 }).harfNotu, 'FF');
});
test('Sınıf ortalaması 80: standart sapma gerekmeden mutlak karşılık kullanılır', () => {
    assert.equal(grade({ araSinavKatkisi: 35, finalNotu: 85, ortalama: 80, sistem: 'tablo1', standartSapma: 0 }).harfNotu, 'BA');
});
test('T-skoru 0,5 eşiği yuvarlanır; mutlak not sınırları korunur', () => {
    const settings = { araSinavKatkisi: 25, sistem: 'tablo1', ortalama: 50, standartSapma: 10 };
    assert.equal(grade({ ...settings, finalNotu: 62.98 }).harfNotu, 'CB');
    assert.equal(grade({ ...settings, finalNotu: 63 }).harfNotu, 'BB');
    for (const [threshold, lower, upper] of [[37.5,'FD','DD'],[44.5,'DD','DC'],[49.5,'DC','CC'],[59.5,'CC','CB'],[69.5,'CB','BB'],[77.5,'BB','BA'],[85.5,'BA','AA']]) {
        const finalNotu = Math.max(45, threshold);
        const base = { sistem: 'mutlak', finalNotu, araSinavKatkisi: threshold - finalNotu * .5 };
        assert.equal(grade(base).harfNotu, upper);
        assert.equal(grade({ ...base, araSinavKatkisi: base.araSinavKatkisi - .01 }).harfNotu, lower);
    }
});
test('Tüm hedeflerde gereken final hedefe ulaşır; 0,01 altı ulaşmaz', () => {
    for (const sistem of ['mutlak', 'tablo1', 'tablo2'])
    for (const ortalama of [0, 42.5, 42.51, 47.5, 47.51, 52.5, 57.5, 62.5, 70, 79.99, 80])
    for (const standartSapma of [1, 10, 25])
    for (const araSinavKatkisi of [0, 7.49, 20, 35, 50])
    for (const minimumFinal of [45, 50, 60])
    for (const target of Object.keys(ranks)) {
        const settings = { sistem, ortalama, standartSapma, araSinavKatkisi, minimumFinal };
        const final = required(settings, target);
        const label = JSON.stringify({ ...settings, target, final });
        if (final === null) assert.ok(ranks[grade({ ...settings, finalNotu: 100 }).harfNotu] < ranks[target], label);
        else {
            assert.ok(ranks[grade({ ...settings, finalNotu: final }).harfNotu] >= ranks[target], label);
            if (final > 0) assert.ok(ranks[grade({ ...settings, finalNotu: (Math.round(final * 100) - 1) / 100 }).harfNotu] < ranks[target], label);
        }
    }
});
test('Geçersiz girdiler sessiz sonuç üretmez', () => {
    assert.throws(() => grade({ araSinavKatkisi: 20, finalNotu: Infinity, sistem: 'mutlak' }));
    assert.throws(() => grade({ araSinavKatkisi: 20, finalNotu: 50, ortalama: 40, standartSapma: 0 }));
    assert.throws(() => required({ araSinavKatkisi: 20, sistem: 'mutlak' }, 'XX'));
});
