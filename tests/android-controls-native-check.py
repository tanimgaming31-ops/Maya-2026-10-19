from pathlib import Path
s=Path('native-controls/MayaAndroidControls.java').read_text()
installer=Path('scripts/install-android-controls.py').read_text()
ui=Path('maya-features/android-controls-v167.js').read_text()
assert 'getPersistedUriPermissions()' in s
assert 'maya_v54_files' in s
assert 'MAX_FILES=240' in s and 'MAX_HASH_BUDGET' in s
assert 'MessageDigest.getInstance("SHA-256")' in s
assert 'MAX_HASH_FILE' in s
assert 'DocumentsContract.buildChildDocumentsUriUsingTree' in s
assert 'DocumentsContract.deleteDocument' not in s
assert '.delete(' not in s
assert 'requestPermissions(permissions,7167)' in s
assert 'Manifest.permission.BLUETOOTH_SCAN' in s
assert 'Manifest.permission.BLUETOOTH_CONNECT' in s
assert 'BluetoothDevice.TRANSPORT_LE' in s
assert 'stopScanLocked()' in s
assert 'activity' in s and 'hasWindowFocus()' in s
assert 'MayaV54Files.choose(activity)' in s
assert 'public String androidControls' in installer
assert 'native-controls/MayaAndroidControls.java' in installer
assert 'android.permission.BLUETOOTH_CONNECT' in installer
assert 'const prior={...window.MayaLifeVoice}' in ui
assert 'navigator.mediaDevices.getUserMedia' in ui
assert "scanImage('receipt'" in ui
assert "scanImage('barcode'" in ui
assert 'navigator.clipboard.readText()' in ui
assert "confirm('Send this selected clipboard text to Google Gemini" in ui
assert "confirm('Connect to the discovered BLE GATT device" in ui
print('Maya Android Controls V167 safety/integration static checks passed; APK/device not proven yet.')
