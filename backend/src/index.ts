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

dotenv.config();

// Sem uma chave própria, qualquer um conseguiria assinar tokens válidos.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não definido no .env. Configure-o antes de iniciar o servidor.');
  process.exit(1);
}

const app = express();
const PORTA = process.env.PORT || 3001;

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

app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});
