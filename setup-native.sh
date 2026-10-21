#!/usr/bin/env bash
# Maya native layer (stage 1): read message notifications + quick reply.
# Runs inside GitHub Actions after "npx cap add android". Safe to re-run.
set -euo pipefail

APP_DIR=android/app/src/main/java/com/tanim/maya
MANIFEST=android/app/src/main/AndroidManifest.xml
mkdir -p "$APP_DIR"
find android/app/src/main/java -name MainActivity.java -delete

# ---------------------------------------------------------------- MainActivity
cat > "$APP_DIR/MainActivity.java" <<'EOF'
package com.tanim.maya;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        MayaBridge.attach(this, getBridge().getWebView());
        MayaBridge.setNudge(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        MayaBridge.setNudge(intent);
    }
}
EOF

# ------------------------------------------------------------------ MayaBridge
cat > "$APP_DIR/MayaBridge.java" <<'EOF'
package com.tanim.maya;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONArray;
import org.json.JSONObject;

/** Small, fixed set of native functions the Maya web app may call. */
public class MayaBridge {
    private static WebView web;
    private static Context ctx;
    private static Activity act;
    private static volatile String nudge = "";

    static void attach(Activity activity, WebView webView) {
        ctx = activity.getApplicationContext();
        act = activity;
        web = webView;
        webView.addJavascriptInterface(new MayaBridge(), "MayaBridge");
    }

    static void setNudge(Intent i) {
        try {
            if (i == null) return;
            String n = i.getStringExtra("maya_nudge");
            if (n != null && n.length() > 0) {
                nudge = n;
                i.removeExtra("maya_nudge");
            }
        } catch (Exception e) {
            // ignore
        }
    }

    /** Called by the notification service when a new chat message arrives. */
    static void emit(JSONObject o) {
        final WebView w = web;
        if (w == null) return;
        final String js = "window.__mayaMsg&&window.__mayaMsg(" + o.toString() + ")";
        w.post(new Runnable() {
            @Override
            public void run() {
                w.evaluateJavascript(js, null);
            }
        });
    }

    private static boolean accessEnabled() {
        try {
            String flat = Settings.Secure.getString(ctx.getContentResolver(), "enabled_notification_listeners");
            if (TextUtils.isEmpty(flat)) return false;
            String me = ctx.getPackageName();
            for (String s : flat.split(":")) {
                ComponentName cn = ComponentName.unflattenFromString(s);
                if (cn != null && me.equals(cn.getPackageName())) return true;
            }
        } catch (Exception e) {
            // ignore
        }
        return false;
    }

