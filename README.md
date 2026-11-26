# Catraca — do brief ao produto em modo agente

MVP local de venda de ingressos, construído com especificações e avaliação independente.
**Em desenvolvimento.** Consulte [estado real](docs/state.json); ainda não está pronto para submissão.

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
- PRs mergeados da wave paralela: [F02 — autenticação #1](https://github.com/trvalle/MBA-desafio_produto_em_modo_agente/pull/1) e [F03 — eventos #2](https://github.com/trvalle/MBA-desafio_produto_em_modo_agente/pull/2). Os intervalos de commits se sobrepõem; as branches/worktrees foram implementadas simultaneamente por agentes distintos.

## Decisões

Node 24 e SQLite reduzem dependências para o MVP local. Dinheiro usa centavos inteiros.
R07: leitura de vagas e inserção do ingresso pendente na mesma transação `BEGIN IMMEDIATE`;
edição de lotação, cancelamento e callback seguem o mesmo lock de escrita.
Gateway simulado persistirá prazo e resultado no banco e será processado assincronamente.
Avaliações serão realizadas por subagentes novos com contexto vazio; relatórios commitados são imutáveis.
Consulte [a arquitetura](docs/architecture.md) para referências primárias e acordos entre features.
