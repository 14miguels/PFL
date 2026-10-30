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

**Correções**
- A interface escrevia o texto "null" em alguns ecrãs.
- Ids como `__proto__` já não são aceites pela API.

## 1.0.0

Versão inicial: exames originais e aleatórios, treino por tema, correção por testes com GHC, histórico.
