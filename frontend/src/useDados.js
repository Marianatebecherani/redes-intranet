import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// Carrega um recurso da API e permite recarregá-lo. Respostas de requisições
// antigas são descartadas quando o caminho muda antes de terminarem.
export function useDados(caminho) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const ultimaRequisicao = useRef(0);

  const recarregar = useCallback(async () => {
    if (!caminho) {
      return;
    }
    const id = ++ultimaRequisicao.current;
    setCarregando(true);
    setErro('');
    try {
      const resultado = await api(caminho);
      if (id === ultimaRequisicao.current) {
        setDados(resultado);
      }
    } catch (err) {
      if (id === ultimaRequisicao.current) {
        setErro(err.message);
        setDados(null);
      }
    } finally {
      if (id === ultimaRequisicao.current) {
        setCarregando(false);
      }
    }
  }, [caminho]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, erro, carregando, recarregar };
}
