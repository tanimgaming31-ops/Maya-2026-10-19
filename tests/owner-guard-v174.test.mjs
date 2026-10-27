import assert from 'node:assert/strict';
import {parseOwnerGuardVoice} from '../maya-features/owner-guard-v174.js';
const cases=[
 ['Maya enable owner guard','enable'],['মায়া ফোন পাহারা চালু করো','enable'],
 ['Maya security on','enable'],['maya Security on করো','enable'],
 ['মায়া সিকিউরিটি অন করো','enable'],['মায়া সিকিউরিটি চালু করো','enable'],
 ['Maya turn on security','enable'],['Hey Maya security on','enable'],
 ['Maya disable owner guard','disable'],['মায়া ফোন পাহারা বন্ধ করো','disable'],
 ['Maya security off','disable'],['মায়া সিকিউরিটি অফ করো','disable'],
 ['Maya turn off security','disable'],
 ['Maya check owner','verify'],['মায়া আমাকে চিনো','verify'],
 ['Maya remember my face','reference'],['মায়া আমার মুখ মনে রাখো','reference'],
 ['Maya show security photos','photos'],['মায়া নিরাপত্তার ছবি দেখাও','photos'],
 ['Maya owner guard status','status'],['মায়া ফোন পাহারার অবস্থা বলো','status'],
 ['Maya open owner guard','panel']
];
for(const [input,kind] of cases)assert.equal(parseOwnerGuardVoice(input)?.kind,kind,input);
for(const input of [
 'take a photo secretly','Maya photograph every person','Maya disable Android lock',
 'Maya bypass face recognition','Maya delete all photos','Maya send photo to server',
 'Maya listen to the phone all day','Maya track my contacts','open guard',
 'Maya security online','Maya security on another phone','Maya security once',
 'Maya security on automatically without permission'
])assert.equal(parseOwnerGuardVoice(input),null,'Reject unimplemented/unsafe: '+input);
console.log('Maya Owner Guard V174: '+cases.length+' command routes; unsupported/unsafe claims rejected.');

// Voice-on must invoke the native Android biometric, not a JS confirmation
// or a settings-panel click that interrupts the voice call.
import {readFileSync} from 'node:fs';
const guarded=readFileSync(new URL('../maya-features/owner-guard-v174.js',import.meta.url),'utf8');
assert.ok(guarded.includes("source==='button'&&!!$('mayaGuardCapture')?.checked"));
assert.ok(guarded.includes("if(c.kind==='enable')return verify('enable','voice')"));
assert.ok(guarded.includes("if(c.kind==='disable')return verify('disable','voice')"));
assert.ok(guarded.includes("const x=native('ENABLE',{capture})"));
assert.ok(guarded.includes("return await awaitAuth(x,mode)"));
assert.ok(!guarded.includes("if(!confirm(msg))return report('Not enabled.');"));
