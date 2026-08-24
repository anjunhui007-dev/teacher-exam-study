(() => {
  'use strict';
  const USER_KEY='tes_user_v5';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  let queued=false;

  function injectCss(){
    if($('#v71MaskFeedbackStyle')) return;
    const st=document.createElement('style');
    st.id='v71MaskFeedbackStyle';
    st.textContent=`
      .mask-study [data-v7-reveal].v71-correct{
        color:var(--text)!important;
        background:transparent!important;
        border:2px solid #22c55e!important;
        box-shadow:0 0 0 3px rgba(34,197,94,.10)!important;
        user-select:text;
      }
      .mask-study [data-v7-reveal].v71-wrong{
        color:var(--text)!important;
        background:transparent!important;
        border:2px solid #ef4444!important;
        box-shadow:0 0 0 3px rgba(239,68,68,.10)!important;
        user-select:text;
      }
      .mask-study [data-v7-reveal].v71-correct,
      .mask-study [data-v7-reveal].v71-wrong{padding:2px 5px!important}
    `;
    document.head.append(st);
  }

  function currentItemId(){
    const meta=$('.study-titlebar .eyebrow')?.textContent||'';
    const title=$('.study-titlebar h2')?.textContent?.trim();
    if(!meta||!title)return null;
    const data=read('tes_curriculum_v5',{subjects:[]});
    const [sn,secname]=meta.split('·').map(x=>x.trim());
    for(const sub of data.subjects||[]) if(sub.name===sn){
      for(const sec of sub.sections||[]) if(sec.name===secname){
        const item=(sec.items||[]).find(i=>(i.title||'학습')===title)||sec.items?.[0];
        if(item)return item.id;
      }
    }
    return null;
  }

  function stateFor(itemId){
    const all=read(USER_KEY,{itemState:{},rounds:{},drafts:{}});
    all.itemState??={}; all.drafts??={};
    all.itemState[itemId]??={masked:[],wrongTokens:[],wrongCount:0,attempts:0,correct:0};
    const u=all.itemState[itemId]; u.wrongTokens??=[];
    all.drafts[itemId]??={}; all.drafts[itemId].maskFeedback??={};
    return {all,u,draft:all.drafts[itemId],save:()=>write(USER_KEY,all)};
  }

  function applyVisual(el,state){
    el.classList.remove('revealed','v71-correct','v71-wrong');
    if(state==='correct') el.classList.add('revealed','v71-correct');
    if(state==='wrong') el.classList.add('revealed','v71-wrong');
  }

  function bind(el,itemId){
    if(el.dataset.v71Bound==='1')return;
    el.dataset.v71Bound='1';
    const key=el.dataset.v7Reveal||'';
    const st=stateFor(itemId);
    applyVisual(el,st.draft.maskFeedback?.[key]||'hidden');

    el.addEventListener('click',e=>{
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const live=stateFor(itemId);
      const ids=key.split(',').map(Number).filter(Number.isFinite);
      const now=live.draft.maskFeedback?.[key]||'hidden';
      let next;
      if(now==='hidden'){
        next='correct';
        live.u.wrongTokens=(live.u.wrongTokens||[]).filter(x=>!ids.includes(Number(x)));
        live.u.correct=(live.u.correct||0)+1;
        live.u.attempts=(live.u.attempts||0)+1;
      }else if(now==='correct'){
        next='wrong';
        ids.forEach(id=>{if(!live.u.wrongTokens.some(x=>Number(x)===id))live.u.wrongTokens.push(id)});
        live.u.wrongCount=(live.u.wrongCount||0)+1;
      }else{
        next='hidden';
      }
      live.draft.maskFeedback[key]=next;
      // Keep legacy revealed draft in sync for temp-save compatibility.
      const revealed=new Set(live.draft.revealed||[]);
      next==='hidden'?revealed.delete(key):revealed.add(key);
      live.draft.revealed=[...revealed];
      live.save();
      applyVisual(el,next);
    },true);
  }

  function enhance(){
    injectCss();
    const box=$('.mask-study');
    if(!box)return;
    const itemId=currentItemId();
    if(!itemId)return;
    $$('[data-v7-reveal]').forEach(el=>bind(el,itemId));
    const badge=$('#v7Badge'); if(badge)badge.textContent='Study v7.1';
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
