(() => {
  'use strict';
  const DATA_KEY='tes_curriculum_v5', USER_KEY='tes_user_v5', SETTINGS_KEY='tes_settings_v5';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  let queued=false;

  function css(){
    if($('#v671ReaderDockStyle')) return;
    const s=document.createElement('style');s.id='v671ReaderDockStyle';s.textContent=`
      .reader .reader-actions{display:none!important}
      #v671ReaderDock{position:fixed;z-index:89;width:178px;padding:10px;background:rgba(255,255,255,.98);border:1px solid var(--line);border-radius:15px;box-shadow:0 12px 34px rgba(23,26,33,.13);backdrop-filter:blur(12px);display:grid;gap:7px;transition:width .18s ease,padding .18s ease}
      #v671ReaderDock.collapsed{width:46px;padding:8px 6px}#v671ReaderDock.collapsed .v671-body,#v671ReaderDock.collapsed .v671-title{display:none}#v671ReaderDock.collapsed .v671-collapse{width:32px;height:32px;padding:0;text-align:center}
      .v671-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.v671-title{font-size:12px;color:var(--muted);font-weight:800;padding-left:4px}.v671-collapse{border:1px solid var(--line);background:#fff;border-radius:9px;padding:5px 8px;cursor:pointer}.v671-body{display:grid;gap:6px}.v671-body button{border:1px solid var(--line);background:#fff;color:var(--text);border-radius:10px;padding:9px 10px;text-align:left;font-size:13px}.v671-body button.active{background:var(--primary-soft);color:var(--primary);border-color:#dfe5ff;font-weight:700}.v671-body button.complete{background:#171a21;color:#fff;border-color:#171a21}.v671-body hr{width:100%;border:0;border-top:1px solid var(--line);margin:2px 0}.v671-save-time{font-size:10px;color:var(--muted);padding:1px 4px 3px}
      @media(max-width:900px){#v671ReaderDock{left:12px!important;right:12px!important;top:auto!important;bottom:12px!important;width:auto!important;display:flex;align-items:center;padding:8px}.v671-head{flex:0 0 auto}.v671-title{display:none}.v671-body{display:flex;overflow-x:auto}.v671-body hr,.v671-save-time{display:none}.v671-body button{white-space:nowrap;flex:0 0 auto;text-align:center}.reader{padding-bottom:96px}#v671ReaderDock.collapsed{left:auto!important;right:12px!important;width:46px!important}}
    `;document.head.append(s);
  }
  function readerContext(){
    const bc=$('.reader .breadcrumb')?.textContent||'', title=$('.reader .reader-heading h1')?.textContent?.trim();
    if(!bc||!title)return null;const [subName,secName]=bc.split('/').map(x=>x.trim()),data=read(DATA_KEY,{subjects:[]});
    const sub=(data.subjects||[]).find(s=>s.name===subName);if(!sub)return null;const sec=(sub.sections||[]).find(s=>s.name===secName);if(!sec)return null;const item=(sec.items||[]).find(i=>(i.title||'교육과정 원문')===title)||sec.items?.[0];return item?{sub,sec,item}:null;
  }
  function collapsed(){return read(SETTINGS_KEY,{}).studyDockCollapsed===true}
  function applyState(){const d=$('#v671ReaderDock');if(!d)return;d.classList.toggle('collapsed',collapsed());const b=d.querySelector('.v671-collapse');b.textContent=collapsed()?'›':'‹';b.setAttribute('aria-label',collapsed()?'학습 도구 펼치기':'학습 도구 접기')}
  function position(){const d=$('#v671ReaderDock'),card=$('.reader');if(!d||!card||innerWidth<=900)return;const r=card.getBoundingClientRect(),w=d.classList.contains('collapsed')?46:178;let left=r.right+14;if(left+w>innerWidth-12)left=Math.max(12,r.right-w-12);d.style.left=`${Math.round(left)}px`;d.style.right='auto';d.style.top=`${Math.max(196,Math.round(r.top))}px`}
  function updateTime(){const c=readerContext(),el=$('#v671SaveTime');if(!c||!el)return;const d=read(USER_KEY,{drafts:{}}).drafts?.[c.item.id];el.textContent=d?.savedAt?`임시 저장 ${new Date(d.savedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`:'아직 임시 저장 없음'}
  function tempSave(){const c=readerContext();if(!c)return;const u=read(USER_KEY,{itemState:{},rounds:{},drafts:{}});u.drafts??={};u.drafts[c.item.id]={...(u.drafts[c.item.id]||{}),mode:'reader',scrollY:window.scrollY,savedAt:Date.now()};write(USER_KEY,u);updateTime();alert('원문 위치를 임시 저장했어요.')}
  function go(mode){
    if(mode==='reader')return;
    if(mode==='mask-edit'){$('#maskStartBtn')?.click();return}
    if(mode==='typing'){$('#typingStartBtn')?.click();return}
    if(mode==='mask-study'){$('#maskStartBtn')?.click();setTimeout(()=>document.querySelector('[data-mode="mask-study"]')?.click(),60)}
  }
  function ensure(){
    if($('.study-card')){$('#v671ReaderDock')?.remove();return}
    const c=readerContext();if(!c){$('#v671ReaderDock')?.remove();return}
    let d=$('#v671ReaderDock');if(!d){d=document.createElement('aside');d.id='v671ReaderDock';d.innerHTML=`<div class="v671-head"><span class="v671-title">학습 도구</span><button class="v671-collapse" aria-label="학습 도구 접기">‹</button></div><div class="v671-body"><button class="active" data-v671-mode="reader">원문</button><button data-v671-mode="mask-edit">가리기 설정</button><button data-v671-mode="mask-study">가리기 학습</button><button data-v671-mode="typing">타이핑</button><hr><button data-v671-temp>임시 저장</button><div id="v671SaveTime" class="v671-save-time"></div><button class="complete" data-v671-complete>학습 완료</button></div>`;document.body.append(d);d.querySelector('.v671-collapse').onclick=()=>{const s=read(SETTINGS_KEY,{});s.studyDockCollapsed=!d.classList.contains('collapsed');write(SETTINGS_KEY,s);applyState();position()};d.querySelectorAll('[data-v671-mode]').forEach(b=>b.onclick=()=>go(b.dataset.v671Mode));d.querySelector('[data-v671-temp]').onclick=tempSave;d.querySelector('[data-v671-complete]').onclick=()=>$('#completeItemBtn')?.click()}
    applyState();updateTime();position();
  }
  function readerDots(){
    const c=readerContext();if(!c)return;const u=read(USER_KEY,{rounds:{}}),completed=u.rounds?.[c.sub.id]?.completed||[];
    $$('#sectionBar [data-section]').forEach(btn=>{const sec=(c.sub.sections||[]).find(s=>s.id===btn.dataset.section),ids=(sec?.items||[]).map(i=>i.id),done=ids.length>0&&ids.every(id=>completed.includes(id)),dot=btn.querySelector('.v67-done-dot');if(done&&!dot){const x=document.createElement('span');x.className='v67-done-dot';x.title='이번 회독 학습 완료';btn.append(x)}else if(!done&&dot)dot.remove()})
  }
  function badge(){const b=$('#v67Badge');if(b)b.textContent='Study v6.7.1'}
  function enhance(){css();badge();ensure();readerDots()}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});addEventListener('resize',position);addEventListener('scroll',position,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
