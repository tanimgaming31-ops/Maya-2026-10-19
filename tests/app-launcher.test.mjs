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
assert.ok(m.suggestAppMatches('messnger',apps).length<=3); // template's 3-candidate cap
const agentSuiteSrc=readFileSync(new URL('../maya-features/agent-suite.js',import.meta.url),'utf8');
assert.ok(agentSuiteSrc.includes('openNamedApp'),'agent phone voice route must keep calling openNamedApp');

/* ---- Behavioral: a fuzzy suggestion only opens via the tap-required chooser; nothing auto-launches. ---- */
const launchCalls=[];const madeButtons=[];const fakeElements=Object.create(null);
const makeEl=id=>({id,hidden:true,style:{},onclick:null,textContent:'',children:[],replaceChildren(){this.children=[];},append(...cs){this.children.push(...cs);},addEventListener(){},removeEventListener(){}});
globalThis.window={MayaBridge:{
 listLaunchableApps:()=>JSON.stringify({status:'ok',apps}),
 launchListedApp:(pkg,act)=>{launchCalls.push([pkg,act]);return JSON.stringify({status:'launched'});}
}};
globalThis.document={
 readyState:'complete',hidden:false,
 getElementById:id=>fakeElements[id]||(fakeElements[id]=makeEl(id)),
 querySelector:()=>null,
 createElement:()=>{const b={className:'',style:{},onclick:null,textContent:''};madeButtons.push(b);return b;},
 addEventListener(){},removeEventListener(){}
};
const m2=await import('data:text/javascript;base64,'+Buffer.from(raw+'\n// behavioral test instance').toString('base64'));
const openPromise=m2.openNamedApp('messnger');
await new Promise(r=>setTimeout(r,20));
assert.equal(launchCalls.length,0); // no native launch before the user taps
assert.ok(fakeElements['mayaAppChoiceCaption'].textContent.includes('Did you mean'),'suggestion caption missing');
const suggestionButtons=madeButtons.filter(b=>b.textContent.startsWith('Messenger ('));
assert.equal(suggestionButtons.length,1,'Messenger suggestion button missing');
suggestionButtons[0].onclick(); // user taps the suggestion
assert.equal(await openPromise,'Android launch requested: Messenger.');
assert.deepEqual(launchCalls,[['com.facebook.orca','com.facebook.orca.Main']]);
const cancelPromise=m2.openNamedApp('messnger');
await new Promise(r=>setTimeout(r,20));
assert.equal(launchCalls.length,1); // still exactly one launch
fakeElements['mayaAppCancel'].onclick(); // user cancels
assert.equal(await cancelPromise,'App selection cancelled.');
assert.equal(launchCalls.length,1); // cancelling launches nothing
console.log('Maya App Launcher fuzzy suggestions: voice-misspelling suggestions are tap-required and never auto-launch.');
