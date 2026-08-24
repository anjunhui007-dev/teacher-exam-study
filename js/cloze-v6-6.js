(() => {
  const DATA_KEY='tes_curriculum_v5', USER_KEY='tes_user_v5', SETTINGS_KEY='tes_settings_v5';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

  const PARTICLES=['으로부터','에서부터','에게서','한테서','께서는','에게는','에서는','으로써','으로서','으로는','로부터','까지는','부터는','한테는','께서','에서','에게','한테','으로','이나마','이나','부터','까지','보다','처럼','마다','조차','마저','와','과','은','는','이','가','을','를','의','에','로','도','만'].sort((a,b)=>b.length-a.length);
  let lastStudyKey='';

  function injectCss(){
    if($('#v66Style')) return;
    const st=document.createElement('style');st.id='v66Style';st.textContent=`
      #v66Badge{position:fixed;left:10px;bottom:10px;z-index:9999;font:700 10px/1 system-ui;background:#171a21;color:#fff;padding:5px 7px;border-radius:7px;opacity:.58}
      .v66-word{display:inline-flex;align-items:baseline;white-space:nowrap;margin:0 1px}.v66-core{margin:2px 0!important}.v66-tail{display:inline!important;color:var(--text)!important;background:transparent!important;padding:0 0 0 1px!important;margin:0!important;opacity:.82!important;user-select:text!important}.v66-core.selected+.v66-tail{color:var(--text)!important;background:transparent!important}
      .v66-core.v66-group{box-shadow:inset 0 -2px 0 rgba(49,94,251,.45)}
      .study-titlebar .mode-switch,.study-card>.study-footer{display:none!important}
      #v66Dock{position:fixed;z-index:90;width:172px;padding:10px;background:rgba(255,255,255,.98);border:1px solid var(--line);border-radius:15px;box-shadow:0 12px 34px rgba(23,26,33,.13);backdrop-filter:blur(12px);display:grid;gap:7px;transition:width .18s ease}
      #v66Dock.collapsed{width:46px;padding:8px 6px}#v66Dock.collapsed .v66-dock-body,#v66Dock.collapsed .v66-dock-title{display:none}#v66Dock.collapsed .v66-collapse{width:32px;height:32px;padding:0;text-align:center}
      .v66-dock-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.v66-dock-title{font-size:12px;color:var(--muted);font-weight:800;padding-left:4px}.v66-collapse{border:1px solid var(--line);background:#fff;border-radius:9px;padding:5px 8px;cursor:pointer}.v66-dock-body{display:grid;gap:6px}.v66-dock-body button{border:1px solid var(--line);background:#fff;color:var(--text);border-radius:10px;padding:9px 10px;text-align:left;font-size:13px}.v66-dock-body button.active{background:var(--primary-soft);color:var(--primary);border-color:#dfe5ff;font-weight:700}.v66-dock-body button.complete{background:#171a21;color:#fff;border-color:#171a21}.v66-dock-body hr{width:100%;border:0;border-top:1px solid var(--line);margin:2px 0}
      .v66-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,14px);z-index:120;background:#171a21;color:#fff;padding:10px 14px;border-radius:10px;opacity:0;pointer-events:none;transition:.18s;font-size:13px}.v66-toast.show{opacity:1;transform:translate(-50%,0)}
      .section-bar .v66-done-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-left:7px;box-shadow:0 0 0 3px rgba(34,197,94,.12);vertical-align:1px}
      .token-editor .v66-auto-note{display:block;font-size:12px;color:var(--muted);margin:0 0 12px;padding:9px 11px;background:#f7f8fa;border-radius:10px}
      @media(max-width:900px){#v66Dock{left:12px!important;right:12px!important;top:auto!important;bottom:12px!important;width:auto!important;display:flex;align-items:center;padding:8px}.v66-dock-head{flex:0 0 auto}.v66-dock-title{display:none}.v66-dock-body{display:flex;overflow-x:auto}.v66-dock-body hr{display:none}.v66-dock-body button{white-space:nowrap;flex:0 0 auto;text-align:center}.study-card{padding-bottom:96px}.v66-toast{bottom:78px}#v66Dock.collapsed{left:auto!important;width:46px!important}.v66-word{white-space:normal}}
    `;document.head.append(st);
  }
  function cfg(){const s=read(SETTINGS_KEY,{});return {exclude:s.excludeParticles!==false,gradingMode:s.gradingMode||'flexible',dockCollapsed:s.studyDockCollapsed===true};}
  function tokens(text){return String(text||'').split(/(\s+)/).map((text,index)=>({index,text,isSpace:/^\s+$/.test(text)}));}
  function splitParticle(text){
    if(!cfg().exclude)return{core:String(text),suffix:''};
    const raw=String(text),m=raw.match(/^(.*?)([.,!?;:'"“”‘’()\[\]{}<>]*)$/),body=m?.[1]??raw,punct=m?.[2]??'';
    for(const p of PARTICLES){if(!body.endsWith(p))continue;const core=body.slice(0,-p.length);if(!core)continue;return{core,suffix:p+punct};}
    return{core:body,suffix:punct};
  }
  function current(){
    const meta=$('.study-titlebar .eyebrow')?.textContent||'',title=$('.study-titlebar h2')?.textContent?.trim(),[sn,secname]=meta.split('·').map(x=>x.trim()),data=read(DATA_KEY,{subjects:[]});
    for(const sub of data.subjects||[])if(sub.name===sn)for(const sec of sub.sections||[])if(sec.name===secname){const item=(sec.items||[]).find(i=>(i.title||'학습')===title)||sec.items?.[0];if(item)return{sub,sec,item,data};}
    return null;
  }
  function getUser(id){const all=read(USER_KEY,{itemState:{},rounds:{},drafts:{}});all.itemState??={};all.rounds??={};all.drafts??={};all.itemState[id]??={masked:[],wrongTokens:[],wrongCount:0,attempts:0,correct:0};const u=all.itemState[id];u.masked??=[];u.wrongTokens??=[];return{all,u,save:()=>write(USER_KEY,all)};}
  function wordIndexes(ts){return ts.filter(t=>!t.isSpace).map(t=>t.index);}
  function sameSemanticUnit(ts,a,b){for(let i=a+1;i<b;i++)if(ts[i]?.isSpace&&ts[i].text.includes('\n'))return false;return true;}
  function autoGroups(ts,masked){
    const selected=new Set(masked||[]),words=wordIndexes(ts),out=[];let run=[];
    const flush=()=>{if(run.length>1)out.push([...run]);run=[];};
    for(let p=0;p<words.length;p++){const idx=words[p];if(!selected.has(idx)){flush();continue;}if(!run.length){run=[idx];continue;}const prev=run.at(-1);if(words[p-1]===prev&&sameSemanticUnit(ts,prev,idx))run.push(idx);else{flush();run=[idx];}}
    flush();return out;
  }
  function editorHtml(item,u){const ts=tokens(item.originalText),gs=autoGroups(ts,u.masked);return `<span class="v66-auto-note">연속된 어절을 선택하면 자동으로 한 빈칸이 됩니다. 조사 제외가 켜져 있으면 어절 끝 조사만 선택 밖에 남습니다.</span>`+ts.map(t=>{if(t.isSpace)return esc(t.text);const p=splitParticle(t.text),selected=u.masked.includes(t.index),grouped=gs.some(g=>g.includes(t.index));return `<span class="v66-word"><span class="token selectable v66-core${selected?' selected':''}${grouped?' v66-group':''}" data-v66-token="${t.index}">${esc(p.core)}</span>${p.suffix?`<span class="v66-tail">${esc(p.suffix)}</span>`:''}</span>`;}).join('');}
  function setupEditor(box){
    if(box.dataset.v66==='1')return;const c=current();if(!c)return;box.dataset.v66='1';const st=getUser(c.item.id),u=st.u,draw=()=>box.innerHTML=editorHtml(c.item,u);draw();
    box.onclick=e=>{const el=e.target.closest('[data-v66-token]');if(!el||!box.contains(el))return;e.preventDefault();e.stopImmediatePropagation();const idx=Number(el.dataset.v66Token);u.masked=u.masked.includes(idx)?u.masked.filter(x=>x!==idx):[...u.masked,idx].sort((a,b)=>a-b);st.save();draw();};
  }
  function build(item,u,typing){
    const ts=tokens(item.originalText),set=new Set(u.masked||[]),gs=autoGroups(ts,u.masked),first=new Map(gs.map(g=>[g[0],g])),covered=new Set(gs.flatMap(g=>{const a=g[0],b=g.at(-1);return Array.from({length:b-a+1},(_,k)=>a+k);}));let out='';
    for(let i=0;i<ts.length;i++){const t=ts[i],g=first.get(i);if(g){const a=g[0],b=g.at(-1),parts=ts.slice(a,b+1).map(x=>x.text),last=splitParticle(ts[b].text);if(cfg().exclude)parts[parts.length-1]=last.core;const expected=parts.join(''),suffix=cfg().exclude?last.suffix:'',w=Math.max(120,Math.min(520,expected.length*19+36));out+=typing?`<input class="inline-answer" data-v66-idx="${g.join(',')}" data-v66-exp="${esc(expected)}" style="width:${w}px" autocomplete="off" spellcheck="false">${suffix?`<span class="v66-tail">${esc(suffix)}</span>`:''}`:`<span class="token masked" data-v66-reveal="${g.join(',')}">${esc(expected)}</span>${suffix?`<span class="v66-tail">${esc(suffix)}</span>`:''}`;i=b;continue;}if(covered.has(i))continue;if(t.isSpace){out+=esc(t.text);continue;}if(!set.has(i)){out+=`<span>${esc(t.text)}</span>`;continue;}const p=splitParticle(t.text),w=Math.max(76,Math.min(300,p.core.length*22+30));out+=typing?`<input class="inline-answer" data-v66-idx="${i}" data-v66-exp="${esc(p.core)}" style="width:${w}px" autocomplete="off" spellcheck="false">${p.suffix?`<span class="v66-tail">${esc(p.suffix)}</span>`:''}`:`<span class="token masked" data-v66-reveal="${i}">${esc(p.core)}</span>${p.suffix?`<span class="v66-tail">${esc(p.suffix)}</span>`:''}`;}
    return out;
  }
  function setupMask(box){if(box.dataset.v66==='1')return;const c=current();if(!c)return;const st=getUser(c.item.id);if(!st.u.masked.length)return;box.dataset.v66='1';box.innerHTML=build(c.item,st.u,false);const draft=st.all.drafts?.[c.item.id];box.querySelectorAll('[data-v66-reveal]').forEach(el=>{if(draft?.revealed?.includes(el.dataset.v66Reveal))el.classList.add('revealed');el.onclick=()=>el.classList.toggle('revealed');});}
  function norm(v){return String(v||'').toLowerCase().replace(/[\s.,!?;:'"“”‘’·⋅()\[\]{}<>/\\\-_~`]+/g,'');}
  function setupTyping(box){
    if(box.dataset.v66==='1')return;const c=current();if(!c)return;const st=getUser(c.item.id),u=st.u;if(!u.masked.length)return;box.dataset.v66='1';box.innerHTML=build(c.item,u,true);const inputs=[...box.querySelectorAll('.inline-answer')],draft=st.all.drafts?.[c.item.id];
    if(draft?.typingValues)inputs.forEach(input=>{const key=input.dataset.v66Idx;if(Object.prototype.hasOwnProperty.call(draft.typingValues,key))input.value=draft.typingValues[key];});
    const check=input=>{if(!input.value.trim())return;const exp=input.dataset.v66Exp||'',ids=(input.dataset.v66Idx||'').split(',').map(Number),mode=cfg().gradingMode,ok=mode==='strict'?input.value.trim()===exp.trim():mode==='self'?null:norm(input.value)===norm(exp);input.classList.remove('input-correct','input-wrong','input-self');if(ok===null)input.classList.add('input-self');else if(ok){input.classList.add('input-correct');u.wrongTokens=u.wrongTokens.filter(x=>!ids.includes(x));}else{input.classList.add('input-wrong');ids.forEach(i=>{if(!u.wrongTokens.includes(i))u.wrongTokens.push(i);});input.title=`정답: ${exp}`;}st.save();};
    inputs.forEach((input,i)=>{input.onblur=()=>check(input);input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();check(input);inputs[i+1]?.focus();}}});
  }
  function toast(msg){let t=$('#v66Toast');if(!t){t=document.createElement('div');t.id='v66Toast';t.className='v66-toast';document.body.append(t);}t.textContent=msg;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),1600);}
  function currentMode(){return $('.mode-switch [data-mode].active')?.dataset.mode||'mask-edit';}
  function tempSave(){
    const c=current();if(!c)return;const st=getUser(c.item.id),typingValues={};$$('.typing-inline .inline-answer').forEach(i=>typingValues[i.dataset.v66Idx||i.dataset.token||'']=i.value);const revealed=$$('.mask-study [data-v66-reveal].revealed').map(el=>el.dataset.v66Reveal);
    st.all.drafts[c.item.id]={mode:currentMode(),typingValues,revealed,scrollY:window.scrollY,savedAt:Date.now()};st.save();toast('현재 학습 상태를 임시 저장했어요.');
  }
  function enabledSections(sub){const s=read(SETTINGS_KEY,{}),prefs=s.sectionPrefs?.[sub.id]||{};return(sub.sections||[]).filter(sec=>prefs[sec.id]?.study!==false);}
  function sectionComplete(sec,completed){const ids=(sec.items||[]).map(i=>i.id);return ids.length>0&&ids.every(id=>completed.includes(id));}
  function completeCurrent(){
    const c=current();if(!c)return;const st=getUser(c.item.id),r=st.all.rounds[c.sub.id]??={count:0,completed:[]};if(!r.completed.includes(c.item.id))r.completed.push(c.item.id);
    const enabled=enabledSections(c.sub),allIds=enabled.flatMap(sec=>(sec.items||[]).map(i=>i.id));if(allIds.length&&allIds.every(id=>r.completed.includes(id))){r.count=(r.count||0)+1;r.completed=[];toast(`${c.sub.name} ${r.count}회독 완료! 초록불을 초기화했어요.`);}else toast('학습 완료! 이 영역 진행상태를 저장했어요.');st.save();refreshDots();
  }
  function refreshDots(){
    const active=$('#subjectBar [data-subject].active')?.dataset.subject,data=read(DATA_KEY,{subjects:[]}),sub=(data.subjects||[]).find(s=>s.id===active);if(!sub)return;const all=read(USER_KEY,{rounds:{}}),completed=all.rounds?.[sub.id]?.completed||[];
    $$('#sectionBar [data-section]').forEach(btn=>{btn.querySelector('.v66-done-dot')?.remove();const sec=(sub.sections||[]).find(s=>s.id===btn.dataset.section);if(sec&&sectionComplete(sec,completed)){const dot=document.createElement('i');dot.className='v66-done-dot';dot.title='이번 회독에서 학습 완료';btn.append(dot);}});
  }
  function positionDock(){const d=$('#v66Dock'),card=$('.study-card');if(!d||!card||innerWidth<=900)return;const r=card.getBoundingClientRect(),left=Math.min(innerWidth-d.offsetWidth-14,r.right+12);d.style.left=`${Math.max(14,left)}px`;d.style.right='auto';d.style.top=`${Math.max(194,Math.min(innerHeight-330,r.top))}px`;}
  function ensureDock(){
    const card=$('.study-card');if(!card){$('#v66Dock')?.remove();return;}let d=$('#v66Dock');if(!d){d=document.createElement('aside');d.id='v66Dock';d.innerHTML='<div class="v66-dock-head"><span class="v66-dock-title">학습 도구</span><button class="v66-collapse" title="접기/펼치기">‹</button></div><div class="v66-dock-body"><button data-v66-mode="mask-edit">가리기 설정</button><button data-v66-mode="mask-study">가리기 학습</button><button data-v66-mode="typing">타이핑</button><hr><button data-v66-temp>임시 저장</button><button class="complete" data-v66-complete>학습 완료</button></div>';document.body.append(d);d.querySelectorAll('[data-v66-mode]').forEach(b=>b.onclick=()=>document.querySelector(`[data-mode="${b.dataset.v66Mode}"]`)?.click());d.querySelector('[data-v66-temp]').onclick=tempSave;d.querySelector('[data-v66-complete]').onclick=completeCurrent;d.querySelector('.v66-collapse').onclick=()=>{const s=read(SETTINGS_KEY,{});s.studyDockCollapsed=!d.classList.contains('collapsed');write(SETTINGS_KEY,s);d.classList.toggle('collapsed',s.studyDockCollapsed);d.querySelector('.v66-collapse').textContent=s.studyDockCollapsed?'›':'‹';positionDock();};}
    const collapsed=cfg().dockCollapsed;d.classList.toggle('collapsed',collapsed);d.querySelector('.v66-collapse').textContent=collapsed?'›':'‹';d.querySelectorAll('[data-v66-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v66Mode===currentMode()));positionDock();
  }
  function syncSetting(){const box=$('#particleSelectable');if(!box)return;box.checked=cfg().exclude;}
  function restoreDraftMode(){const c=current();if(!c)return;const draft=getUser(c.item.id).all.drafts?.[c.item.id];if(!draft?.mode)return;const key=`${c.item.id}:${draft.savedAt||0}`;if(lastStudyKey===key)return;lastStudyKey=key;if(draft.mode!==currentMode())setTimeout(()=>document.querySelector(`[data-mode="${draft.mode}"]`)?.click(),0);else if(Number.isFinite(draft.scrollY))setTimeout(()=>scrollTo(0,draft.scrollY),50);}
  document.addEventListener('change',e=>{if(e.target?.id==='particleSelectable'){const s=read(SETTINGS_KEY,{});s.excludeParticles=e.target.checked;write(SETTINGS_KEY,s);}},true);
  document.addEventListener('click',e=>{if(e.target.closest('#settingsBtn'))setTimeout(syncSetting,0);if(e.target.closest('#saveSettingsBtn')){const checked=$('#particleSelectable')?.checked!==false;setTimeout(()=>{const s=read(SETTINGS_KEY,{});s.excludeParticles=checked;write(SETTINGS_KEY,s);},50);}},true);
  addEventListener('resize',positionDock);addEventListener('scroll',positionDock,{passive:true});
  function enhance(){injectCss();if(!$('#v66Badge')){const b=document.createElement('div');b.id='v66Badge';b.textContent='Study v6.6';document.body.append(b);}syncSetting();ensureDock();refreshDots();const e=$('.token-editor');if(e)setupEditor(e);const m=$('.mask-study');if(m)setupMask(m);const t=$('.typing-inline');if(t)setupTyping(t);if($('.study-card'))restoreDraftMode();}
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();