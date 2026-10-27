/* Maya named-app launcher: foreground, user-initiated Android MAIN/LAUNCHER apps.
   Does not need broad QUERY_ALL_PACKAGES or send app inventories to Gemini. */
const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
const aliases={
 'ইমো':'imo','হোয়াটসঅ্যাপ':'whatsapp','হোয়াটসঅ্যাপ':'whatsapp',
 'হোয়াটসঅ্যাপ বিজনেস':'whatsapp business','হোয়াটসঅ্যাপ বিজনেস':'whatsapp business',
 'মেসেঞ্জার':'messenger','ইনস্টাগ্রাম':'instagram','ইনস্টা':'instagram','ফেসবুক':'facebook',
 'ক্রোম':'chrome','গুগল ক্রোম':'chrome','ইউটিউব':'youtube','টিকটক':'tiktok',
 'টেলিগ্রাম':'telegram','গ্যালারি':'gallery','ক্যামেরা':'camera','সেটিংস':'settings',
 'জিমেইল':'gmail','গুগল ম্যাপস':'maps','ম্যাপস':'maps','প্লে স্টোর':'play store',
 'প্লেস্টোর':'play store','বাইন্যান্স':'binance','ক্যালকুলেটর':'calculator',
 'চ্যাটজিপিটি':'chatgpt','স্পটিফাই':'spotify','স্ন্যাপচ্যাট':'snapchat',
 'ইন্সটাগ্রাম':'instagram','ইন্সটা':'instagram','হোয়াটস্যাপ':'whatsapp',
 'ফেইসবুক':'facebook','ফেসবুক মেসেঞ্জার':'messenger',
 'facebook messenger':'messenger','google play':'play store',
 'google play store':'play store','গুগল প্লে স্টোর':'play store',
 'গুগল প্লে':'play store','মোটো ক্যামেরা':'camera','মোটোরোলা ক্যামেরা':'camera'
};
export function normalizeName(value){
 return String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').replace(/\s+/gu,' ').trim();
}
export function targetName(value){
 const cleaned=normalizeName(String(value||'').replace(/(?:\s+অ্যাপ(?:টা|টি)?|\s+app)$/iu,''));
 const shortened=cleaned.replace(/(টা|টি)$/u,'');
 for(const [alias,canonical] of Object.entries(aliases)) { const key=normalizeName(alias); if(key===cleaned||key===shortened)return canonical; }
 return cleaned;
}
export function parseOpenAppCommand(raw){
 const t=String(raw||'').normalize('NFKC').replace(/[।!?]+$/gu,'').trim();
 let install=t.match(/^(?:install|download)\s+(?:the\s+)?(?:app\s+)?(.+?)(?:\s+app)?$/iu);
 if(!install)install=t.match(/^(.+?)\s+(?:ইনস্টল করো|ইনস্টল করে দাও|ডাউনলোড করো|ইনস্টল)$/u);
 if(install){
  const name=String(install[1]).trim().replace(/^[“"'‘]+|[”"'’]+$/gu,'').trim();
  if(name.length<2||name.length>100||!targetName(name)||/https?:\/\/|[\r\n]/iu.test(name))return null;
  return {kind:'appInstall',name};
 }
 let m=t.match(/^(?:open|launch|start|run)\s+(?:(?:the|my)\s+)?(?:app\s+)?(.+?)(?:\s+app)?$/iu);
 if(!m)m=t.match(/^(?:খোলো|ওপেন করো|খুলে দাও|চালু করো)\s+(.+)$/u);
 if(!m)m=t.match(/^(.+?)\s+(?:খোলো|খুলে দাও|খুলে দিও|খুলবে|চালাও|চালু করো|চালু করে দাও|ওপেন করো|ওপেন করে দাও)$/u);
 if(!m)return null;
 const name=String(m[1]).trim().replace(/^[“"'‘]+|[”"'’]+$/gu,'').trim();
 if(!name||name.length>100||!targetName(name))return null;
 return {kind:'appLaunch',name};
}
// Package identities only help select entries that Android actually enumerated.
 // They NEVER authorize blind package launching, installation, or account access.
const preferredPackages={
 'whatsapp':['com.whatsapp'],'whatsapp business':['com.whatsapp.w4b'],
 'imo':['com.imo.android.imoim','com.imo.android.imous'],
 'instagram':['com.instagram.android'],'facebook':['com.facebook.katana','com.facebook.lite'],
 'messenger':['com.facebook.orca','com.facebook.mlite'],
 'play store':['com.android.vending'],
 'camera':['com.motorola.camera3','com.android.camera2','com.google.android.GoogleCamera','org.codeaurora.snapcam'],
 'youtube':['com.google.android.youtube'],
 'chrome':['com.android.chrome'],'maps':['com.google.android.apps.maps']
};
export function rankedMatches(query,apps){
 if(!Array.isArray(apps))return [];
 const canonical=targetName(query),target=normalizeName(canonical);
 if(!target||target.length<2||/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/i.test(String(query).trim()))return [];
 const preferred=preferredPackages[canonical]||[];
 const scored=[];
 for(const a of apps){
  if(!a||typeof a.label!=='string'||typeof a.packageName!=='string'||typeof a.activityName!=='string')continue;
  const label=normalizeName(a.label);
  let score=0;
  if(label===target)score=120;
  else if(label.startsWith(target+' '))score=95;
  else if(label.includes(' '+target+' ')||label.endsWith(' '+target))score=80;
  if(preferred.includes(a.packageName))score=Math.max(score,114);
  if(score)scored.push({...a,score});
 }
 return scored.sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label)||a.packageName.localeCompare(b.packageName)).slice(0,30);
}
export function suggestAppMatches(rawQuery,apps){
 if(!Array.isArray(apps))return [];
 const raw=String(rawQuery||'').trim();
 if(!raw||raw.length>100)return [];
 if(/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/i.test(raw))return [];
 const target=normalizeName(targetName(raw));
 if(!target||target.length<3)return [];
 const close=[];
 for(const a of apps){
  if(!a||typeof a.label!=='string'||typeof a.packageName!=='string'||typeof a.activityName!=='string')continue;
  const label=normalizeName(a.label);
  if(!label||label===target)continue;
  const sim=similarity(target,label);
  if(sim>=0.7)close.push({...a,score:sim});
 }
 return close.sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label)||a.packageName.localeCompare(b.packageName)).slice(0,3);
}
function similarity(a,b){
 const n=a.length,m=b.length;
 if(!n||!m)return 0;
 return 1-levenshtein(a,b)/Math.max(n,m);
}
function levenshtein(a,b){
 if(a===b)return 0;
 if(!a.length)return b.length;
 if(!b.length)return a.length;
 let prev=Array.from({length:b.length+1},(_,j)=>j);
 for(let i=1;i<=a.length;i++){
  const cur=[i];
  for(let j=1;j<=b.length;j++)
   cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a.charCodeAt(i-1)===b.charCodeAt(j-1)?0:1));
  prev=cur;
 }
 return prev[b.length];
}
function nativeBridge(){
 const b=typeof window!=='undefined'?window.MayaBridge:null;
 if(typeof b?.listLaunchableApps!=='function'||typeof b?.launchListedApp!=='function')
  throw Error('App Launcher requires the newly built Maya Android APK. Browser mode cannot open installed apps.');
 return b;
}
export function installedApps(){
 let obj;
 try{obj=JSON.parse(nativeBridge().listLaunchableApps());}
 catch(e){throw Error('Android app list is unavailable: '+String(e?.message||e));}
 if(obj?.status!=='ok'||!Array.isArray(obj.apps))throw Error(String(obj?.message||'Could not read Android launcher apps.'));
 return obj.apps.filter(a=>a&&typeof a.label==='string'&&typeof a.packageName==='string'&&typeof a.activityName==='string').slice(0,1200);
}
/* Documented Google Play links. Opening a listing is NOT an app installation. */
const knownStorePackages={
 'whatsapp':'com.whatsapp',
 'whatsapp business':'com.whatsapp.w4b',
 'imo':'com.imo.android.imoim',
 'messenger':'com.facebook.orca',
 'instagram':'com.instagram.android',
 'telegram':'org.telegram.messenger',
 'youtube':'com.google.android.youtube',
 'maps':'com.google.android.apps.maps',
 'chrome':'com.android.chrome'
};
export function playStoreUrlForApp(name){
 const raw=String(name||'').trim();
 if(raw.length<2||raw.length>100||/[\r\n]/u.test(raw)||/https?:\/\//iu.test(raw))return null;
 const canonical=targetName(raw);
 if(!canonical||/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/iu.test(canonical))return null;
 const packageName=knownStorePackages[canonical];
 return packageName
  ?'https://play.google.com/store/apps/details?id='+packageName
  :'https://play.google.com/store/search?q='+encodeURIComponent(raw)+'&c=apps';
}
export async function openPlayStoreForApp(name){
 const url=playStoreUrlForApp(name);
 if(!url)return 'Play Store request cancelled: enter a valid app name.';
 try{
  const b=typeof window!=='undefined'?window.MayaBridge:null;
  if(typeof b?.control!=='function')
   return 'Play Store request requires Maya Android APK. No installation was attempted.';
  const out=JSON.parse(b.control('OPEN_URL',JSON.stringify({url,pkg:'com.android.vending'})));
  if(out?.status!=='opened')
   return 'Play Store did not open: '+String(out?.message||'Android blocked the link.');
  const kind=url.includes('/details?id=')?'listing':'search';
  return 'Google Play '+kind+' requested for '+String(name).slice(0,100)+'. Check the app identity and tap Install yourself. No app was installed by Maya.';
 }catch(e){return 'Play Store request failed: '+String(e?.message||e);}
}
export function nativeOpen(selected){
 try{
  if(!selected||!selected.packageName||!selected.activityName)throw Error('Select an installed app first.');
  const raw=nativeBridge().launchListedApp(selected.packageName,selected.activityName),response=JSON.parse(raw);
  if(response?.status==='launched')return 'Android launch requested: '+selected.label+'.';
  if(response?.status==='background')return 'ব্যাকগ্রাউন্ড লঞ্চ: "'+selected.label+'" খুলতে নোটিফিকেশনে ট্যাপ করো।';
  if(response?.status==='notification_blocked')return 'App not opened: মায়া-র নোটিফিকেশন পারমিশন চালু করো (Settings → Apps → Maya → Notifications) — তাহলে মায়া ব্যাকগ্রাউন্ডে থাকলেও নোটিফিকেশনে ট্যাপ করে অ্যাপ খোলা যাবে।';
  return 'App not opened: '+String(response?.message||'Android declined.');
 }catch(e){return 'App not opened: '+String(e?.message||e);}
}
let promptBusy=false;
async function choose(matches,reason){
 if(promptBusy)return 'App selection already pending.';
 const shell=$('mayaAppChooser'),options=$('mayaAppChoices'),caption=$('mayaAppChoiceCaption');
 if(!shell||!options||!caption)return 'Multiple app matches; open Settings → Installed Apps to choose.';
 promptBusy=true;shell.hidden=false;options.replaceChildren();caption.textContent=reason;
 return new Promise(resolve=>{
  let finished=false;
  const finish=value=>{
   if(finished)return;finished=true;promptBusy=false;
   clearTimeout(expiry);shell.hidden=true;options.replaceChildren();
   if($('mayaAppCancel'))$('mayaAppCancel').onclick=null;
   resolve(value);
  };
  for(const a of matches.slice(0,10)){
   const button=document.createElement('button');button.className='btn';
   button.style.cssText='display:block;margin:7px 0;width:100%;text-align:left';
   button.textContent=a.label+' ('+a.packageName+')';
   button.onclick=()=>finish(nativeOpen(a));
   options.append(button);
  }
  $('mayaAppCancel').onclick=()=>finish('App selection cancelled.');
  const expiry=setTimeout(()=>finish('App selection timed out.'),30000);
  const visibility=()=>{if(document.hidden){document.removeEventListener('visibilitychange',visibility);finish('App selection closed when Maya went into background.');}};
  document.addEventListener('visibilitychange',visibility,{once:true});
 });
}
export async function openNamedApp(name){
 try{
  const apps=installedApps(),found=rankedMatches(name,apps);
  if(!found.length){
   const close=suggestAppMatches(name,apps);
   if(close.length)return await choose(close,'নামটা হুবহু মেলেনি: "'+String(name).slice(0,80)+'"। এইটা কি বুঝিয়েছ? খুলতে নামে ট্যাপ করো — ট্যাপ না করা পর্যন্ত কোনো অ্যাপ খোলবে না।');
   return 'No visible installed app named "'+String(name).slice(0,80)+'". Check spelling or the Installed Apps list in Maya Settings.';
  }
  // A single clearly named app opens on the spoken command; only genuinely
  // ambiguous choices require a tap (including duplicate camera/activity labels).
  const best=found[0],runnerUp=found[1];
  if(best.score>=80&&(!runnerUp||best.score>runnerUp.score))return nativeOpen(best);
  return await choose(found,'Which installed app did you mean? Tap its name to open. No app will open until selected.');
 }catch(e){return String(e?.message||e);}
}
function mount(){
 const host=document.querySelector('#setSheet .body');if(!host||$('mayaAppLauncherOpen'))return;
 const block=document.createElement('section');
 block.style.cssText='margin:12px 0;padding:12px;border:1px solid #5889a9;border-radius:13px';
 const opener=document.createElement('button');opener.id='mayaAppLauncherOpen';opener.className='btn';
 opener.textContent='Installed Apps • Open by Name';
 const wrap=document.createElement('section');wrap.hidden=true;
 const note=document.createElement('p');note.className='note';
 note.textContent='Say “Maya open WhatsApp”, “মায়া ইনস্টাগ্রাম খোলো”, “মায়া ফেসবুক ওপেন করো”, or any installed visible app name. Turn ON Unified Life Voice in Settings first. One clear match opens directly; duplicate names require choosing the right app. If Maya is behind another app, Android may require tapping the launch notification. Clone/work-profile apps may not be visible. No broad app permissions.';
 const input=document.createElement('input');input.id='mayaAppName';input.className='inp wide';input.maxLength=100;
 input.placeholder='Installed app name (e.g. WhatsApp)';
 const open=document.createElement('button');open.textContent='Open by name';open.className='btn pri';
 const list=document.createElement('button');list.textContent='Find installed apps';list.className='btn';
 const store=document.createElement('button');store.textContent='Find in Google Play';store.className='btn';
 const bgNotify=document.createElement('button');bgNotify.id='mayaAppBgNotify';bgNotify.textContent='ব্যাকগ্রাউন্ড লঞ্চ নোটিফিকেশন চালু করো';bgNotify.className='btn';
 const diagnose=document.createElement('button');diagnose.id='mayaAppVoiceStatus';diagnose.className='btn';diagnose.textContent='Last background voice app result';
 const count=document.createElement('p');count.id='mayaAppStatus';count.setAttribute('role','status');
 const suggestions=document.createElement('div');suggestions.id='mayaAppList';
 wrap.append(note,input,open,store,list,bgNotify,diagnose,count,suggestions);
 block.append(opener,wrap);host.append(block);
 const overlay=document.createElement('section');overlay.id='mayaAppChooser';overlay.hidden=true;
 overlay.style.cssText='position:fixed;z-index:100800;left:5%;right:5%;top:14%;max-height:70vh;overflow:auto;padding:14px;color:white;background:#111b30;border:1px solid #7199ff;border-radius:14px;box-shadow:0 12px 35px #000b';
 const title=document.createElement('strong');title.textContent='Choose app';
 const prompt=document.createElement('p');prompt.id='mayaAppChoiceCaption';
 const buttons=document.createElement('div');buttons.id='mayaAppChoices';
 const cancel=document.createElement('button');cancel.id='mayaAppCancel';cancel.className='btn bad';cancel.textContent='Cancel';
 overlay.append(title,prompt,buttons,cancel);document.body.append(overlay);
 const say=s=>{count.textContent=s;const status=$('lifeVoiceStatus');if(status)status.textContent=s;};
 function render(){
  suggestions.replaceChildren();
  try{
   const all=installedApps(),query=input.value.trim();
   const entries=query?rankedMatches(query,all):all.slice(0,70);
   say('Android returned '+all.length+' launchable app entries; showing '+entries.length+(query?' matches':' entries')+'.');
   for(const a of entries.slice(0,70)){
    const b=document.createElement('button');b.className='btn';
    b.style.cssText='display:block;margin:5px 0;text-align:left;width:100%';
    b.textContent=a.label+' ('+a.packageName+')';
    b.onclick=()=>say(nativeOpen(a));suggestions.append(b);
   }
   if(!entries.length)suggestions.textContent='No matches. System-hidden apps may not be visible.';
  }catch(e){say(String(e?.message||e));}
 }
 opener.onclick=()=>{wrap.hidden=!wrap.hidden;if(!wrap.hidden)render();};
 list.onclick=render;
 bgNotify.onclick=()=>{
  const bridge=typeof window!=='undefined'?window.MayaBridge:null;
  if(typeof bridge?.requestLaunchNotifications!=='function')return say('নতুন Maya APK লাগবে (এই ফিচারটি ব্রাউজারে নেই)।');
  try{
   const response=JSON.parse(bridge.requestLaunchNotifications());
   if(response?.status==='granted')say('নোটিফিকেশন চালু আছে — ব্যাকগ্রাউন্ডেও অ্যাপ খোলার নোটিফিকেশন আসবে।');
   else if(response?.status==='requested')say('নোটিফিকেশন পারমিশনের অনুরোধ পাঠানো হয়েছে — Allow চেপে চালু করো।');
   else if(response?.status==='blocked')say('নোটিফিকেশন বন্ধ আছে — Settings → Apps → Maya → Notifications থেকে চালু করো।');
   else say('এখন পারমিশন চাওয়া যায়নি; মায়া খোলা অবস্থায় আবার চাপো।');
  }catch(e){say('নোটিফিকেশন পারমিশন চাওয়া যায়নি: '+String(e?.message||e));}
 };
 diagnose.onclick=()=>{
  try{
   const native=typeof window!=='undefined'?window.MayaBridge:null;
   if(typeof native?.appVoiceDiagnostics!=='function')return say('This diagnostic requires the updated Maya Android APK.');
   const r=JSON.parse(native.appVoiceDiagnostics());
   const when=r.time?new Date(r.time).toLocaleString():'never';
   say('Background voice app command ('+when+'): '+String(r.last||r.message||'No result').slice(0,400));
  }catch(e){say('App voice diagnostic unavailable: '+String(e?.message||e));}
 };
 open.onclick=async()=>{if(!input.value.trim())return say('Enter an app name first.');say(await openNamedApp(input.value.trim()));};
 store.onclick=async()=>{if(!input.value.trim())return say('Enter an app name first.');say(await openPlayStoreForApp(input.value.trim()));};
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();open.click();}});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