    @JavascriptInterface
    public String status() {
        try {
            JSONObject o = new JSONObject();
            o.put("notificationAccess", accessEnabled());
            o.put("connected", MayaNotificationService.connected);
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    @JavascriptInterface
    public String getMessages(int limit, String app) {
        try {
            JSONArray arr = new JSONArray();
            for (MayaNotificationService.Msg m : MayaNotificationService.recent(limit, app)) {
                arr.put(m.toJson());
            }
            JSONObject o = new JSONObject();
            o.put("messages", arr);
            return o.toString();
        } catch (Exception e) {
            return "{\"messages\":[]}";
        }
    }

    /** Returns "" on success, otherwise a short error text. */
    @JavascriptInterface
    public String reply(String id, String text) {
        if (id == null || text == null || text.trim().isEmpty()) return "id and text are required";
        String err = MayaNotificationService.sendReply(ctx, id, text.trim());
        return err == null ? "" : err;
    }

    @JavascriptInterface
    public void clearMessages() {
        MayaNotificationService.clear();
    }

    @JavascriptInterface
    public void openNotificationAccess() {
        try {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception e) {
            // ignore
        }
    }

    /** Phone controls (torch, volume, brightness, media keys, SMS). Returns a JSON string. */
    @JavascriptInterface
    public String control(String action, String argsJson) {
        try {
            JSONObject a = new JSONObject(argsJson == null ? "{}" : argsJson);
            return MayaControls.run(ctx, act, action, a);
        } catch (Exception e) {
            return "{\"status\":\"error\",\"message\":\"bad request\"}";
        }
    }

    @JavascriptInterface
    public String capabilities() {
        try {
            JSONObject o = new JSONObject();
            o.put("sms", ctx.checkSelfPermission(android.Manifest.permission.SEND_SMS) == android.content.pm.PackageManager.PERMISSION_GRANTED);
            o.put("writeSettings", Settings.System.canWrite(ctx));
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    /** Returns "morning", "night" or "" and clears it. */
    @JavascriptInterface
    public String takeNudge() {
        String n = nudge;
        nudge = "";
        return n;
    }

    @JavascriptInterface
    public void requestSms() {
        MayaControls.requestSmsPermission(act);
    }

    @JavascriptInterface
    public void openWriteSettings() {
        MayaControls.openWriteSettings(ctx);
    }

    @JavascriptInterface
    public void openAppInfo() {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception e) {
            // ignore
        }
    }
}
EOF

# ---------------------------------------------------- MayaNotificationService
cat > "$APP_DIR/MayaNotificationService.java" <<'EOF'
package com.tanim.maya;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.RemoteInput;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.json.JSONObject;

/**
 * Keeps the last chat notifications in RAM only (never written to disk, never uploaded),
 * and can send a quick reply through the notification's own "Reply" action.
 */
public class MayaNotificationService extends NotificationListenerService {
    static volatile boolean connected = false;

    static final Map<String, String> APPS = new LinkedHashMap<String, String>();
    static {
        APPS.put("com.whatsapp", "WhatsApp");
        APPS.put("com.whatsapp.w4b", "WhatsApp Business");
        APPS.put("com.facebook.orca", "Messenger");
        APPS.put("com.facebook.mlite", "Messenger Lite");
        APPS.put("com.facebook.katana", "Facebook");
        APPS.put("com.facebook.lite", "Facebook Lite");
        APPS.put("com.imo.android.imoim", "IMO");
        APPS.put("com.imo.android.imous", "IMO");
        APPS.put("org.telegram.messenger", "Telegram");
        APPS.put("com.instagram.android", "Instagram");
        APPS.put("com.google.android.apps.messaging", "Messages");
        APPS.put("com.samsung.android.messaging", "Messages");
        APPS.put("com.android.mms", "Messages");
    }

    static class Msg {
        String id;
        String key;
        String app;
        String sender;
        String text;
        long time;
        Notification.Action action;

        JSONObject toJson() {
            JSONObject o = new JSONObject();
            try {
                o.put("id", id);
                o.put("app", app);
                o.put("sender", sender);
                o.put("text", text);
                o.put("time", time);
                o.put("canReply", action != null);
            } catch (Exception e) {
                // ignore
            }
            return o;
        }
    }

    private static final LinkedList<Msg> store = new LinkedList<Msg>();
    private static int seq = 0;

    static synchronized List<Msg> recent(int limit, String app) {
        List<Msg> out = new ArrayList<Msg>();
        String f = app == null ? "" : app.trim().toLowerCase(Locale.ROOT);
        for (int i = store.size() - 1; i >= 0 && out.size() < Math.max(1, limit); i--) {
            Msg m = store.get(i);
            if (f.length() == 0 || m.app.toLowerCase(Locale.ROOT).contains(f)) out.add(m);
        }
        return out;
    }

    static synchronized void clear() {
        store.clear();
    }

    /** Returns null on success, otherwise an error message. */
    static synchronized String sendReply(Context ctx, String id, String text) {
        Msg target = null;
        for (Msg m : store) {
            if (m.id.equals(id)) target = m;
        }
        if (target == null) return "Message not found (it may have expired).";
        if (target.action == null) return "This app does not allow quick replies from notifications.";
        try {
            RemoteInput[] inputs = target.action.getRemoteInputs();
            Intent intent = new Intent();
            Bundle results = new Bundle();
            for (RemoteInput r : inputs) {
                results.putCharSequence(r.getResultKey(), text);
            }
            RemoteInput.addResultsToIntent(inputs, intent, results);
            target.action.actionIntent.send(ctx, 0, intent);
            return null;
        } catch (PendingIntent.CanceledException e) {
            return "The notification was dismissed, so replying is no longer possible.";
        } catch (Exception e) {
            return "Reply failed: " + e.getMessage();
        }
    }

    private static boolean sensitive(String s) {
        String l = s.toLowerCase(Locale.ROOT);
        return l.contains("otp") || l.contains("verification code") || l.contains("one-time")
                || l.contains("password") || l.contains("passcode") || l.contains("security code")
                || l.contains("\u09aa\u09be\u09b8\u0993\u09af\u09bc\u09be\u09b0\u09cd\u09a1")
                || l.contains("\u0993\u099f\u09bf\u09aa\u09bf");
    }

    @Override
    public void onListenerConnected() {
        connected = true;
    }

    @Override
    public void onListenerDisconnected() {
        connected = false;
        try {
            requestRebind(new ComponentName(this, MayaNotificationService.class));
        } catch (Exception e) {
            // ignore
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            handle(sbn);
        } catch (Exception e) {
            // never crash the listener
        }
    }

    private void handle(StatusBarNotification sbn) {
        String pkg = sbn.getPackageName();
        String app = APPS.get(pkg);
        if (app == null) return;
        Notification n = sbn.getNotification();
        if (n == null || n.extras == null) return;
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        if ((n.flags & Notification.FLAG_ONGOING_EVENT) != 0) return;

        Bundle ex = n.extras;
        CharSequence title = ex.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = ex.getCharSequence(Notification.EXTRA_TEXT);
        String sender = title == null ? "" : title.toString();
        String body = text == null ? "" : text.toString();

        Parcelable[] msgs = ex.getParcelableArray(Notification.EXTRA_MESSAGES);
        if (msgs != null && msgs.length > 0 && msgs[msgs.length - 1] instanceof Bundle) {
            Bundle last = (Bundle) msgs[msgs.length - 1];
            CharSequence t = last.getCharSequence("text");
            if (t != null && t.length() > 0) body = t.toString();
            CharSequence s = last.getCharSequence("sender");
            if (s != null && s.length() > 0 && !sender.contains(s.toString())) {
                sender = sender.length() == 0 ? s.toString() : sender + " (" + s + ")";
            }
        }
        if (body.trim().length() == 0) return;
        if (sensitive(body) || sensitive(sender)) return;

        Notification.Action reply = null;
        if (n.actions != null) {
            for (Notification.Action a : n.actions) {
                if (a.getRemoteInputs() != null && a.getRemoteInputs().length > 0) {
                    reply = a;
                    break;
                }
            }
        }
        if (reply == null) {
            try {
                for (Notification.Action a : new Notification.WearableExtender(n).getActions()) {
                    if (a.getRemoteInputs() != null && a.getRemoteInputs().length > 0) {
                        reply = a;
                        break;
                    }
                }
            } catch (Exception e) {
                // ignore
            }
        }

        Msg m = new Msg();
        m.key = sbn.getKey();
        m.app = app;
        m.sender = sender;
        m.text = body.length() > 600 ? body.substring(0, 600) : body;
        m.time = sbn.getPostTime();
        m.action = reply;

        synchronized (MayaNotificationService.class) {
            for (int i = store.size() - 1; i >= 0; i--) {
                Msg o = store.get(i);
                if (o.key != null && o.key.equals(m.key) && o.text.equals(m.text)) {
                    store.remove(i);
                }
            }
            m.id = "n" + (++seq);
            store.add(m);
            while (store.size() > 40) store.removeFirst();
        }
        MayaBridge.emit(m.toJson());
    }
}
EOF

# ---------------------------------------------------------------- MayaControls
cat > "$APP_DIR/MayaControls.java" <<'EOF'
package com.tanim.maya;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.ContactsContract;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.provider.AlarmClock;
import android.provider.MediaStore;
import java.util.Locale;
import android.provider.Settings;
import android.telephony.SmsManager;
import android.view.KeyEvent;
import java.util.ArrayList;
import org.json.JSONObject;

/** Fixed list of safe phone controls. Anything not listed here is refused. */
public class MayaControls {
    private static long lastSms = 0;
    private static long hourStart = 0;
    private static int smsThisHour = 0;

    static String res(String status, String message) {
        try {
            JSONObject o = new JSONObject();
            o.put("status", status);
            o.put("message", message);
            return o.toString();
        } catch (Exception e) {
            return "{\"status\":\"error\"}";
        }
    }

    static String run(Context ctx, Activity act, String action, JSONObject a) {
        try {
            switch (action) {
                case "FLASHLIGHT_ON": return torch(ctx, true);
                case "FLASHLIGHT_OFF": return torch(ctx, false);
                case "MEDIA_PLAY": return media(ctx, KeyEvent.KEYCODE_MEDIA_PLAY);
                case "MEDIA_PAUSE": return media(ctx, KeyEvent.KEYCODE_MEDIA_PAUSE);
                case "MEDIA_NEXT": return media(ctx, KeyEvent.KEYCODE_MEDIA_NEXT);
                case "MEDIA_PREVIOUS": return media(ctx, KeyEvent.KEYCODE_MEDIA_PREVIOUS);
                case "CHANGE_MEDIA_VOLUME": return volume(ctx, a.optInt("level", -1), a.optString("direction", ""));
                case "CHANGE_BRIGHTNESS": return brightness(ctx, a.optInt("level", -1), a.optString("direction", ""));
                case "SEND_SMS": return sms(ctx, act, a.optString("phone", ""), a.optString("message", ""));
                case "OPEN_URL": return openUrl(ctx, a);
                case "SHARE_DRAFT": return shareDraft(ctx, a.optString("text", ""));
                case "PREPARE_CHAT_CONTACT": return prepareChatContact(ctx, act, a);
                case "OPEN_APP": return openApp(ctx, a);
                case "OPEN_CAMERA": return startSimple(ctx, new Intent(MediaStore.ACTION_IMAGE_CAPTURE), "Camera opened.");
                case "OPEN_GALLERY": return startSimple(ctx, Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_GALLERY), "Gallery opened.");
                case "CREATE_ALARM": return alarm(ctx, a.optInt("hour", -1), a.optInt("minute", -1), a.optString("label", "Maya alarm"));
                case "START_TIMER": return timer(ctx, a.optInt("seconds", 0), a.optString("label", "Maya timer"));
                case "NUDGE_SET": return MayaNudge.set(ctx, act, a);
                case "AUTOMATION_STATUS": case "BATTERY_ALERT_SET":
                case "REMINDER_SET": case "REMINDER_CANCEL": case "REMINDER_LIST":
                case "NOTIFICATION_PERMISSION_REQUEST": return MayaAutomations.run(ctx, act, action, a);
                default: return res("error", "Unknown action.");
            }
        } catch (Exception e) {
            return res("error", "Failed: " + e.getMessage());
        }
    }

    private static String torch(Context ctx, boolean on) throws Exception {
        CameraManager cm = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
        String id = null;
        for (String c : cm.getCameraIdList()) {
            CameraCharacteristics ch = cm.getCameraCharacteristics(c);
            Boolean flash = ch.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
            Integer facing = ch.get(CameraCharacteristics.LENS_FACING);
            if (flash != null && flash.booleanValue() && facing != null && facing.intValue() == CameraCharacteristics.LENS_FACING_BACK) {
                id = c;
                break;
            }
        }
        if (id == null) return res("error", "No flashlight found on this phone.");
        cm.setTorchMode(id, on);
        return res("ok", on ? "Flashlight is on." : "Flashlight is off.");
    }

    private static String media(Context ctx, int code) throws Exception {
        AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        long t = SystemClock.uptimeMillis();
        am.dispatchMediaKeyEvent(new KeyEvent(t, t, KeyEvent.ACTION_DOWN, code, 0));
        am.dispatchMediaKeyEvent(new KeyEvent(t, t, KeyEvent.ACTION_UP, code, 0));
        Thread.sleep(600);
        boolean active = am.isMusicActive();
        if (code == KeyEvent.KEYCODE_MEDIA_PLAY) {
            return active ? res("ok", "Music is playing.") : res("sent", "Play key sent, but no music started. A music app may need to be open.");
        }
        if (code == KeyEvent.KEYCODE_MEDIA_PAUSE) {
            return !active ? res("ok", "Music is paused.") : res("sent", "Pause key sent, but music still seems to be playing.");
        }
        return res("sent", "Key sent to the music player. Cannot verify the track changed.");
    }

    private static String volume(Context ctx, int level, String dir) {
        AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        int cur = am.getStreamVolume(AudioManager.STREAM_MUSIC);
        int target;
        if (level >= 0) {
            target = Math.round(Math.min(100, level) * max / 100f);
        } else {
            int step = Math.max(1, Math.round(max * 0.15f));
            target = "up".equals(dir) ? cur + step : cur - step;
        }
        target = Math.max(0, Math.min(max, target));
        am.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0);
        int pct = Math.round(target * 100f / max);
        return res("ok", "Media volume is now about " + pct + " percent.");
    }

    private static String startSimple(Context ctx, Intent i, String ok) {
        try {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
            return res("opened", ok);
        } catch (Exception e) {
            return res("error", "Could not open it: " + e.getMessage());
        }
    }

    private static String openUrl(Context ctx, JSONObject a) {
        String url = a.optString("url", "");
        String pkg = a.optString("pkg", "");
        String act = a.optString("intentAction", "");
        try {
            Intent i;
            if (act.length() > 0) {
                if (!act.startsWith("android.settings.")) return res("error", "That settings page is not allowed.");
                i = new Intent(act);
            } else {
                String l = url.toLowerCase(Locale.ROOT);
                if (!(l.startsWith("https://") || l.startsWith("http://") || l.startsWith("tel:") || l.startsWith("sms:") || l.startsWith("geo:"))) {
                    return res("error", "That link type is not allowed.");
                }
                i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (act.length() == 0 && pkg.length() > 0) {
                try {
                    Intent withPkg = new Intent(i);
                    withPkg.setPackage(pkg);
                    ctx.startActivity(withPkg);
                    return res("opened", "Opened.");
                } catch (Exception e) {
                    // that app is not installed: let any app open the link
                }
            }
            ctx.startActivity(i);
            return res("opened", "Opened.");
        } catch (Exception e) {
            return res("error", "Could not open it: " + e.getMessage());
        }
    }

    /** A user-driven Android share sheet. It never sends a message automatically. */
    private static String shareDraft(Context ctx, String text) {
        if (text == null || text.trim().isEmpty() || text.length() > 500) return res("error", "A short nonempty message is required.");
        try {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, text);
            Intent chooser = Intent.createChooser(i, "Choose chat app to prepare a message");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(chooser);
            return res("opened", "Share chooser opened. No message was sent. Choose the recipient and tap Send yourself.");
        } catch (Exception e) {
            return res("error", "Unable to open Android share sheet: " + e.getMessage());
        }
    }

    /**
     * Strict contact-name matching for WhatsApp only. Contacts stay on the phone:
     * no phone number is exposed in a JavaScript response or saved anywhere.
     * Messenger / IMO / Telegram do not offer a universal named-chat draft API.
     * This method DOES NOT send any messages.
     */
    private static String prepareChatContact(Context ctx, final Activity act, JSONObject a) {
        final String app = a.optString("app", "").trim().toLowerCase(Locale.ROOT);
        final String name = a.optString("contact_name", "").trim();
        final String body = a.optString("message", "").trim();
        if (name.length() == 0 || name.length() > 70 || body.length() == 0 || body.length() > 500)
            return res("error", "Exact contact name (1-70 chars) and a short message (1-500 chars) are required.");
        if (!(app.equals("whatsapp") || app.equals("messenger") || app.equals("imo") || app.equals("telegram")))
            return res("error", "Only WhatsApp, Messenger, IMO and Telegram drafts are supported.");
        if (!app.equals("whatsapp")) {
            String pkg = app.equals("messenger") ? "com.facebook.orca" : app.equals("imo") ? "com.imo.android.imoim" : "org.telegram.messenger";
            try {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_TEXT, body);
                send.setPackage(pkg);
                send.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(send);
                return res("opened", "Message draft opened in " + app + ". Select the contact named '" + name + "' and tap Send yourself. No chat was selected or sent automatically.");
            } catch (Exception ex) {
                return res("error", app + " share draft is not available on this phone. Open the app and select the recipient manually.");
            }
        }
        if (ctx.checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            if (act != null) act.runOnUiThread(new Runnable() {
                @Override public void run() { act.requestPermissions(new String[] {Manifest.permission.READ_CONTACTS}, 7703); }
            });
            return res("needs_permission", "Allow Contacts permission in Android, then ask again. Maya only looks for the exact name you specified.");
        }
        String found = null;
        java.util.HashSet<String> matches = new java.util.HashSet<String>();
        String colName = ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY;
        String colNumber = ContactsContract.CommonDataKinds.Phone.NUMBER;
        try (Cursor cur = ctx.getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[]{colName, colNumber},
                colName + " = ? COLLATE NOCASE", new String[]{name}, null)) {
            if (cur == null) return res("error", "Contacts provider is unavailable.");
            while (cur.moveToNext()) {
                String candidate = cur.getString(0), number = cur.getString(1);
                if (candidate == null || !candidate.trim().equalsIgnoreCase(name) || number == null) continue;
                String val = number.replaceAll("[\\s().-]", "");
                if (val.startsWith("00")) val = "+" + val.substring(2);
                if (val.startsWith("+") && val.substring(1).matches("[0-9]{7,15}")) matches.add(val);
            }
        } catch (Exception e) { return res("error", "Cannot read contacts on this phone."); }
        if (matches.size() == 0) return res("error", "No unique WhatsApp-ready number found for that exact contact name. Save their number with +country code (for example +880...) and try again.");
        if (matches.size() > 1) return res("error", "Several phone numbers match this name. Open the contact and choose a specific international number; Maya will not guess.");
        found = matches.iterator().next().substring(1);
        try {
            String url = "https://wa.me/" + found + "?text=" + Uri.encode(body);
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
            return res("opened", "WhatsApp draft opened for the exact saved contact name. Check the recipient and tap Send. No message was sent automatically.");
        } catch (Exception e) { return res("error", "Cannot open WhatsApp chat: " + e.getMessage()); }
    }

    private static String openApp(Context ctx, JSONObject a) {
        String pkg = a.optString("pkg", "");
        try {
            if (pkg.length() > 0) {
                Intent i = ctx.getPackageManager().getLaunchIntentForPackage(pkg);
                if (i != null) {
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(i);
                    return res("opened", "App opened.");
                }
            }
            if (a.optString("url", "").length() > 0) {
                String r = openUrl(ctx, a);
                return r.contains("\"opened\"") ? res("opened", "That app is not installed, so its website opened instead.") : r;
            }
            return res("error", "That app is not installed.");
        } catch (Exception e) {
            return res("error", "Could not open the app: " + e.getMessage());
        }
    }

    private static String alarm(Context ctx, int hour, int minute, String label) {
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return res("error", "Invalid alarm time.");
        try {
            Intent i = new Intent(AlarmClock.ACTION_SET_ALARM);
            i.putExtra(AlarmClock.EXTRA_HOUR, hour);
            i.putExtra(AlarmClock.EXTRA_MINUTES, minute);
            i.putExtra(AlarmClock.EXTRA_MESSAGE, label);
            i.putExtra(AlarmClock.EXTRA_SKIP_UI, true);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
            return res("sent", "The alarm was handed to the phone's Clock app.");
        } catch (Exception e) {
            return res("error", "No Clock app could take the alarm: " + e.getMessage());
        }
    }

    private static String timer(Context ctx, int seconds, String label) {
        if (seconds < 1 || seconds > 86400) return res("error", "Invalid timer length.");
        try {
            Intent i = new Intent(AlarmClock.ACTION_SET_TIMER);
            i.putExtra(AlarmClock.EXTRA_LENGTH, seconds);
            i.putExtra(AlarmClock.EXTRA_MESSAGE, label);
            i.putExtra(AlarmClock.EXTRA_SKIP_UI, true);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
            return res("sent", "The timer was handed to the phone's Clock app.");
        } catch (Exception e) {
            return res("error", "No Clock app could take the timer: " + e.getMessage());
        }
    }

    static void openWriteSettings(Context ctx) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS, Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception e) {
            // ignore
        }
    }

    private static String brightness(Context ctx, int level, String dir) {
        if (!Settings.System.canWrite(ctx)) {
            openWriteSettings(ctx);
            return res("needs_permission", "Maya needs permission to change brightness. The settings page just opened: switch Maya on, come back, then ask again.");
        }
        int cur = Settings.System.getInt(ctx.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, 128);
        int target;
        if (level >= 0) {
            target = Math.round(Math.min(100, level) * 255 / 100f);
        } else {
            target = "up".equals(dir) ? cur + 38 : cur - 38;
        }
        target = Math.max(8, Math.min(255, target));
        Settings.System.putInt(ctx.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS_MODE, Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL);
        Settings.System.putInt(ctx.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, target);
        return res("ok", "Brightness is now about " + Math.round(target * 100f / 255) + " percent.");
    }

    static void requestSmsPermission(final Activity act) {
        if (act == null) return;
        act.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                act.requestPermissions(new String[] { Manifest.permission.SEND_SMS }, 7701);
            }
        });
    }

    private static String sms(Context ctx, Activity act, String phone, String text) {
        if (phone.length() == 0 || text.length() == 0) return res("error", "A phone number and a message are required.");
        if (ctx.checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            requestSmsPermission(act);
            return res("needs_permission", "SMS permission is needed. Android is asking now: allow it, then ask Maya again.");
        }
        long now = System.currentTimeMillis();
        if (now - hourStart > 3600000L) {
            hourStart = now;
            smsThisHour = 0;
        }
        if (smsThisHour >= 20) return res("error", "Too many texts this hour. Maya stopped to be safe.");
        if (now - lastSms < 8000L) return res("error", "Please wait a few seconds before sending another text.");
        SmsManager sm = Build.VERSION.SDK_INT >= 31 ? ctx.getSystemService(SmsManager.class) : SmsManager.getDefault();
        ArrayList<String> parts = sm.divideMessage(text);
        if (parts.size() > 1) {
            sm.sendMultipartTextMessage(phone, null, parts, null, null);
        } else {
            sm.sendTextMessage(phone, null, text, null, null);
        }
        lastSms = now;
        smsThisHour++;
        return res("sent", "The text was handed to the phone's SMS system. Delivery cannot be verified.");
    }
}
EOF

