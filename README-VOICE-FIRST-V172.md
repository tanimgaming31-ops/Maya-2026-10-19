# Maya Voice-First Controls V172 — Features 26–30

Adds these controls **inside the original Maya-2026-10-19 app**, without a second assistant, changing the prior avatar model, Gemini key, chat history, local Memory Packs, or existing voice router. Existing Maya speech recognition must already work on your Android phone.

## Five Voice-first features

| No | Feature | Say to Maya (English or Bangla) | Supported behavior |
|---|---|---|---|
| 26 | Real-time Voice Captions | `Maya show captions` / `মায়া ক্যাপশন দেখাও`; `Maya stop captions` | Reads **existing** `#you` and `#sub` live captions on the main call screen (Gemini input/output transcription or supported fallback speech recognition) and displays an additional session-only scrolling history in Voice Control Center. Does not start a second microphone or transcribe unrelated apps. Recognition may be missing, delayed or inaccurate. |
| 27 | Smart Home Control | `Maya turn on smart light`, `Maya turn off smart plug`, `Maya smart home status` | Only **local LAN IPv4, port 80** Tasmota HTTP relay Power / Shelly Gen2/3 Switch 0 JSON RPC, when their local unauthenticated API is enabled by the user. Configure exact private IPv4 + firmware kind, keep Maya on the same trusted Wi-Fi, and **confirm** every ON/OFF. Java worker attempts HTTP, reports real response or error; no Bluetooth/Google Home/Philips Hue/universal bulb integration or auto-discovery. Credentials are never collected. |
| 28 | Wi-Fi Router Assistant | `Maya open router settings`, `Maya change WiFi password`, `মায়া রাউটার সেটিংস বুঝিয়ে দাও` | Enter **your own router LAN IPv4** (find on the back label or your current Wi-Fi Gateway), review prompt; Maya asks Android to open its login page. Instructions clarify router **Admin** password differs from Wi-Fi and TP-Link ID. Login, Wi-Fi name/password changes, save and reconnect remain **manual**; Maya cannot verify any router config was changed. Never bypasses router login. |
| 29 | Avatar Customization | `Maya set hair to pink`, `Maya set hairstyle to bob`, `Maya set outfit to ocean`; Bangla examples in UI/tests | **Original Maya 2D SVG** supports hair palette, three fringe styles and five jacket colors using the existing character SVG. Saved in separate localStorage key. **Imported 3D VRM model clothes/hair are not re-rigged or recolored** in this version. |
| 30 | Interactive Learning Quiz | `Maya start quiz on science`, `Maya answer B`, `Maya repeat question`, `Maya quiz score`, `Maya stop quiz` | Gemini with your existing user API key creates **three validated multiple-choice questions**, asks aloud when speech synthesis is available, checks spoken/tapped answer A/B/C/D, reports correct choice/score. Optionally paste **user-selected notes** in the panel and approve sending those notes to Gemini. Requires network/quota; generated content may be inaccurate. Does not change existing Maya notes, flashcards or Memories. |

## Permissions and safety

- Enable the existing **Unified Life Voice** toggle and microphone permission; Android WebView SpeechRecognition/Gemini Live may still fail on particular phones. Each feature also exposes on-screen fallback controls.
- Voice commands require `Maya` / `মায়া` prefix; quiz accepts a single-letter answer only while a quiz is running.
- Voice commands **dispatch to real implemented handlers**, not silent "Done" states. Some actions (device configuration, power switching, router login) require touchscreen confirmation or typing.
- Smart home HTTP is **cleartext local-network control**, so use only with your own trusted Wi-Fi and enabled user-owned device, never public Wi-Fi. Android build opts into cleartext local device traffic; the Java bridge restricts targets to numeric private IPv4 literals, fixed paths and no redirects. Do not attempt to use an unknown device, relay controlling dangerous equipment, heaters or life-safety loads.
- No key or admin password is sent to smart devices by Maya, and no arbitrary router settings update is implemented. Non-Tasmota/Shelly devices must be treated as unsupported instead of falsely marked successful.
- Captions use transcript already displayed by Maya; they are **not** independent background phone audio recording. Extra history is only in memory and disappears on refresh.
- The original 3D avatar remains unmodified; changes apply to the original 2D Maya drawing.
- The quiz result is an educational aid; cross-check facts.
- The full feature set of the phone cannot be converted into unrestricted voice automation merely by a new command parser. Every supported task still requires real underlying native capability and applicable permissions.

## Installation / test

GitHub Actions runs:
- `node tests/voice-first-v172.test.mjs` on commands, invalid commands and private IP restriction;
- `python3 tests/home-voice-native-check.py` on the constrained native bridge and voice/caption/avatar/quiz hooks;
- all existing Maya V171 tests, Gradle compile and APK Release publication.

After **Build Maya APK** reports success, save/export existing Maya Memories before updating APK; Android signatures may prevent an in-place installation. Then open **Maya > Settings > Voice Control Center · Captions / Home / Router / Avatar / Quiz**. Try both a typed Maya-prefixed command and a microphone command. Actual Android mic, local smart relay hardware, router admin URL, avatar rendering and network Gemini quiz need user-device verification; a passing APK build alone is **not** proof.
