# Maya Android Controls V167 — Six permission-scoped voice tools

This is an **add-on inside the original Maya-2026-10-19 APK**, not another assistant. Existing Maya Gemini key, chat, character, prompts, Memory Packs, prior V54/V160 Voice and APK signing scripts remain unchanged. Code is installed during the existing GitHub Actions build. It needs an updated APK; a GitHub Pages browser cannot call Android native controls.

## Start on your Android phone

1. Before updating, use Maya Memory Export; preserve your original signing keystore when updating an installed APK.
2. GitHub Actions > Build Maya APK must report **success**; install the matching Release APK.
3. Open Maya > Settings > **Android Controls · QR / Bluetooth / Screen / Clipboard / Storage**.
4. Enable **Unified Life Voice**, allow microphone (and camera when scanning) and verify speech recognition first.
5. Voice commands must begin with **Maya** / **মায়া**. Exact command examples below. They are foreground requests, not always-on surveillance. If speech recognition cannot work in the Android WebView, visible buttons remain available.

| Tool | Voice command | Real scope |
|---|---|---|
| QR/Barcode | `Maya scan QR code`, `মায়া কিউআর কোড স্ক্যান করো` | Requests one camera frame, releases the camera, scans it with **existing on-device ML Kit**. If voice-triggered camera permission is blocked by WebView, tap the photo selector. Never auto-open a QR link. |
| Bluetooth Manager | `Maya find bluetooth devices`, `মায়া ব্লুটুথ ডিভাইস খোঁজো`; then `Maya connect bluetooth DEVICE NAME` | Android runtime `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` on Android 12+, older-device location permission. Searches nearby **Bluetooth Low Energy** advertisements for 12 seconds. User-confirmed GATT connection to one recently discovered, unique device. Not classic Bluetooth pairing, headphones routing, or a guarantee that device-specific features work. |
| Screen Text Reader | `Maya read screen text`, `মায়া স্ক্রিনশটের লেখা পড়ো` | Choose a screenshot/photo file explicitly in Maya, OCR with existing **Latin-script ML Kit** locally, and Android/WebView speech synthesis reads the result when available. **Does not covertly capture another app screen**; for screenshots use the separately permissioned existing Maya screenshot feature, then choose that image. Bengali OCR is not claimed. |
| Clipboard Assistant | `Maya read clipboard`, `Maya clipboard translate to tagalog`, `Maya clipboard correct`, `Maya clipboard summarize` | Clipboard read only while Maya is foreground, or paste manually; translation, correction and summarization explicitly ask before sending up to 1,500 characters to Google Gemini using your existing Maya key. Does not auto-monitor clipboard. |
| Storage Cleaner | `Maya find duplicate files`, `মায়া বড় ফাইল খোঁজো` | Choose one Android folder in the system picker, read up to 240 files and two subfolder levels; SHA-256 comparison for equal-sized candidates up to 8 MB each and 55 MB total hashing; list large and verified duplicate names. **No delete action is exposed at all**. |
| Phone Storage Monitor | `Maya storage report`, `মায়া ফোন স্টোরেজ রিপোর্ট` | Shows known sizes and file types of **only the selected folder**, not whole-device disk space. Unknown provider sizes or limits are reported; no fabricated complete phone statistics. |

### Privacy and limitations

- Camera picture & screenshot OCR/QR decoding use existing local ML Kit, not cloud Gemini.
- Clipboard AI requests go straight to Google Gemini only after a visible confirmation. Avoid submitting passwords, one-time codes, bank details or other secrets.
- Bluetooth device discovery/connection requires the Android permissions and hardware support. You must choose/confirm the target. Some devices require their manufacturer's own app; classic Bluetooth audio pairing is intentionally unsupported.
- Android 11 and earlier may require location permission for Bluetooth scanning; no location collection/storage is implemented.
- All storage access reuses Maya V54's folder permission, **never** ALL_FILES_ACCESS / unrestricted filesystem permissions. The report is bounded and may be incomplete; duplicates are only shown after successful full-file hashes, and some files are deliberately not hashed.
- Commands run through the existing `window.MayaLifeVoice` fallback, Live transcript and typed-command pipeline. An active Gemini Live audio session may speak at the same time as local TTS depending on Android/WebView. Keep Maya foreground and use visible buttons if OS voice/camera/clipboard gesture restrictions prevent direct invocation.
- No automatic file deletion, background scans, self-enabling Bluetooth, secret clipboard collection or unattended connecting.

### Tests (not device verification)

`node tests/android-controls.test.mjs` checks exact Bengali/English voice parsing and rejected unsafe commands.
`python3 tests/android-controls-native-check.py` checks source integration/safety constraints.
`scripts/install-android-controls.py` installs the Android WebView bridge, scoped BLE permissions and Java implementation after existing V54/ML Kit components. Existing workflow then compiles Android Java and generates APK.

**A passing build is not a hardware test.** Bluetooth discovery/GATT, actual microphone recognition, camera permission, OCR/TTS and SAF provider behavior must be checked with the installed APK on your own Android phone.

### Voice-first rule for future modules

Every added feature should have: (a) a recognized **Maya** Bengali/English command in the current voice router, (b) one real permission-checked handler, (c) audible/on-screen status or clear failure, (d) manual fallback, (e) destructive actions gated by confirmation, and (f) tests + documented device limits. Adding a text-only button is not sufficient to claim voice functionality.
