# F03 — reavaliação independente APROVADA

Data de emissão UTC: 2026-11-26T03:01:29.322529+00:00
Commit avaliado: `2691761de8bf2b006e5775397e5128c603fa2d6f`.
Ferramenta: Codex desktop. Modelo informado: GPT-6 (variante exata não exposta).
Avaliador: `/root/eval_sales_operations`, subagente distinto dos implementadores, iniciado em contexto vazio. Esta é uma reavaliação do mesmo avaliador independente, após o implementador corrigir a falha encontrada no SHA95ecfd3. Não implementei nem alterei código, contratos ou relatórios anteriores. Mantidos os relatórios anteriores com F03 aprovada, F04 reprovada e F05 bloqueada.

Fontes: AGENTS.md, brief, PRD, arquitetura, specs/contratos das três features. Checkout isolado em `/root/catraca-evals/sales-ops`, WSL Ubuntu24.04, Node v24.22.3. `createApp` real, banco SQLite novo em memória por execução, porta HTTP efêmera e defaults de gateway3000/35000ms, worker100ms. Nenhuma espera reduzida ou mock de relógio nesta prova. Medições de duração usam performance.now no mesmo processo; timestamps UTC refletem o relógio civil real, sujeito a saltos no WSL, sem adulteração.

Executei `COMPOSE_PROJECT_NAME=catraca-eval-sales PORT=3145 npm run gates` (exit0,30 testes aprovados), depois `npm run up` no mesmo projeto/porta isolados e saúde200. Servidores/bancos dos probes fechados em finally; Compose encerrado com npm run down; porta3145 e containers do projeto ausentes conforme cleanup.log. Não usei a porta3000 do implementador.

Evidências reproduzíveis: [probe](../../../evidence/eval-sales-ops-2691761/probe.mjs), [HTTP e heartbeat](../../../evidence/eval-sales-ops-2691761/http-attempt2.jsonl), [resultados](../../../evidence/eval-sales-ops-2691761/results-attempt2.json), [stdout](../../../evidence/eval-sales-ops-2691761/probe-console.log), [probe suplementar ambos canais](../../../evidence/eval-sales-ops-2691761/probe-operations-isolation.mjs), [evidências suplementares](../../../evidence/eval-sales-ops-2691761/operations-isolation.jsonl), [gates](../../../evidence/eval-sales-ops-2691761/gates.log), [subida](../../../evidence/eval-sales-ops-2691761/up.log), [saúde](../../../evidence/eval-sales-ops-2691761/health.json), [limpeza](../../../evidence/eval-sales-ops-2691761/cleanup.log).

Reprodução no SHA: `node docs/evidence/eval-sales-ops-2691761/probe.mjs` e `node docs/evidence/eval-sales-ops-2691761/probe-operations-isolation.mjs`. Ambos exit0. O primeiro registra19 grupos independentes aprovados, incluindo toda a sequência de contratos; o segundo amplia check-in/cancelamento de ambos os canais, com fast/lenta invertidos. Logs contêm requests, respostas HTTP/JSON, IDs reais, horários, tempos monotônicos e verificações SQL somente-leitura. Gates adicionais cobrem fixtures e escritores SQLite independentes.

## Medições reais

| Final | Resultado | Tempo monotônico observado |
|---|---|---|
|0001|confirmed|3093,799ms|
|0002|declined|3095,297ms|
|0003|confirmed|35151,476ms|
|0004|declined|35150,794ms|
|9876|declined|3098,657ms|

E1:10000+10000+15000=35000 centavos,3 confirmados,0 pendentes,0→1 check-in,0 vagas,0 estornados. Três rajadas independentes de30 HTTP cada, em capacidade5:5 respostas202 e25 respostas409 em cada rodada; estado final5 confirmados/0 vagas. E3: cancelled/refunded preservados45102,944ms depois do cancelamento, com painel0/0/0/0/0/refunded1. R10 comparado literalmente, incluindo inválido antes de cancelado. JSON parceiro comparado por campos exatos e tipos, incluindo tickets web.

## Veredito por item

| Item | Veredito | Evidência e observação |
|---|---|---|
| F03-T01 | PASS | 14 casos HTTP inválidos (campos ausentes, data passada/inválida, capacidade 0/fracionária e preço 0/fracionário) deram 422 sem criar eventos; criação válida nasceu draft. |
| F03-T02 | PASS | Duas reservas reais pending: capacidade1 rejeitada 409 capacity_below_occupied sem alteração parcial; aumento5 aceito com3 vagas; edição com data passada422. Gates adicionais cobrem fixture pending+confirmed e exclusão dos demais estados. |
| F03-T03 | PASS | Catálogos público/parceiro excluíram draft, incluíram publicado e retiraram evento após cancelamento real de F05; preço e vagas refletiram as compras. Reavaliação integral após correção do gateway. |
| F03-T04 | PASS | ownedEvent/update/publish de outro dono lançaram404; listas do domínio e HTTP só próprios; GET/PUT/publish integrado devolveu401 visitante,403 participante,404 outro organizador. |
| F03-T05 | PASS | Evento cancelado real rejeitou PUT e publish409 event_cancelled, no serviço e HTTP; gates cobrem também fixture cancelada. |
| F03-T06 | PASS | GET por ID do dono retornou evento; outro organizador, participante e visitante não obtiveram dados. URL de gestão de UI fica para F06. |
| F03-CF02 | PASS | Schema, compras reais e transação preservaram atomicidade e lotação; leitura posterior confirmou rollback de edição recusada. |
| F03-CF11 | PASS | Adapter integrado exigiu papel e propriedade; inspeção confirma dependência auth carregada apenas no handler; domínio exercitado diretamente. |

Veredito final: **APROVADA neste SHA**. Todos os itens do contrato foram exercitados. A falha temporal anterior não reapareceu: a implementação corrigida mede passagem de tempo de forma monotônica. Interface e fluxo final completo na main pertencem a F06 e continuam fora do escopo deste relatório; aprovação de serviço/HTTP não substitui essa avaliação.
