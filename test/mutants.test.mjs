import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runQuestion } from '../server/haskell.mjs';
import { bank, byId, ctxOf } from './helpers.mjs';
import { MUTANTS } from './mutants.mjs';

const practice = bank.questions.filter((q) => q.type === 'practice');

test('todas as questões práticas do banco de demonstração têm mutantes (≥ 2, ou ≥ 1 se for de restrições)', () => {
  const missing = practice.filter((q) => (MUTANTS[q.id]?.length ?? 0) < 2).map((q) => q.id);
  assert.deepEqual(missing, [], 'cada exercício precisa de pelo menos 2 soluções erradas plausíveis para provar que os testes as rejeitam');
  assert.deepEqual(Object.keys(MUTANTS).filter((id) => !byId(id)), [], 'mutantes de questões que já não existem');
});

test('os testes rejeitam soluções erradas plausíveis (e as restrições apanham as que violam a técnica)', { timeout: 600000 }, async () => {
  const jobs = practice.flatMap((q) => (MUTANTS[q.id] ?? []).map((m) => ({ q, m })));
  const failures = [];
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const { q, m } = jobs[next++];
      const r = await runQuestion({ question: q, ctx: ctxOf(q), code: m.code.replaceAll('§', '`') });
      const where = `${q.id} «${m.label}»`;
      if (r.compileError) { failures.push(`${where}: o mutante não compila (um mutante tem de ser plausível):\n${r.compileError.split('\n').slice(0, 3).join('\n')}`); continue; }
      const allPass = r.results.every((x) => x.status === 'PASS');
      if (m.violates) {
        if (!allPass) failures.push(`${where}: devia passar todos os testes (só viola a restrição)`);
        if (r.constraints.find((c) => c.kind === m.violates)?.ok !== false) failures.push(`${where}: a restrição ${m.violates} devia ser violada`);
      } else if (allPass) failures.push(`${where}: PASSA todos os testes — os testes não distinguem esta solução errada`);
    }
  }));
  assert.deepEqual(failures, []);
});
