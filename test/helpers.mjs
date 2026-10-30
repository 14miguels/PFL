// Constrói sempre o banco de demonstração (em memória e num ficheiro temporário), para que os testes
// públicos não dependam de bank/questions.json nem de um banco privado que exista na máquina.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.PFL_BANK = 'demo';
const { buildBank } = await import('../scripts/build-bank.mjs');

const built = await buildBank();
if (built.errors.length) throw new Error(`banco de demonstração inválido:\n${built.errors.join('\n')}`);

export const bank = built.bank;
export const bankFile = path.join(mkdtempSync(path.join(tmpdir(), 'pfl-bank-')), 'questions.json');
writeFileSync(bankFile, JSON.stringify(bank));
export const byId = (id) => bank.questions.find((q) => q.id === id);
export const ctxOf = (q) => bank.contexts.find((c) => c.exam === q.exam && c.id === q.ctx) ?? null;
