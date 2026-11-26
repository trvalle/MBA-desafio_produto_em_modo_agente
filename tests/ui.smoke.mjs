// Optional real-browser smoke: node tests/ui.smoke.mjs (requires Playwright Chromium).
// Isolated in-memory database and ephemeral HTTP port; never touches the running product.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
import { authHandler } from '../src/auth.js';
import { eventsHandler } from '../src/events.js';
import { purchasesHandler } from '../src/purchases.js';
import { partnerHandler } from '../src/partner.js';
import { operationsHandler } from '../src/operations.js';
import { staticHandler } from '../src/static.js';

const db = openDb(':memory:');
const server = createApp({ db, handlers: [partnerHandler, authHandler, eventsHandler, purchasesHandler, operationsHandler, staticHandler] });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', error => jsErrors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const login = async email => {
    await page.goto(base + '/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('Catraca123!');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Sair', exact: true }).waitFor();
  };
  const logout = async () => {
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await page.getByRole('link', { name: 'Entrar', exact: true }).waitFor();
  };
  const eventName = '<img src=x onerror=alert(1)> Encontro';
  await login('organizador.a@catraca.local');
  await page.goto(base + '/organizer');
  await page.getByLabel('Nome do evento', { exact: true }).fill(eventName);
  await page.getByLabel('Data e hora', { exact: true }).fill(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16));
  await page.getByLabel('Local', { exact: true }).fill('Casa do encontro');
  await page.getByLabel('Lotação', { exact: true }).fill('1');
  await page.getByLabel('Preço (R$)', { exact: true }).fill('10,29');
  const created = page.waitForResponse(response => response.url().endsWith('/api/organizer/events') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar evento', exact: true }).click();
  const event = await (await created).json();
  assert.equal(event.priceCents, 1029);
  await page.waitForURL(`**/organizer/events/${event.id}`);
  await page.getByRole('button', { name: 'Publicar evento', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar evento', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: eventName, exact: true }).waitFor();
  assert.equal(await page.locator('img').count(), 0);
  await logout();

  await page.goto(base + '/register');
  await page.getByLabel('Nome', { exact: true }).fill('Nova participante');
  await page.getByLabel('E-mail', { exact: true }).fill('nova@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('Catraca123!');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByRole('link', { name: 'Meus ingressos', exact: true }).waitFor();
  const card = page.getByRole('article', { name: eventName, exact: true });
  await card.getByLabel('Número do cartão', { exact: true }).fill('4000000000000001');
  await card.getByRole('button', { name: 'Comprar ingresso', exact: true }).click();
  await page.waitForURL('**/tickets');
  await page.getByText('pendente', { exact: true }).waitFor();
  const code = await page.locator('.ticket-code').innerText();
  await page.goto(base + '/');
  await page.getByText('Ingressos esgotados', { exact: true }).waitFor();
  await page.goto(base + `/organizer/events/${event.id}`);
  await page.getByRole('alert').waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes(eventName));
  const until = Date.now() + 5000;
  do {
    await page.goto(base + '/tickets');
    await page.locator('[data-ticket-id]').waitFor();
    if (await page.getByText('confirmado', { exact: true }).count()) break;
    await new Promise(resolve => setTimeout(resolve, 150));
  } while (Date.now() < until);
  assert.equal(await page.getByText('confirmado', { exact: true }).count(), 1);
  await logout();
  await page.goto(base + `/organizer/events/${event.id}`);
  await page.getByRole('alert').waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes(eventName));
  await login('organizador.b@catraca.local');
  await page.goto(base + `/organizer/events/${event.id}`);
  await page.getByRole('alert').waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes(eventName));
  await logout();

  await login('organizador.a@catraca.local');
  await page.goto(base + `/organizer/events/${event.id}`);
  await page.getByTestId('metric-confirmed').waitFor();
  assert.equal(await page.getByTestId('metric-confirmed').innerText(), '1');
  assert.equal((await page.getByTestId('metric-revenueCents').innerText()).replace(/\s/g, ''), 'R$10,29');
  await page.getByLabel('Código do ingresso', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Validar ingresso', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Entrada liberada' }).waitFor();
  await page.getByRole('button', { name: 'Validar ingresso', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Ingresso já utilizado' }).waitFor();
  assert.equal(await page.getByTestId('metric-checkedIn').innerText(), '1');
  await page.getByRole('button', { name: 'Cancelar evento', exact: true }).click();
  await page.getByRole('status').filter({ hasText: /^Evento cancelado$/ }).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Salvar alterações', exact: true }).isDisabled(), true);
  assert.equal(await page.getByTestId('metric-refunded').innerText(), '1');
  assert.equal(await page.getByTestId('metric-availableSeats').innerText(), '0');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(jsErrors, []);
  console.log('PASS UI smoke: registration/session, event creation/publication, exact cents, text-only markup, direct reload, pending/confirmed, sold out, access isolation, check-in, cancellation and mobile management.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  db.close();
}
