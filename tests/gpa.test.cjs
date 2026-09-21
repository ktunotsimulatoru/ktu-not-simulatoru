const test=require('node:test');
const assert=require('node:assert/strict');

test('AGNO mevcut toplam puan ile yeni dönem puanlarını birleştirir',async()=>{
    const {ganoHesaplaSaf}=await import('../src/scripts/modules/gpa-core.mjs');
    const r=ganoHesaplaSaf({mevcutAgno:2.5,mevcutKredi:60,hedefAgno:2.75,dersler:[
        {ad:'A',kredi:3,not:'AA'},{ad:'B',kredi:3,not:'BB'},{ad:'Staj',kredi:2,not:'G'}
    ]});
    assert.equal(r.planKredi,6); assert.equal(r.planAno,3.5);
    assert.equal(Number(r.yeniAgno.toFixed(2)),2.59);
    assert.equal(Number(r.hedef.gerekenAno.toFixed(2)),5.25);
    assert.equal(r.hedef.durum,'ulasilamaz');
});

test('D notu sıfır katsayıyla katılır; G ve K krediye katılmaz',async()=>{
    const {ganoHesaplaSaf}=await import('../src/scripts/modules/gpa-core.mjs');
    const r=ganoHesaplaSaf({mevcutAgno:0,mevcutKredi:0,dersler:[
        {kredi:3,not:'AA'},{kredi:3,not:'D'},{kredi:8,not:'K'}
    ]});
    assert.equal(r.planKredi,6); assert.equal(r.planAno,2); assert.equal(r.yeniAgno,2);
});

test('Hedef için gereken dönem ortalaması ve sınırlar doğru hesaplanır',async()=>{
    const {ganoHesaplaSaf}=await import('../src/scripts/modules/gpa-core.mjs');
    const r=ganoHesaplaSaf({mevcutAgno:3,mevcutKredi:60,hedefAgno:3.1,dersler:[{kredi:30,not:'AA'}]});
    assert.equal(Number(r.hedef.gerekenAno.toFixed(2)),3.3); assert.equal(r.hedef.durum,'ulasilabilir');
    assert.throws(()=>ganoHesaplaSaf({mevcutAgno:4.1,mevcutKredi:1,dersler:[]}),/AGNO/);
    assert.throws(()=>ganoHesaplaSaf({mevcutAgno:'',mevcutKredi:30,dersler:[]}),/Mevcut kredi varsa mevcut AGNO/);
});
