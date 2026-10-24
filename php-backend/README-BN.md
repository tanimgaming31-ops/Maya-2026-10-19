# Maya PHP Intelligence Backend v1 — isolated experimental addition

**Status (2026-10-24): source implementation + integration tests. NOT installed on a PHP host, NOT wired into the existing Maya screen, and NOT tested on an Android phone.** The original `index.html`, `Maya-index.html`, voice, Gemini key, Memory Packs, Avatar, Agent Suite, native-v54 and Android APK build files are intentionally unchanged.

## Why an isolated branch?

The current Maya Agent Suite allows limited safe/read-only steps, but its documentation explicitly does NOT promise unattended system-wide automation. This backend extends planning, encrypted persistence and review queues **without** pretending that PHP can operate Android. Merge only after verifying PHP host/security and manual device tests.

## Files

- `public/index.php`: authenticated HTTPS API. **The document root must point to the `public/` directory ONLY.**
- `public/.htaccess`: Apache routing; for nginx provide an equivalent `try_files` rule.
- `src/bootstrap.php`: encrypted file store (AES-256-GCM + exclusive file lock), search, cron queue.
- `bin/tick.php`: CLI scheduler for one-time due tasks. **Must be invoked by actual host cron.**
- `client/maya-backend.mjs`: optional ES module adapter, not imported by existing Maya.
- `tests/smoke.sh`: PHP built-in server integration tests for auth, storage and safety.
- `.github/workflows/php-backend-tests.yml`: tests independent from Android builds.

## Deployment configuration (NO secrets in GitHub)

Requires PHP **8.1+**, OpenSSL extension, writable filesystem outside webroot, HTTPS, and a host accepting JSON API requests. If Apache is used, enable URL rewriting.

Required **host secret environment variables**, not committed files:
- `MAYA_BACKEND_TOKEN`: 32+ characters of cryptographically random secret, **different from Gemini API key**.
- `MAYA_DATA_KEY`: 64 hexadecimal characters (32 random bytes). Losing this means **encrypted data cannot be decrypted**.
- `MAYA_ALLOWED_ORIGIN`: exact HTTPS origin of the hosted Maya web app (for example `https://example.github.io`, NOT its path). For native WebView requests with an Origin header, add an explicitly authorized origin through future reviewed configuration.
- `MAYA_DATA_DIR`: optional absolute writable directory **outside the public document root**; otherwise defaults to `php-backend/private-data` for an isolated `public/`-root deployment.

To generate random values in Termux (installed OpenSSL): `openssl rand -hex 32`. Run twice and set the token from one output and data key from the other. **Never paste either into public GitHub, an HTML page, or a screenshot.**

For local CLI tests: `bash php-backend/tests/smoke.sh` (uses PHP, Python3 and curl). For manual local host: set variables above, then run `php -S 127.0.0.1:8080 -t php-backend/public php-backend/public/index.php`. The production deployment requires a real HTTPS endpoint.

## API contract (Bearer token on all except /v1/health)

All API requests are JSON; token is passed as `Authorization: Bearer <MAYA_BACKEND_TOKEN>`.

| Feature | Routes | Implemented reality | Not implemented |
| --- | --- | --- | --- |
| Smart Memory | `POST /v1/memories`, `GET /v1/memories/search?q=...`, `GET /v1/memories` | Opt-in encrypted memory save, word/substring search | Semantic embeddings / auto-import of old Memory Packs |
| Task History & Planning | `POST/GET /v1/tasks`, `POST /v1/tasks/report` | Record 1–4 allowlisted read-only search/wiki steps, capture **client-reported** outcome | Server Gemini planner, autonomous execution |
| Backup & Restore | `POST /v1/backups`, `GET /v1/backups/latest` | Explicit-consent encrypted JSON backup and downloadable copy | Auto-restore into original Maya, cross-device UI login |
| Routine Scheduler | `POST/GET /v1/routines`, CLI `bin/tick.php`, `GET /v1/events`, `POST /v1/events/ack` | Cron queues one-time due events, device can pull | Native AlarmManager push, notifications with app closed, recurrence |
| Diagnostics & Recovery | `POST /v1/failures`, `GET /v1/diagnostics` | Error history, suggested capped backoff policy | Automatic HTTP retry, self-healing network |
| Document Knowledge | `POST /v1/documents`, `GET /v1/documents/search?q=...` | Explicitly supplied extracted text, keyword search | Binary PDF/OCR processing, embeddings |
| Message Intelligence | `POST /v1/messages/drafts` | Explicit-consent storage of user/client supplied reply drafts, never sends | Reading phone notifications, generating drafts with Gemini, automatic sending |
| Native Bridge | `POST/GET /v1/native/suggestions` | Stores **proposals** in pending Android-user-confirmation state | Acting on Android device, phone app auto-launch, notification reply |

