(() => {
'use strict';
const KEY='tes_curriculum_v5';
const raw=localStorage.getItem(KEY);if(!raw)return;
let d;try{d=JSON.parse(raw)}catch{return}
const mark=/[•·⋅∙ㆍ]/;let changed=0;
for(const sub of d.subjects||[])for(const sec of sub.sections||[])for(const item of sec.items||[])for(const u of item.studyUnits||[]){
  const p=String(u.particle||'');if(!p)continue;
  const surface=String(u.surface||''),core=String(u.core||'');
  const plain=surface.replace(/[.,!?;:'"“”‘’()\[\]{}]+$/g,'');
  const escaped=p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const badByCore=mark.test(core.slice(-1));
  const badBySurface=new RegExp(`[•·⋅∙ㆍ]${escaped}$`).test(plain);
  if(!badByCore&&!badBySurface)continue;
  u.core=plain;
  u.particle='';
  changed++;
}
if(changed){localStorage.setItem(KEY,JSON.stringify(d));window.TESLargeStore?.flush?.();console.info(`compound particle repair: ${changed}`)}
})();