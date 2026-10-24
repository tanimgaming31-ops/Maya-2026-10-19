package com.tanim.maya;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

/**
 * Only Android-visible MAIN/LAUNCHER activities; no QUERY_ALL_PACKAGES,
 * Accessibility automation, root, hidden-intent launch, or message sending.
 */
public final class MayaAppCatalog {
    private MayaAppCatalog() {}

    private static JSONObject result(String status, String message) {
        JSONObject o = new JSONObject();
        try { o.put("status", status); o.put("message", message); }
        catch (Exception ignored) {}
        return o;
    }

    /** The Manifest queries MAIN+LAUNCHER on Android 11+. */
    private static JSONArray apps(Context context) throws Exception {
        PackageManager pm = context.getPackageManager();
        Intent query = new Intent(Intent.ACTION_MAIN);
        query.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> discovered = pm.queryIntentActivities(query, 0);
        ArrayList<JSONObject> entries = new ArrayList<>();
        HashSet<String> seen = new HashSet<>();
        for (ResolveInfo info : discovered) {
            ActivityInfo ai = info.activityInfo;
            if (ai == null || !ai.exported) continue;
            if (ai.packageName == null || ai.name == null) continue;
            String unique = ai.packageName + "/" + ai.name;
            if (!seen.add(unique)) continue;
            CharSequence label = info.loadLabel(pm);
            if (label == null || label.toString().trim().isEmpty()) {
                label = ai.applicationInfo == null ? ai.packageName : ai.applicationInfo.loadLabel(pm);
            }
            String title = label == null ? ai.packageName : label.toString().trim();
            JSONObject entry = new JSONObject();
            entry.put("label", title.length() > 160 ? title.substring(0, 160) : title);
            entry.put("packageName", ai.packageName);
            entry.put("activityName", ai.name);
            entries.add(entry);
        }
        entries.sort((a, b) -> {
            int order = a.optString("label").toLowerCase(Locale.ROOT)
                .compareTo(b.optString("label").toLowerCase(Locale.ROOT));
            return order != 0 ? order : a.optString("packageName").compareTo(b.optString("packageName"));
        });
        JSONArray result = new JSONArray();
        // Large app collections are unusual; avoid returning a huge JavaScript bridge string.
        for (int i = 0; i < entries.size() && i < 1200; i++) result.put(entries.get(i));
        return result;
    }

    public static String list(Context context) {
        try {
            JSONObject o = result("ok", "Android-visible launcher apps listed on this device.");
            o.put("apps", apps(context));
            return o.toString();
        } catch (Exception error) {
            return result("error", "Android could not enumerate launchable apps.").toString();
        }
    }

    /** Explicitly revalidate against the device's current Launcher list on every launch. */
    public static String launch(Context context, String packageName, String activityName) {
        if (packageName == null || activityName == null ||
                packageName.length() > 250 || activityName.length() > 300) {
            return result("error", "Invalid app selection.").toString();
        }
        try {
            JSONArray current = apps(context);
            String label = null;
            for (int i = 0; i < current.length(); i++) {
                JSONObject app = current.getJSONObject(i);
                if (packageName.equals(app.optString("packageName")) &&
                        activityName.equals(app.optString("activityName"))) {
                    label = app.optString("label");
                    break;
                }
            }
            if (label == null) return result("unavailable", "App is not currently visible as a launchable Android activity.").toString();
            Intent launch = Intent.makeMainActivity(new ComponentName(packageName, activityName));
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            // Android blocks activity starts from the background; a system-delivered
            // notification tap is the user-initiated path, so defer to a notification.
            if (!MayaBackgroundLaunch.isForeground()) {
                String outcome = MayaBackgroundLaunch.notifyLaunch(context, label, packageName, activityName);
                if ("posted".equals(outcome))
                    return result("background", "Maya is in the background; tap the notification to open " + label + ".").toString();
                return result("notification_blocked", "Maya needs notification permission to open apps while it is in the background.").toString();
            }
            context.startActivity(launch);
            return result("launched", "Android launch intent requested for " + label + ".").toString();
        } catch (SecurityException error) {
            return result("error", "Android denied launching that app.").toString();
        } catch (Exception error) {
            return result("error", "The app could not be opened: " + error.getClass().getSimpleName()).toString();
        }
    }
}
