# Segurança e privacidade

## Modelo de ameaça

Aplicação **local** de utilizador único. O servidor (`server/index.mjs`) escuta apenas em `127.0.0.1`. A funcionalidade "Executar testes" corre código Haskell do próprio utilizador com `runghc` e os privilégios dele: isto é intencional e **não deve ser exposto a uma rede** (não ponhas a aplicação atrás de um proxy público nem mudes o endereço de escuta).

## Auditoria (30/10/2026)

Revisão manual do código publicado e verificação do conteúdo a publicar.

| Área | Resultado |
|---|---|
| Segredos (tokens, chaves, `.env`, credenciais) | Nenhum no repositório; `.env*` está no `.gitignore`. |
| Dados pessoais | O histórico/respostas ficam em `data/` (ignorado). Nenhum nome, e-mail ou caminho local nos ficheiros publicados. |
| Exames e enunciados | O banco real (`bank/src`, `bank/ocr`, `bank/assets`, `bank/questions.json`, `bank/REVIEW.md`) e `*.pdf` estão excluídos; o repositório só tem questões de demonstração originais. |
| Dependências | Zero (apenas Node e GHC): sem cadeia de abastecimento npm. |
| CSRF / DNS rebinding | Verificação de `Host` (só loopback), de `Origin` (igual ao host) e cabeçalho `X-PFL: 1` + `application/json` em todas as escritas. |
| Travessia de diretórios | Ficheiros estáticos limitados a `public/`; `workspace` só aceita ids do banco. Coberto por testes. |
| XSS | A interface não usa `innerHTML`; todo o texto entra como nó de texto. |
| Corpos/ficheiros | Corpo máx. 512 KB, código máx. 100 000 caracteres, saída dos processos limitada, tempo limite por execução, 2 execuções em simultâneo. |
| Ficheiros temporários | Cada execução usa um diretório temporário próprio, removido no fim. |

### Corrigido durante a auditoria

- Ids como `__proto__` eram aceites em `/api/attempts/:id` (alteravam o protótipo do objeto de estado). Passaram a ser rejeitados (teste incluído).
- A interface escrevia o texto "null" em alguns ecrãs (`Element.append(null)`), p. ex. na página inicial sem tentativas em curso e na revisão. Corrigido e coberto por teste.

### Limitações conhecidas

- O código executado pelo "Executar testes" não está em *sandbox* (herda o ambiente do utilizador).
- A verificação de restrições de técnica (recursão, HOF, imports) é textual e heurística.

## Comunicar um problema

Abre uma *issue* no repositório (sem incluir dados pessoais).
