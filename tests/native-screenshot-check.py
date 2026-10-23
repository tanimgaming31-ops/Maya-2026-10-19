"""Static install and consent checks; Android compilation runs separately."""
from pathlib import Path
import ast
for f in ['scripts/install-screenshot.py','scripts/ensure-launcher-query.py']:
    ast.parse(Path(f).read_text(encoding='utf-8'))
p=Path('native-screenshot/MayaScreenshot.java').read_text(encoding='utf-8')
s=Path('native-screenshot/MayaCaptureService.java').read_text(encoding='utf-8')
i=Path('scripts/install-screenshot.py').read_text(encoding='utf-8')
q=Path('scripts/ensure-launcher-query.py').read_text(encoding='utf-8')
v=Path('maya-features/voice-screenshot.js').read_text(encoding='utf-8')
assert '@CapacitorPlugin(name = "MayaScreenshot")' in p
assert 'MediaProjectionManager' in p and 'Activity.RESULT_OK' in p
assert 'FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION' in s and 'startForeground(' in s
assert 'MediaStore.Images.Media.IS_PENDING' in s
assert 'registerPlugin(MayaScreenshot.class);' in i
assert 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION' in i
assert "'android.intent.category.LAUNCHER'" in q and 'QUERY_ALL_PACKAGES' not in q
assert 'Confirm screenshot' in v and '30000' in v
assert 'typeof document' in v
print('Native screenshot: consent, saving, launcher and plugin static checks passed.');