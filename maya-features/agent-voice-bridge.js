/* Additive voice routing: does not modify Maya's existing Live or fallback engine. */
import {parseAgentVoice} from './agent-voice.js';
import {runAgentVoiceCommand} from './agent-suite.js';
const existing=typeof window==='undefined'?null:window.MayaLifeVoice;
if(existing){
 const oldRecognizes=existing.recognizes;
 const oldRun=existing.runLifeVoice;
 const oldParse=existing.parseLifeVoice;
 const isEnabled=()=>{try{return localStorage.getItem('maya_life_voice_v25')==='true';}catch{return false;}};
 const showResult=msg=>{const el=document.getElementById('sub');if(el)el.textContent=String(msg).slice(0,800);};
 function parse(text){
  const command=parseAgentVoice(text);
  if(command)return {kind:'mayaAgentV30',command};
  return oldParse(text);
 }
 function recognizes(text){
  return !!(oldRecognizes(text)||(isEnabled()&&parseAgentVoice(text)));
 }
 async function run(command){
  if(command?.kind==='mayaAgentV30'){
    if(!isEnabled())return 'Enable Life Voice in Maya Settings first.';
    const result=await runAgentVoiceCommand(command.command);
    showResult(result);
    return result;
  }
  return oldRun(command);
 }
 window.MayaLifeVoice={
  ...existing,
  recognizes,
  parseLifeVoice:parse,
  runLifeVoice:run,
  consumeTyped(text){if(!recognizes(text))return false;void run(parse(text)).catch(e=>showResult('Agent error: '+e.message));return true;},
  consumeLive(text){if(!recognizes(text))return false;void run(parse(text)).catch(e=>showResult('Agent error: '+e.message));return true;}
 };
}
