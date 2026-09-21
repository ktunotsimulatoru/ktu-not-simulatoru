const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const acorn=require('acorn');
const vm=require('node:vm');
const {renderPage}=require('../tools/templates.cjs');
test('Ortak şablonlar her hesaplama sayfasında yalnızca doğru sekmeyi açar',()=>{
    const pages={'harf-notu-hesaplama':'harfNotu','final-notu-hesaplama':'gerekliNot','gecme-senaryolari-hesaplama':'gecmeSenaryo','donem-ortalamasi-hesaplama':'agnoPlanlayici','gano-hesaplama':'agnoPlanlayici'};
    for(const [page,active] of Object.entries(pages)){
        const html=renderPage(fs.readFileSync(`src/pages/${page}.html`,'utf8'));
        assert.equal((html.match(/class="tab-content active"/g)||[]).length,1);
        assert.ok(html.includes(`id="${active}" class="tab-content active"`),page);
        assert.equal((html.match(/<main\b/g)||[]).length,1);
        assert.equal((html.match(/<footer\b/g)||[]).length,1);
        assert.ok(!html.includes('{{>'));
    }
    assert.throws(()=>renderPage('{{> ../worker}}'),/Geçersiz/);
});
test('ANO ve AGNO tek sekmededir; profil ayrı sayfadır',()=>{
    const calculators=fs.readFileSync('src/templates/calculators.html','utf8');
    assert.ok(!calculators.includes('id="donemOrtalama"'));
    assert.ok(!calculators.includes('data-nk-click-arg1="donemOrtalama"'));
    assert.ok(calculators.includes('AGNO ve Dönem Ortalaması'));
    const profil=fs.readFileSync('src/pages/profil.html','utf8');
    for(const id of ['hs-profil-sayfa','hs-kullanici-adi-form','hs-profil-agno','hs-profil-cikmislar','hs-profil-katkilar','hs-duzeltme-modal'])assert.ok(profil.includes(`id="${id}"`),id);
    assert.ok(!fs.readFileSync('src/scripts/modules/account.mjs','utf8').includes('id="hsProfilModal"'));
});
test('Modal erişilebilirlik köprüsü odak döngüsü, Escape ve odağa dönüş sağlar',()=>{
    const source=fs.readFileSync('src/scripts/modal-accessibility.js','utf8');
    for(const gerekli of ['aria-modal','aria-labelledby','aria-hidden',"event.key==='Escape'","event.key!=='Tab'",'oncekiOdak','getClientRects().length>0'])assert.ok(source.includes(gerekli),gerekli);
    assert.match(source,/k\.target\.matches\?\.\('\.modal-overlay'\)/,'özellik gözlemcisi modal olmayan öğeleri değiştirmemeli');
    for(const page of fs.readdirSync('src/pages').filter(n=>n.endsWith('.html'))){
        const html=renderPage(fs.readFileSync('src/pages/'+page,'utf8'));
        assert.ok(html.includes('modal-accessibility.js'),page);
    }
});
test('Modüller yalnızca var olan açık dışa aktarımlara bağlanır; çekirdek DOM bağımlılığı taşımaz',()=>{
    const dir=path.resolve('src/scripts/modules');
    const modules=new Map(fs.readdirSync(dir).map(name=>[name,acorn.parse(fs.readFileSync(path.join(dir,name),'utf8'),{ecmaVersion:'latest',sourceType:'module'})]));
    for(const [name,ast] of modules){
        for(const imp of ast.body.filter(n=>n.type==='ImportDeclaration')){
            const target=modules.get(path.basename(imp.source.value));
            assert.ok(target,`${name}: ${imp.source.value}`);
            const exports=new Set(target.body.filter(n=>n.type==='ExportNamedDeclaration').flatMap(n=>n.specifiers.map(s=>s.exported.name)));
            for(const spec of imp.specifiers)assert.ok(exports.has(spec.imported.name),`${name}: ${spec.imported.name}`);
        }
    }
    const core=modules.get('calculation-core.mjs');
    assert.ok(!core.body.some(n=>n.type==='ImportDeclaration'));
    const source=fs.readFileSync(path.join(dir,'calculation-core.mjs'),'utf8');
    assert.ok(!/\b(document|window|getSupabase)\b/.test(source));
});
test('Ders kodu istemcide veritabanıyla aynı tek biçime çevrilir',()=>{
    const window={};
    vm.runInNewContext(fs.readFileSync('src/scripts/course-code.js','utf8'),{window});
    assert.equal(window.NKDersKodu.standartlastir(' blm-301 '),'BLM301');
    assert.equal(window.NKDersKodu.standartlastir('türk 202'),'TURK202');
    assert.equal(window.NKDersKodu.standartlastir('123'),null);
    assert.equal(window.NKDersKodu.standartlastir(''),null);
});
