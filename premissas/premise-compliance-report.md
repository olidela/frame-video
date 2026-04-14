# Premise Compliance Report

Data: 2026-04-14

## Resultado resumido

- Status geral: **PARCIALMENTE CONFORME**
- Bloqueios atuais:
- A suíte automatizada ainda é inicial e precisa evoluir com o projeto.

## Evidências por regra-chave

1. Repositório git inicializado
- Evidência: raiz do projeto inicializada em Git na data de aplicação das premissas.
- Status: Conforme.

2. Remoto configurado em SSH
- Evidência: `origin -> git@github.com:olidela/frame-video.git`.
- Status: Conforme.

Observação operacional:
- Em GitHub Actions, `actions/checkout` usa remoto HTTPS durante o job; isso é aceito como compatibilidade de CI e não invalida a premissa local de SSH.

3. `.gitignore` presente e cobrindo artefatos sensíveis/comuns
- Evidência: arquivo `.gitignore` criado na raiz cobrindo cache Python, arquivos ZIP locais, `.env`, `.codex` e backup do Git embutido em `premissas/`.
- Status: Conforme.

4. Arquivos ignorados fora do versionamento
- Evidência: `scripts/premise-check.sh` valida que nenhum arquivo ignorado está rastreado pelo Git.
- Status: Conforme.

5. Projeto web responsivo
- Evidência: interface web local em `index.html`, `styles.css` e `app.js`.
- Status: Conforme, com validação contínua.

6. Privacidade e coleta mínima
- Evidência: `README.md` documenta operação local e ausência atual de cookies/analytics/terceiros.
- Status: Conforme nesta fase.

7. Estratégia de relevância de dados
- Evidência: `premissas/data-relevance-framework.md`.
- Status: Conforme nesta fase.

8. Setup de governança de premissas
- Evidência: `premissas/premise-check-config.md`, `premissas/premissas.md`, `scripts/premise-check.sh`.
- Status: Conforme para a fase atual, com defaults registrados para cadência e ambiente.

9. Testes e rollout
- Evidência: `tests/test_server.py` e `scripts/smoke-check.sh`.
- Status: Parcial. Já existe base automatizada, mas ainda falta CI e aprofundamento dos cenários.

10. CI configurada
- Evidência: `.github/workflows/ci.yml`.
- Status: Conforme.

11. Publicação estática em GitHub Pages
- Evidência: `.github/workflows/pages.yml` e app ajustado para API relativa ao caminho atual.
- Status: Conforme para modo navegador; modo com backend local permanece fora do escopo do Pages.
