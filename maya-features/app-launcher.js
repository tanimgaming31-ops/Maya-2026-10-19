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
 'চ্যাটজিপিটি':'chatgpt','স্পটিফাই':'spotify','স্ন্যাপচ্যাট':'snapchat'
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
 let m=t.match(/^(?:open|launch|start|run)\s+(?:(?:the|my)\s+)?(?:app\s+)?(.+?)(?:\s+app)?$/iu);
 if(!m)m=t.match(/^(.+?)\s+(?:খোলো|খুলে দাও|খুলে দিও|চালু করো|চালু করে দাও|ওপেন করো|ওপেন করে দাও)$/u);
 if(!m)return null;
 const name=String(m[1]).trim().replace(/^[“"'‘]+|[”"'’]+$/gu,'').trim();
 if(!name||name.length>100||!targetName(name))return null;
 return {kind:'appLaunch',name};
}
export function rankedMatches(query,apps){
 if(!Array.isArray(apps))return [];
 const target=normalizeName(targetName(query));
 if(!target||target.length<2)return [];
 const scored=[];
 for(const a of apps){
  if(!a||typeof a.label!=='string'||typeof a.packageName!=='string'||typeof a.activityName!=='string')continue;
  const label=normalizeName(a.label);
  let score=0;
  if(label===target)score=120;
  else if(label.startsWith(target+' '))score=95;
  else if(label.includes(' '+target+' ')||label.endsWith(' '+target))score=80;
  // No Levenshtein, package guessing or automatic launches from weak matches.
  if(score)scored.push({...a,score});
 }
 return scored.sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label)||a.packageName.localeCompare(b.packageName)).slice(0,30);
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
export function nativeOpen(selected){
 try{
  if(!selected||!selected.packageName||!selected.activityName)throw Error('Select an installed app first.');
  const raw=nativeBridge().launchListedApp(selected.packageName,selected.activityName),response=JSON.parse(raw);
  if(response?.status==='launched')return 'Android launch requested: '+selected.label+'.';
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
  if(!found.length)return 'No visible installed app named "'+String(name).slice(0,80)+'". Check spelling or the Installed Apps list in Maya Settings.';
  if(found[0].score===120&&(found.length===1||found[1].score<120))return nativeOpen(found[0]);
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
 note.textContent='Open installed apps from Maya. Say "Maya, open WhatsApp" / "মায়া, ইমো খোলো" in Maya Voice Call, or type in chat. Enable Unified Life Voice in Settings. Android system may hide some apps or separate work profiles. No QUERY_ALL_PACKAGES.';
 const input=document.createElement('input');input.id='mayaAppName';input.className='inp wide';input.maxLength=100;
 input.placeholder='Installed app name (e.g. WhatsApp)';
 const open=document.createElement('button');open.textContent='Open by name';open.className='btn pri';
 const list=document.createElement('button');list.textContent='Find installed apps';list.className='btn';
 const count=document.createElement('p');count.id='mayaAppStatus';count.setAttribute('role','status');
 const suggestions=document.createElement('div');suggestions.id='mayaAppList';
 wrap.append(note,input,open,list,count,suggestions);
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
 open.onclick=async()=>{if(!input.value.trim())return say('Enter an app name first.');say(await openNamedApp(input.value.trim()));};
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();open.click();}});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
