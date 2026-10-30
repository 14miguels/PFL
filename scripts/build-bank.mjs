// Junta os módulos de um banco em bank/questions.json e faz validação estrutural.
// Fontes: bank/demo/ (questões de demonstração, publicadas) ou bank/src/ (banco privado, nunca publicado).
// Por omissão usa bank/src/ se existir; PFL_BANK=demo força a demonstração.
// Uso: node scripts/build-bank.mjs
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { THEMES, DIFFICULTIES } from '../bank/lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 'private' se bank/src/ existir e não for forçada a demonstração; 'demo' caso contrário. */
export function bankMode() {
  if (process.env.PFL_BANK === 'demo') return 'demo';
  return existsSync(path.join(root, 'bank', 'src', 'manifest.mjs')) ? 'private' : 'demo';
}
const STATUS = ['official', 'confirmed', 'unofficial', 'unknown'];

const errors = [];
const err = (m) => errors.push(m);
const near = (a, b) => Math.abs(a - b) < 1e-9;

export async function buildBank() {
  const mode = bankMode();
  const dir = mode === 'demo' ? 'demo' : 'src';
  const manifest = (await import(`../bank/${dir}/manifest.mjs`)).default;
  const exams = [];
  const contexts = [];
  const questions = [];
  for (const f of manifest.files) {
    const m = (await import(`../bank/${dir}/${f}.mjs`)).default;
    exams.push(m.exam);
    for (const c of m.contexts ?? []) contexts.push({ ...c, exam: m.exam.id, support: c.support ?? {} });
    for (const q of m.questions) questions.push({ ...q, exam: m.exam.id, flags: q.flags ?? [], notes: q.notes ?? [], constraints: q.constraints ?? [], needs: q.needs ?? [] });
  }

  // ---- validação estrutural
  const ids = new Set();
  const ctxKey = new Set(contexts.map((c) => `${c.exam}/${c.id}`));
  for (const q of questions) {
    const w = q.id;
    if (ids.has(q.id)) err(`${w}: id duplicado`);
    ids.add(q.id);
    if (!THEMES[q.theme]) err(`${w}: tema desconhecido "${q.theme}"`);
    if (!DIFFICULTIES.includes(q.difficulty)) err(`${w}: dificuldade inválida`);
    if (!q.statement?.trim()) err(`${w}: enunciado vazio`);
    if (!q.source?.file) err(`${w}: falta a fonte`);
    else if (manifest.sourcesOutsideRepo && !existsSync(path.join(root, '..', q.source.file))) err(`${w}: ficheiro-fonte inexistente (${q.source.file})`);
    if (q.ctx && !ctxKey.has(`${q.exam}/${q.ctx}`)) err(`${w}: contexto inexistente "${q.ctx}"`);
    if (q.figure && !existsSync(path.join(root, 'bank', q.figure))) err(`${w}: figura inexistente ${q.figure}`);
    if (q.type === 'theory') {
      if (!Array.isArray(q.options) || q.options.length < 2) err(`${w}: opções em falta`);
      const letters = 'abcdefgh'.slice(0, q.options?.length ?? 0);
      if (!STATUS.includes(q.answer?.status)) err(`${w}: estado da resposta inválido`);
      if (q.answer?.status === 'unknown') { if (q.answer.value !== null) err(`${w}: resposta desconhecida não pode ter valor`); }
      else if (!letters.includes(q.answer?.value)) err(`${w}: resposta "${q.answer?.value}" fora das opções`);
      if (!q.answer?.basis) err(`${w}: falta a justificação (basis) da resposta`);
      if (q.options && new Set(q.options).size !== q.options.length) err(`${w}: opções repetidas`);
    } else if (q.type === 'practice') {
      if (!q.func) err(`${w}: falta func`);
      if (!q.tests?.length) err(`${w}: sem testes`);
      if (!q.refs?.length) err(`${w}: sem referência para validar os testes`);
      for (const t of q.tests ?? []) {
        if (!['enunciado', 'gerado'].includes(t.origin)) err(`${w}: teste com origem inválida`);
        if (!(t.call || t.io)) err(`${w}: teste sem call/io`);
      }
      const ctx = contexts.find((c) => c.exam === q.exam && c.id === q.ctx);
      for (const n of q.needs) if (!ctx?.support?.[n]) err(`${w}: needs "${n}" não existe no contexto`);
    } else err(`${w}: tipo inválido`);
  }

  // ---- somas de pontos por exame
  const summary = [];
  for (const e of exams) {
    const qs = questions.filter((q) => q.exam === e.id);
    const th = qs.filter((q) => q.type === 'theory');
    const pr = qs.filter((q) => q.type === 'practice');
    const pts = (a) => (a.some((q) => q.points == null) ? null : Math.round(a.reduce((s, q) => s + q.points, 0) * 1000) / 1000);
    const total = pts(qs);
    const expected = e.haskellPoints ?? e.totalPoints;
    if (expected != null && (total == null || !near(total, expected))) err(`${e.id}: soma de pontos ${total} ≠ ${expected}`);
    summary.push({ exam: e.id, theory: th.length, practice: pr.length, theoryPts: pts(th), practicePts: pts(pr), total });
    e.stats = { theory: th.length, practice: pr.length, theoryPoints: pts(th), practicePoints: pts(pr), totalPoints: total };
  }

  const bank = { version: 1, themes: THEMES, difficulties: DIFFICULTIES, exams, contexts, questions };
  if (manifest.presets) bank.presets = manifest.presets;
  return { bank, errors, summary, mode, sourcesOutsideRepo: !!manifest.sourcesOutsideRepo };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { bank, errors: errs, summary, mode } = await buildBank();
  console.log(`banco: ${mode === 'demo' ? 'demonstração (bank/demo)' : 'privado (bank/src)'}`);
  console.table(summary);
  console.log(`questões: ${bank.questions.length} (teoria ${bank.questions.filter((q) => q.type === 'theory').length}, prática ${bank.questions.filter((q) => q.type === 'practice').length})`);
  if (errs.length) { console.error('ERROS:\n' + errs.map((e) => ' - ' + e).join('\n')); process.exit(1); }
  writeFileSync(path.join(root, 'bank', 'questions.json'), JSON.stringify(bank, null, 1));
  console.log('bank/questions.json escrito');
}
