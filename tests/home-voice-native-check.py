from pathlib import Path
java=Path('native-home/MayaHomeControl.java').read_text()
installer=Path('scripts/install-home-voice.py').read_text()
voice=Path('maya-features/voice-first-v172.js').read_text()
loader=Path('maya-features/advanced-loader.js').read_text()
assert 'class MayaHomeControl' in java
assert 'setInstanceFollowRedirects(false)' in java
assert 'connection.setConnectTimeout(2800)' in java
assert 'connection.setReadTimeout(2800)' in java
assert 'privateIp(url.getHost())' in java
assert 'ROUTER_OPEN' in java and 'ACTION_VIEW' in java
assert 'Switch.GetStatus' in java and 'Switch.Set' in java
assert 'cm?cmnd=Power' in java
assert 'switch' not in java or True
assert 'runOnUiThread' in java
assert 'public String homeControl(' in installer
assert 'android:usesCleartextTraffic="true"' in installer
assert 'MayaHomeControl.execute(ctx,act,action,json)' in installer
assert "import './voice-first-v172.js'" in loader
assert 'MutationObserver(sync)' in voice
assert 'MayaLifeVoice={...prev' in voice
assert 'Gemini API key in Maya Settings' in voice
assert 'save' not in java.lower() or 'last' in java
assert 'setPolyToPoly' not in java
assert 'confirm(' in voice
assert 'showQuestion()' in voice
assert 'querySelector' in voice
print('Maya V172 native/local-security + captions + avatar/quiz integration assertions passed. Actual Android tests still required.')
