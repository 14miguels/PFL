// Corredor de exame/treino: ecrã inicial, navegação, resposta teórica, editor Haskell, execução de testes e entrega.
import { h, clear, put, fmt, fmtDuration, TYPE_LABEL, KIND_LABEL, answerBadge, rich, toast, confirmBox, modal } from './util.js';
import { store, saveAttempt, flushAttempt, onSaveStatus } from './store.js';
import { api } from './api.js';
import { metaChips, examRules, contextBlock, statementBlock, constraintsBlock, runSummary } from './qview.js';
import { starterFor, exportHs, importHs, download } from './code.js';
import { gradeAttempt, gradeTheoryItem, gradePracticeItem, isBlankCode, recomputeSummary } from './grading.js';
import { penaltyFraction } from './scoring.js';
import { go, onLeave } from './router.js';
import { lineRange } from './hints.js';
import { migrate, resume, pause, heartbeat, finalize, elapsedSec, timeModeOf } from './timer.js';

const LETTERS = 'abcdefgh';
const isFormField = (t) => t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);

export function renderRunner(root, attemptId) {
  const a = store.attempts.get(attemptId);
  if (!a) { put(root, h('div', { class: 'empty' }, 'Tentativa não encontrada.')); return; }
  if (a.status === 'finished') { go(`/review/${a.id}`); return; }
  if (!a.startedAt && ['original', 'random'].includes(a.kind)) return renderStart(root, a);
  if (!a.startedAt) { a.startedAt = new Date().toISOString(); saveAttempt(a, { immediate: true }); }
  runAttempt(root, a);
}

// ---------------------------------------------------------------- ecrã inicial (exame real)
function renderStart(root, a) {
  const qs = a.items.map((i) => store.byId.get(i.qid));
  const exams = [...new Set(qs.map((q) => q.exam))].map((id) => store.bank.exams.find((e) => e.id === id));
  const th = qs.filter((q) => q.type === 'theory'); const pr = qs.filter((q) => q.type === 'practice');
  const pts = (xs) => (xs.some((q) => q.points == null) ? null : xs.reduce((s, q) => s + q.points, 0));
  const pens = exams.map((e) => ({ e, p: penaltyFraction(e) })).filter((x) => x.p);
  const minutes = h('input', { type: 'number', min: 5, max: 300, step: 5, value: a.suggestedMin ?? 90, id: 'minutes' });
  const useTimer = h('input', { type: 'checkbox', id: 'use-timer', checked: true });
  put(root, 
    h('h1', null, a.title),
    h('div', { class: 'card stack' },
      h('div', { class: 'row' }, h('span', { class: 'chip primary' }, KIND_LABEL[a.kind]), h('span', { class: 'chip' }, `${th.length} questões de teoria${pts(th) != null ? ` · ${fmt(pts(th))} val` : ''}`), h('span', { class: 'chip' }, `${pr.length} de prática${pts(pr) != null ? ` · ${fmt(pts(pr))} val` : ''}`)),
      h('div', { class: 'notice' }, h('strong', null, 'Como numa avaliação real: '), 'as soluções só aparecem depois de entregares. Podes marcar perguntas para rever (⚑) e voltar atrás. A prática corre-se localmente com testes (GHC).'),
      a.kind === 'random' ? h('p', { class: 'small muted' }, `Cotações atingidas: teoria ${fmt(a.achieved?.theory)} (alvo ${fmt(a.config.targetTheory)}), prática ${fmt(a.achieved?.practice)} (alvo ${fmt(a.config.targetPractice)}). As cotações são as originais de cada pergunta.`) : null,
      pens.length ? h('div', { class: 'notice warn' }, `Penalização por resposta errada na teoria: ${pens.map((x) => `${fmt(x.p * 100)}% (${x.e.short})`).join('; ')}. Em branco não desconta.`) : h('p', { class: 'small muted' }, 'Sem penalização por resposta errada (não consta nas fontes destes exames).'),
      a.kind === 'original' && exams[0]?.notes?.length ? h('details', null, h('summary', null, 'Notas sobre este exame'), h('ul', { class: 'small' }, exams[0].notes.map((n) => h('li', null, n)))) : null,
      a.kind === 'original' && exams[0]?.rules?.length ? h('details', null, h('summary', null, 'Instruções do exame'), h('ul', { class: 'small' }, exams[0].rules.map((r) => h('li', null, r)))) : null,
      h('div', { class: 'row' },
        h('label', { class: 'check' }, useTimer, 'Contagem decrescente'),
        h('label', { class: 'row small', for: 'minutes' }, minutes, 'minutos ', h('span', { class: 'muted' }, '(sugestão minha, não oficial)'))),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary lg', onclick: () => { a.startedAt = new Date().toISOString(); a.limitSec = useTimer.checked ? Math.max(1, Number(minutes.value) || 90) * 60 : null; saveAttempt(a, { immediate: true }); clear(root); runAttempt(root, a); } }, '▶ Começar'),
        h('a', { class: 'btn', href: '#/' }, 'Cancelar'))));
}

