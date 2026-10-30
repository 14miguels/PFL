{-# LANGUAGE ScopedTypeVariables #-}
-- Harness de testes (gerado pela aplicação; não faz parte dos exames).
module Harness (T, eq, set, via, run) where

import qualified Control.Exception as E
import qualified Data.List as L
import System.IO
import System.Timeout (timeout)

-- esperado, obtido (ambos lazy, como texto)
data T = T String String

eq :: Show a => a -> a -> T
eq got want = T (show want) (show got)

set :: Show a => [a] -> [a] -> T
set got want = T (render want) (render got)
  where render xs = show (L.sort (map show xs))

via :: Show b => (a -> b) -> a -> a -> T
via f got want = T (show (f want)) (show (f got))

clean :: String -> String
clean = concatMap esc . take 400
  where esc '\n' = "\\n"
        esc '\t' = "\\t"
        esc c = [c]

run :: [T] -> IO ()
run ts = hSetBuffering stdout LineBuffering >> mapM_ one (zip [0 :: Int ..] ts)
  where
    one (i, T want got) = do
      r <- timeout 3000000 (E.try (E.evaluate (force (want, got))))
      case r of
        Nothing -> out i "TIMEOUT" ""
        Just (Left (e :: E.SomeException)) -> out i "ERR" (takeWhile (/= '\n') (show e))
        Just (Right (w, g)) -> out i (if w == g then "PASS" else "FAIL") g
    force (w, g) = length w `seq` length g `seq` (w, g)
    out i tag msg = putStrLn ("@@PFL@@\t" ++ show i ++ "\t" ++ tag ++ "\t" ++ clean msg)
