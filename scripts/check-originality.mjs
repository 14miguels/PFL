// Garante que o banco de demonstração (público) não reproduz o banco privado (exames reais).
// Compara, para cada questão pública, com todas as questões privadas:
//   1. linhas (≥ 30 caracteres, normalizadas) de enunciados, opções, contextos e soluções;
//   2. nomes das funções pedidas (func);
//   3. similaridade de texto (Jaccard sobre sequências de 4 palavras do enunciado).
// Só faz sentido quando existe bank/src/ (banco privado); sem ele, termina com sucesso e avisa.
// Uso: node scripts/check-originality.mjs [--verbose]
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');
if (!existsSync(path.join(root, 'bank', 'src', 'manifest.mjs'))) {
  console.log('Sem banco privado (bank/src): nada a comparar. OK.');
  process.exit(0);
}
const { buildBank } = await import('./build-bank.mjs');
process.env.PFL_BANK = 'demo';
const demo = (await buildBank()).bank;
delete process.env.PFL_BANK;
const priv = (await buildBank()).bank;

const norm = (s) => (s ?? '').toLowerCase().normalize('NFC').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
const lines = (s) => (s ?? '').split('\n').map(norm).filter((l) => l.length >= 30);
const unitsOf = (bank, q) => {
  const ctx = bank.contexts.find((c) => c.exam === q.exam && c.id === q.ctx);
  return [q.statement, ...(q.options ?? []), ctx?.text, ctx?.code, ...(q.refs ?? []).map((r) => r.code)].flatMap(lines);
};
const shingles = (s, k = 4) => { const w = norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean); const out = new Set(); for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' ')); return out; };
const jaccard = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n); };

const privLines = new Map(); // linha -> id da questão privada
for (const q of priv.questions) for (const l of unitsOf(priv, q)) privLines.set(l, q.id);
const privFuncs = new Map(priv.questions.filter((q) => q.func).map((q) => [q.func.toLowerCase(), q.id]));
const privShingles = priv.questions.map((q) => ({ id: q.id, s: shingles(q.statement) }));

const problems = []; let maxSim = 0; let maxWho = '';
for (const q of demo.questions) {
  for (const l of unitsOf(demo, q)) if (privLines.has(l)) problems.push(`${q.id}: linha igual à de ${privLines.get(l)}: "${l.slice(0, 80)}"`);
  if (q.func && privFuncs.has(q.func.toLowerCase())) problems.push(`${q.id}: a função "${q.func}" também é pedida em ${privFuncs.get(q.func.toLowerCase())}`);
  const mine = shingles(q.statement);
  for (const p of privShingles) { const j = jaccard(mine, p.s); if (j > maxSim) { maxSim = j; maxWho = `${q.id} ~ ${p.id}`; } if (j >= 0.2) problems.push(`${q.id}: enunciado muito semelhante a ${p.id} (similaridade ${j.toFixed(2)})`); }
}
console.log(`${demo.questions.length} questões públicas vs ${priv.questions.length} privadas · similaridade máxima de enunciados: ${maxSim.toFixed(3)} (${maxWho}) · limite 0.20`);
if (verbose) console.log(`linhas privadas comparadas: ${privLines.size}; funções privadas: ${privFuncs.size}`);
if (problems.length) { console.error('POSSÍVEIS COINCIDÊNCIAS:\n' + problems.map((p) => ' - ' + p).join('\n')); process.exit(1); }
console.log('OK — nenhuma coincidência com o banco privado.');
