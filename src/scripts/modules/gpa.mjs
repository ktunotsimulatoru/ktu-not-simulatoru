import { getSupabase } from './api.mjs';
import { escHtml } from './dom.mjs';
import { hsGirisModalAc, hsMevcutOturum } from './account.mjs';
import { hataKaydet } from './error-monitor.mjs';
import { AGNO_KATSAYILARI, AGNO_HARIC_NOTLAR, ganoHesaplaSaf } from './gpa-core.mjs';
import { hesaplamaLogKaydet } from './statistics.mjs';

let agnoSatirSayaci=0;
let agnoSeciliDonemId=null;
let agnoBaslatildi=false;

const NOT_ETIKETLERI={AA:'AA - 4.0',BA:'BA - 3.5',BB:'BB - 3.0',CB:'CB - 2.5',CC:'CC - 2.0',DC:'DC - 1.5',DD:'DD - 1.0',FD:'FD - 0.5',FF:'FF - 0.0',D:'D - Devamsız (0.0)',G:'G - Geçer (katılmaz)',K:'K - Kalır (katılmaz)'};

function agnoNotSecenekleri(secili='') {
    return [...Object.keys(AGNO_KATSAYILARI),...AGNO_HARIC_NOTLAR]
        .map(n=>`<option value="${n}" ${n===secili?'selected':''}>${NOT_ETIKETLERI[n]}</option>`).join('');
}
function agnoPlanDersEkle(veri={}) {
    const liste=document.getElementById('agno-plan-dersler'); if(!liste)return;
    const id=++agnoSatirSayaci;
    const satir=document.createElement('div'); satir.className='gano-ders-satir agno-plan-satir'; satir.id=`agno-plan-${id}`;
    satir.innerHTML=`<div class="gano-ders-icerik">
        <div class="form-group gano-ders-adi-grup"><label>Ders adı <span class="gano-opsiyonel">(opsiyonel)</span></label><input class="agno-ders-adi" type="text" maxlength="120" value="${escHtml(veri.ad||'')}" placeholder="Örn: Matematik II" data-nk-input="agnoSonucuGizle"></div>
        <div class="form-group gano-kredi-grup"><label>Kredi</label><input class="agno-ders-kredi" type="number" min="0.5" max="30" step="0.5" value="${veri.kredi??''}" placeholder="3" data-nk-input="agnoSonucuGizle"></div>
        <div class="form-group gano-not-grup"><label>Harf notu</label><select class="agno-ders-not" data-nk-change="agnoSonucuGizle"><option value="">Seç</option>${agnoNotSecenekleri(veri.not||'')}</select></div>
        <button type="button" class="gano-ders-sil-btn" aria-label="Dersi kaldır" data-nk-click="agnoPlanDersSil" data-nk-click-arg0="#${id}">✕</button>
    </div>`;
    liste.appendChild(satir); agnoSonucuGizle();
}
function agnoPlanDersSil(id){document.getElementById(`agno-plan-${id}`)?.remove();agnoSonucuGizle();}
function agnoSonucuGizle(){const el=document.getElementById('agno-sonuc');if(el)el.style.display='none';}
function agnoDersleriOku(){
    const sonuc=[];
    document.querySelectorAll('.agno-plan-satir').forEach((satir,index)=>{
        const ad=satir.querySelector('.agno-ders-adi').value.trim();
        const kredi=satir.querySelector('.agno-ders-kredi').value;
        const not=satir.querySelector('.agno-ders-not').value;
        if(!ad&&!kredi&&!not)return;
        if(!kredi||!not)throw new Error(`${index+1}. ders için kredi ve harf notu seçin.`);
        sonuc.push({ad,kredi:Number(kredi),not});
    });
    return sonuc;
}
function agnoGirdileriniOku(){return {mevcutAgno:document.getElementById('agno-mevcut').value,mevcutKredi:document.getElementById('agno-kredi').value,hedefAgno:document.getElementById('agno-hedef').value,dersler:agnoDersleriOku()};}
function agnoHesapla(){
    const el=document.getElementById('agno-sonuc'); if(!el)return;
    el.classList.remove('error-message');
    try{
        const r=ganoHesaplaSaf(agnoGirdileriniOku());
        if(!r.dersler.length)throw new Error('Planlanan dönem için en az bir ders girin.');
        const hedefHtml=!r.hedef?'':r.hedef.durum==='ulasilamaz'
            ? `<div class="agno-hedef-karti agno-hedef-uyari"><strong>${r.hedef.deger.toFixed(2)} hedefi bu kredi planıyla ulaşılamıyor.</strong><span>Gerekli dönem ortalaması ${r.hedef.gerekenAno.toFixed(2)}; alınabilecek en yüksek ortalama 4.00.</span></div>`
            :r.hedef.durum==='zaten_yeterli'
            ? `<div class="agno-hedef-karti"><strong>Hedef mevcut durumda korunuyor.</strong><span>Hedef için gereken dönem ortalaması 0.00 veya altında.</span></div>`
            :r.hedef.durum==='plan_kredisi_yok'
            ? `<div class="agno-hedef-karti agno-hedef-uyari"><strong>Hedef hesabı için ortalamaya katılan ders kredisi yok.</strong></div>`
            :`<div class="agno-hedef-karti"><strong>${r.hedef.deger.toFixed(2)} hedefi için gereken dönem ortalaması: ${r.hedef.gerekenAno.toFixed(2)}</strong><span>${r.planKredi} kredilik bu plan üzerinden hesaplandı.</span></div>`;
        el.innerHTML=`<div class="gano-sonuc-grid"><div class="gano-sonuc-kutu"><div class="gano-sonuc-etiket">Dönem ANO</div><div class="gano-sonuc-deger">${r.planAno==null?'—':r.planAno.toFixed(2)}</div><div class="gano-sonuc-alt">${r.planKredi} kredi</div></div><div class="gano-sonuc-kutu gano-agno-kutu"><div class="gano-sonuc-etiket">Tahmini yeni AGNO</div><div class="gano-sonuc-deger">${r.yeniAgno==null?'—':r.yeniAgno.toFixed(2)}</div><div class="gano-sonuc-alt">Toplam ${r.toplamKredi} kredi</div></div></div>${hedefHtml}`;
        el.style.display='block';
        if(r.planAno!==null)hesaplamaLogKaydet('ano',null,null,null,{ano:r.planAno,ders_sayisi:r.dersler.length,toplam_kredi:r.planKredi,basarisiz_sayi:r.dersler.filter(d=>['FD','FF','D'].includes(d.not)).length});
    }catch(error){el.textContent=error.message;el.classList.add('error-message');el.style.display='block';hataKaydet('gano','hesaplama',error.message);}
}

