import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import estilos from '../styles/compartilhado.module.css';
import { apenasDigitos, formatarTelefone } from '../utils/telefone';

export default function FormularioCliente() {
  const { id } = useParams();
  const navegar = useNavigate();
  const modoEdicao = !!id;

  const [formulario, setFormulario] = useState({ nome: '', email: '', telefone: '', endereco: '' });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (modoEdicao) {
      const carregarCliente = async () => {
        try {
          const { data } = await api.get(`/clientes/${id}`);
          // O banco guarda só dígitos; aplicamos a máscara para exibir no formulário.
          setFormulario({ ...data, telefone: formatarTelefone(data.telefone) });
        } catch (err: any) {
          setErro(err.response?.data?.error || 'Erro ao carregar o cliente. Verifique sua conexão e tente novamente.');
        }
      };
      carregarCliente();
    }
  }, [id]);

  const aoAlterar = (campo: string, valor: string) => {
    if (campo === 'telefone') {
      // Mantém a máscara na digitação (boa UX), mas o dado cru é só dígitos.
      setFormulario((prev) => ({ ...prev, telefone: formatarTelefone(valor) }));
      return;
    }
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const aoEnviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!formulario.nome || !formulario.email || !formulario.telefone || !formulario.endereco) {
      setErro('Todos os campos são obrigatórios');
      return;
    }
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(formulario.email)) {
      setErro('Informe um email válido');
      return;
    }
    const regexTelefone = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;
    if (!regexTelefone.test(formulario.telefone)) {
      setErro('Telefone deve estar no formato (XX) XXXXX-XXXX');
      return;
    }
    if (formulario.endereco.trim().length < 5) {
      setErro('Endereço deve ter no mínimo 5 caracteres');
      return;
    }

    setCarregando(true);
    // Envia o telefone sem máscara (apenas dígitos) para o banco.
    const dados = { ...formulario, telefone: apenasDigitos(formulario.telefone) };
    try {
      if (modoEdicao) {
        await api.put(`/clientes/${id}`, dados);
        setSucesso('Cliente atualizado com sucesso!');
      } else {
        await api.post('/clientes', dados);
        setSucesso('Cliente cadastrado com sucesso!');
      }
      setTimeout(() => navegar('/clientes'), 1200);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar cliente');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Layout>
      <div className={estilos.cabecalhoForm}>
        <button onClick={() => navegar('/clientes')} className={estilos.botaoVoltar}>← Voltar</button>
        <h1 className={estilos.titulo}>{modoEdicao ? 'Editar Cliente' : 'Novo Cliente'}</h1>
      </div>

      <div className={estilos.card}>
        <form onSubmit={aoEnviar} className={estilos.formulario}>
          <div className={estilos.grade}>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Nome completo *</label>
              <input type="text" value={formulario.nome} onChange={(e) => aoAlterar('nome', e.target.value)} placeholder="Nome do cliente" className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Email *</label>
              <input type="email" value={formulario.email} onChange={(e) => aoAlterar('email', e.target.value)} placeholder="email@exemplo.com" className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Telefone *</label>
              <input type="text" value={formulario.telefone} onChange={(e) => aoAlterar('telefone', e.target.value)} placeholder="(00) 00000-0000" className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Endereço *</label>
              <input type="text" value={formulario.endereco} onChange={(e) => aoAlterar('endereco', e.target.value)} placeholder="Rua, número, bairro" className={estilos.entrada} />
            </div>
          </div>

          {erro && <div className={estilos.mensagemErro}>{erro}</div>}
          {sucesso && <div className={estilos.mensagemSucesso}>{sucesso}</div>}

          <div className={estilos.acoesFormulario}>
            <button type="button" onClick={() => navegar('/clientes')} className={estilos.botaoCancelar}>Cancelar</button>
            <button type="submit" disabled={carregando} className={estilos.botaoSalvar}>
              {carregando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
