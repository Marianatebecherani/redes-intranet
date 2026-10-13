import { useState } from 'react';
import { Aviso } from '../componentes/Aviso.jsx';
import { Rodape } from '../componentes/Layout.jsx';
import { useSessao } from '../sessao.jsx';

export function Login() {
  const { entrar, instancia } = useSessao();
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(username, senha);
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-login">
      <main className="cartao cartao-login">
        <h1 className="marca">Redes Intranet</h1>
        <p className="texto-secundario">Entre com seu usuário para acessar a intranet.</p>
        <form onSubmit={enviar} className="formulario">
          <label>
            Usuário
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Senha
            <input
              name="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>
          <Aviso>{erro}</Aviso>
          <button type="submit" className="botao" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </main>
      <Rodape instancia={instancia} />
    </div>
  );
}
