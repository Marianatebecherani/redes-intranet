import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, configurarApi } from './api.js';

const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [instancia, setInstancia] = useState(null);

  useEffect(() => {
    configurarApi({
      aoMudarInstancia: setInstancia,
      aoPerderSessao: () => setUsuario(null),
    });

    api('/auth/me')
      .then((dados) => setUsuario(dados.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (username, senha) => {
    const dados = await api('/auth/login', { metodo: 'POST', corpo: { username, senha } });
    setUsuario(dados.usuario);
  }, []);

  const sair = useCallback(async () => {
    try {
      await api('/auth/logout', { metodo: 'POST' });
    } finally {
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, instancia, entrar, sair, ehAdmin: usuario?.perfil === 'admin' }),
    [usuario, carregando, instancia, entrar, sair],
  );

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  return useContext(SessaoContext);
}
