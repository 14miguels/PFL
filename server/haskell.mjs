// Construção e execução de programas Haskell (runghc) para testar soluções.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkConstraints } from './constraints.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// calculado em cada chamada: o PATH pode mudar (e os testes simulam um GHC em falta)
const env = () => ({ ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' });

/** Corre um comando com timeout; devolve { code, stdout, stderr, timedOut }. */
export function exec(cmd, args, { cwd, timeoutMs = 25000, input } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, env: env() });
    let stdout = ''; let stderr = ''; let timedOut = false;
    const t = setTimeout(() => { timedOut = true; p.kill('SIGKILL'); }, timeoutMs);
    p.stdout.on('data', (d) => { stdout += d; if (stdout.length > 2e6) p.kill('SIGKILL'); });
    p.stderr.on('data', (d) => { stderr += d; if (stderr.length > 2e6) p.kill('SIGKILL'); });
    p.on('error', (e) => { clearTimeout(t); resolve({ code: -1, stdout, stderr: String(e), timedOut }); });
    p.on('close', (code) => { clearTimeout(t); resolve({ code, stdout, stderr, timedOut }); });
    if (input != null) p.stdin.end(input); else p.stdin.end();
  });
}

export async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'pfl-'));
  try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

/** Resolve (transitivamente) as entradas de suporte pedidas por uma questão. */
export function resolveSupport(ctx, needs = []) {
  const sup = ctx?.support ?? {};
  const seen = new Set();
  const order = [];
  const visit = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    const e = sup[n];
    if (!e) throw new Error(`código auxiliar "${n}" não existe`);
    for (const d of e.deps ?? []) visit(d);
    order.push(n);
  };
  needs.forEach(visit);
  return order.map((name) => ({ name, ...sup[name] }));
}

const splitImports = (code) => {
  const imports = []; const rest = [];
  for (const l of code.split('\n')) (/^import\s/.test(l) ? imports : rest).push(l);
  return { imports, body: rest.join('\n') };
};

function providedModule(ctx) {
  return `{-# LANGUAGE StandaloneDeriving #-}\nmodule Provided where\n\n${ctx?.code ?? ''}\n\n${ctx?.harnessExtra ?? ''}\n`;
}

function supportModule(entries) {
  const exports = entries.flatMap((e) => e.exports ?? [e.name]);
  return `module Support (${exports.join(', ')}) where\nimport Provided\n\n${entries.map((e) => e.code).join('\n\n')}\n`;
}

const testExpr = (t) => {
  const call = `(${t.call})`; const want = `(${t.expect})`;
  if (t.cmp === 'set') return `H.set ${call} ${want}`;
  if (t.via) return `H.via ${t.via} ${call} ${want}`;
  return `H.eq ${call} ${want}`;
};

function mainSource({ code, entries, tests, helpers }) {
  const { imports, body } = splitImports(code);
  const ex = entries.flatMap((e) => e.exports ?? [e.name]);
  const exprTests = tests.filter((t) => t.call);
  return `{-# LANGUAGE StandaloneDeriving #-}
module Main (main) where
import qualified Harness as H
import qualified Data.List as HL
import qualified Data.Char
import Provided
${entries.length ? `import Support (${ex.join(', ')})\n` : ''}${imports.join('\n')}
{-# LINE 1 "solucao.hs" #-}
${body}

{-# LINE 1 "testes-gerados.hs" #-}
${helpers ?? ''}
main :: IO ()
main = H.run
  [ ${exprTests.map(testExpr).join('\n  , ')}
  ]
`;
}

function ioMainSource({ code, entries, io }) {
  const { imports, body } = splitImports(code);
  const ex = entries.flatMap((e) => e.exports ?? [e.name]);
  return `{-# LANGUAGE StandaloneDeriving #-}
module Main (main) where
import Provided
${entries.length ? `import Support (${ex.join(', ')})\n` : ''}${imports.join('\n')}
{-# LINE 1 "solucao.hs" #-}
${body}

{-# LINE 1 "testes-gerados.hs" #-}
main :: IO ()
main = ${io}
`;
}

export const GHC_MISSING_MSG = 'O GHC (comando "runghc") não foi encontrado. Instala-o (https://www.haskell.org/ghcup/) e reinicia a aplicação; depois volta a executar os testes.';
const isMissingGhc = (msg) => /ENOENT/.test(msg) && /runghc|ghc/.test(msg);

/** Os erros de sintaxe por definição incompleta aparecem na linha seguinte (código gerado): explica isso. */
function friendlyError(msg) {
  if (isMissingGhc(msg)) return GHC_MISSING_MSG;
  return /^testes-gerados\.hs:/.test(msg)
    ? `Erro de sintaxe no fim da tua solução (definição incompleta ou indentação errada):\n${msg}`
    : msg;
}

async function runghc(dir, file = 'Main.hs', opts = {}) {
  return exec('runghc', ['--ghc-arg=-w', file], { cwd: dir, ...opts });
}

/**
 * Corre os testes de uma questão prática sobre o código `code`.
 * Devolve { compileError?, results: [{ index, status, got }], constraints }.
 */
