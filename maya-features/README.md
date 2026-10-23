# Maya Advanced Features — Phase 1

This folder adds an upgrade foundation to the existing Maya app without replacing it.

## Included

- `feature-registry.js`: central feature configuration.
- `memory-v2.js`: categorized long-term memory with export/import.
- `productivity.js`: reminders, alarms, timers, calendar events, and to-do lists.
- `daily-briefing.js`: daily summary builder.
- `android-bridge.js`: future Capacitor native-action bridge.

## Safety rule

Maya will not automatically send WhatsApp, Messenger, IMO, or SMS messages. It will prepare a draft and require explicit user confirmation.

## Opt-in Private Vault
- AES-256-GCM encrypted text in separate local storage, 600k PBKDF2 SHA-256 iterations.
- Create with at least 10 characters, long unique passphrase recommended. No biometric unlock.
- Auto-lock after 60 seconds without edits, and when Maya enters the background.
- Export encrypted backup; restore uses the original passphrase to validate ciphertext BEFORE overwriting existing vault, with confirmation.
- NOT encrypted by this vault: old Maya Memories/Memory Packs, Gemini key, chat and ordinary Notes.
- Without the passphrase, contents are unrecoverable. Back up before uninstall/clear-data.

## Maya Life Suite V24 — additive local tools
- Open Maya Settings -> Maya Life Suite.
- Local, opt-in: diary (keyboard dictation possible), expenses in original currency, user-built study flashcards, foreground focus timer, bookmarks, knowledge search, weekly insights, user-selected file overview, explicit GPS place checks, dialer shortcut, subtitle copy, privacy counts and Life Suite-only JSON backup/import.
- Conditional (if WebView supports): QR scan via BarcodeDetector + explicit camera permission, clipboard reading on tap.
- Native Android: user-initiated ACTION_SEND text/plain -> Maya inbox, user-added Home Screen Widget, user-added Quick Settings Tile, battery state without invasive permissions.
- Widget and Quick Tile only **open Maya**. They do not start a microphone or grant permissions.
- No background geofencing, no automatic contact reading, no full file rename/organizer, no device-wide Bluetooth route control, no offline OCR, no guaranteed AI tutor or fully automatic background timers.
- This suite never changes old Maya memory packs, Gemini keys, voice UI or 3D model. Its own data is stored **unencrypted** in localStorage; the separate Private Vault remains the encrypted option.
- APK build passing does not verify actual Android device behavior: manually test Share chooser, home widget, quick tile, camera and runtime permissions.

## Maya Unified Life Voice V25
- Opt-in toggle in existing Settings. Commands MUST begin with `Maya` or `মায়া`; local parser supports specific Bengali/English phrases.
- Routes final Fallback SpeechRecognition commands before Gemini text calls; routes recognized text chat commands before Gemini key checks; routes final Gemini Live input transcript on flush. **Gemini Live audio has already reached Google** before text is available; the model may still reply. It is not offline/background speech recognition.
- Local, tested parser: confirmed Diary, Expenses (AED/BDT/USD/INR/EUR), Knowledge Notes; foreground Focus via existing Life Suite timer. Read-only: local note search, latest diary summary, weekly insights, native battery status. Open Life Suite shortcut.
- Saved data and starting Focus show Confirm/Cancel UI (30-second timeout); opt-in off by default; hidden app cancels pending confirmation. Sensitive-looking passwords/OTP text is refused for diary/notes. Life Suite localStorage remains unencrypted; Private Vault is separate.
- Test from Settings with a typed command. Fallback voice uses existing device voice and speech synthesis; Gemini Live confirmation may only display on screen. Manual Android/device checks are required. No automatic WhatsApp/IMO/Messenger sending or new dangerous permissions.

## Maya Smart Hub — Advanced V27
- One new Settings button inside original Maya, not an app. Built-in Morning Brief, Focus Preparation, Evening Review, Memory Check. Custom local routines: up to 25 with 1–5 whitelisted steps; explicit tap/voice invocation only.
- Shared To-do board uses existing `maya_productivity_v1`, no duplicate storage. Add/complete/delete actions are user-driven. Voice-added tasks require visible 30-second Confirm/Cancel.
- Additional Bengali/English `Maya` / `মায়া` commands: add To-do, list To-dos, search categorized Memory V2, local daily briefing, run a named built-in routine, privacy and read-only capability diagnostics. Requires existing opt-in Life Voice toggle, supported speech engine or text input.
- Real Microphone and Camera tests require explicit tap, request Android/WebView permission and immediately close tracks. They do not record, save or transmit audio/video. A failed test is reported as a failure.
- Routines never run autonomously in the background; Focus uses the existing foreground Life Suite timer after confirmation. No external message sending, no auto-app control, no weather or news fabrication.
- Custom routine export/import uses strict validation and replacement confirmation; unencrypted JSON. Original Maya Memories/Memory Packs, Private Vault, Avatar, Voice code and Gemini settings remain separate.
- GitHub compilation/tests verify code and Android build, **not** real-device voice or native permission functionality.

## Maya Android installed-app name launcher V28
- Open Maya Settings → **Installed Apps • Open by Name** for an on-device list/search or use the existing **Enable Life Suite voice and typed commands** opt-in toggle.
- Say **Maya, open WhatsApp** / **মায়া, ইমো খোলো** / **মায়া, ফেসবুক চালু করো**, or type the same into original Maya text chat. Works only after a recognized transcript/typed command while Maya is in use. Native Android returns the requested launch intent; the user's phone decides whether it actually opens.
- Android MAIN/LAUNCHER visibility via Manifest `<queries>`; no `QUERY_ALL_PACKAGES` permission. Only currently visible launchable entries from `PackageManager.queryIntentActivities`. App names and packages remain locally processed; no upload of app inventory to Gemini. Gemini Live voice audio itself already reaches Google as part of the existing Gemini call.
- Exact unique names launch directly. Similar/ambiguous labels or cloned apps display choices with package name and require the user to tap the intended app. No arbitrary package IDs are launched: native code checks the pair again against current installed Launcher activities.
- Android-hidden, disabled, separate work-profile, restricted or non-launchable apps may not be listed. Requires working Maya microphone/speech recognition for voice; text and Settings list can work without it. No guarantee of background/closed-app voice, automatic messaging, or accessibility automation.
- Build/test checks confirm parser and Android compilation, **not** that each installed app opens on a particular phone. Device checks required.
