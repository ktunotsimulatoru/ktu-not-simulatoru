import { getSupabase } from './api.mjs';

const SURUM='1.1.0';
let baslatildi=false;
const sonKayitlar=new Map();

function temizMesaj(value){
    return String(value||'Bilinmeyen hata')
        .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[eposta]')
        .replace(/https?:\/\/\S+/g,'[url]')
        .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[token]')
        .replace(/Bearer\s+\S+/gi,'Bearer [token]').slice(0,300);
}
function kodOlustur(kategori,islem,mesaj){
    const kaynak=`${kategori}.${islem}.${temizMesaj(mesaj)}`;let h=2166136261;
    for(let i=0;i<kaynak.length;i++){h^=kaynak.charCodeAt(i);h=Math.imul(h,16777619);}
    return `${kategori}.${String(islem||'genel').toLowerCase().replace(/[^a-z0-9_.-]/g,'_').slice(0,45)}.${(h>>>0).toString(16)}`.slice(0,80);
}
async function hataKaydet(kategori,islem,mesaj){
    try{
        const temiz=temizMesaj(mesaj);const kod=kodOlustur(kategori,islem,temiz);const simdi=Date.now();
        if(simdi-(sonKayitlar.get(kod)||0)<60000)return;sonKayitlar.set(kod,simdi);
        const {data:{session}}=await getSupabase().auth.getSession();if(!session?.user)return;
        await getSupabase().rpc('uygulama_hatasi_kaydet',{p_kategori:kategori,p_kod:kod,p_mesaj:temiz,p_sayfa:location.pathname.slice(0,160)||'/',p_surum:SURUM});
    }catch{/* Hata izleyici kendi hatasını tekrar kaydetmez. */}
}
function hataIzlemeyiBaslat(){
    if(baslatildi)return;baslatildi=true;
    window.addEventListener('error',event=>hataKaydet('javascript','global',event.error?.message||event.message));
    window.addEventListener('unhandledrejection',event=>hataKaydet('javascript','promise',event.reason?.message||event.reason));
}

export { SURUM,temizMesaj,kodOlustur,hataKaydet,hataIzlemeyiBaslat };
