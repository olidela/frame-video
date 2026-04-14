# Premise Check Config

## Status

- Data de criação: 2026-04-14
- Projeto: `frame-video`
- Responsável: projeto local

## Premissas com input do usuário (obrigatório)

- Cadência de revisão de premissas: **POR MILESTONE**
- Premissa de inteligência de dados será aplicada?: **NÃO POR PADRÃO NESTA FASE**
- Forma de validação da premissa de inteligência de dados: **NÃO APLICÁVEL ENQUANTO NÃO HOUVER COLETA ANALÍTICA**

## Restrições de ambiente conhecidas

- OS: Linux (confirmado)
- CPU: Intel(R) Core(TM) 3 100U, 8 vCPUs visíveis, até 4.70 GHz
- RAM: 15 GiB totais, 7.7 GiB disponíveis no momento da coleta
- Storage: volume atual com 456 GiB totais e 376 GiB livres
- Rede: perfil esperado de uso local via `localhost`, sem exposição pública por padrão
- Destino de deploy (local/cloud/híbrido): local

## Regras operacionais

- O projeto deve ser inicializado como repositório Git na raiz antes de avançar para fluxo formal de rollout.
- `.gitignore` é obrigatório e já foi criado na raiz do projeto.
- `.gitignore` deve cobrir artefatos locais, arquivos gerados e arquivos sensíveis mínimos do ambiente.
- A revisão do `.gitignore` é recorrente e deve acontecer antes de commit ou push.
- Nenhum arquivo coberto pelo `.gitignore` deve permanecer rastreado no Git.
- O check inicial de premissas ocorre via `bash scripts/premise-check.sh`.
- Enquanto não houver CI e suíte automatizada, não existe promoção formal para `main`.
- Ao final de cada bloco relevante de trabalho, o contexto deve ser atualizado na documentação do projeto para evitar perda de continuidade.

## Formulário de fechamento pendente

- Cadência de revisão de premissas: por milestone
- CPU do ambiente principal: Intel(R) Core(TM) 3 100U, 8 vCPUs visíveis
- RAM do ambiente principal: 15 GiB totais
- Storage disponível para operação local: 376 GiB livres no volume atual
- Perfil de rede esperado: uso local via localhost, sem exposição pública
- Destino de deploy: local

## Observação sobre origem da pasta `premissas`

- O diretório `premissas/` entrou no projeto com um repositório Git embutido.
- Para permitir versionamento normal na raiz do projeto, esse metadado foi preservado como backup em `premissas/.git-repository-backup/`.
