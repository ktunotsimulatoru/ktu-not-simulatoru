const test=require('node:test');
const assert=require('node:assert/strict');

test('Ortak olay köprüsünden gelen sekme tıklaması belge currentTarget değerine bağımlı değildir',async()=>{
    const siniflar=()=>{const deger=new Set();return {add:x=>deger.add(x),remove:x=>deger.delete(x),contains:x=>deger.has(x)};};
    const tiklanan={classList:siniflar()};
    const icerik={style:{},classList:siniflar()};
    const digerIcerik={style:{},classList:siniflar()};
    const digerButon={classList:siniflar()};
    const oncekiDocument=global.document;
    global.document={
        getElementsByClassName(ad){return ad==='tab-content'?[icerik,digerIcerik]:[tiklanan,digerButon];},
        getElementById(id){return id==='hedef' ? icerik : null;}
    };
    try{
        const {openTab}=await import('../src/scripts/modules/calculator-ui.mjs');
        const belgeCurrentTarget={};
        openTab.call(tiklanan,{preventDefault(){},currentTarget:belgeCurrentTarget},'hedef');
        assert.equal(tiklanan.classList.contains('active'),true);
        assert.equal(icerik.classList.contains('active'),true);
        assert.equal(icerik.style.display,'block');
    }finally{global.document=oncekiDocument;}
});
