from pathlib import Path
from datetime import datetime, timezone
import json

root=Path('.')
stamp=datetime.now(timezone.utc).isoformat()
evidence='../../../evidence/eval-sales-ops-20261125/'
intro=f'''Data de emissão UTC: {stamp}
Commit avaliado: `95ecfd3fca730b3dd1c1e14a7e09abd40b2bf6b0`.
Ferramenta: Codex desktop. Modelo informado: GPT-6 (variante exata não exposta).
Avaliador: subagente novo `/root/eval_sales_operations`, contexto inicial vazio, distinto dos implementadores; recebeu apenas tarefa, fontes e checkout. Não implementou nem modificou o produto. Nenhum relatório existente foi alterado.

Ambiente: clone local isolado `/root/catraca-evals/sales-ops`, WSL Ubuntu 24.04, Node v24.22.3. Produto real `createApp`, SQLite novo em memória por execução e porta HTTP efêmera, gateway padrão e worker de 100ms. Também executei `COMPOSE_PROJECT_NAME=catraca-eval-sales PORT=3145 npm run up` e obtive `/api/health` 200, sem usar a porta 3000. `npm run gates` no projeto Compose isolado: exit 0, 28 testes aprovados. Os gates são complementares; as provas HTTP e temporais são independentes.

Fontes lidas: AGENTS.md, brief, PRD, arquitetura, specs e contratos F03/F04/F05. Critérios não foram alterados. O escopo desta avaliação é serviço/HTTP; a interface pertence a F06 e não é aprovada aqui.

Evidências: [probe original]({evidence}probe.mjs), [respostas originais]({evidence}http.jsonl), [resultados originais]({evidence}results.json), [probe monotônico]({evidence}probe-attempt2.mjs), [HTTP/heartbeat monotônicos]({evidence}http-attempt2.jsonl), [resultados monotônicos]({evidence}results-attempt2.json), [isolamento das operações]({evidence}probe-operations-isolation.mjs), [respostas do isolamento]({evidence}operations-isolation.jsonl), [gate]({evidence}gates-confirmed.log), [subida]({evidence}up.log), [encerramento]({evidence}cleanup.log).

Reprodução a partir do SHA: `node docs/evidence/eval-sales-ops-20261125/probe-attempt2.mjs`; `node docs/evidence/eval-sales-ops-20261125/probe-operations-isolation.mjs`. Não configurar fastDelayMs/slowDelayMs. Os scripts abrem servidor/banco próprios e fecham ambos em finally. Logs incluem entradas, HTTP, JSON, latências, IDs reais e asserções. A falha de relógio depende das oscilações reais do ambiente; não simulei nem corrigi o relógio do sistema nesta avaliação.

Limitação e achado transversal: a primeira tentativa usou Date.now para duração e encontrou saltos de +96,313s e -51,323s; sua prova temporal isolada não é válida. A segunda usa performance.now no mesmo processo e polling de 100ms, além de heartbeat. Ela confirmou finais 0003 e 0004 concluídos em **2059,286411ms e 2058,894127ms monotônicos**, respectivamente. O heartbeat também registra salto de +96416,191202ms do relógio civil relativo ao monotônico. O produto deste SHA usa Date.now na criação e no processamento do prazo; portanto a oscilação externa efetivamente antecipa o gateway. Isso reprova a exigência temporal, não é descartado como simples erro de medição.
'''

