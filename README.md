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

## GitHub Pages

- O projeto pode ser publicado no GitHub Pages como interface estática.
- No GitHub Pages, funciona apenas o modo 100% navegador.
- O fallback local com `ffmpeg` e `server.py` não roda no GitHub Pages, porque Pages não executa backend Python nem processos locais.
- O deploy está configurado em `.github/workflows/pages.yml`.
- Como o site publicado usa subpath de projeto, a interface foi ajustada para resolver a API relativa ao caminho atual.
- Publicação atual: GitHub Pages habilitado com `build_type=workflow`.
- URL pública configurada pelo GitHub: `https://olidela.github.io/frame-video/`
- O repositório foi tornado público para viabilizar a publicação.

- A base mínima de validação automatizada pode ser executada com:

```bash
python3 -m unittest discover -s tests
bash scripts/smoke-check.sh
```

- O projeto já possui workflow de CI em `.github/workflows/ci.yml`, executando os checks em `push`, `pull_request` e disparo manual.
- O projeto também possui workflow de publicação em `.github/workflows/pages.yml` para deploy estático no GitHub Pages.
- Na aba `Actions` do GitHub, a execução mais recente normalmente aparece no topo da lista e deve ser a primeira referência para avaliar o estado atual do projeto.

## Estado atual

- A suíte automatizada ainda é inicial, cobrindo backend e smoke checks básicos do frontend.
- O remoto `origin` já está configurado em SSH; a publicação web estática pode rodar pelo GitHub Pages, mas o modo com `ffmpeg` continua restrito ao ambiente local.
- A publicação no GitHub Pages depende de o repositório permanecer público ou de um plano compatível com Pages em repositório privado.

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
