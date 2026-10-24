package com.maya.launcher

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build

/**
 * লঞ্চার-এ দেখা যায় এমন একটি অ্যাপের সংক্ষিপ্ত তথ্য।
 */
data class AppEntry(
    val packageName: String,
    val label: String,
)

/**
 * ডিভাইসের লঞ্চার-অ্যাপগুলোর তালিকা তৈরি করে।
 *
 * Android 11 (API 30)+ এ প্যাকেজ-ভিজিবিলিটি ফিল্টার থাকায় শুধু ম্যানিফেস্টের
 * <queries> ঘোষণার সাথে মিলে যাওয়া অ্যাপগুলোই দেখা যায় — এটি আচরণ, বাগ নয়।
 */
class AppCatalog(private val context: Context) {

    private val pm: PackageManager = context.packageManager

    /**
     * সব লঞ্চেবল অ্যাপ লোড করে (লেবেল সহ)।
     * নোট: ফ্ল্যাগ 0 ব্যবহার করা হয়েছে — MATCH_DEFAULT_ONLY দিলে কিছু বৈধ
     * লঞ্চার এন্ট্রি বাদ পড়তে পারে।
     */
    fun loadLaunchableApps(): List<AppEntry> {
        val launcherQuery = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

        val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.queryIntentActivities(launcherQuery, PackageManager.ResolveInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            pm.queryIntentActivities(launcherQuery, 0)
        }

        return resolveInfos
            .asSequence()
            .filter { it.activityInfo?.applicationInfo != null }
            .map { it to it.loadLabel(pm).toString() }
            .distinctBy { it.first.activityInfo.packageName }
            .map { (info, label) -> AppEntry(info.activityInfo.packageName, label) }
            .sortedBy { it.label.lowercase() }
            .toList()
    }
}
