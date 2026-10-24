# Maya voice screenshot + YouTube matching-video play

**Same original Maya Android APK**: previous Gemini Live, Birthday, Memory Packs, V54, 3D Avatar and existing features remain in source. No PHP/backend or paid APIs.

## Screenshot: one spoken command → Gallery

1. Install the new APK; do not uninstall older Maya without exporting your Memory first (debug APK signatures may differ).
2. Open Maya → **Settings** → **📸 Maya Voice Screenshot & YouTube Auto Play**.
3. Turn on **Enable one-command voice screenshot**. This is opt-in, OFF by default. If old Maya already stored an enabled preference, the new native setting is synchronized at app launch.
4. Tap **Enable Maya Accessibility** and enable **Maya Screen Controls** in Android Accessibility settings. This access can read/interact with onscreen information: enable only if you trust the APK; revoke it from Android Settings at any time.
5. Open an app you want to capture and speak through the running Maya voice/mic: “Maya take a screenshot” or “মায়া স্ক্রিনশট নাও”. When the AccessibilityService is connected on Android 11+, Maya requests **one screenshot** using `AccessibilityService.takeScreenshot`, writes a PNG to **Gallery → Pictures/Maya** using `MediaStore` and saves a native result status (capturing → saved/error).
6. Return to Maya → **Check Gallery save** to see actual Android save result. A screenshot request is NOT the same as a confirmed save.
7. No screen content is automatically uploaded to Gemini. Secure/protected windows may be blank or rejected by Android; this is not bypassed.

**Android 10 fallback:** Existing Maya Screenshot button uses the MediaProjection system consent dialog, requiring user consent for each capture session. On Android 11+ if Accessibility is disabled, enable it manually or use existing MediaProjection permission-based button. Voice-command capture of another app needs Maya's background microphone/recognizer already running, which is subject to Android's foreground-service and microphone restrictions; the app cannot begin hidden always-on listening.

## YouTube: search → attempt correct title tap

1. Install/enable official YouTube Android app.
2. Enable Maya Screen Controls in Android Accessibility Settings.
3. With Maya visible, say **“Maya play YouTube [video name]”** or **“মায়া ইউটিউবে [ভিডিওর নাম] চালাও”**. In Settings you can also type a video title and tap **Search and play matching video**.
4. Maya opens YouTube search and attempts to find a strongly matching **visible video title** for up to **30 seconds**. If found, it asks Android Accessibility to tap the matching result.
5. Return to Maya → **Check video tap result**. Results distinguish requested, tapped-unverified, ambiguous, timeout, denied or error.
6. Playback is **not guaranteed**: YouTube can change its UI, results may contain multiple near-identical videos, wrong account restrictions, network and Android background-start policies apply. Maya never taps unrelated titles or sponsored items intentionally; the result is not reported as a verified playback receipt.

## Supported voice commands

- “Maya take a screenshot”
- “মায়া স্ক্রিনশট নাও”
- “মায়া স্ক্রিনশট নিয়ে গ্যালারিতে সেভ করো”
- “Maya youtube play NASA space documentary”
- “মায়া ইউটিউবে আমার সোনার বাংলা ভিডিও চালাও”

Your existing **Unified Life Voice** supports typed/live command interception. The separate native Android background voice service can listen only when the user has explicitly activated it, Android permits it, and microphone permission is granted. Screen capture additionally requires voice screenshot opt-in.

## Tests and limitations

The repository includes `tests/media-voice.test.mjs`, `tests/voice-screenshot.test.cjs` and updated native screenshot safety checks, and the GitHub Actions workflow compiles the actual Android classes with Gradle. Passing CI proves code validation/build only. **User's phone is required for confirming microphone recognition, actual YouTube video playback, screen capture of a third-party app and Gallery saving.**

Android 11+ `AccessibilityService.takeScreenshot` requires `canTakeScreenshot="true"` in service metadata and a user-enabled AccessibilityService. Android MediaProjection still needs OS consent per session. Neither can override Android protected-window security.
