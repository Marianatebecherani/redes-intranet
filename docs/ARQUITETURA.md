# Arquitetura e decisões técnicas

Este documento registra as decisões adotadas para a Redes Intranet. Itens ainda não implementados estão descritos como planejados; o andamento geral está nas [metas do projeto](../README.md#metas-do-projeto).

## Visão geral

| Serviço | Imagem | Porta no host | Função |
| --- | --- | --- | --- |
| `app1`, `app2`, `app3` | Imagem própria (Node.js + Express + build React) | `3001`, `3002`, `3003` | Réplicas idênticas da intranet. |
| `db` | MySQL 8.4 | Não publicada | Banco de dados da intranet. |

O proxy reverso e o balanceamento de carga entre as três réplicas são feitos por nginx instalado diretamente na EC2, fora do Docker. A configuração do nginx não faz parte deste repositório.

## Decisões

### Frontend e backend em uma única imagem

- **Contexto:** o objetivo é manter o ambiente o mais simples possível e subir três cópias idênticas da aplicação.
- **Decisão:** um Dockerfile multi-stage gera o build do frontend (React + Vite) e o copia para a imagem final do backend (Node.js + Express), que serve a API em `/api` e os arquivos estáticos nas demais rotas.
- **Consequências:** um único serviço por réplica, sem necessidade de CORS entre frontend e backend. Alterações em qualquer um dos dois exigem a reconstrução da imagem.

### Autenticação sem estado no servidor

- **Contexto:** o nginx distribuirá as requisições entre três réplicas sem garantia de que o mesmo usuário seja atendido sempre pela mesma instância.
- **Decisão:** após o login, o backend emite um JWT assinado com um segredo compartilhado pelas três réplicas e o envia em cookie `httpOnly`. As senhas são armazenadas com hash bcrypt.
- **Consequências:** qualquer réplica valida o token sem consultar uma sessão em memória. O logout remove o cookie do navegador; o token expira pelo tempo de validade configurado.

### Perfis e permissões

- **Perfis:** `admin` e `usuario`.
- **Regras:** as permissões são verificadas no backend em todas as rotas protegidas, inclusive nas operações de arquivos. A interface apenas oculta ações indisponíveis.
- **Pastas:** `admin` acessa `/compartilhamento/admin` e `/compartilhamento/geral` com upload, download, criação de pastas e exclusão; `usuario` acessa somente `/compartilhamento/geral`, com upload e download.

### Persistência

- **Banco:** volume nomeado `mysql-data` montado em `/var/lib/mysql`. As tabelas e os dados iniciais são criados por scripts SQL de [database/](../database/README.md) na primeira inicialização do volume.
- **Arquivos:** as pastas do host são montadas por bind mount nas três réplicas. Os caminhos no host são configuráveis por variáveis de ambiente para permitir o desenvolvimento local; na EC2, apontam para `/compartilhamento/admin` e `/compartilhamento/geral`.
- **Segurança de caminhos:** o backend resolve cada caminho solicitado dentro da raiz da pasta permitida e rejeita tentativas de sair dela (por exemplo, com `../`).

### Editor de imagens PNG redondas

- **Decisão:** o recorte circular é feito no navegador com Canvas, deixando transparente a área fora do círculo.
- **Consequências:** não há processamento de imagem no servidor. O resultado pode ser baixado ou enviado para uma pasta compartilhada à qual o usuário tenha acesso, usando a mesma rota de upload do explorador de arquivos.

## Pontos de atenção na EC2

- O container da aplicação será executado com o usuário `node` (UID `1000`). As pastas compartilhadas precisam permitir escrita para esse UID, por exemplo com `sudo chown -R 1000:1000 /compartilhamento`.
- O nginx deve encaminhar as requisições para `127.0.0.1:3001`, `127.0.0.1:3002` e `127.0.0.1:3003`.
- O limite de tamanho de upload precisa ser compatível entre o nginx (`client_max_body_size`) e a aplicação.
