"""Idempotent post-Capacitor integration; run AFTER setup-native and screenshot."""
from pathlib import Path
from xml.dom import minidom
import shutil

base=Path('android/app/src/main')
java=base/'java/com/tanim/maya'
main=java/'MainActivity.java'
bridge=java/'MayaBridge.java'
assert main.is_file() and bridge.is_file(), 'Native base files not generated'
s=main.read_text(encoding='utf-8')
for before,after in [
    ('MayaBridge.setNudge(getIntent());','MayaBridge.setNudge(getIntent());\n        MayaShareInbox.receive(this, getIntent());'),
    ('MayaBridge.setNudge(intent);','MayaBridge.setNudge(intent);\n        MayaShareInbox.receive(this, intent);')]:
    if after not in s:
        if s.count(before)!=1:raise SystemExit('Unexpected MainActivity lifecycle; no unsafe patch')
        s=s.replace(before,after,1)
main.write_text(s,encoding='utf-8')

s=bridge.read_text(encoding='utf-8')
anchor='    @JavascriptInterface\n    public void requestSms() {'
extra='''    /** Shared text is returned once and cleared; never auto-sent to Gemini. */
    @JavascriptInterface
    public String takeSharedText() {
        return MayaShareInbox.take(ctx);
    }

    /** Battery status without invasive permissions. */
    @JavascriptInterface
    public String batteryStatus() {
        try {
            Intent i = ctx.registerReceiver(null, new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (i==null) return "{}";
            int level=i.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL,-1);
            int scale=i.getIntExtra(android.os.BatteryManager.EXTRA_SCALE,-1);
            int charge=i.getIntExtra(android.os.BatteryManager.EXTRA_STATUS,-1);
            if (level<0||scale<=0) return "{}";
            JSONObject data=new JSONObject();
            data.put("percent",Math.round(level*100f/scale));
            data.put("charging",charge==android.os.BatteryManager.BATTERY_STATUS_CHARGING
                ||charge==android.os.BatteryManager.BATTERY_STATUS_FULL);
            return data.toString();
        } catch(Exception e) { return "{}"; }
    }

'''
if 'public String takeSharedText()' not in s:
    if s.count(anchor)!=1:raise SystemExit('MayaBridge method anchor missing, patch stopped')
    s=s.replace(anchor,extra+anchor,1)
bridge.write_text(s,encoding='utf-8')
for name in ['MayaShareInbox.java','MayaHomeWidget.java','MayaQuickTile.java']:
    shutil.copyfile(Path('native-life')/name,java/name)
layout=base/'res/layout';layout.mkdir(parents=True,exist_ok=True)
widgets=base/'res/xml';widgets.mkdir(parents=True,exist_ok=True)
shutil.copyfile('native-life/maya_home_widget.xml',layout/'maya_home_widget.xml')
shutil.copyfile('native-life/maya_widget_info.xml',widgets/'maya_widget_info.xml')
manifest=base/'AndroidManifest.xml'
doc=minidom.parse(str(manifest))
root=doc.documentElement
app=root.getElementsByTagName('application')[0]
ns='http://schemas.android.com/apk/res/android'
def set_android(node,name,value):node.setAttributeNS(ns,'android:'+name,value)
def has_name(element,tag,name):return any(n.getAttributeNS(ns,'name')==name for n in element.getElementsByTagName(tag))
# Register only a limited plain-text share target; no broad storage permission.
activities=app.getElementsByTagName('activity')
activity=next((a for a in activities if a.getAttributeNS(ns,'name') in ('.MainActivity','com.tanim.maya.MainActivity')),None)
if activity is None:raise SystemExit('Maya MainActivity missing; cannot register share target')
if not any(any(n.getAttributeNS(ns,'name')=='android.intent.action.SEND' for n in f.getElementsByTagName('action')) for f in activity.getElementsByTagName('intent-filter')):
    filt=doc.createElement('intent-filter')
    act=doc.createElement('action');set_android(act,'name','android.intent.action.SEND');filt.appendChild(act)
    category=doc.createElement('category');set_android(category,'name','android.intent.category.DEFAULT');filt.appendChild(category)
    data=doc.createElement('data');set_android(data,'mimeType','text/plain');filt.appendChild(data)
    activity.appendChild(filt)
# Widget.
if not has_name(app,'receiver','com.tanim.maya.MayaHomeWidget'):
    receiver=doc.createElement('receiver');set_android(receiver,'name','com.tanim.maya.MayaHomeWidget');set_android(receiver,'exported','true')
    filt=doc.createElement('intent-filter');act=doc.createElement('action');set_android(act,'name','android.appwidget.action.APPWIDGET_UPDATE');filt.appendChild(act);receiver.appendChild(filt)
    meta=doc.createElement('meta-data');set_android(meta,'name','android.appwidget.provider');set_android(meta,'resource','@xml/maya_widget_info');receiver.appendChild(meta)
    app.appendChild(receiver)
# Quick Settings Tile.
if not has_name(app,'service','com.tanim.maya.MayaQuickTile'):
    service=doc.createElement('service');set_android(service,'name','com.tanim.maya.MayaQuickTile');set_android(service,'label','Maya');set_android(service,'icon','@mipmap/ic_launcher');set_android(service,'exported','true');set_android(service,'permission','android.permission.BIND_QUICK_SETTINGS_TILE')
    filt=doc.createElement('intent-filter');act=doc.createElement('action');set_android(act,'name','android.service.quicksettings.action.QS_TILE');filt.appendChild(act);service.appendChild(filt)
    app.appendChild(service)
xml=doc.toxml(encoding='utf-8');minidom.parseString(xml);manifest.write_bytes(xml)
assert 'takeSharedText()' in bridge.read_text(encoding='utf-8')
assert 'MayaShareInbox.receive(this, intent)' in main.read_text(encoding='utf-8')
print('Native Maya Share inbox, battery bridge, home widget and quick tile installed.')
