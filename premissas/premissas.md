# Lista de premissas do projeto `frame-video`

## P1. Interface web obrigatória
- Contexto: o produto é uma ferramenta visual de extração de frames.
- Descrição: toda entrega principal deve permanecer acessível por interface web local.
- Status: ativa.
- Responsável: projeto.
- Revisão: pendente de cadência formal.

## P2. Processamento local e mínimo de coleta
- Contexto: o usuário manipula arquivos de vídeo potencialmente sensíveis.
- Descrição: o processamento deve ocorrer localmente e sem envio para terceiros; o projeto não deve introduzir coleta desnecessária.
- Status: ativa.
- Responsável: projeto.
- Revisão: pendente de cadência formal.

## P3. UX e responsividade são mandatórias
- Contexto: a ferramenta precisa funcionar com clareza em desktop e mobile.
- Descrição: mudanças de interface devem preservar usabilidade, responsividade e feedback de status.
- Status: ativa.
- Responsável: projeto.
- Revisão: pendente de cadência formal.

## P4. Governança mínima obrigatória
- Contexto: o projeto recebeu uma pasta de premissas e precisa começar a operar com ela.
- Descrição: a raiz do projeto deve ter `.gitignore`, documentação de compliance e check básico de premissas.
- Status: em implantação.
- Responsável: projeto.
- Revisão: pendente de cadência formal.

## P5. Testes e rollout ainda são gaps
- Contexto: o projeto atual não possui suíte automatizada nem pipeline de CI.
- Descrição: promoção segura e rollout só devem ser considerados após a definição de testes automáticos e fluxo Git do projeto.
- Status: pendente.
- Responsável: projeto.
- Revisão: pendente de cadência formal.

## P6. Contexto sempre atualizado ao fim de cada bloco
- Contexto: o projeto precisa manter continuidade entre sessões e entregas sem perder decisões recentes.
- Descrição: ao concluir um bloco relevante de trabalho, a documentação de contexto deve ser atualizada para registrar estado atual, decisões, gaps e próximos passos.
- Status: ativa.
- Responsável: projeto.
- Revisão: pendente de cadência formal.

## P7. Revisão recorrente de `.gitignore` antes de versionar
- Contexto: o projeto não deve enviar para o GitHub arquivos locais, sensíveis, temporários ou gerados por engano.
- Descrição: antes de commit ou push, a cobertura do `.gitignore` e a lista de arquivos staged devem ser revisadas; qualquer novo artefato local relevante deve ser incorporado ao `.gitignore`.
- Status: ativa.
- Responsável: projeto.
- Revisão: pendente de cadência formal.
