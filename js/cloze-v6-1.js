(() => {
  const DATA_KEY='tes_curriculum_v5', USER_KEY='tes_user_v5', SETTINGS_KEY='tes_settings_v5';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const PARTICLES=['으로써','으로서','에서부터','에게서','께서는','에게는','한테서','으로는','로부터','까지는','부터는','에서는','에게는','한테는','께서','에서','에게','한테','으로','와','과','이나','이나마','은','는','이','가','을','를','의','에','로','도','만','부터','까지','보다','처럼','마다','조차','마저'];
  let groupMode=false, draft=[];

  function cfg(){const s=read(SETTINGS_KEY,{});return {particleSelectable:s.particleSelectable===true,gradingMode:s.gradingMode||'flexible'}}
  function tokens(text){return String(text||'').split(/(\s+)/).map((text,index)=>({index,text,isSpace:/^\s+$/.test(text)}))}
  function splitParticle(text){
    if(cfg().particleSelectable) return {core:text,suffix:''};
    const m=String(text).match(/^(.*?)([.,!?;:'"“”‘’()\[\]{}<>]*)$/);
    const body=m?.[1]??String(text), punct=m?.[2]??'';
    for(const p of PARTICLES){
      if(!body.endsWith(p)) continue;
      const core=body.slice(0,-p.length);
      if(core.length<2) continue;
      // Conservative exclusions to avoid chopping common verb/adjective endings.
      if(['는','은','이','가'].includes(p) && /(하|되|있|없|같|싶|받|주|보|알|살|가|오|먹|읽|쓰|만들|따르)$/.test(core)) continue;
      return {core,suffix:p+punct};
    }
    return {core:body,suffix:punct};
  }
  function current(){
    const meta=$('.study-titlebar .eyebrow')?.textContent||'';
    const title=$('.study-titlebar h2')?.textContent?.trim();
    const [sn,secname]=meta.split('·').map(x=>x.trim());
    const data=read(DATA_KEY,{subjects:[]});
    for(const sub of data.subjects||[]) if(sub.name===sn) for(const sec of sub.sections||[]) if(sec.name===secname){
      const item=(sec.items||[]).find(i=>(i.title||'학습')===title)||sec.items?.[0];
      if(item) return {sub,sec,item};
    }
    return null;
  }
  function getUser(id){
    const all=read(USER_KEY,{itemState:{},rounds:{}}); all.itemState??={};
    all.itemState[id]??={masked:[],wrongTokens:[],wrongCount:0,attempts:0,correct:0,maskGroups:[]};
    const u=all.itemState[id]; u.masked??=[]; u.wrongTokens??=[]; u.maskGroups??=[];
    return {u,save:()=>write(USER_KEY,all)};
  }
  function groups(u){return (u.maskGroups||[]).filter(g=>Array.isArray(g.indexes)&&g.indexes.length>1).map(g=>({...g,indexes:[...new Set(g.indexes)].sort((a,b)=>a-b)}))}
  function groupAt(u,idx){return groups(u).find(g=>g.indexes.includes(idx))}
  function wordIndexes(ts){return ts.filter(t=>!t.isSpace).map(t=>t.index)}
  function contiguous(ts,ids){
    const w=wordIndexes(ts), pos=ids.map(i=>w.indexOf(i)).sort((a,b)=>a-b);
    if(pos.length<2||pos.some(i=>i<0)) return false;
    for(let i=1;i<pos.length;i++) if(pos[i]!==pos[i-1]+1) return false;
    const a=w[pos[0]], b=w[pos.at(-1)];
    for(let i=a;i<=b;i++) if(ts[i]?.isSpace && ts[i].text.includes('\n')) return false;
    return true;
  }
  function groupParts(ts,g){
    const a=Math.min(...g.indexes), b=Math.max(...g.indexes), parts=ts.slice(a,b+1).map(t=>t.text);
    if(cfg().particleSelectable) return {expected:parts.join(''),suffix:'',last:b};
    const last=splitParticle(ts[b].text);
    parts[parts.length-1]=last.core;
    return {expected:parts.join(''),suffix:last.suffix,last:b};
  }
  function norm(v){return String(v||'').toLowerCase().replace(/[\s.,!?;:'"“”‘’·⋅()\[\]{}<>/\\\-_~`]+/g,'')}
  function grade(exp,act){const m=cfg().gradingMode;if(m==='strict')return act.trim()===exp.trim();if(m==='self')return null;return norm(act)===norm(exp)}

  function editorHtml(item,u){
    const ts=tokens(item.originalText);
    return ts.map(t=>{
      if(t.isSpace) return esc(t.text);
      const p=splitParticle(t.text);
      const sel=u.masked.includes(t.index)?' selected':'';
      const grouped=groupAt(u,t.index)?' grouped-token':'';
      const draftCls=draft.includes(t.index)?' group-draft':'';
      return `<span class="cloze-word"><span class="token selectable cloze-core${sel}${grouped}${draftCls}" data-v61-token="${t.index}">${esc(p.core)}</span>${p.suffix?`<span class="particle-tail">${esc(p.suffix)}</span>`:''}</span>`;
    }).join('');
  }
  function refreshEditor(box,item,u){box.innerHTML=editorHtml(item,u)}

  function setupEditor(box){
    if(box.dataset.v61==='1') return;
    const c=current(); if(!c) return;
    box.dataset.v61='1';
    const st=getUser(c.item.id), u=st.u, ts=tokens(c.item.originalText);
    refreshEditor(box,c.item,u);
    let bar=box.previousElementSibling;
    if(!bar?.classList.contains('group-toolbar-v61')){
      bar=document.createElement('div'); bar.className='group-toolbar group-toolbar-v61';
      bar.innerHTML='<button class="ghost-btn" data-v61-group>인접 어절 묶기</button><button class="primary-btn mini" data-v61-finish hidden>묶기 완료</button><button class="ghost-btn mini" data-v61-cancel hidden>취소</button><span class="group-help">조사 제외 OFF 예: 교육과정의 → [교육과정]의</span>';
      box.before(bar);
    }
    const gbtn=bar.querySelector('[data-v61-group]'), fin=bar.querySelector('[data-v61-finish]'), can=bar.querySelector('[data-v61-cancel]');
    const sync=()=>{fin.hidden=!groupMode;can.hidden=!groupMode;gbtn.classList.toggle('active',groupMode);refreshEditor(box,c.item,u)};
    gbtn.onclick=()=>{groupMode=!groupMode;draft=[];sync()};
    can.onclick=()=>{groupMode=false;draft=[];sync()};
    fin.onclick=()=>{
      const ids=[...new Set(draft)].sort((a,b)=>a-b);
      if(!contiguous(ts,ids)) return alert('같은 줄에서 서로 붙어 있는 어절만 묶을 수 있어요.');
      u.maskGroups=(u.maskGroups||[]).filter(g=>!g.indexes.some(i=>ids.includes(i)));
      u.maskGroups.push({id:`g-${Date.now()}-${ids[0]}`,indexes:ids});
      u.masked=[...new Set([...(u.masked||[]),...ids])].sort((a,b)=>a-b);
      st.save(); groupMode=false; draft=[]; sync();
    };
    box.onclick=e=>{
      const el=e.target.closest('[data-v61-token]'); if(!el||!box.contains(el)) return;
      e.preventDefault(); e.stopPropagation();
      const idx=Number(el.dataset.v61Token);
      if(groupMode){draft=draft.includes(idx)?draft.filter(x=>x!==idx):[...draft,idx].sort((a,b)=>a-b);sync();return;}
      u.masked=u.masked.includes(idx)?u.masked.filter(x=>x!==idx):[...u.masked,idx].sort((a,b)=>a-b);
      st.save(); sync();
    };
  }

  function buildStudy(item,u,typing){
    const ts=tokens(item.originalText), set=new Set(u.masked||[]), gs=groups(u).filter(g=>g.indexes.some(i=>set.has(i)));
    const first=new Map(gs.map(g=>[Math.min(...g.indexes),g]));
    const covered=new Set(gs.flatMap(g=>{const a=Math.min(...g.indexes),b=Math.max(...g.indexes);return Array.from({length:b-a+1},(_,k)=>a+k)}));
    let out='';
    for(let i=0;i<ts.length;i++){
      const t=ts[i], g=first.get(i);
      if(g){const p=groupParts(ts,g);const w=Math.max(110,Math.min(420,p.expected.length*19+34));out+=typing?`<input class="inline-answer grouped-answer" data-v61-indexes="${g.indexes.join(',')}" data-v61-expected="${esc(p.expected)}" style="width:${w}px" autocomplete="off">${esc(p.suffix)}`:`<span class="token masked grouped-mask" data-v61-reveal>${esc(p.expected)}</span>${esc(p.suffix)}`;i=p.last;continue}
      if(covered.has(i)) continue;
      if(t.isSpace){out+=esc(t.text);continue}
      if(!set.has(i)){out+=`<span>${esc(t.text)}</span>`;continue}
      const p=splitParticle(t.text), w=Math.max(76,Math.min(260,p.core.length*22+28));
      out+=typing?`<input class="inline-answer" data-v61-indexes="${i}" data-v61-expected="${esc(p.core)}" style="width:${w}px" autocomplete="off">${esc(p.suffix)}`:`<span class="token masked" data-v61-reveal>${esc(p.core)}</span>${esc(p.suffix)}`;
    }
    return out;
  }
  function setupMask(box){
    if(box.dataset.v61==='1') return; const c=current(); if(!c) return; const st=getUser(c.item.id); if(!st.u.masked.length) return;
    box.dataset.v61='1'; box.innerHTML=buildStudy(c.item,st.u,false); box.querySelectorAll('[data-v61-reveal]').forEach(el=>el.onclick=()=>el.classList.toggle('revealed'));
  }
  function setupTyping(box){
    if(box.dataset.v61==='1') return; const c=current(); if(!c) return; const st=getUser(c.item.id),u=st.u; if(!u.masked.length) return;
    box.dataset.v61='1'; box.innerHTML=buildStudy(c.item,u,true);
    const inputs=[...box.querySelectorAll('.inline-answer')], result=$('#typingResult');
    const check=input=>{if(!input.value.trim())return;const exp=input.dataset.v61Expected||'',ids=(input.dataset.v61Indexes||'').split(',').map(Number),ok=grade(exp,input.value);input.classList.remove('input-correct','input-wrong','input-self');input.dataset.graded='true';u.attempts=(u.attempts||0)+1;if(ok===null){input.classList.add('input-self');input.title=`정답: ${exp}`}else if(ok){input.classList.add('input-correct');u.correct=(u.correct||0)+1;u.wrongTokens=(u.wrongTokens||[]).filter(x=>!ids.includes(x))}else{input.classList.add('input-wrong');ids.forEach(i=>{if(!u.wrongTokens.includes(i))u.wrongTokens.push(i)});u.wrongCount=(u.wrongCount||0)+1;input.title=`정답: ${exp}`}st.save();if(result){const graded=inputs.filter(i=>i.dataset.graded==='true'),correct=graded.filter(i=>i.classList.contains('input-correct')).length;result.innerHTML=`<div class="result-box ${correct===graded.length?'good':'bad'}"><strong>${correct} / ${graded.length}</strong> 현재 채점</div>`}};
    inputs.forEach((input,i)=>{input.onblur=()=>check(input);input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();check(input);inputs[i+1]?.focus()}}});
    const all=$('#checkAllBtn'); if(all) all.onclick=()=>inputs.forEach(check); inputs[0]?.focus();
  }
  function settingsUi(){
    const box=$('#particleSelectable'); if(!box) return;
    box.checked=cfg().particleSelectable;
    if(box.dataset.v61!=='1'){
      box.dataset.v61='1';
      box.addEventListener('change',()=>{const s=read(SETTINGS_KEY,{});s.particleSelectable=box.checked;write(SETTINGS_KEY,s)});
    }
  }
  function enhance(){settingsUi();const e=$('.token-editor');if(e)setupEditor(e);const m=$('.mask-study');if(m)setupMask(m);const t=$('.typing-inline');if(t)setupTyping(t)}
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();