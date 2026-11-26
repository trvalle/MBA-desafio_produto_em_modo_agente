# Catraca — porta de entrada

Leia `docs/brief.md`, `docs/PRD.md` e o contrato da feature antes de alterar código.

## Ambiente e comandos

- Linux/macOS: Docker com Compose e Node.js LTS. Windows: desenvolver no WSL.
- Subir com seed: `npm run up` (http://localhost:3000).
- Derrubar todos os serviços do projeto: `npm run down`.
- Gates isolados em Docker: `npm run gates`.
- Testes de desenvolvimento com Node 24: `npm test`.
- Seed idempotente: `npm run seed`.

## Regras

- Contrato de parceiros e mensagens R10 são literais. Chave antes do corpo.
- Dinheiro em centavos inteiros. Cartões completos nunca persistidos.
- Reserva, edição de lotação, callback, cancelamento e check-in usam transação síncrona `BEGIN IMMEDIATE`.
- Não aguardar gateway dentro da requisição; jobs persistidos em tickets.
- Não alterar relatórios já commitados. Nova avaliação = novo arquivo.
- Avaliador deve ser agente novo com contexto vazio, distinto do implementador.
- Waves do PRD são obrigatórias. F02/F03 em worktrees e PRs separados, com intervalos de commits sobrepostos de verdade.
- Não inventar evidência nem modificar timestamps. Não marcar concluído sem avaliação aprovada.
- Use subagentes para implementação paralela exigida e avaliação independente.

## Mapa

`docs/PRD.md`: critérios/dependências/waves; `docs/features/Fxx/`: spec, plan, contract e reports;
`docs/requirements.md`: rastreabilidade/armadilhas; `docs/architecture.md`: interfaces;
`docs/state.json`: estado; `docs/evidence/`: provas reais; `docs/relatorio-final.html`: material didático;
`src/`: produto; `public/`: interface; `tests/`: gates; `scripts/`: ambiente.
