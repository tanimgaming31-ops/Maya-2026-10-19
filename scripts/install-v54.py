"""Maya V54 native patch. Runs after existing V2/V4/V5 and launcher scripts.
Preserves generated source, Android permissions and existing user data."""
from pathlib import Path
import shutil
base=Path('android/app/src/main/java/com/tanim/maya')
main=base/'MainActivity.java'
bridge=base/'MayaBridge.java'
if not main.exists() or not bridge.exists():
    raise SystemExit('Maya Android native tree missing')
for name in ('MayaV54Files.java','MayaV54Bridge.java'):
    source=Path('native-v54')/name
    if not source.is_file():
        raise SystemExit('Missing '+str(source))
    shutil.copyfile(source,base/name)
s=bridge.read_text(encoding='utf-8')
anchor='    @JavascriptInterface\n    public void requestSms() {'
addon='''    /** Scoped Android V54 capabilities; no new broad storage or messaging permission. */
    @JavascriptInterface
    public String v54(String action, String json) {
        return MayaV54Bridge.run(ctx, act, action, json);
    }

'''
if 'public String v54(String action, String json)' not in s:
    if s.count(anchor)!=1:
        raise SystemExit('Native bridge anchor changed')
    s=s.replace(anchor,addon+anchor,1)
    bridge.write_text(s,encoding='utf-8')
s=main.read_text(encoding='utf-8')
needle='    @Override\n    protected void onNewIntent(Intent intent) {'
method='''    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        MayaV54Files.accept(this, requestCode, resultCode, data);
        super.onActivityResult(requestCode, resultCode, data);
    }

'''
if 'MayaV54Files.accept(this, requestCode, resultCode, data)' not in s:
    if s.count(needle)!=1:
        raise SystemExit('MainActivity onNewIntent anchor changed')
    main.write_text(s.replace(needle,method+needle,1),encoding='utf-8')
print('Maya V54 scoped SAF and native facade installed; existing notifications, Android macros, and persistent reminders reused.')
