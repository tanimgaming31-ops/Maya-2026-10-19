const KEY='maya_offline_notes_tasks_v1';
function read(){const raw=localStorage.getItem(KEY);if(!raw)return[];const a=JSON.parse(raw);if(!Array.isArray(a)||a.some(x=>!x||typeof x.id!=='string'||typeof x.text!=='string'||!['note','todo'].includes(x.type)))throw Error('Stored data is invalid; nothing was overwritten.');return a;}
function save(a){localStorage.setItem(KEY,JSON.stringify(a));}
function mount(){
 if(document.getElementById('mayaOfflineButton'))return;
 const button=document.createElement('button');button.id='mayaOfflineButton';button.textContent='Notes & Tasks';
 button.style.cssText='position:fixed;left:12px;bottom:88px;z-index:99998;padding:10px;border-radius:16px;background:#14243b;color:white';
 const d=document.createElement('dialog');d.style.cssText='max-width:90vw;width:420px;max-height:80vh;overflow:auto;background:#101b30;color:white;border:1px solid #4f7cff;border-radius:16px';
 const title=document.createElement('h2');title.textContent='Offline notes & tasks';
 const help=document.createElement('p');help.textContent='Text commands: note: text / todo: text / list / time. বাংলা: নোট: লেখা / কাজ: লেখা। Local, unencrypted storage. No offline voice recognition or background alarms.';
 const input=document.createElement('input');input.placeholder='todo: Read a book';input.style.cssText='width:95%;font-size:16px';
 const run=document.createElement('button');run.textContent='Run';
 const out=document.createElement('p');out.setAttribute('role','status');
 const list=document.createElement('div');
 function render(){list.replaceChildren();for(const item of read()){
 const row=document.createElement('p');const text=document.createElement('span');text.textContent=(item.type==='todo'?(item.done?'✓ ':'□ '):'Note: ')+item.text;row.append(text);
 if(item.type==='todo'&&!item.done){const done=document.createElement('button');done.textContent='Done';done.onclick=()=>{try{const a=read();const x=a.find(x=>x.id===item.id);if(x)x.done=true;save(a);render();}catch(e){out.textContent=e.message;}};row.append(done);}
 const del=document.createElement('button');del.textContent='Delete';del.onclick=()=>{if(!confirm('Delete this item?'))return;try{save(read().filter(x=>x.id!==item.id));render();}catch(e){out.textContent=e.message;}};row.append(del);list.append(row);
 }}
 run.onclick=()=>{try{const text=input.value.trim();if(['list','তালিকা'].includes(text)){render();return;}if(['time','সময়','সময়'].includes(text)){out.textContent=new Date().toLocaleString();return;}const m=/^(note|todo|নোট|কাজ)\s*:\s*(.+)$/su.exec(text);if(!m)throw Error('Use note: text or todo: text');if(m[2].length>4000)throw Error('Maximum 4000 characters');const a=read();if(a.length>=500)throw Error('Maximum 500 entries');a.push({id:crypto.randomUUID(),type:['todo','কাজ'].includes(m[1])?'todo':'note',text:m[2],done:false,createdAt:new Date().toISOString()});save(a);input.value='';out.textContent='Saved locally. Not encrypted.';render();}catch(e){out.textContent=e.message;}};
 input.onkeydown=e=>{if(e.key==='Enter')run.click();};
 const close=document.createElement('button');close.textContent='Close';close.onclick=()=>d.close();
 d.append(title,help,input,run,out,list,close);button.onclick=()=>{d.showModal();try{render();}catch(e){out.textContent=e.message;}};document.body.append(button,d);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
