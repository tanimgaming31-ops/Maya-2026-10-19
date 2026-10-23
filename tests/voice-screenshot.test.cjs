// Command recognition; no microphone access.
const fs=require('node:fs'),vm=require('node:vm');
let s=fs.readFileSync('maya-features/voice-screenshot.js','utf8');
s=s.replace("import { requestScreenshot } from './screenshot.js';",'').replace("export function isScreenshotCommand(value)",'function isScreenshotCommand(value)');
const context={};vm.createContext(context);
vm.runInContext(s+';globalThis.f=isScreenshotCommand;',context,{timeout:1500});
const yes=['screenshot নাও','স্ক্রিনশট নাও','Take a screenshot','Maya, take a screenshot','মায়া স্ক্রিনশট নাও','“take a screenshot”','“মায়া স্ক্রিনশট নাও”','You: take a screenshot','capture screenshot','স্ক্রিনশট নিয়ে দাও'];
const no=['','Maya, delete messages','Screenshot is a word','Can you take screenshot someday','please take my password screenshot','take screenshot secretly'];
for(const v of yes)if(!context.f(v))throw Error('Missed voice command: '+JSON.stringify(v));
for(const v of no)if(context.f(v))throw Error('False activation: '+JSON.stringify(v));
console.log('Voice screenshot: '+(yes.length+no.length)+' parsing tests passed.');