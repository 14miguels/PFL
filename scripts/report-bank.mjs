// Gera bank/REVIEW.md: relatório de revisão do banco (contagens, decisões, notas de transcrição, problemas das fontes).
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBank } from './build-bank.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { bank } = await buildBank();
const f = (n) => (n == null ? '—' : String(n).replace('.', ','));
const L = [];
L.push('# Relatório de revisão do banco de questões', '', '_Gerado por `npm run report` — não editar à mão._', '');
const th = bank.questions.filter((q) => q.type === 'theory'); const pr = bank.questions.filter((q) => q.type === 'practice');
const ex = bank.exams.reduce((s, e) => ({ t: s.t + (e.excluded?.prolog?.theory ?? 0), p: s.p + (e.excluded?.prolog?.practice ?? 0) }), { t: 0, p: 0 });
L.push(`**${bank.questions.length} questões de Haskell** (${th.length} teoria + ${pr.length} prática) em ${bank.exams.length} exames. **Prolog excluído por completo:** ${ex.t + ex.p} questões (${ex.t} teoria + ${ex.p} prática).`, '');
L.push('## Exames', '', '| Exame | Ficheiros | Teoria | Prática | Cotação (T / P / total) | Penalização | Prolog excluído |', '|---|---|---|---|---|---|---|');
for (const e of bank.exams) {
  const p = e.penalty;
  L.push(`| ${e.label} | ${e.files.join(', ')} | ${e.stats.theory} | ${e.stats.practice} | ${f(e.stats.theoryPoints)} / ${f(e.stats.practicePoints)} / ${f(e.stats.totalPoints)} | ${p.status}${p.fraction != null ? ` (${p.fraction * 100}%)` : ''} | ${e.excluded?.prolog ? `${e.excluded.prolog.theory + e.excluded.prolog.practice} (${e.excluded.prolog.where})` : '0'} |`);
}
L.push('', '## Estado das respostas de teoria', '', '| Estado | Nº | Significado |', '|---|---|---|');
const meaning = { official: 'o PDF mostra "Resposta correta"', confirmed: 'Moodle deu "Correta" (opção identificada) e/ou verificada por execução em GHC', unofficial: 'chave de origem não identificada', unknown: 'a fonte não revela a solução' };
for (const s of ['official', 'confirmed', 'unofficial', 'unknown']) L.push(`| ${s} | ${th.filter((q) => q.answer.status === s).length} | ${meaning[s]} |`);
L.push('', '## Notas e decisões por exame', '');
for (const e of bank.exams) { L.push(`### ${e.label}`, ''); e.notes.forEach((n) => L.push(`- ${n}`)); L.push(''); }
L.push('## Questões com avisos', '', '| Questão | Aviso |', '|---|---|');
for (const q of bank.questions.filter((x) => x.flags.length || x.notes.length)) L.push(`| ${q.id} (${q.source.file}, ${q.n}) | ${[...q.flags.map((x) => `**${x}**`), ...q.notes].join(' · ').replaceAll('|', '\\|')} |`);
L.push('', '## Testes das questões práticas', '', `Total: ${pr.reduce((s, q) => s + q.tests.length, 0)} testes — ${pr.reduce((s, q) => s + q.tests.filter((t) => t.origin === 'enunciado').length, 0)} retirados dos exemplos dos enunciados e ${pr.reduce((s, q) => s + q.tests.filter((t) => t.origin === 'gerado').length, 0)} **gerados** (não vêm do exame; a interface identifica-os).`, '');
L.push('## Verificações automáticas', '', '- `npm run validate`: soluções de referência passam em todos os testes e cumprem as restrições; respostas de teoria verificadas em GHC (avaliação, tipos inferidos, typecheck, equivalência).', '- `npm run check:transcription`: cada palavra/código transcrito existe no texto do PDF (para o recurso3, no OCR em `bank/ocr/`).', '- As soluções de referência são **todas geradas** (ou do documento sem autoria do recurso sem data); nenhuma é oficial.', '');
writeFileSync(path.join(root, 'bank', 'REVIEW.md'), L.join('\n'));
console.log('bank/REVIEW.md escrito');
