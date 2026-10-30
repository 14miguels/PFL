// Servidor local (sem dependências): serve a app, executa testes Haskell e guarda o histórico em disco.
import http from 'node:http';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runQuestion } from './haskell.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(root, 'public');
const BANK_FILE = path.join(root, 'bank', 'questions.json');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.hs': 'text/plain; charset=utf-8' };
const MAX_BODY = 512 * 1024;
const ID_RE = /^(?!__proto__$|constructor$|prototype$)[A-Za-z0-9_-]{1,64}$/;

/** Versão do banco enviada ao browser: sem respostas, soluções nem valores esperados dos testes. */
export function publicBank(bank) {
  const questions = bank.questions.map((q) => {
    const { answer, refs, verify, tests, testHelpers, ...rest } = q;
    const out = { ...rest };
    if (q.type === 'theory') out.answer = { status: answer.status };
    else out.tests = (tests ?? []).map((t) => ({ label: t.call ?? t.io, origin: t.origin }));
    return out;
  });
  const contexts = bank.contexts.map(({ harnessExtra, ...c }) => c);
  return { ...bank, questions, contexts };
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

async function readJson(req) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > MAX_BODY) throw new HttpError(413, 'pedido demasiado grande'); chunks.push(c); }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'JSON inválido'); }
}

/** Fila simples para limitar execuções simultâneas de runghc. */
function limiter(n) {
  let active = 0; const waiting = [];
  const next = () => { if (active < n && waiting.length) { active++; waiting.shift()(); } };
  return (fn) => new Promise((resolve, reject) => { waiting.push(() => fn().then(resolve, reject).finally(() => { active--; next(); })); next(); });
}

