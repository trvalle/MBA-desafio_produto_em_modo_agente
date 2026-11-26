# F01 — Contrato de avaliação

## Pré-requisitos

Leia docs/brief.md, docs/PRD.md, esta spec e docs/architecture.md. Use checkout do commit declarado, Docker com Compose e Node.js LTS no host; Windows executa desenvolvimento via WSL. Execute npm run up quando o teste depende do produto. Credenciais e X-Api-Key são as demonstrativas do README. Use registros novos com data futura e portas isoladas quando necessário. Gateway padrão deve permanecer em 3000/35000ms para verificações temporais; testes diretos acelerados não substituem estas evidências.

Avaliador: agente distinto do implementador, em contexto novo/vazio. Não modificar implementação ou critérios durante avaliação. Se dependência necessária ainda não está integrada, registrar NOT RUN/BLOCKED e não aprovar a feature. Fixtures de domínio são permitidas onde explicitamente indicadas, mas não substituem o fluxo final real.

## Itens verificáveis e mapeamento integral

| Item | Critério do PRD | Procedimento / efeito verificável |
|---|---|---|
| F01-T01 | F01-AC01 | Em clone novo executar o comando, obter resposta HTTP de prontidão e inspecionar as três contas da seed. Login real é verificado em F02/CF01. |
| F01-T02 | F01-AC02 | Registrar containers/portas antes e depois de down; repetir up e verificar seed persistida sem duplicação. Login é verificado em F02/CF01. |
| F01-T03 | F01-AC03 | Executar seed duas vezes; conferir papéis, quantidade das contas previstas e ausência de erro. |
| F01-T04 | F01-AC04 | Executar o comando na main e registrar saída, quantidade real de testes e exit code. |
| F01-T05 | F01-AC05 | Inspecionar schema/utilitários, ausência de coluna para cartão completo e testar rollback. Persistência de compra real sem cartão também é verificada em F04. |
| F01-T06 | F01-AC06 | Conferir arquivos/comandos, Docker e registro real do ambiente de desenvolvimento. |

## Evidências e veredito

Para cada item registrar PASS, FAIL, NOT RUN ou BLOCKED, comandos/entrada, saída ou efeito observado e referência de evidência. PASS exige execução real ou inspeção documental objetiva quando o item é documental; teste previsto não é teste realizado. Rodar npm run gates e registrar exit code, sem presumir que gates cobrem todos os itens acima. Screenshots reais comprovam interface; HTTP e dados observados comprovam contratos. Registrar latências quando relevantes.

Relatório novo em docs/features/F01/reports/, com data UTC, SHA avaliado, ferramenta/modelo efetivos, agente e declaração de separação, tabela de todos os itens, falhas/limitações e veredito. Após o primeiro commit desse arquivo, nunca alterá-lo. Reprovação retorna ao implementador; nova execução produz novo arquivo. Estado só pode apontar feature concluída quando seu último relatório aprovar todos os itens. Fluxo final na main em clone limpo continua obrigatório.

