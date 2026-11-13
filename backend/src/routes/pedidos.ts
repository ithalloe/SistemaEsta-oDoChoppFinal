import { Router, Response } from 'express';
import { Prisma, StatusPedido } from '@prisma/client';
import prisma from '../prisma';
import { middlewareAutenticacao, RequisicaoAutenticada } from '../middleware/auth';
import { baixarEstoque, devolverEstoque, ErroEstoque } from '../utils/estoque';
import { ErroConcorrencia } from '../utils/erros';

const roteador = Router();

roteador.use(middlewareAutenticacao);

// Ciclo de vida do pedido: nasce PENDENTE e só avança nesta ordem.
// O CANCELADO não faz parte da sequência: tem rota própria de cancelamento.
const ORDEM_STATUS: StatusPedido[] = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'];

// O cliente precisa existir e estar ativo. Na edição, um pedido antigo pode
// manter o cliente que já tinha, mesmo que ele tenha sido excluído depois.
async function validarCliente(clienteId: number, clienteAtualDoPedido?: number) {
  if (!Number.isInteger(clienteId)) return false;
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return false;
  return !cliente.excluidoEm || clienteId === clienteAtualDoPedido;
}

interface PedidoExistente {
  status: StatusPedido;
  itens: { produtoId: number; quantidade: number; precoUnitario: Prisma.Decimal }[];
}

// Monta os itens do pedido com o preço do cadastro (nunca o enviado pela tela) e valida o estoque.
// Linhas repetidas do mesmo produto são somadas antes de comparar com o estoque.
// Na edição, produtos que já estavam no pedido mantêm o preço da época da venda.
async function prepararItens(itensRecebidos: any[], pedidoExistente?: PedidoExistente) {
  const quantidadePorProduto = new Map<number, number>();
  for (const item of itensRecebidos) {
    const produtoId = Number(item.produtoId);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(produtoId) || !Number.isInteger(quantidade) || quantidade <= 0) {
      return { erro: 'Cada item precisa de um produto e uma quantidade inteira positiva' };
    }
    quantidadePorProduto.set(produtoId, (quantidadePorProduto.get(produtoId) || 0) + quantidade);
  }

  const produtos = await prisma.produto.findMany({ where: { id: { in: [...quantidadePorProduto.keys()] } } });

  const itens: { produtoId: number; quantidade: number; precoUnitario: Prisma.Decimal; precoTotal: Prisma.Decimal }[] = [];
  let valorTotal = new Prisma.Decimal(0);

  for (const [produtoId, quantidade] of quantidadePorProduto) {
    const produto = produtos.find((p) => p.id === produtoId);
    const itensAntigos = pedidoExistente?.itens.filter((i) => i.produtoId === produtoId) ?? [];
    if (!produto || (produto.excluidoEm && itensAntigos.length === 0)) {
      return { erro: 'Produto não encontrado' };
    }

    let quantidadeDisponivel = produto.quantidade;
    if (pedidoExistente?.status === 'CONCLUIDO') {
      quantidadeDisponivel += itensAntigos.reduce((soma, i) => soma + i.quantidade, 0);
    }
    if (quantidade > quantidadeDisponivel) {
      return { erro: `Estoque insuficiente para "${produto.nome}". Disponível: ${quantidadeDisponivel}` };
    }

    const precoUnitario = itensAntigos[0]?.precoUnitario ?? produto.precoUnitario;
    const precoTotal = precoUnitario.mul(quantidade);
    valorTotal = valorTotal.add(precoTotal);
    itens.push({ produtoId, quantidade, precoUnitario, precoTotal });
  }

  return { itens, valorTotal };
}

roteador.get('/', async (req: RequisicaoAutenticada, res: Response) => {
  const { busca } = req.query;
  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        excluidoEm: null,
        ...(busca
          ? {
              OR: [
                { cliente: { nome: { contains: String(busca), mode: 'insensitive' } } },
                { itens: { some: { produto: { nome: { contains: String(busca), mode: 'insensitive' } } } } },
              ],
            }
          : {}),
      },
      include: { cliente: true, usuario: { select: { id: true, nome: true } }, itens: { include: { produto: true } } },
      orderBy: { criadoEm: 'desc' },
    });
    return res.json(pedidos);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

