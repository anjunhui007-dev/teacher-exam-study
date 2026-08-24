(() => {
'use strict';
const VERSION='7.5.6';
window.TES_VERSION=VERSION;
const appBase=new URL('./',document.baseURI);
function appUrl(path){return new URL(path,appBase).href+(path.includes('?')?'&':'?')+'v='+encodeURIComponent(VERSION)}
function loadClassic(path){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=appUrl(path);s.onload=resolve;s.onerror=()=>reject(new Error('load failed: '+path));document.body.appendChild(s)})}
function status(text){let d=document.getElementById('tesBootStatus');if(!d){d=document.createElement('div');d.id='tesBootStatus';d.style.cssText='position:fixed;left:10px;bottom:10px;z-index:10000;font:700 10px/1 system-ui;background:#171a21;color:#fff;padding:5px 7px;border-radius:7px;opacity:.72';document.body.appendChild(d)}d.textContent=text}
async function start(){
 status('Starting v'+VERSION);
 await window.TESLargeStore.ready;
 status('Storage ready v'+VERSION);
 try{
  const dk='tes_curriculum_v5',sk='tes_settings_v5';
  const d=JSON.parse(localStorage.getItem(dk)||'null');
  if(d&&Array.isArray(d.subjects)&&!d.subjects.some(s=>s.id==='creative')){d.subjects.splice(1,0,{id:'creative',name:'창체',sections:[],reviewItems:[]});localStorage.setItem(dk,JSON.stringify(d));await window.TESLargeStore.flush()}
  const s=JSON.parse(localStorage.getItem(sk)||'{}');
  s.visibleSubjects??=['general','creative','korean','ethics','social','math','science','practical','pe','music','art','english','integrated'];
  if(!s.visibleSubjects.includes('creative')){const i=s.visibleSubjects.indexOf('general');s.visibleSubjects.splice(i>=0?i+1:0,0,'creative')}
  if(s.excludeParticles===undefined)s.excludeParticles=true;
  localStorage.setItem(sk,JSON.stringify(s));
 }catch(e){console.error(e)}
 status('Loading app v'+VERSION);
 await import(appUrl('js/app-v5.js'));
 const scripts=['js/ui-semantic-patch.js','js/v7-import-replace-v7-5-5.js','js/study-v7-5.js','js/weakness-v7-5-2.js','js/tables-library-v7-5-2.js','js/settings-bulk-import-v7-5-5.js','js/readability-v7-5-3.js','js/build-v7-5.js'];
 for(const f of scripts)await loadClassic(f);
 document.getElementById('tesBootStatus')?.remove();
}
start().catch(err=>{console.error(err);status('Boot error v'+VERSION);const d=document.createElement('div');d.style.cssText='position:fixed;inset:20px;z-index:99999;background:#fff;padding:20px;border:1px solid #ddd;border-radius:14px;overflow:auto';d.textContent='앱 부팅 중 오류가 발생했습니다: '+(err.message||err);document.body.appendChild(d)});
})();