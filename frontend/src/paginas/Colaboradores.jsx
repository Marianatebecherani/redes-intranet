import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../componentes/Aviso.jsx';
import { useSessao } from '../sessao.jsx';
import { useDados } from '../useDados.js';

const VAZIO = { nome: '', setor: '', cargo: '', ramal: '', email: '', usuarioId: '' };

export function Colaboradores() {
  const { ehAdmin } = useSessao();
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');
  const { dados: colaboradores, erro, carregando, recarregar } = useDados(
    `/colaboradores${termo ? `?q=${encodeURIComponent(termo)}` : ''}`,
  );
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [formAberto, setFormAberto] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [erroAcao, setErroAcao] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Aguarda uma pausa na digitação antes de buscar.
  useEffect(() => {
    const espera = setTimeout(() => setTermo(busca.trim()), 300);
    return () => clearTimeout(espera);
  }, [busca]);

  async function abrirFormulario(colaborador) {
    setErroAcao('');
    setEditandoId(colaborador?.id ?? null);
    setForm(
      colaborador
        ? {
            nome: colaborador.nome,
            setor: colaborador.setor,
            cargo: colaborador.cargo ?? '',
            ramal: colaborador.ramal ?? '',
            email: colaborador.email ?? '',
            usuarioId: colaborador.usuarioId ?? '',
          }
        : VAZIO,
    );
    setFormAberto(true);
    try {
      setUsuarios(await api('/usuarios'));
    } catch (err) {
      setErroAcao(err.message);
    }
  }

  function fechar() {
    setFormAberto(false);
    setEditandoId(null);
  }

  async function salvar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErroAcao('');
    const corpo = { ...form, usuarioId: form.usuarioId === '' ? null : Number(form.usuarioId) };
    try {
      if (editandoId) {
        await api(`/colaboradores/${editandoId}`, { metodo: 'PUT', corpo });
      } else {
        await api('/colaboradores', { metodo: 'POST', corpo });
      }
      fechar();
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(colaborador) {
    if (!window.confirm(`Remover ${colaborador.nome} do diretório?`)) {
      return;
    }
    setErroAcao('');
    try {
      await api(`/colaboradores/${colaborador.id}`, { metodo: 'DELETE' });
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    }
  }

  const campo = (nome) => ({
    value: form[nome],
    onChange: (e) => setForm({ ...form, [nome]: e.target.value }),
  });

  return (
    <section>
      <div className="titulo-secao">
        <h1>Colaboradores</h1>
        {ehAdmin && !formAberto && (
          <button type="button" className="botao" onClick={() => abrirFormulario(null)}>
            Novo colaborador
          </button>
        )}
      </div>

      {formAberto && (
        <form onSubmit={salvar} className="formulario cartao grade-formulario">
          <h2>{editandoId ? 'Editar colaborador' : 'Novo colaborador'}</h2>
          <label>
            Nome
            <input maxLength={120} required {...campo('nome')} />
          </label>
          <label>
            Setor
            <input maxLength={80} required {...campo('setor')} />
          </label>
          <label>
            Cargo
            <input maxLength={80} {...campo('cargo')} />
          </label>
          <label>
            Ramal
            <input maxLength={10} {...campo('ramal')} />
          </label>
          <label>
            E-mail
            <input type="email" maxLength={150} {...campo('email')} />
          </label>
          <label>
            Login vinculado
            <select {...campo('usuarioId')}>
              <option value="">Nenhum</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.username})
                </option>
              ))}
            </select>
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

      <label className="campo-busca">
        <span className="visualmente-oculto">Buscar colaboradores</span>
        <input
          type="search"
          placeholder="Buscar por nome, setor, cargo, ramal ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </label>

      <Aviso aoFechar={() => setErroAcao('')}>{erroAcao}</Aviso>
      <Aviso>{erro}</Aviso>
      {carregando && !colaboradores && <p className="texto-secundario">Carregando colaboradores…</p>}
      {colaboradores?.length === 0 && <p className="texto-secundario">Nenhum colaborador encontrado.</p>}

      {colaboradores?.length > 0 && (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Setor</th>
                <th>Cargo</th>
                <th>Ramal</th>
                <th>E-mail</th>
                {ehAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.setor}</td>
                  <td>{c.cargo}</td>
                  <td>{c.ramal}</td>
                  <td>{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}</td>
                  {ehAdmin && (
                    <td className="acoes-tabela">
                      <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => abrirFormulario(c)}>
                        Editar
                      </button>
                      <button type="button" className="botao botao-perigo botao-pequeno" onClick={() => excluir(c)}>
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
