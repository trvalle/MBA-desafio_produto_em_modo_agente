# F04 — Plano

Wave 3. Ordem e dependências seguem o [PRD](../../PRD.md).

1. Implementar compra única transacional compartilhada pelos canais.
2. Implementar jobs persistidos e processamento idempotente contra estados terminais.
3. Implementar API parceira e endpoints autenticados mantendo precedência literal.
4. Exercitar contrato, rajadas repetidas e tempos padrão; completar verificação de callback após F05.
5. Obter avaliação independente; preservar reprovações e emitir novos relatórios.

## Gates de saída

- Executar checks do contrato e gates pertinentes, registrando comandos/efeitos reais.
- Corrigir FAIL e avaliar novamente com agente separado.
- Não considerar NOT RUN ou BLOCKED como aprovado.
- Criar relatório novo em reports/ com data, commit, ferramenta/modelo e resultado por item.
- Atualizar docs/state.json somente com estado verificado e caminho existente.
- Na integração final rodar npm run gates e o fluxo oficial; capturar regressões entre features.

