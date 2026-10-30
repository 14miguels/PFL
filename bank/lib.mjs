// Tag para texto "cru": preserva barras invertidas e permite § como acento grave (`) do Haskell.
export const r = (s) => s.raw[0].replaceAll('\\`', '`').replaceAll('§', '`');

export const THEMES = {
  tipos: 'Tipos e inferência',
  avaliacao: 'Avaliação de expressões',
  lazy: 'Laziness e listas infinitas',
  equiv: 'Equivalência de definições',
  adt: 'Tipos algébricos (type/data)',
  iotc: 'IO, mónadas e typeclasses',
  recursao: 'Recursão sobre listas, strings e números',
  tecnicas: 'Comprehensions e HOF (técnica imposta)',
  arvores: 'Árvores e ADTs recursivos',
  modelacao: 'Modelação com tuplos e listas',
  matrizes: 'Matrizes e vetores',
  grafos: 'Grafos',
  ordenacao: 'Ordenação e merge',
  io: 'Input/Output',
};

export const DIFFICULTIES = ['facil', 'media', 'dificil']; // etiqueta editorial, não consta nas fontes

// Restrições técnicas reutilizáveis (verificação heurística no servidor).
export const HOF_IDENTS = ['map', 'filter', 'foldr', 'foldl', "foldl'", 'foldr1', 'foldl1', 'scanl', 'scanr', 'scanl1', 'scanr1',
  'zipWith', 'zipWith3', 'any', 'all', 'takeWhile', 'dropWhile', 'span', 'break', 'iterate', 'concatMap', 'until', 'mapM_', 'mapM'];
export const FOLD_IDENTS = ['foldr', 'foldl', "foldl'", 'foldr1', 'foldl1', 'scanl', 'scanr', 'scanl1', 'scanr1'];

export const C = {
  noImport: (text) => ({ kind: 'no-import', severity: 'hard', text }),
  recursion: (text, severity = 'hard') => ({ kind: 'require-recursion', severity, text }),
  noRecursion: (text, severity = 'hard') => ({ kind: 'no-recursion', severity, text }),
  noComprehension: (text, severity = 'hard') => ({ kind: 'no-comprehension', severity, text }),
  comprehension: (text, severity = 'hard') => ({ kind: 'require-comprehension', severity, text }),
  noHof: (text, severity = 'hard') => ({ kind: 'forbid-idents', idents: HOF_IDENTS, severity, text }),
  hof: (text, severity = 'hard') => ({ kind: 'require-any-ident', idents: HOF_IDENTS, severity, text }),
  forbid: (idents, text, severity = 'hard') => ({ kind: 'forbid-idents', idents, severity, text }),
  require: (idents, text, severity = 'hard') => ({ kind: 'require-idents', idents, severity, text }),
};
