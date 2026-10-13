# Database

Scripts SQL do banco de dados MySQL da intranet.

> **Estado atual:** ainda não implementado. Esta seção descreve o que está planejado; os scripts e instruções de execução serão adicionados junto com o código.

## Planejamento

- MySQL 8 executado em container, com os dados persistidos no volume nomeado `mysql-data`.
- Scripts SQL em `init/`, executados automaticamente pelo MySQL na primeira inicialização do volume.
- Tabelas previstas: usuários, comunicados e colaboradores.
- Dados iniciais: usuários `mariana` e `jean` (`admin`) e `fulano`, `sicrano` e `beltrano` (`usuario`), com a senha padrão documentada no [README da raiz](../README.md#usuários-iniciais) armazenada apenas como hash bcrypt.

Use somente dados fictícios nos scripts. Não versione cópias do banco nem arquivos do volume.

O provisionamento do serviço está descrito em [infra/](../infra/README.md).