for P in SEND_SMS WRITE_SETTINGS; do
  if ! grep -q "android.permission.$P" "$MANIFEST"; then
    sed -i "s#<application#<uses-permission android:name=\"android.permission.$P\" />\n    <application#" "$MANIFEST"
  fi
done

# ------------------------------------------------------------------ MayaNudge
cat > "$APP_DIR/MayaNudge.java" <<'EOF'
package com.tanim.maya;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import java.util.Calendar;
import java.util.Map;
import org.json.JSONObject;

/** Daily "Maya reaches out" notifications (morning / night). Tapping one opens Maya. */
public class MayaNudge extends BroadcastReceiver {
    private static final String CHANNEL = "maya_nudges";
    private static final String PREFS = "maya_nudges";

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        try {
            if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
                rearmAll(ctx);
                return;
            }
            String id = intent.getStringExtra("id");
            if (id == null) return;
            String data = prefs(ctx).getString("n." + id, null);
            if (data == null) return;
            String[] p = data.split("\\|", 3);
            int h = Integer.parseInt(p[0]);
            int m = Integer.parseInt(p[1]);
            String text = p.length > 2 ? p[2] : "Maya is waiting to talk";
            post(ctx, id, text);
            arm(ctx, id, h, m);
        } catch (Exception e) {
            // never crash a receiver
        }
    }

    private static void rearmAll(Context ctx) {
        for (Map.Entry<String, ?> e : prefs(ctx).getAll().entrySet()) {
            try {
                if (!e.getKey().startsWith("n.")) continue;
                String id = e.getKey().substring(2);
                String[] p = String.valueOf(e.getValue()).split("\\|", 3);
                arm(ctx, id, Integer.parseInt(p[0]), Integer.parseInt(p[1]));
            } catch (Exception ex) {
                // skip a bad entry
            }
        }
    }

    private static PendingIntent pending(Context ctx, String id) {
        Intent i = new Intent(ctx, MayaNudge.class);
        i.putExtra("id", id);
        return PendingIntent.getBroadcast(ctx, id.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void arm(Context ctx, String id, int hour, int minute) {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, hour);
        c.set(Calendar.MINUTE, minute);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= System.currentTimeMillis() + 1000L) c.add(Calendar.DAY_OF_YEAR, 1);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        if (Build.VERSION.SDK_INT >= 23) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, c.getTimeInMillis(), pending(ctx, id));
        } else {
            am.set(AlarmManager.RTC_WAKEUP, c.getTimeInMillis(), pending(ctx, id));
        }
    }

    private static void cancel(Context ctx, String id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pending(ctx, id));
    }

    private static void post(Context ctx, String id, String text) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Maya reaches out", NotificationManager.IMPORTANCE_DEFAULT));
        }
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch == null) return;
        launch.putExtra("maya_nudge", id);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, id.hashCode(), launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        b.setContentTitle("Maya");
        b.setContentText(text);
        b.setSmallIcon(ctx.getApplicationInfo().icon);
        b.setContentIntent(pi);
        b.setAutoCancel(true);
        nm.notify(id.hashCode(), b.build());
    }

    static String set(Context ctx, final Activity act, JSONObject a) {
        String id = a.optString("id", "");
        if (!id.equals("morning") && !id.equals("night")) return MayaControls.res("error", "Unknown nudge.");
        if (!a.optBoolean("on", false)) {
            prefs(ctx).edit().remove("n." + id).apply();
            cancel(ctx, id);
            return MayaControls.res("ok", "Turned off.");
        }
        int h = a.optInt("hour", -1);
        int m = a.optInt("minute", -1);
        if (h < 0 || h > 23 || m < 0 || m > 59) return MayaControls.res("error", "Invalid time.");
        String text = a.optString("text", "Maya is waiting to talk").replace("|", " ");
        prefs(ctx).edit().putString("n." + id, h + "|" + m + "|" + text).apply();
        if (Build.VERSION.SDK_INT >= 33 && act != null
                && ctx.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            act.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    act.requestPermissions(new String[] { "android.permission.POST_NOTIFICATIONS" }, 7702);
                }
            });
        }
        arm(ctx, id, h, m);
        return MayaControls.res("ok", "Scheduled.");
    }
}
EOF

for P in android.permission.POST_NOTIFICATIONS android.permission.RECEIVE_BOOT_COMPLETED com.android.alarm.permission.SET_ALARM; do
  if ! grep -q "name=\"$P\"" "$MANIFEST"; then
    sed -i "s#<application#<uses-permission android:name=\"$P\" />\n    <application#" "$MANIFEST"
  fi
done
if ! grep -q "<queries>" "$MANIFEST"; then
  sed -i 's#<application#<queries>\n        <intent>\n            <action android:name="android.intent.action.MAIN" />\n            <category android:name="android.intent.category.LAUNCHER" />\n        </intent>\n    </queries>\n    <application#' "$MANIFEST"
fi
if ! grep -q "com.tanim.maya.MayaNudge" "$MANIFEST"; then
  sed -i 's#</application>#        <receiver android:name="com.tanim.maya.MayaNudge" android:exported="false">\n            <intent-filter>\n                <action android:name="android.intent.action.BOOT_COMPLETED" />\n            </intent-filter>\n        </receiver>\n    </application>#' "$MANIFEST"
fi

# ------------------------------------------------- manifest: listener service
if ! grep -q MayaNotificationService "$MANIFEST"; then
  sed -i 's#</application>#        <service android:name="com.tanim.maya.MayaNotificationService" android:exported="true" android:label="Maya" android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">\n            <intent-filter>\n                <action android:name="android.service.notification.NotificationListenerService" />\n            </intent-filter>\n        </service>\n    </application>#' "$MANIFEST"
fi

# ----------------------------------- stable signing key (so updates install over)
# Keystore arrives via a private GitHub secret, never from the public repository.
if [ -f maya-debug.keystore ]; then
  python3 - <<'PYGRADLE'
from pathlib import Path
p=Path('android/app/build.gradle')
s=p.read_text()
marker='android {'
if 'storeFile file("../../maya-debug.keystore")' not in s:
    assert marker in s, 'Android Gradle build configuration not found'
    signing = '''android {
    signingConfigs {
        debug {
            storeFile file("../../maya-debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }'''
    s=s.replace(marker, signing, 1)
    p.write_text(s)
PYGRADLE
fi


# ------------------------------------------------------ V2 native automations
cat > "$APP_DIR/MayaAutomations.java" <<'EOF_V2_AUTOMATIONS'
package com.tanim.maya;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.SystemClock;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Map;
import java.util.UUID;

