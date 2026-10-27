import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../maya-features/app-launcher.js',import.meta.url),'utf8');
const baseHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!baseHtml.includes('Unknown app. Known apps:'),'Legacy Gemini OPEN_APP must not reject names outside social app list');
assert.ok(baseHtml.includes("kind:'installed-app'"),'Legacy Gemini OPEN_APP native route missing');
assert.ok(baseHtml.includes('window.MayaInstalledApps.openNamedApp(plan.name)'),'Legacy Gemini OPEN_APP must use installed Android launcher');
assert.ok(raw.includes('window.MayaInstalledApps=Object.freeze({openNamedApp})'),'Validated launcher bridge missing');
const legacyLogic=baseHtml.match(/\/\/#LOGIC-START([\s\S]*?)\/\/#LOGIC-END/);
assert.ok(legacyLogic,'Maya original pure phone action logic was not found');
const legacy=new Function(legacyLogic[1]+'\nreturn {validateAction,planAction};')();
for(const name of ['Binance','CapCut','Moto Camera','My Fitness App','ক্যালকুলেটর']){
 const validation=legacy.validateAction({action:'OPEN_APP',app:name},Date.now(),new Set());
 assert.equal(validation.ok,true,'Gemini should accept installed app display name: '+name);
 assert.deepEqual(legacy.planAction(validation.action,validation.p,Date.now()),{kind:'installed-app',name});
}
for(const unsafe of ['https://bad.example','com.example.app','intent://something']){
 assert.equal(legacy.validateAction({action:'OPEN_APP',app:unsafe},Date.now(),new Set()).ok,false,unsafe);
}


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
 ['ওপেন করো ইনস্টাগ্রাম','ইনস্টাগ্রাম'],
 ['ক্যামেরা চালাও','ক্যামেরা'],
 ['গুগল প্লে স্টোর খোলো','গুগল প্লে স্টোর'],
];
for(const [phrase,name] of parseCases)assert.equal(m.parseOpenAppCommand(phrase)?.name,name,phrase);
for(const [voice,name] of [
 ['install WhatsApp','WhatsApp'],['download Instagram app','Instagram'],
 ['WhatsApp ইনস্টল করো','WhatsApp'],['ইমো ইনস্টল করে দাও','ইমো'],
 ['গুগল ম্যাপস ডাউনলোড করো','গুগল ম্যাপস']
])assert.deepEqual(m.parseOpenAppCommand(voice),{kind:'appInstall',name},voice);
for(const unsafe of ['install','install    ','install https://bad.example','install x','install '+('x'.repeat(101))])
 assert.equal(m.parseOpenAppCommand(unsafe),null,unsafe);
