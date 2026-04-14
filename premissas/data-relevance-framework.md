# Data Relevance Framework

## Objetivo

Classificar dados eventualmente manipulados pelo produto como relevantes ou não relevantes com critério técnico auditável, preservando a premissa de coleta mínima.

## Escala de pontuação

Cada item recebe pontuação de 0 a 5 em cada dimensão:

- Impacto para decisão de produto
- Impacto para receita/comercial
- Cobertura de jornada do usuário
- Risco de privacidade/compliance (pontuação invertida: maior risco, menor nota)
- Custo operacional de coleta/manutenção

## Fórmula

`score_final = produto + receita + jornada + (5 - risco_privacidade) + (5 - custo_operacional)`

Faixas:

- 20 a 25: Relevante obrigatório
- 14 a 19: Relevante condicional (monitorar custo/risco)
- 0 a 13: Não relevante (não coletar ou remover)

## Inventário inicial (`frame-video`)

| Dado | Produto | Receita | Jornada | Risco privacidade | Custo | Score | Classe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Arquivo de vídeo enviado pelo usuário para processamento local | 5 | 2 | 5 | 4 | 2 | 16 | Relevante condicional |
| Duração e resolução do vídeo para cálculo de frames | 5 | 1 | 5 | 1 | 1 | 23 | Relevante obrigatório |
| Preferências temporárias de extração (fps, intervalo, recorte) | 5 | 1 | 5 | 1 | 1 | 23 | Relevante obrigatório |
| Analytics de navegação de terceiros | 1 | 1 | 1 | 4 | 3 | 6 | Não relevante |
| Geolocalização precisa | 0 | 0 | 0 | 5 | 4 | 1 | Não relevante |

## Revisão contínua

- Frequência: seguir `premissas/premise-check-config.md` quando a cadência for confirmada.
- Gatilhos de revisão extraordinária: introdução de analytics, persistência de dados, integração externa, mudança regulatória ou incidente de segurança.
