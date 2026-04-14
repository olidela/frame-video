# Premissas Consolidadas do Projeto

Data de consolidação: 2026-04-14  
Projeto: `frame-video`

## Objetivo

Consolidar, em um único documento, as premissas globais reaproveitadas e as premissas já materializadas para este projeto.

## Premissas herdadas (globais aproveitadas)

1. As premissas se aplicam a todas as fases do projeto.
2. Decisões técnicas fracas, contraditórias, arriscadas ou não escaláveis devem ser contestadas com justificativa técnica.
3. Antes de novo projeto ou mudança de escopo, validar ambiente (OS, CPU, RAM, storage, rede e destino de deploy).
4. Reconfirmar ambiente quando houver ambiguidade ou mudança de alvo.
5. Projeto não inicia formalmente sem repositório Git inicializado.
6. Se houver remoto, ele deve ser configurado e preferencialmente em SSH.
7. Fluxo de branch só vale após a raiz estar em Git.
8. `main` só pode receber release final com qualidade e segurança validadas.
9. Sem Git na raiz, não há rollout formal.
10. Entrega obrigatória em interface web.
11. Responsividade desktop/mobile é obrigatória.
12. Qualidade de UX é mandatória.
13. Segurança é inegociável em todos os ambientes.
14. Em ambiente local: mínimo privilégio e nenhum envio para terceiros sem necessidade explícita.
15. Risco de segurança não resolvido bloqueia release.
16. Todo projeto web que coletar dados deve documentar isso claramente.
17. Consentimento e rastreamento, se existirem, devem seguir a legislação local aplicável.
18. Consentimento, se necessário, deve ser explícito, revogável e auditável.
19. Tecnologias/dependências devem ser gratuitas por padrão.
20. Dependências pagas/limitadas devem ser documentadas no `README`.
21. `README` deve conter nota de licença/custos quando aplicável.
22. Features e fluxos devem maximizar UX.
23. Relevância de dados deve ser classificada por framework documentado e revisado.
24. A premissa de inteligência de dados é negociável e deve ser validada antes de virar obrigatória.
25. No início da governança do projeto, é obrigatório definir cadência de revisão de premissas com input do usuário.
26. Revisões de compliance devem ocorrer conforme a cadência definida.
27. Não conformidade deve ser tratada antes de continuar o fluxo normal.
28. Checks de compliance devem ter saída detalhada por regra, com justificativa técnica e evidências.
29. Checks de compliance devem suportar geração de relatório para auditoria.
30. Testes devem evoluir junto com a maturidade do projeto.
31. Nova regra de negócio/função deve trazer validação proporcional ao risco.
32. Nova integração externa deve incluir teste de integração no mesmo ciclo.
33. Fluxos críticos devem ganhar teste happy path quando o harness existir.
34. Correção de bug deve incluir prevenção de regressão assim que houver base de testes.
35. Nada inseguro pode ser promovido para uma release.
36. Informações sensíveis não podem estar no conteúdo do repositório.
37. Qualquer risco de segurança/integridade bloqueia promoção para release versionada.
38. Antes de testes formais, executar check de premissas e reportar gaps bloqueantes.
39. Projeto deve ter justificativa documentada no `README`.
40. Commit só pode ser feito com autorização explícita do usuário na conversa corrente.
41. `.gitignore` é obrigatório e deve ser atualizado conforme a evolução da stack.
42. `.gitignore` deve cobrir, no mínimo, caches locais, arquivos gerados, segredos e artefatos temporários relevantes ao projeto.
43. A revisão do `.gitignore` deve ser recorrente antes de commit ou push.
44. Arquivos cobertos pelo `.gitignore` não devem permanecer rastreados no Git.
45. O remoto local preferencial deve ser SSH; exceções operacionais de CI podem usar HTTPS quando o provedor impuser esse modo no checkout.
46. Ao final de cada bloco relevante, o contexto do projeto deve ser atualizado para preservar continuidade.

## Premissas lançadas/materializadas neste projeto

| ID | Premissa | Evidência | Status |
| --- | --- | --- | --- |
| L1 | Documentação inicial de premissas adaptada ao projeto atual | `premissas/` | Ativa |
| L2 | Check inicial de premissas disponível em shell | `scripts/premise-check.sh` | Ativa |
| L3 | `.gitignore` obrigatório criado na raiz | `.gitignore` | Ativa |
| L4 | Operação local sem coleta analítica de terceiros | `README.md`, `premissas/data-relevance-framework.md` | Ativa |
| L5 | Linux confirmado como ambiente atual | `premissas/premise-check-config.md` | Ativa |
| L6 | Cadência de revisão definida por milestone | `premissas/premise-check-config.md` | Ativa |
| L7 | Ambiente principal registrado com CPU, RAM, storage, rede e destino local | `premissas/premise-check-config.md`, `premissas/environment-review-template.md` | Ativa |
| L8 | Projeto versionado em Git na raiz | `.git/`, `scripts/premise-check.sh` | Ativa |
| L9 | Base mínima de testes automatizados criada para backend e smoke check do frontend | `tests/test_server.py`, `scripts/smoke-check.sh` | Ativa |
| L10 | Atualização contínua de contexto definida como premissa operacional | `README.md`, `premissas/premise-check-config.md`, `premissas/premissas.md` | Ativa |
| L11 | Remoto `origin` configurado em SSH | `.git/config`, `scripts/premise-check.sh` | Ativa |
| L12 | Revisão recorrente de `.gitignore` e bloqueio de arquivos ignorados rastreados | `.gitignore`, `scripts/premise-check.sh`, `README.md` | Ativa |
| L13 | Workflow de CI configurado no GitHub Actions | `.github/workflows/ci.yml` | Ativa |
| L14 | Aprofundamento da suíte de testes ainda é pendente | `README.md`, `premissas/rollout-premises.md` | Pendente |

## Regras bloqueantes atuais (com base no estado documentado)

1. Falta ampliar a cobertura dos testes antes de rollout.
2. Falta consolidar a estratégia de publicação além do fluxo inicial.

## Fontes de verdade utilizadas

- `README.md`
- `premissas/premise-check-config.md`
- `premissas/premise-compliance-report.md`
- `premissas/rollout-premises.md`
- `premissas/data-relevance-framework.md`
- `premissas/premissas.md`
- `scripts/premise-check.sh`
