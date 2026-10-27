import assert from 'node:assert/strict';
import {parseVoiceExt,privateIPv4,ALLOWED_COLORS,OUTFITS} from '../maya-features/voice-first-v172.js';
const cases=[
 ['Maya show captions','captionToggle'],['মায়া ক্যাপশন দেখাও','captionToggle'],
 ['Maya stop captions','captionToggle'],['Maya clear captions','captionClear'],
 ['Maya turn on smart light','homeOn'],['Maya turn off smart plug','homeOff'],
 ['মায়া স্মার্ট বাতি চালু করো','homeOn'],['মায়া স্মার্ট প্লাগ বন্ধ করো','homeOff'],
 ['Maya smart home status','homeStatus'],
 ['Maya open router settings','routerOpen'],['মায়া রাউটার সেটিংস খোলো','routerOpen'],
 ['Maya change WiFi password','routerHelp'],['মায়া রাউটার সেটিংস বুঝিয়ে দাও','routerHelp'],
 ['Maya set hair to pink','avatarHair'],['মায়া মায়ার চুল গোলাপি করো','avatarHair'],
 ['Maya set hairstyle to bob','avatarHairStyle'],['মায়া মায়ার চুল ছোট করো','avatarHairStyle'],
 ['Maya set outfit to ocean','avatarOutfit'],['মায়া মায়ার জামা নীল করো','avatarOutfit'],
 ['Maya reset avatar','avatarReset'],
 ['Maya start quiz on science','quizStart'],['মায়া কুইজ শুরু করো','quizStart'],
 ['Maya answer A','quizAnswer'],['মায়া উত্তর B','quizAnswer'],
 ['Maya repeat question','quizRepeat'],['Maya quiz score','quizScore'],['Maya stop quiz','quizStop'],
 ['Maya open voice control center','openPanel']
];
for(const [t,expected] of cases)assert.equal(parseVoiceExt(t)?.kind,expected,t);
assert.equal(parseVoiceExt('Maya start quiz on geography')?.topic,'geography');
assert.equal(parseVoiceExt('B',true)?.value,'B');
assert.equal(parseVoiceExt('B',false),null);
for(const s of ['10.1.2.3','172.16.0.1','172.31.1.6','192.168.0.1'])assert.equal(privateIPv4(s),true,s);
for(const s of ['127.0.0.1','169.254.1.1','8.8.8.8','172.32.0.1','192.169.1.1','192.168.0.1:8080','001.168.0.1','router.local','0.0.0.0','192.168.1.256'])assert.equal(privateIPv4(s),false,s);
for(const s of ['Maya change bank password','Maya connect any home device','Maya delete router admin','Maya access another network','Maya factory reset router','Maya change 3D outfit'])assert.equal(parseVoiceExt(s),null,s);
assert.ok(ALLOWED_COLORS.pink&&OUTFITS.ocean);
console.log('Maya Voice-First V172: '+cases.length+' voice routes, IPv4 allowlist, unsafe/unrelated guard passed.');
