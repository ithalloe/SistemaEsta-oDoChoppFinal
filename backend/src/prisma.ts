import { PrismaClient } from '@prisma/client';

// Instância única do Prisma, usada por todas as rotas (evita abrir várias conexões com o banco).
const prisma = new PrismaClient();

export default prisma;
