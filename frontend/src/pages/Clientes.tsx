import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { TabelaSkeleton } from '../components/Skeleton';
import ModalConfirmacao from '../components/ModalConfirmacao';
import api from '../services/api';
import estilos from '../styles/compartilhado.module.css';
import { FiX } from 'react-icons/fi';
import { formatarTelefone } from '../utils/telefone';

interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [idExcluir, setIdExcluir] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const navegar = useNavigate();

  const buscarClientes = async (q = '') => {
    setCarregando(true);
    try {
      const { data } = await api.get('/clientes', { params: q ? { busca: q } : {} });
      setClientes(data);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { buscarClientes(); }, []);

  const aoDigitar = (valor: string) => {
    setBusca(valor);
    buscarClientes(valor);
  };

  const aoExcluir = async (id: number) => {
    try {
      await api.delete(`/clientes/${id}`);
      setIdExcluir(null);
      buscarClientes(busca);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao excluir cliente');
      setIdExcluir(null);
    }
  };

  return (
    <Layout>
      <div className={estilos.cabecalho}>
        <h1 className={estilos.titulo}>Clientes</h1>
        <button onClick={() => navegar('/clientes/novo')} className={estilos.botaoPrimario}>
          + Novo Cliente
        </button>
      </div>

      <div className={estilos.barraBusca}>
        <input
          type="text"
          placeholder="Buscar por nome, email ou telefone..."
          value={busca}
          onChange={(e) => aoDigitar(e.target.value)}
          className={estilos.entradaBusca}
        />
      </div>

      {erro && (
        <div className={estilos.caixaErro}>
          {erro}
          <button onClick={() => setErro('')} className={estilos.fecharErro}><FiX /></button>
        </div>
      )}

      <div className={estilos.cardTabela}>
        {carregando ? (
          <TabelaSkeleton colunas={5} />
        ) : clientes.length === 0 ? (
          <p className={estilos.vazio}>Nenhum cliente encontrado</p>
        ) : (
          <table className={`${estilos.tabela} fadeIn`}>
            <thead>
              <tr>
                {['Nome', 'Email', 'Telefone', 'Endereço', 'Ações'].map((h) => (
                  <th key={h} className={estilos.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className={estilos.tr}>
                  <td className={estilos.td} data-label="Nome">{cliente.nome}</td>
                  <td className={estilos.td} data-label="Email">{cliente.email}</td>
                  <td className={estilos.td} data-label="Telefone">{formatarTelefone(cliente.telefone)}</td>
                  <td className={estilos.td} data-label="Endereço">{cliente.endereco}</td>
                  <td className={estilos.td} data-label="Ações">
                    <div className={estilos.acoes}>
                      <button onClick={() => navegar(`/clientes/editar/${cliente.id}`)} className={estilos.botaoEditar}>Editar</button>
                      <button onClick={() => setIdExcluir(cliente.id)} className={estilos.botaoExcluir}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalConfirmacao
        aberto={idExcluir !== null}
        titulo="Confirmar exclusão"
        mensagem="Tem certeza que deseja excluir este cliente?"
        textoConfirmar="Excluir"
        variante="perigo"
        aoConfirmar={() => idExcluir !== null && aoExcluir(idExcluir)}
        aoCancelar={() => setIdExcluir(null)}
      />
    </Layout>
  );
}
