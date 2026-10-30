import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.mjs';
import { launch, hasChrome } from './cdp.mjs';
import { bank, bankFile, byId } from './helpers.mjs';

const SHOTS = process.env.SHOTS_DIR ?? mkdtempSync(path.join(tmpdir(), 'pfl-shots-'));
const demoA = bank.questions.filter((q) => q.exam === 'demo-a');
const nTheoryA = demoA.filter((q) => q.type === 'theory').length;
const pt = (x) => String(x).replace('.', ','); // formato pt-PT dos números
let app; let base; let b;
const skip = !hasChrome && 'Chrome não encontrado (ou Node < 22, ou PFL_SKIP_E2E definido)';

before(async () => {
  if (skip) return;
  app = createApp({ dataDir: mkdtempSync(path.join(tmpdir(), 'pfl-e2e-')), bankFile });
  base = `http://127.0.0.1:${await app.listen()}`;
  b = await launch();
});
after(async () => { await b?.close(); await app?.close(); });

// Cria (via API) uma prática de uma só questão e abre-a: torna os testes determinísticos.
async function openSingle(qid) {
  const id = `single${Math.random().toString(36).slice(2, 8)}`;
  const a = { id, kind: 'training', title: `Prática — ${qid}`, createdAt: new Date().toISOString(), startedAt: null, finishedAt: null, status: 'in-progress', instant: true, limitSec: null, items: [{ qid }], answers: {}, results: {}, config: { single: qid } };
  assert.equal((await fetch(`${base}/api/attempts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-PFL': '1' }, body: JSON.stringify(a) })).status, 200);
  await b.goto(`${base}/#/run/${id}`); await b.eval('location.reload()'); // o cliente só lê o estado no arranque
  await b.waitFor('document.querySelector("textarea.code")');
  return id;
}
const text = () => b.eval('document.getElementById("view").innerText');
// Nós de texto visíveis gerados pela app, fora de código e do conteúdo das questões (em Haskell, `null` e `undefined` são legítimos).
const stray = () => b.eval(`(() => {
  const out = []; const w = document.createTreeWalker(document.getElementById('view'), NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.parentElement.closest('pre, code, .mono, textarea, .statement, .option')) continue; // código e conteúdo das questões (ex.: a opção "Erro: undefined")
    if (/\\b(null|undefined|NaN)\\b|\\[object/.test(n.nodeValue)) out.push(n.nodeValue.trim());
  }
  return out;
})()`);
const noErrors = () => assert.deepEqual(b.errors, [], `erros na consola: ${b.errors.join(' | ')}`);

test('início carrega sem erros e mostra os números do banco', { skip }, async () => {
  await b.goto(`${base}/`);
  await b.waitFor('document.querySelector("#view h1")');
  const t = await text();
  assert.match(t, new RegExp(`${bank.questions.length} questões de Haskell`));
  assert.match(t, /Exame original/);
  assert.equal(await b.eval('document.querySelectorAll("#nav a").length'), 6);
  assert.deepEqual(await stray(), [], 'a página inicial (estado limpo) não mostra "null"/"undefined"');
  assert.match(t, /Estás a usar o banco de demonstração/);
  assert.equal(await b.eval('document.querySelector("details.card").open'), true, '"Como funciona" aberto para quem ainda não fez nada');
  assert.doesNotMatch(t, /Sugestão: treina/, 'sem histórico não há sugestão');
  noErrors();
  console.log('screens →', await b.screenshot(path.join(SHOTS, 'home-light.png')));
});

test('modo escuro/claro alterna e persiste', { skip }, async () => {
  await b.eval('document.documentElement.removeAttribute("data-theme")');
  await b.clickText('#theme-toggle', '');
  const t1 = await b.eval('document.documentElement.dataset.theme');
  assert.ok(['dark', 'light'].includes(t1));
  await b.clickText('#theme-toggle', '');
  const t2 = await b.eval('document.documentElement.dataset.theme');
  assert.notEqual(t1, t2);
  await b.eval('document.documentElement.dataset.theme = "dark"');
  const bg = await b.eval('getComputedStyle(document.body).backgroundColor');
  assert.equal(bg, 'rgb(15, 18, 32)');
  await b.screenshot(path.join(SHOTS, 'home-dark.png'));
  await b.eval('document.documentElement.dataset.theme = "light"');
  const bg2 = await b.eval('getComputedStyle(document.body).backgroundColor');
  assert.equal(bg2, 'rgb(246, 247, 251)');
});

test('exame original (demo A): ecrã inicial, teoria, prática, entrega e revisão', { skip }, async () => {
  await b.goto(`${base}/#/exam`);
  await b.waitFor(`document.querySelectorAll(".card h3").length === ${bank.exams.length}`);
  await b.eval(`[...document.querySelectorAll('.card')].find(c => c.textContent.includes('demonstração A')).querySelector('button.primary').click()`);
  await b.waitFor('location.hash.startsWith("#/run/")');
  await b.waitFor('document.querySelector("#view h1")');
  assert.match(await text(), /Penalização por resposta errada na teoria: 25%/);
  await b.clickText('button', 'Começar');
  await b.waitFor('document.querySelector(".runner-head")');
  assert.match(await b.eval('document.querySelector(".timer").textContent'), /⏱ \d+:\d\d/);
  const meta = await b.eval('document.querySelector(".qmeta").innerText');
  assert.match(meta, /Demo A/); assert.match(meta, /Teoria/); assert.match(meta, /val/);
  // não revela respostas
  assert.equal(await b.eval('document.querySelectorAll(".option.correct, .option.wrong").length'), 0);
  // responde às 6 teóricas (opção b em todas) e avança
  for (let i = 0; i < nTheoryA; i++) {
    await b.eval('document.querySelectorAll(".option")[1].click()');
    await b.eval(`[...document.querySelectorAll('.footer-nav button')].pop().click()`);
  }
  await b.waitFor('document.querySelector("textarea.code")');
  assert.match(await text(), new RegExp(`Questão ${nTheoryA + 1} de ${demoA.length}`));
  // prática 1 (sumSquares) com a solução de referência
  await b.setValue('textarea.code', byId('demoA-B01').refs[0].code);
  await b.clickText('button', 'Executar testes');
  await b.waitFor('document.querySelector("table td.test-ok")', 40000);
  assert.match(await text(), /3\/3 testes passaram/);
  console.log('screens →', await b.screenshot(path.join(SHOTS, 'practice-run.png')));
  // prática 3 (evensDoubled) com uma solução que viola a técnica imposta
  await b.eval(`document.querySelectorAll('.qchip')[${nTheoryA + 2}].click()`); // 3.ª prática: evensDoubled
  await b.waitFor('document.querySelector("textarea.code")');
  await b.setValue('textarea.code', 'evensDoubled :: [Int] -> [Int]\nevensDoubled xs = map (*2) (filter even xs)\n');
  await b.clickText('button', 'Executar testes');
  await b.waitFor('document.querySelector(".test-bad")', 40000);
  assert.match(await text(), /comprehension|✗/);
  // entregar
  await b.clickText('.runner-head button', 'Entregar');
  await b.waitFor('document.querySelector(".modal")');
  assert.match(await b.eval('document.querySelector(".modal").innerText'), /sem resposta/);
  await b.clickText('.modal .btn', 'Entregar');
  await b.waitFor('location.hash.startsWith("#/review/")', 90000);
  await b.waitFor('document.querySelector(".score-big")');
  const rv = await text();
  assert.match(rv, /Pergunta a pergunta/);
  assert.match(rv, /Nenhuma destas soluções é oficial|Soluções de referência \(nenhuma é oficial\)/);
  await b.screenshot(path.join(SHOTS, 'review.png'));
  noErrors();
});

test('revisão mostra a resposta correta com estado e não mostra soluções como oficiais', { skip }, async () => {
  const t = await text();
  assert.match(t, /Confirmada/);
  assert.doesNotMatch(t, /Solução oficial/);
  const chips = await b.eval('[...document.querySelectorAll("details .chip.warn")].map(e=>e.textContent)');
  assert.ok(chips.includes('Não oficial'));
});

test('histórico: tentativa guardada e repetição só das erradas', { skip }, async () => {
  await b.goto(`${base}/#/history`);
  await b.waitFor('document.querySelector("table")');
  const t = await text();
  assert.match(t, /Exame original/);
  assert.match(t, /Desempenho por tema/);
  const retryBtn = await b.eval('[...document.querySelectorAll("button")].some(e => e.textContent.includes("Repetir as"))');
  assert.ok(retryBtn);
  await b.eval('[...document.querySelectorAll("button")].find(e => e.textContent.includes("Repetir as")).click()');
  await b.waitFor('location.hash.startsWith("#/run/")');
  await b.waitFor('document.querySelector(".runner-head")');
  const n = await b.eval('document.querySelectorAll(".qchip").length');
  assert.ok(n > 0 && n < demoA.length, `repetição tem ${n} perguntas`);
  assert.match(await b.eval('document.querySelector(".runner-head").innerText'), /Repetição/);
  noErrors();
});

test('persistência: recarregar mantém a tentativa em curso e o histórico', { skip }, async () => {
  await b.goto(`${base}/`);
  await b.waitFor('document.querySelector("#view h1")');
  assert.match(await text(), /Continuar/);
  const st = await (await fetch(`${base}/api/state`)).json();
  assert.ok(Object.keys(st.attempts).length >= 2);
});

test('treino por tema: feedback imediato na teoria e bloqueio após verificar', { skip }, async () => {
  await b.goto(`${base}/#/train`);
  await b.waitFor('document.querySelector("input[name=theme]")');
  await b.eval('document.querySelector("input[name=theme][value=avaliacao]").click()');
  await b.eval('document.querySelector("input[name=theme][value=lazy]").click()');
  await b.eval('document.querySelector("input[name=type][value=practice]").click()'); // só teoria
  await b.setValue('#cnt', '3');
  await b.clickText('button', 'Começar treino');
  await b.waitFor('document.querySelector(".runner-head")');
  assert.equal(await b.eval('document.querySelectorAll(".qchip").length'), 3);
  await b.waitFor('document.querySelector(".option")');
  await b.eval('document.querySelector(".option").click()');
  await b.clickText('button', 'Verificar resposta');
  await b.waitFor('document.querySelector(".option.correct")');
  assert.equal(await b.eval('document.querySelector(".option").disabled'), true);
  assert.match(await text(), /Correta!|Incorreta\./);
  noErrors();
});

test('banco de questões: filtros e abertura sem revelar a resposta', { skip }, async () => {
  await b.goto(`${base}/#/bank`);
  await b.waitFor('document.querySelector("tbody tr")');
  assert.equal(await b.eval('document.querySelectorAll("tbody tr").length'), bank.questions.length);
  await b.eval('const s = document.querySelector("select"); s.value = "practice"; s.dispatchEvent(new Event("change"))');
  assert.equal(await b.eval('document.querySelectorAll("tbody tr").length'), bank.questions.filter((q) => q.type === 'practice').length);
  await b.eval('document.querySelector("tbody tr").click()');
  await b.waitFor('document.querySelector(".modal")');
  assert.equal(await b.eval('document.querySelectorAll(".modal .option.correct").length'), 0);
});

test('exame aleatório: gera a estrutura do preset do banco e mostra o ecrã inicial', { skip }, async () => {
  await b.goto(`${base}/#/random`);
  await b.waitFor('document.querySelector("#preset")');
  assert.deepEqual(await b.eval('[...document.querySelectorAll("#preset option")].map(o => o.value)'), [...Object.keys(bank.presets), 'custom']);
  await b.clickText('button', 'Gerar exame');
  await b.waitFor('location.hash.startsWith("#/run/")');
  await b.waitFor('document.querySelector("#view h1")');
  const t = await text();
  assert.match(t, /Exame aleatório/);
  const first = Object.values(bank.presets)[0];
  assert.match(t, new RegExp(`Cotações atingidas: teoria ${pt(first.theory)}`));
  assert.match(t, new RegExp(`prática ${pt(first.practice)}`));
  await b.screenshot(path.join(SHOTS, 'random-start.png'));
  noErrors();
});

test('responsivo: ecrã estreito sem scroll horizontal', { skip }, async () => {
  await b.goto(`${base}/#/exam`);
  await b.waitFor('document.querySelector(".card h3")');
  await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
  await new Promise((r) => setTimeout(r, 300));
  const overflow = await b.eval('document.documentElement.scrollWidth > document.documentElement.clientWidth + 1');
  assert.equal(overflow, false);
  await b.screenshot(path.join(SHOTS, 'mobile.png'));
  await b.send('Emulation.clearDeviceMetricsOverride');
});

test('nenhuma vista mostra "null", "undefined" ou "[object" por engano', { skip }, async () => {
  const st = await (await fetch(`${base}/api/state`)).json();
  const finishedId = Object.values(st.attempts).find((a) => a.status === 'finished').id;
  for (const route of ['/', '/exam', '/random', '/train', '/history', '/bank', `/review/${finishedId}`]) {
    await b.goto(`${base}/#${route}`);
    await b.waitFor('document.querySelector("#view h1")');
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual(await stray(), [], `vista ${route}`);
  }
  const id = Object.values(st.attempts).find((a) => a.status !== 'finished').id;
  await b.goto(`${base}/#/run/${id}`);
  await b.waitFor('document.querySelector(".runner-head")');
  for (let i = 0; i < 3; i++) { await b.eval('document.querySelectorAll(".qchip")[' + i + '].click()'); assert.deepEqual(await stray(), []); }
});

test('regressão: reabrir um exame deixado a meio há 2 dias retoma-o em vez de o entregar', { skip }, async () => {
  const old = { id: 'stale1', kind: 'original', title: 'Exame de demonstração A', createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), startedAt: new Date(Date.now() - 2 * 864e5).toISOString(), finishedAt: null, status: 'in-progress', instant: false, limitSec: 5400, items: bank.questions.filter((q) => q.exam === 'demo-a').map((q) => ({ qid: q.id })), answers: { 'demoA-A01': { choice: 'b' } }, results: {}, cursor: 0, config: { examId: 'demo-a' } };
  const put = await fetch(`${base}/api/attempts/stale1`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-PFL': '1' }, body: JSON.stringify(old) });
  assert.equal(put.status, 200);
  await b.goto(`${base}/`); await b.eval('location.reload()'); await b.waitFor('document.querySelector("#view h1")');
  await b.goto(`${base}/#/run/stale1`);
  await b.waitFor('document.querySelector(".timer")');
  await new Promise((r) => setTimeout(r, 2500));
  assert.match(await b.eval('location.hash'), /#\/run\/stale1/, 'continua no exame');
  const left = await b.eval('document.querySelector(".timer").textContent');
  assert.match(left, /1:29:\d\d|1:30:00/, `o tempo restante é ~1h30, não 0: ${left}`);
  // "Guardar e sair" pausa: o servidor fica com resumedAt = null e tempo ativo pequeno
  await b.clickText('.runner-head button', 'Guardar e sair');
  await b.waitFor('location.hash === "#/"');
  await new Promise((r) => setTimeout(r, 800));
  const st = (await (await fetch(`${base}/api/state`)).json()).attempts.stale1;
  assert.equal(st.status, 'in-progress'); assert.equal(st.resumedAt, null); assert.ok(st.activeSec > 0 && st.activeSec < 60, `activeSec=${st.activeSec}`);
});

test('regressão: o resultado de "Executar testes" fica visível sem fazer scroll', { skip }, async () => {
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 700, deviceScaleFactor: 1, mobile: false });
  await openSingle('demoA-B01');
  await b.setValue('textarea.code', 'x = 1');
  await b.clickText('button', 'Executar testes');
  await b.waitFor('document.querySelector(".notice.err, .test-bad, td.test-ok")', 40000);
  await b.waitFor('(() => { const r = document.querySelector(".notice.err, .notice.warn"); const e = [...document.querySelectorAll(".editor-actions ~ div .notice, .editor-actions + div .notice")][0] ?? r; const t = e.getBoundingClientRect().top; return t > 0 && t < innerHeight; })()', 5000);
  await b.send('Emulation.clearDeviceMetricsOverride');
});

test('erro de compilação: dica e link que leva o cursor à linha do erro', { skip }, async () => {
  for (const qid of ['demoA-B01', 'demoB-B01']) { // expressão (call) e IO
    await openSingle(qid);
    const q = bank.questions.find((x) => x.id === qid);
    await b.setValue('textarea.code', `import Data.List (sort)\n${q.signature}\n${q.func} = foo\n`);
    await b.clickText('button', 'Executar testes');
    await b.waitFor('document.querySelector(".err-line")', 40000);
    assert.match(await b.eval('document.querySelector(".hints").innerText'), /"foo" não está definido/);
    await b.eval('document.querySelector(".err-line").click()');
    const sel = await b.eval('(() => { const t = document.querySelector("textarea.code"); return t.value.slice(t.selectionStart, t.selectionEnd); })()');
    assert.equal(sel, `${q.func} = foo`, `${qid}: seleciona a linha 3 (a do erro), não a anterior`);
  }
});

test('banco de questões: "Praticar esta questão" abre a prática com feedback imediato', { skip }, async () => {
  await b.goto(`${base}/#/bank`); await b.waitFor('document.querySelector("tbody tr")');
  await b.eval('[...document.querySelectorAll("tbody tr")].find(r => r.textContent.includes("demoA-B05")).click()');
  await b.waitFor('document.querySelector(".modal")');
  await b.clickText('.modal .btn', 'Praticar esta questão');
  await b.waitFor('location.hash.startsWith("#/run/")');
  await b.waitFor('document.querySelector("textarea.code")');
  const t = await text();
  assert.match(t, /Questão 1 de 1/); assert.match(t, /insertBST/);
  assert.match(await b.eval('document.querySelector(".runner-head").innerText'), /Treino por tema/);
  assert.ok(await b.eval('[...document.querySelectorAll("button")].some(e => e.textContent.includes("Ver soluções de referência"))'), 'feedback imediato: soluções disponíveis');
});

test('início: depois de terminar tentativas, sugere treinar o tema mais fraco', { skip }, async () => {
  await b.goto(`${base}/`); await b.waitFor('document.querySelector("#view h1")');
  const t = await text();
  assert.match(t, /Sugestão: treina "/);
  await b.clickText('button', 'Treinar este tema');
  await b.waitFor('location.hash.startsWith("#/run/")'); await b.waitFor('document.querySelector(".runner-head")');
  assert.match(await b.eval('document.querySelector(".runner-head").innerText'), /Treino —/);
});

test('histórico: gráfico de evolução da nota com tooltip, e cartões da página inicial alinhados', { skip }, async () => {
  const H = { 'Content-Type': 'application/json', 'X-PFL': '1' };
  for (const [i, score] of [[1, 12], [2, 16]]) {
    const a = { id: `seed${i}`, kind: 'random', title: `Exame aleatório ${i}`, status: 'finished', createdAt: new Date(Date.now() - (5 - i) * 864e5).toISOString(), startedAt: new Date(Date.now() - (5 - i) * 864e5).toISOString(), finishedAt: new Date(Date.now() - (5 - i) * 864e5 + 6e5).toISOString(), durationSec: 600, items: [], answers: {}, results: {}, summary: { hasPoints: true, score, max: 20, theory: { score, max: 20, correct: 0, gradable: 0, ungraded: 0 }, practice: { score: 0, max: 0, correct: 0, gradable: 0 } } };
    assert.equal((await fetch(`${base}/api/attempts/${a.id}`, { method: 'PUT', headers: H, body: JSON.stringify(a) })).status, 200);
  }
  await b.goto(`${base}/`); await b.eval('location.reload()'); await b.waitFor('document.querySelector("#view h1")');
  await b.goto(`${base}/#/history`); await b.waitFor('document.querySelector(".chart svg")');
  assert.ok((await b.eval('document.querySelectorAll(".chart-hit").length')) >= 3);
  assert.match(await b.eval('document.querySelector(".chart svg").getAttribute("aria-label")'), /Evolução da nota/);
  await b.eval('document.querySelectorAll(".chart-hit")[1].dispatchEvent(new Event("mouseenter"))');
  assert.equal(await b.eval('document.querySelector(".chart-tip").hidden'), false);
  assert.match(await b.eval('document.querySelector(".chart-tip").innerText'), /\/ 20/);
  assert.match(await text(), /Tempo total de estudo/);
  assert.equal(await b.eval('getComputedStyle(document.querySelector(".chart polyline")).strokeWidth'), '2px');
  await b.screenshot(path.join(SHOTS, 'history-chart.png'));
  // cartões de modo alinhados (antes: o primeiro ficava 14 px acima dos outros)
  await b.goto(`${base}/`); await b.waitFor('document.querySelector(".mode-card")');
  const tops = await b.eval('[...document.querySelectorAll(".mode-card")].map(e => Math.round(e.getBoundingClientRect().top))');
  assert.equal(new Set(tops).size, 1, `tops: ${tops}`);
  noErrors();
});

test('treino misto: chips numerados em sequência e com aria-label', { skip }, async () => {
  await b.goto(`${base}/#/train`); await b.waitFor('document.querySelector("#cnt")');
  await b.setValue('#cnt', '8'); await b.clickText('button', 'Começar treino'); await b.waitFor('document.querySelector(".qchip")');
  const labels = await b.eval('[...document.querySelectorAll(".qchip")].map(e => e.textContent)');
  assert.deepEqual(labels, labels.map((_, i) => String(i + 1)), 'numeração 1..N sem saltos');
  assert.match(await b.eval('document.querySelector(".qchip").getAttribute("aria-label")'), /^Pergunta 1 \((Teoria|Prática)\), (por responder|respondida)/);
  assert.equal(await b.eval('document.querySelector(".qchip.current").getAttribute("aria-current")'), 'true');
});

// ---- os quatro exames de demonstração podem ser concluídos pela interface e classificados (referências = 20/20)
async function completeExamViaUi(exam) {
  await b.goto(`${base}/`); await b.waitFor('document.querySelector("#view h1")');
  await b.eval(`(async () => { const { buildOriginal } = await import('/js/generator.js'); const { store } = await import('/js/store.js'); const { startAttempt } = await import('/js/views.js'); startAttempt(buildOriginal(store.bank, ${JSON.stringify(exam.id)})); })()`);
  await b.waitFor('location.hash.startsWith("#/run/")'); await b.waitFor('[...document.querySelectorAll("button")].some(e => e.textContent.includes("Começar"))');
  await b.clickText('button', 'Começar'); await b.waitFor('document.querySelector(".runner-head")');
  const qs = bank.questions.filter((q) => q.exam === exam.id); // ordem do exame: teoria, depois prática
  for (const [i, q] of qs.entries()) {
    if (q.type === 'theory') {
      await b.waitFor('document.querySelector(".option")');
      await b.eval(`document.querySelectorAll(".option")[${Math.max(0, 'abcdefgh'.indexOf(q.answer.value ?? 'a'))}].click()`);
    } else {
      await b.waitFor('document.querySelector("textarea.code")');
      await b.setValue('textarea.code', q.refs[0].code);
    }
    if (i < qs.length - 1) await b.eval(`[...document.querySelectorAll('.footer-nav button')].pop().click()`);
  }
  await b.clickText('.runner-head button', 'Entregar'); await b.waitFor('document.querySelector(".modal")');
  await b.clickText('.modal .btn', 'Entregar');
  await b.waitFor('location.hash.startsWith("#/review/")', 120000); await b.waitFor('document.querySelector(".score-big")', 30000);
  return text();
}
for (const exam of bank.exams) {
  test(`exame completo pela interface: "${exam.label}" fica com 20/20`, { skip, timeout: 240000 }, async () => {
    const t = await completeExamViaUi(exam);
    assert.match(t, /≈ 20 \/ 20/, t.slice(0, 200));
    assert.match(t, /Prática \(estimativa\)/);
    assert.deepEqual(await stray(), []);
    noErrors();
  });
}

test('sem GHC: faixa de aviso na interface, mensagem clara ao executar testes e recuperação', { skip, timeout: 120000 }, async () => {
  const saved = process.env.PATH;
  process.env.PATH = mkdtempSync(path.join(tmpdir(), 'pfl-nopath-'));
  try {
    await b.goto(`${base}/`); await b.eval('location.reload()'); await b.waitFor('document.querySelector("#banner .banner-item")');
    assert.match(await b.eval('document.querySelector("#banner").innerText'), /GHC.*não foi encontrado/);
    await openSingle('demoA-B01');
    await b.setValue('textarea.code', bank.questions.find((q) => q.id === 'demoA-B01').refs[0].code);
    await b.clickText('button', 'Executar testes');
    await b.waitFor('document.querySelector(".notice.err")', 40000);
    const msg = await b.eval('document.querySelector(".notice.err").innerText');
    assert.match(msg, /GHC/); assert.doesNotMatch(msg, /ENOENT/);
  } finally { process.env.PATH = saved; }
  await b.clickText('#banner button', 'Verificar de novo');
  await b.waitFor('!document.querySelector("#banner .banner-item")', 20000);
});

test('lista de exames: mostra os 4 exames e os avisos sobre respostas sem texto solto', { skip }, async () => {
  await b.goto(`${base}/#/exam`); await b.waitFor(`document.querySelectorAll(".card h3").length === ${bank.exams.length}`);
  const small = await b.eval('[...document.querySelectorAll(".card .small")].map(e => e.textContent.trim())');
  assert.ok(small.includes('1 pergunta(s) sem solução conhecida.'), JSON.stringify(small));
  assert.ok(small.includes('1 com chave não oficial (indicativa).'), JSON.stringify(small));
  assert.ok(small.every((t) => !/[;,]\s*$/.test(t)), `texto com pontuação solta: ${JSON.stringify(small)}`);
});
