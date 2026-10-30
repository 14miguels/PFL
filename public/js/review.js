// Revisão de uma tentativa terminada: nota, resposta correta, resultados dos testes e soluções de referência.
import { h, clear, put, fmt, fmtDuration, KIND_LABEL, answerBadge, toast } from './util.js';
import { store, saveAttempt, wrongIds } from './store.js';
import { api } from './api.js';
import { go } from './router.js';
import { metaChips, examRules, contextBlock, statementBlock, constraintsBlock, runSummary } from './qview.js';
import { refsBlock } from './runner.js';
import { normalizeTo20 } from './scoring.js';
import { recomputeSummary } from './grading.js';
import { buildRetry, buildOriginal } from './generator.js';
import { startAttempt } from './views.js';

const STATE_TEXT = {
  correct: ['ok', 'Correta'], wrong: ['err', 'Errada'], blank: ['', 'Em branco'], ungraded: ['', 'Sem correção'], 'indicative-correct': ['warn', 'Coincide (chave não oficial)'], 'indicative-wrong': ['warn', 'Difere (chave não oficial)'],
  passed: ['ok', 'Todos os testes passaram'], partial: ['warn', 'Parcial'], failed: ['err', 'Falhou'],
};

export async function renderReview(root, id) {
  const a = store.attempts.get(id);
  if (!a || a.status !== 'finished') { go(`/run/${id}`); return; }
  const qs = a.items.map((i) => store.byId.get(i.qid));
  const revealed = await api.reveal(qs.map((q) => q.id));
  const s = a.summary;
  const dur = a.startedAt && a.finishedAt ? (new Date(a.finishedAt) - new Date(a.startedAt)) / 1000 : null;
  const wrong = wrongIds({ attemptId: a.id });
  const wrongBlank = wrongIds({ attemptId: a.id, includeBlank: true });
  const summaryBox = h('div', { class: 'card' });
  const drawSummary = () => {
    clear(summaryBox);
    const total = s.hasPoints ? h('div', null, h('div', { class: 'score-big' }, `${fmt(s.score)}`, h('span', { class: 'muted', style: 'font-size:1.2rem' }, ` / ${fmt(s.max)}`)), h('div', { class: 'muted' }, `≈ ${fmt(normalizeTo20(s.score, s.max), 1)} / 20 (nota normalizada)`))
      : h('div', null, h('div', { class: 'score-big' }, `${s.theory.correct + s.practice.correct}`, h('span', { class: 'muted', style: 'font-size:1.2rem' }, ` / ${s.theory.gradable + s.practice.gradable}`)), h('div', { class: 'muted' }, 'respostas certas (as questões desta tentativa não têm todas cotação)'));
    put(summaryBox, h('div', { class: 'row', style: 'align-items:flex-start;gap:30px' }, total,
      h('dl', { class: 'kv' },
        h('dt', null, 'Teoria'), h('dd', null, `${fmt(s.theory.score)} / ${fmt(s.theory.max)} · ${s.theory.correct}/${s.theory.gradable} certas${s.theory.ungraded ? ` · ${s.theory.ungraded} sem correção` : ''}`),
        h('dt', null, 'Prática (estimativa)'), h('dd', null, `${fmt(s.practice.score)} / ${fmt(s.practice.max)} · ${s.practice.correct}/${s.practice.gradable} totalmente certas`),
        h('dt', null, 'Duração'), h('dd', null, fmtDuration(dur)), h('dt', null, 'Tipo'), h('dd', null, KIND_LABEL[a.kind]))),
      h('div', { class: 'notice warn', style: 'margin-top:12px' }, 'A nota da prática é uma estimativa automática (testes); a correção real é manual. Podes ajustar a nota de cada exercício em baixo (autoavaliação).'),
      h('div', { class: 'row', style: 'margin-top:12px' },
        h('button', { class: 'btn primary', disabled: !wrong.length, onclick: () => startAttempt(buildRetry(store.bank, wrong, { instant: true, from: a.id, title: `Repetição: ${a.title}` })) }, `↻ Repetir só as erradas (${wrong.length})`),
        wrongBlank.length > wrong.length ? h('button', { class: 'btn', onclick: () => startAttempt(buildRetry(store.bank, wrongBlank, { instant: true, from: a.id, title: `Repetição: ${a.title}` })) }, `Incluir em branco (${wrongBlank.length})`) : null,
        a.kind === 'original' ? h('button', { class: 'btn', onclick: () => startAttempt(buildOriginal(store.bank, a.config.examId)) }, 'Refazer este exame') : null,
        h('a', { class: 'btn ghost', href: '#/history' }, 'Histórico')));
  };
  drawSummary();
  put(root, h('h1', null, a.title), summaryBox, h('h2', { style: 'margin-top:20px' }, 'Pergunta a pergunta'));
  qs.forEach((q, i) => put(root, questionReview(a, q, i, revealed[q.id], drawSummary)));
}