rows={
'F03':[
('F03-T01','PASS','14 casos HTTP inválidos (campos ausentes, data passada/inválida, capacidade 0/fracionária e preço 0/fracionário) deram 422 sem criar eventos; criação válida nasceu draft.'),
('F03-T02','PASS','Duas reservas reais pending: capacidade1 rejeitada 409 capacity_below_occupied sem alteração parcial; aumento5 aceito com3 vagas; edição com data passada422. Gates adicionais cobrem fixture pending+confirmed e exclusão dos demais estados.'),
('F03-T03','PASS','Catálogos público/parceiro excluíram draft, incluíram publicado e retiraram evento após cancelamento real de F05. Reavaliação resolve o BLOCKED anterior por F05 ausente.'),
('F03-T04','PASS','ownedEvent/update/publish de outro dono lançaram404; listas do domínio e HTTP só próprios; GET/PUT/publish integrado devolveu401 visitante,403 participante,404 outro organizador.'),
('F03-T05','PASS','Evento cancelado real rejeitou PUT e publish409 event_cancelled, no serviço e HTTP; gates cobrem também fixture cancelada.'),
('F03-T06','PASS','GET por ID do dono retornou evento; outro organizador, participante e visitante não obtiveram dados. URL de gestão de UI fica para F06.'),
('F03-CF02','PASS','Schema, compras reais e transação preservaram atomicidade e lotação; leitura posterior confirmou rollback de edição recusada.'),
('F03-CF11','PASS','Adapter integrado exigiu papel e propriedade; inspeção confirma dependência auth carregada apenas no handler; domínio exercitado diretamente.')],
'F04':[
('F04-T01','PASS','Compras web e API responderam202 pending imediatamente;5 IDs/códigos únicos,5 reservas; preço10000 persistido, sem número de cartão em tickets.'),
('F04-T02','FAIL','Inválidos não criaram ingresso. Finais0001/0002/outro concluíram em~2,06s; 0003 confirmou2059,286411ms e0004 recusou2058,894127ms, antes de30s. Falha real em relógio civil oscilante, comprovada monotonicamente.'),
('F04-T03','PASS','Três eventos novos, capacidade5, cada rajada30 concorrentes: exatamente5 HTTP202 e25 HTTP409, ocupação5; painel final5 confirmados/0 vagas.'),
('F04-T04','PASS','Aprovação/recusa e liberação de vagas observadas. Probe suplementar criou pending antes de cancelar e manteve cancelled/refunded após45s reais em ambos os canais. A sequência original com cartão lento antes da rápida foi prejudicada por T02.'),
('F04-T05','PASS','Chave ausente/errada401 unauthorized nas três rotas; chave precede JSON malformado; corpo inválido422 antes de evento ausente/esgotado; ausente/draft/cancelado404 event_not_available; cheio409 sold_out; ticket ausente404 ticket_not_found. JSON exato comparado.'),
('F04-T06','PASS','Listagem e consulta verificadas por conjunto exato de campos e tipos; resposta compra ticketId/code/status; consulta de ingresso web via parceiro com checkedIn boolean.'),
('F04-T07','PASS','Duas contas, compra web e API com mesmo email: cada conta vê só próprios web, parceiro userId null, evento/status/código presentes.'),
('F04-CF03','PASS','Sessão vinculou userId; visitante401 e organizador403 no checkout web; compra API não se associa por email.'),
('F04-CF04','PASS','Draft não vende; publicado vende com preço vigente; histórico10000/10000/15000 preservado e catálogo reflete lotação.')],
'F05':[
('F05-T01','PASS','Cancelamento publicado real; exclusão de listas, vendas404, edição/publicação409, repetição409; draft409 event_not_published e outro dono404.'),
('F05-T02','BLOCKED','Procedimento contratual criou lenta0003 e rápida0001: ao aguardar3,2s ambas já confirmed pela falha F04-T02. Não foi possível validar essa pré-condição no SHA. Supplemento preconfirma rápida e só depois cria lenta; comprova transição imediata e invariância45s, mas não substitui a sequência contratual exigida.'),
('F05-T03','PASS','Mensagens literais comparadas: inválido/outro evento, inválido em cancelado, Evento cancelado para código válido, Ingresso não confirmado para pending/declined, Ingresso já utilizado e Entrada liberada.'),
('F05-T04','PASS','12 check-ins HTTP simultâneos no mesmo código:1 Entrada liberada e11 Ingresso já utilizado; repetição recusada; consulta manteve confirmed e checkedIn true. Suplemento também aceitou código API.'),
('F05-T05','PASS','E1 de ambos canais:10000+10000+15000 centavos, painel3 confirmados,0 pending,0→1 checkedIn,0 vagas,35000 receita,0 refunded.'),
('F05-T06','PASS','Isolamento operacional E3: rápida já confirmada e utilizada; depois lenta pending; cancelamento gerou0 confirmados/pending/checkIn/vagas/receita e1 refunded. Confirmado estornado manteve checkedIn true no ticket mas não contou painel; repetido com canais invertidos e após45s. Ordem original de criação fica bloqueada em T02.'),
('F05-T07','PASS','Matriz3 atores×3 operações: visitante401, participante403, outro dono404, JSON só error, inclusive check-in com corpo malformado. A asserção extra de métricas no grupo do probe falhou por pré-condição temporal; todas as9 respostas de autorização foram corretas.'),
('F05-CF05','PASS','E1 mistura canais e preços; suplemento confirmou check-in/cancelamento de ambos, invertendo canal da rápida/lenta e verificando invariância após45s. Restrição de integração temporal original explicitada em T02.'),
('F05-CF06','PASS','Sessões de F02 protegeram operações e painel para todos os papéis/donos, antes do corpo, sem dados alheios.')]
}

for feature,items in rows.items():
 verdict={'F03':'APROVADA','F04':'REPROVADA','F05':'BLOQUEADA — não aprovada'}[feature]
 content=f'# {feature} — avaliação independente {verdict}\n\n'+intro+'\n## Veredito por item\n\n| Item | Veredito | Evidência e observação |\n|---|---|---|\n'
 content+='\n'.join('| '+' | '.join(row)+' |' for row in items)
 content+=f'\n\nVeredito final: **{verdict}**. '
 content+= 'Correção de F04 e nova avaliação em outro SHA são necessárias; preservar este relatório e os logs. Não marcar F04/F05 como concluídas com base nos gates. A validação final completa na main permanece obrigatória.\n'
 path=root/'docs/features'/feature/'reports'/'20261126-independent-95ecfd3-sales-ops.md'
 if path.exists():
  print('Preserving existing '+str(path))
  continue
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(content)
 print(path)
