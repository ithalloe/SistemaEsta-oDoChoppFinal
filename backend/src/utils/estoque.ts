import { Prisma } from '@prisma/client';

export class ErroEstoque extends Error {}

interface ContextoMovimentacao {
  usuarioId?: number;
  pedidoId?: number;
  observacao?: string;
}

// Convenção de sinal na tabela MovimentacaoEstoque:
// ENTRADA grava quantidade positiva, SAIDA grava negativa, AJUSTE grava o sinal da diferença.
// Assim, SUM(quantidade) de um produto reproduz exatamente o saldo atual.

// Baixa o estoque só se ainda houver quantidade suficiente. A condição fica no próprio UPDATE,
// então dois pedidos simultâneos não conseguem deixar o estoque negativo.
// Registra uma movimentação SAIDA (quantidade negativa) no histórico.
export async function baixarEstoque(
  tx: Prisma.TransactionClient,
  produtoId: number,
  quantidade: number,
  contexto: ContextoMovimentacao = {}
) {
  const { count } = await tx.produto.updateMany({
    where: { id: produtoId, quantidade: { gte: quantidade } },
    data: { quantidade: { decrement: quantidade } },
  });
  if (count === 0) {
    const produto = await tx.produto.findUnique({ where: { id: produtoId } });
    throw new ErroEstoque(`Estoque insuficiente para "${produto?.nome}". Disponível: ${produto?.quantidade ?? 0}`);
  }
  await tx.movimentacaoEstoque.create({
    data: {
      produtoId,
      tipo: 'SAIDA',
      quantidade: -Math.abs(quantidade),
      usuarioId: contexto.usuarioId ?? null,
      pedidoId: contexto.pedidoId ?? null,
      observacao: contexto.observacao ?? 'Baixa por pedido concluído',
    },
  });
}

// Devolve quantidade ao estoque e registra uma movimentação ENTRADA (quantidade positiva).
export async function devolverEstoque(
  tx: Prisma.TransactionClient,
  produtoId: number,
  quantidade: number,
  contexto: ContextoMovimentacao = {}
) {
  await tx.produto.update({
    where: { id: produtoId },
    data: { quantidade: { increment: quantidade } },
  });
  await tx.movimentacaoEstoque.create({
    data: {
      produtoId,
      tipo: 'ENTRADA',
      quantidade: Math.abs(quantidade),
      usuarioId: contexto.usuarioId ?? null,
      pedidoId: contexto.pedidoId ?? null,
      observacao: contexto.observacao ?? 'Devolução de estoque',
    },
  });
}
