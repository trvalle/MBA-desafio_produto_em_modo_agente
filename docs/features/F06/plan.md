# F06 — Plano

Wave 5. Ordem e dependências seguem o [PRD](../../PRD.md).

1. Construir navegação e páginas de conta, vitrine, ingressos e organizador.
2. Integrar gestão/eventos/painel/check-in/cancelamento com estados de erro.
3. Executar jornada em navegador real e registrar screenshots autênticos.
4. Rodar fluxo oficial na main/clone limpo e gates; obter avaliação separada e corrigir regressões.

## Gates de saída

- Executar checks do contrato e gates pertinentes, registrando comandos/efeitos reais.
- Corrigir FAIL e avaliar novamente com agente separado.
- Não considerar NOT RUN ou BLOCKED como aprovado.
- Criar relatório novo em reports/ com data, commit, ferramenta/modelo e resultado por item.
- Atualizar docs/state.json somente com estado verificado e caminho existente.
- Na integração final rodar npm run gates e o fluxo oficial; capturar regressões entre features.

