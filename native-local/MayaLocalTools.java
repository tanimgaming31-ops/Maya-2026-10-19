package com.tanim.maya;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.media.AudioManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.provider.DocumentsContract;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** PC-free Android tools; file commands are limited to Maya's user-granted SAF tree. */
public final class MayaLocalTools {
    private static final int LIMIT = 65536;
    private static volatile String lastDeletion = "No deletion requested.";
    private MayaLocalTools() {}
    private static JSONObject out(String status, String message) throws Exception {
        return new JSONObject().put("status", status).put("message", message);
    }
    private static String error(String message) {
        try { return out("error", message).toString(); }
        catch (Exception e) { return "{\"status\":\"error\"}"; }
    }
    private static boolean named(String n) {
        return n != null && n.matches("[A-Za-z0-9 _.-]{1,80}\\.txt") && !n.startsWith(".") && !n.contains("..");
    }
    private static Uri tree(Context ctx, boolean needWrite) {
        String saved = ctx.getSharedPreferences("maya_v54_files", 0).getString("tree", "");
        if (saved == null || saved.isEmpty()) return null;
        for (android.content.UriPermission grant:ctx.getContentResolver().getPersistedUriPermissions()) {
            if (saved.equals(grant.getUri().toString()) && grant.isReadPermission() && (!needWrite || grant.isWritePermission())) return grant.getUri();
        }
        return null;
    }
    private static Uri find(Context ctx, Uri folder, String name) throws Exception {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(folder, DocumentsContract.getTreeDocumentId(folder));
        Uri match = null;
        try (Cursor c = ctx.getContentResolver().query(children,new String[]{
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.COLUMN_SIZE},null,null,null)) {
            if (c == null) return null;
            while (c.moveToNext()) {
                if (!name.equals(c.getString(1))) continue;
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(c.getString(2))) continue;
                if (!c.isNull(3) && c.getLong(3)>LIMIT) throw new IllegalArgumentException("Text exceeds 64 KB.");
                if (match!=null) throw new IllegalArgumentException("Duplicate filenames detected.");
                match=DocumentsContract.buildDocumentUriUsingTree(folder,c.getString(0));
            }
        }
        return match;
    }
    public static String run(Context ctx, Activity act, String action, JSONObject args) {
        try {
            switch (action) {
              case "LOCAL_DEVICE": {
                JSONObject r=out("ok","Android device and battery read.");
                r.put("manufacturer",Build.MANUFACTURER).put("model",Build.MODEL)
                  .put("android",Build.VERSION.RELEASE).put("sdk",Build.VERSION.SDK_INT);
                Intent i=ctx.registerReceiver(null,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
                if(i!=null){
                    int a=i.getIntExtra(BatteryManager.EXTRA_LEVEL,-1),b=i.getIntExtra(BatteryManager.EXTRA_SCALE,-1);
                    if(a>=0 && b>0)r.put("batteryPercent",Math.round(a*100f/b));
                    int s=i.getIntExtra(BatteryManager.EXTRA_STATUS,-1);
                    r.put("charging",s==BatteryManager.BATTERY_STATUS_CHARGING||s==BatteryManager.BATTERY_STATUS_FULL);
                }
                return r.toString();
              }
              case "LOCAL_WIFI": {
                ConnectivityManager c=(ConnectivityManager)ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
                if(c==null)return error("Network service unavailable.");
                NetworkCapabilities n=c.getNetworkCapabilities(c.getActiveNetwork());
                return out("ok","Active network checked.")
                  .put("wifiConnected",n!=null&&n.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))
                  .put("cellularConnected",n!=null&&n.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR))
                  .put("internetValidated",n!=null&&n.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)).toString();
              }
              case "LOCAL_VOLUME_GET":
              case "LOCAL_VOLUME_SET": {
                AudioManager a=(AudioManager)ctx.getSystemService(Context.AUDIO_SERVICE);
                if(a==null)return error("Audio service unavailable.");
                int max=a.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                if("LOCAL_VOLUME_SET".equals(action)){
                    if(!args.has("percent")||args.isNull("percent"))return error("Specify media volume percent.");
                    int percent=args.optInt("percent",-1);
                    if(percent<0||percent>100)return error("Choose volume from 0 to 100%.");
                    a.setStreamVolume(AudioManager.STREAM_MUSIC,Math.round(percent*max/100f),0);
                }
                int level=a.getStreamVolume(AudioManager.STREAM_MUSIC);
                return out("ok","Media volume read.").put("level",level).put("max",max)
                    .put("percent",max==0?0:Math.round(level*100f/max)).toString();
              }
              case "LOCAL_FILE_READ": {
                String name=args.optString("name","");
                if(!named(name))return error("Enter a simple .txt filename, without paths.");
                Uri folder=tree(ctx,false);
                if(folder==null)return error("Select a folder with Android's picker first.");
                Uri file=find(ctx,folder,name);
                if(file==null)return error("Text document not found in the approved folder.");
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                try(InputStream in=ctx.getContentResolver().openInputStream(file)){
                    if(in==null)return error("Cannot open this text document.");
                    byte[] buffer=new byte[4096];int n;
                    while((n=in.read(buffer))!=-1){
                        if(bytes.size()+n>LIMIT)return error("Text exceeds 64 KB.");
                        bytes.write(buffer,0,n);
                    }
                }
                String value=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                  .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes.toByteArray())).toString();
                return out("ok","Text document read from approved folder.").put("name",name).put("text",value).toString();
              }
              case "LOCAL_FILE_DELETE": {
                String name=args.optString("name","");
                if(!named(name))return error("Only a selected .txt document can be deleted.");
                if(act==null||act.isFinishing())return error("Open Maya on screen to confirm deletion.");
                Uri folder=tree(ctx,true);if(folder==null)return error("Grant Android folder read/write access first.");
                Uri file=find(ctx,folder,name);if(file==null)return error("Text document not found.");
                lastDeletion="Awaiting Android confirmation for "+name;
                act.runOnUiThread(()->{
                    try {
                        new AlertDialog.Builder(act).setTitle("Delete "+name+"?")
                        .setMessage("Permanently delete this text file from your selected folder? Cannot undo.")
                        .setNegativeButton("Cancel",(d,w)->lastDeletion="Cancelled. File kept.")
                        .setPositiveButton("Delete file",(d,w)->{
                            try {lastDeletion=DocumentsContract.deleteDocument(ctx.getContentResolver(),file)
                                    ? "Deleted "+name+"." : "Android did not delete the file.";}
                            catch(Exception e){lastDeletion="Android refused to delete the file.";}
                        }).setOnCancelListener(d->lastDeletion="Cancelled. File kept.").show();
                    } catch(Exception e){lastDeletion="Android confirmation failed. File kept.";}
                });
                return out("requested","Await Android deletion confirmation. No file has been deleted yet.").toString();
              }
              case "LOCAL_DELETE_STATUS": return out("ok",lastDeletion).toString();
              default: return error("Unknown local command.");
            }
        } catch(Exception e) {
            return error(e instanceof SecurityException?"Android denied permission.":"Phone command failed: "+e.getClass().getSimpleName());
        }
    }
}
