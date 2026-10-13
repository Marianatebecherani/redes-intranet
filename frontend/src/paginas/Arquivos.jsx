import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, enviarArquivos, urlDownload } from '../api.js';
import { Aviso } from '../componentes/Aviso.jsx';
import { formatarBytes, formatarData } from '../formatacao.js';
import { useDados } from '../useDados.js';

function juntar(caminho, nome) {
  return caminho ? `${caminho}/${nome}` : nome;
}

export function Arquivos() {
  const { dados: pastas, erro: erroPastas } = useDados('/arquivos');
  const [parametros, setParametros] = useSearchParams();
  const pastaAtual = parametros.get('pasta') ?? pastas?.[0]?.id;
  const caminhoAtual = parametros.get('caminho') ?? '';

  const { dados: listagem, erro, carregando, recarregar } = useDados(
    pastaAtual ? `/arquivos/${pastaAtual}?caminho=${encodeURIComponent(caminhoAtual)}` : null,
  );

  const [mensagem, setMensagem] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [novaPasta, setNovaPasta] = useState('');
  const seletor = useRef(null);

  function navegar(pasta, caminho = '') {
    setMensagem('');
    setErroAcao('');
    setParametros(caminho ? { pasta, caminho } : { pasta });
  }

  async function enviar(arquivos) {
    if (!arquivos.length) {
      return;
    }
    setEnviando(true);
    setMensagem('');
    setErroAcao('');
    try {
      const resultado = await enviarArquivos(pastaAtual, caminhoAtual, arquivos);
      const nomes = resultado.arquivos.map((a) => a.nome).join(', ');
      setMensagem(`${resultado.arquivos.length} arquivo(s) enviado(s): ${nomes}`);
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    } finally {
      setEnviando(false);
      if (seletor.current) {
        seletor.current.value = '';
      }
    }
  }

  async function criarPasta(evento) {
    evento.preventDefault();
    setMensagem('');
    setErroAcao('');
    try {
      await api(`/arquivos/${pastaAtual}/pastas`, { metodo: 'POST', corpo: { caminho: caminhoAtual, nome: novaPasta } });
      setMensagem(`Pasta "${novaPasta.trim()}" criada.`);
      setNovaPasta('');
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    }
  }

  async function excluir(item) {
    const descricao = item.tipo === 'pasta' ? `a pasta "${item.nome}" e todo o seu conteúdo` : `o arquivo "${item.nome}"`;
    if (!window.confirm(`Excluir ${descricao}?`)) {
      return;
    }
    setMensagem('');
    setErroAcao('');
    try {
      await api(`/arquivos/${pastaAtual}?caminho=${encodeURIComponent(juntar(caminhoAtual, item.nome))}`, { metodo: 'DELETE' });
      setMensagem(`"${item.nome}" excluído.`);
      await recarregar();
    } catch (err) {
      setErroAcao(err.message);
    }
  }

  function soltar(evento) {
    evento.preventDefault();
    setArrastando(false);
    enviar([...evento.dataTransfer.files]);
  }

  const partes = caminhoAtual ? caminhoAtual.split('/') : [];
  const nomePasta = pastas?.find((p) => p.id === pastaAtual)?.nome ?? pastaAtual;

  return (
    <section>
      <h1>Arquivos</h1>
      <Aviso>{erroPastas}</Aviso>

      {pastas && (
        <div className="abas" role="tablist" aria-label="Pastas compartilhadas">
          {pastas.map((pasta) => (
            <button
              key={pasta.id}
              type="button"
              role="tab"
              aria-selected={pasta.id === pastaAtual}
              className={pasta.id === pastaAtual ? 'aba aba-ativa' : 'aba'}
              onClick={() => navegar(pasta.id)}
            >
              /compartilhamento/{pasta.id}
            </button>
          ))}
        </div>
      )}

      {pastaAtual && (
        <>
          <nav aria-label="Caminho atual" className="trilha">
            <button type="button" className="link-botao" onClick={() => navegar(pastaAtual)}>
              {nomePasta}
            </button>
            {partes.map((parte, indice) => (
              <span key={indice}>
                <span aria-hidden="true"> / </span>
                <button type="button" className="link-botao" onClick={() => navegar(pastaAtual, partes.slice(0, indice + 1).join('/'))}>
                  {parte}
                </button>
              </span>
            ))}
          </nav>

          <div
            className={arrastando ? 'area-envio area-envio-ativa' : 'area-envio'}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={soltar}
          >
            <p>{enviando ? 'Enviando…' : 'Arraste arquivos para cá ou'}</p>
            <label className="botao">
              Selecionar arquivos
              <input
                ref={seletor}
                type="file"
                multiple
                className="visualmente-oculto"
                disabled={enviando}
                onChange={(e) => enviar([...e.target.files])}
              />
            </label>
          </div>

          {listagem?.podeGerenciar && (
            <form onSubmit={criarPasta} className="linha-formulario">
              <label>
                <span className="visualmente-oculto">Nome da nova pasta</span>
                <input placeholder="Nome da nova pasta" value={novaPasta} onChange={(e) => setNovaPasta(e.target.value)} required />
              </label>
              <button type="submit" className="botao botao-secundario">
                Criar pasta
              </button>
            </form>
          )}

          <Aviso tipo="sucesso" aoFechar={() => setMensagem('')}>
            {mensagem}
          </Aviso>
          <Aviso aoFechar={() => setErroAcao('')}>{erroAcao}</Aviso>
          <Aviso>{erro}</Aviso>
          {carregando && !listagem && <p className="texto-secundario">Carregando…</p>}

          {listagem && (
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tamanho</th>
                    <th>Modificado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {caminhoAtual && (
                    <tr>
                      <td colSpan={4}>
                        <button type="button" className="link-botao" onClick={() => navegar(pastaAtual, partes.slice(0, -1).join('/'))}>
                          ⬑ Voltar
                        </button>
                      </td>
                    </tr>
                  )}
                  {listagem.itens.length === 0 && (
                    <tr>
                      <td colSpan={4} className="texto-secundario">
                        Pasta vazia.
                      </td>
                    </tr>
                  )}
                  {listagem.itens.map((item) => (
                    <tr key={item.nome}>
                      <td>
                        {item.tipo === 'pasta' ? (
                          <button
                            type="button"
                            className="link-botao"
                            onClick={() => navegar(pastaAtual, juntar(caminhoAtual, item.nome))}
                          >
                            <span aria-hidden="true">📁 </span>
                            {item.nome}
                          </button>
                        ) : (
                          <a href={urlDownload(pastaAtual, juntar(caminhoAtual, item.nome))} download>
                            <span aria-hidden="true">📄 </span>
                            {item.nome}
                          </a>
                        )}
                      </td>
                      <td>{formatarBytes(item.tamanho)}</td>
                      <td>{formatarData(item.modificadoEm)}</td>
                      <td className="acoes-tabela">
                        {item.tipo === 'arquivo' && (
                          <a className="botao botao-secundario botao-pequeno" href={urlDownload(pastaAtual, juntar(caminhoAtual, item.nome))} download>
                            Baixar
                          </a>
                        )}
                        {listagem.podeGerenciar && (
                          <button type="button" className="botao botao-perigo botao-pequeno" onClick={() => excluir(item)}>
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
