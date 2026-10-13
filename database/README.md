# Database

Scripts SQL do banco de dados MySQL da intranet.

## Banco e execução

- **Banco:** MySQL 8.4, executado em container.
- **Persistência:** os dados ficarão no volume nomeado `mysql-data`, configurado em [infra/](../infra/README.md).
- **Inicialização:** os scripts de [init/](init/) são montados em `/docker-entrypoint-initdb.d` e executados automaticamente pelo MySQL, em ordem alfabética, **somente na primeira inicialização de um volume vazio**. O banco usado é o definido pela variável `MYSQL_DATABASE`.

> O `docker-compose.yml` que monta esses scripts ainda não foi implementado.

| Script | Conteúdo |
| --- | --- |
| [01-schema.sql](init/01-schema.sql) | Criação das tabelas `usuarios`, `comunicados` e `colaboradores`. |
| [02-seed.sql](init/02-seed.sql) | Usuários iniciais, colaboradores vinculados a eles e um comunicado de boas-vindas. |

Os dois scripts podem ser executados novamente sem duplicar dados: as tabelas usam `CREATE TABLE IF NOT EXISTS` e os inserts ignoram registros já existentes. Alterações em tabelas que já existem não são aplicadas por esses scripts.

## Modelo de dados

| Tabela | Campos principais | Observações |
| --- | --- | --- |
| `usuarios` | `username`, `nome`, `senha_hash`, `perfil`, `ativo` | `username` único; `perfil` é `admin` ou `usuario`; senha armazenada com hash bcrypt. |
| `comunicados` | `titulo`, `conteudo`, `autor_id` | `autor_id` referencia `usuarios` e vira `NULL` se o autor for removido. |
| `colaboradores` | `nome`, `setor`, `cargo`, `ramal`, `email`, `usuario_id` | Diretório da intranet; `usuario_id` é opcional e único, ligando o colaborador ao seu login. |

As tabelas também registram `criado_em` e `atualizado_em`. As permissões de acesso às pastas compartilhadas são derivadas do `perfil` e aplicadas pelo backend.

## Dados iniciais

O seed cria os usuários listados no [README da raiz](../README.md#usuários-iniciais), todos com a senha padrão `capivara` armazenada apenas como hash bcrypt (custo 10). Os e-mails, ramais e setores dos colaboradores são fictícios.

Para recriar o banco a partir dos scripts, é necessário remover o volume `mysql-data`, o que **apaga todos os dados** da intranet.

## Verificação realizada

Os scripts foram testados em um container `mysql:8.4` temporário: criação das tabelas, carga dos dados com acentuação correta, reexecução sem duplicação e conferência dos hashes com a senha padrão.