No endpoint calls Google Gemini, sends messages, touches the APK, automatically reads local files, accesses existing Memory Packs, or remotely controls an Android phone.

### Examples (for a PHP host only)

```bash
curl -H "Authorization: Bearer $MAYA_BACKEND_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"I prefer Bangla responses"}' \
  https://YOUR-SECURE-PHP-HOST/v1/memories

curl -H "Authorization: Bearer $MAYA_BACKEND_TOKEN" \
  'https://YOUR-SECURE-PHP-HOST/v1/memories/search?q=Bangla'

curl -H "Authorization: Bearer $MAYA_BACKEND_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consent":true,"payload":{"memoryPacks":["paste exported data here"]}}' \
  https://YOUR-SECURE-PHP-HOST/v1/backups
```

For any backup transfer, user must explicitly opt in. Never put backend token in a GitHub Pages `index.html` or repository. The optional JS adapter keeps it only in the calling session, but a browser-accessible token can still be exposed to compromised page scripts; before production, replace the single bearer token with per-user authentication, rotation and more granular privileges.

## Android / Maya integration after PHP host verification

1. Export existing Maya memories on the phone; save an independent offline backup.
2. Confirm existing APK, text, voice, camera, message-draft and native controls still work.
3. Deploy isolated `public/` to an actual suitable PHP host and inject secrets there.
4. Use the optional `client/maya-backend.mjs` from a test page with explicit opt-in. **Do not call save / backup on app start.**
5. Add a new Settings opt-in section only after live API tests, a real login system, and secure token-handling design. Old memory stays local by default.
6. Show server-planned tasks for review; ask for Android-side user confirmation again. A server proposal is NOT an executed native action.
7. For time-based phone notifications, add and test Android AlarmManager/Notification infrastructure separately. PHP cron only produces a queue.

## Hosting suitability & expected cost — verify with provider before deployment

- GitHub Pages is free for static UI but **cannot run PHP**.
- InfinityFree advertises `$0` PHP/MySQL/SSL, but its own documentation says free hosting is **not intended for API hosting, backup storage or background tools**, and free cron was disabled. **Not suitable for this backend.**
- AwardSpace advertises free PHP/MySQL with 1 GB disk and 5 GB traffic, but disabled PHP functions and possible policy constraints make it a **test candidate only, not a verified host for this API**; cron may not be available.
- Paid shared PHP hosting starts at promotional prices (for example Hostinger AE Single advertises **US$1.49/month for a 48-month term**; total **US$71.52 up front**, renewing at **US$8.99/month** on the checked listing). Taxes, renewal terms, cron support and database/storage limits must be checked before purchase. **Do not buy hosting just to test this prototype.**
- Local testing with Termux PHP on Android costs $0 but does NOT provide a publicly available always-on service.

## Verification checklist

- [x] No original Maya source edited by this branch.
- [x] API implemented as opt-in separate files, designed for server-side encryption.
- [x] Test script added for authentication, wrong CORS origin, memory query, backup, restricted plans, document text search, consent draft, safe native suggestions, failure reporting, cron one-shot and ciphertext.
- [x] GitHub Actions PHP CI passed on branch: https://github.com/tanimgaming31-ops/Maya-2026-10-19/actions/runs/40081665903 (PHP smoke tests only).
- [ ] Live HTTPS PHP host verified.
- [ ] Phone Maya integration tested.
- [ ] Android notification/voice/native bridge tested.
- [ ] Multi-user production authentication and threat model reviewed.

### Important caveats
The backend uses a **single-user file vault**, suitable only for a limited private prototype. It is not a scalable multi-user cloud, and it does not prove portability to every free shared host. Backups and saved draft text are decrypted by the server process; only send data you consent to store. Disk failure/host deletion can lose data; keep a separate offline backup. If the server dies, original Maya continues unchanged because integration is opt-in and not enabled yet.
