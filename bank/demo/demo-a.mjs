import { r, C } from '../lib.mjs';

const exam = {
  id: 'demo-a',
  label: 'Exame de demonstração A',
  short: 'Demo A',
  year: 'demo',
  season: 'Demonstração',
  date: null,
  kind: 'demo',
  files: ['demo'],
  parts: { A: 'Parte 1 — teoria (escolha múltipla)', B: 'Parte 2 — prática (Haskell)' },
  totalPoints: 11,
  penalty: { fraction: 0.25, status: 'stated', note: 'Penalização fictícia, só para demonstrar a funcionalidade: uma resposta errada desconta 25% da cotação.' },
  rules: [
    'Exame fictício, escrito para demonstrar a aplicação.',
    'Não podes importar módulos nem usar funções de bibliotecas, salvo indicação em contrário.',
    'Podes usar o GHCi para testar o teu código.',
  ],
  notes: ['Todas as questões deste exame foram escritas de raiz para o projeto; não vêm de nenhum exame real.'],
};

const noLib = C.noImport('Não podes importar módulos nem usar funções de bibliotecas.');
const src = (n, page = 1) => ({ file: 'demo', question: n, page });
const BASIS = 'Verificada por execução em GHC (npm run validate).';

const contexts = [
  {
    id: 'bst',
    text: 'Considera as árvores binárias de pesquisa (sem valores repetidos) de inteiros:',
    code: r`data BST = Empty | Node BST Int BST
  deriving (Show, Eq)`,
    note: 'Nota: podes assumir que a função `insertBST` da pergunta anterior está disponível, mesmo que não a tenhas implementado.',
    support: {
      insertBST: { origin: 'gerada (função de questão anterior, que o enunciado permite assumir)', code: r`insertBST :: Int -> BST -> BST
insertBST x Empty = Node Empty x Empty
insertBST x t@(Node l v r)
  | x < v = Node (insertBST x l) v r
  | x > v = Node l v (insertBST x r)
  | otherwise = t` },
    },
  },
];

