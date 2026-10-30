import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.mjs';
import { launch, hasChrome } from './cdp.mjs';
import { bank, bankFile, byId } from './helpers.mjs';

const SHOTS = process.env.SHOTS_DIR ?? mkdtempSync(path.join(tmpdir(), 'pfl-shots-'));
let app; let base; let b;
const skip = !hasChrome && 'Chrome não encontrado';

before(async () => {
  if (skip) return;
  app = createApp({ dataDir: mkdtempSync(path.join(tmpdir(), 'pfl-e2e-')), bankFile });
  base = `http://127.0.0.1:${await app.listen()}`;
  b = await launch();
});
after(async () => { await b?.close(); await app?.close(); });

const text = () => b.eval('document.getElementById("view").innerText');
// Nós de texto visíveis fora de blocos de código (em Haskell, `null` é uma função legítima).
const stray = () => b.eval(`(() => {
  const out = []; const w = document.createTreeWalker(document.getElementById('view'), NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.parentElement.closest('pre, code, .mono, textarea')) continue;
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
  for (let i = 0; i < 6; i++) {
    await b.eval('document.querySelectorAll(".option")[1].click()');
    await b.eval(`[...document.querySelectorAll('.footer-nav button')].pop().click()`);
  }
  await b.waitFor('document.querySelector("textarea.code")');
  assert.match(await text(), /Questão 7 de 12/);
  // prática 1 (sumSquares) com a solução de referência
  await b.setValue('textarea.code', byId('demoA-B01').refs[0].code);
  await b.clickText('button', 'Executar testes');
  await b.waitFor('document.querySelector("table td.test-ok")', 40000);
  assert.match(await text(), /3\/3 testes passaram/);
  console.log('screens →', await b.screenshot(path.join(SHOTS, 'practice-run.png')));
  // prática 3 (evensDoubled) com uma solução que viola a técnica imposta
  await b.eval(`document.querySelectorAll('.qchip')[8].click()`);
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
  assert.ok(n > 0 && n < 12, `repetição tem ${n} perguntas`);
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
  assert.deepEqual(await b.eval('[...document.querySelectorAll("#preset option")].map(o => o.value)'), ['demo', 'curto', 'custom']);
  await b.clickText('button', 'Gerar exame');
  await b.waitFor('location.hash.startsWith("#/run/")');
  await b.waitFor('document.querySelector("#view h1")');
  const t = await text();
  assert.match(t, /Exame aleatório/);
  assert.match(t, /Cotações atingidas: teoria 2/);
  assert.match(t, /prática 5/);
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
