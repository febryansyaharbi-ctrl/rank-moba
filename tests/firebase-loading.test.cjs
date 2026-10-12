const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const html = readFileSync('index.html', 'utf8');
const source = html.slice(html.indexOf("        const loadingScreen = "), html.indexOf("        const canvas = document.getElementById('webgl-bg');"));
function element() {
  const classes = new Set();
  return { textContent: '', classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, on) => on ? classes.add(c) : classes.delete(c), contains: c => classes.has(c) }, setAttribute() {}, append() {} };
}
async function setup(authError) {
  const loading = element(), listeners = {}, nodes = [];
  const window = { validPins: [], configReady: false, siteContent: { title: 'Default', stats: [] }, renderAll() {}, location: { reload() {} } };
  const context = { window, document: { getElementById: () => loading, createElement: () => { const e = element(); nodes.push(e); return e; }, body: { appendChild() {} } }, console: { error() {} }, setTimeout: () => 1, clearTimeout() {}, auth: {}, signInAnonymously: () => authError ? Promise.reject(authError) : Promise.resolve(), getColRef: n => n, getDocRef: () => 'config', onSnapshot: (ref, ok, fail) => { listeners[ref] = { ok, fail }; } };
  vm.runInNewContext(source, context);
  await Promise.resolve(); await Promise.resolve();
  return { window, loading, listeners, panel: nodes[0], text: nodes[1] };
}
const empty = { docs: [] };
test('configuration alone does not dismiss loading of rankings', async () => {
  const s = await setup();
  s.listeners.config.ok({ exists: () => true, data: () => ({ siteContent: { title: 'Live' }, validPins: ['server-pin'] }) });
  assert.equal(s.loading.classList.contains('hidden'), false);
  for (const n of ['players', 'guilds', 'rewards']) s.listeners[n].ok(empty);
  assert.equal(s.loading.classList.contains('hidden'), true);
  assert.equal(s.window.siteContent.title, 'Live');
  assert.equal(s.window.configReady, true);
});
test('denied reads remain visible together and configuration fails closed', async () => {
  const s = await setup();
  s.window.validPins = ['old-pin']; s.window.configReady = true;
  for (const n of ['players', 'guilds', 'rewards', 'config']) s.listeners[n].fail({ code: 'permission-denied' });
  assert.equal(s.loading.classList.contains('hidden'), true);
  assert.equal(s.panel.classList.contains('hidden'), false);
  assert.match(s.text.textContent, /Data pemain/); assert.match(s.text.textContent, /Data tim/); assert.match(s.text.textContent, /Data reward/); assert.match(s.text.textContent, /Konfigurasi website/);
  assert.equal(s.window.validPins.length, 0); assert.equal(s.window.configReady, false);
});
test('missing config uses defaults without any database write', async () => {
  const s = await setup();
  s.listeners.config.ok({ exists: () => false });
  assert.equal(s.window.siteContent.title, 'Default');
  assert.equal(s.window.configReady, false); assert.equal(s.window.validPins.length, 0);
  assert.match(s.text.textContent, /belum tersedia/);
});
test('malformed fields do not replace valid defaults or PIN arrays', async () => {
  const s = await setup();
  s.listeners.config.ok({ exists: () => true, data: () => ({ siteContent: { title: null, stats: 'bad' }, validPins: '1234' }) });
  assert.equal(s.window.siteContent.title, 'Default'); assert.equal(s.window.siteContent.stats.length, 0);
  assert.equal(s.window.validPins.length, 0);
});
test('auth errors stop loading and retain a useful error code', async () => {
  const s = await setup({ code: 'auth/operation-not-allowed' });
  assert.equal(s.loading.classList.contains('hidden'), true);
  assert.match(s.text.textContent, /auth\/operation-not-allowed/);
});
