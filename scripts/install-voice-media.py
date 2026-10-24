"""Maya voice screenshot + YouTube autoplay native upgrade. Additive post setup-native patch.
Existing MediaProjection plugin, prior V4 controls, V54 and memories stay intact.
"""
from pathlib import Path
import shutil
base=Path("android/app/src/main")
src=base/"java/com/tanim/maya"
bridge=src/"MayaBridge.java"
voice=src/"MayaV4Controls.java"
service=base/"res/xml/maya_v4_accessibility.xml"
assert all(p.is_file() for p in (bridge,voice,service)), "Native V4 voice or bridge not generated"
shutil.copyfile("native-voice-media/MayaVoiceMedia.java",src/"MayaVoiceMedia.java")
s=bridge.read_text(encoding="utf-8")
anchor="    @JavascriptInterface\n    public void requestSms() {"
addition="""    /** Explicit voice screenshot and bounded YouTube playback APIs. */
    @JavascriptInterface
    public String mediaVoice(String action, String json) {
        return MayaVoiceMedia.control(ctx, act, action, json);
    }

"""
if "public String mediaVoice(String action, String json)" not in s:
    if s.count(anchor)!=1:raise SystemExit("MayaBridge method anchor moved")
    bridge.write_text(s.replace(anchor,addition+anchor,1),encoding="utf-8")
s=service.read_text(encoding="utf-8")
if 'android:canTakeScreenshot="true"' not in s:
    anchor='android:canPerformGestures="true"'
    if s.count(anchor)!=1:raise SystemExit("Accessibility screenshot capability anchor missing")
    service.write_text(s.replace(anchor,anchor+'\n android:canTakeScreenshot="true"',1),encoding="utf-8")
s=voice.read_text(encoding="utf-8")
before='        if ("V4_PLAY_SEARCH".equals(action)) {'
after='        if ("V4_STATUS".equals(action))'
a=s.find(before);b=s.find(after,a)
if a<0 or b<0:raise SystemExit("V4 YouTube source anchors changed")
replacement="""        if ("V4_PLAY_SEARCH".equals(action)) {
            return MayaVoiceMedia.search(ctx,args.optString("query",""));
        }
        if ("V4_PLAY_STATUS".equals(action)) {
            return MayaVoiceMedia.videoStatus();
        }
"""
s=s[:a]+replacement+s[b:]
anchor="        String words = all.substring(wake.length()).trim();"
line=anchor+'\n        if (MayaVoiceMedia.handleSpoken(ctx, words)) return;'
if line not in s:
    if s.count(anchor)!=1:raise SystemExit("Native voiceCommand anchor changed")
    s=s.replace(anchor,line,1)
voice.write_text(s,encoding="utf-8")
if "MayaVoiceMedia.handleSpoken(ctx, words)" not in s:raise SystemExit("Native voice command routing missing")
if 'android:canTakeScreenshot="true"' not in service.read_text(encoding='utf-8'):raise SystemExit("Accessibility screenshot not enabled")
print("Maya voice media: Accessibility screen capture to Gallery; YouTube matching-video auto-tap and native voice commands installed.")
