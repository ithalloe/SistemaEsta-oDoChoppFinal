// Lançado dentro de uma transação quando o pedido foi alterado por outra pessoa
// entre a leitura e a gravação (ex.: dois cliques simultâneos em "Cancelar").
// Ao lançar, a transação é desfeita e o estoque não é movimentado em dobro.
export class ErroConcorrencia extends Error {
  constructor(mensagem = 'O pedido foi alterado por outra pessoa. Atualize a página e tente novamente') {
    super(mensagem);
  }
}
