import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const voice=readFileSync(new URL('../maya-features/life-voice.js',import.meta.url),'utf8');
const source=voice.replace(/^import \{addRecord,loadData,searchNotes,weekly\} from '\.\/life-suite\.js';/m,"const addRecord=()=>{},loadData=()=>({diary:[]}),searchNotes=()=>[],weekly=()=>({diary:0,flashcards:0,focusMinutes:0,spent:{}});")
  .replace(/^import \{parseOpenAppCommand,openNamedApp,openPlayStoreForApp\} from '\.\/app-launcher\.js';/m,"const parseOpenAppCommand=t=>t==='open Telegram'?{kind:'appLaunch',name:'Telegram'}:null; const openNamedApp=async()=> 'Native launch requested.'; const openPlayStoreForApp=async()=> 'Store requested.';");
const api=await import('data:text/javascript;base64,'+Buffer.from(source.replace(/^import \{parseHubCommand,executeHubCommand\} from '\.\/smart-hub\.js';/m,"const parseHubCommand=t=>t==='show my tasks'?{kind:'hub',action:'todoList'}:null;const executeHubCommand=async()=> 'Task list opened.';")).toString('base64'));
const ok=[
 ['মায়া, আমার ডায়েরিতে লিখো আজ ভালো আছি','diary'],
 ['মায়া আমার ডায়েরিতে লেখো আজ আনন্দ হচ্ছে','diary'],
 ['Maya, save to my diary hello sunshine','diary'],
 ['মায়া, আজ ২০ দিরহাম খরচ করেছি','expense'],
 ['মায়া, ১৫.৫০ টাকা খরচ করেছি','expense'],
 ['Maya, log expense 30 AED for tea','expense'],
 ['মায়া, ২৫ মিনিট ফোকাস চালু করো','focus'],
 ['Maya, start focus for 25 minutes','focus'],
 ['মায়া ফোকাস বন্ধ করো','stop'],
 ['Maya stop focus timer','stop'],
 ['মায়া নোটে লিখো আগামীকাল বাজার করবো','note'],
 ['Maya save a note remember groceries','note'],
 ['মায়া নোট খুঁজে দাও বাজার','search'],
 ['Maya search my notes for groceries','search'],
 ['মায়া আমার ব্যাটারি কত','battery'],
 ['Maya battery level','battery'],
 ['মায়া সপ্তাহের হিসাব বলো','weekly'],
 ['Maya show weekly summary','weekly'],
 ['মায়া আমার ডায়েরি দেখাও','diaryList'],
 ['Maya open life suite','open'],
 ['Maya open agent suite','agentOpen'],
 ['মায়া এজেন্ট খোলো','agentOpen'],
 ['Maya show my tasks','hub'],
 ['Maya open Telegram','appLaunch']
];
for(const [phrase,kind] of ok)assert.equal(api.parseLifeVoice(phrase)?.kind,kind,phrase);
assert.equal(api.parseLifeVoice('মায়া, আজ ২০ দিরহাম খরচ করেছি')?.amount,20);
assert.equal(api.parseLifeVoice('মায়া, ১৫.৫০ টাকা খরচ করেছি')?.currency,'BDT');
assert.equal(api.parseLifeVoice('মায়া, ২৫ মিনিট ফোকাস চালু করো')?.minutes,25);
assert.equal(api.parseLifeVoice('Maya, log expense 30 AED for tea')?.note,'tea');
assert.equal(api.parseLifeVoice('মায়া, নোট খুঁজে দাও বাজার')?.query,'বাজার');
const no=['','আজ ২০ দিরহাম খরচ করেছি','Maya, I feel sad today','Maya, buy bitcoin','Maya, send WhatsApp message','Hey May, 25 minutes focus','মায়া আমার পাসওয়ার্ড বলো','Maya, log expense 0 AED','Maya, log expense 100000001 AED','Maya, start focus for 999 minutes','Maya, please add my diary'];
for(const phrase of no)assert.equal(api.parseLifeVoice(phrase),null,phrase);
globalThis.localStorage={getItem(){return null;}};
assert.equal(api.enabled(),false);
assert.equal(api.recognizes('মায়া আমার ব্যাটারি কত'),false);
assert.equal(await api.runLifeVoice({kind:'diary',body:'do not save'}),'Enable Unified Life Voice in Settings first.');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const loader=readFileSync(new URL('../maya-features/advanced-loader.js',import.meta.url),'utf8');
const suite=readFileSync(new URL('../maya-features/life-suite.js',import.meta.url),'utf8');
assert.ok(index.includes('MayaLifeVoice?.consumeTyped(t)'),'typed router missing');
assert.ok(index.includes('MayaLifeVoice?.consumeLive(t)'),'live transcript router missing');
assert.ok(index.includes('MayaLifeVoice?.recognizes(text)'),'fallback speech router missing');
assert.ok(loader.includes("import './life-voice.js'"),'voice module not loaded');
assert.ok(suite.includes('maya:life-data-changed'),'Life Suite UI not refreshed after voice');
console.log('Maya Life Voice: parser/security and integration assertions passed (not an Android device microphone test).');
