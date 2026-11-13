import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import estilos from '../styles/compartilhado.module.css';

export default function FormularioUsuario() {
  const { id } = useParams();
  const navegar = useNavigate();
  const modoEdicao = !!id;
  const { usuario: usuarioAtual } = useAuth();

  const [formulario, setFormulario] = useState({ nome: '', email: '', senha: '', papel: 'FUNCIONARIO' });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (modoEdicao) {
      const carregarUsuario = async () => {
        try {
          const { data } = await api.get(`/usuarios/${id}`);
          setFormulario({ nome: data.nome, email: data.email, senha: '', papel: data.papel });
        } catch (err: any) {
          setErro(err.response?.data?.error || 'Erro ao carregar o usuário. Verifique sua conexão e tente novamente.');
        }
      };
      carregarUsuario();
    }
  }, [id]);

  const aoAlterar = (campo: string, valor: string) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const aoEnviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(''); setSucesso('');
    if (!formulario.nome || !formulario.email || !formulario.papel) {
      setErro('Nome, email e papel são obrigatórios'); return;
    }
    if (!modoEdicao && !formulario.senha) {
      setErro('A senha é obrigatória para novos usuários'); return;
    }
    if (formulario.senha && formulario.senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres'); return;
    }
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(formulario.email)) {
      setErro('Informe um email válido'); return;
    }

    setCarregando(true);
    try {
      if (modoEdicao) {
        const dados: any = { nome: formulario.nome, email: formulario.email, papel: formulario.papel };
        if (formulario.senha) dados.senha = formulario.senha;
        await api.put(`/usuarios/${id}`, dados);
        setSucesso('Usuário atualizado com sucesso!');
      } else {
        await api.post('/usuarios', formulario);
        setSucesso('Usuário cadastrado com sucesso!');
      }
      setTimeout(() => navegar('/usuarios'), 1200);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar usuário');
    } finally { setCarregando(false); }
  };

  const eProprioUsuario = modoEdicao && usuarioAtual?.id === Number(id);

  return (
    <Layout>
      <div className={estilos.cabecalhoForm}>
        <button onClick={() => navegar('/usuarios')} className={estilos.botaoVoltar}>← Voltar</button>
        <h1 className={estilos.titulo}>{modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}</h1>
      </div>
      <div className={estilos.card}>
        <form onSubmit={aoEnviar} className={estilos.formulario}>
          <div className={estilos.grade}>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Nome completo *</label>
              <input type="text" value={formulario.nome} onChange={(e) => aoAlterar('nome', e.target.value)} placeholder="Nome do usuário" className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Email *</label>
              <input type="email" value={formulario.email} onChange={(e) => aoAlterar('email', e.target.value)} placeholder="email@exemplo.com" className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>{modoEdicao ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}</label>
              <input type="password" value={formulario.senha} onChange={(e) => aoAlterar('senha', e.target.value)} placeholder={modoEdicao ? 'Digite para alterar' : 'Mínimo 6 caracteres'} className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Papel *</label>
              <select value={formulario.papel} onChange={(e) => aoAlterar('papel', e.target.value)} className={estilos.selecao} disabled={eProprioUsuario}>
                <option value="FUNCIONARIO">Funcionário</option>
                <option value="ADMIN">Administrador</option>
              </select>
              {eProprioUsuario && <span className={estilos.dica}>Você não pode alterar seu próprio papel</span>}
            </div>
          </div>
          {erro && <div className={estilos.mensagemErro}>{erro}</div>}
          {sucesso && <div className={estilos.mensagemSucesso}>{sucesso}</div>}
          <div className={estilos.acoesFormulario}>
            <button type="button" onClick={() => navegar('/usuarios')} className={estilos.botaoCancelar}>Cancelar</button>
            <button type="submit" disabled={carregando} className={estilos.botaoSalvar}>{carregando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
