import { NavLink, Outlet } from 'react-router';
import { useSessao } from '../sessao.jsx';

export function Layout() {
  const { usuario, ehAdmin, sair, instancia } = useSessao();

  const links = [
    { para: '/comunicados', texto: 'Comunicados' },
    { para: '/colaboradores', texto: 'Colaboradores' },
    { para: '/arquivos', texto: 'Arquivos' },
    { para: '/imagem-redonda', texto: 'Imagem redonda' },
    ...(ehAdmin ? [{ para: '/usuarios', texto: 'Usuários' }] : []),
  ];

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="cabecalho-topo">
          <span className="marca">Redes Intranet</span>
          <div className="sessao">
            <span>
              {usuario.nome} <span className="etiqueta">{usuario.perfil}</span>
            </span>
            <NavLink to="/senha" className="link-discreto">
              Trocar senha
            </NavLink>
            <button type="button" className="botao botao-secundario" onClick={sair}>
              Sair
            </button>
          </div>
        </div>
        <nav aria-label="Navegação principal">
          <ul className="menu">
            {links.map((link) => (
              <li key={link.para}>
                <NavLink to={link.para}>{link.texto}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
      <Rodape instancia={instancia} />
    </div>
  );
}

export function Rodape({ instancia }) {
  return (
    <footer className="rodape">
      Atendido pela instância: <strong data-testid="instancia">{instancia ?? '—'}</strong>
    </footer>
  );
}
