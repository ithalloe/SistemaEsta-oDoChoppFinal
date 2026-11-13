import { Router, Response } from 'express';
import prisma from '../prisma';
import { middlewareAutenticacao, RequisicaoAutenticada } from '../middleware/auth';

const roteador = Router();

roteador.use(middlewareAutenticacao);

roteador.get('/', async (req: RequisicaoAutenticada, res: Response) => {
  const { busca } = req.query;
  try {
    const clientes = await prisma.cliente.findMany({
      where: {
        excluidoEm: null,
        ...(busca
          ? {
              OR: [
                { nome: { contains: String(busca), mode: 'insensitive' } },
                { email: { contains: String(busca), mode: 'insensitive' } },
                { telefone: { contains: String(busca), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { nome: 'asc' },
    });
    return res.json(clientes);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

roteador.get('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const cliente = await prisma.cliente.findFirst({ where: { id: Number(req.params.id), excluidoEm: null } });
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    return res.json(cliente);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

roteador.post('/', async (req: RequisicaoAutenticada, res: Response) => {
  const { nome, email, telefone, endereco } = req.body;
  if (!nome || !email || !telefone || !endereco) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  // O telefone é armazenado apenas como dígitos (10 ou 11 números: DDD + número).
  const telefoneDigitos = String(telefone).replace(/\D/g, '');
  if (telefoneDigitos.length < 10 || telefoneDigitos.length > 11) {
    return res.status(400).json({ error: 'Telefone deve conter DDD e número (10 ou 11 dígitos)' });
  }
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(email)) {
    return res.status(400).json({ error: 'Email com formato inválido' });
  }
  if (endereco.trim().length < 5) {
    return res.status(400).json({ error: 'Endereço deve ter no mínimo 5 caracteres' });
  }
  try {
    // O email continua único mesmo após a exclusão lógica: se ele for de um cliente excluído,
    // reativamos esse cadastro com os dados novos (o histórico de pedidos é mantido).
    const excluido = await prisma.cliente.findFirst({ where: { email, excluidoEm: { not: null } } });
    const dados = { nome, email, telefone: telefoneDigitos, endereco };
    const cliente = excluido
      ? await prisma.cliente.update({ where: { id: excluido.id }, data: { ...dados, excluidoEm: null } })
      : await prisma.cliente.create({ data: dados });
    return res.status(201).json(cliente);
  } catch (erro: any) {
    if (erro.code === 'P2002') return res.status(400).json({ error: 'Email já cadastrado' });
    return res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

roteador.put('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  const { nome, email, telefone, endereco } = req.body;
  if (!nome || !email || !telefone || !endereco) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  // O telefone é armazenado apenas como dígitos (10 ou 11 números: DDD + número).
  const telefoneDigitos = String(telefone).replace(/\D/g, '');
  if (telefoneDigitos.length < 10 || telefoneDigitos.length > 11) {
    return res.status(400).json({ error: 'Telefone deve conter DDD e número (10 ou 11 dígitos)' });
  }
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(email)) {
    return res.status(400).json({ error: 'Email com formato inválido' });
  }
  if (endereco.trim().length < 5) {
    return res.status(400).json({ error: 'Endereço deve ter no mínimo 5 caracteres' });
  }
  try {
    const existente = await prisma.cliente.findFirst({ where: { id: Number(req.params.id), excluidoEm: null } });
    if (!existente) return res.status(404).json({ error: 'Cliente não encontrado' });

    const cliente = await prisma.cliente.update({
      where: { id: Number(req.params.id) },
      data: { nome, email, telefone: telefoneDigitos, endereco },
    });
    return res.json(cliente);
  } catch (erro: any) {
    if (erro.code === 'P2002') return res.status(400).json({ error: 'Email já cadastrado' });
    return res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

roteador.delete('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    await prisma.cliente.update({
      where: { id: Number(req.params.id) },
      data: { excluidoEm: new Date() },
    });
    return res.json({ mensagem: 'Cliente excluído com sucesso' });
  } catch (erro: any) {
    if (erro.code === 'P2025') return res.status(404).json({ error: 'Cliente não encontrado' });
    return res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

export default roteador;
