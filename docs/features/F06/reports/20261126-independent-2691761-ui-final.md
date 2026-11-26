# F06 — avaliação independente da interface e jornada integrada

Data UTC registrada: 2026-11-26T03:02:23Z. Produto avaliado: **2691761de8bf2b006e5775397e5128c603fa2d6f**, main pública, clone novo `/root/catraca-evals/ui-final` em Ubuntu 24.04/WSL. Revisão documental aplicada ao contrato: **3bbb37ce1a5a88ef11755870ff0a185813209b2f**. Ferramenta: **Codex desktop**; modelo: **GPT-6 (variante exata não exposta)**. Avaliador: subagente novo `eval_ui_final`, contexto vazio/separado, distinto dos implementadores; não implementei nem alterei código, contratos ou relatórios anteriores.

**Veredito F06: PASS — 11/11 itens executados e aprovados.** Isto não aprova antecipadamente a entrega global: o passo 18 será auditado depois da inclusão deste relatório e da consolidação do estado. A revisão documental resolve a circularidade de exigir o próprio relatório já aprovado para aprová-lo; todos os requisitos originais do brief permanecem obrigatórios, conforme [ADR](../../../adr-evaluation-order.md).

## Ambiente e comandos efetivamente executados

Node v24.22.3; Docker Compose v5.5.1; Chromium real via Playwright 1.65.1, headless. Porta isolada 3146; projeto Docker `catraca-eval-ui`. Não utilizei porta 3000. O primeiro `npm run up` ocorreu antes de `npm ci`, portanto o produto subiu sem instalação manual de dependências. `npm ci` foi somente para instrumentar o navegador avaliador.

```sh
git clone https://github.com/trvalle/MBA-desafio_produto_em_modo_agente.git /root/catraca-evals/ui-final
cd /root/catraca-evals/ui-final
export COMPOSE_PROJECT_NAME=catraca-eval-ui PORT=3146 WEB=http://127.0.0.1:3146
export EVIDENCE_DIR=docs/evidence/eval-ui-final-2691761
npm run up
npm ci
RUN_LIFECYCLE=1 npm run e2e
node own-probes.mjs
npm run down
docker ps --filter label=com.docker.compose.project=catraca-eval-ui --format '{{.Names}}'
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3146/api/health
```

`up`, instalação, jornada e probes encerraram com código 0. Dentro da jornada: gates 30 testes, 30 aprovados, 0 falhas; down deixou porta indisponível e zero containers; restart autenticou as três contas da seed. Encerramento final também deixou zero nomes no `docker ps`; curl mostrou `000` por indisponibilidade esperada. Nenhuma chave de pagamento real, atraso acelerado, mock HTTP ou fixture de banco foi empregado. Os probes próprios criaram dados por endpoints reais e inspecionaram UI real.

## Resultado por item do contrato

| Item | Critério | Resultado | Evidência observada |
|---|---|---|---|
| F06-T01 | F06-AC01 | PASS | Jornada passos 2/4/5/13: rascunho ausente, publicado presente, cancelado removido; cadastro/login/logout reais. |
| F06-T02 | F06-AC02 | PASS | Passos 5–8: pendente/confirmado e código; ocupação da última vaga, API 409 e UI literal `Ingressos esgotados`. Probe próprio confirmou 0001 e recusou 0002 em 3059,95 ms desde início das compras. |
| F06-T03 | F06-AC03 | PASS | Passos 2/3/4/9: criação/URL/publicação; passado rejeitado; redução para 1 retorna 409; aumento para 3 e preço R$150 aceitos. Probe de edição passada observou alerta e resposta do evento integralmente inalterada. |
| F06-T04 | F06-AC04 | PASS | E1: métricas 3/0/0/0/R$350/0; check-in eleva entradas a 1, mensagens literais para sucesso/repetição/recusado/inválido/outro evento. E3 após 45s: 0/0/0/0/R$0/1 e `Evento cancelado`; edição desabilitada, publicação ausente. |
| F06-T05 | F06-AC05 | PASS | Passo 11 e três contextos independentes próprios: B 404 event_not_found; participante 403 forbidden; visitante 401 unauthorized. DOM sem nome, métricas ou ingressos do evento; screenshots e respostas armazenados. |
| F06-T06 | F06-AC06 | PASS | Nome `<img ... onerror=...>`, local `<script>...` e nome de conta `<svg onload=...>` renderizados como texto, nenhum elemento injetado ou execução. Reload da URL direta e de `/tickets` funcionou. Cinco status reais observados: pendente, confirmado, recusado, cancelado, estornado. |
| F06-T07 | F06-AC07 | PASS | Passos 1–17 completos, dados originais novos, gateway padrão e clone main limpo; duas rodadas de 30 compras, lifecycle/gates/restart e screenshots. Passo 18 é auditoria global separada conforme revisão documental declarada. |
| F06-CF07 | CF07 | PASS | UI registrou participante sem seletor de papel; `/api/auth/me` confirmou participant. Cookie HttpOnly, SameSite Strict, Path / e inacessível em document.cookie; logout resultou user null e remoção do cookie. |
| F06-CF08 | CF08 | PASS | Formulários atuaram em eventos reais; URLs recarregadas; validação de passado/capacidade e isolamento do domínio propagados à UI. |
| F06-CF09 | CF09 | PASS | Checkout/ingressos/status/código e esgotado correspondem às compras e vagas da API no E1. |
| F06-CF10 | CF10 | PASS | Painel real usa R$100 + R$100 + R$150; check-ins reais atualizam métricas; cancelamento transforma ingressos dos canais e mantém bloqueios após callback lento. |

