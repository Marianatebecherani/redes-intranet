# Documentação

Diretório da documentação que abrange o projeto como um todo.

## Projeto

| Documento | Conteúdo |
| --- | --- |
| [Arquitetura e decisões técnicas](ARQUITETURA.md) | Serviços Docker, autenticação, permissões, persistência, editor de imagens e pontos de atenção na EC2. |

## Convenções e referências

A pasta [conventions/](conventions/) reúne padrões de desenvolvimento e material de referência para o trabalho no repositório.

| Documento ou recurso | Conteúdo |
| --- | --- |
| [Padrão de commits](conventions/COMMIT.md) | Adaptação de Conventional Commits com emojis opcionais, tipos de alteração, escopos, estrutura da mensagem e exemplos com corpo e rodapé. |
| [Guia de Gitflow](conventions/GITFLOW.md) | Referência sobre as branches `main`, `develop`, `feature`, `release` e `hotfix`, com exemplos de comandos Git e uso da extensão `git-flow`. |
| [Diagramas de Gitflow](conventions/img/) | Quatro ilustrações SVG (`gitflow_1.svg` a `gitflow_4.svg`) utilizadas pelo guia de Gitflow. |

Consulte o padrão de commits ao preparar mensagens de commit. O guia de Gitflow tem caráter de referência histórica e tutorial: neste projeto, os commits são feitos diretamente na branch `main`.

## Organização da documentação

Conforme o projeto evoluir, registre aqui:

- Visão geral da arquitetura e seus componentes.
- Decisões técnicas, contexto e justificativas.
- Requisitos e fluxos principais da aplicação.
- Contratos de integração e guias que envolvem vários componentes.
- Procedimentos de desenvolvimento e operação compartilhados.

Mantenha as instruções específicas de instalação, execução e verificação no README de cada componente. Use links para evitar duplicar informações e atualize este índice quando novos documentos forem criados.
