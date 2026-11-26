# F03 — Contrato de avaliação

## Pré-requisitos

Leia docs/brief.md, docs/PRD.md, esta spec e docs/architecture.md. Use checkout do commit declarado, Docker com Compose e Node.js LTS no host; Windows executa desenvolvimento via WSL. Execute npm run up quando o teste depende do produto. Credenciais e X-Api-Key são as demonstrativas do README. Use registros novos com data futura e portas isoladas quando necessário. Gateway padrão deve permanecer em 3000/35000ms para verificações temporais; testes diretos acelerados não substituem estas evidências.

Avaliador: agente distinto do implementador, em contexto novo/vazio. Não modificar implementação ou critérios durante avaliação. Se dependência necessária ainda não está integrada, registrar NOT RUN/BLOCKED e não aprovar a feature. Fixtures de domínio são permitidas onde explicitamente indicadas, mas não substituem o fluxo final real.

## Itens verificáveis e mapeamento integral

| Item | Critério do PRD | Procedimento / efeito verificável |
|---|---|---|
| F03-T01 | F03-AC01 | Criar válido e rejeitar dados ausentes, data passada, capacidade zero/fracionária e preço zero. |
| F03-T02 | F03-AC02 | Criar ingressos de fixture, tentar capacidade menor que ocupação, aumentar e tentar data passada. |
| F03-T03 | F03-AC03 | Comparar catálogo antes/depois da publicação e após cancelamento integrado. |
| F03-T04 | F03-AC04 | Usar IDs dos dois organizadores em chamadas de serviço e HTTP integrado, inclusive URL direta. |
| F03-T05 | F03-AC05 | Usar estado cancelado de fixture e, após F05, evento cancelado real; rejeitar update/publish. |
| F03-T06 | F03-AC06 | GET autenticado do próprio evento funciona; outro organizador, participante e visitante não obtêm dados. |
| F03-CF02 | CF02 | Schema e transação sustentam criação/publicação e rejeição atômica de redução abaixo da ocupação. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |
| F03-CF11 | CF11 | Após integrar a wave 2, o adapter HTTP de eventos exige organizador e propriedade; domínio F03 permanece implementável sem F02. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |

## Evidências e veredito

Para cada item registrar PASS, FAIL, NOT RUN ou BLOCKED, comandos/entrada, saída ou efeito observado e referência de evidência. PASS exige execução real ou inspeção documental objetiva quando o item é documental; teste previsto não é teste realizado. Rodar npm run gates e registrar exit code, sem presumir que gates cobrem todos os itens acima. Screenshots reais comprovam interface; HTTP e dados observados comprovam contratos. Registrar latências quando relevantes.

Relatório novo em docs/features/F03/reports/, com data UTC, SHA avaliado, ferramenta/modelo efetivos, agente e declaração de separação, tabela de todos os itens, falhas/limitações e veredito. Após o primeiro commit desse arquivo, nunca alterá-lo. Reprovação retorna ao implementador; nova execução produz novo arquivo. Estado só pode apontar feature concluída quando seu último relatório aprovar todos os itens. Fluxo final na main em clone limpo continua obrigatório.