/** V2 device-local reminders and opt-in battery alerts; no always-on microphone. */
public class MayaAutomations extends BroadcastReceiver {
    private static final String PREF = "maya_automation_v2";
    private static final String CHANNEL = "maya_automation_v2";
    private static final String PULSE = "com.tanim.maya.PULSE";
    private static final String REMINDER = "com.tanim.maya.REMINDER";
    private static final long PERIOD = 45L * 60 * 1000; // inexact under Doze; not a live monitor
    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREF, Context.MODE_PRIVATE); }

    private static PendingIntent pulseIntent(Context c) {
        Intent i = new Intent(c, MayaAutomations.class).setAction(PULSE);
        return PendingIntent.getBroadcast(c, 7461, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    private static PendingIntent reminderIntent(Context c, String id) {
        Intent i = new Intent(c, MayaAutomations.class).setAction(REMINDER).putExtra("id", id);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    private static void schedulePulse(Context c) {
        AlarmManager a = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (a == null) return;
        a.cancel(pulseIntent(c));
        if (!prefs(c).getBoolean("battery", false)) return;
        if (Build.VERSION.SDK_INT >= 23) a.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime()+PERIOD, pulseIntent(c));
        else a.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime()+PERIOD, pulseIntent(c));
    }
    private static void scheduleReminder(Context c, String id, long millis) {
        AlarmManager a = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (a == null) return;
        PendingIntent p = reminderIntent(c, id);
        a.cancel(p);
        if (Build.VERSION.SDK_INT >= 23) a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, p);
        else a.set(AlarmManager.RTC_WAKEUP, millis, p);
    }
    private static void cancelReminder(Context c, String id) {
        AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (a != null) a.cancel(reminderIntent(c,id));
    }
    static boolean notificationAllowed(Context c) {
        return Build.VERSION.SDK_INT < 33 || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;
    }
    static void askNotifications(final Activity act) {
        if (Build.VERSION.SDK_INT>=33 && act!=null && !notificationAllowed(act)) {
            act.runOnUiThread(new Runnable(){ public void run(){ act.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},7733); }});
        }
    }
    private static void alert(Context c,String title,String message,int id) {
        if (!notificationAllowed(c)) return;
        NotificationManager n=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (n==null) return;
        if (Build.VERSION.SDK_INT>=26) n.createNotificationChannel(new NotificationChannel(CHANNEL,"Maya reminders and battery", NotificationManager.IMPORTANCE_DEFAULT));
        Intent launch=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (launch==null) return;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content=PendingIntent.getActivity(c,id,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(c,CHANNEL):new Notification.Builder(c);
        b.setSmallIcon(c.getApplicationInfo().icon).setContentTitle(title).setContentText(message).setAutoCancel(true).setContentIntent(content);
        n.notify(id,b.build());
    }
    private static int charge(Context c) {
        Intent bat = c.registerReceiver(null, new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (bat == null) return -1;
        int level=bat.getIntExtra(BatteryManager.EXTRA_LEVEL,-1), scale=bat.getIntExtra(BatteryManager.EXTRA_SCALE,-1);
        return level<0||scale<=0 ? -1 : Math.round(level*100f/scale);
    }
    private static boolean charging(Context c) {
        Intent bat=c.registerReceiver(null,new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (bat==null) return false;
        int s=bat.getIntExtra(BatteryManager.EXTRA_STATUS,-1);
        return s==BatteryManager.BATTERY_STATUS_CHARGING || s==BatteryManager.BATTERY_STATUS_FULL;
    }
    private static void checkLow(Context c) {
        SharedPreferences p=prefs(c);
        if (!p.getBoolean("battery",false)) return;
        int percent=charge(c), threshold=p.getInt("threshold",20);
        if (percent<0) return;
        if (charging(c)||percent>threshold+4) { p.edit().putBoolean("lowSent",false).apply(); return; }
        if (percent<=threshold && !p.getBoolean("lowSent",false)) {
            alert(c,"Maya · Battery low","Battery is " + percent + "%. Consider charging your phone.", 8741);
            p.edit().putBoolean("lowSent",true).apply();
        }
    }
    @Override public void onReceive(Context c, Intent intent) {
        if(intent==null) return;
        String action=intent.getAction();
        if(Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            Map<String,?> all=prefs(c).getAll();
            long now=System.currentTimeMillis();
            for(Map.Entry<String,?> e:all.entrySet()) if(e.getKey().startsWith("rem:")) {
                try { JSONObject r=new JSONObject(String.valueOf(e.getValue())); long t=r.getLong("at");
                    if(t>now) scheduleReminder(c,r.getString("id"),t);
                    else prefs(c).edit().remove(e.getKey()).apply();
                } catch(Exception ignored) {}
            }
            schedulePulse(c); checkLow(c); return;
        }
        if(REMINDER.equals(action)) {
            String id=intent.getStringExtra("id"); if(id==null) return;
            String data=prefs(c).getString("rem:"+id,null);
            if(data==null) return;
            prefs(c).edit().remove("rem:"+id).apply();
            try { JSONObject r=new JSONObject(data); alert(c,"Maya · Reminder",r.optString("title","Reminder"), id.hashCode()); } catch(Exception ignored) {}
            return;
        }
        if(PULSE.equals(action)) { checkLow(c); schedulePulse(c); return; }
        if(prefs(c).getBoolean("battery",false)) {
            if(Intent.ACTION_POWER_CONNECTED.equals(action)) {
                prefs(c).edit().putBoolean("lowSent",false).apply();
                if(prefs(c).getBoolean("charging",false)) alert(c,"Maya · Charging","Your phone started charging.",8742);
            } else if(Intent.ACTION_POWER_DISCONNECTED.equals(action)) {
                if(prefs(c).getBoolean("charging",false)) alert(c,"Maya · Unplugged","Your phone stopped charging.",8743);
            } else if(Intent.ACTION_BATTERY_LOW.equals(action)) checkLow(c);
        }
    }
    static String run(Context c, Activity act, String action, JSONObject a) {
        try {
            SharedPreferences p=prefs(c);
            switch(action) {
                case "AUTOMATION_STATUS": {
                    JSONObject o=new JSONObject();
                    o.put("status","ok"); o.put("android",true);
                    o.put("battery",p.getBoolean("battery",false));
                    o.put("chargingAlerts",p.getBoolean("charging",false));
                    o.put("threshold",p.getInt("threshold",20));
                    o.put("batteryPercent",charge(c)); o.put("charging",charging(c));
                    o.put("notificationsAllowed",notificationAllowed(c));
                    o.put("reminders",list(c));
                    return o.toString();
                }
                case "BATTERY_ALERT_SET": {
                    boolean on=a.optBoolean("on",false); int threshold=a.optInt("threshold",20);
                    if(threshold<10||threshold>50) return MayaControls.res("error","Choose a threshold between 10% and 50%.");
                    p.edit().putBoolean("battery",on).putBoolean("charging",a.optBoolean("charging",false)).putInt("threshold",threshold).putBoolean("lowSent",false).apply();
                    if(on) askNotifications(act);
                    schedulePulse(c);
                    return MayaControls.res("ok", on?"Battery alert configured; battery checks can be delayed by Android.":"Battery monitoring stopped.");
                }
                case "REMINDER_SET": {
                    String title=a.optString("title","").trim();long at=a.optLong("at",0);
                    if(title.isEmpty()||title.length()>120) return MayaControls.res("error","Reminder text must be 1–120 characters.");
                    if(at<=System.currentTimeMillis()+10000L||at>System.currentTimeMillis()+366L*86400000L)
                        return MayaControls.res("error","Choose a future time within one year.");
                    if(list(c).length()>=32) return MayaControls.res("error","Maximum 32 reminders. Delete one first.");
                    String id=UUID.randomUUID().toString().replace("-","").substring(0,14);
                    JSONObject record=new JSONObject().put("id",id).put("title",title).put("at",at);
                    p.edit().putString("rem:"+id,record.toString()).apply();
                    scheduleReminder(c,id,at); askNotifications(act);
                    return new JSONObject().put("status","scheduled").put("id",id).put("message","Reminder saved. Android may deliver it late while idle; notification permission is needed.").toString();
                }
                case "REMINDER_CANCEL": {
                    String id=a.optString("id","");
                    if(!p.contains("rem:"+id)) return MayaControls.res("error","Reminder not found.");
                    cancelReminder(c,id);p.edit().remove("rem:"+id).apply();
                    return MayaControls.res("ok","Reminder cancelled.");
                }
                case "REMINDER_LIST": return new JSONObject().put("status","ok").put("reminders",list(c)).toString();
                case "NOTIFICATION_PERMISSION_REQUEST":
                    askNotifications(act); return MayaControls.res("sent","If needed, Android will ask you to allow notifications.");
                default: return MayaControls.res("error","Unsupported automation action.");
            }
        } catch(Exception e) { return MayaControls.res("error", "Automation unavailable: " + e.getClass().getSimpleName()); }
    }
    private static JSONArray list(Context c) throws Exception {
        JSONArray arr=new JSONArray(); long now=System.currentTimeMillis();
        for(Map.Entry<String,?> e:prefs(c).getAll().entrySet()) if(e.getKey().startsWith("rem:")) {
            try { JSONObject r=new JSONObject(String.valueOf(e.getValue())); if(r.getLong("at")>now) arr.put(r); }
            catch(Exception ignored){}
        }
        return arr;
    }
}
EOF_V2_AUTOMATIONS

if ! grep -q 'android:name="com.tanim.maya.MayaAutomations"' "$MANIFEST"; then
  python3 - <<'PY_V2_MANIFEST'
from pathlib import Path
p = Path('android/app/src/main/AndroidManifest.xml')
s = p.read_text()
insert = '''<receiver android:name="com.tanim.maya.MayaAutomations" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.ACTION_POWER_CONNECTED" />
                <action android:name="android.intent.action.ACTION_POWER_DISCONNECTED" />
                <action android:name="android.intent.action.BATTERY_LOW" />
            </intent-filter>
        </receiver>'''
assert '</application>' in s
p.write_text(s.replace('</application>',insert+'\n    </application>',1))
PY_V2_MANIFEST
fi

echo "== native setup done =="
grep -n "MayaNotificationService" "$MANIFEST" || true
grep -n "maya-debug.keystore" android/app/build.gradle || true

# Maya V3: request Contacts only when user explicitly prepares a WhatsApp draft by name.
if ! grep -q 'android.permission.READ_CONTACTS' "$MANIFEST"; then
  sed -i 's#<application#<uses-permission android:name="android.permission.READ_CONTACTS" />\n    <application#' "$MANIFEST"
fi

# MAYA V4 ADDITIONS: opt-in screen controls and background speech (testing)
#!/usr/bin/env bash
# Maya V4 — opt-in, narrow, user-directed Android controls.
# Runs after setup-native.sh, with Android project present.
set -euo pipefail
APP=android/app/src/main/java/com/tanim/maya
MANIFEST=android/app/src/main/AndroidManifest.xml
mkdir -p "$APP" android/app/src/main/res/xml

cat > "$APP/MayaV4AccessService.java" <<'JAVA'
package com.tanim.maya;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.os.Build;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;
import java.util.Locale;

public class MayaV4AccessService extends AccessibilityService {
    static volatile MayaV4AccessService active;
    @Override protected void onServiceConnected() { super.onServiceConnected(); active = this; }
    private String targetVideo="";
    private long targetUntil=0;
    private final android.os.Handler watchHandler=new android.os.Handler(android.os.Looper.getMainLooper());
    void watchVideoTitle(String title){
        targetVideo=title.trim().toLowerCase(Locale.ROOT);
        targetUntil=android.os.SystemClock.uptimeMillis()+12000;
        watchHandler.postDelayed(()->tryVideoTitle(),2200);
    }
    void clearVideoWatch(){targetVideo="";targetUntil=0;}
    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        // Only inspect a YouTube window after explicit user request; never collect/store screen contents.
        if(targetVideo.length()>0 && android.os.SystemClock.uptimeMillis()<targetUntil){
            watchHandler.removeCallbacksAndMessages(null);
            watchHandler.postDelayed(()->tryVideoTitle(),450);
        }
    }
    private void tryVideoTitle(){
        if(targetVideo.length()==0)return;
        if(android.os.SystemClock.uptimeMillis()>targetUntil){clearVideoWatch();return;}
        AccessibilityNodeInfo root=getRootInActiveWindow();
        if(root!=null && root.getPackageName()!=null &&
            "com.google.android.youtube".contentEquals(root.getPackageName())){
            String keyword=targetVideo;
            try{
                List<AccessibilityNodeInfo> matches=root.findAccessibilityNodeInfosByText(keyword);
                if(matches!=null)for(AccessibilityNodeInfo item:matches){
                    if(item==null || !item.isVisibleToUser() || item.getText()==null || item.isEditable())continue;
                    String label=item.getText().toString().toLowerCase(Locale.ROOT);
                    if(label.contains(keyword) && !label.contains("sponsored") && !label.contains("advertisement") && click(item)){
                        clearVideoWatch();return;
                    }
                }
            }catch(Exception ignored){}
        }
        watchHandler.postDelayed(()->tryVideoTitle(),1200);
    }
    @Override public void onInterrupt() {}
    @Override public void onDestroy() { if (active == this) active = null; super.onDestroy(); }

    boolean command(String cmd, String text) {
        if ("home".equals(cmd)) return performGlobalAction(GLOBAL_ACTION_HOME);
        if ("back".equals(cmd)) return performGlobalAction(GLOBAL_ACTION_BACK);
        if ("lock".equals(cmd)) return Build.VERSION.SDK_INT >= 28 && performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN);
        if ("scrollup".equals(cmd)) return scroll(true);
        if ("scrolldown".equals(cmd)) return scroll(false);
        if ("tap".equals(cmd)) return tapNamed(text);
        if ("firstvideo".equals(cmd)) return tapFirstVideo();
        return false;
    }
    private boolean scroll(boolean up) {
        if (Build.VERSION.SDK_INT < 24) return false;
        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
        float x = dm.widthPixels / 2f, h = dm.heightPixels;
        Path path = new Path();
        path.moveTo(x, up ? h * .30f : h * .75f);
        path.lineTo(x, up ? h * .75f : h * .30f);
        GestureDescription gesture = new GestureDescription.Builder()
            .addStroke(new GestureDescription.StrokeDescription(path, 0, 450)).build();
        return dispatchGesture(gesture, null, null);
    }
    private boolean click(AccessibilityNodeInfo n) {
        for (int depth = 0; n != null && depth < 8; depth++, n = n.getParent()) {
            if (n.isVisibleToUser() && n.isClickable() && n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
        }
        return false;
    }
    private boolean tapNamed(String label) {
        if (label == null || label.trim().length() < 2 || label.length() > 90) return false;
        String lower = label.trim().toLowerCase(Locale.ROOT);
        // Avoid accidental irreversible or consent-related actions.
        if (lower.matches(".*(send|delete|purchase|pay|checkout|confirm|submit|password|install|allow|otp|transfer).*")) return false;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        try {
            List<AccessibilityNodeInfo> found = root.findAccessibilityNodeInfosByText(label.trim());
            if (found == null) return false;
            for (AccessibilityNodeInfo node : found) {
                if (node != null && node.isVisibleToUser() && click(node)) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }
    private boolean tapFirstVideo() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null || root.getPackageName() == null ||
            !"com.google.android.youtube".contentEquals(root.getPackageName())) return false;
        // YouTube can change its accessibility node IDs: fail safely instead of blindly tapping.
        for (String viewId : new String[] { "com.google.android.youtube:id/video_title", "com.google.android.youtube:id/title" }) {
            try {
                List<AccessibilityNodeInfo> found = root.findAccessibilityNodeInfosByViewId(viewId);
                if (found == null) continue;
                for (AccessibilityNodeInfo node : found) {
                    if (node == null || !node.isVisibleToUser() || node.getText() == null) continue;
                    String title = node.getText().toString().toLowerCase(Locale.ROOT);
                    if (title.length() < 2 || title.contains("sponsored") || title.contains("advertisement")) continue;
                    if (click(node)) return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }
}
JAVA

cat > "$APP/MayaV4VoiceService.java" <<'JAVA'
package com.tanim.maya;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import java.util.ArrayList;

public class MayaV4VoiceService extends Service implements RecognitionListener {
    static volatile boolean running = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private boolean stopping = false;
    private int errorCount = 0;
    private final Runnable restart = () -> listen();

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) { stopNow(); return START_NOT_STICKY; }
        if (running) return START_NOT_STICKY;
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel("maya_v4_voice", "Maya background voice", NotificationManager.IMPORTANCE_LOW);
            ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
        Intent stop = new Intent(this, MayaV4VoiceService.class).setAction("STOP");
        PendingIntent stopButton = PendingIntent.getService(this, 2, stop,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open = launch == null ? null : PendingIntent.getActivity(this, 1, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = android.os.Build.VERSION.SDK_INT >= 26 ?
            new Notification.Builder(this, "maya_v4_voice") : new Notification.Builder(this);
        builder.setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("Maya background voice controls")
            .setContentText("Microphone active. Say Maya + command. Stop anytime.")
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopButton);
        if (open != null) builder.setContentIntent(open);
        try { startForeground(2404, builder.build()); }
        catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
        running = true;
        stopping = false;
        handler.post(restart);
        return START_NOT_STICKY; // Never silently restart after system kills service.
    }
    private void destroyRecognizer() {
        if (recognizer != null) {
            try { recognizer.cancel(); recognizer.destroy(); } catch (Exception ignored) {}
            recognizer = null;
        }
    }
    private void listen() {
        if (stopping || !running) return;
        destroyRecognizer();
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { stopNow(); return; }
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(this);
            Intent request = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            request.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            request.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            request.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            recognizer.startListening(request);
        } catch (Exception e) { retry(); }
    }
    private void retry() {
        destroyRecognizer();
        if (stopping || !running) return;
        errorCount = Math.min(errorCount + 1, 8);
        handler.removeCallbacks(restart);
        handler.postDelayed(restart, Math.min(6000, errorCount * 900L));
    }
    @Override public void onResults(Bundle data) {
        ArrayList<String> heard = data == null ? null : data.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (heard != null && !heard.isEmpty()) MayaV4Controls.voiceCommand(this, heard.get(0));
        errorCount = 0;
        handler.removeCallbacks(restart);
        handler.postDelayed(restart, 950);
    }
    @Override public void onError(int error) {
        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) { stopNow(); return; }
        retry();
    }
    @Override public void onReadyForSpeech(Bundle b) {}
    @Override public void onBeginningOfSpeech() {}
    @Override public void onRmsChanged(float v) {}
    @Override public void onBufferReceived(byte[] b) {}
    @Override public void onEndOfSpeech() {}
    @Override public void onPartialResults(Bundle b) {}
    @Override public void onEvent(int i, Bundle b) {}
    private void stopNow() {
        stopping = true; running = false;
        handler.removeCallbacksAndMessages(null);
        destroyRecognizer();
        stopForeground(true);
        stopSelf();
    }
    @Override public void onDestroy() {
        stopping = true; running = false;
        handler.removeCallbacksAndMessages(null);
        destroyRecognizer();
        super.onDestroy();
    }
    @Override public android.os.IBinder onBind(Intent intent) { return null; }
}
JAVA

cat > "$APP/MayaV4Controls.java" <<'JAVA'
package com.tanim.maya;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import org.json.JSONObject;
import java.util.Locale;

public final class MayaV4Controls {
    private MayaV4Controls() {}
    private static String result(String status, String message) {
        JSONObject j = new JSONObject();
        try { j.put("status", status); j.put("message", message); } catch (Exception ignored) {}
        return j.toString();
    }
    static String run(Context ctx, Activity activity, String action, JSONObject args) {
        if ("V4_PLAY_SEARCH".equals(action)) {
            String query=args.optString("query", "").trim();
            if (query.length()<2 || query.length()>150) return result("error","Video title must be 2-150 characters.");
            MayaV4AccessService access=MayaV4AccessService.active;
            if (access==null) return result("needs_permission","Enable Maya Accessibility first, then try again.");
            String uri="https://www.youtube.com/results?search_query="+android.net.Uri.encode(query);
            try {
                // A bounded, best-effort title match after YouTube opens. Never click a random result/ad.
                access.watchVideoTitle(query);
                Intent launch=new Intent(Intent.ACTION_VIEW,android.net.Uri.parse(uri));
                launch.setPackage("com.google.android.youtube");
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try{ctx.startActivity(launch);}catch(Exception first){
                    launch.setPackage(null);ctx.startActivity(launch);
                }
                return result("opened","YouTube search launch requested; title-matching autoplay is a best-effort attempt and is NOT verified.");
            }catch(Exception ex){ access.clearVideoWatch();return result("error","Could not open search: "+ex.getClass().getSimpleName()); }
        }
        if ("V4_STATUS".equals(action)) return result("ok", "Accessibility " +
            (MayaV4AccessService.active != null ? "ON" : "OFF") + ", Background mic " +
            (MayaV4VoiceService.running ? "ON" : "OFF") + ". Start while Maya is visible.");
        if ("V4_ACCESS_SETTINGS".equals(action)) {
            if (activity == null) return result("error", "Settings screen is unavailable.");
            activity.runOnUiThread(() -> {
                try { activity.startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)); }
                catch (Exception ignored) {}
            });
            return result("opened", "Enable Maya screen controls manually in Android Accessibility settings.");
        }
        if ("V4_VOICE_START".equals(action)) {
            if (ctx.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                if (activity != null) activity.runOnUiThread(() -> activity.requestPermissions(
                    new String[]{Manifest.permission.RECORD_AUDIO}, 2404));
                return result("needs_permission", "Allow microphone permission, then tap Start again while Maya is visible.");
            }
            if (MayaV4VoiceService.running) return result("ok", "Already listening for explicit Maya commands.");
            try {
                Intent start = new Intent(ctx, MayaV4VoiceService.class);
                if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(start);
                else ctx.startService(start);
                return result("opened", "Background voice start requested. Check Android notification.");
            } catch (Exception ex) {
                return result("error", "Android blocked background microphone: " + ex.getClass().getSimpleName());
            }
        }
        if ("V4_VOICE_STOP".equals(action)) {
            ctx.stopService(new Intent(ctx, MayaV4VoiceService.class));
            return result("ok", "Background listening stop requested.");
        }
        if ("V4_ACTION".equals(action)) {
            MayaV4AccessService access = MayaV4AccessService.active;
            if (access == null) return result("needs_permission", "Enable Maya in Android Accessibility settings.");
            String cmd = args.optString("cmd", ""), text = args.optString("text", "");
            boolean ok = access.command(cmd, text);
            if (ok && "lock".equals(cmd)) ctx.stopService(new Intent(ctx, MayaV4VoiceService.class));
            return result(ok ? "opened" : "error", ok ? "Action accepted by Android: " + cmd :
                "Action unavailable or no matching on-screen item. Do not assume a tap happened.");
        }
        return result("error", "Unknown V4 action.");
    }
    static void voiceCommand(Context ctx, String phrase) {
        if (phrase == null) return;
        String all = phrase.trim().toLowerCase(Locale.ROOT);
        String wake = null;
        for (String prefix : new String[]{"maya", "মায়া", "মায়া", "মাইয়া", "মাইয়া"}) {
            if (all.equals(prefix) || all.startsWith(prefix + " ")) { wake = prefix; break; }
        }
        if (wake == null) return;
        String words = all.substring(wake.length()).trim();
        if (words.contains("read screen") || words.contains("what is on screen") || words.contains("স্ক্রিন পড়ো") || words.contains("স্ক্রিনে কি আছে")) {
            MayaV5Controls.readAloud(ctx); return;
        }
        if (words.contains("home and lock") || words.contains("home then lock") || words.contains("হোমে যাও লক") || words.contains("হোমপেজে যাও ফোন লক")) {
            MayaV5Controls.run(ctx, null, "V5_HOME_LOCK", new JSONObject()); return;
        }
        if (words.contains("stop listening") || words.contains("stop maya") || words.contains("শোনা বন্ধ")) {
            ctx.stopService(new Intent(ctx, MayaV4VoiceService.class)); return;
        }
        MayaV4AccessService access = MayaV4AccessService.active;
        if (access == null) return;
        if(words.startsWith("play youtube ") || words.startsWith("youtube play ")){
            String query=words.substring(words.indexOf(' ',words.indexOf(' ')+1)+1).trim();
            if(query.length()>1){
                try{run(ctx,null,"V4_PLAY_SEARCH",new JSONObject().put("query",query));}
                catch(Exception ignored){}
            }
            return;
        }
        if (words.contains("lock screen") || words.contains("lock phone") || words.contains("ফোন লক") || words.contains("স্ক্রিন লক")) {
            if (access.command("lock", "")) ctx.stopService(new Intent(ctx, MayaV4VoiceService.class));
        } else if (words.contains("home screen") || words.contains("go home") || words.contains("হোমপেজ") || words.contains("হোম স্ক্রিন") || words.contains("হোমে")) {
            access.command("home", "");
        } else if (words.contains("go back") || words.contains("back button") || words.contains("পিছনে যাও") || words.contains("ব্যাক কর")) {
            access.command("back", "");
        } else if (words.contains("scroll down") || words.contains("swipe up") || words.contains("নিচে স্ক্রল")) {
            access.command("scrolldown", "");
        } else if (words.contains("scroll up") || words.contains("swipe down") || words.contains("উপরে স্ক্রল")) {
            access.command("scrollup", "");
        } else if (words.contains("play first video") || words.contains("open first video") || words.contains("প্রথম ভিডিও চালাও")) {
            access.command("firstvideo", "");
        } else if (words.startsWith("tap ") || words.startsWith("click ")) {
            access.command("tap", words.substring(words.indexOf(' ') + 1));
        } else if (words.startsWith("চাপ দাও ")) {
            access.command("tap", words.substring("চাপ দাও ".length()));
        }
    }
}
JAVA

