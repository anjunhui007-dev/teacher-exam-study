(() => {
'use strict';
const DATA_KEY='tes_curriculum_v5';
const $=s=>document.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function extractSubject(payload,currentId){if(payload?.subject&&typeof payload.subject==='object')return payload.subject;if(Array.isArray(payload?.subjects))return payload.subjects.find(s=>s.id===currentId)||payload.subjects[0];if(Array.isArray(payload?.sections))return{id:currentId,sections:payload.sections,reviewItems:payload.reviewItems||[]};return null}
function currentSubjectId(){const title=$('#importDialogTitle')?.textContent||'',name=title.replace(/\s*자료 업로드\s*$/,'').trim(),d=read(DATA_KEY,{subjects:[]});return(d.subjects||[]).find(s=>s.name===name)?.id||null}
document.addEventListener('click',async e=>{
 const btn=e.target.closest('#doImportBtn');if(!btn)return;const file=$('#importFile')?.files?.[0];if(!file)return;
 let payload;try{payload=JSON.parse(await file.text())}catch{return}if(payload?.replaceSubject!==true)return;
 const sid=currentSubjectId(),incoming=extractSubject(payload,sid);if(!sid||!incoming)return;if(incoming.id&&incoming.id!==sid)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 const d=read(DATA_KEY,{schemaVersion:5,subjects:[]}),next={...incoming,id:sid,name:incoming.name||((d.subjects||[]).find(s=>s.id===sid)?.name)||sid,sections:incoming.sections||[],reviewItems:incoming.reviewItems||[]};
 const idx=(d.subjects||[]).findIndex(s=>s.id===sid);if(idx>=0)d.subjects[idx]=next;else(d.subjects??=[]).push(next);d.schemaVersion=Math.max(Number(d.schemaVersion)||5,Number(payload.schemaVersion)||7);write(DATA_KEY,d);
 try{await window.TESLargeStore?.flush?.()}catch(err){alert('자료 저장 중 오류가 발생했습니다: '+(err.message||err));return}
 try{$('#importDialog')?.close()}catch{}alert(`${next.name} 자료로 기존 데이터를 교체했습니다.`);location.reload();
},true);
})();