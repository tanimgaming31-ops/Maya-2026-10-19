package com.tanim.maya;

import android.app.Notification;
import android.app.RemoteInput;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Locale;

/**
 * Explicitly opted-in, rule-based, notification-only reply.
 * No Gemini data upload and no automatic arbitrary chat access.
 * Replies are limited to a specific package AND exact sender name.
 */
public final class MayaAutoReply {
    private static final String PREF = "maya_approved_autoreply_v1";
    private static final String K_RULES = "rules", K_ON = "enabled";
    private static final String SUFFIX = " — Maya auto-reply";
    private static final long COOLDOWN_MS = 15L*60_000L;
    private static final int MAX_PER_RULE_DAY = 5, MAX_PER_DAY = 15;
    private static final String[] PACKAGES = {
        "com.whatsapp", "com.whatsapp.w4b",
        "com.imo.android.imoim", "com.imo.android.imous"
    };
    private MayaAutoReply(){}
    private static String error(String code,String detail) {
        try { return new JSONObject().put("status",code).put("message",detail).toString(); }
        catch(Exception ignored){ return "{\"status\":\"error\"}"; }
    }
    private static boolean allowedPackage(String name) {
        for(String p:PACKAGES)if(p.equals(name))return true;
        return false;
    }
    private static String normalize(String s){
        return s==null?"":s.trim().replaceAll("\\s+"," ").toLowerCase(Locale.ROOT);
    }
    private static boolean safeSender(String s){
        return s!=null&&s.length()>=2&&s.length()<=70&&s.trim().length()>=2
          &&s.indexOf('\n')<0&&s.indexOf('\r')<0&&s.indexOf('(')<0&&s.indexOf(')')<0;
    }
    private static boolean safeReply(String s){
        if(s==null||s.trim().length()<3||s.length()>180)return false;
        String l=s.toLowerCase(Locale.ROOT);
        return !l.matches("(?s).*(https?://|www\\.|otp|password|passcode|verification code|pin code|cvv|ওটিপি|পাসওয়ার্ড|পিন নম্বর).*");
    }
    private static JSONArray rules(SharedPreferences p){
        try{
            JSONArray array=new JSONArray(p.getString(K_RULES,"[]"));
            return array.length()<=12?array:new JSONArray();
        }catch(Exception ignored){return new JSONArray();}
    }
    private static long today(){return System.currentTimeMillis()/86400000L;}
    // Diagnostics contain NO private incoming text or sender identity.
    // Report the actual gate that stopped a reply, not just a generic success claim.
    private static void note(SharedPreferences p,String code) {
        p.edit().putString("last",code).putLong("lastTime",System.currentTimeMillis()).apply();
    }
    /** One source of truth: Android app local private preferences (no localStorage-only enable). */
    public static synchronized String control(Context c,String action,String payload){
        SharedPreferences prefs=c.getSharedPreferences(PREF,0);
        try{
            JSONObject in=new JSONObject(payload==null?"{}":payload);
            if("STATUS".equals(action)){
                JSONObject out=new JSONObject();
                out.put("status","ok").put("enabled",prefs.getBoolean(K_ON,false))
                   .put("rules",rules(prefs))
                   .put("listenerConnected",MayaNotificationService.connected)
                   .put("sentToday",prefs.getLong("day",0)==today()?prefs.getInt("count",0):0)
                   .put("lastOutcome",prefs.getString("last","No automatic reply attempted."))
                   .put("lastOutcomeTime",prefs.getLong("lastTime",0L))
                   .put("deliveryVerified",false);
                return out.toString();
            }
            if("SET_ENABLED".equals(action)){
                boolean on=in.optBoolean("enabled",false);
                if(on&&rules(prefs).length()==0)return error("needs_rule","Save an approved contact reply rule first.");
                if(on&&!MayaNotificationService.connected)
                    return error("needs_access","Maya Notification Listener is not connected; enable Maya Notification Access in Android Settings.");
                prefs.edit().putBoolean(K_ON,on).apply();
                return error("ok",on?"Automatic replies enabled for saved exact-contact rules.":"Automatic replies OFF.");
            }
            if("ADD_RULE".equals(action)){
                String pkg=in.optString("package",""),sender=in.optString("sender","").trim(),
                       reply=in.optString("reply","").trim();
                if(!allowedPackage(pkg)||!safeSender(sender)||!safeReply(reply))
                    return error("invalid","Select WhatsApp/IMO, exact contact name, and a short safe reply (3–180 characters).");
                JSONArray current=rules(prefs),next=new JSONArray();
                for(int i=0;i<current.length();i++){
                    JSONObject r=current.optJSONObject(i);
                    if(r!=null&&!(pkg.equals(r.optString("package"))&&normalize(sender).equals(normalize(r.optString("sender")))))
                        next.put(r);
                }
                if(next.length()>=8)return error("limit","Maximum 8 approved contact rules.");
                JSONObject item=new JSONObject().put("package",pkg).put("sender",sender)
                    .put("reply",reply).put("addedAt",System.currentTimeMillis());
                next.put(item);
                prefs.edit().putString(K_RULES,next.toString()).apply();
                return error("saved","Approved reply rule saved. Auto Reply remains OFF until separately enabled.");
            }
            if("DELETE_RULE".equals(action)){
                String pkg=in.optString("package",""),sender=in.optString("sender","").trim();
                JSONArray current=rules(prefs),next=new JSONArray();boolean found=false;
                for(int i=0;i<current.length();i++){
                    JSONObject r=current.optJSONObject(i);
                    if(r==null)continue;
                    if(pkg.equals(r.optString("package"))&&normalize(sender).equals(normalize(r.optString("sender")))){found=true;continue;}
                    next.put(r);
                }
                if(!found)return error("not_found","Approved contact rule not found.");
                prefs.edit().putString(K_RULES,next.toString()).putBoolean(K_ON,false).apply();
                return error("removed","Rule deleted; Auto Reply turned OFF for safety. Review and re-enable if needed.");
            }
            if("DISABLE_ALL".equals(action)){
                prefs.edit().putBoolean(K_ON,false).apply();
                return error("ok","Automatic replies OFF; existing rules retained.");
            }
            return error("unsupported","Unknown Auto Reply control.");
        }catch(Exception e){return error("error","Could not update Auto Reply settings.");}
    }
    private static boolean forbiddenIncoming(String content){
        if(content==null||content.trim().length()==0||content.length()>450)return true;
        String msg=content.trim().toLowerCase(Locale.ROOT);
        return msg.matches("(?s).*(otp|verification|one.time|security code|password|passcode|reset code|2fa|cvv|pin|bank|payment|transfer|invoice|account number|হিসাব নম্বর|পাসওয়ার্ড|ওটিপি|টাকা পাঠাও|কোড পাঠাও).*")
          ||msg.matches("(?s)^(you:|me:|তুমি:|আপনি:|[0-9]+ (new )?messages?).*");
    }
    private static boolean isGroup(Notification n,String title){
        Bundle e=n.extras;
        if(e==null)return true;
        if(e.getBoolean("android.isGroupConversation",false))return true;
        // On Android some *direct* conversations include a conversation title.
        // Only a different group title is enough to prove a group; if the
        // MessagingStyle's sender differs, the original listener attaches
        // "(sender)" to m.sender and that still fails closed below.
        CharSequence conversation=e.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE);
        if(conversation!=null&&!normalize(conversation.toString()).equals(normalize(title)))return true;
        return title==null||title.contains("(")||title.contains(")")||title.contains("@");
    }
    private static Notification.Action replyAction(Notification n){
        if(n.actions==null)return null;
        for(Notification.Action a:n.actions){
            if(a!=null&&a.actionIntent!=null){
                RemoteInput[] inputs=a.getRemoteInputs();
                if(inputs!=null)for(RemoteInput input:inputs){
                    if(input!=null&&input.getAllowFreeFormInput()&&!input.isDataOnly())return a;
                }
            }
        }
        return null;
    }
    /** Runs only after existing MayaNotificationService excluded sensitive messages. */
    static synchronized void onMessage(Context c, StatusBarNotification sbn, MayaNotificationService.Msg m){
        SharedPreferences p=c.getSharedPreferences(PREF,0);
        if(!p.getBoolean(K_ON,false))return;
        if(!allowedPackage(sbn.getPackageName()))return;
        if(m==null||m.action==null){note(p,"NO_QUICK_REPLY: App notification did not expose an Android Reply action.");return;}
        Notification n=sbn.getNotification();
        if(n==null){note(p,"NO_NOTIFICATION: Android notification was removed.");return;}
        if(isGroup(n,m.sender)){note(p,"GROUP_OR_AMBIGUOUS_SENDER: Refused to reply for safety.");return;}
        if(forbiddenIncoming(m.text)){note(p,"SENSITIVE_OR_UNCLEAR: Ignored a private, security, or unclear notification.");return;}
        if(!safeSender(m.sender)){note(p,"INVALID_SENDER: Notification sender name is ambiguous.");return;}
        if(replyAction(n)==null){note(p,"NO_QUICK_REPLY: No usable Android free-text reply.");return;}
        long now=System.currentTimeMillis();
        if(Math.abs(now-sbn.getPostTime())>120000L){note(p,"STALE: Ignored an old notification.");return;} // no reply to stale notifications
        long day=today();int count=p.getLong("day",0L)==day?p.getInt("count",0):0;
        if(count>=MAX_PER_DAY){note(p,"DAILY_LIMIT: Maximum 15 auto-replies reached.");return;}
        JSONArray list=rules(p);
        boolean matched=false;
        for(int i=0;i<list.length();i++){
            JSONObject r=list.optJSONObject(i);
            if(r==null||!sbn.getPackageName().equals(r.optString("package"))
                  ||!normalize(m.sender).equals(normalize(r.optString("sender"))))continue;
            matched=true;
            String tag="rule_"+Integer.toHexString((sbn.getPackageName()+"\n"+normalize(m.sender)).hashCode());
            long last=p.getLong(tag+"_at",0),lastDay=p.getLong(tag+"_day",0);
            int sentToday=lastDay==day?p.getInt(tag+"_count",0):0;
            if(last>0&&now-last<COOLDOWN_MS||sentToday>=MAX_PER_RULE_DAY){
                note(p,"COOLDOWN: Already replied recently or daily contact limit reached.");return;
            }
            // Avoid repeated notifications or app re-posts of the same message content.
            String fingerprint=Integer.toHexString((sbn.getKey()+"|"+m.text+"|"+sbn.getPostTime()).hashCode());
            if(fingerprint.equals(p.getString(tag+"_fingerprint",""))){
                note(p,"DUPLICATE: Notification update ignored.");return;
            }
            if(r.optLong("addedAt",0L)>sbn.getPostTime()){
                note(p,"OLDER_THAN_RULE: Message arrived before approval.");return;
            }
            String body=r.optString("reply","").trim();
            if(!safeReply(body)){note(p,"UNSAFE_TEMPLATE: Saved reply was rejected.");return;}
            Notification.Action action=replyAction(n);
            RemoteInput[] inputs=action.getRemoteInputs();
            if(inputs==null||inputs.length==0){note(p,"NO_QUICK_REPLY: Android did not provide reply input.");return;}
            String actual=body+SUFFIX;
            try{
                Intent intent=new Intent();Bundle data=new Bundle();
                for(RemoteInput input:inputs)if(input!=null&&input.getAllowFreeFormInput())
                    data.putCharSequence(input.getResultKey(),actual);
                if(data.isEmpty()){note(p,"NO_QUICK_REPLY: Android denied free-text input.");return;}
                RemoteInput.addResultsToIntent(inputs,intent,data);
                action.actionIntent.send(c,0,intent);
                // Android accepted PendingIntent, NOT a WhatsApp/IMO delivery receipt.
                p.edit().putLong("day",day).putInt("count",count+1)
                 .putLong(tag+"_at",now).putLong(tag+"_day",day)
                 .putInt(tag+"_count",sentToday+1)
                 .putString(tag+"_fingerprint",fingerprint)
                 .putString("last","SUBMITTED: Android Quick Reply intent submitted. Delivery not independently verified.")
                 .putLong("lastTime",now).apply();
            }catch(PendingIntent.CanceledException e){
                note(p,"EXPIRED: Notification reply action expired; nothing submitted.");
            }catch(Exception e){
                note(p,"ANDROID_ERROR: Android Quick Reply failed; delivery unverified.");
            }
            return;
        }
        if(!matched)note(p,"NO_RULE_MATCH: Exact messaging app and sender must match your saved rule. No reply sent.");
    }
}
