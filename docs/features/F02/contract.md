# F02 — Contrato de avaliação

## Pré-requisitos

Leia docs/brief.md, docs/PRD.md, esta spec e docs/architecture.md. Use checkout do commit declarado, Docker com Compose e Node.js LTS no host; Windows executa desenvolvimento via WSL. Execute npm run up quando o teste depende do produto. Credenciais e X-Api-Key são as demonstrativas do README. Use registros novos com data futura e portas isoladas quando necessário. Gateway padrão deve permanecer em 3000/35000ms para verificações temporais; testes diretos acelerados não substituem estas evidências.

Avaliador: agente distinto do implementador, em contexto novo/vazio. Não modificar implementação ou critérios durante avaliação. Se dependência necessária ainda não está integrada, registrar NOT RUN/BLOCKED e não aprovar a feature. Fixtures de domínio são permitidas onde explicitamente indicadas, mas não substituem o fluxo final real.

## Itens verificáveis e mapeamento integral

| Item | Critério do PRD | Procedimento / efeito verificável |
|---|---|---|
| F02-T01 | F02-AC01 | Registrar conta nova, autenticar e consultar /api/auth/me; fazer logout e comprovar user:null. |
| F02-T02 | F02-AC02 | Enviar role organizer no cadastro e comprovar rejeição ou persistência participant. |
| F02-T03 | F02-AC03 | Inspecionar respostas e Set-Cookie; conferir ausência de hash e invalidação após logout. |
| F02-T04 | F02-AC04 | Testar dois organizadores, participante e senha errada. |
| F02-T05 | F02-AC05 | Exercitar helpers e, após integração, rotas protegidas com visitante e participante. |
| F02-CF01 | CF01 | Seed e utilitários sustentam login das três contas com papéis corretos. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |

## Evidências e veredito

Para cada item registrar PASS, FAIL, NOT RUN ou BLOCKED, comandos/entrada, saída ou efeito observado e referência de evidência. PASS exige execução real ou inspeção documental objetiva quando o item é documental; teste previsto não é teste realizado. Rodar npm run gates e registrar exit code, sem presumir que gates cobrem todos os itens acima. Screenshots reais comprovam interface; HTTP e dados observados comprovam contratos. Registrar latências quando relevantes.

Relatório novo em docs/features/F02/reports/, com data UTC, SHA avaliado, ferramenta/modelo efetivos, agente e declaração de separação, tabela de todos os itens, falhas/limitações e veredito. Após o primeiro commit desse arquivo, nunca alterá-lo. Reprovação retorna ao implementador; nova execução produz novo arquivo. Estado só pode apontar feature concluída quando seu último relatório aprovar todos os itens. Fluxo final na main em clone limpo continua obrigatório.

