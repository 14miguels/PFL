// Pontuação das respostas (módulo puro, usado no browser e nos testes).
// Regras:
//  - só respostas "official" e "confirmed" contam para a nota da teoria; "unofficial" é indicativa; "unknown" não é corrigida;
//  - penalização por resposta errada só quando o exame a especifica ("stated") ou a mostra nas notas ("observed");
//  - prática: nota estimada = cotação × (testes passados / testes); se o enunciado limita a 25% em caso de violação
//    da técnica imposta (capOnViolation), aplica-se esse limite. A autoavaliação manual pode substituir a estimativa.

// 3 casas decimais: as cotações dos exames têm até 3 (ex.: −0,125) e não devem ser arredondadas a 2.
export const round2 = (x) => (Math.round(x * 1000) / 1000) + 0;

export function penaltyFraction(exam) {
  const p = exam?.penalty;
  return p && (p.status === 'stated' || p.status === 'observed') && typeof p.fraction === 'number' ? p.fraction : 0;
}

/** @returns {{state:string, score:number, max:number, counted:boolean}} */
export function gradeTheory({ points, penalty = 0, answer, choice }) {
  const max = points ?? 0;
  const blank = choice == null || choice === '';
  if (!answer || answer.status === 'unknown') return { state: blank ? 'blank' : 'ungraded', score: 0, max, counted: false };
  if (blank) return { state: 'blank', score: 0, max, counted: true };
  const correct = choice === answer.value;
  if (answer.status === 'unofficial') return { state: correct ? 'indicative-correct' : 'indicative-wrong', score: 0, max, counted: false };
  if (correct) return { state: 'correct', score: max, max, counted: true };
  return { state: 'wrong', score: penalty ? -round2(max * penalty) : 0, max, counted: true };
}

const TECH_KINDS_EXEMPT = new Set(['no-import', 'forbid-imports']);

/** @returns {{state:string, score:number, max:number, fraction:number, passed:number, total:number, capped:boolean}} */
export function gradePractice({ points, results, constraints = [], capOnViolation = null, attempted = true, compileError = null }) {
  const max = points ?? 0;
  const total = results?.length ?? 0;
  if (!attempted) return { state: 'blank', score: 0, max, fraction: 0, passed: 0, total, capped: false };
  const passed = (results ?? []).filter((r) => r.status === 'PASS').length;
  let fraction = compileError || total === 0 ? 0 : passed / total;
  const violations = constraints.filter((c) => !c.ok && c.severity === 'hard' && !TECH_KINDS_EXEMPT.has(c.kind));
  let capped = false;
  if (capOnViolation != null && violations.length && fraction > capOnViolation) { fraction = capOnViolation; capped = true; }
  const state = fraction === 1 && !violations.length ? 'passed' : fraction > 0 ? 'partial' : 'failed';
  return { state, score: round2(max * fraction), max, fraction, passed, total, capped };
}

/**
 * Agrega os resultados de uma tentativa.
 * items: [{ type, max, score, counted, state }]
 */
export function summarize(items) {
  const sum = (arr, f) => round2(arr.reduce((s, x) => s + f(x), 0));
  const part = (type) => {
    const xs = items.filter((i) => i.type === type);
    const counted = xs.filter((i) => i.counted !== false);
    return {
      questions: xs.length,
      gradable: counted.length,
      ungraded: xs.length - counted.length,
      correct: counted.filter((i) => ['correct', 'passed'].includes(i.state)).length,
      score: sum(counted, (i) => i.score ?? 0),
      max: sum(counted, (i) => i.max ?? 0),
    };
  };
  const theory = part('theory');
  const practice = part('practice');
  const hasPoints = items.every((i) => i.max > 0);
  return { theory, practice, score: round2(theory.score + practice.score), max: round2(theory.max + practice.max), hasPoints };
}

/** Nota normalizada a 20 (só faz sentido quando todas as questões têm cotação). */
export function normalizeTo20(score, max) { return max > 0 ? round2((score / max) * 20) : null; }
