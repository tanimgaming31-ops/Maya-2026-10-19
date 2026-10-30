/* Maya V25 (54 groups) PDF-derived feature inventory. It is not a claim of implementation.
 * Source: user-provided 16-page Maya_AI_Assistant_V25_54_Features_A_to_Z.pdf,
 * pp. 3–15. Original app code remains independent. No external libraries.
 */
export const SECTION_NAMES=["AI Voice & Intelligence","Chat, Memory & Personalization","Phone, Apps, WhatsApp & YouTube","AI Screen Vision & Automation","Settings, Privacy, Security & Appearance"];
export const FEATURES54=Object.freeze([
  {
    "id": 1,
    "title": "Gemini Live AI Voice Call",
    "section": 1,
    "subfeatures": [
      "AI-এর স ঙ্গে সরাস র অ ডিও ক থিাপকথিন",
      "AI-এর কথিার অ ডিও শানা",
      "Gemini Live WebSocket সং যাগে",
      "Live Session Start, Stop ও Restart",
      "Microphone Audio Streaming",
      "Connection Error শনাক্ত",
      "Automatic Reconnection ব্যবস্থা"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 2,
    "title": "Real-Time Listening & Speaking",
    "section": 1,
    "subfeatures": [
      "কথিা বলিার স ঙ্গে স ঙ্গে অ ডিও পাঠা না",
      "Speech-End Detection",
      "AI Audio Playback",
      "Listening, Thinking ও Speaking Status",
      "User Speech Transcription",
      "Voice Activity State",
      "AI Response Transcription"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 3,
    "title": "Wake Word — Hey Maya",
    "section": 1,
    "subfeatures": [
      "“Hey Maya” ব লি Assistant স ক্রিয়ে করা",
      "Wake-Word Detection Response",
      "Offline Vosk Wake-Word Recognition",
      "মা লি কর Voice Profile থিাক লি Speaker Checking",
      "Wake-Word Confidence Checking",
      "Wake Detection-এর পর Live Conversation শুরু",
      "Standby Listening"
    ],
    "verification": "device-test-required",
    "note": "Existing web wake listening is page-visible; offline Vosk and closed-app wake recognition are not verified."
  },
  {
    "id": 4,
    "title": "Hands-Free Voice Mode",
    "section": 1,
    "subfeatures": [
      "Microphone Button দ য়ে Assistant চালিু",
      "Voice Command Guide",
      "3D Orb ট্যাপ ক র Voice Session শুরু",
      "Accessibility Permission Setup",
      "Hands-Free Device Control",
      "Hands-Free Service Status",
      "ভে য়েস দ য়ে সম থির্ণ ত অ্যাপ ও ফিা নর কাজ চালিা না"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 5,
    "title": "Background Voice Service",
    "section": 1,
    "subfeatures": [
      "Android Foreground Service",
      "Foreground Notification",
      "Background Voice Session",
      "Wake Lock Management",
      "Standby Mode",
      "Background Session Stop",
      "Wake Listening",
      "Android Service Lifecycle Handling"
    ],
    "verification": "device-test-required",
    "note": "A real Android foreground service depends on permissions, notification state and manufacturer battery policy."
  },
  {
    "id": 6,
    "title": "Voice Interruption & Barge-In",
    "section": 1,
    "subfeatures": [
      "AI কথিা বলিার সময়ে কথিা বলিা",
      "Audio Focus Management",
      "AI Speech Interrupt",
      "Volume Ducking",
      "চলিমান Audio Playback থিামা না",
      "Turn Completion Detection",
      "নতু ন User Turn শুরু"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 7,
    "title": "Gemini Model Selection",
    "section": 1,
    "subfeatures": [
      "সা সর্ণ সংজ্ঞা য়েত Gemini 3.1 Flash Live Preview",
      "Model Connection Test",
      "Gemini 3.8 Live",
      "Invalid API Key Detection",
      "Gemini 3.1 Flash Agent",
      "Quota Error Handling",
      "Default Model Setting",
      "Live Session Renewal"
    ],
    "verification": "device-test-required",
    "note": "The Gemini model names printed in the PDF are not guaranteed available through Google's current API."
  },
  {
    "id": 8,
    "title": "Multilingual AI Conversation",
    "section": 1,
    "subfeatures": [
      "Automatic Language Mode",
      "Bhojpuri, Punjabi ও Odia",
      "English, Bengali, Hindi ও Hinglish",
      "Language Selection Dialog",
      "Urdu, Telugu, Tamil ও Kannada",
      "নবর্ণা চত ভোষায়ে AI Response",
      "Malayalam, Marathi ও Gujarati",
      "Spoken Language Understanding"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 9,
    "title": "AI Voice Selection",
    "section": 1,
    "subfeatures": [
      "Aoede",
      "Leda",
      "Charon",
      "Orus",
      "Kore",
      "Zephyr",
      "Fenrir",
      "Voice Tone Selection",
      "Puck",
      "Selected Voice Preference Save"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 10,
    "title": "AI Personality Modes",
    "section": 1,
    "subfeatures": [
      "Maya Assistant Mode",
      "Focus Mode",
      "Girlfriend Mode",
      "Tanim Boss Mode",
      "Boyfriend Mode",
      "Personality Selection",
      "Companion Mode",
      "Personal Address Name",
      "Professional Mode",
      "Voice Tone Customization",
      "Personality-Based Conversation Style"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 11,
    "title": "Owner Voice Biometrics",
    "section": 1,
    "subfeatures": [
      "Owner Voice Enrollment",
      "Strict Threshold",
      "একা ধক Voice Sample Recording",
      "Balanced Threshold",
      "Speaker Vector Extraction",
      "Relaxed Threshold",
      "Speaker Similarity Checking",
      "Owner Voice Profile Reset",
      "Voice Profile Test"
    ],
    "verification": "device-test-required",
    "note": "Owner voice recognition strength and speaker matching need native validation; do not treat as secure authentication without proof."
  },
  {
    "id": 12,
    "title": "Silent Execution Mode",
    "section": 1,
    "subfeatures": [
      "Silent Action On/Off",
      "Settings Toggle",
      "Device Command-এর পর Voice Reply নয়েন্ত্র",
      "Voice ও Action Feedback আলিাদাভো ব নয়েন্ত্র",
      "Background Command Response"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 13,
    "title": "AI Text Chat",
    "section": 2,
    "subfeatures": [
      "AI Text Conversation",
      "Chat Bubbles",
      "User Message",
      "Voice Transcription Display",
      "Assistant Reply",
      "Conversation Context"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 14,
    "title": "Chat History",
    "section": 2,
    "subfeatures": [
      "Previous Chat History",
      "Previous Messages View",
      "Conversation Persistence",
      "Chat History Clear",
      "History Bottom Sheet",
      "App Restart-এর পর History Load"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 15,
    "title": "Smart Memory Bank",
    "section": 2,
    "subfeatures": [
      "Short-Term Memory",
      "User Preferences",
      "Long-Term Memory",
      "Memory Context Retrieval",
      "SQLite Room Database",
      "Conversation থি ক নতু ন তথি্য শখার ব্যবস্থা",
      "Persistent Personal Facts",
      "Memory-Based Response"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 16,
    "title": "Remember, Search & Forget",
    "section": 2,
    "subfeatures": [
      "“Maya, remember that…” কমান্ড",
      "Memory Edit",
      "“Maya, what do you remember?” কমান্ড",
      "Memory Delete",
      "“Maya, forget…” কমান্ড",
      "Multiple Memory Category",
      "Memory Search"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 17,
    "title": "Memory Review & Management",
    "section": 2,
    "subfeatures": [
      "Saved Memory List",
      "Edit Memory",
      "Search Box",
      "Delete Confirmation",
      "Category Filter",
      "Memory Count Display",
      "Add Memory",
      "Automatic Preference Learning"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 18,
    "title": "Personal Recall",
    "section": 2,
    "subfeatures": [
      "Birthday Recall",
      "Song Play Count Tracking",
      "Favourite Song Recall",
      "Favourite App Learning",
      "Daily Routine Recall",
      "নাম ও ব্য ক্তগেত তথি্য ম ন রাখা",
      "আ গের Memory ব্যবহার ক র উত্তর"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 19,
    "title": "User Profile & About Me",
    "section": 2,
    "subfeatures": [
      "User Name",
      "Bengali Profile Description",
      "Editable Profile",
      "Voice Enrollment Status",
      "Tanim Boss About Me",
      "AI কী না ম ডিাক ব, তার সটিংস",
      "English Profile Description",
      "Profile-Based Conversation"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 20,
    "title": "Personal Learning & AI Behavior",
    "section": 2,
    "subfeatures": [
      "User Name Learning",
      "Relationships & Contacts",
      "Birthday Learning",
      "Food Preferences",
      "Location/Residence Preferences",
      "Color Preferences",
      "Profession & Job Information",
      "Hobbies & Routine",
      "Favourite Song Learning",
      "Conversation Context Personalization",
      "Favourite App Learning"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 21,
    "title": "Voice App Launcher",
    "section": 3,
    "subfeatures": [
      "অ্যা পর নাম ব লি Launch",
      "Instagram, Telegram ও Snapchat",
      "App Name Recognition",
      "YouTube, Spotify ও Netflix",
      "App Alias Matching",
      "Chrome, Gmail ও Maps",
      "Installed App Lookup",
      "Play Store, Photos, Drive ও Calendar",
      "WhatsApp, Messenger ও Facebook",
      "TikTok, ChatGPT এবং অন্যান্য সম থির্ণ ত অ্যাপ",
      "App Not Found Response"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 22,
    "title": "Contact Calling",
    "section": 3,
    "subfeatures": [
      "Contact Name Search",
      "Multiple Contact Selection",
      "Exact Name Match",
      "Phone Number Resolution",
      "Nickname Match",
      "Call Intent",
      "Partial Name Search",
      "Permission Check",
      "Fuzzy Contact Matching",
      "Confirmation Handling"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 23,
    "title": "WhatsApp Contact Search",
    "section": 3,
    "subfeatures": [
      "Contact Name Lookup",
      "WhatsApp Business Detection",
      "Phone Contacts Integration",
      "Dual-App Detection ব্যবস্থা",
      "Phone Number Matching",
      "Multiple App Selection",
      "WhatsApp Contact Open",
      "Multiple Contact Disambiguation"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 24,
    "title": "WhatsApp Messaging Assistant",
    "section": 3,
    "subfeatures": [
      "Voice Message Dictation",
      "WhatsApp Deep Link",
      "Message Draft Creation",
      "Accessibility Text Input",
      "Recipient Selection",
      "Send Button Detection",
      "Text Preparation",
      "Send Action Attempt",
      "Send Confirmation",
      "Failure/Error Response"
    ],
    "verification": "device-test-required",
    "note": "WhatsApp send attempts and Accessibility paths do not prove delivery; explicit confirmation is required."
  },
  {
    "id": 25,
    "title": "WhatsApp Voice & Video Call",
    "section": 3,
    "subfeatures": [
      "Voice Call Command",
      "Call Button Identification",
      "Video Call Command",
      "Call-Type Selection",
      "Contact Resolve",
      "Confirmation",
      "WhatsApp Chat Open",
      "Accessibility Call Action"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 26,
    "title": "WhatsApp Message Delete",
    "section": 3,
    "subfeatures": [
      "Delete for Me",
      "Delete Button Detection",
      "Delete for Everyone",
      "Delete Confirmation",
      "Message Selection",
      "Accessibility Delete Flow"
    ],
    "verification": "device-test-required",
    "note": "WhatsApp deletion/for-everyone is not verified and must never be presented as automatic or universally supported."
  },
  {
    "id": 27,
    "title": "YouTube Video Search",
    "section": 3,
    "subfeatures": [
      "Video Name Search",
      "Video ID Detection",
      "Song Search",
      "Video Title Matching",
      "YouTube App Launch",
      "Search Query Processing",
      "Search Results Inspection",
      "Search Fallback"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 28,
    "title": "YouTube Video Playback",
    "section": 3,
    "subfeatures": [
      "Video Play Command",
      "Favourite Song Play",
      "Search & Play",
      "Ambiguous Query Check",
      "Selected Video Open",
      "Accessibility Autoplay Flow",
      "First Relevant Video Selection"
    ],
    "verification": "device-test-required",
    "note": "YouTube search or auto-tap does not establish playback success; test on phone."
  },
  {
    "id": 29,
    "title": "Media Playback Controls",
    "section": 3,
    "subfeatures": [
      "Play",
      "Previous",
      "Pause",
      "Media Session Action",
      "Resume",
      "Voice Media Control",
      "Next"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 30,
    "title": "YouTube Extra Actions",
    "section": 3,
    "subfeatures": [
      "Fullscreen",
      "Player Control",
      "Exit Fullscreen",
      "Video Selection",
      "Subscribe Action",
      "Playback Verification"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 31,
    "title": "Flashlight Control",
    "section": 3,
    "subfeatures": [
      "Torch On",
      "Flash Hardware Detection",
      "Torch Off",
      "Camera Flash Access",
      "Voice Flashlight Command",
      "Permission Handling"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 32,
    "title": "Volume Control",
    "section": 3,
    "subfeatures": [
      "Volume Up",
      "Maximum Volume",
      "Volume Down",
      "Media Volume",
      "Set Volume Percentage",
      "Relative Volume Adjustment",
      "Mute"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 33,
    "title": "Brightness Control",
    "section": 3,
    "subfeatures": [
      "Set Brightness Percentage",
      "Maximum Brightness",
      "Brightness Up",
      "Minimum Brightness",
      "Brightness Down",
      "Android Brightness Settings Permission"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 34,
    "title": "Camera & Phone Actions",
    "section": 3,
    "subfeatures": [
      "Camera Open",
      "Voice Device Command",
      "Android Camera Intent",
      "Supported Phone Settings Open",
      "Camera Permission Check"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 35,
    "title": "Web Search & Browser Control",
    "section": 3,
    "subfeatures": [
      "Web Search",
      "Domain Normalization",
      "Browser Open",
      "Built-in Search Engine",
      "Website Open",
      "Search Results Extraction",
      "Multiple Website URLs",
      "Browser Navigation",
      "Web Page Interaction-এর Accessibility ব্যবস্থা"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 36,
    "title": "Android Screen Sharing",
    "section": 4,
    "subfeatures": [
      "Screen Share Start",
      "Live Frame Capture",
      "Screen Share Stop",
      "JPEG Screen Image",
      "MediaProjection Permission",
      "AI- ত Screen Frame পাঠা নার ব্যবস্থা",
      "Screen Capture",
      "Screen Share Status"
    ],
    "verification": "device-test-required",
    "note": "Screen capture requires explicit Android MediaProjection consent and supported native integration."
  },
  {
    "id": 37,
    "title": "AI Screen Vision",
    "section": 4,
    "subfeatures": [
      "Current Screen Inspection",
      "Screen Context Analysis",
      "Screen Text Extraction",
      "AI Screen Understanding",
      "Button Recognition",
      "UI Element Matching",
      "Link Recognition",
      "Screen State Refresh",
      "Input Field Detection"
    ],
    "verification": "device-test-required",
    "note": "UI/screen interpretation depends on permissions and actual screen accessibility; not guaranteed."
  },
  {
    "id": 38,
    "title": "Voice Tap & Click Control",
    "section": 4,
    "subfeatures": [
      "Tap by Button Name",
      "Clickable Element Matching",
      "Tap by Text Label",
      "Tap Verification",
      "Accessibility Click",
      "Duplicate Tap Prevention",
      "Coordinate-Based Tap",
      "Sensitive Action Protection",
      "Target Detection"
    ],
    "verification": "device-test-required",
    "note": "Sensitive taps must remain confirmation-gated; no bypass of Android access permissions."
  },
  {
    "id": 39,
    "title": "Voice Type, Scroll & Swipe",
    "section": 4,
    "subfeatures": [
      "Voice Typing",
      "Scroll Down",
      "Text Field Detection",
      "Swipe Gesture",
      "Type Text",
      "Back Key",
      "Paste Text",
      "Submit Action",
      "Text Readback Verification",
      "Keyboard Handling",
      "Scroll Up"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 40,
    "title": "Multi-Step AI Task Engine",
    "section": 4,
    "subfeatures": [
      "Voice Task Understanding",
      "Task Cancel",
      "Task Goal Creation",
      "Failure Recovery",
      "Task Planning",
      "UI State Waiting",
      "Multiple Task Steps",
      "Repeated Action Detection",
      "Step Execution",
      "Spotify Search Automation Code Path",
      "Task Pause",
      "Instagram Automation Code Path",
      "Task Resume",
      "Browser Form Interaction"
    ],
    "verification": "device-test-required",
    "note": "Existing V54 routines are constrained; not unrestricted cross-app autonomous automation."
  },
  {
    "id": 41,
    "title": "Task Progress Overlay",
    "section": 4,
    "subfeatures": [
      "Task Progress Display",
      "Task Status",
      "Current Step",
      "Floating Progress View",
      "Pending Steps",
      "Task Cancellation",
      "Completed Steps",
      "Fallback Progress Panel",
      "Failed Steps"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 42,
    "title": "Floating Avatar System",
    "section": 4,
    "subfeatures": [
      "Floating Avatar On/Off",
      "Double Tap for Task Progress",
      "Drag Avatar",
      "Avatar Selection Gallery",
      "Edge Docking",
      "Cat, Ghost, Alien ও Droid",
      "Always-On Visibility Option",
      "Cloud, Flower, Star ও Blob",
      "During-Task Visibility",
      "Circle, Hexagon, Square ও Triangle",
      "Mech, Pill, Pebble, Drop ও Puddle"
    ],
    "verification": "device-test-required",
    "note": "Floating overlay needs separate Android overlay permission and native device check."
  },
  {
    "id": 43,
    "title": "AI Action Verification & Safety",
    "section": 4,
    "subfeatures": [
      "Screen Signature Checking",
      "Sensitive Action Confirmation",
      "UI State Comparison",
      "Stuck Task Detection",
      "Action Result Verification",
      "Retry Handling",
      "Repeated Click Prevention",
      "Task Recovery",
      "Search Loop Detection",
      "Completion Evidence",
      "Wrong Target Protection",
      "Failure Reporting"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 44,
    "title": "Gemini API & Connection Settings",
    "section": 5,
    "subfeatures": [
      "Gemini API Key Input",
      "Connection Error",
      "API Key Save",
      "Invalid Key Detection",
      "API Test Connection",
      "Quota Error",
      "API Model Selection",
      "Encrypted Preference Storage"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 45,
    "title": "Microphone & Voice Permissions",
    "section": 5,
    "subfeatures": [
      "Microphone Permission",
      "Recording Stop",
      "Microphone On/Off",
      "Voice Enrollment Access",
      "Mute/Unmute",
      "Audio Input Status",
      "Recording Start",
      "Voice Recognition Setup"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 46,
    "title": "Accessibility Permission Manager",
    "section": 5,
    "subfeatures": [
      "Accessibility On/Off-এর Android Settings পথি",
      "Type Permission",
      "Service Status Check",
      "Scroll Permission",
      "Accessibility Settings Shortcut",
      "Device Automation Guide",
      "Tap Permission",
      "Service Availability Checking"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 47,
    "title": "Floating Overlay Permissions",
    "section": 5,
    "subfeatures": [
      "Display Over Other Apps",
      "Avatar Position",
      "Overlay Permission Check",
      "Overlay Visibility",
      "Floating Avatar Enable/Disable",
      "Overlay Settings"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 48,
    "title": "Notification & Location Permissions",
    "section": 5,
    "subfeatures": [
      "Notification Permission",
      "Android Settings Shortcut",
      "Location Permission",
      "Location-Based Weather",
      "Permission Status",
      "Permission Error Prompt"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 49,
    "title": "Privacy & Data Shield",
    "section": 5,
    "subfeatures": [
      "Privacy Information",
      "Permission Explanation",
      "Local Data Information",
      "User Data Controls",
      "Memory Storage Explanation",
      "Privacy Settings Screen",
      "Cloud AI Processing Information"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 50,
    "title": "App Security & Integrity",
    "section": 5,
    "subfeatures": [
      "Android Package Verification",
      "Tamper Alert",
      "App Signature Checking",
      "Voice Profile Verification",
      "SHA-256 Certificate Checking",
      "Security Status",
      "Package Mismatch Detection"
    ],
    "verification": "device-test-required",
    "note": "App package/security checks require actual signed APK and device testing."
  },
  {
    "id": 51,
    "title": "Live Weather Dashboard",
    "section": 5,
    "subfeatures": [
      "Current Weather",
      "Humidity",
      "Temperature",
      "Feels-Like Temperature",
      "Weather Condition",
      "Daily Maximum/Minimum Temperature",
      "City Name",
      "Location-Based Forecast",
      "Weather Refresh"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 52,
    "title": "Theme & 3D Orb Customization",
    "section": 5,
    "subfeatures": [
      "Light Theme",
      "Theme Preview",
      "Dark Theme",
      "3D Orb Color",
      "Red Theme",
      "Glowing Animation",
      "Sunset Theme",
      "Orb Listening Animation",
      "Custom HEX Theme",
      "Orb Speaking Animation",
      "Color Swatches",
      "Dynamic Theme Color",
      "Futuristic UI Effects"
    ],
    "verification": "device-test-required",
    "note": "Original third-party Three.js/VRM runtime was removed. 2D SVG avatar and CSS themes remain; genuine 3D Orb/VRM animation is unavailable."
  },
  {
    "id": 53,
    "title": "Updates & System Information",
    "section": 5,
    "subfeatures": [
      "Updates Tab",
      "System Status",
      "Updates Screen",
      "App Settings",
      "Update Badge",
      "Build Information",
      "Assistant Information"
    ],
    "verification": "device-test-required",
    "note": "Listed in the PDF. A corresponding name in this catalog does not mean this feature was implemented or device-tested."
  },
  {
    "id": 54,
    "title": "Assistant Start, Stop & Session Management",
    "section": 5,
    "subfeatures": [
      "Maya On/Off",
      "Background Service Stop",
      "Voice Session Start",
      "Screen Share Stop",
      "Voice Session Stop",
      "Overlay Stop",
      "Microphone Mute",
      "Active Task Cancel",
      "Voice Interrupt",
      "Session Restart",
      "Standby Listening",
      "Long-Press Stop Control",
      "Wake Word Listening"
    ],
    "verification": "device-test-required",
    "note": "Maya can stop local sessions; closed-app background behavior and permissions still need device testing."
  }
]);
export function searchMayaFeatures(query, limit=54){
 const q=String(query||'').trim().toLocaleLowerCase();
 if(!q)return FEATURES54.slice(0,limit);
 return FEATURES54.filter(f=>
  String(f.id)===q || f.title.toLocaleLowerCase().includes(q) ||
  f.subfeatures.some(s=>s.toLocaleLowerCase().includes(q))
 ).slice(0,Math.max(0,Math.min(54,Number(limit)||54)));
}
export function parseMayaFeatureRequest(input){
 const s=String(input||'').trim().replace(/[।.!?]+$/g,'').replace(/\s+/g,' ').toLocaleLowerCase();
 const prefix=s.match(/^(?:hey\s+)?(?:maya|মায়া|মায়া)\s*[,،:]?\s*/u);
 if(!prefix)return null;
 const t=s.slice(prefix[0].length).trim();
 if(/^(?:show|open|list|display|view)\s+(?:me\s+)?(?:(?:all|full|the)\s+)?(?:(?:54|fifty.four)\s+)?(?:maya\s+)?(?:features|feature\s+list|feature\s+catalog|capabilities)$/.test(t) ||
    /^(?:all\s+)?(?:54\s+)?features$/.test(t) ||
    /(?:সব|সকল|৫৪|54).*(?:ফিচার|ফিচারগুলো).*(?:দেখাও|খোলো|তালিকা)?$/.test(t) ||
    /^(?:ফিচার|ফিচারগুলো)\s*(?:দেখাও|তালিকা|খোলো)$/.test(t)) return {kind:'open',query:''};
 const m=t.match(/^(?:search|find|look up)\s+(?:for\s+)?(?:the\s+)?features?\s+(.+)$/) ||
         t.match(/^(?:feature|ফিচার)\s+(\d{1,2})$/) ||
         t.match(/^ফিচার\s+(?:খুঁজো|খুঁজে দাও|সার্চ)\s+(.+)$/);
 return m?{kind:'search',query:m[1].trim()}:null;
}
