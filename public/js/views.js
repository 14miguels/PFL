// Vistas: início, exames originais, exame aleatório, treino por tema, histórico e banco de questões.
import { h, put, fmt, fmtDate, fmtDuration, TYPE_LABEL, DIFF_LABEL, KIND_LABEL, STATUS_LABEL, answerBadge, toast, modal, confirmBox } from './util.js';
import { store, saveAttempt, removeAttempt, attemptsList, finished, inProgress, questionStats, wrongIds } from './store.js';
import { buildOriginal, buildRandom, buildTraining, buildRetry, buildSingle, presetsOf, poolFor } from './generator.js';
import { themeStats, weakestTheme } from './progress.js';
import { go } from './router.js';
import { metaChips, contextBlock, statementBlock, constraintsBlock } from './qview.js';
import { normalizeTo20, penaltyFraction } from './scoring.js';
import { attemptDuration } from './timer.js';

export function startAttempt(a) { saveAttempt(a, { immediate: true }); go(`/run/${a.id}`); }

const seenIds = () => new Set([...questionStats().keys()]);
const progressBar = (v, max) => h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': v, 'aria-valuemax': max }, h('span', { style: `width:${max ? (100 * v) / max : 0}%` }));

function bankFacts() {
  const qs = store.bank.questions;
  const th = qs.filter((q) => q.type === 'theory');
  const count = (s) => th.filter((q) => q.answer.status === s).length;
  const excluded = store.bank.exams.reduce((s, e) => s + (e.excluded?.prolog ? e.excluded.prolog.theory + e.excluded.prolog.practice : 0), 0);
  return { total: qs.length, theory: th.length, practice: qs.length - th.length, official: count('official'), confirmed: count('confirmed'), unofficial: count('unofficial'), unknown: count('unknown'), excluded };
}

