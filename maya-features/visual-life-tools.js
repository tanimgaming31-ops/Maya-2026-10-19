/* Maya V151 visual tools — one user-selected image, never silent OCR.
 * Native ML Kit handles image locally. Expenses reuse Maya Life Suite storage. */
import {addRecord,loadData} from './life-suite.js';
export function extractReceipt(text){
 const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const rows=lines.filter(s=>/(?:grand\s*total|amount\s*due|total\s*(?:due|paid|payable)|^total\b|^paid\b|মোট)/iu.test(s)&&!/subtotal|sub total|tax|vat|discount|change/iu.test(s));
 let amount=null;for(const line of rows.reverse()){
  const nums=[...line.matchAll(/(?:^|[^\d])(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d{1,7}(?:\.\d{1,2})?)(?!\d)/g)]
   .map(m=>Number(m[1].replace(/,/g,''))).filter(n=>n>0&&n<=1e8);
  if(nums.length){amount=nums.at(-1);break;}
 }
 const currency=/\bAED\b/u.test(text)?'AED':/\bBDT\b|৳/u.test(text)?'BDT':/\bUSD\b|\$/u.test(text)?'USD':/\bINR\b|₹/u.test(text)?'INR':/\bEUR\b|€/u.test(text)?'EUR':null;
 return {amount,currency,description:(lines.find(l=>!/total|subtotal|tax|vat|invoice/i.test(l))||'Scanned receipt').slice(0,90)};
}
export function validateExpense(amount,currency,note){
 const n=Number(amount);
 if(!Number.isFinite(n)||n<=0||n>1e8||!['AED','BDT','USD','INR','EUR'].includes(currency)||!String(note||'').trim())return null;
 return {amount:Math.round(n*100)/100,currency,note:String(note).trim().slice(0,90),source:'receipt-reviewed'};
}
export function saveReceiptExpense(amount,currency,note){
 const p=validateExpense(amount,currency,note);if(!p)throw Error('Review amount, currency and description.');
 return addRecord('expense',p);
}
const $=id=>document.getElementById(id);
function native(action,data=''){
 const bridge=window.MayaBridge;
 if(typeof bridge?.visualScan!=='function')return {status:'unavailable',message:'Requires the updated Maya Android APK.'};
 try{return JSON.parse(bridge.visualScan(action,data));}catch{return {status:'error',message:'Native scan failed.'};}
}
async function jpeg(file){
 const picture=await createImageBitmap(file);const m=Math.min(1,1400/Math.max(picture.width,picture.height));
 const c=document.createElement('canvas');c.width=Math.round(picture.width*m);c.height=Math.round(picture.height*m);
 c.getContext('2d').drawImage(picture,0,0,c.width,c.height);picture.close();
 const d=c.toDataURL('image/jpeg',.74);if(d.length>1800000)throw Error('Image too large. Choose smaller image.');return d;
}
export async function scanImage(kind,file){
 if(kind!=='barcode'&&kind!=='receipt')throw Error('Invalid scan type');
 if(!file)throw Error('Select a photo first.');
 const first=native(kind==='barcode'?'SCAN_BARCODE':'SCAN_RECEIPT',await jpeg(file));
 if(first.status!=='pending')return first;
 for(let i=0;i<36;i++){
  await new Promise(r=>setTimeout(r,300));
  const result=native('SCAN_RESULT');
  if(result.status!=='pending')return result.requestId===first.requestId?result:{status:'error',message:'Scan request changed.'};
 }
 native('SCAN_CANCEL');return {status:'error',message:'Scan timed out.'};
}
const el=(tag,id)=>{const e=document.createElement(tag);if(id)e.id=id;return e;};
const button=(label,fn)=>{const b=el('button');b.className='btn';b.textContent=label;b.onclick=fn;return b;};
function mount(){
 const host=document.querySelector('#setSheet .body');if(!host||$('mayaVisionPanel'))return;
 const wrapper=el('section','mayaVisionPanel');wrapper.hidden=true;
 wrapper.style.cssText='padding:12px;margin:10px 0;border:1px solid #426e7c;border-radius:12px;background:#081725';
 const heading=el('h3');heading.textContent='Maya Vision & Clipboard';wrapper.append(heading);
 const status=el('p','mayaVisionStatus');status.setAttribute('role','status');
 const tell=t=>{status.textContent=t;};
 const file=el('input','mayaVisionImage');file.type='file';file.accept='image/*';file.capture='environment';
 const result=el('textarea','mayaVisionResult');result.rows=5;result.style.width='100%';result.placeholder='Decoded barcode or receipt text';result.readOnly=true;
 async function scan(kind){tell('Reading image locally…');try{
   const r=await scanImage(kind,file.files?.[0]);if(r.status!=='ok'){tell(r.message||r.status);return;}
   result.value=kind==='barcode'?r.value:r.text;
   if(kind==='receipt'){
    const found=extractReceipt(r.text);$('mayaReceiptAmount').value=found.amount??'';
    $('mayaReceiptCurrency').value=found.currency||'AED';$('mayaReceiptNote').value=found.description;
    tell('Receipt OCR complete. Verify amount before saving.');
   }else tell('QR/barcode decoded. No URL automatically opened.');
  }catch(e){tell(e.message||String(e));}
 }
 const inputs=el('div');
 const amount=el('input','mayaReceiptAmount');amount.type='number';amount.min='0.01';amount.step='0.01';amount.placeholder='Verified receipt total';
 const curr=el('select','mayaReceiptCurrency');
 for(const c of ['AED','BDT','USD','INR','EUR']){const opt=el('option');opt.textContent=c;opt.value=c;curr.append(opt);}
 const note=el('input','mayaReceiptNote');note.placeholder='Merchant / description';note.maxLength=90;
 const totals=el('p','mayaReceiptTotals');
 const refresh=()=>{
  const by={};for(const x of loadData().expense){const c=x.currency||'AED';by[c]=(by[c]||0)+Number(x.amount||0);}
  totals.textContent='Life Suite expenses: '+(Object.entries(by).map(([c,n])=>c+' '+n.toFixed(2)).join(' • ')||'No saved expenses');
 };
 inputs.append(amount,curr,note,button('Save reviewed expense',()=>{try{saveReceiptExpense(amount.value,curr.value,note.value);refresh();tell('Saved to existing Life Suite expenses.');}catch(e){tell(e.message);}}),totals);
 const clipboard=el('textarea','mayaVisionClipboard');clipboard.rows=4;clipboard.maxLength=4000;clipboard.style.width='100%';clipboard.placeholder='Paste text to clean or translate';
 wrapper.append(file,button('Read QR / barcode',()=>void scan('barcode')),button('Read receipt (Latin OCR)',()=>void scan('receipt')),result,inputs);
 const caption=el('h4');caption.textContent='Smart Clipboard (tap to read)';wrapper.append(caption,clipboard);
 wrapper.append(button('Read clipboard',async()=>{try{clipboard.value=(await navigator.clipboard.readText()).slice(0,4000);tell('Clipboard loaded on tap.');}catch{tell('Clipboard unavailable. Paste manually.');}}));
 wrapper.append(button('Clean text',()=>{clipboard.value=clipboard.value.trim().replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n');tell('Text cleaned offline.');}));
 wrapper.append(button('Copy text',async()=>{try{await navigator.clipboard.writeText(clipboard.value);tell('Copied.');}catch{tell('Clipboard write unavailable.');}}));
 wrapper.append(button('Translate with Gemini',async()=>{const t=clipboard.value.trim();if(!t||t.length>500){tell('Translation accepts 1 to 500 characters.');return;}const lang='English';try{const x=await window.MayaWhatsAppTranslator.translate(t,lang);if(x){clipboard.value=x;tell('Translated into English. Review before copying.');}}catch(e){tell('Translation failed. Original text is unchanged.');}}));
 const keyboard=el('h4');keyboard.textContent='Maya AI Keyboard';wrapper.append(keyboard);
 const info=el('p');info.textContent='Separate keyboard app. Android requires you to install, enable and select it. No private typing is shared with Maya.';wrapper.append(info);
 wrapper.append(button('Open keyboard settings',()=>{try{const r=JSON.parse(window.MayaBridge.openKeyboardSettings());tell(r.status==='opened'?'Android keyboard settings opened.':'Keyboard settings unavailable.');}catch{tell('Only available inside the Android APK.');}}));
 const link=el('a');link.href='https://github.com/tanimgaming31-ops/Maya-AI-Keyboard';link.target='_blank';link.rel='noopener';link.textContent='Maya-AI-Keyboard repository';wrapper.append(link,status);
 const open=button('QR • Receipt • Clipboard • Keyboard',()=>{wrapper.hidden=!wrapper.hidden;if(!wrapper.hidden)refresh();});
 host.append(open,wrapper);tell(typeof window.MayaBridge?.visualScan==='function'?'Scanner available; choose an image.':'Scanner requires Maya Android APK.');refresh();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
