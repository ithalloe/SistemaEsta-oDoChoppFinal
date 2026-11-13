import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { TabelaSkeleton } from '../components/Skeleton';
import ModalConfirmacao from '../components/ModalConfirmacao';
import api from '../services/api';
import { formatarTelefone } from '../utils/telefone';
import estilos from '../styles/compartilhado.module.css';
import ep from '../styles/Pedidos.module.css';

interface ItemPedido {
  id: number;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
  produto: { nome: string; tamanho: string };
}

interface Pedido {
  id: number;
  cliente: { nome: string; email: string; telefone: string; endereco: string };
  usuario: { nome: string };
  criadoEm: string;
  atualizadoEm: string;
  valorTotal: number;
  status: string;
  itens: ItemPedido[];
}

const rotuloStatus: Record<string, string> = { PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' };
const corStatus: Record<string, string> = { PENDENTE: '#f59e0b', EM_ANDAMENTO: '#3b82f6', CONCLUIDO: '#22c55e', CANCELADO: '#ef4444' };
const rotuloTamanho: Record<string, string> = { BARRIL_30L: 'Barril 30L', BARRIL_50L: 'Barril 50L' };
// Próxima etapa de cada status (o pedido só avança; CONCLUIDO e CANCELADO são finais).
const proximoStatus: Record<string, string> = { PENDENTE: 'EM_ANDAMENTO', EM_ANDAMENTO: 'CONCLUIDO' };

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [pedidoDetalhe, setPedidoDetalhe] = useState<Pedido | null>(null);
  // Confirmação em modal: guarda a ação pendente (avançar ou cancelar) e seus textos.
  const [confirmacao, setConfirmacao] = useState<{
    titulo: string;
    mensagem: React.ReactNode;
    textoConfirmar: string;
    acao: () => Promise<void>;
  } | null>(null);
  const [processando, setProcessando] = useState(false);
  const navegar = useNavigate();

  const buscarPedidos = async (q = '') => {
    setCarregando(true);
    try { const { data } = await api.get('/pedidos', { params: q ? { busca: q } : {} }); setPedidos(data); }
    finally { setCarregando(false); }
  };

  useEffect(() => { buscarPedidos(); }, []);

  const aoDigitar = (valor: string) => { setBusca(valor); buscarPedidos(valor); };
  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const formatarDataHora = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const numeroPedido = (id: number) => `#${String(id).padStart(4, '0')}`;

  const badgeStatus = (status: string) => (
    <span className={estilos.badge} style={{ backgroundColor: `${corStatus[status]}22`, color: corStatus[status], border: `1px solid ${corStatus[status]}44` }}>
      {rotuloStatus[status]}
    </span>
  );

  // Executa a ação confirmada e fecha o modal, tratando erro e loading.
  const executarConfirmacao = async () => {
    if (!confirmacao) return;
    setProcessando(true);
    try {
      await confirmacao.acao();
    } finally {
      setProcessando(false);
      setConfirmacao(null);
    }
  };

  const avancarStatus = (pedido: Pedido) => {
    const proximo = proximoStatus[pedido.status];
    const concluindo = proximo === 'CONCLUIDO';
    setConfirmacao({
      titulo: concluindo ? 'Concluir pedido' : 'Avançar pedido',
      mensagem: (
        <>
          Avançar o pedido <strong>{numeroPedido(pedido.id)}</strong> para{' '}
          <strong>"{rotuloStatus[proximo]}"</strong>?
          {concluindo && (
            <><br />Ao concluir, o estoque dos itens será baixado.</>
          )}
        </>
      ),
      textoConfirmar: concluindo ? 'Concluir' : 'Avançar',
      acao: async () => {
        try {
          await api.patch(`/pedidos/${pedido.id}/avancar`);
          setMensagem(`Pedido ${numeroPedido(pedido.id)} atualizado com sucesso para "${rotuloStatus[proximo]}"!`);
          setTimeout(() => setMensagem(''), 3000);
          buscarPedidos(busca);
        } catch (err: any) {
          setMensagem(err.response?.data?.error || 'Erro ao avançar status do pedido');
          setTimeout(() => setMensagem(''), 3000);
        }
      },
    });
  };

  const cancelarPedido = (id: number) => {
    setConfirmacao({
      titulo: 'Cancelar pedido',
      mensagem: (
        <>
          Tem certeza que deseja cancelar o pedido <strong>{numeroPedido(id)}</strong>? Esta ação não pode ser desfeita.
        </>
      ),
      textoConfirmar: 'Cancelar pedido',
      acao: async () => {
        try {
          await api.patch(`/pedidos/${id}/cancelar`);
          setMensagem('Pedido cancelado com sucesso!');
          setTimeout(() => setMensagem(''), 3000);
          buscarPedidos(busca);
        } catch (err: any) {
          setMensagem(err.response?.data?.error || 'Erro ao cancelar pedido');
          setTimeout(() => setMensagem(''), 3000);
        }
      },
    });
  };

  return (
    <Layout>
      <div className={estilos.cabecalho}>
        <h1 className={estilos.titulo}>Pedidos</h1>
        <button onClick={() => navegar('/pedidos/novo')} className={estilos.botaoPrimario}>+ Novo Pedido</button>
      </div>

      <div className={estilos.barraBusca}>
        <input type="text" placeholder="Buscar por cliente ou produto..." value={busca} onChange={(e) => aoDigitar(e.target.value)} className={estilos.entradaBusca} />
      </div>

      {mensagem && (
        <div className={mensagem.includes('sucesso') ? estilos.mensagemSucesso : estilos.mensagemErro} style={{ marginBottom: '16px' }}>
          {mensagem}
        </div>
      )}

      <div className={estilos.cardTabela}>
        {carregando ? (<TabelaSkeleton colunas={6} />) : pedidos.length === 0 ? (<p className={estilos.vazio}>Nenhum pedido encontrado</p>) : (
          <table className={`${estilos.tabela} fadeIn`}>
            <thead><tr>{['Pedido', 'Cliente', 'Data', 'Valor', 'Status', 'Ações'].map((h) => (<th key={h} className={estilos.th}>{h}</th>))}</tr></thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id} className={estilos.tr}>
                  <td className={estilos.td} data-label="Pedido">{numeroPedido(pedido.id)}</td>
                  <td className={estilos.td} data-label="Cliente">{pedido.cliente.nome}</td>
                  <td className={estilos.td} data-label="Data">{formatarData(pedido.criadoEm)}</td>
                  <td className={estilos.td} data-label="Valor">{formatarMoeda(pedido.valorTotal)}</td>
                  <td className={estilos.td} data-label="Status">{badgeStatus(pedido.status)}</td>
                  <td className={estilos.td} data-label="Ações">
                    <div className={estilos.acoes}>
                    <button onClick={() => setPedidoDetalhe(pedido)} className={estilos.botaoEditar}>Detalhes</button>
                    {proximoStatus[pedido.status] && (
                      <button onClick={() => avancarStatus(pedido)} className={estilos.botaoEditar} style={{ borderColor: '#22c55e', color: '#22c55e' }}>
                        {proximoStatus[pedido.status] === 'CONCLUIDO' ? 'Concluir' : 'Iniciar'}
                      </button>
                    )}
                    {pedido.status !== 'CANCELADO' && (
                      <>
                        <button onClick={() => navegar(`/pedidos/editar/${pedido.id}`)} className={estilos.botaoEditar}>Editar</button>
                        <button onClick={() => cancelarPedido(pedido.id)} className={estilos.botaoExcluir}>Cancelar</button>
                      </>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pedidoDetalhe && (
        <div className={estilos.sobreposicaoModal} onClick={() => setPedidoDetalhe(null)}>
          <div className={ep.modalDetalhes} onClick={(e) => e.stopPropagation()}>
            <div className={ep.cabecalhoDetalhes}>
              <h3 className={estilos.tituloModal} style={{ marginBottom: 0 }}>Pedido {numeroPedido(pedidoDetalhe.id)}</h3>
              {badgeStatus(pedidoDetalhe.status)}
            </div>

            <div className={ep.gradeInfo}>
              <div><p className={ep.rotuloInfo}>Cliente</p><p className={ep.valorInfo}>{pedidoDetalhe.cliente.nome}</p></div>
              <div><p className={ep.rotuloInfo}>Telefone</p><p className={ep.valorInfo}>{formatarTelefone(pedidoDetalhe.cliente.telefone)}</p></div>
              <div><p className={ep.rotuloInfo}>Email</p><p className={ep.valorInfo}>{pedidoDetalhe.cliente.email}</p></div>
              <div><p className={ep.rotuloInfo}>Endereço de entrega</p><p className={ep.valorInfo}>{pedidoDetalhe.cliente.endereco}</p></div>
              <div><p className={ep.rotuloInfo}>Registrado por</p><p className={ep.valorInfo}>{pedidoDetalhe.usuario.nome}</p></div>
              <div><p className={ep.rotuloInfo}>Criado em</p><p className={ep.valorInfo}>{formatarDataHora(pedidoDetalhe.criadoEm)}</p></div>
              <div><p className={ep.rotuloInfo}>Última atualização</p><p className={ep.valorInfo}>{formatarDataHora(pedidoDetalhe.atualizadoEm)}</p></div>
            </div>

            <h4 className={ep.tituloSecao}>Itens do pedido</h4>
            <div className={ep.tabelaItens}>
              <table className={estilos.tabela}>
                <thead><tr>{['Produto', 'Tamanho', 'Qtd.', 'Valor unit.', 'Total'].map((h) => (<th key={h} className={estilos.th}>{h}</th>))}</tr></thead>
                <tbody>
                  {pedidoDetalhe.itens.map((item) => (
                    <tr key={item.id} className={estilos.tr}>
                      <td className={estilos.td}>{item.produto.nome}</td>
                      <td className={estilos.td}>{rotuloTamanho[item.produto.tamanho] ?? item.produto.tamanho}</td>
                      <td className={estilos.td}>{item.quantidade}</td>
                      <td className={estilos.td}>{formatarMoeda(item.precoUnitario)}</td>
                      <td className={estilos.td}>{formatarMoeda(item.precoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={ep.linhaTotal}>
              <span className={ep.rotuloTotal}>Valor total:</span>
              <span className={ep.valorTotal}>{formatarMoeda(pedidoDetalhe.valorTotal)}</span>
            </div>

            <div className={estilos.acoesModal}>
              <button onClick={() => setPedidoDetalhe(null)} className={estilos.botaoCancelar}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirmacao
        aberto={!!confirmacao}
        titulo={confirmacao?.titulo ?? ''}
        mensagem={confirmacao?.mensagem}
        textoConfirmar={confirmacao?.textoConfirmar ?? 'Confirmar'}
        variante="perigo"
        carregando={processando}
        aoConfirmar={executarConfirmacao}
        aoCancelar={() => setConfirmacao(null)}
      />
    </Layout>
  );
}
