(() => {
  const USER_KEY='tes_user_v5', SETTINGS_KEY='tes_settings_v5', DATA_KEY='tes_curriculum_v5';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const particles=['으로써','으로서','에서부터','에게서','께서는','에게는','한테서','으로는','로부터','에서','에게','한테','께서','으로','이나','와','과','은','는','이','가','을','를','의','에','로','도','만','부터','까지','보다','처럼','마다','조차','마저','나'];
  const verbish=['하','되','있','없','같','싶','받','주','보','알','살','가','오','먹','읽','쓰','만들','이루어지','따르'];
  const tokenize=text=>String(text||'').split(/(\s+)/).map((text,index)=>({index,text,isSpace:/^\s+$/.test(text)}));
  function setting(){return read(SETTINGS_KEY,{}).particleSelectable===true}
  function splitParticle(text){
    if(setting()) return {core:text,suffix:''};
    const m=String(text).match(/^(.*?)([.,!?;:'"“”‘’()\[\]{}<>]*)$/), body=m?.[1]??text, punct=m?.[2]??'';
    for(const p of particles){
      if(!body.endsWith(p) || body.length<=p.length+1) continue;
      const core=body.slice(0,-p.length);
      if(['는','은','이','가'].includes(p) && verbish.some(v=>core.endsWith(v))) continue;
      return {core,suffix:p+punct};
    }
    return {core:body,suffix:punct};
  }
  function currentItem(){
    const meta=$('.study-titlebar .eyebrow')?.textContent||'', title=$('.study-titlebar h2')?.textContent?.trim();
    const [subName,secName]=meta.split('·').map(x=>x.trim());
    const data=read(DATA_KEY,{subjects:[]});
    for(const sub of data.subjects||[]) if(sub.name===subName) for(const sec of sub.sections||[]) if(sec.name===secName){
      const item=(sec.items||[]).find(i=>(i.title||'학습')===title)||sec.items?.[0];
      if(item) return item;
    }
    return null;
  }
  function userState(itemId){
    const data=read(USER_KEY,{itemState:{},rounds:{}}); data.itemState??={};
    data.itemState[itemId]??={masked:[],wrongTokens:[],wrongCount:0,attempts:0,correct:0,maskGroups:[]};
    data.itemState[itemId].masked??=[];
    return {data,u:data.itemState[itemId],save:()=>write(USER_KEY,data)};
  }
  function fixEditor(box){
    if(!box || box.dataset.particleEditorFixed==='1') return;
    const item=currentItem(); if(!item) return;
    box.dataset.particleEditorFixed='1';
    const old=new Map($$('[data-token]').map(el=>[Number(el.dataset.token),{selected:el.classList.contains('selected'),source:el.classList.contains('source-token'),grouped:el.classList.contains('grouped-token')} ]));
    const tokens=tokenize(item.originalText), st=userState(item.id), u=st.u;
    box.innerHTML=tokens.map(t=>{
      if(t.isSpace) return esc(t.text);
      const p=splitParticle(t.text), o=old.get(t.index)||{};
      const selected=u.masked.includes(t.index)||o.selected;
      const cls=['token','selectable',selected?'selected':'',o.source?'source-token':'',o.grouped?'grouped-token':''].filter(Boolean).join(' ');
      return `<span class="cloze-word"><span class="${cls}" data-token="${t.index}">${esc(p.core)}</span>${p.suffix?`<span class="particle-tail" aria-hidden="true">${esc(p.suffix)}</span>`:''}</span>`;
    }).join('');
    box.addEventListener('click',e=>{
      const el=e.target.closest('[data-token]'); if(!el||!box.contains(el)) return;
      if(document.querySelector('#v6GroupBtn.active')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const idx=Number(el.dataset.token);
      u.masked=u.masked.includes(idx)?u.masked.filter(x=>x!==idx):[...u.masked,idx].sort((a,b)=>a-b);
      el.classList.toggle('selected',u.masked.includes(idx)); st.save();
    },true);
  }
  function wireSettings(){
    const checkbox=$('#particleSelectable'), save=$('#saveSettingsBtn');
    if(!checkbox||!save||save.dataset.particleFix==='1') return;
    save.dataset.particleFix='1';
    $('#settingsBtn')?.addEventListener('click',()=>setTimeout(()=>{checkbox.checked=setting()},0));
    save.addEventListener('click',()=>{
      const s=read(SETTINGS_KEY,{}); s.particleSelectable=checkbox.checked; write(SETTINGS_KEY,s);
    },true);
  }
  function enhance(){wireSettings();fixEditor($('.token-editor'))}
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance); else enhance();
})();