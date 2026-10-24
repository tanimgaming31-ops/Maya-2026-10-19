import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const voice=readFileSync(new URL('../maya-features/v54-voice.js',import.meta.url),'utf8');
const parser=await import('data:text/javascript;base64,'+Buffer.from(voice).toString('base64'));
const positives=[
 ['Maya read notifications','notificationList'],
 ['মায়া, নোটিফিকেশন দেখাও','notificationList'],
 ['Maya reply to notification','notificationReplyPanel'],
 ['Maya choose folder','folderPick'],
 ['Maya list files','folderList'],
 ['Maya save file report.txt with hello there','fileSave'],
 ['Maya remind me in 10 minutes to drink water','reminder'],
 ['Maya remind me in 2 hours to call home','reminder'],
 ['Maya macro Calculator tap History','macro'],
 ['Maya run routine morning','routine'],
 ['Maya phone automation status','status']
];
for(const [spoken,expected] of positives){
 assert.equal(parser.parseV54Voice(spoken)?.kind,expected,spoken);
}
assert.equal(parser.parseV54Voice('Maya remind me in 2 hours to call home')?.minutes,120);
assert.equal(parser.parseV54Voice('Maya save file report.txt with hello there')?.name,'report.txt');
for(const spoken of ['read notifications','Maya send all messages','Maya transfer 100 AED','Maya macro bank tap Pay and confirm','Maya list all hidden files','Maya remind me in 0 minutes to call','Maya save file ../../secrets.txt with data','Maya run routine']){
 assert.equal(parser.parseV54Voice(spoken),null,spoken);
}
const suite=readFileSync(new URL('../maya-features/v54-suite.js',import.meta.url),'utf8');
const standalone=suite.replace(/^import .*;\s*$/gm,"const openNamedApp=()=>Promise.resolve(''),normalizeName=x=>x,targetName=x=>x;");
const mod=await import('data:text/javascript;base64,'+Buffer.from(standalone).toString('base64'));
const valid={name:'Morning',steps:[{type:'battery'},{type:'notifications'},{type:'app',name:'Calendar'}]};
assert.equal(mod.validateV54Routine(valid),true);
assert.equal(mod.validateV54Routine({name:'bad',steps:[{type:'app',name:'X'},{type:'battery'}]}),false);
assert.equal(mod.validateV54Routine({name:'bad',steps:[{type:'sms',phone:'1'}]}),false);
assert.equal(mod.validateV54Routine({name:'too many',steps:[...Array(6)].map(()=>({type:'battery'}))}),false);
assert.equal(mod.readV54Routines({getItem:()=>'{error'}).length,0);
const scripts=readFileSync(new URL('../scripts/install-v54.py',import.meta.url),'utf8');
assert.ok(scripts.includes('MayaV54Files.accept(this, requestCode, resultCode, data)'));
assert.ok(scripts.includes('public String v54(String action, String json)'));
const macro=readFileSync(new URL('../native-v54/MayaV54Macro.java',import.meta.url),'utf8');
assert.ok(macro.includes('MayaV4AccessService.active'));
assert.ok(macro.includes('getRootInActiveWindow()'));
assert.ok(macro.includes('MayaAppCatalog.launch('));
assert.ok(macro.includes('safeLabel('));
const bridge=readFileSync(new URL('../native-v54/MayaV54Bridge.java',import.meta.url),'utf8');
for(const action of ['FILES_PICK','FILES_LIST','FILES_SAVE_TEXT','MACRO_TAP','MACRO_STATUS','REMINDERS_SET','REMINDERS_LIST','NOTIFICATIONS_LIST','NOTIFICATIONS_REPLY'])
 assert.ok(bridge.includes('case "'+action+'"'),action);
const nativeFiles=readFileSync(new URL('../native-v54/MayaV54Files.java',import.meta.url),'utf8');
assert.ok(nativeFiles.includes('Intent.ACTION_OPEN_DOCUMENT_TREE'));
assert.ok(nativeFiles.includes('takePersistableUriPermission'));
assert.ok(!nativeFiles.includes('MANAGE_EXTERNAL_STORAGE'));
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
assert.ok(loader.includes("import './v54-voice-bridge.js'"));
assert.ok(loader.includes("import './v54-suite.js'"));
const voiceBridge=readFileSync(new URL('../maya-features/v54-voice-bridge.js',import.meta.url),'utf8');
assert.ok(voiceBridge.includes('oldTyped(text)')&&voiceBridge.includes('oldLive(text)'));
console.log('Maya V54 voice parser, routine safety, native API wiring checks passed; actual Android device verification still required.');
