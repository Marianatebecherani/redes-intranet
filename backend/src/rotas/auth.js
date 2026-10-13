import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { NOME_COOKIE, emitirToken, opcoesCookie } from '../auth.js';
import { naoAutenticado, requisicaoInvalida } from '../erros.js';
import { senhaValida } from '../validacao.js';

// Hash usado quando o usuário não existe, para que a resposta leve o mesmo tempo
// e não revele quais usernames estão cadastrados.
const HASH_FICTICIO = bcrypt.hashSync('senha-ficticia-para-comparacao', 10);

export function rotasAuth({ config, pool, autenticar }) {
  const rotas = Router();

  rotas.post('/login', async (req, res) => {
    const { username, senha } = req.body ?? {};
    if (typeof username !== 'string' || typeof senha !== 'string' || !username || !senha) {
      throw requisicaoInvalida('Informe usuário e senha');
    }

    const [linhas] = await pool.query(
      'SELECT id, username, nome, perfil, senha_hash, ativo FROM usuarios WHERE username = ?',
      [username.trim().toLowerCase()],
    );
    const usuario = linhas[0];
    const senhaConfere = await bcrypt.compare(senha, usuario?.senha_hash ?? HASH_FICTICIO);

    if (!usuario || !senhaConfere || !usuario.ativo) {
      throw naoAutenticado('Usuário ou senha inválidos');
    }

    res.cookie(NOME_COOKIE, emitirToken(config, usuario), opcoesCookie(config));
    res.json({
      usuario: { id: usuario.id, username: usuario.username, nome: usuario.nome, perfil: usuario.perfil },
    });
  });

  rotas.post('/logout', (req, res) => {
    res.clearCookie(NOME_COOKIE, opcoesCookie(config));
    res.status(204).end();
  });

  rotas.get('/me', autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  rotas.put('/senha', autenticar, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body ?? {};
    if (typeof senhaAtual !== 'string' || !senhaAtual) {
      throw requisicaoInvalida('Informe a senha atual');
    }
    senhaValida(novaSenha, 'novaSenha');

    const [linhas] = await pool.query('SELECT senha_hash FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!(await bcrypt.compare(senhaAtual, linhas[0].senha_hash))) {
      throw requisicaoInvalida('Senha atual incorreta');
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await pool.query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [hash, req.usuario.id]);
    res.status(204).end();
  });

  return rotas;
}
