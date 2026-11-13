import { Router, Response } from 'express';
import prisma from '../prisma';
import { middlewareAutenticacao, RequisicaoAutenticada } from '../middleware/auth';

const roteador = Router();

roteador.use(middlewareAutenticacao);

roteador.get('/', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { excluidoEm: null },
      orderBy: { nome: 'asc' },
    });
    return res.json(produtos);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

roteador.get('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const produto = await prisma.produto.findFirst({ where: { id: Number(req.params.id), excluidoEm: null } });
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
    return res.json(produto);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Validação única usada no cadastro e na edição. Devolve os dados já convertidos para número.
function validarProduto(corpo: any) {
  const { nome, tamanho } = corpo;
  const quantidade = Number(corpo.quantidade);
  const quantidadeMinima = Number(corpo.quantidadeMinima);
  // Aceita "10,50" além de "10.50"
  const precoUnitario = Number(String(corpo.precoUnitario ?? '').replace(',', '.'));

  if (!nome || !tamanho || corpo.quantidade === undefined || corpo.quantidadeMinima === undefined || corpo.precoUnitario === undefined) {
    return { erro: 'Todos os campos são obrigatórios' };
  }
  if (tamanho !== 'BARRIL_30L' && tamanho !== 'BARRIL_50L') {
    return { erro: 'Tamanho do barril inválido' };
  }
  if (!Number.isInteger(quantidade) || !Number.isInteger(quantidadeMinima)) {
    return { erro: 'Quantidade e estoque mínimo devem ser números inteiros' };
  }
  if (!Number.isFinite(precoUnitario)) {
    return { erro: 'Valor unitário inválido' };
  }
  if (quantidade < 0 || quantidadeMinima < 0 || precoUnitario <= 0) {
    return { erro: 'Valores devem ser positivos' };
  }
  return { dados: { nome: String(nome).trim(), tamanho, quantidade, quantidadeMinima, precoUnitario } };
}

roteador.post('/', async (req: RequisicaoAutenticada, res: Response) => {
  const validacao = validarProduto(req.body);
  if (!validacao.dados) return res.status(400).json({ error: validacao.erro });
  const dados = validacao.dados;
  try {
    // O nome continua único mesmo após a exclusão lógica: se ele for de um produto excluído,
    // reativamos esse cadastro com os dados novos (o histórico de vendas é mantido).
    const excluido = await prisma.produto.findFirst({ where: { nome: dados.nome, excluidoEm: { not: null } } });

    const produto = await prisma.$transaction(async (tx) => {
      if (excluido) {
        // Reativa o cadastro. Registra só a DIFERENÇA entre o saldo que sobrou e o novo valor.
        const atualizado = await tx.produto.update({ where: { id: excluido.id }, data: { ...dados, excluidoEm: null } });
        const diferenca = dados.quantidade - excluido.quantidade;
        if (diferenca !== 0) {
          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: atualizado.id,
              tipo: 'AJUSTE',
              quantidade: diferenca, // com sinal: + aumento / - redução
              usuarioId: req.usuarioId ?? null,
              observacao: 'Ajuste de saldo na reativação do produto',
            },
          });
        }
        return atualizado;
      }

      // Produto novo: registra a entrada inicial de estoque.
      const criado = await tx.produto.create({ data: dados });
      if (criado.quantidade > 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: criado.id,
            tipo: 'ENTRADA',
            quantidade: criado.quantidade,
            usuarioId: req.usuarioId ?? null,
            observacao: 'Estoque inicial do cadastro',
          },
        });
      }
      return criado;
    });

    return res.status(201).json(produto);
  } catch (erro: any) {
    if (erro.code === 'P2002') return res.status(400).json({ error: 'Produto com esse nome já existe' });
    return res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

roteador.put('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  const validacao = validarProduto(req.body);
  if (!validacao.dados) return res.status(400).json({ error: validacao.erro });
  const dados = validacao.dados;
  const produtoId = Number(req.params.id);
  try {
    const produto = await prisma.$transaction(async (tx) => {
      // Trava a linha do produto até o fim da transação (SELECT ... FOR UPDATE).
      // Assim, se um pedido for concluído ao mesmo tempo, a baixa de estoque espera esta
      // edição terminar, e a diferença abaixo é calculada sobre o saldo real, sem perder baixas.
      await tx.$queryRaw`SELECT id FROM "Produto" WHERE id = ${produtoId} FOR UPDATE`;
      const existente = await tx.produto.findFirst({ where: { id: produtoId, excluidoEm: null } });
      if (!existente) return null;

      const diferenca = dados.quantidade - existente.quantidade;
      const atualizado = await tx.produto.update({ where: { id: produtoId }, data: dados });

      // Se a quantidade mudou na edição, registra um AJUSTE manual no histórico (com sinal).
      if (diferenca !== 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: atualizado.id,
            tipo: 'AJUSTE',
            quantidade: diferenca, // com sinal: + aumento / - redução
            usuarioId: req.usuarioId ?? null,
            observacao: diferenca > 0 ? 'Ajuste manual na edição (aumento)' : 'Ajuste manual na edição (redução)',
          },
        });
      }

      return atualizado;
    });

    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
    return res.json(produto);
  } catch (erro: any) {
    if (erro.code === 'P2002') return res.status(400).json({ error: 'Produto com esse nome já existe' });
    return res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

roteador.delete('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    await prisma.produto.update({
      where: { id: Number(req.params.id) },
      data: { excluidoEm: new Date() },
    });
    return res.json({ mensagem: 'Produto excluído com sucesso' });
  } catch (erro: any) {
    if (erro.code === 'P2025') return res.status(404).json({ error: 'Produto não encontrado' });
    return res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// Histórico de movimentações de estoque de um produto
roteador.get('/:id/movimentacoes', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: { produtoId: Number(req.params.id) },
      include: {
        usuario: { select: { id: true, nome: true } },
        pedido: { select: { id: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
    return res.json(movimentacoes);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar movimentações' });
  }
});

export default roteador;
