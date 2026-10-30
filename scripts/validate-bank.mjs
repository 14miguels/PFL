// Valida o banco: estrutura, soluções de referência vs. testes, restrições e verificações GHC da teoria.
// Uso: node scripts/validate-bank.mjs [--only <prefixo-de-id>] [--skip-theory] [--skip-practice]
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runQuestion, ghcEval, ghcCompiles, ghcType, equivRun } from '../server/haskell.mjs';
import { buildBank } from './build-bank.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const { bank, errors } = await buildBank();
const failures = errors.map((e) => `[estrutura] ${e}`);
const norm = (s) => s.replace(/\s+/g, '');
const letters = 'abcdefgh';

// canonicaliza um tipo: String≡[Char], variáveis renomeadas pela ordem no corpo, contexto ordenado e sem parênteses
function canonType(t) {
  t = t.replace(/\bString\b/g, '[Char]');
  let ctx = ''; let body = t;
  const idx = t.indexOf('=>');
  if (idx >= 0) { ctx = t.slice(0, idx).trim(); body = t.slice(idx + 2); }
  const map = new Map();
  const ren = (x) => x.replace(/\b[a-z][A-Za-z0-9_']*\b/g, (v) => { if (!map.has(v)) map.set(v, `v${map.size}`); return map.get(v); });
  const b = norm(ren(body));
  let c = '';
  if (ctx) c = ctx.replace(/^\(/, '').replace(/\)$/, '').split(',').map((p) => norm(ren(p))).sort().join(',') + '=>';
  return c + b;
}

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

async function checkPractice(q) {
  const ctx = bank.contexts.find((c) => c.exam === q.exam && c.id === q.ctx) ?? null;
  const msgs = [];
  for (const [k, ref] of q.refs.entries()) {
    const r = await runQuestion({ question: q, ctx, code: ref.code });
    if (r.compileError) { msgs.push(`${q.id} ref#${k}: não compila:\n${r.compileError.split('\n').slice(0, 6).join('\n')}`); continue; }
    r.results.forEach((res, i) => { if (res.status !== 'PASS') msgs.push(`${q.id} ref#${k}: teste ${i} (${q.tests[i].call ?? q.tests[i].io}) → ${res.status} obtido=${JSON.stringify(res.got)}`); });
    if (!ref.skipConstraints) r.constraints.filter((c) => !c.ok).forEach((c) => msgs.push(`${q.id} ref#${k}: restrição violada (${c.kind}: ${c.detail}) — ${c.text}`));
  }
  return msgs;
}

async function checkTheory(q) {
  const msgs = [];
  const ansIdx = q.answer.value ? letters.indexOf(q.answer.value) : -1;
  for (const v of q.verify ?? []) {
    if (v.kind === 'eval') {
      const r = await ghcEval(v.prelude ?? '', v.expr);
      const got = norm(r.stdout);
      const want = norm(v.expect ?? q.options[ansIdx]);
      if (got !== want) msgs.push(`${q.id}: eval "${v.expr}" → ${got || r.stderr.slice(0, 200)} ≠ ${want}`);
      // banco de demonstração: nenhum distrator pode ser igual ao resultado (resposta ambígua)
      if (bank.demo && ansIdx >= 0) q.options.forEach((o, i) => { if (i !== ansIdx && norm(o) === want) msgs.push(`${q.id}: a opção ${letters[i]} também é igual ao resultado (distrator ambíguo)`); });
    } else if (v.kind === 'typecheck') {
      const okSet = [];
      for (const [i, opt] of q.options.entries()) if (await ghcCompiles(`${v.prelude ?? ''}\n${v.template.replace('$OPT', opt)}\n`)) okSet.push(letters[i]);
      if (!okSet.includes(q.answer.value)) msgs.push(`${q.id}: typecheck — a opção correta (${q.answer.value}) não compila (compilam: ${okSet})`);
      else if (v.expectOnly !== false && okSet.length !== 1) msgs.push(`${q.id}: typecheck — compilam várias opções: ${okSet}`);
    } else if (v.kind === 'inferred') {
      const out = await ghcType(v.prelude ?? '', v.name ?? v.expr);
      const t = out.includes(' :: ') ? out.slice(out.indexOf(' :: ') + 4) : out;
      if (canonType(t) !== canonType(v.expect)) msgs.push(`${q.id}: tipo inferido "${t}" ≠ "${v.expect}"`);
      if (v.noneOfOthers) {
        q.options.forEach((o, i) => { if (i !== ansIdx && canonType(o) === canonType(t)) msgs.push(`${q.id}: a opção ${letters[i]} coincide com o tipo inferido, mas a resposta é "nenhuma"`); });
      } else {
        if (canonType(q.options[ansIdx]) !== canonType(v.expect)) msgs.push(`${q.id}: a opção correta "${q.options[ansIdx]}" não coincide com o tipo verificado "${v.expect}"`);
        if (bank.demo) q.options.forEach((o, i) => { if (i !== ansIdx && canonType(o) === canonType(v.expect)) msgs.push(`${q.id}: a opção ${letters[i]} também é o tipo inferido (distrator ambíguo)`); });
      }
    } else if (v.kind === 'equiv') {
      const okSet = [];
      for (const [i, opt] of q.options.entries()) if (await equivRun({ name: v.name, sig: v.sig, original: v.original, def: opt, inputs: v.inputs })) okSet.push(letters[i]);
      if (okSet.join() !== q.answer.value) msgs.push(`${q.id}: equivalência — opções equivalentes: [${okSet}] ≠ resposta [${q.answer.value}]`);
    } else msgs.push(`${q.id}: verify desconhecido ${v.kind}`);
  }
  if ((q.answer.status === 'confirmed') && !(q.verify?.length) && !/Moodle/.test(q.answer.basis)) msgs.push(`${q.id}: "confirmed" sem verificação nem confirmação Moodle`);
  return msgs;
}

let qs = bank.questions.filter((q) => !only || q.id.startsWith(only));
const practice = args.includes('--skip-practice') ? [] : qs.filter((q) => q.type === 'practice');
const theory = args.includes('--skip-theory') ? [] : qs.filter((q) => q.type === 'theory' && q.verify?.length);

console.log(`a validar ${practice.length} questões práticas e ${theory.length} teóricas com verificação…`);
const t0 = Date.now();
const pm = await pool(practice, 4, checkPractice);
const tm = await pool(theory, 4, checkTheory);
failures.push(...pm.flat(), ...tm.flat());
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (failures.length) { console.error(`\n${failures.length} PROBLEMA(S):\n` + failures.map((f) => ' - ' + f).join('\n')); process.exit(1); }
console.log('OK — banco validado.');
