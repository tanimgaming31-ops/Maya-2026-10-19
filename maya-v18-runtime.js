/* Maya V18 additive integration. Keeps the original index.html, memory packs,
   Gemini configuration, native setup, voice UI and avatar untouched. */
import { MayaFeatures } from './maya-features/feature-registry.js';
import { AndroidBridge } from './maya-features/android-bridge.js';
import { loadMemory, addMemory, updateMemory, deleteMemory, searchMemory,
         exportMemory, importMemory } from './maya-features/memory-v2.js';
import { createTodo, completeTodo, deleteTodo, listTodos, createReminder,
         createTimer, createCalendarEvent, listToday } from './maya-features/productivity.js';
import { buildDailyBriefing } from './maya-features/daily-briefing.js';

const $ = id => document.getElementById(id);
const v18State = { ready: false, lastMessage: '' };
const secretLike = s => /(?:\b(?:password|passcode|private key|secret|otp|pin|cvv|api[\s_-]?key|seed phrase)\b|AIza[0-9A-Za-z_-]{30,}|\b(?:\d[ -]?){13,19}\b|পাসওয়ার্ড|ওটিপি)/i.test(String(s));
const id = () => globalThis.crypto?.randomUUID?.() || 'v18-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const text = (e,s) => { if(e)e.textContent=String(s||''); };
const nowLocal = () => { const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,16); };
function show(s, fail=false) { v18State.lastMessage=s; const target=$('v18-status');if(target){target.textContent=s;target.style.color=fail?'#ff9fa7':'';} }
const err = e => show(String(e?.message||e||'Unexpected error'),true);
const parse = key => {try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const clean = s => String(s||'').replace(/\s+/g,' ').trim();
const short = (s,n=220) => String(s||'').slice(0,n);

// Existing Maya short memories remain at maya.memories, while Memory Packs stay at
// maya.memoryPacks. Never migrate or overwrite those automatically.
function syncMemoryToOriginal() {
  const source=loadMemory().items;
  const old=parse('maya.memories');
  const list=Array.isArray(old)?old.slice():[];
  const keys=new Set(list.map(x=>clean(x?.text).toLocaleLowerCase()));
  let count=0, skipped=0;
  for(const m of source) {
    const value=clean(m?.text);
    if(!value||value.length>200||secretLike(value)){skipped++;continue;}
    if(keys.has(value.toLocaleLowerCase()))continue;
    if(list.length>=200){skipped++;continue;}
    list.push({id:id(),text:value,category:short(m.category||'other',40),ts:Date.now()});
    keys.add(value.toLocaleLowerCase());count++;
  }
  if(count) localStorage.setItem('maya.memories',JSON.stringify(list));
  show(`Copied ${count} short facts to Maya's existing AI memory. ${skipped} too-long/unsafe or capacity-limited items skipped. Existing memory packs were NOT changed.`);
}
function importOldShortMemory() {
  const old=parse('maya.memories');
  if(!Array.isArray(old)){show('No old short-memory records found. Old Memory Packs are unchanged.');return;}
  const have=new Set(loadMemory().items.map(x=>clean(x.text).toLocaleLowerCase()));
  let added=0,skipped=0;
  for(const m of old){const v=clean(m?.text);if(!v||v.length>200||secretLike(v)){skipped++;continue;}if(have.has(v.toLocaleLowerCase()))continue;
    if(addMemory(v,short(m?.category||'other',40))){have.add(v.toLocaleLowerCase());added++;}
  }
  show(`Copied ${added} old short facts into Memory V2. ${skipped} unsafe or invalid records ignored. Original memories and packs remain untouched.`);
  renderMemories();
}
function renderMemories(query='') {
  const box=$('v18-memory-list');if(!box)return;box.replaceChildren();
  let a=loadMemory().items;
  if(query)a=searchMemory(query);
  text($('v18-memory-count'),`${loadMemory().items.length} categorized V2 memory item(s). Original Maya Memory Packs stay separate and safe.`);
  for(const m of a.slice(-60).reverse()) {
    const row=document.createElement('div');row.className='msg';row.style.margin='6px 0';
    const title=document.createElement('span');title.textContent=`[${short(m.category,32)}] ${short(m.text,450)}`;
    const buttons=document.createElement('div');buttons.className='krow';
    const edit=document.createElement('button');edit.className='btn';edit.textContent='Edit';
    edit.onclick=()=>{const v=prompt('Edit categorized memory:',m.text);if(v===null)return;if(!clean(v)||secretLike(v)){show('Empty or secret-like memory cannot be saved.',true);return;}try{updateMemory(m.id,short(v,5000),m.category);renderMemories($('v18-memory-search').value);}catch(e){err(e);}};
    const del=document.createElement('button');del.className='btn bad';del.textContent='Delete';
    del.onclick=()=>{if(!confirm('Delete this V2 item? Original Maya Memory Packs will not be changed.'))return;try{deleteMemory(m.id);renderMemories($('v18-memory-search').value);}catch(e){err(e);}};
    buttons.append(edit,del);row.append(title,buttons);box.append(row);
  }
  if(!a.length)text(box,'No matching V2 memories. Existing Maya memories remain available in the original Memory page.');
}
function renderTodos() {
  const box=$('v18-todo-list');if(!box)return;box.replaceChildren();
  for(const t of listTodos().slice(-50).reverse()) {
    const row=document.createElement('div');row.className='krow';row.style.margin='6px 0';
    const label=document.createElement('span');label.style.flex='1';label.textContent=(t.done?'✓ ':'○ ')+short(t.title,180)+(t.dueDate?' · '+t.dueDate:'');
    const done=document.createElement('button');done.className='btn';done.textContent='Done';done.disabled=!!t.done;done.onclick=()=>{completeTodo(t.id);renderTodos();};
    const del=document.createElement('button');del.className='btn bad';del.textContent='Delete';del.onclick=()=>{if(confirm('Remove this To-do?')){deleteTodo(t.id);renderTodos();}};
    row.append(label,done,del);box.append(row);
  }
  if(!box.children.length)text(box,'No To-dos saved.');
}
function briefing(){try{const result=buildDailyBriefing();text($('v18-brief-output'),result);show('Briefing created from LOCAL V2 memories and productivity items; no claim of live news.');}catch(e){err(e);}}

// All UI strings are constant HTML, never interpolated from user inputs.
const ui=`
<details id="v18-root" style="margin:16px 0;padding:12px;border:1px solid var(--line,#495);border-radius:12px">
<summary style="font-weight:700;cursor:pointer">Maya V18 — Memory V2, To-do & Daily Briefing</summary>
<p class="note">Extra local features. Your old Maya memory packs, 3D avatar, voice, keys and existing tools are NOT replaced.</p>
<h3>Android bridge check</h3><button class="btn" id="v18-native-check">Check real native connection</button><p class="note">Read-only device check; shows unavailable in Chrome, never fake success.</p>
<h3>Memory V2 (categorized)</h3>
<div class="krow"><input class="inp" id="v18-memory-text" placeholder="A non-secret fact to remember" maxlength="5000" style="flex:2"/><select class="inp" id="v18-memory-category"><option value="other">Other</option><option value="routine">Routine</option><option value="goal">Goal</option><option value="plan">Plan</option><option value="study">Study</option><option value="preference">Preference</option></select><button class="btn pri" id="v18-memory-add">Save</button></div>
<div class="krow"><input class="inp" id="v18-memory-search" placeholder="Search V2 memory" style="flex:1"/><button class="btn" id="v18-legacy-import">Copy old short memory → V2</button></div>
<p class="note" id="v18-memory-count"></p><div id="v18-memory-list"></div>
<div class="krow"><button class="btn" id="v18-memory-export">Export V2 JSON</button><input type="file" id="v18-memory-file" accept=".json,application/json" hidden/><button class="btn" id="v18-memory-import">Import V2 JSON</button></div>
<button class="btn" id="v18-sync-ai">Copy safe V2 short facts into Maya AI memory</button>
<p class="note">The AI uses original Maya memories. Use the Copy button to add eligible V2 facts to original AI memory; this never deletes old facts or packs. Long V2 notes are not automatically sent to Gemini.</p>
<h3>To-do list</h3>
<div class="krow"><input class="inp" id="v18-todo-text" maxlength="200" placeholder="New to-do" style="flex:2"/><button class="btn pri" id="v18-todo-add">Add To-do</button></div>
<div id="v18-todo-list"></div>
<h3>Reminders & Events (in-app)</h3>
<div class="krow"><input class="inp" id="v18-rem-title" maxlength="140" placeholder="Reminder title" style="flex:2"/><input type="datetime-local" class="inp" id="v18-rem-at"/></div>
<button class="btn" id="v18-rem-save">Save in-app reminder</button><button class="btn" id="v18-event-save">Save internal calendar event</button>
<p class="note">These browser timers/notifications require the app to remain active. For screen-off reminders use the existing Maya V9 Android Reminders instead; saving here does NOT schedule a native alarm.</p>
<div class="krow"><input id="v18-timer-secs" class="inp" type="number" min="1" max="3600" value="60" style="max-width:95px"/><button class="btn" id="v18-timer-start">Start in-app timer (seconds)</button></div>
<h3>Local Daily Briefing</h3><button class="btn pri" id="v18-brief">Create today's briefing</button><pre class="msg" id="v18-brief-output" style="white-space:pre-wrap;user-select:text"></pre>
<div class="msg" role="status" aria-live="polite" id="v18-status">Ready. Original Maya features are unchanged.</div>
</details>`;
function init() {
  if(v18State.ready)return;
  const host=document.querySelector('#setSheet .body');if(!host)return;
  const target=document.createElement('section');target.innerHTML=ui;host.appendChild(target);
  v18State.ready=true;
  $('v18-native-check').onclick=async()=>{try{const r=await AndroidBridge.runAction('V9_GET');show('Native bridge: '+r.status+(r.message?' — '+r.message:'')+'.');}catch(e){err(e);}};
  $('v18-memory-add').onclick=()=>{const t=clean($('v18-memory-text').value);if(!t||secretLike(t)){show('Memory is empty or looks like a secret; not saved.',true);return;}try{const m=addMemory(t,$('v18-memory-category').value);if(!m)throw new Error('Could not store the memory');$('v18-memory-text').value='';renderMemories();show('V2 memory saved locally. Copy to Maya AI memory to make it available to Gemini.');}catch(e){err(e);}};
  $('v18-memory-search').oninput=e=>renderMemories(e.target.value);
  $('v18-memory-export').onclick=()=>{try{exportMemory();show('Memory V2 export requested. Original packs are NOT part of this export.');}catch(e){err(e);}};
  $('v18-memory-import').onclick=()=>$('v18-memory-file').click();
  $('v18-memory-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1048576)throw new Error('File exceeds 1 MB limit');const data=JSON.parse(await file.text());if(!Array.isArray(data.items)||data.items.length>500||data.items.some(x=>!x||typeof x.id!=='string'||typeof x.text!=='string'||x.text.length>5000||secretLike(x.text)))throw new Error('Invalid or unsafe memory file. No changes made.');if(!confirm('Replace V2 categorized memory with this imported JSON? Original Maya memory remains untouched.'))return;await importMemory(file);renderMemories();show('Memory V2 imported. Original Maya memory packs are unchanged.');}catch(x){err(x);}finally{e.target.value='';}};
  $('v18-legacy-import').onclick=()=>{if(confirm('Copy old short facts into Memory V2 (no deletions)?'))try{importOldShortMemory();}catch(e){err(e);}};
  $('v18-sync-ai').onclick=()=>{if(confirm('Copy eligible V2 short memories into original Maya AI memory? Your existing entries will be kept.'))try{syncMemoryToOriginal();}catch(e){err(e);}};
  $('v18-todo-add').onclick=()=>{const s=clean($('v18-todo-text').value);if(!s)return show('Enter a To-do first.',true);try{createTodo({title:s});$('v18-todo-text').value='';renderTodos();show('To-do saved on this device.');}catch(e){err(e);}};
  function when(){const s=$('v18-rem-at').value;const ms=new Date(s).getTime();if(!Number.isFinite(ms)||ms<=Date.now()+1000||ms>Date.now()+30*86400000)throw new Error('Choose a future time within 30 days.');return s;}
  $('v18-rem-save').onclick=()=>{const title=clean($('v18-rem-title').value);if(!title)return show('Enter a reminder title.',true);try{createReminder({title,datetime:when()});show('In-app reminder saved. It will NOT reliably fire while the app is closed; use Maya V9 for background reminders.');}catch(e){err(e);}};
  $('v18-event-save').onclick=()=>{const title=clean($('v18-rem-title').value);if(!title)return show('Enter an event title.',true);try{createCalendarEvent({title,datetime:when()});show('Saved to Maya internal events only. Not added to Android Calendar.');}catch(e){err(e);}};
  $('v18-timer-start').onclick=()=>{const seconds=Number($('v18-timer-secs').value);if(!Number.isInteger(seconds)||seconds<1||seconds>3600)return show('Choose 1–3600 seconds.',true);try{createTimer({title:'Maya in-app timer',seconds});show('In-app timer started. Keep Maya open for reliable timer behavior.');}catch(e){err(e);}};
  $('v18-brief').onclick=briefing;
  renderMemories();renderTodos();
  // The existing V8/V9 features remain the main native/reminder implementation.
  window.MayaV18={ version:'V18 integration', memoryCount:()=>loadMemory().items.length, todos:()=>listTodos(), listToday, buildDailyBriefing, features:MayaFeatures, androidBridge:AndroidBridge, refresh:()=>{renderMemories();renderTodos();} };
  show('Memory V2 + Productivity modules loaded. Original Maya memory and native services kept.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();