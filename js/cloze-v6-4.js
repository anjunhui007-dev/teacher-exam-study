(() => {
  const DATA_KEY='tes_curriculum_v5', USER_KEY='tes_user_v5', SETTINGS_KEY='tes_settings_v5';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

  // Longest first. Only an ENDING suffix is removed; particles inside a word are never touched.
  const PARTICLES=[
    '으로부터','에서부터','에게서','한테서','께서는','에게는','에서는','으로써','으로서','으로는','로부터','까지는','부터는','한테는',
    '께서','에서','에게','한테','으로','이나마','이나','부터','까지','보다','처럼','마다','조차','마저','와','과','은','는','이','가','을','를','의','에','로','도','만','나'
  ].sort((a,b)=>b.length-a.length);

  function cfg(){
    const s=read(SETTINGS_KEY,{});
    return {excludeParticles:s.excludeParticles!==false, gradingMode:s.gradingMode||'flexible'};
  }
  function tokens(text){return String(text||'').split(/(\s+)/).map((text,index)=>({index,text,isSpace:/^\s+$/.test(text)}));}
  function splitParticle(text){
    if(!cfg().excludeParticles) return {core:String(text),suffix:''};
    const raw=String(text);
    const m=raw.match(/^(.*?)([.,!?;:'"“”‘’()\[\]{}<>]*)$/);
    const body=m?.[1]??raw, punct=m?.[2]??'';
    for(const p of PARTICLES){
      if(!body.endsWith(p)) continue;
      const core=body.slice(0,-p.length);
      if(!core) continue;
      // Do not split one-syllable lexical words such as '의'.
      if(core.length<1) continue;
      return {core,suffix:p+punct};
    }
    return {core:body,suffix:punct};
  }
  function current(){
    const meta=$('.study-titlebar .eyebrow')?.textContent||'', title=$('.study-titlebar h2')?.textContent?.trim();
    const [sn,secname]=meta.split('·').map(x=>x.trim()), data=read(DATA_KEY,{subjects:[]});
    for(const sub of data.subjects||[]) if(sub.name===sn) for(const sec of sub.sections||[]) if(sec.name===secname){
      const item=(sec.items||[]).find(i=>(i.title||'학습')===title)||sec.items?.[0];
      if(item)return{sub,sec,item,data};
    }
    return null;
  }
  function getUser(id){
    const all=read(USER_KEY,{itemState:{},rounds:{}}); all.itemState??={}; all.rounds??={};
    all.itemState[id]??={masked:[],wrongTokens:[],wrongCount:0,attempts:0,correct:0,maskGroups:[]};
    const u=all.itemState[id];u.masked??=[];u.wrongTokens??=[];u.maskGroups??=[];
    return {all,u,save:()=>write(USER_KEY,all)};
  }
  function wordIndexes(ts){return ts.filter(t=>!t.isSpace).map(t=>t.index);}
  function sameLine(ts,a,b){for(let i=a+1;i<b;i++)if(ts[i]?.isSpace&&ts[i].text.includes('\n'))return false;return true;}

  // Every run of 2+ selected adjacent eojeols on the same semantic line becomes ONE cloze automatically.
  function autoGroups(ts,masked){
    const selected=new Set(masked||[]), words=wordIndexes(ts), out=[]; let run=[];
    const flush=()=>{if(run.length>1)out.push({id:`auto-${run[0]}-${run.at(-1)}`,indexes:[...run]});run=[];};
    for(let p=0;p<words.length;p++){
      const idx=words[p];
      if(!selected.has(idx)){flush();continue;}
      if(!run.length){run=[idx];continue;}
      const prev=run.at(-1);
      if(words[p-1]===prev && sameLine(ts,prev,idx))run.push(idx);else{flush();run=[idx];}
    }
    flush(); return out;
  }
  function groupAt(groups,idx){return groups.find(g=>g.indexes.includes(idx));}
  function groupParts(ts,g){
    const a=Math.min(...g.indexes),b=Math.max(...g.indexes),parts=ts.slice(a,b+1).map(t=>t.text);
    if(cfg().excludeParticles){const last=splitParticle(ts[b].text);parts[parts.length-1]=last.core;return{expected:parts.join(''),suffix:last.suffix,last:b};}
    return{expected:parts.join(''),suffix:'',last:b};
  }
  function norm(v){return String(v||'').toLowerCase().replace(/[\s.,!?;:'"“”‘’·⋅()\[\]{}<>/\\\-_~`]+/g,'');}
  function grade(exp,act){const m=cfg().gradingMode;if(m==='strict')return act.trim()===exp.trim();if(m==='self')return null;return norm(act)===norm(exp);}

  function editorHtml(item,u){
    const ts=tokens(item.originalText),groups=autoGroups(ts,u.masked);
    return ts.map(t=>{
      if(t.isSpace)return esc(t.text);
      const p=splitParticle(t.text), selected=u.masked.includes(t.index), grouped=!!groupAt(groups,t.index);
      return `<span class="cloze-word"><span class="token selectable cloze-core${selected?' selected':''}${grouped?' grouped-token':''}" data-v64-token="${t.index}">${esc(p.core)}</span>${p.suffix?`<span class="particle-tail" aria-hidden="true">${esc(p.suffix)}</span>`:''}</span>`;
    }).join('');
  }
  function setupEditor(box){
    if(box.dataset.v64==='1')return;const c=current();if(!c)return;box.dataset.v64='1';
    const st=getUser(c.item.id),u=st.u,draw=()=>{box.innerHTML=editorHtml(c.item,u);};draw();
    const old=box.previousElementSibling;if(old?.classList.contains('group-toolbar'))old.remove();
    const note=document.createElement('div');note.className='group-toolbar group-toolbar-v64';note.innerHTML='<span class="group-help"><strong>자동 묶기:</strong> 같은 줄에서 연속된 어절을 선택하면 하나의 빈칸으로 합쳐집니다.</span>';box.before(note);
    box.onclick=e=>{const el=e.target.closest('[data-v64-token]');if(!el||!box.contains(el))return;e.preventDefault();e.stopPropagation();const idx=Number(el.dataset.v64Token);u.masked=u.masked.includes(idx)?u.masked.filter(x=>x!==idx):[...u.masked,idx].sort((a,b)=>a-b);u.maskGroups=autoGroups(tokens(c.item.originalText),u.masked);st.save();draw();};
  }

  function buildStudy(item,u,typing){
    const ts=tokens(item.originalText),set=new Set(u.masked||[]),groups=autoGroups(ts,u.masked),first=new Map(groups.map(g=>[Math.min(...g.indexes),g]));
    const covered=new Set(groups.flatMap(g=>{const a=Math.min(...g.indexes),b=Math.max(...g.indexes);return Array.from({length:b-a+1},(_,k)=>a+k);}));
    let out='';
    for(let i=0;i<ts.length;i++){
      const t=ts[i],g=first.get(i);
      if(g){const p=groupParts(ts,g),w=Math.max(120,Math.min(480,p.expected.length*19+36));out+=typing?`<input class="inline-answer grouped-answer" data-v64-indexes="${g.indexes.join(',')}" data-v64-expected="${esc(p.expected)}" style="width:${w}px" autocomplete="off" spellcheck="false">${p.suffix?`<span class="particle-tail">${esc(p.suffix)}</span>`:''}`:`<span class="token masked grouped-mask" data-v64-reveal>${esc(p.expected)}</span>${p.suffix?`<span class="particle-tail">${esc(p.suffix)}</span>`:''}`;i=p.last;continue;}
      if(covered.has(i))continue;
      if(t.isSpace){out+=esc(t.text);continue;}
      if(!set.has(i)){out+=`<span>${esc(t.text)}</span>`;continue;}
      const p=splitParticle(t.text),w=Math.max(76,Math.min(280,p.core.length*22+30));
      out+=typing?`<input class="inline-answer" data-v64-indexes="${i}" data-v64-expected="${esc(p.core)}" style="width:${w}px" autocomplete="off" spellcheck="false">${p.suffix?`<span class="particle-tail">${esc(p.suffix)}</span>`:''}`:`<span class="token masked" data-v64-reveal>${esc(p.core)}</span>${p.suffix?`<span class="particle-tail">${esc(p.suffix)}</span>`:''}`;
    }
    return out;
  }
  function setupMask(box){if(box.dataset.v64==='1')return;const c=current();if(!c)return;const st=getUser(c.item.id);if(!st.u.masked.length)return;box.dataset.v64='1';box.innerHTML=buildStudy(c.item,st.u,false);box.querySelectorAll('[data-v64-reveal]').forEach(el=>el.onclick=()=>el.classList.toggle('revealed'));}
  function setupTyping(box){
    if(box.dataset.v64==='1')return;const c=current();if(!c)return;const st=getUser(c.item.id),u=st.u;if(!u.masked.length)return;box.dataset.v64='1';box.innerHTML=buildStudy(c.item,u,true);
    const inputs=[...box.querySelectorAll('.inline-answer')],result=$('#typingResult');
    const check=input=>{if(!input.value.trim())return;const exp=input.dataset.v64Expected||'',ids=(input.dataset.v64Indexes||'').split(',').map(Number),ok=grade(exp,input.value);input.classList.remove('input-correct','input-wrong','input-self');input.dataset.graded='true';u.attempts=(u.attempts||0)+1;if(ok===null){input.classList.add('input-self');input.title=`정답: ${exp}`;}else if(ok){input.classList.add('input-correct');u.correct=(u.correct||0)+1;u.wrongTokens=(u.wrongTokens||[]).filter(x=>!ids.includes(x));}else{input.classList.add('input-wrong');ids.forEach(i=>{if(!u.wrongTokens.includes(i))u.wrongTokens.push(i);});u.wrongCount=(u.wrongCount||0)+1;input.title=`정답: ${exp}`;}st.save();if(result){const graded=inputs.filter(i=>i.dataset.graded==='true'),correct=graded.filter(i=>i.classList.contains('input-correct')).length;result.innerHTML=`<div class="result-box ${correct===graded.length?'good':'bad'}"><strong>${correct} / ${graded.length}</strong> 현재 채점</div>`;}};
    inputs.forEach((input,i)=>{input.onblur=()=>check(input);input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();check(input);inputs[i+1]?.focus();}}});const all=$('#checkAllBtn');if(all)all.onclick=()=>inputs.forEach(check);inputs[0]?.focus();
  }

  function saveTemp(){
    const c=current();if(!c)return;const st=getUser(c.item.id);st.save();
    const s=read(SETTINGS_KEY,{});write(SETTINGS_KEY,s);showToast('현재 가리기·학습 기록을 임시 저장했어요.');
  }
  function markComplete(){
    const c=current();if(!c)return;const st=getUser(c.item.id),settings=read(SETTINGS_KEY,{});st.all.rounds??={};
    const r=st.all.rounds[c.sub.id]??={count:0,completed:[]};if(!r.completed.includes(c.item.id))r.completed.push(c.item.id);
    const prefs=settings.sectionPrefs?.[c.sub.id]||{};
    const all=(c.sub.sections||[]).filter(sec=>prefs[sec.id]?.study!==false).flatMap(sec=>(sec.items||[]).map(i=>i.id));
    if(all.length&&all.every(id=>r.completed.includes(id))){r.count=(r.count||0)+1;r.completed=[];showToast(`${c.sub.name} ${r.count}회독 완료!`);}else showToast('이 항목을 학습 완료로 저장했어요.');
    st.save();
  }
  function showToast(msg){let t=$('#v64Toast');if(!t){t=document.createElement('div');t.id='v64Toast';t.className='v64-toast';document.body.append(t);}t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),1600);}

  function setupFloatingControls(){
    const card=$('.study-card');if(!card)return;let panel=$('#v64StudyDock');if(panel)return;
    panel=document.createElement('aside');panel.id='v64StudyDock';panel.className='study-dock';
    panel.innerHTML='<strong>학습 도구</strong><button data-v64-mode="mask-edit">가리기 설정</button><button data-v64-mode="mask-study">가리기 학습</button><button data-v64-mode="typing">타이핑</button><hr><button data-v64-temp>임시 저장</button><button class="complete" data-v64-complete>학습 완료</button>';
    document.body.append(panel);
    panel.querySelectorAll('[data-v64-mode]').forEach(btn=>btn.onclick=()=>{const native=$(`[data-mode="${btn.dataset.v64Mode}"]`);native?.click();});
    panel.querySelector('[data-v64-temp]').onclick=saveTemp;panel.querySelector('[data-v64-complete]').onclick=markComplete;
  }
  function removeFloatingControls(){if(!$('.study-card'))$('#v64StudyDock')?.remove();}

  function syncSetting(){const box=$('#particleSelectable');if(!box)return;const s=read(SETTINGS_KEY,{});box.checked=s.excludeParticles!==false;}
  document.addEventListener('change',e=>{if(e.target?.id!=='particleSelectable')return;const s=read(SETTINGS_KEY,{});s.excludeParticles=e.target.checked;write(SETTINGS_KEY,s);},true);
  document.addEventListener('click',e=>{if(e.target.closest('#settingsBtn'))setTimeout(syncSetting,0);if(e.target.closest('#saveSettingsBtn')){const checked=$('#particleSelectable')?.checked!==false;setTimeout(()=>{const s=read(SETTINGS_KEY,{});s.excludeParticles=checked;write(SETTINGS_KEY,s);},40);}},true);

  function enhance(){syncSetting();if($('.study-card'))setupFloatingControls();else removeFloatingControls();const e=$('.token-editor');if(e)setupEditor(e);const m=$('.mask-study');if(m)setupMask(m);const t=$('.typing-inline');if(t)setupTyping(t);}
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();