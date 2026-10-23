"""Static source verification; actual Android compiler will test class references."""
from pathlib import Path
import ast
from xml.dom import minidom
p=Path('scripts/install-life-native.py')
ast.parse(p.read_text())
for name in ['MayaShareInbox','MayaHomeWidget','MayaQuickTile']:
    s=Path('native-life/'+name+'.java').read_text()
    assert 'package com.tanim.maya;' in s
assert 'Intent.ACTION_SEND' in Path('native-life/MayaShareInbox.java').read_text()
assert 'text/' in Path('native-life/MayaShareInbox.java').read_text()
assert 'getStringExtra(Intent.EXTRA_TEXT)' in Path('native-life/MayaShareInbox.java').read_text()
assert 'startActivityAndCollapse(pi)' in Path('native-life/MayaQuickTile.java').read_text()
assert 'PendingIntent.FLAG_IMMUTABLE' in Path('native-life/MayaHomeWidget.java').read_text()
for x in ['native-life/maya_home_widget.xml','native-life/maya_widget_info.xml']:
    minidom.parse(x)
assert 'android.permission.BIND_QUICK_SETTINGS_TILE' in p.read_text()
assert 'android.intent.action.SEND' in p.read_text()
assert 'MayaShareInbox.receive(this, intent)' in p.read_text()
print('Maya Life native: widget, quick tile, share intent and battery static checks passed.')
