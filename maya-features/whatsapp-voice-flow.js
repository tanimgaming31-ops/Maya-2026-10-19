/* Maya WhatsApp Voice Compose: foreground voice conversation, one verified chat,
   one explicitly approved message. No draft stored and no unattended sending. */
const norm=v=>String(v??'').normalize('NFKC').replace(/[।!?]+$/gu,'').replace(/\s+/gu,' ').trim();
const unwake=v=>norm(v).replace(/^(?:(?:hey\s+)?maya|মায়া|মায়া|মাইয়া|মাইয়া)\s*[,،:]?\s*/iu,'').trim();
export const isStart=v=>{
 const t=unwake(v).replace(/^(?:তুমি\s+)?(?:আমার\s+)?/u,'');
 if(unwake(v).length===norm(v).length)return false;
 return /^(?:(?:open|start|compose|message)\s+(?:my\s+|the\s+)?whatsapp(?:\s+(?:chat|message))?|(?:আমার\s+)?(?:whatsapp|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ|হোয়াটস্যাপ)\s+(?:খোলো|খুলো|ওপেন করো|মেসেজ করো|মেসেজ পাঠাও|মেসেজ লিখো|খুলে দাও))$/iu.test(t);
};
const stop=v=>/^(?:cancel|stop|বাতিল|থামো|মেসেজ বাতিল করো|মেসেজ বন্ধ করো)$/iu.test(unwake(v));
const confirm=v=>/^(?:yes send|yes send it|send it|confirm send|হ্যাঁ পাঠাও|হ্যা পাঠাও|হ্যাঁ মেসেজ পাঠাও|পাঠিয়ে দাও|পাঠিয়ে দাও|সেন্ড করো|হ্যাঁ সেন্ড করো)$/iu.test(unwake(v));
export const isStatus=v=>/^(?:whatsapp message status|check whatsapp status|whatsapp মেসেজ স্ট্যাটাস|হোয়াটসঅ্যাপ মেসেজ স্ট্যাটাস|হোয়াটসঅ্যাপ মেসেজ স্ট্যাটাস|মেসেজ স্ট্যাটাস)$/iu.test(unwake(v));
export const parseLanguage=v=>{
 const t=unwake(v).toLowerCase();
 if(/^(?:spanish|español|espanol|স্প্যানিশ)$/iu.test(t))return 'disabled';
 const choices=[
 ['বাংলা',/^(?:বাংলা|বাংলায়|বাংলায়|bangla|bengali)$/iu],
 ['English',/^(?:english|ইংরেজি|ইংলিশ)$/iu],
 ['Hindi',/^(?:hindi|হিন্দি|हिंदी)$/iu],
 ['Urdu',/^(?:urdu|উর্দু)$/iu],
 ['Tagalog',/^(?:tagalog|filipino|ফিলিপিনো|তাগালগ)$/iu],
 ['Indonesian',/^(?:indonesian|bahasa indonesia|ইন্দোনেশিয়ান|ইন্দোনেশিয়ান)$/iu],
 ['Arabic',/^(?:arabic|আরবি|العربية)$/iu],
 ['Malay',/^(?:malay|bahasa melayu|মালয়)$/iu],
 ['French',/^(?:french|ফরাসি)$/iu],
 ['German',/^(?:german|জার্মান)$/iu],
 ['Japanese',/^(?:japanese|জাপানি)$/iu],
 ['Korean',/^(?:korean|কোরিয়ান)$/iu],
 ['Tamil',/^(?:tamil|তামিল)$/iu]
 ];
 return choices.find(x=>x[1].test(t))?.[0]||null;
};
const restricted=t=>/https?:\/\/|intent:|(?:^|\s)(?:otp|cvv|password|passcode|ওটিপি|পাসওয়ার্ড)(?:\s|$)/iu.test(t);
export const validRecipient=t=>t.length>=2&&t.length<=70&&!/[\r\n<>]/u.test(t)&&!/^\d+$/u.test(t)&&!restricted(t);
const native=(action,args={})=>{
 if(typeof window==='undefined'||typeof window.MayaBridge?.control!=='function')return {status:'unavailable',message:'Install Maya Android APK.'};
 try{return JSON.parse(window.MayaBridge.control(action,JSON.stringify(args)));}
 catch{return {status:'error',message:'Android bridge not responding.'};}
};
let flow=null,working=false;
export const stage=()=>flow?.step||'idle';
export const state=()=>flow?{step:flow.step,recipient:flow.recipient,language:flow.language}:null;
const refresh=()=>{
 if(typeof document==='undefined')return;
 const p=document.getElementById('mayaWhatsAppFlow'),info=document.getElementById('mayaWhatsAppFlowInfo'),yes=document.getElementById('mayaWhatsAppConfirm');
 if(!p||!info)return;
 p.hidden=!flow;
 if(yes)yes.hidden=flow?.step!=='confirm';
 if(flow)info.textContent='Step: '+flow.step+'\nRecipient: '+(flow.recipient||'not chosen')+'\nLanguage: '+(flow.language||'not chosen')+(flow.step==='confirm'?'\nExact draft: '+flow.text:'');
};
function clear(){flow=null;working=false;refresh();}
export function begin(){
 if(flow)return 'WhatsApp মেসেজের কাজ চলছে। পরের উত্তর বলো, অথবা বাতিল করো।';
 flow={step:'recipient',recipient:'',original:'',language:'',text:''};refresh();
 return 'WhatsApp-এ কাকে মেসেজ পাঠাতে চাও? চ্যাটে যে নাম দেখা যায় সেই নাম বলো।';
}
export async function process(input,services={}){
 if(isStatus(input)){
  const o=services.status?await services.status():native('V66_STATUS');
  return 'WhatsApp: '+String(o?.message||o?.status||'Unknown').slice(0,300);
 }
 if(!flow)return isStart(input)?begin():null;
 if(working)return 'অনুবাদের কাজ চলছে।';
 if(stop(input)){clear();return 'মেসেজ বাতিল করেছি। কিছু পাঠানো হয়নি।';}
 const t=unwake(input);
 if(flow.step==='recipient'){
  const name=t.replace(/^(?:name|contact|to|নাম|নামটা)\s*[:：]?\s*/iu,'').trim();
  if(!validRecipient(name))return 'চ্যাটের সঠিক নাম বলো, দুই থেকে সত্তর অক্ষরের মধ্যে।';
  flow.recipient=name;flow.step='dictate';refresh();
  return name+'-কে এখন কী লিখব? মেসেজটি বলো।';
 }
 if(flow.step==='dictate'){
  const message=t.replace(/^(?:লিখো|লেখো|টাইপ করো|type|write)\s*[:：]?\s*/iu,'').trim();
  if(!message||message.length>500||restricted(message))return 'সাধারণ একটি মেসেজ বলো, সর্বোচ্চ ৫০০ অক্ষর। OTP বা পাসওয়ার্ড নয়।';
  flow.original=message;flow.step='language';refresh();
  return 'কোন ভাষায় লিখব? যেমন বাংলা, English, Hindi, Tagalog, Indonesian অথবা Urdu বলো।';
 }
 if(flow.step==='language'){
  const lang=parseLanguage(t);
  if(lang==='disabled')return 'Spanish ভাষায় মেসেজ বন্ধ আছে। অন্য ভাষা বলো।';
  if(!lang)return 'ভাষাটি বুঝিনি। বাংলা, English, Hindi, Tagalog, Indonesian, Urdu বা Arabic বলো।';
  flow.language=lang;working=true;flow.step='translating';refresh();
  try{
   const translated=String(await (services.translate?services.translate(flow.original,lang):window.MayaWhatsAppTranslator?.translate(flow.original,lang))||'').trim();
   if(!translated||translated.length>500||restricted(translated)){flow.step='language';return 'ভাষা পরিবর্তন করা যায়নি। আবার ভাষা বলো।';}
   flow.text=translated;flow.step='confirm';
   return 'যাচাই করো। প্রাপক '+flow.recipient+'। ভাষা '+lang+'। মেসেজ: '+translated+'। ঠিক থাকলে স্পষ্ট বলো “হ্যাঁ পাঠাও”, অথবা “বাতিল”।';
  }catch(e){flow.step='language';return 'Gemini দিয়ে ভাষা পরিবর্তন হয়নি। আরেকবার ভাষা বলো। কিছু পাঠানো হয়নি।';}
  finally{working=false;refresh();}
 }
 if(flow.step==='confirm'){
  if(!confirm(t))return 'নিশ্চিত অনুমতি পাইনি। “হ্যাঁ পাঠাও” বলো, অথবা বাতিল করো।';
  const data={...flow};clear();
  const o=services.send?await services.send(data):native('V66_START',{app:'whatsapp',name:data.recipient,message:data.text,send:true,confirmed:true});
  if(o?.status==='pending')return 'WhatsApp-এ '+data.recipient+'-এর চ্যাট খুঁজে একটি মেসেজ পাঠানোর চেষ্টা চলছে। WhatsApp-এ দেখে নিশ্চিত করো; ডেলিভারি নিশ্চিত নয়।';
  return 'WhatsApp: '+String(o?.message||o?.status||'Failed').slice(0,300)+'। কোনো ডেলিভারি নিশ্চিত নয়।';
 }
 return 'অবস্থা অজানা। মেসেজ বাতিল করে আবার শুরু করো।';
}
export const recognizes=v=>Boolean(flow)||isStart(v)||isStatus(v);
function show(t){if(typeof document!=='undefined'){const e=document.getElementById('sub');if(e)e.textContent=String(t||'').slice(0,1200);}}
function liveSay(text){if(typeof speechSynthesis==='undefined')return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text).slice(0,900));u.lang='bn-BD';speechSynthesis.speak(u);}catch{}}
function mount(){
 if(typeof document==='undefined'||document.getElementById('mayaWhatsAppFlow'))return;
 const p=document.createElement('section');p.id='mayaWhatsAppFlow';p.hidden=true;
 p.style.cssText='position:fixed;bottom:104px;left:10px;right:10px;max-height:36dvh;overflow:auto;z-index:4000;background:#06141bef;border:1px solid #3bc59e;border-radius:14px;color:#eff;padding:12px;font:14px system-ui';
 const title=document.createElement('strong');title.textContent='Maya · WhatsApp voice message';
 const info=document.createElement('p');info.id='mayaWhatsAppFlowInfo';info.style.whiteSpace='pre-wrap';
 const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.className='btn';cancel.onclick=()=>{clear();show('WhatsApp message cancelled. Nothing sent.');};
 const yes=document.createElement('button');yes.id='mayaWhatsAppConfirm';yes.textContent='Confirm and send one message';yes.hidden=true;yes.className='btn';yes.onclick=()=>{void process('হ্যাঁ পাঠাও').then(show);};
 p.append(title,info,cancel,yes);document.body.append(p);refresh();
}
function install(){
 if(typeof window==='undefined'||!window.MayaLifeVoice||window.MayaLifeVoice.__whatsAppFlow)return;
 const previous={...window.MayaLifeVoice};
 const parse=t=>recognizes(t)?{kind:'mayaWhatsAppVoice',text:t}:previous.parseLifeVoice(t);
 const run=async c=>{if(c?.kind!=='mayaWhatsAppVoice')return previous.runLifeVoice(c);const out=await process(c.text);show(out);return out;};
 window.MayaLifeVoice={...previous,__whatsAppFlow:true,
  recognizes:t=>recognizes(t)||previous.recognizes(t),
  parseLifeVoice:parse,runLifeVoice:run,
  consumeTyped(t){if(!recognizes(t))return previous.consumeTyped(t);void run({kind:'mayaWhatsAppVoice',text:t});return true;},
  consumeLive(t){if(!recognizes(t))return previous.consumeLive(t);void run({kind:'mayaWhatsAppVoice',text:t}).then(liveSay);return true;}
 };
}
if(typeof window!=='undefined'){
 window.MayaWhatsAppFlow=Object.freeze({process,begin,state,stage});
 install();
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
}
