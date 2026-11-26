# F01 — Spec: Harness, persistência e utilitários

## Escopo e contrato de integração

Harness; suporte transversal R01–R13.

**Provê:** Runtime Node 24 em container, banco SQLite/schema comum, transações, HTTP/utilitários de segurança, seed e comandos reproduzíveis.

**Consome:** Nenhuma feature. Requer Docker com Compose e Node.js LTS no host.

**Dono de arquivos:** src/db.js, src/security.js, src/http.js, src/seed.js, src/server.js; Dockerfile/Compose; scripts e configuração de gates.

As assinaturas, formatos e rotas em [architecture.md](../../architecture.md) são o acordo técnico comum; os critérios em [PRD.md](../../PRD.md) prevalecem sobre conveniências de implementação.

## Decisões técnicas

SQLite via node:sqlite, WAL e busy_timeout=5000. Schema camelCase. transaction(db,fn) não aceita trabalho assíncrono dentro da região crítica. HTTP nativo ESM. Docker fixa Node 24; volume persiste o banco. up deve aguardar prontidão e executar seed; down deve encerrar o que up iniciou. Gates não devem apagar dados do produto.

## Invariantes e validação

- F01-AC01: Um clone limpo sobe com `npm run up`, sem configuração extra, com produto em http://localhost:3000 e seed carregada.
- F01-AC02: `npm run down` encerra todos os serviços e portas iniciados; subir novamente funciona.
- F01-AC03: Seed cria dois organizadores e um participante, é idempotente e usa apenas credenciais demonstrativas.
- F01-AC04: `npm run gates` executa testes automatizados em ambiente isolado e passa na main.
- F01-AC05: Persistência fornece integridade de IDs/códigos, dinheiro inteiro e transações síncronas `BEGIN IMMEDIATE`; nenhum cartão completo é persistido.
- F01-AC06: AGENTS.md e README documentam comandos, pré-requisitos, mapa, endereços e credenciais; runtime além de Node fica em container; Windows é desenvolvido em WSL.

Não esperar rede dentro de transações. Não expor segredos, hashes de senha ou cartão completo. Falhas devem ser observáveis, sem alterar parcialmente estado. Contratos fixos da API e mensagens de negócio seguem o brief literalmente.

## Evidência e handoff

Entregar implementação e testes com commit identificável; informar mudanças de interfaces e limitações reais. Avaliador novo recebe brief/spec/contrato/checkout, sem justificativas destinadas a induzir aprovação. Integração posterior que altere comportamento exige regressão e nova avaliação pertinente; preservar relatórios existentes.

