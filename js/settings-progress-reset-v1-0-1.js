(() => {
'use strict';
const D='tes_curriculum_v5',U='tes_user_v5';
const $=s=>document.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function inject(){
 const form=$('#settingsForm'); if(!form||$('#v101ProgressReset')) return;
 const d=read(D,{subjects:[]}), subjects=d.subjects||[];
 const sec=document.createElement('section');sec.className='settings-section';sec.id='v101ProgressReset';
 sec.innerHTML=`<h3>과목별 진행도 초기화</h3><p class="muted">가리기 설정·누적 정답률은 유지합니다. 회독 횟수까지 초기화하면 해당 과목의 회독별 약점 기록도 새로 시작합니다.</p><div style="display:grid;grid-template-columns:minmax(160px,1fr) minmax(220px,1.35fr) auto;gap:8px;align-items:end"><label style="display:grid;gap:6px"><span style="font-size:12px;font-weight:700">과목</span><select id="v101ResetSubject">${subjects.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><label style="display:grid;gap:6px"><span style="font-size:12px;font-weight:700">초기화 범위</span><select id="v101ResetMode"><option value="current">현재 회독 진행도만 초기화</option><option value="all">회독 횟수까지 전부 초기화</option></select></label><button type="button" id="v101ResetBtn" class="ghost-btn">초기화</button></div><p id="v101ResetInfo" class="muted" style="margin:8px 0 0;font-size:12px"></p>`;
 const anchor=form.querySelector('.dialog-actions');form.insertBefore(sec,anchor);
 const updateInfo=()=>{const sid=$('#v101ResetSubject').value,a=read(U,{rounds:{}}),r=a.rounds?.[sid]||{count:0,completed:[]};$('#v101ResetInfo').textContent=`현재 ${Number(r.count||0)}회독 완료 · 이번 회독 완료 항목 ${(r.completed||[]).length}개`;};
 $('#v101ResetSubject').onchange=updateInfo;updateInfo();
 $('#v101ResetBtn').onclick=()=>{
   const sid=$('#v101ResetSubject').value, mode=$('#v101ResetMode').value, sub=subjects.find(s=>s.id===sid);if(!sub)return;
   const msg=mode==='all'?`${sub.name}의 회독 횟수와 현재 회독 진행도를 모두 0으로 초기화할까요?\n가리기 설정·누적 정답률은 유지되고, 해당 과목의 회독별 약점 기록은 새로 시작합니다.`:`${sub.name}의 현재 회독 완료 진행도만 초기화할까요?\n회독 횟수와 약점 기록은 유지됩니다.`;
   if(!confirm(msg))return;
   const a=read(U,{rounds:{},itemState:{}});a.rounds??={};const old=a.rounds[sid]||{count:0,completed:[]};
   a.rounds[sid]=mode==='all'?{...old,count:0,completed:[]}:{...old,completed:[]};
   if(mode==='all'){
     const ids=new Set((sub.sections||[]).flatMap(sec=>(sec.items||[]).map(item=>item.id)));
     for(const [itemId,s] of Object.entries(a.itemState||{})) if(ids.has(itemId)&&s?.weakByRound) s.weakByRound={};
   }
   write(U,a);updateInfo();window.dispatchEvent(new CustomEvent('tes:progress-reset',{detail:{subjectId:sid,mode}}));alert(`${sub.name} 진행도를 초기화했습니다.`);
 };
}
new MutationObserver(()=>inject()).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();