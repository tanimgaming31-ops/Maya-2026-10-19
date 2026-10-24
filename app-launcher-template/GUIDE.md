# Maya — ভয়েস/টেক্সট দিয়ে ইনস্টল করা অ্যাপ খোলার Android ইমপ্লিমেন্টেশন গাইড

> টেমপ্লেট-অনুমান: `minSdk 24`, `targetSdk 36` (টেমপ্লেটের নির্বাচিত টার্গেট — Play-র বর্তমান ন্যূনতম চাহিদা আলাদাভাবে যাচাই করুন), `compileSdk 36`, Kotlin। সব সোর্স-লিংক প্রতিটি দাবির পাশে দেওয়া আছে।

---

## ১. পরিধি: "যেকোনো অ্যাপ" আসলে কী বোঝায়

এই গাইডের লক্ষ্য হলো **বর্তমান ইউজার প্রোফাইলে থাকা, লঞ্চার এন্ট্রি পয়েন্ট আছে এমন অ্যাপ** ভয়েস বা টেক্সট কমান্ড থেকে খোলা। শুরুতেই সীমাগুলো পরিষ্কার করে নেওয়া জরুরি, কারণ প্ল্যাটফর্মের নিরাপত্তা-মডেল এগুলোকে আচ্ছন্নে রাখে না:

