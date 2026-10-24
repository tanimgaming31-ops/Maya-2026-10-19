package com.maya.launcher

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * মেইন স্ক্রিন: টেক্সট বা ভয়েসে অ্যাপের নাম নিয়ে লঞ্চ করে।
 *
 * Foreground/background সিদ্ধান্ত: অ্যাক্টিভিটি বর্তমানে resumed কি না
 * (isResumed) তার ওপর ভিত্তি করে ডিসপ্যাচ হয় —
 *  - resumed → সরাসরি startActivity() (BAL বিধিনিষেধ প্রযোজ্য নয়)
 *  - নয় (যেমন স্পিচ-রেজাল্ট দেরিতে এল) → নোটিফিকেশন-ভিত্তিক ফ্লো
 * Ambiguity ডায়ালগ শুধু দৃশ্যমান অবস্থাতেই দেখানো হয়।
 */
class MainActivity : AppCompatActivity() {

    private lateinit var catalog: AppCatalog
    private lateinit var resolver: AppResolver
    private val launcher = AppLauncher(this)
    private val notifier = BackgroundLaunchNotifier(this)
    private var voice: VoiceInputHelper? = null

    private lateinit var input: EditText
    private lateinit var status: TextView

    /** স্পিচ-রেজাল্ট দেরিতে এলে জানার জন্য অ্যাক্টিভিটি কি এখন দৃশ্যমান */
    private var isResumed = false

    /** ব্যাকগ্রাউন্ডে অনুরোধটি ambiguous হলে ক্যান্ডিডেটরা জমা থাকে —
     *  পরের onResume()-এ chooser দেখানো হয়; ইচ্ছাকৃতভাবে কোনোটি বেছে নেওয়া হয় না */
    private var pendingCandidates: List<AppEntry>? = null

