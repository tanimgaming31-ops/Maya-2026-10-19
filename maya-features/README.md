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
