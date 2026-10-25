/* One-off full audit of Maya's voice command surface: every command kind from
 * both voice parsers (Life Voice + Agent Voice), Bengali and English, through
 * the real production parsers. Also exercises the enablement gate and a few
 * full dispatch flows with a fake DOM. Run: node tests/voice-system-audit.mjs */
import assert from 'node:assert';
import {readFileSync} from 'node:fs';

let passed=0,failed=0;
const ok=(name,cond)=>{if(cond)passed++;else{failed++;console.log('FAIL:',name);}};

/* --- fake browser environment (same technique as tests/app-launcher.test.mjs) --- */
const registry=Object.create(null);
const newFakeEl=id=>{const el={id:'',className:'',style:{cssText:''},hidden:false,checked:false,onclick:null,append(...a){},click(){},addEventListener(){},setAttribute(){},replaceChildren(){}};Object.defineProperty(el,'textContent',{get(){return el._t||'';},set(v){el._t=String(v);}});Object.defineProperty(el,'value',{get(){return el._v||'';},set(v){el._v=String(v);}});if(id)el.id=id;return el;};
globalThis.window={dispatchEvent(){}};
globalThis.document={getElementById:id=>registry[id]||null,querySelector:()=>null,addEventListener(){},readyState:'complete',body:newFakeEl(null)};
globalThis.localStorage={getItem(){return 'true';},setItem(){},removeItem(){}};
globalThis.Event=class{};

/* life-voice.js with its imports stubbed; app-launcher replaced by a data URL later */
const raw=readFileSync(new URL('../maya-features/app-launcher.js',import.meta.url),'utf8');
const launcherUrl='data:text/javascript;base64,'+Buffer.from(raw+'\n// audit instance').toString('base64');
const lifeSource=readFileSync(new URL('../maya-features/life-voice.js',import.meta.url),'utf8')
 .replace(/^import \{addRecord,loadData,searchNotes,weekly\} from '\.\/life-suite\.js';/m,"const addRecord=()=>{},loadData=()=>({diary:[]}),searchNotes=()=>[],weekly=()=>({diary:0,flashcards:0,focusMinutes:0,spent:{}});")
 .replace(/^import \{parseHubCommand,executeHubCommand\} from '\.\/smart-hub\.js';/m,"const parseHubCommand=()=>null;const executeHubCommand=async()=>'';")
 .replace(/^import \{parseOpenAppCommand,openNamedApp,openPlayStoreForApp\} from '\.\/app-launcher\.js';/m,"import {parseOpenAppCommand,openNamedApp,openPlayStoreForApp} from '"+launcherUrl+"';");
const life=await import('data:text/javascript;base64,'+Buffer.from(lifeSource).toString('base64'));
const agent=await import(new URL('../maya-features/agent-voice.js',import.meta.url));

