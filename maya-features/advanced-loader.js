import './offline-commands.js';
function init(){
 if(document.getElementById('mayaAdvancedButton'))return;
 const b=document.createElement('button');b.id='mayaAdvancedButton';b.textContent='Advanced';
 b.style.cssText='position:fixed;right:16px;bottom:88px;z-index:99999;padding:12px 18px;border:0;border-radius:24px;background:#4f7cff;color:white';
 b.onclick=()=>{location.href=new URL('./advanced-panel.html',import.meta.url).href;};
 document.body.append(b);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
