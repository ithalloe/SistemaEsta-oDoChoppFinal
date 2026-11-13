import api from './api';

// Baixa um arquivo de uma rota que exige login.
// Usa o axios (e não um link comum) para o token ir junto na requisição.
export async function baixarArquivo(url: string, params?: Record<string, any>, nomePadrao = 'arquivo') {
  const resposta = await api.get(url, { params, responseType: 'blob' });

  // Tenta extrair o nome do arquivo do cabeçalho Content-Disposition
  let nomeArquivo = nomePadrao;
  const disposicao = resposta.headers['content-disposition'];
  if (disposicao) {
    const match = /filename="?([^"]+)"?/.exec(disposicao);
    if (match?.[1]) nomeArquivo = match[1];
  }

  const tipo = (resposta.headers['content-type'] as string) || 'application/octet-stream';
  const blob = new Blob([resposta.data], { type: tipo });
  const urlObjeto = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = urlObjeto;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(urlObjeto);
}