roteador.get('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: Number(req.params.id), excluidoEm: null },
      include: { cliente: true, usuario: { select: { id: true, nome: true } }, itens: { include: { produto: true } } },
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    return res.json(pedido);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

roteador.post('/', async (req: RequisicaoAutenticada, res: Response) => {
  const { clienteId, itens } = req.body;

  if (!clienteId || !itens || itens.length === 0) {
    return res.status(400).json({ error: 'Cliente e pelo menos um item são obrigatórios' });
  }

  try {
    if (!(await validarCliente(Number(clienteId)))) {
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }

    const preparado = await prepararItens(itens);
    if ('erro' in preparado) return res.status(400).json({ error: preparado.erro });

    // Todo pedido nasce PENDENTE; o estoque só é baixado quando ele for concluído.
    const pedido = await prisma.pedido.create({
      data: {
        clienteId: Number(clienteId),
        usuarioId: req.usuarioId!,
        status: 'PENDENTE',
        valorTotal: preparado.valorTotal,
        itens: { create: preparado.itens },
      },
      include: { cliente: true, usuario: { select: { id: true, nome: true } }, itens: { include: { produto: true } } },
    });

    return res.status(201).json(pedido);
  } catch {
    return res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

roteador.put('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  const { clienteId, status, itens } = req.body;
  const pedidoId = Number(req.params.id);

  if (!clienteId || !itens || itens.length === 0) {
    return res.status(400).json({ error: 'Cliente e pelo menos um item são obrigatórios' });
  }
  if (status && !ORDEM_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Status do pedido inválido. Para cancelar, use a opção Cancelar' });
  }

  try {
    const pedidoExistente = await prisma.pedido.findFirst({
      where: { id: pedidoId, excluidoEm: null },
      include: { itens: true },
    });
    if (!pedidoExistente) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (pedidoExistente.status === 'CANCELADO') {
      return res.status(400).json({ error: 'Pedido cancelado não pode ser editado' });
    }
    if (status && ORDEM_STATUS.indexOf(status) < ORDEM_STATUS.indexOf(pedidoExistente.status)) {
      return res.status(400).json({ error: 'O status do pedido não pode voltar para uma etapa anterior' });
    }
    if (!(await validarCliente(Number(clienteId), pedidoExistente.clienteId))) {
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }

    const preparado = await prepararItens(itens, pedidoExistente);
    if ('erro' in preparado) return res.status(400).json({ error: preparado.erro });

    const pedidoAtualizado = await prisma.$transaction(async (tx) => {
      // Só segue se o pedido ainda estiver como foi lido acima (mesma data de atualização).
      // Se outra pessoa alterou, cancelou ou concluiu nesse meio-tempo, desfaz tudo,
      // evitando devolver ou baixar o estoque com base em dados velhos.
      const { count } = await tx.pedido.updateMany({
        where: { id: pedidoId, atualizadoEm: pedidoExistente.atualizadoEm },
        data: { atualizadoEm: new Date() },
      });
      if (count === 0) throw new ErroConcorrencia();

      // Devolve o estoque dos itens antigos se o pedido estava concluído
      if (pedidoExistente.status === 'CONCLUIDO') {
        for (const item of pedidoExistente.itens) {
          await devolverEstoque(tx, item.produtoId, item.quantidade, { usuarioId: req.usuarioId, pedidoId, observacao: 'Devolução por edição de pedido' });
        }
      }

      await tx.itemPedido.deleteMany({ where: { pedidoId } });

      const atualizado = await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          clienteId: Number(clienteId),
          status: status as StatusPedido,
          valorTotal: preparado.valorTotal,
          itens: { create: preparado.itens },
        },
        include: { cliente: true, usuario: { select: { id: true, nome: true } }, itens: { include: { produto: true } } },
      });

      // Aplica a nova baixa de estoque se o pedido está concluído
      if (atualizado.status === 'CONCLUIDO') {
        for (const item of atualizado.itens) {
          await baixarEstoque(tx, item.produtoId, item.quantidade, { usuarioId: req.usuarioId, pedidoId });
        }
      }

      return atualizado;
    });

    return res.json(pedidoAtualizado);
  } catch (erro) {
    if (erro instanceof ErroEstoque || erro instanceof ErroConcorrencia) return res.status(400).json({ error: erro.message });
    return res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
});

// Avançar o pedido para a próxima etapa (PENDENTE -> EM_ANDAMENTO -> CONCLUIDO).
// Ao chegar em CONCLUIDO, baixa o estoque dos itens.
roteador.patch('/:id/avancar', async (req: RequisicaoAutenticada, res: Response) => {
  const pedidoId = Number(req.params.id);

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, excluidoEm: null },
      include: { itens: true },
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });

    const indiceAtual = ORDEM_STATUS.indexOf(pedido.status);
    if (indiceAtual === -1 || indiceAtual === ORDEM_STATUS.length - 1) {
      return res.status(400).json({ error: 'Este pedido não pode mais avançar de status' });
    }
    const proximoStatus = ORDEM_STATUS[indiceAtual + 1];

    const pedidoAtualizado = await prisma.$transaction(async (tx) => {
      // Só atualiza se o status ainda for o lido acima, para dois cliques simultâneos não baixarem o estoque duas vezes.
      const { count } = await tx.pedido.updateMany({
        where: { id: pedidoId, status: pedido.status },
        data: { status: proximoStatus },
      });
      if (count === 0) throw new ErroConcorrencia();

      if (proximoStatus === 'CONCLUIDO') {
        for (const item of pedido.itens) {
          await baixarEstoque(tx, item.produtoId, item.quantidade, { usuarioId: req.usuarioId, pedidoId });
        }
      }

      return tx.pedido.findUniqueOrThrow({
        where: { id: pedidoId },
        include: { cliente: true, usuario: { select: { id: true, nome: true } }, itens: { include: { produto: true } } },
      });
    });

    return res.json(pedidoAtualizado);
  } catch (erro) {
    if (erro instanceof ErroEstoque || erro instanceof ErroConcorrencia) return res.status(400).json({ error: erro.message });
    return res.status(500).json({ error: 'Erro ao avançar status do pedido' });
  }
});

