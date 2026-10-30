// Router por hash (#/rota) com limpeza ao sair de cada vista.
let leaveFns = [];
export const onLeave = (fn) => leaveFns.push(fn);
export const go = (path) => { if (location.hash === `#${path}`) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = `#${path}`; };

export function startRouter(routes, view, onChange) {
  const render = async () => {
    leaveFns.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    leaveFns = [];
    document.getElementById('modal-root')?.replaceChildren(); // fecha modais ao mudar de vista
    const path = location.hash.replace(/^#/, '') || '/';
    for (const [pattern, handler] of routes) {
      const m = path.match(pattern);
      if (m) { while (view.firstChild) view.firstChild.remove(); onChange?.(path); try { await handler(view, ...m.slice(1)); } catch (e) { console.error(e); view.textContent = `Erro: ${e.message}`; } view.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); return; }
    }
    location.hash = '#/';
  };
  window.addEventListener('hashchange', render);
  render();
}
