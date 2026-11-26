# F05 — Contrato de avaliação

## Pré-requisitos

Leia docs/brief.md, docs/PRD.md, esta spec e docs/architecture.md. Use checkout do commit declarado, Docker com Compose e Node.js LTS no host; Windows executa desenvolvimento via WSL. Execute npm run up quando o teste depende do produto. Credenciais e X-Api-Key são as demonstrativas do README. Use registros novos com data futura e portas isoladas quando necessário. Gateway padrão deve permanecer em 3000/35000ms para verificações temporais; testes diretos acelerados não substituem estas evidências.

Avaliador: agente distinto do implementador, em contexto novo/vazio. Não modificar implementação ou critérios durante avaliação. Se dependência necessária ainda não está integrada, registrar NOT RUN/BLOCKED e não aprovar a feature. Fixtures de domínio são permitidas onde explicitamente indicadas, mas não substituem o fluxo final real.

## Itens verificáveis e mapeamento integral

| Item | Critério do PRD | Procedimento / efeito verificável |
|---|---|---|
| F05-T01 | F05-AC01 | Cancelar publicado; comprovar listas vazias para o evento, compra 404 e edição/publicação rejeitadas; tentar cancelar draft e evento alheio. |
| F05-T02 | F05-AC02 | Criar compra 0003 e 0001, esperar apenas a rápida, cancelar antes de 30s, consultar em ≤10s e depois de 45s da lenta. |
| F05-T03 | F05-AC03 | Exercitar inexistente/outro evento, cancelado, não confirmado, reutilizado e sucesso; código inválido em evento cancelado deve permanecer inválido se campo estiver disponível. |
| F05-T04 | F05-AC04 | Submeter o mesmo código duas vezes e simultaneamente; somente uma entrada liberada e ticket mantém confirmed/checkedIn:true. |
| F05-T05 | F05-AC05 | Reproduzir E1: 3 confirmados, 0 pendentes, 0→1 check-ins, 0 vagas, R$350,00, 0 estornados; usar compras de R$100/R$100/R$150. |
| F05-T06 | F05-AC06 | Reproduzir E3 com uma compra rápida e uma lenta canceladas: todos zeros e refunded=1; verificar ingresso antes utilizado não conta check-in após estorno. |
| F05-T07 | F05-AC07 | Tentar dashboard/cancel/check-in com visitante, participante e outro organizador; conferir respostas sem dados do evento. |
| F05-CF05 | CF05 | Ingressos dos dois canais contam igualmente no painel/check-in/cancelamento; callback lento não reverte cancelamento. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |
| F05-CF06 | CF06 | Autorização protege operações e painel de visitante, participante e organizador não dono. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |

## Evidências e veredito

Para cada item registrar PASS, FAIL, NOT RUN ou BLOCKED, comandos/entrada, saída ou efeito observado e referência de evidência. PASS exige execução real ou inspeção documental objetiva quando o item é documental; teste previsto não é teste realizado. Rodar npm run gates e registrar exit code, sem presumir que gates cobrem todos os itens acima. Screenshots reais comprovam interface; HTTP e dados observados comprovam contratos. Registrar latências quando relevantes.

Relatório novo em docs/features/F05/reports/, com data UTC, SHA avaliado, ferramenta/modelo efetivos, agente e declaração de separação, tabela de todos os itens, falhas/limitações e veredito. Após o primeiro commit desse arquivo, nunca alterá-lo. Reprovação retorna ao implementador; nova execução produz novo arquivo. Estado só pode apontar feature concluída quando seu último relatório aprovar todos os itens. Fluxo final na main em clone limpo continua obrigatório.