export function createApp({ dataDir = path.join(root, 'data'), bankFile = BANK_FILE, port = 0 } = {}) {
  const bank = JSON.parse(readFileSync(bankFile, 'utf8'));
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const ctxOf = (q) => bank.contexts.find((c) => c.exam === q.exam && c.id === q.ctx) ?? null;
  const pub = publicBank(bank);
  const limit = limiter(2);
  const stateFile = path.join(dataDir, 'state.json');
  const wsDir = path.join(dataDir, 'workspace');
  let state = { version: 1, attempts: {}, settings: {} };
  let writing = Promise.resolve();

  const loadState = () => {
    if (existsSync(stateFile)) {
      try { state = { ...state, ...JSON.parse(readFileSync(stateFile, 'utf8')) }; } catch (e) { console.error('state.json ilegível, a começar vazio:', e.message); }
    }
  };
  const saveState = () => {
    writing = writing.then(async () => {
      await mkdir(dataDir, { recursive: true });
      const tmp = `${stateFile}.tmp`;
      await writeFile(tmp, JSON.stringify(state));
      await rename(tmp, stateFile);
    }).catch((e) => console.error('falha a guardar estado:', e));
    return writing;
  };
  loadState();

  async function handleApi(req, res, url) {
    const { pathname } = url;
    const m = req.method;
    if (m === 'GET' && pathname === '/api/bank') return sendJson(res, 200, pub);
    if (m === 'GET' && pathname === '/api/state') return sendJson(res, 200, state);

    if (m === 'POST' && pathname === '/api/run') {
      const { questionId, code } = await readJson(req);
      const q = byId.get(questionId);
      if (!q || q.type !== 'practice') throw new HttpError(404, 'questão prática desconhecida');
      if (typeof code !== 'string' || code.length > 100_000) throw new HttpError(400, 'código inválido ou demasiado grande');
      const out = await limit(() => runQuestion({ question: q, ctx: ctxOf(q), code }));
      const results = out.results.map((r) => {
        const t = q.tests[r.index];
        return { index: r.index, status: r.status, got: r.got, label: t.call ?? t.io, origin: t.origin, ...(r.status === 'PASS' ? {} : { expect: t.expect ?? t.stdout }), ...(t.cmp ? { cmp: t.cmp } : {}) };
      });
      return sendJson(res, 200, { compileError: out.compileError, results, constraints: out.constraints });
    }

    if (m === 'POST' && pathname === '/api/reveal') {
      const { ids } = await readJson(req);
      if (!Array.isArray(ids) || ids.length > 200) throw new HttpError(400, 'ids inválidos');
      const out = {};
      for (const id of ids) {
        const q = byId.get(id);
        if (!q) continue;
        out[id] = q.type === 'theory' ? { answer: q.answer } : { refs: q.refs.map(({ code, status, origin, note }) => ({ code, status, origin, note })) };
      }
      return sendJson(res, 200, out);
    }

    if (m === 'PUT' && pathname.startsWith('/api/attempts/')) {
      const id = pathname.split('/')[3];
      if (!ID_RE.test(id)) throw new HttpError(400, 'id inválido');
      const body = await readJson(req);
      if (!body || body.id !== id || !Array.isArray(body.items)) throw new HttpError(400, 'tentativa inválida');
      state.attempts[id] = body;
      await saveState();
      return sendJson(res, 200, { ok: true });
    }
    if (m === 'DELETE' && pathname.startsWith('/api/attempts/')) {
      const id = pathname.split('/')[3];
      if (!ID_RE.test(id)) throw new HttpError(400, 'id inválido');
      delete state.attempts[id];
      await saveState();
      return sendJson(res, 200, { ok: true });
    }
    if (m === 'PUT' && pathname === '/api/settings') {
      const body = await readJson(req);
      state.settings = { ...state.settings, ...body };
      await saveState();
      return sendJson(res, 200, state.settings);
    }

    if (pathname.startsWith('/api/workspace/')) {
      const id = pathname.split('/')[3];
      if (!ID_RE.test(id) || !byId.has(id)) throw new HttpError(400, 'id inválido');
      const file = path.join(wsDir, `${id}.hs`);
      if (m === 'GET') {
        if (!existsSync(file)) throw new HttpError(404, 'ficheiro ainda não existe');
        return sendJson(res, 200, { path: file, code: await readFile(file, 'utf8') });
      }
      if (m === 'PUT') {
        const { code } = await readJson(req);
        if (typeof code !== 'string' || code.length > 100_000) throw new HttpError(400, 'código inválido');
        await mkdir(wsDir, { recursive: true });
        await writeFile(file, code);
        return sendJson(res, 200, { path: file });
      }
    }
    throw new HttpError(404, 'rota desconhecida');
  }

  async function serveStatic(req, res, url) {
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    let base = PUBLIC;
    if (rel.startsWith('/bank/assets/')) { base = path.join(root, 'bank', 'assets'); rel = rel.slice('/bank/assets'.length); }
    const file = path.normalize(path.join(base, rel));
    if (!file.startsWith(base + path.sep)) throw new HttpError(403, 'proibido');
    let st;
    try { st = await stat(file); } catch { throw new HttpError(404, 'não encontrado'); }
    if (!st.isFile()) throw new HttpError(404, 'não encontrado');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const hostOk = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(req.headers.host ?? '');
      if (!hostOk) throw new HttpError(403, 'host não permitido');
      if (url.pathname.startsWith('/api/')) {
        // defesa contra pedidos de outros sites (CSRF/DNS rebinding): origem igual e cabeçalho próprio em escritas
        if (req.method !== 'GET') {
          const origin = req.headers.origin;
          if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'origem não permitida');
          if (req.headers['x-pfl'] !== '1' || !String(req.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(403, 'cabeçalhos em falta');
        }
        return await handleApi(req, res, url);
      }
      if (req.method !== 'GET') throw new HttpError(405, 'método não permitido');
      return await serveStatic(req, res, url);
    } catch (e) {
      const code = e instanceof HttpError ? e.code : 500;
      if (code === 500) console.error(e);
      sendJson(res, code, { error: e.message });
    }
  });

  return {
    server,
    listen: () => new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server.address().port))),
    close: () => new Promise((resolve) => server.close(resolve)),
    getState: () => state,
    flush: () => writing,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp({ port: Number(process.env.PORT) || 4577 });
  const port = await app.listen();
  console.log(`PFL Prep a correr em http://127.0.0.1:${port}`);
}