## Evidências primárias

Diretório [eval-ui-final-2691761](../../../evidence/eval-ui-final-2691761/):

- [Resultados por passo](../../../evidence/eval-ui-final-2691761/results.json), [log da jornada](../../../evidence/eval-ui-final-2691761/journey.log), [subida](../../../evidence/eval-ui-final-2691761/up.log), [gates](../../../evidence/eval-ui-final-2691761/gates.log), [restart](../../../evidence/eval-ui-final-2691761/restart.log), [encerramento](../../../evidence/eval-ui-final-2691761/final-down.log).
- [Probes próprios executados](../../../evidence/eval-ui-final-2691761/own-probes.mjs), [respostas/DOM/latências](../../../evidence/eval-ui-final-2691761/own-probes-results.json). Cancelamento próprio refletido na UI em 78,98 ms; aprovação/recusa rápida em 3059,95 ms, medidos com `performance.now()`.
- [Pendente](../../../evidence/eval-ui-final-2691761/01-ingresso-pendente.png), [esgotado](../../../evidence/eval-ui-final-2691761/02-esgotado.png), [E1 R$350](../../../evidence/eval-ui-final-2691761/03-painel-precos.png), [E3 cancelado](../../../evidence/eval-ui-final-2691761/04-cancelamento.png), [vitrine 390px](../../../evidence/eval-ui-final-2691761/05-mobile.png).
- [Markup na gestão](../../../evidence/eval-ui-final-2691761/own-markup-management.png), [pendente/confirmado/recusado](../../../evidence/eval-ui-final-2691761/own-three-statuses.png), [cancelado/recusado/estornado](../../../evidence/eval-ui-final-2691761/own-final-statuses.png).
- [Bloqueio B](../../../evidence/eval-ui-final-2691761/own-isolation-organizerB.png), [participante](../../../evidence/eval-ui-final-2691761/own-isolation-participant.png), [visitante](../../../evidence/eval-ui-final-2691761/own-isolation-visitor.png).
- [Rajada E4](../../../evidence/eval-ui-final-2691761/concurrency-E4.log) e [E5](../../../evidence/eval-ui-final-2691761/concurrency-E5.log): cada uma contém `5 202` e `25 409`, painel posterior 5 confirmados/0 vagas.

Inspecionei visualmente os screenshots de métricas E1, cancelamento E3 e status terminais/XSS, além das asserções DOM executadas pelo Chromium. O relógio civil do WSL oscilou durante a jornada: timestamps brutos do JSON podem retroceder (passos 15/16 versus 17). Não os corrigi. Prazos críticos do script e dos probes usam tempo monotônico; timestamps civis não foram usados para inferir latência.

## Limites e pendência global

Sem falhas de produto encontradas nesta avaliação. O script oficial foi inspecionado antes da execução; probes adicionais foram escritos pelo avaliador para cobrir AC06, cookies, respostas de autorização e preservação de estado na edição inválida. Este relatório aprova somente a F06 e passos 1–17 no SHA declarado. O passo 18 (estado final, relatórios commitados/imutáveis e PRs) continua obrigatório e deve gerar auditoria separada após consolidação. Não é adequado declarar a entrega global concluída somente por este PASS.