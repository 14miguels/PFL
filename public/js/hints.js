// Ajuda para erros de compilação do GHC: localizações no código do estudante e dicas para os erros mais comuns.
// Módulo puro (sem DOM). Os números de linha de "solucao.hs" coincidem com os do editor (o servidor mantém
// as linhas de import em branco em vez de as remover).

const Q = "[‘'`]"; const Qe = "[’']"; // aspas tipográficas (locale UTF-8) ou ASCII

/** Linhas (e colunas) de `solucao.hs` mencionadas na mensagem, sem repetidos e pela ordem em que aparecem. */
export function ghcLocations(text = '') {
  const seen = new Set(); const out = [];
  for (const m of text.matchAll(/^solucao\.hs:(\d+):(\d+)/gm)) {
    const line = Number(m[1]);
    if (!seen.has(line)) { seen.add(line); out.push({ line, col: Number(m[2]) }); }
  }
  return out;
}

/** Intervalo [start, end) de caracteres da linha `line` (1-based) em `code`; null se não existir. */
export function lineRange(code, line) {
  const lines = code.split('\n');
  if (line < 1 || line > lines.length) return null;
  const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
  return [start, start + lines[line - 1].length];
}

const RULES = [
  [new RegExp(`Ambiguous occurrence ${Q}([^’'\`\\n]+)${Qe}[\\s\\S]*?(?:Provided|Support)`), (m) => `"${m[1]}" já está definido no código fornecido pelo enunciado. Não voltes a declarar tipos nem funções que o enunciado fornece.`],
  [new RegExp(`Ambiguous occurrence ${Q}([^’'\`\\n]+)${Qe}`), (m) => `"${m[1]}" já existe (por exemplo no Prelude). Escolhe outro nome para a tua função.`],
  [new RegExp(`parse error on input ${Q}module${Qe}`), () => 'Remove a linha "module … where": o teu código é inserido num módulo pelos testes.'],
  [new RegExp(`Multiple declarations of ${Q}main${Qe}`), () => 'Não definas "main": os testes já têm a sua.'],
  [/Variable not in scope: ([A-Za-z_][\w']*)/, (m) => `"${m[1]}" não está definido. Confirma o nome (maiúsculas e minúsculas contam), se falta um import permitido, ou se é uma função de outra pergunta (só está disponível quando o enunciado o permite).`],
  [/Data constructor not in scope: ([A-Z][\w']*)/, (m) => `O construtor "${m[1]}" não existe. Confirma o nome e os tipos do enunciado.`],
  [/Not in scope: type constructor or class .?([A-Z][\w']*)/, (m) => `O tipo "${m[1]}" não existe. Confirma o nome e os tipos do enunciado.`],
  [new RegExp(`The (?:type )?signature for ${Q}([^’'\`\\n]+)${Qe} lacks an accompanying binding`), (m) => `A assinatura de "${m[1]}" não tem definição: o nome na assinatura tem de ser igual ao da função.`],
  [/parse error \(possibly incorrect indentation or mismatched brackets\)/, () => 'Verifica a indentação e se todos os parênteses e retos estão fechados.'],
  [/Couldn't match (?:expected )?type/, () => 'Os tipos não coincidem: compara com a assinatura pedida e com os tipos dos argumentos.'],
  [/Erro de sintaxe no fim da tua solução/, () => 'A última definição parece incompleta (falta uma expressão depois de "=" ou de um operador).'],
];

/** Dicas (texto simples) para os erros mais comuns; vazio se nenhuma regra se aplicar. */
export function hintsFor(text = '') {
  const out = [];
  for (const [re, make] of RULES) {
    const m = text.match(re);
    if (m) { const t = make(m); if (!out.includes(t)) out.push(t); }
  }
  // "ambiguous" genérico só se a variante com o código fornecido não tiver acertado
  if (out.some((t) => t.includes('código fornecido'))) return out.filter((t) => !t.includes('já existe (por exemplo no Prelude)'));
  return out;
}