// ---------------------------------------------------------------- início
export function renderHome(root) {
  const f = bankFacts();
  const stats = questionStats();
  const completed = [...stats.values()].filter((s) => s.completed).length;
  const wrong = wrongIds();
  const doneAttempts = finished();
  const resume = inProgress();
  const weak = weakestTheme(themeStats(store.bank, stats));
  put(root, 
    h('h1', null, 'Prepara-te para os exames de PFL'),
    store.bank.demo ? h('div', { class: 'notice', style: 'margin-bottom:12px' }, h('strong', null, 'Estás a usar o banco de demonstração'), ` (${f.total} questões originais). Para estudar com as tuas próprias questões, cria a pasta `, h('code', null, 'bank/src/'), ' — vê ', h('code', null, 'docs/BANK_FORMAT.md'), ' no repositório. Nada disso é publicado.') : null,
    h('p', { class: 'muted' }, `${f.total} questões de Haskell em ${store.bank.exams.length} ${store.bank.exams.length === 1 ? 'exame' : 'exames'}${f.excluded ? ' (Prolog excluído por completo)' : ''}. Faz exames completos, aleatórios ou treina por tema.`),
    resume.length ? h('div', { class: 'card stack' }, h('h2', null, 'Continuar'),
      resume.slice(0, 3).map((a) => h('div', { class: 'row' }, h('span', { class: 'chip' }, KIND_LABEL[a.kind]), h('strong', null, a.title), h('span', { class: 'muted small' }, fmtDate(a.createdAt)), h('span', { class: 'spacer' }),
        h('a', { class: 'btn primary sm', href: `#/run/${a.id}` }, 'Continuar'),
        h('button', { class: 'btn ghost sm danger', onclick: async () => { if (await confirmBox('Descartar tentativa', 'Esta tentativa em curso será apagada.', 'Apagar', true)) { await removeAttempt(a.id); go('/'); } } }, 'Descartar')))) : null,
    h('div', { class: 'grid cols-4', style: 'margin-top:14px' },
      modeCard('📝', 'Exame original', 'Refaz um exame completo (Haskell), com a ordem e cotações originais.', '#/exam'),
      modeCard('🎲', 'Exame aleatório', 'Combina perguntas de vários exames com a mesma distribuição de cotações.', '#/random'),
      modeCard('🎯', 'Treino por tema', 'Escolhe as matérias e recebe feedback imediato.', '#/train'),
      modeCard('📚', 'Banco de questões', 'Consulta todas as perguntas, fontes e estados das respostas.', '#/bank')),
    h('div', { class: 'grid cols-3', style: 'margin-top:14px' },
      h('div', { class: 'card' }, h('div', { class: 'label' }, 'Exercícios práticos concluídos'), h('div', { class: 'stat' }, `${completed}`, h('span', { class: 'muted', style: 'font-size:1rem' }, ` / ${f.practice}`)), progressBar(completed, f.practice), h('p', { class: 'small muted', style: 'margin-top:6px' }, 'Concluído = todos os testes passaram.')),
      h('div', { class: 'card' }, h('div', { class: 'label' }, 'Tentativas terminadas'), h('div', { class: 'stat' }, doneAttempts.length), h('a', { href: '#/history' }, 'Ver histórico →')),
      h('div', { class: 'card stack' }, h('div', { class: 'label' }, 'Perguntas por repetir'), h('div', { class: 'stat' }, wrong.length),
        h('button', { class: 'btn primary sm', disabled: !wrong.length, onclick: () => startAttempt(buildRetry(store.bank, wrong, { title: 'Repetição das erradas', instant: true })) }, 'Repetir só as que errei'))),
    weak ? h('div', { class: 'card row', style: 'margin-top:14px' }, h('span', { style: 'font-size:1.4rem' }, '🎯'),
      h('div', null, h('strong', null, `Sugestão: treina "${weak.label}"`), h('div', { class: 'small muted' }, `${weak.right} certas e ${weak.wrongN} erradas neste tema. O treino começa pelas que erraste.`)),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn primary', onclick: () => startAttempt(buildTraining(store.bank, { themes: [weak.t], count: 8, firstIds: new Set(weak.wrongIds) })) }, 'Treinar este tema')) : null,
    h('details', { class: 'card', style: 'margin-top:14px', open: !doneAttempts.length && !resume.length }, h('summary', { style: 'font-size:1.05rem; color:var(--text)' }, 'Como funciona'),
      h('ul', { class: 'small' },
        h('li', null, h('strong', null, 'Exame original / aleatório: '), 'simula uma prova (teoria e depois prática), com tempo opcional. As soluções só aparecem depois de entregares. "Guardar e sair" pausa o tempo.'),
        h('li', null, h('strong', null, 'Treino por tema: '), 'feedback imediato e soluções de referência (não oficiais).'),
        h('li', null, h('strong', null, 'Prática: '), 'escreves Haskell no editor e "Executar testes" (⌘/Ctrl+Enter) corre-os localmente com o GHC. Se houver erros, o app aponta a linha e dá dicas.'),
        h('li', null, h('strong', null, 'Teoria: '), 'clica numa opção ou usa as teclas a–e; ←/→ mudam de pergunta.'),
        h('li', null, h('strong', null, 'Histórico: '), 'as tentativas e o teu desempenho por tema ficam só no teu computador (data/state.json).'))),
    h('div', { class: 'card', style: 'margin-top:14px' }, h('h2', null, 'Fiabilidade das respostas'),
      h('p', { class: 'small muted' }, 'Nenhuma resposta é inventada. Cada pergunta de teoria indica a origem da sua correção:'),
      h('div', { class: 'row' },
        h('span', null, answerBadge('official'), ` ${f.official} oficiais`), h('span', null, answerBadge('confirmed'), ` ${f.confirmed} confirmadas`),
        h('span', null, answerBadge('unofficial'), ` ${f.unofficial} não oficiais`), h('span', null, answerBadge('unknown'), ` ${f.unknown} desconhecidas`)),
      h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Nas perguntas práticas, os testes marcados "enunciado" vêm dos exemplos do exame; os marcados "gerado" foram criados por mim. As soluções de referência nunca são oficiais.')));
}
const modeCard = (emoji, title, text, href) => h('a', { class: 'card mode-card', href }, h('span', { class: 'emoji' }, emoji), h('h3', { style: 'margin:0' }, title), h('span', { class: 'small muted' }, text));

// ---------------------------------------------------------------- exames originais
export function renderOriginal(root) {
  put(root, h('h1', null, 'Exame original completo'), h('p', { class: 'muted' }, 'Escolhe um exame. Só as partes de Haskell fazem parte do banco.'));
  const wrap = h('div', { class: 'grid cols-2' });
  for (const e of store.bank.exams) {
    const qs = store.bank.questions.filter((q) => q.exam === e.id);
    const th = qs.filter((q) => q.type === 'theory'); const pr = qs.filter((q) => q.type === 'practice');
    const unknown = th.filter((q) => q.answer.status === 'unknown').length;
    const unoff = th.filter((q) => q.answer.status === 'unofficial').length;
    const draft = inProgress().find((a) => a.kind === 'original' && a.config?.examId === e.id);
    const best = finished().filter((a) => a.kind === 'original' && a.config?.examId === e.id).map((a) => a.summary).filter(Boolean);
    put(wrap, h('div', { class: 'card stack' },
      h('div', { class: 'row' }, h('span', { class: `chip ${e.kind === 'mini-teste' ? '' : 'primary'}` }, e.season), h('span', { class: 'muted small' }, e.date ?? 'sem data')),
      h('h3', { style: 'margin:0' }, e.label),
      h('div', { class: 'row' }, h('span', { class: 'chip' }, `Teoria: ${th.length}${e.stats.theoryPoints != null ? ` · ${fmt(e.stats.theoryPoints)} val` : ''}`), h('span', { class: 'chip' }, `Prática: ${pr.length}${e.stats.practicePoints != null ? ` · ${fmt(e.stats.practicePoints)} val` : ''}`),
        e.stats.totalPoints == null ? h('span', { class: 'chip warn' }, 'Sem cotações') : null),
      h('div', { class: 'small muted' }, e.files.join(' · '), e.excluded?.prolog ? ` · Prolog excluído (${e.excluded.prolog.theory + e.excluded.prolog.practice} questões)` : ''),
      unknown || unoff ? h('div', { class: 'small' }, unknown ? `${unknown} pergunta(s) sem solução conhecida; ` : '', unoff ? `${unoff} com chave não oficial (indicativa).` : '') : null,
      best.length ? h('div', { class: 'small muted' }, `Já feito ${best.length}×; última nota: ${best[0].hasPoints ? `${fmt(best[0].score)}/${fmt(best[0].max)}` : `${best[0].theory.correct + best[0].practice.correct} certas`}`) : null,
      h('details', null, h('summary', null, 'Notas sobre as fontes'), h('ul', { class: 'small' }, e.notes.map((n) => h('li', null, n)))),
      h('div', { class: 'row' },
        draft ? h('a', { class: 'btn primary', href: `#/run/${draft.id}` }, 'Continuar') : h('button', { class: 'btn primary', onclick: () => startAttempt(buildOriginal(store.bank, e.id)) }, 'Fazer este exame'))));
  }
  put(root, wrap);
}

// ---------------------------------------------------------------- exame aleatório
export function renderRandom(root) {
  const themes = Object.entries(store.bank.themes);
  const examsWithPts = store.bank.exams.filter((e) => e.stats.totalPoints != null);
  const noPoints = store.bank.questions.filter((q) => q.points == null).length;
  const preset = h('select', { id: 'preset' }, Object.entries(presetsOf(store.bank)).map(([k, p]) => h('option', { value: k }, p.label)));
  const tIn = h('input', { type: 'number', min: 0, max: 20, step: 0.05, value: 6, id: 'tp' });
  const pIn = h('input', { type: 'number', min: 0, max: 20, step: 0.05, value: 14, id: 'pp' });
  const checks = (name, items, labels) => h('div', { class: 'checks' }, items.map(([k, label]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name, value: k, checked: labels === 'all' }), label)));
  const themeBox = checks('theme', themes, 'none');
  const examBox = checks('exam', examsWithPts.map((e) => [e.id, e.short]), 'all');
  const diffBox = checks('diff', Object.entries(DIFF_LABEL), 'all');
  const unseen = h('input', { type: 'checkbox', checked: true });
  const skipRight = h('input', { type: 'checkbox' });
  const sync = () => { const p = presetsOf(store.bank)[preset.value]; if (p.theory != null) { tIn.value = p.theory; pIn.value = p.practice; } tIn.disabled = pIn.disabled = preset.value !== 'custom'; };
  preset.addEventListener('change', sync); sync();
  const sel = (name) => [...root.querySelectorAll(`input[name=${name}]:checked`)].map((i) => i.value);
  const pool = () => ({ themes: sel('theme'), exams: sel('exam'), difficulties: sel('diff') });
  const info = h('div', { class: 'small muted' });
  const refresh = () => {
    const f = pool();
    const nT = poolFor(store.bank, { ...f, types: ['theory'], withPoints: true }).length; const nP = poolFor(store.bank, { ...f, types: ['practice'], withPoints: true }).length;
    info.textContent = `Com estes filtros há ${nT} perguntas de teoria e ${nP} de prática disponíveis.`;
  };
  put(root, 
    h('h1', null, 'Exame aleatório'),
    h('p', { class: 'muted' }, 'Combina perguntas de vários exames para atingir a mesma distribuição de cotações de um exame real. Usa as cotações originais de cada pergunta.'),
    h('div', { class: 'card stack', onchange: refresh },
      h('div', { class: 'field' }, h('label', { for: 'preset' }, 'Estrutura'), preset),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', { for: 'tp' }, 'Teoria (valores)'), tIn), h('div', { class: 'field' }, h('label', { for: 'pp' }, 'Prática (valores)'), pIn)),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Temas (nenhum = todos)'), themeBox),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Exames de origem'), examBox),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Dificuldade (etiqueta editorial)'), diffBox),
      h('div', { class: 'row' }, h('label', { class: 'check' }, unseen, 'Preferir perguntas que ainda não fiz'), h('label', { class: 'check' }, skipRight, 'Excluir as que já acertei')),
      info,
      noPoints ? h('div', { class: 'notice' }, `${noPoints} ${noPoints === 1 ? 'questão não tem' : 'questões não têm'} cotação e por isso não ${noPoints === 1 ? 'entra' : 'entram'} aqui (nunca invento cotações); ${noPoints === 1 ? 'está disponível' : 'estão disponíveis'} no treino por tema e no exame original.`) : null,
      h('div', { class: 'row' }, h('button', { class: 'btn primary lg', onclick: () => {
        const stats = questionStats();
        const excludeIds = skipRight.checked ? new Set([...stats].filter(([, s]) => s.everCorrect || s.completed).map(([id]) => id)) : null;
        const f = pool();
        const a = buildRandom(store.bank, { preset: preset.value, theory: Number(tIn.value), practice: Number(pIn.value), ...f, seenIds: unseen.checked ? seenIds() : new Set(), excludeIds }, Math.random);
        if (!a.items.length) { toast('Não há perguntas suficientes com estes filtros.'); return; }
        startAttempt(a);
      } }, 'Gerar exame'))));
  refresh();
}

