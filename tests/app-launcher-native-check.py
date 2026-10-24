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
bg=Path('native-app-launcher/MayaBackgroundLaunch.java').read_text(encoding='utf-8')
icon=Path('native-app-launcher/maya_launch_notify.xml').read_text(encoding='utf-8')
assert 'PendingIntent.getActivity' in bg and 'FLAG_IMMUTABLE' in bg
assert 'getBroadcast' not in bg and 'getService(' not in bg  # no notification trampoline
assert 'registerActivityLifecycleCallbacks' in bg and 'onActivityResumed' in bg
assert 'MayaBackgroundLaunch.notifyLaunch' in java and 'isForeground()' in java
assert 'MayaBackgroundLaunch.watch(this);' in script
assert 'requestLaunchNotifications' in script and 'POST_NOTIFICATIONS' in script
assert 'maya_launch_notify.xml' in script
assert 'মায়া অ্যাপ লঞ্চ' in bg and 'ট্যাপ করে ' in bg  # Bengali notification copy
assert 'availability(' in bg and 'areNotificationsEnabled' in bg
assert '<vector' in icon and 'pathData' in icon
assert 'QUERY_ALL_PACKAGES' not in bg
assert not any(token in bg for token in ['AccessibilityService','Runtime.exec','getInstalledPackages('])
print('Maya App Launcher: scoped app visibility, native bridge, consent-free list and background-launch static checks passed.')