function questionReview(a, q, i, rev, redraw) {
  const r = a.results[q.id] ?? { state: 'blank', score: 0, max: q.points ?? 0 };
  const [cls, label] = STATE_TEXT[r.state] ?? ['', r.state];
  const open = ['wrong', 'failed', 'partial'].includes(r.state);
  const scoreTxt = q.points == null ? '' : `${fmt(r.score)} / ${fmt(r.max)}`;
  const body = h('div', { class: 'stack', style: 'margin-top:10px' }, metaChips(q, { showStatus: false }), examRules(q), contextBlock(q), statementBlock(q));
  if (q.type === 'theory') {
    const choice = a.answers[q.id]?.choice;
    const info = rev.answer;
    put(body, h('div', { class: 'options' }, q.options.map((o, k) => {
      const L = 'abcdefgh'[k];
      let c = 'option'; if (info.value === L) c += ' correct'; else if (choice === L) c += ' wrong';
      return h('div', { class: c, style: 'cursor:default' }, h('span', { class: 'letter' }, L), h('span', { class: 'txt' }, o), choice === L ? h('span', { class: 'chip', style: 'margin-left:auto' }, 'a tua resposta') : null);
    })),
      h('div', { class: `notice ${info.status === 'unknown' ? 'warn' : ''}` }, answerBadge(info.status), ' ', info.value ? h('strong', null, `Resposta: ${info.value})`) : h('strong', null, 'Resposta desconhecida'), h('div', { class: 'small muted' }, info.basis)));
  } else {
    const ans = a.answers[q.id] ?? {};
    put(body, constraintsBlock(q, ans.lastRun?.constraints ?? null),
      h('div', null, h('div', { class: 'label' }, 'O teu código'), h('pre', null, h('code', null, ans.code ?? '(vazio)'))),
      ans.lastRun ? runSummary(ans.lastRun) : h('div', { class: 'notice' }, 'Os testes não foram executados (resposta em branco).'),
      r.capped ? h('div', { class: 'notice warn' }, 'Nota limitada: violaste a técnica imposta pelo enunciado (máx. 25% da cotação).') : null,
      selfGrade(a, q, r, redraw),
      h('details', null, h('summary', null, 'Soluções de referência (nenhuma é oficial)'), refsBlock(rev.refs)));
  }
  return h('details', { class: 'card', open }, h('summary', { style: 'display:flex; gap:10px; align-items:center; flex-wrap:wrap; color:var(--text)' },
    h('strong', null, `${i + 1}.`), h('span', { class: `chip ${cls}` }, label), h('span', null, `${store.examOf(q).short} · ${q.n}`), h('span', { class: 'muted small' }, store.bank.themes[q.theme]), h('span', { class: 'spacer' }), h('span', { class: 'nowrap' }, scoreTxt)), body);
}

function selfGrade(a, q, r, redraw) {
  if (q.points == null) return null;
  const inp = h('input', { type: 'number', min: 0, max: q.points, step: 0.05, value: r.manual ?? r.score, 'aria-label': 'Nota atribuída' });
  return h('div', { class: 'row' }, h('span', { class: 'label' }, `Autoavaliação (0–${fmt(q.points)}):`), inp,
    h('button', { class: 'btn sm', onclick: () => {
      const v = Math.max(0, Math.min(q.points, Number(inp.value)));
      const cur = a.results[q.id];
      a.results[q.id] = { ...cur, auto: cur.auto ?? cur.score, score: v, manual: v };
      recomputeSummary(a); saveAttempt(a, { immediate: true });
      toast('Nota atualizada'); go(`/review/${a.id}`);
    } }, 'Guardar'),
    r.manual != null ? h('span', { class: 'chip primary' }, `manual (auto: ${fmt(r.auto)})`) : h('span', { class: 'small muted' }, `estimativa automática: ${fmt(r.score)}`));
}
