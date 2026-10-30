// Gráfico de linha (SVG, sem dependências) da evolução da nota /20. Uma só série: sem legenda; o título do cartão
// nomeia-a. Linha de 2 px, marcadores de 9 px com anel da cor da superfície, grelha discreta, tooltip ao passar o rato
// ou focar (teclado). As cores vêm das variáveis CSS do tema (claro/escuro). A tabela de tentativas é a vista alternativa.
import { h, fmt, fmtDate } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  kids.forEach((c) => n.append(c));
  return n;
};
const W = 640; const H = 220; const M = { l: 34, r: 16, t: 14, b: 28 };

/** @param points saída de trendPoints() (≥ 1 ponto). */
export function trendChart(points) {
  const iw = W - M.l - M.r; const ih = H - M.t - M.b;
  const x = (i) => M.l + (points.length === 1 ? iw / 2 : (iw * i) / (points.length - 1));
  const y = (v) => M.t + ih * (1 - v / 20);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Evolução da nota (/20) em ${points.length} exames: de ${fmt(points[0].score20, 1)} a ${fmt(points.at(-1).score20, 1)}` });
  for (const v of [0, 5, 10, 15, 20]) {
    svg.append(el('line', { x1: M.l, x2: W - M.r, y1: y(v), y2: y(v), style: 'stroke:var(--border);stroke-width:1' }));
    svg.append(el('text', { x: M.l - 8, y: y(v) + 4, 'text-anchor': 'end', style: 'fill:var(--muted);font-size:11px' }, document.createTextNode(String(v))));
  }
  svg.append(el('text', { x: M.l, y: H - 6, 'text-anchor': 'start', style: 'fill:var(--muted);font-size:11px' }, document.createTextNode(fmtDate(points[0].at).split(',')[0])));
  if (points.length > 1) svg.append(el('text', { x: W - M.r, y: H - 6, 'text-anchor': 'end', style: 'fill:var(--muted);font-size:11px' }, document.createTextNode(fmtDate(points.at(-1).at).split(',')[0])));
  if (points.length > 1) svg.append(el('polyline', { points: points.map((p, i) => `${x(i)},${y(p.score20)}`).join(' '), fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', style: 'stroke:var(--primary);stroke-width:2' }));

  const tip = h('div', { class: 'chart-tip', role: 'status', hidden: true });
  const show = (p, i) => {
    tip.replaceChildren(h('strong', null, `${fmt(p.score20, 1)} / 20`), h('div', { class: 'muted' }, p.title), h('div', { class: 'muted' }, `${fmtDate(p.at)} · ${fmt(p.score)} / ${fmt(p.max)} val`));
    const ratio = x(i) / W;
    tip.style.left = `${ratio * 100}%`; tip.style.top = `${(y(p.score20) / H) * 100}%`;
    tip.style.transform = `translate(-${Math.round(ratio * 100)}%, calc(-100% - 12px))`;
    tip.hidden = false;
  };
  points.forEach((p, i) => {
    svg.append(el('circle', { cx: x(i), cy: y(p.score20), r: 4.5, style: 'fill:var(--primary);stroke:var(--surface);stroke-width:2;pointer-events:none' }));
    const hit = el('circle', { cx: x(i), cy: y(p.score20), r: 14, fill: 'transparent', tabindex: 0, 'aria-label': `${p.title}: ${fmt(p.score20, 1)} em 20`, class: 'chart-hit' });
    hit.addEventListener('mouseenter', () => show(p, i)); hit.addEventListener('focus', () => show(p, i));
    hit.addEventListener('mouseleave', () => { tip.hidden = true; }); hit.addEventListener('blur', () => { tip.hidden = true; });
    svg.append(hit);
  });
  return h('div', { class: 'chart' }, svg, tip);
}
