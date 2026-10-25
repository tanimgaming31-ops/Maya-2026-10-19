"""Patch generated Android sources after install-v54.py; leave Maya originals unchanged."""
from pathlib import Path
import shutil
root=Path('android/app/src/main')
bridge=root/'java/com/tanim/maya/MayaV54Bridge.java'
source=Path('native-local/MayaLocalTools.java')
manifest=root/'AndroidManifest.xml'
assert bridge.exists() and source.exists() and manifest.exists(), 'Maya local installer prerequisites missing'
shutil.copyfile(source,bridge.with_name('MayaLocalTools.java'))
s=bridge.read_text(encoding='utf-8')
anchor='              default:return msg("unsupported","Unknown V54 native action.");'
addition='''              case "LOCAL_DEVICE":
              case "LOCAL_WIFI":
              case "LOCAL_VOLUME_GET":
              case "LOCAL_VOLUME_SET":
              case "LOCAL_FILE_READ":
              case "LOCAL_FILE_DELETE":
              case "LOCAL_DELETE_STATUS":
                return MayaLocalTools.run(ctx,act,action,input);
'''
if 'MayaLocalTools.run(ctx,act,action,input)' not in s:
    assert s.count(anchor)==1, 'Maya V54 native bridge changed'
    bridge.write_text(s.replace(anchor,addition+anchor),encoding='utf-8')
# Reuse the EXISTING "Maya" wake-word voice service. Do not create another listener.
voice=root/'java/com/tanim/maya/MayaV4Controls.java'
assert voice.is_file(), 'Maya V4 background voice missing'
v=voice.read_text(encoding='utf-8')
anchor_voice='        if (MayaV9Tools.voice(ctx, words)) return;'
call='        if (MayaLocalTools.voice(ctx,words)) return;\n'
if call not in v:
    assert v.count(anchor_voice)==1, 'Maya V9 voice chain changed'
    voice.write_text(v.replace(anchor_voice,call+anchor_voice,1),encoding='utf-8')
s=manifest.read_text(encoding='utf-8')
p='<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />'
if p not in s:
    assert '<application' in s
    manifest.write_text(s.replace('<application',p+'\n    <application',1),encoding='utf-8')
print('Installed Maya PC-free local tools into generated Android project.')
