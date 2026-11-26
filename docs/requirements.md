# Requisitos, rastreabilidade e armadilhas

## Fonte, classificação e uso

Fonte principal: [brief.md](brief.md), lido integralmente. Prompt mestre fornecido pelo aluno adiciona auditoria, rastreabilidade e HTML didático; não altera contratos acadêmicos. IDs R01–R13 preservados; demais IDs são internos. A matriz abaixo preserva a interpretação dos requisitos. O resultado comprovado está na [auditoria independente final](evidence/final-audit-feb98bf-independent.json), nos [relatórios por feature](state.json) e no [relatório didático](relatorio-final.html): **39/39 grupos acadêmicos aprovados**, com **49/49 itens de contrato** aprovados. São agrupamentos rastreáveis, não contagem de testes nem cobertura de linhas de código.

Todas as linhas da matriz são OBRIGATÓRIAS no escopo indicado; os sete grupos adicionais do prompt mestre são separados dos39acadêmicos (R01 até END01). Criticidade alta para regras, contratos, harness, processo e entrega; média para material complementar. Componentes/dependências detalhados no PRD e specs; estratégia/teste na coluna final e contratos. Evidências obtidas: saídas reais, respostas HTTP, navegador/screenshots e histórico Git, com SHA por relatório. Produto integrado avaliado em `2691761de8bf2b006e5775397e5128c603fa2d6f`; artefatos/histórico públicos auditados em `feb98bf3e922f552f1adaf0d9cdc296383351333`. A auditoria comprovou ausência de diferenças no produto entre esses commits.

## Matriz

