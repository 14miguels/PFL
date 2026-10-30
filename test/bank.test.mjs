import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runQuestion } from '../server/haskell.mjs';
import { starterFor } from '../public/js/code.js';
import { bank, ctxOf } from './helpers.mjs';

const root = new URL('..', import.meta.url);

test('banco de demonstração: ids únicos, estados coerentes e só há uma resposta desconhecida e uma não oficial', () => {
  assert.equal(new Set(bank.questions.map((q) => q.id)).size, bank.questions.length);
  const st = (s) => bank.questions.filter((q) => q.type === 'theory' && q.answer.status === s).length;
  assert.deepEqual([st('official'), st('unknown'), st('unofficial')], [0, 1, 1], 'nenhuma resposta "oficial" (não há exames reais) e uma de cada estado especial para demonstrar a interface');
});

test('todas as questões são de demonstração (nenhum exame real) e têm tema, dificuldade e origem dos testes', () => {
  for (const q of bank.questions) {
    assert.equal(q.source.file, 'demo', q.id);
    assert.ok(bank.themes[q.theme] && ['facil', 'media', 'dificil'].includes(q.difficulty), q.id);
    if (q.type === 'practice') {
      assert.ok(q.tests.length >= 1 && q.tests.every((t) => ['enunciado', 'gerado'].includes(t.origin)), q.id);
      assert.ok(q.refs.every((r) => r.status !== 'official'), `${q.id}: nenhuma solução de referência pode ser marcada como oficial`);
    }
  }
});

test('respostas desconhecidas não têm valor; as outras têm justificação', () => {
  for (const q of bank.questions.filter((x) => x.type === 'theory')) {
    if (q.answer.status === 'unknown') assert.equal(q.answer.value, null, q.id);
    else assert.ok(q.answer.value && q.answer.basis.length > 10, q.id);
  }
});

test('mutação: um esqueleto vazio (func = undefined) nunca passa nenhum teste', { timeout: 300000 }, async () => {
  for (const q of bank.questions.filter((x) => x.type === 'practice')) {
    const r = await runQuestion({ question: q, ctx: ctxOf(q), code: starterFor(q) });
    assert.equal(r.results.filter((x) => x.status === 'PASS').length, 0, q.id);
  }
});

test('validação completa: referências passam nos testes e a teoria verifica-se em GHC', { timeout: 300000 }, () => {
  const out = execFileSync('node', ['scripts/validate-bank.mjs'], { cwd: root.pathname, encoding: 'utf8', env: { ...process.env, PFL_BANK: 'demo' } });
  assert.match(out, /OK — banco validado/);
});

test('higiene do repositório: dados pessoais e banco privado estão no .gitignore', () => {
  const ignored = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8').split('\n').map((l) => l.trim());
  for (const entry of ['data/', 'node_modules/', 'bank/src/', 'bank/ocr/', 'bank/assets/', 'bank/questions.json', 'test/private/', '*.pdf', '.env']) {
    assert.ok(ignored.includes(entry), `.gitignore deve conter ${entry}`);
  }
});

test('licença e CI: MIT declarada e workflow com várias versões de Node e GHC', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.license, 'MIT');
  assert.match(readFileSync(new URL('../LICENSE', import.meta.url), 'utf8'), /^MIT License/);
  const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  for (const v of ['node: 20', 'node: 22', 'node: 24', 'haskell-actions/setup', 'npm test']) assert.ok(ci.includes(v), `ci.yml deve conter "${v}"`);
});

test('sem material de terceiros: nenhuma imagem, tipo de letra, PDF ou URL externa na interface', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: root.pathname, encoding: 'utf8' }).split('\n').filter(Boolean);
  assert.deepEqual(files.filter((f) => /\.(png|jpe?g|gif|woff2?|ttf|otf|pdf|zip)$/i.test(f)), []);
  for (const f of files.filter((x) => x.startsWith('public/'))) {
    const txt = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(txt, /(?:src|href)=["']https?:\/\//, `${f} carrega recursos externos`);
    assert.doesNotMatch(txt, /@import|url\(\s*["']?https?:/, `${f} importa CSS externo`);
  }
});

test('banco de demonstração (V2): ~52 questões, 14 temas, 4 exames de 20 valores, ~45% teoria e dificuldade ~40/40/20', () => {
  const n = bank.questions.length;
  const th = bank.questions.filter((q) => q.type === 'theory').length;
  assert.ok(n >= 48 && n <= 56, `${n} questões`);
  assert.ok(th / n >= 0.40 && th / n <= 0.50, `teoria: ${(100 * th / n).toFixed(0)}%`);
  const share = (d) => bank.questions.filter((q) => q.difficulty === d).length / n;
  assert.ok(share('facil') >= 0.35 && share('facil') <= 0.45, `fácil ${(100 * share('facil')).toFixed(0)}%`);
  assert.ok(share('media') >= 0.35 && share('media') <= 0.45, `média ${(100 * share('media')).toFixed(0)}%`);
  assert.ok(share('dificil') >= 0.15 && share('dificil') <= 0.25, `difícil ${(100 * share('dificil')).toFixed(0)}%`);
  const themes = Object.keys(bank.themes);
  assert.equal(themes.length, 14);
  for (const t of themes) assert.ok(bank.questions.filter((q) => q.theme === t).length >= 2, `o tema "${t}" tem menos de 2 questões`);
  assert.deepEqual(bank.exams.map((e) => e.id), ['demo-a', 'demo-b', 'mini-a', 'mini-b']);
  for (const e of bank.exams) {
    assert.equal(e.totalPoints, 20, e.id);
    const qs = bank.questions.filter((q) => q.exam === e.id);
    assert.ok(qs.some((q) => q.type === 'theory') && qs.some((q) => q.type === 'practice'), e.id);
    assert.ok(qs.length >= 12 && qs.length <= 14, `${e.id}: ${qs.length} questões`);
  }
});

test('qualidade das questões: sem repetições, teoria com 4 opções, prática com testes normais e casos-limite', () => {
  const norm = (x) => x.toLowerCase().replace(/\s+/g, ' ');
  assert.equal(new Set(bank.questions.map((q) => norm(q.statement))).size, bank.questions.length, 'enunciados repetidos');
  const funcs = bank.questions.filter((q) => q.func).map((q) => q.func);
  assert.equal(new Set(funcs).size, funcs.length, 'a mesma função pedida duas vezes');
  for (const q of bank.questions) {
    if (q.type === 'theory') {
      assert.equal(q.options.length, 4, q.id);
      assert.ok(q.answer.status === 'confirmed' ? q.verify?.length : true, `${q.id}: resposta confirmada sem verificação`);
    } else {
      assert.ok(q.tests.length >= 2, q.id);
      assert.ok(q.tests.some((t) => t.origin === 'enunciado') && q.tests.filter((t) => t.origin === 'gerado').length >= 1, `${q.id}: faltam exemplos do enunciado ou casos gerados`);
      assert.ok(q.refs.length >= 1 && q.constraints.length >= 1, q.id);
    }
  }
});

test('os enunciados usam só a formatação suportada pela interface (sem **negrito** nem outro markdown)', () => {
  for (const q of bank.questions) for (const t of [q.statement, ...(q.options ?? [])]) assert.doesNotMatch(t.replace(/```[\s\S]*?```/g, ''), /\*\*|__|^#{1,6}\s/m, `${q.id}: markdown não suportado`);
  for (const c of bank.contexts) assert.doesNotMatch(`${c.text ?? ''}${c.note ?? ''}`, /\*\*/, `${c.id}: markdown não suportado`);
});
