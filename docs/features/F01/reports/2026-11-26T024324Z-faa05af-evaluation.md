# F01 — Avaliação independente: FAIL

- Data UTC de fechamento: 2026-11-26 02:43:24 UTC (clock.curr_time).
- Commit avaliado: `faa05af785ad2a16012a8c624edf2e25981a55aa`.
- Ferramenta: Codex desktop; avaliador: subagente `eval_foundation`.
- Modelo: GPT-6 (variante exata não exposta pela sessão).
- Separação: agente novo, contexto inicial vazio, distinto do implementador. Não alterei código, contrato, critérios ou testes do produto. Não fiz commit/push.
- Fontes lidas: AGENTS.md, brief, PRD, arquitetura, spec, plan e contract de F01 no commit acima.
- Ambiente: Windows com comandos executados no Ubuntu-24.04/WSL; `uname -sr`: `Linux 6.18.58.1-microsoft-standard-WSL2`; Node `v24.22.3`; Docker `29.8.1`, Compose `v5.5.1`; contexto `catraca-wsl`.

## Veredito por item

| Item | Veredito | Evidência |
|---|---|---|
| F01-T01 | PASS | Clone novo, volume novo, `npm run up` exit 0, container healthy e HTTP 200 `{"status":"ok"}`. Três contas observadas no SQLite do container (E1/E2). |
| F01-T02 | PASS | `down` removeu container/rede; docker ps filtrado vazio e curl exit 7. Novo `up` saudável, três contas sem duplicação, shutdown novamente comprovado (E3). |
| F01-T03 | PASS | `docker compose exec -T app npm run seed` executado duas vezes, exit 0; três contas, dois organizer e um participant; senha demonstrativa verificada para as três (E2). |
| F01-T04 | PASS | `npm run gates` executado na branch main do clone, SHA acima, exit 0: 2 testes, 2 pass, 0 fail. Container descartável e DB_PATH=:memory: no script (E4). |
| F01-T05 | FAIL | Rollback síncrono passou e schema não possui coluna de cartão completo. Porém banco aceita priceCents=1.5 como REAL, e transaction aceita callback async com mutação após COMMIT (E5). |
| F01-T06 | PASS | Inspeção objetiva de README, AGENTS.md, package.json, Compose, Dockerfile e scripts; comandos e ambiente WSL realmente exercitados (E6). |

**Resultado: F01 reprovada. Não marcar concluída.** São necessárias correções em F01-T05 e novo relatório de avaliação.

## E1 — Clone limpo e prontidão

Comandos executados em WSL:

```sh
git clone --no-hardlinks "/mnt/f/MBA/Catraca do brief ao produto em modo agente" /tmp/catraca-f01-eval-20261126T0243
cd /tmp/catraca-f01-eval-20261126T0243
git checkout --detach faa05af
git rev-parse HEAD
git status --porcelain
export COMPOSE_PROJECT_NAME=catraca-f01-eval-20261126t0243
npm run up
curl --fail --silent --show-error --include http://localhost:3000/api/health
docker compose ps
```

O clone é local, sem hardlinks, e estava sem alterações. SHA retornado: `faa05af785ad2a16012a8c624edf2e25981a55aa`. Nenhum npm install ou arquivo de configuração adicional foi necessário. COMPOSE_PROJECT_NAME foi usado exclusivamente para isolar o volume e preservar dados do projeto original; não alterou serviços, código, porta ou gateway. O log confirmou criação do volume `catraca-f01-eval-20261126t0243_catraca-data`.

Saídas relevantes reais:

```text
Container catraca-f01-eval-20261126t0243-app-1 Healthy
HTTP/1.1 200 OK
{"status":"ok"}
catraca-f01-eval-20261126t0243-app-1 ... Up 2 seconds (healthy) 127.0.0.1:3000->3000/tcp
```

## E2 — Seed e credenciais persistidas

Executei duas vezes `docker compose exec -T app npm run seed`. Ambas retornaram `Seed pronta (idempotente).`, exit 0. Inspecionei o banco persistente do container com `docker compose exec -T app node --input-type=module`, importando openDb e verifyPassword, selecionando id/email/role/passwordHash e verificando a senha do README sem imprimir hashes.

```text
[{"id":"org_a","email":"organizador.a@catraca.local","role":"organizer","passwordValid":true},{"id":"org_b","email":"organizador.b@catraca.local","role":"organizer","passwordValid":true},{"id":"participant","email":"participante@catraca.local","role":"participant","passwordValid":true}]
TOTAL 3
```

Login HTTP não foi alegado: o contrato atribui sua avaliação a F02/CF01.

## E3 — Encerramento e reinício

Com a mesma variável de projeto, executei `npm run down`, seguido por:

```sh
docker ps --filter label=com.docker.compose.project=catraca-f01-eval-20261126t0243 --format '{{.Names}}'
curl --silent --show-error --max-time 3 http://localhost:3000/api/health
```

