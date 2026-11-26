# F05 — avaliação independente BLOQUEADA — não aprovada

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
| F05-T01 | PASS | Cancelamento publicado real; exclusão de listas, vendas404, edição/publicação409, repetição409; draft409 event_not_published e outro dono404. |
| F05-T02 | BLOCKED | Procedimento contratual criou lenta0003 e rápida0001: ao aguardar3,2s ambas já confirmed pela falha F04-T02. Não foi possível validar essa pré-condição no SHA. Supplemento preconfirma rápida e só depois cria lenta; comprova transição imediata e invariância45s, mas não substitui a sequência contratual exigida. |
| F05-T03 | PASS | Mensagens literais comparadas: inválido/outro evento, inválido em cancelado, Evento cancelado para código válido, Ingresso não confirmado para pending/declined, Ingresso já utilizado e Entrada liberada. |
| F05-T04 | PASS | 12 check-ins HTTP simultâneos no mesmo código:1 Entrada liberada e11 Ingresso já utilizado; repetição recusada; consulta manteve confirmed e checkedIn true. Suplemento também aceitou código API. |
| F05-T05 | PASS | E1 de ambos canais:10000+10000+15000 centavos, painel3 confirmados,0 pending,0→1 checkedIn,0 vagas,35000 receita,0 refunded. |
| F05-T06 | PASS | Isolamento operacional E3: rápida já confirmada e utilizada; depois lenta pending; cancelamento gerou0 confirmados/pending/checkIn/vagas/receita e1 refunded. Confirmado estornado manteve checkedIn true no ticket mas não contou painel; repetido com canais invertidos e após45s. Ordem original de criação fica bloqueada em T02. |
| F05-T07 | PASS | Matriz3 atores×3 operações: visitante401, participante403, outro dono404, JSON só error, inclusive check-in com corpo malformado. A asserção extra de métricas no grupo do probe falhou por pré-condição temporal; todas as9 respostas de autorização foram corretas. |
| F05-CF05 | PASS | E1 mistura canais e preços; suplemento confirmou check-in/cancelamento de ambos, invertendo canal da rápida/lenta e verificando invariância após45s. Restrição de integração temporal original explicitada em T02. |
| F05-CF06 | PASS | Sessões de F02 protegeram operações e painel para todos os papéis/donos, antes do corpo, sem dados alheios. |

Veredito final: **BLOQUEADA — não aprovada**. Correção de F04 e nova avaliação em outro SHA são necessárias; preservar este relatório e os logs. Não marcar F04/F05 como concluídas com base nos gates. A validação final completa na main permanece obrigatória.
