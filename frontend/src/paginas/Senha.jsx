import { useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../componentes/Aviso.jsx';

export function Senha() {
  const [campos, setCampos] = useState({ senhaAtual: '', novaSenha: '', confirmacao: '' });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (e) => setCampos({ ...campos, [campo]: e.target.value });

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setSucesso('');
    if (campos.novaSenha !== campos.confirmacao) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }
    setEnviando(true);
    try {
      await api('/auth/senha', {
        metodo: 'PUT',
        corpo: { senhaAtual: campos.senhaAtual, novaSenha: campos.novaSenha },
      });
      setCampos({ senhaAtual: '', novaSenha: '', confirmacao: '' });
      setSucesso('Senha alterada com sucesso.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="secao-estreita">
      <h1>Trocar senha</h1>
      <form onSubmit={enviar} className="formulario cartao">
        <label>
          Senha atual
          <input type="password" autoComplete="current-password" value={campos.senhaAtual} onChange={alterar('senhaAtual')} required />
        </label>
        <div className="campo">
          <label htmlFor="nova-senha">Nova senha</label>
          <input
            id="nova-senha"
            type="password"
            autoComplete="new-password"
            minLength={6}
            maxLength={72}
            aria-describedby="nova-senha-dica"
            value={campos.novaSenha}
            onChange={alterar('novaSenha')}
            required
          />
          <small id="nova-senha-dica">Entre 6 e 72 caracteres.</small>
        </div>
        <label>
          Confirme a nova senha
          <input type="password" autoComplete="new-password" value={campos.confirmacao} onChange={alterar('confirmacao')} required />
        </label>
        <Aviso>{erro}</Aviso>
        <Aviso tipo="sucesso">{sucesso}</Aviso>
        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </section>
  );
}
