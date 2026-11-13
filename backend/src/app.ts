import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Prisma } from '@prisma/client';
import rotasAutenticacao from './routes/auth';
import rotasClientes from './routes/clientes';
import rotasProdutos from './routes/produtos';
import rotasPedidos from './routes/pedidos';
import rotasDashboard from './routes/dashboard';
import rotasUsuarios from './routes/usuarios';
import rotasRelatorios from './routes/relatorios';
import rotasItensPedido from './routes/itensPedido';

// Configuração da aplicação Express, sem subir servidor.
// Localmente quem sobe é o src/index.ts; na Vercel, o api/index.ts exporta este app.

dotenv.config();

// Sem uma chave própria, qualquer um conseguiria assinar tokens válidos.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido. Configure-o no .env (local) ou nas variáveis de ambiente da hospedagem.');
}

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Converte Prisma.Decimal para number recursivamente antes de serializar em JSON.
// Necessário porque o Prisma serializa Decimal como string, o que quebra o frontend.
function converterDecimais(valor: any): any {
  if (valor instanceof Prisma.Decimal) return valor.toNumber();
  if (Array.isArray(valor)) return valor.map(converterDecimais);
  if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    const r: Record<string, any> = {};
    for (const k of Object.keys(valor)) r[k] = converterDecimais(valor[k]);
    return r;
  }
  return valor;
}

app.use((_req, res, next) => {
  const jsonOriginal = res.json.bind(res);
  res.json = (corpo: any) => jsonOriginal(converterDecimais(corpo));
  next();
});

app.use('/api/autenticacao', rotasAutenticacao);
app.use('/api/clientes', rotasClientes);
app.use('/api/produtos', rotasProdutos);
app.use('/api/pedidos', rotasPedidos);
app.use('/api/pedidos', rotasItensPedido);
app.use('/api/dashboard', rotasDashboard);
app.use('/api/usuarios', rotasUsuarios);
app.use('/api/relatorios', rotasRelatorios);

export default app;
