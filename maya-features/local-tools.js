/* Maya's single in-call command route for PC-free Android features.
   Keep existing screenshot, media, app-launch and memory routes untouched.
   No separate interface, no new toggle, no remote gateway. */
export function parseLocalVoice(raw) {
 const text=String(raw||'').normalize('NFKC').replace(/[০-৯]/gu,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c))).replace(/^(?:you|আপনি)\s*:\s*/iu,'')
   .replace(/[।!?]+$/gu,'').replace(/\s+/gu,' ').trim();
 if(text.length>700)return null;
 const body=text.replace(/^(?:(?:hey\s+)?maya|মায়া|মায়া|মাইয়া|মাইয়া)\s*[,،:]?\s+/iu,'').trim();
 const t=body.toLowerCase();
 if(/^(?:device info|phone info|show (?:my )?phone (?:info|details)|ফোনের তথ্য|ফোনের ইনফো|ফোনের ডিটেলস)$/iu.test(t))return {action:'LOCAL_DEVICE'};
 if(/^(?:battery status|check battery|battery level|ব্যাটারি কত|ব্যাটারির চার্জ কত)$/iu.test(t))return {action:'LOCAL_DEVICE'};
 if(/^(?:wi-?fi status|check wi-?fi|is wi-?fi connected|ওয়াইফাই স্ট্যাটাস|ওয়াইফাই স্ট্যাটাস|ওয়াইফাই কানেক্ট আছে|ওয়াইফাই কানেক্ট আছে)$/iu.test(t))return {action:'LOCAL_WIFI'};
 if(/^(?:volume status|check volume|media volume|ভলিউম কত|মিডিয়া ভলিউম কত|মিডিয়া ভলিউম কত)$/iu.test(t))return {action:'LOCAL_VOLUME_GET'};
 if(/^(?:torch on|flashlight on|turn on (?:the )?(?:torch|flashlight)|টর্চ (?:জ্বালাও|অন করো|চালু করো)|লাইট জ্বালাও)$/iu.test(t))return {action:'FLASHLIGHT_ON'};
 if(/^(?:torch off|flashlight off|turn off (?:the )?(?:torch|flashlight)|টর্চ (?:বন্ধ করো|অফ করো|নিভাও)|লাইট বন্ধ করো)$/iu.test(t))return {action:'FLASHLIGHT_OFF'};
 let m=t.match(/^(?:set )?(?:media )?volume (?:to )?(\d{1,3})(?:\s*(?:percent|%))?$/iu) ||
       t.match(/^(?:ভলিউম|মিডিয়া ভলিউম|মিডিয়া ভলিউম)\s*(\d{1,3})\s*(?:পারসেন্ট|%|এ)?\s*(?:করো|দাও|সেট করো)$/u);
 if(m && Number(m[1])>=0 && Number(m[1])<=100)return {action:'LOCAL_VOLUME_SET',percent:Number(m[1])};
 if(/^(?:choose folder|select folder|pick folder|ফোল্ডার (?:সিলেক্ট করো|বেছে নাও|নির্বাচন করো))$/iu.test(t))return {action:'FILES_PICK'};
 if(/^(?:list files|show files|list folder|show folder|ফাইলগুলো দেখাও|ফাইলের তালিকা দেখাও|ফোল্ডার দেখাও)$/iu.test(t))return {action:'FILES_LIST'};
 if(/^(?:check (?:file )?delete (?:status|result)|ফাইল ডিলিটের অবস্থা দেখাও)$/iu.test(t))return {action:'LOCAL_DELETE_STATUS'};
 m=t.match(/^(?:read|open|show) (?:text )?file ([A-Za-z0-9 _.-]{1,80}\.txt)$/iu) ||
   t.match(/^([A-Za-z0-9 _.-]{1,80}\.txt)\s+ফাইল(?:টা|টি)?\s+(?:পড়ো|পড়ে শোনাও|দেখাও)$/iu);
 if(m && validFile(m[1]))return {action:'LOCAL_FILE_READ',name:m[1]};
 m=t.match(/^(?:delete|remove) (?:text )?file ([A-Za-z0-9 _.-]{1,80}\.txt)$/iu) ||
   t.match(/^([A-Za-z0-9 _.-]{1,80}\.txt)\s+ফাইল(?:টা|টি)?\s+(?:মুছে দাও|ডিলিট করো)$/iu);
 if(m && validFile(m[1]))return {action:'LOCAL_FILE_DELETE',name:m[1]};
 m=body.match(/^save file ([A-Za-z0-9 _.-]{1,80}\.txt) with (.{1,500})$/iu);
 if(m&&validFile(m[1]))return {action:'FILES_SAVE_TEXT',name:m[1],text:m[2]};
 return null; // Unknown requests go to Maya's existing natural chat/tool stack.
}
function validFile(name){return /^[A-Za-z0-9 _.-]{1,80}\.txt$/iu.test(name)&&!name.startsWith('.')&&!name.includes('..');}
export function invokeLocal(action,options={}) {
 const allowed=new Set(['LOCAL_DEVICE','LOCAL_WIFI','LOCAL_VOLUME_GET','LOCAL_VOLUME_SET',
   'FLASHLIGHT_ON','FLASHLIGHT_OFF','FILES_PICK','FILES_LIST','LOCAL_FILE_READ',
   'LOCAL_FILE_DELETE','LOCAL_DELETE_STATUS','FILES_SAVE_TEXT']);
 if(!allowed.has(action))throw Error('Unknown phone action.');
 const bridge=typeof window==='undefined'?null:window.MayaBridge;
 const method=action.startsWith('LOCAL_')||action.startsWith('FILES_')?'v54':'control';
 if(typeof bridge?.[method]!=='function')throw Error('Install the updated Maya Android APK; browser mode cannot control phone hardware.');
 let result;
 try{result=JSON.parse(bridge[method](action,JSON.stringify(options)));}
 catch{throw Error('Maya Android did not return a valid result.');}
 if(!result||typeof result.status!=='string')throw Error('Maya Android action returned no status.');
 return result;
}
export function describeLocal(command,result) {
 if(!['ok','created','requested'].includes(result.status))return 'Maya could not do that: '+(result.message||result.status);
 switch(command.action){
  case 'LOCAL_DEVICE': return 'Your phone is '+(result.model||'unknown model')+', Android '+(result.android||'unknown')+
    (Number.isFinite(Number(result.batteryPercent))?', battery '+result.batteryPercent+' percent.':' Battery status unavailable.');
  case 'LOCAL_WIFI': return result.wifiConnected?'Your phone is connected to Wi-Fi.':result.cellularConnected?'Wi-Fi is not the active connection. Your phone is using mobile data.':'Wi-Fi is not the active connection.';
  case 'LOCAL_VOLUME_GET':case 'LOCAL_VOLUME_SET':return Number.isFinite(Number(result.percent))?'Media volume is '+result.percent+' percent.':(result.message||'Volume unavailable.');
  case 'FILES_LIST': {
    const files=Array.isArray(result.items)?result.items:[];
    return 'I found '+files.length+' items in your approved folder.'+(files.length?' First: '+files.slice(0,4).map(f=>String(f.name||'').slice(0,80)).join(', ')+'.':'');
  }
  case 'LOCAL_FILE_READ':{
    const txt=String(result.text||'');
    return txt.length?'File '+command.name+' says: '+txt.slice(0,350)+(txt.length>350?' ... the rest is not read aloud.':''):'File '+command.name+' is empty.';
  }
  case 'FILES_PICK':return 'Please choose and approve a folder in Android.';
  case 'LOCAL_FILE_DELETE':return 'Android will ask whether to delete '+command.name+'. Nothing has been deleted yet.';
  case 'FILES_SAVE_TEXT':return result.status==='created'?'Created the text file in your chosen folder.':(result.message||result.status);
  default:return String(result.message||result.status);
 }
}
async function execute(command){
 try {
  if(command.action==='FILES_SAVE_TEXT'&&!window.confirm('Save '+command.name+' as a new text file in your approved Android folder?'))return 'File save cancelled.';
  // Android's own AlertDialog separately confirms deletion; no silent deletes.
  const result=invokeLocal(command.action,command.percent===undefined?
    (command.name?{name:command.name,text:command.text}:{}):{percent:command.percent});
  return describeLocal(command,result);
 }catch(e){return 'Phone command unavailable: '+String(e?.message||e);}
}
function display(text){
 if(typeof document==='undefined')return;
 const status=document.getElementById('sub');if(status)status.textContent=String(text).slice(0,800);
 const existing=document.getElementById('lifeVoiceStatus');if(existing)existing.textContent=String(text).slice(0,800);
}
export function attachLocalVoice(){
 const previous=typeof window==='undefined'?null:window.MayaLifeVoice;
 if(!previous||previous.__localPhoneVoiceUnified)return false;
 if(!['recognizes','parseLifeVoice','runLifeVoice','consumeTyped','consumeLive'].every(k=>typeof previous[k]==='function'))return false;
 const dispatch=async c=>{const reply=await execute(c);display(reply);return reply;};
 const prev={...previous};
 window.MayaLifeVoice={...previous,__localPhoneVoiceUnified:true,
  recognizes(text){return Boolean(parseLocalVoice(text)||prev.recognizes(text));},
  parseLifeVoice(text){const cmd=parseLocalVoice(text);return cmd?{kind:'mayaLocal',command:cmd}:prev.parseLifeVoice(text);},
  runLifeVoice(c){return c?.kind==='mayaLocal'?dispatch(c.command):prev.runLifeVoice(c);},
  consumeTyped(text){const cmd=parseLocalVoice(text);if(!cmd)return prev.consumeTyped(text);void dispatch(cmd);return true;},
  consumeLive(text){const cmd=parseLocalVoice(text);if(!cmd)return prev.consumeLive(text);void dispatch(cmd);return true;}
 };
 return true;
}
// Imported LAST by advanced-loader. Existing voice/call controls stay inside Maya.
if(typeof window!=='undefined')attachLocalVoice();
