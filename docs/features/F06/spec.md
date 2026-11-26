# F06 — Spec: Interface e jornada integrada

## Escopo e contrato de integração

R01–R13 na interface e integração.

**Provê:** Interface navegável do produto e evidências da jornada real ponta a ponta.

**Consome:** F02: contas/sessões; F03: eventos; F04: compras/ingressos; F05: operações/painel.

**Dono de arquivos:** public/* e testes de navegador.

As assinaturas, formatos e rotas em [architecture.md](../../architecture.md) são o acordo técnico comum; os critérios em [PRD.md](../../PRD.md) prevalecem sobre conveniências de implementação.

## Decisões técnicas

SPA estática HTML/CSS/JS servida pelo Node com fallback para rotas de interface. Gestão busca evento autorizado antes de desenhar informações. Dados dinâmicos via textContent. Recarregar página basta para atualização; polling não é requisito. UI usa rótulos pendente/confirmado/recusado/cancelado/estornado; API mantém valores ingleses. Design não é critério acadêmico; legibilidade e controles funcionais são.

## Invariantes e validação

- F06-AC01: Visitante vê vitrine apenas de eventos elegíveis; participante cria conta, entra e sai pela interface.
- F06-AC02: Checkout mostra pending e depois status/código/evento em Meus ingressos; esgotado exibe exatamente Ingressos esgotados (R06–R09).
- F06-AC03: Organizador cria/edita/publica em página de gestão de URL própria; erros de data/capacidade são visíveis e não alteram evento (R01/R03/R04).
- F06-AC04: Gestão apresenta painel, check-in e cancelamento com mensagens literais e ações bloqueadas após cancelar (R10–R12).
- F06-AC05: Acesso direto à gestão alheia não renderiza nome/números/ingressos para organizador B, participante ou visitante (R13).
- F06-AC06: Dados não confiáveis são renderizados como texto; navegação funciona em reload de URL direta e status usa rótulos PT-BR.
- F06-AC07: Passos 1–17 do fluxo oficial passam na main em clone limpo, com UI, API, concorrência e restart. O passo18 permanece obrigatório na auditoria global posterior aos relatórios e estado, conforme [ADR](../../adr-evaluation-order.md).

Não esperar rede dentro de transações. Não expor segredos, hashes de senha ou cartão completo. Falhas devem ser observáveis, sem alterar parcialmente estado. Contratos fixos da API e mensagens de negócio seguem o brief literalmente.

## Evidência e handoff

Entregar implementação e testes com commit identificável; informar mudanças de interfaces e limitações reais. Avaliador novo recebe brief/spec/contrato/checkout, sem justificativas destinadas a induzir aprovação. Integração posterior que altere comportamento exige regressão e nova avaliação pertinente; preservar relatórios existentes.

