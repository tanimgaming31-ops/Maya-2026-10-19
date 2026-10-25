# Maya WhatsApp / IMO approved auto-reply

Maya can automatically **submit an Android notification Quick Reply** on the user's behalf, while the Maya UI is closed, for explicitly approved contacts only. This is additive to existing Maya; original Memory Packs, Gemini Live, avatars, existing messaging manual drafts, V54, Birthday and screenshot modules are preserved.

## Setup on Android
1. Back up Maya memories before installing a replacement APK. Do **not** uninstall the old app without a backup.
2. Open **Maya → Settings → 💬 Maya WhatsApp & IMO — Approved Auto Reply**.
3. Tap **Open Android Notification Access**, then enable Maya under Android's Notification Access settings. Notifications must be visible, and the messaging app must include an Android **Reply** action. Privacy: granting this permission allows Maya to read notification content.
4. Choose **WhatsApp**, **WhatsApp Business**, **IMO** or **IMO alternate app**. Enter **the exact, unique person name shown in the message notification**. Do not use groups or contact names shared by multiple people.
5. Enter **your own reply template**, such as: “আমি এখন ব্যস্ত আছি, একটু পরে তোমাকে উত্তর দেব।” Maya will append “— Maya auto-reply” so recipients can tell the message was automatic.
6. Tap **Save contact rule**. This does NOT enable auto-send. Separately switch on **ENABLE automatic replies for these approved contacts**, review the warning and confirm.
7. For a test, ask this trusted contact to send a harmless new message while the phone is unlocked, with WhatsApp/IMO notifications turned on. Check the actual conversation: the status can say “Android Quick Reply intent submitted” even if delivery failed.
8. To stop immediately, choose **STOP all auto replies**, or remove a rule. Revoke Maya's Notification Access in Android Settings to prevent further notification-driven replies.

## Safety and limitations
- Default **OFF**. Requires explicit configuration and explicit final global enable. Settings are stored locally in Android private `SharedPreferences`, not merely PWA localStorage.
- Only registered package IDs: `com.whatsapp`, `com.whatsapp.w4b`, `com.imo.android.imoim`, `com.imo.android.imous`. No generic third-party app automation, third-party plugins, web session access, or Accessibility click automation.
- Exact package **AND** exact visible sender label; sender labels are not cryptographic identities. Two people with the same displayed name can be confused. Do not set rules for ambiguous names.
- Group notification titles, notification summaries, sensitive text (OTPs, passwords, payment/banking), outgoing/self-message labels, old notifications, missing RemoteInput and unrecognized app notifications are ignored.
- At most one automatic reply per contact per 15 minutes, five per contact per day, 15 across all approved contacts per day, and 8 saved rules. Duplicated notification event fingerprints are blocked. No bulk messaging.
- Uses an already existing `NotificationListenerService` plus Android `RemoteInput` and notification `PendingIntent`, as supplied by the messaging app. Works only while Android keeps Maya's notification listener connected.
- Stores the sender and user-selected reply templates locally, but does not store the private incoming message content in persistent rules and does not send them to Gemini. There is **no adaptive Gemini response generation** in this first version. Replies are user-authored templates, not fully autonomous conversation.
- Actual sending and delivery status are **not** verifiable by the remote-input action. Current implementation reports submission to Android, not “sent/read/delivered”.
- Existing Maya manual Quick Reply and notification reader remain untouched.

## Tests
`node tests/auto-reply.test.mjs` covers UI input validation and static Java safety checks. GitHub Actions installs generated Android code using `python3 scripts/install-auto-reply.py` and compiles the APK. Device-testing the actual notification/action/delivery remains necessary before enabling replies to anyone you do not expect.

No new paid services or blanket Android permissions are added.