const questions = [
  // ------------------------------------------------------------ teoria
  {
    id: 'demoA-A01', n: 'Pergunta 1', type: 'theory', points: 0.5, source: src('Pergunta 1'), theme: 'avaliacao', difficulty: 'facil',
    statement: 'Qual o resultado de avaliar a seguinte expressão?\n```haskell\nmap (*2) [1,2,3]\n```',
    options: ['[1,2,3,1,2,3]', '[2,4,6]', '[3,4,5]', '[2,3,4]'],
    answer: { value: 'b', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'eval', expr: 'map (*2) [1,2,3]' }],
  },
  {
    id: 'demoA-A02', n: 'Pergunta 2', type: 'theory', points: 0.5, source: src('Pergunta 2'), theme: 'avaliacao', difficulty: 'facil',
    statement: 'Qual o resultado de avaliar a seguinte expressão?\n```haskell\nzip "ab" [1..]\n```',
    options: ["[('a',1),('b',2)]", "[('a',1),('b',1)]", "[(1,'a'),(2,'b')]", 'Erro: a lista infinita não termina'],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'eval', expr: 'zip "ab" [1..]' }],
  },
  {
    id: 'demoA-A03', n: 'Pergunta 3', type: 'theory', points: 0.5, source: src('Pergunta 3'), theme: 'lazy', difficulty: 'media',
    statement: 'Qual o resultado de avaliar a seguinte expressão?\n```haskell\ntake 3 (cycle [1,2])\n```',
    options: ['[1,2]', '[1,2,1]', '[1,2,2]', 'A avaliação não termina'],
    answer: { value: 'b', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'eval', expr: 'take 3 (cycle [1,2])' }],
  },
  {
    id: 'demoA-A04', n: 'Pergunta 4', type: 'theory', points: 0.5, source: src('Pergunta 4'), theme: 'tipos', difficulty: 'media',
    statement: 'Qual o tipo mais geral da seguinte função?\n```haskell\nf xs = null (tail xs)\n```',
    options: ['[a] -> Bool', '[Bool] -> Bool', 'a -> Bool', 'Eq a => [a] -> Bool'],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'inferred', prelude: 'f xs = null (tail xs)', name: 'f', expect: '[a] -> Bool' }],
  },
  {
    id: 'demoA-A05', n: 'Pergunta 5', type: 'theory', points: 0.5, source: src('Pergunta 5'), theme: 'tipos', difficulty: 'facil',
    statement: 'Qual das seguintes expressões tem o tipo `[Int]`?',
    options: ['[1, 2, 3]', '"abc"', '(1, 2)', 'Just [1]'],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'typecheck', prelude: 'v :: [Int]', template: 'v = $OPT' }],
  },
  {
    id: 'demoA-A06', n: 'Pergunta 6', type: 'theory', points: 0.5, source: src('Pergunta 6'), theme: 'recursao', difficulty: 'facil',
    statement: 'Numa função recursiva sobre listas, qual é o caso de paragem mais comum?',
    options: ['A lista vazia, `[]`', 'A lista com um só elemento apenas', 'O primeiro elemento da lista', 'Não é necessário caso de paragem'],
    answer: { value: 'a', status: 'unofficial', basis: 'Chave escrita pelo autor do projeto; sem verificação automática (serve de indicação e não conta para a nota).' },
  },

  // ------------------------------------------------------------ prática
  {
    id: 'demoA-B01', n: 'Pergunta 7', type: 'practice', points: 1, source: src('Pergunta 7', 2), theme: 'recursao', difficulty: 'facil',
    constraints: [noLib],
    statement: 'Escreve uma definição da função `sumSquares :: [Int] -> Int` que calcula a soma dos quadrados dos elementos de uma lista.\nExemplos:\n```haskell\nsumSquares [1,2,3] == 14\nsumSquares []      == 0\n```',
    func: 'sumSquares', signature: 'sumSquares :: [Int] -> Int',
    tests: [
      { call: 'sumSquares [1,2,3]', expect: '14', origin: 'enunciado' },
      { call: 'sumSquares []', expect: '0', origin: 'enunciado' },
      { call: 'sumSquares [-2]', expect: '4', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`sumSquares :: [Int] -> Int
sumSquares [] = 0
sumSquares (x:xs) = x * x + sumSquares xs` }],
  },
  {
    id: 'demoA-B02', n: 'Pergunta 8', type: 'practice', points: 1, source: src('Pergunta 8', 2), theme: 'recursao', difficulty: 'facil',
    constraints: [noLib],
    statement: 'Escreve uma definição da função `countVowels :: String -> Int` que conta as vogais minúsculas (a, e, i, o, u) de uma string.\nExemplos:\n```haskell\ncountVowels "banana" == 3\ncountVowels "xyz"    == 0\n```',
    func: 'countVowels', signature: 'countVowels :: String -> Int',
    tests: [
      { call: 'countVowels "banana"', expect: '3', origin: 'enunciado' },
      { call: 'countVowels "xyz"', expect: '0', origin: 'enunciado' },
      { call: 'countVowels ""', expect: '0', origin: 'gerado' },
      { call: 'countVowels "aeiou"', expect: '5', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`countVowels :: String -> Int
countVowels [] = 0
countVowels (c:cs)
  | c §elem§ "aeiou" = 1 + countVowels cs
  | otherwise = countVowels cs` }],
  },
  {
    id: 'demoA-B03', n: 'Pergunta 9', type: 'practice', points: 1, source: src('Pergunta 9', 2), theme: 'tecnicas', difficulty: 'facil',
    constraints: [noLib, C.comprehension('Tens de usar uma list comprehension.')],
    statement: 'Usando uma list comprehension, escreve `evensDoubled :: [Int] -> [Int]`, que devolve o dobro dos elementos pares de uma lista, pela mesma ordem.\nExemplos:\n```haskell\nevensDoubled [1,2,3,4] == [4,8]\nevensDoubled [1,3]     == []\n```',
    func: 'evensDoubled', signature: 'evensDoubled :: [Int] -> [Int]',
    tests: [
      { call: 'evensDoubled [1,2,3,4]', expect: '[4,8]', origin: 'enunciado' },
      { call: 'evensDoubled [1,3]', expect: '[]', origin: 'enunciado' },
      { call: 'evensDoubled []', expect: '[]', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`evensDoubled :: [Int] -> [Int]
evensDoubled xs = [2 * x | x <- xs, even x]`, skipConstraints: false }],
  },
  {
    id: 'demoA-B04', n: 'Pergunta 10', type: 'practice', points: 1.5, source: src('Pergunta 10', 3), theme: 'recursao', difficulty: 'media',
    constraints: [noLib, C.noHof('Não podes usar funções de ordem superior.')],
    statement: 'Escreve `rle :: String -> [(Char, Int)]`, que comprime uma string agrupando caracteres iguais consecutivos (run-length encoding).\nExemplos:\n```haskell\nrle "aaabcc" == [(\'a\',3),(\'b\',1),(\'c\',2)]\nrle ""       == []\n```',
    func: 'rle', signature: 'rle :: String -> [(Char, Int)]',
    tests: [
      { call: 'rle "aaabcc"', expect: "[('a',3),('b',1),('c',2)]", origin: 'enunciado' },
      { call: 'rle ""', expect: '[]', origin: 'enunciado' },
      { call: 'rle "abc"', expect: "[('a',1),('b',1),('c',1)]", origin: 'gerado' },
      { call: 'rle "aabaa"', expect: "[('a',2),('b',1),('a',2)]", origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`rle :: String -> [(Char, Int)]
rle [] = []
rle (c:cs) = go c 1 cs
  where
    go x n [] = [(x, n)]
    go x n (y:ys)
      | y == x = go x (n + 1) ys
      | otherwise = (x, n) : go y 1 ys` }],
  },
  {
    id: 'demoA-B05', n: 'Pergunta 11', type: 'practice', points: 1.5, source: src('Pergunta 11', 3), ctx: 'bst', theme: 'arvores', difficulty: 'media',
    constraints: [noLib],
    statement: 'Escreve `insertBST :: Int -> BST -> BST`, que insere um valor numa árvore binária de pesquisa. Se o valor já existir, a árvore não muda.\nExemplos:\n```haskell\ninsertBST 2 Empty                    == Node Empty 2 Empty\ninsertBST 1 (Node Empty 2 Empty)     == Node (Node Empty 1 Empty) 2 Empty\n```',
    func: 'insertBST', signature: 'insertBST :: Int -> BST -> BST',
    tests: [
      { call: 'insertBST 2 Empty', expect: 'Node Empty 2 Empty', origin: 'enunciado' },
      { call: 'insertBST 1 (Node Empty 2 Empty)', expect: 'Node (Node Empty 1 Empty) 2 Empty', origin: 'enunciado' },
      { call: 'insertBST 3 (Node Empty 2 Empty)', expect: 'Node Empty 2 (Node Empty 3 Empty)', origin: 'gerado' },
      { call: 'insertBST 2 (Node Empty 2 Empty)', expect: 'Node Empty 2 Empty', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`insertBST :: Int -> BST -> BST
insertBST x Empty = Node Empty x Empty
insertBST x t@(Node l v r)
  | x < v = Node (insertBST x l) v r
  | x > v = Node l v (insertBST x r)
  | otherwise = t` }],
  },
  {
    id: 'demoA-B06', n: 'Pergunta 12', type: 'practice', points: 2, source: src('Pergunta 12', 4), ctx: 'bst', needs: ['insertBST'], theme: 'arvores', difficulty: 'dificil',
    constraints: [noLib, C.recursion('Tens de usar recursão.')],
    statement: 'Escreve `inorder :: BST -> [Int]`, que devolve os valores da árvore em ordem crescente (percurso em-ordem). Podes usar a função `insertBST` da pergunta anterior.\nExemplo:\n```haskell\ninorder (insertBST 2 (insertBST 1 (insertBST 3 Empty))) == [1,2,3]\n```',
    func: 'inorder', signature: 'inorder :: BST -> [Int]',
    tests: [
      { call: 'inorder (insertBST 2 (insertBST 1 (insertBST 3 Empty)))', expect: '[1,2,3]', origin: 'enunciado' },
      { call: 'inorder Empty', expect: '[]', origin: 'gerado' },
      { call: 'inorder (insertBST 5 (insertBST 9 (insertBST 1 (insertBST 7 Empty))))', expect: '[1,5,7,9]', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`inorder :: BST -> [Int]
inorder Empty = []
inorder (Node l v r) = inorder l ++ [v] ++ inorder r` }],
  },
];

export default { exam, contexts, questions };
