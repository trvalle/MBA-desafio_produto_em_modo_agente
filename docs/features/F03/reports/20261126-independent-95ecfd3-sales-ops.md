# F03 — avaliação independente APROVADA

Data de emissão UTC: 2026-11-26T02:58:42.898709+00:00
Commit avaliado: `95ecfd3fca730b3dd1c1e14a7e09abd40b2bf6b0`.
Ferramenta: Codex desktop. Modelo informado: GPT-6 (variante exata não exposta).
Avaliador: subagente novo `/root/eval_sales_operations`, contexto inicial vazio, distinto dos implementadores; recebeu apenas tarefa, fontes e checkout. Não implementou nem modificou o produto. Nenhum relatório existente foi alterado.

Ambiente: clone local isolado `/root/catraca-evals/sales-ops`, WSL Ubuntu 24.04, Node v24.22.3. Produto real `createApp`, SQLite novo em memória por execução e porta HTTP efêmera, gateway padrão e worker de 100ms. Também executei `COMPOSE_PROJECT_NAME=catraca-eval-sales PORT=3145 npm run up` e obtive `/api/health` 200, sem usar a porta 3000. `npm run gates` no projeto Compose isolado: exit 0, 28 testes aprovados. Os gates são complementares; as provas HTTP e temporais são independentes.

Fontes lidas: AGENTS.md, brief, PRD, arquitetura, specs e contratos F03/F04/F05. Critérios não foram alterados. O escopo desta avaliação é serviço/HTTP; a interface pertence a F06 e não é aprovada aqui.

Evidências: [probe original](../../../evidence/eval-sales-ops-20261125/probe.mjs), [respostas originais](../../../evidence/eval-sales-ops-20261125/http.jsonl), [resultados originais](../../../evidence/eval-sales-ops-20261125/results.json), [probe monotônico](../../../evidence/eval-sales-ops-20261125/probe-attempt2.mjs), [HTTP/heartbeat monotônicos](../../../evidence/eval-sales-ops-20261125/http-attempt2.jsonl), [resultados monotônicos](../../../evidence/eval-sales-ops-20261125/results-attempt2.json), [isolamento das operações](../../../evidence/eval-sales-ops-20261125/probe-operations-isolation.mjs), [respostas do isolamento](../../../evidence/eval-sales-ops-20261125/operations-isolation.jsonl), [gate](../../../evidence/eval-sales-ops-20261125/gates-confirmed.log), [subida](../../../evidence/eval-sales-ops-20261125/up.log), [encerramento](../../../evidence/eval-sales-ops-20261125/cleanup.log).

Reprodução a partir do SHA: `node docs/evidence/eval-sales-ops-20261125/probe-attempt2.mjs`; `node docs/evidence/eval-sales-ops-20261125/probe-operations-isolation.mjs`. Não configurar fastDelayMs/slowDelayMs. Os scripts abrem servidor/banco próprios e fecham ambos em finally. Logs incluem entradas, HTTP, JSON, latências, IDs reais e asserções. A falha de relógio depende das oscilações reais do ambiente; não simulei nem corrigi o relógio do sistema nesta avaliação.

Limitação e achado transversal: a primeira tentativa usou Date.now para duração e encontrou saltos de +96,313s e -51,323s; sua prova temporal isolada não é válida. A segunda usa performance.now no mesmo processo e polling de 100ms, além de heartbeat. Ela confirmou finais 0003 e 0004 concluídos em **2059,286411ms e 2058,894127ms monotônicos**, respectivamente. O heartbeat também registra salto de +96416,191202ms do relógio civil relativo ao monotônico. O produto deste SHA usa Date.now na criação e no processamento do prazo; portanto a oscilação externa efetivamente antecipa o gateway. Isso reprova a exigência temporal, não é descartado como simples erro de medição.

## Veredito por item

| Item | Veredito | Evidência e observação |
|---|---|---|
| F03-T01 | PASS | 14 casos HTTP inválidos (campos ausentes, data passada/inválida, capacidade 0/fracionária e preço 0/fracionário) deram 422 sem criar eventos; criação válida nasceu draft. |
| F03-T02 | PASS | Duas reservas reais pending: capacidade1 rejeitada 409 capacity_below_occupied sem alteração parcial; aumento5 aceito com3 vagas; edição com data passada422. Gates adicionais cobrem fixture pending+confirmed e exclusão dos demais estados. |
| F03-T03 | PASS | Catálogos público/parceiro excluíram draft, incluíram publicado e retiraram evento após cancelamento real de F05. Reavaliação resolve o BLOCKED anterior por F05 ausente. |
| F03-T04 | PASS | ownedEvent/update/publish de outro dono lançaram404; listas do domínio e HTTP só próprios; GET/PUT/publish integrado devolveu401 visitante,403 participante,404 outro organizador. |
| F03-T05 | PASS | Evento cancelado real rejeitou PUT e publish409 event_cancelled, no serviço e HTTP; gates cobrem também fixture cancelada. |
| F03-T06 | PASS | GET por ID do dono retornou evento; outro organizador, participante e visitante não obtiveram dados. URL de gestão de UI fica para F06. |
| F03-CF02 | PASS | Schema, compras reais e transação preservaram atomicidade e lotação; leitura posterior confirmou rollback de edição recusada. |
| F03-CF11 | PASS | Adapter integrado exigiu papel e propriedade; inspeção confirma dependência auth carregada apenas no handler; domínio exercitado diretamente. |

Veredito final: **APROVADA**. Correção de F04 e nova avaliação em outro SHA são necessárias; preservar este relatório e os logs. Não marcar F04/F05 como concluídas com base nos gates. A validação final completa na main permanece obrigatória.
