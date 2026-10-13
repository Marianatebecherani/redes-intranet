# Infra

Execução do ambiente Docker da intranet, localmente e na EC2. Os arquivos ficam na raiz do repositório:

| Arquivo | Função |
| --- | --- |
| [Dockerfile](../Dockerfile) | Imagem única da aplicação: build do frontend + backend Express, executada com o usuário `node` (UID 1000) e com healthcheck em `/api/health`. |
| [docker-compose.yml](../docker-compose.yml) | Serviços `app1`, `app2`, `app3` (mesma imagem) e `db` (MySQL 8.4), volume `mysql-data` e montagem das pastas compartilhadas. |
| [.env.example](../.env.example) | Modelo das variáveis do compose, com valores fictícios. |
| [.dockerignore](../.dockerignore) | Limita o contexto do build ao necessário. |

## Requisitos

- Docker com o plugin Docker Compose v2.
- Na EC2: as pastas `/compartilhamento/admin` e `/compartilhamento/geral`.

## Subir o ambiente

```bash
cp .env.example .env     # defina MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD e JWT_SECRET
docker compose up -d --build
docker compose ps        # aguarde os quatro serviços ficarem "healthy"
```

O compose interrompe a execução com uma mensagem se `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` ou `JWT_SECRET` não estiverem definidos. Para gerar um segredo: `openssl rand -hex 32`.

As réplicas sobem somente depois que o MySQL estiver saudável. Na primeira execução, o MySQL cria as tabelas e os usuários iniciais a partir de [database/init](../database/README.md).

| Serviço | Endereço no host | Observação |
| --- | --- | --- |
| `app1` | `127.0.0.1:3001` | Instância `app1` |
| `app2` | `127.0.0.1:3002` | Instância `app2` |
| `app3` | `127.0.0.1:3003` | Instância `app3` |
| `db` | Não publicado | Acessível apenas pela rede interna do compose, no host `db`. |

Localmente, a intranet pode ser aberta diretamente em `http://localhost:3001` (ou 3002, 3003). O rodapé mostra a instância que respondeu.

## Comandos úteis

```bash
docker compose logs -f app1          # logs de uma réplica
docker compose restart app2          # reinicia uma réplica
docker compose up -d --build         # reconstrói a imagem após alterações no código
docker compose down                  # para e remove os containers, preservando os dados
```

> ⚠️ `docker compose down -v` **apaga o volume `mysql-data`**, com todos os usuários, comunicados e colaboradores. Na subida seguinte, o banco é recriado com os dados iniciais. Os arquivos das pastas compartilhadas ficam no host e não são afetados.

## Persistência

| Dado | Onde fica | Sobrevive a `down`/`up` |
| --- | --- | --- |
| Banco MySQL | Volume nomeado `redes-intranet_mysql-data` | Sim (exceto com `down -v`) |
| Arquivos enviados | Pastas do host definidas em `SHARE_ADMIN_HOST_DIR` e `SHARE_GERAL_HOST_DIR` | Sim |

As três réplicas montam as mesmas pastas do host, então um arquivo enviado por qualquer uma delas fica disponível para as demais.

## Implantação na EC2

1. Instale o Docker e o plugin Compose e clone o repositório.
2. Prepare as pastas compartilhadas com escrita para o UID 1000, usado pelo container:

   ```bash
   sudo mkdir -p /compartilhamento/admin /compartilhamento/geral
   sudo chown -R 1000:1000 /compartilhamento
   ```

3. Crie o `.env` a partir do `.env.example`, com senhas e segredo reais, e aponte as pastas para o host:

   ```bash
   SHARE_ADMIN_HOST_DIR=/compartilhamento/admin
   SHARE_GERAL_HOST_DIR=/compartilhamento/geral
   ```

4. Suba o ambiente com `docker compose up -d --build` e confira `docker compose ps`.
5. Teste cada réplica pela própria EC2: `curl http://127.0.0.1:3001/api/health` (e 3002, 3003).
6. Troque as senhas padrão dos usuários iniciais pela tela **Trocar senha** ou pela gestão de usuários.

### Integração com o nginx (fora do escopo deste repositório)

O nginx é configurado diretamente na EC2. Para integrá-lo à intranet:

- Encaminhe as requisições para `127.0.0.1:3001`, `127.0.0.1:3002` e `127.0.0.1:3003`. Com `APP_BIND_ADDRESS=127.0.0.1` (padrão), as réplicas não ficam acessíveis de fora da máquina, apenas pelo nginx.
- Nenhuma afinidade de sessão é necessária: o login é um JWT em cookie, válido em qualquer réplica.
- `GET /api/health` responde `200` quando a réplica e o banco estão disponíveis e `503` quando o banco está indisponível.
- Ajuste `client_max_body_size` para pelo menos o valor de `UPLOAD_MAX_MB`.
- Se o nginx servir HTTPS, defina `COOKIE_SECURE=true` no `.env`.

## Verificação realizada

Validado localmente com Docker Desktop (Windows), Docker 29.7 e Compose v5.5:

- Build da imagem e subida dos quatro serviços até o estado `healthy`; aplicação executando como `node` (UID 1000) e porta do MySQL não publicada no host.
- Login feito na `app1` e reutilizado na `app2` e `app3`.
- Upload pela `app2`, listagem pela `app3` e download pela `app1` do mesmo arquivo, com nome acentuado.
- Comunicado e arquivos preservados após `docker compose down` seguido de `up`, sem nova execução dos scripts de inicialização.
- `app1` e `app3` continuam respondendo com a `app2` parada.
- Teste no navegador contra a `app1`: login, permissões por perfil, comunicados, colaboradores, arquivos, imagem redonda, usuários e layout em celular.

A implantação na EC2 e a integração com o nginx não foram testadas neste repositório.
