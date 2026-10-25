package com.tanim.maya;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.hardware.HardwareBuffer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.view.Display;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONObject;
import java.io.OutputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * MAYA explicit voice media controls. NO continuous capture; no uploads.
 * Screenshots require prior user-enabled Android Accessibility and Maya opt-in.
 * Android secure windows remain protected. YouTube selects only a strong,
 * visible title match in the official YouTube app and reports tap unverified.
 */
public final class MayaVoiceMedia {
    private MayaVoiceMedia(){}
    private static final String PREF="maya_media_voice_v1";
    private static final String OPT_IN="screenshot_enabled";
    private static final Handler UI=new Handler(Looper.getMainLooper());
    private static final AtomicBoolean CAPTURING=new AtomicBoolean(false);
    private static volatile String shotStatus="idle",shotMessage="No screenshot requested.",shotUri="";
    private static volatile String videoStatus="idle",videoMessage="No video requested.";
    private static volatile String target="";
    private static volatile long expires=0;
    private static volatile long videoRequestId=0;
    private static String json(String status,String message){
        try{return new JSONObject().put("status",status).put("message",message).toString();}
        catch(Exception e){return "{\"status\":\"error\"}";}
    }
    private static boolean opted(Context c){return c.getSharedPreferences(PREF,0).getBoolean(OPT_IN,false);}
    public static String control(Context c, Activity a, String action, String argsJson){
        try {
            JSONObject args=new JSONObject(argsJson==null?"{}":argsJson);
            if("SCREEN_ENABLE".equals(action)){
                if(a==null||a.isFinishing())return json("unavailable","Enable capture while Maya is visible.");
                boolean on=args.optBoolean("enabled",false);
                c.getSharedPreferences(PREF,0).edit().putBoolean(OPT_IN,on).apply();
                return json("ok",on?"Voice screenshot enabled. Enable Maya Accessibility in Android Settings.":"Voice screenshot disabled.");
            }
            if("SCREEN_DIAG".equals(action))return screenshotDiagnostics(c);
            if("SCREEN_CAPTURE".equals(action))return screenshot(c);
            if("SCREEN_STATUS".equals(action))return screenshotStatus(c);
            if("VIDEO_SEARCH".equals(action))return search(c,args.optString("query",""));
            if("VIDEO_STATUS".equals(action))return videoStatus();
            if("ACCESS_SETTINGS".equals(action)){
                if(a==null||a.isFinishing())return json("unavailable","Open Maya first.");
                a.runOnUiThread(()->{
                    try{a.startActivity(new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS));}
                    catch(Exception ignored){}
                });
                return json("requested","Android Accessibility Settings requested. Enable Maya screen controls manually.");
            }
            return json("error","Unsupported voice media action.");
        }catch(Exception e){return json("error","Invalid voice media request.");}
    }
    /** Android's permission, bound service, and screenshot capability are distinct. */
    public static String screenshotDiagnostics(Context c){
        try {
            MayaV4AccessService access=MayaV4AccessService.active;
            boolean connected=access!=null;
            boolean capability=false;
            if(connected){
                AccessibilityServiceInfo info=access.getServiceInfo();
                capability=info!=null &&
                   (info.getCapabilities() & AccessibilityServiceInfo.CAPABILITY_CAN_TAKE_SCREENSHOT)!=0;
            }
            JSONObject out=new JSONObject();
            out.put("status","ok");
            out.put("androidSdk",Build.VERSION.SDK_INT);
            out.put("voiceScreenshotOptIn",opted(c));
            out.put("accessibilityConnected",connected);
            out.put("screenshotCapability",capability);
            out.put("backgroundVoiceRunning",MayaV4VoiceService.running);
            out.put("lastRecognizedScreenshot",c.getSharedPreferences(PREF,0).getLong("lastRecognizedScreenshot",0L));
            out.put("lastVoiceActionResult",c.getSharedPreferences(PREF,0).getString("lastVoiceActionResult","No native screenshot voice command recognized yet."));
            out.put("latestCapture",screenshotStatus(c));
            out.put("message",Build.VERSION.SDK_INT<30?"Use the Android screen-capture permission button: direct Accessibility screenshot requires Android 11+."
                :!connected?"Enable Maya Screen Controls in Android Accessibility settings; after an APK upgrade turn the service OFF and back ON."
                :!capability?"Android has not granted screenshot capability to the running Maya Accessibility service. Turn it OFF and ON in Settings after the update."
                :!opted(c)?"Enable Voice Screenshot in Maya Settings."
                :"Ready for one screenshot request. Use Screenshot now to verify Gallery save.");
            return out.toString();
        }catch(Exception e){return json("error","Could not read Screenshot diagnostics.");}
    }
    public static String screenshotStatus(Context c){
        String status=shotStatus,uri=shotUri,description=shotMessage;
        try{
            android.content.SharedPreferences p=c.getSharedPreferences(PREF,0);
            status=p.getString("captureStatus",status);
            description=p.getString("captureMessage",description);
            uri=p.getString("captureUri",uri);
        }catch(Exception ignored){}
        try{
            if("capturing".equals(status)){
                long start=c.getSharedPreferences(PREF,0).getLong("captureStartedAt",0);
                if(start>0&&System.currentTimeMillis()-start>16000){
                    complete(c,"timeout","Android screenshot callback timed out; check Maya Accessibility screenshot permission.","");
                    status="timeout";description=shotMessage;uri="";
                }
            }
            return new JSONObject().put("status",status).put("message",description).put("uri",uri).toString();
        }
        catch(Exception e){return json("error","Screenshot status unavailable.");}
    }
    private static void writeStatus(Context c,String status,String message,String uri){
        shotStatus=status;shotMessage=message;shotUri=uri;
        c.getSharedPreferences(PREF,0).edit()
            .putString("captureStatus",status).putString("captureMessage",message)
            .putString("captureUri",uri).apply();
    }
    private static String refuseScreenshot(Context c,String status,String detail){
        writeStatus(c,status,detail,"");return json(status,detail);
    }
    public static String screenshot(Context c){
        if(!opted(c))return refuseScreenshot(c,"needs_opt_in","Enable Voice Screenshot in Maya Settings first.");
        if(Build.VERSION.SDK_INT<30)return refuseScreenshot(c,"unsupported","Direct Accessibility screenshot requires Android 11+. Use the original Android screen-sharing capture prompt.");
        MayaV4AccessService access=MayaV4AccessService.active;
        if(access==null)return refuseScreenshot(c,"needs_accessibility","Enable Maya Screen Controls under Android Accessibility settings.");
        AccessibilityServiceInfo activeInfo=access.getServiceInfo();
        if(activeInfo==null||(activeInfo.getCapabilities() &
            AccessibilityServiceInfo.CAPABILITY_CAN_TAKE_SCREENSHOT)==0)
            return refuseScreenshot(c,"needs_accessibility","Maya Screen Controls is enabled but Android has not granted screenshot capability. Turn the service OFF and ON in Android Accessibility settings.");
        if(!CAPTURING.compareAndSet(false,true))return json("busy","A screenshot is already processing.");
        writeStatus(c,"capturing","Android screenshot requested; not saved yet.","");
        final long started=SystemClock.elapsedRealtime();
        c.getSharedPreferences(PREF,0).edit().putLong("captureStartedAt",System.currentTimeMillis()).apply();
        // An Android callback can be lost after service shutdown or a platform failure.
        // Never leave Gallery status as "capturing" indefinitely.
        UI.postDelayed(()->{
            if(CAPTURING.get() && "capturing".equals(shotStatus)
               && SystemClock.elapsedRealtime()-started>=14000){
                complete(c,"timeout","Android did not return a screenshot within 14 seconds; re-enable Maya Screen Controls or try the original Capture Screen permission button.","");
            }
        },14500);
        UI.post(()->{
            try{
                if(MayaV4AccessService.active!=access){complete(c,"error","Accessibility disconnected.","");return;}
                access.takeScreenshot(Display.DEFAULT_DISPLAY, c.getMainExecutor(),new AccessibilityService.TakeScreenshotCallback(){
                    @Override public void onSuccess(AccessibilityService.ScreenshotResult result){
                        new Thread(()->saveGallery(c,result),"maya-shot-save").start();
                    }
                    @Override public void onFailure(int errorCode){
                        String why=errorCode==AccessibilityService.ERROR_TAKE_SCREENSHOT_NO_ACCESSIBILITY_ACCESS
                          ?"Android Accessibility is disabled or screenshot access was revoked. Switch Maya Screen Controls OFF and ON."
                          :errorCode==AccessibilityService.ERROR_TAKE_SCREENSHOT_INTERVAL_TIME_SHORT
                          ?"Android rate-limited screenshots. Wait a few seconds, then try again."
                          :errorCode==AccessibilityService.ERROR_TAKE_SCREENSHOT_INVALID_DISPLAY
                          ?"Android rejected the selected display."
                          :errorCode==AccessibilityService.ERROR_TAKE_SCREENSHOT_INTERNAL_ERROR
                          ?"Android screenshot internal error. Try another non-protected screen."
                          :errorCode==6
                          ?"The screen is protected (secure content); Android blocks screenshots."
                          :"Android screenshot failed (code "+errorCode+").";
                        complete(c,"error",why,"");
                    }
                });
            }catch(Exception e){complete(c,"error","Android screenshot API was unavailable.","");}
        });
        return json("capturing","Capture requested for the current visible screen. Check SCREEN_STATUS to confirm Gallery save.");
    }
    private static void complete(Context c,String status,String message,String uri){
        writeStatus(c,status,message,uri);CAPTURING.set(false);
    }
    private static void saveGallery(Context c, AccessibilityService.ScreenshotResult result){
        Bitmap bitmap=null,copy=null;Uri saved=null;
        HardwareBuffer buffer=null;
        try{
            buffer=result.getHardwareBuffer();
            if(buffer==null)throw new IllegalStateException("Missing Android screenshot buffer");
            bitmap=Bitmap.wrapHardwareBuffer(buffer,result.getColorSpace());
            if(bitmap==null)throw new IllegalStateException("Unable to decode screenshot");
            copy=bitmap.copy(Bitmap.Config.ARGB_8888,false);
            if(copy==null)throw new IllegalStateException("Unable to copy screenshot");
            ContentValues row=new ContentValues();
            row.put(MediaStore.Images.Media.DISPLAY_NAME,"Maya-Voice-"+System.currentTimeMillis()+".png");
            row.put(MediaStore.Images.Media.MIME_TYPE,"image/png");
            row.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/Maya");
            row.put(MediaStore.Images.Media.IS_PENDING,1);
            saved=c.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,row);
            if(saved==null)throw new IllegalStateException("Gallery refused a new image");
            try(OutputStream stream=c.getContentResolver().openOutputStream(saved,"w")){
                if(stream==null||!copy.compress(Bitmap.CompressFormat.PNG,100,stream))
                    throw new IllegalStateException("Image encoding failed");
            }
            ContentValues publish=new ContentValues();publish.put(MediaStore.Images.Media.IS_PENDING,0);
            if(c.getContentResolver().update(saved,publish,null,null)<1)throw new IllegalStateException("Gallery did not publish screenshot");
            if(!"capturing".equals(shotStatus)){
                c.getContentResolver().delete(saved,null,null);saved=null;return;
            }
            complete(c,"saved","Screenshot saved in Gallery → Pictures/Maya.",saved.toString());saved=null;
        }catch(Exception error){
            if(saved!=null)try{c.getContentResolver().delete(saved,null,null);}catch(Exception ignored){}
            complete(c,"error","Could not save screenshot in Gallery.","");
        }finally{
            if(copy!=null)copy.recycle();
            if(bitmap!=null)bitmap.recycle();
            if(buffer!=null)buffer.close();
        }
    }
    // Spoken phrase matching is deliberately narrow: a standalone explicit
    // screenshot command is allowed only while the user-started microphone
    // service is already active. This is NOT an always-on wake-word listener.
    private static String commandText(String words){
        String s=words==null?"":words.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[।!?,]+$","").trim();
        return s.replaceFirst("^(?:(?:hey )?maya|মায়া|মায়া|মাইয়া|মাইয়া)[,،:]?\\s+","");
    }
    public static boolean isExplicitScreenshotUtterance(String phrase){
        String s=commandText(phrase);
        return s.matches("^(?:(?:take|capture|save)(?: a| the| my)? screenshot|screenshot(?: now)?|স্ক্রিনশট(?: নাও| নিন| নেও| তোলো| তুলে দাও| নিয়ে দাও| নিয়ে দাও| সেভ করো| করো| করে দাও| দাও| তুলো| নিয়ে নাও| নিয়ে নাও)?|স্ক্রিনশট নিয়ে গ্যালারিতে সেভ করো|স্ক্রিনের ছবি (?:নাও|তোলো|তুলো|নিয়ে দাও|নিয়ে দাও))$");
    }
    public static boolean handleSpoken(Context context,String words){
        String s=commandText(words);
        if(isExplicitScreenshotUtterance(words)){
            String result=screenshot(context);
            String outcome="Screenshot voice recognized; Android reported no completion.";
            try{
                JSONObject status=new JSONObject(result);
                outcome="Voice recognized → "+status.optString("status","unknown")+
                    ": "+status.optString("message","Check Gallery result.");
            }catch(Exception ignored){}
            context.getSharedPreferences(PREF,0).edit()
                .putLong("lastRecognizedScreenshot",System.currentTimeMillis())
                .putString("lastVoiceActionResult",outcome).apply();
            return true;
        }
        String title=null;
        java.util.regex.Matcher en=java.util.regex.Pattern.compile("^(?:play youtube|youtube play|youtube search and play|play on youtube) (.{2,150})$").matcher(s);
        if(en.matches())title=en.group(1);
        java.util.regex.Matcher bn=java.util.regex.Pattern.compile("^ইউটিউবে? (.{2,145}?) (?:ভিডিও(?:টা|টি)? )?(?:চালাও|প্লে করো|সার্চ করে চালাও|খুঁজে চালাও)$").matcher(s);
        if(bn.matches())title=bn.group(1);
        if(title!=null){search(context,title);return true;}
        return false;
    }
    private static String norm(String text){
        String x=Normalizer.normalize(String.valueOf(text),Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
        return x.replaceAll("[^\\p{L}\\p{N}]+"," ").trim().replaceAll("\\s+"," ");
    }
    private static boolean matchTitle(String wanted,String visible){
        String t=norm(visible),q=norm(wanted);
        if(q.length()<3||t.length()<3)return false;
        if(t.contains("sponsored")||t.contains("advertisement")||t.contains("promoted")
           ||t.contains("বিজ্ঞাপন")||t.contains("sponsor"))return false;
        if(t.equals(q)||t.contains(q))return true;
        String[] parts=q.split(" ");int length=0,matched=0;
        for(String word:parts){if(word.length()<2)continue;length++;if(t.contains(word))matched++;}
        return length>=2&&matched==length&&q.length()>=8;
    }
    private static void cancelSearch(){
        target="";expires=0;videoRequestId++;
    }
    public static String videoStatus(){return json(videoStatus,videoMessage);}
    public static String search(Context c,String requested){
        String query=requested==null?"":requested.trim();
        if(query.length()<2||query.length()>150)return json("error","Video name must be 2–150 characters.");
        MayaV4AccessService access=MayaV4AccessService.active;
        if(access==null)return json("needs_accessibility","Enable Maya Screen Controls in Android Accessibility Settings before video playback.");
        String url="https://www.youtube.com/results?search_query="+Uri.encode(query);
        try{
            Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse(url));
            intent.setPackage("com.google.android.youtube");intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            cancelSearch();
            target=query;expires=SystemClock.elapsedRealtime()+30000;
            long request=videoRequestId;
            videoStatus="pending";videoMessage="Opening YouTube search; checking the requested visible title for up to 30 seconds.";
            c.startActivity(intent);
            UI.postDelayed(()->poll(access,request),1800);
            return videoStatus();
        }catch(Exception error){cancelSearch();videoStatus="error";videoMessage="Android could not open YouTube search; background starts may be blocked.";return videoStatus();}
    }
    private static void poll(MayaV4AccessService access,long request){
        if(request!=videoRequestId||!"pending".equals(videoStatus))return;
        if(SystemClock.elapsedRealtime()>=expires){videoStatus="not_found";videoMessage="No matching visible YouTube title found before timeout; nothing was tapped.";cancelSearch();return;}
        try{
            AccessibilityNodeInfo root=access.getRootInActiveWindow();
            if(root!=null&&root.getPackageName()!=null&&
               "com.google.android.youtube".contentEquals(root.getPackageName())){
                ArrayList<AccessibilityNodeInfo> queue=new ArrayList<>();queue.add(root);
                HashSet<String> titles=new HashSet<>();
                AccessibilityNodeInfo best=null;int count=0;
                for(int k=0;k<queue.size()&&count<550;k++,count++){
                    AccessibilityNodeInfo node=queue.get(k);
                    if(node==null)continue;
                    if(node.isVisibleToUser()&&!node.isEditable()){
                        CharSequence text=node.getText(),desc=node.getContentDescription();
                        String label=text!=null?text.toString():"";
                        if(label.length()<2 && desc!=null)label=desc.toString();
                        if(matchTitle(target,label)&&titles.add(norm(label))){
                            if(best!=null){videoStatus="ambiguous";videoMessage="More than one different matching video title is visible. Choose the right result manually.";cancelSearch();return;}
                            best=node;
                        }
                    }
                    int children=Math.min(35,node.getChildCount());
                    for(int i=0;i<children;i++){AccessibilityNodeInfo child=node.getChild(i);if(child!=null)queue.add(child);}
                }
                if(best!=null){
                    boolean tapped=false;
                    for(AccessibilityNodeInfo n=best,up=null; n!=null && up!=n;up=n,n=n.getParent()){
                        if(n.isVisibleToUser()&&n.isClickable()&&n.performAction(AccessibilityNodeInfo.ACTION_CLICK)){tapped=true;break;}
                        if(up!=null&&count>565)break;
                    }
                    videoStatus=tapped?"tap_requested":"not_clickable";
                    videoMessage=tapped?"Matching YouTube video was tapped; actual playback is not yet verified.":"Matching title found, but Android did not allow tapping it.";
                    cancelSearch();return;
                }
            }
        }catch(Exception ignored){}
        UI.postDelayed(()->poll(access,request),1100);
    }
}
