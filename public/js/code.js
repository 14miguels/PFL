// Ficheiro-modelo, exportação e importação de ficheiros .hs.
import { store } from './store.js';

export const MARK = '-- ===== A TUA SOLUÇÃO (edita só daqui para baixo) =====';

/** Modelo inicial: assinatura do enunciado (quando existe) e corpo por preencher. */
export function starterFor(q) {
  const sig = q.signature ?? `-- (o enunciado não dá a assinatura de ${q.func})`;
  return `${sig}\n${q.func} = undefined\n`;
}

function supportEntries(q) {
  const ctx = store.ctxOf(q);
  return (q.needs ?? []).map((n) => ({ name: n, ...ctx?.support?.[n] })).filter((e) => e.code);
}

/** Texto do ficheiro .hs descarregável: código fornecido + a solução do utilizador (separados por MARK). */
export function exportHs(q, code) {
  const ctx = store.ctxOf(q);
  const header = [`-- ${q.id} — ${store.examOf(q).label} — ${q.n}`, `-- Fonte: ${q.source.file}`, '-- Para experimentar no ghci: ghci este-ficheiro.hs', ''];
  const provided = [];
  if (ctx?.code) provided.push('-- ----- Código fornecido pelo enunciado -----', ctx.code, '');
  for (const e of supportEntries(q)) provided.push(`-- ----- Código auxiliar disponível (${e.origin}) -----`, e.code, '');
  return `${header.join('\n')}\n${provided.join('\n')}\n${MARK}\n${code}`;
}

/** Aceita um ficheiro exportado (usa o que vem depois da marca) ou um .hs simples. */
export function importHs(text) {
  const i = text.indexOf(MARK);
  return (i >= 0 ? text.slice(i + MARK.length).replace(/^\n/, '') : text);
}

export function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
