// Construção de tentativas: exame original, exame aleatório, treino por tema e repetição de erradas.
// Módulo puro (sem DOM); o gerador de números aleatórios é injetável para testes reprodutíveis.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const PRESETS = {
  mt: { label: 'Mini-teste clássico (6 + 14)', theory: 6, practice: 14 },
  mt2425: { label: 'Mini-teste 24/25 (5 + 15)', theory: 5, practice: 15 },
  recurso: { label: 'Recurso — parte Haskell (2,8 + 7,2)', theory: 2.8, practice: 7.2 },
  custom: { label: 'Personalizado', theory: null, practice: null },
};

/** Presets de estrutura: os do banco (opcionais) ou os predefinidos; "custom" existe sempre. */
export const presetsOf = (bank) => ({ ...(bank?.presets ?? Object.fromEntries(Object.entries(PRESETS).filter(([k]) => k !== 'custom'))), custom: PRESETS.custom });

const cents = (x) => Math.round(x * 100);
const DIFF_RANK = { facil: 0, media: 1, dificil: 2 };

/** Filtra o banco. filters: { types, themes, exams, difficulties, withPoints, excludeIds } */
export function poolFor(bank, filters = {}) {
  const has = (arr) => Array.isArray(arr) && arr.length > 0;
  return bank.questions.filter((q) =>
    (!has(filters.types) || filters.types.includes(q.type)) &&
    (!has(filters.themes) || filters.themes.includes(q.theme)) &&
    (!has(filters.exams) || filters.exams.includes(q.exam)) &&
    (!has(filters.difficulties) || filters.difficulties.includes(q.difficulty)) &&
    (!filters.withPoints || q.points != null) &&
    !(filters.excludeIds && filters.excludeIds.has(q.id)));
}

/**
 * Escolhe um subconjunto cuja soma de cotações fica o mais perto possível de `target`
 * (subset-sum por programação dinâmica sobre cêntimos). A ordem aleatória das questões — com as preferidas
 * (ex.: ainda não vistas) primeiro — decide qual das soluções possíveis sai; a soma exata é sempre encontrada se existir.
 */
export function pickByPoints(pool, target, rng = Math.random, { tolerance = 0.05, prefer = () => 0 } = {}) {
  if (!pool.length || target <= 0) return [];
  const T = cents(target);
  const tol = cents(tolerance);
  const items = shuffle(pool, rng).sort((x, y) => prefer(y) - prefer(x));
  const top = T + tol;
  const via = new Int32Array(top + 1).fill(-1); // via[s] = índice do último item que permitiu chegar a s
  const reach = new Uint8Array(top + 1); reach[0] = 1;
  items.forEach((q, k) => {
    const w = cents(q.points);
    if (w <= 0) return;
    for (let s = top; s >= w; s--) if (!reach[s] && reach[s - w]) { reach[s] = 1; via[s] = k; }
  });
  let sum = -1;
  for (let d = 0; d <= tol && sum < 0; d++) {
    if (T - d >= 0 && reach[T - d]) sum = T - d;
    else if (T + d <= top && reach[T + d]) sum = T + d;
  }
  if (sum <= 0) return [];
  const picked = [];
  while (sum > 0) { const k = via[sum]; picked.push(items[k]); sum -= cents(items[k].points); }
  return picked.reverse();
}

const examOrder = (bank) => Object.fromEntries(bank.exams.map((e, i) => [e.id, i]));

/** Ordena como um exame: teoria primeiro e, dentro de cada parte, por dificuldade crescente e exame de origem. */
function orderLikeExam(bank, qs) {
  const eo = examOrder(bank);
  const qn = (q) => bank.questions.indexOf(q);
  return [...qs].sort((a, b) =>
    (a.type === b.type ? 0 : a.type === 'theory' ? -1 : 1) ||
    DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty] ||
    eo[a.exam] - eo[b.exam] || qn(a) - qn(b));
}

const examById = (bank, id) => bank.exams.find((e) => e.id === id);
const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function baseAttempt(kind, title, qids, extra = {}) {
  return {
    id: newId(), kind, title, createdAt: new Date().toISOString(), startedAt: null, finishedAt: null,
    status: 'in-progress', instant: false, limitSec: null, items: qids.map((id) => ({ qid: id })), answers: {}, ...extra,
  };
}

