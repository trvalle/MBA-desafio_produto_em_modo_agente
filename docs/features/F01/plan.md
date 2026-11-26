# F01 — Plano

Wave 1. Ordem e dependências seguem o [PRD](../../PRD.md).

1. Criar container, schema e utilitários compartilhados antes das features dependentes.
2. Implementar seed idempotente e scripts up/down/gates com prontidão e isolamento.
3. Verificar clone limpo, reinício, rollback e gates; handoff das verificações de login e compra real para F02/F04.
4. Submeter a avaliador separado; corrigir e gerar novo relatório se necessário.

## Gates de saída

- Executar checks do contrato e gates pertinentes, registrando comandos/efeitos reais.
- Corrigir FAIL e avaliar novamente com agente separado.
- Não considerar NOT RUN ou BLOCKED como aprovado.
- Criar relatório novo em reports/ com data, commit, ferramenta/modelo e resultado por item.
- Atualizar docs/state.json somente com estado verificado e caminho existente.
- Na integração final rodar npm run gates e o fluxo oficial; capturar regressões entre features.

