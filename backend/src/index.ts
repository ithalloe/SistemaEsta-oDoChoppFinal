import app from './app';

// Servidor local (npm run dev / npm start). Na Vercel este arquivo não é usado.
const PORTA = process.env.PORT || 3001;

app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});
