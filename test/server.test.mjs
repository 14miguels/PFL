import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import { createApp } from '../server/index.mjs';
import { runQuestion, checkGhc, GHC_MISSING_MSG } from '../server/haskell.mjs';
import { bank, bankFile, byId } from './helpers.mjs';

let app; let base; let dir;
const H = { 'Content-Type': 'application/json', 'X-PFL': '1' };
const post = (p, body, headers = H) => fetch(base + p, { method: 'POST', headers, body: JSON.stringify(body) });
const put = (p, body) => fetch(base + p, { method: 'PUT', headers: H, body: JSON.stringify(body) });
const ref = (id) => byId(id).refs[0].code;

before(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'pfl-data-'));
  app = createApp({ dataDir: dir, bankFile });
  base = `http://127.0.0.1:${await app.listen()}`;
});
after(() => app.close());

test('GET /api/bank não revela respostas, soluções nem valores esperados', async () => {
  const pub = await (await fetch(`${base}/api/bank`)).json();
  assert.equal(pub.questions.length, bank.questions.length);
  const txt = JSON.stringify(pub);
  for (const q of pub.questions) {
    assert.ok(!q.refs && !q.verify && !q.testHelpers);
    if (q.type === 'theory') assert.deepEqual(Object.keys(q.answer), ['status']);
    else for (const t of q.tests) assert.deepEqual(Object.keys(t).sort(), ['label', 'origin']);
  }
  assert.ok(!txt.includes(ref('demoA-B01').split('\n')[2]), 'o código da solução de referência não aparece no JSON público');
});

test('/api/run: solução de referência passa; solução errada falha; erro de compilação é reportado', async () => {
  const id = 'demoA-B01';
  const ok = await (await post('/api/run', { questionId: id, code: ref(id) })).json();
  assert.equal(ok.compileError, null);
  assert.ok(ok.results.every((r) => r.status === 'PASS'));
  const bad = await (await post('/api/run', { questionId: id, code: 'sumSquares :: [Int] -> Int\nsumSquares xs = sum xs\n' })).json();
  assert.ok(bad.results.some((r) => r.status === 'FAIL'));
  assert.ok(bad.results.find((r) => r.status === 'FAIL').expect, 'falhas trazem o valor esperado');
  const ce = await (await post('/api/run', { questionId: id, code: 'sumSquares xs = ' })).json();
  assert.ok(ce.compileError && /Erro de sintaxe|solucao\.hs/.test(ce.compileError), ce.compileError);
  assert.ok(ce.results.every((r) => r.status === 'NOT_RUN'));
  const ce2 = await (await post('/api/run', { questionId: id, code: 'sumSquares :: [Int] -> Int\nsumSquares xs = foo xs\n' })).json();
  assert.match(ce2.compileError, /solucao\.hs:2:\d+.*not in scope|Variable not in scope/s);
});

test('/api/run: ciclo infinito num teste dá TIMEOUT/ERR sem bloquear o servidor', async () => {
  const t0 = Date.now();
  const r = await (await post('/api/run', { questionId: 'demoA-B01', code: 'sumSquares :: [Int] -> Int\nsumSquares xs = sumSquares xs\n' })).json();
  const st = r.results.map((x) => x.status);
  assert.ok(st.every((x) => ['TIMEOUT', 'ERR', 'NOT_RUN'].includes(x)), JSON.stringify(st));
  assert.ok(r.timedOut || st.some((x) => x === 'TIMEOUT' || x === 'ERR'), JSON.stringify(st));
  assert.ok(Date.now() - t0 < 30000);
});

test('/api/run: restrições são verificadas sem impedir o resultado dos testes', async () => {
  const code = 'evensDoubled :: [Int] -> [Int]\nevensDoubled xs = map (*2) (filter even xs)\n';
  const r = await (await post('/api/run', { questionId: 'demoA-B03', code })).json();
  assert.ok(r.results.every((x) => x.status === 'PASS'), 'funciona…');
  assert.deepEqual(r.constraints.filter((c) => !c.ok).map((c) => c.kind), ['require-comprehension'], '…mas viola a técnica imposta');
});