/** Sugestão (não oficial) de tempo: teoria 1,5 min/questão e prática 6,5 min por valor. */
export function suggestedMinutes(qs) {
  const th = qs.filter((q) => q.type === 'theory').length;
  const pr = qs.filter((q) => q.type === 'practice').reduce((s, q) => s + (q.points ?? 1.5), 0);
  return Math.max(5, Math.round((th * 1.5 + pr * 6.5) / 5) * 5);
}

export function buildOriginal(bank, examId) {
  const exam = examById(bank, examId);
  if (!exam) throw new Error(`exame desconhecido: ${examId}`);
  const qs = bank.questions.filter((q) => q.exam === examId);
  const ordered = [...qs.filter((q) => q.type === 'theory'), ...qs.filter((q) => q.type === 'practice')];
  return baseAttempt('original', `${exam.label}`, ordered.map((q) => q.id), { config: { examId }, limitSec: null, suggestedMin: suggestedMinutes(ordered) });
}

/**
 * Exame aleatório. cfg: { preset|theory,practice (pontos), themes, exams, difficulties, excludeIds, seenIds }
 * Só entram questões com cotação (as do recurso sem data não a têm e nunca se inventa uma).
 */
export function buildRandom(bank, cfg = {}, rng = Math.random) {
  const preset = presetsOf(bank)[cfg.preset] ?? PRESETS.custom;
  const tTheory = cfg.theory ?? preset.theory ?? 6;
  const tPractice = cfg.practice ?? preset.practice ?? 14;
  const filters = { themes: cfg.themes, exams: cfg.exams, difficulties: cfg.difficulties, withPoints: true, excludeIds: cfg.excludeIds };
  const seen = cfg.seenIds ?? new Set();
  const prefer = (q) => (seen.has(q.id) ? 0 : 1);
  const theory = pickByPoints(poolFor(bank, { ...filters, types: ['theory'] }), tTheory, rng, { prefer, tolerance: cfg.tolerance ?? 0.1 });
  const practice = pickByPoints(poolFor(bank, { ...filters, types: ['practice'] }), tPractice, rng, { prefer, tolerance: cfg.tolerance ?? 0.1 });
  const ordered = orderLikeExam(bank, [...theory, ...practice]);
  const sum = (a) => Math.round(a.reduce((s, q) => s + q.points, 0) * 100) / 100;
  return baseAttempt('random', 'Exame aleatório', ordered.map((q) => q.id), {
    config: { preset: cfg.preset ?? 'custom', targetTheory: tTheory, targetPractice: tPractice, themes: cfg.themes ?? null, exams: cfg.exams ?? null, difficulties: cfg.difficulties ?? null },
    achieved: { theory: sum(theory), practice: sum(practice) }, suggestedMin: suggestedMinutes(ordered),
  });
}

/** Treino por tema: feedback imediato, sem tempo nem penalizações. cfg: { themes, types, difficulties, count, onlyGradable, unseenFirst, seenIds } */
export function buildTraining(bank, cfg = {}, rng = Math.random) {
  let pool = poolFor(bank, { themes: cfg.themes, types: cfg.types, difficulties: cfg.difficulties, exams: cfg.exams });
  if (cfg.onlyGradable) pool = pool.filter((q) => q.type === 'practice' || ['official', 'confirmed'].includes(q.answer?.status));
  const seen = cfg.seenIds ?? new Set();
  let ordered = shuffle(pool, rng);
  if (cfg.unseenFirst) ordered = [...ordered.filter((q) => !seen.has(q.id)), ...ordered.filter((q) => seen.has(q.id))];
  const picked = ordered.slice(0, cfg.count ?? 10);
  const titleThemes = cfg.themes?.length ? cfg.themes.map((t) => bank.themes[t]).join(', ') : 'todos os temas';
  return baseAttempt('training', `Treino — ${titleThemes}`, picked.map((q) => q.id), { instant: true, config: { themes: cfg.themes ?? null, types: cfg.types ?? null, difficulties: cfg.difficulties ?? null, count: cfg.count ?? 10 } });
}

/** Repete apenas as questões indicadas (as erradas). */
export function buildRetry(bank, qids, { title = 'Repetição das erradas', instant = false, from = null } = {}) {
  const valid = qids.filter((id) => bank.questions.some((q) => q.id === id));
  return baseAttempt('retry', title, valid, { instant, config: { from } });
}
