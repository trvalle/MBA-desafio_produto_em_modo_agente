# ADR — avaliação de feature antes da auditoria dos próprios relatórios

Data: 2026-11-26. Descoberto pelo avaliador independente F06 e confirmado pela coordenação.

O brief exige avaliar cada feature e, ao final, conferir os relatórios, estado e histórico (passo18).
Nosso primeiro PRD colocou os18passos dentro do aceite da F06, criando uma dependência circular:
o relatório teria de estar aprovado e commitado para poder aprovar a si mesmo. Isso é um erro de
modelagem documental, não uma exceção ao enunciado.

Decisão: F06-T07 verifica os passos1–17 (produto e harness) no clone limpo. Após sua avaliação,
os relatórios e estado são commitados e a auditoria global verifica o passo18. END01, EVA02,
STA01 e DEL01 continuam obrigatórios; a entrega global permanece não aprovada até essa auditoria.
Nenhum comportamento, prazo, campo, erro ou verificação oficial foi eliminado. Relatórios antigos
continuam imutáveis. O avaliador declara o SHA do produto e a revisão documental do contrato.

Essa ordem corresponde ao requisito5 do brief: cada relatório atesta a feature no commit avaliado;
o fluxo final da main detecta regressões e verifica a entrega completa.
