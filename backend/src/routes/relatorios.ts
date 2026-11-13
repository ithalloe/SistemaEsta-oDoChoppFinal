import { Router, Response } from 'express';
import prisma from '../prisma';
import { middlewareAutenticacao, apenasAdmin, RequisicaoAutenticada } from '../middleware/auth';
import {
  calcularRelatorioVendas,
  calcularRelatorioMensal,
  calcularRelatorioTicket,
  calcularRelatorioProdutos,
  FiltrosVendas,
} from '../utils/servicoRelatorios';
import { DocumentoRelatorio, gerarExcel, gerarPdf } from '../utils/exportarRelatorio';

const roteador = Router();

roteador.use(middlewareAutenticacao);
roteador.use(apenasAdmin);

// Relatórios em JSON (consumidos pela tela)

roteador.get('/vendas', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    return res.json(await calcularRelatorioVendas(req.query as FiltrosVendas));
  } catch {
    return res.status(500).json({ error: 'Erro ao gerar relatório de vendas' });
  }
});

roteador.get('/clientes', async (_req: RequisicaoAutenticada, res: Response) => {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { excluidoEm: null },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });
    return res.json(clientes);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

roteador.get('/mensal', async (_req: RequisicaoAutenticada, res: Response) => {
  try {
    return res.json(await calcularRelatorioMensal());
  } catch {
    return res.status(500).json({ error: 'Erro ao gerar relatório mensal' });
  }
});

roteador.get('/ticket-medio', async (_req: RequisicaoAutenticada, res: Response) => {
  try {
    return res.json(await calcularRelatorioTicket());
  } catch {
    return res.status(500).json({ error: 'Erro ao gerar relatório de ticket médio' });
  }
});

roteador.get('/produtos-lucrativos', async (_req: RequisicaoAutenticada, res: Response) => {
  try {
    return res.json(await calcularRelatorioProdutos());
  } catch {
    return res.status(500).json({ error: 'Erro ao gerar relatório de produtos' });
  }
});

// Exportação (PDF / Excel)
// Cada relatório é descrito uma vez (título, resumo e tabelas) e a mesma
// descrição serve para gerar tanto o PDF quanto o Excel.

// "2026-11-01" -> "01/11/2026" (sem passar por Date, para não sofrer com fuso horário)
const dataBr = (data: string) => data.split('-').reverse().join('/');
const geradoEm = () => `Gerado em ${new Date().toLocaleString('pt-BR')}`;

function subtituloPeriodo(filtros: FiltrosVendas): string {
  const partes: string[] = [];
  if (filtros.dataInicio) partes.push(`de ${dataBr(String(filtros.dataInicio))}`);
  if (filtros.dataFim) partes.push(`até ${dataBr(String(filtros.dataFim))}`);
  return `Período: ${partes.length ? partes.join(' ') : 'todo o período'} — ${geradoEm().toLowerCase()}`;
}

