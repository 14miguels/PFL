# Alterações

## 2.0.0

**Fiabilidade**
- O cronómetro conta só o tempo ativo: "Guardar e sair" pausa e retomar um exame antigo já não o entrega sozinho. Compatível com tentativas existentes; modo de tempo contínuo preparado para o futuro.
- Verificação do GHC no arranque (terminal e interface) e `/api/health`; mensagem clara quando falta.
- Estado de gravação visível e repetição automática se o servidor falhar.
- Porta ocupada: mensagem clara; `PFL_DATA_DIR` para escolher a pasta de dados.
- "Executar testes" traz o resultado para o ecrã.

**Primeira utilização e estudo**
- Correção final em paralelo (~4× mais rápida).
- Erros de compilação com dicas e ligação à linha do erro.
- "Praticar esta questão" no Banco; sugestão "treinar o tema mais fraco" no Início.
- Aviso de banco de demonstração, bloco "Como funciona" e `docs/BANK_FORMAT.md`.

**Acompanhamento e polimento**
- Histórico com gráfico da evolução da nota (/20), médias e tempo total de estudo.
- Cartões alinhados, chips de perguntas sequenciais no treino, `aria-label` nos estados, suporte a `prefers-reduced-motion`.
- Licença MIT, GitHub Actions (Node 20/22/24 × GHC 9.4/9.8/9.12 + job de interface).

**Banco de demonstração (52 questões)**
- 23 de teoria e 29 de prática, nos 14 temas, em 4 exames de 20 valores (Exame A, Exame B, Mini-teste A, Mini-teste B); dificuldade 21 fácil / 21 média / 10 difícil. Presets do exame aleatório: 6+14, 5+15 e 2+5.
- Todas as soluções de referência e respostas de teoria verificadas em GHC; mutantes (soluções erradas plausíveis) rejeitados pelos testes; distratores sem ambiguidade.
- `npm run check:originality`: compara o banco público com o privado (linhas, nomes de funções, similaridade de enunciados).
- Classificação ponta a ponta de cada exame (referências = 20/20, em branco = 0, penalização) e conclusão de cada exame pela interface.

**Correções**
- A lista de exames mostrava um ponto e vírgula solto nos avisos sobre respostas.
- A interface escrevia o texto "null" em alguns ecrãs.
- Ids como `__proto__` já não são aceites pela API.

## 1.0.0

Versão inicial: exames originais e aleatórios, treino por tema, correção por testes com GHC, histórico.
