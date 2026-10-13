# Frontend

Interface web da intranet em React + Vite. Em produção, o build gerado em `dist/` é servido pelo [backend](../backend/README.md) na mesma imagem Docker.

## Requisitos

- Node.js 22.22 ou superior (exigido pelo `react-router` 8).
- Backend em execução para usar a interface (veja [backend/README.md](../backend/README.md)).

## Comandos

```bash
cd frontend
npm install
npm run dev       # servidor de desenvolvimento em http://localhost:5173
npm run build     # gera o build de produção em dist/
npm run preview   # serve o build localmente para conferência
```

Em desenvolvimento, o Vite encaminha as chamadas para `/api` ao backend em `http://localhost:3000`. Para usar outro endereço, defina `VITE_API_PROXY` antes de executar `npm run dev`.

Para testar o build pelo próprio backend, execute `npm run build` e inicie o backend: ele serve `../frontend/dist` por padrão (variável `STATIC_DIR`).

## Telas

| Rota | Acesso | Conteúdo |
| --- | --- | --- |
| Login | Público | Usuário e senha. Exibida sempre que não houver sessão válida. |
| `/comunicados` | Todos | Mural de comunicados; administradores publicam, e os botões de editar e excluir aparecem apenas para o autor de cada comunicado (ou, para excluir, a qualquer admin quando o autor foi removido). |
| `/colaboradores` | Todos | Diretório com busca; administradores mantêm os registros e vinculam logins. |
| `/arquivos` | Todos | Explorador das pastas compartilhadas permitidas ao usuário: navegação por subpastas, upload (botão ou arrastar e soltar) e download; administradores também criam pastas e excluem itens. |
| `/imagem-redonda` | Todos | Recorte de imagens PNG em círculo com fundo transparente, com zoom, posição e tamanho do resultado; o PNG pode ser baixado ou salvo em uma pasta compartilhada. |
| `/usuarios` | Admin | Criação, edição, desativação, redefinição de senha e exclusão de usuários. |
| `/senha` | Todos | Troca da própria senha. |

O rodapé mostra a instância que atendeu a última requisição (cabeçalho `X-Instancia`), permitindo observar o balanceamento entre as réplicas.

## Organização

```text
frontend/
├── index.html
├── public/favicon.svg
├── vite.config.js
└── src/
    ├── main.jsx         # ponto de entrada
    ├── App.jsx          # rotas e controle de acesso das telas
    ├── api.js           # cliente da API (fetch com cookie, erros e instância)
    ├── sessao.jsx       # contexto de login e instância atual
    ├── useDados.js      # carregamento de dados da API
    ├── formatacao.js    # datas e tamanhos de arquivo
    ├── estilos.css      # estilos globais, com tema claro/escuro e layout responsivo
    ├── componentes/     # Layout e Aviso
    └── paginas/         # uma tela por arquivo
```

O editor de imagem redonda processa a imagem no navegador com Canvas; nenhuma imagem é enviada ao servidor, exceto quando o usuário escolhe salvá-la em uma pasta.

## Verificação

Não há testes automatizados versionados no frontend. As permissões são aplicadas e testadas no backend; a interface apenas oculta ações indisponíveis. Use `npm run build` para conferir a compilação.
