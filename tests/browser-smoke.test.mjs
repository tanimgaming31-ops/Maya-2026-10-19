/* Maya V10 browser smoke test — run with: node tests/browser-smoke.test.mjs (needs local server on :8765) */
import { chromium } from 'playwright';

const URL = 'http://localhost:8765/index.html';
let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.error('FAIL:', name, extra || ''); } };

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push({ text: m.text(), url: (m.location() && m.location().url) || '' }); });
page.on('pageerror', e => errors.push({ text: 'PAGEERROR: ' + e.message, url: '' }));
const notFound = [];
page.on('response', r => { if (r.status() >= 400) notFound.push(r.status() + ' ' + r.url()); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500); // let V8 wire() and init run

t('no page errors on startup', errors.length === 0, errors.slice(0, 5).map(e => e.text + ' @ ' + e.url).join(' | '));

// app initialized
const chip = await page.textContent('#chipText');
t('app UI initialized (chip text present)', !!chip && chip.length > 0, chip);
const micVisible = await page.isVisible('#mic');
t('mic button visible', micVisible);

// V8 wrapper applied: effective runTool should be the wrapped one (stringifies differently than base)
const wired = await page.evaluate(() => typeof runTool === 'function' && typeof toolDeclarations === 'function');
t('runTool/toolDeclarations are global functions', wired);

// effective declarations: V8 tools + new V10 tools, no duplicates
const decls = await page.evaluate(() => {
  const d = toolDeclarations(true)[0].functionDeclarations;
  const names = d.map(x => x.name);
  return { names, dupes: names.filter((n, i) => names.indexOf(n) !== i) };
});
t('effective declarations include V10 tools', ['wikiSummary', 'runTask', 'taskHistory'].every(n => decls.names.includes(n)), decls.names.join(','));
t('effective declarations include V8 getWeather', decls.names.includes('getWeather'));
t('no duplicate tool names', decls.dupes.length === 0, decls.dupes.join(','));

// real Wikipedia call (no key needed)
const wiki = await page.evaluate(() => wikiSummary({ topic: 'Dubai' }));
t('wikiSummary real call returns ok', wiki && wiki.status === 'ok' && wiki.extract.length > 20, JSON.stringify(wiki).slice(0, 200));
const wiki404 = await page.evaluate(() => wikiSummary({ topic: 'zzzznotapagexyz123' }));
t('wikiSummary 404 handled as not_found', wiki404 && wiki404.status === 'not_found', JSON.stringify(wiki404).slice(0, 120));
const wikiBad = await page.evaluate(() => wikiSummary({ topic: '' }));
t('wikiSummary rejects empty topic', wikiBad && wikiBad.status === 'rejected');

// real task run: exactly ONE history entry with findings + plan (string-reference chaining)
const task = await page.evaluate(async () => {
  const r = await TaskEngine.run({ goal: 'Check Dubai info', steps: [
    { summary: 'Look up Dubai on Wikipedia', tool: 'wikiSummary', args: { topic: 'Dubai' } },
    { summary: 'Weather check', tool: 'getWeather', args: { place: '$1.title' } }
  ] });
  const runs = JSON.parse(localStorage.getItem('maya.tasks') || '[]');
  return { r, runCount: runs.length, last: runs[runs.length - 1] };
});
t('runTask real run completes ok', task.r && task.r.status === 'ok' && task.r.taskStatus === 'done', JSON.stringify(task.r).slice(0, 300));
t('runTask $1.title chained into weather', task.r.steps[1] && task.r.steps[1].status === 'done' && /Dubai/.test(task.r.steps[1].result || ''), (task.r.steps[1] || {}).result);
t('exactly one history entry per task', task.runCount === 1, 'runCount=' + task.runCount);
t('history entry has findings + plan', task.last && task.last.plan && task.last.steps.every(s => s.result), JSON.stringify(task.last).slice(0, 200));

// second task -> two entries total
const task2 = await page.evaluate(async () => {
  await TaskEngine.run({ goal: 'Second task', steps: [{ summary: 'Wiki check', tool: 'wikiSummary', args: { topic: 'Paris' } }] });
  return JSON.parse(localStorage.getItem('maya.tasks') || '[]').length;
});
t('second task adds one more entry', task2 === 2, 'count=' + task2);

// taskHistory tool result includes findings
const hist = await page.evaluate(() => recentTaskRuns());
t('taskHistory includes found snippets and plan', hist.length === 2 && hist.every(h => h.steps.some(s => s.found) && h.plan), JSON.stringify(hist[0]).slice(0, 200));

// invalid task: bad tool rejected
const badTask = await page.evaluate(() => TaskEngine.run({ goal: 'g', steps: [{ summary: 's', tool: 'androidAction', args: {} }] }));
t('runTask rejects non-allowlisted tool', badTask && badTask.status === 'rejected');

// busy guard
const busy = await page.evaluate(async () => {
  const p1 = TaskEngine.run({ goal: 'slow', steps: [{ summary: 's', tool: 'wikiSummary', args: { topic: 'Dubai' } }] });
  const p2 = TaskEngine.run({ goal: 'second while busy', steps: [{ summary: 's', tool: 'wikiSummary', args: { topic: 'Paris' } }] });
  const r2 = await p2; await p1;
  return r2.status;
});
t('busy guard prevents overlapping runs', busy === 'busy', busy);

// handleToolCall session binding (stubbed Live socket)
// case A: session replaced before responses ready -> NO response is ever sent to the new session
const session3 = await page.evaluate(async () => {
  const sent = [];
  const realSend = Live.send.bind(Live);
  Live.send = o => { sent.push(JSON.parse(JSON.stringify(o))); return true; };
  const realWs = Live.ws; const realActive = app.active;
  const fakeWs = { readyState: 1, fake: true };
  Live.ws = fakeWs; app.active = true; Live.ready = true;
  try {
    const p = handleToolCall({ functionCalls: [
      { id: 'fc-wiki3', name: 'wikiSummary', args: { topic: 'Dubai' } },
      { id: 'fc-task3', name: 'runTask', args: { goal: 'g', steps: [{ summary: 'w', tool: 'wikiSummary', args: { topic: 'Dubai' } }] } }
    ] });
    Live.ws = { readyState: 1, fake: 3 }; // replaced before any response is ready
    await p;
    return { ids: sent.map(s => s.toolResponse.functionResponses.map(f => f.id)) };
  } finally { Live.ws = realWs; app.active = realActive; Live.ready = false; Live.send = realSend; }
});
t('replaced session receives no responses at all', session3.ids.length === 0, JSON.stringify(session3.ids));

// stable session: fast tool in a mixed message IS answered
const session4 = await page.evaluate(async () => {
  const sent = [];
  const realSend = Live.send.bind(Live);
  Live.send = o => { sent.push(JSON.parse(JSON.stringify(o))); return true; };
  const realWs = Live.ws; const realActive = app.active;
  const fakeWs = { readyState: 1, fake: true };
  Live.ws = fakeWs; app.active = true; Live.ready = true;
  try {
    await handleToolCall({ functionCalls: [
      { id: 'fc-wiki4', name: 'wikiSummary', args: { topic: 'Dubai' } },
      { id: 'fc-task4', name: 'runTask', args: { goal: 'g', steps: [{ summary: 'w', tool: 'wikiSummary', args: { topic: 'Dubai' } }] } }
    ] });
    return { ids: sent.map(s => s.toolResponse.functionResponses.map(f => f.id)) };
  } finally { Live.ws = realWs; app.active = realActive; Live.ready = false; Live.send = realSend; }
});
t('stable session answers both fast tool and task', session4.ids.some(a => a.includes('fc-wiki4')) && session4.ids.some(a => a.includes('fc-task4')), JSON.stringify(session4.ids));

// case D (controlled handshake): socket replaced WHILE a task step is executing.
// The Wikipedia request is intercepted and HELD; once interception is confirmed (no sleeps),
// the socket is replaced, the request is released, and we assert the task completes and
// is logged but its answer is never sent to the replaced session.
let releaseHeld;
const release = new Promise(r => { releaseHeld = r; });
let requestHeld;
const held = new Promise(r => { requestHeld = r; });
await page.route('**/api/rest_v1/page/summary/Maya*', async route => {
  requestHeld();
  await release;
  await route.continue();
});
await page.evaluate(() => {
  window.__midSent = [];
  window.__midRealSend = Live.send.bind(Live);
  Live.send = o => { window.__midSent.push(JSON.parse(JSON.stringify(o))); return true; };
  window.__midRealWs = Live.ws; window.__midRealActive = app.active;
  Live.ws = { readyState: 1, fake: true }; app.active = true; Live.ready = true;
  window.__midP = handleToolCall({ functionCalls: [{ id: 'fc-mid', name: 'runTask', args: { goal: 'mid', steps: [{ summary: 'w', tool: 'wikiSummary', args: { topic: 'Maya civilization' } }] } }] });
});
await Promise.race([held, new Promise((_, rej) => setTimeout(() => rej(new Error('route was not intercepted in time')), 15000))]); // handshake: the step's request is now in flight and held
await page.evaluate(() => { Live.ws = { readyState: 1, fake: 9 }; }); // socket replaced mid-task
releaseHeld(); // let the held request proceed
const midTask = await page.evaluate(async () => {
  await window.__midP;
  const runs = JSON.parse(localStorage.getItem('maya.tasks') || '[]');
  const last = runs[runs.length - 1];
  const ids = window.__midSent.map(s => s.toolResponse.functionResponses.map(f => f.id));
  Live.ws = window.__midRealWs; app.active = window.__midRealActive; Live.ready = false; Live.send = window.__midRealSend;
  return { ids, logged: last && last.status };
});
await page.unroute('**/api/rest_v1/page/summary/Maya*');
t('mid-task socket replacement: task completes + logs, but no stale answer sent', midTask.ids.length === 0 && midTask.logged === 'done', JSON.stringify(midTask));

// case E (controlled): transient network failure on the REAL tool -> one retry, then success
let netAttempts = 0;
await page.route('**/api/rest_v1/page/summary/Tokyo*', async route => {
  netAttempts++;
  if (netAttempts === 1) return route.abort(); // first attempt fails at network level
  await route.continue();
});
const retryTask = await page.evaluate(async () => {
  const r = await TaskEngine.run({ goal: 'Tokyo with network blip', steps: [{ summary: 'w', tool: 'wikiSummary', args: { topic: 'Tokyo' } }] });
  return { status: r.status, taskStatus: r.taskStatus };
});
await page.unroute('**/api/rest_v1/page/summary/Tokyo*');
t('real tool retries once after a network failure', netAttempts === 2 && retryTask.status === 'ok' && retryTask.taskStatus === 'done', JSON.stringify({ netAttempts, retryTask }));

// valid-session case: task answer IS sent on same session
const session2 = await page.evaluate(async () => {
  const sent = [];
  const realSend = Live.send.bind(Live);
  Live.send = o => { sent.push(JSON.parse(JSON.stringify(o))); return true; };
  const realWs = Live.ws; const realActive = app.active;
  const fakeWs = { readyState: 1, fake: true };
  Live.ws = fakeWs; app.active = true; Live.ready = true;
  try {
    await handleToolCall({ functionCalls: [{ id: 'fc-task2', name: 'runTask', args: { goal: 'g', steps: [{ summary: 'w', tool: 'wikiSummary', args: { topic: 'Dubai' } }] } }] });
    return sent.flatMap(s => s.toolResponse.functionResponses.map(f => f.id));
  } finally { Live.ws = realWs; app.active = realActive; Live.ready = false; Live.send = realSend; }
});
t('same-session task answer is delivered', session2.includes('fc-task2'), JSON.stringify(session2));

// fallback-mode dispatch: runTool('runTask') works without Live
const fb = await page.evaluate(async () => {
  const r = await runTool('runTask', { goal: 'fb', steps: [{ summary: 'w', tool: 'wikiSummary', args: { topic: 'Tokyo' } }] });
  return r.status + '/' + r.taskStatus;
});
t('fallback dispatch: runTool(runTask) executes task', fb === 'ok/done', fb);

// startup recovery: mark running -> interrupted
const rec = await page.evaluate(async () => {
  const runs = JSON.parse(localStorage.getItem('maya.tasks') || '[]');
  const target = runs.find(r => r.goal === 'Check Dubai info');
  target.status = 'running';
  localStorage.setItem('maya.tasks', JSON.stringify(runs));
  const changed = TaskEngine.recover();
  const after = JSON.parse(localStorage.getItem('maya.tasks') || '[]').find(r => r.goal === 'Check Dubai info');
  return { changed, status: after.status };
});
t('recover marks interrupted runs', rec.changed === true && rec.status === 'interrupted', JSON.stringify(rec));

// page errors after all interactions (the only allowed 404 console error is the intentional Wikipedia not_found test)
const realErrors = errors.filter(e => !(/zzzznotapagexyz123/.test(e.url) || (/net::ERR_FAILED/.test(e.text) && /summary\/Tokyo/.test(e.url))));
t('no page errors during interactions', realErrors.length === 0, realErrors.slice(0, 5).map(e => e.text + ' @ ' + e.url).join(' | '));
console.log('http >=400 responses (informational):', notFound.slice(0, 5).join(' | ') || 'none');

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
