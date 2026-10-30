// Utilitários de DOM e formatação (sem innerHTML: todo o texto entra como nó de texto).

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'disabled') el.disabled = !!v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

export const clear = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };

export const fmt = (n, max = 3) => (n == null ? '—' : Number(n).toLocaleString('pt-PT', { maximumFractionDigits: max }));
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export function fmtDuration(sec) {
  if (sec == null || Number.isNaN(sec)) return '—';
  sec = Math.max(0, Math.round(sec));
  const hh = Math.floor(sec / 3600); const mm = Math.floor((sec % 3600) / 60); const ss = sec % 60;
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}

export const TYPE_LABEL = { theory: 'Teoria', practice: 'Prática' };
export const DIFF_LABEL = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' };
export const KIND_LABEL = { original: 'Exame original', random: 'Exame aleatório', training: 'Treino por tema', retry: 'Repetição' };
export const STATUS_LABEL = { official: 'Oficial', confirmed: 'Confirmada', unofficial: 'Não oficial', unknown: 'Desconhecida' };
export const STATUS_HELP = {
  official: 'Resposta mostrada como correta no próprio PDF do exame.',
  confirmed: 'Não está rotulada como oficial, mas foi confirmada: o Moodle deu a pergunta como correta e/ou foi verificada por execução em GHC.',
  unofficial: 'Chave de origem não identificada (não oficial). Serve de indicação e não conta para a nota.',
  unknown: 'A fonte não revela a solução; não há correção automática.',
};
export const STATUS_CLASS = { official: 'ok', confirmed: 'info', unofficial: 'warn', unknown: '' };

export const answerBadge = (status) => h('span', { class: `chip ${STATUS_CLASS[status] ?? ''}`, title: STATUS_HELP[status] }, STATUS_LABEL[status] ?? status);

/** Texto "rico" mínimo: blocos ``` , listas com • ou -, `código` inline e parágrafos. */
export function rich(text) {
  const frag = document.createDocumentFragment();
  if (!text) return frag;
  const parts = text.split(/```[a-z]*\n?/);
  parts.forEach((part, i) => {
    if (i % 2 === 1) { frag.append(h('pre', null, h('code', null, part.replace(/\n$/, '')))); return; }
    const lines = part.split('\n');
    let list = null; let para = [];
    const flushPara = () => { if (para.length) { frag.append(h('p', null, ...joinBr(para.map(inline)))); para = []; } };
    for (const line of lines) {
      const li = line.match(/^\s*(?:[•\-])\s+(.*)$/);
      if (li) { flushPara(); if (!list) { list = h('ul'); frag.append(list); } list.append(h('li', null, inline(li[1]))); continue; }
      list = null;
      if (!line.trim()) { flushPara(); continue; }
      para.push(line);
    }
    flushPara();
  });
  return frag;
}
const joinBr = (nodes) => nodes.flatMap((n, i) => (i ? [h('br'), n] : [n]));
function inline(line) {
  const span = document.createDocumentFragment();
  line.split(/(`[^`]+`)/).forEach((seg) => {
    if (seg.length > 2 && seg.startsWith('`') && seg.endsWith('`')) span.append(h('code', null, seg.slice(1, -1)));
    else if (seg) span.append(seg);
  });
  return span;
}

let toastTimer;
export function toast(msg, ms = 2600) {
  const root = document.getElementById('toast-root');
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  root.append(t);
  clearTimeout(toastTimer);
  setTimeout(() => t.remove(), ms);
}

/** Modal simples. Devolve uma Promise com o valor escolhido (ou null se cancelado). */
export function modal({ title, body, actions }) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    const back = h('div', { class: 'modal-back', onclick: (e) => { if (e.target === back) close(null); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('h2', null, title), body,
        h('div', { class: 'actions' }, actions.map((a) => h('button', { class: `btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}`, onclick: () => close(a.value) }, a.label)))));
    document.addEventListener('keydown', onKey);
    root.append(back);
    back.querySelector('.btn.primary, .btn')?.focus();
  });
}
export const confirmBox = (title, text, okLabel = 'Confirmar', danger = false) =>
  modal({ title, body: h('p', null, text), actions: [{ label: 'Cancelar', value: false }, { label: okLabel, value: true, primary: !danger, danger }] });

/** append que ignora null/undefined/false (evita o texto "null" na página) e aceita arrays. */
export function put(el, ...children) {
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
