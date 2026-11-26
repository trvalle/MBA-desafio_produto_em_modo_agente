# Catraca — do brief ao produto em modo agente

MVP local de venda de ingressos, construído com especificações e avaliação independente.
**APPROVED — READY FOR SUBMISSION**, conforme [auditoria independente](docs/evidence/final-audit-feb98bf.md):
39/39 grupos acadêmicos, 49/49 itens dos contratos e seis features aprovadas. Gates: 30 testes aprovados.
O fluxo oficial foi executado em clone limpo com navegador real. Consulte o [estado](docs/state.json) e
o [relatório didático offline](docs/relatorio-final.html), com telas reais e roteiro de apresentação.

## Como rodar

Pré-requisitos: Git, Node.js LTS e Docker com Compose v2 iniciado. Linux/macOS; no Windows use WSL.

```sh
git clone https://github.com/trvalle/MBA-desafio_produto_em_modo_agente.git
cd MBA-desafio_produto_em_modo_agente
npm run up
```

O comando constrói o container, aplica schema e seed idempotente e aguarda saúde HTTP.
Não exige npm install nem chave de pagamento. `npm run down` encerra o projeto e preserva os dados.
`npm run gates` constrói e roda testes automatizados em container descartável e banco isolado.

```sh
npm run up       # inicia e aguarda saúde; inclui seed
npm run gates    # sintaxe + testes automatizados, banco isolado
npm run down     # encerra containers/rede; preserva ingressos no volume
```

Se a porta 3000 estiver ocupada: `PORT=3001 npm run up`; acesse então a porta 3001.
Para dois clones simultâneos, use `COMPOSE_PROJECT_NAME=catraca-segundo PORT=3001 npm run up` e
as mesmas variáveis no comando down. Docker precisa estar em execução; o download inicial da imagem requer internet.

## Endereços e credenciais locais de demonstração

WEB e API: http://localhost:3000. Chave `X-Api-Key`: `catraca-partner-local`.

| Conta | Email | Senha |
|---|---|---|
| Organizador A | organizador.a@catraca.local | Catraca123! |
| Organizador B | organizador.b@catraca.local | Catraca123! |
| Participante | participante@catraca.local | Catraca123! |

## Mapa dos artefatos

