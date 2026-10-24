package com.tanim.maya;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Maya V54: User-chosen document tree only. Only SAF document-tree access. */
public final class MayaV54Files {
    private static final int PICK_TREE=5417;
    private static final String PREF="maya_v54_files";
    private static final String TREE="tree";
    private MayaV54Files(){}
    private static JSONObject result(String status,String message) {
        JSONObject o=new JSONObject();try{o.put("status",status).put("message",message);}catch(Exception ignored){}return o;
    }
    private static Uri persisted(Context context) {
        String stored=context.getSharedPreferences(PREF,0).getString(TREE,"");
        if(stored.isEmpty())return null;
        for(android.content.UriPermission p: context.getContentResolver().getPersistedUriPermissions())
            if(p.isWritePermission() && p.getUri().toString().equals(stored))return p.getUri();
        return null;
    }
    public static String choose(final Activity act){
        if(act==null||act.isFinishing())return result("unavailable","No foreground Maya activity.").toString();
        act.runOnUiThread(()->{
            Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            try{act.startActivityForResult(i,PICK_TREE);}catch(Exception ignored){}
        });
        return result("requested","Android folder picker requested. Choose and approve a folder before listing files.").toString();
    }
    public static boolean accept(Activity act,int requestCode,int resultCode,Intent intent){
        if(requestCode!=PICK_TREE)return false;
        if(resultCode!=Activity.RESULT_OK||intent==null||intent.getData()==null)return true;
        Uri tree=intent.getData();
        try{
            int flags=intent.getFlags()&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if((flags & Intent.FLAG_GRANT_WRITE_URI_PERMISSION)==0)return true;
            act.getContentResolver().takePersistableUriPermission(tree, flags);
            act.getSharedPreferences(PREF,0).edit().putString(TREE,tree.toString()).apply();
        }catch(Exception ignored){}
        return true;
    }
    public static String status(Context c){
        Uri t=persisted(c);
        JSONObject out=result(t==null?"needs_folder":"ok",t==null?"Choose a folder in Android first.":"Selected folder permission available.");
        try{out.put("folder",t==null?"":t.toString());}catch(Exception ignored){}
        return out.toString();
    }
    public static String list(Context c){
        Uri t=persisted(c);if(t==null)return status(c);
        JSONArray items=new JSONArray();int count=0;boolean clipped=false;
        String parent=DocumentsContract.getTreeDocumentId(t);
        Uri children=DocumentsContract.buildChildDocumentsUriUsingTree(t,parent);
        try(Cursor cursor=c.getContentResolver().query(children,new String[]{
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,DocumentsContract.Document.COLUMN_SIZE},null,null,null)){
            if(cursor==null)return result("error","Android folder provider returned no listing.").toString();
            while(cursor.moveToNext()){
                if(count++>=100){clipped=true;break;}
                JSONObject item=new JSONObject();
                item.put("name",cursor.getString(1));item.put("mime",cursor.getString(2));
                item.put("size",cursor.isNull(3)?-1:cursor.getLong(3));
                items.put(item);
            }
            JSONObject out=result("ok",clipped?"Showing first 100 entries.":"Folder entries loaded.");
            out.put("items",items);return out.toString();
        }catch(Exception error){return result("error","Selected folder is no longer readable.").toString();}
    }
    public static String saveText(Context c,String name,String text){
        Uri t=persisted(c);if(t==null)return status(c);
        if(name==null||!name.matches("[A-Za-z0-9 _.-]{1,80}\\.txt")||name.startsWith("."))
            return result("error","Use a simple ASCII .txt filename (maximum 80 characters).").toString();
        if(text==null||text.length()>64000)
            return result("error","Text document exceeds 64,000 characters.").toString();
        try {
            // Always create, never silently overwrite existing files.
            Uri doc=DocumentsContract.createDocument(c.getContentResolver(),t,"text/plain",name);
            if(doc==null)return result("error","Android could not create document.").toString();
            try(OutputStream out=c.getContentResolver().openOutputStream(doc,"w")){
                if(out==null)return result("error","Document was created but opening it failed.").toString();
                out.write(text.getBytes(StandardCharsets.UTF_8));
            }
            return result("created","Android document created in selected folder.").toString();
        }catch(Exception error){return result("error","Selected folder is not writable.").toString();}
    }
}
