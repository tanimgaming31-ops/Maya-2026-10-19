/* Maya native hands-free & floating controls.
 * This integrates already existing original Maya V4/V5.2 Android capabilities.
 * No new assistant, no imported Jerry APK, no other assistant branding.
 * Foreground service recognition is Android SpeechRecognizer (NOT Vosk).
 * Screen sharing remains consented one-shot screenshot, not live streaming.
 */
const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
const clean=t=>String(t||'').normalize('NFKC').replace(/[।!?]+$/gu,'').replace(/\s+/gu,' ').trim();
export function parseMayaHandsFree(raw){
 const m=clean(raw).match(/^(?:(?:hey\s+)?maya|মায়া|মায়া)\s*[,،:]?\s+(.+)$/iu);
 if(!m||m[1].length>110)return null;
 const t=m[1];
 if(/^(?:show (?:my |the )?(?:floating (?:assistant|avatar|icon|shortcut))|(?:ফ্লোটিং|ভাসমান) (?:মায়া|মায়া|আইকন|শর্টকাট) (?:দেখাও|চালু করো|খোলো))$/iu.test(t))return 'overlayShow';
 if(/^(?:hide (?:my |the )?(?:floating (?:assistant|avatar|icon|shortcut))|(?:ফ্লোটিং|ভাসমান) (?:মায়া|মায়া|আইকন|শর্টকাট) (?:লুকাও|বন্ধ করো))$/iu.test(t))return 'overlayHide';
 if(/^(?:check (?:background |hands.free )?(?:voice|microphone) status|(?:background|hands.free) voice status|(?:ব্যাকগ্রাউন্ড|হ্যান্ডস ফ্রি) (?:ভয়েস|ভয়েস|মাইক) (?:স্ট্যাটাস|চেক করো))$/iu.test(t))return 'status';
 if(/^(?:open (?:my |the )?(?:screen control|accessibility) settings|(?:স্ক্রিন|এক্সেসিবিলিটি) (?:কন্ট্রোল )?সেটিংস (?:খোলো|ওপেন করো))$/iu.test(t))return 'accessSettings';
 if(/^(?:allow (?:floating |overlay )?permission|(?:ফ্লোটিং|ওভারলে) পারমিশন (?:দাও|খোলো))$/iu.test(t))return 'overlayPermission';
 if(/^(?:start (?:my |the )?(?:background voice|hands.free voice)|(?:ব্যাকগ্রাউন্ড|হ্যান্ডস ফ্রি) (?:ভয়েস|ভয়েস) চালু করো)$/iu.test(t))return 'voiceStart';
 if(/^(?:stop (?:my |the )?(?:background voice|hands.free voice)|(?:ব্যাকগ্রাউন্ড|হ্যান্ডস ফ্রি) (?:ভয়েস|ভয়েস) বন্ধ করো)$/iu.test(t))return 'voiceStop';
 return null;
}
const actions=Object.freeze({
 overlayShow:'V52_OVERLAY_SHOW',
 overlayHide:'V52_OVERLAY_HIDE',
 status:'V4_STATUS',
 accessSettings:'V4_ACCESS_SETTINGS',
 overlayPermission:'V52_OVERLAY_PERMISSION',
 voiceStart:'V4_VOICE_START',
 voiceStop:'V4_VOICE_STOP'
});
export function runHandsFree(kind,bridge=typeof window!=='undefined'?window.MayaBridge:null){
 if(!Object.prototype.hasOwnProperty.call(actions,kind))return {status:'rejected',message:'Unknown Maya native voice command.'};
 if(typeof bridge?.control!=='function')return {status:'unavailable',message:'Requires the Maya Android APK; the PWA cannot access Android foreground services.'};
 try{
  const result=JSON.parse(bridge.control(actions[kind],'{}'));
  if(!result||typeof result.status!=='string')throw Error('Invalid native reply');
  return result;
 }catch{return {status:'error',message:'Android feature request did not return a valid result.'};}
}
let previous=null;
function display(message){
 const v=$('mayaNativeCompanionStatus');if(v)v.textContent=String(message||'').slice(0,600);
 const s=$('sub');if(s)s.textContent=String(message||'').slice(0,600);
}
export function runCommand(kind){
 // Starting a second background recognizer competes with a Live Voice call.
 // Explicit confirmation is needed. User must start it while Maya is visible.
 if(kind==='voiceStart'&&typeof window!=='undefined'&&typeof window.confirm==='function'){
  if(!window.confirm('Use Maya background SpeechRecognizer? It needs microphone permission and a foreground notification. End an active Maya Voice Call first. Android may stop listening in the background.'))return {status:'cancelled',message:'Background voice not started.'};
 }
 const result=runHandsFree(kind);display(result.message||result.status);
 return result;
}
function installVoice(){
 if(typeof window==='undefined'||!window.MayaLifeVoice||window.MayaLifeVoice.__nativeCompanion)return;
 const prior={...window.MayaLifeVoice};
 const recognized=t=>Boolean(parseMayaHandsFree(t));
 const parse=t=>{const kind=parseMayaHandsFree(t);return kind?{kind:'mayaNativeCompanion',action:kind}:prior.parseLifeVoice(t);};
 const run=c=>c?.kind==='mayaNativeCompanion'
   ?Promise.resolve(runCommand(c.action).message)
   :prior.runLifeVoice(c);
 window.MayaLifeVoice={...prior,__nativeCompanion:true,
  recognizes:t=>recognized(t)||prior.recognizes(t),
  parseLifeVoice:parse,
  runLifeVoice:run,
  consumeTyped:t=>{
   const kind=parseMayaHandsFree(t);
   if(!kind)return prior.consumeTyped(t);
   runCommand(kind);return true;
  },
  consumeLive:t=>{
   const kind=parseMayaHandsFree(t);
   if(!kind)return prior.consumeLive(t);
   runCommand(kind);return true;
  }
 };
}
function mount(){
 const host=$('setSheet')?.querySelector('.body');
 if(!host||$('mayaNativeCompanion'))return;
 const p=document.createElement('section');p.id='mayaNativeCompanion';
 p.style.cssText='padding:12px;margin:12px 0;border:1px solid #4f8ca0;border-radius:12px';
 const h=document.createElement('h3');h.textContent='Maya · Native Hands-Free & Floating Assistant';
 const help=document.createElement('p');help.className='note';
 help.textContent='One Maya app: Android foreground voice, accessibility and draggable floating Maya icon. No extra assistant app. Permissioned screen snapshots are NOT continuous live video.';
 p.append(h,help);
 const entries=[['status','Check voice / Accessibility status'],['voiceStart','Start background voice'],['voiceStop','Stop background voice'],['accessSettings','Accessibility settings'],['overlayPermission','Allow Display over other apps'],['overlayShow','Show draggable Maya icon'],['overlayHide','Hide floating Maya']];
 const bar=document.createElement('div');bar.className='krow';
 for(const [action,label] of entries){
  const b=document.createElement('button');b.className='btn';b.textContent=label;
  b.onclick=()=>runCommand(action);bar.append(b);
 }
 const note=document.createElement('p');note.id='mayaNativeCompanionStatus';note.className='note';note.setAttribute('role','status');
 note.textContent='Tap Check status. Overlay animation uses the original Maya app icon, not a second 3D model.';
 p.append(bar,note);host.append(p);
}
if(typeof window!=='undefined'){installVoice();if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}}
