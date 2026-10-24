package com.tanim.maya;

import android.app.Activity;
import android.app.Application;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import org.json.JSONObject;
import java.lang.ref.WeakReference;

/**
 * Deferred app opening for the rare case where Maya is not the foreground app
 * when a user-approved package/activity pair must launch: Android blocks
 * background activity starts, so the user receives a tap-to-open notification
 * instead. A system-delivered notification tap is an explicit user-initiated
 * launch path, and the content intent is a plain activity PendingIntent: no
 * service or broadcast relay, no accessibility automation, no runtime command
 * execution, no background privilege, and no broad package visibility.
 */
public final class MayaBackgroundLaunch {
    private MayaBackgroundLaunch() {}

    static final String CHANNEL_ID = "maya_launch";
    private static final int PERMISSION_CODE = 4751;

    private static final Object LOCK = new Object();
    private static boolean watched = false;
    private static volatile boolean resumed = false;
    private static volatile WeakReference<Activity> activity = new WeakReference<>(null);
    private static volatile Application app;

    /**
     * Register once from MainActivity.onCreate, before onStart/onResume fire.
     * The resumed activity reference is refreshed on every resume so a recreated
     * Activity (rotation, theme change) never leaves a stale reference behind.
     * Until the first onActivityResumed fires, the foreground state stays
     * conservatively false — onCreate is not a resume.
     */
    static void watch(Activity main) {
        if (main == null) return;
        synchronized (LOCK) {
            if (watched) return;
            watched = true;
        }
        Application application = (Application) main.getApplicationContext();
        app = application;
        application.registerActivityLifecycleCallbacks(new Application.ActivityLifecycleCallbacks() {
            @Override public void onActivityResumed(Activity a) {
                synchronized (LOCK) { resumed = true; activity = new WeakReference<>(a); }
            }
            @Override public void onActivityPaused(Activity a) {
                synchronized (LOCK) {
                    if (activity.get() == a) { resumed = false; activity.clear(); }
                }
            }
            @Override public void onActivityCreated(Activity a, Bundle b) {}
            @Override public void onActivityStarted(Activity a) {}
            @Override public void onActivityStopped(Activity a) {}
            @Override public void onActivitySaveInstanceState(Activity a, Bundle b) {}
            @Override public void onActivityDestroyed(Activity a) {
                synchronized (LOCK) {
                    if (activity.get() == a) { resumed = false; activity.clear(); }
                }
            }
        });
    }

    /** Unknown state is treated conservatively as "not foreground". */
    static boolean isForeground() {
        return resumed;
    }

    /**
     * Can the system actually show a Maya launch notification right now?
     * Returns "granted", "blocked" (notifications or the launch channel are
     * off), or "disabled" (no NotificationManager).
     */
    private static String availability(Context context) {
        try {
            NotificationManager nm = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return "disabled";
            if (Build.VERSION.SDK_INT >= 24 && !nm.areNotificationsEnabled()) return "blocked";
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(new NotificationChannel(CHANNEL_ID,
                    "মায়া অ্যাপ লঞ্চ", NotificationManager.IMPORTANCE_DEFAULT));
                NotificationChannel channel = nm.getNotificationChannel(CHANNEL_ID);
                if (channel != null && channel.getImportance()
                        == NotificationManager.IMPORTANCE_NONE) return "blocked";
            }
            return "granted";
        } catch (Exception error) {
            return "disabled";
        }
    }

    /**
     * The Settings control calls this while Maya is visible. Outcomes:
     * granted (notifications can be shown) / requested (a permission request is
     * scheduled on the UI thread; it runs only while the captured activity is
     * still resumed — the dialog itself is up to Android) / blocked
     * (notifications or the launch channel are off) / unavailable (no usable
     * foreground activity to ask from).
     */
    static String requestPermission() {
        JSONObject o = new JSONObject();
        String status = "unavailable";
        try {
            Activity main;
            synchronized (LOCK) { main = resumed ? activity.get() : null; }
            if (Build.VERSION.SDK_INT < 33) {
                // No runtime notification permission below Android 13; only availability matters.
                status = main != null ? availability(main)
                    : (app != null ? availability(app) : "unavailable");
            } else if (main == null) {
                status = "unavailable";
            } else if (main.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED) {
                status = availability(main);
            } else {
                final Activity a = main;
                // A permission ask only runs while the captured activity is
                // still the resumed one; a later pause cancels it silently.
                a.runOnUiThread(() -> {
                    synchronized (LOCK) {
                        if (!resumed || activity.get() != a) return;
                    }
                    if (a.isFinishing() || a.isDestroyed()) return;
                    a.requestPermissions(
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                        PERMISSION_CODE);
                });
                status = "requested";
            }
        } catch (Exception ignored) {
        }
        try { o.put("status", status); } catch (Exception ignored) {}
        return o.toString();
    }

    /** Outcomes: posted / no_permission / disabled / blocked. */
    static String notifyLaunch(Context context, String label, String packageName, String activityName) {
        try {
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(
                    android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) return "no_permission";
            String ready = availability(context);
            if (!"granted".equals(ready)) return ready;
            Intent launch = Intent.makeMainActivity(new ComponentName(packageName, activityName));
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent open = PendingIntent.getActivity(context, packageName.hashCode(), launch, flags);
            NotificationManager nm = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return "disabled";
            Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);
            Notification note = builder
                .setSmallIcon(R.drawable.maya_launch_notify)
                .setContentTitle("Maya")
                .setContentText("ট্যাপ করে " + label + " খোলো।")
                .setAutoCancel(true)
                .setContentIntent(open)
                .build();
            nm.notify(CHANNEL_ID, packageName.hashCode(), note);
            return "posted";
        } catch (Exception error) {
            return "disabled";
        }
    }
}
