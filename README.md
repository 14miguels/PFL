# PFL Prep — preparação para exames de Programação Funcional (Haskell)

Aplicação local (HTML/JS + Node, **sem dependências npm**) para praticar Haskell em formato de exame: exames completos, exames aleatórios com a mesma distribuição de cotações, treino por tema, correção automática por testes e histórico de desempenho.

> **Este repositório não inclui exames, enunciados nem PDFs da FEUP.** Vem com um banco de **16 questões de demonstração originais** (2 exames fictícios) para a aplicação funcionar logo após clonar. Podes carregar o teu próprio banco localmente (ver [Usar o teu próprio banco](#usar-o-teu-próprio-banco)).

## Requisitos

- [Node.js](https://nodejs.org/) ≥ 20
- [GHC](https://www.haskell.org/ghc/) com `runghc` no `PATH` (usado para correr o teu código e os testes)
- Opcional: Google Chrome, só para os testes de interface (são ignorados se não existir)

## Instalação e utilização

```bash
git clone https://github.com/14miguels/PFL.git
cd PFL
npm start          # constrói o banco e abre o servidor em http://127.0.0.1:4577
```

Não há `npm install`: o projeto não tem dependências. Abre <http://127.0.0.1:4577> no browser.
Para usar outra porta: `PORT=5000 npm start`.

| Modo | O que faz |
|---|---|
| **Exame original** | Refaz um exame completo (teoria → prática) com a ordem e cotações definidas, temporizador opcional e sem soluções até entregares. |
| **Exame aleatório** | Gera um exame com uma estrutura de cotações à escolha (presets ou personalizada), filtrável por tema, exame e dificuldade. |
| **Treino por tema** | Escolhes matérias; feedback imediato; podes ver as soluções de referência (rotuladas). |
| **Repetir erradas** | Cria uma tentativa só com as perguntas erradas/parciais. |
| **Histórico** | Tentativas, desempenho por tema e exercícios concluídos. |

Teoria: escolha múltipla. Prática: editor, **Descarregar/Abrir .hs**, **Guardar em ficheiro** (`data/workspace/<id>.hs`) e **Executar testes** (⌘/Ctrl+Enter). Atalhos: ←/→ navegam, a–e escolhem a opção.

O teu histórico fica em `data/state.json` (**local e ignorado pelo Git**; nunca é publicado).

## Como funciona a correção

- Teoria: cada resposta tem um estado — **Oficial**, **Confirmada** (verificada em GHC), **Não oficial** (indicativa, não conta para a nota) ou **Desconhecida** (sem correção automática). A penalização por resposta errada só se aplica quando o exame a define.
- Prática: o teu código corre com `runghc` contra testes; a nota é uma **estimativa por testes** que podes ajustar (autoavaliação). Os testes marcados *enunciado* vêm dos exemplos do enunciado, os *gerado* foram criados pelo autor do banco. Nenhuma solução de referência é oficial.
- Restrições técnicas (recursão obrigatória, sem comprehensions/HOF, sem imports…) são verificadas por **análise textual** — é uma heurística.

## Usar o teu próprio banco

O banco de demonstração está em `bank/demo/` (`manifest.mjs` + um módulo por exame; ver `bank/demo/demo-a.mjs` para o formato completo de questões de teoria e de prática). Para usar o teu:

1. Cria `bank/src/` com um `manifest.mjs` (`export default { files: ['meu-exame'], presets? }`) e um módulo por exame, como em `bank/demo/`.
2. `npm start` usa `bank/src/` automaticamente quando existe (força a demonstração com `PFL_BANK=demo`).

`bank/src/`, `bank/ocr/`, `bank/assets/`, `bank/questions.json` e `*.pdf` estão no `.gitignore`: o teu banco fica **só na tua máquina**. Antes de publicares qualquer banco com enunciados de terceiros, confirma os direitos de redistribuição.

## Qualidade

```bash
npm test               # lógica, servidor/API, banco de demonstração (inclui validação em GHC) e interface (Chrome headless)
npm run validate       # referências vs testes; teoria verificada em GHC
npm run test:private   # só se tiveres test/private/ (testes ligados a um banco privado)
```

Os testes públicos constroem sempre o banco de demonstração, por isso não dependem do que tenhas em `bank/src/`.

## Segurança e privacidade

O servidor só escuta em `127.0.0.1`, valida `Host` e `Origin` e exige um cabeçalho próprio nas escritas. **Executar testes corre código teu com `runghc`, com os teus privilégios** — não expões a aplicação à rede. Detalhes e resultado da auditoria em [SECURITY.md](SECURITY.md).

## Estrutura

```
bank/lib.mjs        temas e restrições partilhados      bank/demo/  banco de demonstração (público)
bank/src/           banco privado (ignorado pelo Git)
server/             API, execução de testes (Haskell), verificação de restrições
public/             interface (sem build)               test/       testes públicos
scripts/            build do banco, validação, relatórios
```
