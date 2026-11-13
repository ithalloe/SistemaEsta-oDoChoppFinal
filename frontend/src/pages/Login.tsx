import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import estilos from '../styles/Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { entrar } = useAuth();
  const navegar = useNavigate();

  const aoEnviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email || !senha) {
      setErro('Preencha todos os campos');
      return;
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
      setErro('Informe um email válido');
      return;
    }

    setCarregando(true);
    try {
      const { data } = await api.post('/autenticacao/login', { email, senha });
      entrar(data.token, data.usuario);
      navegar('/dashboard');
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao realizar login');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className={estilos.container}>
      <div className={estilos.card}>
        <div className={estilos.areaLogo}>
          <img src="/logo.png" alt="Estação do Chopp" className={estilos.logo} />
        </div>

        <h1 className={estilos.titulo}>Acesso ao Sistema</h1>
        <p className={estilos.subtitulo}>Gestão de Pedidos e Entregas</p>

        <form onSubmit={aoEnviar} className={estilos.formulario}>
          <div className={estilos.campo}>
            <label className={estilos.rotulo}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={estilos.entrada}
              autoComplete="email"
            />
          </div>

          <div className={estilos.campo}>
            <label className={estilos.rotulo}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className={estilos.entrada}
              autoComplete="current-password"
            />
          </div>

          {erro && <div className={estilos.mensagemErro}>{erro}</div>}

          <button type="submit" disabled={carregando} className={estilos.botao}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
