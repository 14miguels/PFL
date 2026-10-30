// Cliente mínimo de Chrome DevTools Protocol (sem dependências) para testes de interface.
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const hasChrome = existsSync(CHROME);

export async function launch({ width = 1280, height = 900 } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'pfl-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu', `--window-size=${width},${height}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chrome não arrancou')), 15000);
    proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(t); resolve(m[1]); } });
  });
  const port = new URL(wsUrl).port;
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((x) => x.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const errors = []; const logs = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
    else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    else if (msg.method === 'Runtime.consoleAPICalled') { const t = msg.params.args.map((a) => a.value ?? a.description).join(' '); logs.push(`${msg.params.type}: ${t}`); if (msg.params.type === 'error') errors.push(t); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  const api = {
    errors, logs,
    send,
    async goto(url) { await send('Page.navigate', { url }); await new Promise((r) => setTimeout(r, 400)); await api.waitFor('document.readyState === "complete"'); },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(expr, timeout = 20000) {
      const t0 = Date.now();
      for (;;) {
        try { if (await api.eval(`!!(${expr})`)) return; } catch { /* página a navegar */ }
        if (Date.now() - t0 > timeout) throw new Error(`timeout à espera de: ${expr}`);
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    clickText: (sel, text) => api.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.trim().includes(${JSON.stringify(text)})); if (!el) throw new Error('não encontrado: ${sel} ${text}'); el.click(); return true; })()`),
    setValue: (sel, value) => api.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`),
    async key(key) { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, text: key.length === 1 ? key : undefined }); },
    async screenshot(file, { width, height } = {}) {
      if (width) await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
      const r = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(file, Buffer.from(r.data, 'base64'));
      if (width) await send('Emulation.clearDeviceMetricsOverride');
      return file;
    },
    async close() { try { await send('Browser.close'); } catch { /* ok */ } ws.close(); proc.kill(); },
  };
  return api;
}
