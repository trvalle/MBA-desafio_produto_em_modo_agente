# F04 — Contrato de avaliação

## Pré-requisitos

Leia docs/brief.md, docs/PRD.md, esta spec e docs/architecture.md. Use checkout do commit declarado, Docker com Compose e Node.js LTS no host; Windows executa desenvolvimento via WSL. Execute npm run up quando o teste depende do produto. Credenciais e X-Api-Key são as demonstrativas do README. Use registros novos com data futura e portas isoladas quando necessário. Gateway padrão deve permanecer em 3000/35000ms para verificações temporais; testes diretos acelerados não substituem estas evidências.

Avaliador: agente distinto do implementador, em contexto novo/vazio. Não modificar implementação ou critérios durante avaliação. Se dependência necessária ainda não está integrada, registrar NOT RUN/BLOCKED e não aprovar a feature. Fixtures de domínio são permitidas onde explicitamente indicadas, mas não substituem o fluxo final real.

## Itens verificáveis e mapeamento integral

| Item | Critério do PRD | Procedimento / efeito verificável |
|---|---|---|
| F04-T01 | F04-AC01 | Comprar pelos dois canais e inspecionar resposta imediata, ocupação e valor persistido. |
| F04-T02 | F04-AC02 | Testar inválidos e finais 0001/0002/0003/0004/outro; medir 2–5s ou 30–40s reais conforme final. |
| F04-T03 | F04-AC03 | Executar 30 requests simultâneos em cada um de dois eventos, guardar distribuição HTTP e ocupação final; repetir preventivamente. |
| F04-T04 | F04-AC04 | Observar liberação e confirmação; após F05 cancelar com callback lento pendente e verificar estado depois de 45s. |
| F04-T05 | F04-AC05 | Testar chave ausente/errada 401 unauthorized nas três rotas; corpo inválido 422 invalid_request mesmo com evento ausente; evento draft/cancelado/ausente 404 event_not_available; esgotado 409 sold_out; consulta inexistente 404 ticket_not_found. |
| F04-T06 | F04-AC06 | Conferir JSON e tipos dos três endpoints, inclusive ingresso comprado pela vitrine e IDs como strings. |
| F04-T07 | F04-AC07 | Comprar autenticado e via parceiro com o mesmo email; verificar isolamento e propriedade em duas contas. |
| F04-CF03 | CF03 | Sessão de participante vincula apenas compras da vitrine à conta; visitante/papel incorreto não compra pelo endpoint autenticado. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |
| F04-CF04 | CF04 | Evento draft não vende, publicado vende com preço vigente e capacidade respeitada; catálogo e compra concordam. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |

## Evidências e veredito

Para cada item registrar PASS, FAIL, NOT RUN ou BLOCKED, comandos/entrada, saída ou efeito observado e referência de evidência. PASS exige execução real ou inspeção documental objetiva quando o item é documental; teste previsto não é teste realizado. Rodar npm run gates e registrar exit code, sem presumir que gates cobrem todos os itens acima. Screenshots reais comprovam interface; HTTP e dados observados comprovam contratos. Registrar latências quando relevantes.

Relatório novo em docs/features/F04/reports/, com data UTC, SHA avaliado, ferramenta/modelo efetivos, agente e declaração de separação, tabela de todos os itens, falhas/limitações e veredito. Após o primeiro commit desse arquivo, nunca alterá-lo. Reprovação retorna ao implementador; nova execução produz novo arquivo. Estado só pode apontar feature concluída quando seu último relatório aprovar todos os itens. Fluxo final na main em clone limpo continua obrigatório.

