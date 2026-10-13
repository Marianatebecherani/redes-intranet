import { Link, Navigate, Route, Routes } from 'react-router';
import { Layout } from './componentes/Layout.jsx';
import { Arquivos } from './paginas/Arquivos.jsx';
import { Colaboradores } from './paginas/Colaboradores.jsx';
import { Comunicados } from './paginas/Comunicados.jsx';
import { ImagemRedonda } from './paginas/ImagemRedonda.jsx';
import { Login } from './paginas/Login.jsx';
import { Senha } from './paginas/Senha.jsx';
import { Usuarios } from './paginas/Usuarios.jsx';
import { useSessao } from './sessao.jsx';

export function App() {
  const { usuario, carregando, ehAdmin } = useSessao();

  if (carregando) {
    return <p className="carregando-tela">Carregando…</p>;
  }

  if (!usuario) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/comunicados" replace />} />
        <Route path="comunicados" element={<Comunicados />} />
        <Route path="colaboradores" element={<Colaboradores />} />
        <Route path="arquivos" element={<Arquivos />} />
        <Route path="imagem-redonda" element={<ImagemRedonda />} />
        <Route path="usuarios" element={ehAdmin ? <Usuarios /> : <Navigate to="/comunicados" replace />} />
        <Route path="senha" element={<Senha />} />
        <Route path="*" element={<NaoEncontrado />} />
      </Route>
    </Routes>
  );
}

function NaoEncontrado() {
  return (
    <section>
      <h1>Página não encontrada</h1>
      <p>
        <Link to="/comunicados">Voltar para os comunicados</Link>
      </p>
    </section>
  );
}
