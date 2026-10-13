import { useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../componentes/Aviso.jsx';
import { useSessao } from '../sessao.jsx';
import { useDados } from '../useDados.js';

const VAZIO = { username: '', nome: '', perfil: 'usuario', ativo: true, senha: '' };

export function Usuarios() {
  const { usuario: logado } = useSessao();
  const { dados: usuarios, erro, carregando, recarregar } = useDados('/usuarios');
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [formAberto, setFormAberto] = useState(false);
  const [erroAcao, setErroAcao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  function abrir(usuario) {
    setErroAcao('');
    setMensagem('');
    setEditandoId(usuario?.id ?? null);
    setForm(usuario ? { ...VAZIO, nome: usuario.nome, perfil: usuario.perfil, ativo: usuario.ativo, username: usuario.username } : VAZIO);
    setFormAberto(true);
  }

  function fechar() {
    setFormAberto(false);
    setEditandoId(null);
  }

  async function salvar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErroAcao('');
    try {
      if (editandoId) {
        const corpo = { nome: form.nome, perfil: form.perfil, ativo: form.ativo };
        if (form.senha) {
          corpo.senha = form.senha;
        }
        await api(`/usuarios/${editandoId}`, { metodo: 'PUT', corpo });
        setMensagem(`Usuário "${form.username}" atualizado.`);
      } else {
        await api('/usuarios', {
          metodo: 'POST',
          corpo: { username: form.username, nome: form.nome, perfil: form.perfil, senha: form.senha },
        });
        setMensagem(`Usuário "${form.username}" criado.`);
      }
      fechar();
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(usuario) {
    if (!window.confirm(`Excluir o usuário "${usuario.username}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setErroAcao('');
    setMensagem('');
    try {
      await api(`/usuarios/${usuario.id}`, { metodo: 'DELETE' });
      setMensagem(`Usuário "${usuario.username}" excluído.`);
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    }
  }

  const editandoASiMesmo = editandoId === logado.id;

  return (
    <section>
      <div className="titulo-secao">
        <h1>Usuários</h1>
        {!formAberto && (
          <button type="button" className="botao" onClick={() => abrir(null)}>
            Novo usuário
          </button>
        )}
      </div>

      {formAberto && (
        <form onSubmit={salvar} className="formulario cartao grade-formulario">
          <h2>{editandoId ? `Editar ${form.username}` : 'Novo usuário'}</h2>
          {!editandoId && (
            <label>
              Username
              <input
                value={form.username}
                maxLength={50}
                pattern="[a-z0-9._\-]+"
                title="Letras minúsculas, números, ponto, hífen ou sublinhado"
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                required
              />
            </label>
          )}
          <label>
            Nome
            <input value={form.nome} maxLength={120} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </label>
          <label>
            Perfil
            <select value={form.perfil} disabled={editandoASiMesmo} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
              <option value="usuario">usuario (pasta geral)</option>
              <option value="admin">admin (todas as pastas)</option>
            </select>
          </label>
          <label>
            {editandoId ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              maxLength={72}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              required={!editandoId}
            />
          </label>
          {editandoId && (
            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={form.ativo}
                disabled={editandoASiMesmo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              Ativo
            </label>
          )}
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

      <Aviso tipo="sucesso" aoFechar={() => setMensagem('')}>
        {mensagem}
      </Aviso>
      <Aviso aoFechar={() => setErroAcao('')}>{erroAcao}</Aviso>
      <Aviso>{erro}</Aviso>
      {carregando && !usuarios && <p className="texto-secundario">Carregando usuários…</p>}

      {usuarios && (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nome</th>
                <th>Perfil</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.nome}</td>
                  <td>
                    <span className="etiqueta">{u.perfil}</span>
                  </td>
                  <td>{u.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="acoes-tabela">
                    <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => abrir(u)}>
                      Editar
                    </button>
                    {u.id !== logado.id && (
                      <button type="button" className="botao botao-perigo botao-pequeno" onClick={() => excluir(u)}>
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
