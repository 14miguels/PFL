// Blocos de apresentação de uma questão, partilhados pelo corredor de exame, pela revisão e pelo banco.
import { h, rich, TYPE_LABEL, DIFF_LABEL, answerBadge, fmt } from './util.js';
import { store } from './store.js';

const FLAG_TEXT = { 'fonte-inconsistente': 'Enunciado inconsistente', 'fonte-com-erro': 'Erro no enunciado original' };

/** Faixa de identificação: exame, tipo, tema, dificuldade, cotação, fonte. */
export function metaChips(q, { showStatus = true } = {}) {
  const exam = store.examOf(q);
  return h('div', { class: 'qmeta' },
    h('span', { class: 'chip primary', title: exam.label }, exam.short),
    h('span', { class: 'chip' }, TYPE_LABEL[q.type]),
    h('span', { class: 'chip' }, store.bank.themes[q.theme]),
    h('span', { class: 'chip', title: 'Etiqueta editorial (não consta das fontes)' }, `Dificuldade: ${DIFF_LABEL[q.difficulty]}`),
    h('span', { class: 'chip' }, q.points == null ? 'Sem cotação' : `${fmt(q.points)} val`),
    h('span', { class: 'chip', title: 'Ficheiro de origem e pergunta' }, `${q.source.file} · ${q.n}`),
    showStatus && q.type === 'theory' ? h('span', { class: 'row', style: 'gap:4px' }, h('span', { class: 'small muted' }, 'Correção:'), answerBadge(q.answer.status)) : null,
    (q.flags ?? []).map((f) => h('span', { class: 'chip warn' }, FLAG_TEXT[f] ?? f)));
}

export function examRules(q) {
  const exam = store.examOf(q);
  if (!exam.rules?.length) return null;
  return h('details', null, h('summary', null, `Instruções do exame (${exam.short})`),
    h('ul', { class: 'small muted' }, exam.rules.map((r) => h('li', null, r))),
    exam.penalty?.fraction != null && ['stated', 'observed'].includes(exam.penalty.status)
      ? h('p', { class: 'small' }, `Penalização por resposta errada: ${fmt(exam.penalty.fraction * 100)}% da cotação (${exam.penalty.status === 'stated' ? 'indicada no enunciado' : 'observada nas notas; não declarada'}).`)
      : null);
}

/** Contexto partilhado (tipos, dados, código fornecido, figuras) + código auxiliar assumido. */
export function contextBlock(q) {
  const ctx = store.ctxOf(q);
  const needs = q.needs ?? [];
  const parts = [];
  if (ctx?.text) parts.push(rich(ctx.text));
  if (ctx?.figure) parts.push(h('div', { class: 'figure' }, h('img', { src: `/bank/assets/${ctx.figure.replace(/^assets\//, '')}`, alt: 'Figura do enunciado' })));
  if (ctx?.code) parts.push(h('pre', null, h('code', null, ctx.code)));
  if (ctx?.note) parts.push(rich(ctx.note));
  if (needs.length) {
    parts.push(h('div', { class: 'notice' },
      h('strong', null, 'Código auxiliar já disponível'), ' — não o redefinas. ',
      h('span', { class: 'small muted' }, 'O enunciado manda assumir estas funções (de alíneas anteriores ou fornecidas).'),
      needs.map((n) => {
        const e = ctx.support[n];
        return h('details', null, h('summary', null, `${n} — ${e.origin}`), h('pre', null, h('code', null, e.code)));
      })));
  }
  if (!parts.length) return null;
  return h('div', { class: 'stack', style: 'margin-bottom:12px' }, parts);
}

export function statementBlock(q) {
  const fig = q.figure ? h('div', { class: 'figure' }, h('img', { src: `/bank/assets/${q.figure.replace(/^assets\//, '')}`, alt: 'Figura do enunciado' })) : null;
  const stmt = h('div', { class: 'statement' }, q.preface ? h('div', { class: 'notice warn' }, q.preface) : null, rich(q.statement), fig);
  const notes = (q.notes ?? []).length ? h('details', null, h('summary', null, 'Notas de transcrição'), h('ul', { class: 'small' }, q.notes.map((n) => h('li', null, n)))) : null;
  return h('div', null, stmt, notes);
}

