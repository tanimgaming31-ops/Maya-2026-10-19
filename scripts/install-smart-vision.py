"""Install V169's single-page PDF native bridge after Maya's existing scanner installer.
No changes to main Maya sources, original memories, or Android storage permissions.
"""
from pathlib import Path
import shutil
base=Path('android/app/src/main/java/com/tanim/maya')
bridge=base/'MayaBridge.java'
src=Path('native-vision/MayaDocumentPdf.java')
assert bridge.is_file() and src.is_file(), 'Maya Smart Vision prerequisites missing'
shutil.copyfile(src,base/'MayaDocumentPdf.java')
s=bridge.read_text(encoding='utf8')
anchor='    @JavascriptInterface\n    public String visualScan(String action, String imageData) {'
patch='''    @JavascriptInterface
    public String documentPdf(String action, String json) {
        return MayaDocumentPdf.run(act,action,json);
    }

'''
if 'public String documentPdf(' not in s:
    assert s.count(anchor)==1, 'Old Maya visual bridge anchor changed'
    bridge.write_text(s.replace(anchor,patch+anchor,1),encoding='utf8')
print('Maya Smart Vision V169 PDF exporter installed; MediaStore Downloads/Maya, Android 10+.')
