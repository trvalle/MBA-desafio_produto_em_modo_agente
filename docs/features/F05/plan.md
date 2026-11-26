# F05 — Plano

Wave 4. Ordem e dependências seguem o [PRD](../../PRD.md).

1. Implementar operações transacionais e handlers autorizados.
2. Testar precedência de check-in e disputa por mesmo ingresso.
3. Executar cenários combinados dos dois canais, preço histórico e callback atrasado.
4. Submeter avaliação independente com evidência temporal, HTTP e métricas.

## Gates de saída

- Executar checks do contrato e gates pertinentes, registrando comandos/efeitos reais.
- Corrigir FAIL e avaliar novamente com agente separado.
- Não considerar NOT RUN ou BLOCKED como aprovado.
- Criar relatório novo em reports/ com data, commit, ferramenta/modelo e resultado por item.
- Atualizar docs/state.json somente com estado verificado e caminho existente.
- Na integração final rodar npm run gates e o fluxo oficial; capturar regressões entre features.

