// Ponto de entrada na Vercel: cada requisição é atendida por esta função serverless,
// que repassa para o mesmo app Express usado localmente.
import app from '../src/app';

export default app;
