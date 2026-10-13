import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  nomeValido,
  pastasPermitidas,
  podeAcessar,
  podeGerenciar,
  reservarNomeLivre,
  resolverCaminho,
  verificarExistente,
} from '../src/pastas.js';

describe('permissões das pastas', () => {
  it('admin acessa as duas pastas e usuario apenas a geral', () => {
    assert.deepEqual(pastasPermitidas('admin').map((p) => p.id), ['admin', 'geral']);
    assert.deepEqual(pastasPermitidas('usuario').map((p) => p.id), ['geral']);
    assert.equal(podeAcessar('usuario', 'admin'), false);
    assert.equal(podeAcessar('usuario', 'geral'), true);
    assert.equal(podeAcessar('admin', 'inexistente'), false);
  });

  it('apenas admin gerencia pastas e exclusões', () => {
    assert.equal(podeGerenciar('admin'), true);
    assert.equal(podeGerenciar('usuario'), false);
  });
});

describe('resolverCaminho', () => {
  const raiz = path.resolve(os.tmpdir(), 'raiz-teste');

  it('resolve caminhos dentro da raiz', () => {
    assert.equal(resolverCaminho(raiz, '').absoluto, raiz);
    assert.deepEqual(resolverCaminho(raiz, 'a/b/arquivo.txt'), {
      absoluto: path.join(raiz, 'a', 'b', 'arquivo.txt'),
      relativo: 'a/b/arquivo.txt',
    });
    assert.equal(resolverCaminho(raiz, '/a//b/').relativo, 'a/b');
  });

  for (const invalido of ['..', '../fora', 'a/../../fora', 'a/./b', 'a\\..\\..\\fora', 'a\0b']) {
    it(`rejeita "${invalido.replace('\0', '\\0')}"`, () => {
      assert.throws(() => resolverCaminho(raiz, invalido), { status: 400 });
    });
  }

  it('rejeita valores que não são texto', () => {
    assert.throws(() => resolverCaminho(raiz, ['a']), { status: 400 });
  });
});

describe('nomeValido', () => {
  it('aceita nomes comuns e remove espaços nas pontas', () => {
    assert.equal(nomeValido('  Relatório 2026.pdf '), 'Relatório 2026.pdf');
  });

  for (const invalido of ['', '   ', '.', '..', 'a/b', 'a\\b', 'a\nb', 'x'.repeat(256)]) {
    it(`rejeita ${JSON.stringify(invalido.slice(0, 20))}`, () => {
      assert.throws(() => nomeValido(invalido), { status: 400 });
    });
  }
});

describe('operações em disco', () => {
  let raiz;
  let fora;

  before(async () => {
    raiz = await fs.mkdtemp(path.join(os.tmpdir(), 'intranet-raiz-'));
    fora = await fs.mkdtemp(path.join(os.tmpdir(), 'intranet-fora-'));
    await fs.writeFile(path.join(fora, 'segredo.txt'), 'segredo');
  });

  after(async () => {
    await fs.rm(raiz, { recursive: true, force: true });
    await fs.rm(fora, { recursive: true, force: true });
  });

  it('reserva nomes livres sem sobrescrever arquivos', async () => {
    await fs.writeFile(path.join(raiz, 'foto.png'), 'original');
    const primeiro = await reservarNomeLivre(raiz, 'foto.png');
    const segundo = await reservarNomeLivre(raiz, 'foto.png');
    const semExtensao = await reservarNomeLivre(raiz, 'LEIAME');
    assert.equal(primeiro.nome, 'foto (1).png');
    assert.equal(segundo.nome, 'foto (2).png');
    assert.equal(semExtensao.nome, 'LEIAME');
    assert.equal(await fs.readFile(path.join(raiz, 'foto.png'), 'utf8'), 'original');
  });

  it('retorna 404 para caminhos inexistentes', async () => {
    await assert.rejects(verificarExistente(raiz, path.join(raiz, 'nao-existe')), { status: 404 });
  });

  it('bloqueia links simbólicos que apontam para fora da raiz', async (t) => {
    const link = path.join(raiz, 'atalho');
    try {
      await fs.symlink(fora, link, 'junction');
    } catch (err) {
      if (err.code === 'EPERM') {
        t.skip('sistema sem permissão para criar links simbólicos');
        return;
      }
      throw err;
    }
    await assert.rejects(verificarExistente(raiz, path.join(link, 'segredo.txt')), { status: 400 });
  });
});