/* --- 1. every Life Voice command kind, Bengali + English --- */
const lifeCases=[
 ['battery bn','মায়া, আমার ব্যাটারি কত',k=>k.kind==='battery'],
 ['battery en','Maya, battery status',k=>k.kind==='battery'],
 ['weekly bn','মায়া, সপ্তাহের হিসাব বলো',k=>k.kind==='weekly'],
 ['weekly en','Maya, weekly summary',k=>k.kind==='weekly'],
 ['stop focus bn','মায়া, ফোকাস বন্ধ করো',k=>k.kind==='stop'],
 ['stop focus en','Maya, stop focus',k=>k.kind==='stop'],
 ['open suite bn','মায়া, লাইফ সুইট খোলো',k=>k.kind==='open'],
 ['open suite en','Maya, open life suite',k=>k.kind==='open'],
 ['agent open bn','মায়া, এজেন্ট খোলো',k=>k.kind==='agentOpen'],
 ['agent open en','Maya, open agent mode',k=>k.kind==='agentOpen'],
 ['diary bn','মায়া, আমার ডায়েরিতে লিখো আজ ভালো আছি',k=>k.kind==='diary'&&k.body==='আজ ভালো আছি'],
 ['diary en','Maya, write to my diary: good day',k=>k.kind==='diary'&&k.body==='good day'],
 ['expense bn','মায়া, আজ ২০ দিরহাম খরচ করেছি',k=>k.kind==='expense'&&k.amount===20&&k.currency==='AED'],
 ['expense en','Maya, log expense of 20 aed for lunch',k=>k.kind==='expense'&&k.amount===20&&k.note==='lunch'],
 ['focus bn','মায়া, ২৫ মিনিট ফোকাস চালু করো',k=>k.kind==='focus'&&k.minutes===25],
 ['focus en','Maya, start focus for 25 minutes',k=>k.kind==='focus'&&k.minutes===25],
 ['note bn','মায়া, নোট লিখো বাজারের তালিকা',k=>k.kind==='note'&&k.body==='বাজারের তালিকা'],
 ['note en','Maya, save a note: buy milk',k=>k.kind==='note'&&k.body==='buy milk'],
 ['search notes bn','মায়া, আমার নোট খুঁজে দাও বাজার',k=>k.kind==='search'&&k.query==='বাজার'],
 ['search notes en','Maya, find my notes for market',k=>k.kind==='search'&&k.query==='market'],
 ['diary list bn','মায়া, আমার ডায়েরি দেখাও',k=>k.kind==='diaryList'],
 ['diary list en','Maya, show my diary',k=>k.kind==='diaryList'],
];
for(const [name,text,check] of lifeCases)ok('life '+name,check(life.parseLifeVoice(text)||{}));

/* --- 2. app-launch commands through parseLifeVoice --- */
ok('app open en',life.parseLifeVoice('Maya, open WhatsApp')?.kind==='appLaunch');
ok('app open bn verb',life.parseLifeVoice('মায়া, ইমো খোলো')?.kind==='appLaunch');
ok('app open bn start',life.parseLifeVoice('মায়া, ফেসবুক চালু করো')?.kind==='appLaunch');
ok('app open en launch',life.parseLifeVoice('Maya, launch YouTube')?.kind==='appLaunch');

/* --- 3. every Agent Voice command kind, Bengali + English --- */
const agentCases=[
 ['cancel en','Maya, cancel the agent',k=>k.kind==='cancel'],
 ['cancel bn','মায়া, এজেন্ট বন্ধ করো',k=>k.kind==='cancel'],
 ['dashboard en','Maya, show task history',k=>k.kind==='dashboard'],
 ['dashboard bn','মায়া, টাস্ক স্ট্যাটাস দেখাও',k=>k.kind==='dashboard'],
 ['run plan en','Maya, run my plan',k=>k.kind==='runPlan'],
 ['run plan bn','মায়া, প্ল্যান চালাও',k=>k.kind==='runPlan'],
 ['file en','Maya, analyze my pdf',k=>k.kind==='file'],
 ['file bn','মায়া, আমার পিডিএফ পড়ো',k=>k.kind==='file'],
 ['research en','Maya, research electric cars',k=>k.kind==='research'&&k.topic==='electric cars'],
 ['research bn','মায়া, ইলেকট্রিক গাড়ি নিয়ে রিসার্চ করো',k=>k.kind==='research'],
 ['plan en','Maya, make a plan for Dubai trip',k=>k.kind==='plan'&&k.goal==='Dubai trip'],
 ['plan bn','মায়া, দুবাই নিয়ে প্ল্যান করো',k=>k.kind==='plan'],
 ['auto plan en','Maya, do research on cheap flights',k=>k.kind==='autoPlan'],
 ['auto plan bn','মায়া, আমার হোমওয়ার্ক কাজটা করে দাও',k=>k.kind==='autoPlan'],
 ['browser en','Maya, search google for weather',k=>k.kind==='browser'&&k.query==='weather'],
 ['browser bn','মায়া, গুগলে আবহাওয়া খুঁজে দাও',k=>k.kind==='browser'],
 ['url en','Maya, open the website https://example.com',k=>k.kind==='url'],
 ['phone en','Maya, open the app WhatsApp',k=>k.kind==='phone'&&k.name==='WhatsApp'],
 ['phone bn','মায়া, ফোনে হোয়াটসঅ্যাপ খোলো',k=>k.kind==='phone'&&k.name==='হোয়াটসঅ্যাপ'],
 ['code en','Maya, review the code',k=>k.kind==='code'],
 ['code bn','মায়া, কোডটা চেক করো',k=>k.kind==='code'],
];
for(const [name,text,check] of agentCases)ok('agent '+name,check(agent.parseAgentVoice(text)||{}));

