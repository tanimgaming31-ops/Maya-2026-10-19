# Maya Android Local Phone Tools (PC-free Brahma subset)

Implemented as an additive module for **Maya-2026-10-19**, preserving
the original `index.html`, the Maya persona, API settings and Memory Packs.

## Added
- Local Android manufacturer, model, Android version, battery and charging information
- Wi-Fi vs mobile-data connection/validated-network status (does not toggle Wi-Fi)
- Current media volume and setting 0–100%
- Read up to 64 KiB UTF-8 .txt files inside a user-approved Android folder
- Delete one named .txt file only after both a web UI approval and an **Android native confirmation**
- Foreground typed/voice commands for status, volume, torch (enable Unified Life Voice)
- Unified voice routing inside Maya's **existing** call/text chat (no separate Phone Tools UI)

## Already in Maya and reused
Flashlight, APK app launcher, HTTPS URL opening, Android folder chooser/list,
new text-file creation, battery alerts, notifications and existing voice and
other phone controls. No functionality is claimed working without user tests.

## Excluded
Brahma PC/Gateway discovery, WebSocket remote command server, pairing/QR
and related credentials; its incomplete lock-screen swipe is not a real
phone unlock. Broad filesystem access and recursive deletes are omitted.

## Usage
Merge the PR, run the existing Build Maya APK workflow on main, and install
the signed APK. Use the same signing key as the currently installed app to
preserve local data without uninstalling. Export Maya Memory first.

The JS parsing/safety tests are in `tests/local-tools.test.mjs` and
execute in the workflow. Actual Android hardware, folder grants and audio
behaviour still require on-device testing.

## Integrated voice behavior
Say “Maya, Wi-Fi status”, “Maya, volume 50 percent”, “মায়া, ফোনের তথ্য”, “Maya, read file notes.txt”, or “Maya, choose folder” directly in Maya's ordinary call or text chat. Phone commands do not require switching to another panel or toggling Life Voice; Android microphone/voice recognition must work. Existing message, YouTube, app-launch, screenshot, and memory routes remain as they were. The existing native background listener also recognizes local device/Wi-Fi/volume queries, but Android recognition and background service availability vary. File deletion always requires an Android on-screen confirmation, and the file picker also requires foreground activity. Never claim a requested file action completed until Android reports it.
