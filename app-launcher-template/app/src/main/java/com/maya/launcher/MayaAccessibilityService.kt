package com.maya.launcher

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityManager
import android.view.accessibility.AccessibilityNodeInfo

/**
 * ঐচ্ছিক মডিউল: লঞ্চ করার পরে টার্গেট অ্যাপের ভেতরের UI নোডের সাথে ইন্টারঅ্যাকশন
 * (যেমন নির্দিষ্ট বাটন ট্যাপ করা)।
 *
 * গুরুত্বপূর্ণ সীমা:
 *  - এটি লঞ্চার এন্ট্রি নেই এমন প্যাকেজের জন্য এন্ট্রি পয়েন্ট "তৈরি" করে না।
 *  - নন-এক্সপোর্টেড অ্যাক্টিভিটিতে ঢুকতে দেয় না — সেটি প্ল্যাটফর্ম নিরাপত্তা।
 *  - প্রতিটি অ্যাপের UI আলাদা — কাস্টম ভিউ বা Canvas-আঁকা UI-তে নোড পাওয়া
 *    যাবে কি না নির্ভর করে সেই অ্যাপ কতটা accessibility-ট্রি প্রকাশ করে তার ওপর;
 *    WebView-ও কখনো কখনো প্রকাশ করে, কখনো করে না — নিশ্চয়তা নেই।
 *  - ব্যবহারকারী নিজে Settings > Accessibility থেকে চালু করে; প্রোগ্রাম্যাটিকভাবে
 *    চালু করার কোনো বৈধ উপায় নেই।
 */
class MayaAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // ইভেন্ট-চালিত লজিক দরকার হলে এখানে; নোড-ইন্টারঅ্যাকশন অন-ডিমান্ড হয়।
        // উইন্ডো পরিবর্তনের ইভেন্ট শুনে "এখন অমুক অ্যাপ সামনে আছে" ট্র্যাক করা যায়।
    }

    override fun onInterrupt() {}

    /**
     * টার্গেট প্যাকেজের সক্রিয় উইন্ডোর রুট নোড।
     * সাবধান: rootInActiveWindow যেকোনো সময় null হতে পারে (উইন্ডো বদলাচ্ছে,
     * অ্যানিমেশন চলছে), আর সবসময় আপনার টার্গেট অ্যাপের নাও হতে পারে।
     */
    fun rootOf(packageName: String): AccessibilityNodeInfo? =
        rootInActiveWindow?.takeIf { it.packageName == packageName }

    /**
     * রিসোর্স আইডি দিয়ে নোড খুঁজে ট্যাপ — সবচেয়ে নির্ভরযোগ্য পদ্ধতি।
     * শুধু টার্গেট প্যাকেজের, দৃশ্যমান ও enabled নোড বিবেচিত হয়; একাধিক
     * ম্যাচ (একই আইডি বিভিন্ন জায়গায়) হলে অস্পষ্ট ধরে ব্যর্থ হয়।
     */
    fun clickByViewId(root: AccessibilityNodeInfo, expectedPackage: String, viewId: String): Boolean {
        val nodes = root.findAccessibilityNodeInfosByViewId(viewId)
            .filter { it.isUsableNode(expectedPackage) }
        if (nodes.size != 1) return false // নেই বা একাধিক — নিরাপদে ব্যর্থ
        return clickNode(nodes[0], expectedPackage)
    }

    /**
     * দৃশ্যমান টেক্সট দিয়ে নোড খুঁজে ট্যাপ — আইডি না জানা থাকলে ফলব্যাক।
     * সতর্কতা: findAccessibilityNodeInfosByText substring-ম্যাচ দেয়, তাই শুধু
     * হুবহু-টেক্সটের ঠিক একটি ব্যবহারযোগ্য ম্যাচ গ্রহণ করা হয় — অস্পষ্ট হলে ব্যর্থ।
     */
    fun clickByText(root: AccessibilityNodeInfo, expectedPackage: String, text: String): Boolean {
        val nodes = root.findAccessibilityNodeInfosByText(text)
            .filter {
                it.text?.toString()?.equals(text, ignoreCase = true) == true &&
                    it.isUsableNode(expectedPackage)
            }
        if (nodes.size != 1) return false // ম্যাচ নেই বা একাধিক — নিরাপদে ব্যর্থ
        return clickNode(nodes[0], expectedPackage)
    }

    private fun AccessibilityNodeInfo.isUsableNode(expectedPackage: String): Boolean =
        packageName == expectedPackage && isVisibleToUser && isEnabled

    /**
     * নোড নিজে ক্লিকেবল না হলে প্যারেন্ট-চেইন ধরে উপরে উঠে সবচেয়ে কাছের
     * ক্লিকেবল পূর্বপুরুষে ACTION_CLICK চালানো হয় (বাউন্ডেড রিকার্শন)।
     * প্যারেন্ট-চেইনেও প্যাকেজ/দৃশ্যমানতা/enabled যাচাই বজায় থাকে — শুধু
     * শুরুতে root যাচাই করলেই সীমানা রক্ষা হয় না।
     */
    private fun clickNode(node: AccessibilityNodeInfo, expectedPackage: String, depth: Int = 0): Boolean {
        if (depth > 6) return false
        if (!node.isUsableNode(expectedPackage)) return false
        if (node.isClickable && node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            return true
        }
        val parent = node.parent ?: return false
        return try {
            clickNode(parent, expectedPackage, depth + 1)
        } finally {
            parent.recycle()
        }
    }

    // ---------- লাইফসাইকেল / স্ট্যাটিক হেল্পার ----------

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    companion object {
        /** সার্ভিস চালু থাকলে তার instance, নাহলে null। */
        var instance: MayaAccessibilityService? = null
            private set

        /** ব্যবহারকারী কি এই সার্ভিসটি চালু করেছে? (parsed ComponentName দিয়ে তুলনা) */
        fun isEnabled(context: Context): Boolean {
            val expected = ComponentName(context, MayaAccessibilityService::class.java)
            val am = context.getSystemService(AccessibilityManager::class.java) ?: return false
            return am.getEnabledAccessibilityServiceList(
                AccessibilityServiceInfo.FEEDBACK_ALL_MASK
            ).any { ComponentName.unflattenFromString(it.id) == expected }
        }

        /** ইউজারকে সার্ভিস চালু করার সেটিংস স্ক্রিনে নিয়ে যায়। */
        fun openSettings(context: Context) {
            context.startActivity(
                Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }
    }
}
