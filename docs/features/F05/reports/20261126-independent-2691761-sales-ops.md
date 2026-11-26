# F05 — reavaliação independente APROVADA

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
| F05-T01 | PASS | Cancelamento publicado real; exclusão de listas, vendas404, edição/publicação409, repetição409; draft409 event_not_published e outro dono404. |
| F05-T02 | PASS | Duas compras reais0001/0003, espera3200ms: rápida confirmed e lenta pending. Cancelamento antes30s converteu imediatamente em refunded/cancelled; consulta após45102,944ms do cancelamento manteve estados. Suplemento também inverteu canais. |
| F05-T03 | PASS | Mensagens literais comparadas: inválido/outro evento, inválido em cancelado, Evento cancelado para código válido, Ingresso não confirmado para pending/declined, Ingresso já utilizado e Entrada liberada. |
| F05-T04 | PASS | 12 check-ins HTTP simultâneos no mesmo código:1 Entrada liberada e11 Ingresso já utilizado; repetição recusada; consulta manteve confirmed e checkedIn true. Suplemento também aceitou código API. |
| F05-T05 | PASS | E1 de ambos canais:10000+10000+15000 centavos, painel3 confirmados,0 pending,0→1 checkedIn,0 vagas,35000 receita,0 refunded. |
| F05-T06 | PASS | E3 integrado: rápida confirmada e utilizada + lenta pending; após cancelamento painel0 confirmados,0 pending,0 checkedIn,0 vagas,0 receita,1 refunded, inclusive após45,10s. Ticket estornado reteve checkedIn true sem contar no painel. Repetido com canais invertidos no suplemento. |
| F05-T07 | PASS | Matriz3 atores×3 operações: visitante401, participante403, outro dono404, JSON apenas error, inclusive check-in com corpo malformado. Estado e painel permaneceram inalterados. |
| F05-CF05 | PASS | E1 combina canais e preços históricos; E3 cancela ingresso web confirmado e API pendente, preservados por45,10s; suplemento aceita check-in API e repete cancelamento com canais invertidos. |
| F05-CF06 | PASS | Sessões de F02 protegeram operações e painel para todos os papéis/donos, antes do corpo, sem dados alheios. |

Veredito final: **APROVADA neste SHA**. Todos os itens do contrato foram exercitados. A falha temporal anterior não reapareceu: a implementação corrigida mede passagem de tempo de forma monotônica. Interface e fluxo final completo na main pertencem a F06 e continuam fora do escopo deste relatório; aprovação de serviço/HTTP não substitui essa avaliação.
