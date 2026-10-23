const STORE='maya_private_vault_v1';
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=a=>{let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s);};
const bytes=s=>{if(typeof s!=='string'||!s||s.length>140000||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))throw Error('Invalid encrypted backup encoding');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
async function derive(secret,salt){const base=await crypto.subtle.importKey('raw',enc.encode(secret),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
/* Validate imported ciphertext BEFORE touching the existing vault. */
export async function verifyVaultBackup(raw,passphrase){
 const r=typeof raw==='string'?JSON.parse(raw):raw;
 if(!r||typeof r!=='object'||Array.isArray(r)||r.v!==1||r.iterations!==600000)throw Error('Invalid vault version');
 const salt=bytes(r.salt),iv=bytes(r.iv),cipher=bytes(r.data);
 if(salt.length!==16||iv.length!==12||cipher.length<16||cipher.length>100000)throw Error('Invalid vault lengths');
 if(typeof passphrase!=='string'||!passphrase.length||passphrase.length>256)throw Error('Enter the backup passphrase');
 if(!crypto.subtle)throw Error('Web Crypto unavailable');
 const key=await derive(passphrase,salt);
 const txt=dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode(STORE)},key,cipher));
 if(txt.length>20000)throw Error('Vault text exceeds size limit');
 return {text:txt,record:{v:1,iterations:600000,salt:b64(salt),iv:b64(iv),data:b64(cipher)}};
}
function mount(){
 const host=document.querySelector('#setSheet .body');if(!host||document.getElementById('mayaVaultOpen'))return;
 const open=document.createElement('button');open.id='mayaVaultOpen';open.textContent='Private vault (PIN/passphrase)';open.className='btn';host.append(open);
 const d=document.createElement('dialog');d.style.cssText='width:90%;max-width:440px;background:#101b30;color:white;border-radius:16px';
 const heading=document.createElement('h2');heading.textContent='Encrypted private vault';
 const help=document.createElement('p');help.textContent='Separate encrypted text only. Existing notes/memory remain unencrypted. Use a long unique passphrase (recommended) or at least 10 PIN digits. No fingerprint yet. Forgotten secret or cleared app data means no recovery. Back up ciphertext before uninstalling. Encrypted backups can be imported with the original passphrase. Same-origin scripts can access unlocked content.';
 const secret=document.createElement('input');secret.type='password';secret.autocomplete='off';secret.placeholder='PIN / passphrase';secret.setAttribute('aria-label','Vault PIN or passphrase');
 const text=document.createElement('textarea');text.rows=8;text.maxLength=20000;text.placeholder='Private text';text.setAttribute('aria-label','Private vault text');text.hidden=true;text.style.width='95%';
 const status=document.createElement('p');status.setAttribute('role','status');
 let key=null,salt=null,busy=false,timer=null;
 const unlock=document.createElement('button');unlock.textContent='Create / Unlock';
 const save=document.createElement('button');save.textContent='Encrypt & Save';save.disabled=true;
 const lock=document.createElement('button');lock.textContent='Lock & Close';
 function clear(){key=null;salt=null;secret.value='';text.value='';text.hidden=true;save.disabled=true;unlock.disabled=false;clearTimeout(timer);status.textContent='Locked. Unsaved edits were discarded.';}
 function touch(){clearTimeout(timer);if(key)timer=setTimeout(()=>{clear();d.close();},60000);}
 unlock.onclick=async()=>{if(busy)return;busy=true;unlock.disabled=true;try{if(!crypto.subtle)throw Error('Secure Web Crypto unavailable');const raw=localStorage.getItem(STORE);if(raw){const r=JSON.parse(raw);if(r.v!==1||r.iterations!==600000)throw Error('Unsupported vault format');salt=bytes(r.salt);const iv=bytes(r.iv),cipher=bytes(r.data);if(salt.length!==16||iv.length!==12||cipher.length>100000)throw Error('Invalid vault');key=await derive(secret.value,salt);text.value=dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode(STORE)},key,cipher));}else{if(secret.value.length<10||secret.value.length>256)throw Error('Use 10–256 characters; long passphrase recommended');salt=crypto.getRandomValues(new Uint8Array(16));key=await derive(secret.value,salt);text.value='';}secret.value='';text.hidden=false;save.disabled=false;status.textContent='Unlocked. Save explicitly. Auto-lock after 60 seconds idle or when app is hidden.';touch();}catch(e){clear();status.textContent='Unlock failed or invalid vault. Existing data was not changed. '+(e.name==='OperationError'?'Check your secret.':e.message);}finally{busy=false;unlock.disabled=!!key;}};
 save.onclick=async()=>{if(!key||busy)return;busy=true;save.disabled=true;try{const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(STORE)},key,enc.encode(text.value));localStorage.setItem(STORE,JSON.stringify({v:1,iterations:600000,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ciphertext))}));status.textContent='Encrypted text saved locally.';touch();}catch(e){status.textContent='Save failed: '+e.message;}finally{busy=false;save.disabled=!key;}};
 const backup=document.createElement('button');backup.textContent='Export encrypted backup';backup.onclick=()=>{try{const raw=localStorage.getItem(STORE);if(!raw)throw Error('Save a vault first');const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='maya-encrypted-vault.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Encrypted backup exported. Keep your secret separately. Use the Import / Restore option with your original passphrase.';}catch(e){status.textContent=e.message;}};
 const restorePicker=document.createElement('input');
 restorePicker.type='file';restorePicker.accept='.json,application/json';restorePicker.hidden=true;
 const restore=document.createElement('button');restore.textContent='Import / Restore encrypted backup';
 restore.onclick=()=>{
   if(busy)return;
   if(key){status.textContent='Lock the vault before restoring.';return;}
   if(!secret.value){status.textContent='Enter the original backup passphrase first.';return;}
   restorePicker.value='';restorePicker.click();
 };
 restorePicker.onchange=async()=>{
   const file=restorePicker.files?.[0];if(!file||busy)return;
   busy=true;restore.disabled=true;unlock.disabled=true;
   try{
     if(file.size>200000)throw Error('Backup exceeds 200 KB');
     const imported=await verifyVaultBackup(await file.text(),secret.value);
     if(localStorage.getItem(STORE)&&!confirm('Replace your CURRENT encrypted vault with this backup? Export the current vault first. Maya Memory Packs will not change.')){
       status.textContent='Cancelled; existing vault was not changed.';return;
     }
     localStorage.setItem(STORE,JSON.stringify(imported.record));
     clear();
     status.textContent='Encrypted backup restored. Enter its passphrase again to unlock.';
   }catch(e){
     status.textContent='Backup not imported. Existing vault unchanged. '+(e?.name==='OperationError'?'Wrong passphrase or corrupted backup.':String(e?.message||e));
   }finally{busy=false;restore.disabled=false;unlock.disabled=!!key;restorePicker.value='';}
 };
 lock.onclick=()=>{if(busy)return;clear();d.close();};d.addEventListener('cancel',e=>{if(busy){e.preventDefault();return;}clear();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();if(d.open)d.close();}});text.addEventListener('input',touch);open.onclick=()=>d.showModal();d.append(heading,help,secret,unlock,text,save,backup,restore,restorePicker,lock,status);document.body.append(d);
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
