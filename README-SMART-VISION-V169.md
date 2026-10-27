# Maya Camera & Smart Vision — Features 13–18 (V169 source)

This extends **the SAME Maya-2026-10-19 Android app**. It reuses the existing Maya Gemini key, Memory Packs, speech-recognition pipeline and on-device ML Kit Latin OCR. It is not a separate APK/persona. No existing Maya memory or prompt files are deleted or replaced.

## Android use and voice

Install the newly built APK **after GitHub Actions succeeds**. First export your Maya Memory and keep the original Android signing key. Open Maya > Settings > **Camera & Smart Vision · 6 Tools**; turn on **Unified Life Voice** and test your microphone. Commands must begin with **Maya** or **মায়া**.

| # | Feature | Example voice command | What is implemented |
|---|---|---|---|
| 13 | Document Scanner | `Maya scan document` / `মায়া কাগজ স্ক্যান করো`, then `Maya make PDF` | Choose or photograph a page, tap **four paper corners** on the preview (TL, TR, BR, BL), confirm, perspective-rectify with Android `Matrix.setPolyToPoly` and create a **one-page A4 PDF** with `PdfDocument`. Saves in **Downloads/Maya** through MediaStore (Android 10+). **Corners are manual, not auto-detected.** No multi-page PDF yet. |
| 14 | Receipt Scanner | `Maya scan receipt` / `মায়া বিল স্ক্যান করো`, then `Maya save receipt` | On-device **Latin OCR** extracts possible item rows and totals using conservative rules. Shows editable item lines, amount and currency. Original Life Suite expenses can save **only after user reviews the total and confirms**. No promise of correct itemization, prices, or currency for all receipts. |
| 15 | Medicine Label Assistant | `Maya read medicine label` / `মায়া ওষুধের লেখা পড়ো`; `Maya explain medicine label` | On-device OCR displays printed text and simple expiry/storage/directions cues. Separate explicit consent sends **OCR text only** to Gemini for plain-language explanation. Never invent a dose or change treatment; verify original label and ask a pharmacist/doctor. Avoid relying on uncertain OCR for medications. |
| 16 | Object Counter | `Maya count cups in photo` | Choose a photo, specify an object, **confirm** sending that one resized image to Google Gemini. Returns an **estimate**, not guaranteed accurate. No on-device generalized object detector or verified count. |
| 17 | AI Photo Organizer | `Maya organize my photos` / `মায়া ছবিগুলো সাজাও` | Select up to **five** user-picked images. With explicit consent, send individually to Gemini to **suggest category labels**; show result. **Never moves, renames, deletes or auto-scans Gallery**. |
| 18 | Handwriting Reader | `Maya read handwriting` / `মায়া হাতের লেখা টাইপ করো` | Pick handwritten note photo, process through existing **ML Kit Latin-script OCR**, populate selectable/copyable text, request spoken read-back where WebView speech synthesis is supported. Handwriting accuracy varies; Bengali handwriting recognition is NOT yet supported by this on-device model. |

## Voice-first practical constraints

Each of these tools has an existing Life Voice, typed and Gemini Live-transcript command route (via a wrapper around the prior `window.MayaLifeVoice`). The command **starts the real flow**; selecting photos, granting Camera access, defining PDF corners and approving uploads/saves can still require Android touchscreen interactions. **Continuous hands-free camera/phone operation is not promised**, because Android protects these actions and the microphone may not work in some WebViews. Use the visible fallback controls if the photo picker refuses to open from voice. TTS read-back is attempted, not guaranteed if the phone has no available speech engine or Maya is already speaking.

The image OCR stays on-device. PDF construction stays on-device. Object Counting and Photo Organizer send selected images to Google only after explicit approval. Medicine label explanation sends text only after explicit approval. Gemini usage depends on valid user key, supported model, quota and network. Photos and scans aren't quietly saved in Maya memory.

## Testing

- `node tests/smart-vision-v169.test.mjs` verifies voice command parsing, non-matching unsafe commands, receipt item heuristics and label cues.
- `python3 tests/smart-vision-native-check.py` verifies the Android PDF bridge, privacy constraints, voice/scan links.
- `scripts/install-smart-vision.py` installs only the PDF bridge/class *into the generated APK project* after existing ML Kit and Android Controls, before Gradle.
- GitHub Actions compiles Android Java and packages original Maya + Smart Vision in one APK. **Passing compilation is not a real-device test**; OCR quality, photo chooser, PDF visual correction, Download folder behavior, Gemini results and microphone require actual Android phone testing.

## Next-generation voice rule

Future features should route recognized **Bangla + English voice** into an actual feature action and display clear success/failure, with permission prompts, fallback controls, no invented capabilities, no silent data uploads and explicit confirmation of destructive or sensitive actions. This project keeps that rule; adding a text-only toggle is not enough.
