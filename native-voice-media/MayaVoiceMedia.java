package com.tanim.maya;

import android.accessibilityservice.AccessibilityService;
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
    public static String screenshotStatus(Context c){
        String status=shotStatus,uri=shotUri,description=shotMessage;
        try{
            android.content.SharedPreferences p=c.getSharedPreferences(PREF,0);
            status=p.getString("captureStatus",status);
            description=p.getString("captureMessage",description);
            uri=p.getString("captureUri",uri);
        }catch(Exception ignored){}
        try{return new JSONObject().put("status",status).put("message",description).put("uri",uri).toString();}
        catch(Exception e){return json("error","Screenshot status unavailable.");}
    }
    private static void writeStatus(Context c,String status,String message,String uri){
        shotStatus=status;shotMessage=message;shotUri=uri;
        c.getSharedPreferences(PREF,0).edit()
            .putString("captureStatus",status).putString("captureMessage",message)
            .putString("captureUri",uri).apply();
    }
    public static String screenshot(Context c){
        if(!opted(c))return json("needs_opt_in","Enable Voice Screenshot in Maya Settings first.");
        if(Build.VERSION.SDK_INT<30)return json("unsupported","One-command Accessibility screenshot needs Android 11+. Use the existing Android capture consent button on Android 10.");
        MayaV4AccessService access=MayaV4AccessService.active;
        if(access==null)return json("needs_accessibility","Enable Maya Screen Controls under Android Accessibility settings.");
        if(!CAPTURING.compareAndSet(false,true))return json("busy","A screenshot is already processing.");
        writeStatus(c,"capturing","Android screenshot requested; not saved yet.","");
        UI.post(()->{
            try{
                if(MayaV4AccessService.active!=access){complete(c,"error","Accessibility disconnected.","");return;}
                access.takeScreenshot(Display.DEFAULT_DISPLAY, c.getMainExecutor(),new AccessibilityService.TakeScreenshotCallback(){
                    @Override public void onSuccess(AccessibilityService.ScreenshotResult result){
                        new Thread(()->saveGallery(c,result),"maya-shot-save").start();
                    }
                    @Override public void onFailure(int errorCode){
                        complete(c,"error","Android rejected screenshot (error "+errorCode+"). Secure/protected windows are not capturable.","");
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
    /** Execute only an explicitly spoken request with Maya prefix handled by caller. */
    public static boolean handleSpoken(Context context,String words){
        String s=words==null?"":words.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[।!?]+$","").trim();
        if(s.matches("^(?:(?:take|capture|save)(?: a| the| my)? screenshot|screenshot|স্ক্রিনশট(?: নাও| নিন| নেও| তোলো| তুলে দাও| নিয়ে দাও| নিয়ে দাও| সেভ করো)?|স্ক্রিনশট (?:নাও|তুলো|সেভ করো)|স্ক্রিনশট নিয়ে গ্যালারিতে সেভ করো)$")){
            screenshot(context);return true;
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
            if(intent.resolveActivity(c.getPackageManager())==null)return json("unavailable","Install or enable the official YouTube app; browser results cannot be auto-tapped.");
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
