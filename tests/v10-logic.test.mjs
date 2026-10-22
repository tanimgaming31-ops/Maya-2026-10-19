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
  { summary: 'Look up Dubai', tool: 'wikiSummary', args: { topic: { $ref: { step: 1, path: ['place'] } } } }
] };
t('validateTaskPlan ok', api.validateTaskPlan(goodPlan).ok === true);
t('validateTaskPlan normalizes steps', api.validateTaskPlan(goodPlan).p.steps.length === 2);
t('plan rejects missing goal', api.validateTaskPlan({ steps: goodPlan.steps }).ok === false);
t('plan rejects 5 steps', api.validateTaskPlan({ goal: 'g', steps: [1, 2, 3, 4, 5].map(() => ({ summary: 's', tool: 'searchWeb', args: { query: 'q' } })) }).ok === false);
t('plan rejects unknown tool', api.validateTaskPlan({ goal: 'g', steps: [{ summary: 's', tool: 'androidAction', args: {} }] }).ok === false);
t('plan rejects $ref to a LATER step', api.validateTaskPlan({ goal: 'g', steps: [
  { summary: 's1', tool: 'wikiSummary', args: { topic: { $ref: { step: 2, path: ['x'] } } } },
  { summary: 's2', tool: 'searchWeb', args: { query: 'q' } }
] }).ok === false);
t('plan rejects unsafe $ref path', api.validateTaskPlan({ goal: 'g', steps: [
  { summary: 's1', tool: 'searchWeb', args: { query: 'q' } },
  { summary: 's2', tool: 'searchWeb', args: { query: { $ref: { step: 1, path: ['__proto__', 'polluted'] } } } }
] }).ok === false);
t('plan rejects empty path', api.validateTaskPlan({ goal: 'g', steps: [
  { summary: 's1', tool: 'searchWeb', args: { query: 'q' } },
  { summary: 's2', tool: 'searchWeb', args: { query: { $ref: { step: 1, path: [] } } } }
] }).ok === false);
t('plan rejects array args', api.validateTaskPlan({ goal: 'g', steps: [{ summary: 's', tool: 'searchWeb', args: [] }] }).ok === false);
t('plan rejects missing summary', api.validateTaskPlan({ goal: 'g', steps: [{ tool: 'searchWeb', args: {} }] }).ok === false);

/* 4. reference resolution */
const results = [{ status: 'ok', place: 'Dubai, United Arab Emirates', now: { tempC: 30 } }];
t('resolveStepRefs resolves nested path', api.resolveStepRefs({ q: { $ref: { step: 1, path: ['now', 'tempC'] } } }, results).q === 30);
t('resolveStepRefs resolves top-level key', api.resolveStepRefs({ place: { $ref: { step: 1, path: ['place'] } } }, results).place === 'Dubai, United Arab Emirates');
t('resolveStepRefs rejects prototype path', (() => { try { api.resolveStepRefs({ q: { $ref: { step: 1, path: ['__proto__'] } } }, results); return false; } catch (e) { return true; } })());
t('resolveStepRefs throws on missing path', (() => { try { api.resolveStepRefs({ q: { $ref: { step: 1, path: ['nope'] } } }, results); return false; } catch (e) { return true; } })());
t('resolveStepRefs passes literals through', eq(api.resolveStepRefs({ a: 1, b: 'x' }, results), { a: 1, b: 'x' }));
t('safeGetPath rejects out-of-range array index', (() => { try { api.resolveStepRefs({ q: { $ref: { step: 1, path: [0] } } }, [ { status: 'ok' } ]); return false; } catch (e) { return true; } })());

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
  // happy path: 2 steps, second uses a $ref into the first result
  let r = await api.runTaskPlan(api.validateTaskPlan(goodPlan).p.steps, async (tool, a) => tool === 'getWeather'
    ? { status: 'ok', place: 'Dubai', tempC: 31 }
    : { status: 'ok', title: a.topic });
  t('runTaskPlan happy path done', r.run.status === 'done' && r.run.steps.every(s => s.status === 'done'));
  t('runTaskPlan passes $ref value to next step', r.results[1].title === 'Dubai');

  // retry once on transient failure, then succeed
  let calls = 0;
  r = await api.runTaskPlan([{ summary: 's', tool: 'searchWeb', args: { query: 'q' } }], async () => { if (++calls === 1) throw new Error('network blip'); return { status: 'ok', answer: 'x' }; });
  t('runTaskPlan retries transient failure once', calls === 2 && r.run.status === 'done');

  // hard failure stops the run and marks later steps skipped
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

  // invalid resolved args (object where text expected) rejected without executing the tool
  let executed = 0;
  r = await api.runTaskPlan([{ summary: 's1', tool: 'searchWeb', args: { query: 'q' } }, { summary: 's2', tool: 'wikiSummary', args: { topic: { $ref: { step: 1, path: ['meta'] } } } }],
    async (tool) => { executed++; return tool === 'searchWeb' ? { status: 'ok', answer: 'x', meta: { a: 1 } } : { status: 'ok' }; });
  t('runTaskPlan rejects non-text resolved args before execution', executed === 1 && r.run.status === 'failed' && r.run.steps[1].status === 'rejected');

  // overall run deadline stops remaining steps
  r = await api.runTaskPlan(
    [1, 2, 3].map(i => ({ summary: 's' + i, tool: 'searchWeb', args: { query: 'q' } })),
    async () => { await new Promise(res => setTimeout(res, 30)); return { status: 'ok' }; },
    { totalDeadlineMs: 40, stepTimeoutMs: 2000 });
  t('runTaskPlan enforces overall deadline', r.run.status === 'timeout' && r.run.steps.some(s => s.status === 'skipped'));
};
await run();

/* 6. regression: existing action validation still works */
t('validateAction OPEN_APP still ok', api.validateAction({ action: 'OPEN_APP', app: 'whatsapp' }, Date.now(), new Set()).ok === true);
t('validateAction rejects unknown action', api.validateAction({ action: 'FLY_TO_MOON' }, Date.now(), new Set()).ok === false);
t('validateAction timer bounds still enforced', api.validateAction({ action: 'START_TIMER', seconds: 99999999 }, Date.now(), new Set()).ok === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
