import { r, C } from '../lib.mjs';

const exam = {
  id: 'mini-a',
  label: 'Mini-teste de demonstração A',
  short: 'Mini A',
  year: 'demo',
  season: 'Demonstração',
  date: null,
  kind: 'mini-teste',
  files: ['demo'],
  parts: { A: 'Parte 1 — teoria (escolha múltipla)', B: 'Parte 2 — prática (Haskell)' },
  totalPoints: 20,
  penalty: { fraction: 0.25, status: 'stated', note: 'Penalização fictícia, só para demonstrar a funcionalidade: uma resposta errada desconta 25% da cotação.' },
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
    note: 'Uma folha (`Leaf`) tem altura 0.',
    support: {},
  },
];

const questions = [
  // ------------------------------------------------------------ teoria
  {
    id: 'miniA-A01', n: 'Pergunta 1', type: 'theory', points: 1, source: src('Pergunta 1'), theme: 'tipos', difficulty: 'facil',
    statement: 'Qual é o tipo mais geral da expressão `map fst`?',
    options: ['[(a, b)] -> [a]', '[a] -> [b]', '(a, b) -> a', '[a] -> a'],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'inferred', expr: 'map fst', expect: '[(a, b)] -> [a]' }],
  },
  {
    id: 'miniA-A02', n: 'Pergunta 2', type: 'theory', points: 1, source: src('Pergunta 2'), theme: 'avaliacao', difficulty: 'facil',
    statement: 'Qual o resultado de avaliar a seguinte expressão?\n```haskell\n[x | x <- [1..10], even x, x > 4]\n```',
    options: ['[2,4,6,8,10]', '[5,6,7,8,9,10]', '[6,8,10]', '[4,6,8,10]'],
    answer: { value: 'c', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'eval', expr: '[x | x <- [1..10], even x, x > 4]' }],
  },
  {
    id: 'miniA-A03', n: 'Pergunta 3', type: 'theory', points: 1, source: src('Pergunta 3'), theme: 'adt', difficulty: 'facil',
    statement: 'Dado o tipo abaixo, qual das expressões tem o tipo `Forma`?\n```haskell\ndata Forma = Circulo Double | Retangulo Double Double\n```',
    options: ['Retangulo 2', 'Circulo 1 2', 'Retangulo 2 3', 'Circulo "1"'],
    answer: { value: 'c', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'typecheck', prelude: 'data Forma = Circulo Double | Retangulo Double Double\nv :: Forma', template: 'v = $OPT' }],
  },
  {
    id: 'miniA-A04', n: 'Pergunta 4', type: 'theory', points: 1, source: src('Pergunta 4'), theme: 'iotc', difficulty: 'media',
    statement: 'O que é escrito no ecrã por esta ação?\n```haskell\nsequence_ [putStr "a", putStr "b"]\n```',
    options: ['ab', 'ba', '["a","b"]', '()'],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'eval', expr: 'sequence_ [putStr "a", putStr "b"]' }],
  },
  {
    id: 'miniA-A05', n: 'Pergunta 5', type: 'theory', points: 1, source: src('Pergunta 5'), theme: 'lazy', difficulty: 'dificil',
    statement: 'Qual o resultado de avaliar a seguinte expressão?\n```haskell\ntakeWhile (< 40) (scanl (+) 0 [1 ..])\n```',
    options: ['[0,1,3,6,10,15,21,28,36]', '[1,3,6,10,15,21,28,36]', '[0,1,3,6,10,15,21,28,36,45]', 'A avaliação não termina'],
    answer: { value: 'a', status: 'confirmed', basis: 'Verificada por execução em GHC: a lista infinita é preguiçosa e o `takeWhile` pára no primeiro valor ≥ 40 (o 45 já não entra).' },
    verify: [{ kind: 'eval', expr: 'takeWhile (< 40) (scanl (+) 0 [1 ..])' }],
  },

  // ------------------------------------------------------------ prática
  {
    id: 'miniA-B01', n: 'Pergunta 6', type: 'practice', points: 1, source: src('Pergunta 6', 2), theme: 'recursao', difficulty: 'facil',
    constraints: [noLib, C.recursion('Tens de usar recursão.')],
    statement: 'Escreve `digitSum :: Int -> Int`, que calcula a soma dos algarismos de um número não negativo.\nExemplos:\n```haskell\ndigitSum 123 == 6\ndigitSum 0   == 0\n```',
    func: 'digitSum', signature: 'digitSum :: Int -> Int',
    tests: [
      { call: 'digitSum 123', expect: '6', origin: 'enunciado' },
      { call: 'digitSum 0', expect: '0', origin: 'enunciado' },
      { call: 'digitSum 7', expect: '7', origin: 'gerado' },
      { call: 'digitSum 1000', expect: '1', origin: 'gerado' },
      { call: 'digitSum 99999', expect: '45', origin: 'gerado' },
      { call: 'digitSum 90', expect: '9', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`digitSum :: Int -> Int
digitSum n
  | n < 10 = n
  | otherwise = n §mod§ 10 + digitSum (n §div§ 10)` }],
  },
  {
    id: 'miniA-B02', n: 'Pergunta 7', type: 'practice', points: 1.5, source: src('Pergunta 7', 2), ctx: 'tree', theme: 'arvores', difficulty: 'facil',
    constraints: [noLib],
    statement: 'Escreve `height :: Tree a -> Int`, que calcula a altura de uma árvore: a de `Leaf` é 0 e a de um nó é 1 mais a maior das alturas das subárvores.\nExemplos:\n```haskell\nheight Leaf                         == 0\nheight (Node Leaf \'a\' Leaf)          == 1\nheight (Node (Node Leaf 1 Leaf) 2 Leaf) == 2\n```',
    func: 'height', signature: 'height :: Tree a -> Int',
    tests: [
      { call: 'height Leaf', expect: '0', origin: 'enunciado' },
      { call: "height (Node Leaf 'a' Leaf)", expect: '1', origin: 'enunciado' },
      { call: 'height (Node (Node Leaf 1 Leaf) 2 Leaf)', expect: '2', origin: 'enunciado' },
      { call: "height (Node (Node (Node Leaf 'a' Leaf) 'b' Leaf) 'c' Leaf)", expect: '3', origin: 'gerado' },
      { call: 'height (Node (Node Leaf 1 Leaf) 2 (Node (Node Leaf 3 Leaf) 4 Leaf))', expect: '3', origin: 'gerado' },
      { call: 'height (Node Leaf 1 (Node Leaf 2 (Node Leaf 3 Leaf)))', expect: '3', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`height :: Tree a -> Int
height Leaf = 0
height (Node l _ r) = 1 + max (height l) (height r)` }],
  },
  {
    id: 'miniA-B03', n: 'Pergunta 8', type: 'practice', points: 2, source: src('Pergunta 8', 3), theme: 'recursao', difficulty: 'facil',
    constraints: [noLib],
    statement: 'A sequência de Collatz de `n` obtém-se repetindo: se `n` é par, divide-se por 2; se é ímpar, calcula-se `3n + 1`; termina em 1. Escreve `collatz :: Int -> Int`, que devolve o número de passos até chegar a 1 (para `n >= 1`).\nExemplos:\n```haskell\ncollatz 1 == 0\ncollatz 6 == 8   -- 6, 3, 10, 5, 16, 8, 4, 2, 1\n```',
    func: 'collatz', signature: 'collatz :: Int -> Int',
    tests: [
      { call: 'collatz 1', expect: '0', origin: 'enunciado' },
      { call: 'collatz 6', expect: '8', origin: 'enunciado' },
      { call: 'collatz 2', expect: '1', origin: 'gerado' },
      { call: 'collatz 16', expect: '4', origin: 'gerado' },
      { call: 'collatz 7', expect: '16', origin: 'gerado' },
      { call: 'collatz 27', expect: '111', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`collatz :: Int -> Int
collatz 1 = 0
collatz n
  | even n = 1 + collatz (n §div§ 2)
  | otherwise = 1 + collatz (3 * n + 1)` }],
  },
  {
    id: 'miniA-B04', n: 'Pergunta 9', type: 'practice', points: 2, source: src('Pergunta 9', 3), theme: 'tecnicas', difficulty: 'media',
    constraints: [noLib, C.require(['foldr'], 'Tens de usar foldr.'), C.forbid(['reverse'], 'Não uses reverse.')],
    statement: 'Escreve `myReverse :: [a] -> [a]`, que inverte uma lista. Tens de usar `foldr` e não podes usar `reverse`.\nExemplos:\n```haskell\nmyReverse [1,2,3] == [3,2,1]\nmyReverse "abc"   == "cba"\n```',
    func: 'myReverse', signature: 'myReverse :: [a] -> [a]',
    tests: [
      { call: 'myReverse [1,2,3]', expect: '[3,2,1]', origin: 'enunciado' },
      { call: 'myReverse "abc"', expect: '"cba"', origin: 'enunciado' },
      { call: 'myReverse ([] :: [Int])', expect: '[]', origin: 'gerado' },
      { call: 'myReverse [1]', expect: '[1]', origin: 'gerado' },
      { call: 'myReverse [1,2,2,3,4]', expect: '[4,3,2,2,1]', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`myReverse :: [a] -> [a]
myReverse = foldr (\x acc -> acc ++ [x]) []` }],
  },
  {
    id: 'miniA-B05', n: 'Pergunta 10', type: 'practice', points: 2.5, source: src('Pergunta 10', 3), theme: 'ordenacao', difficulty: 'media',
    constraints: [noLib, C.recursion('Tens de usar recursão.')],
    statement: 'Escreve `ssort :: [Int] -> [Int]`, que ordena uma lista por ordem crescente com a **ordenação por seleção**: escolhe o menor elemento, coloca-o à cabeça e ordena recursivamente o que sobra. Atenção: deves retirar **apenas uma** ocorrência do menor, para os valores repetidos se manterem.\nExemplos:\n```haskell\nssort [3,1,2] == [1,2,3]\nssort [2,1,2] == [1,2,2]\n```',
    func: 'ssort', signature: 'ssort :: [Int] -> [Int]',
    tests: [
      { call: 'ssort [3,1,2]', expect: '[1,2,3]', origin: 'enunciado' },
      { call: 'ssort [2,1,2]', expect: '[1,2,2]', origin: 'enunciado' },
      { call: 'ssort []', expect: '[]', origin: 'gerado' },
      { call: 'ssort [4]', expect: '[4]', origin: 'gerado' },
      { call: 'ssort [5,4,3,2,1]', expect: '[1,2,3,4,5]', origin: 'gerado' },
      { call: 'ssort [1,1,1]', expect: '[1,1,1]', origin: 'gerado' },
      { call: 'ssort [0,-2,-2,7]', expect: '[-2,-2,0,7]', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`ssort :: [Int] -> [Int]
ssort [] = []
ssort xs = m : ssort (tira m xs)
  where
    m = minimum xs
    tira _ [] = []
    tira y (z : zs)
      | y == z = zs
      | otherwise = z : tira y zs` }],
  },
  {
    id: 'miniA-B06', n: 'Pergunta 11', type: 'practice', points: 3, source: src('Pergunta 11', 4), theme: 'grafos', difficulty: 'dificil',
    constraints: [noLib, C.recursion('Tens de usar recursão.')],
    statement: 'Um grafo não orientado é uma lista de arestas `[(Int, Int)]`. Escreve `reachable :: [(Int, Int)] -> Int -> Int -> Bool`, que diz se existe um caminho entre dois vértices (um vértice é sempre alcançável a partir de si próprio). Atenção aos ciclos: a função tem de terminar.\nExemplos:\n```haskell\nreachable [(1,2),(2,3)] 1 3 == True\nreachable [(1,2),(3,4)] 1 4 == False\n```',
    func: 'reachable', signature: 'reachable :: [(Int, Int)] -> Int -> Int -> Bool',
    tests: [
      { call: 'reachable [(1,2),(2,3)] 1 3', expect: 'True', origin: 'enunciado' },
      { call: 'reachable [(1,2),(3,4)] 1 4', expect: 'False', origin: 'enunciado' },
      { call: 'reachable [] 5 5', expect: 'True', origin: 'gerado' },
      { call: 'reachable [(1,2),(2,3),(3,1)] 1 4', expect: 'False', origin: 'gerado' },
      { call: 'reachable [(1,2),(2,3),(3,4),(4,5)] 5 1', expect: 'True', origin: 'gerado' },
      { call: 'reachable [(1,2),(2,3),(3,1),(3,4)] 4 1', expect: 'True', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`reachable :: [(Int, Int)] -> Int -> Int -> Bool
reachable es a b = go [a] []
  where
    go [] _ = False
    go (v : pend) vis
      | v == b = True
      | v §elem§ vis = go pend vis
      | otherwise = go (viz v ++ pend) (v : vis)
    viz v = [y | (x, y) <- es, x == v] ++ [x | (x, y) <- es, y == v]` }],
  },
  {
    id: 'miniA-B07', n: 'Pergunta 12', type: 'practice', points: 3, source: src('Pergunta 12', 4), theme: 'modelacao', difficulty: 'dificil',
    constraints: [noLib],
    statement: 'Escreve `groupByKey :: [(String, Int)] -> [(String, [Int])]`, que agrupa os valores pela chave. As chaves ficam pela ordem da sua primeira aparição e os valores de cada chave pela ordem em que aparecem.\nExemplo:\n```haskell\ngroupByKey [("a",1),("b",2),("a",3)] == [("a",[1,3]),("b",[2])]\n```',
    func: 'groupByKey', signature: 'groupByKey :: [(String, Int)] -> [(String, [Int])]',
    tests: [
      { call: 'groupByKey [("a",1),("b",2),("a",3)]', expect: '[("a",[1,3]),("b",[2])]', origin: 'enunciado' },
      { call: 'groupByKey []', expect: '[]', origin: 'gerado' },
      { call: 'groupByKey [("x",1)]', expect: '[("x",[1])]', origin: 'gerado' },
      { call: 'groupByKey [("b",1),("a",2),("b",3),("c",4),("a",5)]', expect: '[("b",[1,3]),("a",[2,5]),("c",[4])]', origin: 'gerado' },
      { call: 'groupByKey [("k",3),("k",2),("k",1)]', expect: '[("k",[3,2,1])]', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`groupByKey :: [(String, Int)] -> [(String, [Int])]
groupByKey [] = []
groupByKey ((k, v) : resto) =
  (k, v : [w | (k', w) <- resto, k' == k]) : groupByKey [(k', w) | (k', w) <- resto, k' /= k]` }],
  },
];

export default { exam, contexts, questions };
