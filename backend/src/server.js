import fs from 'node:fs/promises';
import { criarApp } from './app.js';
import { carregarConfig } from './config.js';
import { criarPool } from './db.js';

const config = carregarConfig();

for (const [pasta, caminho] of Object.entries(config.pastas)) {
  await fs.mkdir(caminho, { recursive: true });
  console.log(`Pasta compartilhada "${pasta}": ${caminho}`);
}

const pool = criarPool(config.db);
const app = criarApp({ config, pool });

const servidor = app.listen(config.porta, () => {
  console.log(`Instância ${config.instancia} ouvindo na porta ${config.porta}`);
});

function encerrar(sinal) {
  console.log(`Recebido ${sinal}, encerrando...`);
  servidor.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => encerrar('SIGTERM'));
process.on('SIGINT', () => encerrar('SIGINT'));
