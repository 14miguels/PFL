import { test } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../public/js/store.js';
import { gradeAttempt } from '../public/js/grading.js';
import { buildOriginal } from '../public/js/generator.js';
import { bank, byId } from './helpers.mjs';

test('regressão: a entrega corre os testes das respostas práticas em paralelo (limitado)', async () => {
  store.bank = bank; store.byId = new Map(bank.questions.map((q) => [q.id, q]));
  const a = buildOriginal(bank, 'demo-a');
  a.answers = Object.fromEntries(bank.questions.filter((q) => q.exam === 'demo-a' && q.type === 'practice').map((q) => [q.id, { code: q.refs[0].code }]));
  const real = globalThis.fetch;
  let now = 0; let max = 0; let runs = 0; const progress = [];
  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (url === '/api/run') {
      now++; max = Math.max(max, now); runs++;
      await new Promise((r) => setTimeout(r, 30));
      now--;
      const q = byId(body.questionId);
      return { ok: true, json: async () => ({ compileError: null, results: q.tests.map((t, index) => ({ index, status: 'PASS', got: '', label: t.call ?? t.io, origin: t.origin })), constraints: [] }) };
    }
    if (url === '/api/reveal') return { ok: true, json: async () => Object.fromEntries(body.ids.map((id) => [id, { answer: byId(id).answer }])) };
    throw new Error(`pedido inesperado ${url}`);
  };
  try {
    await gradeAttempt(a, (t) => progress.push(t));
    assert.equal(runs, 6, 'uma execução por pergunta prática respondida');
    assert.ok(max >= 2 && max <= 3, `concorrência observada: ${max}`);
    assert.equal(a.status, 'finished');
    assert.ok(Object.values(a.results).filter((r) => r.state === 'passed').length === 6, 'todas as práticas passaram');
    assert.match(progress.join('|'), /\(6\/6\)/, 'o progresso conta até ao fim');
  } finally { globalThis.fetch = real; }
});
