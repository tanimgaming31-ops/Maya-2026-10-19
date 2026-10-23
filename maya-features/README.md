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
