# Acordo observável da interface

F06 deve fornecer semântica acessível para usuário e automação do fluxo público:

- Navegação Vitrine, Meus ingressos (participante), Meus eventos (organizador), Entrar, Criar conta, Sair.
- /login: labels E-mail, Senha; botão Entrar.
- /register: Nome, E-mail, Senha; botão Criar conta.
- /organizer: formulário Nome do evento, Data e hora, Local, Lotação, Preço (R$); botão Criar evento.
- /organizer/events/:id: mesmos labels, Salvar alterações, Publicar evento, Cancelar evento.
  Cancelamento pede confirmação via `window.confirm`. Labels de painel e `data-testid`:
  metric-confirmed, metric-pending, metric-checkedIn, metric-availableSeats, metric-revenueCents, metric-refunded.
  Cada testid envolve só o valor; label visível adjacente.
- Check-in: label Código do ingresso, botão Validar ingresso. Mensagem literal em role=status.
- /: cada evento em article com aria-label igual ao nome. Card mostra local/data/preço/vagas.
  Participante compra no card com label Número do cartão e botão Comprar ingresso.
  Após compra navega /tickets mostrando pendente; esgotado exibe Ingressos esgotados.
- /tickets: cada ingresso em article com data-ticket-id, evento, status PT-BR e código.
- Erros role=alert, mensagens de sucesso role=status. Todas navegações funcionam ao recarregar.
- Ações usam fetch JSON na mesma origem; sem innerHTML para dados externos.
- Gestão deve carregar autorização ANTES de mostrar qualquer dado de evento.

Este acordo define nomes/semântica para testes e acessibilidade, não altera regras do brief.
