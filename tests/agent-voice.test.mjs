import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseAgentVoice,voiceAgentSummary} from '../maya-features/agent-voice.js';
const sample=[
 ['Maya research solar energy','research'],
 ['মায়া, সৌরবিদ্যুৎ সম্পর্কে রিসার্চ করো','research'],
 ['Maya make a plan about Dubai transport','plan'],
 ['Maya do compare electric vehicles','autoPlan'],
 ['Maya run plan','runPlan'],
 ['Maya search google for NASA','browser'],
 ['মায়া, গুগলে আবহাওয়া সার্চ করো','browser'],
 ['Maya open app YouTube','phone'],
 ['Maya read my file','file'],
 ['মায়া, আমার পিডিএফ পড়ো','file'],
 ['Maya check code','code'],
 ['মায়া, কোডটা ঠিক করো','code'],
 ['Maya show agent task history','dashboard'],
 ['মায়া, ড্যাশবোর্ড দেখাও','dashboard'],
 ['Maya stop agent','cancel'],
 ['মায়া, এজেন্ট বন্ধ করো','cancel']
];
for(const [text,kind] of sample)assert.equal(parseAgentVoice(text)?.kind,kind,text);
for(const phrase of ['','research solar energy','Maya how are you','Maya send money now','Maya send WhatsApp messages','মায়া, পাসওয়ার্ড বলো'])assert.equal(parseAgentVoice(phrase),null,phrase);
assert.equal(parseAgentVoice('Maya research solar energy').topic,'solar energy');
assert.equal(parseAgentVoice('Maya open app YouTube').name,'YouTube');
assert.ok(voiceAgentSummary('a'.repeat(800)).length<=430);
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
assert.ok(loader.includes("import './life-voice.js'"),'original Life Voice import absent');
assert.ok(loader.includes("import './agent-suite.js'"),'Agent Suite import absent');
assert.ok(loader.includes("import './agent-voice-bridge.js'"),'voice bridge not wired into Maya loader');
assert.ok(loader.indexOf("import './agent-voice-bridge.js'")>loader.indexOf("import './life-voice.js'"),'voice bridge must wrap loaded original voice');
const bridge=readFileSync(new URL('../maya-features/agent-voice-bridge.js',import.meta.url),'utf8');
assert.ok(bridge.includes("runAgentVoiceCommand"),'bridge lacks command execution');
assert.ok(bridge.includes('oldRun(command)'),'existing commands must remain functional');
const suite=readFileSync(new URL('../maya-features/agent-suite.js',import.meta.url),'utf8');
assert.ok(suite.includes('export async function runAgentVoiceCommand(command)'),'Agent Suite voice executor missing');
assert.ok(suite.includes("case 'research'"),'research routing missing');
assert.ok(suite.includes("case 'phone'"),'Android app launching missing');
assert.ok(suite.includes("case 'file'"),'file voice gating missing');
assert.ok(suite.includes("case 'code'"),'coding voice routing missing');
assert.ok(suite.includes('voiceRunApproved'),'voice plan action path missing');
assert.ok(suite.includes("if(!confirm('Send the selected"),'file upload confirmation removed');
console.log('Maya Agent Voice V30: '+sample.length+' positive parser tests, safeguards, loader wiring and consent checks PASSED. On-device mic test still required.');
