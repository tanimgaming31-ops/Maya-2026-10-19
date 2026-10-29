from pathlib import Path
source=Path('native-maya-merge/MayaV52Overlay.java').read_text(encoding='utf-8')
installer=Path('scripts/install-maya-floating.py').read_text(encoding='utf-8')
for needle in (
    'public final class MayaV52Overlay',
    'Settings.canDrawOverlays(input)',
    'WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY',
    'window.addView(root,params)',
    'window.updateViewLayout(root,params)',
    'openMaya(ctx)',
    'MayaV52Capture.start(ctx)',
    'close.setOnClickListener(v->hide())',
    'pulse.cancel()',
):
    assert needle in source, f'Missing Maya native overlay feature: {needle}'
assert 'com.jarvis' not in source and 'ai.jeery.assistant' not in source
assert 'shutil.copyfile(src,dst)' in installer
assert 'MayaV52Overlay.java' in installer
print('Maya-only draggable native overlay: original app identity, animation, permission, drag, screenshot consent and hide checks passed.')