| ID | Referência original | Responsável | Critério / item rastreável | Interpretação, estratégia e teste esperado |
|---|---|---|---|---|
| R01 | Brief Eventos | F03/F06 | F03-AC01/02; F06-AC03 | Validar nome/local/início futuro/capacidade inteira ≥1/preço positivo na criação e edição; HTTP e UI rejeitam inválidos. |
| R02 | Brief Eventos | F03/F04/F06 | F03-AC01/03; F04-AC05; F06-AC01 | Draft inicial; somente published não cancelado em vitrine/API e compra. |
| R03 | Brief Eventos | F03/F04/F05 | F03-AC02; F04-AC01; F05-AC05 | Lock de edição/compra; capacidade ≥ pending+confirmed; ticket guarda preço histórico; receita E1 R$350. |
| R04 | Brief Eventos | F03/F05/F06 | F03-AC06; F06-AC03/04 | URL própria de gestão contém edição/publicação/cancelamento/check-in/painel. |
| R05 | Brief Vagas | F03/F04/F05 | F03-AC02/03; F04-AC01/04; F05-AC06 | Ocupação pending+confirmed; disponíveis capacity-ocupação, ou zero se cancelado. |
| R06 | Brief Vagas | F04/F06 | F04-AC01; F06-AC02 | Compra de um ingresso por participante/parceiro retorna pending sem aguardar gateway. |
| R07 | Brief Vagas | F04/F06 | F04-AC03; F06-AC02/07 | BEGIN IMMEDIATE; 2 eventos novos de capacidade 5, 30 simultâneas: 5×202 e 25×409; UI literal Ingressos esgotados. |
| R08 | Brief Vagas | F04 | F04-AC02/04 | Aprovação confirma; recusa declined e libera vaga; medir gateway. |
| R09 | Brief Vagas | F04/F06 | F04-AC01/07; F06-AC02/06 | Código único; meus ingressos exibe evento/status/código da conta; checkedIn separado. |
| R10 | Brief Check-in | F05/F06 | F05-AC03/04; F06-AC04 | Precedência e cinco mensagens literais; repetição/concorrrência concede entrada uma vez. |
| R11 | Brief Cancelamento | F03/F04/F05/F06 | F03-AC05; F04-AC04/05; F05-AC01/02/06; F06-AC04 | Cancelamento published irreversível; ≤10s pending→cancelled e confirmed→refunded; depois de 45s callback não altera. |
| R12 | Brief Painel | F05/F06 | F05-AC05/06; F06-AC04 | Dois canais; 6 métricas; confirmed inclui utilizados, check-ins só confirmed, receita preços históricos. |
| R13 | Brief Acesso | F02/F03/F05/F06 | F02-AC05; F03-AC04/06; F05-AC07; F06-AC05 | Autorização no servidor e propriedade; acesso direto não revela nome/números/ingressos. |
| ACT01 | Brief Quem usa | F02/F06 | F02-AC01/02/04; F06-AC01 | Visitante público, cadastro participante nome/email/senha, login/logout; organizadores só seed. |
| STS01 | Brief Status | F04/F05/F06 | F04-AC06; F05-AC04; F06-AC06 | API usa pending/confirmed/declined/cancelled/refunded; UI rótulos PT-BR; checkedIn boolean independente. |
| GW01 | Gateway simulado | F04 | F04-AC02 | 0001 aprovado/0002 recusado/outros recusados em 2–5s; 0003 aprovado/0004 recusado em 30–40s; modo padrão sem chave real. |
| GW02 | Gateway simulado | F04 | F04-AC02/05 | Cartão exatamente 16 dígitos; inválido rejeitado antes de ingresso; corpo com email válido. |
| API01 | Contrato fixo autenticação | F04 | F04-AC05 | Três rotas: X-Api-Key ausente/inválida →401 unauthorized, antes de ler/validar corpo. |
| API02 | Contrato GET events | F04 | F04-AC06 | GET /api/partner/events →200 array de id/name/startsAt/priceCents/availableSeats; IDs strings. |
| API03 | Contrato POST purchases | F04 | F04-AC01/05/06 | POST /api/partner/events/{eventId}/purchases recebe buyerEmail/cardNumber; 202 ticketId/code/status pending. |
| API04 | Contrato precedência | F04 | F04-AC05 | Após chave: corpo inválido 422 invalid_request; evento ausente/draft/cancelado 404 event_not_available; vagas 409 sold_out. |
| API05 | Contrato GET tickets | F04 | F04-AC05/06 | GET /api/partner/tickets/{ticketId} →200 ticketId/code/eventId/status/checkedIn; ausente 404 ticket_not_found; qualquer canal. |
| API06 | Contrato canais | F04/F05 | F04-AC07; CF05 | API não vincula conta pelo email; lotação/painel/check-in/cancelamento idênticos entre canais. |
| HAR01 | Harness 3 | F01 | F01-AC01 | Clone limpo sobe tudo+seed com npm run up, sem passo extra. |
| HAR02 | Harness 3 / fluxo 17 | F01 | F01-AC02 | npm run down encerra tudo; nenhuma porta/container restante; novo up funciona. |
| HAR03 | Harness 3 | F01 | F01-AC03; CF01 | Seed idempotente com 2 organizadores e 1 participante; credenciais/chave no README. |
| HAR04 | Harness 3 | F01 | F01-AC04 | npm run gates inclui testes automatizados e passa na main final. |
| HAR05 | Harness 3 | F01 | F01-AC06 | AGENTS.md raiz com comandos/regras/mapa; arquivo alternativo de ferramenta, se existir, aponta a AGENTS. |
| ENV01 | Tecnologias e restrições | F01 | F01-AC06 | Git/GitHub/PRs/Docker; agente permitido; Windows via WSL; runtime além Node em container; avaliador Linux/macOS+Docker+Git+Node LTS. |
| DOC01 | Requisito 1 | Todas | PRD; CF01–CF11 | ≥5 features com IDs/consumes/provides, DAG real/waves, wave ≥2 e fora de escopo. |
| DOC02 | Requisitos 1/2 | Todas | PRD e contratos | Cada R01–R13 em critério; cada aresta com cross-feature; cada AC e CF mapeado a item verificável. |
| DOC03 | Requisito 2 | Todas | spec/plan/contract | Spec técnica, plano em etapas, contrato com pré-requisitos e evidência observável por feature. |
| PAR01 | Requisito 4 | F02/F03 | Wave2; auditoria Git | Agentes implementam em simultâneo, worktrees/branches separadas, PRs merged visíveis; first(A)<last(B) e first(B)<last(A). |
| EVA01 | Requisito 5 | Todas | Contratos / reports | Avaliador não implementador com contexto separado/vazio; data, SHA, ferramenta/modelo, evidência/veredito por item. |
| EVA02 | Requisito 5 | Todas | Auditoria reports | Nova avaliação a cada correção; relatórios imutáveis após commit; último aprova todos itens; git log de relatório contém único commit. |
| STA01 | Requisito 6 | Todas | docs/state.json | Estado verdadeiro: todas concluídas só após aprovação e caminho existente do relatório mais recente. |
| DEL01 | Entregável | Todas | README / auditoria remota | Um projeto por repo público; tudo main; PRs paralelos merged/visíveis e links no README. |
| DEL02 | Entregável README | Todas | README / execução | Como rodar; endereços WEB/API; credenciais; mapa PRD/features/relatórios/estado/AGENTS/PRs; decisões stack/R07/gateway/isolamento. |
| END01 | Fluxo avaliador 1–18 | F06/global | F06-AC07 | Executar passos completos na ordem e com dados/modo padrão em clone limpo da main; registrar evidências de produto e artefatos. |
| AUD01 | Prompt mestre 7/8/16–20 | Global | Auditoria final | Matriz/pegadinhas, avaliação independente final, simulação professor, clone limpo, auditoria Git/documental e correção de falhas. |
| HTML01 | Prompt mestre 22 | Complementar | docs/relatorio-final.html | HTML5 PT-BR, sem backend/dependências; responsivo, acessível, impressão, recursos essenciais sem CDN, preferencialmente offline. |
| HTML02 | Prompt mestre 22.4–22.14 | Complementar | Inspeção HTML | Leigo/técnico; capa/contexto/pedido/armadilhas/solução/fluxo/arquitetura/tecnologias/IA/timeline com fatos reais. |
| HTML03 | Prompt mestre 22.15–22.24 | Complementar | Inspeção/evidências HTML | Demonstração/screenshots reais; antes/depois quando aplicável; dashboard testes; matriz requisito→solução→teste→evidência→resultado; segurança/conceitos/GitHub/execução/apresentação/veredito. |
| HTML04 | Prompt mestre 22.25/22.26 | Complementar | Validação navegador | Controles úteis funcionais; testar carregamento/JS/links/imagens/diagramas/responsividade/menus/botões/filtros/impressão quando disponível; registrar limitações. |
| FIN01 | Prompt mestre 23–26 | Global | Auditoria final / resposta | Revalidar após docs; métricas reais; commit final; veredito autorizado; instruções de submissão e caminho exato do HTML; não enviar ao professor. |
| CONT01 | Prompt mestre 21/27 | Global | Estado/evidências | Persistir decisões, commit, testes, bloqueios e próxima ação; não declarar conclusão por limite de sessão. |

