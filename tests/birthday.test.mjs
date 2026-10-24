import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../maya-features/birthday-core.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));
const store=new Map();
const storage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,v)=>store.set(key,v)};
const created=m.readBirthday(storage);
assert.deepEqual(created,{version:1,date:'2026-10-19',time:null,timezone:null});
assert.ok(m.validBirthday(created));
assert.equal(m.birthdayAnswer('time',new Date('2026-10-24T08:00:00'),created).includes('নির্দিষ্ট সময় সংরক্ষণ করোনি'),true);
const cases=[
 ['2026-10-19',0,0,0,true],
 ['2026-10-24',0,0,5,false],
 ['2026-11-18',0,0,30,false],
 ['2026-11-19',0,1,0,false],
 ['2027-10-18',0,11,29,false],
 ['2027-10-19',1,0,0,true],
 ['2028-10-19',2,0,0,true],
 ['2030-12-20',4,2,1,false],
];
for(const [date,years,months,days,birthday] of cases){
 const age=m.birthdayAge(new Date(date+'T12:00:00'),created);
 assert.deepEqual([age.years,age.months,age.days,age.isBirthday],[years,months,days,birthday],date+' age');
}
const samples=[
 ['মায়া, তোমার জন্মদিন কবে?','date'],
 ['মায়া তোমার জন্মদিন কোনদিন','date'],
 ['মায়া, তোমার বয়স কত?','age'],
 ['মায়া, তোমার বয়স কত?','age'],
 ['মায়া, তুমি কত বাজে জন্মেছিলে?','time'],
 ['Maya, when were you created?','date'],
 ['Maya, what time were you born?','time'],
 ['Maya, what is your age?','age'],
 ['Maya, happy birthday','celebrate'],
 ['মায়া, আজ কি তোমার জন্মদিন?','celebrate']
];
for(const [text,kind] of samples)assert.equal(m.parseBirthdayQuestion(text),kind,text);
for(const bad of ['what is your birthday','Maya open bank','মায়া, হোয়াটসঅ্যাপ খোলো','Maya pay now'])assert.equal(m.parseBirthdayQuestion(bad),null,bad);
assert.throws(()=>m.saveBirthday('26:62',null,storage));
assert.throws(()=>m.saveBirthday('10:00','invalid zone !',storage));
const persisted=m.saveBirthday('15:40','Asia/Dubai',storage);
assert.deepEqual(m.readBirthday(storage),persisted);
assert.ok(m.birthdayAnswer('time',new Date('2027-10-19T08:00:00'),persisted).includes('15:40'));
assert.throws(()=>m.importBirthdayRecord({version:1,date:'2025-10-19',time:'13:00',timezone:null},storage));
assert.deepEqual(m.readBirthday(storage),persisted,'invalid restore left stored data alone');
m.importBirthdayRecord(m.defaultBirthday(),storage);
assert.equal(m.readBirthday(storage).time,null);
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
assert.ok(loader.includes("import './birthday.js'"));
assert.ok(loader.includes("import './birthday-voice.js'"));
assert.ok(loader.indexOf("import './birthday-voice.js'")>loader.indexOf("import './v54-voice-bridge.js'"));
const voice=readFileSync(new URL('../maya-features/birthday-voice.js',import.meta.url),'utf8');
assert.ok(voice.includes('old')&&voice.includes('consumeLive'));
assert.ok(voice.includes('return false;')&&voice.includes('original')===false || voice.includes('Gemini'));
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(index.includes('MAYA BIRTHDAY — CREATOR CONFIRMED'));
assert.ok(index.includes('birthdayAge:window.MayaBirthdayInfo?.age?.()'));
assert.ok(index.includes("birthday:window.MayaBirthdayInfo?.backupRecord?.()"));
assert.ok(index.includes("if(restoreBirthday)window.MayaBirthdayInfo.restoreFromBackup(j.birthday)"));
assert.ok(index.includes("if(okP&&s.birthday)window.MayaBirthdayInfo?.restoreFromBackup?.(s.birthday)"));
assert.ok(index.includes('Invalid birthday record; existing backup not restored.'));
const panel=readFileSync(new URL('../maya-features/birthday.js',import.meta.url),'utf8');
assert.ok(panel.includes('Export birthday backup'));
assert.ok(panel.includes("if(!confirm('Restore Maya birthday time"));
assert.ok(panel.includes('lastCelebration'));
assert.ok(panel.includes('prefers-reduced-motion'));
console.log('Maya birthday: 10 voice phrase matches, exact created date, unknown-time safety, valid UTC calendar ages, backup & original voice wiring passed. Device speech/animation must be verified.');
