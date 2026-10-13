# Backend

API da intranet e servidor dos arquivos estáticos do frontend.

> **Estado atual:** ainda não implementado. Esta seção descreve o que está planejado; comandos de instalação e execução serão adicionados junto com o código.

## Tecnologias planejadas

- Node.js 22 e Express.
- MySQL 8 como banco de dados ([database/](../database/README.md)).
- JWT em cookie `httpOnly` para autenticação e bcrypt para hash de senhas.

## Responsabilidades planejadas

- Login, logout e identificação do usuário autenticado.
- Verificação dos perfis `admin` e `usuario` em todas as rotas protegidas.
- Mural de comunicados, diretório de colaboradores e gestão de usuários.
- Explorador de arquivos de `/compartilhamento/admin` e `/compartilhamento/geral`: listagem, upload, download e, para administradores, criação de pastas e exclusão.
- Rota de saúde `/api/health`, informando a instância que atendeu a requisição.
- Entrega do build do frontend nas rotas fora de `/api`.

As decisões que envolvem outros componentes estão em [docs/ARQUITETURA.md](../docs/ARQUITETURA.md).
