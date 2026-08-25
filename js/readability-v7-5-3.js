(() => {
'use strict';
const $=s=>document.querySelector(s);
const FONT='"Gowun Dodum","Apple SD Gothic Neo",sans-serif';
function loadFont(){
 if($('#tesGoogleFonts'))return;
 const p1=document.createElement('link');p1.rel='preconnect';p1.href='https://fonts.googleapis.com';document.head.append(p1);
 const p2=document.createElement('link');p2.rel='preconnect';p2.href='https://fonts.gstatic.com';p2.crossOrigin='anonymous';document.head.append(p2);
 const l=document.createElement('link');l.id='tesGoogleFonts';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap';document.head.append(l);
}
function injectCss(){
 let s=$('#v753ReadabilityStyle');if(s)s.remove();
 s=document.createElement('style');s.id='v753ReadabilityStyle';s.textContent=`
 :root{--tes-reading-font:${FONT}}
 body,.source-document,.original-text,.reader,.token-editor,.mask-study,.typing-inline,.study-card,.v761weak-text,.v101batch-body,.v751table,.v75table,.v76table,.source-table{font-family:var(--tes-reading-font)!important}
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
 document.documentElement.style.setProperty('--tes-reading-font',FONT);
 document.body?.style.setProperty('--tes-reading-font',FONT);
}
function removeFontUI(){document.querySelector('#v753FontSection')?.remove()}
function enhance(){loadFont();if(!$('#v753ReadabilityStyle'))injectCss();removeFontUI()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
new MutationObserver(()=>{removeFontUI()}).observe(document.documentElement,{childList:true,subtree:true});
})();