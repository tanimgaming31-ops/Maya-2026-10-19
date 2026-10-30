/* Maya V25 • 54-feature PDF catalog in the EXISTING Maya app.
 * This exposes inventory and real existing shortcuts only. It does not enable
 * privileged Android actions, ask for new permissions, or alter user data.
 */
import {FEATURES54,SECTION_NAMES,searchMayaFeatures,parseMayaFeatureRequest} from './v25-54-registry.js';

const $=id=>document.getElementById(id);
let root=null,queryBox=null,categoryBox=null,listBox=null,countBox=null,priorFocus=null;
const el=(name,text,className='')=>{
 const node=document.createElement(name);if(text!==undefined)node.textContent=text;
 if(className)node.className=className;return node;
};
const style='position:fixed;inset:0;z-index:100200;background:rgba(2,3,12,.96);color:#e9f6ff;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px);overflow:auto;font:14px/1.45 system-ui, sans-serif;';
const button=(label,fn)=>{
 const b=el('button',label,'btn');
 b.type='button';b.style.cssText='flex:0 1 auto;min-width:0;cursor:pointer';
 b.addEventListener('click',fn);return b;
};
function close(){
 if(!root)return;
 root.style.display='none';
 if(priorFocus&&priorFocus.isConnected)priorFocus.focus();
}
function render(){
 if(!listBox||!queryBox||!categoryBox)return;
 const q=queryBox.value.trim(),section=Number(categoryBox.value);
 const found=searchMayaFeatures(q).filter(f=>!section||f.section===section);
 countBox.textContent=found.length+' of 54 groups • 444 PDF subfeatures catalogued (not 444 verified implementations).';
 listBox.replaceChildren();
 for(const f of found){
  const details=el('details');
  details.style.cssText='border:1px solid rgba(53,228,255,.25);border-radius:12px;margin:8px 0;padding:10px;background:rgba(53,228,255,.04)';
  const header=el('summary',String(f.id).padStart(2,'0')+' · '+f.title);
  header.style.cssText='cursor:pointer;font-weight:650;font-size:14px;';
  const sectionNote=el('div','Section '+f.section+' · '+SECTION_NAMES[f.section-1]);
  sectionNote.style.cssText='font-size:12px;opacity:.7;margin:8px 0 4px';
  const status=el('p','Status: device test needed. '+f.note);
  status.style.cssText='margin:4px 0 8px;color:#f9d08b;font-size:12.5px;';
  const ul=el('ul');ul.style.cssText='padding-left:20px;margin:8px 0';
  for(const feature of f.subfeatures)ul.append(el('li',feature));
  details.append(header,sectionNote,status,ul);listBox.append(details);
 }
 if(!found.length){const empty=el('p','No matches in this PDF. Try WhatsApp, Memory, 3D, Security, or a feature number.');empty.style.opacity='.85';listBox.append(empty);}
}
function open(query=''){
 if(!root)mount();
 if(!root)return false;
 priorFocus=document.activeElement;
 root.style.display='block';
 queryBox.value=query;categoryBox.value='0';render();queryBox.focus();
 return true;
}
function mount(){
 if(typeof document==='undefined'||root)return;
 const host=document.querySelector('#setSheet .body');if(!host)return;
 const launch=button('Maya V25 · 54 Features / All Subfeatures',()=>open());
 launch.id='mayaV25FeaturesOpen';launch.style.cssText+=';display:block;width:100%;margin:12px 0';
 const p=el('p','Browse all 54 groups from your uploaded PDF, including 444 smaller items. This catalog is NOT a claim they all work. Use the real device diagnostics and verify Android permissions.');
 p.className='note';p.style.marginTop='4px';
 host.append(launch,p);
 root=el('section');root.id='mayaV25FeaturesPanel';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.setAttribute('aria-labelledby','mayaV25FeaturesHeading');
 root.style.cssText=style+'display:none;';
 const top=el('div');top.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px';
 const title=el('h2','Maya V25 · Complete 54-Feature Inventory');title.id='mayaV25FeaturesHeading';title.style.cssText='font-size:18px;margin:0';
 const closeButton=button('Close ✕',close);closeButton.setAttribute('aria-label','Close feature inventory');
 top.append(title,closeButton);
 const notice=el('p','This is a searchable index of your PDF (54 main features, 444 subfeatures). A feature listed here may be partial, unavailable, or dependent on Android permissions, Google API models, third-party apps, or phone testing. No automatic messaging, hidden capture, or new permissions are activated by this panel.');
 notice.style.cssText='font-size:12.5px;color:#f9d08b;margin:10px 0';
 const controls=el('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 queryBox=el('input');queryBox.type='search';queryBox.id='mayaV25FeaturesSearch';queryBox.placeholder='Search all features / উপ-ফিচার';
 queryBox.setAttribute('aria-label','Search the feature inventory');
 queryBox.style.cssText='flex:1 1 190px;min-width:0;padding:12px;border-radius:10px;background:#111c31;border:1px solid #488cb0;color:#fff;font-size:16px';
 categoryBox=el('select');categoryBox.id='mayaV25FeaturesCategory';categoryBox.style.cssText='flex:1 1 160px;min-width:0;padding:11px;border-radius:10px;background:#111c31;color:#fff';
 const any=el('option','All five sections');any.value='0';categoryBox.append(any);
 SECTION_NAMES.forEach((name,i)=>{const o=el('option',(i+1)+' · '+name);o.value=String(i+1);categoryBox.append(o)});
 controls.append(queryBox,categoryBox);
 const shortcuts=el('div');shortcuts.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:12px 0';
 shortcuts.append(
  button('Open Memory',()=>{close();$('btnMem')?.click()}),
  button('Check device features',()=>{
    close();
    if(!$('setSheet')?.classList.contains('open'))$('btnSet')?.click();
    $('v6Diagnose')?.click();
    $('v6Diagnostics')?.scrollIntoView({block:'center',behavior:'smooth'});
  }),
  button('Back to Settings',()=>{close();if(!$('setSheet')?.classList.contains('open'))$('btnSet')?.click()})
 );
 countBox=el('p');countBox.setAttribute('role','status');countBox.style.cssText='font-size:12px;opacity:.8;margin:10px 0';
 listBox=el('div');listBox.id='mayaV25FeaturesResults';
 root.append(top,notice,controls,shortcuts,countBox,listBox);
 document.body.append(root);
 queryBox.addEventListener('input',render);
 categoryBox.addEventListener('change',render);
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();close()}
  if(e.key==='Tab'){const focusable=Array.from(root.querySelectorAll('button,input,select,summary,[tabindex]')).filter(n=>!n.disabled);
   if(focusable.length){const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
 });
 render();
}
function runFeatureRequest(command){
 if(!command)return Promise.resolve('No matching feature command.');
 const worked=open(command.query||'');
 const msg=worked?'Opened the Maya 54-feature inventory'+(command.query?' for '+command.query:'')+'. Device testing is still required.':'Feature panel is not available on this screen.';
 const sub=$('sub');if(sub)sub.textContent=msg;
 return Promise.resolve(msg);
}
function attachVoice(){
 if(typeof window==='undefined'||!window.MayaLifeVoice||window.MayaLifeVoice.__mayaV25Features)return;
 const previous={...window.MayaLifeVoice};
 const parse=t=>parseMayaFeatureRequest(t);
 window.MayaLifeVoice={...previous,__mayaV25Features:true,
  recognizes:t=>Boolean(parse(t)||previous.recognizes(t)),
  parseLifeVoice:t=>{const c=parse(t);return c?{kind:'mayaV25Features',command:c}:previous.parseLifeVoice(t)},
  runLifeVoice:c=>c?.kind==='mayaV25Features'?runFeatureRequest(c.command):previous.runLifeVoice(c),
  consumeTyped:t=>{const c=parse(t);if(!c)return previous.consumeTyped(t);void runFeatureRequest(c);return true},
  consumeLive:t=>{const c=parse(t);if(!c)return previous.consumeLive(t);void runFeatureRequest(c);return true}
 };
}
if(typeof document!=='undefined'){
 attachVoice();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();attachVoice()},{once:true});
 else mount();
}
export {open as openMayaV25Features,mount as mountMayaV25Features};