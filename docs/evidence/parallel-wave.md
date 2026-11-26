# Wave 2 — prova real de paralelismo

Consultado pelo root usando `gh pr view 1 --json commits,mergedAt,mergeCommit,url` e equivalente para PR 2.
Horários UTC retornados pelo GitHub (não modificados).

| Feature / PR | Primeiro commit | Horário UTC | Último commit | Horário UTC | Merge |
|---|---|---|---|---|---|
| F02 / [#1](https://github.com/trvalle/MBA-desafio_produto_em_modo_agente/pull/1) | 05d5bbf2f2e4f5bacdd59b6d8ec90599ed3ec73f | 2026-11-26 02:41:42 | e477baa495f63388a1a0686049887c05f4eb170b | 2026-11-26 02:43:18 | e920995da44a55feb5577d62f8821747401fe351 |
| F03 / [#2](https://github.com/trvalle/MBA-desafio_produto_em_modo_agente/pull/2) | 6a7a8d2ae6f9071c5e196b947d3564816b6dbb98 | 2026-11-26 02:42:20 | 76e4a8dc96df67a9de778d4424aa7e8811bbe46d | 2026-11-26 02:43:38 | c0364bd6dcc212b7668e74549e71aee4ae0417d5 |

02:41:42 < 02:43:38 e 02:42:20 < 02:43:18: intervalos sobrepostos, conforme critério.
Agentes implement_auth e implement_events trabalharam simultaneamente em worktrees distintas.
Primeiros commits implementam serviços; segundos adicionam testes reais. Nenhum timestamp foi alterado.
O domínio F03 foi escrito sem depender da implementação auth; adapter foi integrado depois de ambos PRs.
Git atribui commits à identidade local configurada pelo titular; implementação por IA está declarada aqui.