cat > android/app/src/main/res/xml/maya_v4_accessibility.xml <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
 android:accessibilityEventTypes="typeWindowStateChanged"
 android:accessibilityFeedbackType="feedbackGeneric"
 android:accessibilityFlags="flagReportViewIds"
 android:canRetrieveWindowContent="true"
 android:canPerformGestures="true"
 android:description="@string/app_name"
 android:notificationTimeout="100" />
XML

# V4 Android registration; preserve all previous manifest receivers and services.
python3 - <<'PY_V4_MERGED'
from pathlib import Path
manifest = Path('android/app/src/main/AndroidManifest.xml')
s = manifest.read_text()
for permission in ('android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MICROPHONE', 'android.permission.POST_NOTIFICATIONS'):
    if permission not in s:
        s = s.replace('<application', f'<uses-permission android:name="{permission}" />\n    <application', 1)
services = '''
        <service android:name="com.tanim.maya.MayaV4VoiceService"
            android:exported="false" android:foregroundServiceType="microphone" />
        <service android:name="com.tanim.maya.MayaV4AccessService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true" android:label="Maya screen controls">
            <intent-filter><action android:name="android.accessibilityservice.AccessibilityService" /></intent-filter>
            <meta-data android:name="android.accessibilityservice" android:resource="@xml/maya_v4_accessibility" />
        </service>
'''
if 'MayaV4AccessService' not in s:
    assert '</application>' in s, 'Manifest layout has changed; please inspect first'
    s=s.replace('</application>',services+'\n    </application>',1)
# Android 11+ package visibility for platform SpeechRecognizer.
query='<intent><action android:name="android.speech.RecognitionService" /></intent>'
if 'android.speech.RecognitionService' not in s:
    if '</queries>' in s: s=s.replace('</queries>',query+'</queries>',1)
    else: s=s.replace('<application','<queries>'+query+'</queries>\n    <application',1)
manifest.write_text(s)
bridge=Path('android/app/src/main/java/com/tanim/maya/MayaBridge.java')
b=bridge.read_text()
needle='return MayaControls.run(ctx, act, action, a);'
if 'return MayaV4Controls.run' not in b:
    assert b.count(needle)==1, 'Native bridge changed unexpectedly; stopping patch'
    b=b.replace(needle, 'if (action != null && action.startsWith("V4_")) return MayaV4Controls.run(ctx, act, action, a);\n            '+needle,1)
bridge.write_text(b)
print('Maya V4 services and permissions installed; existing V3 UI and data retained.')
PY_V4_MERGED


# Maya V5 — opt-in visible-window reading and Android contact-picker.
cat > "$APP/MayaV5Controls.java" <<'JAVA'
package com.tanim.maya;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Locale;
import java.util.ArrayList;

public final class MayaV5Controls {
    private MayaV5Controls() {}
    private static final int PICK_CONTACT = 6515;
    private static String pendingMessage = null;
    private static String result(String status,String message){
        JSONObject j=new JSONObject();try{j.put("status",status);j.put("message",message);}catch(Exception ignored){}return j.toString();
    }
    static String run(Context ctx,Activity act,String action,JSONObject data){
        if("V5_HOME_LOCK".equals(action)){
            MayaV4AccessService access=MayaV4AccessService.active;
            if(access==null)return result("needs_permission","Enable Maya Accessibility in Android settings first.");
            boolean h=access.command("home","");
            if(!h)return result("error","Home action was not accepted.");
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(()->{
                boolean locked=access.command("lock","");
                if(locked)ctx.stopService(new Intent(ctx,MayaV4VoiceService.class));
            },450);
            return result("opened","Home accepted; lock requested next. Check if the screen actually locks.");
        }
        if("V5_READ_VISIBLE".equals(action)){
            MayaV4AccessService access=MayaV4AccessService.active;
            if(access==null)return result("needs_permission","Enable Accessibility. Reading is requested only by the Read button.");
            AccessibilityNodeInfo root=access.getRootInActiveWindow();
            if(root==null)return result("error","No accessible foreground window. Try opening the target app first.");
            ArrayList<String> labels=new ArrayList<>();HashSet<String> seen=new HashSet<>();
            scan(root,labels,seen,0);
            JSONObject j=new JSONObject();JSONArray arr=new JSONArray();
            for(String v:labels)arr.put(v);
            try{j.put("status","ok");j.put("message","Visible accessible labels only; no screenshot, no network transfer. App: "+root.getPackageName());j.put("visible",arr);}catch(Exception ignored){}
            return j.toString();
        }
        if("V5_CONTACT_PICKER".equals(action)){
            String message=data.optString("message","").trim();
            if(message.length()==0||message.length()>500)return result("error","Message must be 1 to 500 characters.");
            if(act==null)return result("error","Cannot show Android contact picker now.");
            pendingMessage=message;
            act.runOnUiThread(()->{
                try {Intent pick=new Intent(Intent.ACTION_PICK,ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
                    act.startActivityForResult(pick,PICK_CONTACT);
                } catch(Exception e){pendingMessage=null;}
            });
            return result("opened","Contact picker requested. Select a phone number; check the WhatsApp recipient and personally tap Send.");
        }
        return result("error","Unknown V5 action.");
    }
    private static void scan(AccessibilityNodeInfo node,ArrayList<String> labels,HashSet<String> seen,int depth){
        if(node==null||depth>22||labels.size()>=40||!node.isVisibleToUser())return;
        if(node.isPassword()||node.isEditable())return;
        CharSequence t=node.getText()!=null?node.getText():node.getContentDescription();
        if(t!=null){String s=t.toString().trim();
            // No typed fields, OTPs, long messages, payment numbers or secrets.
            if(s.length()>=2&&s.length()<90&&!s.matches(".*\\b\\d{4,}\\b.*")
                 &&!s.toLowerCase(Locale.ROOT).matches(".*(password|passcode|otp|verification code|credit card|pin code).*")){
                if(seen.add(s))labels.add(s);
            }
        }
        for(int i=0;i<node.getChildCount()&&labels.size()<40;i++)scan(node.getChild(i),labels,seen,depth+1);
    }
    static void readAloud(Context ctx){
        MayaV4AccessService a=MayaV4AccessService.active;
        if(a==null)return;
        AccessibilityNodeInfo root=a.getRootInActiveWindow();
        if(root==null)return;
        ArrayList<String> labels=new ArrayList<>();HashSet<String> seen=new HashSet<>();scan(root,labels,seen,0);
        String spoken=labels.isEmpty()?"No accessible text on this screen.":String.join(". ",labels.subList(0,Math.min(10,labels.size())));
        if(spoken.length()>550)spoken=spoken.substring(0,550);
        final String output=spoken;
        try{
          final android.speech.tts.TextToSpeech[] ref=new android.speech.tts.TextToSpeech[1];
          ref[0]=new android.speech.tts.TextToSpeech(ctx,status->{
             if(status==android.speech.tts.TextToSpeech.SUCCESS){
               ref[0].speak(output,android.speech.tts.TextToSpeech.QUEUE_FLUSH,null,"maya-screen");
               new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(()->{try{ref[0].shutdown();}catch(Exception ignored){}},15000);
             }
          });
        }catch(Exception ignored){}
    }
    static void onPickResult(Activity act,int request,int resultCode,Intent result){
        if(request!=PICK_CONTACT)return;
        final String message=pendingMessage;pendingMessage=null;
        if(resultCode!=Activity.RESULT_OK||result==null||result.getData()==null||message==null)return;
        try(Cursor cur=act.getContentResolver().query(result.getData(),
            new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},null,null,null)){
            if(cur==null||!cur.moveToFirst()){ show(act,"No phone number was selected."); return; }
            String number=cur.getString(0);
            if(number==null){show(act,"Selected contact has no number.");return;}
            String digits=number.replaceAll("[\\s().-]","");
            if(!digits.matches("\\+[1-9][0-9]{7,14}")){show(act,"Save this contact with +country code first. No chat opened.");return;} // No guessing local dial codes.
            String url="https://wa.me/"+digits.substring(1)+"?text="+Uri.encode(message);
            Intent view=new Intent(Intent.ACTION_VIEW,Uri.parse(url));
            view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            act.startActivity(view); // Opens draft only; final Send is manual.
        }catch(Exception ignored){show(act,"Could not open WhatsApp draft. No message was sent.");}
    }
    private static void show(Activity a,String s){a.runOnUiThread(()->android.widget.Toast.makeText(a,s,android.widget.Toast.LENGTH_LONG).show());}
}
JAVA
python3 - <<'PY_V5_MERGE'
from pathlib import Path
bridge=Path('android/app/src/main/java/com/tanim/maya/MayaBridge.java')
s=bridge.read_text()
needle='if (action != null && action.startsWith("V4_")) return MayaV4Controls.run(ctx, act, action, a);'
assert s.count(needle)==1, 'V4 control dispatch changed; abort unsafe patch'
s=s.replace(needle,needle+'\n            if (action != null && action.startsWith("V5_")) return MayaV5Controls.run(ctx, act, action, a);',1)
bridge.write_text(s)
main=Path('android/app/src/main/java/com/tanim/maya/MainActivity.java')
s=main.read_text()
assert 'protected void onNewIntent' in s
assert 'void onActivityResult' not in s
s=s.replace('    @Override\n    protected void onNewIntent',
    '    @Override\n    protected void onActivityResult(int requestCode,int resultCode,Intent data) {\n'
    '        super.onActivityResult(requestCode,resultCode,data);\n'
    '        MayaV5Controls.onPickResult(this,requestCode,resultCode,data);\n'
    '    }\n\n    @Override\n    protected void onNewIntent',1)
