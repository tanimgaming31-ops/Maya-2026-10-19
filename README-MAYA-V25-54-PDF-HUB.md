# Maya V25 PDF Feature Hub — 54 groups / 444 subfeatures

**Project:** MAYA AI Voice Assistant (TaNiM world)

**PDF basis:** `Maya_AI_Assistant_V25_54_Features_A_to_Z.pdf`, 16 pages, supplied by the project owner.

## What this single additive update actually implements

- Integrates the entire PDF inventory into the EXISTING Maya app as `maya-features/v25-54-registry.js`: all 54 named main groups, 444 individual subfeature labels, five original sections, individual implementation caveats. This is **catalog data**, not 444 implemented device actions.
- Adds a responsive search/filter UI from **Settings → Maya V25 · 54 Features / All Subfeatures**, with per-group details and warnings.
- Adds recognized **Maya show all 54 features**, **মায়া সব ফিচার দেখাও**, **Maya find feature WhatsApp**, and **মায়া ফিচার 54** routes to the existing Maya Life Voice interface. It does not create a new speech engine or microphone.
- Offers real app shortcuts to existing Memory screen, Settings and existing device-feature Diagnostics. The hub never silently sends messages, grants Android permissions, stores new user data or invokes privileged device operations.
- Uses original-source JavaScript and DOM only; no Three.js/pixiv vendor library is reintroduced.
- Makes automated PDF-inventory and integration checks part of the GitHub Actions build.

## Status honesty / incomplete features

The PDF itself is a feature *inventory* rather than proof that all device operations are functional. The presence of a group or button never certifies Android runtime success.

Already present in the repo as earlier limited implementations: Gemini/text voice paths, Memory Packs, Android app launcher, V54 constrained native macros/reminders/reply APIs, Smart Vision helpers, scoped file tools, and diagnostics. Each requires device-specific validation and permissions; the catalog does not modify their runtime logic.

Important exceptions:
- **03 Wake Word:** the prior web wake word works only in eligible open app/browser sessions; the PDF's offline Vosk feature is not confirmed.
- **07 Model Selection:** Google Gemini models shown in the PDF are not promised as available.
- **24/26 WhatsApp:** message delivery and deleting messages are not automatic or verified; user approval is required for risky actions.
- **28 YouTube:** video autoplay is not guaranteed across Android apps.
- **36/37/38 Screen Vision and Tap:** Android MediaProjection/Accessibility permissions, consent and phone tests are required.
- **40 Multi-Step AI Tasks:** existing automation is intentionally limited, not unrestricted autonomy.
- **52 3D Orb:** previously bundled Three.js/pixiv code has been removed at the owner's request. The original 2D Maya avatar and themes remain. Actual 3D VRM playback is not part of this update.
- **54 Background:** long-running service support depends on OS, permissions and battery policy.

## How to test on Android (after a successful APK build)

1. Backup all Maya Memory Packs first; a debug-signature mismatch may require reinstall.
2. Open **Settings → Maya V25 · 54 Features / All Subfeatures** and search `WhatsApp`, `Memory`, `Screen Vision` or `52`.
3. Choose **Open Memory** and confirm existing Memory Packs are intact.
4. Choose **Check device features** and review existing diagnostics (a static catalog is not a hardware test).
5. With working microphone/transcription, say **Maya show all 54 features**. Also type **Maya find feature WhatsApp** to check the deterministic parser.
6. Test each existing Android capability separately, with explicit permission and send approval where applicable.

The source remains owned/licensed according to `LICENSE`; third-party Android/Capacitor dependencies and previous MIT grants remain separate. No existing UI, settings, storage keys, Memory Packs, signing material, or voice code is deliberately replaced.
