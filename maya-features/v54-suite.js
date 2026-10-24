/* Maya V54 capabilities are deliberately limited to Android-supported, user-granted actions.
   Original Memory, Agent Suite, voice and native bridge remain unchanged. */
import {openNamedApp,normalizeName,targetName} from './app-launcher.js';
const KEY='maya.v54.routines.v1';
const $=id=>document.getElementById(id);
const short=(v,n=240)=>String(v??'').trim().slice(0,n);
const succeeded=o=>['ok','scheduled','created','requested','pending','sent_to_android'].includes(o?.status);
export function validateV54Routine(value){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.name==='string'&&value.name.trim().length>=2&&value.name.length<=70
 &&Array.isArray(value.steps)&&value.steps.length>=1&&value.steps.length<=5
 &&value.steps.every((x,i)=>x&&typeof x==='object'&&['battery','notifications','reminders','files','reminder','app'].includes(x.type)
  &&(x.type!=='app'||(i===value.steps.length-1&&typeof x.name==='string'&&x.name.length>=2&&x.name.length<=90))
  &&(x.type!=='reminder'||(Number.isInteger(x.minutes)&&x.minutes>=1&&x.minutes<=43200&&typeof x.title==='string'&&x.title.length>=2&&x.title.length<=120)));
}
export function readV54Routines(storage){
 try{const rows=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(rows)?rows.filter(validateV54Routine).slice(0,12):[];}catch{return [];}
}
function native(action,data={}){
 const bridge=typeof window!=='undefined'?window.MayaBridge:null;
 if(typeof bridge?.v54!=='function')throw Error('V54 requires the new Maya Android APK, not browser/PWA.');
 let result;
 try{result=JSON.parse(bridge.v54(action,JSON.stringify(data)));}
 catch{throw Error('Android V54 bridge did not return valid JSON.');}
 if(!result||typeof result.status!=='string')throw Error('Android did not provide a valid result.');
 return result;
}
function ctrl(action,params={}){
 if(typeof window?.MayaBridge?.control!=='function')throw Error('Android device bridge is not connected.');
 let r;try{r=JSON.parse(window.MayaBridge.control(action,JSON.stringify(params)));}catch{throw Error('Invalid Android phone result.');}
 if(!r||typeof r.status!=='string')throw Error('Android action returned no status.');
 return r;
}
function summary(r){return short(r?.message||r?.status||'No result',500);}
function pretty(r){return summary(r)+(r?.status?' ('+r.status+')':'');}
let lastResponse='';
function say(message,bad=false){
 lastResponse=String(message);
 const n=$('v54Result');if(n){n.textContent=lastResponse;n.style.color=bad?'#ffbec6':'#c6f8eb';}
 return lastResponse;
}
function openPanel(){
 if(!$('mayaV54'))mount();
 const root=$('mayaV54');
 if(!root)return false;
 const sheet=$('setSheet');if(sheet&&!sheet.classList?.contains('open'))$('btnSet')?.click();
 root.open=true;return true;
}
function statusText(){
 const r=readV54Routines(localStorage);
 const supported=typeof window.MayaBridge?.v54==='function';
 return 'V54 native: '+(supported?'available (permission not yet checked)':'not connected')+'. Saved routines: '+r.length+'.';
}
let task=false;
async function guarded(label,fn){
 if(task)return say('Another V54 command is running. Try again after it finishes.',true);
 task=true;say(label+' …');
 try{const result=await fn();return say(result===undefined?'No action result was reported.':result);}
 catch(e){return say(label+': '+short(e?.message||e,170),true);}
 finally{task=false;}
}
function existingApp(name){
 if(typeof window.MayaBridge?.listLaunchableApps!=='function')throw Error('Android app catalog is unavailable.');
 const raw=JSON.parse(window.MayaBridge.listLaunchableApps());
 if(raw?.status!=='ok'||!Array.isArray(raw.apps))throw Error('Android could not list launcher apps.');
 const wanted=normalizeName(targetName(name));
 const list=raw.apps.filter(a=>normalizeName(a.label)===wanted);
 if(list.length!==1)throw Error(list.length?'Several apps have that label; select a unique app in Installed Apps Settings.':'The exact app name is not installed or visible. Use Installed Apps Settings to check.');
 return list[0];
}
function requestReminder(title,minutes){
 if(!Number.isInteger(minutes)||minutes<1||minutes>43200||!title||title.length>120)throw Error('Choose a valid title and 1–43,200 minutes.');
 const at=Date.now()+minutes*60000;
 const r=native('REMINDERS_SET',{title,at});
 if(!succeeded(r))throw Error(pretty(r));
 return 'Android reminder: '+pretty(r)+'. Time can be delayed by Doze; notifications must be allowed.';
}
export async function runV54Macro(app,label){
 if(!app||!label)throw Error('Enter the installed app name and exact visible button label.');
 if(!confirm('Open '+short(app,70)+' and request ONE tap on visible "'+short(label,48)+'"? No send/pay/delete actions are allowed.'))return 'Macro cancelled.';
 const match=existingApp(app);
 const r=native('MACRO_TAP',{package:match.packageName,activity:match.activityName,label});
 if(r.status==='pending')return 'Android macro pending for '+match.label+'. Only one safe visible button tap will be attempted. Return to Maya and check Macro Status for the result.';
 throw Error(pretty(r));
}
function readNotifications(){
 const status=native('NOTIFICATIONS_STATUS');
 if(!status.access)throw Error('Enable Maya in Android Notification Access settings first.');
 const data=native('NOTIFICATIONS_LIST');
 if(data.status!=='ok')throw Error(pretty(data));
 const rows=Array.isArray(data.messages)?data.messages:[];
 const select=$('v54Message');if(select)select.replaceChildren();
 const list=$('v54Messages');if(list)list.replaceChildren();
 rows.forEach(m=>{
  const p=document.createElement('p');p.className='note';
  p.textContent=short(m.app,30)+' — '+short(m.sender,50)+': '+short(m.text,240)+(m.canReply?' [Quick Reply]':' [No Quick Reply]');
  list?.append(p);
  if(m.canReply&&select){
   const o=document.createElement('option');o.value=m.id;o.textContent=short(m.app,20)+' — '+short(m.sender,40);
   select.append(o);
  }
 });
 return rows.length?'Found '+rows.length+' recent permitted notification messages; select a supported reply and confirm.':'No supported notifications available; messages may be absent or listener disconnected.';
}
function replyNotification(){
 const id=$('v54Message')?.value||'',text=short($('v54Reply')?.value,300);
 if(!id||!text)throw Error('Select a recent Quick Reply notification and enter reply text.');
 if(!confirm('Send this reply through Android Notification Quick Reply?\n'+text))return 'Reply cancelled.';
 const r=native('NOTIFICATIONS_REPLY',{id,text});
 if(r.status!=='sent_to_android')throw Error(pretty(r));
 return 'Android Quick Reply intent submitted. Delivery is not independently verified.';
}
function readFolder(){
 const r=native('FILES_LIST');if(r.status!=='ok')throw Error(pretty(r));
 const rows=Array.isArray(r.items)?r.items:[];
 const host=$('v54FileList');if(host){host.replaceChildren();rows.forEach(x=>{const p=document.createElement('p');p.className='note';p.textContent=short(x.name,85)+' ('+short(x.mime,45)+')';host.append(p);});}
 return 'Android returned '+rows.length+' entries in the approved folder.';
}
function saveText(name,text){
 if(!name||!text)throw Error('Enter a .txt file name and content.');
 if(!confirm('Create '+name+' in your chosen Android folder? No existing file will be overwritten.'))return 'File creation cancelled.';
 const r=native('FILES_SAVE_TEXT',{name,text});
 if(r.status!=='created')throw Error(pretty(r));
 return pretty(r);
}
export async function runV54Routine(routine){
 if(!validateV54Routine(routine))throw Error('Invalid routine; no steps ran.');
 if(!confirm('Run routine "'+routine.name+'" with '+routine.steps.length+' supported steps? App opening runs last.'))return 'Routine cancelled.';
 const reports=[];let failed=false;
 for(const step of routine.steps){
  try{
   let line='';
   switch(step.type){
    case 'battery':{
     const r=window.MayaBridge?.batteryStatus?.();
     if(!r)throw Error('Android battery bridge missing.');
     const x=JSON.parse(r);if(!Number.isFinite(x.percent))throw Error('Battery unavailable.');
     line='Battery '+x.percent+'%';break;
    }
    case 'notifications':line=readNotifications();break;
    case 'reminders':{
     const x=native('REMINDERS_LIST');if(x.status!=='ok')throw Error(pretty(x));
     line='Active Android reminders: '+(Array.isArray(x.reminders)?x.reminders.length:0);break;
    }
    case 'files':line=readFolder();break;
    case 'reminder':{
     if(!confirm('Schedule reminder "'+step.title+'" in '+step.minutes+' minutes?'))throw Error('User did not approve scheduling.');
     line=requestReminder(step.title,step.minutes);break;
    }
    case 'app':{
     const opened=await openNamedApp(step.name);
     if(!opened.startsWith('Android launch requested:')&&!opened.startsWith('ব্যাকগ্রাউন্ড লঞ্চ:'))throw Error(opened);
     line=opened;break;
    }
   }
   reports.push(step.type+': '+line);
  }catch(error){reports.push(step.type+': FAILED — '+short(error?.message||error,140));failed=true;break;}
 }
 return (failed?'Stopped after failure. ':'Routine requested. ')+reports.join(' | ');
}
async function execute(command){
 if(!command||typeof command!=='object')return 'Unsupported V54 command.';
 openPanel();
 if(command.kind==='notificationList')return readNotifications();
 if(command.kind==='notificationReplyPanel')return 'Select a message and type a reply in Notification Manager. Sending needs your confirmation.';
 if(command.kind==='folderPick')return pretty(native('FILES_PICK'));
 if(command.kind==='folderList')return readFolder();
 if(command.kind==='fileSave')return saveText(command.name,command.text);
 if(command.kind==='reminder'){
  if(!confirm('Set an Android reminder in '+command.minutes+' minutes: '+command.title+'?'))return 'Reminder cancelled.';
  return requestReminder(command.title,command.minutes);
 }
 if(command.kind==='macro')return runV54Macro(command.app,command.label);
 if(command.kind==='routine'){
  const routine=readV54Routines(localStorage).find(r=>r.name.toLocaleLowerCase()===command.name.toLocaleLowerCase());
  if(!routine)return 'There is no saved routine named '+short(command.name,60)+'.';
  return runV54Routine(routine);
 }
 if(command.kind==='status')return statusText();
 return 'Unsupported V54 voice action.';
}
export async function runV54VoiceCommand(command){return guarded('V54 Voice Action',()=>execute(command));}
function mount(){
 if($('mayaV54'))return;
 const host=document.querySelector('#setSheet .body');if(!host)return;
 const root=document.createElement('details');root.id='mayaV54';root.style.cssText='margin:14px 0;padding:14px;border:1px solid #49c6df;border-radius:15px;background:#0d1827';
 root.innerHTML=`
 <summary style="font-weight:700">Maya V54 · Native Voice Actions, Macros & Routines</summary>
 <p class="note">Real Android features only. Requires the APK and user-granted Android permissions. Some tasks prompt for approval. No arbitrary background app clicks, no hidden file access, no guaranteed notification delivery.</p>
 <h4>1 · Voice Action Engine</h4><p class="note">Use Maya voice call + Life Voice enabled. Example: “Maya remind me in 10 minutes to drink water”, “Maya read notifications”, “Maya choose folder”, “Maya macro Calculator tap History”, “Maya run routine morning”.</p>
 <h4>2 · One-step App Macro (Android Accessibility)</h4>
 <input class="inp wide" id="v54MacroApp" placeholder="Installed app exact name" maxlength="100">
 <input class="inp wide" id="v54MacroLabel" placeholder="Visible safe button label e.g. History" maxlength="48">
 <button class="btn" id="v54MacroGo">Approve and run macro</button><button class="btn" id="v54MacroStatus">Check Macro Status</button>
 <p class="note">Enable Maya Screen Control manually in Android Accessibility Settings. One app + one safe visible control; no payment, send, delete or login macros. A requested tap does not prove the app completed the action.</p>
 <h4>3 · Notifications & Quick Reply</h4>
 <button class="btn" id="v54NotifSettings">Open Android Notification Access</button><button class="btn" id="v54NotifList">Read recent supported notifications</button>
 <div id="v54Messages"></div><select class="inp wide" id="v54Message"></select><input class="inp wide" id="v54Reply" maxlength="300" placeholder="Reply text">
 <button class="btn" id="v54ReplySend">Confirm Quick Reply</button>
 <p class="note">Reuses Maya's existing NotificationListenerService and Android RemoteInput; explicit confirmation required. Actual message delivery is not verifiable from this response.</p>
 <h4>4 · Android Folder Manager (Storage Access Framework)</h4>
 <button class="btn" id="v54Pick">Choose folder</button><button class="btn" id="v54List">List selected folder</button><div id="v54FileList"></div>
 <input class="inp wide" id="v54Filename" maxlength="80" placeholder="Filename: notes.txt"><textarea class="inp wide" id="v54Content" maxlength="64000" rows="3" placeholder="Text to create in selected folder"></textarea>
 <button class="btn" id="v54Save">Confirm create TXT</button><p class="note">Only the user-chosen folder; no arbitrary storage scanning, deleting, or overwriting.</p>
 <h4>5 · Real Android Background Reminders</h4>
 <input class="inp wide" id="v54ReminderTitle" maxlength="120" placeholder="Reminder title"><input class="inp wide" id="v54Minutes" type="number" min="1" max="43200" placeholder="Minutes from now">
 <button class="btn" id="v54Remind">Approve Android Reminder</button><button class="btn" id="v54Reminders">List Android Reminders</button>
 <p class="note">Reuses Android AlarmManager + receiver + reboot restore. Works without Maya UI running, if Android delivers it. Timing may be delayed in Doze, and notification permission is required.</p>
 <h4>6 · Personal Routine (one app last)</h4>
 <input class="inp wide" id="v54RoutineName" maxlength="70" placeholder="Routine name e.g. morning">
 <label><input type="checkbox" id="v54RBattery" checked> Read battery</label>
 <label><input type="checkbox" id="v54RNotifications"> Read notifications</label>
 <label><input type="checkbox" id="v54RReminders"> List reminders</label>
 <label><input type="checkbox" id="v54RFiles"> List approved folder</label>
 <input class="inp wide" id="v54RApp" maxlength="90" placeholder="Optional app to open LAST (e.g. Calendar)">
 <button class="btn" id="v54SaveRoutine">Save routine locally</button><select class="inp wide" id="v54SavedRoutines"></select>
 <button class="btn" id="v54RunRoutine">Approve and run selected routine</button><button class="btn" id="v54DeleteRoutine">Delete selected routine</button>
 <p class="note">At most 12 routines and 5 steps. App launch is last: Android may pause Maya after switching apps. No continuous multi-app UI automation is claimed.</p>
 <p id="v54Result" role="status" class="note">Ready.</p>`;
 host.append(root);
 const btn=(id,fn)=>{$(id).onclick=()=>void guarded('V54',fn)};
 btn('v54MacroGo',()=>runV54Macro(short($('v54MacroApp').value,100),short($('v54MacroLabel').value,48)));
 btn('v54MacroStatus',()=>pretty(native('MACRO_STATUS')));
 btn('v54NotifSettings',()=>pretty(native('NOTIFICATIONS_OPEN_ACCESS')));
 btn('v54NotifList',()=>readNotifications());
 btn('v54ReplySend',()=>replyNotification());
 btn('v54Pick',()=>pretty(native('FILES_PICK')));
 btn('v54List',()=>readFolder());
 btn('v54Save',()=>saveText(short($('v54Filename').value,80),$('v54Content').value));
 btn('v54Remind',()=>{
  const title=short($('v54ReminderTitle').value,120),minutes=Number($('v54Minutes').value);
  if(!confirm('Schedule Android reminder "'+title+'" in '+minutes+' minutes?'))return 'Reminder cancelled.';
  return requestReminder(title,minutes);
 });
 btn('v54Reminders',()=>{const x=native('REMINDERS_LIST');if(x.status!=='ok')throw Error(pretty(x));return 'Android has '+(x.reminders?.length||0)+' queued Maya reminders.';});
 const reload=()=>{
  const box=$('v54SavedRoutines');box.replaceChildren();
  readV54Routines(localStorage).forEach((r,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=r.name+' · '+r.steps.length+' steps';box.append(o);});
 };
 btn('v54SaveRoutine',()=>{
  const name=short($('v54RoutineName').value,70),steps=[];
  for(const [id,type] of [['v54RBattery','battery'],['v54RNotifications','notifications'],['v54RReminders','reminders'],['v54RFiles','files']])if($(id).checked)steps.push({type});
  const app=short($('v54RApp').value,90);if(app)steps.push({type:'app',name:app});
  const r={name,steps};if(!validateV54Routine(r))throw Error('Choose a name and 1–5 steps; only one app can open last.');
  const all=readV54Routines(localStorage).filter(x=>x.name.toLowerCase()!==name.toLowerCase());
  if(all.length>=12)throw Error('Maximum 12 routines. Delete one first.');
  all.push(r);localStorage.setItem(KEY,JSON.stringify(all));reload();return 'Saved '+r.name+' locally (not encrypted).';
 });
 btn('v54RunRoutine',()=>{const r=readV54Routines(localStorage)[Number($('v54SavedRoutines').value)];return runV54Routine(r);});
 btn('v54DeleteRoutine',()=>{
  if(!confirm('Delete selected V54 routine?'))return 'Cancelled.';
  const rows=readV54Routines(localStorage);const idx=Number($('v54SavedRoutines').value);if(!rows[idx])throw Error('Choose a routine.');
  rows.splice(idx,1);localStorage.setItem(KEY,JSON.stringify(rows));reload();return 'Selected V54 routine deleted.';
 });
 reload();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
