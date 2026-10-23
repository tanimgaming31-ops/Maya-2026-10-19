# Maya Agent Suite V29 — Android / Phone-only Guide

This is **Maya's own Agent Suite inspired by general AI-agent concepts**. It is **not Google Antigravity**, the Antigravity IDE, or an official integration with an Antigravity API. The main Maya app and existing memory packs, voice chat and avatar remain in place.

## Open
Install the newest GitHub Release APK (only after its build succeeds). Tap **⚡** in Maya's top toolbar, or open **Settings → Maya Agent Suite — 8 Advanced Tools**. The app must remain running. With the existing Life Voice option enabled and working speech recognition, say **“Maya open agent suite”** or **“মায়া এজেন্ট খোলো”**. This only opens the panel; it does not autonomously control websites or the device.

## Eight real, user-triggered tools

1. **AI Agent Mode**: Enter a goal, tap *AI: Prepare safe plan*. With a valid Gemini key and quota, Maya asks Gemini for a JSON plan. Plan validation accepts only 1–4 read-only `searchWeb` and `wikiSummary` steps. Invalid plans are rejected. No auto-execution.
2. **Browser Agent**: Enter a phrase → *Open Google Search*, or a public HTTPS link → *Open HTTPS URL*. This triggers the user's browser; it does not click, log in, or scrape websites autonomously.
3. **Smart Phone Agent**: Type a visible installed app's name → *Open installed app by name*. Calls Maya's existing Android launcher with native checks. It may not support hidden/work-profile/non-launchable apps. Opening is requested; actual Android launch should be checked.
4. **File Agent**: Select TXT/MD/CSV/JSON (≤256 KiB) or PDF/PNG/JPEG/WEBP (≤4 MiB), ask a question and confirm upload. The selected file is sent **directly to the Google Gemini API**, using Maya's existing key, only upon confirmation. No scanning or background upload. Files are not saved by the Agent Suite.
5. **Deep Research**: Three focused Gemini calls with Google Search grounding for different angles of the query. Google-provided grounding source links are displayed, if any. No links = no verified citations. May fail if grounding is not available for the selected model, region or quota.
6. **Multi-step Automation**: Review the plan, explicitly confirm and run 1–4 sequential read-only queries. Cancel is available. No scheduled/background automation or system-wide browsing.
7. **Coding Assistant**: Paste code and a task. Confirm sending to Gemini. The output is suggestions and code snippets; the code is **not executed**, and GitHub is not modified automatically. Do not paste secrets.
8. **Task Dashboard**: Last 25 Agent Suite task statuses are kept locally at `maya.agent.history.v1`; clearing this history does **not** erase original Maya Memory Packs. History is not encrypted.

## Verify on your Android phone

1. **Backup first**: Use the original Maya Memory Export before any uninstall. Install the latest APK from Releases. If signatures differ, an uninstall/reinstall can delete local Maya data.
2. **Open the ⚡ panel**: Confirm all eight headings appear and the existing Maya interface still opens normally.
3. **Test with key**: Settings → Gemini API key → Test key. Build a basic search plan; it must show the plan *before* you approve execution.
4. **Test read-only steps**: Confirm a search + Wikipedia task. The result must appear and failures must be reported, not marked successful.
5. **Test Android app launch**: In the APK, try a known installed app (e.g. Calculator). The Android device controls whether it launches.
6. **Test file safety**: Select a small harmless text file, cancel upload confirmation, ensure no answer is generated. Repeat and consent to get a Gemini analysis.
7. **Research links**: Check any returned URLs yourself. Results vary by Google's grounding availability.
8. **Check Dashboard**: Verify task status appears, then clear it and verify only Agent history disappears.
9. **Voice shortcut**: With Life Voice enabled, say or type “Maya open agent suite”. This requires existing working speech recognition. No always-on listening is added.

## Automated code checks
`node tests/agent-suite.test.mjs` and `node tests/life-voice.test.mjs` are included in GitHub Actions, together with module syntax checks and the existing regression tests. A successful GitHub APK build does **not** prove all functions work on every real Android phone.

## Privacy, expense and limitations
- The existing user-provided Gemini key is read from the original `maya.key` localStorage value and used only in direct Google API requests (no extra proxy).
- Agent plans, text/pdfs/photos and code submitted to Gemini leave the phone **only after user-triggered actions and required confirmations**; searching submits queries to Google. Do not submit highly sensitive material.
- Agent history is local, not encrypted. If privacy is critical, clear its history.
- Models, Google grounding, free-tier quotas and WebView permissions may change. Availability is not guaranteed.
- Browser Agent is an HTTPS link/search launcher, not a full browser automation runtime.
- There is no external-message sending, Accessibility automation, unattended purchases, background tasks, arbitrary code execution, or automatic changes to repos.
