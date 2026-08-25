(() => {
'use strict';
const clean=()=>{
  document.querySelectorAll('#v75dock [data-save], #v75dock .v75save').forEach(el=>el.remove());
  const dock=document.querySelector('#v75dock .v75body');
  if(dock){
    const hrs=[...dock.querySelectorAll('hr')];
    for(const hr of hrs){
      const next=hr.nextElementSibling;
      if(!next||next.matches('[data-complete]')) hr.remove();
    }
  }
};
let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;clean()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean);else clean();
new MutationObserver(schedule).observe(document.getElementById('appMain')||document.body,{childList:true,subtree:true});
})();