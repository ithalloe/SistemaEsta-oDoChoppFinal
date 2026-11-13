import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

export interface RequisicaoAutenticada extends Request {
  usuarioId?: number;
  usuarioPapel?: string;
}

export async function middlewareAutenticacao(req: RequisicaoAutenticada, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  let usuarioId: number;
  try {
    ({ usuarioId } = jwt.verify(token, process.env.JWT_SECRET!) as { usuarioId: number });
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    // O papel é lido do banco (e não do token) para que excluir um usuário ou
    // mudar o papel dele valha imediatamente, sem esperar o token expirar.
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, excluidoEm: null },
      select: { id: true, papel: true },
    });
    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não encontrado ou desativado' });
    }
    req.usuarioId = usuario.id;
    req.usuarioPapel = usuario.papel;
    next();
  } catch {
    return res.status(500).json({ error: 'Erro ao validar a sessão' });
  }
}

export function apenasAdmin(req: RequisicaoAutenticada, res: Response, next: NextFunction) {
  if (req.usuarioPapel !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}