    // মাইক পারমিশন — শুধু মাইক-বাটন চাপলে চাওয়া হয়, ফলাফলেই শোনা শুরু
    private val micPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startVoiceInput()
        else Toast.makeText(this, "মাইক্রোফোনের অনুমতি ছাড়া ভয়েস কমান্ড কাজ করবে না", Toast.LENGTH_LONG).show()
    }

    // নোটিফিকেশন পারমিশন — আলাদা ফ্লো; এতে কোনো রেকর্ডিং শুরু হয় না
    private val notifPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) {
            Toast.makeText(this, "নোটিফিকেশন বন্ধ থাকলে ব্যাকগ্রাউন্ড-অনুরোধ দেখা যাবে না", Toast.LENGTH_LONG).show()
        }
    }

    override fun onResume() {
        super.onResume()
        isResumed = true
        // ব্যাকগ্রাউন্ডে জমা থাকা ambiguous অনুরোধ — এখন দৃশ্যমান, chooser দেখান
        pendingCandidates?.let { candidates ->
            pendingCandidates = null
            if (candidates.size > 1) showDisambiguation(candidates)
        }
    }

    // singleTop (ম্যানিফেস্টে) — একই অ্যাক্টিভিটি ইনস্ট্যান্সে intent এলে
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        restorePendingCandidates(intent)
    }

    /**
     * নোটিফিকেশন-chooser-এর intent-extra থেকে ক্যান্ডিডেট পুনরুদ্ধার।
     * এখনই দৃশ্যমান হলে সরাসরি ডায়ালগ, নাহলে pending হিসেবে জমা।
     */
    private fun restorePendingCandidates(intent: Intent?) {
        val pkgs = intent?.getStringArrayListExtra(EXTRA_PENDING_CANDIDATES) ?: return
        if (pkgs.size < 2) return
        val candidates = pkgs.map { AppEntry(it, it) }
        if (isResumed) {
            showDisambiguation(candidates)
        } else {
            pendingCandidates = candidates
        }
    }

    override fun onPause() {
        isResumed = false
        super.onPause()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        catalog = AppCatalog(this)
        resolver = AppResolver(catalog)

        input = findViewById(R.id.appNameInput)
        status = findViewById(R.id.statusText)

        // chooser-নোটিফিকেশন থেকে এসে থাকলে ক্যান্ডিডেটরা পুনরুদ্ধার
        restorePendingCandidates(intent)

        findViewById<Button>(R.id.openButton).setOnClickListener {
            handleUserInput(input.text.toString())
        }

        findViewById<Button>(R.id.micButton).setOnClickListener {
            ensureMicPermissionThenListen()
        }

        // নোটিফিকেশন পারমিশন (API 33+) — ব্যাকগ্রাউন্ড ফ্লোর জন্য, মাইকের সাথে মেশানো নয়
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // ---------- ভয়েস ইনপুট ----------

    private fun ensureMicPermissionThenListen() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startVoiceInput()
        } else {
            micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun startVoiceInput() {
        // আগের লাইভ recognizer থাকলে প্রথমে ধ্বংস করুন — নাহলে সেটি লিক হবে
        voice?.destroy()
        voice = VoiceInputHelper(
            context = this,
            onResult = { spoken -> runOnUiThread { spoken?.let { handleUserInput(it) } } },
            onError = { msg -> runOnUiThread { setStatus(msg) } },
        )
        voice?.startListening()
    }

    // ---------- রেজলভ + লঞ্চ ----------

    private fun handleUserInput(rawText: String) {
        val text = rawText.trim()
        if (text.isEmpty()) {
            setStatus("অ্যাপের নাম বলুন বা লিখুন")
            return
        }

        val appName = stripCommandPrefixes(text)

        when (val result = resolver.resolve(appName)) {
            is ResolveResult.Resolved -> dispatchLaunch(result.entry)
            is ResolveResult.Ambiguous -> {
                if (isResumed) {
                    showDisambiguation(result.candidates)
                } else {
                    // অ্যাক্টিভিটি দৃশ্যমান নয় — কোনো গন্তব্য বেছে নেওয়া হয় না:
                    // ক্যান্ডিডেটদের প্যাকেজ-নাম নোটিফিকেশনের intent-extra-তে পাঠানো
                    // হয়, যাতে chooser-টি অ্যাক্টিভিটি রিক্রিয়েট হলেও রক্ষা পায়
                    if (result.candidates.size > 1) {
                        notifier.notifyPendingChooser(result.candidates)
                    } else {
                        result.candidates.firstOrNull()?.let { dispatchLaunch(it) }
                    }
                }
            }
            ResolveResult.NotFound -> setStatus(
                "'$appName' নামের কোনো অ্যাপ পাওয়া যায়নি — ইনস্টল নেই, বা দেখা যাচ্ছে না"
            )
        }
    }

    /** দৃশ্যমানতার ভিত্তিতে সরাসরি লঞ্চ বা নোটিফিকেশন। */
    private fun dispatchLaunch(entry: AppEntry) {
        if (isResumed) {
            setStatus("'${entry.label}' খোলার অনুরোধ পাঠানো হলো…")
            val outcome = launcher.launch(entry)
            if (outcome is LaunchOutcome.Failed) setStatus(outcome.reason)
        } else {
            when (notifier.requestOpenViaNotification(entry)) {
                BackgroundLaunchNotifier.NotifyOutcome.Posted ->
                    setStatus("অ্যাপ ব্যাকগ্রাউন্ডে — নোটিফিকেশনে ট্যাপ করে '${entry.label}' খুলুন")
                BackgroundLaunchNotifier.NotifyOutcome.NoNotificationPermission ->
                    setStatus("নোটিফিকেশন পারমিশন নেই — অ্যাপটি খুলে আবার চেষ্টা করুন")
                BackgroundLaunchNotifier.NotifyOutcome.NotificationsDisabled ->
                    setStatus("নোটিফিকেশন বন্ধ করা আছে — সেটিংসে চালু করুন")
                BackgroundLaunchNotifier.NotifyOutcome.ChannelBlocked ->
                    setStatus("নোটিফিকেশন-চ্যানেল ব্লকড — সেটিংসে চালু করুন")
                BackgroundLaunchNotifier.NotifyOutcome.NoLaunchEntry ->
                    setStatus("'${entry.label}'-এর লঞ্চার এন্ট্রি পাওয়া যায়নি")
            }
        }
    }

    private fun showDisambiguation(candidates: List<AppEntry>) {
        AlertDialog.Builder(this)
            .setTitle("কোনটি খুলব?")
            .setItems(candidates.map { "${it.label} (${it.packageName})" }.toTypedArray()) { _, which ->
                val entry = candidates[which]
                val outcome = launcher.launch(entry)
                if (outcome is LaunchOutcome.Failed) setStatus(outcome.reason)
            }
            .setNegativeButton("বাতিল", null)
            .show()
    }

    private fun stripCommandPrefixes(text: String): String {
        // "ওপেন ইউটিউব", "open youtube", "লঞ্চ করো হোয়াটসঅ্যাপ" ইত্যাদি
        val prefixes = listOf(
            "open ", "launch ", "start ",
            "ওপেন ", "খোলো ", "খুলে দাও ", "চালু করো ", "লঞ্চ করো ",
        )
        var t = text.trim()
        for (p in prefixes) {
            if (t.lowercase().startsWith(p)) {
                t = t.substring(p.length).trim()
                break
            }
        }
        return t
    }

    private fun setStatus(msg: String) {
        status.text = msg
    }

    override fun onDestroy() {
        voice?.destroy()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_PENDING_CANDIDATES = "com.maya.launcher.EXTRA_PENDING_CANDIDATES"
    }
}
