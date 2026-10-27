# Maya Owner Guard V174 — user-authorized phone protection (real limits)

This feature is added to **the original Maya-2026-10-19** Android APK. It does not edit existing Maya Memory Packs, current avatar, Gemini settings, social/messaging code or other voice commands.

## What it does

- **Enable/disarm by voice + Android strong biometric:** say `Maya enable owner guard` / `মায়া ফোন পাহারা চালু করো`. This starts Android's **system BiometricPrompt** (an enrolled secure face **if accepted by the phone as a strong biometric**, or fingerprint). The registered biometric template stays with Android. This is NOT Maya identifying your unique face with its own model. The phone can authenticate **any enrolled biometric**, so review who is enrolled in Android Settings.
- **Foreground verification:** when the Maya screen returns to foreground with guard armed, the app requests an Android biometric. You can also say `Maya check owner` / `মায়া আমাকে চিনো`. A verified result is shown inside Maya.
- **Failed-check alert:** after two rejected biometric checks while Maya is visible, Maya shows an **on-screen alert**, attempts vibration and attempts an Android notification **if notification permission is already granted**. This is an **unverified attempt**, NOT proof a stranger is present.
- **Optional visible one-frame camera photo:** During enabling Guard, the user can explicitly opt in to **one visible front-camera snapshot after an unverified foreground owner check**. This is **OFF by default**. Android camera permission/WebView support is required, an active camera preview and Android camera indicator are visible, and camera tracks are released immediately afterward. The file is saved **privately on the phone, not sent to Gemini or cloud**. Camera unavailable → error; no photo is invented.
- **Reference owner selfie:** say `Maya remember my face` / `মায়া আমার মুখ মনে রাখো` to request biometric approval then **a visible front-facing selfie**, stored in app-private files. **This is reference storage only, NOT a face-recognition model or source of identity matching.** The actual identity verification is the Android system prompt.
- **Verify to review attempt photos:** say `Maya show security photos`. A successful system biometric unlocks the in-app private photo viewer for about 90 seconds. Owner must confirm permanent deletion. Maximum 12 attempt photos. The reference image is not deleted with attempt-photo deletion. These photos use `getNoBackupFilesDir()` and disappear if Maya is uninstalled or its app data cleared.
- **Disable:** `Maya disable owner guard` / `মায়া ফোন পাহারা বন্ধ করো` also requires biometric verification.

## What it CANNOT do

**Picking up your locked phone does not automatically trigger Maya.** Android protects access to the camera from background apps on current Android versions. Maya cannot silently launch a camera on another lock-screen or app, identify everyone who touches the phone, or photograph an intruder with the screen off. The app's foreground/visibility events are only an opportunistic check when Maya becomes visible. System secure face/fingerprint verification may be unavailable or fail on particular devices. A failed scan is not evidence of a person being unauthorized.

For reliable system-wide protection, enable **Android screen lock with a secure PIN/fingerprint/face** and Android theft-protection features separately in phone settings. Maya Owner Guard adds **in-app** safeguards; it does not replace Android lock security.

## Start on Android

1. Export original Maya Memory Packs and settings before APK reinstall/update. Signed APKs may not update an older installation without the same signing key.
2. Install the new GitHub Release only after APK Build passes.
3. Open **Maya → Settings → Owner Guard · Security / Selfie / Alerts**.
4. Register a **strong** biometric in Android Settings; allow notifications (for OS alert) and Camera (for visible snapshot) as desired.
5. Keep **Allow visible front-camera snapshot** unticked unless you explicitly want it. Tap **Enable Guard** and approve the Android biometric prompt.
6. Say `Maya check owner` to confirm that OS biometrics work. Enable snapshot only after understanding it is **foreground-only** and captures people visibly. Try `Maya remember my face` for a local reference selfie, or `Maya show security photos` to view images.
7. Do not count camera photos from failed biometric tests as guaranteed. Physical device testing is required.

## Privacy and engineering notes

- Uses Android **BIOMETRIC_STRONG** / `USE_BIOMETRIC` only; no raw facial feature template is exposed to Maya. No third-party embedding, face-matching score, remote identity inference, tracker, or backdoor.
- All stored photos are private and excluded from Android automatic file backup. Max 12 captures; no unrestricted background capture; no Gallery writes.
- No cloud uploads, SMS, email, automatic face labeling, secret camera sessions or unlock bypass.
- Explicit permissions are required and no permission-escalation mechanism is added.
- App-visible owner check is only an *app session checkpoint*. If another person can authenticate with their enrolled Android biometrics, Maya cannot distinguish them from the owner.
- **Voice-first:** English and Bengali commands enter the existing MayaLifeVoice parser, with an on-screen fallback and explicit Android prompts. Nothing guarantees continuous wake-word listening when the app is closed.
- Syntax/parser and native safety source checks + APK compilation are tested by GitHub Actions. Camera permission, OS prompt, notification, saving and viewing real photos require manual Android device tests.

Android API background camera restrictions: https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
Android native biometric dialog: https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt.html
ML Kit face detection is not identity recognition: https://developers.google.com/ml-kit/vision/face-detection
