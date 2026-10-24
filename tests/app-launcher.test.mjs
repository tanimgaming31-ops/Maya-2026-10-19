import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../maya-features/app-launcher.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));
const parseCases=[
 ['open WhatsApp','WhatsApp'],
 ['open the WhatsApp app','WhatsApp'],
 ['launch Instagram','Instagram'],
 ['start Telegram','Telegram'],
 ['open app Snapchat','Snapchat'],
 ['ইমো খোলো','ইমো'],
 ['মেসেঞ্জার ওপেন করো','মেসেঞ্জার'],
 ['হোয়াটসঅ্যাপ খুলে দাও','হোয়াটসঅ্যাপ'],
 ['ইনস্টাগ্রাম চালু করো','ইনস্টাগ্রাম'],
 ['ইউটিউব ওপেন করো','ইউটিউব'],
 ['ফেসবুকটা খোলো','ফেসবুকটা'],
 ['গুগল ম্যাপস খুলে দাও','গুগল ম্যাপস'],
];
for(const [phrase,name] of parseCases)assert.equal(m.parseOpenAppCommand(phrase)?.name,name,phrase);
for(const phrase of ['','whatsapp','tell me about whatsapp','send WhatsApp message','open','open   ','open life','Maya my birthday','হোয়াটসঅ্যাপ মেসেজ পাঠাও','call 999','read notifications']) {
 if(phrase==='open life')continue; // valid ambiguous app phrase, native must decide
 assert.equal(m.parseOpenAppCommand(phrase),null,phrase);
}
for(const [raw,canonical] of Object.entries({'ইমো':'imo','হোয়াটসঅ্যাপ':'whatsapp','হোয়াটসঅ্যাপ বিজনেস':'whatsapp business','মেসেঞ্জার':'messenger','ইনস্টাগ্রাম':'instagram','প্লে স্টোর':'play store','গুগল ম্যাপস':'maps','ক্যামেরা':'camera','ফেসবুকটা':'facebook'}))assert.equal(m.targetName(raw),canonical,raw);
const apps=[
 {label:'WhatsApp',packageName:'com.whatsapp',activityName:'com.whatsapp.Main'},
 {label:'WhatsApp Business',packageName:'com.whatsapp.w4b',activityName:'com.whatsapp.w4b.Main'},
 {label:'Messenger',packageName:'com.facebook.orca',activityName:'com.facebook.orca.Main'},
 {label:'Instagram',packageName:'com.instagram.android',activityName:'com.instagram.android.Main'},
 {label:'Google Maps',packageName:'com.google.android.apps.maps',activityName:'x'},
 {label:'imo',packageName:'com.imo.android.imoim',activityName:'com.imo.android.Main'},
 {label:'Camera',packageName:'com.vendor.camera',activityName:'com.vendor.Camera'},
 {label:'Camera',packageName:'com.other.camera',activityName:'com.other.Camera'},
];
assert.equal(m.rankedMatches('ইমো',apps)[0].label,'imo');
assert.equal(m.rankedMatches('মেসেঞ্জার',apps)[0].label,'Messenger');
assert.equal(m.rankedMatches('WhatsApp',apps)[0].packageName,'com.whatsapp');
assert.ok(m.rankedMatches('WhatsApp',apps)[0].score>m.rankedMatches('WhatsApp',apps)[1].score);
assert.equal(m.rankedMatches('WhatsApp Business',apps).length,1);
assert.equal(m.rankedMatches('ম্যাপস',apps)[0].label,'Google Maps');
assert.equal(m.rankedMatches('ক্যামেরা',apps).length,2); // user must choose duplicate
assert.equal(m.rankedMatches('com.whatsapp',apps).length,0); // no package guessing
assert.equal(m.rankedMatches('no such app',apps).length,0);
assert.equal(m.rankedMatches('whatever',[{label:'Whatever',packageName:null}]).length,0);
assert.equal(m.normalizeName('  Google—Maps  '),'google maps');
const bridge=readFileSync(new URL('../maya-features/life-voice.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
assert.ok(bridge.includes('parseOpenAppCommand(t)'),'voice command app parser missing');
assert.ok(bridge.includes("case 'appLaunch'"),'app launcher case missing');
assert.ok(loader.includes("import './app-launcher.js'"),'launcher module missing from original Maya');
console.log('Maya App Launcher: parser, exact-label, alias, ambiguity, security and voice bridge checks passed. Requires Android device tests.');

/* ---- Fuzzy suggestions (template AppResolver integration): tap-required, never auto-launch. ---- */
assert.equal(m.rankedMatches('messnger',apps).length,0); // internal typo: no exact match
assert.deepEqual(m.suggestAppMatches('messnger',apps).map(a=>a.label),['Messenger']);
assert.equal(m.rankedMatches('whatsap',apps).length,0);
assert.deepEqual(m.suggestAppMatches('whatsap',apps).map(a=>a.label),['WhatsApp']); // not WhatsApp Business
assert.deepEqual(m.suggestAppMatches('com.whatsapp',apps),[]); // package-style query: never guessed
assert.deepEqual(m.suggestAppMatches('com.whatsapp.w4b',apps),[]);
assert.deepEqual(m.suggestAppMatches('zzqqxxnope',apps),[]); // far-off name: no suggestions
assert.deepEqual(m.suggestAppMatches('ab',apps),[]); // too short
assert.deepEqual(m.suggestAppMatches('WhatsApp',apps),[]); // exact matches stay in rankedMatches
assert.deepEqual(m.suggestAppMatches('messnger',null),[]);
const manyApps=[
 {label:'Camera',packageName:'a.c1',activityName:'a'},
 {label:'CameraX',packageName:'a.c2',activityName:'a'},
 {label:'Cameras',packageName:'a.c3',activityName:'a'},
 {label:'Came',packageName:'a.c4',activityName:'a'},
 {label:'Zoom',packageName:'a.z',activityName:'a'}
];
assert.equal(m.suggestAppMatches('camer',manyApps).length,3); // 4 qualify, template's 3-candidate cap
const agentSuiteSrc=readFileSync(new URL('../maya-features/agent-suite.js',import.meta.url),'utf8');
assert.ok(agentSuiteSrc.includes("case 'phone'"),'agent phone dispatch missing');
assert.ok(agentSuiteSrc.includes('openNamedApp(name)'),'agent phone route must call openNamedApp');

/* ---- Behavioral harness: fake native bridge + minimal DOM (chooser, settings host). ---- */
const launchCalls=[];const madeButtons=[];const registry=Object.create(null);
function newFakeEl(){
 const el={hidden:true,style:{},onclick:null,value:'',textContent:'',className:'',placeholder:'',maxLength:0,checked:false,disabled:false,open:false,children:[],_html:'',_id:''};
 el.append=(...cs)=>{el.children.push(...cs);};
 el.replaceChildren=()=>{el.children=[];};
 el.addEventListener=()=>{};el.removeEventListener=()=>{};
 el.click=()=>{if(el.onclick)el.onclick();};
 el.setAttribute=()=>{};
 Object.defineProperty(el,'id',{get:()=>el._id,set(v){el._id=v;if(v)registry[v]=el;}});
 Object.defineProperty(el,'innerHTML',{get:()=>el._html,set(v){el._html=String(v);for(const x of el._html.matchAll(/id="([^"]+)"/g)){const id=x[1];if(!registry[id])registry[id]=newFakeEl();}}});
 return el;
}
let lifeEnabled=true;
globalThis.window={MayaBridge:{
 listLaunchableApps:()=>JSON.stringify({status:'ok',apps}),
 launchListedApp:(pkg,act)=>{launchCalls.push([pkg,act]);return JSON.stringify({status:'launched'});}
},dispatchEvent(){}};
globalThis.Event=class Event{constructor(t){this.type=t;}};
globalThis.localStorage={getItem:k=>k==='maya_life_voice_v25'?(lifeEnabled?'true':null):null,setItem(){},removeItem(){}};
const settingsHost=newFakeEl();
for(const id of ['mayaAppChooser','mayaAppChoices','mayaAppChoiceCaption','mayaAppCancel'])registry[id]=newFakeEl();
globalThis.document={
 readyState:'complete',hidden:false,body:settingsHost,
 getElementById:id=>registry[id]||null,
 querySelector:sel=>sel==='#setSheet .body'?settingsHost:null,
 createElement:()=>{const b=newFakeEl();madeButtons.push(b);return b;},
 createTextNode:()=>newFakeEl(),
 addEventListener(){},removeEventListener(){}
};
const m2=await import('data:text/javascript;base64,'+Buffer.from(raw+'\n// behavioral test instance').toString('base64'));
const tapSuggestion=(label)=>{
 const btn=madeButtons.filter(b=>b.textContent.startsWith(label+' (')).pop();
 assert.ok(btn,label+' suggestion button missing');
 btn.onclick();
};
const settle=()=>new Promise(r=>setTimeout(r,20));

/* Chooser flow: fuzzy suggestion never auto-launches; only a user tap opens. */
const openPromise=m2.openNamedApp('messnger');
await settle();
assert.equal(launchCalls.length,0); // no native launch before the user taps
assert.ok(registry['mayaAppChoiceCaption'].textContent.includes('বুঝিয়েছ'),'Bengali suggestion caption missing');
assert.ok(registry['mayaAppChoiceCaption'].textContent.includes('messnger'),'query not echoed in caption');
tapSuggestion('Messenger');
assert.equal(await openPromise,'Android launch requested: Messenger.');
assert.deepEqual(launchCalls,[['com.facebook.orca','com.facebook.orca.Main']]);
const cancelPromise=m2.openNamedApp('messnger');
await settle();
assert.equal(launchCalls.length,1); // still exactly one launch
registry['mayaAppCancel'].onclick(); // user cancels
assert.equal(await cancelPromise,'App selection cancelled.');
assert.equal(launchCalls.length,1); // cancelling launches nothing

/* ---- Life Voice route: real life-voice.js dispatching through the real app-launcher. ---- */
const launcherUrl='data:text/javascript;base64,'+Buffer.from(raw+'\n// life route instance').toString('base64');
const lifeSource=readFileSync(new URL('../maya-features/life-voice.js',import.meta.url),'utf8')
 .replace(/^import \{addRecord,loadData,searchNotes,weekly\} from '\.\/life-suite\.js';/m,"const addRecord=()=>{},loadData=()=>({diary:[]}),searchNotes=()=>[],weekly=()=>({diary:0,flashcards:0,focusMinutes:0,spent:{}});")
 .replace(/^import \{parseHubCommand,executeHubCommand\} from '\.\/smart-hub\.js';/m,"const parseHubCommand=()=>null;const executeHubCommand=async()=>'';")
 .replace(/^import \{parseOpenAppCommand,openNamedApp\} from '\.\/app-launcher\.js';/m,"import {parseOpenAppCommand,openNamedApp} from '"+launcherUrl+"';");
const lifeApi=await import('data:text/javascript;base64,'+Buffer.from(lifeSource).toString('base64'));
assert.deepEqual(lifeApi.parseLifeVoice('Maya open messnger'),{kind:'appLaunch',name:'messnger'});
lifeEnabled=false; // enablement gate stays required for the Life Voice route
assert.equal(await lifeApi.runLifeVoice(lifeApi.parseLifeVoice('Maya open messnger')),'Enable Unified Life Voice in Settings first.');
assert.equal(launchCalls.length,1); // gate blocked, nothing launched
lifeEnabled=true;
const lifeRun=lifeApi.runLifeVoice(lifeApi.parseLifeVoice('Maya open messnger'));
await settle();
assert.equal(launchCalls.length,0+1); // chooser shown, still nothing new launched
tapSuggestion('Messenger');
assert.equal(await lifeRun,'Android launch requested: Messenger.');
assert.deepEqual(launchCalls[1],['com.facebook.orca','com.facebook.orca.Main']);
// Exact English name and Bengali alias keep their previous immediate-launch behavior.
assert.equal(await lifeApi.runLifeVoice(lifeApi.parseLifeVoice('Maya open WhatsApp')),'Android launch requested: WhatsApp.');
assert.deepEqual(launchCalls[2],['com.whatsapp','com.whatsapp.Main']);
assert.equal(await lifeApi.runLifeVoice(lifeApi.parseLifeVoice('মায়া ইমো খোলো')),'Android launch requested: imo.');
assert.deepEqual(launchCalls[3],['com.imo.android.imoim','com.imo.android.Main']);
assert.equal(launchCalls.length,4);

/* ---- Agent voice route: parseAgentVoice -> runAgentVoiceCommand('phone') -> real openNamedApp. ---- */
const agentVoice=await import(new URL('../maya-features/agent-voice.js',import.meta.url));
assert.deepEqual(agentVoice.parseAgentVoice('Maya open app messnger'),{kind:'phone',name:'messnger'});
const agentSuite=await import(new URL('../maya-features/agent-suite.js',import.meta.url));
const agentRun=agentSuite.runAgentVoiceCommand(agentVoice.parseAgentVoice('Maya open app messnger'));
await settle();
assert.equal(launchCalls.length,4); // chooser shown by the agent route too, nothing new launched
assert.equal(registry['agentApp'].value,'messnger'); // name reached the agent phone input
tapSuggestion('Messenger');
assert.equal(await agentRun,'Android launch requested: Messenger.');
assert.deepEqual(launchCalls[4],['com.facebook.orca','com.facebook.orca.Main']);
assert.equal(launchCalls.length,5);
console.log('Maya App Launcher fuzzy suggestions: voice-misspelling suggestions are tap-required and never auto-launch.');
console.log('Voice routes verified: Life Voice and Agent phone commands dispatch through the real launcher with gates intact.');
