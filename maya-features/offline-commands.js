/* Maya offline TEXT notes + tasks. Local storage only; no offline voice recognition. */
import { createTodo, listTodos, completeTodo, deleteTodo } from './productivity.js';
const KEY='maya_offline_notes_tasks_v1';
const uid=()=>globalThis.crypto?.randomUUID?.()||('note-'+Date.now()+'-'+Math.random().toString(36).slice(2));
function readLegacy(){
  const raw=localStorage.getItem(KEY);if(!raw)return[];
  const v=JSON.parse(raw);
  if(!Array.isArray(v)||v.some(x=>!x||typeof x.id!=='string'||typeof x.text!=='string'||!['note','todo'].includes(x.type)))throw Error('Stored notes/tasks are invalid. Nothing was overwritten.');
  return v;
}
function saveLegacy(v){localStorage.setItem(KEY,JSON.stringify(v));}
function mount(){
  const host=document.querySelector('#setSheet .body');
  if(!host||document.getElementById('mayaOfflineButton'))return;
  const button=document.createElement('button');button.id='mayaOfflineButton';
  button.className='btn';button.style.cssText='margin:6px 0;display:block';
  button.textContent='Offline Notes & Text Commands';
  const dlg=document.createElement('dialog');
  dlg.style.cssText='box-sizing:border-box;width:min(92vw,520px);max-height:85vh;overflow:auto;background:#10192b;color:#e8f6ff;border:1px solid #4f7cff;border-radius:15px;padding:18px';
  const h=document.createElement('h2');h.textContent='Offline notes & text tasks';
  const desc=document.createElement('p');
  desc.textContent='Commands: note: text / todo: text / list / time. বাংলা: নোট: লেখা / কাজ: লেখা। Saved locally without encryption; never store passwords. No offline speech or background alarm.';
  const field=document.createElement('textarea');field.rows=2;field.maxLength=4000;field.placeholder='todo: Buy milk';
  field.style.cssText='display:block;width:100%;font-size:16px;background:#0b1425;color:#fff;border:1px solid #4f7cff;border-radius:8px;padding:9px';
  const run=document.createElement('button');run.className='btn';run.textContent='Run text command';
  const out=document.createElement('p');out.setAttribute('role','status');
  const list=document.createElement('div');
  const close=document.createElement('button');close.className='btn';close.textContent='Close';
  close.onclick=()=>dlg.close();
  const el=(tag,label)=>{const n=document.createElement(tag);n.textContent=label;return n;};
  function render(){
    list.replaceChildren();
    const notes=readLegacy();
    for(const note of notes.slice(-150).reverse()){
      const row=el('p',(note.type==='todo'?(note.done?'✓ ':'○ '):'Note: ')+note.text+' ');
      if(note.type==='todo'&&!note.done){
        const done=el('button','Done');done.className='btn';
        done.onclick=()=>{try{const all=readLegacy();const a=all.find(x=>x.id===note.id);if(a)a.done=true;saveLegacy(all);render();}catch(e){out.textContent=e.message;}};
        row.append(done);
      }
      const del=el('button','Delete');del.className='btn';
      del.onclick=()=>{if(!confirm('Delete this note?'))return;try{saveLegacy(readLegacy().filter(x=>x.id!==note.id));render();}catch(e){out.textContent=e.message;}};
      row.append(del);list.append(row);
    }
    const tasks=listTodos().slice(-60).reverse();
    const heading=el('h3','Maya shared To-dos');list.append(heading);
    for(const task of tasks){
      const row=el('p',(task.done?'✓ ':'○ ')+task.title+' ');
      if(!task.done){const done=el('button','Done');done.className='btn';done.onclick=()=>{try{completeTodo(task.id);render();}catch(e){out.textContent=e.message;}};row.append(done);}
      const del=el('button','Delete');del.className='btn';
      del.onclick=()=>{if(!confirm('Delete this To-do?'))return;try{deleteTodo(task.id);render();}catch(e){out.textContent=e.message;}};
      row.append(del);list.append(row);
    }
    if(!notes.length&&!tasks.length)list.prepend(el('p','No saved notes or tasks.'));
  }
  run.onclick=()=>{
    try{
      const value=field.value.trim();
      if(['list','তালিকা'].includes(value)){render();out.textContent='Showing local notes and Maya To-dos.';return;}
      if(['time','সময়','সময়'].includes(value)){out.textContent=new Date().toLocaleString();return;}
      const m=/^(note|todo|নোট|কাজ)\s*:\s*(.+)$/su.exec(value);
      if(!m)throw Error('Use note: text or todo: text (বাংলা: নোট: / কাজ:)');
      const v=m[2].trim();
      if(!v||v.length>4000)throw Error('Enter 1–4000 characters.');
      if(['todo','কাজ'].includes(m[1]))createTodo({title:v.slice(0,200)});
      else {
        const a=readLegacy();if(a.length>=500)throw Error('Local notes limit reached (500).');
        a.push({id:uid(),type:'note',text:v,done:false,createdAt:new Date().toISOString()});saveLegacy(a);
      }
      field.value='';out.textContent='Saved locally, not encrypted.';render();
    }catch(e){out.textContent=String(e?.message||e);}
  };
  button.onclick=()=>{try{render();dlg.showModal();}catch(e){out.textContent=e.message;dlg.showModal();}};
  dlg.append(h,desc,field,run,out,list,close);host.append(button,dlg);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();