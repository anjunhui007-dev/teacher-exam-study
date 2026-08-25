(() => {
'use strict';
const VERSION='1.0.7';
window.TES_VERSION=VERSION;
const appBase=new URL('./',document.baseURI);
function appUrl(path){return new URL(path,appBase).href+(path.includes('?')?'&':'?')+'v='+encodeURIComponent(VERSION)}
function status(text){let d=document.getElementById('tesBootStatus');if(!d){d=document.createElement('div');d.id='tesBootStatus';d.style.cssText='position:fixed;left:10px;bottom:10px;z-index:10000;font:700 10px/1 system-ui;background:#171a21;color:#fff;padding:5px 7px;border-radius:7px;opacity:.72;pointer-events:none';document.body.appendChild(d)}d.textContent=text}
function loadScript(path,type='classic'){return new Promise((resolve)=>{const s=document.createElement('script');s.src=appUrl(path);if(type==='module')s.type='module';s.async=false;s.onload=()=>resolve({ok:true,path});s.onerror=()=>{console.error('load failed',path);resolve({ok:false,path})};document.body.appendChild(s)})}
async function start(){
 status('Starting v'+VERSION);
 try{await window.TESLargeStore.ready}catch(e){console.error(e)}
 status('Storage ready v'+VERSION);
 try{
  const dk='tes_curriculum_v5',sk='tes_settings_v5';
  const d=JSON.parse(localStorage.getItem(dk)||'null');
  if(d&&Array.isArray(d.subjects)&&!d.subjects.some(s=>s.id==='creative')){d.subjects.splice(1,0,{id:'creative',name:'창체',sections:[],reviewItems:[]});localStorage.setItem(dk,JSON.stringify(d));await window.TESLargeStore.flush()}
  const s=JSON.parse(localStorage.getItem(sk)||'{}');
  s.visibleSubjects??=['general','creative','korean','ethics','social','math','science','practical','pe','music','art','english','integrated'];
  if(!s.visibleSubjects.includes('creative')){const i=s.visibleSubjects.indexOf('general');s.visibleSubjects.splice(i>=0?i+1:0,0,'creative')}
  if(s.excludeParticles===undefined)s.excludeParticles=true;
  delete s.readingFont;
  localStorage.setItem(sk,JSON.stringify(s));
 }catch(e){console.error(e)}
 // 데이터가 앱 메모리에 올라오기 전에 가운데점 복합어의 잘못된 조사 분리를 먼저 보정한다.
 await loadScript('js/compound-particle-fix-v1-0-7.js');
 try{await window.TESLargeStore?.flush?.()}catch(e){console.error(e)}
 status('Loading app v'+VERSION);
 await loadScript('js/app-v5.js','module');
 const scripts=['js/ui-semantic-patch.js','js/v7-import-replace-v7-5-5.js','js/particle-settings-v1-0-7.js','js/study-v7-6.js','js/accuracy-round-v7-6-2.js','js/reader-highlight-v1-0-4.js','js/weakness-v7-6-1.js','js/weakness-batch-v1-0-1.js','js/completion-ui-v7-6-3.js','js/settings-progress-reset-v1-0-1.js','js/tables-library-v7-5-2.js','js/settings-bulk-import-v7-5-5.js','js/readability-v7-5-3.js','js/build-v7-5.js'];
 for(const f of scripts)await loadScript(f);
 document.getElementById('tesBootStatus')?.remove();
}
start().catch(err=>{console.error(err);status('Boot partial error v'+VERSION);setTimeout(()=>document.getElementById('tesBootStatus')?.remove(),1500)});
})();