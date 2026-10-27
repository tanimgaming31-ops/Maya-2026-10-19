/* Maya V10 logic tests — run with: node tests/v10-logic.test.mjs */
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/\/\/#LOGIC-START([\s\S]*?)\/\/#LOGIC-END/);
if (!m) { console.error('FAIL: LOGIC section not found'); process.exit(1); }
const logic = m[1];
const api = new Function(logic + `
  return { DEFAULT_LIVE, DEFAULT_TEXT, pickTextModels, pickLiveModels, validateWikiArgs, validateTaskPlan, validateStepArgs, resolveStepRefs, runTaskPlan, validateAction, TASK_STEP_TOOLS };`)();

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', name); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* 1. model list: the two Live models retiring 2026-11-17 must be gone */
t('DEFAULT_LIVE has no retiring models', !api.DEFAULT_LIVE.includes('gemini-3.1-flash-live-preview') && !api.DEFAULT_LIVE.includes('gemini-2.5-flash-native-audio-preview-12-2025'));
t('DEFAULT_LIVE keeps gemini-3.8-live first', api.DEFAULT_LIVE[0] === 'gemini-3.8-live');
t('DEFAULT_TEXT includes gemini-4-argon fallback', api.DEFAULT_TEXT.includes('gemini-4-argon'));
t('pickTextModels prefers flash over flagship', api.pickTextModels([
  { name: 'models/gemini-4-argon', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }
])[0] === 'gemini-3.8-flash');
t('pickTextModels adds flagship as fallback', api.pickTextModels([
  { name: 'models/gemini-4-argon', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }
]).includes('gemini-4-argon'));
t('pickTextModels keeps flagship reachable with many flash models', (() => {
  const list = api.pickTextModels([
    { name: 'models/gemini-4-argon', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] }
  ]);
  return list.length <= 3 && list.includes('gemini-4-argon');
})());
t('pickLiveModels still excludes thinking variants', !api.pickLiveModels([
  { name: 'models/gemini-3.8-live', supportedGenerationMethods: ['bidiGenerateContent'] },
  { name: 'models/gemini-3.8-live-extended-thinking', supportedGenerationMethods: ['bidiGenerateContent'] }
]).includes('gemini-3.8-live-extended-thinking'));

/* 2. wikiSummary validation */
t('validateWikiArgs ok', api.validateWikiArgs({ topic: 'Albert Einstein' }).ok === true);
t('validateWikiArgs default lang en', api.validateWikiArgs({ topic: 'x' }).p.lang === 'en');
t('validateWikiArgs rejects empty topic', api.validateWikiArgs({ topic: '' }).ok === false);
t('validateWikiArgs rejects bad lang', api.validateWikiArgs({ topic: 'x', lang: 'fr' }).ok === false);

/* 3. task plan validation */
const goodPlan = { goal: 'Weather and info about Dubai', steps: [
  { summary: 'Get Dubai weather', tool: 'getWeather', args: { place: 'Dubai' } },
  { summary: 'Look up Dubai', tool: 'wikiSummary', args: { topic: '$1.place' } }
] };
t('validateTaskPlan ok', api.validateTaskPlan(goodPlan).ok === true);
t('validateTaskPlan normalizes steps', api.validateTaskPlan(goodPlan).p.steps.length === 2);
t('plan rejects missing goal', api.validateTaskPlan({ steps: goodPlan.steps }).ok === false);
t('plan rejects 5 steps', api.validateTaskPlan({ goal: 'g', steps: [1, 2, 3, 4, 5].map(() => ({ summary: 's', tool: 'searchWeb', args: { query: 'q' } })) }).ok === false);
t('plan rejects unknown tool', api.validateTaskPlan({ goal: 'g', steps: [{ summary: 's', tool: 'androidAction', args: {} }] }).ok === false);
t('plan rejects reference to a LATER step', api.validateTaskPlan({ goal: 'g', steps: [
  { summary: 's1', tool: 'wikiSummary', args: { topic: '$2.x' } },
  { summary: 's2', tool: 'searchWeb', args: { query: 'q' } }
] }).ok === false);
t('plan rejects reference on the FIRST step', api.validateTaskPlan({ goal: 'g', steps: [
  { summary: 's1', tool: 'wikiSummary', args: { topic: '$1.x' } }
] }).ok === false);
t('plan rejects unsafe reference path', api.validateTaskPlan({ goal: 'g', steps: [
  { summary: 's1', tool: 'searchWeb', args: { query: 'q' } },
  { summary: 's2', tool: 'searchWeb', args: { query: '$1.__proto__' } }
] }).ok === false);
t('plan rejects malformed reference string', api.validateTaskPlan({ goal: 'g', steps: [
  { summary: 's1', tool: 'searchWeb', args: { query: 'q' } },
  { summary: 's2', tool: 'searchWeb', args: { query: '$1.' } }
] }).ok === false);
t('plan rejects object values in args', api.validateTaskPlan({ goal: 'g', steps: [{ summary: 's', tool: 'wikiSummary', args: { topic: { $ref: { step: 1 } } } }] }).ok === false);
t('plan rejects missing summary', api.validateTaskPlan({ goal: 'g', steps: [{ tool: 'searchWeb', args: {} }] }).ok === false);

