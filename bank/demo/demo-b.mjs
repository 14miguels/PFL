import { r, C } from '../lib.mjs';

const exam = {
  id: 'demo-b',
  label: 'Exame de demonstração B',
  short: 'Demo B',
  year: 'demo',
  season: 'Demonstração',
  date: null,
  kind: 'demo',
  files: ['demo'],
  parts: { A: 'Parte 1 — teoria (escolha múltipla)', B: 'Parte 2 — prática (Haskell)' },
  totalPoints: 20,
  penalty: { fraction: null, status: 'unknown', note: 'Este exame de demonstração não tem penalização.' },
  rules: ['Exame fictício, escrito para demonstrar a aplicação.', 'Podes usar o GHCi para testar o teu código.', 'Não podes importar módulos, salvo indicação em contrário.'],
  notes: ['Todas as questões deste exame foram escritas de raiz para o projeto; não vêm de nenhum exame real.'],
};

const noLib = C.noImport('Não podes importar módulos.');
const src = (n, page = 1) => ({ file: 'demo', question: n, page });
const BASIS = 'Verificada por execução em GHC (npm run validate).';
const SUP = 'gerada (função de questão anterior, que o enunciado permite assumir)';

const contexts = [
  {
    id: 'expr',
    text: 'Considera o tipo das expressões aritméticas inteiras:',
    code: r`data Expr = Num Int | Add Expr Expr | Mul Expr Expr | Neg Expr
  deriving (Show, Eq)`,
    note: '`Neg e` representa o simétrico de `e`.',
    support: {},
  },
  {
    id: 'mat',
    text: 'Uma matriz é representada como uma lista de linhas:',
    code: r`type Matriz = [[Int]]`,
    note: 'Nota: as matrizes são quadradas e não vazias.',
    support: {},
  },
];

