/* Brahma PC-free subset; all actions use existing Maya Android bridge. No remote gateway. */
export function parseLocalVoice(text) {
 const v=String(text||'').trim().replace(/[।!?]+$/gu,'').replace(/\s+/g,' ');
 const m=v.match(/^(?:hey\s+)?(?:maya|মায়া|মায়া)\s*[,،:]?\s+(.+)$/iu);
 if(!m||v.length>200)return null;const c=m[1].toLowerCase();
 if(/^(device info|phone info|ফোনের তথ্য|ফোনের ইনফো)$/.test(c))return {action:'LOCAL_DEVICE'};
 if(/^(wi-?fi status|check wi-?fi|ওয়াইফাই স্ট্যাটাস|ওয়াইফাই স্ট্যাটাস)$/.test(c))return {action:'LOCAL_WIFI'};
 if(/^(battery status|check battery|ব্যাটারি কত)$/.test(c))return {action:'LOCAL_DEVICE'};
 if(/^(volume status|check volume|ভলিউম কত)$/.test(c))return {action:'LOCAL_VOLUME_GET'};
 if(/^(torch on|flashlight on|টর্চ চালু করো)$/.test(c))return {action:'FLASHLIGHT_ON'};
 if(/^(torch off|flashlight off|টর্চ বন্ধ করো)$/.test(c))return {action:'FLASHLIGHT_OFF'};
 const match=c.match(/^(?:set )?(?:media )?volume (?:to )?(\d{1,3})(?:\s*(?:percent|%))?$/);
 if(match&&Number(match[1])<=100)return {action:'LOCAL_VOLUME_SET',percent:Number(match[1])};
 return null;
}
export function invokeLocal(action,options={}) {
 const b=typeof window==='undefined'?null:window.MayaBridge;
 const method=action.startsWith('LOCAL_')||action.startsWith('FILES_')?'v54':'control';
 if(typeof b?.[method]!=='function')throw Error('Requires the updated Maya Android APK (not the browser/PWA).');
 let r;try{r=JSON.parse(b[method](action,JSON.stringify(options)));}catch{throw Error('Android returned invalid JSON.');}
 if(!r||typeof r.status!=='string')throw Error('No valid Android command status.');
 return r;
}
const $=id=>document.getElementById(id);
function report(value){const out=$('mayaLocalResult');if(out)out.textContent=typeof value==='string'?value:JSON.stringify(value,null,2);}
function call(action,params={}){
 try{const r=invokeLocal(action,params);report(r);return r;}
 catch(e){report('Unavailable: '+e.message);return null;}
}
function field(id){return String($(id)?.value||'').trim();}
function fileName(){const v=field('mayaLocalFilename');if(!/^[A-Za-z0-9 _.-]{1,80}\.txt$/.test(v)||v.startsWith('.')||v.includes('..'))throw Error('Use a simple .txt filename without path segments.');return v;}
function addButton(target,label,onClick){
 const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;
 b.addEventListener('click',()=>{try{onClick();}catch(e){report('Cannot run: '+e.message);}});target.append(b);
}
function addInput(target,id,hint,type='text'){
 const i=document.createElement('input');i.id=id;i.className='inp';i.placeholder=hint;i.type=type;target.append(i);return i;
}
function group(target,items){const row=document.createElement('div');row.className='krow';for(const [label,fn] of items)addButton(row,label,fn);target.append(row);}
function mount(){
 if($('mayaLocalPanel'))return;
 const host=document.querySelector('#setSheet .body');if(!host)return;
 const panel=document.createElement('section');panel.id='mayaLocalPanel';panel.style.cssText='border:1px solid var(--line,#456);border-radius:12px;padding:12px;margin:14px 0';
 const title=document.createElement('h3');title.textContent='Maya · PC-free Phone Tools';panel.append(title);
 const info=document.createElement('p');info.className='note';info.textContent='New Android APK only. Phone controls run locally; files stay within the Android folder you choose. Existing Maya controls and Memory stay intact.';panel.append(info);
 group(panel,[['Device + battery',()=>call('LOCAL_DEVICE')],['Wi-Fi status',()=>call('LOCAL_WIFI')],['Volume status',()=>call('LOCAL_VOLUME_GET')]]);
 const volume=addInput(panel,'mayaLocalVolume','Media volume 0–100','number');volume.min='0';volume.max='100';volume.value='50';
 group(panel,[['Set media volume',()=>{const v=field('mayaLocalVolume');if(!/^(100|[1-9]?\d)$/.test(v))throw Error('Choose 0–100.');call('LOCAL_VOLUME_SET',{percent:Number(v)});}],['Torch on',()=>call('FLASHLIGHT_ON')],['Torch off',()=>call('FLASHLIGHT_OFF')]]);
 addInput(panel,'mayaLocalUrl','https://example.com');
 group(panel,[['Open HTTPS URL',()=>{const v=field('mayaLocalUrl'),u=new URL(v);if(u.protocol!=='https:'||!u.hostname)throw Error('HTTPS address required.');call('OPEN_URL',{url:v});}]]);
 addInput(panel,'mayaLocalFilename','example.txt');
 const textarea=document.createElement('textarea');textarea.id='mayaLocalText';textarea.className='inp wide';textarea.rows=3;textarea.maxLength=64000;textarea.placeholder='Text for a new .txt file';panel.append(textarea);
 group(panel,[['Choose folder',()=>call('FILES_PICK')],['List files',()=>call('FILES_LIST')],['Read .txt',()=>call('LOCAL_FILE_READ',{name:fileName()})]]);
 group(panel,[['Save new .txt',()=>{if(confirm('Create this text document in your chosen Android folder?'))call('FILES_SAVE_TEXT',{name:fileName(),text:textarea.value});}],['Delete .txt',()=>{const name=fileName();if(confirm('Request deletion of '+name+'? Android will ask again.'))call('LOCAL_FILE_DELETE',{name});}],['Check delete result',()=>call('LOCAL_DELETE_STATUS')]]);
 const result=document.createElement('pre');result.id='mayaLocalResult';result.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px';result.setAttribute('role','status');result.textContent='No command has run yet.';panel.append(result);host.append(panel);
}
function addVoice(){
 const existing=typeof window==='undefined'?null:window.MayaLifeVoice;
 if(!existing?.consumeTyped||!existing?.consumeLive||!existing?.parseLifeVoice||!existing?.runLifeVoice||!existing?.recognizes)return;
 const enabled=()=>{try{return localStorage.getItem('maya_life_voice_v25')==='true';}catch{return false;}};
 const run=async c=>{try{const r=invokeLocal(c.action,c.percent===undefined?{}:{percent:c.percent});const answer=
 c.action==='LOCAL_DEVICE'?('Phone '+r.model+', Android '+r.android+', battery '+r.batteryPercent+'%.'):
 c.action==='LOCAL_WIFI'?('Wi-Fi connected: '+r.wifiConnected):
 c.action.startsWith('LOCAL_VOLUME')?('Media volume '+r.percent+'%.'):(r.message||r.status);
 report(answer);return answer;}catch(e){const t='Phone command unavailable: '+e.message;report(t);return t;}};
 const prev={...existing};
 window.MayaLifeVoice={...existing,
 recognizes(text){return Boolean((enabled()&&parseLocalVoice(text))||prev.recognizes(text));},
 parseLifeVoice(text){const c=enabled()?parseLocalVoice(text):null;return c?{kind:'mayaLocal',command:c}:prev.parseLifeVoice(text);},
 runLifeVoice(c){return c?.kind==='mayaLocal'?run(c.command):prev.runLifeVoice(c);},
 consumeTyped(text){const c=enabled()?parseLocalVoice(text):null;if(!c)return prev.consumeTyped(text);void run(c);return true;},
 consumeLive(text){const c=enabled()?parseLocalVoice(text):null;if(!c)return prev.consumeLive(text);void run(c);return true;}
 };
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 addVoice();
}