test('/api/run: código auxiliar do contexto (needs) e tipos fornecidos ficam disponíveis', async () => {
  const r = await (await post('/api/run', { questionId: 'demoA-B06', code: ref('demoA-B06') })).json();
  assert.equal(r.compileError, null);
  assert.ok(r.results.every((x) => x.status === 'PASS'), JSON.stringify(r.results));
});

test('/api/run: IO (stdout) é comparado exatamente', async () => {
  const id = 'demoB-B01';
  const good = await (await post('/api/run', { questionId: id, code: ref(id) })).json();
  assert.ok(good.results.every((r) => r.status === 'PASS'), JSON.stringify(good));
  const bad = await (await post('/api/run', { questionId: id, code: ref(id).replace('": "', '" = "') })).json();
  assert.ok(bad.results.some((r) => r.status === 'FAIL'));
});

test('/api/run: comparação de conjuntos ignora a ordem', async () => {
  const code = 'neighbors :: [(Int, Int)] -> Int -> [Int]\nneighbors es v = reverse ([b | (a, b) <- es, a == v] ++ [a | (a, b) <- es, b == v])\n';
  const r = await (await post('/api/run', { questionId: 'demoB-B02', code })).json();
  assert.ok(r.results.every((x) => x.status === 'PASS'), JSON.stringify(r.results));
});

test('/api/run valida a entrada', async () => {
  assert.equal((await post('/api/run', { questionId: 'nao-existe', code: 'x' })).status, 404);
  assert.equal((await post('/api/run', { questionId: 'demoA-A01', code: 'x' })).status, 404, 'teoria não é executável');
  assert.equal((await post('/api/run', { questionId: 'demoA-B01', code: 5 })).status, 400);
  assert.equal((await post('/api/run', { questionId: 'demoA-B01', code: 'x'.repeat(100_001) })).status, 400);
});

test('/api/reveal devolve respostas e soluções com o seu estado', async () => {
  const r = await (await post('/api/reveal', { ids: ['demoA-A01', 'demoB-A02', 'demoA-A06', 'demoA-B01', 'nada'] })).json();
  assert.deepEqual([r['demoA-A01'].answer.value, r['demoA-A01'].answer.status], ['b', 'confirmed']);
  assert.equal(r['demoB-A02'].answer.status, 'unknown');
  assert.equal(r['demoA-A06'].answer.status, 'unofficial');
  assert.equal(r['demoA-B01'].refs[0].status, 'unofficial');
  assert.ok(!('nada' in r));
});

