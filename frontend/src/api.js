export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const ouvintes = {
  instancia: () => {},
  sessaoPerdida: () => {},
};

// Permite que a sessão acompanhe a réplica que respondeu e saiba quando o login expirou.
export function configurarApi({ aoMudarInstancia, aoPerderSessao }) {
  ouvintes.instancia = aoMudarInstancia;
  ouvintes.sessaoPerdida = aoPerderSessao;
}

export async function api(caminho, { metodo = 'GET', corpo, formData } = {}) {
  const opcoes = { method: metodo, credentials: 'same-origin', headers: {} };
  if (corpo !== undefined) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  } else if (formData) {
    opcoes.body = formData;
  }

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, opcoes);
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  const instancia = resposta.headers.get('X-Instancia');
  if (instancia) {
    ouvintes.instancia(instancia);
  }

  const ehJson = resposta.headers.get('Content-Type')?.includes('application/json');
  const dados = resposta.status !== 204 && ehJson ? await resposta.json() : null;

  if (!resposta.ok) {
    if (resposta.status === 401 && caminho !== '/auth/login') {
      ouvintes.sessaoPerdida();
    }
    throw new ErroApi(resposta.status, dados?.erro ?? `Erro inesperado (${resposta.status})`);
  }
  return dados;
}

export function urlDownload(pasta, caminho) {
  return `/api/arquivos/${encodeURIComponent(pasta)}/download?caminho=${encodeURIComponent(caminho)}`;
}

export function enviarArquivos(pasta, caminho, arquivos) {
  const formData = new FormData();
  for (const arquivo of arquivos) {
    formData.append('arquivos', arquivo);
  }
  return api(`/arquivos/${encodeURIComponent(pasta)}/upload?caminho=${encodeURIComponent(caminho)}`, {
    metodo: 'POST',
    formData,
  });
}
