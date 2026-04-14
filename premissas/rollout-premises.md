# Rollout Premises

## Objetivo

Definir regras obrigatórias para promoção segura do projeto a um fluxo versionado e, futuramente, para publicação.

## Escopo

- Aplicável a qualquer release candidate deste projeto depois que a raiz estiver em Git.
- Publicação só pode ser discutida após fluxo Git e testes mínimos existirem.

## Gates obrigatórios de rollout

1. Governança e compliance
- `bash scripts/premise-check.sh` deve passar sem falhas.
- Cadência de revisão de premissas deve estar definida.
- Relatório de compliance atualizado em `premissas/premise-compliance-report.md`.

2. Qualidade e testes
- Deve existir ao menos validação automatizada básica para `server.py` e `app.js`.
- Mudanças futuras mais sensíveis devem trazer testes automatizados.
- Pipeline de CI deve permanecer alinhado com os checks locais antes de rollout formal.
- Base atual disponível:
- `python3 -m unittest discover -s tests`
- `bash scripts/smoke-check.sh`
- `.github/workflows/ci.yml`

3. Segurança e integridade
- Nenhum segredo versionado no repositório.
- Sem envio de arquivos do usuário para terceiros.
- Se houver futura coleta analítica, consentimento deve ser explícito, revogável e auditável.

4. Fluxo git de promoção
- A raiz deve ser inicializada em Git.
- Branching e promoção só passam a valer depois da definição explícita do fluxo do repositório.
- Working tree limpa antes de qualquer release versionada.

## Saídas de auditoria

- Resultado técnico do gate inicial: `bash scripts/premise-check.sh`.
- Evidências de conformidade: documentação em `premissas/` e `README.md`.
