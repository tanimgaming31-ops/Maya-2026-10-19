package com.tanim.maya;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.ComponentName;
import android.provider.Settings;
import org.json.JSONObject;
import org.json.JSONArray;
import java.util.List;

/** V54 consolidates existing native Android capabilities. No new broad grants. */
public final class MayaV54Bridge {
    private MayaV54Bridge(){}
    private static String msg(String status,String text){
        try{return new JSONObject().put("status",status).put("message",text).toString();}
        catch(Exception ignored){return "{\"status\":\"error\"}";}
    }
    public static String run(Context ctx,Activity act,String action,String data){
        try{
            JSONObject input=new JSONObject(data==null?"{}":data);
            if(action==null)return msg("error","Action is missing.");
            switch(action){
              case "FILES_PICK":return MayaV54Files.choose(act);
              case "FILES_STATUS":return MayaV54Files.status(ctx);
              case "FILES_LIST":return MayaV54Files.list(ctx);
              case "FILES_SAVE_TEXT":return MayaV54Files.saveText(ctx,input.optString("name",""),input.optString("text",""));
              case "REMINDERS_LIST":return MayaControls.run(ctx,act,"REMINDER_LIST",new JSONObject());
              case "REMINDERS_SET":return MayaControls.run(ctx,act,"REMINDER_SET",input);
              case "REMINDERS_CANCEL":return MayaControls.run(ctx,act,"REMINDER_CANCEL",input);
              case "NOTIFICATIONS_STATUS":{
                JSONObject out=new JSONObject();
                out.put("status","ok");
                String access=Settings.Secure.getString(ctx.getContentResolver(),"enabled_notification_listeners");
                boolean granted=false;
                if(access!=null)for(String part:access.split(":")){
                    ComponentName item=ComponentName.unflattenFromString(part);
                    if(item!=null&&ctx.getPackageName().equals(item.getPackageName())){granted=true;break;}
                }
                out.put("access",granted);
                out.put("connected",MayaNotificationService.connected);
                return out.toString();
              }
              case "NOTIFICATIONS_OPEN_ACCESS":{
                if(act==null)return msg("unavailable","Maya is not foreground.");
                act.runOnUiThread(()->{
                    try{act.startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));}
                    catch(Exception ignored){}
                });
                return msg("requested","Android Notification Access settings opened; enable Maya manually.");
              }
              case "NOTIFICATIONS_LIST":{
                JSONObject out=new JSONObject();JSONArray messages=new JSONArray();
                List<MayaNotificationService.Msg> current=MayaNotificationService.recent(10,"");
                for(MayaNotificationService.Msg row:current)messages.put(row.toJson());
                out.put("status","ok").put("messages",messages);
                return out.toString();
              }
              case "NOTIFICATIONS_REPLY":{
                String id=input.optString("id",""),body=input.optString("text","");
                if(!id.matches("n[0-9]{1,12}")||body.trim().length()<1||body.length()>300)
                    return msg("error","Select a recent notification and a reply of 1–300 characters.");
                String error=MayaNotificationService.sendReply(ctx,id,body);
                return error==null?msg("sent_to_android","Quick reply intent submitted; delivery cannot be guaranteed."):msg("error",error);
              }
              default:return msg("unsupported","Unknown V54 native action.");
            }
        }catch(Exception error){return msg("error","Invalid native action or Android unavailable.");}
    }
}
