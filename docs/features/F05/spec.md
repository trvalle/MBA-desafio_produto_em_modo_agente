# F05 — Spec: Cancelamento, check-in e painel

## Escopo e contrato de integração

R04, R05, R10, R11, R12, R13.

**Provê:** Operações de gestão, cancelamento irreversível, entrada única e métricas consistentes.

**Consome:** F04: ingressos, preços e estados de ambos os canais; F02: autorização do organizador.

**Dono de arquivos:** src/operations.js e testes de operações.

As assinaturas, formatos e rotas em [architecture.md](../../architecture.md) são o acordo técnico comum; os critérios em [PRD.md](../../PRD.md) prevalecem sobre conveniências de implementação.

## Decisões técnicas

cancelEvent, checkIn e callbacks compartilham protocolo de escrita BEGIN IMMEDIATE. Cancelamento aplica mudanças do evento e ingressos atomicamente, satisfazendo o prazo de 10s. Dashboard deriva do estado persistido; checkedIn só soma quando status confirmed; revenueCents soma purchase priceCents só de confirmed. Ordem R10 começa por validação do código/evento e só depois estado cancelado.

## Invariantes e validação

- F05-AC01: Organizador cancela somente próprio evento published; operação é irreversível e bloqueia venda/edição/republicação (R11/R13).
- F05-AC02: Em ≤10s confirmed vira refunded e pending vira cancelled; callbacks tardios mantêm os estados (R11).
- F05-AC03: Check-in respeita mensagens e prioridade literal de R10, inclusive código de outro evento e evento cancelado.
- F05-AC04: Entrada é concedida uma única vez e checkedIn permanece informação separada do status (R09/R10).
- F05-AC05: Painel agrega ambos os canais e preços históricos: confirmados, pendentes, check-ins, vagas, receita e estornados exatamente conforme R12.
- F05-AC06: Painel cancelado mostra 0 confirmados/pendentes/check-ins/vagas/receita e número correto de estornados (R05/R11/R12).
- F05-AC07: Todas as operações e métricas exigem dono; dados de evento alheio não vazam (R13).

Não esperar rede dentro de transações. Não expor segredos, hashes de senha ou cartão completo. Falhas devem ser observáveis, sem alterar parcialmente estado. Contratos fixos da API e mensagens de negócio seguem o brief literalmente.

## Evidência e handoff

Entregar implementação e testes com commit identificável; informar mudanças de interfaces e limitações reais. Avaliador novo recebe brief/spec/contrato/checkout, sem justificativas destinadas a induzir aprovação. Integração posterior que altere comportamento exige regressão e nova avaliação pertinente; preservar relatórios existentes.