assert.equal(m.playStoreUrlForApp('WhatsApp'),'https://play.google.com/store/apps/details?id=com.whatsapp');
assert.equal(m.playStoreUrlForApp('হোয়াটসঅ্যাপ বিজনেস'),'https://play.google.com/store/apps/details?id=com.whatsapp.w4b');
assert.equal(m.playStoreUrlForApp('ইমো'),'https://play.google.com/store/apps/details?id=com.imo.android.imoim');
assert.equal(m.playStoreUrlForApp('Unlisted app name'),'https://play.google.com/store/search?q=Unlisted%20app%20name&c=apps');
assert.equal(m.playStoreUrlForApp('https://wrong.example'),null);
for(const phrase of ['','whatsapp','tell me about whatsapp','send WhatsApp message','open','open   ','open life','Maya my birthday','হোয়াটসঅ্যাপ মেসেজ পাঠাও','call 999','read notifications']) {
 if(phrase==='open life')continue; // valid ambiguous app phrase, native must decide
 assert.equal(m.parseOpenAppCommand(phrase),null,phrase);
}
for(const [raw,canonical] of Object.entries({'ইমো':'imo','হোয়াটসঅ্যাপ':'whatsapp','হোয়াটসঅ্যাপ বিজনেস':'whatsapp business','মেসেঞ্জার':'messenger','ইনস্টাগ্রাম':'instagram','প্লে স্টোর':'play store','গুগল ম্যাপস':'maps','ক্যামেরা':'camera','ফেসবুকটা':'facebook','ইন্সটাগ্রাম':'instagram','ফেসবুক মেসেঞ্জার':'messenger','গুগল প্লে স্টোর':'play store'}))assert.equal(m.targetName(raw),canonical,raw);
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
const deviceApps=[
 {label:'Moto Camera',packageName:'com.motorola.camera3',activityName:'com.motorola.camera3.Main'},
 {label:'Google Play Store',packageName:'com.android.vending',activityName:'com.android.vending.AssetBrowserActivity'},
 {label:'Instagram',packageName:'com.instagram.android',activityName:'com.instagram.android.Main'},
 {label:'Facebook',packageName:'com.facebook.katana',activityName:'com.facebook.katana.Main'},
 {label:'Messenger',packageName:'com.facebook.orca',activityName:'com.facebook.orca.Main'},
 {label:'My Fitness App',packageName:'com.example.fitness',activityName:'com.example.fitness.Main'}
];
for(const [spoken,pkg] of [
 ['ক্যামেরা','com.motorola.camera3'],['প্লে স্টোর','com.android.vending'],
 ['ইন্সটাগ্রাম','com.instagram.android'],['ফেসবুক','com.facebook.katana'],
 ['ফেসবুক মেসেঞ্জার','com.facebook.orca'],
 ['my fitness','com.example.fitness']])
 assert.equal(m.rankedMatches(spoken,deviceApps)[0]?.packageName,pkg,spoken);