// Cancelar pedido
roteador.patch('/:id/cancelar', async (req: RequisicaoAutenticada, res: Response) => {
  const pedidoId = Number(req.params.id);

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, excluidoEm: null },
      include: { itens: true },
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });

    if (pedido.status === 'CANCELADO') {
      return res.status(400).json({ error: 'Pedido já está cancelado' });
    }

    const pedidoCancelado = await prisma.$transaction(async (tx) => {
      // Mesma proteção do "avançar": só cancela se o status ainda for o lido acima.
      // Sem isso, dois cliques simultâneos devolveriam o estoque duas vezes.
      const { count } = await tx.pedido.updateMany({
        where: { id: pedidoId, status: pedido.status },
        data: { status: 'CANCELADO' },
      });
      if (count === 0) throw new ErroConcorrencia();

      // Se o pedido estava concluído, devolver estoque
      if (pedido.status === 'CONCLUIDO') {
        for (const item of pedido.itens) {
          await devolverEstoque(tx, item.produtoId, item.quantidade, { usuarioId: req.usuarioId, pedidoId, observacao: 'Devolução por cancelamento de pedido' });
        }
      }

      return tx.pedido.findUniqueOrThrow({
        where: { id: pedidoId },
        include: { cliente: true, usuario: { select: { id: true, nome: true } }, itens: { include: { produto: true } } },
      });
    });

    return res.json(pedidoCancelado);
  } catch (erro) {
    if (erro instanceof ErroConcorrencia) return res.status(400).json({ error: erro.message });
    return res.status(500).json({ error: 'Erro ao cancelar pedido' });
  }
});

export default roteador;
