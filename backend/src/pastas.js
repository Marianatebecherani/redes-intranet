import fs from 'node:fs/promises';
import path from 'node:path';
import { acessoNegado, naoEncontrado, requisicaoInvalida } from './erros.js';

export const PASTAS = {
  admin: { nome: 'Administração', perfis: ['admin'] },
  geral: { nome: 'Geral', perfis: ['admin', 'usuario'] },
};

// Prefixo dos arquivos temporários de upload, ocultos na listagem.
export const PREFIXO_TEMPORARIO = '.upload-';

export function pastasPermitidas(perfil) {
  return Object.entries(PASTAS)
    .filter(([, pasta]) => pasta.perfis.includes(perfil))
    .map(([id, pasta]) => ({ id, nome: pasta.nome }));
}

export function podeAcessar(perfil, pastaId) {
  return Boolean(PASTAS[pastaId]?.perfis.includes(perfil));
}

// Criar pastas e excluir itens é permitido apenas para administradores.
export function podeGerenciar(perfil) {
  return perfil === 'admin';
}

export function exigirAcesso(perfil, pastaId) {
  if (!PASTAS[pastaId]) {
    throw naoEncontrado('Pasta compartilhada não encontrada');
  }
  if (!podeAcessar(perfil, pastaId)) {
    throw acessoNegado('Você não tem acesso a esta pasta');
  }
}

export function nomeValido(nome, campo = 'nome') {
  if (typeof nome !== 'string') {
    throw requisicaoInvalida(`O campo "${campo}" é obrigatório`);
  }
  const limpo = nome.trim();
  if (
    !limpo
    || limpo === '.'
    || limpo === '..'
    || /[\\/\x00-\x1f]/.test(limpo)
    || Buffer.byteLength(limpo) > 255
  ) {
    throw requisicaoInvalida(`Nome inválido: "${nome}"`);
  }
  return limpo;
}

/**
 * Converte um caminho relativo enviado pelo cliente em um caminho absoluto
 * dentro da raiz da pasta compartilhada. Rejeita "..", "." e qualquer
 * resultado fora da raiz.
 */
export function resolverCaminho(raiz, relativo = '') {
  if (typeof relativo !== 'string' || relativo.includes('\0')) {
    throw requisicaoInvalida('Caminho inválido');
  }
  const partes = relativo.split(/[\\/]+/).filter(Boolean);
  if (partes.some((parte) => parte === '.' || parte === '..')) {
    throw requisicaoInvalida('Caminho inválido');
  }

  const absoluto = path.resolve(raiz, ...partes);
  if (!estaDentro(raiz, absoluto)) {
    throw requisicaoInvalida('Caminho inválido');
  }
  return { absoluto, relativo: partes.join('/') };
}

function estaDentro(raiz, absoluto) {
  return absoluto === raiz || absoluto.startsWith(raiz + path.sep);
}

/**
 * Confirma que um caminho existente continua dentro da raiz depois de
 * resolver links simbólicos, e retorna suas informações.
 */
export async function verificarExistente(raiz, absoluto) {
  let real;
  let raizReal;
  try {
    [real, raizReal] = await Promise.all([fs.realpath(absoluto), fs.realpath(raiz)]);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      throw naoEncontrado('Arquivo ou pasta não encontrado');
    }
    throw err;
  }
  if (!estaDentro(raizReal, real)) {
    throw requisicaoInvalida('Caminho inválido');
  }
  return fs.stat(real);
}

/**
 * Reserva um nome livre na pasta de destino, acrescentando " (1)", " (2)"...
 * quando o nome já existir. A criação exclusiva evita que duas réplicas
 * usem o mesmo nome ao mesmo tempo.
 */
export async function reservarNomeLivre(diretorio, nomeOriginal) {
  const extensao = path.extname(nomeOriginal);
  const base = extensao ? nomeOriginal.slice(0, -extensao.length) : nomeOriginal;

  for (let tentativa = 0; tentativa < 1000; tentativa += 1) {
    const nome = tentativa === 0 ? nomeOriginal : `${base} (${tentativa})${extensao}`;
    const destino = path.join(diretorio, nome);
    try {
      const arquivo = await fs.open(destino, 'wx');
      await arquivo.close();
      return { nome, destino };
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
  }
  throw requisicaoInvalida(`Não foi possível encontrar um nome livre para "${nomeOriginal}"`);
}
