// Estatísticas de progresso (módulo puro, sem DOM).
import { normalizeTo20 } from './scoring.js';
import { attemptDuration } from './timer.js';

/** Por tema: certas, erradas (último resultado de cada pergunta) e por fazer. `stats` vem de questionStats(). */
export function themeStats(bank, stats) {
  return Object.entries(bank.themes).map(([t, label]) => {
    const qs = bank.questions.filter((q) => q.theme === t);
    let right = 0; let wrongN = 0;
    const wrongIds = [];
    for (const q of qs) {
      const s = stats.get(q.id);
      if (!s?.last) continue;
      if (['correct', 'passed'].includes(s.last.state)) right++; else { wrongN++; wrongIds.push(q.id); }
    }
    return { t, label, total: qs.length, right, wrongN, todo: qs.length - right - wrongN, wrongIds };
  });
}

/** O tema onde o estudante mais precisa de treinar: menor taxa de acerto (com pelo menos uma errada). */
export function weakestTheme(rows) {
  return rows
    .filter((r) => r.wrongN > 0)
    .sort((a, b) => a.right / (a.right + a.wrongN) - b.right / (b.right + b.wrongN) || b.wrongN - a.wrongN || a.label.localeCompare(b.label))[0] ?? null;
}


const EXAM_KINDS = ['original', 'random'];

/** Pontos do gráfico de evolução: tentativas terminadas de exame (originais/aleatórias) com nota, da mais antiga à mais recente. */
export function trendPoints(attempts) {
  return attempts
    .filter((a) => a.status === 'finished' && EXAM_KINDS.includes(a.kind) && a.summary?.hasPoints && a.summary.max > 0)
    .sort((a, b) => (a.finishedAt ?? '').localeCompare(b.finishedAt ?? ''))
    .map((a) => ({ id: a.id, at: a.finishedAt, title: a.title, kind: a.kind, score: a.summary.score, max: a.summary.max, score20: normalizeTo20(a.summary.score, a.summary.max), durationSec: attemptDuration(a) }));
}

/** Resumo do acompanhamento: média, melhor e última nota /20, e tempo total de estudo (todas as tentativas terminadas). */
export function trendSummary(points, attempts) {
  const scores = points.map((p) => p.score20);
  const studySec = attempts.filter((a) => a.status === 'finished').reduce((s, a) => s + (attemptDuration(a) ?? 0), 0);
  return {
    count: points.length,
    mean: scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 100) / 100 : null,
    best: scores.length ? Math.max(...scores) : null,
    last: scores.length ? scores.at(-1) : null,
    studySec,
  };
}
