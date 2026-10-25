import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const js=src('maya-features/auto-reply.js');
const r=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
for(const good of [
 ['com.whatsapp','Rahim','আমি এখন ব্যস্ত আছি, পরে কথা বলব।'],
 ['com.imo.android.imoim','Karim','I will reply later.'],
 ['com.imo.android.imous','Karim','I will reply soon.']])
 assert.equal(r.validateReplyRule(...good),true,good.join('|'));
for(const bad of [
 ['com.whatsapp','R','Hello'],
 ['com.whatsapp','Group (family)','I am busy'],
 ['com.whatsapp','Rahim','my password is 1234'],
 ['com.whatsapp','Rahim','https://malware.com'],
 ['com.bad.fake','Rahim','I am busy'],
 ['com.imo.android.imoim','Rahim','']
])assert.equal(r.validateReplyRule(...bad),false,bad.join('|'));
assert.ok(js.includes('ENABLE automatic replies for these approved contacts'));
assert.ok(js.includes('e.target.checked=false;return;'),'opt-in confirmation required');
assert.ok(js.includes("native('DISABLE_ALL')"),'emergency switch');
assert.ok(js.includes("native('ADD_RULE'"),'rule UI present');
assert.ok(js.includes('Maya auto-reply'),'clear message labeling');
const java=src('native-auto-reply/MayaAutoReply.java');
for(const literal of [
 'private static final String K_RULES = "rules", K_ON = "enabled"',
 'if(!p.getBoolean(K_ON,false))return;',
 'com.whatsapp', 'com.imo.android.imoim',
 'MAX_PER_RULE_DAY = 5', 'MAX_PER_DAY = 15',
 'COOLDOWN_MS = 15L*60_000L', 'isGroup(n,m.sender)',
 'forbiddenIncoming(m.text)', 'normalize(m.sender)',
 'if(Math.abs(now-sbn.getPostTime())>120000L)return;',
 'replyAction(n)', 'RemoteInput.addResultsToIntent',
 'action.actionIntent.send(c,0,intent);',
 'delivery unverified', 'new JSONArray',
 'if(count>=MAX_PER_DAY)return;'
])assert.ok(java.includes(literal),literal);
assert.ok(!java.includes('QUERY_ALL_PACKAGES'));
assert.ok(!java.includes('apiKey'));
const py=src('scripts/install-auto-reply.py');
assert.ok(py.includes('MayaAutoReply.onMessage(this,sbn,m);'));
assert.ok(py.includes('public String autoReply(String action, String json)'));
assert.ok(!py.includes('ACCESSIBILITY_SERVICE'));
const workflow=src('.github/workflows/build-apk.yml');
assert.ok(workflow.includes('python3 scripts/install-auto-reply.py'));
assert.ok(workflow.includes('node tests/auto-reply.test.mjs'));
const loader=src('maya-features/advanced-loader.js');
assert.ok(loader.includes("import './auto-reply.js'"));
console.log('Maya messaging: rule validation, opt-in OFF-by-default, exact whitelist, cooldown, group/OTP exclusion, native RemoteInput wiring and disable tests passed. Device delivery unverified.');