// ---------------------------------------------------------------- treino por tema
export function renderTrain(root) {
  const themes = Object.entries(store.bank.themes);
  const counts = (t) => store.bank.questions.filter((q) => q.theme === t).length;
  const themeBox = h('div', { class: 'checks' }, themes.map(([k, label]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'theme', value: k }), `${label} (${counts(k)})`)));
  const typeBox = h('div', { class: 'checks' }, Object.entries(TYPE_LABEL).map(([k, label]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'type', value: k, checked: true }), label)));
  const diffBox = h('div', { class: 'checks' }, Object.entries(DIFF_LABEL).map(([k, label]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'diff', value: k, checked: true }), label)));
  const count = h('input', { type: 'number', min: 1, max: 60, value: 8, id: 'cnt' });
  const gradable = h('input', { type: 'checkbox' });
  const unseen = h('input', { type: 'checkbox', checked: true });
  const info = h('div', { class: 'small muted' });
  const sel = (name) => [...root.querySelectorAll(`input[name=${name}]:checked`)].map((i) => i.value);
  const refresh = () => {
    const n = poolFor(store.bank, { themes: sel('theme'), types: sel('type'), difficulties: sel('diff') }).length;
    info.textContent = `${n} perguntas disponíveis com estes filtros.`;
  };
  put(root, h('h1', null, 'Treino por tema'), h('p', { class: 'muted' }, 'Escolhe as matérias a estudar. Recebes feedback imediato e podes ver as soluções de referência (sempre rotuladas como não oficiais).'),
    h('div', { class: 'card stack', onchange: refresh },
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Temas (nenhum = todos)'), themeBox),
      h('div', { class: 'row' }, h('div', { class: 'field' }, h('span', { class: 'label' }, 'Tipo'), typeBox), h('div', { class: 'field' }, h('span', { class: 'label' }, 'Dificuldade'), diffBox), h('div', { class: 'field' }, h('label', { for: 'cnt' }, 'Nº de perguntas'), count)),
      h('div', { class: 'row' }, h('label', { class: 'check' }, unseen, 'Por ver primeiro'), h('label', { class: 'check', title: 'Exclui perguntas de teoria sem resposta oficial/confirmada' }, gradable, 'Só teoria com correção automática')),
      info,
      h('div', { class: 'row' }, h('button', { class: 'btn primary lg', onclick: () => {
        const a = buildTraining(store.bank, { themes: sel('theme'), types: sel('type'), difficulties: sel('diff'), count: Number(count.value) || 8, onlyGradable: gradable.checked, unseenFirst: unseen.checked, seenIds: seenIds() });
        if (!a.items.length) { toast('Sem perguntas com estes filtros.'); return; }
        startAttempt(a);
      } }, 'Começar treino'))));
  refresh();
}

