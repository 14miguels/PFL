// "Mutantes": soluções ERRADAS mas plausíveis (erros típicos de estudantes) que os testes de cada exercício prático
// do banco de demonstração têm de rejeitar. Cada entrada: { label, code } — deve compilar e falhar em pelo menos um teste —
// ou { label, code, violates: '<kind>' } — passa todos os testes mas viola a restrição indicada.
// (Complementa a validação das soluções de referência: uma referência a passar não prova que os testes são bons.)
export const MUTANTS = {
  'demoA-B01': [
    { label: 'soma sem elevar ao quadrado', code: 'sumSquares :: [Int] -> Int\nsumSquares [] = 0\nsumSquares (x:xs) = x + sumSquares xs\n' },
    { label: 'ignora o resto da lista', code: 'sumSquares :: [Int] -> Int\nsumSquares [] = 0\nsumSquares (x:_) = x * x\n' },
  ],
  'demoA-B02': [
    { label: 'só conta o a', code: 'countVowels :: String -> Int\ncountVowels [] = 0\ncountVowels (c:cs)\n  | c == \'a\' = 1 + countVowels cs\n  | otherwise = countVowels cs\n' },
    { label: 'esquece o u', code: 'countVowels :: String -> Int\ncountVowels [] = 0\ncountVowels (c:cs)\n  | c §elem§ "aeio" = 1 + countVowels cs\n  | otherwise = countVowels cs\n' },
    { label: 'conta as consoantes', code: 'countVowels :: String -> Int\ncountVowels [] = 0\ncountVowels (c:cs)\n  | c §notElem§ "aeiou" = 1 + countVowels cs\n  | otherwise = countVowels cs\n' },
  ],
  'demoA-B03': [
    { label: 'dobra todos os elementos', code: 'evensDoubled :: [Int] -> [Int]\nevensDoubled xs = [2 * x | x <- xs]\n' },
    { label: 'filtra os pares mas não dobra', code: 'evensDoubled :: [Int] -> [Int]\nevensDoubled xs = [x | x <- xs, even x]\n' },
    { label: 'dobra os ímpares', code: 'evensDoubled :: [Int] -> [Int]\nevensDoubled xs = [2 * x | x <- xs, odd x]\n' },
    { label: 'correto mas sem list comprehension', code: 'evensDoubled :: [Int] -> [Int]\nevensDoubled xs = map (* 2) (filter even xs)\n', violates: 'require-comprehension' },
  ],
  'demoA-B04': [
    { label: 'agrupa todos os iguais, não só os consecutivos', code: 'import Data.List (nub)\nrle :: String -> [(Char, Int)]\nrle s = [(c, length (filter (== c) s)) | c <- nub s]\n' },
    { label: 'conta uma a menos', code: 'rle :: String -> [(Char, Int)]\nrle [] = []\nrle (c:cs) = go c 0 cs\n  where\n    go x n [] = [(x, n)]\n    go x n (y:ys)\n      | y == x = go x (n + 1) ys\n      | otherwise = (x, n) : go y 0 ys\n' },
    { label: 'perde o último grupo', code: 'rle :: String -> [(Char, Int)]\nrle [] = []\nrle (c:cs) = go c 1 cs\n  where\n    go _ _ [] = []\n    go x n (y:ys)\n      | y == x = go x (n + 1) ys\n      | otherwise = (x, n) : go y 1 ys\n' },
  ],
  'demoA-B05': [
    { label: 'duplicados vão para a direita', code: 'insertBST :: Int -> BST -> BST\ninsertBST x Empty = Node Empty x Empty\ninsertBST x (Node l v r)\n  | x < v = Node (insertBST x l) v r\n  | otherwise = Node l v (insertBST x r)\n' },
    { label: 'troca esquerda e direita', code: 'insertBST :: Int -> BST -> BST\ninsertBST x Empty = Node Empty x Empty\ninsertBST x t@(Node l v r)\n  | x > v = Node (insertBST x l) v r\n  | x < v = Node l v (insertBST x r)\n  | otherwise = t\n' },
    { label: 'não insere em árvores não vazias', code: 'insertBST :: Int -> BST -> BST\ninsertBST x Empty = Node Empty x Empty\ninsertBST _ t = t\n' },
  ],
  'demoA-B06': [
    { label: 'pré-ordem', code: 'inorder :: BST -> [Int]\ninorder Empty = []\ninorder (Node l v r) = v : inorder l ++ inorder r\n' },
    { label: 'ordem decrescente', code: 'inorder :: BST -> [Int]\ninorder Empty = []\ninorder (Node l v r) = inorder r ++ [v] ++ inorder l\n' },
    { label: 'pós-ordem', code: 'inorder :: BST -> [Int]\ninorder Empty = []\ninorder (Node l v r) = inorder l ++ inorder r ++ [v]\n' },
  ],
  'demoB-B01': [
    { label: 'sem espaço depois dos dois pontos', code: 'printTable :: [(String, Int)] -> IO ()\nprintTable [] = return ()\nprintTable ((n, v) : rest) = do\n  putStrLn (n ++ ":" ++ show v)\n  printTable rest\n' },
    { label: 'valor antes do nome', code: 'printTable :: [(String, Int)] -> IO ()\nprintTable [] = return ()\nprintTable ((n, v) : rest) = do\n  putStrLn (show v ++ ": " ++ n)\n  printTable rest\n' },
    { label: 'sem mudança de linha', code: 'printTable :: [(String, Int)] -> IO ()\nprintTable [] = return ()\nprintTable ((n, v) : rest) = do\n  putStr (n ++ ": " ++ show v)\n  printTable rest\n' },
  ],
  'demoB-B02': [
    { label: 'só vizinhos pela primeira componente', code: 'neighbors :: [(Int, Int)] -> Int -> [Int]\nneighbors es v = [b | (a, b) <- es, a == v]\n' },
    { label: 'devolve as arestas em vez dos vizinhos', code: 'neighbors :: [(Int, Int)] -> Int -> [Int]\nneighbors es v = [a + b | (a, b) <- es, a == v || b == v]\n' },
    { label: 'inclui o próprio vértice', code: 'neighbors :: [(Int, Int)] -> Int -> [Int]\nneighbors es v = v : ([b | (a, b) <- es, a == v] ++ [a | (a, b) <- es, b == v])\n' },
  ],
  'demoA-B07': [
    { label: 'perde os valores repetidos', code: 'isort :: [Int] -> [Int]\nisort [] = []\nisort (x:xs) = insere x (isort xs)\n  where\n    insere y [] = [y]\n    insere y (z:zs)\n      | y == z = z : zs\n      | y < z = y : z : zs\n      | otherwise = z : insere y zs\n' },
    { label: 'ordem decrescente', code: 'isort :: [Int] -> [Int]\nisort [] = []\nisort (x:xs) = insere x (isort xs)\n  where\n    insere y [] = [y]\n    insere y (z:zs)\n      | y >= z = y : z : zs\n      | otherwise = z : insere y zs\n' },
    { label: 'uma só passagem de bolha', code: 'isort :: [Int] -> [Int]\nisort (x:y:r)\n  | x > y = y : isort (x : r)\n  | otherwise = x : isort (y : r)\nisort l = l\n' },
  ],
  'demoA-B08': [
    { label: 'produto elemento a elemento', code: 'mulM :: Matriz -> Matriz -> Matriz\nmulM = zipWith (zipWith (*))\n' },
    { label: 'esquece de transpor a segunda matriz', code: 'mulM :: Matriz -> Matriz -> Matriz\nmulM a b = [[sum (zipWith (*) l c) | c <- b] | l <- a]\n' },
    { label: 'ordem dos operandos trocada', code: 'mulM :: Matriz -> Matriz -> Matriz\nmulM x y = [[sum (zipWith (*) l c) | c <- cols] | l <- y]\n  where cols = foldr (zipWith (:)) (repeat []) x\n' },
    { label: 'soma em vez de multiplicar', code: 'mulM :: Matriz -> Matriz -> Matriz\nmulM a b = [[sum (zipWith (+) l c) | c <- foldr (zipWith (:)) (repeat []) b] | l <- a]\n' },
  ],
};
