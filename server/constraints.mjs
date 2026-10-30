// Verificação heurística das restrições técnicas dos exercícios (recursão, comprehensions, HOF, imports…).
// É deliberadamente simples: analisa o texto, não a árvore sintática.

/** Remove comentários, strings e literais de carácter, preservando linhas/colunas. */
export function stripCode(src) {
  let out = '';
  let i = 0;
  let depth = 0; // comentários de bloco aninhados
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (depth > 0) {
      if (c === '{' && n === '-') { depth++; out += '  '; i += 2; } else if (c === '-' && n === '}') { depth--; out += '  '; i += 2; } else { out += c === '\n' ? '\n' : ' '; i++; }
    } else if (c === '{' && n === '-') { depth = 1; out += '  '; i += 2; }
    else if (c === '-' && n === '-' && !/[!#$%&*+./<=>?@\\^|~:-]/.test(src[i + 2] ?? ' ') && !/[!#$%&*+./<=>?@\\^|~:]/.test(src[i - 1] ?? ' ')) {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
    } else if (c === '"') {
      out += '"'; i++;
      while (i < src.length && src[i] !== '"' && src[i] !== '\n') { if (src[i] === '\\') { out += ' '; i++; } out += ' '; i++; }
      if (src[i] === '"') { out += '"'; i++; }
    } else if (c === "'" && /[\s(,\[=]/.test(src[i - 1] ?? ' ') && (src[i + 1] === '\\' ? src[i + 3] === "'" || src[i + 4] === "'" : src[i + 2] === "'")) {
      // literal de carácter: 'a', '\n'
      const end = src[i + 1] === '\\' ? src.indexOf("'", i + 3) : i + 2;
      out += ' '.repeat(end - i + 1); i = end + 1;
    } else { out += c; i++; }
  }
  return out;
}

const KEYWORDS = new Set(['where', 'let', 'in', 'if', 'then', 'else', 'case', 'of', 'do', 'data', 'type', 'newtype', 'class', 'instance', 'import', 'module', 'deriving', 'infixl', 'infixr', 'infix']);
const identRe = /[A-Za-z_][A-Za-z0-9_']*/g;

export function identifiers(code) { return code.match(identRe) ?? []; }
export function importsOf(code) {
  return [...code.matchAll(/^import\s+(?:qualified\s+)?([A-Z][\w.]*)/gm)].map((m) => m[1]);
}

/** Nomes de funções (top-level ou locais) cuja definição se refere a si própria. */
export function recursiveDefs(code) {
  const lines = code.split('\n');
  const indentOf = (l) => l.match(/^\s*/)[0].length;
  const defs = {}; // nome -> texto dos corpos
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.trim()) continue;
    let ind = indentOf(line);
    let rest = line.slice(ind);
    // prefixos "where " / "let "
    let m;
    while ((m = rest.match(/^(where|let)\s+/))) { ind += m[0].length; rest = rest.slice(m[0].length); }
    const head = rest.match(/^([a-z_][A-Za-z0-9_']*)\b(.*)$/);
    if (!head || KEYWORDS.has(head[1])) continue;
    if (/^\s*(::|,)/.test(head[2]) || /^\s*[A-Za-z0-9_', ]*::/.test(head[2])) continue; // assinatura
    if (!/(=|\|)/.test(head[2]) && !(lines[i + 1] ?? '').trim().startsWith('|')) continue;
    // corpo: esta linha + linhas seguintes mais indentadas
    const baseIndent = indentOf(line);
    let body = head[2];
    let j = i + 1;
    while (j < lines.length && (!lines[j].trim() || indentOf(lines[j]) > baseIndent)) { body += '\n' + lines[j]; j++; }
    (defs[head[1]] ??= []).push(body);
  }
  const rec = [];
  for (const [name, bodies] of Object.entries(defs)) {
    const re = new RegExp(`(^|[^A-Za-z0-9_'])${name.replace(/[$]/g, '\\$')}(?![A-Za-z0-9_'])`);
    if (bodies.some((b) => re.test(b))) rec.push(name);
  }
  return rec;
}

/** Há alguma list comprehension? (barra simples diretamente dentro de [ ... ]) */
export function hasComprehension(code) {
  const stack = [];
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if ('([{'.includes(c)) stack.push(c);
    else if (')]}'.includes(c)) stack.pop();
    else if (c === '|' && stack[stack.length - 1] === '[' && code[i + 1] !== '|' && code[i - 1] !== '|') return true;
  }
  return false;
}

export function checkConstraints(src, constraints = []) {
  const code = stripCode(src);
  const ids = new Set(identifiers(code));
  const imports = importsOf(code);
  const recs = recursiveDefs(code);
  const comp = hasComprehension(code);
  return constraints.map((c) => {
    let ok = true;
    let detail = '';
    switch (c.kind) {
      case 'no-import': ok = imports.length === 0; detail = ok ? '' : `imports: ${imports.join(', ')}`; break;
      case 'forbid-imports': { const bad = imports.filter((m) => c.modules.includes(m)); ok = bad.length === 0; detail = bad.join(', '); break; }
      case 'require-recursion': ok = recs.length > 0; detail = ok ? '' : 'não foi detetada nenhuma definição recursiva'; break;
      case 'no-recursion': ok = recs.length === 0; detail = ok ? '' : `recursão em: ${recs.join(', ')}`; break;
      case 'no-comprehension': ok = !comp; detail = ok ? '' : 'list comprehension detetada'; break;
      case 'require-comprehension': ok = comp; detail = ok ? '' : 'não foi detetada nenhuma list comprehension'; break;
      case 'forbid-idents': { const bad = c.idents.filter((x) => ids.has(x)); ok = bad.length === 0; detail = bad.join(', '); break; }
      case 'require-idents': { const miss = c.idents.filter((x) => !ids.has(x)); ok = miss.length === 0; detail = miss.length ? `falta: ${miss.join(', ')}` : ''; break; }
      case 'require-any-ident': ok = c.idents.some((x) => ids.has(x)); detail = ok ? '' : 'nenhuma função de ordem superior detetada'; break;
      default: ok = true;
    }
    return { kind: c.kind, severity: c.severity, text: c.text, ok, detail };
  });
}
