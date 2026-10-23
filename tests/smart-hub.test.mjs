import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../maya-features/smart-hub.js',import.meta.url),'utf8');
const state={diary:[{id:'d',body:'Today went well',at:'2026-10-24T06:00:00.000Z'}],expense:[],bookmark:[],knowledge:[],flashcard:[],focus:[],place:[]};
const todos=[],memories=[{text:'Likes mangoes',category:'preference'}];
const data={};
globalThis.localStorage={getItem(k){return data[k]??null;},setItem(k,v){data[k]=v;},removeItem(k){delete data[k];}};
globalThis.__smartTest={todos,state,memories};
const stubs=String.raw`
const {todos,state,memories}=globalThis.__smartTest;
const createTodo=({title,priority='normal'})=>{const x={id:'todo-'+(todos.length+1),title,priority,done:false};todos.push(x);return x;};
const listTodos=()=>todos;
const completeTodo=id=>{const x=todos.find(t=>t.id===id);if(x){x.done=true;return true;}return false;};
const deleteTodo=id=>{const index=todos.findIndex(x=>x.id===id);if(index<0)return false;todos.splice(index,1);return true;};
const loadMemory=()=>({items:memories});
const searchMemory=q=>memories.filter(m=>(m.text+' '+m.category).toLowerCase().includes(q.toLowerCase()));
const loadData=()=>state;
const weekly=()=>({diary:1,flashcards:0,focusMinutes:25,spent:{AED:12}});
const buildDailyBriefing=()=> 'Today: two tasks and no native weather.';
`;
const src=stubs+raw.replace(/^import [^\n]+\n/gm,'');
const api=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
assert.equal(api.validateRoutines({version:1,routines:[]}),true);
assert.equal(api.validateRoutines({version:2,routines:[]}),false);
assert.equal(api.validateRoutines({version:1,routines:[{id:'x',title:'safe',steps:['madeup']}]}),false);
assert.equal(api.validateRoutines({version:1,routines:Array.from({length:26},(_,i)=>({id:''+i,title:'name',steps:['tasks']}))}),false);
assert.throws(()=>api.createRoutine('','tasks'));
assert.throws(()=>api.createRoutine('My passcode 1234',['tasks']));
assert.throws(()=>api.createRoutine('unsafe',['torch']));
const routine=api.createRoutine('My morning',['briefing','tasks']);
assert.equal(routine.steps.length,2);
assert.equal(api.getRoutine(routine.id).title,'My morning');
assert.equal(api.getRoutine('study').steps.includes('focus'),true);
assert.equal(api.loadRoutines().routines.length,1);
assert.equal(api.removeRoutine(routine.id),true);
assert.equal(api.removeRoutine(routine.id),false);
const yes=[
 ['কাজ যোগ করো বাজার থেকে চাল আনতে','todoAdd'],
 ['কাজ লিখে রাখো পানি কিনতে','todoAdd'],
 ['add todo buy rice','todoAdd'],
 ['create task call home','todoAdd'],
 ['আমার কাজের তালিকা দেখাও','todoList'],
 ['show my tasks','todoList'],
 ['মেমোরি খুঁজে দাও আম','memorySearch'],
 ['find my memories for mango','memorySearch'],
 ['আজকের ব্রিফিং দাও','daily'],
 ['show my daily briefing','daily'],
 ['ফোন চেক করো','diagnostics'],
 ['check my permissions','diagnostics'],
 ['প্রাইভেসি চেক করো','privacy'],
 ['privacy summary','privacy'],
 ['মর্নিং রুটিন চালু করো','routine'],
 ['ফোকাস রুটিন শুরু করো','routine'],
 ['run morning routine','routine'],
 ['start study routine','routine'],
 ['evening routine','none'] // noncommand intentionally
];
for(const [phrase,action] of yes)assert.equal(api.parseHubCommand(phrase)?.action||'none',action,phrase);
for(const phrase of ['', 'send whatsapp', 'delete my memory', 'make a payment', 'start all apps', 'call someone', 'my password', 'turn on flashlight'])assert.equal(api.parseHubCommand(phrase),null,phrase);
assert.equal(api.parseHubCommand('run morning routine').id,'morning');
assert.equal(api.parseHubCommand('start focus routine').id,'study');
assert.equal(await api.executeHubCommand({kind:'hub',action:'todoAdd',text:'buy mangoes'},async()=>false),'To-do creation cancelled.');
assert.equal(todos.length,0);
assert.ok((await api.executeHubCommand({kind:'hub',action:'todoAdd',text:'buy mangoes'},async()=>true)).includes('To-do added'));
assert.equal(todos.length,1);
assert.ok((await api.executeHubCommand({kind:'hub',action:'todoList'})).includes('buy mangoes'));
assert.ok((await api.executeHubCommand({kind:'hub',action:'memorySearch',query:'mango'})).includes('Likes mangoes'));
assert.ok((await api.executeHubCommand({kind:'hub',action:'daily'})).includes('Today:'));
assert.ok((await api.executeHubCommand({kind:'hub',action:'privacy'})).includes('NOT encrypted'));
assert.ok((await api.executeHubCommand({kind:'hub',action:'diagnostics'})).includes('microphoneAPI'));
assert.ok((await api.executeHubCommand({kind:'hub',action:'routine',id:'morning'})).includes('Pending To-dos'));
assert.ok((await api.runRoutine(api.getRoutine('study'),async()=>false)).includes('Focus skipped'));
let clicks=0;
globalThis.document={getElementById(id){return id==='lifeMinutes'?{value:''}:id==='lifeStartFocus'?{click(){clicks++;}}:id==='lifeFocusOut'?{textContent:'25 minute session running.'}:null;}};
assert.ok((await api.runRoutine(api.getRoutine('study'),async()=>true)).includes('started'));
assert.equal(clicks,1);
const voice=readFileSync(new URL('../maya-features/life-voice.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
assert.ok(voice.includes("parseHubCommand(t)"),'Maya Life Voice is not connected to the Smart Hub parser');
assert.ok(voice.includes("parseOpenAppCommand(t)"),'Android App Launcher parser must remain connected after Smart Hub');
assert.ok(voice.includes("executeHubCommand(command,ask)"),'Smart Hub actions not connected to real V25 confirmation');
assert.ok(loader.includes("import './smart-hub.js'"),'Smart Hub UI not loaded by Maya');
console.log('Maya Smart Hub: routine safety, parsing, permission diagnostics, shared To-dos, voice integration tests passed (not phone hardware tests).');
