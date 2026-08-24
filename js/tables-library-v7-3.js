(() => {
  'use strict';

  const DATA_KEY='tes_curriculum_v5';
  const USER_KEY='tes_user_v5';
  const SETTINGS_KEY='tes_settings_v5';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  let tableView=false;
  let subjectFilter='all';
  let sectionFilter='all';

  function css(){
    if($('#v73TableStyle')) return;
    const st=document.createElement('style');
    st.id='v73TableStyle';
    st.textContent=`
      #tableLibraryBtn.active{background:var(--primary-soft);color:var(--primary);border-color:#dfe5ff;font-weight:800}
      .v73-table-page{max-width:1280px;margin:0 auto;padding:24px 0 48px}
      .v73-table-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}
      .v73-table-hero h1{margin:4px 0 6px;font-size:30px}.v73-table-hero p{margin:0;color:var(--muted)}
      .v73-bulk-btn{white-space:nowrap}
      .v73-filter-card{display:grid;grid-template-columns:minmax(180px,1fr) minmax(220px,1.3fr) auto;gap:10px;align-items:end;margin-bottom:18px}
      .v73-field{display:grid;gap:6px}.v73-field label{font-size:12px;font-weight:800;color:var(--muted)}
      .v73-field select{width:100%;border:1px solid var(--line);border-radius:10px;background:#fff;padding:10px 12px;color:var(--text)}
      .v73-count{font-size:13px;color:var(--muted);padding:10px 4px;text-align:right}
      .v73-table-list{display:grid;gap:18px}.v73-table-card{padding:0;overflow:hidden}
      .v73-table-meta{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid var(--line);background:#fbfbfc}
      .v73-table-meta h3{margin:3px 0 0;font-size:17px}.v73-table-meta small{color:var(--muted)}
      .v73-chips{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.v73-chip{font-size:11px;padding:5px 8px;border-radius:999px;background:#fff;border:1px solid var(--line);white-space:nowrap}
      .v73-scroll{overflow-x:auto;padding:18px}
      .v73-table{border-collapse:separate;border-spacing:0;width:100%;min-width:680px;border:1px solid var(--line);border-radius:12px;overflow:hidden}
      .v73-table th,.v73-table td{border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:11px 12px;vertical-align:top;line-height:1.62;white-space:pre-line}
      .v73-table th{background:#f5f6f8;font-weight:800;text-align:center}.v73-table tr:last-child>*{border-bottom:0}.v73-table tr>*:last-child{border-right:0}
      .v73-caption{font-weight:800;margin:0 0 9px}
      .v73-empty{padding:42px;text-align:center;color:var(--muted)}
      #v73BulkInput{display:none}
      .v73-import-result{position:fixed;inset:auto 20px 20px auto;z-index:9999;width:min(430px,calc(100vw - 40px));max-height:60vh;overflow:auto;background:#171a21;color:#fff;border-radius:14px;padding:15px 16px;box-shadow:0 18px 50px rgba(0,0,0,.25)}
      .v73-import-result strong{display:block;margin-bottom:8px}.v73-import-result ul{margin:0;padding-left:18px;font-size:12px;line-height:1.6}.v73-import-result button{margin-top:10px;border:0;border-radius:8px;padding:7px 10px;cursor:pointer}
      @media(max-width:780px){.v73-filter-card{grid-template-columns:1fr}.v73-count{text-align:left}.v73-table-hero{align-items:flex-start;flex-direction:column}}
    `;
    document.head.append(st);
  }

  function ensureHeaderButton(){
    const actions=$('.header-actions');
    if(!actions || $('#tableLibraryBtn')) return;
    const b=document.createElement('button');
    b.id='tableLibraryBtn';
    b.className='ghost-btn';
    b.textContent='표 모음집';
    b.onclick=()=>{tableView=true; subjectFilter='all'; sectionFilter='all'; renderTableLibrary();};
    actions.insertBefore(b, $('#settingsBtn'));
  }

  function ensureBulkInput(){
    if($('#v73BulkInput')) return;
    const input=document.createElement('input');
    input.id='v73BulkInput';
    input.type='file';
    input.accept='application/json,.json';
    input.multiple=true;
    input.onchange=async()=>{await bulkImport([...input.files]); input.value='';};
    document.body.append(input);
  }

  function allTables(){
    const d=read(DATA_KEY,{subjects:[]}), out=[];
    for(const sub of d.subjects||[]){
      for(const sec of sub.sections||[]){
        for(const item of sec.items||[]){
          (item.blocks||[]).forEach((block,blockIndex)=>{
            if(block.type!=='table') return;
            out.push({
              subjectId:sub.id, subjectName:sub.name,
              sectionId:sec.id, sectionName:sec.name,
              itemId:item.id, itemTitle:item.title||'교육과정 원문',
              page:item.source?.page??null,
              blockIndex, block
            });
          });
        }
      }
    }
    return out;
  }

  function renderTable(block){
    const rows=Number(block.rows)||0, cols=Number(block.cols)||0;
    const cells=block.cells||[], map=new Map(cells.map(c=>[`${c.row}:${c.col}`,c])), occ=new Set();
    const widths=Array.isArray(block.columnWidths)?block.columnWidths:[];
    let h='';
    if(block.caption) h+=`<div class="v73-caption">${esc(block.caption)}</div>`;
    h+=`<table class="v73-table"><colgroup>`;
    for(let c=0;c<cols;c++){
      const w=widths[c];
      h+=`<col${Number.isFinite(w)?` style="width:${Math.round(w*10000)/100}%"`:''}>`;
    }
    h+=`</colgroup><tbody>`;
    for(let r=0;r<rows;r++){
      h+='<tr>';
      for(let c=0;c<cols;c++){
        if(occ.has(`${r}:${c}`)) continue;
        const cell=map.get(`${r}:${c}`);
        if(!cell){h+='<td></td>';continue;}
        const rs=Number(cell.rowspan)||1, cs=Number(cell.colspan)||1;
        for(let rr=r;rr<r+rs;rr++) for(let cc=c;cc<c+cs;cc++) if(rr!==r||cc!==c) occ.add(`${rr}:${cc}`);
        const tag=(cell.header===true || r<(Number(block.headerRows)||0))?'th':'td';
        const text=(cell.segments||[{text:cell.text||''}]).map(s=>esc(s.text||'')).join('');
        h+=`<${tag} rowspan="${rs}" colspan="${cs}">${text}</${tag}>`;
      }
      h+='</tr>';
    }
    return h+'</tbody></table>';
  }

  function filteredTables(){
    return allTables().filter(x=>
      (subjectFilter==='all'||x.subjectId===subjectFilter) &&
      (sectionFilter==='all'||x.sectionId===sectionFilter)
    );
  }

  function subjectOptions(tables){
    const m=new Map();
    tables.forEach(x=>m.set(x.subjectId,x.subjectName));
    return [...m.entries()];
  }

  function sectionOptions(tables){
    const m=new Map();
    tables.filter(x=>subjectFilter==='all'||x.subjectId===subjectFilter)
      .forEach(x=>m.set(`${x.subjectId}::${x.sectionId}`,{id:x.sectionId,name:x.sectionName,subjectName:x.subjectName}));
    return [...m.values()];
  }

  function renderTableLibrary(){
    css(); ensureHeaderButton(); ensureBulkInput();
    const main=$('#appMain'); if(!main) return;
    tableView=true;
    $('#tableLibraryBtn')?.classList.add('active');
    const sectionBar=$('#sectionBar'); if(sectionBar) sectionBar.innerHTML='';
    const tables=allTables(), subs=subjectOptions(tables), secs=sectionOptions(tables), list=filteredTables();

    main.innerHTML=`<section class="v73-table-page">
      <div class="v73-table-hero">
        <div><span class="eyebrow">Table Library</span><h1>표 모음집</h1><p>교육과정 JSON에 들어 있는 표를 과목과 영역별로 모아 확인합니다.</p></div>
        <button id="v73BulkBtn" class="primary-btn v73-bulk-btn">JSON 일괄 업로드</button>
      </div>
      <div class="card v73-filter-card">
        <div class="v73-field"><label>과목</label><select id="v73SubjectFilter">
          <option value="all">전체 과목</option>${subs.map(([id,name])=>`<option value="${esc(id)}"${id===subjectFilter?' selected':''}>${esc(name)}</option>`).join('')}
        </select></div>
        <div class="v73-field"><label>영역</label><select id="v73SectionFilter">
          <option value="all">전체 영역</option>${secs.map(s=>`<option value="${esc(s.id)}"${s.id===sectionFilter?' selected':''}>${esc(subjectFilter==='all'?`${s.subjectName} · ${s.name}`:s.name)}</option>`).join('')}
        </select></div>
        <div class="v73-count">표 ${list.length}개</div>
      </div>
      <div class="v73-table-list">${list.length?list.map(x=>`
        <article class="card v73-table-card">
          <div class="v73-table-meta"><div><small>${esc(x.subjectName)} · ${esc(x.sectionName)}</small><h3>${esc(x.itemTitle)}</h3></div>
          <div class="v73-chips">${x.page?`<span class="v73-chip">PDF ${esc(x.page)}쪽</span>`:''}<span class="v73-chip">표 ${x.blockIndex+1}</span></div></div>
          <div class="v73-scroll">${renderTable(x.block)}</div>
        </article>`).join(''):`<div class="card v73-empty">선택한 범위에는 표가 없습니다.</div>`}
      </div>
    </section>`;

    $('#v73BulkBtn').onclick=()=>$('#v73BulkInput').click();
    $('#v73SubjectFilter').onchange=e=>{subjectFilter=e.target.value;sectionFilter='all';renderTableLibrary();};
    $('#v73SectionFilter').onchange=e=>{sectionFilter=e.target.value;renderTableLibrary();};
  }

  function normalizeSubject(payload){
    if(payload?.subject && typeof payload.subject==='object') return payload.subject;
    if(Array.isArray(payload?.subjects) && payload.subjects.length===1) return payload.subjects[0];
    if(payload?.id && Array.isArray(payload?.sections)) return payload;
    throw new Error('과목을 확인할 수 없는 JSON 형식');
  }

  function mergeSubject(oldSub,newSub){
    const sections=new Map((oldSub?.sections||[]).map(s=>[s.id,s]));
    for(const sec of newSub.sections||[]){
      const old=sections.get(sec.id);
      if(!old){sections.set(sec.id,sec);continue;}
      const items=new Map((old.items||[]).map(i=>[i.id,i]));
      (sec.items||[]).forEach(i=>items.set(i.id,{...(items.get(i.id)||{}),...i}));
      sections.set(sec.id,{...old,...sec,items:[...items.values()]});
    }
    return {...oldSub,...newSub,sections:[...sections.values()],reviewItems:newSub.reviewItems??oldSub?.reviewItems??[]};
  }

  async function bulkImport(files){
    if(!files.length) return;
    const d=read(DATA_KEY,{schemaVersion:5,subjects:[]});
    d.subjects??=[];
    const results=[];
    for(const file of files){
      try{
        const payload=JSON.parse(await file.text());
        const incoming=normalizeSubject(payload);
        if(!incoming.id) throw new Error('subject.id 없음');
        const idx=d.subjects.findIndex(s=>s.id===incoming.id);
        const replace=payload.replaceSubject===true || incoming.replaceSubject===true || Number(payload.schemaVersion)>=7;
        if(idx<0) d.subjects.push({...incoming,reviewItems:incoming.reviewItems||[]});
        else if(replace) d.subjects[idx]={...incoming,reviewItems:incoming.reviewItems||[]};
        else d.subjects[idx]=mergeSubject(d.subjects[idx],incoming);
        results.push({file:file.name,ok:true,name:incoming.name||incoming.id,replace});
      }catch(err){
        results.push({file:file.name,ok:false,error:err.message||String(err)});
      }
    }
    d.schemaVersion=Math.max(Number(d.schemaVersion)||5,7);
    write(DATA_KEY,d);

    const s=read(SETTINGS_KEY,{visibleSubjects:[],sectionPrefs:{}});
    s.visibleSubjects??=[];
    for(const r of results.filter(x=>x.ok)){
      const sub=d.subjects.find(x=>(x.name||x.id)===(r.name));
      if(sub && !s.visibleSubjects.includes(sub.id)) s.visibleSubjects.push(sub.id);
    }
    write(SETTINGS_KEY,s);
    showImportResult(results);
    if(tableView) renderTableLibrary();
  }

  function showImportResult(results){
    $('#v73ImportResult')?.remove();
    const ok=results.filter(x=>x.ok).length, fail=results.length-ok;
    const box=document.createElement('div');
    box.id='v73ImportResult'; box.className='v73-import-result';
    box.innerHTML=`<strong>일괄 업로드: 성공 ${ok}개${fail?` · 실패 ${fail}개`:''}</strong>
      <ul>${results.map(r=>r.ok?`<li>✓ ${esc(r.file)} → ${esc(r.name)}${r.replace?' (교체)':' (병합)'}</li>`:`<li>✕ ${esc(r.file)} — ${esc(r.error)}</li>`).join('')}</ul>
      <button>닫기</button>`;
    box.querySelector('button').onclick=()=>box.remove();
    document.body.append(box);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#tableLibraryBtn')) return;
    if(e.target.closest('#homeBtn,[data-subject],[data-section],[data-open-sub],#weaknessBtn')){
      tableView=false; $('#tableLibraryBtn')?.classList.remove('active');
    }
  },true);

  function enhance(){css();ensureHeaderButton();ensureBulkInput();}
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance); else enhance();
})();