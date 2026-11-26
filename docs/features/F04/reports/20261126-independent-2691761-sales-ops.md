# F04 — reavaliação independente APROVADA

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
| F04-T01 | PASS | Compras web e API responderam202 pending imediatamente;5 IDs/códigos únicos,5 reservas; preço10000 persistido, sem número de cartão em tickets. |
| F04-T02 | PASS | Inválidos não criaram ingresso. Finais0001/0002/9876:3093,799/3095,297/3098,657ms; finais0003/0004:35151,476/35150,794ms. Resultados confirmed/declined corretos; todos nas faixas reais do brief, medidos por performance.now no mesmo processo e polling100ms. |
| F04-T03 | PASS | Três eventos novos, capacidade5, cada rajada30 concorrentes: exatamente5 HTTP202 e25 HTTP409, ocupação5; painel final5 confirmados/0 vagas. |
| F04-T04 | PASS | Recusa liberou vagas e aprovação confirmou. Cancelamento com rápida confirmed e lenta pending preservou refunded/cancelled após45102,944ms reais; suplemento repetiu com canais invertidos. Receita/ocupação final corretas. |
| F04-T05 | PASS | Chave ausente/errada401 unauthorized nas três rotas; chave precede JSON malformado; corpo inválido422 antes de evento ausente/esgotado; ausente/draft/cancelado404 event_not_available; cheio409 sold_out; ticket ausente404 ticket_not_found. JSON exato comparado. |
| F04-T06 | PASS | Listagem e consulta verificadas por conjunto exato de campos e tipos; resposta compra ticketId/code/status; consulta de ingresso web via parceiro com checkedIn boolean. |
| F04-T07 | PASS | Duas contas, compra web e API com mesmo email: cada conta vê só próprios web, parceiro userId null, evento/status/código presentes. |
| F04-CF03 | PASS | Sessão vinculou userId; visitante401 e organizador403 no checkout web; compra API não se associa por email. |
| F04-CF04 | PASS | Draft não vende; publicado vende com preço vigente; histórico10000/10000/15000 preservado e catálogo reflete lotação. |

Veredito final: **APROVADA neste SHA**. Todos os itens do contrato foram exercitados. A falha temporal anterior não reapareceu: a implementação corrigida mede passagem de tempo de forma monotônica. Interface e fluxo final completo na main pertencem a F06 e continuam fora do escopo deste relatório; aprovação de serviço/HTTP não substitui essa avaliação.
