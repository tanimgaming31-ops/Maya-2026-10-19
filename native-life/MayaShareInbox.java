package com.tanim.maya;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/** Only text deliberately shared to Maya via the Android Share sheet. */
public final class MayaShareInbox {
    private static final String PREFS="maya_life_inbox_v1";
    private static final String KEY="pending_text";
    private MayaShareInbox() {}

    public static void receive(Activity activity, Intent intent) {
        if (activity==null || intent==null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String mime=intent.getType();
        if (mime==null || !mime.startsWith("text/")) return;
        String text=intent.getStringExtra(Intent.EXTRA_TEXT);
        if (text==null || text.trim().isEmpty()) return;
        // One item only, local-only until user opens Life Suite and chooses to save.
        String clipped=text.length()>4000?text.substring(0,4000):text;
        activity.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(KEY,clipped).apply();
        intent.removeExtra(Intent.EXTRA_TEXT);
    }

    public static String take(Context context) {
        if (context==null) return "";
        SharedPreferences p=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        String text=p.getString(KEY,"");
        p.edit().remove(KEY).apply();
        return text==null?"":text;
    }
}
