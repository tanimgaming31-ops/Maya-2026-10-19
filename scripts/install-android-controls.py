"""Add Maya Android Controls V167 to generated Android build; no original assets replaced."""
from pathlib import Path
import shutil

root=Path('android/app/src/main')
base=root/'java/com/tanim/maya'
bridge=base/'MayaBridge.java'
manifest=root/'AndroidManifest.xml'
source=Path('native-controls/MayaAndroidControls.java')
assert bridge.is_file() and manifest.is_file() and source.is_file(), 'Android Controls prerequisites missing'
shutil.copyfile(source,base/'MayaAndroidControls.java')

s=bridge.read_text(encoding='utf8')
anchor='    @JavascriptInterface\n    public String visualScan(String action, String imageData) {'
method='''    /** Explicit foreground Android controls; all results are reported, never assumed. */
    @JavascriptInterface
    public String androidControls(String action, String json) {
        return MayaAndroidControls.run(ctx,act,action,json);
    }

'''
if 'public String androidControls(' not in s:
    assert s.count(anchor)==1, 'Existing native visualScan bridge changed'
    bridge.write_text(s.replace(anchor,method+anchor,1),encoding='utf8')

s=manifest.read_text(encoding='utf8')
perms='''    <!-- BLE user-selected scanning/connection; classic audio profile pairing not included -->
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
'''
if 'android.permission.BLUETOOTH_SCAN' not in s:
    assert s.count('<application')==1, 'Manifest application anchor changed'
    manifest.write_text(s.replace('<application',perms+'    <application',1),encoding='utf8')
print('Maya Android Controls V167 installed: scoped storage, BLE GATT, foreground clipboard.')
