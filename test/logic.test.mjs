import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeTheory, gradePractice, summarize, penaltyFraction, normalizeTo20 } from '../public/js/scoring.js';
import { mulberry32, pickByPoints, buildRandom, buildOriginal, buildTraining, buildRetry, poolFor, presetsOf } from '../public/js/generator.js';
import { bank } from './helpers.mjs';

test('gradeTheory: oficial/confirmada, penalização, em branco, desconhecida, não oficial', () => {
  const off = { status: 'official', value: 'b' };
  assert.deepEqual(gradeTheory({ points: 0.5, penalty: 0.25, answer: off, choice: 'b' }), { state: 'correct', score: 0.5, max: 0.5, counted: true });
  assert.deepEqual(gradeTheory({ points: 0.5, penalty: 0.25, answer: off, choice: 'a' }), { state: 'wrong', score: -0.125, max: 0.5, counted: true });
  assert.ok(Object.is(gradeTheory({ points: 0.5, penalty: 0, answer: off, choice: 'a' }).score, 0), 'sem penalização o score é +0, nunca -0');
  assert.equal(gradeTheory({ points: 0.5, penalty: 0.25, answer: off, choice: null }).state, 'blank');
  assert.deepEqual(gradeTheory({ points: 0.5, answer: { status: 'unknown', value: null }, choice: 'a' }), { state: 'ungraded', score: 0, max: 0.5, counted: false });
  const un = gradeTheory({ points: 0.5, answer: { status: 'unofficial', value: 'a' }, choice: 'a' });
  assert.equal(un.state, 'indicative-correct'); assert.equal(un.counted, false); assert.equal(un.score, 0);
});

test('penaltyFraction só aplica quando stated/observed', () => {
  assert.equal(penaltyFraction({ penalty: { status: 'stated', fraction: 0.25 } }), 0.25);
  assert.equal(penaltyFraction({ penalty: { status: 'observed', fraction: 0.25 } }), 0.25);
  assert.equal(penaltyFraction({ penalty: { status: 'unknown', fraction: null } }), 0);
  assert.equal(penaltyFraction(undefined), 0);
  const pen = (id) => penaltyFraction(bank.exams.find((e) => e.id === id));
  assert.equal(pen('demo-a'), 0.25);
  assert.equal(pen('demo-b'), 0);
});

test('gradePractice: fração, compilação, limite de 25% e estados', () => {
  const R = (...s) => s.map((status) => ({ status }));
  assert.equal(gradePractice({ points: 2, results: R('PASS', 'PASS') }).state, 'passed');
  const part = gradePractice({ points: 2, results: R('PASS', 'FAIL', 'PASS', 'PASS') });
  assert.equal(part.state, 'partial'); assert.equal(part.score, 1.5);
  assert.equal(gradePractice({ points: 2, results: R('FAIL') }).state, 'failed');
  assert.equal(gradePractice({ points: 2, results: R('PASS'), compileError: 'x' }).score, 0);
  assert.equal(gradePractice({ points: 2, results: [], attempted: false }).state, 'blank');
  const viol = [{ kind: 'no-recursion', severity: 'hard', ok: false }];
  const capped = gradePractice({ points: 2, results: R('PASS', 'PASS'), constraints: viol, capOnViolation: 0.25 });
  assert.deepEqual([capped.score, capped.capped, capped.state], [0.5, true, 'partial']);
  assert.equal(gradePractice({ points: 2, results: R('PASS'), constraints: viol }).score, 2);
  assert.equal(gradePractice({ points: 2, results: R('PASS'), constraints: [{ kind: 'no-import', severity: 'hard', ok: false }], capOnViolation: 0.25 }).score, 2);
  assert.equal(gradePractice({ points: 2, results: R('PASS'), constraints: [{ kind: 'forbid-idents', severity: 'soft', ok: false }], capOnViolation: 0.25 }).state, 'passed');
});

test('summarize + normalizeTo20', () => {
  const s = summarize([
    { type: 'theory', max: 0.5, score: 0.5, counted: true, state: 'correct' },
    { type: 'theory', max: 0.5, score: -0.125, counted: true, state: 'wrong' },
    { type: 'theory', max: 0.5, score: 0, counted: false, state: 'ungraded' },
    { type: 'practice', max: 2, score: 1, counted: true, state: 'partial' },
  ]);
  assert.equal(s.theory.gradable, 2); assert.equal(s.theory.ungraded, 1); assert.equal(s.score, 1.375); assert.equal(s.max, 3);
  assert.equal(normalizeTo20(10, 20), 10);
});

test('banco: a soma das cotações de cada exame é a declarada', () => {
  const sum = (id) => Math.round(bank.questions.filter((q) => q.exam === id).reduce((s, q) => s + q.points, 0) * 100) / 100;
  for (const e of bank.exams) assert.equal(sum(e.id), e.totalPoints, e.id);
});

