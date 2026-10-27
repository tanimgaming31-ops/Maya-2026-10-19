package com.tanim.maya;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.LauncherApps;
import android.content.pm.LauncherActivityInfo;
import android.os.Process;
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
        // On Android 11+, PackageManager discovery can be limited by app
        // visibility. LauncherApps provides a second system-sanctioned view of
        // MAIN/LAUNCHER activities in the current user profile; no permission
        // to inventory arbitrary (non-launchable) packages is requested.
        try {
            LauncherApps launcher = (LauncherApps) context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
            if (launcher != null) {
                List<LauncherActivityInfo> current = launcher.getActivityList(null, Process.myUserHandle());
                for (LauncherActivityInfo candidate : current) {
                    if (candidate == null || candidate.getComponentName() == null) continue;
                    ComponentName component = candidate.getComponentName();
                    String unique = component.getPackageName() + "/" + component.getClassName();
                    if (!seen.add(unique)) continue;
                    CharSequence label = candidate.getLabel();
                    String title = label == null ? component.getPackageName() : label.toString().trim();
                    JSONObject entry = new JSONObject();
                    entry.put("label", title.length() > 160 ? title.substring(0,160) : title);
                    entry.put("packageName", component.getPackageName());
                    entry.put("activityName", component.getClassName());
                    entries.add(entry);
                }
            }
        } catch (Exception ignored) {
            // Continue with the ordinary MAIN/LAUNCHER list if LauncherApps
            // access is unavailable on this Android manufacturer build.
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

    private static final String VOICE_PREF="maya_voice_app_launch";
    private static void voiceStatus(Context c, String outcome) {
        c.getSharedPreferences(VOICE_PREF,0).edit().putString("last",outcome)
            .putLong("time",System.currentTimeMillis()).apply();
    }
    public static String voiceDiagnostics(Context c) {
        JSONObject o=result("ok","Android background voice launcher status; app delivery not independently verified.");
        android.content.SharedPreferences p=c.getSharedPreferences(VOICE_PREF,0);
        try {
            o.put("last",p.getString("last","No background voice app command recognized."));
            o.put("time",p.getLong("time",0));
        } catch(Exception ignored) {}
        return o.toString();
    }
    private static String normalized(String s) {
        return java.text.Normalizer.normalize(s==null?"":s,java.text.Normalizer.Form.NFKC)
           .toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{M}\\p{N}]+"," ").trim()
           .replaceAll("\\s+"," ");
    }
    private static String alias(String name) {
        String n=normalized(name).replaceAll("(?: অ্যাপটা| অ্যাপটি| অ্যাপ| app)$","");
        if(n.equals("ইমো"))return "imo";
        if(n.equals("হোয়াটসঅ্যাপ")||n.equals("হোয়াটসঅ্যাপ")||n.equals("হোয়াটস্যাপ"))return "whatsapp";
        if(n.equals("মেসেঞ্জার")||n.equals("ফেসবুক মেসেঞ্জার"))return "messenger";
        if(n.equals("ইনস্টাগ্রাম")||n.equals("ইন্সটাগ্রাম")||n.equals("ইনস্টা"))return "instagram";
        if(n.equals("ফেসবুক")||n.equals("ফেইসবুক"))return "facebook";
        if(n.equals("প্লে স্টোর")||n.equals("প্লেস্টোর")||n.equals("গুগল প্লে স্টোর")||n.equals("google play store"))return "play store";
        if(n.equals("ক্যামেরা")||n.equals("মোটো ক্যামেরা"))return "camera";
        if(n.equals("ইউটিউব"))return "youtube";
        if(n.equals("ক্রোম"))return "chrome";
        if(n.equals("সেটিংস"))return "settings";
        if(n.equals("গ্যালারি"))return "gallery";
        return n;
    }
    private static boolean preferred(String q,String pkg) {
        if(q.equals("whatsapp"))return pkg.equals("com.whatsapp");
        if(q.equals("imo"))return pkg.equals("com.imo.android.imoim")||pkg.equals("com.imo.android.imous");
        if(q.equals("instagram"))return pkg.equals("com.instagram.android");
        if(q.equals("facebook"))return pkg.equals("com.facebook.katana")||pkg.equals("com.facebook.lite");
        if(q.equals("messenger"))return pkg.equals("com.facebook.orca")||pkg.equals("com.facebook.mlite");
        if(q.equals("play store"))return pkg.equals("com.android.vending");
        if(q.equals("camera"))return pkg.equals("com.motorola.camera3")||
            pkg.equals("com.android.camera2")||pkg.equals("com.google.android.GoogleCamera");
        return false;
    }
    /**
     * For the user-started V4 microphone foreground service, never force a
     * background activity launch. Android requires a notification tap.
     * Return true only for explicit app-open commands and record the outcome.
     */
    public static boolean handleSpoken(Context context,String words) {
        if(words==null||words.length()>180)return false;
        String phrase=words.trim().replaceAll("[।!?]+$","").trim();
        java.util.regex.Matcher m=java.util.regex.Pattern.compile(
          "^(?:open|launch|start|run) (?:the |my |app )?(.+?)(?: app)?$",34).matcher(phrase);
        if(!m.matches())m=java.util.regex.Pattern.compile(
          "^(.+?) (?:খোলো|খুলে দাও|ওপেন করো|ওপেন করে দাও|চালু করো|চালাও)$").matcher(phrase);
        if(!m.matches())m=java.util.regex.Pattern.compile(
          "^(?:খোলো|ওপেন করো|চালু করো) (.+)$").matcher(phrase);
        if(!m.matches())return false;
        String q=alias(m.group(1));
        if(q.length()<2||q.length()>100||q.contains("http")||q.matches("[a-z0-9_.]+\\.[a-z0-9_.]+")) {
            voiceStatus(context,"Rejected unclear or unsafe app name.");return true;
        }
        try {
            JSONArray list=apps(context);
            JSONObject chosen=null;
            int high=0,second=0;
            for(int i=0;i<list.length();i++) {
                JSONObject a=list.optJSONObject(i);
                if(a==null)continue;
                String label=normalized(a.optString("label")),pkg=a.optString("packageName");
                int score=label.equals(q)?120:preferred(q,pkg)?114:
                  label.startsWith(q+" ")?95:
                  label.endsWith(" "+q)||label.contains(" "+q+" ")?80:0;
                if(score>high){second=high;high=score;chosen=a;}
                else if(score>second){second=score;}
            }
            if(chosen==null||high<80){
                voiceStatus(context,"No matching visible installed launcher app for: "+q);return true;
            }
            if(second>=high){
                voiceStatus(context,"Multiple installed apps match "+q+". Open Maya Settings → Installed Apps to choose.");return true;
            }
            String status=launch(context,chosen.optString("packageName"),chosen.optString("activityName"));
            JSONObject o=new JSONObject(status);
            voiceStatus(context,"App "+q+": "+o.optString("status","unknown")+". "+
                o.optString("message","Android launch requested."));
        } catch(Exception error) {
            voiceStatus(context,"Android launcher could not process the voice command.");
        }
        return true;
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
