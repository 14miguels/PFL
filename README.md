# PFL Prep — preparação para exames de Programação Funcional (Haskell)

Aplicação local (HTML/JS + Node, **sem dependências npm**) para praticar Haskell em formato de exame: exames completos, exames aleatórios com a mesma distribuição de cotações, treino por tema, correção automática por testes e histórico de desempenho.

> **Este repositório não inclui exames, enunciados nem PDFs da FEUP.** Vem com um banco de **52 questões de demonstração originais** (23 de teoria e 29 de prática, nos 14 temas da UC, repartidas por 4 exames fictícios de 20 valores) para a aplicação funcionar logo após clonar. Podes carregar o teu próprio banco localmente (ver [Usar o teu próprio banco](#usar-o-teu-próprio-banco)).

## Requisitos

- [Node.js](https://nodejs.org/) ≥ 20
- [GHC](https://www.haskell.org/ghc/) com `runghc` no `PATH` (usado para correr o teu código e os testes). Desenvolvido com GHC 9.12; a CI cobre 9.4, 9.8 e 9.12 (ver [Qualidade](#qualidade))
- Opcional: Google Chrome/Chromium e Node ≥ 22, só para os testes de interface (são ignorados se faltarem)

Se o GHC não estiver instalado, a aplicação arranca na mesma, mas avisa (no terminal e na interface) que as perguntas práticas não podem ser corrigidas.

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
| **Exame original** | Refaz um exame completo (teoria → prática) com a ordem e cotações definidas, temporizador opcional e sem soluções até entregares. A nota final é convertida para a escala 0–20. |
| **Exame aleatório** | Gera um exame com uma estrutura de cotações à escolha (presets ou personalizada), filtrável por tema, exame e dificuldade. |
| **Treino por tema** | Escolhes matérias; feedback imediato; podes ver as soluções de referência (rotuladas). |
| **Repetir erradas** | Cria uma tentativa só com as perguntas erradas/parciais. |
| **Histórico** | Gráfico da evolução da nota (/20), tempo total de estudo, desempenho por tema e todas as tentativas. |
| **Banco de questões** | Consulta e filtra todas as perguntas; "Praticar esta questão" abre-a com feedback imediato. |

Teoria: escolha múltipla. Prática: editor, **Descarregar/Abrir .hs**, **Guardar em ficheiro** (`data/workspace/<id>.hs`) e **Executar testes** (⌘/Ctrl+Enter). Atalhos: ←/→ navegam, a–e escolhem a opção.

- **Tempo:** "Guardar e sair" pausa o cronómetro; podes retomar um exame mais tarde sem perder tempo nem o entregar sem querer.
- **Erros de compilação:** a aplicação aponta a linha do erro (clica para a selecionar no editor) e dá dicas para os erros mais comuns.
- **Gravação:** o progresso guarda-se sozinho; se o servidor local falhar, aparece um aviso e volta a tentar.

O teu histórico fica em `data/state.json` (**local e ignorado pelo Git**; nunca é publicado).

## Como funciona a correção

- Teoria: cada resposta tem um estado — **Oficial**, **Confirmada** (verificada em GHC), **Não oficial** (indicativa, não conta para a nota) ou **Desconhecida** (sem correção automática). A penalização por resposta errada só se aplica quando o exame a define.
- Prática: o teu código corre com `runghc` contra testes; a nota é uma **estimativa por testes** que podes ajustar (autoavaliação). Os testes marcados *enunciado* vêm dos exemplos do enunciado, os *gerado* foram criados pelo autor do banco. Nenhuma solução de referência é oficial.
- Restrições técnicas (recursão obrigatória, sem comprehensions/HOF, sem imports…) são verificadas por **análise textual** — é uma heurística.

## Usar o teu próprio banco

O formato está descrito em [docs/BANK_FORMAT.md](docs/BANK_FORMAT.md); o banco de demonstração (`bank/demo/`) serve de exemplo. Para usar o teu:

1. Cria `bank/src/` com um `manifest.mjs` (`export default { files: ['meu-exame'], presets? }`) e um módulo por exame, como em `bank/demo/`.
2. `npm start` usa `bank/src/` automaticamente quando existe (força a demonstração com `PFL_BANK=demo`).

`bank/src/`, `bank/ocr/`, `bank/assets/`, `bank/questions.json` e `*.pdf` estão no `.gitignore`: o teu banco fica **só na tua máquina**. Antes de publicares qualquer banco com enunciados de terceiros, confirma os direitos de redistribuição.

## Qualidade

```bash
npm test                     # lógica, servidor/API, banco de demonstração, classificação dos exames e interface (Chrome headless)
npm run validate             # referências vs testes; teoria verificada em GHC (usa o banco ativo: bank/src se existir)
PFL_BANK=demo npm run validate   # o mesmo, só para o banco de demonstração
npm run check:originality    # compara o banco público com o privado (só faz algo se existir bank/src)
npm run test:private         # só se tiveres test/private/ (testes ligados a um banco privado)
PFL_SKIP_E2E=1 npm test      # sem os testes de interface (não precisam de Chrome)
```

Os testes públicos constroem sempre o banco de demonstração, por isso não dependem do que tenhas em `bank/src/`. Para além das soluções de referência, validam **mutantes**: soluções erradas mas plausíveis que os testes de cada exercício têm de rejeitar. A CI (GitHub Actions) corre `npm test` com Node 20, 22 e 24 e GHC 9.4, 9.8 e 9.12, mais um job de interface.

## Segurança e privacidade

O servidor só escuta em `127.0.0.1`, valida `Host` e `Origin` e exige um cabeçalho próprio nas escritas.

> ⚠️ **A execução de código Haskell não está isolada.** "Executar testes" corre o código do editor com `runghc`, com os teus privilégios e o teu ambiente (incluindo variáveis de ambiente). Corre apenas código teu ou em que confies, **não** abras ficheiros `.hs` de desconhecidos e **nunca** exponhas esta aplicação à rede nem a ponhas num servidor público.

Detalhes e resultado da auditoria em [SECURITY.md](SECURITY.md).

## Licença

Código e questões de demonstração sob a [licença MIT](LICENSE). O repositório não contém material de terceiros (sem tipos de letra, imagens nem dependências) e **não inclui exames da FEUP**: se usares os teus, ficam fora do repositório e não são abrangidos por esta licença.

## Estrutura

```
bank/lib.mjs        temas e restrições partilhados      bank/demo/  banco de demonstração (público)
docs/               formato do banco                    .github/    CI
bank/src/           banco privado (ignorado pelo Git)
server/             API, execução de testes (Haskell), verificação de restrições
public/             interface (sem build)               test/       testes públicos
scripts/            build do banco, validação, originalidade, relatórios
```
