/* Maya Creator Birthday: one stable identity fact + optional creator-provided clock time.
   Does not edit existing Gemini keys, memories, avatars or chat records. */
import {readBirthday,saveBirthday,importBirthdayRecord,birthdayAge,birthdayAnswer,birthdayToday,parseBirthdayQuestion,validBirthday} from './birthday-core.js';

const LAST='maya.birthday.lastCelebration.v1';
const $=id=>document.getElementById(id);
const get=()=>readBirthday(localStorage);
const age=()=>birthdayAge(new Date(),get());
const speakText=text=>{
 const w=typeof window!=='undefined'?window:null;
 if(!w||!('speechSynthesis' in w)||typeof SpeechSynthesisUtterance==='undefined')return false;
 try{
  if(w.speechSynthesis.speaking)return false;
  const phrase=new SpeechSynthesisUtterance(text);
  phrase.lang='bn-BD';phrase.rate=.95;phrase.pitch=1.08;
  w.speechSynthesis.speak(phrase);return true;
 }catch{return false;}
};
function show(text){
 const out=$('mayaBirthdayResult');if(out)out.textContent=text;
 const sub=$('sub');if(sub)sub.textContent=text;
 return text;
}
function heartAnimation(){
 if(typeof document==='undefined')return;
 const stage=document.querySelector('.stage');
 if(stage?.animate)try{
  stage.animate([{filter:'drop-shadow(0 0 0px #ff69b4)',transform:'scale(1)'},{filter:'drop-shadow(0 0 25px #ff69b4)',transform:'scale(1.035)'},{filter:'drop-shadow(0 0 0px #ff69b4)',transform:'scale(1)'}],{duration:1500,iterations:2,easing:'ease-in-out'});
 }catch{}
 const wrap=document.createElement('div');wrap.setAttribute('aria-hidden','true');wrap.className='maya-birthday-confetti';
 wrap.style.cssText='pointer-events:none;position:fixed;inset:0;z-index:120000;overflow:hidden';
 if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches){wrap.remove();return;}
 for(let i=0;i<22;i++){
  const el=document.createElement('span');
  el.textContent=i%4===0?'🎂':i%3===0?'✨':'💗';
  el.style.cssText='position:absolute;top:-10%;left:'+((i*37)%94+2)+'%;font-size:'+(15+i%4*5)+'px;opacity:0;animation:mayaBirthdayFall '+(1.4+(i%5)*.34)+'s linear '+(i%7*.13)+'s forwards;';
  wrap.append(el);
 }
 if(!document.getElementById('mayaBirthdayCSS')){
  const css=document.createElement('style');css.id='mayaBirthdayCSS';
  css.textContent='@keyframes mayaBirthdayFall{0%{transform:translateY(-20px) rotate(0);opacity:0}12%{opacity:1}85%{opacity:1}100%{transform:translateY(105vh) rotate(430deg);opacity:0}}';
  document.head.append(css);
 }
 document.body.append(wrap);
 setTimeout(()=>wrap.remove(),4900);
}
export function birthdayReply(kind,now=new Date()){
 const result=birthdayAnswer(kind,now,get(),'bn');
 if(kind==='celebrate'&&birthdayToday(now))heartAnimation();
 return show(result);
}
function celebrateOnBirthday(){
 const now=new Date();
 if(!birthdayToday(now))return;
 const mark=String(now.getFullYear());
 try{if(localStorage.getItem(LAST)===mark)return;localStorage.setItem(LAST,mark);}catch{}
 const greeting=birthdayAnswer('celebrate',now,get(),'bn');
 const el=$('mayaBirthdayResult');if(el)el.textContent=greeting;
 heartAnimation();
}
function status(){
 const data=get(),age=birthdayAge(new Date(),data);
 const summary=$('mayaBirthdayStatus');
 if(summary)summary.textContent='Created: 19 October 2026 · Time: '+(data.time||'Unknown')+(data.timezone?' ('+data.timezone+')':'')+' · Age: '+age.years+' years, '+age.months+' months, '+age.days+' days.';
 const input=$('mayaBirthTime');if(input)input.value=data.time||'';
 const zone=$('mayaBirthZone');if(zone)zone.value=data.timezone||'';
}
function downloadBirthday(){
 const data={app:'maya',schema:1,exported:new Date().toISOString(),birthday:get()};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='maya-birthday-backup.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function mount(){
 const host=document.querySelector('#setSheet .body');
 if(!host||$('mayaBirthdayCard'))return;
 const root=document.createElement('details');root.id='mayaBirthdayCard';
 root.style.cssText='margin:12px 0;padding:12px;background:#11172b;border:1px solid #dd8be5;border-radius:14px';
 root.innerHTML=`<summary style="font-weight:700">🎂 Maya Birthday · Creation Memory</summary>
 <p class="note">You created Maya on <strong>19 October 2026</strong>. This fixed date is not guessed. The exact creation time is unknown until you enter it yourself.</p>
 <p id="mayaBirthdayStatus" role="status" class="note"></p>
 <label class="note" for="mayaBirthTime">Creation time (optional, 24-hour clock)</label>
 <input id="mayaBirthTime" class="inp" type="time">
 <label class="note" for="mayaBirthZone">Creation timezone (optional, e.g. Asia/Dubai)</label>
 <input id="mayaBirthZone" class="inp" maxlength="64" placeholder="Unknown unless you know">
 <div class="krow"><button class="btn pri" id="mayaBirthdaySave">Save birth time</button><button class="btn" id="mayaBirthdayReset">Set time Unknown</button></div>
 <div class="krow"><button class="btn" id="mayaBirthdayAsk">How old is Maya?</button><button class="btn" id="mayaBirthdayCelebrate">Celebrate 🎂</button><button class="btn" id="mayaBirthdaySpeak">Speak answer</button></div>
 <div class="krow"><button class="btn" id="mayaBirthdayExport">Export birthday backup</button><button class="btn" id="mayaBirthdayImport">Import birthday backup</button><input type="file" id="mayaBirthdayFile" accept=".json,application/json" hidden></div>
 <p class="note">Birthday is also included in original Memory Export and V5 backup files, without removing existing memory. Voice examples: "মায়া, তোমার জন্মদিন কবে?" / "মায়া, তোমার বয়স কত?" / "Maya, when were you created?"</p>
 <p id="mayaBirthdayResult" class="note" role="status"></p>`;
 host.append(root);
 $('mayaBirthdaySave').onclick=()=>{
  const time=$('mayaBirthTime').value||null,zone=$('mayaBirthZone').value.trim()||null;
  try{saveBirthday(time,zone,localStorage);status();show('Maya Birthday saved. Creation date remains 19 October 2026.');}
  catch(err){show('Not saved: '+String(err.message||err));}
 };
 $('mayaBirthdayReset').onclick=()=>{try{saveBirthday(null,null,localStorage);status();show('Exact creation time marked Unknown; birthday date unchanged.');}catch(e){show(String(e.message||e));}};
 $('mayaBirthdayAsk').onclick=()=>{birthdayReply('age');};
 $('mayaBirthdayCelebrate').onclick=()=>{heartAnimation();show(birthdayAnswer('celebrate',new Date(),get(),'bn'));};
 $('mayaBirthdaySpeak').onclick=()=>speakText($('mayaBirthdayResult').textContent||birthdayAnswer('date',new Date(),get(),'bn'))||show('Speech synthesis is not available on this Android voice engine. You can still read the birthday answer.');
 $('mayaBirthdayExport').onclick=downloadBirthday;
 $('mayaBirthdayImport').onclick=()=>$('mayaBirthdayFile').click();
 $('mayaBirthdayFile').onchange=async evt=>{
  const file=evt.target.files?.[0];evt.target.value='';if(!file)return;
  try{
   if(file.size>16000)throw Error('Birthday backup is too large.');
   const body=JSON.parse(await file.text());
   if(body?.app!=='maya'||!validBirthday(body?.birthday))throw Error('Not a valid Maya birthday backup.');
   if(!confirm('Restore Maya birthday time from this selected backup? Creation date stays 19 October 2026.'))return;
   importBirthdayRecord(body.birthday,localStorage);status();show('Birthday time restored; original memories unchanged.');
  }catch(e){show('Birthday restore failed: '+String(e.message||e));}
 };
 status();
 const refresh=()=>status();
 window.addEventListener('focus',refresh);
 celebrateOnBirthday();
}
export function restoreBirthdayFromBackup(record){
 if(record===undefined||record===null)return false; // older backups remain valid
 importBirthdayRecord(record,localStorage);status();return true;
}
if(typeof window!=='undefined'){
 window.MayaBirthdayInfo={get,age,validate:validBirthday,backupRecord:get,restoreFromBackup:restoreBirthdayFromBackup,reply:birthdayReply,parse:parseBirthdayQuestion};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
