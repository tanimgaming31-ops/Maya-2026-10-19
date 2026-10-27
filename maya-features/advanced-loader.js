/* Maya advanced entry point; keeps controls inside Settings, not over the voice call. */
import './offline-commands.js';
import './private-vault.js';
import './screenshot.js';
import './voice-screenshot.js';
import './life-suite.js';
import './smart-hub.js';
import './app-launcher.js';
import './life-voice.js';
import './agent-suite.js';
import './agent-voice-bridge.js';
import './v54-voice.js';
import './v54-suite.js';
import './v54-voice-bridge.js';
import './birthday.js';
import './birthday-voice.js';
import './voice-media.js';
import './voice-media-bridge.js';
import './auto-reply.js';
import './local-tools.js';
// Last voice wrapper: WhatsApp name → dictation → language → approval.
import './whatsapp-voice-flow.js';
function init(){
  const host=document.querySelector('#setSheet .body');
  if(!host||document.getElementById('mayaAdvancedLink'))return;
  const area=document.createElement('section');
  area.style.cssText='margin:14px 0;padding:12px;border:1px solid var(--line,#456);border-radius:12px';
  const title=document.createElement('strong');title.textContent='Maya Advanced Panel';
  const note=document.createElement('p');note.className='note';
  note.textContent='Shared local To-dos and in-app events; opening the separate panel may interrupt an active voice call.';
  const a=document.createElement('a');a.id='mayaAdvancedLink';
  a.href=new URL('./advanced-panel.html',import.meta.url).href;
  a.textContent='Open Advanced Panel →';a.className='btn';
  a.style.cssText='display:inline-block;text-decoration:none;margin:4px 0';
  area.append(title,note,a);host.append(area);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();