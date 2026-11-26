# F04 — Spec: Compras, gateway e API de parceiros

## Escopo e contrato de integração

R02, R03, R05, R06, R07, R08, R09 e API fixa; suporte R11/R12.

**Provê:** Compra atômica, reservas, código único, preço histórico, gateway persistido, ingressos próprios e contrato de parceiros.

**Consome:** F02: participante autenticado; F03: eventos, catálogo e propriedade dos dados. F01 é infraestrutura transitiva.

**Dono de arquivos:** src/purchases.js, src/partner.js e integração src/server.js.

As assinaturas, formatos e rotas em [architecture.md](../../architecture.md) são o acordo técnico comum; os critérios em [PRD.md](../../PRD.md) prevalecem sobre conveniências de implementação.

## Decisões técnicas

Transação BEGIN IMMEDIATE lê elegibilidade/ocupação, copia priceCents e insere pending atomicamente. API usa X-Api-Key, inclusive GET. JSON malformado e campos faltantes/invalidos entram em invalid_request após chave. Gateway persiste apenas approved e dueAt, nunca cartão; padrão 3000/35000 ms com worker 100ms. processPayments usa transação e condição pending/evento não cancelado. Atrasos reduzidos somente em testes diretos, nunca no Compose padrão.

## Invariantes e validação

- F04-AC01: Uma compra válida retorna 202 pending sem aguardar gateway, com ticketId/code únicos, reserva vaga e preço vigente copiado (R03/R05/R06/R09).
- F04-AC02: Cartão exige exatamente 16 dígitos; inválido não cria ingresso; gateway padrão respeita resultados e faixas do brief (R08).
- F04-AC03: Lotação nunca é excedida; sem vaga responde 409 sold_out; duas rajadas em eventos novos de capacidade 5 dão exatamente cinco 202 e vinte e cinco 409 (R07).
- F04-AC04: Recusa muda pending→declined e libera vaga; aprovação muda pending→confirmed. Callback não altera cancelled/refunded nem evento cancelado (R08/R11).
- F04-AC05: As três rotas parceiras seguem campos/status e exigem chave antes de qualquer validação; compra valida corpo→evento→lotação.
- F04-AC06: API lista eventos elegíveis com campos fixos, compra retorna ticketId/code/status e consulta de qualquer canal retorna ticketId/code/eventId/status/checkedIn.
- F04-AC07: GET /api/tickets retorna somente ingressos da conta autenticada com evento/status/código; compra API não se associa a conta por email (R09).

Não esperar rede dentro de transações. Não expor segredos, hashes de senha ou cartão completo. Falhas devem ser observáveis, sem alterar parcialmente estado. Contratos fixos da API e mensagens de negócio seguem o brief literalmente.

## Evidência e handoff

Entregar implementação e testes com commit identificável; informar mudanças de interfaces e limitações reais. Avaliador novo recebe brief/spec/contrato/checkout, sem justificativas destinadas a induzir aprovação. Integração posterior que altere comportamento exige regressão e nova avaliação pertinente; preservar relatórios existentes.