/* 4. reference resolution */
const results = [{ status: 'ok', place: 'Dubai, United Arab Emirates', now: { tempC: 30 } }];
t('resolveStepRefs resolves dotted path', api.resolveStepRefs({ topic: '$1.now.tempC' }, results).topic === '30');
t('resolveStepRefs resolves top-level key', api.resolveStepRefs({ place: '$1.place' }, results).place === 'Dubai, United Arab Emirates');
t('resolveStepRefs keeps literal strings (even $ prices)', api.resolveStepRefs({ query: '$5 off' }, results).query === '$5 off');
t('resolveStepRefs rejects prototype path', (() => { try { api.resolveStepRefs({ q: '$1.__proto__' }, results); return false; } catch (e) { return true; } })());
t('resolveStepRefs throws on missing path', (() => { try { api.resolveStepRefs({ q: '$1.nope' }, results); return false; } catch (e) { return true; } })());
t('resolveStepRefs throws on non-text referenced value', (() => { try { api.resolveStepRefs({ q: '$1.now' }, results); return false; } catch (e) { return true; } })());
t('resolveStepRefs rejects object values', (() => { try { api.resolveStepRefs({ q: { a: 1 } }, results); return false; } catch (e) { return true; } })());
t('resolveStepRefs passes literals through', eq(api.resolveStepRefs({ a: 1, b: 'x', c: true }, results), { a: 1, b: 'x', c: true }));
t('safeGetPath rejects out-of-range array index', (() => { try { api.resolveStepRefs({ q: '$1.0' }, [{ status: 'ok' }]); return false; } catch (e) { return true; } })());

/* 4b. resolved step-arg validation (before execution) */
t('validateStepArgs ok for weather', api.validateStepArgs('getWeather', { place: 'Dubai' }) === null);
t('validateStepArgs ok with no args for weather', api.validateStepArgs('getWeather', {}) === null);
t('validateStepArgs rejects object as topic', api.validateStepArgs('wikiSummary', { topic: { nested: true } }) !== null);
t('validateStepArgs rejects missing query', api.validateStepArgs('searchWeb', {}) !== null);
t('validateStepArgs rejects number as query', api.validateStepArgs('searchWeb', { query: 42 }) !== null);
t('validateStepArgs rejects unknown key', api.validateStepArgs('getWeather', { launch: 'x' }) !== null);
t('validateStepArgs rejects array args', api.validateStepArgs('searchWeb', []) !== null);

