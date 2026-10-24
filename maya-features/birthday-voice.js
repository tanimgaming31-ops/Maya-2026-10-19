/* Answers explicit Maya birthday voice questions without overwriting V54, Agent or Life Voice. */
import {parseBirthdayQuestion} from './birthday-core.js';
import {birthdayReply} from './birthday.js';
const old=typeof window!=='undefined'?window.MayaLifeVoice:null;
if(old){
 const recognize=old.recognizes,parse=old.parseLifeVoice,run=old.runLifeVoice,typed=old.consumeTyped,live=old.consumeLive;
 const enabled=()=>{try{return localStorage.getItem('maya_life_voice_v25')==='true';}catch{return false;}};
 const commandFor=text=>enabled()?parseBirthdayQuestion(text):null;
 const parseNext=text=>{const kind=commandFor(text);return kind?{kind:'mayaBirthday',question:kind}:parse(text);};
 const runNext=async command=>command?.kind==='mayaBirthday'?birthdayReply(command.question):run(command);
 window.MayaLifeVoice={
  ...old,
  recognizes(text){return Boolean(commandFor(text)||recognize(text));},
  parseLifeVoice:parseNext,
  runLifeVoice:runNext,
  consumeTyped(text){
   const kind=commandFor(text);
   if(!kind)return typed(text);
   birthdayReply(kind);return true;
  },
  consumeLive(text){
   // The live audio has already been sent to Gemini. Keep Gemini's own natural
   // spoken reply; birthday facts are included in its dynamic system prompt.
   // Returning false allows the normal transcript handling, without a second TTS voice.
   if(commandFor(text))return false;
   return live(text);
  }
 };
}
