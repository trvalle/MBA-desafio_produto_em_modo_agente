from pathlib import Path
from datetime import datetime, timezone
import ast,json

base=Path('docs/evidence/eval-sales-ops-2691761')
results=json.loads((base/'results-attempt2.json').read_text())
assert all(x['status']=='PASS' for x in results)
ops=[json.loads(x) for x in (base/'operations-isolation.jsonl').read_text().splitlines()]
assert len([x for x in ops if x.get('test')=='45s cancellation invariant' and x.get('status')=='PASS'])==2
assert ops[-1].get('cleanup')=='server and database closed'
source=ast.parse(Path('docs/evidence/eval-sales-ops-20261125/write-reports.py').read_text())
rows=next(ast.literal_eval(n.value) for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='rows' for t in n.targets))
changes={
'F03-T03':'Catálogos público/parceiro excluíram draft, incluíram publicado e retiraram evento após cancelamento real de F05; preço e vagas refletiram as compras. Reavaliação integral após correção do gateway.',
'F04-T02':'Inválidos não criaram ingresso. Finais0001/0002/9876:3093,799/3095,297/3098,657ms; finais0003/0004:35151,476/35150,794ms. Resultados confirmed/declined corretos; todos nas faixas reais do brief, medidos por performance.now no mesmo processo e polling100ms.',
'F04-T04':'Recusa liberou vagas e aprovação confirmou. Cancelamento com rápida confirmed e lenta pending preservou refunded/cancelled após45102,944ms reais; suplemento repetiu com canais invertidos. Receita/ocupação final corretas.',
'F05-T02':'Duas compras reais0001/0003, espera3200ms: rápida confirmed e lenta pending. Cancelamento antes30s converteu imediatamente em refunded/cancelled; consulta após45102,944ms do cancelamento manteve estados. Suplemento também inverteu canais.',
'F05-T06':'E3 integrado: rápida confirmada e utilizada + lenta pending; após cancelamento painel0 confirmados,0 pending,0 checkedIn,0 vagas,0 receita,1 refunded, inclusive após45,10s. Ticket estornado reteve checkedIn true sem contar no painel. Repetido com canais invertidos no suplemento.',
'F05-T07':'Matriz3 atores×3 operações: visitante401, participante403, outro dono404, JSON apenas error, inclusive check-in com corpo malformado. Estado e painel permaneceram inalterados.',
'F05-CF05':'E1 combina canais e preços históricos; E3 cancela ingresso web confirmado e API pendente, preservados por45,10s; suplemento aceita check-in API e repete cancelamento com canais invertidos.'
}
e='../../../evidence/eval-sales-ops-2691761/'
intro=f'''Data de emissão UTC: {datetime.now(timezone.utc).isoformat()}
Commit avaliado: `2691761de8bf2b006e5775397e5128c603fa2d6f`.
Ferramenta: Codex desktop. Modelo informado: GPT-6 (variante exata não exposta).
Avaliador: `/root/eval_sales_operations`, subagente distinto dos implementadores, iniciado em contexto vazio. Esta é uma reavaliação do mesmo avaliador independente, após o implementador corrigir a falha encontrada no SHA95ecfd3. Não implementei nem alterei código, contratos ou relatórios anteriores. Mantidos os relatórios anteriores com F03 aprovada, F04 reprovada e F05 bloqueada.

Fontes: AGENTS.md, brief, PRD, arquitetura, specs/contratos das três features. Checkout isolado em `/root/catraca-evals/sales-ops`, WSL Ubuntu24.04, Node v24.22.3. `createApp` real, banco SQLite novo em memória por execução, porta HTTP efêmera e defaults de gateway3000/35000ms, worker100ms. Nenhuma espera reduzida ou mock de relógio nesta prova. Medições de duração usam performance.now no mesmo processo; timestamps UTC refletem o relógio civil real, sujeito a saltos no WSL, sem adulteração.

Executei `COMPOSE_PROJECT_NAME=catraca-eval-sales PORT=3145 npm run gates` (exit0,30 testes aprovados), depois `npm run up` no mesmo projeto/porta isolados e saúde200. Servidores/bancos dos probes fechados em finally; Compose encerrado com npm run down; porta3145 e containers do projeto ausentes conforme cleanup.log. Não usei a porta3000 do implementador.

Evidências reproduzíveis: [probe]({e}probe.mjs), [HTTP e heartbeat]({e}http-attempt2.jsonl), [resultados]({e}results-attempt2.json), [stdout]({e}probe-console.log), [probe suplementar ambos canais]({e}probe-operations-isolation.mjs), [evidências suplementares]({e}operations-isolation.jsonl), [gates]({e}gates.log), [subida]({e}up.log), [saúde]({e}health.json), [limpeza]({e}cleanup.log).

Reprodução no SHA: `node docs/evidence/eval-sales-ops-2691761/probe.mjs` e `node docs/evidence/eval-sales-ops-2691761/probe-operations-isolation.mjs`. Ambos exit0. O primeiro registra19 grupos independentes aprovados, incluindo toda a sequência de contratos; o segundo amplia check-in/cancelamento de ambos os canais, com fast/lenta invertidos. Logs contêm requests, respostas HTTP/JSON, IDs reais, horários, tempos monotônicos e verificações SQL somente-leitura. Gates adicionais cobrem fixtures e escritores SQLite independentes.

## Medições reais

| Final | Resultado | Tempo monotônico observado |
|---|---|---|
|0001|confirmed|3093,799ms|
|0002|declined|3095,297ms|
|0003|confirmed|35151,476ms|
|0004|declined|35150,794ms|
|9876|declined|3098,657ms|

E1:10000+10000+15000=35000 centavos,3 confirmados,0 pendentes,0→1 check-in,0 vagas,0 estornados. Três rajadas independentes de30 HTTP cada, em capacidade5:5 respostas202 e25 respostas409 em cada rodada; estado final5 confirmados/0 vagas. E3: cancelled/refunded preservados45102,944ms depois do cancelamento, com painel0/0/0/0/0/refunded1. R10 comparado literalmente, incluindo inválido antes de cancelado. JSON parceiro comparado por campos exatos e tipos, incluindo tickets web.
'''
for feature,items in rows.items():
 content=f'# {feature} — reavaliação independente APROVADA\n\n'+intro+'\n## Veredito por item\n\n| Item | Veredito | Evidência e observação |\n|---|---|---|\n'
 content+='\n'.join('| '+item+' | PASS | '+changes.get(item,detail)+' |' for item,status,detail in items)
 content+='\n\nVeredito final: **APROVADA neste SHA**. Todos os itens do contrato foram exercitados. A falha temporal anterior não reapareceu: a implementação corrigida mede passagem de tempo de forma monotônica. Interface e fluxo final completo na main pertencem a F06 e continuam fora do escopo deste relatório; aprovação de serviço/HTTP não substitui essa avaliação.\n'
 p=Path('docs/features')/feature/'reports'/'20261126-independent-2691761-sales-ops.md'
 if p.exists():raise RuntimeError('Refusing overwrite '+str(p))
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content);print(p)
