// Public evaluator journey: real browser + HTTP + default 3s/35s gateway.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const base=process.env.WEB || 'http://127.0.0.1:3000';
const key=process.env.PARTNER_API_KEY || 'catraca-partner-local';
const evidence=resolve(process.env.EVIDENCE_DIR || 'docs/evidence/official-flow');
mkdirSync(evidence,{recursive:true});
const results=[];const errors=[];const startedAt=new Date().toISOString();
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',dialog=>dialog.accept());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const record=(step,detail)=>{results.push({step,detail,at:new Date().toISOString()});console.log(`PASS ${step}: ${detail}`);};
const shot=name=>page.screenshot({path:resolve(evidence,`${name}.png`),fullPage:true});
const api=async(path,method='GET',data,apiKey=key)=>{
  const headers={'Content-Type':'application/json'};if(apiKey!==null)headers['X-Api-Key']=apiKey;
  const response=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
  return {status:response.status,body:await response.json()};
};
const card=suffix=>`400000000000${suffix}`;
const buy=async(id,suffix='0001')=>{
  const response=await api(`/api/partner/events/${id}/purchases`,'POST',{buyerEmail:'parceiro@example.com',cardNumber:card(suffix)});
  assert.equal(response.status,202);assert.equal(response.body.status,'pending');return response.body;
};
const ticket=async id=>(await api(`/api/partner/tickets/${id}`)).body;
const confirmed=async id=>{
  const until=Date.now()+5000;let value;
  do {value=await ticket(id);if(value.status==='confirmed')return value;await sleep(100);}while(Date.now()<until);
  assert.equal(value.status,'confirmed');return value;
};
const login=async(email,password='Catraca123!')=>{
  await page.goto(base+'/login');await page.getByLabel('E-mail',{exact:true}).fill(email);
  await page.getByLabel('Senha',{exact:true}).fill(password);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/login')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();assert.equal((await response).status(),200);
  await page.getByRole('button',{name:'Sair',exact:true}).waitFor();
};
const logout=async()=>{
  const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/logout'));
  await page.getByRole('button',{name:'Sair',exact:true}).click();await response;
  await page.getByRole('link',{name:'Entrar',exact:true}).waitFor();
};
const prefix=`Fluxo ${Date.now()}`;
const future=new Date(Date.now()+35*86400000).toISOString().slice(0,16);
async function fillEvent(name,capacity,price,date=future){
  await page.getByLabel('Nome do evento',{exact:true}).fill(name);
  await page.getByLabel('Data e hora',{exact:true}).fill(date);
  await page.getByLabel('Local',{exact:true}).fill('Casa Catraca');
  await page.getByLabel('Lotação',{exact:true}).fill(String(capacity));
  await page.getByLabel('Preço (R$)',{exact:true}).fill(String(price));
}
async function createEvent(label,capacity,price,publish=true){
  await page.goto(base+'/organizer');await fillEvent(`${prefix} ${label}`,capacity,price);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/organizer/events')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Criar evento',exact:true}).click();const res=await response;
  assert.equal(res.status(),201);const event=await res.json();
  await page.waitForURL(`**/organizer/events/${event.id}`);
  if(publish){const done=page.waitForResponse(r=>r.url().endsWith('/publish'));await page.getByRole('button',{name:'Publicar evento',exact:true}).click();assert.equal((await done).status(),200);}
  return event;
}
async function metric(name,value){await page.getByTestId(`metric-${name}`).waitFor();assert.equal((await page.getByTestId(`metric-${name}`).innerText()).replace(/\s/g,''),String(value).replace(/\s/g,''));}
async function checkIn(code,message){
  await page.getByLabel('Código do ingresso',{exact:true}).fill(code);
  await page.getByRole('button',{name:'Validar ingresso',exact:true}).click();
  await page.getByRole('status').filter({hasText:message}).waitFor();
}
try {
  assert.equal((await api('/api/health')).status,200);record(1,'Clone iniciado externamente por npm run up; saúde HTTP 200.');
  await login('organizador.a@catraca.local');const e1=await createEvent('E1',2,100,false);
  await logout();await page.goto(base+'/');assert.equal(await page.getByRole('article',{name:e1.name,exact:true}).count(),0);
  assert.ok(!(await api('/api/partner/events')).body.some(e=>e.id===e1.id));record(2,'E1 rascunho ausente da vitrine e API.');
  await login('organizador.a@catraca.local');await page.goto(base+'/organizer');
  await fillEvent(`${prefix} Passado`,2,100,new Date(Date.now()-86400000).toISOString().slice(0,16));
  await page.getByRole('button',{name:'Criar evento',exact:true}).click();
  // Native browser constraint or server error must visibly reject the past date.
  await sleep(300);assert.ok(page.url().endsWith('/organizer'));
  const nativeInvalid=await page.getByLabel('Data e hora',{exact:true}).evaluate(el=>!el.checkValidity());
  assert.ok(nativeInvalid || await page.getByRole('alert').count()>0);record(3,'Data passada rejeitada pela interface.');
  await page.goto(base+`/organizer/events/${e1.id}`);const publication=page.waitForResponse(r=>r.url().endsWith('/publish'));
  await page.getByRole('button',{name:'Publicar evento',exact:true}).click();await publication;
  const pub=(await api('/api/partner/events')).body.find(e=>e.id===e1.id);assert.equal(pub.availableSeats,2);assert.equal(pub.priceCents,10000);
  await logout();await page.goto(base+'/');await page.getByRole('article',{name:e1.name,exact:true}).waitFor();record(4,'E1 publicado aparece com 2 vagas e R$100.');
  await page.goto(base+'/register');await page.getByLabel('Nome',{exact:true}).fill('Participante do fluxo');
  await page.getByLabel('E-mail',{exact:true}).fill(`fluxo-${Date.now()}@example.com`);await page.getByLabel('Senha',{exact:true}).fill('Catraca123!');
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();await page.getByRole('button',{name:'Sair',exact:true}).waitFor();
  await page.goto(base+'/');const eventCard=page.getByRole('article',{name:e1.name,exact:true});
  await eventCard.getByLabel('Número do cartão',{exact:true}).fill(card('0001'));
  const purchaseResponse=page.waitForResponse(r=>r.url().endsWith(`/api/events/${e1.id}/purchases`));
  await eventCard.getByRole('button',{name:'Comprar ingresso',exact:true}).click();const ui=(await (await purchaseResponse).json());
  await page.waitForURL('**/tickets');await page.locator(`[data-ticket-id="${ui.ticketId}"]`).getByText('pendente',{exact:true}).waitFor();await shot('01-ingresso-pendente');
  await confirmed(ui.ticketId);await page.reload();await page.locator(`[data-ticket-id="${ui.ticketId}"]`).getByText('confirmado',{exact:true}).waitFor();
  assert.ok((await page.locator(`[data-ticket-id="${ui.ticketId}"]`).innerText()).includes(ui.code));record(5,'Cadastro e compra UI: pendente, confirmado até 5s, evento/código visíveis.');
  const t2Start=Date.now();const t2=await buy(e1.id,'0004');assert.equal((await api('/api/partner/events')).body.find(e=>e.id===e1.id).availableSeats,0);record(6,'Compra lenta pendente ocupa última vaga.');
  assert.equal((await api(`/api/partner/events/${e1.id}/purchases`,'POST',{buyerEmail:'x@example.com',cardNumber:card('0001')})).status,409);
  await page.goto(base+'/');await page.getByRole('article',{name:e1.name,exact:true}).getByText('Ingressos esgotados',{exact:true}).waitFor();await shot('02-esgotado');
  assert.ok(Date.now()-t2Start<30000);record(7,'Antes de 30s: API 409 e UI Ingressos esgotados.');
  await sleep(Math.max(0,45000-(Date.now()-t2Start)));assert.equal((await ticket(t2.ticketId)).status,'declined');
  assert.equal((await api('/api/partner/events')).body.find(e=>e.id===e1.id).availableSeats,1);const t3=await buy(e1.id);await confirmed(t3.ticketId);record(8,'Recusa libera vaga e T3 confirma.');
  await logout();await login('organizador.a@catraca.local');await page.goto(base+`/organizer/events/${e1.id}`);
  await page.getByLabel('Lotação',{exact:true}).fill('1');let save=page.waitForResponse(r=>r.request().method()==='PUT');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();assert.equal((await save).status(),409);await page.getByRole('alert').waitFor();
  await page.getByLabel('Lotação',{exact:true}).fill('3');await page.getByLabel('Preço (R$)',{exact:true}).fill('150');save=page.waitForResponse(r=>r.request().method()==='PUT');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();assert.equal((await save).status(),200);
  const t4=await buy(e1.id);await confirmed(t4.ticketId);await page.reload();
  await metric('confirmed',3);await metric('pending',0);await metric('checkedIn',0);await metric('availableSeats',0);await metric('revenueCents','R$ 350,00');await metric('refunded',0);await shot('03-painel-precos');record(9,'Capacidade protegida e painel 3 confirmados / receita histórica R$350.');
  await checkIn(ui.code,'Entrada liberada');await checkIn(ui.code,'Ingresso já utilizado');await checkIn(t2.code,'Ingresso não confirmado');await checkIn('ZZZZZZZZ','Ingresso inválido para este evento');await metric('checkedIn',1);record(10,'Mensagens check-in exatas e painel com uma entrada.');
  const management=base+`/organizer/events/${e1.id}`;await logout();await login('organizador.b@catraca.local');await page.goto(base+'/organizer');assert.ok(!(await page.locator('body').innerText()).includes(e1.name));
  await page.goto(management);await page.getByRole('alert').waitFor();assert.ok(!(await page.locator('body').innerText()).includes(e1.name));
  const e2=await createEvent('E2',1,20);const tOther=await buy(e2.id);await confirmed(tOther.ticketId);
  await logout();await login('participante@catraca.local');await page.goto(management);await page.getByRole('alert').waitFor();assert.ok(!(await page.locator('body').innerText()).includes(e1.name));
  await logout();await page.goto(management);await page.getByRole('alert').waitFor();assert.ok(!(await page.locator('body').innerText()).includes(e1.name));
  await login('organizador.a@catraca.local');await page.goto(management);await checkIn(tOther.code,'Ingresso inválido para este evento');record(11,'Isolamento de A/B/participante/visitante e código de outro evento.');
  const e3=await createEvent('E3',5,50);const t5Start=Date.now();const t5=await buy(e3.id,'0003');const t6=await buy(e3.id);await confirmed(t6.ticketId);
  const cancellation=page.waitForResponse(r=>r.url().endsWith('/cancel'));await page.getByRole('button',{name:'Cancelar evento',exact:true}).click();assert.equal((await cancellation).status(),200);assert.ok(Date.now()-t5Start<30000);record(12,'E3 cancelado com ingresso confirmado e outro pendente lento.');
  assert.ok(!(await api('/api/partner/events')).body.some(e=>e.id===e3.id));assert.equal((await api(`/api/partner/events/${e3.id}/purchases`,'POST',{buyerEmail:'x@example.com',cardNumber:card('0001')})).status,404);
  assert.equal((await ticket(t6.ticketId)).status,'refunded');assert.equal((await ticket(t5.ticketId)).status,'cancelled');
  await page.goto(base+'/');assert.equal(await page.getByRole('article',{name:e3.name,exact:true}).count(),0);
  await page.goto(base+`/organizer/events/${e3.id}`);
  assert.equal(await page.getByRole('button',{name:'Salvar alterações',exact:true}).isEnabled().catch(()=>false),false);record(13,'Cancelamento imediato: retirado da API, compra404, refunded/cancelled e edição bloqueada.');
  await sleep(Math.max(0,45000-(Date.now()-t5Start)));assert.equal((await ticket(t5.ticketId)).status,'cancelled');await page.reload();await page.getByText('Evento cancelado',{exact:true}).first().waitFor();
  await metric('confirmed',0);await metric('pending',0);await metric('checkedIn',0);await metric('availableSeats',0);await metric('revenueCents','R$ 0,00');await metric('refunded',1);await shot('04-cancelamento');record(14,'Callback tardio não ressuscita ingresso; painel cancelado correto após45s.');
  for(const label of ['E4','E5']){const e=await createEvent(label,5,10);
    // Literal shell pipeline from the public evaluator; values are passed via environment, not interpolated shell code.
    const command=`seq 30 | xargs -P 30 -I{} curl -s -o /dev/null -w '%{http_code}\\n' -X POST "$API/api/partner/events/$EVENT/purchases" -H "X-Api-Key: $KEY" -H 'Content-Type: application/json' -d '{"buyerEmail":"carga{}@example.com","cardNumber":"4000000000000001"}' | sort | uniq -c`;
    const output=execFileSync('bash',['-lc',command],{encoding:'utf8',env:{...process.env,API:base,KEY:key,EVENT:e.id}});
    writeFileSync(resolve(evidence,`concurrency-${label}.log`),output);assert.match(output,/\b5\s+202\b/);assert.match(output,/\b25\s+409\b/);
    await sleep(4000);await page.reload();await metric('confirmed',5);await metric('availableSeats',0);record(`15-${label}`,'Pipeline seq/xargs/curl: 30 simultâneas = 5 respostas202 e25 respostas409; painel5/0.');}
  for(const apiKey of [null,'errada'])for(const [path,method,data] of [['/api/partner/events','GET'],[`/api/partner/events/${e1.id}/purchases`,'POST',{}],['/api/partner/tickets/missing','GET']]){
    const response=await api(path,method,data,apiKey);assert.equal(response.status,401);assert.deepEqual(response.body,{error:'unauthorized'});}
  const invalid=await api(`/api/partner/events/${e1.id}/purchases`,'POST',{buyerEmail:'x@example.com',cardNumber:'123'});assert.equal(invalid.status,422);assert.deepEqual(invalid.body,{error:'invalid_request'});
  assert.deepEqual(await api('/api/partner/tickets/missing'),{status:404,body:{error:'ticket_not_found'}});record(16,'Três rotas401, cartão inválido422 e ticket inexistente404.');
  assert.deepEqual(errors,[]);record('browser','Nenhum erro JavaScript observado.');
  if(process.env.RUN_LIFECYCLE==='1'){
    for(const action of ['gates','down'])writeFileSync(resolve(evidence,`${action}.log`),execFileSync('npm',['run',action],{encoding:'utf8',env:process.env}));
    await assert.rejects(fetch(base+'/api/health'));
    const ids=execFileSync('docker',['ps','--filter',`label=com.docker.compose.project=${process.env.COMPOSE_PROJECT_NAME||'catraca'}`,'-q'],{encoding:'utf8'}).trim();assert.equal(ids,'');
    writeFileSync(resolve(evidence,'restart.log'),execFileSync('npm',['run','up'],{encoding:'utf8',env:process.env}));
    for(const email of ['organizador.a@catraca.local','organizador.b@catraca.local','participante@catraca.local'])await login(email);
    record(17,'Gates PASS; down liberou porta e encerrou containers; up e login das três contas seed funcionam.');
  } else record('17-pending','Executar lifecycle externo ou RUN_LIFECYCLE=1 para comprovar passo17.');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/');await shot('05-mobile');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  record('responsive','Vitrine 390px sem rolagem horizontal.');
}catch(error){console.error(error);await shot('failure').catch(()=>{});results.push({step:'FAIL',error:error.stack});process.exitCode=1;}
finally{await browser.close();writeFileSync(resolve(evidence,'results.json'),JSON.stringify({sha,startedAt,finishedAt:new Date().toISOString(),results,errors},null,2));}
