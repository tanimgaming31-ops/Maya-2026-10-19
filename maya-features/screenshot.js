function plugin(){const c=window.Capacitor;if(!c||c.getPlatform?.()!=='android'||!c.isPluginAvailable?.('MayaScreenshot'))throw Error('Screenshot requires a newly built Android APK; browser mode is unsupported.');return c.registerPlugin('MayaScreenshot');}
export async function requestScreenshot(){return plugin().capture();}
function mount(){
 const host=document.querySelector('#setSheet .body');if(!host||document.getElementById('mayaScreenshotButton'))return;
 const title=document.createElement('h3');title.textContent='Screenshot (Android 10+)';
 const note=document.createElement('p');note.textContent='Android will ask what screen/app to capture. Image saves to Gallery → Pictures/Maya after a short delay. Protected content may be blank. This does not connect voice commands.';
 const button=document.createElement('button');button.id='mayaScreenshotButton';button.className='btn';button.textContent='Request screenshot';
 const check=document.createElement('button');check.className='btn';check.textContent='Check capture result';
 const status=document.createElement('p');status.setAttribute('role','status');
 button.onclick=async()=>{button.disabled=true;try{const r=await requestScreenshot();status.textContent=r.status==='cancelled'?'Capture cancelled.':'Capture started, not yet confirmed saved. Use Check capture result.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
 check.onclick=async()=>{try{const r=await plugin().status();status.textContent=r.status==='saved'?'Saved to Gallery → Pictures/Maya. Protected areas may be blank.':'Capture status: '+r.status;}catch(e){status.textContent=e.message;}};
 host.append(title,note,button,check,status);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
