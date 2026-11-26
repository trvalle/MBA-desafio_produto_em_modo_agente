# F04 — avaliação independente REPROVADA

Data de emissão UTC: 2026-11-26T02:58:57.212460+00:00
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
| F04-T01 | PASS | Compras web e API responderam202 pending imediatamente;5 IDs/códigos únicos,5 reservas; preço10000 persistido, sem número de cartão em tickets. |
| F04-T02 | FAIL | Inválidos não criaram ingresso. Finais0001/0002/outro concluíram em~2,06s; 0003 confirmou2059,286411ms e0004 recusou2058,894127ms, antes de30s. Falha real em relógio civil oscilante, comprovada monotonicamente. |
| F04-T03 | PASS | Três eventos novos, capacidade5, cada rajada30 concorrentes: exatamente5 HTTP202 e25 HTTP409, ocupação5; painel final5 confirmados/0 vagas. |
| F04-T04 | PASS | Aprovação/recusa e liberação de vagas observadas. Probe suplementar criou pending antes de cancelar e manteve cancelled/refunded após45s reais em ambos os canais. A sequência original com cartão lento antes da rápida foi prejudicada por T02. |
| F04-T05 | PASS | Chave ausente/errada401 unauthorized nas três rotas; chave precede JSON malformado; corpo inválido422 antes de evento ausente/esgotado; ausente/draft/cancelado404 event_not_available; cheio409 sold_out; ticket ausente404 ticket_not_found. JSON exato comparado. |
| F04-T06 | PASS | Listagem e consulta verificadas por conjunto exato de campos e tipos; resposta compra ticketId/code/status; consulta de ingresso web via parceiro com checkedIn boolean. |
| F04-T07 | PASS | Duas contas, compra web e API com mesmo email: cada conta vê só próprios web, parceiro userId null, evento/status/código presentes. |
| F04-CF03 | PASS | Sessão vinculou userId; visitante401 e organizador403 no checkout web; compra API não se associa por email. |
| F04-CF04 | PASS | Draft não vende; publicado vende com preço vigente; histórico10000/10000/15000 preservado e catálogo reflete lotação. |

Veredito final: **REPROVADA**. Correção de F04 e nova avaliação em outro SHA são necessárias; preservar este relatório e os logs. Não marcar F04/F05 como concluídas com base nos gates. A validação final completa na main permanece obrigatória.
