// Classificação ponta a ponta dos exames do banco de demonstração: o servidor real corre as soluções com o GHC e
// gradeAttempt() (o mesmo código da interface) calcula as notas e a conversão para 0–20.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.mjs';
import { store } from '../public/js/store.js';
import { gradeAttempt } from '../public/js/grading.js';
import { buildOriginal, buildRandom, mulberry32, presetsOf } from '../public/js/generator.js';
import { normalizeTo20, penaltyFraction } from '../public/js/scoring.js';
import { bank, bankFile } from './helpers.mjs';

let app; const realFetch = globalThis.fetch;
before(async () => {
  app = createApp({ dataDir: mkdtempSync(path.join(tmpdir(), 'pfl-exams-')), bankFile });
  const base = `http://127.0.0.1:${await app.listen()}`;
  globalThis.fetch = (u, o) => realFetch(String(u).startsWith('/') ? base + u : u, o); // a API do cliente usa caminhos relativos
  store.bank = bank; store.byId = new Map(bank.questions.map((q) => [q.id, q]));
});
after(async () => { globalThis.fetch = realFetch; await app.close(); });

const q = (id) => store.byId.get(id);
const counted = (x) => x.type === 'practice' || ['official', 'confirmed'].includes(x.answer.status);
const round = (x) => Math.round(x * 1000) / 1000;
const wrongChoice = (x) => 'abcdefgh'.slice(0, x.options.length).split('').find((l) => l !== x.answer.value);

function answersFor(a, mode) {
  const out = {};
  for (const { qid } of a.items) {
    const x = q(qid);
    if (mode === 'perfect') out[qid] = x.type === 'theory' ? { choice: x.answer.value ?? 'a' } : { code: x.refs[0].code };
    else if (mode === 'wrong-theory' && x.type === 'theory') out[qid] = { choice: counted(x) ? wrongChoice(x) : 'a' };
  }
  return out;
}

for (const exam of bank.exams) {
  test(`exame "${exam.label}": respostas de referência dão a nota máxima (20/20)`, { timeout: 120000 }, async () => {
    const a = buildOriginal(bank, exam.id); a.answers = answersFor(a, 'perfect');
    await gradeAttempt(a);
    const items = a.items.map((i) => q(i.qid));
    const maxExpected = round(items.filter(counted).reduce((s, x) => s + x.points, 0));
    assert.equal(a.status, 'finished');
    assert.equal(a.summary.max, maxExpected, 'só contam as respostas corrigíveis (oficiais/confirmadas) e a prática');
    assert.equal(a.summary.score, a.summary.max);
    assert.equal(normalizeTo20(a.summary.score, a.summary.max), 20);
    assert.equal(a.summary.hasPoints, true);
    assert.deepEqual(items.filter((x) => x.type === 'practice').map((x) => a.results[x.id].state), items.filter((x) => x.type === 'practice').map(() => 'passed'), 'todas as práticas passam e cumprem as restrições');
    assert.equal(a.summary.theory.ungraded, items.filter((x) => x.type === 'theory' && !counted(x)).length);
  });

  test(`exame "${exam.label}": em branco vale 0 e teoria toda errada aplica a penalização do exame`, { timeout: 60000 }, async () => {
    const blank = buildOriginal(bank, exam.id); blank.answers = {};
    await gradeAttempt(blank);
    assert.equal(blank.summary.score, 0);
    assert.equal(normalizeTo20(blank.summary.score, blank.summary.max), 0);
    assert.ok(Object.values(blank.results).every((r) => r.state === 'blank' || r.state === 'ungraded'));
    const wrong = buildOriginal(bank, exam.id); wrong.answers = answersFor(wrong, 'wrong-theory');
    await gradeAttempt(wrong);
    const th = wrong.items.map((i) => q(i.qid)).filter((x) => x.type === 'theory' && counted(x));
    const expected = -round(th.reduce((s, x) => s + x.points * penaltyFraction(exam), 0)) + 0;
    assert.equal(wrong.summary.theory.score, expected, 'penalização = fração do exame × cotação de cada resposta errada');
    assert.equal(wrong.summary.practice.score, 0);
  });
}

test('exames aleatórios de todos os presets: respostas de referência dão 20/20 e a cotação pedida', { timeout: 300000 }, async () => {
  for (const [preset, p] of Object.entries(presetsOf(bank)).filter(([k]) => k !== 'custom')) {
    const a = buildRandom(bank, { preset }, mulberry32(11));
    assert.equal(a.achieved.theory, p.theory); assert.equal(a.achieved.practice, p.practice);
    a.answers = answersFor(a, 'perfect');
    await gradeAttempt(a);
    assert.equal(normalizeTo20(a.summary.score, a.summary.max), 20, preset);
  }
});
