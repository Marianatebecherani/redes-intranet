import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { conflito, naoEncontrado, requisicaoInvalida } from '../erros.js';
import { idDaRota, perfilValido, senhaValida, textoObrigatorio, usernameValido } from '../validacao.js';

const CAMPOS = 'id, username, nome, perfil, ativo, criado_em AS criadoEm, atualizado_em AS atualizadoEm';

function formatar(linha) {
  return { ...linha, ativo: Boolean(linha.ativo) };
}

// Rotas exclusivas de administradores (o middleware exigirAdmin é aplicado em app.js).
export function rotasUsuarios({ pool }) {
  const rotas = Router();

  async function buscar(id) {
    const [linhas] = await pool.query(`SELECT ${CAMPOS} FROM usuarios WHERE id = ?`, [id]);
    if (linhas.length === 0) {
      throw naoEncontrado('Usuário não encontrado');
    }
    return formatar(linhas[0]);
  }

  async function garantirOutroAdminAtivo(id) {
    const [linhas] = await pool.query(
      "SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'admin' AND ativo = TRUE AND id <> ?",
      [id],
    );
    if (linhas[0].total === 0) {
      throw requisicaoInvalida('A intranet precisa manter pelo menos um administrador ativo');
    }
  }

  rotas.get('/', async (req, res) => {
    const [linhas] = await pool.query(`SELECT ${CAMPOS} FROM usuarios ORDER BY nome`);
    res.json(linhas.map(formatar));
  });

  rotas.post('/', async (req, res) => {
    const corpo = req.body ?? {};
    const username = usernameValido(corpo.username);
    const nome = textoObrigatorio(corpo.nome, 'nome', { max: 120 });
    const perfil = perfilValido(corpo.perfil ?? 'usuario');
    const hash = await bcrypt.hash(senhaValida(corpo.senha), 10);

    try {
      const [resultado] = await pool.query(
        'INSERT INTO usuarios (username, nome, senha_hash, perfil) VALUES (?, ?, ?, ?)',
        [username, nome, hash, perfil],
      );
      res.status(201).json(await buscar(resultado.insertId));
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw conflito('Já existe um usuário com esse username');
      }
      throw err;
    }
  });

  rotas.put('/:id', async (req, res) => {
    const id = idDaRota(req.params.id);
    const atual = await buscar(id);
    const corpo = req.body ?? {};

    const nome = corpo.nome === undefined ? atual.nome : textoObrigatorio(corpo.nome, 'nome', { max: 120 });
    const perfil = corpo.perfil === undefined ? atual.perfil : perfilValido(corpo.perfil);
    if (corpo.ativo !== undefined && typeof corpo.ativo !== 'boolean') {
      throw requisicaoInvalida('O campo "ativo" deve ser verdadeiro ou falso');
    }
    const ativo = corpo.ativo ?? atual.ativo;

    const deixaDeSerAdminAtivo = atual.perfil === 'admin' && atual.ativo && (perfil !== 'admin' || !ativo);
    if (deixaDeSerAdminAtivo) {
      if (id === req.usuario.id) {
        throw requisicaoInvalida('Você não pode remover o próprio acesso de administrador');
      }
      await garantirOutroAdminAtivo(id);
    }

    const campos = ['nome = ?', 'perfil = ?', 'ativo = ?'];
    const valores = [nome, perfil, ativo];
    if (corpo.senha !== undefined) {
      campos.push('senha_hash = ?');
      valores.push(await bcrypt.hash(senhaValida(corpo.senha), 10));
    }

    await pool.query(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, [...valores, id]);
    res.json(await buscar(id));
  });

  rotas.delete('/:id', async (req, res) => {
    const id = idDaRota(req.params.id);
    if (id === req.usuario.id) {
      throw requisicaoInvalida('Você não pode excluir o próprio usuário');
    }
    const atual = await buscar(id);
    if (atual.perfil === 'admin' && atual.ativo) {
      await garantirOutroAdminAtivo(id);
    }

    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.status(204).end();
  });

  return rotas;
}
