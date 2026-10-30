import { r, C } from '../lib.mjs';

const exam = {
  id: 'mini-b',
  label: 'Mini-teste de demonstração B',
  short: 'Mini B',
  year: 'demo',
  season: 'Demonstração',
  date: null,
  kind: 'mini-teste',
  files: ['demo'],
  parts: { A: 'Parte 1 — teoria (escolha múltipla)', B: 'Parte 2 — prática (Haskell)' },
  totalPoints: 20,
  penalty: { fraction: null, status: 'unknown', note: 'Este mini-teste de demonstração não tem penalização.' },
  rules: ['Mini-teste fictício, escrito para demonstrar a aplicação.', 'Não podes importar módulos nem usar funções de bibliotecas, salvo indicação em contrário.', 'Podes usar o GHCi para testar o teu código.'],
  notes: ['Todas as questões deste mini-teste foram escritas de raiz para o projeto; não vêm de nenhum exame real.'],
};

const noLib = C.noImport('Não podes importar módulos nem usar funções de bibliotecas.');
const src = (n, page = 1) => ({ file: 'demo', question: n, page });
const BASIS = 'Verificada por execução em GHC (npm run validate).';

const contexts = [
  {
    id: 'tree',
    text: 'Considera as árvores binárias (não necessariamente de pesquisa):',
    code: r`data Tree a = Leaf | Node (Tree a) a (Tree a)
  deriving (Show, Eq)`,
    support: {},
  },
  {
    id: 'mat',
    text: 'Uma matriz é representada como uma lista de linhas:',
    code: r`type Matriz = [[Int]]`,
    note: 'Nota: nas matrizes desta pergunta o número de colunas é igual em todas as linhas e há pelo menos uma linha.',
    support: {},
  },
];

