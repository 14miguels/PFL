import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, elapsedSec, resume, pause, heartbeat, finalize, attemptDuration, timeModeOf } from '../public/js/timer.js';

const T0 = Date.parse('2026-01-01T10:00:00Z');
const at = (sec) => T0 + sec * 1000;
const fresh = () => ({ startedAt: new Date(T0).toISOString(), limitSec: 5400 });

test('o tempo só conta com a tentativa aberta: guardar e sair pausa', () => {
  const a = fresh();
  resume(a, at(0));
  assert.equal(elapsedSec(a, at(60)), 60);
  pause(a, at(60));
  assert.equal(elapsedSec(a, at(2 * 86400)), 60, 'dois dias depois continua em 60 s');
  resume(a, at(2 * 86400));
  assert.equal(elapsedSec(a, at(2 * 86400 + 30)), 90);
});

test('regressão: reabrir um exame com 2 dias não esgota o tempo', () => {
  const a = { ...fresh(), startedAt: new Date(at(-2 * 86400)).toISOString(), status: 'in-progress' }; // tentativa antiga, sem campos do cronómetro
  migrate(a); resume(a, at(0));
  assert.ok(a.limitSec - elapsedSec(a, at(1)) > 5000, 'o tempo restante é praticamente o limite todo');
});

test('compatibilidade: tentativas antigas migram para o modo pausável com 0 s ativos', () => {
  const a = migrate(fresh());
  assert.deepEqual([a.activeSec, timeModeOf(a), a.resumedAt ?? null], [0, 'pausable', null]);
  assert.equal(migrate(migrate(a)).activeSec, 0, 'idempotente');
});

test('saída abrupta (separador fechado): só conta até ao último sinal de vida', () => {
  const a = fresh();
  resume(a, at(0)); heartbeat(a, at(100));
  // não houve pause(): o separador foi fechado aos 100 s e reaberto uma semana depois
  resume(a, at(7 * 86400));
  assert.equal(a.activeSec, 100);
  assert.equal(elapsedSec(a, at(7 * 86400 + 10)), 110);
});

test('modo contínuo (reservado): conta o tempo de parede e guardar e sair não pausa', () => {
  const a = { ...fresh(), timeMode: 'continuous' };
  resume(a, at(0)); pause(a, at(60));
  assert.equal(elapsedSec(a, at(600)), 600);
  assert.equal(finalize(a, at(600)), 600);
});

test('finalize fixa a duração e attemptDuration cai para a hora de parede nas tentativas antigas', () => {
  const a = fresh(); resume(a, at(0));
  assert.equal(finalize(a, at(125.4)), 125);
  assert.equal(a.resumedAt, null);
  assert.equal(attemptDuration(a), 125);
  assert.equal(attemptDuration({ startedAt: new Date(at(0)).toISOString(), finishedAt: new Date(at(300)).toISOString() }), 300);
  assert.equal(attemptDuration({}), null);
});
