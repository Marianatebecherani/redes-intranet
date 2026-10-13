import jwt from 'jsonwebtoken';
import { acessoNegado, naoAutenticado } from './erros.js';

export const NOME_COOKIE = 'intranet_token';

export function emitirToken(config, usuario) {
  return jwt.sign({ sub: String(usuario.id) }, config.jwt.segredo, {
    expiresIn: config.jwt.expiracao,
    algorithm: 'HS256',
  });
}

export function opcoesCookie(config) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSeguro,
    path: '/',
  };
}

// Valida o token e recarrega o usuário do banco a cada requisição, para que
// desativações e mudanças de perfil tenham efeito imediato em todas as réplicas.
export function autenticar({ config, pool }) {
  return async (req, res, next) => {
    const token = req.cookies?.[NOME_COOKIE];
    if (!token) {
      throw naoAutenticado();
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.segredo, { algorithms: ['HS256'] });
    } catch {
      res.clearCookie(NOME_COOKIE, opcoesCookie(config));
      throw naoAutenticado('Sessão expirada ou inválida. Faça login novamente');
    }

    const [linhas] = await pool.query(
      'SELECT id, username, nome, perfil FROM usuarios WHERE id = ? AND ativo = TRUE',
      [Number(payload.sub)],
    );
    if (linhas.length === 0) {
      res.clearCookie(NOME_COOKIE, opcoesCookie(config));
      throw naoAutenticado('Usuário inativo ou inexistente');
    }

    req.usuario = linhas[0];
    next();
  };
}

export function exigirAdmin(req, res, next) {
  if (req.usuario?.perfil !== 'admin') {
    throw acessoNegado();
  }
  next();
}
