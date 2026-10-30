import { test } from 'node:test';
import assert from 'node:assert/strict';
import { store, saveAttempt, flushAttempt, onSaveStatus, SAVE_OPTS } from '../public/js/store.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('gravação: estado observável e repetição automática quando o servidor falha', async () => {
  SAVE_OPTS.debounceMs = 5; SAVE_OPTS.retryMs = 20;
  const real = globalThis.fetch; const realErr = console.error; console.error = () => {}; // os erros de rede são esperados
  let up = false; const bodies = [];
  globalThis.fetch = async (url, opts) => {
    if (!up) throw new TypeError('fetch failed');
    bodies.push(JSON.parse(opts.body));
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const seen = [];
  const off = onSaveStatus((s) => seen.push(s));
  try {
    const a = { id: 'a1', items: [], answers: { q: { code: 'v1' } } };
    saveAttempt(a);
    await sleep(60);
    assert.equal(seen.at(-1), 'error', 'servidor em baixo → "error", sem perder a tentativa');
    a.answers.q.code = 'v2'; // continua a editar enquanto o servidor está em baixo
    up = true;
    await sleep(80);
    assert.equal(seen.at(-1), 'saved', 'quando o servidor volta, grava sozinho');
    assert.equal(bodies.at(-1).answers.q.code, 'v2', 'a repetição envia a versão mais recente');
    assert.ok(seen.includes('pending') && seen.includes('saving'));
    await flushAttempt(a);
    assert.equal(seen.at(-1), 'saved');
  } finally { off(); globalThis.fetch = real; console.error = realErr; store.attempts.clear(); }
});