// ---------------------------------------------------------------- histórico
export function renderHistory(root) {
  const list = attemptsList();
  const stats = questionStats();
  put(root, h('h1', null, 'Histórico'));
  if (!list.length) { put(root, h('div', { class: 'card empty' }, 'Ainda não fizeste nenhuma tentativa.')); return; }

  // por tema (último resultado de cada pergunta já feita)
  const rows = themeStats(store.bank, stats).map((r) => ({ ...r, wrongN: r.wrongN }));
  const wrong = wrongIds();
  put(root, h('div', { class: 'card stack' }, h('div', { class: 'row' }, h('h2', { style: 'margin:0' }, 'Desempenho por tema'), h('span', { class: 'spacer' }),
    h('button', { class: 'btn primary sm', disabled: !wrong.length, onclick: () => startAttempt(buildRetry(store.bank, wrong, { instant: true })) }, `Repetir as ${wrong.length} que errei`)),
    h('table', null, h('thead', null, h('tr', null, h('th', null, 'Tema'), h('th', null, 'Certas'), h('th', null, 'Erradas'), h('th', null, 'Por fazer'), h('th', { style: 'width:30%' }, ''))),
      h('tbody', null, rows.map((r) => h('tr', null, h('td', null, r.label), h('td', null, r.right), h('td', null, r.wrongN), h('td', null, r.todo), h('td', null, progressBar(r.right, r.total))))))));

  put(root, h('div', { class: 'card', style: 'margin-top:14px' }, h('h2', null, 'Tentativas'),
    h('table', null, h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Tipo'), h('th', null, 'Título'), h('th', null, 'Resultado'), h('th', null, 'Duração'), h('th', null, ''))),
      h('tbody', null, list.map((a) => {
        const s = a.summary;
        const dur = attemptDuration(a);
        const res = a.status !== 'finished' ? h('span', { class: 'chip warn' }, 'em curso') : s?.hasPoints ? `${fmt(s.score)} / ${fmt(s.max)} (${fmt(normalizeTo20(s.score, s.max), 1)}/20)` : `${(s?.theory.correct ?? 0) + (s?.practice.correct ?? 0)} / ${(s?.theory.gradable ?? 0) + (s?.practice.gradable ?? 0)} certas`;
        const w = a.status === 'finished' ? wrongIds({ attemptId: a.id }) : [];
        return h('tr', null, h('td', { class: 'nowrap' }, fmtDate(a.createdAt)), h('td', null, h('span', { class: 'chip' }, KIND_LABEL[a.kind])), h('td', null, a.title), h('td', null, res), h('td', null, fmtDuration(dur)),
          h('td', { class: 'nowrap' },
            a.status === 'finished' ? h('a', { class: 'btn sm', href: `#/review/${a.id}` }, 'Rever') : h('a', { class: 'btn sm primary', href: `#/run/${a.id}` }, 'Continuar'),
            w.length ? h('button', { class: 'btn sm', title: 'Repetir só as erradas desta tentativa', onclick: () => startAttempt(buildRetry(store.bank, w, { instant: true, from: a.id, title: `Repetição: ${a.title}` })) }, `↻ ${w.length}`) : null,
            h('button', { class: 'btn sm ghost danger', 'aria-label': 'Apagar', onclick: async () => { if (await confirmBox('Apagar tentativa', 'Isto remove-a do histórico.', 'Apagar', true)) { await removeAttempt(a.id); go('/history'); } } }, '🗑')));
      })))));
}

