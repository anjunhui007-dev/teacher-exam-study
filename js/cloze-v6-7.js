(() => {
  'use strict';
  const DATA_KEY='tes_curriculum_v5', USER_KEY='tes_user_v5', SETTINGS_KEY='tes_settings_v5';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const PARTICLES=['으로부터','에서부터','에게서','한테서','께서는','에게는','에서는','으로써','으로서','으로는','로부터','까지는','부터는','한테는','께서','에서','에게','한테','으로','이나마','이나','부터','까지','보다','처럼','마다','조차','마저','와','과','은','는','이','가','을','를','의','에','로','도','만'].sort((a,b)=>b.length-a.length);
  let enhanceQueued=false, restoredKey='';

  function settings(){const s=read(SETTINGS_KEY,{});return {excludeParticles:s.excludeParticles!==false,gradingMode:s.gradingMode||'flexible',dockCollapsed:s.studyDockCollapsed===true};}
  function injectCss(){
    if($('#v67Style')) return;
    const st=document.createElement('style'); st.id='v67Style'; st.textContent=`
      #v67Badge{position:fixed;left:10px;bottom:10px;z-index:9999;font:700 10px/1 system-ui;background:#171a21;color:#fff;padding:5px 7px;border-radius:7px;opacity:.55}
      .study-titlebar .mode-switch,.study-card>.study-footer{display:none!important}
      .v67-word{display:inline-flex;align-items:baseline;white-space:nowrap}.v67-core{margin:2px 2px!important}.v67-tail{display:inline!important;color:var(--text)!important;background:transparent!important;padding:0!important;margin:0 2px 0 -1px!important;opacity:.8!important;user-select:text!important}.v67-core.selected+.v67-tail{color:var(--text)!important;background:transparent!important}.v67-core.v67-group{box-shadow:inset 0 -2px 0 rgba(49,94,251,.5)}
      .v67-note{font-size:12px;color:var(--muted);padding:9px 11px;background:#f7f8fa;border-radius:10px;margin:0 0 12px}
      #v67Dock{position:fixed;z-index:90;width:178px;padding:10px;background:rgba(255,255,255,.98);border:1px solid var(--line);border-radius:15px;box-shadow:0 12px 34px rgba(23,26,33,.13);backdrop-filter:blur(12px);display:grid;gap:7px;transition:width .18s ease,padding .18s ease}
      #v67Dock.collapsed{width:46px;padding:8px 6px}#v67Dock.collapsed .v67-dock-body,#v67Dock.collapsed .v67-dock-title{display:none}#v67Dock.collapsed .v67-collapse{width:32px;height:32px;padding:0;text-align:center}
      .v67-dock-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.v67-dock-title{font-size:12px;color:var(--muted);font-weight:800;padding-left:4px}.v67-collapse{border:1px solid var(--line);background:#fff;border-radius:9px;padding:5px 8px;cursor:pointer}.v67-dock-body{display:grid;gap:6px}.v67-dock-body button{border:1px solid var(--line);background:#fff;color:var(--text);border-radius:10px;padding:9px 10px;text-align:left;font-size:13px}.v67-dock-body button.active{background:var(--primary-soft);color:var(--primary);border-color:#dfe5ff;font-weight:700}.v67-dock-body button.complete{background:#171a21;color:#fff;border-color:#171a21}.v67-dock-body hr{width:100%;border:0;border-top:1px solid var(--line);margin:2px 0}.v67-save-time{font-size:10px;color:var(--muted);padding:1px 4px 3px}
      .section-bar .v67-done-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-left:7px;box-shadow:0 0 0 3px rgba(34,197,94,.12);vertical-align:1px}
      .v67-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,14px);z-index:120;background:#171a21;color:#fff;padding:10px 14px;border-radius:10px;opacity:0;pointer-events:none;transition:.18s;font-size:13px}.v67-toast.show{opacity:1;transform:translate(-50%,0)}
      @media(max-width:900px){#v67Dock{left:12px!important;right:12px!important;top:auto!important;bottom:12px!important;width:auto!important;display:flex;align-items:center;padding:8px}.v67-dock-head{flex:0 0 auto}.v67-dock-title{display:none}.v67-dock-body{display:flex;overflow-x:auto}.v67-dock-body hr,.v67-save-time{display:none}.v67-dock-body button{white-space:nowrap;flex:0 0 auto;text-align:center}.study-card{padding-bottom:96px}.v67-toast{bottom:78px}#v67Dock.collapsed{left:auto!important;right:12px!important;width:46px!important}.v67-word{white-space:normal}}
    `; document.head.append(st);
  }
  function tokens(text){return String(text||'').split(/(\s+)/).map((text,index)=>({index,text,isSpace:/^\s+$/.test(text)}));}
  function splitParticle(text){
    if(!settings().excludeParticles) return {core:String(text),suffix:''};
    const raw=String(text),m=raw.match(/^(.*?)([.,!?;:'"“”‘’()\[\]{}<>]*)$/),body=m?.[1]??raw,punct=m?.[2]??'';
    for(const p of PARTICLES){ if(!body.endsWith(p)) continue; const core=body.slice(0,-p.length); if(!core) continue; return {core,suffix:p+punct}; }
    return {core:body,suffix:punct};
  }
  function current(){
    const meta=$('.study-titlebar .eyebrow')?.textContent||'',title=$('.study-titlebar h2')?.textContent?.trim(); if(!meta||!title) return null;
    const [sn,secname]=meta.split('·').map(x=>x.trim()),data=read(DATA_KEY,{subjects:[]});
    for(const sub of data.subjects||[]) if(sub.name===sn) for(const sec of sub.sections||[]) if(sec.name===secname){ const item=(sec.items||[]).find(i=>(i.title||'학습')===title)||sec.items?.[0]; if(item)return{sub,sec,item}; }
    return null;
  }
  function getUser(id){
    const all=read(USER_KEY,{itemState:{},rounds:{},drafts:{}}); all.itemState??={};all.rounds??={};all.drafts??={};
    all.itemState[id]??={masked:[],wrongTokens:[],wrongCount:0,attempts:0,correct:0}; const u=all.itemState[id];u.masked??=[];u.wrongTokens??=[];
    return {all,u,save:()=>write(USER_KEY,all)};
  }
  function sameUnit(ts,a,b){for(let i=a+1;i<b;i++) if(ts[i]?.isSpace&&/\n/.test(ts[i].text)) return false; return true;}
  function autoGroups(ts,masked){
    const selected=new Set(masked||[]),words=ts.filter(t=>!t.isSpace).map(t=>t.index),out=[];let run=[];
    const flush=()=>{if(run.length>1)out.push([...run]);run=[];};
    for(let p=0;p<words.length;p++){const idx=words[p];if(!selected.has(idx)){flush();continue;}if(!run.length){run=[idx];continue;}const prev=run.at(-1);if(words[p-1]===prev&&sameUnit(ts,prev,idx))run.push(idx);else{flush();run=[idx];}}
    flush();return out;
  }
  function editorHtml(item,u){
    const ts=tokens(item.originalText),groups=autoGroups(ts,u.masked);
    return `<div class="v67-note">연속된 어절을 선택하면 자동으로 하나의 빈칸으로 연결됩니다. 조사 제외가 켜져 있으면 마지막 조사만 빈칸 밖에 남습니다.</div>`+ts.map(t=>{
      if(t.isSpace)return esc(t.text);const p=splitParticle(t.text),sel=u.masked.includes(t.index),grp=groups.some(g=>g.includes(t.index));
      return `<span class="v67-word"><span class="token selectable v67-core${sel?' selected':''}${grp?' v67-group':''}" data-v67-token="${t.index}">${esc(p.core)}</span>${p.suffix?`<span class="v67-tail">${esc(p.suffix)}</span>`:''}</span>`;
    }).join('');
  }
  function setupEditor(box){
    if(box.dataset.v67==='1')return;const c=current();if(!c)return;box.dataset.v67='1';const st=getUser(c.item.id),u=st.u,draw=()=>{box.innerHTML=editorHtml(c.item,u);};draw();
    box.addEventListener('click',e=>{
      const el=e.target.closest('[data-v67-token]');if(!el||!box.contains(el))return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const idx=Number(el.dataset.v67Token);u.masked=u.masked.includes(idx)?u.masked.filter(x=>x!==idx):[...u.masked,idx].sort((a,b)=>a-b);st.save();draw();
    },true);
  }
  function build(item,u,typing){
    const ts=tokens(item.originalText),set=new Set(u.masked||[]),groups=autoGroups(ts,u.masked),first=new Map(groups.map(g=>[g[0],g]));
    const covered=new Set(groups.flatMap(g=>{const a=g[0],b=g.at(-1);return Array.from({length:b-a+1},(_,k)=>a+k);}));let out='';
    for(let i=0;i<ts.length;i++){
      const t=ts[i],g=first.get(i);
      if(g){const a=g[0],b=g.at(-1),parts=ts.slice(a,b+1).map(x=>x.text),last=splitParticle(ts[b].text);if(settings().excludeParticles)parts[parts.length-1]=last.core;const exp=parts.join(''),suffix=settings().excludeParticles?last.suffix:'',w=Math.max(120,Math.min(520,exp.length*19+36));out+=typing?`<input class="inline-answer" data-v67-idx="${g.join(',')}" data-v67-exp="${esc(exp)}" style="width:${w}px" autocomplete="off" spellcheck="false">${suffix?`<span class="v67-tail">${esc(suffix)}</span>`:''}`:`<span class="token masked" data-v67-reveal="${g.join(',')}">${esc(exp)}</span>${suffix?`<span class="v67-tail">${esc(suffix)}</span>`:''}`;i=b;continue;}
      if(covered.has(i))continue;if(t.isSpace){out+=esc(t.text);continue;}if(!set.has(i)){out+=`<span>${esc(t.text)}</span>`;continue;}
      const p=splitParticle(t.text),w=Math.max(76,Math.min(300,p.core.length*22+30));out+=typing?`<input class="inline-answer" data-v67-idx="${i}" data-v67-exp="${esc(p.core)}" style="width:${w}px" autocomplete="off" spellcheck="false">${p.suffix?`<span class="v67-tail">${esc(p.suffix)}</span>`:''}`:`<span class="token masked" data-v67-reveal="${i}">${esc(p.core)}</span>${p.suffix?`<span class="v67-tail">${esc(p.suffix)}</span>`:''}`;
    }
    return out;
  }
  function setupMask(box){
    if(box.dataset.v67==='1')return;const c=current();if(!c)return;const st=getUser(c.item.id);if(!st.u.masked.length)return;box.dataset.v67='1';box.innerHTML=build(c.item,st.u,false);const d=st.all.drafts[c.item.id];
    box.querySelectorAll('[data-v67-reveal]').forEach(el=>{if(d?.revealed?.includes(el.dataset.v67Reveal))el.classList.add('revealed');el.addEventListener('click',()=>el.classList.toggle('revealed'));});
  }
  function norm(v){return String(v||'').toLowerCase().replace(/[\s.,!?;:'"“”‘’·⋅()\[\]{}<>/\\\-_~`]+/g,'');}
  function setupTyping(box){
    if(box.dataset.v67==='1')return;const c=current();if(!c)return;const st=getUser(c.item.id),u=st.u;if(!u.masked.length)return;box.dataset.v67='1';box.innerHTML=build(c.item,u,true);const inputs=[...box.querySelectorAll('.inline-answer')],d=st.all.drafts[c.item.id];
    if(d?.typingValues)inputs.forEach(i=>{const k=i.dataset.v67Idx;if(k in d.typingValues)i.value=d.typingValues[k];});
    const check=input=>{if(!input.value.trim())return;const exp=input.dataset.v67Exp||'',ids=(input.dataset.v67Idx||'').split(',').map(Number),m=settings().gradingMode,ok=m==='strict'?input.value.trim()===exp.trim():m==='self'?null:norm(input.value)===norm(exp);input.classList.remove('input-correct','input-wrong','input-self');if(ok===null)input.classList.add('input-self');else if(ok){input.classList.add('input-correct');u.wrongTokens=u.wrongTokens.filter(x=>!ids.includes(x));}else{input.classList.add('input-wrong');ids.forEach(i=>{if(!u.wrongTokens.includes(i))u.wrongTokens.push(i);});input.title=`정답: ${exp}`;}st.save();};
    inputs.forEach((input,i)=>{input.addEventListener('blur',()=>check(input));input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check(input);inputs[i+1]?.focus();}});});
  }
  function toast(msg){let t=$('#v67Toast');if(!t){t=document.createElement('div');t.id='v67Toast';t.className='v67-toast';document.body.append(t);}t.textContent=msg;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),1800);}
  function mode(){return $('.mode-switch [data-mode].active')?.dataset.mode||'mask-edit';}
  function tempSave(){
    const c=current();if(!c)return;const st=getUser(c.item.id),typingValues={};$$('.typing-inline .inline-answer').forEach(i=>typingValues[i.dataset.v67Idx||i.dataset.token||'']=i.value);const revealed=$$('.mask-study [data-v67-reveal].revealed').map(el=>el.dataset.v67Reveal);
    st.all.drafts[c.item.id]={mode:mode(),typingValues,revealed,scrollY:window.scrollY,savedAt:Date.now()};st.save();updateSaveTime();toast('현재 학습 상태를 임시 저장했어요.');
  }
  function enabledSections(sub){const prefs=read(SETTINGS_KEY,{}).sectionPrefs?.[sub.id]||{};return(sub.sections||[]).filter(sec=>prefs[sec.id]?.study!==false);}
  function sectionDone(sec,completed){const ids=(sec.items||[]).map(i=>i.id);return ids.length>0&&ids.every(id=>completed.includes(id));}
  function completeCurrent(){
    const c=current();if(!c)return;const st=getUser(c.item.id),r=st.all.rounds[c.sub.id]??={count:0,completed:[]};if(!r.completed.includes(c.item.id))r.completed.push(c.item.id);
    const enabled=enabledSections(c.sub),allIds=enabled.flatMap(sec=>(sec.items||[]).map(i=>i.id));
    if(allIds.length&&allIds.every(id=>r.completed.includes(id))){r.count=(r.count||0)+1;r.completed=[];toast(`${c.sub.name} ${r.count}회독 완료! 영역 표시를 초기화했어요.`);}else toast('학습 완료! 영역 진행상태를 저장했어요.');
    st.save();refreshDots(true);
  }
  function dotState(){
    const subName=$('.study-titlebar .eyebrow')?.textContent?.split('·')[0]?.trim(); if(!subName)return null;const data=read(DATA_KEY,{subjects:[]}),sub=(data.subjects||[]).find(s=>s.name===subName);if(!sub)return null;
    const completed=read(USER_KEY,{rounds:{}}).rounds?.[sub.id]?.completed||[];const done=new Set((sub.sections||[]).filter(sec=>sectionDone(sec,completed)).map(sec=>sec.id));return {sub,done};
  }
  function refreshDots(){
    const ds=dotState();if(!ds)return;$$('#sectionBar [data-section]').forEach(btn=>{const should=ds.done.has(btn.dataset.section),has=!!btn.querySelector('.v67-done-dot');if(should&&!has){const d=document.createElement('span');d.className='v67-done-dot';d.title='이번 회독 학습 완료';btn.append(d);}else if(!should&&has)btn.querySelector('.v67-done-dot').remove();});
  }
  function positionDock(){
    const dock=$('#v67Dock'),card=$('.study-card');if(!dock||!card)return; if(innerWidth<=900)return;
    const r=card.getBoundingClientRect(),gap=14,w=dock.classList.contains('collapsed')?46:178;let left=r.right+gap;if(left+w>innerWidth-12)left=Math.max(12,r.right-w-12);dock.style.left=`${Math.round(left)}px`;dock.style.right='auto';dock.style.top=`${Math.max(196,Math.round(r.top))}px`;
  }
  function updateSaveTime(){const c=current(),el=$('#v67SaveTime');if(!c||!el)return;const d=read(USER_KEY,{drafts:{}}).drafts?.[c.item.id];el.textContent=d?.savedAt?`임시 저장 ${new Date(d.savedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`:'아직 임시 저장 없음';}
  function ensureDock(){
    if(!$('.study-card')){$('#v67Dock')?.remove();restoredKey='';return;}let d=$('#v67Dock');if(!d){d=document.createElement('aside');d.id='v67Dock';d.innerHTML=`<div class="v67-dock-head"><span class="v67-dock-title">학습 도구</span><button class="v67-collapse" aria-label="학습 도구 접기">‹</button></div><div class="v67-dock-body"><button data-v67-mode="mask-edit">가리기 설정</button><button data-v67-mode="mask-study">가리기 학습</button><button data-v67-mode="typing">타이핑</button><hr><button data-v67-temp>임시 저장</button><div id="v67SaveTime" class="v67-save-time"></div><button class="complete" data-v67-complete>학습 완료</button></div>`;document.body.append(d);
      d.querySelector('.v67-collapse').onclick=()=>{const s=read(SETTINGS_KEY,{});s.studyDockCollapsed=!d.classList.contains('collapsed');write(SETTINGS_KEY,s);applyDockState();positionDock();};
      d.querySelectorAll('[data-v67-mode]').forEach(b=>b.onclick=()=>document.querySelector(`[data-mode="${b.dataset.v67Mode}"]`)?.click());d.querySelector('[data-v67-temp]').onclick=tempSave;d.querySelector('[data-v67-complete]').onclick=completeCurrent;
    }
    applyDockState();$$('#v67Dock [data-v67-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v67Mode===mode()));updateSaveTime();positionDock();
  }
  function applyDockState(){const d=$('#v67Dock');if(!d)return;const collapsed=settings().dockCollapsed;d.classList.toggle('collapsed',collapsed);const b=d.querySelector('.v67-collapse');b.textContent=collapsed?'›':'‹';b.setAttribute('aria-label',collapsed?'학습 도구 펼치기':'학습 도구 접기');}
  function syncSetting(){const box=$('#particleSelectable');if(box)box.checked=settings().excludeParticles;}
  document.addEventListener('change',e=>{if(e.target?.id==='particleSelectable'){const s=read(SETTINGS_KEY,{});s.excludeParticles=e.target.checked;write(SETTINGS_KEY,s);}},true);
  document.addEventListener('click',e=>{if(e.target.closest('#settingsBtn'))setTimeout(syncSetting,0);if(e.target.closest('#saveSettingsBtn')){const checked=$('#particleSelectable')?.checked!==false;setTimeout(()=>{const s=read(SETTINGS_KEY,{});s.excludeParticles=checked;write(SETTINGS_KEY,s);},30);}},true);
  function restoreDraftOnce(){
    const c=current();if(!c)return;const key=c.item.id,d=read(USER_KEY,{drafts:{}}).drafts?.[key];if(!d||restoredKey===key)return;restoredKey=key;
    const native=$(`[data-mode="${d.mode}"]`);if(native&&!native.classList.contains('active')){setTimeout(()=>native.click(),0);return;}if(Number.isFinite(d.scrollY))setTimeout(()=>scrollTo({top:d.scrollY,behavior:'auto'}),0);
  }
  function enhance(){
    injectCss();if(!$('#v67Badge')){const b=document.createElement('div');b.id='v67Badge';b.textContent='Study v6.7';document.body.append(b);}syncSetting();ensureDock();refreshDots();const e=$('.token-editor');if(e)setupEditor(e);const m=$('.mask-study');if(m)setupMask(m);const t=$('.typing-inline');if(t)setupTyping(t);restoreDraftOnce();
  }
  function scheduleEnhance(){if(enhanceQueued)return;enhanceQueued=true;requestAnimationFrame(()=>{enhanceQueued=false;enhance();});}
  new MutationObserver(scheduleEnhance).observe(document.documentElement,{childList:true,subtree:true});addEventListener('resize',positionDock);addEventListener('scroll',positionDock,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
