(() => {
'use strict';
const U='tes_user_v5';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
function css(){if($('#tesReaderHighlightStyle'))return;const s=document.createElement('style');s.id='tesReaderHighlightStyle';s.textContent=`
.reader .token[data-v75-reader-highlight]{border-radius:4px;padding:1px 2px;margin:-1px -2px;box-decoration-break:clone;-webkit-box-decoration-break:clone;background:var(--tes-hl,rgba(148,163,184,.18));box-shadow:inset 0 -2px 0 var(--tes-hl-line,rgba(100,116,139,.35));transition:background .15s ease,box-shadow .15s ease}
.reader .token[data-v75-reader-highlight="unrated"]{--tes-hl:rgba(148,163,184,.16);--tes-hl-line:rgba(100,116,139,.35)}
`;document.head.appendChild(s)}
function color(rate,alpha){const r=Math.max(0,Math.min(1,Number(rate)));const hue=120*r;return `hsla(${hue},78%,48%,${alpha})`}
function accuracyFor(st,key,legacy){const a=st?.maskAccuracy||{};let rec=a[key];if(!rec&&legacy!=null)rec=a[String(legacy)];if(!rec||!Number(rec.attempts))return null;return Math.max(0,Math.min(1,Number(rec.correct||0)/Number(rec.attempts||1)))}
function apply(){const reader=$('.reader');if(!reader)return;const item=reader.querySelector('[data-item]')?.dataset.item||sessionItem();if(!item)return;const u=read(U,{itemState:{}}),st=u.itemState?.[item];if(!st)return;const selected=new Set((st.maskedUnits||[]).map(Number));reader.querySelectorAll('[data-v75-reader-highlight]').forEach(el=>{el.removeAttribute('data-v75-reader-highlight');el.style.removeProperty('--tes-hl');el.style.removeProperty('--tes-hl-line')});
 const tokens=[...reader.querySelectorAll('.token')];for(const el of tokens){const idx=Number(el.dataset.v75Unit??el.dataset.idx??el.dataset.tokenIndex);if(!Number.isInteger(idx)||!selected.has(idx))continue;const rate=accuracyFor(st,String(idx),idx);el.dataset.v75ReaderHighlight=rate==null?'unrated':'rated';if(rate!=null){el.style.setProperty('--tes-hl',color(rate,.18));el.style.setProperty('--tes-hl-line',color(rate,.58))}}
}
function sessionItem(){try{return JSON.parse(sessionStorage.getItem('tes_v75_context')||'null')?.itemId||null}catch{return null}}
let raf=0;function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})}
css();document.addEventListener('click',e=>{if(e.target.closest('#homeBtn,[data-subject],[data-section],[data-item],#v75dock'))setTimeout(schedule,30)},true);window.addEventListener('storage',schedule);window.addEventListener('tes:accuracy-updated',schedule);new MutationObserver(schedule).observe($('#appMain')||document.body,{childList:true,subtree:true});schedule();
})();