# Validação após documentação — coordenação

Data local da entrega: 2026-11-26 (America/Sao_Paulo). Ferramenta Codex desktop, coordenação root.
Esta checagem não substitui os relatórios independentes; complementa a auditoria com a rodada após a documentação.

Produto, harness e testes permanecem idênticos ao commit `2691761de8bf2b006e5775397e5128c603fa2d6f`.
Comando real sem saída: `git diff --stat 2691761 -- src public tests scripts package.json package-lock.json Dockerfile compose.yaml`.

## Gate final

Executado via Ubuntu-24.04 no WSL: `npm run gates`. Docker construiu a imagem e executou a suíte:

```text
Syntax: 25 JavaScript modules checked.
tests 30
pass 30
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 3240.607884
```

Exit code0. A primeira tentativa desta rodada falhou antes de iniciar testes (`spawnSync docker EIO`):
o mount dos binários/socket do Docker Desktop no WSL ficou indisponível, embora o engine respondesse no Windows.
`docker desktop restart` restaurou a integração. Nenhum código/critério foi alterado para resolver esse incidente;
a execução acima é a nova tentativa bem-sucedida, não uma aprovação da falha anterior.

Depois, `npm run down` removeu a rede do projeto; `docker ps --format '{{.Names}}'` retornou vazio.
Os containers das avaliações independentes também haviam sido encerrados por seus responsáveis.

## Demais verificações

- Auditoria independente acadêmica: [39/39 grupos e49/49 itens](final-audit-feb98bf.md).
- Verificação automática adicional: [sete checks PASS](artifact-audit-feb98bf.json).
- HTML offline: testes Chromium do agente documental registrados no bloco `report-data` do HTML;
  zero erros JS, zero recursos externos essenciais, filtros/tema/modo/cópia/impressão e galeria funcionais,
  cinco screenshots reais, sem overflow em1440/768/390px.
- Nenhum relatório histórico foi editado. A atualização do estado decorre das avaliações commitadas.
- Cobertura percentual de linhas de código não foi coletada; os percentuais de conformidade se referem aos grupos e itens explicitamente delimitados.

Ambiente de desenvolvimento validado: Linux/WSL e containers Linux. Não houve execução nativa em macOS;
os comandos portáveis de Node e Docker são os mesmos previstos para o avaliador.
