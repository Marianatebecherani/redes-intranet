import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function texto(nome, padrao) {
  const valor = process.env[nome];
  return valor === undefined || valor === '' ? padrao : valor;
}

function obrigatorio(nome) {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${nome}`);
  }
  return valor;
}

function inteiro(nome, padrao) {
  const valor = Number.parseInt(texto(nome, String(padrao)), 10);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`Variável de ambiente ${nome} deve ser um inteiro positivo`);
  }
  return valor;
}

function booleano(nome, padrao) {
  return texto(nome, String(padrao)).toLowerCase() === 'true';
}

export function carregarConfig() {
  const jwtSecret = obrigatorio('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres');
  }

  return {
    porta: inteiro('PORT', 3000),
    instancia: texto('INSTANCE_NAME', os.hostname()),
    db: {
      host: texto('DB_HOST', 'localhost'),
      port: inteiro('DB_PORT', 3306),
      user: obrigatorio('DB_USER'),
      password: obrigatorio('DB_PASSWORD'),
      database: obrigatorio('DB_NAME'),
    },
    jwt: {
      segredo: jwtSecret,
      expiracao: texto('JWT_EXPIRES_IN', '8h'),
    },
    cookieSeguro: booleano('COOKIE_SECURE', false),
    pastas: {
      admin: path.resolve(raizBackend, texto('SHARE_ADMIN_DIR', '../compartilhamento/admin')),
      geral: path.resolve(raizBackend, texto('SHARE_GERAL_DIR', '../compartilhamento/geral')),
    },
    uploadMaxBytes: inteiro('UPLOAD_MAX_MB', 100) * 1024 * 1024,
    diretorioEstatico: path.resolve(raizBackend, texto('STATIC_DIR', '../frontend/dist')),
  };
}