main.write_text(s)
print('Maya V5 Android bridge, contact picker and safe screen reader installed.')
PY_V5_MERGE

# MAYA V5.2 — explicit, limited and testable Android controls.
# This patch runs after V1-V5 source generation. No previous UI/data is deleted.
cat > "$APP/MayaV52Controls.java" <<'JAVA'
package com.tanim.maya;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.ContactsContract;
import android.provider.Settings;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Locale;
import org.json.JSONObject;

public final class MayaV52Controls {
    private MayaV52Controls(){}
    private static String resp(String status,String message){
        JSONObject obj=new JSONObject();
        try{obj.put("status",status);obj.put("message",message);}catch(Exception ignored){}
        return obj.toString();
    }
    static String run(Context ctx,Activity act,String action,JSONObject args){
        switch(action){
            case "V52_OVERLAY_PERMISSION":
                if(Build.VERSION.SDK_INT<23)return resp("error","Overlay permission needs Android 6+.");
                if(Settings.canDrawOverlays(ctx))return resp("ok","Floating overlay permission already granted.");
                if(act==null)return resp("error","Please open Maya to grant overlay permission.");
                act.runOnUiThread(()->{
                    Intent i=new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+ctx.getPackageName()));
                    try{act.startActivity(i);}catch(Exception ignored){}
                });
                return resp("needs_permission","Enable Display over other apps for Maya, then return and tap Show.");
            case "V52_OVERLAY_SHOW":
                if(Build.VERSION.SDK_INT<23||!Settings.canDrawOverlays(ctx))
                    return resp("needs_permission","Enable Display over other apps in Android Settings.");
                try{
                    if(act!=null)act.runOnUiThread(()->MayaV52Overlay.show(ctx));
                    else new Handler(Looper.getMainLooper()).post(()->MayaV52Overlay.show(ctx));
                    return resp("pending","Floating shortcut requested (Maya + screen snapshot); check if it appears. It is not a 3D character.");
                }catch(Exception e){return resp("error","Overlay blocked: "+e.getClass().getSimpleName());}
            case "V52_OVERLAY_HIDE":
                new Handler(Looper.getMainLooper()).post(()->MayaV52Overlay.hide());
                return resp("ok","Floating shortcut hidden.");
            case "V52_SCREENSHOT_START":
                return MayaV52Capture.start(ctx);
            case "V52_SCREENSHOT_RESULT":
                return MayaV52Capture.read();
            case "V52_CONTACT_FIND":
                return findContact(ctx,act,args.optString("name",""),args.optString("message",""));
            case "V52_SEQUENCE":
                return sequence(ctx,args.optString("preset",""));
            default:return resp("error","Unknown V5.2 action.");
        }
    }
    private static String clean(String s){
        return java.text.Normalizer.normalize(s,java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).trim().replaceAll("\\s+"," ");
    }
    private static final class Match{
        final String name,number;final int score;
        Match(String n,String p,int s){name=n;number=p;score=s;}
    }
    private static String findContact(Context ctx,Activity act,String name,String message){
        name=name.trim();message=message.trim();
        if(name.length()<2||name.length()>70||message.isEmpty()||message.length()>500)
            return resp("error","Enter a name (2–70 letters) and draft (1–500 characters).");
        if(act==null)return resp("error","Open Maya to choose a contact.");
        if(ctx.checkSelfPermission(Manifest.permission.READ_CONTACTS)!=PackageManager.PERMISSION_GRANTED){
            act.runOnUiThread(()->act.requestPermissions(new String[]{Manifest.permission.READ_CONTACTS},6521));
            return resp("needs_permission","Allow Contacts, then tap Find again. Contacts are matched only on the phone.");
        }
        final ArrayList<Match> matches=new ArrayList<>();HashSet<String> seen=new HashSet<>();
        String wanted=clean(name);
        String[] cols={ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY,
            ContactsContract.CommonDataKinds.Phone.NUMBER};
        try(Cursor c=ctx.getContentResolver().query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            cols,null,null,null)){
            if(c==null)return resp("error","Android Contacts provider is unavailable.");
            while(c.moveToNext()){
                String n=c.getString(0),num=c.getString(1);
                if(n==null||num==null)continue;
                String candidate=clean(n);
                int score=candidate.equals(wanted)?0:candidate.startsWith(wanted)?1:candidate.contains(wanted)?2:100;
                if(score==100)continue;
                String digits=num.replaceAll("[\\s().-]","");
                if(!seen.add(candidate+":"+digits))continue;
                if(matches.size()>=50)return resp("error","More than 50 contacts match. Enter more of the name.");
                matches.add(new Match(n,digits,score));
            }
        }catch(Exception ex){return resp("error","Unable to read contacts (permission/provider error).");}
        if(matches.isEmpty())return resp("error","No saved contact matches this name. Check spelling/permissions.");
        matches.sort((x,y)->Integer.compare(x.score,y.score));
        if(matches.size()>20)return resp("error","More than 20 numbers match. Enter more of the name.");
        final String msg=message;
        String[] labels=new String[matches.size()];
        for(int i=0;i<matches.size();i++){
            Match m=matches.get(i);String num=m.number;
            labels[i]=m.name+" • "+(num.length()>4?"••••"+num.substring(num.length()-4):"number unavailable")
                +(num.startsWith("+")?"":" (needs +country code)");
        }
        act.runOnUiThread(()->new AlertDialog.Builder(act)
            .setTitle("Choose WhatsApp contact and number")
            .setItems(labels,(dialog,which)->{
                Match selected=matches.get(which);
                if(!selected.number.matches("\\+[1-9][0-9]{7,14}")){
                    new AlertDialog.Builder(act).setMessage("Save this number using +country code in Contacts first.").setPositiveButton("OK",null).show();return;
                }
                new AlertDialog.Builder(act)
                    .setTitle("Open WhatsApp draft?")
                    .setMessage(selected.name+" • number ending "+selected.number.substring(selected.number.length()-4)+"\nMessage: "+msg+"\n\nYou must tap Send yourself.")
                    .setNegativeButton("Cancel",null)
                    .setPositiveButton("Open draft",(d,button)->{
                        Uri url=Uri.parse("https://wa.me/"+selected.number.substring(1)+"?text="+Uri.encode(msg));
                        Intent intent=new Intent(Intent.ACTION_VIEW,url);
                        try{act.startActivity(intent);}catch(Exception ex){
                            android.widget.Toast.makeText(act,"Cannot open WhatsApp draft.",android.widget.Toast.LENGTH_LONG).show();
                        }
                    }).show();
            }).setNegativeButton("Cancel",null).show());
        return resp("pending","Contact-choice dialog requested. No message was sent or recipient automatically chosen.");
    }
    private static String sequence(Context ctx,String preset){
        MayaV4AccessService access=MayaV4AccessService.active;
        if(access==null)return resp("needs_permission","Enable Maya Accessibility controls in Android Settings.");
        Handler handler=new Handler(Looper.getMainLooper());
        switch(preset){
            case "home_lock":
                if(!access.command("home",""))return resp("error","Home command did not start.");
                handler.postDelayed(()->{if(access.command("lock",""))ctx.stopService(new Intent(ctx,MayaV4VoiceService.class));},700);
                return resp("opened","Home accepted; Lock scheduled next. Verify your phone actually locks.");
            case "back_home":
                if(!access.command("back",""))return resp("error","Back command did not start.");
                handler.postDelayed(()->access.command("home",""),600);
                return resp("opened","Back accepted, Home scheduled next.");
            case "pause_home":
                MayaControls.run(ctx,null,"MEDIA_PAUSE",new JSONObject());
                handler.postDelayed(()->access.command("home",""),400);
                return resp("opened","Pause requested, Home scheduled next. Media apps may ignore pause.");
            case "scroll_twice":
                if(!access.command("scrolldown",""))return resp("error","First scroll was rejected.");
                handler.postDelayed(()->access.command("scrolldown",""),800);
                return resp("opened","Two bounded scroll gestures requested; some apps ignore gestures.");
            default:return resp("error","Choose one of the four predefined routines. Arbitrary automation is not enabled.");
        }
    }
}
JAVA

cat > "$APP/MayaV52Capture.java" <<'JAVA'
package com.tanim.maya;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.HardwareRenderer;
import android.graphics.HardwareBufferRenderer;
import android.hardware.HardwareBuffer;
import android.os.Build;
import android.util.Base64;
import android.view.Display;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;

public final class MayaV52Capture {
    private MayaV52Capture(){}
    private static volatile String state="empty",data="",note="No screenshot has been requested.";
    private static String result(String status,String message){
        JSONObject o=new JSONObject();try{o.put("status",status);o.put("message",message);}catch(Exception ignored){}return o.toString();
    }
    static String start(Context ctx){
        if(Build.VERSION.SDK_INT<30)return result("error","Single-screen screenshot needs Android 11 or later.");
        MayaV4AccessService access=MayaV4AccessService.active;
        if(access==null)return result("needs_permission","Enable Maya Accessibility and screenshot access in Android Settings.");
        if("pending".equals(state))return result("pending","Another screenshot is in progress.");
        state="pending";data="";note="Capturing screen once. Secure windows may block capture.";
        try{
            access.takeScreenshot(Display.DEFAULT_DISPLAY,ctx.getMainExecutor(),new AccessibilityService.TakeScreenshotCallback(){
                @Override public void onSuccess(AccessibilityService.ScreenshotResult shot){
                    HardwareBuffer buffer=shot.getHardwareBuffer();
                    try{
                        Bitmap hardware=Bitmap.wrapHardwareBuffer(buffer,shot.getColorSpace());
                        if(hardware==null)throw new IllegalStateException("Screenshot bitmap unavailable");
                        int w=hardware.getWidth(),h=hardware.getHeight();
                        float scale=Math.min(1f,1280f/Math.max(w,h));
                        int ow=Math.max(1,Math.round(w*scale)),oh=Math.max(1,Math.round(h*scale));
                        Bitmap rgb=Bitmap.createBitmap(ow,oh,Bitmap.Config.ARGB_8888);
                        Canvas canvas=new Canvas(rgb);canvas.drawColor(Color.WHITE);
                        canvas.drawBitmap(hardware,null,new android.graphics.Rect(0,0,ow,oh),null);
                        ByteArrayOutputStream jpeg=new ByteArrayOutputStream();
                        if(!rgb.compress(Bitmap.CompressFormat.JPEG,76,jpeg))throw new IllegalStateException("JPEG conversion failed");
                        rgb.recycle();
                        if(jpeg.size()>2*1024*1024)throw new IllegalStateException("Screenshot too large");
                        data=Base64.encodeToString(jpeg.toByteArray(),Base64.NO_WRAP);
                        state="ready";note="Screenshot captured in app memory, not uploaded.";
                    }catch(Exception e){data="";state="error";note="Screenshot processing failed.";}
                    finally{try{buffer.close();}catch(Exception ignored){}}
                }
                @Override public void onFailure(int errorCode){data="";state="error";note="Android refused screenshot (may be a protected screen): "+errorCode;}
            });
            return result("pending",note);
        }catch(Exception ex){state="error";note="Android screenshot permission or service rejected capture.";return result("error",note);}
    }
    static String read(){
        JSONObject o=new JSONObject();
        try{o.put("status",state);o.put("message",note);
            if("ready".equals(state)){o.put("data",data);data="";state="empty";note="Screenshot consumed.";}
        }catch(Exception ignored){}
        return o.toString();
    }
}
JAVA

