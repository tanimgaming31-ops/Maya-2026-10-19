import os
import shutil
from pathlib import Path
from xml.dom import minidom
if os.environ.get('CAPACITOR_PLATFORM_NAME', 'android') != 'android':
    raise SystemExit(0)
base = Path('android/app/src/main')
java = base / 'java/com/tanim/maya'
activity = java / 'MainActivity.java'
s = activity.read_text(encoding='utf-8')
marker = 'registerPlugin(MayaScreenshot.class);'
if marker not in s:
    target = 'super.onCreate(savedInstanceState);'
    if s.count(target) != 1:
        raise SystemExit('Unexpected MainActivity: screenshot integration aborted')
    s = s.replace(target, marker + '\n        ' + target, 1)
for name in ['MayaScreenshot.java', 'MayaCaptureService.java']:
    shutil.copyfile(Path('native-screenshot') / name, java / name)
activity.write_text(s, encoding='utf-8')
path = base / 'AndroidManifest.xml'
doc = minidom.parse(str(path))
root = doc.documentElement
ns = 'http://schemas.android.com/apk/res/android'
for permission in ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION']:
    if not any(n.getAttributeNS(ns, 'name') == permission for n in root.getElementsByTagName('uses-permission')):
        n = doc.createElement('uses-permission')
        n.setAttributeNS(ns, 'android:name', permission)
        root.appendChild(n)
app = root.getElementsByTagName('application')[0]
name = 'com.tanim.maya.MayaCaptureService'
service = next((n for n in app.getElementsByTagName('service') if n.getAttributeNS(ns, 'name') == name), None)
if service is None:
    service = doc.createElement('service')
    service.setAttributeNS(ns, 'android:name', name)
    app.appendChild(service)
service.setAttributeNS(ns, 'android:exported', 'false')
service.setAttributeNS(ns, 'android:foregroundServiceType', 'mediaProjection')
xml = doc.toxml(encoding='utf-8')
minidom.parseString(xml)
path.write_bytes(xml)
print('Maya screenshot plugin registered and foreground service declared.')
