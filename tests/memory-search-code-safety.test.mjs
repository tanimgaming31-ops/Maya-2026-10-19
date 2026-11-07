import assert from 'node:assert/strict';
import {searchMemoryRanked, loadMemory} from '../maya-features/memory-v2.js';
import {codeSafetyIssue} from '../maya-features/agent-suite.js';

const pack = {version:2,items:[
  {id:'1',text:'চা পান করি সন্ধ্যায়',category:'habits'},
  {id:'2',text:'Tea and breakfast preferences',category:'food'},
  {id:'3',text:'প্রতি সপ্তাহে বাজারের তালিকা',category:'tasks'},
  {id:'4',text:'tea',category:'quick-reference'}
]};
let writes=0;
globalThis.localStorage={
  getItem(key){ assert.equal(key,'maya_memory_v2'); return JSON.stringify(pack); },
  setItem(){ writes++; throw Error('Read-only search must not write'); }
};

assert.deepEqual(searchMemoryRanked('tea').map(x=>x.id),['4','2']);
assert.deepEqual(searchMemoryRanked('চা').map(x=>x.id),['1']);
assert.deepEqual(searchMemoryRanked('habits').map(x=>x.id),['1']);
assert.deepEqual(searchMemoryRanked('বাজারের').map(x=>x.id),['3']);
assert.deepEqual(searchMemoryRanked('TEA',1).map(x=>x.id),['4']);
assert.deepEqual(searchMemoryRanked(''),[]);
assert.deepEqual(searchMemoryRanked('not-a-matching-term'),[]);
assert.equal(loadMemory().items.length,4);
assert.equal(writes,0);
assert.equal(codeSafetyIssue('const sum = (a,b) => a+b;'),null);
assert.match(codeSafetyIssue('const api_key = "SUPERSECRET123456789";'),/credential/i);
// Construct synthetic credential-shaped fixtures at runtime. Never commit live-looking tokens.
assert.match(codeSafetyIssue(['AI','za','Sy','A'.repeat(33)].join('')),/API key/i);
assert.match(codeSafetyIssue(['gh','p_','A'.repeat(24)].join('')),/token/i);
assert.match(codeSafetyIssue('-----BEGIN PRIVATE KEY-----\n...'),/Private key/i);
assert.match(codeSafetyIssue(''),/Paste/i);
assert.match(codeSafetyIssue('x'.repeat(12001)),/12,000/i);
console.log('Maya Memory v2 read-only search and code-upload safety: PASS (logic only, no phone test).');
