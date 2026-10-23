import './offline-commands.js';
import './private-vault.js';
import './screenshot.js';
import './voice-screenshot.js';
function init(){
 const host=document.querySelector('#setSheet .body');
 if(!host||document.getElementById('mayaAdvancedLink'))return;
 const area=document.createElement('section');
 const title=document.createElement('h3');title.textContent='Maya Advanced Panel';
 const note=document.createElement('p');note.textContent='Opening the separate panel may interrupt an active voice call.';
 const a=document.createElement('a');a.id='mayaAdvancedLink';a.href=new URL('./advanced-panel.html',import.meta.url).href;a.textContent='Open Advanced Panel';a.className='btn';
 area.append(title,note,a);host.append(area);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