## Classificações adicionais

- **PROIBIDO:** overselling; modificar status terminal por callback; operar evento alheio; cadastro público de organizador; fabricar evidências/histórico; editar relatórios já commitados; divulgar segredos reais; aprovar itens não executados.
- **FORA DE ESCOPO:** deploy, gateway real, email/notificações, app mobile, qualidade visual como critério, vários ingressos por compra, mapa de assentos, cancelamento/transferência pelo participante e atualização em tempo real.
- **DECISÃO LIVRE:** stack dentro das restrições, divisão ≥5 features, schema/IDs strings, fuso com folga de datas, formato dos documentos/estado. Decisões efetivas em architecture.md.
- **OPCIONAL:** reduzir atraso somente em testes, polling da UI, recursos interativos adicionais do HTML quando úteis. Nenhum substitui padrão do avaliador.
- **INTERPRETAÇÃO REGISTRADA:** F03 domínio independente de F02; seu adapter protegido é integração diferida CF11 após wave2. Verificação de cancelled em F03 pode usar fixture na feature e deve ser repetida com cancelamento real no fluxo final. Datas de evento nos testes usam pelo menos um dia de folga.

## Registro de armadilhas

Estes itens são riscos preventivos identificados no enunciado, não alegações de defeitos encontrados. Sua cobertura foi verificada nos contratos e na auditoria final vinculados acima. Defeitos efetivamente encontrados foram preservados nos relatórios reprovados F01 e F04; suas correções têm reavaliações próprias, sem apagar o histórico.

