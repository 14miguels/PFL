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

// ---- gravação no servidor: debounce, repetição em caso de falha e estado observável
const timers = new Map(); // gravações adiadas (debounce)
const dirty = new Set(); // tentativas cuja última gravação falhou
let inflight = 0; let retryTimer = null; let saveState = 'saved';
const saveListeners = new Set();
/** Atrasos em ms (exportado para os testes os poderem reduzir). */
export const SAVE_OPTS = { debounceMs: 500, retryMs: 3000 };

function refreshSaveState() {
  const next = inflight ? 'saving' : dirty.size ? 'error' : timers.size ? 'pending' : 'saved';
  if (next !== saveState) { saveState = next; saveListeners.forEach((f) => f(next)); }
}
/** Observa o estado ('saved' | 'pending' | 'saving' | 'error'); devolve a função que cancela a subscrição. */
export function onSaveStatus(fn) { saveListeners.add(fn); fn(saveState); return () => saveListeners.delete(fn); }

function sendAttempt(id) {
  const a = store.attempts.get(id);
  if (!a) { dirty.delete(id); refreshSaveState(); return Promise.resolve(); }
  inflight++; refreshSaveState();
  return api.saveAttempt(a).then(() => { dirty.delete(id); }, (e) => {
    console.error('falha a guardar', e);
    dirty.add(id);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { [...dirty].forEach(sendAttempt); }, SAVE_OPTS.retryMs);
  }).finally(() => { inflight--; refreshSaveState(); });
}

/** Guarda a tentativa no servidor (com debounce, salvo `immediate`). */
export function saveAttempt(a, { immediate = false } = {}) {
  store.attempts.set(a.id, a);
  clearTimeout(timers.get(a.id));
  if (immediate) { timers.delete(a.id); return sendAttempt(a.id); }
  timers.set(a.id, setTimeout(() => { timers.delete(a.id); sendAttempt(a.id); }, SAVE_OPTS.debounceMs));
  refreshSaveState();
}
export function flushAttempt(a) { clearTimeout(timers.get(a.id)); timers.delete(a.id); return sendAttempt(a.id); }
export async function removeAttempt(id) { clearTimeout(timers.get(id)); timers.delete(id); dirty.delete(id); store.attempts.delete(id); await api.deleteAttempt(id); refreshSaveState(); }

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
