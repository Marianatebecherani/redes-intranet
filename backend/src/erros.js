export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export const requisicaoInvalida = (mensagem) => new ErroHttp(400, mensagem);
export const naoAutenticado = (mensagem = 'Faça login para continuar') => new ErroHttp(401, mensagem);
export const acessoNegado = (mensagem = 'Você não tem permissão para esta ação') => new ErroHttp(403, mensagem);
export const naoEncontrado = (mensagem = 'Recurso não encontrado') => new ErroHttp(404, mensagem);
export const conflito = (mensagem) => new ErroHttp(409, mensagem);

export function tratarErros(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ErroHttp) {
    return res.status(err.status).json({ erro: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Corpo da requisição em JSON inválido' });
  }

  if (err.name === 'MulterError') {
    const mensagem = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo maior que o limite permitido'
      : 'Falha no envio dos arquivos';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ erro: mensagem });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
}