const questions = [
  // ------------------------------------------------------------ teoria
  {
    id: 'demoB-A01', n: 'Pergunta 1', type: 'theory', points: 1, source: src('Pergunta 1'), theme: 'adt', difficulty: 'facil',
    statement: 'Dado o tipo abaixo, qual das expressões é um valor válido de `[Color]`?\n```haskell\ndata Color = Red | Green | Blue\n```',
    options: ['[Red, Green]', '[Red, "Green"]', '[red, green]', '(Red, Green)'],
    answer: { value: 'a', status: 'confirmed', basis: BASIS },
    verify: [{ kind: 'typecheck', prelude: 'data Color = Red | Green | Blue\nv :: [Color]', template: 'v = $OPT' }],
  },
  {
    id: 'demoB-A02', n: 'Pergunta 2', type: 'theory', points: 1, source: src('Pergunta 2'), theme: 'iotc', difficulty: 'media',
    statement: 'Qual é o efeito de `mapM_ print [1,2]` numa função `IO ()`?',
    options: ['Imprime 1 e 2, cada um na sua linha', 'Devolve a lista `[1,2]`', 'Não imprime nada', 'Imprime `[1,2]` numa só linha'],
    answer: { value: null, status: 'unknown', basis: 'Pergunta de demonstração sem chave de correção (mostra o estado "Desconhecida" e não conta para a nota).' },
  },
  {
    id: 'demoB-A03', n: 'Pergunta 3', type: 'theory', points: 1, source: src('Pergunta 3'), theme: 'equiv', difficulty: 'media',
    statement: 'Qual das definições seguintes de `g` é **equivalente** à original, para qualquer lista de inteiros?\n```haskell\ng :: [Int] -> [Int]\ng xs = reverse (map (+1) xs)\n```',
    options: ['g xs = reverse (filter (> 0) (map (+1) xs))', 'g xs = map (+1) (reverse xs)', 'g xs = map (+1) xs', 'g xs = reverse xs'],
    answer: { value: 'b', status: 'confirmed', basis: 'Verificada por execução em GHC: só a opção b dá sempre o mesmo resultado que a original (o `map` e o `reverse` comutam).' },
    verify: [{ kind: 'equiv', name: 'g', sig: 'g :: [Int] -> [Int]', original: 'g xs = reverse (map (+1) xs)', inputs: ['[]', '[1,2,3]', '[-5,0,2]'] }],
  },
  {
    id: 'demoB-A04', n: 'Pergunta 4', type: 'theory', points: 1, source: src('Pergunta 4'), theme: 'equiv', difficulty: 'dificil',
    statement: 'Qual das definições seguintes de `h` é **equivalente** à original, para qualquer lista de inteiros?\n```haskell\nh :: [Int] -> [Int]\nh xs = [x * 2 | x <- xs, x > 0]\n```',
    options: ['h xs = map (* 2) (filter (>= 0) xs)', 'h xs = filter (> 0) (map (* 2) xs)', 'h xs = reverse (map (* 2) (filter (> 0) xs))', 'h xs = map (* 2) (filter even xs)'],
    answer: { value: 'b', status: 'confirmed', basis: 'Verificada por execução em GHC: dobrar não muda o sinal, por isso filtrar antes ou depois é igual; a opção a deixa passar o 0 e a c inverte a ordem.' },
    verify: [{ kind: 'equiv', name: 'h', sig: 'h :: [Int] -> [Int]', original: 'h xs = [x * 2 | x <- xs, x > 0]', inputs: ['[]', '[1,-2,3,0]', '[0]', '[2,4]'] }],
  },
  {
    id: 'demoB-A05', n: 'Pergunta 5', type: 'theory', points: 1, source: src('Pergunta 5'), theme: 'lazy', difficulty: 'media',
    statement: 'Qual o resultado de avaliar a seguinte expressão?\n```haskell\nlength (take 3 (repeat undefined))\n```',
    options: ['3', 'Erro: undefined', '0', 'A avaliação não termina'],
    answer: { value: 'a', status: 'confirmed', basis: 'Verificada por execução em GHC: o `length` só percorre a estrutura da lista, nunca avalia os elementos.' },
    verify: [{ kind: 'eval', expr: 'length (take 3 (repeat undefined))' }],
  },
  {
    id: 'demoB-A06', n: 'Pergunta 6', type: 'theory', points: 1, source: src('Pergunta 6'), theme: 'iotc', difficulty: 'dificil',
    statement: 'Considera a seguinte instância. O que escreve `print [Vermelho, Verde]`?\n```haskell\ndata Cor = Vermelho | Verde\n\ninstance Show Cor where\n  show Vermelho = "V"\n  show Verde = "G"\n```',
    options: ['[V,G]', '["V","G"]', '[Vermelho,Verde]', 'VG'],
    answer: { value: 'a', status: 'confirmed', basis: 'Verificada por execução em GHC: o `show` de uma lista usa o `show` de cada elemento, separados por vírgulas e entre parêntesis retos.' },
    verify: [{ kind: 'eval', prelude: 'data Cor = Vermelho | Verde\n\ninstance Show Cor where\n  show Vermelho = "V"\n  show Verde = "G"', expr: 'print [Vermelho, Verde]' }],
  },

  // ------------------------------------------------------------ prática
  {
    id: 'demoB-B01', n: 'Pergunta 7', type: 'practice', points: 1.5, source: src('Pergunta 7', 2), theme: 'io', difficulty: 'media',
    constraints: [noLib],
    statement: 'Escreve `printTable :: [(String, Int)] -> IO ()`, que imprime uma linha `nome: valor` por cada par da lista. Para a lista vazia não imprime nada.\nExemplo:\n```haskell\nghci> printTable [("a",1),("bb",22)]\na: 1\nbb: 22\n```',
    func: 'printTable', signature: 'printTable :: [(String, Int)] -> IO ()',
    tests: [
      { io: 'printTable [("a",1),("bb",22)]', stdout: 'a: 1\nbb: 22\n', origin: 'enunciado' },
      { io: 'printTable []', stdout: '', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`printTable :: [(String, Int)] -> IO ()
printTable [] = return ()
printTable ((n, v) : rest) = do
  putStrLn (n ++ ": " ++ show v)
  printTable rest` }],
  },
  {
    id: 'demoB-B02', n: 'Pergunta 8', type: 'practice', points: 2, source: src('Pergunta 8', 2), theme: 'grafos', difficulty: 'media',
    constraints: [noLib],
    statement: 'Um grafo não orientado é uma lista de arestas `[(Int, Int)]`. Escreve `neighbors :: [(Int, Int)] -> Int -> [Int]`, que devolve os vizinhos de um vértice (a ordem não importa).\nExemplo:\n```haskell\nneighbors [(1,2),(2,3),(1,3)] 1 == [2,3]   -- a ordem não importa\n```',
    func: 'neighbors', signature: 'neighbors :: [(Int, Int)] -> Int -> [Int]',
    tests: [
      { call: 'neighbors [(1,2),(2,3),(1,3)] 1', expect: '[2,3]', cmp: 'set', origin: 'enunciado' },
      { call: 'neighbors [(1,2),(2,3),(1,3)] 3', expect: '[2,1]', cmp: 'set', origin: 'gerado' },
      { call: 'neighbors [(1,2)] 9', expect: '[]', cmp: 'set', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`neighbors :: [(Int, Int)] -> Int -> [Int]
neighbors es v = [b | (a, b) <- es, a == v] ++ [a | (a, b) <- es, b == v]` }],
  },
  {
    id: 'demoB-B03', n: 'Pergunta 9', type: 'practice', points: 1, source: src('Pergunta 9', 2), theme: 'modelacao', difficulty: 'facil',
    constraints: [noLib, C.forbid(['lookup'], 'Não uses "lookup": implementa tu a pesquisa.')],
    statement: 'Uma pauta é uma lista de pares `(nome, nota)`. Escreve `findScore :: String -> [(String, Int)] -> Maybe Int`, que devolve a nota do **primeiro** aluno com esse nome, ou `Nothing` se não existir.\nExemplos:\n```haskell\nfindScore "ana" [("rui",12),("ana",17)] == Just 17\nfindScore "eva" []                      == Nothing\n```',
    func: 'findScore', signature: 'findScore :: String -> [(String, Int)] -> Maybe Int',
    tests: [
      { call: 'findScore "ana" [("rui",12),("ana",17)]', expect: 'Just 17', origin: 'enunciado' },
      { call: 'findScore "eva" []', expect: 'Nothing', origin: 'enunciado' },
      { call: 'findScore "ana" [("ana",10),("ana",20)]', expect: 'Just 10', origin: 'gerado' },
      { call: 'findScore "ana" [("ari",3),("ana",4)]', expect: 'Just 4', origin: 'gerado' },
      { call: 'findScore "Ana" [("ana",5)]', expect: 'Nothing', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`findScore :: String -> [(String, Int)] -> Maybe Int
findScore _ [] = Nothing
findScore nome ((n, v) : resto)
  | nome == n = Just v
  | otherwise = findScore nome resto` }],
  },
  {
    id: 'demoB-B04', n: 'Pergunta 10', type: 'practice', points: 1.5, source: src('Pergunta 10', 3), ctx: 'expr', theme: 'adt', difficulty: 'facil',
    constraints: [noLib],
    statement: 'Escreve `eval :: Expr -> Int`, que calcula o valor de uma expressão.\nExemplos:\n```haskell\neval (Add (Num 2) (Mul (Num 3) (Num 4))) == 14\neval (Neg (Num 5))                        == -5\n```',
    func: 'eval', signature: 'eval :: Expr -> Int',
    tests: [
      { call: 'eval (Add (Num 2) (Mul (Num 3) (Num 4)))', expect: '14', origin: 'enunciado' },
      { call: 'eval (Neg (Num 5))', expect: '-5', origin: 'enunciado' },
      { call: 'eval (Mul (Num 0) (Add (Num 7) (Num 8)))', expect: '0', origin: 'gerado' },
      { call: 'eval (Neg (Neg (Num 3)))', expect: '3', origin: 'gerado' },
      { call: 'eval (Add (Neg (Num 2)) (Num 2))', expect: '0', origin: 'gerado' },
      { call: 'eval (Mul (Num 3) (Num 4))', expect: '12', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`eval :: Expr -> Int
eval (Num n) = n
eval (Add a b) = eval a + eval b
eval (Mul a b) = eval a * eval b
eval (Neg e) = negate (eval e)` }],
  },
  {
    id: 'demoB-B05', n: 'Pergunta 11', type: 'practice', points: 2, source: src('Pergunta 11', 3), theme: 'lazy', difficulty: 'media',
    constraints: [noLib],
    statement: 'Define a lista **infinita** `triangulares :: [Int]` dos números triangulares: 1, 3, 6, 10, 15, … (o n-ésimo é 1 + 2 + … + n). Os testes só usam partes finitas, por isso a tua lista tem de ser verdadeiramente infinita (preguiçosa).\nExemplo:\n```haskell\ntake 6 triangulares == [1,3,6,10,15,21]\n```',
    func: 'triangulares', signature: 'triangulares :: [Int]',
    tests: [
      { call: 'take 6 triangulares', expect: '[1,3,6,10,15,21]', origin: 'enunciado' },
      { call: 'head triangulares', expect: '1', origin: 'gerado' },
      { call: 'takeWhile (< 30) triangulares', expect: '[1,3,6,10,15,21,28]', origin: 'gerado' },
      { call: 'triangulares !! 99', expect: '5050', origin: 'gerado' },
      { call: 'triangulares !! 199', expect: '20100', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`triangulares :: [Int]
triangulares = scanl1 (+) [1 ..]` }],
  },
  {
    id: 'demoB-B06', n: 'Pergunta 12', type: 'practice', points: 2, source: src('Pergunta 12', 3), theme: 'tecnicas', difficulty: 'media',
    constraints: [noLib, C.recursion('Tens de usar recursão.'), C.forbid(['iterate', 'replicate', 'foldr', 'foldl'], 'Não uses iterate, replicate nem folds: usa recursão direta.')],
    statement: 'Escreve `applyN :: Int -> (a -> a) -> a -> a`, que aplica uma função `n` vezes a um valor (com `n >= 0`). Usa recursão direta.\nExemplos:\n```haskell\napplyN 3 (*2) 1  == 8\napplyN 0 (+1) 5  == 5\n```',
    func: 'applyN', signature: 'applyN :: Int -> (a -> a) -> a -> a',
    tests: [
      { call: 'applyN 3 (*2) 1', expect: '8', origin: 'enunciado' },
      { call: 'applyN 0 (+1) 5', expect: '5', origin: 'enunciado' },
      { call: 'applyN 2 (\'x\':) ""', expect: '"xx"', origin: 'gerado' },
      { call: 'applyN 1 negate 7', expect: '-7', origin: 'gerado' },
      { call: 'applyN 4 (drop 1) [1,2,3,4,5,6]', expect: '[5,6]', origin: 'gerado' },
      { call: 'applyN 5 (+3) 0', expect: '15', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`applyN :: Int -> (a -> a) -> a -> a
applyN 0 _ x = x
applyN n f x = f (applyN (n - 1) f x)` }],
  },
  {
    id: 'demoB-B07', n: 'Pergunta 13', type: 'practice', points: 1.5, source: src('Pergunta 13', 4), ctx: 'mat', theme: 'matrizes', difficulty: 'facil',
    constraints: [noLib],
    statement: 'Escreve `diag :: Matriz -> [Int]`, que devolve a diagonal principal (do canto superior esquerdo ao canto inferior direito) de uma matriz quadrada.\nExemplo:\n```haskell\ndiag [[1,2,3],[4,5,6],[7,8,9]] == [1,5,9]\n```',
    func: 'diag', signature: 'diag :: Matriz -> [Int]',
    tests: [
      { call: 'diag [[1,2,3],[4,5,6],[7,8,9]]', expect: '[1,5,9]', origin: 'enunciado' },
      { call: 'diag [[7]]', expect: '[7]', origin: 'gerado' },
      { call: 'diag [[1,2],[3,4]]', expect: '[1,4]', origin: 'gerado' },
      { call: 'diag [[0,9,9,9],[9,5,9,9],[9,9,6,9],[9,9,9,1]]', expect: '[0,5,6,1]', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`diag :: Matriz -> [Int]
diag m = [linha !! i | (i, linha) <- zip [0 ..] m]` }],
  },
  {
    id: 'demoB-B08', n: 'Pergunta 14', type: 'practice', points: 2.5, source: src('Pergunta 14', 4), theme: 'modelacao', difficulty: 'media',
    constraints: [noLib],
    statement: 'Cada aluno tem um nome e a lista das suas notas: `[(String, [Int])]`. Escreve `topStudent :: [(String, [Int])] -> Maybe String`, que devolve o nome do aluno com a **maior soma** de notas. Em caso de empate, devolve o que aparece primeiro; para a lista vazia, devolve `Nothing`.\nExemplo:\n```haskell\ntopStudent [("ana",[10,12]),("rui",[15,9]),("eva",[8])] == Just "rui"\n```',
    func: 'topStudent', signature: 'topStudent :: [(String, [Int])] -> Maybe String',
    tests: [
      { call: 'topStudent [("ana",[10,12]),("rui",[15,9]),("eva",[8])]', expect: 'Just "rui"', origin: 'enunciado' },
      { call: 'topStudent []', expect: 'Nothing', origin: 'gerado' },
      { call: 'topStudent [("a",[5,5]),("b",[10])]', expect: 'Just "a"', origin: 'gerado' },
      { call: 'topStudent [("z",[])]', expect: 'Just "z"', origin: 'gerado' },
      { call: 'topStudent [("a",[-1]),("b",[-5])]', expect: 'Just "a"', origin: 'gerado' },
      { call: 'topStudent [("a",[1]),("b",[2]),("c",[2])]', expect: 'Just "b"', origin: 'gerado' },
    ],
    refs: [{ status: 'unofficial', origin: 'gerada', code: r`topStudent :: [(String, [Int])] -> Maybe String
topStudent [] = Nothing
topStudent (x : xs) = Just (fst (go x xs))
  where
    soma (_, notas) = sum notas
    go melhor [] = melhor
    go melhor (y : ys)
      | soma y > soma melhor = go y ys
      | otherwise = go melhor ys` }],
  },
];

export default { exam, contexts, questions };
