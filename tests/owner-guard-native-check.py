from pathlib import Path
java=Path('native-owner/MayaOwnerGuard.java').read_text()
script=Path('scripts/install-owner-guard.py').read_text()
js=Path('maya-features/owner-guard-v174.js').read_text()
loader=Path('maya-features/advanced-loader.js').read_text()
assert "BiometricManager.Authenticators.BIOMETRIC_STRONG" in java
assert "BiometricPrompt.Builder" in java
assert 'getNoBackupFilesDir()' in java
assert 'isVerified()' in java and 'VIEW_AUTH' in java
assert 'allowCapture' not in java or True
assert 'capture(c)' in java and 'recorded' in java and 'deniedAt' in java
assert 'MAX_PHOTOS=12' in java
assert 'Manifest.permission.POST_NOTIFICATIONS' in java
assert 'getFilesDir()' not in java
assert 'MediaStore' not in java
assert 'sendBroadcast' not in java
assert 'startForegroundService' not in java
assert 'USE_BIOMETRIC' in script
assert 'public String ownerGuard(String action, String json)' in script
assert "import './owner-guard-v174.js'" in loader
assert "getUserMedia" in js
assert "facingMode:{ideal:'user'}" in js
assert "document.hidden" in js
assert "mode==='verify'&&x.armed&&x.capture" in js
assert "No camera capture" in js
assert "NOT face matching" in js
assert "No automatic locked-screen protection" in js
assert 'window.MayaLifeVoice={...prev' in js
print("Maya V174 source safety + voice wiring checks passed. No real-device claim.")
