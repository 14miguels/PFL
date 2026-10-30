// Corrige uma tentativa: corre os testes em falta, revela as respostas e calcula as pontuações.
import { api } from './api.js';
import { store } from './store.js';
import { starterFor } from './code.js';
import { gradeTheory, gradePractice, penaltyFraction, summarize } from './scoring.js';

export const isBlankCode = (q, code) => !code || !code.trim() || code.trim() === starterFor(q).trim();

export function gradeTheoryItem(q, answerInfo, choice) {
  const g = gradeTheory({ points: q.points, penalty: penaltyFraction(store.examOf(q)), answer: answerInfo, choice });
  return { type: 'theory', ...g };
}

export function gradePracticeItem(q, ans) {
  const code = ans?.code ?? starterFor(q);
  const blank = isBlankCode(q, code);
  const run = ans?.lastRun;
  const g = gradePractice({
    points: q.points, results: run?.results ?? [], constraints: run?.constraints ?? [], capOnViolation: q.capOnViolation ?? null,
    attempted: !blank && !!run, compileError: run?.compileError ?? null,
  });
  return { type: 'practice', counted: true, ...g };
}

export function recomputeSummary(a) {
  const items = a.items.map(({ qid }) => ({ ...(a.results?.[qid] ?? { type: store.byId.get(qid).type, state: 'blank', score: 0, max: store.byId.get(qid).points ?? 0, counted: true }) }));
  a.summary = summarize(items.map((r, i) => ({ ...r, type: store.byId.get(a.items[i].qid).type })));
  return a.summary;
}

/** @param onProgress (texto) => void */
export async function gradeAttempt(a, onProgress = () => {}) {
  const qs = a.items.map((i) => store.byId.get(i.qid));
  // 1) correr os testes das respostas práticas que ainda não foram executadas com o código atual
  for (const q of qs.filter((x) => x.type === 'practice')) {
    const ans = a.answers[q.id] ?? (a.answers[q.id] = {});
    const code = ans.code ?? starterFor(q);
    if (isBlankCode(q, code)) continue;
    if (!ans.lastRun || ans.lastRun.code !== code) {
      onProgress(`A correr os testes de ${q.n} (${store.examOf(q).short})…`);
      try { ans.lastRun = { code, ...(await api.run(q.id, code)) }; } catch (e) { ans.lastRun = { code, compileError: `Falha ao executar: ${e.message}`, results: [], constraints: [] }; }
    }
  }
  // 2) revelar as respostas teóricas
  onProgress('A corrigir…');
  const theoryIds = qs.filter((x) => x.type === 'theory').map((x) => x.id);
  const revealed = theoryIds.length ? await api.reveal(theoryIds) : {};
  // 3) pontuações
  a.results = a.results ?? {};
  for (const q of qs) {
    const prev = a.results[q.id];
    if (q.type === 'theory') a.results[q.id] = { ...gradeTheoryItem(q, revealed[q.id]?.answer, a.answers[q.id]?.choice ?? null), locked: prev?.locked };
    else {
      const r = gradePracticeItem(q, a.answers[q.id]);
      a.results[q.id] = prev?.manual != null ? { ...r, auto: r.score, score: prev.manual, manual: prev.manual } : r;
    }
  }
  recomputeSummary(a);
  a.finishedAt = new Date().toISOString();
  a.status = 'finished';
  return a;
}
