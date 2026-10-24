package com.maya.launcher

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * অ্যাপ ব্যাকগ্রাউন্ডে থাকলে সরাসরি startActivity() করা যায় না (Android 10+)।
 * সমাধান: একটি নোটিফিকেশন দেখানো, যার contentIntent সরাসরি গন্তব্য অ্যাপের
 * লঞ্চ intent-কে নির্দেশ করে।
 *
 * কেন এটি কাজ করে:
 *  - নোটিফিকেশন ট্যাপে PendingIntent পাঠায় সিস্টেম — এটি BAL ছাড়ের একটি শর্ত।
 *  - মাঝে কোনো service/receiver "trampoline" নেই, তাই Android 12+ নিয়মও মানা হয়।
 *  - ব্যবহারকারীর ট্যাপ ছাড়া কিছুই খোলে না — অনুমতির দিক থেকেও নিরাপদ।
 *
 * সফল notify() কল মানেই ডেলিভারি নিশ্চিত নয় — তাই পোস্ট করার আগে
 * পারমিশন, অ্যাপ-স্তরের নোটিফিকেশন-সুইচ এবং চ্যানেল-ব্লক যাচাই করে
 * স্পষ্ট outcome রিটার্ন করা হয়।
 */
class BackgroundLaunchNotifier(private val context: Context) {

    enum class NotifyOutcome {
        Posted,
        NoNotificationPermission,
        NotificationsDisabled,   // অ্যাপ-স্তরে নোটিফিকেশন বন্ধ
        ChannelBlocked,         // চ্যানেলের importance NONE (API 26+)
        NoLaunchEntry,
    }

    fun requestOpenViaNotification(entry: AppEntry): NotifyOutcome {
        val pm = context.packageManager

        val launchIntent = pm.getLaunchIntentForPackage(entry.packageName)
            ?: return NotifyOutcome.NoLaunchEntry
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        val contentPi = PendingIntent.getActivity(
            context,
            entry.packageName.hashCode(),
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return NotifyOutcome.NoNotificationPermission
        }

        val nm = context.getSystemService(NotificationManager::class.java)
            ?: return NotifyOutcome.NoNotificationPermission

        ensureNotificationReady(nm)?.let { return it }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher) // প্রজেক্টের আইকন দিন
            .setContentTitle("Maya")
            .setContentText("'${entry.label}' খুলবেন? ট্যাপ করুন।")
            .setContentIntent(contentPi)
            .setAutoCancel(true)
            .build()

        nm.notify(entry.packageName.hashCode(), notification)
        return NotifyOutcome.Posted
    }

    /**
     * ব্যাকগ্রাউন্ডে অনুরোধটি ambiguous হলে: ইচ্ছাকৃতভাবে কোনো গন্তব্য বেছে নেওয়া হয় না —
     * নোটিফিকেশনটি Maya-র chooser (MainActivity) খোলে; ক্যান্ডিডেটদের প্যাকেজ-নাম
     * intent-extra-তে পাঠানো হয়, যাতে অ্যাক্টিভিটি রিক্রিয়েট হলেও তালিকা রক্ষা পায়।
     */
    fun notifyPendingChooser(candidates: List<AppEntry>): NotifyOutcome {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return NotifyOutcome.NoNotificationPermission
        }

        val nm = context.getSystemService(NotificationManager::class.java)
            ?: return NotifyOutcome.NoNotificationPermission

        ensureNotificationReady(nm)?.let { return it }

        val chooserIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putStringArrayListExtra(
                MainActivity.EXTRA_PENDING_CANDIDATES,
                ArrayList(candidates.map { it.packageName }),
            )
        }

        val chooserPi = PendingIntent.getActivity(
            context,
            0,
            chooserIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Maya")
            .setContentText("কয়েকটি অ্যাপ মিলেছে — বেছে নিতে খুলুন")
            .setContentIntent(chooserPi)
            .setAutoCancel(true)
            .build()

        nm.notify(CHOOSER_NOTIFICATION_ID, notification)
        return NotifyOutcome.Posted
    }

    /**
     * শেয়ার্ড প্রস্তুতি: চ্যানেল তৈরি (API 26+) + অ্যাপ-স্তরের সুইচ ও চ্যানেল-ব্লক যাচাই।
     * null রিটার্ন মানে প্রস্তুত; নাহলে সেই ব্যর্থতার outcome।
     */
    private fun ensureNotificationReady(nm: NotificationManager): NotifyOutcome? {
        // অ্যাপ-স্তরে নোটিফিকেশন বন্ধ করা আছে কি না (API 24+)
        if (!nm.areNotificationsEnabled()) return NotifyOutcome.NotificationsDisabled

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "অ্যাপ খোলার অনুরোধ",
                    NotificationManager.IMPORTANCE_HIGH,
                )
            )
            // ইউজার চ্যানেলটি ব্লক করে রেখেছে কি না
            nm.getNotificationChannel(CHANNEL_ID)?.let {
                if (it.importance == NotificationManager.IMPORTANCE_NONE) {
                    return NotifyOutcome.ChannelBlocked
                }
            }
        }
        return null
    }

    companion object {
        private const val CHANNEL_ID = "maya_app_open"
        private const val CHOOSER_NOTIFICATION_ID = 1001
        private val POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS"
    }
}
