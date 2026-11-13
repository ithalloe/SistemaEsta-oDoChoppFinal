import { Router, Response } from 'express';
import prisma from '../prisma';
import { middlewareAutenticacao, RequisicaoAutenticada } from '../middleware/auth';

const roteador = Router();

roteador.use(middlewareAutenticacao);

roteador.get('/', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [totalClientes, pedidosHoje, pedidosPendentes, somaConcluidos, pedidosRecentes] =
      await Promise.all([
        prisma.cliente.count({ where: { excluidoEm: null } }),
        prisma.pedido.count({ where: { excluidoEm: null, criadoEm: { gte: hoje, lt: amanha } } }),
        // Pendentes = ainda não concluídos e não cancelados
        prisma.pedido.count({ where: { excluidoEm: null, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } } }),
        prisma.pedido.aggregate({ where: { excluidoEm: null, status: 'CONCLUIDO' }, _sum: { valorTotal: true } }),
        prisma.pedido.findMany({
          where: { excluidoEm: null },
          take: 10,
          orderBy: { criadoEm: 'desc' },
          include: { cliente: true },
        }),
      ]);

    return res.json({
      totalClientes,
      pedidosHoje,
      pedidosPendentes,
      // Faturamento é informação financeira: só vai para o administrador.
      receitaTotal: req.usuarioPapel === 'ADMIN' ? somaConcluidos._sum.valorTotal?.toNumber() ?? 0 : null,
      pedidosRecentes,
    });
  } catch {
    return res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

export default roteador;
