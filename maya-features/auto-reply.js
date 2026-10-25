/* Maya Private Message Auto Reply — opt-in user-written templates only.
   WhatsApp/IMO messages are never uploaded to Gemini by this feature. */
const APPS=[
 {id:'com.whatsapp',label:'WhatsApp'},
 {id:'com.whatsapp.w4b',label:'WhatsApp Business'},
 {id:'com.imo.android.imoim',label:'IMO'},
 {id:'com.imo.android.imous',label:'IMO (alternate app)'}
];
const $=id=>document.getElementById(id);
function native(action,data={}){
 if(typeof window?.MayaBridge?.autoReply!=='function')throw Error('Install the latest Maya Android APK. Browser/PWA cannot auto-reply.');
 const result=JSON.parse(window.MayaBridge.autoReply(action,JSON.stringify(data)));
 if(!result||!result.status)throw Error('Android Auto Reply returned invalid status.');
 return result;
}
function status(text,alert=false){
 const el=$('mayaAutoReplyFeedback');
 if(el){el.textContent=text;el.style.color=alert?'#ffa8b1':'#b8f6d9';}
 return text;
}
export function validateReplyRule(app,sender,reply){
 return APPS.some(x=>x.id===app) && typeof sender==='string' && sender.trim().length>=2 && sender.length<=70
   && !/[\n\r()]/u.test(sender) && typeof reply==='string'&&reply.trim().length>=3&&reply.length<=180
   && !/(https?:\/\/|www\.|otp|password|passcode|verification code|pin code|cvv|ওটিপি|পাসওয়ার্ড|পিন নম্বর)/iu.test(reply);
}
function render(){
 let data;
 try{data=native('STATUS');}catch(e){status(e.message,true);return;}
 if(data.status!=='ok'){status(data.message||data.status,true);return;}
 const active=$('mayaAutoReplyEnabled');
 active.checked=!!data.enabled;
 const count=$('mayaAutoReplyCount');
 count.textContent='Status: '+(data.enabled?'ENABLED':'OFF')+'. Notification listener: '+(data.listenerConnected?'connected':'OFF')+
  '. Android reply intents submitted today: '+Number(data.sentToday||0)+' / 15 (delivery not confirmed).';
 const rules=$('mayaAutoReplyRules');rules.replaceChildren();
 (Array.isArray(data.rules)?data.rules:[]).forEach(rule=>{
  const row=document.createElement('div');row.style.cssText='padding:9px 0;border-bottom:1px solid #415065';
  const label=document.createElement('p');label.className='note';
  const app=APPS.find(x=>x.id===rule.package);
  label.textContent=(app?.label||rule.package)+' · '+rule.sender+' → '+rule.reply+' — Maya auto-reply';
  const remove=document.createElement('button');remove.type='button';remove.className='btn';
  remove.textContent='Remove this rule';
  remove.onclick=()=>{
   if(!confirm('Delete this contact rule? Maya Auto Reply will turn OFF for safety.'))return;
   try{const result=native('DELETE_RULE',{package:rule.package,sender:rule.sender});status(result.message,result.status!=='removed');render();}
   catch(e){status(e.message,true);}
  };
  row.append(label,remove);rules.append(row);
 });
 if(!(Array.isArray(data.rules)&&data.rules.length))rules.textContent='No approved contacts. Auto Reply is OFF by default.';
 const out=$('mayaAutoReplyLast');out.textContent='Last native result: '+(data.lastOutcome||'No automatic reply attempted.');
}
function mount(){
 const host=document.querySelector('#setSheet .body');
 if(!host||$('mayaAutoReplyPanel'))return;
 const pane=document.createElement('details');pane.id='mayaAutoReplyPanel';
 pane.style.cssText='margin:14px 0;padding:14px;border:1px solid #94c6ff;border-radius:15px;background:#0f1a2b';
 pane.innerHTML=[
 '<summary style="font-weight:700">💬 Maya WhatsApp &amp; IMO — Approved Auto Reply</summary>',
 '<p class="note">This feature can automatically submit a reply to a supported Android notification from ONLY an exact contact you explicitly add. This sends messages on your behalf when the app is closed. No Gemini AI generation, reading historical chats, unapproved contacts or full app automation.</p>',
 '<p class="note">Privacy: only the saved contact name and your written template stay in Maya Android private app storage. Notification message contents are NOT uploaded to Gemini or a third-party server. Android Notification Access reveals message previews: grant only if you trust this APK.</p>',
 '<label><input type="checkbox" id="mayaAutoReplyEnabled"> ENABLE automatic replies for these approved contacts</label>',
 '<p id="mayaAutoReplyCount" class="note">Reading Android status…</p>',
 '<div class="krow"><button class="btn" id="mayaAutoReplyPermission">Open Android Notification Access</button><button class="btn" id="mayaAutoReplyRefresh">Refresh status</button><button class="btn" id="mayaAutoReplyStop">STOP all auto replies</button></div>',
 '<h4>Approve a sender and the exact reply</h4>',
 '<label class="note" for="mayaAutoReplyApp">Choose the messaging app</label>',
 '<select id="mayaAutoReplyApp" class="inp wide"></select>',
 '<label class="note" for="mayaAutoReplySender">Sender name exactly as shown in notification (not a phone number or group)</label>',
 '<input id="mayaAutoReplySender" class="inp wide" maxlength="70" placeholder="Exact unique contact notification name">',
 '<label class="note" for="mayaAutoReplyTemplate">Your approved reply (3–180 characters)</label>',
 '<textarea id="mayaAutoReplyTemplate" class="inp wide" rows="3" maxlength="180" placeholder="আমি এখন ব্যস্ত আছি, একটু পরে তোমাকে উত্তর দেব।"></textarea>',
 '<button class="btn pri" id="mayaAutoReplySave">Save contact rule (does NOT enable sending)</button>',
 '<p class="note">Maya automatically adds “— Maya auto-reply”. Limit: one response per contact every 15 minutes, max 5 per contact per day and 15 overall. Group messages, security codes and unsupported Reply notifications are excluded. If two contacts share a displayed name, do not enable this rule.</p>',
 '<h4>Approved sender list</h4><div id="mayaAutoReplyRules"></div>',
 '<p id="mayaAutoReplyLast" class="note"></p><p id="mayaAutoReplyFeedback" class="note" role="status"></p>'
 ].join('');
 host.append(pane);
 const select=$('mayaAutoReplyApp');
 for(const app of APPS){const opt=document.createElement('option');opt.value=app.id;opt.textContent=app.label;select.append(opt);}
 $('mayaAutoReplyRefresh').onclick=render;
 $('mayaAutoReplyPermission').onclick=()=>{
  try{
   if(typeof window?.MayaBridge?.openNotificationAccess==='function'){window.MayaBridge.openNotificationAccess();status('Android Notification Access settings opened. Enable Maya manually.');}
   else status('Open Android Settings → Special App Access → Notification Access → Maya.',true);
  }catch(e){status(e.message,true);}
 };
 $('mayaAutoReplyStop').onclick=()=>{
  try{const r=native('DISABLE_ALL');status(r.message,r.status!=='ok');render();}catch(e){status(e.message,true);}
 };
 $('mayaAutoReplyEnabled').onchange=e=>{
  const next=e.target.checked;
  if(next&&!confirm('IMPORTANT: Maya will automatically send your saved text to EXACT approved WhatsApp/IMO notification contacts, even while Maya is closed. The recipient sees “Maya auto-reply”. This does NOT require approval for every message. Enable now?')){
   e.target.checked=false;return;
  }
  try{
   const r=native('SET_ENABLED',{enabled:next});status(r.message,r.status!=='ok');
  }catch(err){status(err.message,true);}
  render();
 };
 $('mayaAutoReplySave').onclick=()=>{
  const pkg=select.value,sender=$('mayaAutoReplySender').value.trim(),
        reply=$('mayaAutoReplyTemplate').value.trim();
  if(!validateReplyRule(pkg,sender,reply)){status('Choose WhatsApp/IMO, exact sender name (2–70 characters) and a safe reply (3–180 characters).',true);return;}
  if(!confirm('SAVE RULE (Auto Reply still OFF until enabled):\n'+sender+'\n'+reply+' — Maya auto-reply\n\nOnly use a unique contact name, not a group.'))return;
  try{
   const r=native('ADD_RULE',{package:pkg,sender,reply});status(r.message,r.status!=='saved');
   if(r.status==='saved'){$('mayaAutoReplySender').value='';$('mayaAutoReplyTemplate').value='';}
   render();
  }catch(e){status(e.message,true);}
 };
 pane.addEventListener('toggle',()=>{if(pane.open)render();});
 render();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
