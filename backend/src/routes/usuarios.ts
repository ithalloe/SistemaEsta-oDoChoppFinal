import { Router, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { middlewareAutenticacao, apenasAdmin, RequisicaoAutenticada } from '../middleware/auth';

const roteador = Router();

roteador.use(middlewareAutenticacao);
roteador.use(apenasAdmin);

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAMANHO_MINIMO_SENHA = 6;

roteador.get('/', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { excluidoEm: null },
      select: { id: true, nome: true, email: true, papel: true, criadoEm: true },
      orderBy: { nome: 'asc' },
    });
    return res.json(usuarios);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

roteador.get('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  try {
    const usuario = await prisma.usuario.findFirst({
      where: { id: Number(req.params.id), excluidoEm: null },
      select: { id: true, nome: true, email: true, papel: true, criadoEm: true },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(usuario);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

roteador.post('/', async (req: RequisicaoAutenticada, res: Response) => {
  const { nome, email, senha, papel } = req.body;

  if (!nome || !email || !senha || !papel) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  if (!['ADMIN', 'FUNCIONARIO'].includes(papel)) {
    return res.status(400).json({ error: 'Papel inválido' });
  }
  if (!REGEX_EMAIL.test(email)) {
    return res.status(400).json({ error: 'Email com formato inválido' });
  }
  if (String(senha).length < TAMANHO_MINIMO_SENHA) {
    return res.status(400).json({ error: `A senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres` });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    // O email continua único mesmo após a exclusão lógica: se ele for de um usuário excluído,
    // reativamos esse cadastro com os dados novos (os pedidos registrados por ele são mantidos).
    const excluido = await prisma.usuario.findFirst({ where: { email, excluidoEm: { not: null } } });
    const dados = { nome, email, senha: senhaHash, papel };
    const selecao = { id: true, nome: true, email: true, papel: true, criadoEm: true };
    const usuario = excluido
      ? await prisma.usuario.update({ where: { id: excluido.id }, data: { ...dados, excluidoEm: null }, select: selecao })
      : await prisma.usuario.create({ data: dados, select: selecao });
    return res.status(201).json(usuario);
  } catch (erro: any) {
    if (erro.code === 'P2002') return res.status(400).json({ error: 'Email já cadastrado' });
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

roteador.put('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  const { nome, email, senha, papel } = req.body;
  const usuarioId = Number(req.params.id);

  if (!nome || !email || !papel) {
    return res.status(400).json({ error: 'Nome, email e papel são obrigatórios' });
  }
  if (!['ADMIN', 'FUNCIONARIO'].includes(papel)) {
    return res.status(400).json({ error: 'Papel inválido' });
  }
  if (!REGEX_EMAIL.test(email)) {
    return res.status(400).json({ error: 'Email com formato inválido' });
  }
  if (senha && String(senha).length < TAMANHO_MINIMO_SENHA) {
    return res.status(400).json({ error: `A senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres` });
  }
  if (req.usuarioId === usuarioId && papel !== 'ADMIN') {
    return res.status(400).json({ error: 'Você não pode remover seu próprio papel de administrador' });
  }

  try {
    const existente = await prisma.usuario.findFirst({ where: { id: usuarioId, excluidoEm: null } });
    if (!existente) return res.status(404).json({ error: 'Usuário não encontrado' });

    const dados: any = { nome, email, papel };
    if (senha) {
      dados.senha = await bcrypt.hash(senha, 10);
    }

    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data: dados,
      select: { id: true, nome: true, email: true, papel: true, criadoEm: true },
    });
    return res.json(usuario);
  } catch (erro: any) {
    if (erro.code === 'P2002') return res.status(400).json({ error: 'Email já cadastrado' });
    if (erro.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

roteador.delete('/:id', async (req: RequisicaoAutenticada, res: Response) => {
  const usuarioId = Number(req.params.id);

  if (req.usuarioId === usuarioId) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
  }

  try {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { excluidoEm: new Date() },
    });
    return res.json({ mensagem: 'Usuário excluído com sucesso' });
  } catch (erro: any) {
    if (erro.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

export default roteador;
