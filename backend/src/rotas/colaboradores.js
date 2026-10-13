import { Router } from 'express';
import { conflito, naoEncontrado, requisicaoInvalida } from '../erros.js';
import { idDaRota, textoObrigatorio, textoOpcional } from '../validacao.js';

const CONSULTA = `
  SELECT c.id, c.nome, c.setor, c.cargo, c.ramal, c.email,
         c.usuario_id AS usuarioId, u.username
  FROM colaboradores c
  LEFT JOIN usuarios u ON u.id = c.usuario_id`;

export function rotasColaboradores({ pool, exigirAdmin }) {
  const rotas = Router();

  async function buscar(id) {
    const [linhas] = await pool.query(`${CONSULTA} WHERE c.id = ?`, [id]);
    if (linhas.length === 0) {
      throw naoEncontrado('Colaborador não encontrado');
    }
    return linhas[0];
  }

  function lerCorpo(corpo = {}) {
    const email = textoOpcional(corpo.email, 'email', { max: 150 });
    if (email && !/^[^\s@]+@[^\s@]+$/.test(email)) {
      throw requisicaoInvalida('E-mail inválido');
    }
    let usuarioId = null;
    if (corpo.usuarioId !== undefined && corpo.usuarioId !== null && corpo.usuarioId !== '') {
      usuarioId = idDaRota(corpo.usuarioId);
    }
    return {
      nome: textoObrigatorio(corpo.nome, 'nome', { max: 120 }),
      setor: textoObrigatorio(corpo.setor, 'setor', { max: 80 }),
      cargo: textoOpcional(corpo.cargo, 'cargo', { max: 80 }),
      ramal: textoOpcional(corpo.ramal, 'ramal', { max: 10 }),
      email,
      usuarioId,
    };
  }

  async function salvar(sql, valores) {
    try {
      return await pool.query(sql, valores);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw conflito('Esse usuário já está vinculado a outro colaborador');
      }
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        throw requisicaoInvalida('Usuário vinculado não encontrado');
      }
      throw err;
    }
  }

  rotas.get('/', async (req, res) => {
    const busca = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (busca) {
      const termo = `%${busca}%`;
      const [linhas] = await pool.query(
        `${CONSULTA} WHERE c.nome LIKE ? OR c.setor LIKE ? OR c.cargo LIKE ? OR c.ramal LIKE ? OR c.email LIKE ?
         ORDER BY c.nome`,
        [termo, termo, termo, termo, termo],
      );
      return res.json(linhas);
    }
    const [linhas] = await pool.query(`${CONSULTA} ORDER BY c.nome`);
    res.json(linhas);
  });

  rotas.post('/', exigirAdmin, async (req, res) => {
    const d = lerCorpo(req.body);
    const [resultado] = await salvar(
      'INSERT INTO colaboradores (nome, setor, cargo, ramal, email, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [d.nome, d.setor, d.cargo, d.ramal, d.email, d.usuarioId],
    );
    res.status(201).json(await buscar(resultado.insertId));
  });

  rotas.put('/:id', exigirAdmin, async (req, res) => {
    const id = idDaRota(req.params.id);
    await buscar(id);
    const d = lerCorpo(req.body);
    await salvar(
      'UPDATE colaboradores SET nome = ?, setor = ?, cargo = ?, ramal = ?, email = ?, usuario_id = ? WHERE id = ?',
      [d.nome, d.setor, d.cargo, d.ramal, d.email, d.usuarioId, id],
    );
    res.json(await buscar(id));
  });

  rotas.delete('/:id', exigirAdmin, async (req, res) => {
    const id = idDaRota(req.params.id);
    await buscar(id);
    await pool.query('DELETE FROM colaboradores WHERE id = ?', [id]);
    res.status(204).end();
  });

  return rotas;
}
