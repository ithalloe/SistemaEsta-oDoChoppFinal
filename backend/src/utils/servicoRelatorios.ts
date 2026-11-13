import prisma from '../prisma';


// Tipos dos relatórios

export interface FiltrosVendas {
  dataInicio?: string;
  dataFim?: string;
  clienteId?: string | number;
}

export interface LinhaPorCliente {
  clienteId: number;
  nomeCliente: string;
  totalPedidos: number;
  totalReceita: number;
}

export interface LinhaPorProduto {
  produtoId: number;
  nomeProduto: string;
  totalQuantidade: number;
  totalReceita: number;
}

export interface RelatorioVendas {
  totalPedidos: number;
  totalReceita: number;
  porCliente: LinhaPorCliente[];
  porProduto: LinhaPorProduto[];
}

export interface LinhaMensal {
  mes: string;
  totalPedidos: number;
  totalReceita: number;
}

export interface LinhaTicket extends LinhaPorCliente {
  ticketMedio: number;
}

export interface RelatorioTicket {
  ticketMedioGeral: number;
  totalPedidos: number;
  porCliente: LinhaTicket[];
}

export interface ProdutoLucrativo extends LinhaPorProduto {
  posicao: number;
  percentual: number;
}

export interface RelatorioProdutos {
  totalReceita: number;
  produtos: ProdutoLucrativo[];
}

// Cálculo dos relatórios (fonte única, usada pelas rotas JSON e de export)

export async function calcularRelatorioVendas(filtros: FiltrosVendas): Promise<RelatorioVendas> {
  const where: any = { status: 'CONCLUIDO', excluidoEm: null };

  // As datas chegam como "AAAA-MM-DD". Sem horário, o JS as leria em UTC (21h do dia
  // anterior no Brasil); com o horário explícito, ambas são lidas no fuso local.
  if (filtros.dataInicio) {
    where.criadoEm = { ...where.criadoEm, gte: new Date(`${filtros.dataInicio}T00:00:00`) };
  }
  if (filtros.dataFim) {
    where.criadoEm = { ...where.criadoEm, lte: new Date(`${filtros.dataFim}T23:59:59.999`) };
  }
  if (filtros.clienteId) {
    where.clienteId = Number(filtros.clienteId);
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    include: { cliente: true, itens: { include: { produto: true } } },
    orderBy: { criadoEm: 'desc' },
  });

  const totalPedidos = pedidos.length;
  const totalReceita = pedidos.reduce((soma, p) => soma + p.valorTotal.toNumber(), 0);

  const mapaClientes: Record<number, LinhaPorCliente> = {};
  for (const pedido of pedidos) {
    const id = pedido.clienteId;
    if (!mapaClientes[id]) {
      mapaClientes[id] = { clienteId: id, nomeCliente: pedido.cliente.nome, totalPedidos: 0, totalReceita: 0 };
    }
    mapaClientes[id].totalPedidos += 1;
    mapaClientes[id].totalReceita += pedido.valorTotal.toNumber();
  }
  const porCliente = Object.values(mapaClientes).sort((a, b) => b.totalReceita - a.totalReceita);

  const mapaProdutos: Record<number, LinhaPorProduto> = {};
  for (const pedido of pedidos) {
    for (const item of pedido.itens) {
      const id = item.produtoId;
      if (!mapaProdutos[id]) {
        mapaProdutos[id] = { produtoId: id, nomeProduto: item.produto.nome, totalQuantidade: 0, totalReceita: 0 };
      }
      mapaProdutos[id].totalQuantidade += item.quantidade;
      mapaProdutos[id].totalReceita += item.precoTotal.toNumber();
    }
  }
  const porProduto = Object.values(mapaProdutos).sort((a, b) => b.totalReceita - a.totalReceita);

  return { totalPedidos, totalReceita, porCliente, porProduto };
}

export async function calcularRelatorioMensal(): Promise<LinhaMensal[]> {
  const pedidos = await prisma.pedido.findMany({
    where: { status: 'CONCLUIDO', excluidoEm: null },
    select: { valorTotal: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' },
  });

  const mapaMeses: Record<string, LinhaMensal> = {};
  for (const pedido of pedidos) {
    const data = new Date(pedido.criadoEm);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    const label = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (!mapaMeses[chave]) {
      mapaMeses[chave] = { mes: label, totalPedidos: 0, totalReceita: 0 };
    }
    mapaMeses[chave].totalPedidos += 1;
    mapaMeses[chave].totalReceita += pedido.valorTotal.toNumber();
  }

  return Object.entries(mapaMeses)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);
}

export async function calcularRelatorioTicket(): Promise<RelatorioTicket> {
  const pedidos = await prisma.pedido.findMany({
    where: { status: 'CONCLUIDO', excluidoEm: null },
    include: { cliente: true },
    orderBy: { criadoEm: 'desc' },
  });

  const mapaClientes: Record<number, LinhaPorCliente> = {};
  for (const pedido of pedidos) {
    const id = pedido.clienteId;
    if (!mapaClientes[id]) {
      mapaClientes[id] = { clienteId: id, nomeCliente: pedido.cliente.nome, totalPedidos: 0, totalReceita: 0 };
    }
    mapaClientes[id].totalPedidos += 1;
    mapaClientes[id].totalReceita += pedido.valorTotal.toNumber();
  }

  const porCliente = Object.values(mapaClientes)
    .map((c) => ({ ...c, ticketMedio: c.totalReceita / c.totalPedidos }))
    .sort((a, b) => b.ticketMedio - a.ticketMedio);

  const totalReceita = pedidos.reduce((soma, p) => soma + p.valorTotal.toNumber(), 0);
  const ticketMedioGeral = pedidos.length > 0 ? totalReceita / pedidos.length : 0;

  return { ticketMedioGeral, totalPedidos: pedidos.length, porCliente };
}

export async function calcularRelatorioProdutos(): Promise<RelatorioProdutos> {
  const itens = await prisma.itemPedido.findMany({
    where: { pedido: { status: 'CONCLUIDO', excluidoEm: null } },
    include: { produto: true },
  });

  const mapaProdutos: Record<number, LinhaPorProduto> = {};
  for (const item of itens) {
    const id = item.produtoId;
    if (!mapaProdutos[id]) {
      mapaProdutos[id] = { produtoId: id, nomeProduto: item.produto.nome, totalQuantidade: 0, totalReceita: 0 };
    }
    mapaProdutos[id].totalQuantidade += item.quantidade;
    mapaProdutos[id].totalReceita += item.precoTotal.toNumber();
  }

  const totalReceita = Object.values(mapaProdutos).reduce((soma, p) => soma + p.totalReceita, 0);

  const produtos = Object.values(mapaProdutos)
    .sort((a, b) => b.totalReceita - a.totalReceita)
    .map((p, indice) => ({
      ...p,
      posicao: indice + 1,
      percentual: totalReceita > 0 ? (p.totalReceita / totalReceita) * 100 : 0,
    }));

  return { totalReceita, produtos };
}
