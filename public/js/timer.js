// Cronómetro de uma tentativa (módulo puro, sem DOM).
//
// Modo 'pausable' (por omissão): só conta o tempo em que a tentativa está aberta; "Guardar e sair" pausa.
// Modo 'continuous': tempo de parede desde `startedAt` (reservado para um futuro modo de prova real).
//
// Campos da tentativa (todos opcionais; tentativas antigas não os têm):
//   timeMode    'pausable' | 'continuous'
//   activeSec   segundos ativos acumulados (modo pausable)
//   resumedAt   ISO do início da sessão ativa atual, ou null se está em pausa
//   lastSeenAt  ISO do último "sinal de vida" da sessão ativa (para saídas abruptas: fechar o separador, falha de energia…)
//   durationSec duração final, fixada na entrega

export const DEFAULT_TIME_MODE = 'pausable';
const ms = (iso) => new Date(iso).getTime();

export const timeModeOf = (a) => a.timeMode ?? DEFAULT_TIME_MODE;

/**
 * Compatibilidade com tentativas criadas antes deste cronómetro: o tempo ativo anterior não é recuperável com
 * fiabilidade (só havia a hora de início), por isso o relógio recomeça em 0 em vez de entregar o exame sozinho.
 */
export function migrate(a) {
  if (a.activeSec == null) a.activeSec = 0;
  if (!a.timeMode) a.timeMode = DEFAULT_TIME_MODE;
  return a;
}

/** Segundos decorridos (ativos, ou de parede no modo contínuo) em `now`. */
export function elapsedSec(a, now = Date.now()) {
  if (timeModeOf(a) === 'continuous') return Math.max(0, (now - ms(a.startedAt)) / 1000);
  const running = a.resumedAt ? Math.max(0, now - ms(a.resumedAt)) / 1000 : 0;
  return (a.activeSec ?? 0) + running;
}

/** Abre uma sessão ativa. Se a anterior terminou abruptamente, só conta até ao último sinal de vida. */
export function resume(a, now = Date.now()) {
  migrate(a);
  if (a.resumedAt) pause(a, null);
  a.resumedAt = new Date(now).toISOString();
  a.lastSeenAt = a.resumedAt;
  return a;
}

/** Fecha a sessão ativa. `now = null` usa o último sinal de vida (saída abrupta). */
export function pause(a, now = Date.now()) {
  migrate(a);
  if (a.resumedAt) {
    const end = now == null ? ms(a.lastSeenAt ?? a.resumedAt) : now;
    a.activeSec += Math.max(0, end - ms(a.resumedAt)) / 1000;
  }
  a.resumedAt = null;
  a.lastSeenAt = null;
  return a;
}

/** Sinal de vida (chamado a cada tick). */
export function heartbeat(a, now = Date.now()) { if (a.resumedAt) a.lastSeenAt = new Date(now).toISOString(); }

/** Fixa a duração final (na entrega). */
export function finalize(a, now = Date.now()) {
  if (timeModeOf(a) !== 'continuous') pause(a, now);
  a.durationSec = Math.round(elapsedSec(a, now));
  return a.durationSec;
}

/** Duração de uma tentativa terminada (as antigas só têm a hora de parede). */
export function attemptDuration(a) {
  if (a.durationSec != null) return a.durationSec;
  return a.startedAt && a.finishedAt ? (ms(a.finishedAt) - ms(a.startedAt)) / 1000 : null;
}
