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
print('ML Kit libraries and visual decoder are installed.')