const KIND_ICON = { ok: '✓', bad: '✗' };

/** Restrições técnicas, opcionalmente com o resultado da verificação. */
export function constraintsBlock(q, checked = null) {
  const list = q.constraints ?? [];
  if (!list.length) return null;
  const byKey = checked ? new Map(checked.map((c) => [`${c.kind}|${c.text}`, c])) : null;
  return h('div', null,
    h('div', { class: 'label' }, 'Restrições do exercício', checked ? h('span', { class: 'muted', title: 'Análise textual do código, não do significado: pode falhar em casos raros.' }, ' (verificação heurística)') : null),
    h('ul', { class: 'small', style: 'margin:.3em 0; padding-left:1.2em' }, list.map((c) => {
      const r = byKey?.get(`${c.kind}|${c.text}`);
      return h('li', null,
        r ? h('span', { class: r.ok ? 'test-ok' : 'test-bad' }, r.ok ? KIND_ICON.ok : KIND_ICON.bad, ' ') : null,
        c.text, c.severity === 'soft' ? h('span', { class: 'muted' }, ' (para a cotação máxima)') : null,
        r && !r.ok && r.detail ? h('span', { class: 'test-bad' }, ` — ${r.detail}`) : null);
    })),
    q.capOnViolation != null ? h('div', { class: 'small muted' }, `O enunciado limita a ${fmt(q.capOnViolation * 100)}% da cotação as soluções que não sigam a técnica imposta.`) : null);
}

const STATUS_ICON = { PASS: ['✓', 'test-ok'], FAIL: ['✗', 'test-bad'], ERR: ['!', 'test-bad'], TIMEOUT: ['⏱', 'test-bad'], NOT_RUN: ['–', 'test-skip'], MISSING: ['?', 'test-skip'] };
const STATUS_NAME = { PASS: 'passou', FAIL: 'falhou', ERR: 'erro', TIMEOUT: 'tempo excedido', NOT_RUN: 'não correu', MISSING: 'sem resultado' };

/** Tabela dos resultados de testes de uma execução. */
export function testTable(results) {
  return h('table', null,
    h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Teste'), h('th', null, 'Origem'), h('th', null, 'Detalhe'))),
    h('tbody', null, results.map((r) => {
      const [icon, cls] = STATUS_ICON[r.status] ?? ['?', ''];
      const detail = r.status === 'PASS' ? '' : r.status === 'NOT_RUN' ? '' :
        (r.expect !== undefined ? `esperado: ${shorten(r.expect)}${r.cmp === 'set' ? ' (ordem irrelevante)' : ''}\nobtido: ${shorten(r.got)}` : shorten(r.got));
      return h('tr', null,
        h('td', { class: cls, title: STATUS_NAME[r.status] }, icon),
        h('td', { class: 'mono' }, r.label),
        h('td', null, h('span', { class: `chip ${r.origin === 'enunciado' ? 'info' : ''}`, title: r.origin === 'enunciado' ? 'Exemplo retirado do enunciado' : 'Teste gerado por mim: não vem do exame' }, r.origin === 'enunciado' ? 'enunciado' : 'gerado')),
        h('td', { class: 'mono', style: 'white-space:pre-wrap' }, detail));
    })));
}
const shorten = (s) => (s ?? '').length > 300 ? `${s.slice(0, 300)}…` : (s ?? '');

export function runSummary(run) {
  if (!run) return null;
  if (run.compileError) return h('div', { class: 'notice err' }, h('strong', null, 'Erro de compilação'), h('pre', null, h('code', null, run.compileError)));
  const ok = run.results.filter((r) => r.status === 'PASS').length;
  return h('div', { class: 'stack' },
    h('div', { class: `notice ${ok === run.results.length ? 'ok' : 'warn'}` },
      h('strong', null, `${ok}/${run.results.length} testes passaram`),
      run.timedOut ? ' — o programa excedeu o tempo (possível ciclo infinito).' : '',
      h('span', { class: 'small muted' }, ' · os testes "gerado" não vêm do exame; "enunciado" são os exemplos do próprio enunciado.')),
    testTable(run.results));
}
