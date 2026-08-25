(() => {
'use strict';
const SETTINGS='tes_settings_v5',USER='tes_user_v5';
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
const FONT_LOAD={noto:'600 18px "Noto Sans KR"',notoSerif:'600 18px "Noto Serif KR"',nanum:'700 18px "Nanum Gothic"',gowun:'400 18px "Gowun Dodum"'};
let pendingFont=null,userSnapshot=null;
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
 .v106-font-preview{margin-top:10px;padding:14px 15px;border:1px solid var(--line);border-radius:12px;background:#fafbfc;font-family:var(--v106-preview-font,var(--tes-reading-font));font-size:17px;line-height:1.75;word-break:keep-all}
 .v106-font-preview strong{font-weight:700}.v106-font-status{margin-top:7px;font-size:11px;color:var(--muted)}.v106-font-status.ok{color:#15803d}.v106-font-status.bad{color:#b45309}
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
function chosen(){return read(SETTINGS,{}).readingFont||'system'}
function applyFont(key=chosen()){
 const font=FONT_MAP[key]||FONT_MAP.system;
 document.documentElement.style.setProperty('--tes-reading-font',font);
 document.body?.style.setProperty('--tes-reading-font',font);
}
async function updatePreview(key){
 const preview=$('#v753FontPreview'),status=$('#v753FontStatus');if(!preview)return;
 const font=FONT_MAP[key]||FONT_MAP.system;preview.style.setProperty('--v106-preview-font',font);
 if(!status)return;
 if(key==='system'){status.textContent='기기 기본 글꼴 미리보기';status.className='v106-font-status ok';return}
 status.textContent='웹폰트 불러오는 중…';status.className='v106-font-status';
 try{await document.fonts.load(FONT_LOAD[key]);const ok=document.fonts.check(FONT_LOAD[key]);status.textContent=ok?'웹폰트 로드 완료 · 실제 적용 가능':'웹폰트 로드 확인 중 · 네트워크 상태를 확인하세요';status.className='v106-font-status '+(ok?'ok':'bad')}catch{status.textContent='웹폰트를 불러오지 못했습니다. 네트워크 상태를 확인하세요.';status.className='v106-font-status bad'}
}
function ensureSetting(){
 const dlg=$('#settingsDialog');if(!dlg)return;
 let section=$('#v753FontSection');
 if(!section){
   section=document.createElement('section');section.id='v753FontSection';section.className='settings-section';
   section.innerHTML=`<h3>본문 폰트</h3><p class="muted">Google Fonts 웹폰트를 실제로 불러옵니다. 아래 미리보기는 저장 전에도 바로 바뀝니다.</p><select id="v753FontSelect"><option value="system">기본 시스템 글꼴</option><option value="noto">Noto Sans KR</option><option value="notoSerif">Noto Serif KR</option><option value="nanum">Nanum Gothic</option><option value="gowun">Gowun Dodum</option></select><div id="v753FontPreview" class="v106-font-preview"><strong>교육과정 학습 미리보기</strong><br>학생의 삶과 연계하여 의미 있는 배움을 설계합니다. 가나다 ABC 123</div><div id="v753FontStatus" class="v106-font-status"></div>`;
   const ai=[...dlg.querySelectorAll('.settings-section')].find(x=>x.querySelector('#aiProvider'));
   if(ai)ai.before(section);else dlg.querySelector('.dialog-actions')?.before(section);
   $('#v753FontSelect')?.addEventListener('change',e=>{pendingFont=e.target.value;updatePreview(pendingFont)});
 }
 const key=chosen(),sel=$('#v753FontSelect');if(sel&&!pendingFont)sel.value=key;updatePreview(pendingFont||key);
}
function preserveAndSaveFont(){
 const sel=$('#v753FontSelect');if(!sel)return;
 pendingFont=sel.value;userSnapshot=localStorage.getItem(USER);
 setTimeout(()=>{
   if(userSnapshot!==null)localStorage.setItem(USER,userSnapshot);
   const cfg=read(SETTINGS,{});cfg.readingFont=pendingFont;write(SETTINGS,cfg);applyFont(pendingFont);
   window.dispatchEvent(new CustomEvent('tes:font-applied',{detail:{font:pendingFont}}));
   pendingFont=null;userSnapshot=null;
 },0);
}
document.addEventListener('click',e=>{
 if(e.target.closest('#settingsBtn')){pendingFont=null;setTimeout(ensureSetting,0)}
 if(e.target.closest('#saveSettingsBtn'))preserveAndSaveFont();
},true);
function enhance(){loadFonts();injectCss();applyFont();if($('#settingsDialog')?.open)ensureSetting()}
let raf=0;new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;enhance()})}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();