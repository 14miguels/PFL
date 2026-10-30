// Estado da aplicação: banco (sem respostas), tentativas persistidas no servidor e estatísticas derivadas.
import { api } from './api.js';

export const store = {
  bank: null, byId: new Map(), attempts: new Map(), settings: {},
  examOf(q) { return this.bank.exams.find((e) => e.id === q.exam); },
  ctxOf(q) { return this.bank.contexts.find((c) => c.exam === q.exam && c.id === q.ctx) ?? null; },
};

export async function init() {
  const [bank, state] = await Promise.all([api.bank(), api.state()]);
  store.bank = bank;
  store.byId = new Map(bank.questions.map((q) => [q.id, q]));
  store.attempts = new Map(Object.entries(state.attempts ?? {}));
  store.settings = state.settings ?? {};
}

const timers = new Map();
/** Guarda a tentativa no servidor (com debounce, salvo `immediate`). */
export function saveAttempt(a, { immediate = false } = {}) {
  store.attempts.set(a.id, a);
  clearTimeout(timers.get(a.id));
  const send = () => api.saveAttempt(a).catch((e) => console.error('falha a guardar', e));
  if (immediate) return send();
  timers.set(a.id, setTimeout(send, 500));
}
export function flushAttempt(a) { clearTimeout(timers.get(a.id)); return api.saveAttempt(a).catch(() => {}); }
export async function removeAttempt(id) { store.attempts.delete(id); await api.deleteAttempt(id); }

export const attemptsList = () => [...store.attempts.values()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
export const finished = () => attemptsList().filter((a) => a.status === 'finished');
export const inProgress = () => attemptsList().filter((a) => a.status !== 'finished');

/** Estados que contam como "errei". */
export const WRONG_STATES = ['wrong', 'failed', 'partial'];

/**
 * Estatísticas por questão a partir das tentativas terminadas (mais recentes por último).
 * last = último resultado corrigível; completed = prática alguma vez com todos os testes a passar.
 */
export function questionStats() {
  const stats = new Map();
  const done = [...finished()].reverse();
  for (const a of done) {
    for (const [qid, r] of Object.entries(a.results ?? {})) {
      const s = stats.get(qid) ?? { tries: 0, completed: false, everCorrect: false, last: null };
      s.tries++;
      if (r.state === 'passed') s.completed = true;
      if (r.state === 'correct') s.everCorrect = true;
      if (['correct', 'wrong', 'blank', 'passed', 'partial', 'failed'].includes(r.state)) s.last = { state: r.state, at: a.finishedAt, attemptId: a.id };
      stats.set(qid, s);
    }
  }
  return stats;
}

export function wrongIds({ includeBlank = false, attemptId = null } = {}) {
  const states = includeBlank ? [...WRONG_STATES, 'blank'] : WRONG_STATES;
  if (attemptId) {
    const a = store.attempts.get(attemptId);
    return Object.entries(a?.results ?? {}).filter(([, r]) => states.includes(r.state)).map(([id]) => id);
  }
  const out = [];
  for (const [qid, s] of questionStats()) if (s.last && states.includes(s.last.state)) out.push(qid);
  return out;
}
