package com.maya.launcher

import android.app.ActivityOptions
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

sealed class LaunchOutcome {
    /** অনুরোধ পাঠানো হয়েছে — এক্সেপশন না হওয়া অ্যান্ড্রয়েড অ্যাপটি সত্যিই দেখানোর প্রমাণ নয়। */
    data object LaunchRequested : LaunchOutcome()
    data class Failed(val reason: String, val cause: Exception? = null) : LaunchOutcome()
}

/**
 * একটি প্যাকেজ লঞ্চ করার দায়িত্বে থাকা ডিসপ্যাচার।
 *
 * প্যাকেজ লঞ্চের নির্ভরযোগ্য পথ:
 *  1) getLaunchIntentForPackage() — লঞ্চার অ্যাক্টিভিটির সরাসরি intent।
 *  2) getLaunchIntentSenderForPackage() (API 33+) — প্যাকেজটি ভিজিবিলিটি-ফিল্টারড
 *     হলেও কাজ করে।
 *
 * কখনই করবেন না: আন্দাজ করে অ্যাক্টিভিটির নাম দিয়ে ComponentName বানানো, বা
 * অ্যারবিট্রারি exported অ্যাক্টিভিটিকে জেনেরিক লঞ্চার হিসেবে ব্যবহার করা।
 */
class AppLauncher(private val context: Context) {

    fun launch(entry: AppEntry): LaunchOutcome = launch(entry.packageName)

    fun launch(packageName: String): LaunchOutcome {
        val pm = context.packageManager

        // প্রথম পছন্দ: লঞ্চার intent
        val launchIntent: Intent? = pm.getLaunchIntentForPackage(packageName)

        if (launchIntent != null) {
            return startIntent(launchIntent)
        }

        // ফলব্যাক (API 33+): ভিজিবিলিটি-নিরপেক্ষ পথ। সেন্ডার-সাইড opt-in
        // অ্যাপটি ব্যাকগ্রাউন্ডে থাকলে API 34+ টার্গেটে দরকার — তাই guarded।
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            try {
                val sender = pm.getLaunchIntentSenderForPackage(packageName)
                if (sender != null) {
                    val options = ActivityOptions.makeBasic()
                    if (Build.VERSION.SDK_INT >= 36) {
                        // compileSdk 36+ দরকার; দৃশ্যমান থাকলেই শুধু ছাড় — সবচেয়ে কঠোর মোড
                        options.setPendingIntentBackgroundActivityStartMode(
                            ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_IF_VISIBLE
                        )
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        options.setPendingIntentBackgroundActivityStartMode(
                            ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                        )
                    }
                    context.startIntentSender(sender, null, 0, 0, 0, options.toBundle())
                    return LaunchOutcome.LaunchRequested
                }
            } catch (e: Exception) {
                Log.w(TAG, "startIntentSender failed for $packageName", e)
            }
        }

        return LaunchOutcome.Failed(
            "এই প্যাকেজের কোনো লঞ্চার এন্ট্রি পাওয়া যায়নি — হয় লঞ্চেবল নয়, " +
                "নয় ভিজিবল নয়, নয় ইনস্টলই নেই।"
        )
    }

    private fun startIntent(intent: Intent): LaunchOutcome {
        // অ্যাক্টিভিটির বাইরের Context থেকে লঞ্চ করলে NEW_TASK বাধ্যতামূলক;
        // অ্যাক্টিভিটি থেকে হলেও ক্ষতি নেই।
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        return try {
            context.startActivity(intent)
            LaunchOutcome.LaunchRequested
        } catch (e: ActivityNotFoundException) {
            LaunchOutcome.Failed("অ্যাপটি খোলা যায়নি: ${e.message}", e)
        } catch (e: SecurityException) {
            LaunchOutcome.Failed("অনুমতি নেই বা কম্পোনেন্ট এক্সপোর্টেড নয়: ${e.message}", e)
        }
    }

    companion object {
        private const val TAG = "AppLauncher"
    }
}
