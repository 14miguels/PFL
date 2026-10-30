// Avisos persistentes no topo da vista (ex.: GHC em falta, falha ao guardar).
import { h } from './util.js';

const active = new Map(); // id -> elemento

/** Mostra (ou atualiza) o aviso `id`. actions: [{ label, onclick }] */
export function showBanner(id, text, { kind = 'warn', actions = [] } = {}) {
  const root = document.getElementById('banner');
  if (!root) return;
  const el = h('div', { class: `notice ${kind} banner-item`, role: 'alert' }, h('span', null, text), actions.map((a) => h('button', { class: 'btn sm', onclick: a.onclick }, a.label)));
  active.get(id)?.remove();
  active.set(id, el);
  root.append(el);
}
export function hideBanner(id) { active.get(id)?.remove(); active.delete(id); }