cat > "$APP/MayaV52Overlay.java" <<'JAVA'
package com.tanim.maya;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;

public final class MayaV52Overlay {
    private static WindowManager manager;
    private static View panel;
    private MayaV52Overlay(){}
    static synchronized void show(Context c){
        if(Build.VERSION.SDK_INT<26 || !Settings.canDrawOverlays(c) || panel!=null)return;
        try {
            Context ctx=c.getApplicationContext();
            manager=(WindowManager)ctx.getSystemService(Context.WINDOW_SERVICE);
            LinearLayout buttons=new LinearLayout(ctx);buttons.setOrientation(LinearLayout.VERTICAL);
            buttons.setBackgroundColor(0xD9161930);
            Button open=new Button(ctx);open.setAllCaps(false);open.setText("Maya");open.setTextColor(Color.WHITE);
            Button shot=new Button(ctx);shot.setAllCaps(false);shot.setText("📷");shot.setTextColor(Color.WHITE);
            open.setOnClickListener(v->{
                Intent i=ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
                if(i!=null){i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);try{ctx.startActivity(i);}catch(Exception ignored){}}
            });
            shot.setOnClickListener(v->{
                MayaV52Capture.start(ctx);
                android.os.Handler h=new android.os.Handler(android.os.Looper.getMainLooper());
                h.postDelayed(()->open.performClick(),1500);
            });
            buttons.addView(open,new LinearLayout.LayoutParams(130,100));
            buttons.addView(shot,new LinearLayout.LayoutParams(130,100));
            WindowManager.LayoutParams p=new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT);
            p.gravity=Gravity.END|Gravity.CENTER_VERTICAL;
            manager.addView(buttons,p);panel=buttons;
        }catch(Exception e){panel=null;manager=null;}
    }
    static synchronized void hide(){
        if(panel!=null&&manager!=null){try{manager.removeView(panel);}catch(Exception ignored){}}
        panel=null;manager=null;
    }
}
JAVA

python3 - <<'PY_V52_MERGE'
from pathlib import Path
app=Path('android/app/src/main/java/com/tanim/maya')
manifest=Path('android/app/src/main/AndroidManifest.xml')
s=manifest.read_text()
if 'android.permission.SYSTEM_ALERT_WINDOW' not in s:
    s=s.replace('<application','<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />\n    <application',1)
manifest.write_text(s)
xml=Path('android/app/src/main/res/xml/maya_v4_accessibility.xml')
s=xml.read_text()
assert 'android:canRetrieveWindowContent="true"' in s
if 'android:canTakeScreenshot' not in s:
    s=s.replace('android:canRetrieveWindowContent="true"','android:canRetrieveWindowContent="true"\n android:canTakeScreenshot="true"',1)
xml.write_text(s)
bridge=app/'MayaBridge.java'
s=bridge.read_text()
needle='return MayaControls.run(ctx, act, action, a);'
assert s.count(needle)==1
s=s.replace(needle,'if (action != null && action.startsWith("V52_")) return MayaV52Controls.run(ctx, act, action, a);\n            '+needle,1)
bridge.write_text(s)
# Remove optional dependencies imported inadvertently by platforms on old SDKs
capture=app/'MayaV52Capture.java'
s=capture.read_text().replace('import android.graphics.HardwareRenderer;\n','').replace('import android.graphics.HardwareBufferRenderer;\n','')
capture.write_text(s)
# Release the shortcut if the background voice session ends; don't require a floating window to listen.
voice=app/'MayaV4VoiceService.java'
s=voice.read_text()
needle='running = true;\n        stopping = false;'
if s.count(needle)==1:
    s=s.replace(needle,needle+'\n        MayaV52Overlay.show(this);',1)
needle='@Override public void onDestroy() {'
assert needle in s
s=s.replace(needle,needle+'\n        MayaV52Overlay.hide();',1)
voice.write_text(s)
print('V5.2 native patches registered. Existing V5, V4 and V3 controls kept.')
PY_V52_MERGE

python3 - <<'PY_V52_VOICE'
from pathlib import Path
app=Path('android/app/src/main/java/com/tanim/maya')
controls=app/'MayaV52Controls.java'
s=controls.read_text()
needle='            case "V52_SEQUENCE":\n                return sequence(ctx,args.optString("preset",""));'
assert s.count(needle)==1
s=s.replace(needle,'''            case "V52_SEQUENCE":
                return sequence(ctx,args.optString("preset",""));
            case "V52_SOCIAL_SEARCH":
                return socialSearch(ctx,args.optString("app",""),args.optString("query",""));''',1)
marker='    private static String clean(String s){'
assert s.count(marker)==1
method='''    private static String socialSearch(Context ctx,String app,String query){
        app=app.toLowerCase(Locale.ROOT).trim();query=query.trim();
        if(query.length()<2||query.length()>120)return resp("error","Search requires 2–120 characters.");
        final String url,pkg;
        switch(app){
            case "youtube":url="https://www.youtube.com/results?search_query="+Uri.encode(query);pkg="com.google.android.youtube";break;
            case "tiktok":url="https://www.tiktok.com/search?q="+Uri.encode(query);pkg="com.zhiliaoapp.musically";break;
            case "facebook":url="https://www.facebook.com/search/top/?q="+Uri.encode(query);pkg="com.facebook.katana";break;
            case "instagram":
                if(!query.matches("[A-Za-z0-9._]{1,30}"))return resp("error","Instagram profile lookup needs an exact username (letters, numbers, _ or .). No guessing.");
                url="https://www.instagram.com/"+query+"/";pkg="com.instagram.android";break;
            default:return resp("error","Only YouTube, TikTok, Facebook and Instagram supported.");
        }
        Intent i=new Intent(Intent.ACTION_VIEW,Uri.parse(url));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);i.setPackage(pkg);
        try{ctx.startActivity(i);}
        catch(Exception first){
            try{i.setPackage(null);ctx.startActivity(i);}
            catch(Exception second){return resp("error","Cannot open search in app or browser.");}
        }
        return resp("opened","Search URL handed to Android. Verify the target app displayed the results.");
    }
'''
s=s.replace(marker,method+marker,1)
controls.write_text(s)
voice=app/'MayaV4Controls.java'
s=voice.read_text()
needle='        if (words.contains("read screen")'
assert s.count(needle)==1
addition='''        if (words.contains("take screenshot") || words.contains("capture screen") || words.contains("স্ক্রিনশট নাও")) {
            MayaV52Capture.start(ctx);return;
        }
        if (words.contains("scroll down twice") || words.contains("দুইবার নিচে স্ক্রল")) {
            MayaV52Controls.run(ctx,null,"V52_SEQUENCE",new JSONObject().put("preset","scroll_twice"));return;
        }
        if (words.contains("pause music then home") || words.contains("গান বন্ধ করে হোমে")) {
            MayaV52Controls.run(ctx,null,"V52_SEQUENCE",new JSONObject().put("preset","pause_home"));return;
        }
        for(String platform:new String[]{"youtube","tiktok","facebook","instagram"}) {
            String prefix="search "+platform+" ";
            if(words.startsWith(prefix)) {
                try{MayaV52Controls.run(ctx,null,"V52_SOCIAL_SEARCH",
                    new JSONObject().put("app",platform).put("query",words.substring(prefix.length())));
                }catch(Exception ignored){}
                return;
            }
        }
'''
# JSONObject.put throws JSONException checked in Android? org.json.JSONException is checked for Android, voiceCommand no throws, so try wrappers needed.
addition=addition.replace('MayaV52Controls.run(ctx,null,"V52_SEQUENCE",new JSONObject().put("preset","scroll_twice"));return;',
'''try{MayaV52Controls.run(ctx,null,"V52_SEQUENCE",new JSONObject().put("preset","scroll_twice"));}catch(Exception ignored){}return;''')
addition=addition.replace('MayaV52Controls.run(ctx,null,"V52_SEQUENCE",new JSONObject().put("preset","pause_home"));return;',
'''try{MayaV52Controls.run(ctx,null,"V52_SEQUENCE",new JSONObject().put("preset","pause_home"));}catch(Exception ignored){}return;''')
s=s.replace(needle,addition+needle,1)
voice.write_text(s)
print('Maya V5.2 social lookup and bounded, explicit background voice routines ready.')
PY_V52_VOICE

# MAYA V6 — a read-only permission health report, never requests sensitive access.
# Patches source files produced above; does not alter V1-V5.2 functionality.
python3 - <<'PY_V6_NATIVE_DIAGNOSTICS'
from pathlib import Path
app=Path('android/app/src/main/java/com/tanim/maya')
controls=app/'MayaV52Controls.java'
bridge=app/'MayaBridge.java'
s=controls.read_text()
needle='            case "V52_SEQUENCE":\n                return sequence(ctx,args.optString("preset",""));'
if needle not in s:
    raise RuntimeError('Expected Maya V5.2 native action switch not found. Cannot add V6 diagnostics safely.')
s=s.replace(needle,'''            case "V52_SEQUENCE":
                return sequence(ctx,args.optString("preset",""));
            case "V6_PERMISSION_REPORT":
                return report(ctx);''',1)
method='''    private static String report(Context ctx) {
        JSONObject out=new JSONObject();
        try {
            out.put("status","ok");
            out.put("message","Android permission snapshot; refresh after changing Settings.");
            out.put("androidSdk",Build.VERSION.SDK_INT);
            // Read-only runtime facts for spoken feature reports. No permission requests here.
            out.put("backgroundVoiceRunning",MayaV4VoiceService.running);
            out.put("notificationListenerConnected",MayaNotificationService.connected);
            out.put("screenshotApiEligible",Build.VERSION.SDK_INT>=30 && MayaV4AccessService.active!=null);
            out.put("smsAllowed",ctx.checkSelfPermission(Manifest.permission.SEND_SMS)==PackageManager.PERMISSION_GRANTED);
            out.put("brightnessWriteAllowed",Build.VERSION.SDK_INT>=23 && Settings.System.canWrite(ctx));
            out.put("mic",ctx.checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED);
            out.put("camera",ctx.checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED);
            out.put("contacts",ctx.checkSelfPermission(Manifest.permission.READ_CONTACTS)==PackageManager.PERMISSION_GRANTED);
            out.put("notifications",Build.VERSION.SDK_INT<33 || ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED);
            out.put("overlay",Build.VERSION.SDK_INT>=23 && Settings.canDrawOverlays(ctx));
            String services=Settings.Secure.getString(ctx.getContentResolver(),Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            out.put("accessibility",services!=null && services.contains(ctx.getPackageName()));
        } catch(Exception e) {
            try{out.put("status","error");out.put("message","Android could not read every permission state.");}catch(Exception ignored){}
        }
        return out.toString();
    }
'''
anchor='    private static String clean(String s){'
if s.count(anchor)!=1: raise RuntimeError('Missing V5.2 method anchor')
s=s.replace(anchor,method+anchor,1)
controls.write_text(s)
s=bridge.read_text()
old='action.startsWith("V52_")'
assert s.count(old)==1, 'Unexpected native bridge code; no silent fallback'
s=s.replace(old,'(action.startsWith("V52_") || action.equals("V6_PERMISSION_REPORT"))',1)
bridge.write_text(s)
print('Maya V6 permission report installed (read-only).')
PY_V6_NATIVE_DIAGNOSTICS

# Maya V6: preserve the user's original rigged VRM model inside the Capacitor web assets.
# This optional file contains NO API key; no model is uploaded to third-party services.
if [ -f maya.vrm ]; then
  mkdir -p www
  cp maya.vrm www/maya.vrm
  echo "Maya V6 original VRM asset copied into Android web bundle."
else
  echo "Maya V6 bundled 3D asset missing: model button will show a useful error."
fi

# Maya V6.2: explicit, limited Android social navigation.
cat > "$APP_DIR/MayaV62Automation.java" <<'JAVA_V62'
package com.tanim.maya;

import android.accessibilityservice.AccessibilityService;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityNodeInfo;
import android.content.pm.PackageManager;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

/**
 * User-directed, limited Accessibility navigation. No credential access, blind
 * coordinates, payments, unattended sends, automatic acceptance or analytics.
 * Never reads a chat message body; looks only for the requested visible name.
 */
