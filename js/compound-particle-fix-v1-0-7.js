(() => {
'use strict';
const KEY='tes_curriculum_v5';
const raw=localStorage.getItem(KEY);if(!raw)return;
let d;try{d=JSON.parse(raw)}catch{return}
const mark=/[•·⋅∙ㆍ]$/;
const punct=/[.,!?;:'"“”‘’()\[\]{}]+$/g;
const particleSuffixes=['에서는','에게는','으로는','까지는','부터는','이라는','이라고','이라도','이라면','이지만','에서','에게','한테','으로','부터','까지','처럼','보다','마저','조차','밖에','께서','이라','라고','라도','라면','지만','은','는','이','가','을','를','의','에','와','과','로','도','만'];
let changed=0;
for(const sub of d.subjects||[])for(const sec of sub.sections||[])for(const item of sec.items||[])for(const u of item.studyUnits||[]){
  let p=String(u.particle||'');if(!p)continue;
  const surface=String(u.surface||'');let core=String(u.core||'');
  const plain=surface.replace(punct,'');
  if(!mark.test(core))continue;
  // 가운데점 직후의 음절은 복합어 일부일 가능성이 높다. 예: 시•도, 시⋅도에서.
  if(p==='도'){
    u.core=plain;u.particle='';changed++;continue;
  }
  let suffix='';
  for(const cand of particleSuffixes){if(p.endsWith(cand)&&p!==cand){suffix=cand;break}}
  if(suffix){
    const stem=p.slice(0,-suffix.length);
    if(stem){u.core=core+stem;u.particle=suffix;changed++;continue}
  }
  // 데이터가 core + particle 조합으로 surface와 정확히 맞지 않으면 surface를 core로 되돌려 잘못된 조사 제거.
  const recombined=(core+p);
  if(recombined!==plain){u.core=plain;u.particle='';changed++}
}
if(changed){localStorage.setItem(KEY,JSON.stringify(d));window.TESLargeStore?.flush?.();console.info(`compound particle repair v1.0.7: ${changed}`)}
})();