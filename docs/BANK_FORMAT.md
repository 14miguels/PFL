# Formato do banco de questões

A aplicação lê um **banco** de uma de duas pastas:

| Pasta | Conteúdo | Publicada? |
|---|---|---|
| `bank/demo/` | Banco de demonstração (questões originais). | Sim |
| `bank/src/` | O teu banco. Usa-se automaticamente quando existe. | **Não** (`.gitignore`) |

`PFL_BANK=demo npm start` força a demonstração mesmo que `bank/src/` exista. `npm run build` (feito por `npm start`) junta tudo em `bank/questions.json` (ignorado pelo Git) e valida a estrutura.

> Antes de publicares um banco com enunciados de terceiros, confirma os direitos de redistribuição. Mantém-no em `bank/src/`.

## Estrutura

```
bank/src/
  manifest.mjs     lista de ficheiros (e opções)
  meu-exame.mjs    um módulo por exame
```

### `manifest.mjs`

```js
export default {
  files: ['meu-exame'],          // módulos de exame, sem a extensão
  presets: {                     // opcional: estruturas do "Exame aleatório"
    curto: { label: 'Curto (2 + 5)', theory: 2, practice: 5 },
  },
  demo: true,                    // opcional: mostra o aviso "banco de demonstração"
  sourcesOutsideRepo: true,      // opcional: exige que source.file exista em ../ (ver check:transcription)
};
```

Sem `presets`, usam-se os predefinidos (6+14, 5+15 e 2,8+7,2). O preset "Personalizado" existe sempre.

### Módulo de exame

```js
import { r, C } from '../lib.mjs';   // 'r' = texto cru; C = restrições (ver abaixo)
const exam = { … };
const contexts = [ … ];               // opcional
const questions = [ … ];
export default { exam, contexts, questions };
```

