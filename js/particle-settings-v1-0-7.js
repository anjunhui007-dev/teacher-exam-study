(() => {
'use strict';
const K='tes_settings_v5';
const $=s=>document.querySelector(s);
const read=()=>{try{return JSON.parse(localStorage.getItem(K))||{}}catch{return{}}};
const write=v=>localStorage.setItem(K,JSON.stringify(v));
function sync(){const box=$('#particleSelectable');if(!box)return;const s=read();box.checked=s.excludeParticles!==false;}
let pending=null;
document.addEventListener('click',e=>{
 if(e.target.closest('#settingsBtn'))setTimeout(sync,0);
 if(e.target.closest('#saveSettingsBtn')){
   const box=$('#particleSelectable');pending=box?box.checked:null;
   setTimeout(()=>{
     if(pending===null)return;
     const s=read();s.excludeParticles=!!pending;write(s);pending=null;
     window.dispatchEvent(new CustomEvent('tes:particle-setting-updated',{detail:{excludeParticles:s.excludeParticles}}));
   },0);
 }
},true);
new MutationObserver(()=>{if($('#settingsDialog')?.open)sync()}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
})();