# F03 — Plano

Wave 2. Ordem e dependências seguem o [PRD](../../PRD.md).

1. Implementar domínio e testes independentes de auth com IDs/fixtures e contrato F01.
2. Implementar catálogo e adapter conforme arquitetura; sua ativação autenticada ocorre após integração F02/F03.
3. Entregar commits e PR próprios simultaneamente com F02.
4. Validar CF11 no adapter integrado e encaminhar contrato completo para avaliação independente.

## Gates de saída

- Executar checks do contrato e gates pertinentes, registrando comandos/efeitos reais.
- Corrigir FAIL e avaliar novamente com agente separado.
- Não considerar NOT RUN ou BLOCKED como aprovado.
- Criar relatório novo em reports/ com data, commit, ferramenta/modelo e resultado por item.
- Atualizar docs/state.json somente com estado verificado e caminho existente.
- Na integração final rodar npm run gates e o fluxo oficial; capturar regressões entre features.

