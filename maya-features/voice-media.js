import {isScreenshotCommand,KEY} from './voice-screenshot.js';
import {requestScreenshot} from './screenshot.js';
const $=id=>document.getElementById(id);
export function parseMediaCommand(value){
 if(isScreenshotCommand(value))return {kind:'screenshot'};
 const s=String(value||'').normalize('NFKC').replace(/[.!?।]+$/gu,'').replace(/\s+/gu,' ').trim();
 const match=s.match(/^(?:(?:hey\s+)?maya|মায়া|মায়া|মাইয়া|মাইয়া)\s*[,،:]?\s+(.+)$/iu);
 if(!match)return null;
 const x=match[1].match(/^(?:play youtube|youtube play|youtube search and play|play on youtube|search youtube and play)\s+(.{2,150})$/iu)
  ||match[1].match(/^ইউটিউবে?\s+(.{2,145}?)\s+(?:ভিডিও(?:টা|টি)?\s+)?(?:চালাও|প্লে করো|সার্চ করে চালাও|খুঁজে চালাও)$/u);
 if(!x)return null;
 return {kind:'video',query:x[1].trim()};
}
const nativeAvailable=()=>typeof window?.MayaBridge?.mediaVoice==='function';
const enabled=()=>{try{return localStorage.getItem(KEY)==='true';}catch{return false;}};
function native(action,args={}){
 if(!nativeAvailable())throw Error('Install the new Maya Android APK. Browser/PWA cannot perform native screen captures or auto-taps.');
 const result=JSON.parse(window.MayaBridge.mediaVoice(action,JSON.stringify(args)));
 if(!result||typeof result.status!=='string')throw Error('Android returned invalid status.');
 return result;
}
const msg=r=>String(r.message||r.status||'Unknown Android status')+' ['+r.status+']';
function show(text){
 const el=$('mayaMediaResult'),sub=$('sub');
 if(el)el.textContent=String(text);
 if(sub)sub.textContent=String(text).slice(0,650);
 return String(text);
}
let busy=false;
async function capture(){
 if(!enabled())return show('Enable Voice Screenshot in Maya Settings first.');
 if(nativeAvailable()){
  let r=native('SCREEN_CAPTURE');
  if(r.status==='capturing'){
   show('Screenshot requested. Waiting for Gallery save result…');
   for(let i=0;i<16;i++){
    await new Promise(resolve=>setTimeout(resolve,550));
    r=native('SCREEN_STATUS');
    if(r.status==='saved')return show('Screenshot saved to Gallery → Pictures/Maya.');
    if(r.status!=='capturing')return show(msg(r));
   }
   return show('Capture pending; use Check Gallery save result.');
  }
  return show(msg(r));
 }
 // MediaProjection requires a fresh Android consent prompt for each session.
 try {
  const r=await requestScreenshot();
  return show(r.status==='capturing'?'Android capture started, not yet saved. Check Settings → Screenshot for Gallery result.':msg(r));
 }catch(e){return show('Screenshot unavailable: '+String(e.message||e));}
}
async function play(query){
 const q=String(query||'').trim();
 if(q.length<2||q.length>150)return show('Enter a YouTube video title of 2–150 characters.');
 try{
  const r=native('VIDEO_SEARCH',{query:q});
  return show(r.status==='pending'?'YouTube search opened. Maya will tap a strongly matching visible title if found. Actual playback is not verified yet.':msg(r));
 }catch(e){return show('YouTube command unavailable: '+e.message);}
}
export async function runMediaCommand(command){
 if(busy)return show('Another Maya media command is running.');
 busy=true;
 try {
  if(command?.kind==='screenshot')return await capture();
  if(command?.kind==='video')return await play(command.query);
  return show('Unrecognized media action.');
 }catch(e){return show('Media action failed: '+String(e.message||e));}
 finally{busy=false;}
}
function mount(){
 const host=document.querySelector('#setSheet .body');
 if(!host||$('mayaVoiceMediaPanel'))return;
 const box=document.createElement('details');box.id='mayaVoiceMediaPanel';
 box.style.cssText='margin:14px 0;padding:13px;border:1px solid #66b9fa;border-radius:14px;background:#10162b';
 box.innerHTML=[
 '<summary style="font-weight:700">📸 Maya Voice Screenshot &amp; YouTube Auto Play</summary>',
 '<p class="note">Screenshots use Android Accessibility only after you opt in and grant Screen Controls. Each spoken command captures one visible screen; saved locally to Gallery → Pictures/Maya. Secure screens stay protected.</p>',
 '<label><input id="mayaVoiceScreenshotEnable" type="checkbox"> Enable one-command voice screenshot</label>',
 '<div class="krow"><button class="btn" id="mayaMediaAccess">Enable Maya Accessibility</button><button class="btn" id="mayaMediaCapture">Screenshot now</button><button class="btn" id="mayaMediaStatus">Check Gallery save</button></div>',
 '<p class="note">Say “Maya take a screenshot” or “মায়া স্ক্রিনশট নাও”. Android 11+ needed for direct Accessibility capture; older Android uses the existing permission-based screenshot button.</p>',
 '<h4>▶ YouTube: find and tap matching video</h4>',
 '<input id="mayaMediaVideo" class="inp" maxlength="150" placeholder="Exact YouTube video title">',
 '<div class="krow"><button class="btn pri" id="mayaMediaPlay">Search and play matching video</button><button class="btn" id="mayaMediaPlayStatus">Check video tap result</button></div>',
 '<p class="note">Say “Maya play YouTube [video]” or “মায়া ইউটিউবে [ভিডিওর নাম] চালাও”. A matching visible YouTube title will be tapped where supported, never unrelated ads. Actual playback is not guaranteed.</p>',
 '<p id="mayaMediaResult" class="note" role="status"></p>'
 ].join('');
 host.append(box);
 const toggle=$('mayaVoiceScreenshotEnable');
 toggle.checked=enabled();
 function sync(){
  if(!nativeAvailable())return;
  try{native('SCREEN_ENABLE',{enabled:toggle.checked});}
  catch(e){show('Android capture opt-in sync failed: '+e.message);}
 }
 toggle.onchange=()=>{
  try{localStorage.setItem(KEY,String(toggle.checked));sync();show(toggle.checked?'Voice capture enabled: also enable Android Accessibility.':'Voice capture disabled.');}
  catch(e){toggle.checked=false;show('Could not save screenshot preference: '+e.message);}
 };
 sync();
 $('mayaMediaAccess').onclick=()=>{try{show(msg(native('ACCESS_SETTINGS')));}catch(e){show(e.message);}};
 $('mayaMediaCapture').onclick=()=>void runMediaCommand({kind:'screenshot'});
 $('mayaMediaStatus').onclick=()=>{try{const r=native('SCREEN_STATUS');show(r.status==='saved'?'Screenshot saved to Gallery → Pictures/Maya.':msg(r));}catch(e){show(e.message);}};
 $('mayaMediaPlay').onclick=()=>void runMediaCommand({kind:'video',query:$('mayaMediaVideo').value});
 $('mayaMediaPlayStatus').onclick=()=>{try{show(msg(native('VIDEO_STATUS')));}catch(e){show(e.message);}};
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
