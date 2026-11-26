const main = document.querySelector('#main');
const navigation = document.querySelector('#navigation');
const ticketLabels = { pending: 'pendente', confirmed: 'confirmado', declined: 'recusado', cancelled: 'cancelado', refunded: 'estornado' };
const eventLabels = { draft: 'Rascunho', published: 'Publicado', cancelled: 'Cancelado' };
const errors = {
  unauthorized: 'Entre na sua conta para acessar esta página.',
  forbidden: 'Esta área não está disponível para sua conta.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_in_use: 'Este e-mail já está cadastrado.',
  invalid_request: 'Confira os campos. A data deve estar no futuro, a lotação deve ser inteira e o preço deve ser maior que zero.',
  capacity_below_occupied: 'A lotação não pode ser menor que as vagas ocupadas.',
  event_not_found: 'Evento não encontrado ou indisponível para sua conta.',
  event_not_available: 'Este evento não está disponível para compra.',
  event_cancelled: 'Evento cancelado',
  event_not_published: 'Publique o evento antes de cancelar.',
  sold_out: 'Ingressos esgotados',
};
let user = null;
let renderVersion = 0;
let fieldId = 0;

function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value === true ? '' : String(value));
  }
  node.append(...children.filter(value => value !== undefined && value !== null));
  return node;
}
function link(text, href, className = '') { return el('a', { href, class: className }, text); }
function button(text, attributes = {}) { return el('button', { type: 'button', ...attributes }, text); }
function money(cents) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100); }
function date(value) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)); }
function notice(message, role = 'status') { return el('p', { role, class: `notice ${role}` }, message); }
function heading(title, subtitle, eyebrow = 'CATRACA / ENCONTROS') {
  return el('div', { class: 'page-heading' }, el('p', { class: 'eyebrow' }, eyebrow), el('h1', {}, title), el('p', { class: 'subtitle' }, subtitle));
}
async function api(path, method = 'GET', data) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(errors[result.error] || 'Não foi possível concluir. Tente novamente.');
  return result;
}
function showError(container, error) { container.replaceChildren(notice(error.message || 'Falha de conexão. Tente novamente.', 'alert')); }
function field(label, name, type = 'text', value = '', attributes = {}) {
  const id = `field-${++fieldId}`;
  const input = el('input', { id, name, type, required: true, ...attributes });
  input.value = value;
  return el('div', { class: 'field' }, el('label', { for: id }, label), input);
}
function bindForm(form, handler) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type=submit]');
    const feedback = form.querySelector('.feedback');
    feedback.replaceChildren();
    submit.disabled = true;
    try { await handler(new FormData(form), feedback); }
    catch (error) { showError(feedback, error); }
    finally { submit.disabled = false; }
  });
  return form;
}
function navigate(path) { history.pushState({}, '', path); render(); }
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href]');
  if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target || anchor.hash || anchor.origin !== location.origin) return;
  event.preventDefault(); navigate(anchor.pathname);
});
window.addEventListener('popstate', render);

