# F03 — Spec: Eventos e catálogo

## Escopo e contrato de integração

R01, R02, R03, R04, R05, R13.

**Provê:** Domínio independente de eventos, propriedade, criação/edição/publicação e catálogo com vagas.

**Consome:** F01: schema, transações e HTTP. Adapter HTTP consome F02 somente no ponto de integração após a wave paralela.

**Dono de arquivos:** src/events.js e testes do domínio de eventos.

As assinaturas, formatos e rotas em [architecture.md](../../architecture.md) são o acordo técnico comum; os critérios em [PRD.md](../../PRD.md) prevalecem sobre conveniências de implementação.

## Decisões técnicas

Domínio recebe organizerId explicitamente e não depende de sessão. Adapter eventsHandler passa requireUser(db,req,'organizer') após integração F02/F03. Esta dependência de integração é CF11, não uma aresta de implementação. Atualização de capacidade e leitura de ocupação na mesma BEGIN IMMEDIATE; publicação/edição respeitam status. Não somar declined/refunded/cancelled à ocupação. Preço permanece inteiro.

## Invariantes e validação

- F03-AC01: Criar evento exige nome, início futuro, local, capacidade inteira ≥1 e preço em centavos positivo; evento nasce draft (R01/R02).
- F03-AC02: Edição revalida início futuro e não reduz capacidade abaixo de pending+confirmed; aumento é aceito (R01/R03/R05).
- F03-AC03: Somente published não cancelado aparece no catálogo, com preço e availableSeats corretos (R02/R05).
- F03-AC04: Propriedade é aplicada no domínio: lista só próprios e ownedEvent/update/publish não entregam dados de outro organizador (R13).
- F03-AC05: Evento cancelado não pode ser editado nem republicado (R11).
- F03-AC06: Cada evento pode ser obtido por ID para sua URL própria de gestão, sem vazar dados a outro papel/dono (R04/R13).

Não esperar rede dentro de transações. Não expor segredos, hashes de senha ou cartão completo. Falhas devem ser observáveis, sem alterar parcialmente estado. Contratos fixos da API e mensagens de negócio seguem o brief literalmente.

## Evidência e handoff

Entregar implementação e testes com commit identificável; informar mudanças de interfaces e limitações reais. Avaliador novo recebe brief/spec/contrato/checkout, sem justificativas destinadas a induzir aprovação. Integração posterior que altere comportamento exige regressão e nova avaliação pertinente; preservar relatórios existentes.