Dentro de `` r`…` `` as barras invertidas ficam como estão, mas **não podes usar o acento grave** (`` ` ``): escreve `§` e ele é convertido em `` ` `` (ex.: `` x §elem§ xs ``).

**`exam`**: `id`, `label`, `short`, `year`, `season`, `date` (ou `null`), `kind`, `files` (nomes das fontes), `parts`, `totalPoints` (a soma das cotações tem de bater certo), `penalty` (`{ fraction, status: 'stated' | 'observed' | 'unknown', note }`), `rules[]`, `notes[]`.

**`contexts[]`** (código partilhado por várias perguntas): `id`, `text`, `code` (declarações fornecidas pelo enunciado), `note`, `figure` (ficheiro em `bank/assets/`) e `support`: funções de perguntas anteriores que o enunciado permite assumir, `{ nome: { origin, code, deps?, exports? } }`. Uma pergunta pede-as com `needs: ['nome']`.

### Perguntas (campos comuns)

`id` (único), `n` (rótulo, ex. "Pergunta 3"), `type` (`'theory'` ou `'practice'`), `points` (opcional; **sem cotação a pergunta não entra em exames aleatórios**), `source: { file, question, page }`, `theme` (uma chave de `THEMES` em `bank/lib.mjs`), `difficulty` (`facil` | `media` | `dificil`), `statement` (texto com blocos ` ```haskell `, `` `código` `` e listas com `•` ou `-`), `ctx` (id de um contexto), `figure`, `notes[]`.

### Teoria

```js
{
  id: 'x-A01', n: 'Pergunta 1', type: 'theory', points: 0.5, source: { file: 'f', question: 'Pergunta 1', page: 1 },
  theme: 'avaliacao', difficulty: 'facil',
  statement: 'Qual o resultado de…?\n```haskell\nmap (*2) [1,2,3]\n```',
  options: ['[1,2,3]', '[2,4,6]', '…', '…'],
  answer: { value: 'b', status: 'confirmed', basis: 'Verificada por execução em GHC.' },
  verify: [{ kind: 'eval', expr: 'map (*2) [1,2,3]' }],
}
```

`answer.status`: `official` (a fonte mostra a resposta correta), `confirmed` (verificada), `unofficial` (indicativa, não conta para a nota) ou `unknown` (então `value: null`; sem correção automática). `basis` explica a origem.

`verify` (opcional, corrido por `npm run validate` com o GHC):
- `{ kind: 'eval', expr, prelude?, expect? }`: o resultado da expressão tem de coincidir com a opção correta (ou com `expect`).
- `{ kind: 'typecheck', prelude?, template: 'v = $OPT' }`: só a opção correta, substituída em `$OPT`, compila (`expectOnly: false` permite várias).
- `{ kind: 'inferred', prelude?, name | expr, expect, noneOfOthers? }`: o tipo inferido pelo GHC.
- `{ kind: 'equiv', name, sig, original, inputs }`: as opções são definições; só as equivalentes ao `original` (nos `inputs`) podem ser a resposta.

Uma resposta `confirmed` precisa de `verify` (ou de uma confirmação externa descrita em `basis`).

### Prática

```js
{
  id: 'x-B01', n: 'Pergunta 7', type: 'practice', points: 1, source: { … }, theme: 'recursao', difficulty: 'facil',
  statement: 'Escreve `sumSquares :: [Int] -> Int` …',
  func: 'sumSquares', signature: 'sumSquares :: [Int] -> Int',
  constraints: [C.noImport('Não podes importar módulos.')],
  tests: [
    { call: 'sumSquares [1,2,3]', expect: '14', origin: 'enunciado' },
    { call: 'sumSquares [-2]', expect: '4', origin: 'gerado' },
  ],
  refs: [{ status: 'unofficial', origin: 'gerada', code: r`sumSquares :: [Int] -> Int
sumSquares [] = 0
sumSquares (x:xs) = x * x + sumSquares xs` }],
}
```

- `tests[]`: `{ call, expect, origin }` compara `show` das duas expressões; `cmp: 'set'` ignora a ordem de listas; `{ io, stdout, origin }` compara o que o programa imprime. `origin`: `'enunciado'` (exemplo do enunciado) ou `'gerado'`.
- `refs[]`: pelo menos uma solução de referência; `status` nunca pode ser `'official'`. `npm run validate` confirma que passam todos os testes e cumprem as restrições.
- `needs[]`: nomes de `ctx.support` disponíveis para a solução e para os testes.
- `capOnViolation` (ex. `0.25`): limita a nota se violar uma restrição "hard" (exceto imports).

### Restrições (`C` em `bank/lib.mjs`)

`C.noImport`, `C.recursion`, `C.noRecursion`, `C.comprehension`, `C.noComprehension`, `C.hof`, `C.noHof`, `C.forbid([ids], texto)`, `C.require([ids], texto)`. A verificação é **textual** (heurística), não semântica.

## Boas práticas (o banco de demonstração segue-as)

- **Os testes têm de rejeitar soluções erradas plausíveis**, não só aceitar a referência: inclui casos-limite (lista vazia, um elemento, repetidos, negativos, empates) e exemplos que distingam variantes comuns (ordem trocada, off-by-one, perder repetidos). O banco de demonstração prova-o em `test/mutants.mjs`.
- Em teoria, **nenhum distrator pode ser igual ao resultado verificado** (`npm run validate` verifica-o no banco de demonstração).
- Os enunciados só suportam o markdown descrito acima: **não uses `**negrito**`** (apareceria com asteriscos).
- Evita recursão infinita em soluções erradas que queiras testar: o servidor limita o tempo, mas não a memória.
- Se o teu banco derivar de exames de terceiros, mantém-no em `bank/src/` e `npm run check:originality` ajuda a garantir que um banco público não o reproduz.

## Validar

```bash
npm run build       # estrutura: ids únicos, temas, somas das cotações…
npm run validate    # referências vs testes; teoria verificada em GHC
npm run check:originality   # (opcional) compara o banco público com um banco privado em bank/src
```
