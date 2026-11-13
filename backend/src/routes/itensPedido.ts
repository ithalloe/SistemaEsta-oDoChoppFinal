import { Router, Response } from 'express';
import { Pedido, Prisma } from '@prisma/client';
import prisma from '../prisma';
import { middlewareAutenticacao, RequisicaoAutenticada } from '../middleware/auth';
import { baixarEstoque, devolverEstoque, ErroEstoque } from '../utils/estoque';
import { ErroConcorrencia } from '../utils/erros';

const roteador = Router();

roteador.use(middlewareAutenticacao);

// Busca um pedido que ainda pode ter os itens alterados (não excluído e não cancelado).
async function buscarPedidoEditavel(
  pedidoId: number
): Promise<{ codigo: number; erro: string } | { pedido: Pedido }> {
  const pedido = await prisma.pedido.findFirst({ where: { id: pedidoId, excluidoEm: null } });
  if (!pedido) return { codigo: 404, erro: 'Pedido não encontrado' };
  if (pedido.status === 'CANCELADO') return { codigo: 400, erro: 'Pedido cancelado não pode ser alterado' };
  return { pedido };
}

// Atualiza o valor total do pedido, mas só se o status ainda for o que foi lido antes da transação.
// Se o pedido foi concluído ou cancelado por outra pessoa nesse meio-tempo, desfaz tudo,
// para o estoque não ser baixado/devolvido com base em um status desatualizado.
async function atualizarValorTotal(tx: Prisma.TransactionClient, pedido: Pedido, data: Prisma.PedidoUpdateManyMutationInput) {
  const { count } = await tx.pedido.updateMany({ where: { id: pedido.id, status: pedido.status }, data });
  if (count === 0) throw new ErroConcorrencia();
}

// Listar itens de um pedido
roteador.get('/:pedidoId/itens', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const pedido = await prisma.pedido.findFirst({ where: { id: Number(req.params.pedidoId), excluidoEm: null } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });

    const itens = await prisma.itemPedido.findMany({
      where: { pedidoId: Number(req.params.pedidoId) },
      include: { produto: true },
      orderBy: { id: 'asc' },
    });
    return res.json(itens);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar itens do pedido' });
  }
});

// Buscar item específico
roteador.get('/:pedidoId/itens/:itemId', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const item = await prisma.itemPedido.findFirst({
      where: { id: Number(req.params.itemId), pedidoId: Number(req.params.pedidoId), pedido: { excluidoEm: null } },
      include: { produto: true },
    });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });
    return res.json(item);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar item' });
  }
});

// Adicionar item ao pedido
roteador.post('/:pedidoId/itens', async (req: RequisicaoAutenticada, res: Response) => {
  const produtoId = Number(req.body.produtoId);
  const quantidade = Number(req.body.quantidade);
  const pedidoId = Number(req.params.pedidoId);

  if (!Number.isInteger(produtoId) || !Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ error: 'Produto e quantidade inteira positiva são obrigatórios' });
  }

  try {
    const busca = await buscarPedidoEditavel(pedidoId);
    if ('erro' in busca) return res.status(busca.codigo).json({ error: busca.erro });
    const { pedido } = busca;

    const produto = await prisma.produto.findFirst({ where: { id: produtoId, excluidoEm: null } });
    if (!produto) return res.status(400).json({ error: 'Produto não encontrado' });

    if (quantidade > produto.quantidade) {
      return res.status(400).json({
        error: `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.quantidade}`,
      });
    }

    const precoTotal = produto.precoUnitario.mul(quantidade);

    const item = await prisma.$transaction(async (tx) => {
      const novoItem = await tx.itemPedido.create({
        data: { pedidoId, produtoId, quantidade, precoUnitario: produto.precoUnitario, precoTotal },
        include: { produto: true },
      });

      await atualizarValorTotal(tx, pedido, { valorTotal: { increment: precoTotal } });

      // Se pedido já está concluído, decrementar estoque
      if (pedido.status === 'CONCLUIDO') {
        await baixarEstoque(tx, produtoId, quantidade, { usuarioId: req.usuarioId, pedidoId });
      }

      return novoItem;
    });

    return res.status(201).json(item);
  } catch (erro) {
    if (erro instanceof ErroEstoque || erro instanceof ErroConcorrencia) return res.status(400).json({ error: erro.message });
    return res.status(500).json({ error: 'Erro ao adicionar item ao pedido' });
  }
});

