from pathlib import Path
import shutil
app=Path('android/app/src/main/java/com/tanim/maya')
source=Path('native-visual/MayaVisualScan.java')
assert app.is_dir() and source.is_file()
shutil.copyfile(source,app/'MayaVisualScan.java')
p=Path('android/app/build.gradle')
s=p.read_text()
marker='dependencies {'
assert s.count(marker)==1
deps="""dependencies {
    implementation 'com.google.mlkit:barcode-scanning:17.3.0'
    implementation 'com.google.mlkit:text-recognition:16.0.1'
"""
if 'com.google.mlkit:barcode-scanning:17.3.0' not in s:p.write_text(s.replace(marker,deps,1))

bridge=app/'MayaBridge.java'
b=bridge.read_text(encoding='utf8')
anchor='    @JavascriptInterface\n    public String status() {'
fragment='''    @JavascriptInterface
    public String visualScan(String action, String imageData) {
        return MayaVisualScan.scan(action,imageData);
    }

    @JavascriptInterface
    public String openKeyboardSettings() {
        try {
            android.content.Intent intent=new android.content.Intent(android.provider.Settings.ACTION_INPUT_METHOD_SETTINGS);
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            return "{\\"status\\":\\"opened\\"}";
        } catch(Exception ex) {
            return "{\\"status\\":\\"unavailable\\"}";
        }
    }

'''
if 'public String visualScan(' not in b:
    assert b.count(anchor)==1
    bridge.write_text(b.replace(anchor,fragment+anchor,1),encoding='utf8')

print('ML Kit scanning and keyboard Settings bridge installed.')
