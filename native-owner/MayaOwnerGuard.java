package com.tanim.maya;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.SystemClock;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Comparator;

/** Maya Owner Guard: opt-in, only while Maya is foreground.
 * Uses Android system BIOMETRIC_STRONG; neither raw face templates nor third-party
 * face identification is available. A reference selfie is NOT a face recognizer.
 * Security snapshots are visible camera captures by WebView with a prior opt-in.
 * Photos are in app-private NO_BACKUP storage; no uploads or silent gallery copies.
 */
public final class MayaOwnerGuard {
  private static final Object LOCK=new Object();
  private static long verifiedAt=0,deniedAt=0;
  private static int request=0,failed=0;
  private static boolean pending=false,recorded=false;
  private static String outcome="idle",message="Owner Guard is off.";
  private static final String PREF="maya_owner_guard_v174";
  private static final int MAX_PHOTOS=12;
  private MayaOwnerGuard(){}
  private static JSONObject obj(String status,String text){
    JSONObject x=new JSONObject();try{x.put("status",status).put("message",text);}catch(Exception ignored){}return x;
  }
  private static SharedPreferences prefs(Context c){return c.getSharedPreferences(PREF,Context.MODE_PRIVATE);}
  private static boolean armed(Context c){return prefs(c).getBoolean("armed",false);}
  private static boolean capture(Context c){return prefs(c).getBoolean("capture",false);}
  private static boolean isVerified(){return verifiedAt>0&&SystemClock.elapsedRealtime()-verifiedAt<90000;}
  private static File folder(Context c){return new File(c.getNoBackupFilesDir(),"maya-owner-guard");}
  private static JSONObject report(Context c){
    JSONObject r=obj("ok",message);
    synchronized(LOCK){try{
      r.put("armed",armed(c)).put("capture",capture(c));
      r.put("pending",pending).put("requestId",request).put("outcome",outcome);
      r.put("authorized",isVerified()).put("photoCount",images(c).length);
      r.put("hasReference",new File(folder(c),"reference.jpg").isFile());
    }catch(Exception ignored){}}
    return r;
  }
  private static File[] images(Context c){
    File[] fs=folder(c).listFiles((d,n)->n.matches("attempt-[0-9]+\\.jpg"));
    if(fs==null)return new File[0];Arrays.sort(fs,Comparator.comparing(File::getName).reversed());return fs;
  }
  private static void alert(Context ctx){
    try{
      if(Build.VERSION.SDK_INT>=33&&ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
      NotificationManager m=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
      if(m==null)return;
      if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel("maya_owner_guard_alert","Maya Owner Guard",NotificationManager.IMPORTANCE_HIGH);m.createNotificationChannel(channel);}
      Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(ctx,"maya_owner_guard_alert"):new Notification.Builder(ctx);
      b.setSmallIcon(android.R.drawable.ic_dialog_alert)
       .setContentTitle("Maya Owner Guard alert")
       .setContentText("An owner verification attempt was not approved while Maya was open.")
       .setAutoCancel(true);
      m.notify(17401,b.build());
    }catch(Exception ignored){}
  }
  private static void result(int id,Context ctx,String state,String text){
    synchronized(LOCK){
      if(id!=request)return;
      pending=false;outcome=state;message=text;
      if("unverified".equals(state)){deniedAt=SystemClock.elapsedRealtime();recorded=false;alert(ctx);}
    }
  }
  private static String authenticate(Activity a,String purpose,boolean saveSnapshots){
    if(a==null||a.isFinishing()||!a.hasWindowFocus())
      return obj("unavailable","Owner verification requires Maya visible on screen.").toString();
    if(Build.VERSION.SDK_INT<30)return obj("unsupported","This Owner Guard requires Android 11+ strong biometrics.").toString();
    try{
      BiometricManager manager=(BiometricManager)a.getSystemService(Context.BIOMETRIC_SERVICE);
      if(manager==null||manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)!=BiometricManager.BIOMETRIC_SUCCESS)
        return obj("unavailable","Register a strong fingerprint or supported secure face in Android Settings first.").toString();
    }catch(Exception e){return obj("error","Android biometric availability could not be checked.").toString();}
    final int id;
    synchronized(LOCK){
      if(pending)return obj("busy","Another biometric prompt is already open.").toString();
      request++;id=request;pending=true;failed=0;outcome="pending";message="Waiting for Android secure biometric verification.";
    }
    a.runOnUiThread(()->{
      try{
        final CancellationSignal signal=new CancellationSignal();
        BiometricPrompt.AuthenticationCallback cb=new BiometricPrompt.AuthenticationCallback(){
          @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r){
            synchronized(LOCK){verifiedAt=SystemClock.elapsedRealtime();}
            if("enable".equals(purpose))prefs(a).edit().putBoolean("armed",true).putBoolean("capture",saveSnapshots).apply();
            if("disable".equals(purpose))prefs(a).edit().putBoolean("armed",false).putBoolean("capture",false).apply();
            if("captureToggle".equals(purpose))prefs(a).edit().putBoolean("capture",saveSnapshots).apply();
            String msg="enable".equals(purpose)?"Owner Guard enabled while Maya is visible.": "disable".equals(purpose)?"Owner Guard disabled.":"System biometric verification approved.";
            result(id,a,"verified",msg);
          }
          @Override public void onAuthenticationFailed(){
            synchronized(LOCK){
              if(id!=request||!pending)return;
              failed++;
              if(failed>=2){
                result(id,a,"unverified","Two biometric attempts were not approved while Maya was open. This does NOT establish a stranger's identity.");
                signal.cancel();
              }
            }
          }
          @Override public void onAuthenticationError(int error,CharSequence msg){
            synchronized(LOCK){
              if(id!=request||!pending)return;
              if(failed>0||error==BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT)
                result(id,a,"unverified","Biometric verification unsuccessful. Identity is unknown; check your phone.");
              else result(id,a,"cancelled","Biometric check cancelled. No identity decision was made.");
            }
          }
        };
        BiometricPrompt.Builder builder=new BiometricPrompt.Builder(a)
          .setTitle("Maya Owner Guard")
          .setSubtitle("Verify with Android's enrolled strong biometric")
          .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
          .setNegativeButton("Cancel",a.getMainExecutor(),(dialog,which)->signal.cancel());
        builder.build().authenticate(signal,a.getMainExecutor(),cb);
      }catch(Exception e){result(id,a,"error","Could not open Android biometric verification.");}
    });
    JSONObject r=obj("pending","Android biometric prompt requested.");
    try{r.put("requestId",id);}catch(Exception ignored){}
    return r.toString();
  }
  private static JSONObject savePhoto(Context c,String kind,String encoded){
    if(encoded==null||encoded.length()<100||encoded.length()>1550000)
      return obj("error","Photo missing or too large (limit about 1 MB).");
    boolean reference="reference".equals(kind),attempt="attempt".equals(kind);
    if(!reference&&!attempt)return obj("error","Unknown photo type.");
    synchronized(LOCK){
      if(reference&&!isVerified())return obj("denied","Verify owner with Android biometrics before storing a reference selfie.");
      if(attempt&&(!armed(c)||!capture(c)||!"unverified".equals(outcome)||recorded||
         SystemClock.elapsedRealtime()-deniedAt>20000))
        return obj("denied","Only one opted-in visible photo shortly after a failed foreground verification.");
      if(attempt&&images(c).length>=MAX_PHOTOS)
        return obj("full","Photo limit of 12 reached. Verify as owner and delete old attempt photos first.");
    }
    byte[] bytes;
    try{
      bytes=Base64.decode(encoded,Base64.DEFAULT);
      if(bytes.length>1050000||bytes.length<100||BitmapFactory.decodeByteArray(bytes,0,bytes.length)==null)
        return obj("error","Invalid or oversized JPEG image.");
    }catch(Exception e){return obj("error","Invalid photo encoding.");}
    File dir=folder(c);
    if(!dir.exists()&&!dir.mkdirs())return obj("error","Private photo folder unavailable.");
    File target=new File(dir,reference?"reference.jpg":"attempt-"+System.currentTimeMillis()+".jpg");
    try(FileOutputStream out=new FileOutputStream(target)){out.write(bytes);out.flush();}
    catch(Exception e){return obj("error","Could not save the photo in Maya private storage.");}
    if(attempt){synchronized(LOCK){recorded=true;}}
    return obj("ok",reference?"Your reference selfie was saved privately. IMPORTANT: Maya does NOT recognize faces from this photo.":"A visible security snapshot was saved privately after an unverified biometric attempt.");
  }
  public static String run(Activity a,String action,String json){
    if(a==null)return obj("unavailable","Android Maya activity is not available.").toString();
    try{
      JSONObject args=new JSONObject(json==null?"{}":json);
      switch(String.valueOf(action)){
        case "STATUS":return report(a).toString();
        case "ENABLE":return authenticate(a,"enable",args.optBoolean("capture",false));
        case "DISABLE":return authenticate(a,"disable",false);
        case "CHECK":return armed(a)?authenticate(a,"check",false):obj("disabled","Enable Owner Guard first.").toString();
        case "VIEW_AUTH":return authenticate(a,"view",false);
        case "CAPTURE_TOGGLE":
          if(!armed(a))return obj("disabled","Enable Owner Guard first.").toString();
          return authenticate(a,"captureToggle",args.optBoolean("capture",false));
        case "SAVE_PHOTO":return savePhoto(a,args.optString("kind",""),args.optString("jpeg","")).toString();
        case "LIST":{
          if(!isVerified())return obj("denied","Verify via Android biometrics to view private photos.").toString();
          JSONArray list=new JSONArray();
          for(File f:images(a))list.put(new JSONObject().put("name",f.getName()).put("bytes",f.length()));
          JSONObject r=obj("ok","Private security photos; never uploaded.");r.put("photos",list);r.put("hasReference",new File(folder(a),"reference.jpg").isFile());return r.toString();
        }
        case "READ_PHOTO":{
          if(!isVerified())return obj("denied","Android biometric verification required to see a saved photo.").toString();
          String n=args.optString("name","");
          if(!n.equals("reference.jpg")&&!n.matches("attempt-[0-9]+\\.jpg"))return obj("error","Invalid filename.").toString();
          File f=new File(folder(a),n);
          if(!f.isFile()||f.length()>1050000)return obj("error","Saved photo not available.").toString();
          JSONObject r=obj("ok","App-private image.");r.put("jpeg",Base64.encodeToString(Files.readAllBytes(f.toPath()),Base64.NO_WRAP));return r.toString();
        }
        case "DELETE_PHOTOS":{
          if(!isVerified())return obj("denied","Verify with biometrics before deleting stored security photos.").toString();
          int count=0;
          for(File f:images(a))if(f.delete())count++;
          JSONObject r=obj("ok","Deleted selected guard attempt-photo collection; reference selfie preserved.");r.put("deleted",count);return r.toString();
        }
        default:return obj("unsupported","Unsupported Owner Guard request.").toString();
      }
    }catch(Exception e){return obj("error","Owner Guard operation failed; no change confirmed.").toString();}
  }
}