function renderNavigation() {
  const items = [link('Vitrine', '/')];
  if (user?.role === 'participant') items.push(link('Meus ingressos', '/tickets'));
  if (user?.role === 'organizer') items.push(link('Meus eventos', '/organizer'));
  if (user) items.push(el('span', { class: 'account-name' }, user.name), button('Sair', { class: 'quiet', onclick: async event => {
    event.currentTarget.disabled = true;
    try { await api('/api/auth/logout', 'POST'); user = null; navigate('/'); }
    catch (error) { main.prepend(notice(error.message, 'alert')); event.target.disabled = false; }
  } }));
  else items.push(link('Entrar', '/login'), link('Criar conta', '/register', 'button small'));
  navigation.replaceChildren(...items);
  for (const anchor of navigation.querySelectorAll('a')) if (anchor.pathname === location.pathname) anchor.setAttribute('aria-current', 'page');
}
function authPage(register) {
  const form = el('form', { class: 'panel stack' },
    ...(register ? [field('Nome', 'name', 'text', '', { autocomplete: 'name', maxlength: 100 })] : []),
    field('E-mail', 'email', 'email', '', { autocomplete: 'email' }),
    field('Senha', 'password', 'password', '', { autocomplete: register ? 'new-password' : 'current-password', minlength: register ? 8 : 1, maxlength: 128 }),
    register ? el('p', { class: 'hint' }, 'Use uma senha com pelo menos 8 caracteres. Sua conta será de participante.') : null,
    el('div', { class: 'feedback' }), button(register ? 'Criar conta' : 'Entrar', { type: 'submit' }),
    link(register ? 'Já tenho uma conta' : 'Quero criar uma conta', register ? '/login' : '/register'));
  bindForm(form, async data => {
    const result = await api(`/api/auth/${register ? 'register' : 'login'}`, 'POST', Object.fromEntries(data));
    user = result.user;
    navigate(user.role === 'organizer' ? '/organizer' : '/');
  });
  return el('section', { class: 'auth-layout' }, heading(register ? 'Seu próximo encontro começa aqui.' : 'Bom ter você de volta.', register ? 'Crie sua conta para garantir seu lugar.' : 'Entre para acompanhar seus eventos e ingressos.'), form);
}
function eventDetails(event) {
  return el('div', { class: 'event-details' }, el('p', {}, date(event.startsAt)), el('p', {}, event.location));
}
function storefront(events) {
  const cards = events.map((event, index) => {
    const content = el('article', { class: 'event-card', 'aria-label': event.name },
      el('div', { class: `card-banner tone-${index % 3}`, 'aria-hidden': 'true' }, el('span', {}, 'AO VIVO. POR PERTO.'), el('b', {}, String(index + 1).padStart(2, '0'))),
      el('div', { class: 'card-content' }, el('h2', {}, event.name), eventDetails(event), el('div', { class: 'price-row' }, el('strong', {}, money(event.priceCents)), el('span', {}, `${event.availableSeats} vagas disponíveis`))));
    const body = content.lastChild;
    if (event.availableSeats <= 0) body.append(notice('Ingressos esgotados'));
    else if (user?.role === 'participant') {
      const form = el('form', { class: 'checkout stack' }, field('Número do cartão', 'cardNumber', 'text', '', { inputmode: 'numeric', pattern: '[0-9]{16}', minlength: 16, maxlength: 16, autocomplete: 'off', placeholder: '16 dígitos' }), el('div', { class: 'feedback' }), button('Comprar ingresso', { type: 'submit' }));
      bindForm(form, async data => {
        await api(`/api/events/${encodeURIComponent(event.id)}/purchases`, 'POST', { cardNumber: data.get('cardNumber') });
        form.reset(); navigate('/tickets');
      });
      body.append(form);
    } else if (!user) body.append(link('Entre para comprar', '/login', 'button'));
    else body.append(el('p', { class: 'hint' }, 'Compras disponíveis para contas de participante.'));
    return content;
  });
  return el('section', {}, heading('Saia da rotina.\nEntre no encontro.', 'Shows, workshops e boas conversas. Encontre o seu próximo evento.', 'AGENDA ABERTA / EXPERIÊNCIAS LOCAIS'), el('div', { class: 'section-title' }, el('h2', {}, 'Explore a agenda'), el('span', {}, `${events.length} eventos`)), cards.length ? el('div', { class: 'event-grid' }, ...cards) : el('div', { class: 'empty' }, el('h2', {}, 'Novos encontros vêm aí.'), el('p', {}, 'Ainda não há eventos publicados. Volte em breve.')));
}
function ticketsPage(tickets) {
  return el('section', {}, heading('Meus ingressos', 'Seu lugar está aqui. Atualize a página para acompanhar o pagamento.'), button('Atualizar ingressos', { class: 'secondary refresh', onclick: render }),
    tickets.length ? el('div', { class: 'ticket-grid' }, ...tickets.map(ticket => el('article', { class: 'panel ticket', 'data-ticket-id': ticket.ticketId }, el('span', { class: `badge ${ticket.status}` }, ticketLabels[ticket.status]), el('h2', {}, ticket.eventName), eventDetails(ticket), el('p', { class: 'ticket-code-label' }, 'Código do ingresso'), el('code', { class: 'ticket-code' }, ticket.code), el('p', { class: 'hint' }, ticket.checkedIn ? 'Check-in realizado' : 'Apresente este código na entrada.'), el('strong', {}, money(ticket.priceCents))))) : el('div', { class: 'empty' }, el('h2', {}, 'Sua agenda está começando.'), link('Encontrar um evento', '/', 'button')));
}
function localDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function priceInput(cents) { return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`; }
function centsFromInput(value) {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Informe um preço positivo em reais, com até duas casas decimais.');
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 1) throw new Error('Informe um preço positivo em reais.');
  return cents;
}
function eventForm(event = null) {
  const cancelled = event?.status === 'cancelled';
  const fields = el('fieldset', { disabled: cancelled, class: 'form-grid' },
    field('Nome do evento', 'name', 'text', event?.name || '', { maxlength: 200 }),
    field('Data e hora', 'startsAt', 'datetime-local', localDate(event?.startsAt)),
    field('Local', 'location', 'text', event?.location || '', { maxlength: 300 }),
    field('Lotação', 'capacity', 'number', event?.capacity || '', { min: 1, step: 1 }),
    field('Preço (R$)', 'price', 'text', event ? priceInput(event.priceCents) : '', { inputmode: 'decimal', placeholder: 'Ex.: 35,00' }));
  const form = el('form', { class: 'panel stack' }, el('h2', {}, event ? 'Dados do evento' : 'Criar um novo encontro'), fields, el('div', { class: 'feedback' }), button(event ? 'Salvar alterações' : 'Criar evento', { type: 'submit', disabled: cancelled }));
  bindForm(form, async (data, feedback) => {
    const startsAt = new Date(data.get('startsAt'));
    if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) throw new Error('A data e hora de início devem estar no futuro.');
    const input = { name: data.get('name'), startsAt: startsAt.toISOString(), location: data.get('location'), capacity: Number(data.get('capacity')), priceCents: centsFromInput(data.get('price')) };
    const saved = await api(event ? `/api/organizer/events/${encodeURIComponent(event.id)}` : '/api/organizer/events', event ? 'PUT' : 'POST', input);
    if (!event) navigate(`/organizer/events/${encodeURIComponent(saved.id)}`);
    else await render('Alterações salvas.');
  });
  return form;
}
function organizerPage(events) {
  return el('section', {}, heading('Meus eventos', 'Da primeira ideia à última entrada. Organize cada encontro por aqui.'), el('div', { class: 'organizer-layout' }, eventForm(), el('section', { class: 'stack' }, el('h2', {}, 'Sua agenda'), ...events.map(event => el('article', { class: 'panel owned-event' }, el('span', { class: `badge ${event.status}` }, eventLabels[event.status]), el('h3', {}, link(event.name, `/organizer/events/${encodeURIComponent(event.id)}`)), eventDetails(event), link('Gerenciar evento →', `/organizer/events/${encodeURIComponent(event.id)}`))), events.length ? null : el('p', { class: 'empty' }, 'Você ainda não criou um evento.'))));
}
const metricLabels = { confirmed: 'Confirmados', pending: 'Pendentes', checkedIn: 'Check-ins', availableSeats: 'Vagas disponíveis', revenueCents: 'Receita', refunded: 'Estornados' };
function metricsPanel(metrics) {
  return el('div', { class: 'metrics' }, ...Object.entries(metricLabels).map(([key, label]) => el('div', { class: 'metric' }, el('span', {}, label), el('strong', { 'data-testid': `metric-${key}` }, key === 'revenueCents' ? money(metrics[key]) : String(metrics[key])))));
}
function managementPage(event, metrics) {
  const path = `/api/organizer/events/${encodeURIComponent(event.id)}`;
  const cancelled = event.status === 'cancelled';
  const metricsContainer = el('div', {}, metricsPanel(metrics));
  const feedback = el('div', { class: 'feedback' });
  const actions = el('div', { class: 'actions' });
  async function change(action, message) {
    const buttons = actions.querySelectorAll('button');
    buttons.forEach(item => { item.disabled = true; });
    try { await api(`${path}/${action}`, 'POST'); await render(message); }
    catch (error) { showError(feedback, error); buttons.forEach(item => { item.disabled = false; }); }
  }
  if (event.status === 'draft') actions.append(button('Publicar evento', { onclick: () => change('publish', 'Evento publicado.') }));
  if (event.status === 'published') actions.append(button('Cancelar evento', { class: 'danger', onclick: () => {
    if (window.confirm('Cancelar este evento? Esta ação é irreversível. Os ingressos confirmados serão estornados e os pendentes serão cancelados.')) change('cancel', 'Evento cancelado');
  } }));
  const checkin = el('section', { class: 'panel stack' }, el('h2', {}, 'Recepção / Check-in'));
  if (cancelled) checkin.append(notice('Evento cancelado'));
  else {
    const form = el('form', { class: 'stack' }, field('Código do ingresso', 'code', 'text', '', { autocomplete: 'off' }), el('div', { class: 'feedback' }), button('Validar ingresso', { type: 'submit' }));
    bindForm(form, async (data, result) => {
      const response = await api(`${path}/check-in`, 'POST', { code: data.get('code').trim() });
      result.replaceChildren(notice(response.message));
      metricsContainer.replaceChildren(metricsPanel(await api(`${path}/dashboard`)));
    });
    checkin.append(form);
  }
  return el('section', {}, link('← Meus eventos', '/organizer', 'back-link'), heading(event.name, `${eventLabels[event.status]} · ${date(event.startsAt)} · ${event.location}`, 'ÁREA DO ORGANIZADOR / GESTÃO'),
    cancelled ? notice('Este evento foi cancelado. A edição e as vendas estão encerradas.') : null,
    el('div', { class: 'section-title' }, el('h2', {}, 'Painel do evento'), button('Atualizar painel', { class: 'quiet', onclick: render })), metricsContainer,
    el('div', { class: 'management-layout' }, eventForm(event), el('div', { class: 'stack' }, checkin, el('section', { class: 'panel stack' }, el('h2', {}, 'Publicação'), el('p', { class: 'hint' }, cancelled ? 'Cancelamento irreversível. Seus registros continuam disponíveis neste painel.' : 'Publique para abrir as vendas. O cancelamento encerra o evento e devolve os ingressos confirmados.'), actions, feedback))));
}
async function render(message) {
  const version = ++renderVersion;
  const currentPath = location.pathname;
  main.replaceChildren(el('p', { class: 'loading', role: 'status' }, 'Carregando…'));
  try {
    const session = await api('/api/auth/me');
    if (version !== renderVersion) return;
    user = session.user;
    renderNavigation();
    let page;
    if (currentPath === '/') page = storefront(await api('/api/events'));
    else if (currentPath === '/login' || currentPath === '/register') page = authPage(currentPath === '/register');
    else if (currentPath === '/tickets') page = ticketsPage(await api('/api/tickets'));
    else if (currentPath === '/organizer') page = organizerPage(await api('/api/organizer/events'));
    else if (/^\/organizer\/events\/[A-Za-z0-9_-]+$/.test(currentPath)) {
      // No event data is rendered (or cached) before this ownership-protected request succeeds.
      const event = await api(`/api${currentPath}`);
      const metrics = await api(`/api${currentPath}/dashboard`);
      page = managementPage(event, metrics);
    } else page = el('section', {}, heading('Página não encontrada', 'Volte à vitrine para encontrar um evento.'), link('Vitrine', '/', 'button'));
    if (version !== renderVersion) return;
    main.replaceChildren(...(typeof message === 'string' ? [notice(message)] : []), page);
    document.title = `${main.querySelector('h1')?.textContent || 'Catraca'} · Catraca`;
    main.focus({ preventScroll: true });
  } catch (error) {
    if (version !== renderVersion) return;
    main.replaceChildren(heading('Não foi possível abrir esta página', 'Se necessário, entre com uma conta que tenha acesso.'), notice(error.message, 'alert'), link('Voltar à vitrine', '/', 'button'));
  }
}
render();
