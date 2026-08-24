(() => {
  const SETTINGS_KEY='tes_settings_v5';
  const read=()=>{try{return JSON.parse(localStorage.getItem(SETTINGS_KEY))||{}}catch{return {}}};
  const write=s=>localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));

  function syncUi(){
    const box=document.querySelector('#particleSelectable');
    if(!box) return;
    const s=read();
    // UI meaning is now inverse of stored legacy key:
    // checked = exclude particles = particleSelectable false
    box.checked = s.particleSelectable !== true;
  }

  document.addEventListener('click',e=>{
    const save=e.target.closest('#saveSettingsBtn');
    if(!save) return;
    const box=document.querySelector('#particleSelectable');
    if(!box) return;
    const excludeParticles=box.checked;
    // Let app-v5 finish its own save first, then persist this option last.
    setTimeout(()=>{
      const s=read();
      s.particleSelectable=!excludeParticles;
      write(s);
      syncUi();
    },20);
  },true);

  document.addEventListener('change',e=>{
    if(e.target?.id!=='particleSelectable') return;
    const s=read();
    s.particleSelectable=!e.target.checked;
    write(s);
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest('#settingsBtn')) setTimeout(syncUi,0);
  },true);

  new MutationObserver(syncUi).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',syncUi); else syncUi();
})();