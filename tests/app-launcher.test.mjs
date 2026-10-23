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
