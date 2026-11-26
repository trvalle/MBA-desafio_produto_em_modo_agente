# F06 — Contrato de avaliação

## Pré-requisitos

Leia docs/brief.md, docs/PRD.md, esta spec e docs/architecture.md. Use checkout do commit declarado, Docker com Compose e Node.js LTS no host; Windows executa desenvolvimento via WSL. Execute npm run up quando o teste depende do produto. Credenciais e X-Api-Key são as demonstrativas do README. Use registros novos com data futura e portas isoladas quando necessário. Gateway padrão deve permanecer em 3000/35000ms para verificações temporais; testes diretos acelerados não substituem estas evidências.

Avaliador: agente distinto do implementador, em contexto novo/vazio. Não modificar implementação ou critérios durante avaliação. Se dependência necessária ainda não está integrada, registrar NOT RUN/BLOCKED e não aprovar a feature. Fixtures de domínio são permitidas onde explicitamente indicadas, mas não substituem o fluxo final real.

## Itens verificáveis e mapeamento integral

| Item | Critério do PRD | Procedimento / efeito verificável |
|---|---|---|
| F06-T01 | F06-AC01 | Navegar deslogado; cadastrar participante e verificar troca de sessão; conferir rascunho/publicado/cancelado na vitrine. |
| F06-T02 | F06-AC02 | Comprar com 0001, registrar pending e confirmed em ≤5s; preencher evento e observar mensagem esgotada. |
| F06-T03 | F06-AC03 | Criar e publicar E1; tentar data passada e capacidade abaixo de ocupação; atualizar preço/capacidade validamente. |
| F06-T04 | F06-AC04 | Executar cenários E1/E3 na UI, conferir todos números e mensagens, editar/publicar indisponíveis ou rejeitados. |
| F06-T05 | F06-AC05 | Copiar URL de E1 e abrir nas três sessões; conferir DOM/tela e resposta de dados; o ID na URL não conta vazamento. |
| F06-T06 | F06-AC06 | Usar nome de evento com markup sem execução; recarregar /organizer/events/:id e /tickets; conferir cinco rótulos de status. |
| F06-T07 | F06-AC07 | Executar os passos 1–17 sem atalhos, com gateway padrão e dados originais; registrar commit, comandos, saídas e screenshots reais. O passo 18 permanece obrigatório como auditoria global após os relatórios e o estado serem commitados; ver ADR de ordem de avaliação. |
| F06-CF07 | CF07 | Cadastro/login/logout da interface refletem sessão real e não permitem escolha de organizador. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |
| F06-CF08 | CF08 | Formulários e URL de gestão operam eventos reais e preservam isolamento e validações do domínio. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |
| F06-CF09 | CF09 | Checkout/Meus ingressos exibem pending, confirmação/código e esgotado com a mesma lotação da API. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |
| F06-CF10 | CF10 | Gestão apresenta mensagens e métricas reais, cancela irreversivelmente e bloqueia edição após cancelamento. Exercitar os componentes integrados e registrar resposta HTTP/estado/interface que demonstre a transferência de comportamento. |

## Evidências e veredito

Para cada item registrar PASS, FAIL, NOT RUN ou BLOCKED, comandos/entrada, saída ou efeito observado e referência de evidência. PASS exige execução real ou inspeção documental objetiva quando o item é documental; teste previsto não é teste realizado. Rodar npm run gates e registrar exit code, sem presumir que gates cobrem todos os itens acima. Screenshots reais comprovam interface; HTTP e dados observados comprovam contratos. Registrar latências quando relevantes.

Relatório novo em docs/features/F06/reports/, com data UTC, SHA avaliado, ferramenta/modelo efetivos, agente e declaração de separação, tabela de todos os itens, falhas/limitações e veredito. Após o primeiro commit desse arquivo, nunca alterá-lo. Reprovação retorna ao implementador; nova execução produz novo arquivo. Estado só pode apontar feature concluída quando seu último relatório aprovar todos os itens. Fluxo final na main em clone limpo continua obrigatório.

