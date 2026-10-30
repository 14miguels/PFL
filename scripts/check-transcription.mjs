// Verificação de fidelidade: cada token do enunciado/opções transcritos tem de existir no texto do PDF
// (texto extraído com pdftotext; para o recurso3, que é digitalizado, no OCR guardado em bank/ocr/).
// Os tokens em falta são listados para revisão manual (não é um erro automático: o OCR e o pdftotext têm ruído).
// Uso: node scripts/check-transcription.mjs [--only <prefixo>] [--verbose]
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBank } from './build-bank.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examsDir = path.join(root, '..');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const verbose = args.includes('--verbose');

const tokens = (s) => s.replaceAll('```haskell', '').toLowerCase().normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const cache = new Map();
function pdfTokens(file) {
  if (cache.has(file)) return cache.get(file);
  let text;
  const ocr = path.join(root, 'bank', 'ocr', file.replace('.pdf', '.ocr.txt'));
  const raw = execFileSync('pdftotext', [path.join(examsDir, file), '-'], { maxBuffer: 1e8 }).toString();
  text = raw.trim().length > 200 ? raw : (existsSync(ocr) ? readFileSync(ocr, 'utf8') : '');
  const set = new Set(tokens(text));
  cache.set(file, set);
  return set;
}

const { bank, sourcesOutsideRepo } = await buildBank();
if (!sourcesOutsideRepo) { console.log('Banco de demonstração: não há PDFs de origem para conferir (verificação só para bancos privados).'); process.exit(0); }
let total = 0; let withMiss = 0;
for (const q of bank.questions) {
  if (only && !q.id.startsWith(only)) continue;
  const ctx = bank.contexts.find((c) => c.exam === q.exam && c.id === q.ctx);
  const text = [q.statement, ...(q.options ?? []), q.preface ?? '', ctx?.text ?? '', ctx?.code ?? '', ctx?.note ?? ''].join('\n');
  const pdf = pdfTokens(q.source.file);
  const missing = [...new Set(tokens(text).filter((t) => !pdf.has(t)))];
  total++;
  if (missing.length) { withMiss++; console.log(`${q.id.padEnd(12)} ${missing.length} tokens em falta: ${missing.slice(0, 30).join(' ')}`); }
  else if (verbose) console.log(`${q.id.padEnd(12)} ok`);
}
console.log(`\n${total - withMiss}/${total} questões com 100% dos tokens encontrados no PDF`);
