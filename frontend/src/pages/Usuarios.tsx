import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import Layout from '../components/Layout';
import { TabelaSkeleton } from '../components/Skeleton';
import ModalConfirmacao from '../components/ModalConfirmacao';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import estilos from '../styles/compartilhado.module.css';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: 'ADMIN' | 'FUNCIONARIO';
  criadoEm: string;
}

const rotuloPapel: Record<string, string> = { ADMIN: 'Administrador', FUNCIONARIO: 'Funcionário' };
const corPapel: Record<string, string> = { ADMIN: '#AA5A21', FUNCIONARIO: '#3b82f6' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [idExcluir, setIdExcluir] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const navegar = useNavigate();
  const { usuario: usuarioAtual } = useAuth();

  const buscarUsuarios = async () => {
    setCarregando(true);
    try { const { data } = await api.get('/usuarios'); setUsuarios(data); }
    finally { setCarregando(false); }
  };

  useEffect(() => { buscarUsuarios(); }, []);

  const aoExcluir = async (id: number) => {
    try { await api.delete(`/usuarios/${id}`); setIdExcluir(null); buscarUsuarios(); }
    catch (err: any) { setErro(err.response?.data?.error || 'Erro ao excluir usuário'); setIdExcluir(null); }
  };

  const formatarData = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <Layout>
      <div className={estilos.cabecalho}>
        <h1 className={estilos.titulo}>Usuários</h1>
        <button onClick={() => navegar('/usuarios/novo')} className={estilos.botaoPrimario}>+ Novo Usuário</button>
      </div>

      {erro && (<div className={estilos.caixaErro}>{erro}<button onClick={() => setErro('')} className={estilos.fecharErro}><FiX /></button></div>)}

      <div className={estilos.cardTabela}>
        {carregando ? (<TabelaSkeleton colunas={5} />) : usuarios.length === 0 ? (<p className={estilos.vazio}>Nenhum usuário encontrado</p>) : (
          <table className={`${estilos.tabela} fadeIn`}>
            <thead><tr>{['Nome', 'Email', 'Papel', 'Cadastrado em', 'Ações'].map((h) => (<th key={h} className={estilos.th}>{h}</th>))}</tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={estilos.tr}>
                  <td className={estilos.td} data-label="Nome">{u.nome}{u.id === usuarioAtual?.id && <span className={estilos.badgeVoce}>você</span>}</td>
                  <td className={estilos.td} data-label="Email">{u.email}</td>
                  <td className={estilos.td} data-label="Papel">
                    <span className={estilos.badge} style={{ backgroundColor: `${corPapel[u.papel]}22`, color: corPapel[u.papel], border: `1px solid ${corPapel[u.papel]}44` }}>{rotuloPapel[u.papel]}</span>
                  </td>
                  <td className={estilos.td} data-label="Cadastrado em">{formatarData(u.criadoEm)}</td>
                  <td className={estilos.td} data-label="Ações">
                    <div className={estilos.acoes}>
                      <button onClick={() => navegar(`/usuarios/editar/${u.id}`)} className={estilos.botaoEditar}>Editar</button>
                      {u.id !== usuarioAtual?.id && (<button onClick={() => setIdExcluir(u.id)} className={estilos.botaoExcluir}>Excluir</button>)}
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
        mensagem="Tem certeza que deseja excluir este usuário?"
        textoConfirmar="Excluir"
        variante="perigo"
        aoConfirmar={() => idExcluir !== null && aoExcluir(idExcluir)}
        aoCancelar={() => setIdExcluir(null)}
      />
    </Layout>
  );
}