- [Brief original](docs/brief.md), [PRD](docs/PRD.md), [rastreabilidade](docs/requirements.md).
- [F01](docs/features/F01), [F02](docs/features/F02), [F03](docs/features/F03), [F04](docs/features/F04), [F05](docs/features/F05), [F06](docs/features/F06): spec, plan, contract e reports.
- [Estado](docs/state.json), [AGENTS.md](AGENTS.md), [arquitetura](docs/architecture.md).
- [Relatório didático offline](docs/relatorio-final.html): material complementar para entender e apresentar o trabalho.
- [Prova de paralelismo](docs/evidence/parallel-wave.md), [evidências](docs/evidence), [jornada oficial automatizada](scripts/evaluator.mjs).
- PRs mergeados da wave paralela: [F02 — autenticação #1](https://github.com/trvalle/MBA-desafio_produto_em_modo_agente/pull/1) e [F03 — eventos #2](https://github.com/trvalle/MBA-desafio_produto_em_modo_agente/pull/2). Os intervalos de commits se sobrepõem; as branches/worktrees foram implementadas simultaneamente por agentes distintos.

## Decisões

Node 24 e SQLite reduzem dependências para o MVP local. Dinheiro usa centavos inteiros.
R07: leitura de vagas e inserção do ingresso pendente na mesma transação `BEGIN IMMEDIATE`;
edição de lotação, cancelamento e callback seguem o mesmo lock de escrita.
Gateway simulado persiste prazo e decisão no próprio ingresso. Um worker a cada 100ms processa os pendentes vencidos;
após reiniciar, os jobs continuam no banco. A requisição retorna 202 antes do pagamento. Nenhum número completo
de cartão é persistido. O callback só altera pending de evento published. Cancelamento atualiza evento e ingressos
na mesma transação, impedindo que uma resposta tardia confirme ingresso cancelado/estornado.
Durante cada processo, o gateway usa tempo decorrido monotônico ancorado em um timestamp persistível;
correções do relógio de parede (observadas no WSL durante avaliação) não antecipam nem atrasam o pagamento.
Ao reiniciar, os prazos persistidos são retomados contra o novo relógio de referência.

| Final do cartão de 16 dígitos | Resultado | Atraso padrão |
|---|---|---|
| 0001 | aprovado | 3 segundos |
| 0002 | recusado | 3 segundos |
| 0003 | aprovado | 35 segundos |
| 0004 | recusado | 35 segundos |
| outro | recusado | 3 segundos |

Os tempos estão nas faixas do brief. Testes diretos aceleram o relógio; avaliações temporais e jornada oficial usam
os atrasos padrão. Não existe integração de pagamento real.

As avaliações são realizadas por subagentes novos com contexto vazio, distintos dos implementadores;
recebem brief/contratos/checkout e executam seus próprios probes. Relatórios commitados são imutáveis, inclusive
reprovações. F01 teve falhas de integridade monetária/callback assíncrono detectadas e corrigidas com regressão.
O histórico preserva avaliação reprovada e reavaliação aprovada. O estado aponta o relatório mais recente por feature.
Consulte [a arquitetura](docs/architecture.md) para referências primárias e acordos entre features.

SQLite serializa escritores por `BEGIN IMMEDIATE`; a decisão de reservar e a inserção ocorrem sob o mesmo lock.
WAL permite leitores, `busy_timeout=5000` aguarda disputa curta. Não há operação de rede dentro da transação.
Os testes incluem rajadas HTTP repetidas e conexões SQLite independentes, além de check-in concorrente.
Este é um MVP local de um processo de aplicação; deploy e disponibilidade distribuída estão fora de escopo.

## API de parceiros

```sh
export API=http://localhost:3000
export KEY=catraca-partner-local
curl -s -H "X-Api-Key: $KEY" "$API/api/partner/events"
```

As rotas são `GET /api/partner/events`, `POST /api/partner/events/{eventId}/purchases` e
`GET /api/partner/tickets/{ticketId}`. Compra recebe `{"buyerEmail":"ana@example.com","cardNumber":"4000000000000001"}`.
O contrato literal, campos, status e ordem de erros estão no [brief](docs/brief.md) e no [contrato F04](docs/features/F04/contract.md).
Chave ausente/incorreta vem antes da validação de corpo, evento e lotação. Compras parceiras não se associam
a contas por coincidência de email, mas participam de vagas, painel, check-in e cancelamento.

## Como demonstrar

1. Entre como organizador A, crie um evento futuro e publique.
2. Saia, crie uma conta de participante e compre com `4000000000000001`.
3. Abra Meus ingressos, recarregue após 3 segundos e copie o código confirmado.
4. Entre como A, abra a gestão do evento e valide o código. Repita para observar Ingresso já utilizado.
5. Confira painel e altere o preço para demonstrar que compras anteriores preservam o valor.
6. Cancele o evento: a vitrine o retira, o ingresso é estornado e a receita passa a zero.

O [fluxo completo do professor](docs/brief.md) inclui pagamentos lentos, isolamento e duas rajadas simultâneas.

## Testes de desenvolvimento e navegador

Os comandos obrigatórios do avaliador são somente up/down/gates acima. Para reproduzir também a automação
de navegador em Linux/WSL com Node 24:

```sh
npm ci
npx playwright install --with-deps chromium
npm run up
RUN_LIFECYCLE=1 npm run e2e
```

O script cria registros de teste novos, usa navegador real e gateway padrão e grava resultados/screenshots em
`docs/evidence/official-flow`. Ele leva mais de 90 segundos devido aos dois pagamentos lentos. O passo 18
(artefatos e histórico) é auditado separadamente, após os relatórios serem commitados.
`npm test` executa a suíte local com Node 24; o comando de gates faz isso no runtime fixado do container.

## Entrega e autoria

Entregar ao professor a URL deste repositório público, branch **main**. PRD, contratos, relatórios, estado e
AGENTS.md são os artefatos oficiais; o HTML é material complementar. Implementação, revisão de requisitos,
testes e avaliações foram feitos por agentes Codex coordenados nesta sessão, com decisões e evidências no Git.
Não há envio automático ao professor nem deploy.
