# Maya V54 — Phone-only user guide & honest status

The main Maya Android application now contains **six additional V54 modules**. Original V53/V30 Voice, Agent Suite, Avatar, Memory Packs, Gemini key, app launcher and other native actions remain in the source. It is **not** a second app and makes no change to the separate AYRA repository.

## What was implemented

1. **Smart Voice Action Engine 2.0 — limited grammar.** `maya-features/v54-voice.js`, `v54-voice-bridge.js` and `v54-suite.js` extend the original `window.MayaLifeVoice` interface. The original voice pipeline is used. Requires the existing **Unified Life Voice** toggle to be ON, working speech recognition, and Maya running. This is not an unconstrained AI device agent.
2. **Voice-Controlled App Macro — one approved visible control.** `MayaV54Macro.java` reuses the existing Android `MayaV4AccessService`. After a user-confirmed request, it opens an **exact, unique, visible launcher app** through the existing validated native catalog, then checks that the actual accessibility window belongs to the expected app before requesting one safe named-button tap. No sensitive words like send/pay/delete/allow or scriptable UI sequences. Android **Accessibility** must be manually enabled. A tap result is not proof that the external app completed a business action.
3. **Notification & Reply Manager — real Android Quick Reply.** Reuses existing `MayaNotificationService` (RAM-only supported app notifications) and `RemoteInput`. The new panel displays messages and offers an **explicitly confirmed** reply for notifications exposing that capability. The returned Android intent status is not a verified delivery receipt. Manual **Notification Access** required.
4. **Advanced File Manager — scoped Android Storage Access Framework.** User opens Android's folder picker, selects a folder, grants persistable read/write, can list up to 100 entries and create up to 64,000 characters as a *new* plain-text file. No arbitrary whole-device scanning, deletion or overwriting. `native-v54/MayaV54Files.java` and `scripts/install-v54.py`.
5. **Real Background Reminders — existing OS component reused.** Saves reminders through the existing `MayaAutomations` → Android `AlarmManager` / `BroadcastReceiver`, including `BOOT_COMPLETED` rescheduling of future reminders. These can fire with the Maya UI closed, but are **inexact** (`setAndAllowWhileIdle`); Doze, power saving, permissions and manufacturer restrictions can delay or suppress them. Android notification access/permission is required to see alerts.
6. **Personal Multi-Step Routines — local workflow.** Save up to 12 named routines with 1–5 permitted steps: battery read, recent notification check, reminder count, selected folder listing, and **one installed app opening at the end**. Each run requires confirmation. The external app can suspend Maya, so this is **not** continuous cross-app screen automation. The routine runner stops on failed steps.

The new Android bridge is `window.MayaBridge.v54(action,json)` and only exposes the whitelisted V54 native operations. Android-specific functions correctly fail in PWA/browser-only mode.

## How to use on an Android phone

1. Export/backup all Maya memories and local data before uninstalling, in case debug signing changes.
2. Install the new release APK only after the GitHub Actions build has succeeded. Open Maya and check the original voice and Memory.
3. In Settings, enable **Unified Life Voice**; check your previously saved Gemini key with **Test Key**. Find **Maya V54 · Native Voice Actions, Macros & Routines** inside Settings.
4. For Macros, manually enable **Maya screen controls** from Android → Settings → Accessibility. Run only harmless app/button combinations. The user must accept the confirmation.
5. For notifications, tap **Open Android Notification Access**, enable Maya, then tap **Read recent supported notifications**. Select a reply-capable message, type a reply, and confirm to send via Android Quick Reply.
6. For files, tap **Choose folder** and approve Android's picker; then **List selected folder** or **Confirm create TXT**.
7. For reminders, enter the label and minutes and approve. Check Android Notifications permission and battery saving restrictions; confirm it fires with Maya not visible.
8. For routines, name one, choose up to five allowed steps, optionally specify a *single* app as final action, and save. Then approve the Run button.

### Voice examples (enable Life Voice first)

- `Maya read notifications`
- `Maya reply to notification` — opens the reply UI; cannot auto-send without explicit approval
- `Maya choose folder`
- `Maya list files`
- `Maya save file hello.txt with Here is my note`
- `Maya remind me in 10 minutes to drink water`
- `মায়া, ১০ মিনিট পরে পানি খাও মনে করিয়ে দাও`
- `Maya macro Calculator tap History` — one confirmed safe tap, subject to Accessibility support
- `Maya run routine morning` — runs a previously saved routine called morning
- `Maya phone automation status`

## Code checks versus real device

- `tests/v54-suite.test.mjs` covers grammar, unsafe actions, routine data validation, native method whitelisting, and original loader wiring.
- GitHub Actions invokes `scripts/install-v54.py` after the original Native Android scripts, then compiles Java using Gradle and produces a signed debug APK when all checks pass.
- GitHub compilation **does not verify** the microphone, Android Accessibility UI labels, a message's actual delivery, exact alarm timing, or cross-vendor firmware behavior.
- No guarantee of background listening or general unrestricted automation. Do not misrepresent it as Antigravity or unrestricted Android agent.

## Keep zero-budget and original Maya data

All six features use the existing Android framework/APIs and existing Gemini key (when Gemini chat is used); V54's deterministic native actions themselves do not need a new paid AI API. No third-party storage or messaging server is added. User routines are saved locally (not encrypted).