assert.equal(m.rankedMatches('whatever',[{label:'Whatever',packageName:null}]).length,0);
assert.equal(m.normalizeName('  Google—Maps  '),'google maps');
const bridge=readFileSync(new URL('../maya-features/life-voice.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
assert.ok(bridge.includes('parseOpenAppCommand(t)'),'voice command app parser missing');
assert.ok(bridge.includes("case 'appLaunch'"),'app launcher case missing');
assert.ok(bridge.includes("case 'appInstall'"),'Play Store voice case missing');
assert.ok(bridge.includes('openPlayStoreForApp(command.name)'),'Install voice must use store lookup');
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
const storeCalls=[];const launchCalls=[];const madeButtons=[];const registry=Object.create(null);let launchStatus={status:'launched'};let notifyPermissionStatus={status:'requested'};
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
 launchListedApp:(pkg,act)=>{launchCalls.push([pkg,act]);return JSON.stringify({...launchStatus});},
 requestLaunchNotifications:()=>JSON.stringify({...notifyPermissionStatus}),
 control:(action,args)=>{
  storeCalls.push({action,args:JSON.parse(args)});
  return JSON.stringify({status:'opened',message:'Opened.'});
 }
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
 .replace(/^import \{parseOpenAppCommand,openNamedApp,openPlayStoreForApp\} from '\.\/app-launcher\.js';/m,"import {parseOpenAppCommand,openNamedApp,openPlayStoreForApp} from '"+launcherUrl+"';");
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
// "Install" opens only the Store listing/search. It must not silently install an app.
assert.deepEqual(lifeApi.parseLifeVoice('Maya install WhatsApp'),{kind:'appInstall',name:'WhatsApp'});
assert.deepEqual(lifeApi.parseLifeVoice('মায়া ইমো ইনস্টল করো'),{kind:'appInstall',name:'ইমো'});
assert.ok((await lifeApi.runLifeVoice(lifeApi.parseLifeVoice('Maya install WhatsApp'))).includes('tap Install yourself'));
assert.deepEqual(storeCalls.at(-1),{
 action:'OPEN_URL',args:{url:'https://play.google.com/store/apps/details?id=com.whatsapp',pkg:'com.android.vending'}
});
assert.ok((await lifeApi.runLifeVoice(lifeApi.parseLifeVoice('Maya install Super New App'))).includes('search requested'));
assert.deepEqual(storeCalls.at(-1),{
 action:'OPEN_URL',args:{url:'https://play.google.com/store/search?q=Super%20New&c=apps',pkg:'com.android.vending'}
});
assert.equal(launchCalls.length,5,'Store lookup must never auto-launch an installed app');
/* ---- Native background-launch outcomes: a posted notification is pending user action, not failure. ---- */
const beforeBg=launchCalls.length;
launchStatus={status:'background'};
assert.equal(await m2.openNamedApp('WhatsApp'),'ব্যাকগ্রাউন্ড লঞ্চ: "WhatsApp" খুলতে নোটিফিকেশনে ট্যাপ করো।');
assert.deepEqual(launchCalls[beforeBg],['com.whatsapp','com.whatsapp.Main']);
// The Life Voice route reports the same deferred outcome to the user.
assert.equal(await lifeApi.runLifeVoice(lifeApi.parseLifeVoice('Maya open WhatsApp')),'ব্যাকগ্রাউন্ড লঞ্চ: "WhatsApp" খুলতে নোটিফিকেশনে ট্যাপ করো।');
assert.deepEqual(launchCalls[beforeBg+1],['com.whatsapp','com.whatsapp.Main']);
const agentBg=agentSuite.runAgentVoiceCommand(agentVoice.parseAgentVoice('Maya open app messnger'));
await settle();
assert.equal(launchCalls.length,beforeBg+2); // chooser shown, nothing new launched yet
tapSuggestion('Messenger');
assert.equal(await agentBg,'ব্যাকগ্রাউন্ড লঞ্চ: "Messenger" খুলতে নোটিফিকেশনে ট্যাপ করো।');
assert.deepEqual(launchCalls[beforeBg+2],['com.facebook.orca','com.facebook.orca.Main']);
launchStatus={status:'notification_blocked'};
assert.ok((await m2.openNamedApp('WhatsApp')).startsWith('App not opened: '));
// Blocked notifications stay failures on both voice routes — never reported as success.
assert.ok((await lifeApi.runLifeVoice(lifeApi.parseLifeVoice('Maya open WhatsApp'))).startsWith('App not opened: '));
const agentBlocked=agentSuite.runAgentVoiceCommand(agentVoice.parseAgentVoice('Maya open app WhatsApp'));
await settle();
assert.ok((await agentBlocked).startsWith('Phone App Launcher: App not opened: '));
launchStatus={status:'launched'};
// Settings control for the notification permission exists and reports the request.
assert.ok(registry['mayaAppBgNotify'],'background notification settings button missing');
registry['mayaAppBgNotify'].onclick();
assert.ok(registry['mayaAppStatus'].textContent.includes('Allow'),'permission request status missing');
notifyPermissionStatus={status:'blocked'};
registry['mayaAppBgNotify'].onclick();
assert.ok(registry['mayaAppStatus'].textContent.includes('Notifications'),'blocked notification status missing');
// A unique non-exact visible app name (e.g. Google Maps) now opens by voice
// without a second on-screen chooser tap.
const uniqueBefore=launchCalls.length;
assert.equal(await m2.openNamedApp('ম্যাপস'),'Android launch requested: Google Maps.');
assert.deepEqual(launchCalls[uniqueBefore],['com.google.android.apps.maps','x']);
assert.ok(registry['mayaAppVoiceStatus'],'background voice diagnostic button missing');
registry['mayaAppVoiceStatus'].onclick();
assert.ok(registry['mayaAppStatus'].textContent.includes('updated Maya Android APK'));
console.log('Maya App Launcher fuzzy suggestions: voice-misspelling suggestions are tap-required and never auto-launch.');
console.log('Voice routes verified: Life Voice and Agent phone commands dispatch through the real launcher with gates intact.');
console.log('Background launches: deferred to a tap-to-open notification; blocked notifications stay failures.');