// ---------------------------------------------------------------- corredor
function runAttempt(root, a) {
  const qs = a.items.map((i) => store.byId.get(i.qid));
  a.cursor = Math.min(a.cursor ?? 0, qs.length - 1);
  a.answers ??= {}; a.results ??= {};
  migrate(a); resume(a); saveAttempt(a, { immediate: true });
  const instant = !!a.instant;
  const ans = (q) => (a.answers[q.id] ??= {});
  const answered = (q) => (q.type === 'theory' ? !!ans(q).choice : ans(q).code != null && !isBlankCode(q, ans(q).code));

  const head = h('div', { class: 'runner-head' });
  const body = h('div');
  put(root, head, body);
  const saveEl = h('span', { class: 'save-status', 'aria-live': 'polite' });
  const SAVE_TXT = { saved: '✓ guardado', pending: '… a guardar', saving: '… a guardar', error: '⚠ não guardado' };
  const offSave = onSaveStatus((s) => { saveEl.textContent = SAVE_TXT[s]; saveEl.className = `save-status ${s}`; });
  const timerEl = h('span', { class: 'timer', title: a.limitSec ? 'Tempo restante' : 'Tempo decorrido' }, '');
  let interval;
  let finishing = false;

  const tick = () => {
    const elapsed = elapsedSec(a);
    heartbeat(a);
    if (Math.floor(elapsed) % 10 === 0) saveAttempt(a); // sinal de vida: limita o tempo perdido numa saída abrupta
    if (a.limitSec) {
      const left = a.limitSec - elapsed;
      timerEl.textContent = `⏱ ${fmtDuration(left)}`;
      timerEl.classList.toggle('low', left < 300);
      if (left <= 0 && !finishing) { toast('Tempo esgotado — a entregar.'); finish(true); }
    } else timerEl.textContent = `⏱ ${fmtDuration(elapsed)}`;
  };
  interval = setInterval(tick, 1000); tick();
  const leave = () => { offSave(); clearInterval(interval); document.removeEventListener('keydown', onKey); window.removeEventListener('pagehide', onHide); if (a.status !== 'finished' && timeModeOf(a) !== 'continuous') pause(a); flushAttempt(a); };
  const onHide = () => { if (a.status !== 'finished') { if (timeModeOf(a) !== 'continuous') pause(a); flushAttempt(a); } };
  window.addEventListener('pagehide', onHide);
  onLeave(leave);

  function chipClass(q, i) {
    const r = a.results[q.id];
    let c = 'qchip';
    if (i === a.cursor) c += ' current';
    if (ans(q).flagged) c += ' flagged';
    if (instant && r) c += r.state === 'correct' || r.state === 'passed' ? ' pass' : r.state === 'partial' ? ' partial' : ' fail';
    else if (answered(q)) c += ' answered';
    return c;
  }

  function chipLabel(q, i) {
    const r = a.results[q.id];
    const state = instant && r ? ({ correct: 'certa', passed: 'certa', partial: 'parcial' }[r.state] ?? 'errada') : answered(q) ? 'respondida' : 'por responder';
    return `Pergunta ${i + 1} (${TYPE_LABEL[q.type]}), ${state}${ans(q).flagged ? ', marcada para rever' : ''}`;
  }

  function renderHead() {
    clear(head);
    const th = qs.filter((q) => q.type === 'theory'); const pr = qs.filter((q) => q.type === 'practice');
    const chips = (list) => list.map((q) => { const i = qs.indexOf(q); return h('button', { class: chipClass(q, i), title: `${q.source.file} · ${q.n}`, 'aria-label': chipLabel(q, i), 'aria-current': i === a.cursor ? 'true' : null, onclick: () => goTo(i) }, String(i + 1)); });
    // teoria e prática só se separam quando a ordem já é "toda a teoria, depois toda a prática" (exames); no treino
    // misturado uma lista única mantém os números sequenciais
    const grouped = qs.every((q, i) => i === 0 || !(qs[i - 1].type === 'practice' && q.type === 'theory'));
    put(head, 
      h('div', { class: 'row' },
        h('strong', null, a.title), h('span', { class: 'chip' }, KIND_LABEL[a.kind]), h('span', { class: 'spacer' }), saveEl, timerEl,
        h('button', { class: 'btn sm', onclick: () => go('/'), title: timeModeOf(a) === 'continuous' ? 'O progresso fica guardado, mas o tempo continua a contar' : 'O progresso fica guardado e o tempo fica em pausa' }, 'Guardar e sair'),
        h('button', { class: 'btn primary sm', onclick: () => finish(false) }, instant ? 'Terminar treino' : 'Entregar')),
      h('div', { class: 'qnav', role: 'navigation', 'aria-label': 'Perguntas' },
        grouped ? [th.length ? [h('span', { class: 'sec' }, 'Teoria'), chips(th)] : null, pr.length ? [h('span', { class: 'sec' }, 'Prática'), chips(pr)] : null] : chips(qs),
        h('span', { class: 'sec' }, `${qs.filter(answered).length}/${qs.length} respondidas`)));
  }

  function goTo(i) { a.cursor = Math.max(0, Math.min(qs.length - 1, i)); saveAttempt(a); renderAll(); window.scrollTo({ top: 0 }); }

  function renderAll() { renderHead(); renderBody(); }

  // ------------------------------------------------ corpo da pergunta
  function renderBody() {
    clear(body);
    const q = qs[a.cursor];
    const card = h('div', { class: 'card' },
      h('div', { class: 'row', style: 'margin-bottom:6px' },
        h('h2', { style: 'margin:0' }, `Questão ${a.cursor + 1} de ${qs.length}`), h('span', { class: 'spacer' }),
        h('button', { class: `btn sm ${ans(q).flagged ? 'primary' : ''}`, onclick: () => { ans(q).flagged = !ans(q).flagged; saveAttempt(a); renderAll(); } }, ans(q).flagged ? '⚑ Marcada' : '⚐ Marcar para rever')),
      metaChips(q), examRules(q), contextBlock(q), statementBlock(q),
      q.type === 'theory' ? theoryUi(q) : practiceUi(q));
    put(body, card,
      h('div', { class: 'footer-nav' },
        h('button', { class: 'btn', disabled: a.cursor === 0, onclick: () => goTo(a.cursor - 1) }, '← Anterior'),
        h('span', { class: 'spacer' }),
        a.cursor < qs.length - 1 ? h('button', { class: 'btn primary', onclick: () => goTo(a.cursor + 1) }, 'Seguinte →') : h('button', { class: 'btn primary', onclick: () => finish(false) }, instant ? 'Terminar treino' : 'Entregar')));
  }

  // ------------------------------------------------ teoria
  function theoryUi(q) {
    const choice = ans(q).choice;
    const locked = !!a.results[q.id]?.locked;
    const revealedAnswer = a.results[q.id]?.answerValue;
    const looksCode = q.options.some((o) => /[=>\\()]|->/.test(o) && o.length < 90);
    const opts = h('div', { class: 'options', role: 'radiogroup', 'aria-label': 'Opções' }, q.options.map((o, i) => {
      const L = LETTERS[i];
      let cls = 'option';
      if (choice === L) cls += ' selected';
      if (locked) { if (L === revealedAnswer) cls += ' correct'; else if (choice === L) cls = 'option wrong'; }
      return h('button', { class: cls, role: 'radio', 'aria-checked': choice === L, disabled: locked, onclick: () => { ans(q).choice = choice === L ? null : L; saveAttempt(a); renderAll(); } },
        h('span', { class: 'letter' }, L), h('span', { class: `txt ${looksCode ? 'mono' : ''}` }, o));
    }));
    const extra = [];
    if (instant && !locked) {
      extra.push(h('div', { class: 'row', style: 'margin-top:12px' },
        h('button', { class: 'btn primary', disabled: !choice, onclick: () => verifyTheory(q) }, 'Verificar resposta'),
        h('span', { class: 'small muted' }, 'Treino: o feedback é imediato e a pergunta fica bloqueada.')));
    }
    if (locked) extra.push(theoryFeedback(q));
    return h('div', null, opts, extra);
  }

  async function verifyTheory(q) {
    const r = await api.reveal([q.id]);
    const info = r[q.id].answer;
    a.results[q.id] = { ...gradeTheoryItem(q, info, ans(q).choice), locked: true, answerValue: info.value, basis: info.basis, answerStatus: info.status };
    saveAttempt(a, { immediate: true }); renderAll();
  }

  function theoryFeedback(q) {
    const r = a.results[q.id];
    const map = { correct: ['ok', 'Correta!'], wrong: ['err', 'Incorreta.'], ungraded: ['', 'Sem correção automática: a fonte não revela a solução.'], 'indicative-correct': ['warn', 'Coincide com a chave não oficial (indicativo).'], 'indicative-wrong': ['warn', 'Difere da chave não oficial (indicativo).'] };
    const [cls, txt] = map[r.state] ?? ['', r.state];
    return h('div', { class: `notice ${cls}`, style: 'margin-top:12px' }, h('strong', null, txt), ' ', answerBadge(r.answerStatus),
      r.answerValue ? h('div', { class: 'small' }, `Resposta: ${r.answerValue}) `, h('span', { class: 'muted' }, r.basis)) : h('div', { class: 'small muted' }, r.basis));
  }

  // ------------------------------------------------ prática
  function practiceUi(q) {
    const a_ = ans(q);
    if (a_.code == null) a_.code = starterFor(q);
    const ta = h('textarea', { class: 'code', spellcheck: false, autocapitalize: 'off', autocomplete: 'off', 'aria-label': `Código Haskell de ${q.func}`, value: a_.code });
    ta.addEventListener('input', () => { a_.code = ta.value; saveAttempt(a); updateChip(); });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
      else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {   // auto-indentação
        const before = ta.value.slice(0, ta.selectionStart); const line = before.slice(before.lastIndexOf('\n') + 1);
        const ind = line.match(/^\s*/)[0];
        if (ind) { e.preventDefault(); ta.setRangeText(`\n${ind}`, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
      }
    });
    const out = h('div', { class: 'stack result-out', style: 'margin-top:12px' });
    const gotoLine = (line) => {
      const range = lineRange(ta.value, line);
      if (!range) return;
      ta.focus(); ta.setSelectionRange(range[0], range[1]);
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = Math.max(0, (line - 3) * lh);
      ta.scrollIntoView({ block: 'nearest' });
    };
    const runBtn = h('button', { class: 'btn primary', onclick: () => run() }, '▶ Executar testes');
    const fileInput = h('input', { type: 'file', accept: '.hs,.txt', style: 'display:none', onchange: async (e) => { const f = e.target.files[0]; if (!f) return; ta.value = importHs(await f.text()); ta.dispatchEvent(new Event('input')); toast(`Carregado ${f.name}`); e.target.value = ''; } });
    const updateChip = () => { const c = head.querySelectorAll('.qchip')[a.cursor]; if (c) c.className = chipClass(q, a.cursor); };

    function renderOut() {
      clear(out);
      put(out, constraintsBlock(q, a_.lastRun?.code === a_.code ? a_.lastRun.constraints : null));
      if (a_.lastRun) {
        if (a_.lastRun.code !== a_.code) put(out, h('div', { class: 'notice warn' }, 'O código mudou desde a última execução — volta a executar os testes.'));
        put(out, runSummary(a_.lastRun, { onGoto: gotoLine }));
      }
      if (instant) put(out, solutionBox(q));
    }

    async function run() {
      if (isBlankCode(q, ta.value)) { toast('Escreve primeiro a tua solução.'); return; }
      runBtn.disabled = true; clear(out); put(out, h('div', { class: 'row' }, h('span', { class: 'spinner' }), 'A compilar e a correr os testes…'));
      try {
        a_.lastRun = { code: ta.value, ...(await api.run(q.id, ta.value)) };
        a_.code = ta.value;
        if (instant) a.results[q.id] = { ...gradePracticeItem(q, a_), locked: false };
        saveAttempt(a, { immediate: true });
      } catch (e) { toast(`Erro: ${e.message}`); }
      runBtn.disabled = false; renderOut(); renderHead();
      scrollToResult(out);
    }

    const actions = h('div', { class: 'editor-actions' }, runBtn,
      h('button', { class: 'btn', title: 'Descarrega um .hs completo (com o código fornecido) para testares no teu editor/ghci', onclick: () => { download(`${q.id}.hs`, exportHs(q, ta.value)); } }, '⬇ Descarregar .hs'),
      h('button', { class: 'btn', onclick: () => fileInput.click() }, '⬆ Abrir .hs'), fileInput,
      h('button', { class: 'btn', title: 'Guarda o teu código em data/workspace/ para editares no teu editor preferido', onclick: async () => { try { const r = await api.saveWorkspace(q.id, ta.value); toast(`Guardado em ${r.path}`, 4500); } catch (e) { toast(e.message); } } }, '💾 Guardar em ficheiro'),
      h('button', { class: 'btn', onclick: async () => { try { const r = await api.loadWorkspace(q.id); ta.value = r.code; ta.dispatchEvent(new Event('input')); toast('Recarregado do ficheiro'); } catch (e) { toast(e.message); } } }, '↻ Recarregar do ficheiro'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn ghost sm', onclick: async () => { if (await confirmBox('Repor modelo', 'Isto apaga o código desta pergunta.', 'Repor', true)) { ta.value = starterFor(q); ta.dispatchEvent(new Event('input')); } } }, 'Repor modelo'));
    renderOut();
    return h('div', { style: 'margin-top:14px' }, constraintsNote(q), ta, actions, out);
  }

  const constraintsNote = (q) => (q.constraints ?? []).some((c) => c.kind !== 'no-import') ? h('div', { class: 'notice warn', style: 'margin-bottom:10px' }, 'Respeita as restrições técnicas deste exercício — vê a lista abaixo do editor.') : null;

  function solutionBox(q) {
    const box = h('div');
    const btn = h('button', { class: 'btn', onclick: async () => {
      const r = await api.reveal([q.id]);
      clear(box);
      put(box, refsBlock(r[q.id].refs));
    } }, '👁 Ver soluções de referência');
    put(box, btn);
    return box;
  }

  // ------------------------------------------------ entrega
  async function finish(auto) {
    if (finishing) return; finishing = true;
    if (!auto) {
      const un = qs.filter((q) => !answered(q)).length; const fl = qs.filter((q) => ans(q).flagged).length;
      const ok = await modal({
        title: instant ? 'Terminar treino?' : 'Entregar o exame?',
        body: h('div', null,
          un ? h('p', null, h('strong', null, `${un} pergunta(s) sem resposta.`), ' As em branco valem 0.') : h('p', null, 'Todas as perguntas têm resposta.'),
          fl ? h('p', null, `${fl} marcada(s) para rever.`) : null,
          h('p', { class: 'small muted' }, 'Depois de entregares não podes alterar as respostas.')),
        actions: [{ label: 'Voltar', value: false }, { label: instant ? 'Terminar' : 'Entregar', value: true, primary: true }],
      });
      if (!ok) { finishing = false; return; }
    }
    clearInterval(interval); finalize(a);
    const msg = h('span', null, 'A corrigir…');
    const overlay = h('div', { class: 'modal-back' }, h('div', { class: 'modal' }, h('div', { class: 'row' }, h('span', { class: 'spinner' }), msg)));
    document.getElementById('modal-root').append(overlay);
    try {
      await gradeAttempt(a, (t) => { msg.textContent = t; });
      await flushAttempt(a); saveAttempt(a, { immediate: true });
      overlay.remove();
      go(`/review/${a.id}`);
    } catch (e) {
      overlay.remove(); finishing = false; toast(`Falha ao corrigir: ${e.message}`);
    }
  }

  function onKey(e) {
    if (isFormField(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') goTo(a.cursor + 1);
    else if (e.key === 'ArrowLeft') goTo(a.cursor - 1);
    else {
      const q = qs[a.cursor]; const i = LETTERS.indexOf(e.key.toLowerCase());
      if (q.type === 'theory' && i >= 0 && i < q.options.length && !a.results[q.id]?.locked) { ans(q).choice = LETTERS[i]; saveAttempt(a); renderAll(); }
    }
  }
  document.addEventListener('keydown', onKey);

  renderAll();
}

/** Traz o resultado dos testes para o ecrã (em portáteis fica abaixo da dobra). */
export function scrollToResult(el) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
}

/** Lista de soluções de referência, sempre com a etiqueta de proveniência e sem as apresentar como oficiais. */
export function refsBlock(refs) {
  return h('div', { class: 'stack' },
    h('div', { class: 'notice warn' }, h('strong', null, 'Nenhuma destas soluções é oficial. '), 'Servem de referência e foram verificadas apenas contra os testes deste gerador.'),
    refs.map((r, i) => h('div', { class: 'card', style: 'box-shadow:none' },
      h('div', { class: 'row' }, h('strong', null, `Referência ${i + 1}`), h('span', { class: 'chip warn' }, 'Não oficial'), h('span', { class: 'small muted' }, r.origin)),
      r.note ? h('p', { class: 'small muted' }, r.note) : null,
      h('pre', null, h('code', null, r.code)))));
}
