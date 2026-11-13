import { useEffect, useState } from 'react';
import { FiUsers, FiShoppingCart, FiClock, FiDollarSign } from 'react-icons/fi';
import Layout from '../components/Layout';
import { CardsSkeleton, TabelaSkeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import estilos from '../styles/Dashboard.module.css';

interface DadosDashboard {
  totalClientes: number;
  pedidosHoje: number;
  pedidosPendentes: number;
  receitaTotal: number | null; // o backend só envia para administradores
  pedidosRecentes: Array<{
    id: number;
    cliente: { nome: string };
    criadoEm: string;
    valorTotal: number;
    status: string;
  }>;
}

const rotuloStatus: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const corStatus: Record<string, string> = {
  PENDENTE: '#f59e0b',
  EM_ANDAMENTO: '#3b82f6',
  CONCLUIDO: '#22c55e',
  CANCELADO: '#ef4444',
};

export default function Dashboard() {
  const { usuario, eAdmin } = useAuth();
  const [dados, setDados] = useState<DadosDashboard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const carregarDashboard = async () => {
      setCarregando(true);
      try {
        const { data } = await api.get('/dashboard');
        setDados(data);
      } catch (err: any) {
        setErro(err.response?.data?.error || 'Erro ao carregar o dashboard. Verifique sua conexão e tente novamente.');
      } finally {
        setCarregando(false);
      }
    };
    carregarDashboard();
  }, []);

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatarData = (data: string) =>
    new Date(data).toLocaleDateString('pt-BR');

  return (
    <Layout>
      <div className={estilos.cabecalho}>
        <h1 className={estilos.titulo}>Dashboard</h1>
        <p className={estilos.saudacao}>Olá, {usuario?.nome}. Bem-vindo ao sistema.</p>
      </div>

      {erro && <p className={estilos.carregando}>{erro}</p>}

      {carregando ? (
        <>
          <div style={{ marginBottom: '32px' }}>
            <CardsSkeleton quantidade={4} />
          </div>
          <div className={estilos.secaoTabela}>
            <TabelaSkeleton colunas={5} />
          </div>
        </>
      ) : erro ? null : (
        <div className="fadeIn">
          <div className={estilos.cards}>
            <div className={estilos.card}>
              <div className={estilos.iconeCard}><FiUsers /></div>
              <div>
                <p className={estilos.rotuloCard}>Total de Clientes</p>
                <p className={estilos.valorCard}>{dados?.totalClientes ?? 0}</p>
              </div>
            </div>
            <div className={estilos.card}>
              <div className={estilos.iconeCard}><FiShoppingCart /></div>
              <div>
                <p className={estilos.rotuloCard}>Pedidos do Dia</p>
                <p className={estilos.valorCard}>{dados?.pedidosHoje ?? 0}</p>
              </div>
            </div>
            <div className={estilos.card}>
              <div className={estilos.iconeCard}><FiClock /></div>
              <div>
                <p className={estilos.rotuloCard}>Pedidos Pendentes</p>
                <p className={estilos.valorCard}>{dados?.pedidosPendentes ?? 0}</p>
              </div>
            </div>
            {/* Faturamento é informação financeira: só o administrador vê */}
            {eAdmin && (
              <div className={`${estilos.card} ${estilos.cardDestaque}`}>
                <div className={estilos.iconeCard}><FiDollarSign /></div>
                <div>
                  <p className={estilos.rotuloCard}>Faturamento Total</p>
                  <p className={`${estilos.valorCard} ${estilos.valorCardDestaque}`}>
                    {formatarMoeda(dados?.receitaTotal ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={estilos.secaoTabela}>
            <h2 className={estilos.tituloSecao}>Últimos Pedidos</h2>
            <div className={estilos.wrapperTabela}>
              <table className={estilos.tabela}>
                <thead>
                  <tr>
                    {['Pedido', 'Cliente', 'Data', 'Valor', 'Status'].map((h) => (
                      <th key={h} className={estilos.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados?.pedidosRecentes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={estilos.vazio}>Nenhum pedido encontrado</td>
                    </tr>
                  ) : (
                    dados?.pedidosRecentes.map((pedido) => (
                      <tr key={pedido.id} className={estilos.tr}>
                        <td className={estilos.td} data-label="Pedido">#{String(pedido.id).padStart(4, '0')}</td>
                        <td className={estilos.td} data-label="Cliente">{pedido.cliente.nome}</td>
                        <td className={estilos.td} data-label="Data">{formatarData(pedido.criadoEm)}</td>
                        <td className={estilos.td} data-label="Valor">{formatarMoeda(pedido.valorTotal)}</td>
                        <td className={estilos.td} data-label="Status">
                          <span
                            className={estilos.badge}
                            style={{
                              backgroundColor: `${corStatus[pedido.status]}22`,
                              color: corStatus[pedido.status],
                              border: `1px solid ${corStatus[pedido.status]}44`,
                            }}
                          >
                            {rotuloStatus[pedido.status]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
