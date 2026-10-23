"""Add read-only launcher enumeration and a user-initiated open bridge.
Runs after setup-native.sh and install-life-native.py, before Capacitor sync.
Do not add QUERY_ALL_PACKAGES or alter existing Maya native commands.
"""
from pathlib import Path
import shutil

base = Path("android/app/src/main")
java = base / "java/com/tanim/maya"
bridge = java / "MayaBridge.java"
catalog = java / "MayaAppCatalog.java"
manifest = base / "AndroidManifest.xml"
if not bridge.is_file() or not manifest.is_file():
    raise SystemExit("Maya native bridge/manifest missing; abort")

s = bridge.read_text(encoding="utf-8")
anchor = "    @JavascriptInterface\n    public void requestSms() {"
addition = """    /** Only launchable apps visible to Maya on Android. */
    @JavascriptInterface
    public String listLaunchableApps() {
        return MayaAppCatalog.list(ctx);
    }

    /** User-selected pair is revalidated by native Android before launching. */
    @JavascriptInterface
    public String launchListedApp(String packageName, String activityName) {
        return MayaAppCatalog.launch(ctx, packageName, activityName);
    }

"""
if "public String listLaunchableApps()" not in s:
    if s.count(anchor) != 1:
        raise SystemExit("MayaBridge bridge method anchor changed; patch cancelled")
    s = s.replace(anchor, addition + anchor, 1)
    bridge.write_text(s, encoding="utf-8")

shutil.copyfile("native-app-launcher/MayaAppCatalog.java", catalog)

# The existing scripts/ensure-launcher-query.py adds the minimal MAIN/LAUNCHER
# package visibility declaration. Refuse to build an unqueryable launcher.
from xml.dom import minidom
doc = minidom.parse(str(manifest))
root = doc.documentElement
queries = root.getElementsByTagName("queries")
if not queries:
    raise SystemExit("Expected <queries> MAIN/LAUNCHER was not installed")
ns = "http://schemas.android.com/apk/res/android"
intents = queries[0].getElementsByTagName("intent")
if not any(
    any(a.getAttributeNS(ns, "name") == "android.intent.action.MAIN"
        for a in node.getElementsByTagName("action"))
    and any(c.getAttributeNS(ns, "name") == "android.intent.category.LAUNCHER"
        for c in node.getElementsByTagName("category"))
    for node in intents
):
    raise SystemExit("Android MAIN/LAUNCHER package visibility query missing")
if "QUERY_ALL_PACKAGES" in manifest.read_text(encoding="utf-8"):
    raise SystemExit("Reject broad package visibility permission")

print("Maya named-app launcher installed: visible launcher activities only; no broad app permission.")
