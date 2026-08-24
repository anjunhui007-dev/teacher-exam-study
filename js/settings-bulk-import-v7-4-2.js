(() => {
  'use strict';
  const DATA_KEY='tes_curriculum_v5', SETTINGS_KEY='tes_settings_v5';
  const $=s=>document.querySelector(s);
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let files=[];

  function injectCss(){
    if($('#bulkSettingsStyle')) return;
    const st=document.createElement('style'); st.id='bulkSettingsStyle'; st.textContent=`
      #v73BulkBtn{display:none!important}
      .bulk-json-box{display:grid;gap:10px}.bulk-json-actions{display:flex;gap:8px;flex-wrap:wrap}.bulk-json-list{font-size:12px;color:var(--muted);line-height:1.55;max-height:150px;overflow:auto;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#fafbfc}.bulk-json-status{font-size:12px;color:var(--muted)}
    `; document.head.append(st);
  }

  function ensureUi(){
    injectCss();
    $('#v73BulkBtn')?.remove();
    const form=$('#settingsForm'); if(!form || $('#bulkJsonSettings')) return;
    const anchor=[...form.querySelectorAll('.settings-section')].find(s=>s.querySelector('h3')?.textContent.includes('AI API')) || form.querySelector('.dialog-actions');
    const sec=document.createElement('section'); sec.className='settings-section'; sec.id='bulkJsonSettings';
    sec.innerHTML=`<h3>교육과정 JSON 일괄 업로드</h3><p class="muted">여러 과목 JSON을 한 번에 선택하면 subject.id를 기준으로 자동 배치합니다. v7/replaceSubject 자료는 해당 과목을 통째로 교체합니다.</p><div class="bulk-json-box"><input id="bulkJsonInput" type="file" accept="application/json,.json" multiple hidden><div class="bulk-json-actions"><button id="bulkJsonChoose" type="button" class="ghost-btn">JSON 여러 개 선택</button><button id="bulkJsonApply" type="button" class="primary-btn" disabled>선택 파일 일괄 적용</button></div><div id="bulkJsonList" class="bulk-json-list">선택된 파일이 없습니다.</div><div id="bulkJsonStatus" class="bulk-json-status"></div></div>`;
    form.insertBefore(sec, anchor);
    $('#bulkJsonChoose').onclick=()=>$('#bulkJsonInput').click();
    $('#bulkJsonInput').onchange=e=>{files=[...(e.target.files||[])];renderFiles();};
    $('#bulkJsonApply').onclick=apply;
  }

  function renderFiles(){
    const list=$('#bulkJsonList'), btn=$('#bulkJsonApply'); if(!list||!btn)return;
    if(!files.length){list.textContent='선택된 파일이 없습니다.';btn.disabled=true;return;}
    list.innerHTML=files.map((f,i)=>`${i+1}. ${esc(f.name)}`).join('<br>'); btn.disabled=false;
  }

  function normalize(payload){
    if(payload?.subject && typeof payload.subject==='object') return payload.subject;
    if(Array.isArray(payload?.subjects) && payload.subjects.length===1) return payload.subjects[0];
    if(payload?.id && Array.isArray(payload?.sections)) return payload;
    throw new Error('subject를 확인할 수 없는 JSON 형식');
  }

  function merge(oldSub,newSub){
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

  async function apply(){
    if(!files.length)return;
    const btn=$('#bulkJsonApply'), status=$('#bulkJsonStatus'); btn.disabled=true; status.textContent='업로드 처리 중...';
    const d=read(DATA_KEY,{schemaVersion:5,subjects:[]}); d.subjects??=[]; const results=[];
    for(const file of files){
      try{
        const payload=JSON.parse(await file.text()); const incoming=normalize(payload); if(!incoming.id)throw new Error('subject.id 없음');
        const idx=d.subjects.findIndex(s=>s.id===incoming.id);
        const replace=payload.replaceSubject===true || incoming.replaceSubject===true || Number(payload.schemaVersion)>=7;
        const clean={...incoming,reviewItems:incoming.reviewItems||[]};
        if(idx<0)d.subjects.push(clean); else d.subjects[idx]=replace?clean:merge(d.subjects[idx],clean);
        results.push(`✓ ${file.name} → ${incoming.name||incoming.id}${replace?' (교체)':' (병합)'}`);
      }catch(err){results.push(`✕ ${file.name} — ${err.message||err}`);}
    }
    d.schemaVersion=Math.max(Number(d.schemaVersion)||5,7); write(DATA_KEY,d);
    const s=read(SETTINGS_KEY,{visibleSubjects:[],sectionPrefs:{}}); s.visibleSubjects??=[];
    d.subjects.forEach(sub=>{if(!s.visibleSubjects.includes(sub.id))s.visibleSubjects.push(sub.id)}); write(SETTINGS_KEY,s);
    sessionStorage.setItem('tes_bulk_result',JSON.stringify(results));
    location.reload();
  }

  function showResult(){
    const raw=sessionStorage.getItem('tes_bulk_result'); if(!raw)return; sessionStorage.removeItem('tes_bulk_result');
    try{const r=JSON.parse(raw); setTimeout(()=>alert('JSON 일괄 업로드 결과\n\n'+r.join('\n')),250);}catch{}
  }

  new MutationObserver(()=>{ensureUi();$('#v73BulkBtn')?.remove();}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();showResult();});else{ensureUi();showResult();}
})();