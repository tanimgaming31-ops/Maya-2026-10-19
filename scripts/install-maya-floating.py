"""Replace only the existing Maya V5.2 floating shortcut with an original,
draggable Maya icon. No Jerry package or assistant assets are installed."""
from pathlib import Path
import shutil
src=Path('native-maya-merge/MayaV52Overlay.java')
dst=Path('android/app/src/main/java/com/tanim/maya/MayaV52Overlay.java')
assert src.is_file() and dst.is_file(), 'Maya original overlay was not generated'
old=dst.read_text(encoding='utf-8')
assert 'class MayaV52Overlay' in old and 'static synchronized void show(' in old
shutil.copyfile(src,dst)
print('Maya floating shortcut improved in original APK; Jerry app not installed.')
