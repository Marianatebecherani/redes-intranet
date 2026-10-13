# Infra

Documentação de execução do ambiente Docker e de implantação na EC2.

> **Estado atual:** ainda não implementado. Esta seção descreve o que está planejado; o `docker-compose.yml`, o `Dockerfile` e os comandos de execução serão adicionados junto com o código.

## Planejamento

- `docker-compose.yml` com três réplicas da aplicação (`app1`, `app2` e `app3`, nas portas `3001`, `3002` e `3003` do host) e um serviço `db` com MySQL 8.
- Variáveis de ambiente em `.env`, com modelo `.env.example` contendo apenas valores fictícios.
- Volume nomeado `mysql-data` para o banco.
- Bind mounts das pastas `/compartilhamento/admin` e `/compartilhamento/geral` nas três réplicas, com caminhos configuráveis para desenvolvimento local.

## Fora do escopo

O nginx (proxy reverso e balanceamento de carga) é configurado diretamente na EC2, fora do Docker. Os pontos de integração estão em [docs/ARQUITETURA.md](../docs/ARQUITETURA.md#pontos-de-atenção-na-ec2).
