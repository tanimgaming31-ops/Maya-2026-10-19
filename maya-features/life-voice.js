/* Maya V25 unified Life Suite commands: opt-in, local and confirmation-first. */
import {addRecord,loadData,searchNotes,weekly} from './life-suite.js';
export const VOICE_KEY='maya_life_voice_v25';
const digitMap={'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
const clean=v=>String(v||'').normalize('NFKC').replace(/[০-৯]/gu,c=>digitMap[c]).replace(/^(?:you|আপনি)\s*:\s*/iu,'').replace(/^[“"‘]+|[”"’]+$/gu,'').replace(/[।!?]+$/gu,'').replace(/\s+/gu,' ').trim();
const short=(s,n)=>String(s||'').trim().slice(0,n);
const secretLike=s=>/password|passcode|otp|api.key|seed.phrase|cvv|পাসওয়ার্ড|ওটিপি|পিন নম্বর/iu.test(s);
export function parseLifeVoice(raw){
 const text=clean(raw);if(text.length>950)return null;
 const head=text.match(/^(?:(?:hey\s+)?maya|মায়া|মায়া)\s*[,،:!\-]?\s+(.+)$/iu);
 if(!head)return null;
 const t=head[1].trim();
 if(/^(?:আমার\s+)?(?:ব্যাটারি|চার্জ)\s*(?:কত(?:ো)?(?:\s+আছে)?|কত(?:ো)?\s+পারসেন্ট|দেখাও|স্ট্যাটাস বলো)$/u.test(t)||/^(?:battery|battery status|battery level|how much battery|what is my battery)$/iu.test(t))return {kind:'battery'};
 if(/^(?:সপ্তাহের হিসাব বলো|সাপ্তাহিক সারাংশ বলো|এই সপ্তাহের হিসাব বলো|show weekly summary|weekly summary)$/iu.test(t))return {kind:'weekly'};
 if(/^(?:ফোকাস\s+(?:বন্ধ করো|বন্ধ|থামাও)|stop focus|cancel focus|stop focus timer)$/iu.test(t))return {kind:'stop'};
 if(/^(?:লাইফ সুইট খোলো|লাইফ স্যুট খোলো|open life suite|show life suite)$/iu.test(t))return {kind:'open'};
 let m=t.match(/^(?:আমার\s+)?ডা[য়য়]েরি(?:তে)?\s+(?:লিখো|লেখো|লিখে রাখো)\s*[:\-]?\s+(.+)$/u)||t.match(/^(?:write|save|add|record)\s+(?:to\s+)?(?:my\s+)?diary\s*[:\-]?\s+(.+)$/iu);
 if(m)return {kind:'diary',body:short(m[1],800)};
 m=t.match(/^(?:আজ(?:কে)?\s+)?(\d{1,9}(?:\.\d{1,2})?)\s*(দিরহাম|টাকা|ডলার|রুপি|ইউরো|aed|bdt|usd|inr|eur)\s+খরচ\s*(?:করেছি|করলাম|হয়েছে|হয়েছে)(?:\s+(?:জন্য|কারণে|for)\s+(.+))?$/iu)||t.match(/^(?:log|record|save|add)\s+(?:an?\s+)?expense\s+(?:of\s+)?(\d{1,9}(?:\.\d{1,2})?)\s*(aed|bdt|usd|inr|eur|dirham|taka|dollar|rupee|euro)(?:\s+(?:for|on)\s+(.+))?$/iu);
 if(m){const map={'দিরহাম':'AED','টাকা':'BDT','ডলার':'USD','রুপি':'INR','ইউরো':'EUR',dirham:'AED',taka:'BDT',dollar:'USD',rupee:'INR',euro:'EUR'};const amount=Number(m[1]);if(!(amount>0&&amount<=100000000))return null;return {kind:'expense',amount,currency:map[m[2].toLowerCase()]||m[2].toUpperCase(),note:short(m[3]||'Voice entry',90)};}
 m=t.match(/^(\d{1,3})\s*মিনিট\s*(?:ফোকাস|focus)\s*(?:চালু করো|শুরু করো|চালু|শুরু)$/iu)||t.match(/^(?:start|begin)\s+(?:a\s+)?focus(?:\s+timer)?\s+(?:for\s+)?(\d{1,3})\s*(?:minutes?|mins?)$/iu);
 if(m){const minutes=Number(m[1]);return minutes>=1&&minutes<=120?{kind:'focus',minutes}:null;}
 m=t.match(/^(?:নোট(?:ে)?\s+(?:লিখো|লেখো|সেভ করো|লিখে রাখো))\s*[:\-]?\s+(.+)$/u)||t.match(/^(?:save|add|write)\s+(?:a\s+)?note\s*[:\-]?\s+(.+)$/iu);
 if(m)return {kind:'note',body:short(m[1],800)};
 m=t.match(/^(?:আমার\s+)?নোট\s*(?:খুঁজে দাও|খোঁজো|সার্চ করো)\s+(.+)$/u)||t.match(/^(?:find|search)\s+(?:my\s+)?notes?\s+(?:for\s+)?(.+)$/iu);
 if(m)return {kind:'search',query:short(m[1],120)};
 if(/^(?:আমার\s+)?ডা[য়য়]েরি\s+দেখাও$/u.test(t)||/^(?:show|list)\s+(?:my\s+)?diary$/iu.test(t))return {kind:'diaryList'};
 return null;
}
const el=id=>typeof document!=='undefined'?document.getElementById(id):null;
let pending=null,busy=false;
export function enabled(){try{return localStorage.getItem(VOICE_KEY)==='true';}catch{return false;}}
export function recognizes(text){return enabled()&&parseLifeVoice(text)!==null;}
function ask(summary){
 if(!el('lifeVoicePrompt'))return Promise.resolve(false);
 if(pending)return Promise.resolve(false);
 return new Promise(resolve=>{
  const end=value=>{if(!pending)return;clearTimeout(pending.timer);pending=null;el('lifeVoicePrompt').hidden=true;resolve(value);};
  el('lifeVoicePromptText').textContent=summary;el('lifeVoicePrompt').hidden=false;
  el('lifeVoiceYes').onclick=()=>end(true);el('lifeVoiceNo').onclick=()=>end(false);
  pending={timer:setTimeout(()=>end(false),30000),cancel:()=>end(false)};
 });
}
function report(msg){
 const out=el('lifeVoiceStatus');if(out)out.textContent=msg;
 const sub=el('sub');if(sub)sub.textContent=msg;
 if(typeof window!=='undefined')window.dispatchEvent(new Event('maya:life-data-changed'));
 return msg;
}
async function battery(){
 try{if(typeof window.MayaBridge?.batteryStatus==='function'){const v=JSON.parse(window.MayaBridge.batteryStatus());if(Number.isFinite(Number(v.percent)))return 'Battery '+Number(v.percent)+'%. '+(v.charging?'Charging.':'Not charging.');}}catch{}
 try{if(navigator.getBattery){const v=await navigator.getBattery();return 'Battery '+Math.round(100*v.level)+'%. '+(v.charging?'Charging.':'Not charging.');}}catch{}
 return 'Battery information is unavailable on this phone.';
}
export async function runLifeVoice(command){
 if(!enabled())return report('Enable Unified Life Voice in Settings first.');
 if(!command)return report('Unsupported Life Suite voice command.');
 if(busy)return report('A Life Suite voice command is already in progress.');
 busy=true;
 try{
  let msg='';
  switch(command.kind){
   case 'diary':
    if(command.body.length<3||secretLike(command.body))return report('Diary text is invalid or sensitive; not saved.');
    if(!await ask('Save this diary locally (unencrypted)?\n'+command.body))return report('Diary save cancelled or expired.');
    addRecord('diary',{body:command.body,mood:'okay'});msg='Diary saved on this device.';break;
   case 'expense':
    if(!await ask('Save expense locally?\n'+command.currency+' '+command.amount.toFixed(2)+' • '+command.note))return report('Expense save cancelled or expired.');
    addRecord('expense',{amount:command.amount,currency:command.currency,note:command.note});msg='Expense saved: '+command.currency+' '+command.amount.toFixed(2)+'.';break;
   case 'note':
    if(command.body.length<2||secretLike(command.body))return report('Note is invalid or sensitive; not saved.');
    if(!await ask('Save to Knowledge Notes locally (unencrypted)?\n'+command.body))return report('Note save cancelled or expired.');
    addRecord('knowledge',{title:'Voice note',body:command.body});msg='Knowledge note saved on this device.';break;
   case 'focus':{
    if(!await ask('Start '+command.minutes+' minute foreground Focus timer? Maya must stay open.'))return report('Focus timer cancelled.');
    const input=el('lifeMinutes'),button=el('lifeStartFocus'),status=el('lifeFocusOut');
    if(!input||!button||!status)return report('Real Life Suite Focus controls missing; not started.');
    input.value=String(command.minutes);button.click();await Promise.resolve();
    msg=status.textContent.includes('session running')?'Focus started for '+command.minutes+' minutes. Keep Maya open.':'Focus not started: '+status.textContent;break;
   }
   case 'stop':{
    const button=el('lifeStopFocus'),status=el('lifeFocusOut');
    if(!button||!status)return report('Real Life Suite Focus controls unavailable.');
    button.click();msg=status.textContent.includes('cancelled')?'Focus timer stopped.':'Stop requested: '+status.textContent;break;
   }
   case 'battery':msg=await battery();break;
   case 'weekly':{
    const x=weekly(),spent=Object.entries(x.spent).map(([k,v])=>k+' '+v.toFixed(2)).join(', ');
    msg='Past 7 days: '+x.diary+' diary notes, '+x.flashcards+' flashcards, '+x.focusMinutes+' focus minutes. Expenses: '+(spent||'none')+'.';break;
   }
   case 'search':{
    const found=searchNotes(command.query);
    msg=found.length?'Found '+found.length+' notes: '+found.slice(0,3).map(x=>short(x.title,60)+' — '+short(x.body,130)).join(' | '):'No saved notes matched '+command.query+'.';break;
   }
   case 'diaryList':{
    const list=loadData().diary;msg=list.length?'Diary has '+list.length+' entries. Latest: '+short(list[list.length-1].body,160):'Your Life Suite diary is empty.';break;
   }
   case 'open':{
    const t=el('lifeSuiteOpen');if(!t)return report('Life Suite button not found.');
    const settings=el('btnSet');if(settings)settings.click();if(t.textContent.includes('New Tools'))t.click();
    msg='Opened Maya Life Suite in Settings.';break;
   }
   default:msg='Unsupported Life Suite action.';
  }
  return report(msg);
 }catch(e){return report('Life Suite command failed: '+String(e?.message||e).slice(0,150));}
 finally{busy=false;}
}
export function consumeTyped(text){if(!recognizes(text))return false;void runLifeVoice(parseLifeVoice(text));return true;}
export function consumeLive(text){if(!recognizes(text))return false;void runLifeVoice(parseLifeVoice(text));return true;}
function mount(){
 const host=document.querySelector('#setSheet .body');if(!host||el('lifeVoiceEnabled'))return;
 const panel=document.createElement('section');panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #6286b4;border-radius:13px';
 const heading=document.createElement('h3');heading.textContent='Maya Unified Life Voice V25';
 const row=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.id='lifeVoiceEnabled';toggle.checked=enabled();
 row.append(toggle,document.createTextNode(' Enable Life Suite voice and typed commands'));
 const hints=document.createElement('p');hints.className='note';hints.textContent='Say: মায়া, আমার ডায়েরিতে লিখো আজ ভালো আছি / মায়া, আজ ২০ দিরহাম খরচ করেছি / মায়া, ২৫ মিনিট ফোকাস চালু করো / মায়া, আমার ব্যাটারি কত / মায়া, নোট খুঁজে দাও বাজার. Every command must begin with Maya or মায়া. Saving data and starting Focus requires on-screen confirmation.';
 const limitations=document.createElement('p');limitations.className='note';limitations.textContent='Gemini Live receives your speech before its transcript is finalized; Gemini may also reply. Fallback Voice handles exact local commands before sending them to Gemini. Voice requires working speech recognition. There is no background/offline speech recognition here. Life data is stored unencrypted on the device.';
 const test=document.createElement('input');test.className='inp wide';test.id='lifeVoiceTest';test.maxLength=950;test.placeholder='Type a command to test without microphone';
 const btn=document.createElement('button');btn.className='btn';btn.textContent='Run typed voice-command test';
 const status=document.createElement('p');status.id='lifeVoiceStatus';status.setAttribute('role','status');status.textContent=enabled()?'Voice control enabled.':'Voice control disabled.';
 panel.append(heading,row,hints,limitations,test,btn,status);host.append(panel);
 const prompt=document.createElement('section');prompt.id='lifeVoicePrompt';prompt.hidden=true;prompt.style.cssText='position:fixed;top:16%;left:5%;right:5%;z-index:100500;padding:16px;background:#0d1931;color:white;border:1px solid #688cff;border-radius:14px;box-shadow:0 8px 28px #000c';
 const h=document.createElement('strong');h.textContent='Confirm Maya Life Suite action';
 const body=document.createElement('p');body.id='lifeVoicePromptText';body.style.cssText='white-space:pre-wrap;word-break:break-word';
 const yes=document.createElement('button'),no=document.createElement('button');yes.id='lifeVoiceYes';no.id='lifeVoiceNo';yes.className='btn pri';no.className='btn bad';yes.textContent='Confirm';no.textContent='Cancel';
 prompt.append(h,body,yes,no);document.body.append(prompt);
 toggle.onchange=()=>{try{localStorage.setItem(VOICE_KEY,String(toggle.checked));report(toggle.checked?'Life Voice enabled.':'Life Voice disabled.');if(!toggle.checked&&pending)pending.cancel();}catch{toggle.checked=false;report('Cannot save voice toggle.');}};
 btn.onclick=()=>{const c=parseLifeVoice(test.value);if(!enabled())return report('Enable Life Voice first.');if(!c)return report('Unsupported exact command. Begin with Maya or মায়া.');void runLifeVoice(c);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&pending)pending.cancel();});
}
if(typeof window!=='undefined')window.MayaLifeVoice={recognizes,consumeTyped,consumeLive,parseLifeVoice,runLifeVoice};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
