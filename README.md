# Redes Intranet

Intranet conteinerizada com Docker, desenvolvida para o desafio **5) Docker e Intranet**: hospedar um site local de intranet com persistência de dados, banco de dados para gerenciamento de informações e sistema de autenticação para restringir acessos.

> **Estado atual:** todas as metas implementadas e testadas localmente com Docker. A implantação na EC2 e a configuração do nginx são feitas fora deste repositório.

## Início rápido

```bash
cp .env.example .env          # defina MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD e JWT_SECRET
docker compose up -d --build
docker compose ps             # aguarde os quatro serviços ficarem "healthy"
```

Acesse `http://localhost:3001` (ou as portas `3002` e `3003`) e entre com um dos [usuários iniciais](#usuários-iniciais). Os detalhes de execução, persistência e implantação na EC2 estão em [infra/README.md](infra/README.md).

## Arquitetura

```text
                     EC2
┌──────────────────────────────────────────────────────────┐
│  nginx (proxy reverso + load balance, fora do Docker)    │
│        │                 │                 │             │
│        ▼                 ▼                 ▼             │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐        │
│   │  app1   │       │  app2   │       │  app3   │ Docker │
│   │  :3001  │       │  :3002  │       │  :3003  │        │
│   └────┬────┘       └────┬────┘       └────┬────┘        │
│        └─────────────────┼─────────────────┘             │
│                          ▼                               │
│                    ┌───────────┐                         │
│                    │ db MySQL  │  volume mysql-data      │
│                    └───────────┘                         │
│                                                          │
│  /compartilhamento/admin  ─┐  montadas nos três          │
│  /compartilhamento/geral  ─┘  containers da aplicação    │
└──────────────────────────────────────────────────────────┘
```

- **Aplicação (`app1`, `app2`, `app3`):** três containers idênticos, gerados a partir de uma única imagem que reúne frontend (React + Vite) e backend (Node.js + Express). O backend expõe a API em `/api` e entrega o build do frontend como arquivos estáticos.
- **Banco de dados (`db`):** MySQL 8.4 em container, com os dados persistidos em volume nomeado e acessível apenas pela rede interna do Docker.
- **Pastas compartilhadas:** `/compartilhamento/admin` e `/compartilhamento/geral` do host são montadas nas três réplicas, de modo que um arquivo enviado por qualquer instância fica disponível para as demais.
- **Autenticação:** JWT em cookie `httpOnly`, sem estado no servidor, permitindo que qualquer réplica atenda qualquer requisição sem sessão fixa no balanceador.
- **Proxy reverso e balanceamento:** configurados com nginx diretamente na EC2, fora do Docker e fora do escopo deste repositório. A aplicação publica as portas `3001`, `3002` e `3003` para o nginx.

As decisões técnicas estão detalhadas em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Metas do projeto

| # | Meta | Situação |
| --- | --- | --- |
| 1 | Ambiente conteinerizado com Docker: 3 réplicas da aplicação e 1 banco MySQL. | Concluída |
| 2 | Persistência de dados: volume do MySQL e pastas compartilhadas montadas nos containers. | Concluída |
| 3 | Banco de dados para gerenciamento das informações da intranet. | Concluída |
| 4 | Sistema de autenticação com perfis `admin` e `usuario` para restringir acessos. | Concluída |
| 5 | Explorador de arquivos com upload e download em `/compartilhamento/admin` e `/compartilhamento/geral`. | Concluída |
| 6 | Ferramenta para deixar imagens PNG em formato redondo. | Concluída |
| 7 | Usuários iniciais com permissões por pasta. | Concluída |
| 8 | Mural de comunicados, diretório de colaboradores e gestão de usuários. | Concluída |

### Permissões das pastas compartilhadas

| Perfil | `/compartilhamento/admin` | `/compartilhamento/geral` |
| --- | --- | --- |
| `admin` | Upload, download, criar pastas e excluir | Upload, download, criar pastas e excluir |
| `usuario` | Sem acesso | Upload e download |

### Usuários iniciais

| Usuário | Perfil | Acesso às pastas |
| --- | --- | --- |
| `mariana` | `admin` | `admin` e `geral` |
| `jean` | `admin` | `admin` e `geral` |
| `fulano` | `usuario` | `geral` |
| `sicrano` | `usuario` | `geral` |
| `beltrano` | `usuario` | `geral` |

Todos os usuários iniciais têm a senha padrão `capivara`, armazenada no banco apenas como hash. Por ser uma senha pública, documentada neste repositório, recomenda-se alterá-la após a implantação.

## Estrutura

| Local | Responsabilidade |
| --- | --- |
| [frontend/](frontend/README.md) | Interface React + Vite: login, mural, diretório, explorador de arquivos e editor de imagens. |
| [backend/](backend/README.md) | API Express: autenticação, permissões, regras de negócio, arquivos e entrega do frontend. |
| [database/](database/README.md) | Scripts SQL de criação das tabelas e dados iniciais do MySQL 8.4. |
| [infra/](infra/README.md) | Execução com Docker Compose, persistência, implantação na EC2 e integração com o nginx. |
| [Dockerfile](Dockerfile) e [docker-compose.yml](docker-compose.yml) | Imagem única da aplicação e orquestração das três réplicas com o MySQL. |
| [docs/](docs/README.md) | Arquitetura, decisões técnicas e convenções de desenvolvimento. |
| [.github/](.github/workflows/README.md) | Espaço reservado para automações futuras. |

## Convenções de desenvolvimento

- [Padrão de commits](docs/conventions/COMMIT.md): Conventional Commits com emojis opcionais.
- Branches: os commits são feitos diretamente na `main`. O [guia de Gitflow](docs/conventions/GITFLOW.md) é mantido apenas como material de referência.

## Licença

Consulte o arquivo [LICENSE](LICENSE) presente no repositório.
