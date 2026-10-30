import { init, store, onSaveStatus } from './store.js';
import { showBanner, hideBanner } from './banner.js';
import { startRouter } from './router.js';
import { h } from './util.js';
import { api } from './api.js';
import { renderHome, renderOriginal, renderRandom, renderTrain, renderHistory, renderBank } from './views.js';
import { renderRunner } from './runner.js';
import { renderReview } from './review.js';

const NAV = [['/', '🏠', 'Início'], ['/exam', '📝', 'Exame original'], ['/random', '🎲', 'Exame aleatório'], ['/train', '🎯', 'Treino por tema'], ['/history', '🕘', 'Histórico'], ['/bank', '📚', 'Banco de questões']];

function setTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  try { t ? localStorage.setItem('pfl-theme', t) : localStorage.removeItem('pfl-theme'); } catch { /* sem armazenamento */ }
  const dark = (t ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  document.getElementById('theme-toggle').textContent = dark ? '☀️ Claro' : '🌙 Escuro';
  api.saveSettings({ theme: t ?? null }).catch(() => {});
}
const currentTheme = () => document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function drawNav(path) {
  const nav = document.getElementById('nav');
  nav.replaceChildren(...NAV.map(([p, ico, label]) => h('a', { href: `#${p}`, class: (p === '/' ? path === '/' : path.startsWith(p)) ? 'active' : '', onclick: () => document.getElementById('sidebar').classList.remove('open') }, h('span', { class: 'ico' }, ico), label)));
}

async function checkHealth() {
  try {
    const { ghc } = await api.health();
    if (ghc.ok) hideBanner('ghc');
    else showBanner('ghc', ghc.message, { actions: [{ label: 'Verificar de novo', onclick: checkHealth }] });
  } catch { /* o aviso de gravação cobre o servidor em baixo */ }
}

async function main() {
  const view = document.getElementById('view');
  document.getElementById('theme-toggle').addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  document.getElementById('menu-btn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  setTheme(document.documentElement.dataset.theme ?? null);
  try { await init(); } catch (e) { view.textContent = `Não foi possível contactar o servidor local: ${e.message}`; return; }
  if (store.settings.theme && !document.documentElement.dataset.theme) setTheme(store.settings.theme);
  checkHealth();
  onSaveStatus((s) => (s === 'error' ? showBanner('save', 'Não foi possível guardar o progresso (o servidor local está a correr?). A tentar de novo…', { kind: 'err' }) : hideBanner('save')));
  startRouter([
    [/^\/$/, renderHome], [/^\/exam$/, renderOriginal], [/^\/random$/, renderRandom], [/^\/train$/, renderTrain], [/^\/history$/, renderHistory], [/^\/bank$/, renderBank],
    [/^\/run\/([\w-]+)$/, renderRunner], [/^\/review\/([\w-]+)$/, renderReview],
  ], view, drawNav);
}
main();
