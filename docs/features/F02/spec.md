# F02 — Spec: Contas, sessões e autorização

## Escopo e contrato de integração

Quem usa; R09 e R13.

**Provê:** Cadastro exclusivo de participante, login/logout, sessão, currentUser e requireUser para os adapters.

**Consome:** F01: banco, seed, hashing, HTTP e transações.

**Dono de arquivos:** src/auth.js e testes de autenticação.

As assinaturas, formatos e rotas em [architecture.md](../../architecture.md) são o acordo técnico comum; os critérios em [PRD.md](../../PRD.md) prevalecem sobre conveniências de implementação.

## Decisões técnicas

Exportações e rotas conforme docs/architecture.md. Password hashing via security.js; sessões opacas persistidas. Registro sempre participant, sem escolha de papel na interface. /me é leitura pública com user null quando não autenticado. Adapter de eventos será ligado depois que F02 e F03 forem integradas; nenhuma dependência de implementação F02→F03.

## Invariantes e validação

- F02-AC01: Participante cria conta com nome, email e senha e consegue entrar e sair.
- F02-AC02: Cadastro nunca cria organizador, mesmo recebendo role malicioso.
- F02-AC03: /api/auth/me retorna {user:objeto|null}; senha/hash não aparece nas respostas; cookie de sessão é HttpOnly, SameSite=Strict e Path=/.
- F02-AC04: As três contas da seed autenticam com seus papéis e credenciais inválidas não autenticam.
- F02-AC05: requireUser bloqueia visitante com 401 e papel incorreto com 403; proteção vale no servidor (R13).

Não esperar rede dentro de transações. Não expor segredos, hashes de senha ou cartão completo. Falhas devem ser observáveis, sem alterar parcialmente estado. Contratos fixos da API e mensagens de negócio seguem o brief literalmente.

## Evidência e handoff

Entregar implementação e testes com commit identificável; informar mudanças de interfaces e limitações reais. Avaliador novo recebe brief/spec/contrato/checkout, sem justificativas destinadas a induzir aprovação. Integração posterior que altere comportamento exige regressão e nova avaliação pertinente; preservar relatórios existentes.

