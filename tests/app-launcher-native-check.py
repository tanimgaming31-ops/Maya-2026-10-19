"""Static safety checks for the *real* Android launcher bridge; Gradle compiles Java."""
from pathlib import Path
import ast
script=Path('scripts/install-app-launcher.py').read_text(encoding='utf-8')
ast.parse(script)
java=Path('native-app-launcher/MayaAppCatalog.java').read_text(encoding='utf-8')
bridge=Path('setup-native.sh').read_text(encoding='utf-8')
query=Path('scripts/ensure-launcher-query.py').read_text(encoding='utf-8')
assert 'queryIntentActivities' in java and 'Intent.CATEGORY_LAUNCHER' in java
assert 'Intent.makeMainActivity' in java and 'startActivity(launch)' in java
assert 'packageName.equals(app.optString("packageName"))' in java
assert 'activityName.equals(app.optString("activityName"))' in java
assert 'public String listLaunchableApps()' in script and 'public String launchListedApp(' in script
assert 'Manifest.permission.QUERY_ALL_PACKAGES' not in java
assert 'android.permission.QUERY_ALL_PACKAGES' not in java
assert 'getInstalledPackages(' not in java
assert 'QUERY_ALL_PACKAGES permission added' in query or 'QUERY_ALL_PACKAGES' in query
assert '    public void requestSms() {' in bridge
assert not any(token in java for token in ['SEND_SMS','AccessibilityService','Runtime.exec','getInstalledApplications'])
print('Maya App Launcher: scoped app visibility, native bridge and consent-free list static checks passed.')
