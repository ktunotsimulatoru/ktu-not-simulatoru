const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const corePromise=import(pathToFileURL(path.resolve('supabase/functions/send-email/core.mjs')).href);
const config={resendKey:'resend-test',brevoKey:'brevo-test',fromAddress:'hesap@auth.ktunotsimulatoru.com',fromName:'KTÜ Not Simülatörü',timeoutMs:1000};
const signup={user:{email:'ogrenci@ogr.ktu.edu.tr'},email_data:{token:'123456',email_action_type:'signup'}};

test('Auth hook kayıt ve güvenli e-posta değişimi iletilerini doğru alıcılara üretir',async()=>{
    const {hookMesajlariniOlustur}=await corePromise;
    const messages=hookMesajlariniOlustur(signup);
    assert.equal(messages.length,1);assert.equal(messages[0].recipient,'ogrenci@ogr.ktu.edu.tr');
    assert.match(messages[0].subject,/doğrula/);assert.match(messages[0].text,/123456/);
    const change=hookMesajlariniOlustur({user:{email:'eski@ogr.ktu.edu.tr',new_email:'yeni@ogr.ktu.edu.tr'},
        email_data:{token:'111111',token_new:'222222',email_action_type:'email_change'}});
    assert.deepEqual(change.map(x=>[x.recipient,x.text.includes('111111')?'old':'new']),[
        ['eski@ogr.ktu.edu.tr','old'],['yeni@ogr.ktu.edu.tr','new']]);
    assert.throws(()=>hookMesajlariniOlustur({user:{email:'dis@ornek.com'},email_data:{token:'123456',email_action_type:'signup'}}),/gecersiz_hook_verisi/);
});

test('Resend başarılıysa Brevo çağrılmaz ve idempotency anahtarı gönderilir',async()=>{
    const {hookMesajlariniOlustur,yedekliGonder}=await corePromise;const calls=[];
    const result=await yedekliGonder(hookMesajlariniOlustur(signup)[0],config,async(url,options)=>{
        calls.push({url,options});return Response.json({id:'resend-id'},{status:200});
    });
    assert.equal(result.provider,'resend');assert.equal(calls.length,1);
    assert.match(calls[0].options.headers['Idempotency-Key'],/^auth-[0-9a-f]{64}$/);
});

test('Resend aylık kota hatasında aynı iletiyi Brevo üzerinden gönderir',async()=>{
    const {hookMesajlariniOlustur,yedekliGonder}=await corePromise;const calls=[];
    const result=await yedekliGonder(hookMesajlariniOlustur(signup)[0],config,async(url,options)=>{
        calls.push({url,body:JSON.parse(options.body)});
        if(url.includes('resend.com'))return Response.json({name:'monthly_quota_exceeded'},{status:429});
        return Response.json({messageId:'brevo-id'},{status:201});
    });
    assert.equal(result.provider,'brevo');assert.equal(result.primaryReason,'monthly_quota_exceeded');
    assert.equal(calls.length,2);assert.equal(calls[1].body.to[0].email,'ogrenci@ogr.ktu.edu.tr');
    assert.match(calls[1].body.textContent,/123456/);
});

test('Resend kalıcı yapılandırma hatası Brevo ile gizlenmez',async()=>{
    const {hookMesajlariniOlustur,yedekliGonder}=await corePromise;let calls=0;
    await assert.rejects(yedekliGonder(hookMesajlariniOlustur(signup)[0],config,async()=>{
        calls++;return Response.json({name:'validation_error'},{status:403});
    }),/resend_kalici_hata:validation_error/);
    assert.equal(calls,1);
});

test('İki sağlayıcı da geçici olarak çalışmıyorsa hook başarı dönmez',async()=>{
    const {hookMesajlariniOlustur,yedekliGonder}=await corePromise;let calls=0;
    await assert.rejects(yedekliGonder(hookMesajlariniOlustur(signup)[0],config,async(url)=>{
        calls++;return url.includes('resend.com')?Response.json({name:'service_unavailable'},{status:503}):Response.json({code:'not_enough_credit'},{status:402});
    }),/tum_saglayicilar_basarisiz/);
    assert.equal(calls,2);
});
