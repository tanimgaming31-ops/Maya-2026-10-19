package com.tanim.maya;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONObject;

/** Explicit user-approved, single-step foreground macro; no arbitrary sequences. */
public final class MayaV54Macro {
    private MayaV54Macro(){}
    private static volatile String state="idle",detail="No macro started.";
    private static final Handler MAIN=new Handler(Looper.getMainLooper());
    private static JSONObject reply(String status,String message){
        JSONObject o=new JSONObject();try{o.put("status",status).put("message",message);}catch(Exception ignored){}return o;
    }
    private static boolean safeLabel(String label){
        if(label==null||label.trim().length()<2||label.length()>48)return false;
        String t=label.toLowerCase(java.util.Locale.ROOT);
        return !t.matches(".*(send|delete|purchase|pay|checkout|confirm|submit|password|install|allow|otp|transfer|buy|remove|reset|uninstall|authorize|permission|security|payment|verify|login|sign in|পাঠা|মুছ|ডিলিট|কিন|পেমেন্ট|অনুমতি).*");
    }
    public static String start(Context ctx,String pkg,String activity,String label){
        if(!safeLabel(label))return reply("error","Macro label is not allowed; avoid risky or irreversible controls.").toString();
        if(pkg==null||activity==null||pkg.length()>220||activity.length()>250)
            return reply("error","Choose an installed launcher app.").toString();
        if(MayaV4AccessService.active==null)
            return reply("needs_accessibility","Enable Maya's Screen Control service manually in Android Accessibility settings.").toString();
        if("pending".equals(state))return reply("busy","A macro is already pending.").toString();
        // Native launcher independently re-checks that package/activity pair is visible and valid.
        String opened=MayaAppCatalog.launch(ctx,pkg,activity);
        try {
            JSONObject status=new JSONObject(opened);
            if(!"launched".equals(status.optString("status")))
                return reply("error","The target app could not open in the foreground.").toString();
        }catch(Exception error){return reply("error","Native app launch was not verified.").toString();}
        state="pending";detail="Waiting for exact target app and visible control.";
        final String expected=pkg,needle=label;
        MAIN.postDelayed(()->{
            try {
                MayaV4AccessService access=MayaV4AccessService.active;
                if(access==null){state="not_performed";detail="Accessibility service disconnected.";return;}
                AccessibilityNodeInfo root=access.getRootInActiveWindow();
                if(root==null||root.getPackageName()==null||!expected.contentEquals(root.getPackageName())){
                    state="not_performed";detail="Foreground screen was not the selected app.";return;
                }
                boolean clicked=access.command("tap",needle);
                state=clicked?"tap_requested":"not_performed";
                detail=clicked?"Android accessibility tap requested; app effect is not verified.":"No matching safe visible button was tapped.";
            }catch(Exception ignored){state="not_performed";detail="Android rejected the macro.";}
        },1800);
        return reply("pending","Opened selected app. Waiting to locate the approved control.").toString();
    }
    public static String status(){
        return reply(state,detail).toString();
    }
}
