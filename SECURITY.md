# Segurança e privacidade

## Modelo de ameaça

Aplicação **local** de utilizador único. O servidor (`server/index.mjs`) escuta apenas em `127.0.0.1`. A funcionalidade "Executar testes" corre código Haskell do próprio utilizador com `runghc` e os privilégios dele: isto é intencional e **não deve ser exposto a uma rede** (não ponhas a aplicação atrás de um proxy público nem mudes o endereço de escuta).

## Execução de código Haskell: o que **não** está protegido

A aplicação **não** isola o código Haskell executado (sem *sandbox*, contentor nem limites de memória ou de sistema de ficheiros):

- o código corre com os teus privilégios e **herda as variáveis de ambiente** do terminal onde arrancaste a aplicação (que podem conter credenciais);
- pode ler/escrever ficheiros e lançar processos, e uma solução com recursão infinita pode consumir muita memória (só o tempo está limitado);
- por isso, **corre apenas código teu ou em que confies**, não abras ficheiros `.hs` de desconhecidos no editor, e nunca exponhas a aplicação a uma rede ou a um serviço público.

## Auditoria (30/10/2026, revista na V2)

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

### Revisão da V2

- `/api/health` é só de leitura (GET) e não expõe caminhos nem dados do utilizador; só devolve as versões do GHC.
- `PFL_DATA_DIR` só é lido no arranque do servidor (variável de ambiente local); não é configurável pela API.
- Sem material de terceiros no repositório (sem tipos de letra, imagens, CDN nem dependências), verificado por teste (`npm test`).
- O banco de demonstração (52 questões) foi escrito de raiz e comparado automaticamente com o banco privado (`npm run check:originality`): 0 linhas ou nomes de funções coincidentes e similaridade máxima de enunciados 0,11 (limite 0,20).
- A CI usa apenas `actions/checkout`, `actions/setup-node` e `haskell-actions/setup` (fixadas por versão maior), com `permissions: contents: read` e sem segredos.
- Os mecanismos existentes (verificação de `Host`/`Origin`, cabeçalho `X-PFL`, limites de tamanho e tempo) mantêm-se e continuam cobertos por testes.

### Limitações conhecidas

- O código executado pelo "Executar testes" não está em *sandbox* (herda o ambiente do utilizador).
- A verificação de restrições de técnica (recursão, HOF, imports) é textual e heurística.

## Comunicar um problema

Abre uma *issue* no repositório (sem incluir dados pessoais).
