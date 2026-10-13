import { useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../componentes/Aviso.jsx';
import { formatarData } from '../formatacao.js';
import { useSessao } from '../sessao.jsx';
import { useDados } from '../useDados.js';

const VAZIO = { titulo: '', conteudo: '' };

export function Comunicados() {
  const { usuario, ehAdmin } = useSessao();

  // Mesmas regras do backend: só o autor edita; o autor exclui, ou um admin
  // quando o autor foi removido.
  const podeEditar = (comunicado) => ehAdmin && comunicado.autorId === usuario.id;
  const podeExcluir = (comunicado) =>
    ehAdmin && (comunicado.autorId === usuario.id || comunicado.autorId === null);
  const { dados: comunicados, erro, carregando, recarregar } = useDados('/comunicados');
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [formAberto, setFormAberto] = useState(false);
  const [erroAcao, setErroAcao] = useState('');
  const [enviando, setEnviando] = useState(false);

  function abrirNovo() {
    setForm(VAZIO);
    setEditandoId(null);
    setErroAcao('');
    setFormAberto(true);
  }

  function editar(comunicado) {
    setForm({ titulo: comunicado.titulo, conteudo: comunicado.conteudo });
    setEditandoId(comunicado.id);
    setErroAcao('');
    setFormAberto(true);
  }

  function fechar() {
    setFormAberto(false);
    setEditandoId(null);
    setForm(VAZIO);
  }

  async function salvar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErroAcao('');
    try {
      if (editandoId) {
        await api(`/comunicados/${editandoId}`, { metodo: 'PUT', corpo: form });
      } else {
        await api('/comunicados', { metodo: 'POST', corpo: form });
      }
      fechar();
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(comunicado) {
    if (!window.confirm(`Excluir o comunicado "${comunicado.titulo}"?`)) {
      return;
    }
    setErroAcao('');
    try {
      await api(`/comunicados/${comunicado.id}`, { metodo: 'DELETE' });
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    }
  }

  return (
    <section>
      <div className="titulo-secao">
        <h1>Comunicados</h1>
        {ehAdmin && !formAberto && (
          <button type="button" className="botao" onClick={abrirNovo}>
            Novo comunicado
          </button>
        )}
      </div>

      {formAberto && (
        <form onSubmit={salvar} className="formulario cartao">
          <h2>{editandoId ? 'Editar comunicado' : 'Novo comunicado'}</h2>
          <label>
            Título
            <input value={form.titulo} maxLength={150} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
          </label>
          <label>
            Conteúdo
            <textarea
              rows={5}
              value={form.conteudo}
              maxLength={10000}
              onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              required
            />
          </label>
          <div className="acoes">
            <button type="submit" className="botao" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" className="botao botao-secundario" onClick={fechar}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <Aviso aoFechar={() => setErroAcao('')}>{erroAcao}</Aviso>
      <Aviso>{erro}</Aviso>
      {carregando && !comunicados && <p className="texto-secundario">Carregando comunicados…</p>}
      {comunicados?.length === 0 && <p className="texto-secundario">Nenhum comunicado publicado.</p>}

      <div className="lista-cartoes">
        {comunicados?.map((comunicado) => (
          <article key={comunicado.id} className="cartao comunicado">
            <h2>{comunicado.titulo}</h2>
            <p className="texto-secundario">
              {comunicado.autorNome ?? 'Autor removido'} · {formatarData(comunicado.criadoEm)}
              {comunicado.atualizadoEm !== comunicado.criadoEm && ' (editado)'}
            </p>
            <p className="texto-livre">{comunicado.conteudo}</p>
            {(podeEditar(comunicado) || podeExcluir(comunicado)) && (
              <div className="acoes">
                {podeEditar(comunicado) && (
                  <button type="button" className="botao botao-secundario" onClick={() => editar(comunicado)}>
                    Editar
                  </button>
                )}
                {podeExcluir(comunicado) && (
                  <button type="button" className="botao botao-perigo" onClick={() => excluir(comunicado)}>
                    Excluir
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