test('segurança: rejeita host/origem estranhos, escritas sem cabeçalhos próprios e ids perigosos', async () => {
  const noHdr = await fetch(`${base}/api/run`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(noHdr.status, 403);
  const evil = await post('/api/run', { questionId: 'demoA-B01', code: 'x' }, { ...H, Origin: 'https://evil.example' });
  assert.equal(evil.status, 403);
  const hostile = await new Promise((resolve) => {
    http.get(base + '/api/bank', { headers: { Host: 'evil.example' } }, (r) => resolve(r.statusCode)).on('error', () => resolve(0));
  });
  assert.equal(hostile, 403);
  const proto = { id: '__proto__', items: [] };
  assert.equal((await put('/api/attempts/__proto__', proto)).status, 400);
  assert.equal(app.getState().attempts.polluted, undefined);
});

test('estáticos: só a pasta public é servida; sem travessia de diretórios', async () => {
  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.equal((await fetch(`${base}/js/app.js`)).status, 200);
  for (const p of ['/..%2f..%2fpackage.json', '/%2e%2e/package.json', '/package.json', '/server/index.mjs', '/data/state.json', '/bank/questions.json', '/bank/assets/../questions.json', '/nao-existe.js', '/bank/assets/nao-existe.png']) {
    const s = (await fetch(base + p)).status;
    assert.ok([403, 404].includes(s), `${p} → ${s}`);
  }
});

test('persistência: tentativas e definições sobrevivem a reiniciar o servidor', async () => {
  const at = { id: 'abc123', kind: 'random', title: 'T', items: [{ qid: 'demoA-A01' }], answers: { 'demoA-A01': { choice: 'd' } }, status: 'finished' };
  assert.equal((await put('/api/attempts/abc123', at)).status, 200);
  assert.equal((await put('/api/attempts/outro', at)).status, 400, 'id do corpo tem de coincidir');
  assert.equal((await put('/api/settings', { theme: 'dark' })).status, 200);
  await app.flush();
  assert.ok(existsSync(path.join(dir, 'state.json')));
  const app2 = createApp({ dataDir: dir, bankFile });
  const base2 = `http://127.0.0.1:${await app2.listen()}`;
  const st = await (await fetch(`${base2}/api/state`)).json();
  assert.equal(st.attempts.abc123.answers['demoA-A01'].choice, 'd');
  assert.equal(st.settings.theme, 'dark');
  await app2.close();
  assert.equal((await fetch(`${base}/api/attempts/abc123`, { method: 'DELETE', headers: H })).status, 200);
  assert.equal(app.getState().attempts.abc123, undefined);
});

test('workspace: guardar e voltar a ler um ficheiro .hs', async () => {
  assert.equal((await fetch(`${base}/api/workspace/demoA-B01`)).status, 404);
  const w = await put('/api/workspace/demoA-B01', { code: 'sumSquares = 1' });
  assert.equal(w.status, 200);
  const r = await (await fetch(`${base}/api/workspace/demoA-B01`)).json();
  assert.equal(r.code, 'sumSquares = 1');
  assert.equal((await put('/api/workspace/..%2fx', { code: '' })).status, 400);
});

test('/api/health: GHC encontrado', async () => {
  const { ghc } = await (await fetch(`${base}/api/health`)).json();
  assert.equal(ghc.ok, true);
  assert.match(ghc.ghc, /^\d+\.\d+/);
});

test('regressão: sem GHC no PATH a mensagem é clara (não "spawn runghc ENOENT")', async () => {
  const saved = process.env.PATH;
  process.env.PATH = mkdtempSync(path.join(tmpdir(), 'pfl-nopath-')); // diretório vazio
  try {
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.ghc.ok, false);
    assert.equal(health.ghc.message, GHC_MISSING_MSG);
    assert.equal((await checkGhc()).ok, false);
    const r = await runQuestion({ question: byId('demoA-B01'), ctx: null, code: ref('demoA-B01') });
    assert.equal(r.compileError, GHC_MISSING_MSG);
    assert.doesNotMatch(r.compileError, /ENOENT/);
  } finally { process.env.PATH = saved; }
  assert.equal((await checkGhc()).ok, true, 'e volta ao normal');
});

test('regressão: porta ocupada dá uma mensagem clara em vez de um stack trace', async () => {
  const blocker = net.createServer();
  await new Promise((r) => blocker.listen(0, '127.0.0.1', r));
  const busy = blocker.address().port;
  try {
    await assert.rejects(createApp({ dataDir: dir, bankFile, port: busy }).listen(), (e) => e.code === 'EADDRINUSE');
    const r = spawnSync(process.execPath, ['server/index.mjs'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, PORT: String(busy), PFL_DATA_DIR: dir, PFL_BANK: 'demo' }, encoding: 'utf8', timeout: 20000 });
    assert.equal(r.status, 1);
    assert.match(r.stderr, new RegExp(`porta ${busy} já está em uso`));
    assert.doesNotMatch(r.stderr, /at .*\(node:/, 'sem stack trace');
  } finally { await new Promise((r) => blocker.close(r)); }
});

test('regressão: as linhas de erro de "solucao.hs" coincidem com as do editor, mesmo com imports', async () => {
  const code = 'import Data.List (sort)\nsumSquares :: [Int] -> Int\nsumSquares [] = 0\nsumSquares xs = foo xs\n';
  const r = await (await post('/api/run', { questionId: 'demoA-B01', code })).json();
  assert.match(r.compileError, /solucao\.hs:4:\d+/, r.compileError); // a linha 4 do editor, não a 3
});
