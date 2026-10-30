import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ghcLocations, lineRange, hintsFor } from '../public/js/hints.js';
import { mapPool } from '../public/js/pool.js';

test('ghcLocations: linhas de solucao.hs, sem repetidos e ignorando o código gerado', () => {
  const msg = 'solucao.hs:4:12: error: [GHC-88464]\n  Variable not in scope: foo\nsolucao.hs:4:30: error: x\nsolucao.hs:9:1: error: y\ntestes-gerados.hs:3:1: error: z';
  assert.deepEqual(ghcLocations(msg), [{ line: 4, col: 12 }, { line: 9, col: 1 }]);
  assert.deepEqual(ghcLocations('sem localizações'), []);
});

test('lineRange: intervalo de caracteres de uma linha', () => {
  const code = 'ab\ncde\n\nf';
  assert.deepEqual(lineRange(code, 1), [0, 2]);
  assert.deepEqual(lineRange(code, 2), [3, 6]);
  assert.deepEqual(lineRange(code, 3), [7, 7]);
  assert.deepEqual(lineRange(code, 4), [8, 9]);
  assert.equal(lineRange(code, 5), null); assert.equal(lineRange(code, 0), null);
  assert.equal(code.slice(...lineRange(code, 2)), 'cde');
});

test('hintsFor: erros comuns dos estudantes (mensagens reais do GHC 9.x)', () => {
  const dup = 'solucao.hs:1:25: error: [GHC-87543]\n    Ambiguous occurrence ‘BST’.\n    It could refer to\n       either ‘Provided.BST’,\n              imported from ‘Provided’ at Main.hs:6:1-15\n           or ‘Main.BST’, defined at solucao.hs:1:1.';
  const h1 = hintsFor(dup);
  assert.equal(h1.length, 1); assert.match(h1[0], /"BST" já está definido no código fornecido/);
  assert.match(hintsFor('Ambiguous occurrence ‘lookup’.\n either ‘Prelude.lookup’ or ‘Main.lookup’')[0], /"lookup" já existe.*Prelude/);
  assert.match(hintsFor('solucao.hs:1:1: error: [GHC-58481] parse error on input ‘module’')[0], /Remove a linha "module/);
  assert.match(hintsFor('Multiple declarations of ‘main’')[0], /Não definas "main"/);
  assert.match(hintsFor('Variable not in scope: foo :: [a0] -> t')[0], /"foo" não está definido/);
  assert.match(hintsFor('Data constructor not in scope: Leef')[0], /construtor "Leef"/);
  assert.match(hintsFor("The type signature for ‘sumSquare’ lacks an accompanying binding")[0], /"sumSquare"/);
  assert.match(hintsFor('parse error (possibly incorrect indentation or mismatched brackets)')[0], /indentação/);
  assert.match(hintsFor("Couldn't match expected type ‘Int’ with actual type ‘[Int]’")[0], /tipos não coincidem/);
  assert.match(hintsFor('Erro de sintaxe no fim da tua solução (definição incompleta')[0], /incompleta/);
  assert.deepEqual(hintsFor('algo que não conhecemos'), []);
});

test('mapPool: respeita o limite de concorrência e a ordem dos resultados', async () => {
  let now = 0; let max = 0;
  const out = await mapPool([30, 10, 20, 5, 15], 2, async (ms, i) => { now++; max = Math.max(max, now); await new Promise((r) => setTimeout(r, ms)); now--; return `${i}:${ms}`; });
  assert.deepEqual(out, ['0:30', '1:10', '2:20', '3:5', '4:15']);
  assert.equal(max, 2);
  assert.deepEqual(await mapPool([], 3, async () => 1), []);
  await assert.rejects(mapPool([1, 2], 2, async (x) => { if (x === 2) throw new Error('boom'); }), /boom/);
});
