import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../maya-features/local-tools.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const cases=[
 ['Maya device info','LOCAL_DEVICE'],['মায়া ফোনের তথ্য','LOCAL_DEVICE'],
 ['battery status','LOCAL_DEVICE'],['Maya wi-fi status','LOCAL_WIFI'],
 ['ওয়াইফাই স্ট্যাটাস','LOCAL_WIFI'],['Maya volume status','LOCAL_VOLUME_GET'],
 ['Maya set volume to 75 percent','LOCAL_VOLUME_SET'],['মায়া ভলিউম ৫০ করো','LOCAL_VOLUME_SET'],
 ['torch on','FLASHLIGHT_ON'],['Maya torch off','FLASHLIGHT_OFF'],
 ['Maya choose folder','FILES_PICK'],['ফাইলগুলো দেখাও','FILES_LIST'],
 ['Maya read file report.txt','LOCAL_FILE_READ'],['Maya delete file report.txt','LOCAL_FILE_DELETE'],
 ['Maya save file notes.txt with hello there','FILES_SAVE_TEXT'],['Maya check file delete status','LOCAL_DELETE_STATUS']
];
for(const [utterance,expected] of cases)assert.equal(m.parseLocalVoice(utterance)?.action,expected,utterance);
assert.equal(m.parseLocalVoice('Maya set volume to 75 percent').percent,75);
assert.equal(m.parseLocalVoice('Maya save file notes.txt with hello there').text,'hello there');
for(const utterance of ['Maya set volume to 101','Maya delete all files','Maya unlock phone',
 'Maya read file ../../secret.txt','Maya save file .config.txt with data','Maya transfer money','hello how are you'])
 assert.equal(m.parseLocalVoice(utterance),null,utterance);
assert.match(m.describeLocal({action:'LOCAL_FILE_DELETE',name:'notes.txt'},{status:'requested'}),/Nothing has been deleted yet/);
assert.match(m.describeLocal({action:'LOCAL_VOLUME_SET'},{status:'error',message:'Not permitted'}),/Not permitted/);
assert.equal(js.includes('mayaLocalPanel'),false,'No new separate phone panel');
assert.equal(js.includes('maya_life_voice_v25'),false,'Local voice must not need extra opt-in toggle');
const native=readFileSync(new URL('../native-local/MayaLocalTools.java',import.meta.url),'utf8');
assert.ok(native.includes('new AlertDialog.Builder(act)'));
assert.ok(native.includes('getPersistedUriPermissions'));
assert.ok(!native.includes('MANAGE_EXTERNAL_STORAGE'));
assert.ok(native.includes('static boolean voice(Context ctx, String words)'));
const installer=readFileSync(new URL('../scripts/install-local-tools.py',import.meta.url),'utf8');
assert.ok(installer.includes('MayaLocalTools.voice(ctx,words)'));
assert.ok(installer.includes('MayaLocalTools.run(ctx,act,action,input)'));
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
assert.ok(loader.includes("import './local-tools.js'"));
assert.ok(loader.indexOf("import './local-tools.js'")>loader.indexOf("import './voice-media-bridge.js'"));
console.log('Single Maya voice routes, no separate local panel, confirmed scoped Android actions: static tests passed.');
