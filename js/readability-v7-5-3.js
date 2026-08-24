(() => {
'use strict';
const SETTINGS='tes_settings_v5';
const $=s=>document.querySelector(s);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??structuredClone(f)}catch{return structuredClone(f)}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const FONT_MAP={
  system:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  noto:'"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif',
  malgun:'"Malgun Gothic","Apple SD Gothic Neo",sans-serif',
  batang:'Batang,"AppleMyungjo","Noto Serif KR",serif'
};
function injectCss(){
 if($('#v753ReadabilityStyle'))return;
 const s=document.createElement('style');s.id='v753ReadabilityStyle';s.textContent=`
 :root{--tes-reading-font:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
 .source-document,.original-text,.token-editor,.mask-study,.typing-inline,.v752weak-text,.v751table,.v75table{font-family:var(--tes-reading-font)}
 @media(max-width:700px){
   .reader .source-document,.reader .original-text{font-size:13px!important;line-height:1.72!important;letter-spacing:-.01em!important}
   .study-card .token-editor,.study-card .mask-study,.study-card .typing-inline{font-size:13px!important;line-height:1.72!important;letter-spacing:-.01em!important}
   .reader .source-document p,.reader .source-note,.reader .source-heading{max-width:none!important}
   .v751scroll,.v75scroll,.table-scroll{padding:10px!important;margin-left:-2px;margin-right:-2px;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
   .v751table,.v75table,.source-table{font-size:11.5px!important;line-height:1.48!important;min-width:560px!important}
   .v751table th,.v751table td,.v75table th,.v75table td,.source-table th,.source-table td{padding:7px 8px!important;word-break:keep-all;overflow-wrap:break-word}
   .v751caption,.v75caption{font-size:11.5px!important;line-height:1.45!important;margin-bottom:6px!important}
   .v752weak-text{font-size:13px!important;line-height:1.72!important}
 }
 `;document.head.append(s);
}
function applyFont(){
 const cfg=read(SETTINGS,{});const key=cfg.readingFont||'system';
 document.documentElement.style.setProperty('--tes-reading-font',FONT_MAP[key]||FONT_MAP.system);
}
function ensureSetting(){
 const dlg=$('#settingsDialog');if(!dlg)return;
 let section=$('#v753FontSection');
 if(!section){
   section=document.createElement('section');section.id='v753FontSection';section.className='settings-section';
   section.innerHTML='<h3>본문 폰트</h3><p class="muted">원문·학습 텍스트·표의 글꼴만 변경합니다.</p><select id="v753FontSelect"><option value="system">기본 시스템 글꼴</option><option value="noto">Noto Sans KR 계열</option><option value="malgun">맑은 고딕 계열</option><option value="batang">바탕 계열</option></select>';
   const ai=[...dlg.querySelectorAll('.settings-section')].find(x=>x.querySelector('#aiProvider'));
   if(ai) ai.before(section); else dlg.querySelector('.dialog-actions')?.before(section);
 }
 const cfg=read(SETTINGS,{});const sel=$('#v753FontSelect');if(sel)sel.value=cfg.readingFont||'system';
}
document.addEventListener('click',e=>{
 if(e.target.closest('#settingsBtn')) setTimeout(ensureSetting,0);
 if(e.target.closest('#saveSettingsBtn')){
   const sel=$('#v753FontSelect');if(sel){const cfg=read(SETTINGS,{});cfg.readingFont=sel.value;write(SETTINGS,cfg);applyFont();}
 }
},true);
function enhance(){injectCss();applyFont();if($('#settingsDialog')?.open)ensureSetting()}
new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();