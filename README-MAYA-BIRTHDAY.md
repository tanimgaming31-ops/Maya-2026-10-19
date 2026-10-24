# Maya Birthday Memory — 19 October 2026

Creator-confirmed fact: **Maya was created on 2026-10-19**. This is her companion character's in-app birthday, not a claim about a human birth or actual clock time.

## Included in existing Maya Android APK
- **Birthday memory:** constant creation date of 2026-10-19; optional time and IANA timezone stored separately in localStorage key `maya.birthday.v1`. Initial time and timezone are **unknown**, never invented. Can save, edit or reset the time in Maya Settings → 🎂 Maya Birthday.
- **Voice answers:** Existing Life Voice fallback and text command path recognize explicit Bengali/English birth date/time/age/celebration queries with local accurate answers. During Gemini Live, the dynamic Gemini system prompt includes this date, any creator-provided creation time and the locally calculated calendar age; the Live voice engine handles speech, avoiding duplicate local TTS overlap.
- **Age:** correct age in calendar years, months and days from 19 October 2026. On 24 October 2026 it is 0 years, 0 months, 5 days. Calendar computations use local day, not a fixed 24-hour clock-time guess.
- **Annual celebration:** when Maya is opened on **19 October** in or after 2026, the app shows an in-app birthday greeting and a brief on-screen celebration animation. A CSS/Web Animations glow animates the *existing* avatar container, whether 2D or 3D. This does not install a new model, nor claim new avatar rigging. Reduced-motion settings are respected. The auto-celebration happens once per year per device (key: `maya.birthday.lastCelebration.v1`); Settings also contains a manual button.
- **Persistence:** creator birth date lives in app source; optional creation time and celebration history persist in device localStorage. Data can be lost after app uninstall, clear-data or signing-certificate change.
- **Backups:** birthday record included in original `maya-memories-and-packs.json` export/import and existing Maya V5 local snapshot/export/import, as optional `birthday` field. Older backups without this field continue to work. Restore requires user approval and validates the date before writing. Birthday Settings also has a standalone `maya-birthday-backup.json` exporter and importer. Existing original memories and API keys are not replaced when restoring birthday data.

## Voice questions
Enable original **Unified Life Voice** when using local text/fallback route; Gemini Live voice also receives the dynamic birthday fact in its system prompt.

- “মায়া, তোমার জন্মদিন কবে?”
- “মায়া, তোমার বয়স কত?”
- “মায়া, তুমি কত বাজে জন্মেছিলে?” → unknown until a clock time is explicitly saved.
- “Maya, when were you created?”
- “Maya, what time were you born?”
- “Maya, how old are you?”
- “Maya, happy birthday”

## What has and has not been tested
`node tests/birthday.test.mjs` checks parsing, creator date, month/year boundary ages, invalid birth-time restore rejection, backup wiring and loader integrity. `Build Maya APK` compiles the existing Android APK with the new module assets. It cannot prove speech synthesis quality or actual device avatar animation: these require installation and manual testing.

The birthday feature has **no new Android dangerous permissions**, no extra backend or paid API. As always, back up your Maya Memory before reinstalling.
