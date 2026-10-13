import { useEffect, useRef, useState } from 'react';
import { enviarArquivos } from '../api.js';
import { Aviso } from '../componentes/Aviso.jsx';
import { useDados } from '../useDados.js';

const TAMANHOS = [256, 512, 1024];

/**
 * Desenha a imagem recortada em círculo no canvas. A área fora do círculo
 * fica transparente. O recorte é um quadrado da imagem original, cujo lado
 * diminui com o zoom e cuja posição é ajustada pelos deslocamentos (-1 a 1).
 */
function desenharRedonda(canvas, imagem, { tamanho, zoom, deslocX, deslocY }) {
  const ladoOrigem = Math.min(imagem.naturalWidth, imagem.naturalHeight) / zoom;
  const folgaX = (imagem.naturalWidth - ladoOrigem) / 2;
  const folgaY = (imagem.naturalHeight - ladoOrigem) / 2;
  const origemX = folgaX + deslocX * folgaX;
  const origemY = folgaY + deslocY * folgaY;

  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, tamanho, tamanho);
  ctx.save();
  ctx.beginPath();
  ctx.arc(tamanho / 2, tamanho / 2, tamanho / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imagem, origemX, origemY, ladoOrigem, ladoOrigem, 0, 0, tamanho, tamanho);
  ctx.restore();
}

function gerarPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar o PNG.'))), 'image/png');
  });
}

export function ImagemRedonda() {
  const { dados: pastas } = useDados('/arquivos');
  const canvas = useRef(null);
  const [imagem, setImagem] = useState(null);
  const [nomeBase, setNomeBase] = useState('imagem');
  const [ajustes, setAjustes] = useState({ tamanho: 512, zoom: 1, deslocX: 0, deslocY: 0 });
  const [pastaDestino, setPastaDestino] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (imagem && canvas.current) {
      desenharRedonda(canvas.current, imagem, ajustes);
    }
  }, [imagem, ajustes]);

  useEffect(() => {
    if (!pastaDestino && pastas?.length) {
      setPastaDestino(pastas[0].id);
    }
  }, [pastas, pastaDestino]);

  function carregarArquivo(evento) {
    const arquivo = evento.target.files[0];
    setErro('');
    setMensagem('');
    if (!arquivo) {
      return;
    }
    if (arquivo.type !== 'image/png') {
      setErro('Selecione um arquivo PNG.');
      evento.target.value = '';
      return;
    }

    const url = URL.createObjectURL(arquivo);
    const novaImagem = new Image();
    novaImagem.onload = () => {
      URL.revokeObjectURL(url);
      const ladoOriginal = Math.min(novaImagem.naturalWidth, novaImagem.naturalHeight);
      setNomeBase(arquivo.name.replace(/\.png$/i, ''));
      setAjustes({ tamanho: Math.min(512, ladoOriginal), zoom: 1, deslocX: 0, deslocY: 0 });
      setImagem(novaImagem);
    };
    novaImagem.onerror = () => {
      URL.revokeObjectURL(url);
      setErro('Não foi possível abrir a imagem.');
    };
    novaImagem.src = url;
  }

  const nomeFinal = `${nomeBase}-redonda.png`;

  async function baixar() {
    setErro('');
    try {
      const blob = await gerarPng(canvas.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeFinal;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function salvarNaPasta() {
    setErro('');
    setMensagem('');
    setSalvando(true);
    try {
      const blob = await gerarPng(canvas.current);
      const resultado = await enviarArquivos(pastaDestino, '', [new File([blob], nomeFinal, { type: 'image/png' })]);
      setMensagem(`Imagem salva em /compartilhamento/${pastaDestino} como "${resultado.arquivos[0].nome}".`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const ajustar = (campo) => (e) => setAjustes({ ...ajustes, [campo]: Number(e.target.value) });
  const ladoOriginal = imagem ? Math.min(imagem.naturalWidth, imagem.naturalHeight) : 0;
  const opcoesTamanho = [...new Set([...TAMANHOS.filter((t) => t < ladoOriginal), ladoOriginal])].sort((a, b) => a - b);

  return (
    <section>
      <h1>Imagem redonda</h1>
      <p className="texto-secundario">
        Escolha uma imagem PNG para recortá-la em formato redondo, com fundo transparente. O processamento é feito no seu navegador.
      </p>

      <label className="botao">
        Escolher imagem PNG
        <input type="file" accept="image/png" className="visualmente-oculto" onChange={carregarArquivo} />
      </label>

      <Aviso aoFechar={() => setErro('')}>{erro}</Aviso>
      <Aviso tipo="sucesso" aoFechar={() => setMensagem('')}>
        {mensagem}
      </Aviso>

      {imagem && (
        <div className="editor-imagem">
          <div className="previa-imagem">
            <canvas ref={canvas} aria-label="Prévia da imagem redonda" data-testid="canvas-redondo" />
          </div>

          <div className="formulario cartao">
            <label>
              Zoom ({ajustes.zoom.toFixed(1)}×)
              <input type="range" min="1" max="4" step="0.1" value={ajustes.zoom} onChange={ajustar('zoom')} />
            </label>
            <label>
              Posição horizontal
              <input type="range" min="-1" max="1" step="0.01" value={ajustes.deslocX} onChange={ajustar('deslocX')} />
            </label>
            <label>
              Posição vertical
              <input type="range" min="-1" max="1" step="0.01" value={ajustes.deslocY} onChange={ajustar('deslocY')} />
            </label>
            <label>
              Tamanho do resultado
              <select value={ajustes.tamanho} onChange={ajustar('tamanho')}>
                {opcoesTamanho.map((t) => (
                  <option key={t} value={t}>
                    {t} × {t} px{t === ladoOriginal ? ' (original)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="acoes">
              <button type="button" className="botao" onClick={baixar}>
                Baixar PNG
              </button>
            </div>

            {pastas?.length > 0 && (
              <div className="linha-formulario">
                <label>
                  Salvar em
                  <select value={pastaDestino} onChange={(e) => setPastaDestino(e.target.value)}>
                    {pastas.map((p) => (
                      <option key={p.id} value={p.id}>
                        /compartilhamento/{p.id}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="botao botao-secundario" onClick={salvarNaPasta} disabled={salvando}>
                  {salvando ? 'Salvando…' : 'Salvar na pasta'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