const montadores: Record<string, (query: any) => Promise<DocumentoRelatorio>> = {
  vendas: async (filtros: FiltrosVendas) => {
    const r = await calcularRelatorioVendas(filtros);
    return {
      titulo: 'Relatório de Vendas',
      nomeArquivo: 'relatorio-vendas',
      subtitulo: subtituloPeriodo(filtros),
      resumo: [
        { rotulo: 'Total de Pedidos', valor: r.totalPedidos },
        { rotulo: 'Total em Vendas', valor: r.totalReceita, formato: 'moeda' },
        { rotulo: 'Clientes Atendidos', valor: r.porCliente.length },
        { rotulo: 'Produtos Vendidos', valor: r.porProduto.length },
      ],
      tabelas: [
        {
          titulo: 'Vendas por Cliente',
          linhas: r.porCliente,
          colunas: [
            { titulo: 'Cliente', chave: 'nomeCliente', largura: 32 },
            { titulo: 'Pedidos', chave: 'totalPedidos', largura: 12, formato: 'numero' },
            { titulo: 'Total Vendido', chave: 'totalReceita', largura: 18, formato: 'moeda' },
          ],
        },
        {
          titulo: 'Produtos Mais Vendidos',
          linhas: r.porProduto,
          colunas: [
            { titulo: 'Produto', chave: 'nomeProduto', largura: 32 },
            { titulo: 'Qtd. Vendida', chave: 'totalQuantidade', largura: 12, formato: 'numero' },
            { titulo: 'Total', chave: 'totalReceita', largura: 18, formato: 'moeda' },
          ],
        },
      ],
    };
  },

  mensal: async () => ({
    titulo: 'Relatório Mensal',
    nomeArquivo: 'relatorio-mensal',
    subtitulo: geradoEm(),
    resumo: [],
    tabelas: [
      {
        titulo: 'Vendas por Mês',
        linhas: await calcularRelatorioMensal(),
        colunas: [
          { titulo: 'Mês', chave: 'mes', largura: 32 },
          { titulo: 'Pedidos', chave: 'totalPedidos', largura: 12, formato: 'numero' },
          { titulo: 'Total Vendido', chave: 'totalReceita', largura: 18, formato: 'moeda' },
        ],
      },
    ],
  }),

  'ticket-medio': async () => {
    const r = await calcularRelatorioTicket();
    return {
      titulo: 'Relatório de Ticket Médio',
      nomeArquivo: 'relatorio-ticket-medio',
      subtitulo: geradoEm(),
      resumo: [
        { rotulo: 'Ticket Médio Geral', valor: r.ticketMedioGeral, formato: 'moeda' },
        { rotulo: 'Total de Pedidos', valor: r.totalPedidos },
      ],
      tabelas: [
        {
          titulo: 'Ticket Médio por Cliente',
          linhas: r.porCliente,
          colunas: [
            { titulo: 'Cliente', chave: 'nomeCliente', largura: 30 },
            { titulo: 'Pedidos', chave: 'totalPedidos', largura: 10, formato: 'numero' },
            { titulo: 'Total Gasto', chave: 'totalReceita', largura: 17, formato: 'moeda' },
            { titulo: 'Ticket Médio', chave: 'ticketMedio', largura: 17, formato: 'moeda' },
          ],
        },
      ],
    };
  },

  'produtos-lucrativos': async () => {
    const r = await calcularRelatorioProdutos();
    return {
      titulo: 'Produtos Lucrativos',
      nomeArquivo: 'relatorio-produtos-lucrativos',
      subtitulo: geradoEm(),
      resumo: [
        { rotulo: 'Faturamento Total', valor: r.totalReceita, formato: 'moeda' },
        { rotulo: 'Produtos com Vendas', valor: r.produtos.length },
      ],
      tabelas: [
        {
          titulo: 'Ranking de Produtos',
          linhas: r.produtos,
          colunas: [
            { titulo: '#', chave: 'posicao', largura: 6, formato: 'numero' },
            { titulo: 'Produto', chave: 'nomeProduto', largura: 32 },
            { titulo: 'Qtd.', chave: 'totalQuantidade', largura: 10, formato: 'numero' },
            { titulo: 'Faturamento', chave: 'totalReceita', largura: 16, formato: 'moeda' },
            { titulo: '% Total', chave: 'percentual', largura: 10, formato: 'percentual' },
          ],
        },
      ],
    };
  },
};

// GET /relatorios/:tipo/export?formato=pdf|excel  (+ filtros, no caso de vendas)
roteador.get('/:tipo/export', async (req: RequisicaoAutenticada, res: Response) => {
  const montar = montadores[req.params.tipo];
  if (!montar) return res.status(404).json({ error: 'Relatório não encontrado' });

  const excel = req.query.formato === 'excel';
  try {
    const documento = await montar(req.query);
    const buffer = excel ? await gerarExcel(documento) : await gerarPdf(documento);
    const data = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', excel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${documento.nomeArquivo}-${data}.${excel ? 'xlsx' : 'pdf'}"`);
    return res.end(buffer);
  } catch {
    return res.status(500).json({ error: 'Erro ao exportar o relatório' });
  }
});

export default roteador;
