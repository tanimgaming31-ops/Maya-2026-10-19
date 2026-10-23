/* Maya Smart Hub V27 — additive, local-first, no autonomous external actions.
   Designed for a phone-only APK; original Maya voice, avatar, keys and memories remain untouched. */
import {createTodo,listTodos,completeTodo,deleteTodo} from './productivity.js';
import {loadMemory,searchMemory} from './memory-v2.js';
import {loadData,weekly} from './life-suite.js';
import {buildDailyBriefing} from './daily-briefing.js';

export const HUB_KEY='maya_smart_hub_v27';
export const STEPS=Object.freeze(['briefing','tasks','diary','weekly','memory','focus']);
const max=(text,n=250)=>String(text??'').trim().slice(0,n);
const uid=()=>globalThis.crypto?.randomUUID?.()||'hub-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const secret=s=>/(?:password|passcode|otp|api[\s_-]?key|seed phrase|cvv|পাসওয়ার্ড|ওটিপি|পিন নম্বর|\b\d{13,19}\b)/iu.test(String(s));
export const TEMPLATES=Object.freeze([
 {id:'morning',title:'Morning Brief',steps:['briefing','tasks']},
 {id:'study',title:'Focus Preparation',steps:['tasks','focus']},
 {id:'evening',title:'Evening Review',steps:['diary','weekly']},
 {id:'memory',title:'Memory Check',steps:['memory']}
]);
export function validateRoutines(x){
 return !!x&&typeof x==='object'&&!Array.isArray(x)&&x.version===1&&Array.isArray(x.routines)&&x.routines.length<=25&&x.routines.every(r=>r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.id==='string'&&r.id.length<=100&&typeof r.title==='string'&&r.title.trim().length>0&&r.title.length<=70&&Array.isArray(r.steps)&&r.steps.length>=1&&r.steps.length<=5&&r.steps.every(s=>STEPS.includes(s)));
}
export function loadRoutines(){
 try{const str=localStorage.getItem(HUB_KEY);if(!str)return {version:1,routines:[]};const v=JSON.parse(str);return validateRoutines(v)?v:{version:1,routines:[]};}catch{return {version:1,routines:[]};}
}
export function saveRoutines(data){if(!validateRoutines(data))throw Error('Invalid routines; no data overwritten.');localStorage.setItem(HUB_KEY,JSON.stringify(data));}
export function createRoutine(title,steps){
 const name=max(title,70);if(!name||secret(name)||!Array.isArray(steps)||steps.length<1||steps.length>5||steps.some(x=>!STEPS.includes(x)))throw Error('Choose a title and 1–5 permitted steps.');
 const data=loadRoutines();if(data.routines.length>=25)throw Error('Maximum 25 custom routines.');
 const routine={id:uid(),title:name,steps:[...new Set(steps)]};data.routines.push(routine);saveRoutines(data);return routine;
}
export function removeRoutine(id){const data=loadRoutines(),before=data.routines.length;data.routines=data.routines.filter(x=>x.id!==id);if(before===data.routines.length)return false;saveRoutines(data);return true;}
export function getRoutine(id){return TEMPLATES.find(x=>x.id===id)||loadRoutines().routines.find(x=>x.id===id)||null;}
export function parseHubCommand(line){
 const t=String(line||'').trim();
 let m=t.match(/^(?:কাজ\s+(?:যোগ করো|লিখে রাখো|মনে রাখো|লিখো)\s*[:\-]?\s+)(.+)$/u)
    ||t.match(/^(?:add|create|save)\s+(?:a\s+)?(?:to[- ]?do|task)\s*[:\-]?\s+(.+)$/iu);
 if(m)return {kind:'hub',action:'todoAdd',text:max(m[1],200)};
 if(/^(?:আমার\s+)?(?:কাজের তালিকা দেখাও|টুডু দেখাও|কাজ দেখাও|show (?:my )?(?:tasks|to[- ]?dos)|list (?:my )?(?:tasks|to[- ]?dos))$/iu.test(t))return {kind:'hub',action:'todoList'};
 m=t.match(/^(?:মেমোরি|স্মৃতি)\s+(?:খুঁজে দাও|খোঁজো|সার্চ করো)\s+(.+)$/u)
  ||t.match(/^(?:search|find)\s+(?:my\s+)?memor(?:y|ies)\s+(?:for\s+)?(.+)$/iu);
 if(m)return {kind:'hub',action:'memorySearch',query:max(m[1],100)};
 if(/^(?:আজকের ব্রিফিং (?:দাও|বলো)|আজকের কাজের সারাংশ বলো|show (?:my )?(?:daily|today(?:'s)?) briefing|daily briefing)$/iu.test(t))return {kind:'hub',action:'daily'};
 if(/^(?:ফোন (?:চেক করো|পরীক্ষা করো)|ডায়াগনস্টিক দেখাও|ডায়াগনস্টিক দেখাও|check (?:my )?(?:phone|permissions)|phone diagnostics)$/iu.test(t))return {kind:'hub',action:'diagnostics'};
 if(/^(?:প্রাইভেসি চেক করো|গোপনীয়তা দেখাও|গোপনীয়তা দেখাও|privacy check|privacy summary)$/iu.test(t))return {kind:'hub',action:'privacy'};
 const r=t.match(/^(?:মর্নিং|সকাল|ফোকাস|স্টাডি|পড়াশোনা|পড়াশোনা|ইভনিং|সন্ধ্যা|মেমোরি|স্মৃতি)\s+রুটিন\s+(?:চালু করো|শুরু করো)$/iu)
  ||t.match(/^(?:start|run|open)\s+(morning|focus|study|evening|memory)\s+routine$/iu);
 if(r){
  const s=r[1]?.toLowerCase()||t.toLowerCase();
  const which=/মর্নিং|সকাল|morning/u.test(s)?'morning':/ফোকাস|স্টাডি|পড়াশোনা|পড়াশোনা|focus|study/u.test(s)?'study':/ইভনিং|সন্ধ্যা|evening/u.test(s)?'evening':'memory';
  return {kind:'hub',action:'routine',id:which};
 }
 return null;
}
export function readOnlyDiagnostics(){
 const native=typeof window!=='undefined'&&typeof window.MayaBridge?.control==='function';
 const cap=typeof window!=='undefined'&&!!window.Capacitor?.getPlatform;
 return {
  nativeBridge:native?'Present (not a device-action test)':'Unavailable',
  capacitor:cap?String(window.Capacitor.getPlatform()):'Unavailable',
  microphoneAPI:typeof navigator!=='undefined'&&!!navigator.mediaDevices?.getUserMedia?'API exposed; permission not tested':'Unavailable',
  speechRecognition:typeof window!=='undefined'&&!!(window.SpeechRecognition||window.webkitSpeechRecognition)?'Browser API present':'Browser API not available',
  screenshotPlugin:cap&&!!window.Capacitor.isPluginAvailable?.('MayaScreenshot')?'Plugin registered (capture not tested)':'Unavailable',
  online:typeof navigator!=='undefined'&&navigator.onLine===true?'Online':'Offline or unknown'
 };
}
export function getTodoSummary(){
 const list=listTodos().filter(x=>!x.done);
 return list.length?'Pending To-dos ('+list.length+'): '+list.slice(0,7).map(x=>(x.priority==='high'?'[HIGH] ':'')+max(x.title,85)).join(' | '):'No pending To-dos in Maya V18.';
}
export function getMemorySummary(query=''){
 const items=query?searchMemory(query):loadMemory().items.slice(-5);
 return items.length?'Categorized V2 memories ('+items.length+'): '+items.slice(-4).map(x=>max(x.text,110)).join(' | '):'No matching V2 memory. Original Romantic Memory Packs remain separate.';
}
export function privacySummary(){
 const data=loadData(),todo=listTodos(),mem=loadMemory().items.length,r=loadRoutines().routines.length;
 return 'Local Life Suite: '+data.diary.length+' diary, '+data.expense.length+' expenses, '+data.knowledge.length+' knowledge notes. '+todo.length+' V18 To-dos; '+mem+' V2 memory records; '+r+' custom routines. Life Suite, V18 To-dos and V2 Memory are NOT encrypted by Private Vault.';
}
export async function runRoutine(routine,confirmAction=async()=>false){
 if(!routine||!Array.isArray(routine.steps)||routine.steps.length<1||routine.steps.some(x=>!STEPS.includes(x)))return 'Unsupported routine; no actions performed.';
 const results=[];
 for(const step of routine.steps){
  try{
   if(step==='briefing'){results.push('Daily briefing: '+max(buildDailyBriefing(),430));continue;}
   if(step==='tasks'){results.push(getTodoSummary());continue;}
   if(step==='diary'){
    const entries=loadData().diary;
    results.push(entries.length?'Recent Diary: '+max(entries[entries.length-1].body,200):'Diary is empty.');continue;
   }
   if(step==='weekly'){
    const x=weekly(),amounts=Object.entries(x.spent).map(([c,v])=>c+' '+Number(v).toFixed(2)).join(', ');
    results.push('Weekly: '+x.diary+' diary entries, '+x.flashcards+' flashcards, '+x.focusMinutes+' focus minutes. Expenses: '+(amounts||'none')+'.');continue;
   }
   if(step==='memory'){results.push(getMemorySummary());continue;}
   if(step==='focus'){
    if(!await confirmAction('Start the EXISTING 25-minute foreground Focus timer? Maya must stay open.')){results.push('Focus skipped: not confirmed.');continue;}
    const input=document.getElementById('lifeMinutes'),btn=document.getElementById('lifeStartFocus'),status=document.getElementById('lifeFocusOut');
    if(!input||!btn||!status){results.push('Focus unavailable: original Life Suite control missing.');continue;}
    input.value='25';btn.click();
    results.push(status.textContent.includes('session running')?'Real Life Suite focus timer started (25 minutes; app must remain open).':'Focus NOT confirmed started: '+status.textContent);
   }
  }catch(err){results.push(step+' failed: '+String(err?.message||err));}
 }
 return results.join('\n').slice(0,1500);
}
export async function executeHubCommand(command,confirmAction=async()=>false){
 if(!command||command.kind!=='hub')return 'Unsupported command; no change.';
 try{
 switch(command.action){
  case 'todoAdd':{
   const name=max(command.text,200);
   if(name.length<2||secret(name))return 'To-do text is empty or looks like a secret; not saved.';
   if(!await confirmAction('Save this To-do locally in Maya V18?\n'+name))return 'To-do creation cancelled.';
   createTodo({title:name});emitUpdate();return 'To-do added to your existing Maya list: '+name;
  }
  case 'todoList':return getTodoSummary();
  case 'memorySearch':return getMemorySummary(max(command.query,100));
  case 'daily':return max(buildDailyBriefing(),1100);
  case 'diagnostics':return Object.entries(readOnlyDiagnostics()).map(([k,v])=>k+': '+v).join(' | ');
  case 'privacy':return privacySummary();
  case 'routine':{
   const r=getRoutine(command.id);
   return r?runRoutine(r,confirmAction):'Routine not found.';
  }
  default:return 'Unsupported hub command.';
 }
 }catch(err){return 'Maya Smart Hub error: '+String(err?.message||err).slice(0,160);}
}
function emitUpdate(){if(typeof window!=='undefined')window.dispatchEvent(new Event('maya:smart-hub-changed'));}
function mount(){
 const host=document.querySelector('#setSheet .body');if(!host||document.getElementById('mayaSmartHubOpen'))return;
 const open=document.createElement('button');open.id='mayaSmartHubOpen';open.className='btn';
 open.textContent='Maya Smart Hub • Advanced V27';open.style.cssText='display:block;margin:10px 0';
 const area=document.createElement('section');area.hidden=true;
 area.style.cssText='border:1px solid #56869c;border-radius:13px;padding:12px;background:#091626;margin:10px 0;overflow-wrap:anywhere';
 const markup=[
 '<h3>Smart Hub — Maya V27</h3>',
 '<p class="note">All tools are in this same Maya app. No silent background actions, no WhatsApp/IMO sending, no file upload. Local user data is not encrypted.</p>',
 '<h4>One-tap Routines</h4><div id="hubTemplates" class="krow"></div>',
 '<h4>My Tasks</h4><input id="hubTask" class="inp wide" maxlength="200" placeholder="Add a task to existing Maya To-dos">',
 '<select id="hubPriority" class="inp"><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select>',
 '<button id="hubAddTask" class="btn pri">Save task</button><div id="hubTaskList"></div>',
 '<h4>Build Your Routine</h4><input id="hubName" class="inp wide" maxlength="70" placeholder="Routine name">',
 '<p class="note">Select up to 5 steps. Nothing happens automatically; run it explicitly.</p>',
 '<div id="hubStepChecks"></div><button id="hubCreate" class="btn">Save my routine</button>',
 '<div id="hubRoutines"></div>',
 '<div class="krow"><button id="hubExport" class="btn">Export routines</button><button id="hubImportBtn" class="btn">Import routines</button><input type="file" id="hubImport" hidden accept=".json,application/json"></div>',
 '<h4>Privacy & Diagnostics</h4>',
 '<div class="krow"><button id="hubInspect" class="btn">Check native / voice capabilities</button><button id="hubMic" class="btn">Test microphone (ask permission)</button><button id="hubCam" class="btn">Test camera (ask permission)</button><button id="hubPrivacy" class="btn">Show local privacy counts</button></div>',
 '<p class="note">Microphone/camera tests open only on your tap, stop tracks immediately, and do not send recordings or images anywhere. Capability presence is not proof the phone works.</p>',
 '<pre id="hubReport" class="msg" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>',
 '<p id="hubStatus" role="status" class="msg">Ready.</p>'
 ];
 area.innerHTML=markup.join('');host.append(open,area);
 const $=id=>document.getElementById(id),make=(tag,txt)=>{const el=document.createElement(tag);el.textContent=String(txt);return el;};
 const status=msg=>{$('hubStatus').textContent=String(msg);};
 const show=msg=>{$('hubReport').textContent=String(msg);status('Result displayed.');};
 const guard=fn=>async()=>{try{await fn();}catch(err){status('Error: '+String(err?.message||err).slice(0,180));}};
 const ask=async text=>confirm(text);
 const reload=()=>{renderTasks();renderRoutines();};
 function renderTasks(){
  const box=$('hubTaskList');box.replaceChildren();
  const tasks=listTodos().slice(-55).reverse();
  for(const t of tasks){
   const row=make('p',(t.done?'✓ ':'○ ')+(t.priority==='high'?'[HIGH] ':'')+max(t.title,150)+' ');
   row.style.cssText='overflow-wrap:anywhere;margin:8px 0';
   if(!t.done){const done=make('button','Done');done.className='btn';done.onclick=guard(()=>{completeTodo(t.id);reload();emitUpdate();status('Task marked complete.');});row.append(done);}
   const del=make('button','Delete');del.className='btn bad';del.onclick=guard(()=>{if(confirm('Delete this Maya To-do?')){deleteTodo(t.id);reload();emitUpdate();status('Task deleted.');}});row.append(del);box.append(row);
  }
  if(!tasks.length)box.append(make('p','Your To-do list is empty.'));
 }
 function renderRoutines(){
  const box=$('hubRoutines');box.replaceChildren();
  for(const r of loadRoutines().routines){
   const row=make('p',r.title+' • '+r.steps.join(' → ')+' ');row.style.cssText='overflow-wrap:anywhere;margin:9px 0';
   const run=make('button','Run');run.className='btn pri';run.onclick=guard(async()=>{show(await runRoutine(r,ask));reload();});
   const del=make('button','Delete');del.className='btn bad';del.onclick=guard(()=>{if(confirm('Delete custom routine?')){removeRoutine(r.id);renderRoutines();status('Routine deleted.');}});
   row.append(run,del);box.append(row);
  }
  if(!loadRoutines().routines.length)box.append(make('p','No custom routines. Built-in templates appear above.'));
 }
 for(const t of TEMPLATES){
  const btn=make('button',t.title);btn.className='btn';btn.onclick=guard(async()=>{show(await runRoutine(t,ask));reload();});
  $('hubTemplates').append(btn);
 }
 for(const step of STEPS){
  const label=document.createElement('label');label.style.cssText='display:inline-flex;gap:6px;align-items:center;margin:6px';
  const check=document.createElement('input');check.type='checkbox';check.value=step;check.className='hubStep';
  label.append(check,document.createTextNode(step));$('hubStepChecks').append(label);
 }
 $('hubAddTask').onclick=guard(()=>{const name=max($('hubTask').value,200);if(name.length<2||secret(name))throw Error('Enter a real task; no passwords or OTPs.');createTodo({title:name,priority:$('hubPriority').value});$('hubTask').value='';reload();emitUpdate();status('Saved in Maya V18 shared To-dos.');});
 $('hubCreate').onclick=guard(()=>{const steps=Array.from(document.querySelectorAll('.hubStep:checked'),el=>el.value),title=$('hubName').value;createRoutine(title,steps);$('hubName').value='';for(const cb of document.querySelectorAll('.hubStep'))cb.checked=false;renderRoutines();status('Routine saved locally; it will not run automatically.');});
 $('hubInspect').onclick=()=>show(Object.entries(readOnlyDiagnostics()).map(([k,v])=>k+': '+v).join('\n'));
 $('hubPrivacy').onclick=()=>show(privacySummary());
 const testAV=kind=>guard(async()=>{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('getUserMedia not available in this Android WebView.');
  status('Requesting '+kind+' permission…');
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia(kind==='microphone'?{audio:true}:{video:true});show(kind+' opened successfully and tracks stopped. No audio or video was saved.');}
  catch(e){show(kind+' test failed: '+String(e?.name||'Error')+' — '+String(e?.message||e).slice(0,180)+'. Check Android Settings → Apps → Maya → Permissions.');}
  finally{if(stream)stream.getTracks().forEach(track=>track.stop());}
 });
 $('hubMic').onclick=testAV('microphone');$('hubCam').onclick=testAV('camera');
 $('hubExport').onclick=()=>{try{const blob=new Blob([JSON.stringify(loadRoutines(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='maya-smart-routines.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('Unencrypted routine JSON export requested.');}catch(e){status(e.message);}};
 $('hubImportBtn').onclick=()=>$('hubImport').click();
 $('hubImport').onchange=guard(async()=>{const file=$('hubImport').files?.[0];if(!file)return;if(file.size>120000)throw Error('File too large');const parsed=JSON.parse(await file.text());if(!validateRoutines(parsed))throw Error('Invalid custom routines. Original data unchanged.');if(!confirm('Replace ALL custom Smart Hub routines? This does not touch Maya Memories, Vault or Life Suite.'))return;saveRoutines(parsed);renderRoutines();status('Custom routines imported.');$('hubImport').value='';});
 open.onclick=()=>{area.hidden=!area.hidden;open.textContent=area.hidden?'Maya Smart Hub • Advanced V27':'Close Maya Smart Hub';if(!area.hidden)reload();};
 window.addEventListener('maya:smart-hub-changed',reload);
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