const questions = [
  // ------------------------------------------------------------ teoria
  {
    id: 'miniB-A01', n: 'Pergunta 1', type: 'theory', points: 0.5, source: src('Pergunta 1'), theme: 'adt', difficulty: 'facil',
    statement: 'Dado o tipo abaixo, qual das expressões é uma árvore com um só elemento?\n```haskell\ndata Arv = F | N Arv Int Arv\n```',
    options: ['N F 1 F', 'N 1 F', 'F 1', 'N F F 1'],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'typecheck', prelude: 'data Arv = F | N Arv Int Arv\nv :: Arv', template: 'v = $OPT' }],
  },
  {
    id: 'miniB-A02', n: 'Pergunta 2', type: 'theory', points: 0.5, source: src('Pergunta 2'), theme: 'iotc', difficulty: 'facil',
    statement: 'Qual o valor da expressão seguinte, no tipo `Maybe Int`?\n```haskell\ndo { x <- Just 3; y <- Nothing; return (x + y) }\n```',
    options: ['Nothing', 'Just 3', 'Just 0', 'Erro de tipos'],
    answer: { value: 'a', status: 'confirmed', basis: 'Verificada por execução em GHC: na mónada `Maybe`, um `Nothing` interrompe o resto do bloco `do`.' },
    verify: [{ kind: 'eval', expr: 'print ((do { x <- Just 3; y <- Nothing; return (x + y) }) :: Maybe Int)' }],
  },
  {
    id: 'miniB-A03', n: 'Pergunta 3', type: 'theory', points: 1, source: src('Pergunta 3'), theme: 'avaliacao', difficulty: 'media',
    statement: 'Qual o resultado de avaliar a seguinte expressão?\n```haskell\nlet (a, b) = span even [2,4,5,6] in (length a, b)\n```',
    options: ['(2,[5,6])', '(3,[5])', '(2,[6])', '(4,[])'],
    answer: { value: 'a', status: 'confirmed', basis: 'Verificada por execução em GHC: `span` pára no primeiro elemento que falha o predicado (o 5) e o 6 fica na segunda parte.' },
    verify: [{ kind: 'eval', expr: 'let (a, b) = span even [2,4,5,6] in (length a, b)' }],
  },
  {
    id: 'miniB-A04', n: 'Pergunta 4', type: 'theory', points: 1, source: src('Pergunta 4'), theme: 'tipos', difficulty: 'media',
    statement: 'Qual é o tipo mais geral da seguinte expressão?\n```haskell\n\\f -> f . f\n```',
    options: ['(a -> a) -> a -> a', '(a -> b) -> a -> b', '(a -> b) -> (b -> c) -> a -> c', '(a -> a) -> a'],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'inferred', expr: '(\\f -> f . f)', expect: '(a -> a) -> a -> a' }],
  },
  {
    id: 'miniB-A05', n: 'Pergunta 5', type: 'theory', points: 1, source: src('Pergunta 5'), theme: 'ordenacao', difficulty: 'media',
    statement: 'Qual o resultado de avaliar a expressão seguinte?\n```haskell\nimport Data.List (sortOn)\n\nsortOn snd (zip [1..] "bca")\n```',
    options: ["[(3,'a'),(1,'b'),(2,'c')]", "[(1,'b'),(2,'c'),(3,'a')]", "[(3,'a'),(2,'c'),(1,'b')]", "[('a',3),('b',1),('c',2)]"],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'eval', prelude: 'import Data.List (sortOn)', expr: 'sortOn snd (zip [1..] "bca")' }],
  },
  {
    id: 'miniB-A06', n: 'Pergunta 6', type: 'theory', points: 1, source: src('Pergunta 6'), theme: 'equiv', difficulty: 'dificil',
    statement: 'Qual das definições seguintes de `f` é **equivalente** à original, para qualquer lista de inteiros?\n```haskell\nf :: [Int] -> [(Int, Int)]\nf xs = [(x, y) | x <- xs, y <- xs, x < y]\n```',
    options: ['f xs = [(x, y) | y <- xs, x <- xs, x < y]', 'f xs = [(x, y) | x <- xs, y <- xs, y > x]', 'f xs = [(x, y) | x <- xs, y <- xs, x /= y]', 'f xs = zip xs (tail xs)'],
    answer: { value: 'b', status: 'confirmed', basis: 'Verificada por execução em GHC: a opção a percorre os geradores por ordem diferente e produz os pares noutra ordem (visível em [3,1,2]).' },
    verify: [{ kind: 'equiv', name: 'f', sig: 'f :: [Int] -> [(Int, Int)]', original: 'f xs = [(x, y) | x <- xs, y <- xs, x < y]', inputs: ['[]', '[1,2,3]', '[3,1,2]', '[2,2]', '[1]'] }],
  },

  // ------------------------------------------------------------ prática
  {
    id: 'miniB-B01', n: 'Pergunta 7', type: 'practice', points: 1.5, source: src('Pergunta 7', 2), theme: 'recursao', difficulty: 'facil',
    constraints: [noLib, C.recursion('Tens de usar recursão.')],
    statement: 'Escreve `power :: Int -> Int -> Int`, tal que `power x n` calcula `x` elevado a `n` (com `n >= 0`), por recursão e sem usar o operador `^`.\nExemplos:\n```haskell\npower 2 10 == 1024\npower 5 0  == 1\n```',
    func: 'power', signature: 'power :: Int -> Int -> Int',
    tests: [
      { call: 'power 2 10', expect: '1024', origin: 'enunciado' },
      { call: 'power 5 0', expect: '1', origin: 'enunciado' },
      { call: 'power 0 3', expect: '0', origin: 'gerado' },
      { call: 'power (-2) 3', expect: '-8', origin: 'gerado' },
      { call: 'power 3 1', expect: '3', origin: 'gerado' },
      { call: 'power 1 100', expect: '1', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`power :: Int -> Int -> Int
power _ 0 = 1
power x n = x * power x (n - 1)` }],
  },
  {
    id: 'miniB-B02', n: 'Pergunta 8', type: 'practice', points: 2, source: src('Pergunta 8', 2), ctx: 'tree', theme: 'arvores', difficulty: 'facil',
    constraints: [noLib],
    statement: 'Escreve `mirror :: Tree a -> Tree a`, que devolve a imagem de espelho de uma árvore: em todos os nós, a subárvore esquerda passa a direita e vice-versa.\nExemplo:\n```haskell\nmirror (Node (Node Leaf 1 Leaf) 2 Leaf) == Node Leaf 2 (Node Leaf 1 Leaf)\n```',
    func: 'mirror', signature: 'mirror :: Tree a -> Tree a',
    tests: [
      { call: 'mirror (Node (Node Leaf 1 Leaf) 2 Leaf)', expect: 'Node Leaf 2 (Node Leaf 1 Leaf)', origin: 'enunciado' },
      { call: 'mirror (Leaf :: Tree Int)', expect: 'Leaf', origin: 'gerado' },
      { call: 'mirror (Node Leaf 1 Leaf)', expect: 'Node Leaf 1 Leaf', origin: 'gerado' },
      { call: 'mirror (Node (Node Leaf 1 (Node Leaf 2 Leaf)) 3 (Node Leaf 4 Leaf))', expect: 'Node (Node Leaf 4 Leaf) 3 (Node (Node Leaf 2 Leaf) 1 Leaf)', origin: 'gerado' },
      { call: 'let t = Node (Node Leaf 1 Leaf) 2 (Node Leaf 3 Leaf) in mirror (mirror t) == t', expect: 'True', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`mirror :: Tree a -> Tree a
mirror Leaf = Leaf
mirror (Node l v r) = Node (mirror r) v (mirror l)` }],
  },
  {
    id: 'miniB-B03', n: 'Pergunta 9', type: 'practice', points: 2.5, source: src('Pergunta 9', 3), theme: 'ordenacao', difficulty: 'media',
    constraints: [noLib, C.comprehension('Tens de usar list comprehensions.')],
    statement: 'Escreve `qsort :: [Int] -> [Int]`, que ordena uma lista por ordem crescente com o **quicksort**: usa o primeiro elemento como pivô e list comprehensions para as duas partições. Os valores repetidos mantêm-se.\nExemplos:\n```haskell\nqsort [3,1,2]   == [1,2,3]\nqsort [2,2,1,2] == [1,2,2,2]\n```',
    func: 'qsort', signature: 'qsort :: [Int] -> [Int]',
    tests: [
      { call: 'qsort [3,1,2]', expect: '[1,2,3]', origin: 'enunciado' },
      { call: 'qsort [2,2,1,2]', expect: '[1,2,2,2]', origin: 'enunciado' },
      { call: 'qsort []', expect: '[]', origin: 'gerado' },
      { call: 'qsort [5]', expect: '[5]', origin: 'gerado' },
      { call: 'qsort [-3,5,0,-3]', expect: '[-3,-3,0,5]', origin: 'gerado' },
      { call: 'qsort [5,4,3,2,1]', expect: '[1,2,3,4,5]', origin: 'gerado' },
      { call: 'qsort [1,2,3,4,5]', expect: '[1,2,3,4,5]', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`qsort :: [Int] -> [Int]
qsort [] = []
qsort (p : xs) = qsort [x | x <- xs, x < p] ++ [p] ++ qsort [x | x <- xs, x >= p]` }],
  },
  {
    id: 'miniB-B04', n: 'Pergunta 10', type: 'practice', points: 2.5, source: src('Pergunta 10', 3), ctx: 'mat', theme: 'matrizes', difficulty: 'media',
    constraints: [noLib],
    statement: 'Escreve `isIdentity :: Matriz -> Bool`, que verifica se uma matriz quadrada é a matriz identidade (1 em todas as posições da diagonal principal e 0 em todas as outras).\nExemplos:\n```haskell\nisIdentity [[1,0],[0,1]] == True\nisIdentity [[1,1],[0,1]] == False\n```',
    func: 'isIdentity', signature: 'isIdentity :: Matriz -> Bool',
    tests: [
      { call: 'isIdentity [[1,0],[0,1]]', expect: 'True', origin: 'enunciado' },
      { call: 'isIdentity [[1,1],[0,1]]', expect: 'False', origin: 'enunciado' },
      { call: 'isIdentity [[1]]', expect: 'True', origin: 'gerado' },
      { call: 'isIdentity [[0]]', expect: 'False', origin: 'gerado' },
      { call: 'isIdentity [[1,0,0],[0,1,0],[0,0,1]]', expect: 'True', origin: 'gerado' },
      { call: 'isIdentity [[1,0],[0,2]]', expect: 'False', origin: 'gerado' },
      { call: 'isIdentity [[1,0],[1,1]]', expect: 'False', origin: 'gerado' },
      { call: 'isIdentity [[2,0],[0,2]]', expect: 'False', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`isIdentity :: Matriz -> Bool
isIdentity m = and [x == esperado i j | (i, linha) <- zip [0 ..] m, (j, x) <- zip [0 ..] linha]
  where
    esperado i j = if i == j then 1 else 0` }],
  },
  {
    id: 'miniB-B05', n: 'Pergunta 11', type: 'practice', points: 3, source: src('Pergunta 11', 4), theme: 'ordenacao', difficulty: 'dificil',
    constraints: [noLib, C.recursion('Tens de usar recursão.')],
    statement: 'Escreve `sortByKey :: Ord b => (a -> b) -> [a] -> [a]`, que ordena uma lista por ordem crescente da **chave** calculada por uma função. A ordenação tem de ser **estável**: elementos com a mesma chave mantêm a ordem relativa original.\nExemplos:\n```haskell\nsortByKey length ["bb","a","cc","d"] == ["a","d","bb","cc"]\nsortByKey negate [3,1,2]             == [3,2,1]\n```',
    func: 'sortByKey', signature: 'sortByKey :: Ord b => (a -> b) -> [a] -> [a]',
    tests: [
      { call: 'sortByKey length ["bb","a","cc","d"]', expect: '["a","d","bb","cc"]', origin: 'enunciado' },
      { call: 'sortByKey negate [3,1,2]', expect: '[3,2,1]', origin: 'enunciado' },
      { call: "sortByKey snd [(1,'b'),(2,'a'),(3,'b')]", expect: "[(2,'a'),(1,'b'),(3,'b')]", origin: 'gerado' },
      { call: 'sortByKey id ([] :: [Int])', expect: '[]', origin: 'gerado' },
      { call: 'sortByKey abs [-3,2,-1,1]', expect: '[-1,1,2,-3]', origin: 'gerado' },
      { call: 'sortByKey fst [(2,"x"),(1,"y"),(2,"z"),(1,"w")]', expect: '[(1,"y"),(1,"w"),(2,"x"),(2,"z")]', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`sortByKey :: Ord b => (a -> b) -> [a] -> [a]
sortByKey _ [] = []
sortByKey f (x : xs) = insere (sortByKey f xs)
  where
    insere [] = [x]
    insere (y : ys)
      | f x <= f y = x : y : ys
      | otherwise = y : insere ys` }],
  },
  {
    id: 'miniB-B06', n: 'Pergunta 12', type: 'practice', points: 3.5, source: src('Pergunta 12', 4), theme: 'io', difficulty: 'dificil',
    constraints: [noLib],
    statement: 'Escreve `pyramid :: Int -> IO ()`, que imprime uma pirâmide de asteriscos com `n` linhas: a linha `i` (a contar de 1) tem `2i - 1` asteriscos, precedidos de `n - i` espaços, e **não** tem espaços no fim. Para `n = 0` não imprime nada.\nExemplo:\n```haskell\nghci> pyramid 3\n  *\n ***\n*****\n```',
    func: 'pyramid', signature: 'pyramid :: Int -> IO ()',
    tests: [
      { io: 'pyramid 3', stdout: '  *\n ***\n*****\n', origin: 'enunciado' },
      { io: 'pyramid 1', stdout: '*\n', origin: 'gerado' },
      { io: 'pyramid 0', stdout: '', origin: 'gerado' },
      { io: 'pyramid 2', stdout: ' *\n***\n', origin: 'gerado' },
      { io: 'pyramid 4', stdout: '   *\n  ***\n *****\n*******\n', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`pyramid :: Int -> IO ()
pyramid n = mapM_ linha [1 .. n]
  where
    linha i = putStrLn (replicate (n - i) ' ' ++ replicate (2 * i - 1) '*')` }],
  },
];

export default { exam, contexts, questions };
