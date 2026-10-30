import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeStats, weakestTheme, trendPoints, trendSummary } from '../public/js/progress.js';
import { buildSingle, buildTraining, mulberry32 } from '../public/js/generator.js';
import { bank } from './helpers.mjs';

const last = (state) => ({ last: { state }, tries: 1 });

test('themeStats e weakestTheme: menor taxa de acerto, só com erradas', () => {
  const stats = new Map([
    ['demoA-A01', last('correct')], ['demoA-A02', last('wrong')], // avaliacao: 1 certa, 1 errada
    ['demoA-A03', last('wrong')], // lazy: 0 certas, 1 errada
    ['demoA-A04', last('correct')], ['demoA-A05', last('correct')], // tipos: 2 certas
    ['demoA-B01', last('failed')], ['demoA-B02', last('passed')], // recursao: 1 errada, 1 certa
  ]);
  const rows = themeStats(bank, stats);
  const get = (t) => rows.find((r) => r.t === t);
  assert.deepEqual([get('avaliacao').right, get('avaliacao').wrongN, get('avaliacao').todo], [1, 1, 0]);
  assert.deepEqual(get('tipos').wrongIds, []);
  assert.deepEqual(get('lazy').wrongIds, ['demoA-A03']);
  assert.equal(weakestTheme(rows).t, 'lazy', '0% de acerto é o pior');
  assert.equal(weakestTheme(themeStats(bank, new Map([['demoA-A01', last('blank')], ['demoA-A02', last('wrong')]]))).t, 'avaliacao', 'em branco conta como errada (como no resto da app)');
  assert.equal(weakestTheme(themeStats(bank, new Map([['demoA-A01', last('correct')]]))), null, 'sem erradas não há sugestão');
  assert.equal(weakestTheme(themeStats(bank, new Map())), null);
});

test('buildSingle: prática de uma só questão com feedback imediato', () => {
  const a = buildSingle(bank, 'demoA-B05');
  assert.deepEqual(a.items, [{ qid: 'demoA-B05' }]);
  assert.equal(a.instant, true); assert.equal(a.kind, 'training');
  assert.throws(() => buildSingle(bank, 'nao-existe'));
});

test('buildTraining com firstIds põe primeiro as perguntas indicadas', () => {
  const first = new Set(['demoA-B04', 'demoB-A01']);
  for (let seed = 1; seed <= 10; seed++) {
    const t = buildTraining(bank, { count: 2, firstIds: first }, mulberry32(seed));
    assert.deepEqual(new Set(t.items.map((i) => i.qid)), first);
  }
});

const fin = (id, kind, score, max, finishedAt, extra = {}) => ({ id, kind, title: id, status: 'finished', finishedAt, startedAt: finishedAt, durationSec: 600, summary: { hasPoints: true, score, max }, ...extra });

test('trendPoints: só exames terminados com nota, por ordem cronológica, em /20', () => {
  const list = [
    fin('c', 'original', 15, 20, '2026-03-03T10:00:00Z'),
    fin('a', 'random', 5, 10, '2026-03-01T10:00:00Z'),
    fin('t', 'training', 9, 10, '2026-03-02T10:00:00Z'), // treino não entra
    { ...fin('np', 'original', 0, 0, '2026-03-04T10:00:00Z'), summary: { hasPoints: false } },
    { ...fin('open', 'original', 1, 2, '2026-03-05T10:00:00Z'), status: 'in-progress' },
  ];
  const pts = trendPoints(list);
  assert.deepEqual(pts.map((p) => [p.id, p.score20]), [['a', 10], ['c', 15]]);
});

test('trendSummary: média, melhor, última e tempo total de estudo', () => {
  const list = [fin('a', 'random', 5, 10, '2026-03-01T10:00:00Z', { durationSec: 600 }), fin('c', 'original', 15, 20, '2026-03-03T10:00:00Z', { durationSec: 1200 }), fin('t', 'training', 9, 10, '2026-03-02T10:00:00Z', { durationSec: 300 })];
  assert.deepEqual(trendSummary(trendPoints(list), list), { count: 2, mean: 12.5, best: 15, last: 15, studySec: 2100 });
  assert.deepEqual(trendSummary([], []), { count: 0, mean: null, best: null, last: null, studySec: 0 });
});
