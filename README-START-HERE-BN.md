# Maya — নতুন প্রস্তুত অ্যাপ (১৯ অক্টোবর ২০২৬)

এই ZIP হলো Maya-র Android এবং GitHub Pages প্রজেক্ট। ফোন দিয়েই GitHub-এ আপলোড করা যায়। অ্যাপের সব UI ইংরেজি।

## যাচাই করা
- মূল HTML/JavaScript syntax এবং Android-native setup.sh-এর bash syntax যাচাই করা হয়েছে।
- Headless Chromium-এ ফোনের আকারে app UI, Settings, Memory খোলা ও মেমরি যোগ করার টেস্ট পাস করেছে।
- Messenger/IMO message draft validation ও search-link fallback-এর কিছু logic test পাস করেছে।
- AndroidManifest তৈরির script mock project-এ চলে এবং XML parse হয়েছে।

## এই সংস্করণে কী ঠিক/যোগ হয়েছে
- Settings থেকে **Test microphone** / **Test camera**; permission ও failure message দেখায়।
- ভয়েস কলের start/stop race protection, বন্ধ করলে মাইক-ক্যামেরা রিলিজ, Mute status স্পষ্ট।
- Gemini API থেকে মডেল খোঁজার নিয়ম উন্নত, Live না থাকলে supported fallback (Chrome-এ browser speech recognition)।
- Google grounded search ব্যর্থ হলে Google search খোলার বাটন; ভুল করে সফল হয়েছে বলে না।
- Messenger/IMO মেসেজ draft: user confirmation → Android Share Sheet খুলবে; chat বেছে নিজে Send চাপতে হবে। Browser-এ কপি/অ্যাপ খোলার চেষ্টা করে। **সরাসরি অন্য অ্যাপে টাইপ বা সেন্ড নয়।**
- Android debug signing build-script fix; আগের signing key GitHub secret দিয়ে দিলে পুরনো APK-র ওপর update install হওয়ার সুযোগ থাকবে।

## Android ফোন দিয়ে GitHub Pages
1. ZIP Extract করে GitHub repo (`pori-ai-assistant` বা আপনার repo) খুলুন।
2. এই ফাইলগুলো repo root-এ upload করুন: `index.html`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`।
3. Repo → Settings → Pages → Deploy from a branch → `main` / `(root)` → Save।
4. কিছুক্ষণ পর repo-র Pages URL Chrome-এ খুলে **Install app** চাপুন।
5. Maya → Settings → Gemini API key paste → Save key → Test key; key: https://aistudio.google.com/apikey
6. Settings → Test microphone / Test camera চালিয়ে দেখুন। HTTP/file:// থেকে মাইক/ক্যামেরা কাজ নাও করতে পারে; HTTPS Pages বা APK ব্যবহার করুন।

## Android APK — GitHub Actions
1. একই repo-র root-এ `package.json`, `capacitor.config.json`, `setup-native.sh` upload করুন।
2. **Create new file**-এ `.github/workflows/build-apk.yml` নামটি লিখুন এবং ZIP-এর `.github/workflows/build-apk.yml`-এর সম্পূর্ণ লেখা paste করে Commit করুন। (GitHub mobile-এ hidden `.github` folder upload করা কঠিন হলে এই উপায়।)
3. যদি পুরনো Maya APK-এর ওপর নতুনটা install করতে চান: দেওয়া **PRIVATE** text file-এ keystore-এর Base64 string আছে। GitHub repo Settings → Secrets and variables → Actions → New repository secret → Name: `MAYA_SIGNING_KEY_B64` → Value: ওই Base64 string → Save। **কোনো অবস্থায় এটি public repo-তে upload করবেন না বা কাউকে পাঠাবেন না।**
4. GitHub → Actions → `Build Maya APK` → Run workflow। সফল হলে Release-এ `Maya.apk` download করুন।
5. APK install করে microphone, camera, notification access যেটার দরকার শুধু সেটার অনুমতি দিন।
6. `MAYA_SIGNING_KEY_B64` না দিলে প্রতিটি build ভিন্ন Android debug key দিয়ে sign হতে পারে, পুরনো APK-র ওপর update install নাও হবে। আগে Memory → Export করে রাখবেন, uninstall করলে local memory/key মুছে যায়।

## সীমাবদ্ধতা — গুরুত্ব দিয়ে পড়ুন
- **এখানে APK build বা Android ফোনে চালিয়ে পরীক্ষা করা হয়নি।** GitHub Actions workflow দিয়ে APK তৈরি করার project দেওয়া হয়েছে, সরাসরি APK নয়।
- Live voice, API models, Google Search grounding ও multilingual TTS আপনার Google Gemini key/region/quota/Android WebView-এর ওপর নির্ভর করে। Gemini API key Google ছাড়া অন্য সার্ভারে পাঠানোর কোড নেই।
- APK-তে fallback browser SpeechRecognition কাজ নাও করতে পারে; Live voice ও text chat ব্যবহার করুন।
- Messenger/IMO/WhatsApp-এ অন্য অ্যাপের chat নিজে টাইপ করা বা নিজে Send চাপা নেই। Notification quick-reply শুধুমাত্র support করা notification থাকলে, আপনার confirmation-এর পরে native APK চেষ্টা করতে পারে; ডেলিভারি যাচাই হয় না।
- Native torch, brightness, SMS, message notifications-এর source code ছিল backup-এ, কিন্তু এই environment-এ ফোনে পরীক্ষা করা যায়নি। Permission ও Android version-এর সীমা রয়েছে।
- `AVATAR-DRAFTS-NOT-ACTIVE/`-এর ছবি/মুখের asset এখনও অ্যাপে ব্যবহার করা হয়নি; পরিচ্ছন্ন rigging/animation সম্পূর্ণ হয়নি। মূল অ্যাপে আগের SVG character থাকছে।
- `02-unfinished`-এর Accessibility automation, background call service এবং tile **ইচ্ছাকৃতভাবে মেশানো হয়নি**: অসম্পূর্ণ ও পরীক্ষাহীন।
- APK সাইনিং কী গোপন রাখুন; GitHub public-এ upload করবেন না। Backup ZIP-ও private রাখবেন।