// ---------------------------------------------------------------- banco
export function renderBank(root) {
  const q = store.bank.questions;
  const state = { type: '', theme: '', exam: '', status: '', text: '' };
  const tbody = h('tbody');
  const sel = (key, label, opts) => h('select', { 'aria-label': label, onchange: (e) => { state[key] = e.target.value; draw(); } }, h('option', { value: '' }, label), opts.map(([v, l]) => h('option', { value: v }, l)));
  const search = h('input', { type: 'text', placeholder: 'Pesquisar no enunciado…', oninput: (e) => { state.text = e.target.value.toLowerCase(); draw(); } });
  const count = h('span', { class: 'muted small' });
  const draw = () => {
    while (tbody.firstChild) tbody.firstChild.remove();
    const rows = q.filter((x) => (!state.type || x.type === state.type) && (!state.theme || x.theme === state.theme) && (!state.exam || x.exam === state.exam) &&
      (!state.status || (x.type === 'theory' && x.answer.status === state.status)) && (!state.text || x.statement.toLowerCase().includes(state.text) || x.id.toLowerCase().includes(state.text)));
    count.textContent = `${rows.length} de ${q.length} questões`;
    rows.forEach((x) => put(tbody, h('tr', { style: 'cursor:pointer', tabindex: 0, onclick: () => showQuestion(x), onkeydown: (e) => { if (e.key === 'Enter') showQuestion(x); } },
      h('td', { class: 'mono nowrap' }, x.id), h('td', null, store.examOf(x).short), h('td', null, TYPE_LABEL[x.type]), h('td', null, store.bank.themes[x.theme]), h('td', null, DIFF_LABEL[x.difficulty]),
      h('td', { class: 'nowrap' }, x.points == null ? '—' : fmt(x.points)), h('td', null, x.type === 'theory' ? answerBadge(x.answer.status) : h('span', { class: 'muted small' }, `${x.tests.length} testes`)))));
  };
  put(root, h('h1', null, 'Banco de questões'), h('p', { class: 'muted' }, 'Todas as perguntas de Haskell, com ano/época, tipo, tema, dificuldade (editorial), cotação e fonte. As respostas não são mostradas aqui.'),
    h('div', { class: 'row', style: 'margin-bottom:12px' }, sel('type', 'Tipo', Object.entries(TYPE_LABEL)), sel('theme', 'Tema', Object.entries(store.bank.themes)), sel('exam', 'Exame', store.bank.exams.map((e) => [e.id, e.short])),
      sel('status', 'Estado da resposta', Object.entries(STATUS_LABEL)), search, count),
    h('div', { class: 'card', style: 'padding:6px 10px; overflow:auto' }, h('table', null, h('thead', null, h('tr', null, ['ID', 'Exame', 'Tipo', 'Tema', 'Dific.', 'Cotação', 'Correção'].map((c) => h('th', null, c)))), tbody)));
  draw();
}

function showQuestion(q) {
  const body = h('div', null, metaChips(q), contextBlock(q), statementBlock(q),
    q.type === 'theory' ? h('div', { class: 'options' }, q.options.map((o, i) => h('div', { class: 'option', style: 'cursor:default' }, h('span', { class: 'letter' }, 'abcdefgh'[i]), h('span', { class: 'txt' }, o)))) : constraintsBlock(q));
  modal({ title: `${q.id}`, body, actions: [{ label: 'Fechar', value: false }, { label: '▶ Praticar esta questão', value: true, primary: true }] })
    .then((practice) => { if (practice) startAttempt(buildSingle(store.bank, q.id)); });
}