function agnoKayitMesaji(mesaj,hata=false){const el=document.getElementById('agno-kayit-mesaj');if(!el)return;el.textContent=mesaj;el.className=hata?'error-message':'nk-basari';}
function agnoGirisAc(){hsGirisModalAc('giris');}
async function agnoKayitDurumunuGuncelle(event){
    const giris=document.getElementById('agno-giris-cagrisi'),panel=document.getElementById('agno-kayit-paneli');
    if(!giris||!panel)return;
    const oturum=event?.detail?.oturum ?? hsMevcutOturum;
    giris.hidden=!!oturum; panel.hidden=!oturum;
    if(oturum)await agnoKayitliDonemleriYukle();
}
async function agnoKayitliDonemleriYukle(){
    const alan=document.getElementById('agno-kayitli-donemler');if(!alan||!hsMevcutOturum)return;
    alan.innerHTML='<p class="veri-yukle">Kaydedilen dönemler yükleniyor...</p>';
    const {data,error}=await getSupabase().from('kayitli_donemler').select('id,ad,akademik_yil,donem,dersler,mevcut_agno,mevcut_kredi,hedef_agno,guncelleme_tarihi').order('guncelleme_tarihi',{ascending:false});
    if(error){alan.innerHTML='<p class="error-message">Dönemler yüklenemedi.</p>';hataKaydet('veritabani','donem_listele',error.message);return;}
    if(!data?.length){alan.innerHTML='<p class="veri-bos">Henüz kaydedilmiş dönem yok.</p>';return;}
    alan.innerHTML=data.map(d=>`<article class="agno-kayit-karti"><div class="agno-kayit-bilgi"><strong>${escHtml(d.ad)}</strong><small>${d.akademik_yil}-${d.akademik_yil+1} · ${d.donem==='guz'?'Güz':d.donem==='bahar'?'Bahar':'Yaz'} · ${d.dersler.length} ders</small></div><div class="agno-kayit-eylemler"><button type="button" class="agno-kayit-ac-btn" data-nk-click="agnoDonemYukle" data-nk-click-arg0="${d.id}">Aç</button><button type="button" class="agno-kayit-sil-btn" data-nk-click="agnoDonemSil" data-nk-click-arg0="${d.id}">Sil</button></div></article>`).join('');
    alan._agnoVeri=data;
    const url=new URL(location.href),profilKaydi=url.searchParams.get('kayit');
    if(profilKaydi&&data.some(d=>String(d.id)===profilKaydi)){
        agnoDonemYukle(profilKaydi);url.searchParams.delete('kayit');history.replaceState(null,'',url.pathname+url.search+url.hash);
    }
}
function agnoDonemYukle(id){
    const data=document.getElementById('agno-kayitli-donemler')?._agnoVeri?.find(d=>d.id===id);if(!data)return;
    agnoSeciliDonemId=data.id;document.getElementById('agno-kayit-adi').value=data.ad;document.getElementById('agno-yil').value=data.akademik_yil;document.getElementById('agno-donem').value=data.donem;
    document.getElementById('agno-mevcut').value=data.mevcut_agno??'';document.getElementById('agno-kredi').value=data.mevcut_kredi??0;document.getElementById('agno-hedef').value=data.hedef_agno??'';
    document.getElementById('agno-plan-dersler').replaceChildren();agnoSatirSayaci=0;(data.dersler||[]).forEach(agnoPlanDersEkle);if(!data.dersler?.length)agnoPlanDersEkle();agnoHesapla();agnoKayitMesaji('Dönem açıldı. Değişiklikleri kaydedebilirsin.');
}
async function agnoDonemKaydet(){
    if(!hsMevcutOturum){agnoGirisAc();return;}
    try{
        const ad=document.getElementById('agno-kayit-adi').value.trim();if(!ad)throw new Error('Dönem adı girin.');
        const g=agnoGirdileriniOku();ganoHesaplaSaf(g);
        const kayit={kullanici_id:hsMevcutOturum.id,ad,akademik_yil:Number(document.getElementById('agno-yil').value),donem:document.getElementById('agno-donem').value,dersler:g.dersler,mevcut_agno:g.mevcutAgno===''?null:Number(g.mevcutAgno),mevcut_kredi:Number(g.mevcutKredi),hedef_agno:g.hedefAgno===''?null:Number(g.hedefAgno)};
        let sorgu=agnoSeciliDonemId?getSupabase().from('kayitli_donemler').update(kayit).eq('id',agnoSeciliDonemId):getSupabase().from('kayitli_donemler').insert(kayit).select('id').single();
        const {data,error}=await sorgu;if(error)throw error;if(data?.id)agnoSeciliDonemId=data.id;agnoKayitMesaji('Dönem hesabına kaydedildi.');await agnoKayitliDonemleriYukle();
    }catch(error){agnoKayitMesaji(error.message,true);hataKaydet('veritabani','donem_kaydet',error.message);}
}
function agnoYeniDonem(){agnoSeciliDonemId=null;document.getElementById('agno-kayit-adi').value='';agnoKayitMesaji('Yeni kayıt hazırlanıyor.');}
async function agnoDonemSil(id){
    if(!hsMevcutOturum||!confirm('Bu kayıtlı dönemi silmek istediğine emin misin?'))return;
    const {error}=await getSupabase().from('kayitli_donemler').delete().eq('id',id);if(error){agnoKayitMesaji(error.message,true);hataKaydet('veritabani','donem_sil',error.message);return;}
    if(agnoSeciliDonemId===id)agnoSeciliDonemId=null;agnoKayitMesaji('Dönem silindi.');await agnoKayitliDonemleriYukle();
}
function agnoSayfasiBaslat(){
    if(agnoBaslatildi||!document.getElementById('agnoPlanlayici'))return;agnoBaslatildi=true;
    const yil=document.getElementById('agno-yil'),simdi=new Date().getFullYear();for(let y=simdi+1;y>=2015;y--){const o=document.createElement('option');o.value=y;o.textContent=`${y}-${y+1}`;if(y===simdi)o.selected=true;yil.appendChild(o);}
    agnoPlanDersEkle();agnoPlanDersEkle();
    window.addEventListener('hesapDurumuDegisti',agnoKayitDurumunuGuncelle);agnoKayitDurumunuGuncelle();
}

export { agnoPlanDersEkle,agnoPlanDersSil,agnoSonucuGizle,agnoHesapla,agnoGirisAc,agnoDonemKaydet,agnoYeniDonem,agnoDonemYukle,agnoDonemSil,agnoKayitliDonemleriYukle,agnoSayfasiBaslat };
