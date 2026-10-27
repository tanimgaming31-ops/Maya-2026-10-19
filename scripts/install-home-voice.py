"""Install only bounded local smart home Java bridge in generated Android app.
Preserve earlier Maya versions, contacts, private avatar, local memories and existing handlers.
"""
from pathlib import Path
import shutil
root=Path("android/app/src/main")
app=root/"java/com/tanim/maya"
bridge=app/"MayaBridge.java"
manifest=root/"AndroidManifest.xml"
source=Path("native-home/MayaHomeControl.java")
assert bridge.is_file() and manifest.is_file() and source.is_file()
shutil.copyfile(source,app/"MayaHomeControl.java")
s=bridge.read_text(encoding="utf8")
anchor='    @JavascriptInterface\n    public String documentPdf(String action, String json) {'
patch='''    /** Only consent-first, private LAN smart relay and router browser navigation. */
    @JavascriptInterface
    public String homeControl(String action, String json) {
        return MayaHomeControl.execute(ctx,act,action,json);
    }

'''
if "public String homeControl(" not in s:
    assert s.count(anchor)==1, "Original Document PDF bridge anchor changed"
    bridge.write_text(s.replace(anchor,patch+anchor,1),encoding="utf8")
s=manifest.read_text(encoding="utf8")
if 'android:usesCleartextTraffic="true"' not in s:
    # Supported Shelly/Tasmota device APIs are LAN HTTP, not TLS. Native code
    # enforces RFC1918 literals and disallows redirects/arbitrary endpoints.
    assert s.count("<application")==1
    manifest.write_text(s.replace("<application",'<application android:usesCleartextTraffic="true"',1),encoding="utf8")
print("Maya LAN Home bridge installed. Local HTTP is opt-in; no credentials, open relay discovery or public-IP requests.")
