import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../maya-features/local-tools.js',import.meta.url),'utf8');
const mod=await import('data:text/javascript;base64,'+Buffer.from(script).toString('base64'));
for(const [v,action] of [['Maya device info','LOCAL_DEVICE'],['মায়া ফোনের তথ্য','LOCAL_DEVICE'],
 ['Maya wifi status','LOCAL_WIFI'],['Maya check volume','LOCAL_VOLUME_GET'],
 ['Maya torch on','FLASHLIGHT_ON'],['Maya torch off','FLASHLIGHT_OFF'],
 ['Maya set volume to 75 percent','LOCAL_VOLUME_SET']]){
 assert.equal(mod.parseLocalVoice(v)?.action,action,v);
}
assert.equal(mod.parseLocalVoice('Maya set volume to 75 percent').percent,75);
for(const v of ['Maya set volume to 110','Maya delete file other.txt','Maya unlock phone','check wifi']){
 assert.equal(mod.parseLocalVoice(v),null,v);
}
const native=readFileSync(new URL('../native-local/MayaLocalTools.java',import.meta.url),'utf8');
for(const c of ['LOCAL_DEVICE','LOCAL_WIFI','LOCAL_VOLUME_GET','LOCAL_VOLUME_SET','LOCAL_FILE_READ','LOCAL_FILE_DELETE','LOCAL_DELETE_STATUS'])assert.ok(native.includes('"'+c+'"'));
assert.ok(native.includes('new AlertDialog.Builder(act)'));
assert.ok(native.includes('getPersistedUriPermissions'));
assert.ok(!native.includes('MANAGE_EXTERNAL_STORAGE')&&!native.includes('deleteRecursively'));
const patch=readFileSync(new URL('../scripts/install-local-tools.py',import.meta.url),'utf8');
assert.ok(patch.includes('MayaLocalTools.run(ctx,act,action,input)'));
assert.ok(readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8').includes("import './local-tools.js'"));
console.log('Maya PC-free module parsing, SAF and integration checks passed (Android hardware test still needed).');
