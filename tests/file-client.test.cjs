const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('Çok dosyalı yüklemede ikinci hata ilk rezervasyonu iptal eder',async()=>{
    const calls=[];
    const context=vm.createContext({console,window:{addEventListener(){}},document:{addEventListener(){}},
        NK_ELEMENT_WORKER_URL:'https://files.example',getSupabase:()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-token'}}})}}),
        fetch:async(url,options)=>{calls.push({url,options});return {ok:calls.length!==2,status:calls.length===2?429:200,
            json:async()=>calls.length===1?{basarili:true,yol:'first-path'}:{hata:'kota_asildi'}};}});
    vm.runInContext(fs.readFileSync('src/scripts/not-kutusu.js','utf8'),context);
    await assert.rejects(context.nkElementleriYukle([{name:'one.pdf',type:'application/pdf'},{name:'two.pdf',type:'application/pdf'}]),/kotan doldu/);
    assert.equal(calls.length,3);assert.equal(calls[2].url,'https://files.example/cancel');
    assert.deepEqual(JSON.parse(calls[2].options.body),{yollar:['first-path']});
    assert.equal(calls[2].options.headers.Authorization,'Bearer test-token');
});
test('Özel dosya açma: token sadece başlıkta; yabancı URL reddi ve çıkışta blob temizliği',async()=>{
    const listeners={},revoked=[],calls=[],popups=[];let sessionCalls=0;
    const url='https://not-kutusu.elements0.workers.dev/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf';
    class LocalURL extends URL {static createObjectURL(){return 'blob:local-test';}static revokeObjectURL(value){revoked.push(value);}}
    const window={getSupabase:()=>({auth:{getSession:async()=>{sessionCalls++;return {data:{session:{access_token:'secret-user-token'}}};}}}),
        addEventListener:(name,fn)=>{listeners[name]=fn;},open:()=>{const popup={document:{body:{}},location:{replace:value=>popup.destination=value}};popups.push(popup);return popup;}};
    const context=vm.createContext({window,URL:LocalURL,AbortController,console,setTimeout:()=>{},alert:()=>{},
        NKDosya:require('../src/scripts/dosya-guvenligi.js'),
        document:{addEventListener(){},querySelectorAll:()=>[]},
        IntersectionObserver:class {observe(){} unobserve(){}},
        fetch:async(value,options)=>{calls.push({value,options});return {ok:true,blob:async()=>new Blob(['%PDF-1.7'])};}});
    vm.runInContext(fs.readFileSync('src/scripts/dosya-erisim.js','utf8'),context);
    await window.NKDosyaErisim.ac(url);
    assert.equal(calls[0].value,url);assert.equal(calls[0].options.headers.Authorization,'Bearer secret-user-token');
    assert.equal(calls[0].options.cache,'no-store');assert.equal(popups[0].destination,'blob:local-test');assert.equal(popups[0].opener,null);
    await window.NKDosyaErisim.ac('https://evil.example/'+url.split('/').slice(-2).join('/'));
    assert.equal(calls.length,1);assert.match(popups[1].document.body.textContent,/Geçersiz/);
    listeners.pagehide();assert.deepEqual(revoked,['blob:local-test']);
    window.NKDosyaErisim.ayarla({adminToken:()=> 'secret-admin-token'});
    await window.NKDosyaErisim.ac(url);assert.equal(calls[1].options.headers['X-Admin-Token'],'secret-admin-token');
    assert.equal(sessionCalls,1);
});
