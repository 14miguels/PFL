// Estatísticas de progresso (módulo puro, sem DOM).

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
