# Arquitetura e acordos de implementação

Node 24.22.3, ESM, HTTP nativo, SQLite `node:sqlite`, aplicação de origem única na porta 3000.
UI HTML/CSS/JS sem build nem dependências de produção. Docker fixa runtime; volume guarda SQLite.

## Módulos e dono

F01 root: db.js, security.js, http.js, seed.js, server.js e harness.
F02 agente auth: auth.js e tests/auth.test.js.
F03 agente events: events.js e tests/events.test.js.
F04 root: purchases.js e partner.js e integração server.js.
F05 agente operations: operations.js e testes.
F06 agente UI: public/* e testes de navegador.

Handlers assíncronos recebem `{req,res,url,db}` e retornam true se atenderam, false caso contrário.
`HttpError(status,error)`, `json(res,status,data,headers={})` e `await body(req)` vêm de http.js.
`transaction(db,fn)` é síncrona. Não usar await dentro dela. `id(prefix)`, `hashPassword`,
`verifyPassword` e `validEmail` vêm de security.js. Schema camelCase está em db.js.

Auth exporta `authHandler(ctx)`, `currentUser(db,req)` (user sem hash ou null),
`requireUser(db,req,role)` (401 visitante,403 papel incorreto). Cookie `catraca_session`, HttpOnly, SameSite=Strict, Path=/.
Rotas POST /api/auth/register {name,email,password}, POST /api/auth/login {email,password},
POST /api/auth/logout, GET /api/auth/me => {user:objeto|null}. Login/registro retornam {user}.
Organizador só vem da seed. Registro ignora/rejeita role; sempre participant.

Events exporta `eventsHandler(ctx)`, `createEvent(db,organizerId,input)`, `updateEvent(db,organizerId,id,input)`,
`publishEvent(db,organizerId,id)`, `ownedEvent(db,organizerId,id)` (404 se não dono),
`listPublicEvents(db)` e `listOwnedEvents(db,organizerId)`.
Dados {name,startsAt,location,capacity,priceCents}; retorno event completo com availableSeats.
GET /api/events => array; GET/POST /api/organizer/events; GET/PUT /api/organizer/events/:id;
POST /api/organizer/events/:id/publish. POST criação 201, demais sucesso 200.
F03 handler importa requireUser de auth.js quando integrado; testes serviço independentes da auth.

F04 exporta `purchase(db,eventId,{buyerEmail,cardNumber},userId=null,options={})` => {ticketId,code,status:'pending'};
`processPayments(db,now=Date.now())`; `purchasesHandler(ctx)` para POST /api/events/:id/purchases
(participant, email da conta, body {cardNumber}), GET /api/tickets (só próprios, eventName incluso).
`partnerHandler(ctx)` para contrato literal do brief. Atrasos padrão 3000/35000ms (dentro das faixas);
options.fastDelayMs/slowDelayMs somente testes diretos, nunca configurados no Compose padrão.
Worker executa a cada 100ms. Não armazena cartão, só approved e dueAt.
O relógio de pagamentos usa epoch inicial + tempo monotônico decorrido (`src/clock.js`), protegendo
os atrasos durante o processo contra ajustes do relógio de parede. Prazos persistidos permitem retomada.

F05 exporta `operationsHandler(ctx)` e funções `dashboard(db,eventId)`, `cancelEvent(db,organizerId,eventId)`,
`checkIn(db,organizerId,eventId,code)`. GET /api/organizer/events/:id/dashboard =>
{confirmed,pending,checkedIn,availableSeats,revenueCents,refunded};
POST /cancel => event; POST /check-in {code} => {message}. Todos exigem dono.

F06 UI usa /, /login, /register, /tickets, /organizer, /organizer/events/:id.
Gestão busca event autenticado ANTES de renderizar qualquer dado. Usa textContent para dados não confiáveis.

## Concorrência e referências primárias

BEGIN IMMEDIATE adquire a transação de escrita antes de ler vagas. Compra lê ocupação e insere
pending sob o mesmo lock; edição/cancelamento/callback usam o mesmo protocolo. Logo dois escritores
não observam a mesma última vaga como livre. WAL permite leitores. busy_timeout=5000 absorve disputa curta.
Não há espera de rede dentro de transação. Preço é copiado para ticket na mesma transação.

- https://www.sqlite.org/lang_transaction.html
- https://www.sqlite.org/isolation.html
- https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html

SQLite é suficiente para MVP local de processo único, sem serviços externos. Não há promessa de alta disponibilidade.