| ID | Origem / risco | Consequência | Prevenção e teste / evidência |
|---|---|---|---|
| P01 | R07: ler vagas e inserir sem lock | Vender além da capacidade | BEGIN IMMEDIATE antes da leitura; 2 rajadas oficiais e repetições novas; F04-AC03 |
| P02 | R03: editar capacidade concorrentemente com venda | Capacidade menor que ocupação | Mesmo lock; teste edição/compra e rejeição abaixo de ocupação; F03-AC02 |
| P03 | R11: callback lento após cancelar | Reviver compra cancelada/estornada | Condição pending e evento não cancelado na transação; 0003/0001 e observação após 45s; F05-AC02 |
| P04 | R05/R12: somar declined/refunded ou checkedIn independente | Vagas/receita/check-ins incorretos | Métricas derivadas por status; E1 e E3 exatos; F05-AC05/06 |
| P05 | R03: receita usa preço atual | Receita histórica errada | Copiar preço atomicamente por ticket; R$100+100+150=350; F05-AC05 |
| P06 | R10: cancelado verificado antes de código errado | Mensagem fora da precedência | Lista literal do brief, outro evento antes de cancelado; F05-AC03 |
| P07 | R10: dois check-ins simultâneos | Duas entradas liberadas | Transação e alteração condicionada; F05-AC04 |
| P08 | R13: esconder UI sem autorização de dados | Vazamento na URL direta/API | requireUser + ownedEvent e render após autorização; F06-AC05 |
| P09 | API: validar corpo antes da chave ou vaga antes do evento | Contrato fixo divergente | Matriz de erros compostos chave→corpo→evento→vaga; F04-AC05 |
| P10 | Gateway: testes rápidos viram modo padrão | Tempos obrigatórios não atendidos | Padrão 3s/35s, medir faixas reais na avaliação; F04-AC02 |
| P11 | Canal parceiro associado pelo email | Ingresso API aparece indevidamente na conta | userId null no canal parceiro; mesmo email nos dois canais; F04-AC07 |
| P12 | Paralelismo só aparente | Reprovação de processo irreparável retrospectivamente | Worktrees/agentes simultâneos e commits substantivos com intervalos sobrepostos; auditar PRs |
| P13 | Avaliador herda justificativas do implementador | Autoavaliação disfarçada | Agente novo com fork/contexto vazio e tarefa objetiva; relatório declara separação |
| P14 | Atualizar relatório aprovado no mesmo arquivo | Perda de imutabilidade | Novo arquivo por avaliação; git log por arquivo com um commit |
| P15 | Subir depende de arquivo/cache local | Clone limpo falha | Executar exatamente README em clone novo; verificar arquivos versionados e volume isolado |
| P16 | Down só mata servidor | Containers/portas continuam | Inspecionar docker ps e todas portas após down; repetir up |
| P17 | Teste verde parcial tratado como jornada aprovada | Falhas cross-feature sobrevivem | Executar 18 passos na main final com UI real e gateway padrão |
| P18 | Nome de evento inserido como HTML | XSS e dados expostos | textContent; testar texto com markup sem execução; F06-AC06 |
| P19 | HTML inventa métricas ou história | Evidência acadêmica inválida | Apenas fatos/commits/screenshots reais; métricas ausentes explicitamente não coletadas |
| P20 | Documentação posterior muda comportamento aprovado | Evidência de versão incorreta | Reexecutar gates pertinentes após docs e auditar SHA final |

## Protocolo de evidência e status

Registrar, por requisito, links para item do contrato, relatório/evidência obtida e SHA avaliado em docs/state.json ou relatório final de auditoria. Preservar esta matriz como interpretação do pedido; não substituir requisito por comportamento implementado. Conformidade = obrigatórios comprovadamente aprovados / total obrigatório explicitamente delimitado × 100; separar total acadêmico e complementar. NOT RUN/BLOCKED/FAIL nunca contam como PASS. O conjunto de linhas é agrupamento de requisitos: não alegar contagem atômica sem definir a granularidade no relatório.

Veredito acadêmico final: APPROVED — READY FOR SUBMISSION somente com todos os requisitos comprovados; REJECTED — CORRECTIONS REQUIRED se há falhas; BLOCKED — EXTERNAL ACTION REQUIRED se ação externa indispensável impede conclusão. Sem nota oficial inventada. O HTML complementar não substitui nem muda o veredito do produto.

