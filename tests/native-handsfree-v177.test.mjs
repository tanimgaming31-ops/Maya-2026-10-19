import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=readFileSync(new URL('../maya-features/native-handsfree-v177.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
for(const [spoken,result] of [
 ['Maya show floating assistant','overlayShow'],
 ['Maya show my floating icon','overlayShow'],
 ['মায়া ভাসমান মায়া দেখাও','overlayShow'],
 ['Maya hide floating shortcut','overlayHide'],
 ['মায়া ভাসমান আইকন বন্ধ করো','overlayHide'],
 ['Maya check background voice status','status'],
 ['Maya start background voice','voiceStart'],
 ['Maya stop hands-free voice','voiceStop'],
 ['Maya open accessibility settings','accessSettings'],
 ['Maya allow overlay permission','overlayPermission']
])assert.equal(m.parseMayaHandsFree(spoken),result,'Voice command: '+spoken);
for(const s of ['Maya turn off security','Maya open WhatsApp','Maya take a screenshot','Maya read my bank password','show floating assistant','Maya start hands-free voice forever'])
 assert.equal(m.parseMayaHandsFree(s),null,'Leave other actions untouched: '+s);
const calls=[];
const bridge={control(action,json){calls.push([action,json]);return JSON.stringify({status:'ok',message:'Native test reply'});}};
for(const [kind,action] of [['overlayShow','V52_OVERLAY_SHOW'],['overlayHide','V52_OVERLAY_HIDE'],['voiceStart','V4_VOICE_START'],['voiceStop','V4_VOICE_STOP'],['status','V4_STATUS']]){
 const r=m.runHandsFree(kind,bridge);
 assert.equal(r.status,'ok');
 assert.deepEqual(calls.at(-1),[action,'{}']);
}
assert.equal(m.runHandsFree('sendWhatsapp',bridge).status,'rejected');
assert.equal(m.runHandsFree('overlayShow',null).status,'unavailable');
assert.ok(!text.includes('jarvis.assistant'));
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
assert.ok(loader.includes("import './native-handsfree-v177.js'"));
console.log('Maya native hands-free: voice parser, real V4/V52 Android bridge dispatch, no unrelated commands, no extra app passed.');
