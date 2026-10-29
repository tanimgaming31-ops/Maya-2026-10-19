# Jerry functionality inside Maya — single-app merge audit

**Destination APK:** `tanimgaming31-ops/Maya-2026-10-19` only. No other Android package ID, no second assistant installation, no import of the Jerry activity or APK, no Jerry branding on Maya's UI.

**Compared against:** user's `tanimgaming31-ops/jeery-ai-assistant--2026-10-28`, generated from Tech GPTx's Android Part 7 source. This merge reuses **Maya's own existing code** and new independently written floating Android component. It does not copy third-party Part 7 source into Maya. The Jerry repository remains unchanged.

## Feature mapping

| Jerry capability | In the one Maya app | Truthful limitation |
|---|---|---|
| Gemini Live two-way speech | Existing Maya Live voice | Depends on microphone, Gemini model/key/network; user-device test required |
| Interrupt and speech responses | Existing Maya voice engine | Audio focus/WebView may differ from Jerry's native audio engine |
| Chat and remembered facts | Existing Maya Smart Memory and Memory Packs | Separate app's Jerry memory is **not** silently imported; Maya Memories stay intact |
| Phone app launcher | Existing Android app catalog | Some clone/work-profile apps may not be enumerable |
| Torch, volume, brightness | Existing native Maya tools | Permission/hardware restrictions apply |
| Named contact / WhatsApp draft | Existing V66 confirmed one-chat flow | Send tap is best effort; no proof of message delivery; clones may be refused |
| YouTube search/video | Existing Maya YouTube search and Accessibility title-tap attempt | Actual playback unverified |
| Android Accessibility controls | Existing Maya V4/V54 actions | Must be granted by user; unsupported UI actions fail safely |
| Screenshot/screen reading | Existing Maya per-action screenshot / screen vision | **Not** Jerry's continuous live screen-share stream |
| Background voice + wake phrase | Existing Maya V4 foreground-notification service, Android SpeechRecognizer | **Not Vosk**; OS can stop listening; cannot claim fully offline or persistent screen-off wake |
| Floating assistant | **Improved in Maya:** user-granted overlay, draggable pulsing Maya icon, tap to return, screenshot shortcut, hide | This is a floating Maya *icon*, not the full animated 3D model over other apps |
| Floating/voice controls | **New Maya native Hands-Free & Floating controls** in Settings, and English/Bangla voice shortcuts | No new microphone or duplicate service; same existing V4 controls |
| Personae/assistant name | **Only Maya**; original Maya persona stays | Jerry name and personality are intentionally **not** imported |
| App identity & author | Existing Maya identity kept | No Jerry branding or upstream author claims inside Maya |

## Using the new Maya floating controls

Inside Maya > Settings > **Maya · Native Hands-Free & Floating Assistant**:

1. Check background mic / Accessibility status.
2. Tap **Allow Display over other apps** and approve Android's Maya overlay permission.
3. Tap **Show draggable Maya icon**. Move the visible icon with a finger; tap the Maya icon to reopen the main app; use the screenshot shortcut only when you have already granted capture permission; tap × to hide.
4. For background commands tap **Start background voice** *when a separate Maya Live Voice Call is not already using the microphone*. Keep the Android foreground notification. Use **Stop background voice** to stop. Android may interrupt listening, and no always-on guarantee is made.
5. Supported voice phrases when Maya's current voice engine is listening: `Maya show floating assistant`, `Maya hide floating shortcut`, `Maya check background voice status`, `Maya start background voice`, `Maya stop hands-free voice`, `Maya open accessibility settings`. Bangla variants are in `maya-features/native-handsfree-v177.js`.

## Build and acceptance

GitHub Actions builds the **same Maya APK** and preserves Maya's current app ID, Memory Packs, existing portrait/3D viewer, voice engine and previous modules. The installer only replaces the generated `MayaV52Overlay.java` implementation with the new original Maya overlay. Source audits + Java compilation are automated; an actual Android device must verify overlays, microphone permissions, gesture dragging, screenshots and voice behavior.

**Not yet merged:** offline Vosk model/recognition, continuous Gemini Live screen sharing via MediaProjection, a fully rigged Maya 3D model inside the Android system overlay, and full audio parity with Jerry's Kotlin engine. They require separate implementations and real phone tests. Do not label these as finished.

**Before installing an APK:** export/verify original Maya Memory Packs. If Android reports conflicting APK signatures, don't uninstall the old version without confirmed backup. No Jerry APK is required.
