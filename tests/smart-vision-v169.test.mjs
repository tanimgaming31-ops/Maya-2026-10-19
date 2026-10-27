import assert from 'node:assert/strict';
import {parseVisionVoice,parseReceiptLines,labelHints} from '../maya-features/smart-vision-v169.js';

const cases=[
 ['Maya scan document','document'],['মায়া কাগজ স্ক্যান করো','document'],
 ['Maya make PDF','pdf'],['মায়া পিডিএফ বানাও','pdf'],
 ['Maya scan receipt','receipt'],['মায়া বিল স্ক্যান করো','receipt'],
 ['Maya save receipt','receiptSave'],['মায়া বিলের খরচ সেভ করো','receiptSave'],
 ['Maya read medicine label','medicine'],['মায়া ওষুধের লেখা পড়ো','medicine'],
 ['Maya explain medicine label','medicineExplain'],
 ['Maya count books in my photo','count'],['Maya count cups in photo','count'],
 ['Maya organize my photos','organize'],['মায়া ছবিগুলো সাজাও','organize'],
 ['Maya read handwriting','handwriting'],['মায়া হাতের লেখা টাইপ করো','handwriting'],
 ['Maya read scanned text aloud','readText']
];
for(const [command,kind] of cases)assert.equal(parseVisionVoice(command)?.kind,kind,command);
assert.equal(parseVisionVoice('open Whatsapp'),null);
assert.equal(parseVisionVoice('Maya send money'),null);
assert.equal(parseVisionVoice('Maya give me a medical prescription'),null);
assert.equal(parseVisionVoice('Maya delete all my photos'),null);
assert.equal(parseVisionVoice('Maya count cups in photo')?.target,'cups');
const data=parseReceiptLines('SUPERMARKET\nBread 5.00\nMilk 8.20\nSUBTOTAL 13.20\nVAT 0.60\nTOTAL 13.80 AED');
assert.equal(data.items.length,2);
assert.deepEqual(data.items.map(x=>x.name),['Bread','Milk']);
assert.equal(data.total,13.8);
assert.equal(data.currency,'AED');
assert.equal(parseReceiptLines('Apple 1.50').hasTotal,false);
assert.equal(labelHints('EXP 12/2027\nSTORE IN A COOL PLACE').highlights.length,2);
console.log('Maya Smart Vision V169: voice/parser/receipt/label checks passed ('+cases.length+' voice cases).');
