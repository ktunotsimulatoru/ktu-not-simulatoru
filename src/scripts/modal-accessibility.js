'use strict';
(function(){
    const oncekiOdak=new WeakMap();
    const aciklar=[];
    const odaklanabilir='a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    function gorunur(modal){return modal.classList.contains('aktif')||modal.classList.contains('active')||getComputedStyle(modal).display!=='none';}
    function hazirla(modal){
        const kutu=modal.querySelector('.modal-kutu')||modal;
        kutu.setAttribute('role','dialog');kutu.setAttribute('aria-modal','true');if(!kutu.hasAttribute('tabindex'))kutu.tabIndex=-1;
        const baslik=kutu.querySelector('.modal-baslik,[data-modal-title],h1,h2,h3');
        if(baslik){if(!baslik.id)baslik.id=`modal-baslik-${Math.random().toString(36).slice(2,9)}`;kutu.setAttribute('aria-labelledby',baslik.id);}
        modal.setAttribute('aria-hidden',gorunur(modal)?'false':'true');
    }
    function acildi(modal){
        hazirla(modal);modal.setAttribute('aria-hidden','false');if(!aciklar.includes(modal))aciklar.push(modal);
        oncekiOdak.set(modal,document.activeElement);
        queueMicrotask(()=>{const hedef=modal.querySelector('[autofocus],'+odaklanabilir);(hedef||modal.querySelector('.modal-kutu')||modal).focus();});
    }
    function kapandi(modal){
        modal.setAttribute('aria-hidden','true');const i=aciklar.lastIndexOf(modal);if(i>=0)aciklar.splice(i,1);
        const hedef=oncekiOdak.get(modal);if(hedef?.isConnected)queueMicrotask(()=>hedef.focus());oncekiOdak.delete(modal);
    }
    function durum(modal){const acik=gorunur(modal),kayitli=aciklar.includes(modal);if(acik&&!kayitli)acildi(modal);else if(!acik&&kayitli)kapandi(modal);else hazirla(modal);}
    function modalBul(node){if(node.nodeType!==1)return; if(node.matches?.('.modal-overlay'))durum(node);node.querySelectorAll?.('.modal-overlay').forEach(durum);}
    document.addEventListener('keydown',event=>{
        const modal=[...aciklar].reverse().find(gorunur);if(!modal)return;
        if(event.key==='Escape'){
            const kapat=modal.querySelector('.modal-kapat-btn,[data-modal-close]');
            event.preventDefault();event.stopPropagation();kapat?kapat.click():modal.click();return;
        }
        if(event.key!=='Tab')return;
        const liste=[...modal.querySelectorAll(odaklanabilir)].filter(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
        if(!liste.length){event.preventDefault();(modal.querySelector('.modal-kutu')||modal).focus();return;}
        const ilk=liste[0],son=liste[liste.length-1];
        if(event.shiftKey&&document.activeElement===ilk){event.preventDefault();son.focus();}
        else if(!event.shiftKey&&document.activeElement===son){event.preventDefault();ilk.focus();}
    },true);
    const gozlemci=new MutationObserver(kayitlar=>kayitlar.forEach(k=>{
        if(k.type==='attributes'){
            if(k.target.matches?.('.modal-overlay'))durum(k.target);
        }else k.addedNodes.forEach(modalBul);
    }));
    function baslat(){document.querySelectorAll('.modal-overlay').forEach(hazirla);gozlemci.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat);else baslat();
    window.NKErisilebilirModal={durum};
})();
