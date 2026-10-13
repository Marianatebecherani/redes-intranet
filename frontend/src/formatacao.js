const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function formatarData(valor) {
  return valor ? formatoData.format(new Date(valor)) : '';
}

export function formatarBytes(bytes) {
  if (bytes === null || bytes === undefined) {
    return '';
  }
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let valor = bytes;
  let indice = 0;
  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: indice === 0 ? 0 : 1 })} ${unidades[indice]}`;
}
