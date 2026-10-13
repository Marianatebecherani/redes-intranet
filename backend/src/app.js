import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import { autenticar, exigirAdmin } from './auth.js';
import { naoEncontrado, tratarErros } from './erros.js';
import { rotasArquivos } from './rotas/arquivos.js';
import { rotasAuth } from './rotas/auth.js';
import { rotasColaboradores } from './rotas/colaboradores.js';
import { rotasComunicados } from './rotas/comunicados.js';
import { rotasUsuarios } from './rotas/usuarios.js';

export function criarApp({ config, pool }) {
  const app = express();
  const exigirLogin = autenticar({ config, pool });

  app.disable('x-powered-by');
  // O nginx da EC2 roda na mesma máquina e encaminha as requisições pelo loopback.
  app.set('trust proxy', 'loopback');

  // Identifica a réplica que respondeu, útil para observar o balanceamento de carga.
  app.use((req, res, next) => {
    res.set('X-Instancia', config.instancia);
    next();
  });

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', instancia: config.instancia, banco: 'ok' });
    } catch {
      res.status(503).json({ status: 'erro', instancia: config.instancia, banco: 'indisponível' });
    }
  });

  app.use('/api/auth', rotasAuth({ config, pool, autenticar: exigirLogin }));
  app.use('/api/comunicados', exigirLogin, rotasComunicados({ pool, exigirAdmin }));
  app.use('/api/colaboradores', exigirLogin, rotasColaboradores({ pool, exigirAdmin }));
  app.use('/api/usuarios', exigirLogin, exigirAdmin, rotasUsuarios({ pool }));
  app.use('/api/arquivos', exigirLogin, rotasArquivos({ config }));

  app.use('/api', () => {
    throw naoEncontrado('Rota da API não encontrada');
  });

  // Entrega o build do frontend, quando existir, com fallback para o index.html da SPA.
  const indexHtml = path.join(config.diretorioEstatico, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(config.diretorioEstatico, { index: false }));
    app.get('/{*rota}', (req, res) => {
      res.sendFile(indexHtml);
    });
  }

  app.use(tratarErros);
  return app;
}
