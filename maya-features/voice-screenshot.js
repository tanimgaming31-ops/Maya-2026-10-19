import { requestScreenshot } from './screenshot.js';
const KEY='maya_voice_screenshot_enabled';
export function isScreenshotCommand(value){
 const s=String(value||'').normalize('NFKC').toLowerCase().replace(/^(you|আপনি)\s*:\s*/u,'').replace(/^[“"‘«]+|[”"’»]+$/gu,'').replace(/[.!?।]+$/gu,'').replace(/\s+/gu,' ').trim();
 return /^(?:(?:hey maya|maya|মায়া|মায়া)[, ]+)?(?:take (?:a )?screenshot|capture (?:a )?screenshot|screenshot (?:নাও|নেও|নিন)|স্ক্রিনশট (?:নাও|নেও|নিন)|স্ক্রিনশট নিয়ে দাও|স্ক্রিনশট নিয়ে দাও)$/u.test(s);
}
function mount(){
 const host=document.querySelector('#setSheet .body'),transcript=document.getElementById('you');
 if(!host||!transcript||document.getElementById('mayaVoiceScreenshotEnable'))return;
 const row=document.createElement('p');const label=document.createElement('label');
 const toggle=document.createElement('input');toggle.type='checkbox';toggle.id='mayaVoiceScreenshotEnable';
 try{toggle.checked=localStorage.getItem(KEY)==='true';}catch{}
 label.append(toggle,document.createTextNode(' Enable voice screenshot (with confirmation)'));
 const hint=document.createElement('p');hint.textContent='Say: Screenshot নাও / স্ক্রিনশট নাও / Take a screenshot. Uses visible user transcript, not offline speech recognition. Confirm before Android permission. Commands expire after 30 seconds.';
 const message=document.createElement('p');message.setAttribute('role','status');row.append(label,hint,message);host.append(row);
 const card=document.createElement('section');card.hidden=true;card.style.cssText='position:fixed;top:80px;left:12px;right:12px;z-index:100001;background:#101b30;color:white;border:1px solid #4f7cff;border-radius:14px;padding:14px';
 const summary=document.createElement('p');summary.textContent='Screenshot command recognized in visible user transcript. Open Android screen-capture permission? Protected content may be blank.';
 const yes=document.createElement('button');yes.textContent='Confirm screenshot';const no=document.createElement('button');no.textContent='Cancel';const result=document.createElement('p');result.setAttribute('role','status');card.append(summary,yes,no,result);document.body.append(card);
 let debounce=null,expiry=null,pending=false,busy=false,last=transcript.textContent||'';
 function cancel(){pending=false;card.hidden=true;clearTimeout(expiry);}
 toggle.onchange=()=>{try{localStorage.setItem(KEY,String(toggle.checked));message.textContent=toggle.checked?'Voice trigger enabled.':'Voice trigger disabled.';}catch{toggle.checked=false;message.textContent='Could not save setting.';}cancel();};
 no.onclick=cancel;
 yes.onclick=async()=>{if(!pending||busy)return;pending=false;clearTimeout(expiry);busy=true;yes.disabled=true;result.textContent='Waiting for Android permission…';try{const r=await requestScreenshot();result.textContent=r.status==='cancelled'?'Capture cancelled.':r.status==='capturing'?'Capture requested; not yet saved. Check Settings → Screenshot.':'Capture status: '+r.status;}catch(e){result.textContent=e.message;}finally{busy=false;yes.disabled=false;no.textContent='Close';}};
 const observer=new MutationObserver(()=>{clearTimeout(debounce);const current=transcript.textContent||'';if(current===last)return;last=current;if(!toggle.checked||busy||pending||document.hidden)return;debounce=setTimeout(()=>{if(!toggle.checked||document.hidden||!isScreenshotCommand(transcript.textContent))return;pending=true;yes.disabled=false;no.textContent='Cancel';result.textContent='';card.hidden=false;expiry=setTimeout(cancel,30000);},1000);});
 observer.observe(transcript,{childList:true,subtree:true,characterData:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!busy){clearTimeout(debounce);cancel();}});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