public final class MayaV62Automation {
    private MayaV62Automation() {}
    private static final Handler main=new Handler(Looper.getMainLooper());
    private static String targetPkg="",query="",mode="",status="idle",note="No search requested.";
    private static int stage=0,attempts=0;
    private static long expires=0;
    private static final int LIMIT=380;
    private static final String[] SOCIAL={"imo","messenger","whatsapp","tiktok","youtube","facebook"};
    private static String pkg(String a){switch(a){
        case "imo":return "com.imo.android.imoim";
        case "messenger":return "com.facebook.orca";
        case "whatsapp":return "com.whatsapp";
        case "tiktok":return "com.zhiliaoapp.musically";
        case "youtube":return "com.google.android.youtube";
        case "facebook":return "com.facebook.katana";
        default:return "";
    }}
    private static JSONObject j(String s,String msg){
        JSONObject o=new JSONObject();try{o.put("status",s);o.put("message",msg);o.put("app",targetPkg);o.put("stage",stage);}catch(Exception ignored){}return o;
    }
    public static synchronized String state(){return j(status,note).toString();}
    private static void finish(String state,String detail){status=state;note=detail;stage=0;}
    public static synchronized String start(Context context,String app,String name){
        app=app==null?"":app.toLowerCase(Locale.ROOT).trim();
        name=name==null?"":name.replaceAll("\\s+"," ").trim();
        if(name.length()<2||name.length()>70)return j("error","Say a specific person or search phrase (2–70 characters).").toString();
        String packageName=pkg(app);
        if(packageName.isEmpty())return j("error","Only imo, Messenger, WhatsApp, TikTok, YouTube or Facebook are supported.").toString();
        if(MayaV4AccessService.active==null)return j("needs_permission","Enable Maya Accessibility in Android Settings. Try again.").toString();
        Intent launch=context.getPackageManager().getLaunchIntentForPackage(packageName);
        if(launch==null)return j("error",app+" app is not installed or Android cannot find it. No Google fallback was opened.").toString();
        if("pending".equals(status))return j("pending","Another app search is in progress. Wait or cancel it first.").toString();
        targetPkg=packageName;query=name;mode=app;status="pending";stage=1;attempts=0;
        expires=SystemClock.uptimeMillis()+16000;
        try{
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);
            context.startActivity(launch);
            main.removeCallbacks(tick);main.postDelayed(tick,850);
            return j("pending","Opening "+app+" and looking for its visible Search field; no message will be sent.").toString();
        }catch(Exception ex){finish("error","Could not open "+app+" ("+ex.getClass().getSimpleName()+").");return state();}
    }
    public static synchronized void onWindowChange(){
        if("pending".equals(status)) { main.removeCallbacks(tick);main.postDelayed(tick,420); }
    }
    public static synchronized String cancel(){
        if("pending".equals(status)){finish("cancelled","Search cancelled. No message sent.");main.removeCallbacks(tick);}
        return state();
    }
    private static final Runnable tick=()->tickNow();
    private static synchronized void tickNow(){
        if(!"pending".equals(status))return;
        if(SystemClock.uptimeMillis()>expires){finish("not_verified","Timed out. The app may hide search controls from Accessibility. Open the chat manually.");return;}
        MayaV4AccessService a=MayaV4AccessService.active;
        if(a==null){finish("needs_permission","Accessibility disconnected.");return;}
        AccessibilityNodeInfo root=a.getRootInActiveWindow();
        if(root==null||root.getPackageName()==null||!targetPkg.contentEquals(root.getPackageName())){
            schedule(600);return;
        }
        if(stage==1){
            AccessibilityNodeInfo edit=findSearchEdit(root);
            if(edit!=null){stage=2;}
            else if(clickSearchIcon(root)) {stage=2;schedule(650);return;}
            else if(++attempts>9){finish("not_verified","Could not locate a visible Search button in this app. No blind tap attempted.");return;}
        }
        if(stage==2){
            AccessibilityNodeInfo edit=findSearchEdit(root);
            if(edit!=null){
                Bundle args=new Bundle();args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,query);
                if(edit.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,args)){
                    stage=3;attempts=0;
                    // Search/Enter on the keyboard when possible. Some versions do it automatically.
                    main.postDelayed(()->submitSearchKeyboard(),300);
                    schedule(1500);return;
                }
            }
            if(++attempts>8){finish("not_verified","The search field did not accept text. Try searching manually.");return;}
        }
        if(stage==3){
            if("tiktok".equals(mode)||"youtube".equals(mode)||"facebook".equals(mode)){
                finish("search_entered","Search phrase entered inside the app. Verify results on screen; no result auto-selected.");return;
            }
            List<AccessibilityNodeInfo> candidates=matchingChats(root,query);
            if(candidates.size()==1){
                if(click(candidates.get(0))){finish("opened_unverified","One exact visible match was tapped in "+mode+". Check the chat header before composing or sending.");return;}
                finish("not_verified","Exact match was visible but Android rejected the tap.");return;
            }
            if(candidates.size()>1){finish("needs_choice","Multiple exact visible matches. Select the correct person manually; no one was opened.");return;}
            if(++attempts>7){finish("needs_choice","The app search was entered, but no unique exact visible contact was verified. Choose the correct result manually.");return;}
        }
        schedule(600);
    }
    private static void schedule(long wait){main.removeCallbacks(tick);main.postDelayed(tick,wait);}
    private static void submitSearchKeyboard(){
        if(stage!=3)return;
        MayaV4AccessService a=MayaV4AccessService.active;if(a==null)return;
        AccessibilityNodeInfo root=a.getRootInActiveWindow();
        if(root==null||root.getPackageName()==null||!targetPkg.contentEquals(root.getPackageName()))return;
        AccessibilityNodeInfo e=findSearchEdit(root);
        if(e!=null && android.os.Build.VERSION.SDK_INT>=30){
            try{e.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.getId());}catch(Exception ignored){}
        }
    }
    private static List<AccessibilityNodeInfo> nodes(AccessibilityNodeInfo root){
        List<AccessibilityNodeInfo> all=new ArrayList<>();if(root==null)return all;
        all.add(root);
        for(int i=0;i<all.size()&&all.size()<LIMIT;i++){
            AccessibilityNodeInfo n=all.get(i);
            int count=0;try{count=Math.min(n.getChildCount(),45);}catch(Exception ignored){}
            for(int c=0;c<count&&all.size()<LIMIT;c++){
                AccessibilityNodeInfo child=null;try{child=n.getChild(c);}catch(Exception ignored){}
                if(child!=null)all.add(child);
            }
        }
        return all;
    }
    private static String text(CharSequence s){return s==null?"":s.toString().trim().toLowerCase(Locale.ROOT);}
    private static AccessibilityNodeInfo findSearchEdit(AccessibilityNodeInfo root){
        for(AccessibilityNodeInfo n:nodes(root)){
            if(!n.isVisibleToUser() || !n.isEditable() || n.isPassword()) continue;
            String hint="";
            try{if(android.os.Build.VERSION.SDK_INT>=26) hint=text(n.getHintText());}catch(Exception ignored){}
            String d=text(n.getContentDescription()),id=text(n.getViewIdResourceName());
            // Never write a contact name into an ordinary message-compose box.
            if(hint.contains("search")||hint.contains("সার্চ")||hint.contains("খুঁজ")||
                d.contains("search")||d.contains("সার্চ")||id.contains("search")) return n;
        }
        return null;
    }
    private static boolean clickSearchIcon(AccessibilityNodeInfo root){
        for(AccessibilityNodeInfo n:nodes(root)){
            if(!n.isVisibleToUser()||n.isEditable()||n.isPassword())continue;
            String desc=text(n.getContentDescription()),t=text(n.getText()),id=text(n.getViewIdResourceName());
            boolean likely=desc.equals("search")||desc.equals("search chats")||desc.equals("search people")||desc.equals("search messages")||desc.equals("খুঁজুন")||desc.equals("সার্চ")||t.equals("search")||t.equals("search chats")||t.equals("search people")||id.endsWith(":id/search")||id.endsWith(":id/search_button")||id.endsWith(":id/search_icon");
            if(likely && click(n))return true;
        }
        return false;
    }
    private static List<AccessibilityNodeInfo> matchingChats(AccessibilityNodeInfo root,String sought){
        String wanted=text(sought);List<AccessibilityNodeInfo> list=new ArrayList<>();HashSet<String> seen=new HashSet<>();
        for(AccessibilityNodeInfo n:nodes(root)){
            if(!n.isVisibleToUser()||n.isPassword()||n.isEditable())continue;
            String t=text(n.getText());
            if(!t.equals(wanted))continue; // no partial guess or first-result click
            AccessibilityNodeInfo clickNode=n;
            for(int i=0;i<5&&clickNode!=null&&!clickNode.isClickable();i++)clickNode=clickNode.getParent();
            if(clickNode==null||!clickNode.isClickable()||!clickNode.isVisibleToUser())continue;
            android.graphics.Rect r=new android.graphics.Rect();clickNode.getBoundsInScreen(r);
            String key=r.flattenToString();if(seen.add(key))list.add(clickNode);
        }
        return list;
    }
    private static boolean click(AccessibilityNodeInfo n){
        for(int i=0;n!=null&&i<6;i++,n=n.getParent()){
            if(n.isClickable()&&n.isVisibleToUser()&&!n.isPassword()&&n.performAction(AccessibilityNodeInfo.ACTION_CLICK))return true;
        }
        return false;
    }
}

JAVA_V62

python3 - <<'PY_V62_MERGE'
from pathlib import Path
app=Path('android/app/src/main/java/com/tanim/maya')
bridge=app/'MayaBridge.java'
s=bridge.read_text()
needle='return MayaControls.run(ctx, act, action, a);'
assert s.count(needle)==1
add='''if (action != null && action.startsWith("V62_")) {
                if ("V62_OPEN_SEARCH".equals(action)) return MayaV62Automation.start(ctx,a.optString("app",""),a.optString("query",""));
                if ("V62_STATUS".equals(action)) return MayaV62Automation.state();
                if ("V62_CANCEL".equals(action)) return MayaV62Automation.cancel();
                return "{\\"status\\":\\"error\\",\\"message\\":\\"Unknown V6.2 action\\"}";
            }
            '''
s=s.replace(needle,add+needle,1)
bridge.write_text(s)
access=app/'MayaV4AccessService.java'
s=access.read_text()
needle='    @Override public void onAccessibilityEvent(AccessibilityEvent event) {'
assert s.count(needle)==1
s=s.replace(needle,needle+'\n        MayaV62Automation.onWindowChange();',1)
access.write_text(s)
xml=Path('android/app/src/main/res/xml/maya_v4_accessibility.xml')
s=xml.read_text().replace('android:accessibilityEventTypes="typeWindowStateChanged"',
                              'android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"')
xml.write_text(s)
manifest=Path('android/app/src/main/AndroidManifest.xml')
s=manifest.read_text()
queries=''.join('<package android:name="'+x+'" />' for x in ('com.imo.android.imoim','com.facebook.orca','com.whatsapp','com.zhiliaoapp.musically','com.google.android.youtube','com.facebook.katana'))
if '</queries>' in s:
    s=s.replace('</queries>',queries+'</queries>',1)
else:
    s=s.replace('<application','<queries>'+queries+'</queries>\n<application',1)
manifest.write_text(s)
voice=app/'MayaV4Controls.java'
s=voice.read_text()
needle='        MayaV4AccessService access = MayaV4AccessService.active;\n        if (access == null) return;'
assert s.count(needle)==1, 'Voice command anchor missing'
add='''        // V6.2: explicit app-name searches. Only unique exact visible chat names may be tapped.
        String[] searchApps={"imo","messenger","whatsapp","tiktok","youtube","facebook"};
        for(String platform:searchApps){
            for(String prefix:new String[]{"search "+platform+" ","open "+platform+" ",platform+" search ",platform+" open "}){
                if(words.startsWith(prefix)&&words.length()>prefix.length()+1){
                    MayaV62Automation.start(ctx,platform,words.substring(prefix.length()));return;
                }
            }
        }
        String[][] bnApps={{"ইমোতে ","imo"},{"ইমো ","imo"},{"মেসেঞ্জারে ","messenger"},
            {"মেসেঞ্জার ","messenger"},{"হোয়াটসঅ্যাপে ","whatsapp"},{"হোয়াটসঅ্যাপে ","whatsapp"},
            {"টিকটকে ","tiktok"},{"টিকটক ","tiktok"}};
        for(String[] item:bnApps){
            if(words.startsWith(item[0])){
                String n=words.substring(item[0].length()).replaceAll("(কে )?(সার্চ করো|খুঁজে খোলো|খুঁজো|চ্যাট খোলো|ওপেন করো|খোলো)$", "").trim();
                if(n.length()>1)MayaV62Automation.start(ctx,item[1],n);return;
            }
        }
        if(words.contains("screenshot")||words.contains("screen shot")||words.contains("স্ক্রিনশট") || words.contains("স্ক্রিন শট")){
            MayaV52Capture.start(ctx);return;
        }
        // A vague "tap this" has no safe target. Need an explicit visible label.
        if(words.endsWith(" ট্যাপ করো")||words.endsWith(" চাপ দাও")){
            String x=words.endsWith(" ট্যাপ করো")?words.substring(0,words.length()-" ট্যাপ করো".length()):words.substring(0,words.length()-" চাপ দাও".length());
            if(!x.equals("এটা")&&!x.equals("ওটা")&&!x.equals("এইটা")&&x.length()>=2){
                MayaV4AccessService c=MayaV4AccessService.active;
                if(c!=null)c.command("tap",x);
            }
            return;
        }
'''
s=s.replace(needle,add+needle,1)
voice.write_text(s)
print('Maya V6.2 in-app search and explicit voice screenshot/tap patched.')

PY_V62_MERGE
