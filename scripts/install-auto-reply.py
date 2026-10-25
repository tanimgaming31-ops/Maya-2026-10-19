"""Install Maya allowlisted WhatsApp/IMO Notification Auto Reply.
Do not edit setup-native.sh source. Patch only generated Android tree after setup.
"""
from pathlib import Path
import shutil
base=Path('android/app/src/main/java/com/tanim/maya')
notify=base/'MayaNotificationService.java'
bridge=base/'MayaBridge.java'
assert notify.exists() and bridge.exists(), 'Original Maya notification service and JavaScript bridge required'
shutil.copyfile('native-auto-reply/MayaAutoReply.java',base/'MayaAutoReply.java')
s=notify.read_text(encoding='utf-8')
old='        MayaBridge.emit(m.toJson());'
new='''        MayaBridge.emit(m.toJson());
        // Explicitly approved contact only. No fallback to auto-send when RemoteInput is absent.
        MayaAutoReply.onMessage(this,sbn,m);'''
if 'MayaAutoReply.onMessage(this,sbn,m);' not in s:
    if s.count(old)!=1:raise SystemExit('Notification listener changed; cannot safely attach auto reply')
    s=s.replace(old,new,1);notify.write_text(s,encoding='utf-8')
s=bridge.read_text(encoding='utf-8')
old='    @JavascriptInterface\n    public void requestSms() {'
new='''    /** Saved Android-native opt-in rules survive closing Maya; no Gemini message uploads. */
    @JavascriptInterface
    public String autoReply(String action, String json) {
        return MayaAutoReply.control(ctx, action, json);
    }

'''+old
if 'public String autoReply(String action, String json)' not in s:
    if s.count(old)!=1:raise SystemExit('MayaBridge anchor changed')
    s=s.replace(old,new,1);bridge.write_text(s,encoding='utf-8')
assert 'MayaAutoReply.onMessage' in notify.read_text(encoding='utf-8')
print('Maya native WhatsApp/IMO allowlisted notification auto reply added without changing existing permissions.')
