import assert from 'node:assert/strict';
import {parseAndroidControls,TYPES} from '../maya-features/android-controls-v167.js';

const cases=[
 ['Maya scan QR code','cameraScan'],
 ['মায়া কিউআর কোড স্ক্যান করো','cameraScan'],
 ['Maya scan barcode','cameraScan'],
 ['Maya find bluetooth devices','btScan'],
 ['মায়া ব্লুটুথ ডিভাইস খোঁজো','btScan'],
 ['Maya bluetooth status','btResults'],
 ['Maya connect bluetooth My Watch','btConnect'],
 ['Maya read screen text','screenReader'],
 ['মায়া স্ক্রিনশটের লেখা পড়ো','screenReader'],
 ['Maya read clipboard','clipboardRead'],
 ['মায়া ক্লিপবোর্ড অনুবাদ করো','clipboardTranslate'],
 ['Maya clipboard translate to tagalog','clipboardTranslate'],
 ['Maya clipboard correct','clipboardCorrect'],
 ['Maya clipboard summarize','clipboardSummarize'],
 ['Maya find duplicate files','storageScan'],
 ['মায়া বড় ফাইল খোঁজো','storageScan'],
 ['Maya storage report','storageSummary'],
 ['মায়া ফোন স্টোরেজ রিপোর্ট','storageSummary']
];
for(const [input,kind] of cases){
 const actual=parseAndroidControls(input);
 assert.equal(actual?.action,kind,'Voice command: '+input);
 assert.ok(TYPES.includes(kind));
}
assert.equal(parseAndroidControls('open WhatsApp'),null);
assert.equal(parseAndroidControls('Maya delete every file'),null);
assert.equal(parseAndroidControls('Maya send message without permission'),null);
assert.equal(parseAndroidControls('Maya turn on Bluetooth silently'),null);
assert.equal(parseAndroidControls('Maya connect bluetooth My Watch')?.device,'my watch');
console.log('Maya Android Controls V167 voice parser: '+cases.length+' cases passed; unsafe/unrelated rejected.');