// Atualizar item do pedido
roteador.put('/:pedidoId/itens/:itemId', async (req: RequisicaoAutenticada, res: Response) => {
  const quantidade = Number(req.body.quantidade);
  const pedidoId = Number(req.params.pedidoId);
  const itemId = Number(req.params.itemId);

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ error: 'Quantidade deve ser um inteiro positivo' });
  }

  try {
    const busca = await buscarPedidoEditavel(pedidoId);
    if ('erro' in busca) return res.status(busca.codigo).json({ error: busca.erro });
    const { pedido } = busca;

    const itemExistente = await prisma.itemPedido.findFirst({ where: { id: itemId, pedidoId } });
    if (!itemExistente) return res.status(404).json({ error: 'Item não encontrado' });

    const produto = await prisma.produto.findUnique({ where: { id: itemExistente.produtoId } });
    if (!produto) return res.status(400).json({ error: 'Produto não encontrado' });

    // Verificar estoque disponível
    let quantidadeDisponivel = produto.quantidade;
    if (pedido.status === 'CONCLUIDO') {
      quantidadeDisponivel += itemExistente.quantidade;
    }

    if (quantidade > quantidadeDisponivel) {
      return res.status(400).json({
        error: `Estoque insuficiente para "${produto.nome}". Disponível: ${quantidadeDisponivel}`,
      });
    }

    const novoPrecoTotal = itemExistente.precoUnitario.mul(quantidade);
    const diferencaValor = novoPrecoTotal.sub(itemExistente.precoTotal);

    const itemAtualizado = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.itemPedido.update({
        where: { id: itemId },
        data: { quantidade, precoTotal: novoPrecoTotal },
        include: { produto: true },
      });

      await atualizarValorTotal(tx, pedido, { valorTotal: { increment: diferencaValor } });

      // Ajustar estoque se pedido já concluído
      if (pedido.status === 'CONCLUIDO') {
        const diferencaQuantidade = quantidade - itemExistente.quantidade;
        if (diferencaQuantidade > 0) {
          await baixarEstoque(tx, itemExistente.produtoId, diferencaQuantidade, { usuarioId: req.usuarioId, pedidoId });
        } else if (diferencaQuantidade < 0) {
          await devolverEstoque(tx, itemExistente.produtoId, Math.abs(diferencaQuantidade), { usuarioId: req.usuarioId, pedidoId, observacao: 'Devolução por redução de item do pedido' });
        }
      }

      return atualizado;
    });

    return res.json(itemAtualizado);
  } catch (erro) {
    if (erro instanceof ErroEstoque || erro instanceof ErroConcorrencia) return res.status(400).json({ error: erro.message });
    return res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// Excluir item do pedido
roteador.delete('/:pedidoId/itens/:itemId', async (req: RequisicaoAutenticada, res: Response) => {
  const pedidoId = Number(req.params.pedidoId);
  const itemId = Number(req.params.itemId);

  try {
    const busca = await buscarPedidoEditavel(pedidoId);
    if ('erro' in busca) return res.status(busca.codigo).json({ error: busca.erro });
    const { pedido } = busca;

    const item = await prisma.itemPedido.findFirst({ where: { id: itemId, pedidoId } });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    const totalItens = await prisma.itemPedido.count({ where: { pedidoId } });
    if (totalItens <= 1) {
      return res.status(400).json({ error: 'O pedido precisa ter pelo menos um item' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.itemPedido.delete({ where: { id: itemId } });

      await atualizarValorTotal(tx, pedido, { valorTotal: { decrement: item.precoTotal } });

      // Devolver estoque se pedido já concluído
      if (pedido.status === 'CONCLUIDO') {
        await devolverEstoque(tx, item.produtoId, item.quantidade, { usuarioId: req.usuarioId, pedidoId, observacao: 'Devolução por remoção de item do pedido' });
      }
    });

    return res.json({ mensagem: 'Item excluído com sucesso' });
  } catch (erro) {
    if (erro instanceof ErroConcorrencia) return res.status(400).json({ error: erro.message });
    return res.status(500).json({ error: 'Erro ao excluir item' });
  }
});

export default roteador;
