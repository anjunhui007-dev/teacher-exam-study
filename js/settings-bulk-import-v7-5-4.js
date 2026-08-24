(() => {
'use strict';
const DATA='tes_curriculum_v5', SETTINGS='tes_settings_v5';
const $=s=>document.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??JSON.parse(JSON.stringify(f))}catch{return JSON.parse(JSON.stringify(f))}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let chosen=[];

function css(){
 if($('#v754bulkstyle'))return;
 const s=document.createElement('style');s.id='v754bulkstyle';s.textContent=`
 .v754bulkbox{border:1px dashed var(--line);border-radius:12px;padding:14px}
 .v754bulkrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
 .v754bulkfiles{font-size:12px;color:var(--muted);margin-top:9px;line-height:1.65}
 .v754bulkstatus{margin-top:10px;padding:10px 12px;border-radius:10px;background:#f7f8fa;font-size:12px;line-height:1.6;white-space:pre-wrap}
 .v754bulkstatus.good{background:#f0fdf4;color:#166534}.v754bulkstatus.bad{background:#fff1f2;color:#9f1239}
 .v754bulkbox input{display:none}`;
 document.head.append(s);
}
function inject(){
 const form=$('#settingsForm');if(!form)return;
 const old=$('#v75BulkSection'); if(old) old.remove();
 if($('#v754BulkSection'))return;
 const anchor=[...form.querySelectorAll('.settings-section')].find(x=>x.querySelector('h3')?.textContent.includes('AI API'))||form.querySelector('.dialog-actions');
 const sec=document.createElement('section');sec.className='settings-section';sec.id='v754BulkSection';
 sec.innerHTML=`<h3>교육과정 본문 JSON 일괄 업로드</h3>
 <p class="muted">여러 JSON 파일을 동시에 선택하거나, 여러 과목이 들어 있는 JSON 하나도 사용할 수 있습니다. 표 JSON은 표 모음집에서 업로드합니다.</p>
 <div class="v754bulkbox">
   <div class="v754bulkrow">
     <input id="v754BulkFiles" type="file" multiple accept="application/json,.json">
     <button type="button" id="v754PickBulk" class="ghost-btn">본문 JSON 선택</button>
     <button type="button" id="v754InspectBulk" class="ghost-btn" disabled>내용 확인</button>
     <button type="button" id="v754ApplyBulk" class="primary-btn" disabled>일괄 적용</button>
   </div>
   <div id="v754BulkList" class="v754bulkfiles">선택된 파일 없음</div>
   <div id="v754BulkStatus" class="v754bulkstatus" hidden></div>
 </div>`;
 form.insertBefore(sec,anchor);
 $('#v754PickBulk').onclick=()=>$('#v754BulkFiles').click();
 $('#v754BulkFiles').onchange=e=>{
   chosen=[...e.target.files];
   $('#v754BulkList').innerHTML=chosen.length?chosen.map(f=>'• '+f.name).join('<br>'):'선택된 파일 없음';
   $('#v754InspectBulk').disabled=!chosen.length;$('#v754ApplyBulk').disabled=true;$('#v754BulkStatus').hidden=true;
 };
 $('#v754InspectBulk').onclick=inspect;
 $('#v754ApplyBulk').onclick=apply;
}

function extractSubjects(p){
 if(p?.contentType==='curriculum-tables')throw new Error('표 JSON입니다. 표 모음집에서 업로드해 주세요.');
 if(p?.subject && typeof p.subject==='object')return [p.subject];
 if(Array.isArray(p?.subjects) && p.subjects.length)return p.subjects;
 if(p?.id && Array.isArray(p?.sections))return [p];
 throw new Error('과목 데이터(subject/subjects)를 찾을 수 없습니다.');
}
async function parseChosen(){
 const subjects=[], errors=[];
 for(const f of chosen){
   try{
     const p=JSON.parse(await f.text()), arr=extractSubjects(p);
     arr.forEach(s=>{
       if(!s?.id||!Array.isArray(s.sections))throw new Error(`${f.name}: subject.id 또는 sections가 없습니다.`);
       subjects.push({subject:s,file:f.name});
     });
   }catch(e){errors.push(`${f.name}: ${e.message||e}`)}
 }
 const dedup=new Map();
 subjects.forEach(x=>dedup.set(x.subject.id,x));
 return {subjects:[...dedup.values()],errors};
}
async function inspect(){
 const r=await parseChosen(), box=$('#v754BulkStatus');
 box.hidden=false;
 const lines=[`인식된 과목: ${r.subjects.length}개`,...r.subjects.map(x=>`✓ ${x.subject.name||x.subject.id} (${x.subject.id}) ← ${x.file}`)];
 if(r.errors.length)lines.push('',`오류: ${r.errors.length}개`,...r.errors.map(x=>'✕ '+x));
 box.textContent=lines.join('\n');box.className='v754bulkstatus '+(r.subjects.length?'good':'bad');
 $('#v754ApplyBulk').disabled=!r.subjects.length;
}
async function apply(){
 const btn=$('#v754ApplyBulk');btn.disabled=true;btn.textContent='적용 중…';
 const r=await parseChosen();
 if(!r.subjects.length){btn.textContent='일괄 적용';await inspect();return}
 const d=read(DATA,{schemaVersion:5,subjects:[]});d.subjects??=[];
 for(const {subject:s} of r.subjects){
   const i=d.subjects.findIndex(x=>x.id===s.id);
   const clean={...s,reviewItems:s.reviewItems||[]};
   if(i>=0)d.subjects[i]=clean;else d.subjects.push(clean);
 }
 d.schemaVersion=Math.max(Number(d.schemaVersion)||5,8);
 try{
   write(DATA,d);
   const verify=read(DATA,{subjects:[]});
   const missing=r.subjects.filter(({subject:s})=>!verify.subjects?.some(x=>x.id===s.id && Array.isArray(x.sections)));
   if(missing.length)throw new Error('저장 검증 실패: '+missing.map(x=>x.subject.name||x.subject.id).join(', '));
   const st=read(SETTINGS,{visibleSubjects:[],sectionPrefs:{}});
   st.visibleSubjects??=[];
   r.subjects.forEach(({subject:s})=>{if(!st.visibleSubjects.includes(s.id))st.visibleSubjects.push(s.id)});
   write(SETTINGS,st);
   sessionStorage.setItem('tes_v754_import_result',JSON.stringify({
     ok:r.subjects.map(x=>x.subject.name||x.subject.id), errors:r.errors
   }));
   location.reload();
 }catch(e){
   const box=$('#v754BulkStatus');box.hidden=false;box.className='v754bulkstatus bad';box.textContent='적용 실패\n'+(e.message||e);
   btn.disabled=false;btn.textContent='일괄 적용';
 }
}
function showResult(){
 const raw=sessionStorage.getItem('tes_v754_import_result');if(!raw)return;
 sessionStorage.removeItem('tes_v754_import_result');
 try{
   const r=JSON.parse(raw),msg=[`본문 JSON ${r.ok.length}과목 적용 완료`,...r.ok.map(x=>'✓ '+x)];
   if(r.errors?.length)msg.push('',...r.errors.map(x=>'✕ '+x));
   setTimeout(()=>alert(msg.join('\n')),180);
 }catch{}
}
function enhance(){css();inject();showResult()}
new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();