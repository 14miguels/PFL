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
  'demoB-B03': [
    { label: 'devolve a última ocorrência', code: 'findScore :: String -> [(String, Int)] -> Maybe Int\nfindScore nome xs = go (reverse xs)\n  where\n    go [] = Nothing\n    go ((n, v) : r)\n      | n == nome = Just v\n      | otherwise = go r\n' },
    { label: 'Just 0 quando não existe', code: 'findScore :: String -> [(String, Int)] -> Maybe Int\nfindScore _ [] = Just 0\nfindScore nome ((n, v) : resto)\n  | nome == n = Just v\n  | otherwise = findScore nome resto\n' },
    { label: 'ignora o nome', code: 'findScore :: String -> [(String, Int)] -> Maybe Int\nfindScore _ [] = Nothing\nfindScore _ ((_, v) : _) = Just v\n' },
    { label: 'compara só a primeira letra', code: 'findScore :: String -> [(String, Int)] -> Maybe Int\nfindScore _ [] = Nothing\nfindScore nome ((n, v) : resto)\n  | take 1 nome == take 1 n = Just v\n  | otherwise = findScore nome resto\n' },
  ],
  'demoB-B04': [
    { label: 'a soma multiplica', code: 'eval :: Expr -> Int\neval (Num n) = n\neval (Add a b) = eval a * eval b\neval (Mul a b) = eval a * eval b\neval (Neg e) = negate (eval e)\n' },
    { label: 'esquece o sinal do Neg', code: 'eval :: Expr -> Int\neval (Num n) = n\neval (Add a b) = eval a + eval b\neval (Mul a b) = eval a * eval b\neval (Neg e) = eval e\n' },
    { label: 'o produto soma', code: 'eval :: Expr -> Int\neval (Num n) = n\neval (Add a b) = eval a + eval b\neval (Mul a b) = eval a + eval b\neval (Neg e) = negate (eval e)\n' },
  ],
  'demoB-B05': [
    { label: 'lista finita (não é infinita)', code: 'triangulares :: [Int]\ntriangulares = scanl1 (+) [1 .. 100]\n' },
    { label: 'começa em 0', code: 'triangulares :: [Int]\ntriangulares = scanl (+) 0 [1 ..]\n' },
    { label: 'quadrados em vez de triangulares', code: 'triangulares :: [Int]\ntriangulares = [n * n | n <- [1 ..]]\n' },
  ],
  'demoB-B06': [
    { label: 'aplica n+1 vezes', code: 'applyN :: Int -> (a -> a) -> a -> a\napplyN 0 f x = f x\napplyN n f x = f (applyN (n - 1) f x)\n' },
    { label: 'aplica no máximo uma vez', code: 'applyN :: Int -> (a -> a) -> a -> a\napplyN n f x = if n > 0 then f x else x\n' },
    { label: 'ignora n', code: 'applyN :: Int -> (a -> a) -> a -> a\napplyN _ f x = f x\n' },
    { label: 'correto mas com iterate (técnica proibida)', code: 'applyN :: Int -> (a -> a) -> a -> a\napplyN n f x = iterate f x !! n\n', violates: 'forbid-idents' },
  ],
  'demoB-B07': [
    { label: 'anti-diagonal', code: 'diag :: Matriz -> [Int]\ndiag m = [linha !! (length m - 1 - i) | (i, linha) <- zip [0 ..] m]\n' },
    { label: 'primeira coluna', code: 'diag :: Matriz -> [Int]\ndiag = map head\n' },
    { label: 'última coluna', code: 'diag :: Matriz -> [Int]\ndiag = map last\n' },
  ],
  'demoB-B08': [
    { label: 'empate: fica o último', code: 'topStudent :: [(String, [Int])] -> Maybe String\ntopStudent [] = Nothing\ntopStudent (x : xs) = Just (fst (go x xs))\n  where\n    soma (_, notas) = sum notas\n    go melhor [] = melhor\n    go melhor (y : ys)\n      | soma y >= soma melhor = go y ys\n      | otherwise = go melhor ys\n' },
    { label: 'escolhe a menor soma', code: 'topStudent :: [(String, [Int])] -> Maybe String\ntopStudent [] = Nothing\ntopStudent (x : xs) = Just (fst (go x xs))\n  where\n    soma (_, notas) = sum notas\n    go melhor [] = melhor\n    go melhor (y : ys)\n      | soma y < soma melhor = go y ys\n      | otherwise = go melhor ys\n' },
    { label: 'devolve sempre o primeiro aluno', code: 'topStudent :: [(String, [Int])] -> Maybe String\ntopStudent [] = Nothing\ntopStudent ((n, _) : _) = Just n\n' },
  ],
  'miniA-B01': [
    { label: 'conta os algarismos', code: 'digitSum :: Int -> Int\ndigitSum n\n  | n < 10 = 1\n  | otherwise = 1 + digitSum (n §div§ 10)\n' },
    { label: 'só o último algarismo', code: 'digitSum :: Int -> Int\ndigitSum n = n §mod§ 10\n' },
    { label: 'perde o primeiro algarismo', code: 'digitSum :: Int -> Int\ndigitSum n\n  | n < 10 = 0\n  | otherwise = n §mod§ 10 + digitSum (n §div§ 10)\n' },
  ],
  'miniA-B02': [
    { label: 'conta os nós em vez da altura', code: 'height :: Tree a -> Int\nheight Leaf = 0\nheight (Node l _ r) = 1 + height l + height r\n' },
    { label: 'só segue o ramo esquerdo', code: 'height :: Tree a -> Int\nheight Leaf = 0\nheight (Node l _ _) = 1 + height l\n' },
    { label: 'folha com altura 1', code: 'height :: Tree a -> Int\nheight Leaf = 1\nheight (Node l _ r) = 1 + max (height l) (height r)\n' },
  ],
  'miniA-B03': [
    { label: 'caso base devolve 1', code: 'collatz :: Int -> Int\ncollatz 1 = 1\ncollatz n\n  | even n = 1 + collatz (n §div§ 2)\n  | otherwise = 1 + collatz (3 * n + 1)\n' },
    { label: 'regra dos ímpares errada (n - 1)', code: 'collatz :: Int -> Int\ncollatz 1 = 0\ncollatz n\n  | even n = 1 + collatz (n §div§ 2)\n  | otherwise = 1 + collatz (n - 1)\n' },
    { label: 'só conta os passos pares', code: 'collatz :: Int -> Int\ncollatz 1 = 0\ncollatz n\n  | even n = 1 + collatz (n §div§ 2)\n  | otherwise = collatz (3 * n + 1)\n' },
  ],
  'miniA-B04': [
    { label: 'copia a lista em vez de a inverter', code: 'myReverse :: [a] -> [a]\nmyReverse = foldr (:) []\n' },
    { label: 'perde o primeiro elemento', code: 'myReverse :: [a] -> [a]\nmyReverse xs = foldr (\\x acc -> acc ++ [x]) [] (drop 1 xs)\n' },
    { label: 'correto mas usa reverse (técnica proibida)', code: 'myReverse :: [a] -> [a]\nmyReverse = reverse\n', violates: 'forbid-idents' },
    { label: 'correto mas sem foldr (técnica obrigatória)', code: 'myReverse :: [a] -> [a]\nmyReverse [] = []\nmyReverse (x : xs) = myReverse xs ++ [x]\n', violates: 'require-idents' },
  ],
  'miniA-B05': [
    { label: 'retira todas as ocorrências do menor (perde repetidos)', code: 'ssort :: [Int] -> [Int]\nssort [] = []\nssort xs = m : ssort [x | x <- xs, x /= m]\n  where m = minimum xs\n' },
    { label: 'seleciona o maior (ordem decrescente)', code: 'ssort :: [Int] -> [Int]\nssort [] = []\nssort xs = m : ssort (tira m xs)\n  where\n    m = maximum xs\n    tira _ [] = []\n    tira y (z : zs)\n      | y == z = zs\n      | otherwise = z : tira y zs\n' },
    { label: 'só coloca o menor à cabeça (resto por ordenar)', code: 'ssort :: [Int] -> [Int]\nssort [] = []\nssort xs = m : tira m xs\n  where\n    m = minimum xs\n    tira _ [] = []\n    tira y (z : zs)\n      | y == z = zs\n      | otherwise = z : tira y zs\n' },
  ],
  'miniA-B06': [
    { label: 'só vizinhos diretos', code: 'reachable :: [(Int, Int)] -> Int -> Int -> Bool\nreachable es a b = a == b || b §elem§ ([y | (x, y) <- es, x == a] ++ [x | (x, y) <- es, y == a])\n' },
    { label: 'ignora arestas no sentido inverso', code: 'reachable :: [(Int, Int)] -> Int -> Int -> Bool\nreachable es a b = go [a] []\n  where\n    go [] _ = False\n    go (v : pend) vis\n      | v == b = True\n      | v §elem§ vis = go pend vis\n      | otherwise = go ([y | (x, y) <- es, x == v] ++ pend) (v : vis)\n' },
    { label: 'só caminhos de comprimento ≤ 2', code: 'reachable :: [(Int, Int)] -> Int -> Int -> Bool\nreachable es a b = a == b || b §elem§ n a || any (\\x -> b §elem§ n x) (n a)\n  where n v = [y | (x, y) <- es, x == v] ++ [x | (x, y) <- es, y == v]\n' },
  ],
  'miniA-B07': [
    { label: 'chaves por ordem inversa', code: 'groupByKey :: [(String, Int)] -> [(String, [Int])]\ngroupByKey [] = []\ngroupByKey ((k, v) : resto) =\n  groupByKey [(k\', w) | (k\', w) <- resto, k\' /= k] ++ [(k, v : [w | (k\', w) <- resto, k\' == k])]\n' },
    { label: 'valores por ordem inversa', code: 'groupByKey :: [(String, Int)] -> [(String, [Int])]\ngroupByKey [] = []\ngroupByKey ((k, v) : resto) =\n  (k, reverse (v : [w | (k\', w) <- resto, k\' == k])) : groupByKey [(k\', w) | (k\', w) <- resto, k\' /= k]\n' },
    { label: 'um grupo por par (não agrupa)', code: 'groupByKey :: [(String, Int)] -> [(String, [Int])]\ngroupByKey = map (\\(k, v) -> (k, [v]))\n' },
  ],
  'miniB-B01': [
    { label: 'multiplica em vez de elevar', code: 'power :: Int -> Int -> Int\npower x n = x * n\n' },
    { label: 'caso base devolve 0', code: 'power :: Int -> Int -> Int\npower _ 0 = 0\npower x n = x * power x (n - 1)\n' },
    { label: 'um expoente a menos', code: 'power :: Int -> Int -> Int\npower x n\n  | n == 0 = 1\n  | n == 1 = 1\n  | otherwise = x * power x (n - 1)\n' },
  ],
  'miniB-B02': [
    { label: 'não faz nada', code: 'mirror :: Tree a -> Tree a\nmirror t = t\n' },
    { label: 'só troca na raiz', code: 'mirror :: Tree a -> Tree a\nmirror Leaf = Leaf\nmirror (Node l v r) = Node r v l\n' },
    { label: 'só espelha o ramo direito', code: 'mirror :: Tree a -> Tree a\nmirror Leaf = Leaf\nmirror (Node l v r) = Node (mirror r) v l\n' },
  ],
  'miniB-B03': [
    { label: 'perde os valores repetidos', code: 'qsort :: [Int] -> [Int]\nqsort [] = []\nqsort (p : xs) = qsort [x | x <- xs, x < p] ++ [p] ++ qsort [x | x <- xs, x > p]\n' },
    { label: 'ordem decrescente', code: 'qsort :: [Int] -> [Int]\nqsort [] = []\nqsort (p : xs) = qsort [x | x <- xs, x >= p] ++ [p] ++ qsort [x | x <- xs, x < p]\n' },
    { label: 'só uma partição (sem recursão)', code: 'qsort :: [Int] -> [Int]\nqsort [] = []\nqsort (p : xs) = [x | x <- xs, x < p] ++ [p] ++ [x | x <- xs, x >= p]\n' },
    { label: 'correto mas sem comprehension', code: 'qsort :: [Int] -> [Int]\nqsort [] = []\nqsort (p : xs) = qsort (filter (< p) xs) ++ [p] ++ qsort (filter (>= p) xs)\n', violates: 'require-comprehension' },
  ],
  'miniB-B04': [
    { label: 'só verifica a diagonal', code: 'isIdentity :: Matriz -> Bool\nisIdentity m = and [linha !! i == 1 | (i, linha) <- zip [0 ..] m]\n' },
    { label: 'só verifica os zeros fora da diagonal', code: 'isIdentity :: Matriz -> Bool\nisIdentity m = and [x == 0 | (i, linha) <- zip [0 ..] m, (j, x) <- zip [0 ..] linha, i /= j]\n' },
    { label: 'só verifica a primeira linha', code: 'isIdentity :: Matriz -> Bool\nisIdentity [] = True\nisIdentity (l : _) = head l == 1 && all (== 0) (tail l)\n' },
    { label: 'aceita qualquer matriz escalar', code: 'isIdentity :: Matriz -> Bool\nisIdentity m = and [x == (if i == j then head (head m) else 0) | (i, linha) <- zip [0 ..] m, (j, x) <- zip [0 ..] linha]\n' },
  ],
  'miniB-B05': [
    { label: 'instável (inverte a ordem dos empates)', code: 'sortByKey :: Ord b => (a -> b) -> [a] -> [a]\nsortByKey _ [] = []\nsortByKey f (x : xs) = insere (sortByKey f xs)\n  where\n    insere [] = [x]\n    insere (y : ys)\n      | f x < f y = x : y : ys\n      | otherwise = y : insere ys\n' },
    { label: 'ordena pelo elemento e não pela chave', code: 'sortByKey :: Ord a => (a -> b) -> [a] -> [a]\nsortByKey _ [] = []\nsortByKey f (x : xs) = insere (sortByKey f xs)\n  where\n    insere [] = [x]\n    insere (y : ys)\n      | x <= y = x : y : ys\n      | otherwise = y : insere ys\n' },
    { label: 'ordem decrescente da chave', code: 'sortByKey :: Ord b => (a -> b) -> [a] -> [a]\nsortByKey _ [] = []\nsortByKey f (x : xs) = insere (sortByKey f xs)\n  where\n    insere [] = [x]\n    insere (y : ys)\n      | f x >= f y = x : y : ys\n      | otherwise = y : insere ys\n' },
  ],
  'miniB-B06': [
    { label: 'sem espaços à esquerda', code: 'pyramid :: Int -> IO ()\npyramid n = mapM_ (\\i -> putStrLn (replicate (2 * i - 1) \'*\')) [1 .. n]\n' },
    { label: 'espaços no fim da linha', code: 'pyramid :: Int -> IO ()\npyramid n = mapM_ (\\i -> putStrLn (replicate (2 * i - 1) \'*\' ++ replicate (n - i) \' \')) [1 .. n]\n' },
    { label: 'asteriscos a mais (2i em vez de 2i-1)', code: 'pyramid :: Int -> IO ()\npyramid n = mapM_ (\\i -> putStrLn (replicate (n - i) \' \' ++ replicate (2 * i) \'*\')) [1 .. n]\n' },
  ],
};
