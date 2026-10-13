# Backend

API da intranet em Node.js + Express. Também entrega o build do [frontend](../frontend/README.md) quando ele existir.

## Requisitos

- Node.js 22.9 ou superior.
- MySQL 8.4 inicializado com os scripts de [database/init](../database/README.md).

## Execução local (fora do Docker)

```bash
cd backend
npm install
cp .env.example .env   # ajuste DB_PASSWORD e JWT_SECRET
npm run dev            # reinicia ao alterar arquivos
```

Em produção, o container executa `npm start`, recebendo as variáveis de ambiente diretamente (sem arquivo `.env`).

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `PORT` | Não | `3000` | Porta HTTP do servidor. |
| `INSTANCE_NAME` | Não | hostname | Nome da réplica, retornado em `/api/health` e no cabeçalho `X-Instancia`. |
| `DB_HOST` / `DB_PORT` | Não | `localhost` / `3306` | Endereço do MySQL. |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Sim | — | Credenciais e banco da aplicação. |
| `JWT_SECRET` | Sim | — | Segredo de assinatura dos tokens, com pelo menos 32 caracteres. Deve ser igual nas três réplicas. |
| `JWT_EXPIRES_IN` | Não | `8h` | Validade do login. |
| `COOKIE_SECURE` | Não | `false` | Use `true` quando a intranet for servida por HTTPS. |
| `SHARE_ADMIN_DIR` / `SHARE_GERAL_DIR` | Não | `../compartilhamento/admin` e `../compartilhamento/geral` | Pastas compartilhadas. Caminhos relativos partem de `backend/`. São criadas na inicialização, se não existirem. |
| `UPLOAD_MAX_MB` | Não | `100` | Tamanho máximo de cada arquivo enviado. |
| `STATIC_DIR` | Não | `../frontend/dist` | Build do frontend; servido apenas se contiver `index.html`. |

O servidor encerra na inicialização se uma variável obrigatória estiver ausente ou inválida.

## Organização

```text
backend/
├── src/
│   ├── server.js      # inicialização, pastas compartilhadas e encerramento
│   ├── app.js         # montagem das rotas, health, estáticos e tratamento de erros
│   ├── config.js      # leitura e validação das variáveis de ambiente
│   ├── db.js          # pool de conexões MySQL
│   ├── auth.js        # JWT em cookie, autenticação e exigência de admin
│   ├── pastas.js      # permissões e proteção de caminhos das pastas compartilhadas
│   ├── validacao.js   # validações de entrada
│   ├── erros.js       # erros HTTP e respostas de erro em JSON
│   └── rotas/         # auth, usuarios, comunicados, colaboradores e arquivos
└── test/              # testes com node:test e supertest
```

## API

Todas as respostas são JSON (exceto downloads) e erros seguem o formato `{ "erro": "mensagem" }`. Rotas marcadas com 🔒 exigem login; 👑 exigem perfil `admin`.

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Público | Estado da instância e do banco (`503` se o banco estiver indisponível). |
| `POST` | `/api/auth/login` | Público | Corpo `{ username, senha }`. Define o cookie `intranet_token`. |
| `POST` | `/api/auth/logout` | Público | Remove o cookie de login. |
| `GET` | `/api/auth/me` | 🔒 | Usuário logado. |
| `PUT` | `/api/auth/senha` | 🔒 | Corpo `{ senhaAtual, novaSenha }`. Troca a própria senha. |
| `GET` | `/api/comunicados` | 🔒 | Lista comunicados, mais recentes primeiro. |
| `POST` / `PUT /:id` / `DELETE /:id` | `/api/comunicados` | 👑 | Corpo `{ titulo, conteudo }`. |
| `GET` | `/api/colaboradores?q=` | 🔒 | Lista o diretório; `q` busca por nome, setor, cargo, ramal ou e-mail. |
| `POST` / `PUT /:id` / `DELETE /:id` | `/api/colaboradores` | 👑 | Corpo `{ nome, setor, cargo?, ramal?, email?, usuarioId? }`. |
| `GET` | `/api/usuarios` | 👑 | Lista usuários (sem hashes de senha). |
| `POST` | `/api/usuarios` | 👑 | Corpo `{ username, nome, senha, perfil? }`. |
| `PUT` | `/api/usuarios/:id` | 👑 | Corpo parcial `{ nome?, perfil?, ativo?, senha? }`. |
| `DELETE` | `/api/usuarios/:id` | 👑 | Exclui um usuário. |
| `GET` | `/api/arquivos` | 🔒 | Pastas compartilhadas permitidas ao usuário. |
| `GET` | `/api/arquivos/:pasta?caminho=` | 🔒 | Lista uma pasta (`pasta` é `admin` ou `geral`). |
| `GET` | `/api/arquivos/:pasta/download?caminho=` | 🔒 | Baixa um arquivo. |
| `POST` | `/api/arquivos/:pasta/upload?caminho=` | 🔒 | `multipart/form-data` com até 20 arquivos no campo `arquivos`. |
| `POST` | `/api/arquivos/:pasta/pastas` | 👑 | Corpo `{ caminho, nome }`. Cria uma subpasta. |
| `DELETE` | `/api/arquivos/:pasta?caminho=` | 👑 | Exclui um arquivo ou pasta (com conteúdo). |

### Regras de segurança

- O login recarrega o usuário do banco a cada requisição: usuários desativados ou excluídos perdem o acesso imediatamente, em todas as réplicas.
- Um administrador não pode remover o próprio perfil de admin, se desativar ou se excluir, e a intranet mantém sempre pelo menos um administrador ativo.
- As rotas de arquivos verificam a permissão da pasta, rejeitam caminhos com `..` e links simbólicos que levem para fora da pasta compartilhada.
- Uploads não sobrescrevem arquivos existentes: um nome repetido recebe o sufixo ` (1)`, ` (2)`, etc. O arquivo é gravado com nome temporário e só aparece na listagem após o envio completo.

## Testes

```bash
cd backend
npm test
```

Os testes das regras de pastas rodam sem dependências externas. Os testes de integração da API exigem um MySQL inicializado com os scripts de `database/init` e são ignorados quando `TEST_DB_HOST` não está definido. Use um banco **exclusivo para testes**: os testes criam e removem registros com prefixo `teste-`/`Teste`. Exemplo com um container temporário (executado na raiz do repositório):

```bash
docker run -d --rm --name intranet-db-teste -p 127.0.0.1:3307:3306 \
  -e MYSQL_ROOT_PASSWORD=root-teste -e MYSQL_DATABASE=intranet \
  -e MYSQL_USER=intranet -e MYSQL_PASSWORD=senha-teste \
  -v "$(pwd)/database/init:/docker-entrypoint-initdb.d:ro" mysql:8.4

cd backend
TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3307 TEST_DB_PASSWORD=senha-teste npm test

docker stop intranet-db-teste
```

As variáveis de teste também podem ser definidas em `backend/.env.test` (ignorado pelo Git): `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER` (padrão `intranet`), `TEST_DB_PASSWORD` e `TEST_DB_NAME` (padrão `intranet`).
