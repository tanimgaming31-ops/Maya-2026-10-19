/* Maya Owner Guard V174. Foreground-only, opt-in device biometric verification.
 * Reference selfie is NOT face recognition. Unverified attempt != stranger.
 * Photos saved only in app-private no-backup native folder; no cloud upload. */
const $=id=>typeof document==='undefined'?null:document.getElementById(id);
const short=(x,n=240)=>String(x??'').trim().slice(0,n);
export function parseOwnerGuardVoice(text){
 const raw=String(text||'').normalize('NFKC').replace(/[।!?]+$/gu,'').replace(/\s+/gu,' ').trim();
 const m=raw.match(/^(?:(?:hey\s+)?maya|মায়া|মায়া)\s*[,،:]?\s+(.+)$/iu);
 if(!m||m[1].length>150)return null;
 const t=m[1];
 // Voice-first exact security commands, with conservative parsing to avoid accidental arming.
 if(/^(?:(?:turn|switch)\s+on\s+(?:my\s+)?(?:security|owner guard|phone security)|(?:security|owner guard|phone security)\s+(?:on|enable|start|activate)|(?:security|সিকিউরিটি)\s+(?:on|অন)\s+করো|(?:সিকিউরিটি|সিকিউরিটি গার্ড|ফোন সিকিউরিটি|সিকিউরিটি মোড)\s+(?:অন(?:\s+করো)?|চালু\s+করো))$/iu.test(t))return {kind:'enable'};
 if(/^(?:(?:turn|switch)\s+off\s+(?:my\s+)?(?:security|owner guard|phone security)|(?:security|owner guard|phone security)\s+(?:off|disable|stop|deactivate)|(?:security|সিকিউরিটি)\s+(?:off|অফ)\s+করো|(?:সিকিউরিটি|সিকিউরিটি গার্ড|ফোন সিকিউরিটি|সিকিউরিটি মোড)\s+(?:অফ(?:\s+করো)?|বন্ধ\s+করো))$/iu.test(t))return {kind:'disable'};
 if(/^(?:enable|arm|activate|start) (?:my )?(?:owner guard|phone guard|anti.theft guard)|^(?:ফোন পাহারা|মালিক পাহারা) (?:চালু করো|শুরু করো)$/iu.test(t))return {kind:'enable'};
 if(/^(?:disable|disarm|stop|turn off) (?:my )?(?:owner guard|phone guard)|^(?:ফোন পাহারা|মালিক পাহারা) (?:বন্ধ করো|বাতিল করো)$/iu.test(t))return {kind:'disable'};
 if(/^(?:verify (?:the )?owner|verify me|check owner|owner verification|^(?:আমাকে চিনো|আমার পরিচয় যাচাই করো|মালিক যাচাই করো))$/iu.test(t))return {kind:'verify'};
 if(/^(?:remember my face|save my face|enroll owner selfie|^(?:আমার মুখ মনে রাখো|আমার ছবি সেভ করো))$/iu.test(t))return {kind:'reference'};
 if(/^(?:show (?:the )?(?:security|guard) photos|view guard photos|^(?:নিরাপত্তার ছবি দেখাও|পাহারার ছবি দেখাও))$/iu.test(t))return {kind:'photos'};
 if(/^(?:owner guard status|phone guard status|security guard status|^(?:ফোন পাহারার অবস্থা বলো|নিরাপত্তার অবস্থা বলো))$/iu.test(t))return {kind:'status'};
 if(/^(?:open owner guard|owner guard settings|^(?:ফোন পাহারা সেটিংস খোলো))$/iu.test(t))return {kind:'panel'};
 return null;
}
const native=(action,args={})=>{
 if(typeof window==='undefined'||typeof window.MayaBridge?.ownerGuard!=='function')
  return {status:'unavailable',message:'Owner Guard requires updated Maya Android APK.'};
 try{return JSON.parse(window.MayaBridge.ownerGuard(action,JSON.stringify(args)));}
 catch{return {status:'error',message:'Android Owner Guard bridge failed.'};}
};
const sleep=n=>new Promise(r=>setTimeout(r,n));
let working=false,armed=false,allowCapture=false,checkAt=0,lastNotice='',shownRequest=-1;
function report(x){
 const t=short(x,1300);lastNotice=t;
 if($('mayaGuardStatus'))$('mayaGuardStatus').textContent=t;
 if($('lifeVoiceStatus'))$('lifeVoiceStatus').textContent=t.slice(0,420);
 return t;
}
function panel(){
 const p=$('mayaOwnerGuardPanel');if(!p)return;
 const sheet=$('setSheet');if(sheet&&!sheet.classList.contains('open'))$('btnSet')?.click();
 p.hidden=false;
}
function badge(text){
 const e=$('mayaGuardBanner');if(!e)return;
 e.hidden=false;e.textContent=text;e.setAttribute('role','alert');
}
function refresh(){
 const r=native('STATUS');if(r.status!=='ok')return r;
 armed=!!r.armed;allowCapture=!!r.capture;
 if($('mayaGuardCapture'))$('mayaGuardCapture').checked=allowCapture;
 if($('mayaGuardArmed'))$('mayaGuardArmed').textContent=armed?'ARMED · foreground verification only':'OFF';
 if($('mayaGuardCount'))$('mayaGuardCount').textContent=(r.photoCount||0)+' private attempt photo(s); reference selfie: '+(r.hasReference?'saved':'not saved');
 return r;
}
async function awaitAuth(accepted,mode){
 if(accepted.status!=='pending')return report(accepted.message||accepted.status);
 for(let i=0;i<100;i++){
  await sleep(220);
  const x=native('STATUS');
  if(x.status!=='ok')return report(x.message||'Status unavailable');
  if(x.requestId!==accepted.requestId)return report('Verification request changed or replaced.');
  if(x.pending)continue;
  refresh();
  if(x.outcome==='verified')return report('Android strong biometric approved. '+(mode==='enable'?'Owner Guard armed.':mode==='disable'?'Owner Guard disabled.':'Maya verified the system biometric — no face template is exposed.'));
  if(x.outcome==='unverified'){
   badge('SECURITY ALERT · Biometric verification was not approved while Maya was open. Identity unknown.');
   report('Owner verification unsuccessful. A failed fingerprint/face scan does NOT prove another person has your phone.');
   try{navigator.vibrate?.([180,150,180]);}catch{}
   if(mode==='verify'&&x.armed&&x.capture&&shownRequest!==accepted.requestId){
    shownRequest=accepted.requestId;
    await takePhoto('attempt',true);
   }
   return lastNotice;
  }
  return report(x.message||'Owner verification cancelled.');
 }
 return report('Android biometric prompt did not finish. No identity decision.');
}
async function verify(mode='verify',source='voice'){
 if(working)return report('Owner Guard operation already running.');
 working=true;
 try{
  if(mode==='enable'){
   const now=native('STATUS');
   if(now.status==='ok'&&now.armed)return report('Maya Security is already ON. Owner Guard covers foreground Maya, not phone pickup or the lock screen.');
   // No extra JS prompt: the secure Android biometric dialog is itself required.
   // A voice request never opts into camera capture. UI opt-in is separate.
   const capture=source==='button'&&!!$('mayaGuardCapture')?.checked;
   const x=native('ENABLE',{capture});
   if(x.status==='pending')report('Security ON requested. Verify your fingerprint or supported secure face in the Android system dialog.');
   return await awaitAuth(x,mode);
  }
  if(mode==='disable'){
   if(source==='button'&&!confirm('Disable Owner Guard after Android biometric verification? Saved photos will remain.'))return report('Cancelled.');
   const x=native('DISABLE');
   if(x.status==='pending')report('Security OFF requested. Confirm your identity in the Android system dialog.');
   return await awaitAuth(x,mode);
  }
  if(mode==='reference'){
   const x=native('VIEW_AUTH');
   const r=await awaitAuth(x,'view');
   if(native('STATUS').authorized)return await takePhoto('reference',false);
   return r;
  }
  if(mode==='photos'){
   const x=native('VIEW_AUTH');
   await awaitAuth(x,'view');
   if(native('STATUS').authorized)return viewPhotos();
   return lastNotice;
  }
  if(mode==='captureSetting'){
   const checked=!!$('mayaGuardCapture')?.checked;
   if(!confirm('Change the opt-in visible photo capture after failed foreground owner verification?'))return report('Cancelled.');
   return await awaitAuth(native('CAPTURE_TOGGLE',{capture:checked}),'view');
  }
  const x=native('CHECK');
  return await awaitAuth(x,'verify');
 }finally{working=false;}
}
async function takePhoto(kind,auto){
 if(document.hidden)return report('No camera capture: Maya must be visible on screen.');
 const video=$('mayaGuardVideo');const container=$('mayaGuardCameraBox');
 if(!video||!container)return report('Visible security camera preview unavailable.');
 if(!navigator.mediaDevices?.getUserMedia)return report('WebView camera unavailable. No photo saved.');
 let stream;
 try{
  container.hidden=false;
  report(kind==='reference'?'Taking your consented owner reference selfie with visible camera preview.':'Owner Guard is visibly capturing one consented security snapshot. Camera indicator should be visible.');
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:640},height:{ideal:480}},audio:false});
  video.srcObject=stream;video.muted=true;video.playsInline=true;await video.play();
  await sleep(350);
  if(video.videoWidth<100||video.videoHeight<100)throw Error('Camera returned no valid frame.');
  const canvas=document.createElement('canvas');let scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.max(100,Math.round(video.videoWidth*scale));canvas.height=Math.max(100,Math.round(video.videoHeight*scale));
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  let jpeg=canvas.toDataURL('image/jpeg',.70).split(',')[1];
  if(jpeg.length>1400000)throw Error('Photo too large to store safely.');
  const r=native('SAVE_PHOTO',{kind,jpeg});
  return report(r.message||r.status);
 }catch(e){return report('No security photo saved: '+short(e.message,165)+'. Android foreground camera permission may need manual approval.');}
 finally{
  if(stream)for(const tr of stream.getTracks())tr.stop();
  video.pause();video.srcObject=null;
  container.hidden=true;refresh();
 }
}
async function viewPhotos(){
 const d=native('LIST');
 if(d.status!=='ok')return report(d.message||d.status);
 const host=$('mayaGuardSavedPhotos');if(!host)return report('Guard photo display unavailable.');
 host.replaceChildren();
 const names=[...(d.hasReference?['reference.jpg']:[]),...(d.photos||[]).map(x=>x.name)].slice(0,14);
 for(const name of names){
  const button=document.createElement('button');button.className='btn';button.textContent=name==='reference.jpg'?'My reference selfie (NOT face matching)':name;
  button.onclick=()=>{
   const r=native('READ_PHOTO',{name});
   if(r.status!=='ok'){report(r.message||r.status);return;}
   host.querySelectorAll('img').forEach(i=>i.remove());
   const image=document.createElement('img');
   image.src='data:image/jpeg;base64,'+r.jpeg;image.alt='Private saved Maya Owner Guard photo';image.style.cssText='display:block;max-width:100%;max-height:300px;margin:10px auto';
   host.append(image);
   report('Private photo opened after system biometric approval. Images are not uploaded or shared.');
  };
  host.append(button);
 }
 return report(names.length?names.length+' app-private photos available after OS verification.':'No saved owner guard photos.');
}
async function clearAttempts(){
 if(!confirm('Permanently delete all Owner Guard security attempt photos? Your reference selfie will stay.'))return report('Photo deletion cancelled.');
 const x=native('DELETE_PHOTOS');
 report(x.message||x.status);refresh();$('mayaGuardSavedPhotos')?.replaceChildren();
}
let autoCheckBusy=false;
async function onForeground(){
 if(autoCheckBusy||working||document.hidden)return;
 const r=refresh();if(!r.armed)return;
 if(Date.now()-checkAt<5000)return;
 autoCheckBusy=true;checkAt=Date.now();
 try{
  if(!r.pending)await verify('verify');
 }finally{autoCheckBusy=false;}
}
function mount(){
 const host=document.querySelector('#setSheet .body');if(!host||$('mayaOwnerGuardPanel'))return;
 const panelElement=document.createElement('section');panelElement.id='mayaOwnerGuardPanel';panelElement.hidden=true;
 panelElement.style.cssText='margin:12px 0;padding:12px;border:1px solid #b98570;border-radius:12px;background:#24171e;color:#fff';
 const title=document.createElement('h3');title.textContent='Maya Owner Guard · Android Security';panelElement.append(title);
 const warning=document.createElement('p');warning.textContent='Opt-in protection while Maya is OPEN. Cannot detect every phone pickup/unlock, open a background camera or secretly identify strangers. Android strong fingerprint/secure-face authentication is the verification source. A stored selfie is only a reference photo, NOT biometric matching.';
 panelElement.append(warning);
 const armedText=document.createElement('p');armedText.id='mayaGuardArmed';panelElement.append(armedText);
 const captureRow=document.createElement('label');captureRow.style.cssText='display:block;margin:8px 0';
 const toggle=document.createElement('input');toggle.id='mayaGuardCapture';toggle.type='checkbox';
 captureRow.append(toggle,document.createTextNode(' Allow one VISIBLE front-camera snapshot after unverified Maya-foreground biometric check. OFF by default. Local-only; no cloud.'));
 panelElement.append(captureRow);
 const b=(label,fn)=>{const x=document.createElement('button');x.type='button';x.className='btn';x.textContent=label;x.onclick=()=>Promise.resolve(fn()).catch(e=>report('Owner Guard error: '+short(e.message,150)));return x;};
 panelElement.append(b('Enable Guard (biometric required)',()=>verify('enable','button')),b('Check / verify owner now',()=>verify('verify')),b('Change photo-capture setting (verify)',()=>verify('captureSetting')),b('Disable Guard (verify)',()=>verify('disable','button')));
 const preview=document.createElement('div');preview.id='mayaGuardCameraBox';preview.hidden=true;
 const v=document.createElement('video');v.id='mayaGuardVideo';v.autoplay=true;v.muted=true;v.playsInline=true;
 v.style.cssText='display:block;width:100%;max-width:320px;min-height:150px;border:2px solid #f66';preview.append(v);
 const info=document.createElement('p');info.textContent='Camera is actively showing one-shot capture; Android shows the camera indicator.';preview.append(info);panelElement.append(preview);
 panelElement.append(b('Verify & save my reference selfie',()=>verify('reference')),
 b('Verify & view private photos',()=>verify('photos')),
 b('Delete attempt photos (after verification)',clearAttempts));
 const count=document.createElement('p');count.id='mayaGuardCount';panelElement.append(count);
 const images=document.createElement('div');images.id='mayaGuardSavedPhotos';panelElement.append(images);
 const alert=document.createElement('p');alert.id='mayaGuardBanner';alert.hidden=true;alert.style.cssText='color:#ff9180;font-weight:700';panelElement.append(alert);
 const status=document.createElement('pre');status.id='mayaGuardStatus';status.setAttribute('role','status');status.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';panelElement.append(status);
 host.append(b('Owner Guard · Security / Selfie / Alerts',()=>{panelElement.hidden=!panelElement.hidden;refresh();}),panelElement);
 const r=refresh();report(r.message||'Owner Guard available only in Android Maya.');
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void onForeground();});
 window.addEventListener('focus',()=>{void onForeground();});
 // Runs after a normal unlocked foreground app load; NEVER requests camera in background.
 if(r.armed)void onForeground();
}
async function dispatch(c){
 if(c.kind==='panel'){panel();return report('Owner Guard settings opened.');}
 if(c.kind==='status'){const r=refresh();return report(r.status==='ok'?'Owner Guard '+(r.armed?'enabled':'disabled')+'; photo-on-unverified '+(r.capture?'ON':'OFF')+'; '+r.photoCount+' app-private attempts. No automatic locked-screen protection.':r.message);}
 if(c.kind==='enable')return verify('enable','voice');
 if(c.kind==='disable')return verify('disable','voice');
 if(c.kind==='verify')return verify('verify');
 if(c.kind==='reference'){panel();return verify('reference');}
 if(c.kind==='photos'){panel();return verify('photos');}
}
function attachVoice(){
 if(typeof window==='undefined'||!window.MayaLifeVoice||window.MayaLifeVoice.__ownerGuard174)return;
 const prev={...window.MayaLifeVoice};
 const exec=c=>dispatch(c).catch(e=>report('Owner Guard command failed: '+short(e.message,125)));
 window.MayaLifeVoice={...prev,__ownerGuard174:true,
  recognizes:t=>!!parseOwnerGuardVoice(t)||prev.recognizes(t),
  parseLifeVoice:t=>parseOwnerGuardVoice(t)?{kind:'mayaOwnerGuard',command:parseOwnerGuardVoice(t)}:prev.parseLifeVoice(t),
  runLifeVoice:c=>c?.kind==='mayaOwnerGuard'?exec(c.command):prev.runLifeVoice(c),
  consumeTyped:t=>{const c=parseOwnerGuardVoice(t);if(!c)return prev.consumeTyped(t);void exec(c);return true;},
  consumeLive:t=>{const c=parseOwnerGuardVoice(t);if(!c)return prev.consumeLive(t);void exec(c);return true;}
 };
}
if(typeof window!=='undefined'){attachVoice();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