/* 5. workflow orchestration (runTaskPlan with fake executor) */
const run = async () => {
  // happy path: 2 steps, second uses a reference string into the first result
  let r = await api.runTaskPlan(api.validateTaskPlan(goodPlan).p.steps, async (tool, a) => tool === 'getWeather'
    ? { status: 'ok', place: 'Dubai', tempC: 31 }
    : { status: 'ok', title: a.topic });
  t('runTaskPlan happy path done', r.run.status === 'done' && r.run.steps.every(s => s.status === 'done'));
  t('runTaskPlan resolves reference string for next step', r.results[1].title === 'Dubai');

  // retry once on transient THROWN failure, then succeed
  let calls = 0;
  r = await api.runTaskPlan([{ summary: 's', tool: 'searchWeb', args: { query: 'q' } }], async () => { if (++calls === 1) throw new Error('network blip'); return { status: 'ok', answer: 'x' }; });
  t('runTaskPlan retries transient failure once', calls === 2 && r.run.status === 'done');

  // retry once on a NON-THROWING transient error result (how the real tools report network failures)
  let n2 = 0;
  r = await api.runTaskPlan([{ summary: 's', tool: 'wikiSummary', args: { topic: 'x' } }], async () => { n2++; return n2 === 1 ? { status: 'error', reason: 'Wikipedia lookup failed: TypeError: Failed to fetch' } : { status: 'ok', title: 'x' }; });
  t('runTaskPlan retries non-throwing transient errors', n2 === 2 && r.run.status === 'done');

  // searchWeb reports transient failures as status 'search_unavailable' — also retried
  let n4 = 0;
  r = await api.runTaskPlan([{ summary: 's', tool: 'searchWeb', args: { query: 'q' } }], async () => { n4++; return n4 === 1 ? { status: 'search_unavailable', reason: 'Live grounded search was not available: Cannot reach Google. Check your internet.' } : { status: 'ok', answer: 'x' }; });
  t('runTaskPlan retries search_unavailable network failures', n4 === 2 && r.run.status === 'done');

  // NON-transient error results are NOT retried (validation-style failures)
  let n3 = 0;
  r = await api.runTaskPlan([{ summary: 's', tool: 'getWeather', args: {} }], async () => { n3++; return { status: 'needs_info', reason: 'which city?' }; });
  t('runTaskPlan does not retry rejected steps', n3 === 1 && r.run.status === 'failed');

  // no retry for non-ok results (executor returns non-ok, no throw)
  r = await api.runTaskPlan([
    { summary: 's1', tool: 'searchWeb', args: { query: 'q' } },
    { summary: 's2', tool: 'searchWeb', args: { query: 'q' } }
  ], async () => ({ status: 'error', reason: 'down' }));
  t('runTaskPlan failure skips dependent steps', r.run.status === 'failed' && r.run.steps[1].status === 'skipped');

  // step timeout triggers retry then fails
  r = await api.runTaskPlan([{ summary: 's', tool: 'searchWeb', args: { query: 'q' } }], () => new Promise(() => {}), { stepTimeoutMs: 30 });
  t('runTaskPlan enforces step deadline', r.run.status === 'failed' && r.run.steps[0].status === 'failed');

  // no retry for validation-style rejections (executor returns non-ok, no throw)
  let n = 0;
  r = await api.runTaskPlan([{ summary: 's', tool: 'getWeather', args: {} }], async () => { n++; return { status: 'needs_info', reason: 'which city?' }; });
  t('runTaskPlan does not retry rejected steps', n === 1 && r.run.status === 'failed');

  // onProgress checkpoints fire per step
  const seen = [];
  await api.runTaskPlan([{ summary: 'a', tool: 'searchWeb', args: { query: 'q' } }, { summary: 'b', tool: 'searchWeb', args: { query: 'q' } }],
    async () => ({ status: 'ok' }), { onProgress: run => seen.push(run.steps.map(s => s.status).join(',')) });
  t('runTaskPlan reports progress', seen.length >= 4);

  // non-retryable errors fail immediately (one attempt only)
  let hard = 0;
  r = await api.runTaskPlan([{ summary: 's', tool: 'searchWeb', args: { query: 'q' } }], async () => { hard++; throw new Error('TypeError: something is undefined'); });
  t('runTaskPlan does not retry programming errors', hard === 1 && r.run.status === 'failed');

  // invalid resolved args (reference resolving to a non-text value) rejected without executing the tool
  let executed = 0;
  r = await api.runTaskPlan([{ summary: 's1', tool: 'searchWeb', args: { query: 'q' } }, { summary: 's2', tool: 'wikiSummary', args: { topic: '$1.meta' } }],
    async (tool) => { executed++; return tool === 'searchWeb' ? { status: 'ok', answer: 'x', meta: { a: 1 } } : { status: 'ok' }; });
  t('runTaskPlan rejects non-text resolved args before execution', executed === 1 && r.run.status === 'failed' && r.run.steps[1].status === 'rejected');

  // expired budget: NO further executor invocation (the retry loop stops before invoking)
  let invocations = 0;
  r = await api.runTaskPlan(
    [1, 2].map(i => ({ summary: 's' + i, tool: 'searchWeb', args: { query: 'q' } })),
    async () => { invocations++; await new Promise(res => setTimeout(res, 40)); return { status: 'ok' }; },
    { totalDeadlineMs: 60, stepTimeoutMs: 5000 });
  t('expired budget never starts another attempt', invocations === 2 && r.run.status === 'failed' && /budget exhausted/.test(r.run.steps[1].result || ''), JSON.stringify({ invocations, steps: r.run.steps.map(s => s.status) }));
};
await run();

/* 6. regression: existing action validation still works */
t('validateAction OPEN_APP still ok', api.validateAction({ action: 'OPEN_APP', app: 'whatsapp' }, Date.now(), new Set()).ok === true);

for(const name of ['Binance','CapCut','Moto Camera','My Fitness App','ক্যালকুলেটর','Photos Editor']){
 const r=api.validateAction({action:'OPEN_APP',app:name},Date.now(),new Set());
 t('OPEN_APP accepts native installed app label: '+name,r.ok===true&&r.p.app===name);
}
for(const bad of ['','A','https://bad.example/','com.example.app','intent://app','bad\napp', 'X'.repeat(101)]){
 const r=api.validateAction({action:'OPEN_APP',app:bad},Date.now(),new Set());
 t('OPEN_APP rejects unsafe/unusable name: '+JSON.stringify(bad),r.ok===false);
}

t('validateAction rejects unknown action', api.validateAction({ action: 'FLY_TO_MOON' }, Date.now(), new Set()).ok === false);
t('validateAction timer bounds still enforced', api.validateAction({ action: 'START_TIMER', seconds: 99999999 }, Date.now(), new Set()).ok === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
