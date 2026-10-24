/* V54 speech handler wraps—not replaces—Maya V30 Life/Agent voice routing. */
import {parseV54Voice} from './v54-voice.js';
import {runV54VoiceCommand} from './v54-suite.js';
const current=typeof window!=='undefined'?window.MayaLifeVoice:null;
if(current){
 const oldRecognizes=current.recognizes;
 const oldParse=current.parseLifeVoice;
 const oldRun=current.runLifeVoice;
 const oldTyped=current.consumeTyped;
 const oldLive=current.consumeLive;
 const optIn=()=>{try{return localStorage.getItem('maya_life_voice_v25')==='true';}catch{return false;}};
 const output=x=>{const sub=document.getElementById('sub');if(sub)sub.textContent=String(x).slice(0,850);};
 function parse(text){
  const command=optIn()?parseV54Voice(text):null;
  return command?{kind:'mayaV54',command}:oldParse(text);
 }
 function recognizes(text){return Boolean((optIn()&&parseV54Voice(text))||oldRecognizes(text));}
 async function run(cmd){
  if(cmd?.kind!=='mayaV54')return oldRun(cmd);
  if(!optIn())return 'Enable Unified Life Voice in Maya Settings.';
  const result=await runV54VoiceCommand(cmd.command);output(result);return result;
 }
 window.MayaLifeVoice={
  ...current,recognizes,parseLifeVoice:parse,runLifeVoice:run,
  consumeTyped(text){
   const c=optIn()?parseV54Voice(text):null;
   if(!c)return oldTyped(text);
   void run({kind:'mayaV54',command:c}).catch(e=>output('V54 failed: '+String(e.message)));
   return true;
  },
  consumeLive(text){
   const c=optIn()?parseV54Voice(text):null;
   if(!c)return oldLive(text);
   void run({kind:'mayaV54',command:c}).catch(e=>output('V54 failed: '+String(e.message)));
   return true;
  }
 };
}
