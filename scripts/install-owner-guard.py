"""Install Maya Owner Guard only into the generated Android APK tree.
No broad storage, accessibility, device admin or background camera permission.
"""
from pathlib import Path
import shutil
base=Path("android/app/src/main")
java=base/"java/com/tanim/maya"
bridge=java/"MayaBridge.java"
manifest=base/"AndroidManifest.xml"
source=Path("native-owner/MayaOwnerGuard.java")
assert bridge.is_file() and manifest.is_file() and source.is_file()
shutil.copyfile(source,java/"MayaOwnerGuard.java")
s=bridge.read_text(encoding="utf8")
anchor='    @JavascriptInterface\n    public String homeControl(String action, String json) {'
snippet='''    /** Opt-in Android strong biometric + visible camera snapshot. Foreground only. */
    @JavascriptInterface
    public String ownerGuard(String action, String json) {
        return MayaOwnerGuard.run(act, action, json);
    }

'''
if "public String ownerGuard(" not in s:
    assert s.count(anchor)==1, "Maya Home native bridge changed"
    bridge.write_text(s.replace(anchor,snippet+anchor,1),encoding="utf8")
m=manifest.read_text(encoding="utf8")
if 'android.permission.USE_BIOMETRIC' not in m:
    assert m.count("<application")==1, "Android manifest anchor changed"
    m=m.replace("<application",'<uses-permission android:name="android.permission.USE_BIOMETRIC" />\n    <application',1)
    manifest.write_text(m,encoding="utf8")
print("Maya Owner Guard V174: foreground strong biometric bridge and app-private no-backup photos installed.")
