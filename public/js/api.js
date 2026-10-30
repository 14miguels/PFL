// Cliente da API local.
async function call(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-PFL': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive: method !== 'GET' && JSON.stringify(body ?? '').length < 60000,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }
  if (!res.ok) throw new Error(data?.error ?? `${method} ${path} → ${res.status}`);
  return data;
}
export const api = {
  bank: () => call('GET', '/api/bank'),
  state: () => call('GET', '/api/state'),
  health: () => call('GET', '/api/health'),
  run: (questionId, code) => call('POST', '/api/run', { questionId, code }),
  reveal: (ids) => call('POST', '/api/reveal', { ids }),
  saveAttempt: (a) => call('PUT', `/api/attempts/${a.id}`, a),
  deleteAttempt: (id) => call('DELETE', `/api/attempts/${id}`),
  saveSettings: (s) => call('PUT', '/api/settings', s),
  loadWorkspace: (id) => call('GET', `/api/workspace/${id}`),
  saveWorkspace: (id, code) => call('PUT', `/api/workspace/${id}`, { code }),
};