- **লঞ্চার অ্যাক্টিভিটি নেই এমন প্যাকেজ** সাধারণভাবে "খোলা" যায় না। যেমন কিছু সিস্টেম প্যাকেজ শুধু লাইব্রেরি বা সার্ভিস হিসেবে ব্যবহৃত হয় — `getLaunchIntentForPackage()` এদের জন্য `null` দেয় ([PackageManager রেফারেন্স](https://developer.android.com/reference/kotlin/android/content/pm/PackageManager))।
- **দুই ধাপের নিয়ম:** প্যাকেজ **দেখা যাওয়া** (visibility) আর প্যাকেজ **লঞ্চ করা** এক জিনিস নয়। দেখা যাওয়া ছাড়া লেবেল-ম্যাচিং করা যাবে না; দেখা গেলেও লঞ্চেবল না-ও হতে পারে।
- **অন্য ইউজার প্রোফাইল** (managed profile) বা ডিসেবল করা অ্যাপ সাধারণ পথে আসে না।
- **"Unknown or unavailable"** — ভিজিবিলিটি ফিল্টারের কারণে "ইনস্টল নেই" আর "দেখা যাচ্ছে না" আলাদা করা সবসময় সম্ভব নয়; ইউজারকে দেওয়া মেসেজে দুটিই একসাথে বলুন।

তিনটি প্রযুক্তি-স্তম্ভ: **PackageManager কোয়েরি** (অ্যাপ খোঁজা), **Intent নির্মাণ** (লঞ্চ করা), আর প্রয়োজনে **AccessibilityService** (লঞ্চের পরে অ্যাপের ভেতরে ইন্টারঅ্যাকশন)। ব্যাকগ্রাউন্ড/ফোরগ্রাউন্ড বিধিনিষেধ পুরো পাইপলাইনকে গঠন করে।

---

## ২. আর্কিটেকচার: একটাই পাইপলাইন, দুটো ইনপুট

ভয়েস আর টেক্সট দুটো ইনপুটই একই পথে যায় — স্পিচ রিকগনিশনের ফলাফল কেবল "টেক্সট ইনপুট" হিসেবে পাইপলাইনে ঢোকে:

```text
টেক্সট ইনপুট / স্পিচ রিকগনিশনের চূড়ান্ত ফল
        │
        ▼
  কমান্ড-প্রিফিক্স ছাঁটাই ("ওপেন ইউটিউব" → "ইউটিউব")
        │
        ▼
  AppResolver — প্যাকেজ নাম / লেবেল / ফাজি ম্যাচ
        │
        ├── Resolved   → AppLauncher → অ্যাপ খুলল
        ├── Ambiguous  → ব্যবহারকারীকে বেছে নিতে দিন
        └── NotFound   → "পাওয়া যায়নি" বার্তা
        │
        ▼
  Foreground?  ── হ্যাঁ ──→ সরাসরি startActivity()
        │
       না (ব্যাকগ্রাউন্ড)
        ▼
  নোটিফিকেশন: "ট্যাপ করলে অ্যাপটি খুলবে"
```

টেমপ্লেটের ফাইল-বিন্যাস:

| ফাইল | দায়িত্ব |
|---|---|
| `AppCatalog.kt` | লঞ্চেবল অ্যাপের তালিকা (লেবেল ↔ প্যাকেজ নাম) |
| `AppResolver.kt` | বলা/লেখা নাম → প্যাকেজ |
| `AppLauncher.kt` | লঞ্চ-ডিসপ্যাচার, ব্যর্থতা-হ্যান্ডলিং |
| `MainActivity.kt` | টেক্সট/ভয়েস ইনপুট, ফোরগ্রাউন্ড লঞ্চ |
| `VoiceInputHelper.kt` | SpeechRecognizer র‍্যাপার |
| `BackgroundLaunchNotifier.kt` | ব্যাকগ্রাউন্ড থেকে নোটিফিকেশন-ভিত্তিক ফ্লো |
| `MayaAccessibilityService.kt` + `res/xml/maya_accessibility_service_config.xml` | ঐচ্ছিক নোড-ইন্টারঅ্যাকশন মডিউল |
| `app/build.gradle.kts`, `settings.gradle.kts`, রুট `build.gradle.kts` | Gradle স্ক্যাফোল্ড |

---

## ৩. ম্যানিফেস্ট ও প্যাকেজ ভিজিবিলিটি (Android 11+)

Android 11 (API 30) থেকে অন্য অ্যাপ সম্পর্কে তথ্য **ডিফল্টভাবে ফিল্টার হয়** — `queryIntentActivities()`, `getPackageInfo()`, `getInstalledApplications()`-এর ফলাফল সীমিত হয়ে যায়, এমনকি অন্য অ্যাপের সার্ভিস চালুর মতো সরাসরি ইন্টারঅ্যাকশনেও প্রভাব পড়তে পারে ([প্যাকেজ ভিজিবিলিটি গাইড](https://developer.android.com/training/package-visibility))। ইনস্টল-করা অ্যাপের তালিকাকে Google Play ব্যক্তিগত ও সংবেদনশীল ডেটা হিসেবে গণ্য করে।

### সমাধান: `<queries>` ঘোষণা

লঞ্চার-অ্যাপ আবিষ্কারের জন্য সবচেয়ে পরিচ্ছন্ন ঘোষণা — "আমি এমন সব অ্যাপ দেখতে চাই যাদের লঞ্চার অ্যাক্টিভিটি আছে":

```xml
<queries>
    <intent>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent>
</queries>
```

এই ঘোষণার অর্থ: যেকোনো অ্যাপ যেটি `ACTION_MAIN` + `CATEGORY_LAUNCHER` intent পূরণ করে, সেটি আপনার কোয়েরিতে দেখা যাবে ([ভিজিবিলিটি ঘোষণা](https://developer.android.com/training/package-visibility/declaring))। অ্যাসিস্ট্যান্টের জন্য এটিই যথেষ্ট — কারণ লঞ্চ করার যোগ্য অ্যাপের সংজ্ঞাই এটি।

ভয়েস ইনপুট ব্যবহার করলে রিকগনিশন-সার্ভিস খুঁজে পেতেও একটি ঘোষণা লাগবে:

```xml
<queries>
    <intent>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent>
    <!-- SpeechRecognizer রিকগনিশন-সার্ভিস আবিষ্কারের জন্য -->
    <intent>
        <action android:name="android.speech.RecognitionService" />
    </intent>
</queries>
```

### `QUERY_ALL_PACKAGES` কখন?

খুবই বিরল ক্ষেত্রে (যেমন অ্যান্টিভাইরাস, অ্যাপ ম্যানেজার), আর Play-তে **অনুমোদনের অপেক্ষায় থাকে** — নিয়মিত অ্যাসিস্ট্যান্টের জন্য দরকার নেই ([ভিজিবিলিটি গাইড](https://developer.android.com/training/package-visibility))। টেমপ্লেটে এটি ইচ্ছাকৃতভাবে কমেন্ট করা আছে:

```xml
<!-- <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" /> -->
```

### বাকি পারমিশন

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />        <!-- ভয়েস ইনপুট -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />  <!-- API 33+ নোটিফিকেশন -->
```

---

## ৪. ধাপ ১: অ্যাপ ডিসকভারি — `AppCatalog.kt`

### কোন কোয়েরি-পদ্ধতি, কেন

- `getInstalledPackages()` এমন কোনো "সব অ্যাপের তালিকা" দেয় না যা ভিজিবিলিটি-ফিল্টার এড়িয়ে যায় — API 30+ এ এটিও ফিল্টারড ([PackageManager রেফারেন্স](https://developer.android.com/reference/kotlin/android/content/pm/PackageManager))।
- লঞ্চার-স্টাইল গণনার সঠিক পদ্ধতি হলো `ACTION_MAIN`/`CATEGORY_LAUNCHER` intent দিয়ে `queryIntentActivities()` — এটি লঞ্চার এন্ট্রি আছে এমন অ্যাপের সাথে সরাসরি মিলে যায়।
- **ফ্ল্যাগের সতর্কতা:** লঞ্চার গণনায় `MATCH_DEFAULT_ONLY` কপি করবেন না — এটি এমন বৈধ লঞ্চার এন্ট্রিকে বাদ দিতে পারে যার intent-filter-এ ডিফল্ট category নেই। নিচের টেমপ্লেটে ফ্ল্যাগ `0` ব্যবহার করা হয়েছে।

```kotlin
data class AppEntry(val packageName: String, val label: String)

class AppCatalog(private val context: Context) {

    private val pm: PackageManager = context.packageManager

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
            .distinctBy { it.first.activityInfo.packageName }   // ডুপ্লিকেট লেবেল/অ্যালায়াস
            .map { (info, label) -> AppEntry(info.activityInfo.packageName, label) }
            .sortedBy { it.label.lowercase() }
            .toList()
    }
}
```

### বাস্তবতা-নোট

- একই লেবেলের একাধিক অ্যাপ থাকতে পারে ("Gallery" বললে কোনটি?), প্যাকেজ-অ্যালায়াসে ডুপ্লিকেট আসতে পারে — `distinctBy` আর পরের ধাপের disambiguation এর জন্য।
- ম্যানেজড-প্রোফাইল সাপোর্ট দরকার হলে `LauncherApps` API (API 21+) দেখুন, যা বর্তমান ইউজারের সাথে সম্পর্কিত প্রোফাইলের লঞ্চার-অ্যাপ এনুমারেট করতে পারে ([LauncherApps রেফারেন্স](https://developer.android.com/reference/android/content/pm/LauncherApps))।
- ক্যাশিং: ক্যাটালগ প্রতি লঞ্চে কোয়েরি করবেন না — অ্যাক্টিভিটি শুরুতে একবার লোড করে রাখুন, `Intent.ACTION_PACKAGE_ADDED` / `Intent.ACTION_PACKAGE_REMOVED` broadcast-এ রিফ্রেশ করুন।

---

## ৫. ধাপ ২: ভয়েস/টেক্সট → প্যাকেজ — `AppResolver.kt`

ভয়েস রিকগনিশনের আউটপুট নিখুঁত হয় না — "হোয়াটসঅ্যাপ", "হোয়াটস অ্যাপ", "whats app" সবই আসতে পারে। তাই ম্যাচিং কয়েকটি স্তরে:

0. **স্পষ্ট প্যাকেজ-অনুরোধ** — `package:com.example.app` লেখা/বলা হলে; প্যাকেজ আইডেন্টিফায়ার অপরিবর্তিত থাকে।
0b. **ক্রস-স্ক্রিপ্ট অ্যালায়াস** — Levenshtein স্ক্রিপ্ট ট্রান্সলিটারেট করে না, তাই "ইউটিউব" → "YouTube"-র মতো ম্যাপিংয়ের জন্য ছোট অ্যালায়াস-টেবিল লাগে (`AppResolver`-এর `aliases` প্যারামিটার)।
1. **লেবেলের হুবহু মিল** (কেস-অন্তরাল) — প্যাকেজ-হিউরিস্টিকের **আগে**, যাতে "Booking.com"-এর মতো বৈধ লেবেল ভুল পথে না যায়।
2. **ফাজি ম্যাচ** — Levenshtein-ভিত্তিক সাদৃশ্য, নির্দিষ্ট থ্রেশহোল্ডের নিচে বাদ।
3. **দেরিতে প্যাকেজ-হিউরিস্টিক** — লেবেল-ম্যাচ ব্যর্থ হলে এবং ইনপুটটি প্যাকেজের মতো (ডট আছে, স্পেস নেই) — raw টেক্সটে, নরমালাইজ না করে।

```kotlin
sealed class ResolveResult {
    data class Resolved(val entry: AppEntry) : ResolveResult()
    data class Ambiguous(val candidates: List<AppEntry>) : ResolveResult()
    data object NotFound : ResolveResult()
}

class AppResolver(
    private val catalog: AppCatalog,
    private val aliases: Map<String, String> = emptyMap(), // "ইউটিউব" → "youtube" ইত্যাদি
) {
    private var cache: List<AppEntry> = emptyList()

    fun refreshCatalog() { cache = catalog.loadLaunchableApps() }

    fun resolve(spokenText: String): ResolveResult {
        val raw = spokenText.trim()
        val query = normalize(raw)
        if (query.isEmpty()) return ResolveResult.NotFound

        // 0) স্পষ্ট প্যাকেজ-অনুরোধ: "package:com.example.app" — আইডেন্টিফায়ার অপরিবর্তিত
        if (raw.startsWith("package:", ignoreCase = true)) {
            val pkg = raw.substring("package:".length).trim()
            if (pkg.isNotEmpty()) return ResolveResult.Resolved(AppEntry(pkg, pkg))
        }

        // 0b) ক্রস-স্ক্রিপ্ট অ্যালায়াস
        val effectiveQuery = aliases[query] ?: query

        if (cache.isEmpty()) refreshCatalog()

        // 1) লেবেলের হুবহু মিল — প্যাকেজ-হিউরিস্টিকের আগে ("Booking.com" ইত্যাদির জন্য)
        val exact = cache.filter { normalize(it.label) == effectiveQuery }
        if (exact.size == 1) return ResolveResult.Resolved(exact[0])
        if (exact.size > 1) return ResolveResult.Ambiguous(exact)

        // 2) ক্যাটালগে সরাসরি প্যাকেজ নাম
        cache.firstOrNull { it.packageName.equals(raw, ignoreCase = true) }
            ?.let { return ResolveResult.Resolved(it) }

        // 3) ফাজি ম্যাচ — ভয়েস রিকগনিশনে বানান ভুল হওয়া স্বাভাবিক
        val scored = cache
            .map { it to similarity(effectiveQuery, normalize(it.label)) }
            .filter { it.second >= 0.7f }
            .sortedByDescending { it.second }

        if (scored.isNotEmpty()) {
            val bestScore = scored.first().second
            val closeRunnerUps = scored.drop(1).count { it.second >= bestScore - 0.05f }
            if (closeRunnerUps == 0) return ResolveResult.Resolved(scored.first().first)
            return ResolveResult.Ambiguous(scored.take(3).map { it.first })
        }

        // 4) দেরিতে প্যাকেজ-হিউরিস্টিক — raw টেক্সটে, নরমালাইজ না করে;
        //    এতে AppLauncher-এর ভিজিবিলিটি-নিরপেক্ষ ফলব্যাকে পৌঁছানো যায়
        if (looksLikePackageName(raw)) return ResolveResult.Resolved(AppEntry(raw, raw))

        return ResolveResult.NotFound
    }

    private fun normalize(s: String): String =
        s.trim().lowercase().replace(Regex("\\s+"), " ")

    private fun looksLikePackageName(s: String): Boolean = s.contains('.') && !s.contains(' ')

    private fun similarity(a: String, b: String): Float {
        if (a.isEmpty() && b.isEmpty()) return 1f
        val maxLen = maxOf(a.length, b.length)
        return if (maxLen == 0) 1f else 1f - levenshtein(a, b).toFloat() / maxLen
    }

    private fun levenshtein(a: String, b: String): Int {
        val dp = IntArray(b.length + 1) { it }
        var prev: Int
        for (i in 1..a.length) {
            prev = dp[0]; dp[0] = i
            for (j in 1..b.length) {
                val temp = dp[j]
                dp[j] = minOf(dp[j] + 1, dp[j - 1] + 1,
                    prev + if (a[i - 1] == b[j - 1]) 0 else 1)
                prev = temp
            }
        }
        return dp[b.length]
    }
}
```

**Ambiguous হলে ইউজারকে জিজ্ঞেস করুন** — এটি UX-নীতি নয়, সঠিকতার ব্যাপার: ভুল অ্যাপ খুললে ব্যবহারকারীর ভরসা শেষ। `MainActivity`-তে `AlertDialog` দিয়ে candidates দেখানোর উদাহরণ টেমপ্লেটে আছে।

---

## ৬. ধাপ ৩: Intent নির্মাণ ও লঞ্চ — `AppLauncher.kt`

### `setPackage()` বনাম `ComponentName` — পার্থক্যটা জরুরি

- `Intent().setPackage("com.example")` — intent-কে **একটি নির্দিষ্ট প্যাকেজে** সীমাবদ্ধ করে; সিস্টেম সেই প্যাকেজের ভেতরে সবচেয়ে ভালো ম্যাচ বের করে দেয়। এটি implicit intent-এরই একটি রূপ — প্যাকেজ-সীমিত implicit।
- নির্দিষ্ট অ্যাক্টিভিটিতে পিন করতে `Intent().setComponent(componentName)` অথবা ডিসকভার করা লঞ্চার কম্পোনেন্টের জন্য `Intent.makeMainActivity(componentName)` ব্যবহার করুন। শুধু তখনই ব্যবহার করুন যখন অ্যাক্টিভিটির নাম **নিশ্চিত** আছে (যেমন প্যাকেজ-কোয়েরি থেকে পাওয়া গেছে)।
- **কখনই করবেন না:** আন্দাজ করে অ্যাক্টিভিটির নাম (`"com.foo.MainActivity"`) লিখে ComponentName বানানো, বা অ্যারবিট্রারি exported অ্যাক্টিভিটিকে জেনেরিক লঞ্চার হিসেবে ধরা — দুটোই ভাঙার নিশ্চয়তা।
- মনে রাখুন: প্যাকেজ-সীমিত implicit intent আর কম্পোনেন্ট-explicit intent দুটি আলাদা জিনিস — কিন্তু **কোনোটাই** অন্য অ্যাপের নন-এক্সপোর্টেড অ্যাক্টিভিটিতে পৌঁছায় না।

### দুটি নির্ভরযোগ্য লঞ্চ-পথ

**পথ ১ (প্রধান): `getLaunchIntentForPackage()`** — প্যাকেজের "front-door" অ্যাক্টিভিটির সম্পূর্ণ intent দেয়; লঞ্চার এন্ট্রি না থাকলে `null` দেয় ([PackageManager রেফারেন্স](https://developer.android.com/reference/kotlin/android/content/pm/PackageManager)):

```kotlin
val launchIntent = pm.getLaunchIntentForPackage(packageName)
if (launchIntent != null) {
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)  // non-activity context থেকে বাধ্যতামূলক
    context.startActivity(launchIntent)
}
```

**পথ ২ (ফলব্যাক, API 33+): `getLaunchIntentSenderForPackage()`** — অফিসিয়াল ডকুমেন্টেশন নিজেই বলে: যদি কলারকে সেই `packageName` কোয়েরি করার অনুমতি না থাকে, তাহলে এই মেথড ব্যবহার করুন ([PackageManager রেফারেন্স](https://developer.android.com/reference/kotlin/android/content/pm/PackageManager))। এটি API 33-তে যোগ হয়েছে ([API 33 ডিফ](https://developer.android.com/sdk/api_diff/33/changes/android.content.pm.PackageManager))। ভিজিবিলিটি-নিরপেক্ষ এই পথটি তখন কাজে লাগে যখন প্যাকেজটি আপনার `<queries>`-এ নেই (যেমন ইউজার সরাসরি প্যাকেজ নাম বলেছে) কিন্তু ইনস্টল করা আছে — সেজন্যই `AppResolver`-এ প্যাকেজ-নাম আকারের ইনপুট ক্যাটালগ বাইপাস করে:

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    val sender = pm.getLaunchIntentSenderForPackage(packageName)
    if (sender != null) {
        val options = ActivityOptions.makeBasic()
        // সেন্ডার-সাইড opt-in — অ্যাপ ব্যাকগ্রাউন্ডে থাকলে API 34+ টার্গেটে দরকার।
        // opt-in দেওয়া মানেই ব্যাকগ্রাউন্ড-লঞ্চের যোগ্যতা "তৈরি" হয় না — অন্য শর্ত
        // পূরণ না হলে সিস্টেম রাখবে না।
        if (Build.VERSION.SDK_INT >= 36) {
            options.setPendingIntentBackgroundActivityStartMode(
                ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_IF_VISIBLE // SDK 36+
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            options.setPendingIntentBackgroundActivityStartMode(
                ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED   // API 34+
            )
        }
        context.startIntentSender(sender, null, 0, 0, 0, options.toBundle())
    }
}
```

পথ ২-এর এই opt-in যুক্তিটি আসলে সতর্কতামূলক — টেমপ্লেটে `AppLauncher` মূলত ফোরগ্রাউন্ড ডিসপ্যাচ-পথ থেকে ডাকা হয় (ব্যাকগ্রাউন্ড-অনুরোধ নোটিফিকেশনে যায়), তাই সাধারণ ফ্লোতে এটির দরকার পড়ে না। একটা জিনিস পরিষ্কার রাখুন: **`ActivityOptions` অনুমতি দেয় না, শুধু নিজের অ্যাপের ব্যাকগ্রাউন্ড-লঞ্চের সুযোগ বাড়ায়** — যোগ্যতা তখনও অন্য BAL-শর্ত পূরণ হওয়া লাগবে।

### Android 14-এর implicit-intent শক্তিশালীকরণ

API 34+ টার্গেট করলে implicit intent আর **নন-এক্সপোর্টেড কম্পোনেন্টে যায় না** — `ActivityNotFoundException` ছুড়ে দেয়; মিউটেবল PendingIntent-তে কম্পোনেন্ট/প্যাকেজ ছাড়া intent থাকলে সিস্টেম এক্সেপশন দেয় ([Android 14 আচরণ-পরিবর্তন](https://developer.android.com/about/versions/14/behavior-changes-14))। এর মানে এই নয় যে প্রতিটি cross-app intent অবশ্যই কম্পোনেন্ট-explicit হতে হবে — প্যাকেজ-সীমিত implicit intent বৈধই থাকে। মূল পয়েন্ট: **নন-এক্সপোর্টেড কম্পোনেন্টে পৌঁছানোর চেষ্টা করবেন না** — উপরের দুটি পথ (lifecycle-ম্যানেজড launch intent, বা সিস্টেম-ইস্যুড IntentSender) সেটি নিশ্চিত করে।

### ব্যর্থতা-হ্যান্ডলিং

`startActivity()` যেকোনো সময় `ActivityNotFoundException` বা `SecurityException` ছুড়তে পারে (কম্পোনেন্ট সরানো হয়েছে, অ্যাপ ডিসেবল, এক্সপোর্টেড নয়)। টেমপ্লেটের `AppLauncher` প্রতিটি ফলাফলকে `LaunchOutcome.LaunchRequested / Failed(reason)`-এ ভাঁজ করে — নামটি ইচ্ছাকৃত: **এক্সেপশন না হওয়া মানেই অ্যান্ড্রয়েড গন্তব্য অ্যাপ সত্যিই দেখিয়েছে তার প্রমাণ নয়**; ইউজারকে কাঁচা এক্সেপশন নয়, বোধগম্য বার্তা দিন।

---

## ৭. ভয়েস ইনপুট — `VoiceInputHelper.kt`

স্ট্যান্ডার্ড `SpeechRecognizer` প্যাটার্ন — রিকগনিশনের **চূড়ান্ত ফলাফল** সরাসরি ৫ নং ধাপের `AppResolver.resolve()`-এ যায়:

```kotlin
class VoiceInputHelper(
    private val context: Context,
    private val onResult: (String?) -> Unit,
    private val onError: (String) -> Unit = {},
) {
    private var recognizer: SpeechRecognizer? = null

    fun startListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            onError("স্পিচ রিকগনিশন সার্ভিস নেই"); return
        }
        recognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
            setRecognitionListener(object : RecognitionListener {
                /* ... অন্যান্য কলব্যাক ... */
                override fun onResults(results: Bundle?) {
                    // গুরুত্বপূর্ণ: RecognitionListener-এ কী SpeechRecognizer.RESULTS_RECOGNITION
                    // (RecognizerIntent.EXTRA_RESULTS নয় — সেটি রিকগনিশন অ্যাক্টিভিটির রেজাল্টের)
                    val text = results
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        ?.firstOrNull()
                    onResult(text)   // ← এখানেই পাইপলাইনে ঢোকে
                }
                override fun onError(error: Int) { onError("ভয়েস ইনপুট ব্যর্থ ($error)") }
                // ...
            })
        }
        recognizer?.startListening(
            Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "bn-BD") // চাহিদামতো
            }
        )
    }
}
```

- `RECORD_AUDIO` রানটাইম পারমিশন চাইতে ভুলবেন না (`MainActivity`-তে আছে)। মাইক ও নোটিফিকেশন পারমিশন **আলাদা ফ্লোতে** চাওয়া হয়েছে — নোটিফিকেশন-পারমিশনের ফলাফলে রেকর্ডিং শুরু হয় না, আর মাইক-ফ্লো শুধু মাইক-বাটনে চাপলেই চলে।
- এটি **always-on listening বা ডিফল্ট অ্যাসিস্ট্যান্টের অধিকার দেয় না** — শুধু ইউজার মাইক-বাটন চাপলে শোনে। `RoleManager.ROLE_ASSISTANT` বা `VoiceInteractionService` আলাদা, অনেক বড় ইন্টিগ্রেশন।
- ইনপুট-নর্মালাইজেশন: ভাষাভেদে প্রিফিক্স ("ওপেন", "open", "লঞ্চ করো") ছাঁটার উদাহরণ `MainActivity.stripCommandPrefixes()`-এ আছে।

---

## ৮. Foreground বনাম Background: অ্যাক্টিভিটি-লঞ্চ বিধিনিষেধ

### ৮.১ নিয়মের সময়রেখা

| ভার্সন | পরিবর্তন |
|---|---|
| Android 10 (API 29) | ব্যাকগ্রাউন্ড থেকে `startActivity()` সীমিত — BAL বিধিনিষেধের শুরু ([Android 15 আচরণ-পরিবর্তন](https://developer.android.com/about/versions/15/behavior-changes-15)) |
| Android 12 (API 31) | নোটিফিকেশন **trampoline** নিষিদ্ধ — নোটিফিকেশন ট্যাপে service/receiver থেকে `startActivity()` করা যাবে না ([Android 12 আচরণ-পরিবর্তন](https://developer.android.com/about/versions/12/behavior-changes-12)) |
| Android 14 (API 34) | `PendingIntent` **পাঠানোর সময়** সেন্ডারকে নিজের BAL-অধিকার দিতে স্পষ্ট opt-in করতে হবে — `ActivityOptions.setPendingIntentBackgroundActivityStartMode()` ([Android 14 আচরণ-পরিবর্তন](https://developer.android.com/about/versions/14/behavior-changes-14)) |
| Android 15 (API 35) | `PendingIntent` **তৈরির সময়** ক্রিয়েটরকেও opt-in দরকার — `setPendingIntentCreatorBackgroundActivityStartMode()`; `SYSTEM_ALERT_WINDOW`-এর FGS-ছাড় সংকুচিত (এখন দৃশ্যমান overlay উইন্ডোও লাগবে) ([Android 15 আচরণ-পরিবর্তন](https://developer.android.com/about/versions/15/behavior-changes-15)) |

### ৮.২ BAL ছাড়ের প্রধান শর্তগুলো

অ্যাপ **ব্যাকগ্রাউন্ড থেকেও** অ্যাক্টিভিটি চালু করতে পারে যদি নিম্নের **যেকোনো একটি** শর্ত পূরণ হয় ([Activity security / secure BAL গাইড](https://developer.android.com/guide/components/activities/secure-bal)):

1. অ্যাপের **দৃশ্যমান উইন্ডো** আছে (যেমন ফোরগ্রাউন্ড অ্যাক্টিভিটি)।
2. অ্যাপটি বর্তমান **IME**।
3. অ্যাক্টিভিটিটি **সিস্টেম-পাঠানো `PendingIntent`** থেকে শুরু হয়েছে — যেমন **নোটিফিকেশন ট্যাপ**।
4. ইউজার **`SYSTEM_ALERT_WINDOW`** পারমিশন দিয়েছে।
5. **`START_ACTIVITIES_FROM_BACKGROUND`** (privileged) পারমিশন আছে।
6. BAL-অনুমোদিত সার্ভিস দ্বারা bound।
7. লঞ্চটি ডিভাইসের **লঞ্চার অ্যাপ** থেকে শুরু হয়েছে (আইকন ট্যাপ, উইজেট)।
8. OS-এর সর্বদা-চালু কোর অংশ (যেমন টেলিফোনির ইনকামিং-কল স্ক্রিন)।

> **সতর্কতা:** এই তালিকাটি প্রধান শর্তগুলোর সারসংক্ষেপ — সম্পূর্ণ তালিকা নয়। বিশেষ করে অ্যাসিস্ট্যান্ট/ভয়েস-ইন্টারঅ্যাকশন বা অ্যাক্সেসিবিলিটি-সার্ভিস হিসেবে ব্যাকগ্রাউন্ড-লঞ্চের অতিরিক্ত অনুমোদন পাওয়ার শর্ত এই সারসংক্ষেপ থেকে প্রমাণিত নয় — কোনো সার্ভিস ডিক্লেয়ার করা বা অ্যাসিস্ট্যান্ট-রোল চাওয়া একা কোনো ছাড়ের প্রমাণ নয়; নিজের কেসের জন্য [অফিসিয়াল গাইড](https://developer.android.com/guide/components/activities/secure-bal) যাচাই করুন।

### ৮.৩ Maya-র জন্য সহজ ও নিরাপদ বিভাজন

```text
┌─────────────────────────┬──────────────────────────────────────────┐
│ Maya-র অবস্থা           │ কী করবে                                  │
├─────────────────────────┼──────────────────────────────────────────┤
│ দৃশ্যমান অ্যাক্টিভিটি     │ সরাসরি startActivity() — কোনো সীমা নেই     │
│ ব্যাকগ্রাউন্ড (কোনো       │ নোটিফিকেশন দেখান — contentIntent সরাসরি    │
│ যাচাইকৃত ছাড় নেই)        │ গন্তব্য অ্যাপের লঞ্চ intent-এ; ইউজার ট্যাপ    │
│                         │ করলেই খোলে                                 │
└─────────────────────────┴──────────────────────────────────────────┘
```

`MainActivity`-তে এই সিদ্ধান্তটি **ইমপ্লিমেন্ট করা আছে** — `isResumed` (lifecycle) চেক করে `dispatchLaunch()` সরাসরি লঞ্চ বা নোটিফিকেশন বেছে নেয়। স্পিচ-রেজাল্ট অ্যাসিনক্রোনাস — ফলাফল এলে অ্যাক্টিভিটি আর দৃশ্যমান না-ও থাকতে পারে, তাই ডিসপ্যাচের **মুহূর্তে** দৃশ্যমানতা যাচাই করা জরুরি। Ambiguity ব্যাকগ্রাউন্ডে পড়লে **কোনো গন্তব্য বেছে নেওয়া হয় না** — ক্যান্ডিডেটরা জমা রেখে Maya-র chooser খোলার একটি নোটিফিকেশন যায়; অ্যাক্টিভিটি পরের বার দৃশ্যমান হলে তালিকা দেখানো হয়।

**কেন নোটিফিকেশন-প্যাটার্নটি কাজ করে** (তিনটি নিয়ম একসাথে মেটে):

1. নোটিফিকেশন ট্যাপে PendingIntent **সিস্টেম পাঠায়** — ছাড়-তালিকার #3 ([secure BAL](https://developer.android.com/guide/components/activities/secure-bal))।
2. `contentIntent` **সরাসরি গন্তব্য অ্যাপের লঞ্চ intent** — মাঝে Maya-র কোনো service/receiver নেই, তাই Android 12-এর trampoline-নিষেধও মানা হয় ([Android 12](https://developer.android.com/about/versions/12/behavior-changes-12))।
3. ইউজারের ট্যাপ ছাড়া কিছুই খোলে না — নোটিফিকেশন পারমিশন ডিনাই হলে ফ্লোটি চুপচাপ ব্যর্থ হয়, কোনো নীরব বিঘ্ন নেই।

`BackgroundLaunchNotifier.kt`-এর মূল অংশ (minSdk 24-এ কাজ করাতে চ্যানেল-তৈরি API 26+ গার্ডে, আর প্রতিটি ব্যর্থ-পথ স্পষ্ট `NotifyOutcome` রিটার্ন করে — নীরবে `return` নয়):

```kotlin
val launchIntent = pm.getLaunchIntentForPackage(entry.packageName)
    ?: return NotifyOutcome.NoLaunchEntry
launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

val contentPi = PendingIntent.getActivity(
    context,
    entry.packageName.hashCode(),
    launchIntent,
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,  // API 31+: FLAG_IMMUTABLE
)

// নোটিফিকেশন পারমিশন নেই (API 33+) → NoNotificationPermission
// NotificationChannel শুধু API 26+ (NotificationCompat নিচের ভার্সনে চ্যানেল উপেক্ষা করে)

val notification = NotificationCompat.Builder(context, CHANNEL_ID)
    .setSmallIcon(...)
    .setContentTitle("Maya")
    .setContentText("'${entry.label}' খুলবেন? ট্যাপ করুন।")
    .setContentIntent(contentPi)
    .setAutoCancel(true)
    .build()
```

### ৮.৪ যা BAL-এর "লাইসেন্স" **নয়**

- **`FLAG_ACTIVITY_NEW_TASK`** — এটি শুধু task-স্ট্যাকিং নিয়ন্ত্রণ করে; ব্যাকগ্রাউন্ড-লঞ্চের অনুমতি দেয় না।
- **Foreground service** — সার্ভিস ফোরগ্রাউন্ডে থাকলেও অ্যাক্টিভিটি-লঞ্চের অধিকার দেয় না; বরং API 31+ এ ব্যাকগ্রাউন্ড থেকে FGS শুরু নিজেই সীমিত, আর Android 15-এ `SYSTEM_ALERT_WINDOW`-ছাড়টিও সংকুচিত হয়েছে ([FGS পরিবর্তন](https://developer.android.com/develop/background-work/services/fgs/changes))।
- **`SYSTEM_ALERT_WINDOW`** — প্রযুক্তিগতভাবে ছাড়-তালিকায় আছে, কিন্তু এটি ব্যবহারকারীর সরাসরি দেওয়া বিশেষ পারমিশন — অ্যাসিস্ট্যান্টের সাধারণ লঞ্চ-ফ্লোর সমাধান হিসেবে ডিজাইন করবেন না।
- **সফল BAL-ব্লক হলে সিস্টেম এক্সেপশন দেয় না** — শুধু Logcat-এ `Background activity launch blocked!` লেখে; ব্যর্থতা ধরতে নিজের অ্যাক্টিভিটি-লাইফসাইকেল বা রিটার্ন-ভ্যালু দিয়ে যাচাই করুন ([secure BAL](https://developer.android.com/guide/components/activities/secure-bal))।
- নোটিফিকেশন-প্যাটার্নেও **PendingIntent opt-in নিয়ম** প্রযোজ্য হতে পারে (টার্গেট SDK 34/35 হলে) — নোটিফিকেশন-ট্যাপ ক্ষেত্রে সিস্টেম-সেন্ডার হওয়ায় সাধারণত অনুমোদিত থাকে, তবে যদি নিজে `PendingIntent.send()` দিয়ে ব্যাকগ্রাউন্ড থেকে পাঠান, তাহলে `ActivityOptions` দিয়ে sender-side opt-in দিতে হবে (API 34+):

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
    val options = ActivityOptions.makeBasic().apply {
        setPendingIntentBackgroundActivityStartMode(
            if (Build.VERSION.SDK_INT >= 36)
                ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_IF_VISIBLE
            else
                ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
        )
    }
    pi.send(context, 0, null, null, null, null, options.toBundle())
}
```

প্রস্তাবিত মোড: `MODE_BACKGROUND_ACTIVITY_START_ALLOW_IF_VISIBLE` — অ্যাপ দৃশ্যমান থাকলেই শুধু ছাড় ([ActivityOptions রেফারেন্স](https://developer.android.com/reference/kotlin/android/app/ActivityOptions), [secure BAL](https://developer.android.com/guide/components/activities/secure-bal))।

### ৮.৫ সংস্করণ-ম্যাট্রিক্স মনে রাখুন

BAL আচরণ নির্ভর করে **তিনটি জিনিসের সমন্বয়ে**: ডিভাইসের Android ভার্সন + অ্যাপের `targetSdkVersion` + লঞচের মুহূর্তে অ্যাপের অবস্থা (দৃশ্যমান/ব্যাকগ্রাউন্ড)। টেস্ট করুন এই তিনটির কম্বিনেশনে — বিশেষ করে targetSdk 34 ও 35-এর আচরণ আলাদা ([Android 14](https://developer.android.com/about/versions/14/behavior-changes-14), [Android 15](https://developer.android.com/about/versions/15/behavior-changes-15))।

---

## ৯. AccessibilityService মডিউল (ঐচ্ছিক)

### ৯.১ এর আসল ভূমিকা

`AccessibilityService` অ্যাপ **খোলার** টুল নয় — অ্যাপ **খোলার পরে** তার UI-এর সাথে ইন্টারঅ্যাক্ট করার টুল ("সেন্ড বাটনে ট্যাপ করো")। ভুল ধারণাগুলো পরিষ্কার করি:

- এটি **লঞ্চার এন্ট্রি নেই এমন প্যাকেজের জন্য এন্ট্রি পয়েন্ট তৈরি করে না**।
- এটি **নন-এক্সপোর্টেড অ্যাক্টিভিটিতে ঢুকতে দেয় না** — প্ল্যাটফর্ম-নিরাপত্তা এড়ানোর উপায় নয়।
- প্রতিটি অ্যাপের UI আলাদা — কাস্টম ভিউ বা Canvas-আঁকা UI-তে নোড পাওয়া যাবে কি না নির্ভর করে সেই অ্যাপ কতটা accessibility-ট্রি প্রকাশ করে তার ওপর; WebView-ও কখনো কখনো প্রকাশ করে, কখনো করে না — কোনো অ্যাপেই নিশ্চয়তা নেই।

### ৯.২ সেটআপ

ম্যানিফেস্টে সার্ভিস ঘোষণা — `BIND_ACCESSIBILITY_SERVICE` নিশ্চিত করে যে শুধু সিস্টেমই এটি bind করতে পারবে:

```xml
<service
    android:name=".MayaAccessibilityService"
    android:exported="true"
    android:label="@string/maya_a11y_label"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/maya_accessibility_service_config" />
</service>
```

কনফিগ (`res/xml/maya_accessibility_service_config.xml`) — `flagReportViewIds` ছাড়া resource-ID দিয়ে নোড-লুকআপ কাজ করবে না:

```xml
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagIncludeNotImportantViews|flagReportViewIds"
    android:canRetrieveWindowContent="true"
    android:isAccessibilityTool="false"
    android:notificationTimeout="100"
    android:description="@string/maya_a11y_description" />
```

**ইউজার-নিয়ন্ত্রিত সক্রিয়করণ** — সার্ভিস চালু করার একমাত্র বৈধ পথ ইউজারকে সেটিংসে পাঠানো:

```kotlin
if (!MayaAccessibilityService.isEnabled(context)) {
    // ব্যাখ্যা-সংলাপ দেখিয়ে তারপর:
    MayaAccessibilityService.openSettings(context)   // Settings.ACTION_ACCESSIBILITY_SETTINGS
}
```

### ৯.৩ নোড-ইন্টারঅ্যাকশন

লঞ্চ সম্পন্ন হয়ে গন্তব্য অ্যাপ সামনে এলে — **টার্গেট-ভ্যালিডেশনসহ** নোড খুঁজে ট্যাপ:

```kotlin
// 1) সক্রিয় উইন্ডো আসলেই টার্গেট অ্যাপের কি না — যাচাই করুন
val root = service.rootOf("com.example.target")
    ?: return  // উইন্ডো বদলাচ্ছে / null root / অন্য অ্যাপ সামনে

// 2) পছন্দের পথ: resource ID দিয়ে (সবচেয়ে নির্ভরযোগ্য)
// প্যাকেজ-সীমানা লুকআপেই রাখুন — প্যারামিটারে expectedPackage দিয়ে দিন
val clicked = service.clickByViewId(root, "com.example.target", "com.example.target:id/send_button")

// 3) ফলব্যাক: ID-পথ ব্যর্থ হলেই শুধু তখন — দৃশ্যমান টেক্সট দিয়ে,
// শুধু হুবহু-টেক্সটের ঠিক একটি ব্যবহারযোগ্য ম্যাচ গ্রহণযোগ্য
if (!clicked) {
    service.clickByText(root, "com.example.target", "Send")
}
```

সার্ভিস চালু কি না তা যাচাইয়ে সক্রিয় সার্ভিসের id তুলনা করুন **parsed `ComponentName`** দিয়ে, raw string নয়:

```kotlin
val expected = ComponentName(context, MayaAccessibilityService::class.java)
am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
    .any { ComponentName.unflattenFromString(it.id) == expected }
```

নোড-ট্যাপের ভেতরের লজিক (টেমপ্লেটের `MayaAccessibilityService.clickNode`) — নোড নিজে ক্লিকেবল না হলে প্যারেন্ট-চেইনে উপরে উঠে সবচেয়ে কাছের ক্লিকেবল পূর্বপুরুষে `ACTION_CLICK`, সর্বোচ্চ গভীরতা ৬-তে বাউন্ডেড। **প্যারেন্ট-চেইনেও প্যাকেজ/দৃশ্যমানতা/enabled যাচাই বজায় থাকে** — শুধু শুরুতে root যাচাই করলেই সীমানা রক্ষা হয় না। রিয়েল-ওয়ার্ল্ডে ধৈর্য ধরুন: উইন্ডো বদলানোর মধ্যে `rootInActiveWindow` `null` হয়, নোড বিদ্যমান থাকলেও `performAction` মিথ্যে জানাতে পারে — প্রতিটি ধাপ পুনরায় যাচাই করুন। আরেকটা সত্যি: **WebView বা কাস্টম UI-তে নোড পাওয়া যাবেই এমন নয়, তবে অসম্ভবও নয়** — সাপোর্ট নির্ভর করে সেই অ্যাপ/ভিউ-ইঞ্জিন কতটা accessibility-ট্রি প্রকাশ করে তার ওপর।

### ৯.৪ Google Play নীতি — এড়িয়ে গেলে রিজেক্ট

`AccessibilityService` ব্যবহারকারীর সংবেদনশীল ডেটায় পৌঁছায়, তাই Play-এর নিয়ম কঠোর ([AccessibilityService API নীতি](https://support.google.com/googleplay/android-developer/answer/10964491), [সংবেদনশীল পারমিশন নীতি](https://support.google.com/googleplay/android-developer/answer/16558241)):

- `isAccessibilityTool="true"` **শুধু** প্রতিবন্ধী ব্যবহারকারীদের সহায়তার জন্য ডিজাইন করা অ্যাপেই ব্যবহারযোগ্য; সাধারণ অ্যাসিস্ট্যান্ট হিসেবে Maya এতে **যোগ্য নয়** — উপরের কনফিগে তাই `false`।
- যোগ্য না হলে: **Play Console-এ Accessibility ঘোষণাপত্র** (Permission Declaration Form) পূরণ ও অনুমোদন দরকার, অ্যাপের ভেতরে **স্পষ্ট ডিসক্লোজার** (সাধারণ ব্যবহারেই দেখা যাবে, শুধু মেনুতে নয়) এবং **স্পষ্ট সম্মতি** নিতে হবে।
- নীতিতে সরাসরি বলা আছে: Accessibility API দিয়ে **"স্বায়ত্তশাসিতভাবে অ্যাকশন শুরু, পরিকল্পনা ও সম্পাদন" করা যাবে না** ([নীতির দো-ডন্ট](https://support.google.com/googleplay/android-developer/answer/16558241))। এই টেমপ্লেটটি সেই সীমার মধ্যেই ডিজাইন করা: **বাউন্ডেড, ইউজার-নির্দেশিত ইন্টারঅ্যাকশন** — প্রতিটি নোড-অ্যাকশন ইউজারের সরাসরি নির্দেশে হয়, Maya নিজে থেকে সিদ্ধান্ত নিয়ে নয়। তবে মনে রাখবেন: ইউজার-কনফার্মেশন ডায়ালগ থাকা মানেই Play-অনুমোদন নিশ্চিত হয় না — অনুমোদন আলাদাভাবে মূল্যায়ন হয়।
- ব্যবহারকারীর সেটিংস অনুমতি ছাড়া বদলানো, প্রাইভেসি-কন্ট্রোল বাইপাস — সবই নিষিদ্ধ।

---

## ১০. টেস্ট চেকলিস্ট (প্রত্যাশিত আচরণ — ম্যানুয়াল যাচাইয়ের তালিকা)

> নিচের সারিগুলো **প্রত্যাশিত আচরণ** হিসেবে পড়ুন — এগুলো এই পরিবেশে রান করে পাওয়া ফলাফল নয়; প্রজেক্টে বসিয়ে একে একে যাচাই করুন।

| # | দৃশ্যকাহিনি | প্রত্যাশিত আচরণ |
|---|---|---|
| 1 | ফোরগ্রাউন্ডে টেক্সট ইনপুট ("YouTube") | সরাসরি খোলে |
| 2 | ফোরগ্রাউন্ডে ভয়েস ("ওপেন ইউটিউব") | প্রিফিক্স ছাঁটাই; ক্রস-স্ক্রিপ্ট হলে অ্যালায়াস-টেবিল দিয়ে ম্যাচ |
| 3 | একই লেবেলের দুটি অ্যাপ ("Gallery") | Ambiguous — disambiguation ডায়ালগ |
| 4 | অজানা নাম ("xyzabc") | "পাওয়া যায়নি" বার্তা, কোনো ক্র্যাশ নয় |
| 5 | প্যাকেজ নাম দিয়ে ("com.spotify.music") | পথ ১/২-এ খোলে |
| 6 | `<queries>`-এ দৃশ্যমান নয় এমন প্যাকেজ | `getLaunchIntentSenderForPackage` (API 33+) ফলব্যাক |
| 7 | লঞ্চার এন্ট্রি নেই এমন প্যাকেজ | `null` launch intent → "লঞ্চেবল নয়" বার্তা |
| 8 | ব্যাকগ্রাউন্ড থেকে লঞ্চ-অনুরোধ | নোটিফিকেশন; ট্যাপে টার্গেট অ্যাপ খোলে |
| 9 | নোটিফিকেশন পারমিশন ডিনাই | স্পষ্ট `NoNotificationPermission` outcome — মেইন স্ক্রিনে গাইড করে |
| 10 | Accessibility বন্ধ অবস্থায় নোড-কমান্ড | সেটিংসে পাঠানোর প্রস্তাব |
| 11 | নোড-কমান্ডে ভুল প্যাকেজের উইন্ডো সামনে | `rootOf` null → নিরাপদে ব্যর্থ |
| 12 | টার্গেট অ্যাপে নোড নেই (WebView/কাস্টম) | মিথ্যে রিটার্ন → ইউজারকে জানানো হয় |

ম্যানুয়াল টেস্ট-কমান্ড (BAL ডিবাগে সহায়ক):

```bash
# BAL ব্লক হলে Logcat-এ দেখুন
adb logcat | grep "Background activity launch"

# অ্যাপকে ব্যাকগ্রাউন্ড-স্টার্ট সীমিত অবস্থায় সিমুলেট করুন
adb shell cmd appops set com.maya.launcher RUN_IN_BACKGROUND ignore
```

---

## ১১. প্যাকেজিং-নোট

বান্ডলে Gradle স্ক্যাফোল্ড (`app/build.gradle.kts`, `settings.gradle.kts`, রুট `build.gradle.kts`) দেওয়া আছে — `namespace com.maya.launcher`, `compileSdk 36`, `minSdk 24`, `targetSdk 36`, প্রয়োজনীয় AndroidX ডিপেন্ডেন্সিসহ। খেয়াল রাখুন: `compileSdk 36` ব্যবহারের জন্য **সাম্প্রতিক Android Gradle Plugin** লাগে — নিজের প্রজেক্টের বর্তমান AGP সংস্করণ যাচাই করে নিন, প্রয়োজন হলে আপডেট করুন। যা যোগ করতে হবে: (১) ম্যানিফেস্ট ও নোটিফিকেশনে রেফারেন্স করা `@mipmap/ic_launcher` আইকন-রিসোর্স (নতুন-প্রজেক্ট টেমপ্লেটের ডিফল্টটিই ব্যবহার করলে হবে), (২) Gradle wrapper-এর জন্য `gradle wrapper` কমান্ড চালানো বা Android Studio-র সিঙ্ক-ফ্লো অনুসরণ করা। এটি একটি **ইন্টিগ্রেশন টেমপ্লেট** — এই পরিবেশে কম্পাইল/রান করা হয়নি।

## ১২. সাধারণ ভুল — এক নজরে

1. `getInstalledPackages()`-কে "সব অ্যাপের তালিকা" ভাবা — API 30+ এ ফিল্টারড, আর লঞ্চেবল-তালিকাও নয়।
2. `QUERY_ALL_PACKAGES`-কে ডিফল্ট সমাধান ধরা — Play-অনুমোদন লাগে, অ্যাসিস্ট্যান্টের দরকারই নেই।
3. ভিজিবিলিটি-ফিল্টার হওয়া ব্যর্থ কোয়েরিকে "অ্যাপ ইনস্টল নেই" বলে জানানো — "পাওয়া যায়নি" বলুন।
4. অন্য কোথাও থেকে কপি করা `MATCH_DEFAULT_ONLY` ফ্ল্যাগ — বৈধ লঞ্চার এন্ট্রি বাদ পড়ে।
5. আন্দাজে অ্যাক্টিভিটি-নাম লিখে `ComponentName` বানানো — ভাঙে, নিরাপত্তাহীন।
6. `FLAG_ACTIVITY_NEW_TASK` বা foreground service-কে ব্যাকগ্রাউন্ড-লঞ্চের অনুমতি ভাবা — নয়।
7. নোটিফিকেশনের `contentIntent`-কে নিজের service/receiver-এ পাঠানো (trampoline) — Android 12+ এ ব্লকড।
8. AccessibilityService-কে অ্যাপ-খোলার ফলব্যাক ভাবা — এন্ট্রি পয়েন্ট তৈরি করে না, Play-নীতিও লঙ্ঘন।
9. ব্যাকগ্রাউন্ড থেকে `PendingIntent.send()`-এ opt-in ছাড়া API 34+ টার্গেটে পাঠানো — নীরব ব্লক।
10. ইউজারের সম্মতি ছাড়া Accessibility-অ্যাকশন চালানো — Play-নীতি অনুযায়ী নিষিদ্ধ।

---

## ১৩. সূত্র

- [Package visibility filtering (Android Developers)](https://developer.android.com/training/package-visibility) · [Declaring visibility](https://developer.android.com/training/package-visibility/declaring)
- [PackageManager API reference](https://developer.android.com/reference/kotlin/android/content/pm/PackageManager) · [API 33 diff — getLaunchIntentSenderForPackage](https://developer.android.com/sdk/api_diff/33/changes/android.content.pm.PackageManager) · [LauncherApps](https://developer.android.com/reference/android/content/pm/LauncherApps)
- [Activity security / background activity launches (secure BAL)](https://developer.android.com/guide/components/activities/secure-bal) · [ActivityOptions reference](https://developer.android.com/reference/kotlin/android/app/ActivityOptions)
- [Behavior changes: Android 12 (notification trampolines)](https://developer.android.com/about/versions/12/behavior-changes-12) · [Android 14 (BAL opt-in, implicit intents)](https://developer.android.com/about/versions/14/behavior-changes-14) · [Android 15 (creator opt-in, SAW/FGS)](https://developer.android.com/about/versions/15/behavior-changes-15)
- [Foreground service changes](https://developer.android.com/develop/background-work/services/fgs/changes)
- [Google Play: Use of the AccessibilityService API](https://support.google.com/googleplay/android-developer/answer/10964491) · [Permissions and APIs that access sensitive information](https://support.google.com/googleplay/android-developer/answer/16558241)

> **টেমপ্লেট-স্ট্যাটাস:** কোডগুলো সম্পূর্ণ লেখা হয়েছে অফিসিয়াল ডকুমেন্টেশনের সাথে মিলিয়ে, তবে এই পরিবেশে কম্পাইল/রান করা হয়নি — প্রজেক্টে বসিয়ে উপরের চেকলিস্ট ধরে যাচাই করুন।
