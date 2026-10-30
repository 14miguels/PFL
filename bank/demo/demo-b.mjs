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
  totalPoints: 3.5,
  penalty: { fraction: null, status: 'unknown', note: 'Este exame de demonstração não tem penalização.' },
  rules: ['Exame fictício, escrito para demonstrar a aplicação.', 'Podes usar o GHCi para testar o teu código.'],
  notes: ['Todas as questões deste exame foram escritas de raiz para o projeto; não vêm de nenhum exame real.'],
};

const noLib = C.noImport('Não podes importar módulos.');
const src = (n, page = 1) => ({ file: 'demo', question: n, page });

const contexts = [];

const questions = [
  {
    id: 'demoB-A01', n: 'Pergunta 1', type: 'theory', points: 0.5, source: src('Pergunta 1'), theme: 'adt', difficulty: 'facil',
    statement: 'Dado o tipo abaixo, qual das expressões é um valor válido de `[Color]`?\n```haskell\ndata Color = Red | Green | Blue\n```',
    options: ['[Red, Green]', '[Red, "Green"]', '[red, green]', '(Red, Green)'],
    answer: { value: 'a', status: 'confirmed', basis: 'Verificada por execução em GHC (npm run validate).' },
    verify: [{ kind: 'typecheck', prelude: 'data Color = Red | Green | Blue\nv :: [Color]', template: 'v = $OPT' }],
  },
  {
    id: 'demoB-A02', n: 'Pergunta 2', type: 'theory', points: 0.5, source: src('Pergunta 2'), theme: 'iotc', difficulty: 'media',
    statement: 'Qual é o efeito de `mapM_ print [1,2]` numa função `IO ()`?',
    options: ['Imprime 1 e 2, cada um na sua linha', 'Devolve a lista `[1,2]`', 'Não imprime nada', 'Imprime `[1,2]` numa só linha'],
    answer: { value: null, status: 'unknown', basis: 'Pergunta de demonstração sem chave de correção (mostra o estado "Desconhecida" e não conta para a nota).' },
  },
  {
    id: 'demoB-B01', n: 'Pergunta 3', type: 'practice', points: 1, source: src('Pergunta 3', 2), theme: 'io', difficulty: 'media',
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
    id: 'demoB-B02', n: 'Pergunta 4', type: 'practice', points: 1.5, source: src('Pergunta 4', 2), theme: 'grafos', difficulty: 'media',
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
];

export default { exam, contexts, questions };
