// Testes de integração da API. Exigem um MySQL inicializado com os scripts de
// database/init e são ignorados quando TEST_DB_HOST não está definido.
// Os registros criados pelos testes são removidos ao final.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { criarPool } from '../src/db.js';

const habilitado = Boolean(process.env.TEST_DB_HOST);
const SENHA_PADRAO = 'capivara';

describe('API da intranet', { skip: !habilitado && 'defina TEST_DB_HOST para executar' }, () => {
  let pool;
  let app;
  let raizTemporaria;
  let config;

  before(async () => {
    raizTemporaria = await fs.mkdtemp(path.join(os.tmpdir(), 'intranet-api-'));
    config = {
      instancia: 'teste',
      db: {
        host: process.env.TEST_DB_HOST,
        port: Number(process.env.TEST_DB_PORT ?? 3306),
        user: process.env.TEST_DB_USER ?? 'intranet',
        password: process.env.TEST_DB_PASSWORD,
        database: process.env.TEST_DB_NAME ?? 'intranet',
      },
      jwt: { segredo: 'segredo-de-teste-com-pelo-menos-32-caracteres', expiracao: '1h' },
      cookieSeguro: false,
      pastas: {
        admin: path.join(raizTemporaria, 'admin'),
        geral: path.join(raizTemporaria, 'geral'),
      },
      uploadMaxBytes: 1024 * 1024,
      diretorioEstatico: path.join(raizTemporaria, 'sem-frontend'),
    };
    await fs.mkdir(config.pastas.admin);
    await fs.mkdir(config.pastas.geral);
    await fs.writeFile(path.join(config.pastas.admin, 'confidencial.txt'), 'apenas admins');
    pool = criarPool(config.db);
    app = criarApp({ config, pool });
  });

  after(async () => {
    await pool.query("DELETE FROM usuarios WHERE username LIKE 'teste-%'");
    await pool.query("DELETE FROM comunicados WHERE titulo LIKE 'Teste %'");
    await pool.query("DELETE FROM colaboradores WHERE nome LIKE 'Teste %'");
    await pool.end();
    await fs.rm(raizTemporaria, { recursive: true, force: true });
  });

  async function entrar(username, senha = SENHA_PADRAO) {
    const agente = request.agent(app);
    await agente.post('/api/auth/login').send({ username, senha }).expect(200);
    return agente;
  }

  describe('saúde e cabeçalhos', () => {
    it('informa a instância e o estado do banco', async () => {
      const res = await request(app).get('/api/health').expect(200);
      assert.deepEqual(res.body, { status: 'ok', instancia: 'teste', banco: 'ok' });
      assert.equal(res.headers['x-instancia'], 'teste');
    });

    it('retorna 404 em JSON para rotas desconhecidas da API', async () => {
      const res = await request(app).get('/api/nao-existe').expect(404);
      assert.ok(res.body.erro);
    });
  });

  describe('autenticação', () => {
    it('faz login com a senha padrão e define cookie httpOnly', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'Mariana', senha: SENHA_PADRAO })
        .expect(200);
      assert.equal(res.body.usuario.username, 'mariana');
      assert.equal(res.body.usuario.perfil, 'admin');
      assert.equal(res.body.usuario.senha_hash, undefined);
      const cookie = res.headers['set-cookie'][0];
      assert.match(cookie, /^intranet_token=/);
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /SameSite=Lax/);
    });

    it('rejeita senha errada e usuário inexistente com a mesma mensagem', async () => {
      const errada = await request(app).post('/api/auth/login').send({ username: 'fulano', senha: 'errada' }).expect(401);
      const inexistente = await request(app).post('/api/auth/login').send({ username: 'ninguem', senha: 'x' }).expect(401);
      assert.equal(errada.body.erro, inexistente.body.erro);
    });

    it('valida o corpo do login', async () => {
      await request(app).post('/api/auth/login').send({}).expect(400);
      await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{inválido').expect(400);
    });

    it('exige login nas rotas protegidas e rejeita token adulterado', async () => {
      await request(app).get('/api/comunicados').expect(401);
      await request(app).get('/api/comunicados').set('Cookie', 'intranet_token=abc.def.ghi').expect(401);
    });

    it('retorna o usuário logado e encerra a sessão no logout', async () => {
      const agente = await entrar('fulano');
      const me = await agente.get('/api/auth/me').expect(200);
      assert.equal(me.body.usuario.perfil, 'usuario');
      await agente.post('/api/auth/logout').expect(204);
      await agente.get('/api/auth/me').expect(401);
    });

    it('permite trocar a própria senha', async () => {
      const admin = await entrar('mariana');
      await admin.post('/api/usuarios').send({ username: 'teste-senha', nome: 'Teste Senha', senha: 'inicial1' }).expect(201);

      const usuario = await entrar('teste-senha', 'inicial1');
      await usuario.put('/api/auth/senha').send({ senhaAtual: 'errada', novaSenha: 'nova-senha' }).expect(400);
      await usuario.put('/api/auth/senha').send({ senhaAtual: 'inicial1', novaSenha: '123' }).expect(400);
      await usuario.put('/api/auth/senha').send({ senhaAtual: 'inicial1', novaSenha: 'nova-senha' }).expect(204);
      await request(app).post('/api/auth/login').send({ username: 'teste-senha', senha: 'inicial1' }).expect(401);
      await entrar('teste-senha', 'nova-senha');
    });
  });

  describe('usuários', () => {
    it('é restrito a administradores', async () => {
      const comum = await entrar('sicrano');
      await comum.get('/api/usuarios').expect(403);
      await comum.post('/api/usuarios').send({ username: 'teste-x', nome: 'X', senha: 'senha123' }).expect(403);
    });

    it('lista os usuários iniciais sem expor hashes', async () => {
      const admin = await entrar('jean');
      const res = await admin.get('/api/usuarios').expect(200);
      const porUsername = Object.fromEntries(res.body.map((u) => [u.username, u]));
      for (const nome of ['mariana', 'jean']) assert.equal(porUsername[nome].perfil, 'admin');
      for (const nome of ['fulano', 'sicrano', 'beltrano']) assert.equal(porUsername[nome].perfil, 'usuario');
      assert.ok(res.body.every((u) => u.senha_hash === undefined && typeof u.ativo === 'boolean'));
    });

    it('cria, altera, desativa e exclui usuários', async () => {
      const admin = await entrar('mariana');
      const criado = await admin
        .post('/api/usuarios')
        .send({ username: 'teste-crud', nome: 'Teste Crud', senha: 'senha123', perfil: 'usuario' })
        .expect(201);
      await admin.post('/api/usuarios').send({ username: 'teste-crud', nome: 'Outro', senha: 'senha123' }).expect(409);
      await admin.post('/api/usuarios').send({ username: 'Teste Inválido', nome: 'X', senha: 'senha123' }).expect(400);

      const id = criado.body.id;
      const usuario = await entrar('teste-crud', 'senha123');
      await admin.put(`/api/usuarios/${id}`).send({ nome: 'Teste Alterado', ativo: false }).expect(200);
      await usuario.get('/api/auth/me').expect(401);
      await request(app).post('/api/auth/login').send({ username: 'teste-crud', senha: 'senha123' }).expect(401);

      await admin.delete(`/api/usuarios/${id}`).expect(204);
      await admin.put(`/api/usuarios/${id}`).send({ nome: 'X' }).expect(404);
    });

    it('impede que o administrador remova o próprio acesso', async () => {
      const admin = await entrar('mariana');
      const me = await admin.get('/api/auth/me');
      await admin.put(`/api/usuarios/${me.body.usuario.id}`).send({ perfil: 'usuario' }).expect(400);
      await admin.put(`/api/usuarios/${me.body.usuario.id}`).send({ ativo: false }).expect(400);
      await admin.delete(`/api/usuarios/${me.body.usuario.id}`).expect(400);
    });
  });

  describe('comunicados', () => {
    it('todos leem; apenas administradores escrevem', async () => {
      const comum = await entrar('beltrano');
      const lista = await comum.get('/api/comunicados').expect(200);
      assert.ok(lista.body.some((c) => c.titulo === 'Bem-vindos à intranet'));
      await comum.post('/api/comunicados').send({ titulo: 'Teste', conteudo: 'x' }).expect(403);

      const admin = await entrar('jean');
      const criado = await admin.post('/api/comunicados').send({ titulo: 'Teste comunicado', conteudo: 'Olá' }).expect(201);
      assert.equal(criado.body.autorNome, 'Jean');
      await admin.post('/api/comunicados').send({ titulo: '', conteudo: 'x' }).expect(400);
      const alterado = await admin
        .put(`/api/comunicados/${criado.body.id}`)
        .send({ titulo: 'Teste alterado', conteudo: 'Novo' })
        .expect(200);
      assert.equal(alterado.body.titulo, 'Teste alterado');
      await comum.delete(`/api/comunicados/${criado.body.id}`).expect(403);
      await admin.delete(`/api/comunicados/${criado.body.id}`).expect(204);
      await admin.delete(`/api/comunicados/${criado.body.id}`).expect(404);
    });
  });

  describe('colaboradores', () => {
    it('lista, busca e permite gestão apenas por administradores', async () => {
      const comum = await entrar('fulano');
      const todos = await comum.get('/api/colaboradores').expect(200);
      assert.equal(todos.body.filter((c) => !c.nome.startsWith('Teste')).length, 5);
      const busca = await comum.get('/api/colaboradores').query({ q: 'Financeiro' }).expect(200);
      assert.deepEqual(busca.body.map((c) => c.username), ['fulano']);
      await comum.post('/api/colaboradores').send({ nome: 'Teste', setor: 'X' }).expect(403);

      const admin = await entrar('mariana');
      await admin.post('/api/colaboradores').send({ nome: 'Teste Sem Setor' }).expect(400);
      await admin.post('/api/colaboradores').send({ nome: 'Teste', setor: 'X', email: 'invalido' }).expect(400);
      const fulanoId = busca.body[0].usuarioId;
      await admin.post('/api/colaboradores').send({ nome: 'Teste Duplicado', setor: 'X', usuarioId: fulanoId }).expect(409);
      const criado = await admin
        .post('/api/colaboradores')
        .send({ nome: 'Teste Colaborador', setor: 'Suporte', ramal: '9999', email: 'teste@intranet.local' })
        .expect(201);
      await admin.put(`/api/colaboradores/${criado.body.id}`).send({ nome: 'Teste Editado', setor: 'Suporte' }).expect(200);
      await admin.delete(`/api/colaboradores/${criado.body.id}`).expect(204);
    });
  });

  describe('arquivos', () => {
    it('lista apenas as pastas permitidas para cada perfil', async () => {
      const admin = await entrar('mariana');
      const comum = await entrar('fulano');
      assert.deepEqual((await admin.get('/api/arquivos').expect(200)).body.map((p) => p.id), ['admin', 'geral']);
      assert.deepEqual((await comum.get('/api/arquivos').expect(200)).body.map((p) => p.id), ['geral']);
    });

    it('bloqueia a pasta admin para usuários comuns', async () => {
      const comum = await entrar('sicrano');
      await comum.get('/api/arquivos/admin').expect(403);
      await comum.get('/api/arquivos/admin/download').query({ caminho: 'confidencial.txt' }).expect(403);
      await comum.post('/api/arquivos/admin/upload').attach('arquivos', Buffer.from('x'), 'x.txt').expect(403);
      await comum.get('/api/arquivos/outra').expect(404);
    });

    it('usuário comum faz upload e download na pasta geral', async () => {
      const comum = await entrar('beltrano');
      const envio = await comum
        .post('/api/arquivos/geral/upload')
        .attach('arquivos', Buffer.from('conteúdo 1'), 'Relatório ção.txt')
        .attach('arquivos', Buffer.from('conteúdo 2'), 'Relatório ção.txt')
        .expect(201);
      assert.deepEqual(envio.body.arquivos.map((a) => a.nome), ['Relatório ção.txt', 'Relatório ção (1).txt']);

      const lista = await comum.get('/api/arquivos/geral').expect(200);
      assert.equal(lista.body.podeGerenciar, false);
      assert.deepEqual(lista.body.itens.map((i) => i.nome), ['Relatório ção (1).txt', 'Relatório ção.txt']);
      assert.ok(!(await fs.readdir(config.pastas.geral)).some((n) => n.startsWith('.upload-')));

      const download = await comum
        .get('/api/arquivos/geral/download')
        .query({ caminho: 'Relatório ção.txt' })
        .buffer(true)
        .parse((res, cb) => {
          const partes = [];
          res.on('data', (p) => partes.push(p));
          res.on('end', () => cb(null, Buffer.concat(partes)));
        })
        .expect(200);
      assert.equal(download.body.toString(), 'conteúdo 1');
      assert.match(download.headers['content-disposition'], /attachment/);
    });

    it('usuário comum não cria pastas nem exclui', async () => {
      const comum = await entrar('fulano');
      await comum.post('/api/arquivos/geral/pastas').send({ nome: 'nova' }).expect(403);
      await comum.delete('/api/arquivos/geral').query({ caminho: 'Relatório ção.txt' }).expect(403);
    });

    it('administrador cria pastas, envia para subpastas e exclui', async () => {
      const admin = await entrar('jean');
      await admin.post('/api/arquivos/admin/pastas').send({ nome: 'Contratos' }).expect(201);
      await admin.post('/api/arquivos/admin/pastas').send({ nome: 'Contratos' }).expect(409);
      await admin.post('/api/arquivos/admin/pastas').send({ nome: '../fora' }).expect(400);
      await admin
        .post('/api/arquivos/admin/upload')
        .query({ caminho: 'Contratos' })
        .attach('arquivos', Buffer.from('pdf'), 'contrato.pdf')
        .expect(201);

      const raiz = await admin.get('/api/arquivos/admin').expect(200);
      assert.deepEqual(raiz.body.itens.map((i) => [i.nome, i.tipo]), [['Contratos', 'pasta'], ['confidencial.txt', 'arquivo']]);
      const sub = await admin.get('/api/arquivos/admin').query({ caminho: 'Contratos' }).expect(200);
      assert.equal(sub.body.caminho, 'Contratos');
      assert.deepEqual(sub.body.itens.map((i) => i.nome), ['contrato.pdf']);

      await admin.delete('/api/arquivos/admin').query({ caminho: '' }).expect(400);
      await admin.delete('/api/arquivos/admin').query({ caminho: 'Contratos' }).expect(204);
      await admin.get('/api/arquivos/admin').query({ caminho: 'Contratos' }).expect(404);
    });

    it('rejeita tentativas de sair da pasta compartilhada', async () => {
      const admin = await entrar('mariana');
      for (const caminho of ['..', '../admin/confidencial.txt', 'a/../../x']) {
        await admin.get('/api/arquivos/geral/download').query({ caminho }).expect(400);
        await admin.get('/api/arquivos/geral').query({ caminho }).expect(400);
      }
      const comum = await entrar('fulano');
      await comum.get('/api/arquivos/geral/download').query({ caminho: '../admin/confidencial.txt' }).expect(400);
      await comum
        .post('/api/arquivos/geral/upload')
        .attach('arquivos', Buffer.from('x'), '../../fora.txt')
        .expect(201)
        .then((res) => assert.equal(res.body.arquivos[0].nome, 'fora.txt'));
      await fs.access(path.join(config.pastas.geral, 'fora.txt'));
    });

    it('recusa arquivos acima do limite e upload sem arquivos', async () => {
      const comum = await entrar('fulano');
      await comum
        .post('/api/arquivos/geral/upload')
        .attach('arquivos', Buffer.alloc(config.uploadMaxBytes + 1), 'grande.bin')
        .expect(413);
      await comum.post('/api/arquivos/geral/upload').expect(400);
      const nomes = await fs.readdir(config.pastas.geral);
      assert.ok(!nomes.includes('grande.bin'));
      assert.ok(!nomes.some((n) => n.startsWith('.upload-')));
    });
  });
});
