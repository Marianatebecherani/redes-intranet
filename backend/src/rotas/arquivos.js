import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { acessoNegado, conflito, requisicaoInvalida } from '../erros.js';
import {
  PREFIXO_TEMPORARIO,
  exigirAcesso,
  nomeValido,
  pastasPermitidas,
  podeGerenciar,
  reservarNomeLivre,
  resolverCaminho,
  verificarExistente,
} from '../pastas.js';

const MAX_ARQUIVOS_POR_ENVIO = 20;

export function rotasArquivos({ config }) {
  const rotas = Router();

  // Resolve a pasta compartilhada e o caminho informado em ?caminho=, verificando a permissão do usuário.
  function localizar(req) {
    const pastaId = req.params.pasta;
    exigirAcesso(req.usuario.perfil, pastaId);
    const raiz = config.pastas[pastaId];
    return { pastaId, raiz, ...resolverCaminho(raiz, req.query.caminho ?? '') };
  }

  async function diretorioExistente(raiz, absoluto) {
    const info = await verificarExistente(raiz, absoluto);
    if (!info.isDirectory()) {
      throw requisicaoInvalida('O caminho informado não é uma pasta');
    }
  }

  function exigirGerenciamento(req) {
    if (!podeGerenciar(req.usuario.perfil)) {
      throw acessoNegado('Apenas administradores podem criar pastas ou excluir itens');
    }
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, arquivo, cb) => cb(null, req.destinoUpload),
      filename: (req, arquivo, cb) => cb(null, `${PREFIXO_TEMPORARIO}${crypto.randomUUID()}`),
    }),
    limits: { fileSize: config.uploadMaxBytes, files: MAX_ARQUIVOS_POR_ENVIO },
    defParamCharset: 'utf8',
  });

  rotas.get('/', (req, res) => {
    res.json(pastasPermitidas(req.usuario.perfil));
  });

  rotas.get('/:pasta', async (req, res) => {
    const { raiz, absoluto, relativo } = localizar(req);
    await diretorioExistente(raiz, absoluto);

    const entradas = await fs.readdir(absoluto, { withFileTypes: true });
    const itens = [];
    for (const entrada of entradas) {
      if (entrada.name.startsWith(PREFIXO_TEMPORARIO)) {
        continue;
      }
      if (!entrada.isDirectory() && !entrada.isFile()) {
        continue;
      }
      try {
        const info = await fs.stat(path.join(absoluto, entrada.name));
        itens.push({
          nome: entrada.name,
          tipo: entrada.isDirectory() ? 'pasta' : 'arquivo',
          tamanho: entrada.isDirectory() ? null : info.size,
          modificadoEm: info.mtime.toISOString(),
        });
      } catch (err) {
        // O item pode ter sido removido por outra réplica durante a listagem.
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }

    itens.sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome, 'pt-BR') : a.tipo === 'pasta' ? -1 : 1));
    res.json({
      caminho: relativo,
      podeGerenciar: podeGerenciar(req.usuario.perfil),
      itens,
    });
  });

  rotas.get('/:pasta/download', async (req, res) => {
    const { raiz, absoluto, relativo } = localizar(req);
    if (!relativo) {
      throw requisicaoInvalida('Informe o arquivo para download');
    }
    const info = await verificarExistente(raiz, absoluto);
    if (!info.isFile()) {
      throw requisicaoInvalida('Apenas arquivos podem ser baixados');
    }
    res.download(absoluto, path.basename(absoluto), { dotfiles: 'allow' });
  });

  rotas.post(
    '/:pasta/upload',
    async (req, res, next) => {
      const { raiz, absoluto, relativo } = localizar(req);
      await diretorioExistente(raiz, absoluto);
      req.destinoUpload = absoluto;
      req.caminhoUpload = relativo;
      next();
    },
    upload.array('arquivos', MAX_ARQUIVOS_POR_ENVIO),
    async (req, res) => {
      const arquivos = req.files ?? [];
      if (arquivos.length === 0) {
        throw requisicaoInvalida('Selecione ao menos um arquivo no campo "arquivos"');
      }

      const enviados = [];
      try {
        for (const arquivo of arquivos) {
          const nomeOriginal = nomeValido(path.basename(arquivo.originalname.replace(/\\/g, '/')), 'arquivo');
          const { nome, destino } = await reservarNomeLivre(req.destinoUpload, nomeOriginal);
          try {
            await fs.rename(arquivo.path, destino);
          } catch (err) {
            await fs.rm(destino, { force: true });
            throw err;
          }
          enviados.push({ nome, tamanho: arquivo.size });
        }
      } finally {
        await Promise.all(arquivos.map((arquivo) => fs.rm(arquivo.path, { force: true })));
      }

      res.status(201).json({ caminho: req.caminhoUpload, arquivos: enviados });
    },
  );

  rotas.post('/:pasta/pastas', async (req, res) => {
    exigirGerenciamento(req);
    const pastaId = req.params.pasta;
    exigirAcesso(req.usuario.perfil, pastaId);
    const raiz = config.pastas[pastaId];

    const { caminho = '', nome } = req.body ?? {};
    const pai = resolverCaminho(raiz, caminho);
    await diretorioExistente(raiz, pai.absoluto);
    const nomeLimpo = nomeValido(nome);

    try {
      await fs.mkdir(path.join(pai.absoluto, nomeLimpo));
    } catch (err) {
      if (err.code === 'EEXIST') {
        throw conflito('Já existe um item com esse nome');
      }
      throw err;
    }
    res.status(201).json({ caminho: pai.relativo ? `${pai.relativo}/${nomeLimpo}` : nomeLimpo });
  });

  rotas.delete('/:pasta', async (req, res) => {
    exigirGerenciamento(req);
    const { raiz, absoluto, relativo } = localizar(req);
    if (!relativo) {
      throw requisicaoInvalida('A pasta compartilhada raiz não pode ser excluída');
    }
    await verificarExistente(raiz, absoluto);
    await fs.rm(absoluto, { recursive: true });
    res.status(204).end();
  });

  return rotas;
}