/* --- 4. prefix + safety rules --- */
ok('no maya prefix rejected',life.parseLifeVoice('open WhatsApp')===null&&agent.parseAgentVoice('open WhatsApp')===null);
ok('hey maya accepted',life.parseLifeVoice('hey Maya, open WhatsApp')?.kind==='appLaunch');
ok('too long rejected',life.parseLifeVoice('মায়া, '+('a'.repeat(1000)))===null);
ok('secret diary rejected at dispatch',/sensitive|invalid/.test(await runWithConfirm('diary','মায়া, আমার ডায়েরিতে লিখো my password is 1234',true)));

/* --- 5. enablement gate + full dispatch flows (fake DOM) --- */
async function runWithConfirm(kind,text,confirm){
 const prompt=registry['lifeVoicePrompt']||newFakeEl('lifeVoicePrompt');
 registry['lifeVoicePrompt']=prompt;registry['lifeVoicePromptText']=newFakeEl('lifeVoicePromptText');
 registry['lifeVoiceYes']=newFakeEl('lifeVoiceYes');registry['lifeVoiceNo']=newFakeEl('lifeVoiceNo');
 const status=newFakeEl('lifeVoiceStatus');registry['lifeVoiceStatus']=status;
 let stored='true';
 globalThis.localStorage={getItem:()=>stored,setItem:(k,v)=>{stored=v;},removeItem(){}};
 // wire confirm/cancel now so ask() resolves
 let resolve;const p=new Promise(r=>resolve=r);
 registry['lifeVoiceYes'].onclick=()=>{prompt.hidden=true;resolve(true);};
 registry['lifeVoiceNo'].onclick=()=>{prompt.hidden=true;resolve(false);};
 const command=life.parseLifeVoice(text);
 if(!command)return '(unparsed)';
 const run=life.runLifeVoice(command); // ask() registers handlers synchronously
 if(['diary','expense','note','focus'].includes(command.kind)){prompt.hidden=false;registry['lifeVoiceYes'].onclick();await run;}
 else await run;
 return status.textContent;
}
globalThis.window.MayaBridge={batteryStatus:()=>JSON.stringify({percent:88,charging:true})};
ok('battery via native bridge',/Battery 88%/.test(await runWithConfirm('battery','মায়া, আমার ব্যাটারি কত')));
ok('battery dispatch en',/Battery 88%/.test(await runWithConfirm('battery','Maya, battery status')));
ok('diary confirm saves',/Diary saved/.test(await runWithConfirm('diary','মায়া, আমার ডায়েরিতে লিখো আজ ভালো আছি')));
ok('weekly dispatch',/Past 7 days/.test(await runWithConfirm('weekly','মায়া, সপ্তাহের হিসাব বলো')));
ok('notes search empty',/No saved notes/.test(await runWithConfirm('search','মায়া, নোট খুঁজে দাও বাজার')));
ok('diary list empty',/diary is empty|Diary/.test(await runWithConfirm('diaryList','মায়া, আমার ডায়েরি দেখাও')));
let stored='false';
globalThis.localStorage={getItem:()=>stored,setItem:(k,v)=>{stored=v;},removeItem(){}};
ok('gate blocks when disabled',/Enable Unified Life Voice/.test(await life.runLifeVoice(life.parseLifeVoice('Maya, battery status'))));
stored='true';

console.log(`Voice system audit: ${passed} passed, ${failed} failed.`);
process.exit(failed?1:0);
