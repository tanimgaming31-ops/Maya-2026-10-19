package com.tanim.maya;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.DocumentsContract;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Maya Android Controls V167: no arbitrary file deletion, no background surveillance.
 * Bluetooth: one foreground BLE scan and verified selected GATT connection, no classic pairing.
 * Storage: bounded, user-approved SAF tree. Duplicate = same size AND full SHA-256.
 */
public final class MayaAndroidControls {
    private MayaAndroidControls(){}
    private static final Object LOCK=new Object();
    private static volatile String storageJson="{\"status\":\"idle\",\"message\":\"No storage scan yet.\"}";
    private static int storageSeq=0;
    private static final int MAX_FILES=240;
    private static final long MAX_HASH_FILE=8L*1024*1024, MAX_HASH_BUDGET=55L*1024*1024;
    private static final Map<String, BleItem> devices=new LinkedHashMap<>();
    private static ScanCallback callback;
    private static BluetoothLeScanner scanner;
    private static BluetoothGatt gatt;
    private static String connection="Not connected.";
    private static int nextId=1;
    private static final Handler MAIN=new Handler(Looper.getMainLooper());

    private static JSONObject result(String status,String message) {
        JSONObject r=new JSONObject();
        try{r.put("status",status).put("message",message);}catch(Exception ignored){}
        return r;
    }
    private static String fail(String message){return result("error",message).toString();}
    private static Uri approved(Context c) {
        String saved=c.getSharedPreferences("maya_v54_files",0).getString("tree","");
        if(saved==null||saved.isEmpty())return null;
        for(android.content.UriPermission p:c.getContentResolver().getPersistedUriPermissions()) {
            if(saved.equals(p.getUri().toString())&&p.isReadPermission())return p.getUri();
        }
        return null;
    }
    private static final class Doc {
        final String name,docId; final long size; final String cat;
        Doc(String name,String id,long size,String cat){this.name=name;this.docId=id;this.size=size;this.cat=cat;}
    }
    private static String category(String name,String mime) {
        String m=mime==null?"":mime.toLowerCase(Locale.ROOT), n=name.toLowerCase(Locale.ROOT);
        if(m.startsWith("image/")||n.matches(".*\\.(png|jpg|jpeg|webp|gif|heic)$"))return "Images";
        if(m.startsWith("video/")||n.matches(".*\\.(mp4|mov|mkv|3gp)$"))return "Videos";
        if(m.startsWith("audio/")||n.matches(".*\\.(mp3|wav|m4a|ogg|flac)$"))return "Audio";
        if(n.matches(".*\\.(zip|rar|7z|gz|apk)$"))return "Archives/APKs";
        if(m.startsWith("text/")||m.contains("pdf")||n.matches(".*\\.(pdf|txt|doc|docx|xls|xlsx|csv|md|json)$"))return "Documents";
        return "Other";
    }
    private static String sha256(Context ctx,Uri tree,Doc doc) throws Exception {
        Uri u=DocumentsContract.buildDocumentUriUsingTree(tree,doc.docId);
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        long count=0;
        try(InputStream input=ctx.getContentResolver().openInputStream(u)){
            if(input==null)throw new IllegalStateException("unreadable");
            byte[] buf=new byte[32768];int n;
            while((n=input.read(buf))!=-1){
                count+=n;if(count>MAX_HASH_FILE)throw new IllegalStateException("too large");
                digest.update(buf,0,n);
            }
        }
        if(count!=doc.size)throw new IllegalStateException("file changed during scan");
        StringBuilder sb=new StringBuilder(64);
        for(byte b:digest.digest())sb.append(String.format(Locale.ROOT,"%02x",b & 255));
        return sb.toString();
    }
    private static final class Folder {
        String id;int depth;
        Folder(String id,int depth){this.id=id;this.depth=depth;}
    }
    private static void scanFolder(Context ctx, Uri tree, int request){
        JSONObject response=result("ok","Read-only report from your selected folder. Nothing deleted.");
        List<Doc> files=new ArrayList<>();boolean limited=false;int unknown=0;
        try{
            ArrayDeque<Folder> q=new ArrayDeque<>();
            q.add(new Folder(DocumentsContract.getTreeDocumentId(tree),0));
            Set<String> seen=new HashSet<>();
            while(!q.isEmpty()&&files.size()<MAX_FILES){
                Folder f=q.poll();if(!seen.add(f.id))continue;
                Uri children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,f.id);
                try(Cursor cur=ctx.getContentResolver().query(children,new String[]{
                    DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE,
                    DocumentsContract.Document.COLUMN_SIZE},null,null,null)){
                    if(cur==null)continue;
                    while(cur.moveToNext()){
                        if(files.size()>=MAX_FILES){limited=true;break;}
                        String id=cur.getString(0),name=cur.getString(1),mime=cur.getString(2);
                        if(id==null||name==null)continue;
                        if(DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)){
                            if(f.depth<2&&seen.size()+q.size()<120)q.add(new Folder(id,f.depth+1));
                            else limited=true;
                            continue;
                        }
                        long size=cur.isNull(3)?-1:cur.getLong(3);
                        if(size<0)unknown++;
                        files.add(new Doc(name,id,size,category(name,mime)));
                    }
                }
            }
            if(!q.isEmpty())limited=true;
            long bytes=0;Map<String,long[]> categories=new LinkedHashMap<>();Map<Long,List<Doc>> bySize=new HashMap<>();
            for(Doc d:files){
                if(d.size>=0)bytes+=d.size;
                long[] stats=categories.computeIfAbsent(d.cat,k->new long[]{0,0});
                stats[0]++;if(d.size>=0)stats[1]+=d.size;
                if(d.size>0&&d.size<=MAX_HASH_FILE)bySize.computeIfAbsent(d.size,k->new ArrayList<>()).add(d);
            }
            JSONObject groups=new JSONObject();
            for(Map.Entry<String,long[]> e:categories.entrySet())
                groups.put(e.getKey(),new JSONObject().put("count",e.getValue()[0]).put("bytes",e.getValue()[1]));
            response.put("categories",groups).put("files",files.size()).put("bytes",bytes).put("unknown",unknown);
            response.put("limited",limited);
            List<Doc> ordered=new ArrayList<>(files);ordered.sort((a,b)->Long.compare(b.size,a.size));
            JSONArray largest=new JSONArray();
            for(int i=0;i<Math.min(10,ordered.size());i++){
                Doc d=ordered.get(i);if(d.size<0)break;
                largest.put(new JSONObject().put("name",d.name).put("size",d.size).put("type",d.cat));
            }
            response.put("large",largest);
            Map<String,List<Doc>> hashes=new LinkedHashMap<>();long budget=0;
            for(Map.Entry<Long,List<Doc>> e:bySize.entrySet()){
                if(e.getValue().size()<2)continue;
                for(Doc d:e.getValue()){
                    if(budget+d.size>MAX_HASH_BUDGET){limited=true;break;}
                    budget+=d.size;
                    try{String hash=sha256(ctx,tree,d);
                        hashes.computeIfAbsent(d.size+":"+hash,k->new ArrayList<>()).add(d);
                    }catch(Exception ignored){ /* unreadable or changed is never called duplicate */ }
                }
            }
            JSONArray duplicates=new JSONArray();
            for(List<Doc> same:hashes.values()){
                if(same.size()<2)continue;
                JSONArray names=new JSONArray();
                for(Doc d:same)if(names.length()<8)names.put(d.name);
                duplicates.put(new JSONObject().put("size",same.get(0).size).put("names",names));
                if(duplicates.length()>=10){limited=true;break;}
            }
            response.put("duplicates",duplicates).put("limited",limited);
            response.put("hashBudgetBytes",budget);
        }catch(Exception e){response=result("error","Selected folder became inaccessible. Reopen folder picker.");}
        try{response.put("requestId",request);}catch(Exception ignored){}
        synchronized(LOCK){if(request==storageSeq)storageJson=response.toString();}
    }
    private static String storageScan(Context c){
        Uri t=approved(c);
        if(t==null)return result("needs_folder","Choose one folder in Android's folder picker first.").toString();
        final int request;
        synchronized(LOCK) {
            try{
                JSONObject old=new JSONObject(storageJson);
                if("pending".equals(old.optString("status")))return storageJson;
            }catch(Exception ignored){}
            request=++storageSeq;
            JSONObject o=result("pending","Scanning only the user-approved folder.");try{o.put("requestId",request);}catch(Exception ignored){}
            storageJson=o.toString();
        }
        new Thread(()->scanFolder(c.getApplicationContext(),t,request),"Maya-Storage-ReadOnly").start();
        return storageJson;
    }
    private static String clipboard(Context c,Activity a){
        if(a==null||a.isFinishing()||!a.hasWindowFocus())
            return result("unavailable","Open Maya on screen and tap Read Clipboard.").toString();
        try{
            ClipboardManager manager=(ClipboardManager)c.getSystemService(Context.CLIPBOARD_SERVICE);
            if(manager==null||!manager.hasPrimaryClip())return result("empty","No plain text clipboard available.").toString();
            ClipData clip=manager.getPrimaryClip();
            if(clip==null||clip.getItemCount()<1)return result("empty","Clipboard empty.").toString();
            CharSequence text=clip.getItemAt(0).getText();
            if(text==null)return result("unavailable","Clipboard item is not plain text.").toString();
            String val=text.toString();if(val.length()>2500)val=val.substring(0,2500);
            return result("ok","Foreground clipboard text loaded.").put("text",val).toString();
        }catch(Exception e){return result("unavailable","Clipboard permission or platform limitation. Paste manually.").toString();}
    }
    private static final class BleItem {
        final BluetoothDevice device; final String id;String name;
        final long discovered;
        BleItem(BluetoothDevice d,String id,String name){this.device=d;this.id=id;this.name=name;this.discovered=SystemClock.elapsedRealtime();}
    }
    private static boolean permission(Context c,String name){
        return Build.VERSION.SDK_INT<23||c.checkSelfPermission(name)==PackageManager.PERMISSION_GRANTED;
    }
    private static String need(Context c){
        if(Build.VERSION.SDK_INT>=31){
            if(!permission(c,Manifest.permission.BLUETOOTH_SCAN)||!permission(c,Manifest.permission.BLUETOOTH_CONNECT))
                return "BLUETOOTH_SCAN and BLUETOOTH_CONNECT";
        }else if(Build.VERSION.SDK_INT>=23&&!permission(c,Manifest.permission.ACCESS_FINE_LOCATION))
            return "ACCESS_FINE_LOCATION for Android 11 or earlier BLE discovery";
        return null;
    }
    private static String askPermissions(Context c,Activity a){
        if(a==null||a.isFinishing())return result("unavailable","Open Maya foreground to request Bluetooth permissions.").toString();
        String[] permissions=Build.VERSION.SDK_INT>=31?
            new String[]{Manifest.permission.BLUETOOTH_SCAN,Manifest.permission.BLUETOOTH_CONNECT}:
            new String[]{Manifest.permission.ACCESS_FINE_LOCATION};
        a.runOnUiThread(()->a.requestPermissions(permissions,7167));
        return result("requested_permission","Android Bluetooth permissions requested. Approve, then scan again.").toString();
    }
    private static BluetoothAdapter adapter(Context c){
        BluetoothManager m=(BluetoothManager)c.getSystemService(Context.BLUETOOTH_SERVICE);
        return m==null?null:m.getAdapter();
    }
    private static String bleStatus(Context c){
        JSONObject out=result("ok","Bluetooth LE status (discoverable devices only).");
        try{
            BluetoothAdapter a=adapter(c);
            out.put("supported",a!=null&&c.getPackageManager().hasSystemFeature("android.hardware.bluetooth_le"));
            out.put("permission",need(c)==null);
            out.put("enabled",a!=null&&a.isEnabled());
            synchronized(LOCK){out.put("scanning",callback!=null).put("connection",connection);}
        }catch(Exception e){return result("error","Bluetooth state requires permission.").toString();}
        return out.toString();
    }
    private static void stopScanLocked(){
        if(callback!=null&&scanner!=null)try{scanner.stopScan(callback);}catch(Exception ignored){}
        callback=null;scanner=null;
    }
    private static String startBle(Context c, Activity act){
        if(need(c)!=null)return askPermissions(c,act);
        if(act==null||act.isFinishing()||!act.hasWindowFocus())return result("unavailable","Open Maya foreground to scan.").toString();
        BluetoothAdapter a=adapter(c);
        if(a==null||!c.getPackageManager().hasSystemFeature("android.hardware.bluetooth_le"))
            return result("unsupported","This phone does not expose Bluetooth Low Energy.").toString();
        if(!a.isEnabled())return result("needs_bluetooth","Turn Bluetooth on in Android Settings, then retry.").toString();
        synchronized(LOCK){
            stopScanLocked();devices.clear();nextId=1;
            scanner=a.getBluetoothLeScanner();
            if(scanner==null)return fail("BLE scanner unavailable.");
            final ScanCallback cb=new ScanCallback(){
                @Override public void onScanResult(int type, ScanResult result){
                    if(result==null||result.getDevice()==null)return;
                    BluetoothDevice d=result.getDevice();
                    String name=result.getScanRecord()==null?null:result.getScanRecord().getDeviceName();
                    synchronized(LOCK){
                        if(callback!=this||devices.size()>=40)return;
                        for(BleItem old:devices.values())if(old.device.equals(d)){
                            if(name!=null&&!name.isEmpty())old.name=name;return;
                        }
                        String id="ble"+nextId++;
                        devices.put(id,new BleItem(d,id,name==null?"":name));
                    }
                }
                @Override public void onScanFailed(int code){
                    synchronized(LOCK){connection="BLE scan failed with Android error "+code;callback=null;scanner=null;}
                }
            };
            try{
                scanner.startScan(cb);callback=cb;
                MAIN.postDelayed(()->{synchronized(LOCK){if(callback==cb)stopScanLocked();}},12000);
            }catch(Exception e){callback=null;scanner=null;return fail("Bluetooth LE scan refused by Android.");}
        }
        return result("scanning","Scanning Bluetooth LE for 12 seconds; Maya must stay foreground.").toString();
    }
    private static String devices(Context c){
        JSONObject r=result("ok","Only BLE devices discovered during this Maya session. No classic audio pairing.");
        JSONArray arr=new JSONArray();
        synchronized(LOCK){
            for(BleItem d:devices.values())try{
                arr.put(new JSONObject().put("id",d.id).put("name",d.name));
            }catch(Exception ignored){}
            try{r.put("devices",arr).put("scanning",callback!=null).put("connection",connection);}catch(Exception ignored){}
        }
        return r.toString();
    }
    private static String connect(Context c, Activity act,JSONObject args){
        if(need(c)!=null)return askPermissions(c,act);
        if(act==null||act.isFinishing()||!act.hasWindowFocus())return fail("Open Maya on screen to connect.");
        String id=args.optString("id","");
        final BleItem item;
        synchronized(LOCK){item=devices.get(id);}
        if(item==null||SystemClock.elapsedRealtime()-item.discovered>180000)
            return fail("Choose a freshly discovered BLE device by exact ID. Scan again.");
        synchronized(LOCK){
            if(gatt!=null){try{gatt.disconnect();gatt.close();}catch(Exception ignored){}gatt=null;}
            connection="Connecting to "+(item.name.isEmpty()?"selected BLE device":item.name);
            try{
                gatt=item.device.connectGatt(c.getApplicationContext(),false,new BluetoothGattCallback(){
                    @Override public void onConnectionStateChange(BluetoothGatt session,int status,int newState){
                        synchronized(LOCK){
                            if(gatt!=session){try{session.close();}catch(Exception ignored){}return;}
                            if(status==BluetoothGatt.GATT_SUCCESS&&newState==BluetoothProfile.STATE_CONNECTED)
                                connection="BLE GATT connected: "+(item.name.isEmpty()?item.id:item.name)+". No audio profile or pairing implied.";
                            else{
                                connection="BLE GATT disconnected or failed (Android status "+status+").";
                                try{session.close();}catch(Exception ignored){}
                                gatt=null;
                            }
                        }
                    }
                },BluetoothDevice.TRANSPORT_LE);
                if(gatt==null)return fail("Android did not create a BLE GATT client.");
            }catch(Exception e){gatt=null;return fail("BLE connection not supported or permission denied.");}
        }
        return result("requested","BLE connection requested. Check Refresh BLE list for outcome.").toString();
    }
    public static String run(Context context,Activity activity,String action,String json){
        try{
            JSONObject args=new JSONObject(json==null?"{}":json);
            if(action==null)return fail("No action.");
            switch(action){
                case "CLIP_READ":return clipboard(context,activity);
                case "STORAGE_PICK":return MayaV54Files.choose(activity);
                case "STORAGE_SCAN":return storageScan(context);
                case "STORAGE_RESULT":return storageJson;
                case "BT_STATUS":return bleStatus(context);
                case "BT_SCAN":return startBle(context,activity);
                case "BT_RESULTS":return devices(context);
                case "BT_CONNECT":return connect(context,activity,args);
                case "BT_STOP":{
                    synchronized(LOCK){
                        stopScanLocked();
                        if(gatt!=null){try{gatt.disconnect();gatt.close();}catch(Exception ignored){}gatt=null;}
                        connection="BLE session stopped by user.";
                    }
                    return result("ok","Bluetooth LE scan and session stopped.").toString();
                }
                default:return result("unsupported","Unknown Android control.").toString();
            }
        }catch(Exception e){return fail("Requested Android action could not be completed.");}
    }
}
