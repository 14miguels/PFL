import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runQuestion } from '../server/haskell.mjs';
import { starterFor } from '../public/js/code.js';
import { bank, ctxOf } from './helpers.mjs';

const root = new URL('..', import.meta.url);

test('banco de demonstração: contagens e estados coerentes', () => {
  const th = bank.questions.filter((q) => q.type === 'theory');
  const pr = bank.questions.filter((q) => q.type === 'practice');
  assert.deepEqual([bank.exams.length, th.length, pr.length], [2, 8, 8]);
  assert.deepEqual(th.map((q) => q.answer.status).sort(), ['confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed', 'unknown', 'unofficial']);
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
