import { requisicaoInvalida } from './erros.js';

export function textoObrigatorio(valor, campo, { max, min = 1 } = {}) {
  if (typeof valor !== 'string' || valor.trim().length < min) {
    throw requisicaoInvalida(`O campo "${campo}" é obrigatório`);
  }
  const limpo = valor.trim();
  if (max && limpo.length > max) {
    throw requisicaoInvalida(`O campo "${campo}" deve ter no máximo ${max} caracteres`);
  }
  return limpo;
}

export function textoOpcional(valor, campo, { max } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    return null;
  }
  if (typeof valor !== 'string') {
    throw requisicaoInvalida(`O campo "${campo}" deve ser um texto`);
  }
  const limpo = valor.trim();
  if (max && limpo.length > max) {
    throw requisicaoInvalida(`O campo "${campo}" deve ter no máximo ${max} caracteres`);
  }
  return limpo || null;
}

export function idDaRota(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw requisicaoInvalida('Identificador inválido');
  }
  return id;
}

export const PERFIS = ['admin', 'usuario'];

export function perfilValido(valor) {
  if (!PERFIS.includes(valor)) {
    throw requisicaoInvalida('Perfil deve ser "admin" ou "usuario"');
  }
  return valor;
}

export function senhaValida(valor, campo = 'senha') {
  if (typeof valor !== 'string' || valor.length < 6 || valor.length > 72) {
    throw requisicaoInvalida(`O campo "${campo}" deve ter entre 6 e 72 caracteres`);
  }
  return valor;
}

export function usernameValido(valor) {
  const username = textoObrigatorio(valor, 'username', { max: 50 }).toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw requisicaoInvalida('O username deve conter apenas letras minúsculas, números, ponto, hífen ou sublinhado');
  }
  return username;
}
