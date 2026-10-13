import { Router } from 'express';
import { acessoNegado, naoEncontrado } from '../erros.js';
import { idDaRota, textoObrigatorio } from '../validacao.js';

// Apenas o autor edita o próprio comunicado.
export function podeEditar(usuario, comunicado) {
  return comunicado.autorId === usuario.id;
}

// O autor exclui o próprio comunicado; se o autor foi removido,
// qualquer administrador pode excluí-lo para que não fique sem dono.
export function podeExcluir(usuario, comunicado) {
  return comunicado.autorId === usuario.id || (comunicado.autorId === null && usuario.perfil === 'admin');
}

const CONSULTA = `
  SELECT c.id, c.titulo, c.conteudo, c.criado_em AS criadoEm, c.atualizado_em AS atualizadoEm,
         c.autor_id AS autorId, u.nome AS autorNome
  FROM comunicados c
  LEFT JOIN usuarios u ON u.id = c.autor_id`;

export function rotasComunicados({ pool, exigirAdmin }) {
  const rotas = Router();

  async function buscar(id) {
    const [linhas] = await pool.query(`${CONSULTA} WHERE c.id = ?`, [id]);
    if (linhas.length === 0) {
      throw naoEncontrado('Comunicado não encontrado');
    }
    return linhas[0];
  }

  function lerCorpo(corpo = {}) {
    return {
      titulo: textoObrigatorio(corpo.titulo, 'titulo', { max: 150 }),
      conteudo: textoObrigatorio(corpo.conteudo, 'conteudo', { max: 10000 }),
    };
  }

  rotas.get('/', async (req, res) => {
    const [linhas] = await pool.query(`${CONSULTA} ORDER BY c.criado_em DESC, c.id DESC`);
    res.json(linhas);
  });

  rotas.post('/', exigirAdmin, async (req, res) => {
    const { titulo, conteudo } = lerCorpo(req.body);
    const [resultado] = await pool.query(
      'INSERT INTO comunicados (titulo, conteudo, autor_id) VALUES (?, ?, ?)',
      [titulo, conteudo, req.usuario.id],
    );
    res.status(201).json(await buscar(resultado.insertId));
  });

  rotas.put('/:id', exigirAdmin, async (req, res) => {
    const id = idDaRota(req.params.id);
    if (!podeEditar(req.usuario, await buscar(id))) {
      throw acessoNegado('Apenas o autor pode editar este comunicado');
    }
    const { titulo, conteudo } = lerCorpo(req.body);
    await pool.query('UPDATE comunicados SET titulo = ?, conteudo = ? WHERE id = ?', [titulo, conteudo, id]);
    res.json(await buscar(id));
  });

  rotas.delete('/:id', exigirAdmin, async (req, res) => {
    const id = idDaRota(req.params.id);
    if (!podeExcluir(req.usuario, await buscar(id))) {
      throw acessoNegado('Apenas o autor pode excluir este comunicado');
    }
    await pool.query('DELETE FROM comunicados WHERE id = ?', [id]);
    res.status(204).end();
  });

  return rotas;
}
