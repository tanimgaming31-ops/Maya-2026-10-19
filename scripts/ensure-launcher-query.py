import os
from pathlib import Path
from xml.dom import minidom

platform = os.environ.get('CAPACITOR_PLATFORM_NAME', 'android')
if platform != 'android':
    raise SystemExit(0)
path = Path('android/app/src/main/AndroidManifest.xml')
if not path.is_file():
    raise SystemExit('AndroidManifest.xml is missing; create the Android project first')
doc = minidom.parse(str(path))
root = doc.documentElement
if root.tagName != 'manifest':
    raise SystemExit('Unexpected manifest root')
ns = 'http://schemas.android.com/apk/res/android'
queries = next((n for n in root.childNodes if n.nodeType == n.ELEMENT_NODE and n.tagName == 'queries'), None)
if queries is None:
    queries = doc.createElement('queries')
    app = next((n for n in root.childNodes if n.nodeType == n.ELEMENT_NODE and n.tagName == 'application'), None)
    root.insertBefore(queries, app)

def matches(intent):
    actions = intent.getElementsByTagName('action')
    categories = intent.getElementsByTagName('category')
    return any(n.getAttributeNS(ns, 'name') == 'android.intent.action.MAIN' for n in actions) and any(n.getAttributeNS(ns, 'name') == 'android.intent.category.LAUNCHER' for n in categories)

if not any(matches(n) for n in queries.getElementsByTagName('intent')):
    intent = doc.createElement('intent')
    for tag, value in [('action', 'android.intent.action.MAIN'), ('category', 'android.intent.category.LAUNCHER')]:
        node = doc.createElement(tag)
        node.setAttributeNS(ns, 'android:name', value)
        intent.appendChild(node)
    queries.appendChild(intent)
    xml = doc.toxml(encoding='utf-8')
    minidom.parseString(xml)
    path.write_bytes(xml)
print('Android MAIN/LAUNCHER visibility query verified; no QUERY_ALL_PACKAGES permission added.')
