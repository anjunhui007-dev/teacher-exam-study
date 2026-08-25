(() => {
'use strict';
const SETTINGS='tes_settings_v5';
const $=s=>document.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const FONT_MAP={
  system:'system-ui,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI",sans-serif',
  noto:'"Noto Sans KR","Apple SD Gothic Neo",sans-serif',
  notoSerif:'"Noto Serif KR","AppleMyungjo",serif',
  nanum:'"Nanum Gothic","Apple SD Gothic Neo",sans-serif',
  gowun:'"Gowun Dodum","Apple SD Gothic Neo",sans-serif'
};
function loadFonts(){
 if($('#tesGoogleFonts'))return;
 const pre1=document.createElement('link');pre1.rel='preconnect';pre1.href='https://fonts.googleapis.com';document.head.append(pre1);
 const pre2=document.createElement('link');pre2.rel='preconnect';pre2.href='https://fonts.gstatic.com';pre2.crossOrigin='anonymous';document.head.append(pre2);
 const l=document.createElement('link');l.id='tesGoogleFonts';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Nanum+Gothic:wght@400;700&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;600;700&display=swap';document.head.append(l);
}
function injectCss(){
 if($('#v753ReadabilityStyle'))return;
 const s=document.createElement('style');s.id='v753ReadabilityStyle';s.textContent=`
 :root{--tes-reading-font:system-ui,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}
 .source-document,.original-text,.reader,.token-editor,.mask-study,.typing-inline,.study-card,.v761weak-text,.v101batch-body,.v751table,.v75table,.v76table,.source-table{font-family:var(--tes-reading-font)!important}
 @media(max-width:700px){
   .reader .source-document,.reader .original-text{font-size:13px!important;line-height:1.72!important;letter-spacing:-.01em!important}
   .study-card .token-editor,.study-card .mask-study,.study-card .typing-inline{font-size:13px!important;line-height:1.72!important;letter-spacing:-.01em!important}
   .reader .source-document p,.reader .source-note,.reader .source-heading{max-width:none!important}
   .v751scroll,.v75scroll,.table-scroll,.v76ts{padding:10px!important;margin-left:-2px;margin-right:-2px;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
   .v751table,.v75table,.v76table,.source-table{font-size:11.5px!important;line-height:1.48!important;min-width:560px!important}
   .v751table th,.v751table td,.v75table th,.v75table td,.v76table th,.v76table td,.source-table th,.source-table td{padding:7px 8px!important;word-break:keep-all;overflow-wrap:break-word}
   .v751caption,.v75caption,.v76caption{font-size:11.5px!important;line-height:1.45!important;margin-bottom:6px!important}
   .v761weak-text,.v101batch-body{font-size:13px!important;line-height:1.72!important}
 }
 `;document.head.append(s);
}
function applyFont(){
 const cfg=read(SETTINGS,{}),key=cfg.readingFont||'system';
 document.documentElement.style.setProperty('--tes-reading-font',FONT_MAP[key]||FONT_MAP.system);
 document.body?.style.setProperty('--tes-reading-font',FONT_MAP[key]||FONT_MAP.system);
}
function ensureSetting(){
 const dlg=$('#settingsDialog');if(!dlg)return;
 let section=$('#v753FontSection');
 if(!section){
   section=document.createElement('section');section.id='v753FontSection';section.className='settings-section';
   section.innerHTML='<h3>본문 폰트</h3><p class="muted">Google Fonts 웹폰트를 실제로 불러와 원문·학습·약점·표에 적용합니다.</p><select id="v753FontSelect"><option value="system">기본 시스템 글꼴</option><option value="noto">Noto Sans KR</option><option value="notoSerif">Noto Serif KR</option><option value="nanum">Nanum Gothic</option><option value="gowun">Gowun Dodum</option></select>';
   const ai=[...dlg.querySelectorAll('.settings-section')].find(x=>x.querySelector('#aiProvider'));
   if(ai)ai.before(section);else dlg.querySelector('.dialog-actions')?.before(section);
 }
 const cfg=read(SETTINGS,{}),sel=$('#v753FontSelect');if(sel)sel.value=cfg.readingFont||'system';
}
document.addEventListener('click',e=>{
 if(e.target.closest('#settingsBtn'))setTimeout(ensureSetting,0);
 if(e.target.closest('#saveSettingsBtn')){const sel=$('#v753FontSelect');if(sel){const cfg=read(SETTINGS,{});cfg.readingFont=sel.value;write(SETTINGS,cfg);applyFont();}}
},true);
function enhance(){loadFonts();injectCss();applyFont();if($('#settingsDialog')?.open)ensureSetting()}
let raf=0;new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;enhance()})}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();