export async function runQuestion({ question, ctx, code, timeoutMs = 15000 }) {
  const entries = resolveSupport(ctx, question.needs);
  const constraints = checkConstraints(code, question.constraints ?? []);
  const tests = question.tests ?? [];
  return withTempDir(async (dir) => {
    await copyFile(path.join(here, 'Harness.hs'), path.join(dir, 'Harness.hs'));
    await writeFile(path.join(dir, 'Provided.hs'), providedModule(ctx));
    if (entries.length) await writeFile(path.join(dir, 'Support.hs'), supportModule(entries));
    const results = Array.from({ length: tests.length }, () => null);
    let compileError = null;
    let timedOut = false;

    const exprIdx = tests.map((t, i) => (t.call ? i : -1)).filter((i) => i >= 0);
    if (exprIdx.length) {
      await writeFile(path.join(dir, 'Main.hs'), mainSource({ code, entries, tests, helpers: question.testHelpers }));
      const r = await runghc(dir, 'Main.hs', { timeoutMs });
      const lines = r.stdout.split('\n').filter((l) => l.startsWith('@@PFL@@\t'));
      if (r.timedOut) timedOut = true;
      else if (!lines.length) compileError = friendlyError((r.stderr || r.stdout || 'Erro desconhecido').trim());
      for (const l of lines) {
        const [, i, status, ...got] = l.split('\t');
        results[exprIdx[Number(i)]] = { status, got: got.join('\t').replaceAll('\\n', '\n') };
      }
    }
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      if (!t.io || compileError) continue;
      await writeFile(path.join(dir, 'Main.hs'), ioMainSource({ code, entries, io: t.io }));
      const r = await runghc(dir, 'Main.hs', { timeoutMs: 10000 });
      if (r.timedOut) results[i] = { status: 'TIMEOUT', got: '' };
      else if (r.code !== 0) results[i] = { status: 'ERR', got: (r.stderr || '').trim().split('\n').slice(0, 3).join(' | ') };
      else results[i] = { status: r.stdout === t.stdout ? 'PASS' : 'FAIL', got: r.stdout };
    }
    // se o tempo total esgotou, o primeiro teste sem resultado é o que ficou preso; os seguintes não chegaram a correr
    let stuck = false;
    const final = results.map((x, i) => {
      if (x) return { index: i, ...x };
      if (compileError) return { index: i, status: 'NOT_RUN', got: '' };
      if (timedOut) { const status = stuck ? 'NOT_RUN' : 'TIMEOUT'; stuck = true; return { index: i, status, got: '' }; }
      return { index: i, status: 'MISSING', got: '' };
    });
    return { compileError, timedOut, results: final, constraints };
  });
}

// ---------- utilitários para a validação do banco (teoria) ----------

export async function ghcEval(prelude, expr) {
  return withTempDir(async (dir) => {
    await writeFile(path.join(dir, 'T.hs'), `${prelude}\n`);
    return exec('ghc', ['-v0', '-w', '-e', expr, 'T.hs'], { cwd: dir, timeoutMs: 30000 });
  });
}

export async function ghcCompiles(src) {
  return withTempDir(async (dir) => {
    await writeFile(path.join(dir, 'T.hs'), `module T where\n${src}`);
    const r = await exec('ghc', ['-fno-code', '-w', 'T.hs'], { cwd: dir, timeoutMs: 30000 });
    return r.code === 0;
  });
}

export async function ghcType(prelude, target) {
  return withTempDir(async (dir) => {
    await writeFile(path.join(dir, 'T.hs'), `{-# LANGUAGE NoMonomorphismRestriction #-}\n${prelude}\n`);
    const r = await exec('ghc', ['-v0', '-w', '-e', `:t ${target}`, 'T.hs'], { cwd: dir, timeoutMs: 30000 });
    return r.stdout.trim();
  });
}

export async function equivRun({ name, sig, original, def, inputs }) {
  return withTempDir(async (dir) => {
    await writeFile(path.join(dir, 'Orig.hs'), `module Orig where\n${sig}\n${original}\n`);
    const cmp = inputs.map((x) => `show (Orig.${name} (${x})) == show (${name} (${x}))`).join(', ');
    await writeFile(path.join(dir, 'Main.hs'), `module Main where\nimport qualified Orig\n${sig}\n${def}\nmain :: IO ()\nmain = print (and [${cmp}])\n`);
    const r = await exec('runghc', ['--ghc-arg=-w', 'Main.hs'], { cwd: dir, timeoutMs: 30000 });
    return r.code === 0 && r.stdout.trim() === 'True';
  });
}

/** Verifica se o GHC está utilizável. Devolve { ok, ghc, runghc, message }. */
export async function checkGhc() {
  const [g, r] = await Promise.all([exec('ghc', ['--numeric-version'], { timeoutMs: 8000 }), exec('runghc', ['--version'], { timeoutMs: 8000 })]);
  const ok = g.code === 0 && r.code === 0;
  return { ok, ghc: g.code === 0 ? g.stdout.trim() : null, runghc: r.code === 0 ? r.stdout.trim() : null, message: ok ? null : GHC_MISSING_MSG };
}
