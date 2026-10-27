package com.tanim.maya;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Looper;
import android.os.Handler;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Maya Voice Smart Home V172. Strict local-only, no cloud credential collection.
 * Power control: Tasmota HTTP /cm or Shelly Gen2/3 /rpc/Switch.* on port 80.
 * Router: launch user-entered private LAN admin URL in Android browser.
 * Never assume delivery: return actual HTTP response or an error.
 */
public final class MayaHomeControl {
  private static final Object LOCK=new Object();
  private static int serial=0;
  private static String last="{\"status\":\"idle\",\"message\":\"No action.\"}";
  private MayaHomeControl(){}
  private static JSONObject output(String state,String message) {
    JSONObject j=new JSONObject();
    try{j.put("status",state).put("message",message);}catch(Exception ignored){}
    return j;
  }
  private static boolean privateIp(String input){
    if(input==null||!input.matches("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}"))return false;
    // Reject even a DNS name that would allow rebinding. IPv4 literals only.
    String[] octets=input.split("\\.");
    if(octets.length!=4)return false;
    int[] a=new int[4];
    try{for(int i=0;i<4;i++){a[i]=Integer.parseInt(octets[i]);if(a[i]<0||a[i]>255||!Integer.toString(a[i]).equals(octets[i]))return false;}}
    catch(Exception e){return false;}
    return a[0]==10||(a[0]==172&&a[1]>=16&&a[1]<=31)||(a[0]==192&&a[1]==168);
  }
  private static String router(Activity act,String host){
    if(act==null||act.isFinishing()||!act.hasWindowFocus())return output("unavailable","Open Maya in foreground to launch router admin.").toString();
    if(!privateIp(host))return output("error","Only your private IPv4 router gateway is allowed.").toString();
    act.runOnUiThread(()->{
      try{Intent i=new Intent(Intent.ACTION_VIEW,Uri.parse("http://"+host+"/"));
        i.addCategory(Intent.CATEGORY_BROWSABLE);act.startActivity(i);
      }catch(Exception ignored){}
    });
    return output("requested","Requested Android browser for "+host+". Router login and settings changes are manual; not verified opened.").toString();
  }
  private static String doHttp(String host,String kind,String action){
    if(!privateIp(host))return output("error","Only private LAN IPv4 devices are supported.").toString();
    if(!("tasmota".equals(kind)||"shelly2".equals(kind)))return output("error","Unsupported smart device protocol.").toString();
    if(!("ON".equals(action)||"OFF".equals(action)||"STATUS".equals(action)))return output("error","Unsupported relay request.").toString();
    // These paths are fixed, not arbitrary URLs. No credentials or unapproved API endpoints.
    final String route;
    if("tasmota".equals(kind))route="/cm?cmnd=Power%20"+("STATUS".equals(action)?"":"ON".equals(action)?"On":"Off");
    else route="/rpc/Switch."+("STATUS".equals(action)?"GetStatus?id=0":"Set?id=0&on="+("ON".equals(action)?"true":"false"));
    String safeRoute=route;
    if("tasmota".equals(kind)&&"STATUS".equals(action))safeRoute="/cm?cmnd=Power";
    HttpURLConnection connection=null;
    try{
      // No hostname or URL redirect. Prevent outbound requests to arbitrary websites.
      URL url=new URL("http://"+host+safeRoute);
      if(!privateIp(url.getHost())||url.getPort()!=-1)throw new IllegalArgumentException("Unsafe device URL.");
      connection=(HttpURLConnection)url.openConnection();
      connection.setInstanceFollowRedirects(false);
      connection.setConnectTimeout(2800);connection.setReadTimeout(2800);
      connection.setRequestMethod("GET");
      connection.setUseCaches(false);
      int code=connection.getResponseCode();
      if(code!=200)return output("error","Device responded with HTTP "+code+"; check IP, permissions and firmware.").toString();
      byte[] buffer=new byte[1024];int n;int length=0;
      ByteArrayOutputStream buf=new ByteArrayOutputStream();
      try(InputStream input=connection.getInputStream()){
        while((n=input.read(buffer))!=-1){
          length+=n;if(length>6000)throw new IllegalArgumentException("Device response too long.");
          buf.write(buffer,0,n);
        }
      }
      String response=buf.toString("UTF-8");
      if(!response.trim().startsWith("{"))return output("error","Device sent non-JSON data; relay action cannot be verified.").toString();
      JSONObject j=new JSONObject(response);
      JSONObject out=output("ok","HTTP 200 JSON received from "+kind+" device; read its Power/relay value to verify state.");
      if("tasmota".equals(kind)){
        String state=j.optString("POWER",j.optString("POWER1",""));
        if(state.isEmpty())return output("error","Tasmota response lacks POWER state, so success is not verifiable.").toString();
        if(!"STATUS".equals(action)&&!state.equalsIgnoreCase(action))return output("error","Tasmota reported "+state+" instead of "+action+".").toString();
        out.put("deviceResponse","POWER="+state);
      }else{
        // Set returns a success JSON (possibly was_on) not the on state; do not claim the relay state without polling.
        if(!"STATUS".equals(action)){
          if(j.has("error"))return output("error","Shelly rejected the switch operation.").toString();
          out.put("deviceResponse","Switch.Set acknowledged. Say Check smart home status to verify relay state.");
        }else{
          if(!j.has("output"))return output("error","Shelly did not return Switch.GetStatus output state.").toString();
          out.put("deviceResponse","relay output="+j.optBoolean("output"));
        }
      }
      return out.toString();
    }catch(Exception e){return output("error","Smart device did not confirm: check same Wi-Fi, reachable IP, device API/auth and firmware.").toString();}
    finally{if(connection!=null)connection.disconnect();}
  }
  public static String execute(Context ctx,Activity act,String action,String raw){
    JSONObject args;
    try{args=new JSONObject(raw==null?"{}":raw);}catch(Exception e){return output("error","Invalid home request.").toString();}
    String host=args.optString("host","");
    if("ROUTER_OPEN".equals(action))return router(act,host);
    if("RESULT".equals(action)){
      synchronized(LOCK){try{
        JSONObject found=new JSONObject(last);
        if(found.optInt("id",-1)!=args.optInt("id",-2))
          return output("error","Unknown or replaced smart-home request.").toString();
        return last;
      }catch(Exception e){return output("error","Invalid home result.").toString();}}
    }
    if(!("ON".equals(action)||"OFF".equals(action)||"STATUS".equals(action)))
      return output("unsupported","Unknown home action.").toString();
    if(act==null||act.isFinishing()||!act.hasWindowFocus())return output("unavailable","Keep Maya in the foreground to control a home device.").toString();
    if(!privateIp(host))return output("error","Only a validated private LAN IPv4 address is allowed.").toString();
    final String kind=args.optString("kind","");
    if(!("tasmota".equals(kind)||"shelly2".equals(kind)))return output("error","Only Tasmota or Shelly Gen2/3 supported.").toString();
    final int id;
    synchronized(LOCK){
      try{
        if("pending".equals(new JSONObject(last).optString("status")))
          return output("busy","A home request is already running.").toString();
      }catch(Exception ignored){}
      id=++serial;
      JSONObject queued=output("pending","Asking the selected local device.");try{queued.put("id",id);}catch(Exception ignored){}
      last=queued.toString();
    }
    new Thread(()->{
      String result=doHttp(host,kind,action);
      synchronized(LOCK){
        if(id!=serial)return;
        try{
          JSONObject o=new JSONObject(result);o.put("id",id);last=o.toString();
        }catch(Exception e){last=output("error","Device returned malformed result.").toString();}
      }
    },"Maya-Local-SmartHome").start();
    JSONObject accepted=output("pending","Local home request sent; reading response.");
    try{accepted.put("id",id);}catch(Exception ignored){}
    return accepted.toString();
  }
}