O primeiro comando não retornou nomes. O segundo retornou `curl: (7) Failed to connect to localhost port 3000 after 0 ms: Couldn't connect to server`; exit code 7 capturado pelo processo externo. O down retornou exit 0 e registrou container Stopped/Removed e Network Removed.

Repeti `npm run up`: exit 0, healthy, HTTP `{"status":"ok"}`. Nova consulta ao banco retornou as mesmas três contas da E2 e `RESTART_TOTAL 3`. Finalizei com novo down e repeti os checks: docker ps vazio, curl exit 7. O projeto de avaliação ficou parado; volumes foram preservados.

## E4 — Gates e testes

Antes do comando definitivo, `git checkout main` retornou `Your branch is up to date with 'origin/main'.`; `git rev-parse HEAD` retornou o SHA avaliado. Executei `npm run gates`, exit 0. Saída real resumida:

```text
> node scripts/compose.js gates
> node --test --test-concurrency=1 tests/*.test.js
✔ F01 seed idempotente, credenciais e rollback real (85.708159ms)
✔ F01 saúde HTTP real (75.241582ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 207.663395
```

Também executei `npm test` diretamente em Node 24 Linux: 2 pass, 0 fail, exit 0. A inspeção de scripts/compose.js confirma `docker compose run --rm --no-deps -e DB_PATH=:memory: app npm test`. Os dois testes atuais não cobrem as falhas abaixo.

## E5 — Falhas reproduzidas no commit avaliado

Probe independente executado via stdin de `node --input-type=module` em WSL, importando módulos do clone avaliado e usando somente banco em memória:

```js
import { openDb, transaction } from '/tmp/catraca-f01-eval-20261126T0243/src/db.js';
import { seed } from '/tmp/catraca-f01-eval-20261126T0243/src/seed.js';
const db = openDb(':memory:'); seed(db);
const insert = db.prepare('INSERT INTO events(id,organizerId,name,startsAt,location,capacity,priceCents) VALUES(?,?,?,?,?,?,?)');
try {
  insert.run('fraction','org_a','Probe','2030-01-01T00:00:00Z','Here',1,1.5);
  console.log('FRACTIONAL_PRICE_ACCEPTED',JSON.stringify(db.prepare('SELECT priceCents,typeof(priceCents) type FROM events').get()));
} catch(e) { console.log('FRACTIONAL_PRICE_REJECTED',e.message); }
const operations=[];
const wrapped={exec(sql){operations.push(sql);return db.exec(sql);}};
try {
  const returned=transaction(wrapped,async()=>{
    await Promise.resolve(); operations.push('async mutation');
    db.prepare("DELETE FROM users WHERE id='org_b'").run();
  });
  console.log('ASYNC_CALLBACK_RETURNED_PROMISE',returned instanceof Promise);
  await returned;
} catch(e) {console.log('ASYNC_CALLBACK_REJECTED',e.message);}
console.log('OPERATIONS',JSON.stringify(operations)); db.close();
```

Saída observada, exit 0:

```text
FRACTIONAL_PRICE_ACCEPTED {"priceCents":1.5,"type":"real"}
ASYNC_CALLBACK_RETURNED_PROMISE true
OPERATIONS ["BEGIN IMMEDIATE","COMMIT","async mutation"]
```

1. F01-AC05 exige dinheiro inteiro. A afinidade INTEGER das tabelas SQLite atuais não impõe isso: a gravação real de 1,5 centavo foi aceita. O mesmo schema de tickets também declara INTEGER sem verificação estrita de tipo; não afirmo que o probe acima tenha gravado ticket fracionário.
2. A spec afirma que transaction não aceita trabalho assíncrono. O utilitário não rejeita callback async/Promise e encerra o lock antes da mutação. Isso cria um contrato de atomicidade falso para consumidores que inadvertidamente usem async.

Partes aprovadas dentro do item: inspeção constatou PKs, FKs habilitadas, UNIQUE em código de ticket, ausência de coluna de cartão completo e BEGIN IMMEDIATE. O teste automatizado efetivamente remove org_b dentro de transação, lança exceção e comprova restauração via rollback. Essas partes não anulam as duas reprovações.

## E6 — Documentação e limites

README documenta Git/Node/Docker Compose, WSL, up/down/gates, porta 3000, credenciais e chave demonstrativas, mapa dos artefatos e decisões. AGENTS.md contém comandos, regras e mapa. Dockerfile fixa Node 24.22.3; Compose contém um serviço local e volume. Runtime do produto é Node; SQLite é embutido. O ambiente real utilizado está registrado no cabeçalho.

Esta avaliação cobre somente F01 no SHA declarado. Não atesta login real, compra, gateway, interface, concorrência comercial ou fluxo final das demais features. A prontidão é o endpoint /api/health explicitamente previsto pelo contrato F01. As execuções preliminares anteriores ao contrato não substituíram as evidências acima. Nenhuma captura visual foi necessária para este contrato de infraestrutura.
