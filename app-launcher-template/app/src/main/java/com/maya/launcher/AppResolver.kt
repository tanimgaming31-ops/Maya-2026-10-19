package com.maya.launcher

/**
 * ব্যবহারকারীর বলা/লেখা নাম থেকে কোন অ্যাপ বোঝানো হয়েছে তা বের করে।
 */
sealed class ResolveResult {
    /** একটিই ম্যাচ পাওয়া গেছে। */
    data class Resolved(val entry: AppEntry) : ResolveResult()

    /** একাধিক ম্যাচ — ব্যবহারকারীকে বেছে নিতে দিতে হবে। */
    data class Ambiguous(val candidates: List<AppEntry>) : ResolveResult()

    /** কিছুই মেলেনি — অ্যাপটি হয় ইনস্টল নেই, নয় ভিজিবল নয়, নয় লঞ্চেবল নয়। */
    data object NotFound : ResolveResult()
}

class AppResolver(
    private val catalog: AppCatalog,
    /** ক্রস-স্ক্রিপ্ট উচ্চারণের জন্য অ্যালায়াস — যেমন "ইউটিউব" → "youtube"।
     *  Levenshtein স্ক্রিপ্ট ট্রান্সলিটারেট করে না, তাই এটি আলাদা করে দরকার। */
    private val aliases: Map<String, String> = emptyMap(),
) {
    private var cache: List<AppEntry> = emptyList()

    fun refreshCatalog() {
        cache = catalog.loadLaunchableApps()
    }

    fun resolve(spokenText: String): ResolveResult {
        val raw = spokenText.trim()
        val query = normalize(raw)
        if (query.isEmpty()) return ResolveResult.NotFound

        // 0) স্পষ্ট প্যাকেজ-অনুরোধ: "package:com.example.app"
        // প্যাকেজ আইডেন্টিফায়ার অপরিবর্তিত থাকে — লেবেল-নরমালাইজেশন এখানে প্রযোজ্য নয়
        if (raw.startsWith("package:", ignoreCase = true)) {
            val pkg = raw.substring("package:".length).trim()
            if (pkg.isNotEmpty()) return ResolveResult.Resolved(AppEntry(pkg, pkg))
        }

        // 0b) ক্রস-স্ক্রিপ্ট অ্যালায়াস
        val effectiveQuery = aliases[query] ?: query

        if (cache.isEmpty()) refreshCatalog()

        // 1) লেবেলের হুবহু মিল (কেস-অন্তরাল) — প্যাকেজ-হিউরিস্টিকের **আগে**,
        // যাতে "Booking.com"-এর মতো বৈধ লেবেল ভুল পথে না যায়
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

        // 4) দেরিতে আসা প্যাকেজ-হিউরিস্টিক — লেবেল-ম্যাচ ব্যর্থ হলে এবং ইনপুটটি
        // প্যাকেজের মতো (ডট আছে, স্পেস নেই) — raw টেক্সটে, নরমালাইজ না করে;
        // এতে AppLauncher-এর ভিজিবিলিটি-নিরপেক্ষ ফলব্যাকে পৌঁছানো যায়
        if (looksLikePackageName(raw)) {
            return ResolveResult.Resolved(AppEntry(raw, raw))
        }

        return ResolveResult.NotFound
    }

    private fun normalize(s: String): String =
        s.trim().lowercase().replace(Regex("\\s+"), " ")

    /** "com.foo.bar" এর মতো দেখতে কি না — ডট আছে, স্পেস নেই। */
    private fun looksLikePackageName(s: String): Boolean =
        s.contains('.') && !s.contains(' ')

    /** 0..1 এর মধ্যে সাদৃশ্য — Levenshtein দূরত্ব ভিত্তিক। */
    private fun similarity(a: String, b: String): Float {
        if (a.isEmpty() && b.isEmpty()) return 1f
        val dist = levenshtein(a, b)
        val maxLen = maxOf(a.length, b.length)
        return if (maxLen == 0) 1f else 1f - dist.toFloat() / maxLen
    }

    private fun levenshtein(a: String, b: String): Int {
        val dp = IntArray(b.length + 1) { it }
        var prev: Int
        for (i in 1..a.length) {
            prev = dp[0]
            dp[0] = i
            for (j in 1..b.length) {
                val temp = dp[j]
                dp[j] = minOf(
                    dp[j] + 1,
                    dp[j - 1] + 1,
                    prev + if (a[i - 1] == b[j - 1]) 0 else 1,
                )
                prev = temp
            }
        }
        return dp[b.length]
    }
}
