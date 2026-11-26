# F02 — Plano

Wave 2. Ordem e dependências seguem o [PRD](../../PRD.md).

1. Implementar cadastro/login/logout/me e helpers com contratos de F01.
2. Testar papéis, sessão, seed, senhas inválidas e tentativa de elevar papel.
3. Produzir commits substantivos durante a wave paralela F02/F03 e abrir PR próprio.
4. Após integração, verificar proteção real e encaminhar avaliação independente.

## Gates de saída

- Executar checks do contrato e gates pertinentes, registrando comandos/efeitos reais.
- Corrigir FAIL e avaliar novamente com agente separado.
- Não considerar NOT RUN ou BLOCKED como aprovado.
- Criar relatório novo em reports/ com data, commit, ferramenta/modelo e resultado por item.
- Atualizar docs/state.json somente com estado verificado e caminho existente.
- Na integração final rodar npm run gates e o fluxo oficial; capturar regressões entre features.

