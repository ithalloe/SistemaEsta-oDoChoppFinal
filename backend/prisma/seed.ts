import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// O seed pode ser executado mais de uma vez: registros que já existem são mantidos.
async function principal() {
  const senhaAdmin = await bcrypt.hash('admin123', 10);
  const senhaFuncionario = await bcrypt.hash('func123', 10);

  await prisma.usuario.upsert({
    where: { email: 'admin@estacaodochopp.com' },
    update: { papel: 'ADMIN' },
    create: {
      nome: 'Administrador',
      email: 'admin@estacaodochopp.com',
      senha: senhaAdmin,
      papel: 'ADMIN',
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'funcionario@estacaodochopp.com' },
    update: {},
    create: {
      nome: 'Funcionário Exemplo',
      email: 'funcionario@estacaodochopp.com',
      senha: senhaFuncionario,
      papel: 'FUNCIONARIO',
    },
  });

  const produtos = [
    { nome: 'Chopp Pilsen 30L', tamanho: 'BARRIL_30L' as const, quantidade: 20, quantidadeMinima: 5, precoUnitario: 180.0 },
    { nome: 'Chopp Pilsen 50L', tamanho: 'BARRIL_50L' as const, quantidade: 10, quantidadeMinima: 3, precoUnitario: 280.0 },
    { nome: 'Chopp Weiss 30L', tamanho: 'BARRIL_30L' as const, quantidade: 15, quantidadeMinima: 5, precoUnitario: 200.0 },
    { nome: 'Chopp Weiss 50L', tamanho: 'BARRIL_50L' as const, quantidade: 6, quantidadeMinima: 2, precoUnitario: 310.0 },
    { nome: 'Chopp Escuro 30L', tamanho: 'BARRIL_30L' as const, quantidade: 8, quantidadeMinima: 3, precoUnitario: 210.0 },
  ];

  for (const produto of produtos) {
    const existente = await prisma.produto.findUnique({ where: { nome: produto.nome } });
    if (existente) continue;

    // Todo saldo precisa de uma movimentação correspondente, para que a soma
    // do histórico de estoque continue igual ao saldo do produto.
    await prisma.produto.create({
      data: {
        ...produto,
        movimentacoes: {
          create: { tipo: 'ENTRADA', quantidade: produto.quantidade, observacao: 'Estoque inicial (seed)' },
        },
      },
    });
  }

  const clientes = [
    { nome: 'Bar do João', email: 'joao@bardojoao.com', telefone: '43999991111', endereco: 'Rua das Flores, 123' },
    { nome: 'Restaurante Bom Sabor', email: 'contato@bomsabor.com', telefone: '43999992222', endereco: 'Av. Principal, 456' },
    { nome: 'Churrascaria Gaúcha', email: 'gaucha@churras.com', telefone: '43999993333', endereco: 'Rua do Churrasco, 789' },
  ];

  for (const cliente of clientes) {
    await prisma.cliente.upsert({ where: { email: cliente.email }, update: {}, create: cliente });
  }

  console.log('Seed executado com sucesso!');
}

principal()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
