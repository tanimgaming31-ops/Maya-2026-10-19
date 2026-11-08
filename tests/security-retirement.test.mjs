/* Regression: user explicitly removed Maya Vault PIN and Owner Guard Security On.
 * Do not erase existing Memory Packs or unrelated Android/API security. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const p of [
  'maya-features/private-vault.js',
  'maya-features/owner-guard-v174.js',
  'native-owner/MayaOwnerGuard.java',
  'scripts/install-owner-guard.py',
  'tests/owner-guard-v174.test.mjs',
  'tests/owner-guard-native-check.py',
  'tests/private-vault.test.mjs'
]) assert.equal(existsSync(new URL('../'+p,import.meta.url)),false,'Removed feature must not ship: '+p);
const loader=read('maya-features/advanced-loader.js');
const workflow=read('.github/workflows/build-apk.yml');
const index=read('index.html');
const sw=read('sw.js');
assert.ok(!loader.includes("import './private-vault.js'"));
assert.ok(!loader.includes("import './owner-guard-v174.js'"));
assert.ok(!workflow.includes('install-owner-guard.py'));
assert.ok(!workflow.includes('MayaOwnerGuard'));
assert.ok(!workflow.includes('USE_BIOMETRIC'));
assert.ok(!workflow.includes("'./maya-features/private-vault.js'"));
assert.ok(!index.includes('Search/PIN/Enable packs'));
assert.ok(sw.includes('maya-security-features-removed-20261108'));
assert.ok(workflow.includes('maya-security-features-removed-20261108'));
assert.ok(existsSync(new URL('../maya-features/memory-v2.js',import.meta.url)));
assert.ok(existsSync(new URL('../maya-features/whatsapp-voice-flow.js',import.meta.url)));
assert.ok(index.includes('id="keyInput"')&&index.includes('type="password"'),'Gemini key input retained (not an app PIN)');
console.log('Maya security-feature removal: Vault/Owner Guard absent, cached assets refreshed, Memory Packs and API key controls preserved. Phone install still requires verification.');
