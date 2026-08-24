(() => {
'use strict';
const TABLE_KEY='tes_curriculum_tables_v1', DATA_KEY='tes_curriculum_v5';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let tableView=false,subjectFilter='all',sectionFilter='all',queued=false;

function css(){
 if($('#v751tablesStyle'))return;
 const st=document.createElement('style');st.id='v751tablesStyle';st.textContent=`
 #tableLibraryBtn.active{background:var(--primary-soft);color:var(--primary);font-weight:800}
 .v751tp{max-width:1280px;margin:0 auto;padding:24px 0 48px}.v751th{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:18px}
 .v751filters{display:grid;grid-template-columns:1fr 1.3fr auto;gap:10px;align-items:end;margin-bottom:18px}.v751field{display:grid;gap:6px}.v751field label{font-size:12px;font-weight:800;color:var(--muted)}.v751field select{padding:10px;border:1px solid var(--line);border-radius:10px;background:#fff}
 .v751list{display:grid;gap:18px}.v751tc{padding:0;overflow:hidden}.v751meta{display:flex;justify-content:space-between;gap:14px;padding:15px 18px;border-bottom:1px solid var(--line);background:#fbfbfc}.v751meta h3{margin:3px 0 0}.v751scroll{overflow:auto;padding:18px}
 .v751table{border-collapse:separate;border-spacing:0;width:100%;min-width:680px;border:1px solid var(--line);border-radius:12px;overflow:hidden}.v751table th,.v751table td{border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:11px 12px;vertical-align:top;line-height:1.62;white-space:pre-line}.v751table th{background:#f5f6f8;font-weight:800;text-align:center}.v751table tr:last-child>*{border-bottom:0}.v751table tr>*:last-child{border-right:0}
 .v751caption{font-weight:800;margin-bottom:8px}.v751placeholder{width:100%;border:0;background:transparent}.v751upload{display:flex;gap:8px;align-items:center}.v751upload input{display:none}.v751empty{padding:42px;text-align:center;color:var(--muted)}
 @media(max-width:780px){.v751filters{grid-template-columns:1fr}.v751th{align-items:flex-start;flex-direction:column}}`;
 document.head.append(st);
}
function store(){return read(TABLE_KEY,{schemaVersion:1,contentType:'curriculum-tables',tables:[]})}
function renderTable(t){
 const rows=Number(t.rows)||0,cols=Number(t.cols)||0,map=new Map((t.cells||[]).map(c=>[`${c.row}:${c.col}`,c])),occ=new Set(),widths=t.columnWidths||[];
 let h=t.caption?`<div class="v751caption">${esc(t.caption)}</div>`:'';
 h+='<table class="v751table"><colgroup>'+Array.from({length:cols},(_,i)=>`<col${Number.isFinite(widths[i])?` style="width:${widths[i]*100}%"`:''}>`).join('')+'</colgroup><tbody>';
 for(let r=0;r<rows;r++){h+='<tr>';for(let c=0;c<cols;c++){if(occ.has(`${r}:${c}`))continue;const cell=map.get(`${r}:${c}`);if(!cell){h+='<td></td>';continue}const rs=Number(cell.rowspan)||1,cs=Number(cell.colspan)||1;for(let rr=r;rr<r+rs;rr++)for(let cc=c;cc<c+cs;cc++)if(rr!==r||cc!==c)occ.add(`${rr}:${cc}`);const tag=cell.header===true||r<(Number(t.headerRows)||0)?'th':'td',txt=(cell.segments||[{text:cell.text||''}]).map(s=>esc(s.text||'')).join('');h+=`<${tag} rowspan="${rs}" colspan="${cs}">${txt}</${tag}>`}h+='</tr>'}
 return h+'</tbody></table>';
}
function currentItem(){
 const d=read(DATA_KEY,{subjects:[]});
 const bc=$('.reader .breadcrumb')?.textContent||'', title=$('.reader .reader-heading h1')?.textContent?.trim();
 if(!bc||!title)return null;
 const [sn,secn]=bc.split('/').map(x=>x.trim());
 for(const sub of d.subjects||[])if(sub.name===sn)for(const sec of sub.sections||[])if(sec.name===secn){
   return (sec.items||[]).find(i=>(i.title||'교육과정 원문')===title)||sec.items?.[0]||null;
 }
 return null;
}
function hydrate(){
 const item=currentItem(); if(!item)return;
 const placeholders=(item.blocks||[]).filter(b=>b.type==='table'&&b.externalTable===true&&b.tableId);
 if(!placeholders.length)return;
 const by=new Map((store().tables||[]).map(x=>[x.id,x]));
 const dom=$$('.reader .source-document .table-scroll');
 placeholders.forEach((ph,i)=>{
   const w=dom[i]; if(!w||w.dataset.v751Done==='1')return;
   const x=by.get(ph.tableId), n=document.createElement('div');
   n.dataset.v751Done='1'; n.dataset.tableId=ph.tableId;
   if(x){n.className='v751scroll';n.innerHTML=renderTable(x.table||x);}
   else{n.className='v751placeholder';n.style.height=`${Number(ph.estimatedHeight)||180}px`;n.setAttribute('aria-label','표 자리 - 표 JSON 미업로드');}
   w.replaceWith(n);
 });
}
function ensureButton(){
 const a=$('.header-actions');if(!a||$('#tableLibraryBtn'))return;
 const b=document.createElement('button');b.id='tableLibraryBtn';b.className='ghost-btn';b.textContent='표 모음집';
 b.onclick=()=>{tableView=true;subjectFilter=sectionFilter='all';renderLibrary()};a.insertBefore(b,$('#settingsBtn'));
}
function all(){return store().tables||[]}
function renderLibrary(){
 tableView=true;$('#tableLibraryBtn')?.classList.add('active');if($('#sectionBar'))$('#sectionBar').innerHTML='';
 const arr=all(),subs=[...new Map(arr.map(x=>[x.subjectId,x.subjectName||x.subjectId])).entries()],
 secs=[...new Map(arr.filter(x=>subjectFilter==='all'||x.subjectId===subjectFilter).map(x=>[`${x.subjectId}::${x.sectionId}`,x])).values()],
 list=arr.filter(x=>(subjectFilter==='all'||x.subjectId===subjectFilter)&&(sectionFilter==='all'||x.sectionId===sectionFilter));
 $('#appMain').innerHTML=`<section class="v751tp"><div class="v751th"><div><span class="eyebrow">Table Library</span><h1>표 모음집</h1><p>표 전용 JSON만 이곳에서 관리합니다.</p></div><div class="v751upload"><input id="v751tableFile" type="file" accept="application/json,.json"><button id="v751tableUpload" class="primary-btn">표 JSON 업로드</button>${arr.length?'<button id="v751tableClear" class="ghost-btn">표 데이터 비우기</button>':''}</div></div>
 <div class="card v751filters"><div class="v751field"><label>과목</label><select id="v751sf"><option value="all">전체 과목</option>${subs.map(([id,n])=>`<option value="${esc(id)}"${id===subjectFilter?' selected':''}>${esc(n)}</option>`).join('')}</select></div><div class="v751field"><label>영역</label><select id="v751sec"><option value="all">전체 영역</option>${secs.map(x=>`<option value="${esc(x.sectionId)}"${x.sectionId===sectionFilter?' selected':''}>${esc(subjectFilter==='all'?`${x.subjectName} · ${x.sectionName}`:x.sectionName)}</option>`).join('')}</select></div><div>${list.length}개 표</div></div>
 <div class="v751list">${list.length?list.map(x=>`<article class="card v751tc"><div class="v751meta"><div><small>${esc(x.subjectName)} · ${esc(x.sectionName)}</small><h3>${esc(x.itemTitle||'표')}</h3></div><small>${x.source?.page?`PDF ${esc(x.source.page)}쪽`:''}</small></div><div class="v751scroll">${renderTable(x.table||x)}</div></article>`).join(''):'<div class="card v751empty">아직 표 JSON이 업로드되지 않았습니다. 본문에서는 표 자리만 비워서 표시됩니다.</div>'}</div></section>`;
 $('#v751tableUpload').onclick=()=>$('#v751tableFile').click();
 $('#v751tableFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text());if(p.contentType!=='curriculum-tables'||!Array.isArray(p.tables))throw new Error('표 전용 JSON 형식이 아닙니다.');write(TABLE_KEY,p);sessionStorage.setItem('v751_table_upload_result',`표 ${p.tables.length}개를 업로드했습니다.`);location.reload()}catch(err){alert(err.message||'표 JSON을 읽지 못했습니다.')}};
 if($('#v751tableClear'))$('#v751tableClear').onclick=()=>{if(confirm('업로드된 표 데이터만 비울까요? 본문 JSON은 유지됩니다.')){localStorage.removeItem(TABLE_KEY);location.reload()}};
 $('#v751sf').onchange=e=>{subjectFilter=e.target.value;sectionFilter='all';renderLibrary()};$('#v751sec').onchange=e=>{sectionFilter=e.target.value;renderLibrary()};
}
document.addEventListener('click',e=>{if(e.target.closest('#tableLibraryBtn'))return;if(e.target.closest('#homeBtn,[data-subject],[data-section],[data-open-sub],#weaknessBtn')){tableView=false;$('#tableLibraryBtn')?.classList.remove('active')}},true);
function enhance(){css();ensureButton();hydrate();const msg=sessionStorage.getItem('v751_table_upload_result');if(msg){sessionStorage.removeItem('v751_table_upload_result');setTimeout(()=>alert(msg),50)}}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();