test('pickByPoints atinge a soma alvo e é reprodutível', () => {
  const pool = bank.questions.filter((q) => q.type === 'practice' && q.points != null);
  for (const target of [2.5, 5, 8, 10.5]) {
    const picked = pickByPoints(pool, target, mulberry32(7), { tolerance: 0.05 });
    const sum = picked.reduce((s, q) => s + q.points, 0);
    assert.ok(Math.abs(sum - target) <= 0.05, `alvo ${target} obteve ${sum}`);
  }
  const a = pickByPoints(pool, 5, mulberry32(3)).map((q) => q.id);
  const b = pickByPoints(pool, 5, mulberry32(3)).map((q) => q.id);
  assert.deepEqual(a, b);
  assert.deepEqual(pickByPoints([], 5), []);
});

test('presets: o banco pode definir os seus; "custom" existe sempre', () => {
  assert.deepEqual(Object.keys(presetsOf(bank)), ['demo', 'curto', 'custom']);
  assert.ok('mt' in presetsOf({}) && 'custom' in presetsOf({}), 'sem presets no banco usam-se os predefinidos');
});

test('buildRandom: presets, só questões com cotação, sem repetidas, ordem teoria→prática', () => {
  for (const [preset, p] of Object.entries(presetsOf(bank)).filter(([k]) => k !== 'custom')) {
    for (let seed = 1; seed <= 15; seed++) {
      const at = buildRandom(bank, { preset }, mulberry32(seed));
      const qs = at.items.map((i) => bank.questions.find((q) => q.id === i.qid));
      assert.equal(new Set(at.items.map((i) => i.qid)).size, at.items.length);
      assert.ok(qs.every((q) => q.points != null), 'nenhuma questão sem cotação');
      assert.ok(Math.abs(at.achieved.theory - p.theory) < 1e-9, `${preset}/${seed} teoria ${at.achieved.theory}`);
      assert.ok(Math.abs(at.achieved.practice - p.practice) < 1e-9, `${preset}/${seed} prática ${at.achieved.practice}`);
      const firstPractice = qs.findIndex((q) => q.type === 'practice');
      assert.ok(qs.slice(firstPractice).every((q) => q.type === 'practice'), 'teoria antes da prática');
    }
  }
});

test('buildRandom respeita filtros de tema e exame, e prefere questões por ver', () => {
  const at = buildRandom(bank, { preset: 'custom', theory: 0, practice: 3, themes: ['arvores', 'grafos'] }, mulberry32(1));
  const qs = at.items.map((i) => bank.questions.find((q) => q.id === i.qid));
  assert.ok(qs.length > 0 && qs.every((q) => ['arvores', 'grafos'].includes(q.theme)));
  const at2 = buildRandom(bank, { theory: 1.5, practice: 0, exams: ['demo-a'] }, mulberry32(2));
  assert.ok(at2.items.length > 0 && at2.items.every((i) => i.qid.startsWith('demoA-A')));
  const all = bank.questions.filter((q) => q.type === 'theory' && q.points != null);
  const unseen = all.slice(0, 4);
  const seenIds = new Set(all.slice(4).map((q) => q.id));
  const at3 = buildRandom(bank, { theory: 1, practice: 0, seenIds }, mulberry32(5));
  assert.ok(at3.items.length > 0 && at3.items.every((i) => unseen.some((q) => q.id === i.qid)));
});

test('buildOriginal e buildRetry e buildTraining', () => {
  const o = buildOriginal(bank, 'demo-a');
  assert.equal(o.items.length, 12);
  assert.ok(o.items[0].qid.includes('-A') && o.items.at(-1).qid.includes('-B'));
  assert.throws(() => buildOriginal(bank, 'nao-existe'));
  const r = buildRetry(bank, ['demoA-A01', 'inexistente', 'demoA-B01']);
  assert.deepEqual(r.items.map((i) => i.qid), ['demoA-A01', 'demoA-B01']);
  const t = buildTraining(bank, { themes: ['arvores'], types: ['practice'], count: 4 }, mulberry32(4));
  assert.equal(t.items.length, 2); assert.equal(t.instant, true);
  assert.ok(t.items.every((i) => bank.questions.find((q) => q.id === i.qid).theme === 'arvores'));
  const g = buildTraining(bank, { types: ['theory'], count: 999, onlyGradable: true }, mulberry32(4));
  assert.equal(g.items.length, 6);
  assert.ok(g.items.every((i) => ['official', 'confirmed'].includes(bank.questions.find((q) => q.id === i.qid).answer?.status)));
});

test('poolFor combina filtros', () => {
  assert.equal(poolFor(bank, {}).length, 16);
  assert.equal(poolFor(bank, { types: ['theory'] }).length, 8);
  assert.equal(poolFor(bank, { types: ['practice'], exams: ['demo-b'] }).length, 2);
});
