(() => {
'use strict';
const VERSION='7.5.5';
window.TES_VERSION=VERSION;
function loadClassic(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.defer=false;s.onload=resolve;s.onerror=()=>reject(new Error('load failed: '+src));document.body.appendChild(s)})}
async function start(){
 await window.TESLargeStore.ready;
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
 await import(`./js/app-v5.js?v=${VERSION}`);
 const scripts=['ui-semantic-patch.js','v7-import-replace-v7-5-5.js','study-v7-5.js','weakness-v7-5-2.js','tables-library-v7-5-2.js','settings-bulk-import-v7-5-5.js','readability-v7-5-3.js','build-v7-5.js'];
 for(const f of scripts)await loadClassic(`./js/${f}?v=${VERSION}`);
}
start().catch(err=>{console.error(err);const d=document.createElement('div');d.style.cssText='position:fixed;inset:20px;z-index:99999;background:#fff;padding:20px;border:1px solid #ddd;border-radius:14px';d.textContent='앱 저장소를 여는 중 오류가 발생했습니다: '+(err.message||err);document.body.append(d)});
})();