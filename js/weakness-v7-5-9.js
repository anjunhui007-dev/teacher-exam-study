(() => {
'use strict';
const DATA='tes_curriculum_v5', USER='tes_user_v5', SETTINGS='tes_settings_v5';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

const data=read(DATA,{subjects:[]});
const itemMap=new Map();
for(const sub of data.subjects||[]) for(const sec of sub.sections||[]) for(const item of sec.items||[]) itemMap.set(item.id,{sub,sec,item});
let weakSubjectId=null, appObs=null, scheduled=false;

function cfg(){return read(SETTINGS,{gradingMode:'flexible',excludeParticles:true})}
function user(){const u=read(USER,{itemState:{},drafts:{}});u.itemState??={};u.drafts??={};return u}
function saveUser(u){write(USER,u)}
function units(item){return Array.isArray(item?.studyUnits)?item.studyUnits:[]}
function itemState(u,item){u.itemState[item.id]??={masked:[],maskedUnits:[],wrongTokens:[],weakSemanticUnits:[],wrongCount:0,attempts:0,correct:0};const s=u.itemState[item.id];s.masked??=[];s.maskedUnits??=[];s.wrongTokens??=[];s.weakSemanticUnits??=[];return s}
function ordinalForLegacy(item,val){const us=units(item);let i=us.findIndex(x=>Number(x.legacyTokenIndex)===Number(val));if(i<0&&Number.isInteger(Number(val))&&Number(val)>=0&&Number(val)<us.length)i=Number(val);return i}
function selectedOrdinals(item,s){
 const us=units(item);if(!s.maskedUnits?.length&&s.masked?.length){const legacy=new Map(us.map((x,i)=>[Number(x.legacyTokenIndex),i]));s.maskedUnits=[...new Set(s.masked.map(v=>legacy.has(Number(v))?legacy.get(Number(v)):(Number(v)<us.length?Number(v):null)).filter(v=>v!==null))].sort((a,b)=>a-b)}
 return [...new Set((s.maskedUnits||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<us.length))].sort((a,b)=>a-b);
}
function legacyIds(item,ords){const us=units(item);return ords.map(i=>Number(us[i]?.legacyTokenIndex??i))}
function semForOrd(item,ords){const us=units(item);return [...new Set(ords.map(i=>us[i]?.semanticUnit).filter(Boolean))]}
function semUnits(item,sem){return units(item).map((u,i)=>({u,i})).filter(x=>x.u.semanticUnit===sem)}
function semText(item,sem){const a=semUnits(item,sem);return a.map(x=>`${x.u.leadingSpace||''}${x.u.surface||''}`).join('')+(a.at(-1)?.u.trailingSpace||'')}
function syncLegacyOnce(){
 const u=user();let changed=false;
 for(const [itemId,s] of Object.entries(u.itemState||{})){const f=itemMap.get(itemId);if(!f)continue;s.weakSemanticUnits??=[];const ords=(s.wrongTokens||[]).map(v=>ordinalForLegacy(f.item,Number(v))).filter(i=>i>=0);for(const sem of semForOrd(f.item,ords))if(!s.weakSemanticUnits.includes(sem)){s.weakSemanticUnits.push(sem);changed=true}}
 if(changed)saveUser(u);
}
function entries(subjectId){
 const u=user(),out=[];
 for(const [itemId,s] of Object.entries(u.itemState||{})){const f=itemMap.get(itemId);if(!f||f.sub.id!==subjectId)continue;for(const sem of s.weakSemanticUnits||[])out.push({...f,semanticUnit:sem,text:semText(f.item,sem)})}
 return out;
}
function css(){
 if($('#v759weakStyle'))return;const s=document.createElement('style');s.id='v759weakStyle';s.textContent=`
 #weaknessBtn{display:none!important}.v759weak-btn{position:relative}.v759weak-count{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;margin-left:6px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;font-weight:800}
 .v759page{max-width:1100px;margin:0 auto;padding:24px 0 110px}.v759head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:18px}.v759head h1{margin:5px 0}.v759area{margin-bottom:22px}.v759area>h2{font-size:18px;margin:0 0 10px}.v759list{display:grid;gap:10px}
 .v759card{padding:16px 18px}.v759meta{font-size:12px;color:var(--muted);margin-bottom:8px}.v759text{white-space:pre-wrap;line-height:1.75}.v759actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.v759empty{padding:42px;text-align:center;color:var(--muted)}
 .v759practice{max-width:900px;margin:0 auto;padding:24px 0 120px}.v759practice-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}.v759practice-head h1{font-size:22px;margin:4px 0}.v759practice-box{padding:18px;line-height:1.85;white-space:normal}
 .v759masked{display:inline-block;min-width:70px;border-bottom:2px solid currentColor;color:transparent;background:#f2f3f6;border-radius:5px;padding:0 5px;margin:0 2px;cursor:pointer}.v759masked.correct{color:var(--text);background:transparent;border:2px solid #22c55e}.v759masked.wrong{color:var(--text);background:transparent;border:2px solid #ef4444}
 .v759input{min-width:80px;border:1px solid var(--line);border-radius:7px;padding:5px 7px;font:inherit}.v759input.correct{border:2px solid #22c55e}.v759input.wrong{border:2px solid #ef4444}.v759tail{opacity:.82}.v759note{font-size:12px;color:var(--muted);margin:0 0 12px}
 @media(max-width:700px){.v759page,.v759practice{padding-left:12px;padding-right:12px}.v759card{padding:14px}.v759practice-box{font-size:13px;line-height:1.75;padding:14px}.v759actions button{font-size:12px;padding:8px 10px}}
 `;document.head.append(s)
}
function contextSubject(){
 const active=$('#subjectBar [data-subject].active')?.dataset.subject;if(active)return active;
 const bc=$('.reader .breadcrumb')?.textContent||'';if(bc){const n=bc.split('/')[0]?.trim();return(data.subjects||[]).find(s=>s.name===n)?.id||null}
 return weakSubjectId;
}
function ensureDock(){
 const dock=$('#v75dock .v75body');if(!dock)return;
 const sid=contextSubject();if(!sid)return;
 let b=dock.querySelector('.v759weak-btn');if(!b){b=document.createElement('button');b.className='v759weak-btn';b.innerHTML='약점 보충 <span class="v759weak-count"></span>';const hr=dock.querySelector('hr');dock.insertBefore(b,hr||dock.firstChild)}
 b.dataset.subjectId=sid;b.onclick=()=>renderWeakness(sid);const n=entries(sid).length,bd=b.querySelector('.v759weak-count');bd.textContent=n;bd.style.display=n?'inline-flex':'none';
}
function renderWeakness(subjectId){
 weakSubjectId=subjectId;const sub=(data.subjects||[]).find(s=>s.id===subjectId);if(!sub)return;
 const es=entries(subjectId),by=new Map();for(const e of es){if(!by.has(e.sec.id))by.set(e.sec.id,{sec:e.sec,rows:[]});by.get(e.sec.id).rows.push(e)}
 $('#sectionBar').innerHTML='';
 $('#appMain').innerHTML=`<section class="v759page"><div class="v759head"><div><span class="eyebrow">${esc(sub.name)}</span><h1>약점 보충</h1><p>틀린 빈칸이 포함된 선 사이 전체를 영역별로 복습합니다.</p></div></div>${es.length?[...by.values()].map(g=>`<section class="v759area"><h2>${esc(g.sec.name)} <small>(${g.rows.length})</small></h2><div class="v759list">${g.rows.map(e=>`<article class="card v759card"><div class="v759meta">${esc(e.item.title||'교육과정 원문')}</div><div class="v759text">${esc(e.text)}</div><div class="v759actions"><button class="primary-btn" data-v759-mask="${esc(e.item.id)}" data-sem="${esc(e.semanticUnit)}">가리기 학습</button><button class="ghost-btn" data-v759-type="${esc(e.item.id)}" data-sem="${esc(e.semanticUnit)}">타이핑 학습</button><button class="ghost-btn" data-v759-open="${esc(e.item.id)}">원문 보기</button></div></article>`).join('')}</div></section>`).join(''):'<div class="card v759empty">이 과목에는 아직 약점 섹션이 없습니다.</div>'}</section>`;
 $$('[data-v759-mask]').forEach(b=>b.onclick=()=>renderPractice(b.dataset.v759Mask,b.dataset.sem,'mask'));
 $$('[data-v759-type]').forEach(b=>b.onclick=()=>renderPractice(b.dataset.v759Type,b.dataset.sem,'typing'));
 $$('[data-v759-open]').forEach(b=>b.onclick=()=>openOriginal(b.dataset.v759Open));
}
function parts(x){const c=cfg();return c.excludeParticles===false?{core:x.surface||'',tail:''}:{core:x.core||x.surface||'',tail:`${x.particle||''}${x.punctuation||''}`}}
function selectedInSem(item,s,sem){const sel=new Set(selectedOrdinals(item,s));return semUnits(item,sem).filter(x=>sel.has(x.i)).map(x=>x.i)}
function runs(item,ords){
 const us=units(item),out=[];let r=[];for(const i of ords){if(!r.length){r=[i];continue}const p=r.at(-1);if(i===p+1&&us[i].semanticUnit===us[p].semanticUnit)r.push(i);else{out.push(r);r=[i]}}if(r.length)out.push(r);return out;
}
function expected(item,run){const us=units(item),c=cfg();if(c.excludeParticles===false)return run.map(i=>us[i].surface).join(' ');return run.map((i,n)=>n===run.length-1?(us[i].core||us[i].surface):us[i].surface).join(' ')}
function renderSem(item,s,sem,mode){
 const us=units(item),selected=selectedInSem(item,s,sem),rs=runs(item,selected),first=new Map(rs.map(r=>[r[0],r])),covered=new Set(rs.flat()),semOrd=semUnits(item,sem).map(x=>x.i);let h='';
 for(const i of semOrd){if(covered.has(i)&&!first.has(i))continue;const x=us[i];h+=esc(x.leadingSpace||'');const r=first.get(i);if(r){const exp=expected(item,r),last=parts(us[r.at(-1)]);h+=mode==='typing'?`<input class="v759input" data-v759-input="${r.join(',')}" data-exp="${esc(exp)}" style="width:${Math.max(90,Math.min(420,exp.length*16+30))}px">${last.tail?`<span class="v759tail">${esc(last.tail)}</span>`:''}`:`<span class="v759masked" data-v759-maskrun="${r.join(',')}">${esc(exp)}</span>${last.tail?`<span class="v759tail">${esc(last.tail)}</span>`:''}`;continue}h+=esc(x.surface||'')}
 return h;
}
function setWrongState(item,ords,isWrong){
 const u=user(),s=itemState(u,item),lids=legacyIds(item,ords),sems=semForOrd(item,ords);
 if(isWrong){for(const id of lids)if(!s.wrongTokens.some(x=>Number(x)===id))s.wrongTokens.push(id);for(const sem of sems)if(!s.weakSemanticUnits.includes(sem))s.weakSemanticUnits.push(sem);s.wrongCount=(s.wrongCount||0)+1}
 else{s.wrongTokens=(s.wrongTokens||[]).filter(x=>!lids.includes(Number(x)));for(const sem of sems){const still=units(item).some((x,i)=>x.semanticUnit===sem&&s.wrongTokens.includes(Number(x.legacyTokenIndex??i)));if(!still)s.weakSemanticUnits=s.weakSemanticUnits.filter(v=>v!==sem)}}
 saveUser(u);
}
function renderPractice(itemId,sem,mode){
 const f=itemMap.get(itemId);if(!f)return;weakSubjectId=f.sub.id;const u=user(),s=itemState(u,f.item),sel=selectedInSem(f.item,s,sem);
 $('#sectionBar').innerHTML='';
 $('#appMain').innerHTML=`<section class="v759practice"><div class="v759practice-head"><div><span class="eyebrow">${esc(f.sub.name)} · ${esc(f.sec.name)}</span><h1>${mode==='mask'?'가리기 학습':'타이핑 학습'}</h1></div><button class="ghost-btn" id="v759BackWeak">약점 목록</button></div><p class="v759note">틀린 빈칸이 속한 선 사이 전체를 복습합니다.</p><div class="card v759practice-box">${sel.length?renderSem(f.item,s,sem,mode):'<div class="v759empty">이 약점 섹션에는 현재 설정된 빈칸이 없습니다. 가리기 설정에서 빈칸을 다시 지정해 주세요.</div>'}</div></section>`;
 $('#v759BackWeak').onclick=()=>renderWeakness(f.sub.id);
 if(mode==='mask')$$('[data-v759-maskrun]').forEach(el=>{el.onclick=()=>{const ords=el.dataset.v759Maskrun.split(',').map(Number);if(!el.classList.contains('correct')&&!el.classList.contains('wrong')){el.classList.add('correct');setWrongState(f.item,ords,false)}else if(el.classList.contains('correct')){el.classList.remove('correct');el.classList.add('wrong');setWrongState(f.item,ords,true)}else{el.classList.remove('wrong')}}});
 else $$('[data-v759-input]').forEach(inp=>{const judge=()=>{if(!inp.value.trim())return;const ords=inp.dataset.v759Input.split(',').map(Number),exp=inp.dataset.exp||'',m=cfg().gradingMode||'flexible',ok=m==='strict'?inp.value===exp:norm(inp.value)===norm(exp);inp.classList.toggle('correct',ok);inp.classList.toggle('wrong',!ok);setWrongState(f.item,ords,!ok)};inp.addEventListener('change',judge);inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();judge()}})});
}
function norm(v){return String(v||'').toLowerCase().replace(/[\s.,!?;:'"“”‘’·⋅()\[\]{}<>/\\\-_~`]+/g,'')}
function openOriginal(itemId){
 const f=itemMap.get(itemId);if(!f)return;
 $(`#subjectBar [data-subject="${CSS.escape(f.sub.id)}"]`)?.click();
 setTimeout(()=>{$(`#sectionBar [data-section="${CSS.escape(f.sec.id)}"]`)?.click();setTimeout(()=>{$(`[data-item="${CSS.escape(f.item.id)}"]`)?.click()},40)},40);
}
function scheduleEnsure(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;ensureDock()})}
function attachObserver(){
 const main=$('#appMain');if(!main||appObs)return;appObs=new MutationObserver(scheduleEnsure);appObs.observe(main,{childList:true});scheduleEnsure();
}
function answerHooks(){
 document.addEventListener('click',e=>{const el=e.target.closest('[data-v75-reveal]');if(!el)return;setTimeout(()=>{const ids=(el.dataset.v75Reveal||'').split(',').map(Number).filter(Number.isFinite);const ctxId=sessionStorage.getItem('tes_v75_context');if(!ctxId)return;try{const c=JSON.parse(ctxId),f=itemMap.get(c.itemId);if(!f)return;if(el.classList.contains('v75wrong'))setWrongState(f.item,ids,true);else if(el.classList.contains('v75correct'))setWrongState(f.item,ids,false);scheduleEnsure()}catch{}},0)},false);
 document.addEventListener('focusout',e=>{const inp=e.target.closest?.('.inline-answer[data-v75-idx]');if(!inp)return;setTimeout(()=>{const ids=(inp.dataset.v75Idx||'').split(',').map(Number).filter(Number.isFinite);try{const c=JSON.parse(sessionStorage.getItem('tes_v75_context')||'null'),f=itemMap.get(c?.itemId);if(!f)return;if(inp.classList.contains('input-wrong'))setWrongState(f.item,ids,true);else if(inp.classList.contains('input-correct'))setWrongState(f.item,ids,false);scheduleEnsure()}catch{}},0)},true);
}
css();syncLegacyOnce();answerHooks();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{attachObserver();ensureDock()});else{attachObserver();ensureDock()}
document.addEventListener('click',e=>{if(e.target.closest('[data-subject],[data-section],#homeBtn,#tableLibraryBtn'))setTimeout(scheduleEnsure,0)},true);
})();