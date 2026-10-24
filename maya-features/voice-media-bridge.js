/* Add screenshot + YouTube media voice commands to existing Maya voice stack.
   Preserve birthday, Life Voice, V54 and Gemini Live routes. */
import {parseMediaCommand} from './voice-media.js';
import {runMediaCommand} from './voice-media.js';
const old=typeof window!=='undefined'?window.MayaLifeVoice:null;
if(old){
 const recognize=old.recognizes,parse=old.parseLifeVoice,run=old.runLifeVoice;
 const typed=old.consumeTyped,live=old.consumeLive;
 const command=text=>parseMediaCommand(text);
 const output=text=>{const el=document.getElementById('sub');if(el)el.textContent=String(text).slice(0,650);};
 const task=cmd=>void runMediaCommand(cmd).then(output).catch(e=>output('Media command failed: '+String(e.message||e)));
 window.MayaLifeVoice={
  ...old,
  recognizes(text){return Boolean(command(text)||recognize(text));},
  parseLifeVoice(text){const cmd=command(text);return cmd?{kind:'mayaVoiceMedia',command:cmd}:parse(text);},
  runLifeVoice(action){return action?.kind==='mayaVoiceMedia'?runMediaCommand(action.command):run(action);},
  consumeTyped(text){const cmd=command(text);if(!cmd)return typed(text);task(cmd);return true;},
  consumeLive(text){const cmd=command(text);if(!cmd)return live(text);task(cmd);return true;}
 };
}
