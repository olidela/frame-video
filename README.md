# Frame Video

Site local para extrair frames de um vídeo e baixar tudo em um arquivo `.zip`.

## Objetivo

Entregar uma interface web local para extração de frames em PNG com o menor atrito possível, preservando qualidade, previsibilidade da duração e operação 100% na máquina do usuário.

## Como usar

1. Abra a pasta do projeto.
2. Rode o servidor local do projeto:

```bash
python3 server.py
```

3. Abra `http://localhost:8000` no navegador.
4. Escolha o vídeo, selecione o modo `por FPS` ou `por intervalo`, ajuste opcionalmente o `tempo inicial` e `tempo final`, e clique em `Extrair frames`.
5. Ao final, clique em `Baixar ZIP`.

Se você quiser usar apenas o modo antigo, 100% no navegador, ainda pode subir um servidor estático simples com:

```bash
python3 -m http.server 8000
```

## Premissas e compliance

- A interface web é a forma oficial de uso do projeto.
- O projeto deve funcionar em desktop e mobile, com foco principal em uso local.
- O processamento do vídeo deve permanecer local; não há envio para serviços externos.
- Este projeto atualmente não usa cookies, analytics nem rastreamento de terceiros.
- O arquivo enviado pode ser processado no navegador ou pelo `ffmpeg` local, sempre na máquina do usuário.
- As dependências principais são gratuitas: navegador moderno, Python 3 e `ffmpeg`.
- `.gitignore` é tratado como premissa global e deve cobrir arquivos locais, gerados e sensíveis mínimos do projeto.
- Antes de commit ou push, o `.gitignore` deve ser revisado e os arquivos staged devem ser conferidos para evitar subir conteúdo indevido ao GitHub.
- A trilha de premissas deste projeto está em `premissas/`.
- Ao final de cada bloco relevante de trabalho, o contexto do projeto deve ser atualizado para registrar decisões, estado atual, gaps e próximos passos.
- Localmente, o remoto preferencial é SSH; na CI do GitHub Actions, o checkout em HTTPS é aceito como compatibilidade operacional.
- O check inicial de premissas pode ser executado com:

```bash
bash scripts/premise-check.sh
```

- Antes de commit/push, confira também:

```bash
git status --short --ignored
git diff --cached --name-only
```

- A base mínima de validação automatizada pode ser executada com:

```bash
python3 -m unittest discover -s tests
bash scripts/smoke-check.sh
```

- O projeto já possui workflow de CI em `.github/workflows/ci.yml`, executando os checks em `push`, `pull_request` e disparo manual.
- Na aba `Actions` do GitHub, a execução mais recente normalmente aparece no topo da lista e deve ser a primeira referência para avaliar o estado atual do projeto.

## Gaps atuais de premissas

- A suíte automatizada ainda é inicial, cobrindo backend e smoke checks básicos do frontend.
- Antes de qualquer rollout formal, ainda falta ampliar a cobertura dos testes além da base atual.
- O remoto `origin` já está configurado em SSH; o próximo passo de Git passa a ser o push inicial e a estratégia de publicação.

## Como ler a CI

- Na aba `Actions`, a execução mais recente normalmente aparece no início da lista.
- A primeira verificação deve ser sempre a run mais recente do branch/commit relevante.
- Run antiga com `failure` e run mais recente com `success` indica problema histórico já resolvido.
- Antes de release, a referência correta é a run mais recente do commit que será promovido.

## Como funciona

- No modo simples, o vídeo é processado no navegador.
- Quando você roda `python3 server.py`, a interface usa `ffmpeg` local como fallback para vídeos que o navegador não consegue decodificar, como alguns `.mov` 4K.
- Cada frame é exportado em `PNG`, preservando a resolução original do vídeo.
- A captura usa a resolução nativa decodificada do vídeo no navegador, sem redimensionamento.
- No modo com `ffmpeg`, o arquivo é enviado apenas para o servidor local rodando na sua própria máquina.
- O `.zip` é gerado localmente no navegador ou no servidor local, dependendo do modo usado.
- Em exportações grandes, navegadores compatíveis podem salvar o `.zip` direto no disco para evitar falhas por memória.

## Observações

- A qualidade final depende do que o navegador consegue decodificar do vídeo de origem.
- Arquivos `.mov` dependem do codec interno. MOV em 4K com `HEVC/H.265` ou `ProRes` pode falhar em alguns navegadores e sistemas, mesmo que a extensão seja aceita.
- A duração mostrada na interface usa milissegundos para a previsão de frames bater com o tempo real do arquivo.
- Vídeos muito longos ou em resolução muito alta podem consumir bastante memória.
- O modo `por FPS` captura uma quantidade de frames por segundo.
- O modo `por intervalo` captura um frame a cada quantidade definida de segundos.
- Você pode limitar a extração a um trecho específico do vídeo com tempo inicial e final em segundos.
- FPS mais alto ou intervalo muito curto gera mais imagens e aumenta bastante o tamanho do `.zip`.
- O projeto limita a extração a `5000` frames por execução para evitar travamentos no navegador.
- A qualidade extraída não pode ultrapassar a qualidade real do arquivo de vídeo de origem.
- Se um `.mov` 4K não abrir, a alternativa mais compatível é converter para `MP4 (H.264 + AAC)`.

## Licença e custos

- O projeto não depende de serviços pagos para funcionar localmente.
- Se no futuro houver integração externa ou serviço pago, isso deve ser documentado aqui com custo, limite e impacto de conformidade.
