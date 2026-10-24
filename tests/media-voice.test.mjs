import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
let voice=read('maya-features/voice-screenshot.js');
let parser=read('maya-features/voice-media.js');
parser=parser.replace(/^import [^\n]+\n/gm,"");
const combined=voice.replace(/^export /gm,'')+'\n'+parser.replace(/^export /gm,'')+'\nreturn {parseMediaCommand,isScreenshotCommand};';
const {parseMediaCommand,isScreenshotCommand}=new Function(combined)();
for(const t of [
 'Maya take a screenshot','মায়া স্ক্রিনশট নাও',
 'মায়া স্ক্রিনশট নিয়ে গ্যালারিতে সেভ করো','মায়া স্ক্রিনশট তোলো',
 'মায়া স্ক্রিনশট করো','মায়া স্ক্রিনশট করে দাও','মায়া স্ক্রিনের ছবি তোলো',
])assert.deepEqual(parseMediaCommand(t),{kind:'screenshot'},t);
for(const [speech,title] of [
 ['Maya play YouTube Bengali relaxing music','Bengali relaxing music'],
 ['Maya youtube play NASA space documentary','NASA space documentary'],
 ['মায়া ইউটিউবে রবীন্দ্রসংগীত চালাও','রবীন্দ্রসংগীত'],
 ['মায়া ইউটিউবে আমার সোনার বাংলা ভিডিও চালাও','আমার সোনার বাংলা'],
])assert.deepEqual(parseMediaCommand(speech),{kind:'video',query:title},speech);
for(const speech of ['screenshot secretly','Maya send bank money','YouTube play music','মায়া ইউটিউব খোলো',
 'Maya screenshot my password','Maya play YouTube','Maya delete videos']){
 assert.equal(parseMediaCommand(speech),null,speech);
}
assert.ok(parser.includes("if(r.status==='saved')return show('Screenshot saved"));
assert.ok(parser.includes("native('SCREEN_CAPTURE')"));
assert.ok(parser.includes("native('SCREEN_DIAG')"));
assert.ok(parser.includes("native('SCREEN_ENABLE',{enabled:true})"));
assert.ok(parser.includes('Diagnose Android Screenshot Permissions'));
assert.ok(parser.includes('Fallback: Android screen-sharing permission prompt'));
assert.ok(parser.includes('requestScreenshot()'));
assert.ok(parser.includes("screenshotPlugin.status()"));
assert.ok(parser.includes("native('VIDEO_SEARCH'"));
const screen=read('native-voice-media/MayaVoiceMedia.java');
for(const q of ['takeScreenshot(Display.DEFAULT_DISPLAY','MayaV4AccessService.active',
 'MediaStore.Images.Media.RELATIVE_PATH','Pictures/Maya','Bitmap.wrapHardwareBuffer',
 'MediaStore.Images.Media.IS_PENDING','android.graphics.Bitmap', 'videoStatus="pending"',
 'AccessibilityNodeInfo.ACTION_CLICK','"com.google.android.youtube"','CAPTURING.compareAndSet(false,true)',
 'getSharedPreferences(PREF,0).getBoolean(OPT_IN,false)',
 'SCREEN_DIAG','CAPABILITY_CAN_TAKE_SCREENSHOT','ERROR_TAKE_SCREENSHOT_NO_ACCESSIBILITY_ACCESS']) assert.ok(screen.includes(q),q);
const install=read('scripts/install-voice-media.py');
for(const q of ['MayaV4Controls.java','MayaVoiceMedia.handleSpoken','android:canTakeScreenshot="true"',
 'MayaVoiceMedia.handleSpoken(ctx, words)','public String mediaVoice(String action, String json)'])
 assert.ok(install.includes(q),q);
const loader=read('maya-features/advanced-loader.js');
assert.ok(loader.includes("import './voice-media.js'"));
assert.ok(loader.includes("import './voice-media-bridge.js'"));
const bridge=read('maya-features/voice-media-bridge.js');
assert.ok(bridge.includes('consumeLive(text)') && bridge.includes('consumeTyped(text)'));
assert.ok(bridge.includes('old')&&bridge.includes('return live(text)'));
console.log('Maya voice media: screenshot Gallery, safe YouTube title tap, speech routes and native capabilities static checks passed (device tests remain required).');
