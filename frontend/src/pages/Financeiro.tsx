import { useEffect, useState } from 'react';
import { IconType } from 'react-icons';
import { FiBarChart2, FiCalendar, FiTag, FiAward, FiClipboard, FiDollarSign, FiUsers, FiPackage } from 'react-icons/fi';
import { FiFileText, FiDownload } from 'react-icons/fi';
import Layout from '../components/Layout';
import { CardsSkeleton, TabelaSkeleton } from '../components/Skeleton';
import api from '../services/api';
import { baixarArquivo } from '../services/download';
import estilos from '../styles/compartilhado.module.css';
import ef from '../styles/Financeiro.module.css';

// Tipos

interface OpcaoCliente { id: number; nome: string }

interface PorCliente { clienteId: number; nomeCliente: string; totalPedidos: number; totalReceita: number }
interface PorProduto { produtoId: number; nomeProduto: string; totalQuantidade: number; totalReceita: number }
interface RelatorioVendas { totalPedidos: number; totalReceita: number; porCliente: PorCliente[]; porProduto: PorProduto[] }

interface LinhaMensal { mes: string; totalPedidos: number; totalReceita: number }

interface TicketPorCliente { clienteId: number; nomeCliente: string; totalPedidos: number; totalReceita: number; ticketMedio: number }
interface RelatorioTicket { ticketMedioGeral: number; totalPedidos: number; porCliente: TicketPorCliente[] }

interface ProdutoLucrativo { posicao: number; produtoId: number; nomeProduto: string; totalQuantidade: number; totalReceita: number; percentual: number }
interface RelatorioProdutos { totalReceita: number; produtos: ProdutoLucrativo[] }

type Aba = 'vendas' | 'mensal' | 'ticket' | 'produtos-lucrativos';

// Componente

export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('vendas');
  const [clientes, setClientes] = useState<OpcaoCliente[]>([]);

  const [filtrosVendas, setFiltrosVendas] = useState({ dataInicio: '', dataFim: '', clienteId: '' });
  const [relatorioVendas, setRelatorioVendas] = useState<RelatorioVendas | null>(null);
  const [carregandoVendas, setCarregandoVendas] = useState(false);
  const [buscouVendas, setBuscouVendas] = useState(false);

  const [dadosMensais, setDadosMensais] = useState<LinhaMensal[] | null>(null);
  const [carregandoMensal, setCarregandoMensal] = useState(false);
  const [buscouMensal, setBuscouMensal] = useState(false);

  const [dadosTicket, setDadosTicket] = useState<RelatorioTicket | null>(null);
  const [carregandoTicket, setCarregandoTicket] = useState(false);
  const [buscouTicket, setBuscouTicket] = useState(false);

  const [dadosProdutos, setDadosProdutos] = useState<RelatorioProdutos | null>(null);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [buscouProdutos, setBuscouProdutos] = useState(false);

  const [erro, setErro] = useState('');
  const [exportando, setExportando] = useState<string | null>(null);
  // Filtros usados na última geração: a exportação usa estes, e não o que está
  // digitado no formulário, para o arquivo bater com o que aparece na tela.
  const [filtrosAplicados, setFiltrosAplicados] = useState<Record<string, string>>({});

  // Baixa um relatório em PDF ou Excel. `exportando` guarda qual botão está carregando.
  const exportar = async (rota: string, formato: 'pdf' | 'excel', params: Record<string, string> = {}) => {
    setErro('');
    setExportando(`${rota}-${formato}`);
    try {
      await baixarArquivo(`/relatorios/${rota}/export`, { ...params, formato });
    } catch {
      setErro('Erro ao exportar o relatório. Tente novamente.');
    } finally {
      setExportando(null);
    }
  };

  useEffect(() => {
    const carregarClientes = async () => {
      try {
        const { data } = await api.get('/relatorios/clientes');
        setClientes(data);
      } catch (err: any) {
        setErro(err.response?.data?.error || 'Erro ao carregar a lista de clientes. Verifique sua conexão e tente novamente.');
      }
    };
    carregarClientes();
  }, []);

  const formatarMoeda = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const gerarRelatorioVendas = async () => {
    setErro(''); setCarregandoVendas(true); setBuscouVendas(true);
    try {
      const parametros: Record<string, string> = {};
      if (filtrosVendas.dataInicio && filtrosVendas.dataFim) {
        if (new Date(filtrosVendas.dataFim) < new Date(filtrosVendas.dataInicio)) {
          setErro('A data final não pode ser menor que a data inicial');
          setCarregandoVendas(false);
          setBuscouVendas(false);
          return;
        }
      }
      if (filtrosVendas.dataInicio) parametros.dataInicio = filtrosVendas.dataInicio;
      if (filtrosVendas.dataFim) parametros.dataFim = filtrosVendas.dataFim;
      if (filtrosVendas.clienteId) parametros.clienteId = filtrosVendas.clienteId;
      const { data } = await api.get('/relatorios/vendas', { params: parametros });
      setRelatorioVendas(data);
      setFiltrosAplicados(parametros);
    } catch { setErro('Erro ao gerar relatório de vendas'); }
    finally { setCarregandoVendas(false); }
  };

  const limparVendas = () => {
    setFiltrosVendas({ dataInicio: '', dataFim: '', clienteId: '' });
    setRelatorioVendas(null); setBuscouVendas(false); setErro('');
  };

  const gerarRelatorioMensal = async () => {
    setErro(''); setCarregandoMensal(true); setBuscouMensal(true);
    try { const { data } = await api.get('/relatorios/mensal'); setDadosMensais(data); }
    catch { setErro('Erro ao gerar relatório mensal'); }
    finally { setCarregandoMensal(false); }
  };

  const gerarRelatorioTicket = async () => {
    setErro(''); setCarregandoTicket(true); setBuscouTicket(true);
    try { const { data } = await api.get('/relatorios/ticket-medio'); setDadosTicket(data); }
    catch { setErro('Erro ao gerar relatório de ticket médio'); }
    finally { setCarregandoTicket(false); }
  };

  const gerarRelatorioProdutos = async () => {
    setErro(''); setCarregandoProdutos(true); setBuscouProdutos(true);
    try { const { data } = await api.get('/relatorios/produtos-lucrativos'); setDadosProdutos(data); }
    catch { setErro('Erro ao gerar relatório de produtos'); }
    finally { setCarregandoProdutos(false); }
  };

  // Botões de exportar reutilizados por cada aba.
  const barraExportar = (rota: string, params: Record<string, string> = {}) => (
    <div className={ef.barraExportar}>
      <button onClick={() => exportar(rota, 'pdf', params)} disabled={!!exportando} className={`${ef.botaoExportar} ${ef.botaoExportarPdf}`}>
        <FiFileText /> {exportando === `${rota}-pdf` ? 'Gerando...' : 'Exportar PDF'}
      </button>
      <button onClick={() => exportar(rota, 'excel', params)} disabled={!!exportando} className={`${ef.botaoExportar} ${ef.botaoExportarExcel}`}>
        <FiDownload /> {exportando === `${rota}-excel` ? 'Gerando...' : 'Exportar Excel'}
      </button>
    </div>
  );

  const abas: { chave: Aba; rotulo: string; Icone: IconType }[] = [
    { chave: 'vendas', rotulo: 'Relatório de Vendas', Icone: FiBarChart2 },
    { chave: 'mensal', rotulo: 'Relatório Mensal', Icone: FiCalendar },
    { chave: 'ticket', rotulo: 'Ticket Médio', Icone: FiTag },
    { chave: 'produtos-lucrativos', rotulo: 'Produtos Lucrativos', Icone: FiAward },
  ];

  return (
    <Layout>
      <div className={estilos.cabecalho}>
        <h1 className={estilos.titulo}>Financeiro</h1>
      </div>

      <div className={ef.abas}>
        {abas.map((aba) => (
          <button key={aba.chave} onClick={() => { setAbaAtiva(aba.chave); setErro(''); }}
            className={`${ef.aba} ${abaAtiva === aba.chave ? ef.abaAtiva : ''}`}>
            <aba.Icone /><span>{aba.rotulo}</span>
          </button>
        ))}
      </div>

      {erro && <div className={estilos.mensagemErro}>{erro}</div>}

      {abaAtiva === 'vendas' && (
        <>
          <div className={ef.cardFiltro}>
            <div className={ef.gradeFiltro}>
              <div className={estilos.campo}>
                <label className={estilos.rotulo}>Data inicial</label>
                <input type="date" value={filtrosVendas.dataInicio} onChange={(e) => setFiltrosVendas(p => ({ ...p, dataInicio: e.target.value }))} className={estilos.entrada} />
              </div>
              <div className={estilos.campo}>
                <label className={estilos.rotulo}>Data final</label>
                <input type="date" value={filtrosVendas.dataFim} onChange={(e) => setFiltrosVendas(p => ({ ...p, dataFim: e.target.value }))} className={estilos.entrada} />
              </div>
              <div className={estilos.campo}>
                <label className={estilos.rotulo}>Cliente (opcional)</label>
                <select value={filtrosVendas.clienteId} onChange={(e) => setFiltrosVendas(p => ({ ...p, clienteId: e.target.value }))} className={estilos.selecao}>
                  <option value="">Todos os clientes</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className={ef.acoesFiltr}>
                <button onClick={limparVendas} className={ef.botaoLimpar}>Limpar</button>
                <button onClick={gerarRelatorioVendas} disabled={carregandoVendas} className={ef.botaoGerar}>
                  {carregandoVendas ? 'Gerando...' : 'Gerar'}
                </button>
              </div>
            </div>
          </div>

          {carregandoVendas && (
            <>
              <div style={{ marginBottom: '24px' }}><CardsSkeleton quantidade={4} /></div>
              <div className={estilos.cardTabela}><TabelaSkeleton colunas={3} /></div>
            </>
          )}

          {buscouVendas && !carregandoVendas && relatorioVendas && relatorioVendas.totalPedidos > 0 && (
            barraExportar('vendas', filtrosAplicados)
          )}

          {buscouVendas && !carregandoVendas && relatorioVendas && (
            <div className="fadeIn">
              <div className={ef.fileirCards}>
                {[
                  { Icone: FiClipboard, rotulo: 'Total de Pedidos', valor: relatorioVendas.totalPedidos },
                  { Icone: FiDollarSign, rotulo: 'Total em Vendas', valor: formatarMoeda(relatorioVendas.totalReceita) },
                  { Icone: FiUsers, rotulo: 'Clientes Atendidos', valor: relatorioVendas.porCliente.length },
                  { Icone: FiPackage, rotulo: 'Produtos Vendidos', valor: relatorioVendas.porProduto.length },
                ].map((card) => (
                  <div key={card.rotulo} className={ef.cardEstat}>
                    <span className={ef.iconeEstat}><card.Icone /></span>
                    <div><p className={ef.rotuloEstat}>{card.rotulo}</p><p className={ef.valorEstat}>{card.valor}</p></div>
                  </div>
                ))}
              </div>
              {relatorioVendas.totalPedidos === 0 ? (
                <div className={estilos.cardTabela}><p className={estilos.vazio}>Nenhuma venda encontrada.</p></div>
              ) : (
                <>
                  <div className={estilos.cardTabela}>
                    <h3 className={ef.tituloTabela}>Vendas por Cliente</h3>
                    <table className={estilos.tabela}>
                      <thead><tr>{['Cliente', 'Pedidos', 'Total Vendido'].map(h => <th key={h} className={estilos.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {relatorioVendas.porCliente.map((linha) => (
                          <tr key={linha.clienteId} className={estilos.tr}>
                            <td className={estilos.td} data-label="Cliente">{linha.nomeCliente}</td>
                            <td className={estilos.td} data-label="Pedidos">{linha.totalPedidos}</td>
                            <td className={`${estilos.td} ${ef.valorVerde}`} data-label="Total Vendido">{formatarMoeda(linha.totalReceita)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={estilos.cardTabela} style={{ marginTop: '20px' }}>
                    <h3 className={ef.tituloTabela}>Produtos Mais Vendidos</h3>
                    <table className={estilos.tabela}>
                      <thead><tr>{['Produto', 'Qtd. Vendida', 'Total'].map(h => <th key={h} className={estilos.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {relatorioVendas.porProduto.map((linha) => (
                          <tr key={linha.produtoId} className={estilos.tr}>
                            <td className={estilos.td} data-label="Produto">{linha.nomeProduto}</td>
                            <td className={estilos.td} data-label="Qtd. Vendida">{linha.totalQuantidade}</td>
                            <td className={`${estilos.td} ${ef.valorVerde}`} data-label="Total">{formatarMoeda(linha.totalReceita)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {abaAtiva === 'mensal' && (
        <>
          <div className={ef.cardFiltro}>
            <div className={ef.acoesFiltr}>
              <button onClick={gerarRelatorioMensal} disabled={carregandoMensal} className={ef.botaoGerar}>
                {carregandoMensal ? 'Gerando...' : 'Gerar Relatório Mensal'}
              </button>
            </div>
          </div>
          {carregandoMensal && (
            <div className={estilos.cardTabela}><TabelaSkeleton colunas={3} /></div>
          )}
          {buscouMensal && !carregandoMensal && dadosMensais && dadosMensais.length > 0 && (
            barraExportar('mensal')
          )}
          {buscouMensal && !carregandoMensal && dadosMensais && (
            dadosMensais.length === 0 ? (
              <div className={estilos.cardTabela}><p className={estilos.vazio}>Nenhuma venda registrada.</p></div>
            ) : (
              <div className={`${estilos.cardTabela} fadeIn`}>
                <h3 className={ef.tituloTabela}>Vendas por Mês</h3>
                <table className={estilos.tabela}>
                  <thead><tr>{['Mês', 'Pedidos', 'Total Vendido'].map(h => <th key={h} className={estilos.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {dadosMensais.map((linha, i) => (
                      <tr key={i} className={estilos.tr}>
                        <td className={estilos.td} data-label="Mês" style={{ textTransform: 'capitalize' }}>{linha.mes}</td>
                        <td className={estilos.td} data-label="Pedidos">{linha.totalPedidos}</td>
                        <td className={`${estilos.td} ${ef.valorVerde}`} data-label="Total Vendido">{formatarMoeda(linha.totalReceita)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {abaAtiva === 'ticket' && (
        <>
          <div className={ef.cardFiltro}>
            <div className={ef.acoesFiltr}>
              <button onClick={gerarRelatorioTicket} disabled={carregandoTicket} className={ef.botaoGerar}>
                {carregandoTicket ? 'Gerando...' : 'Gerar Relatório de Ticket Médio'}
              </button>
            </div>
          </div>
          {carregandoTicket && (
            <>
              <div style={{ marginBottom: '24px' }}><CardsSkeleton quantidade={2} /></div>
              <div className={estilos.cardTabela}><TabelaSkeleton colunas={4} /></div>
            </>
          )}
          {buscouTicket && !carregandoTicket && dadosTicket && dadosTicket.totalPedidos > 0 && (
            barraExportar('ticket-medio')
          )}
          {buscouTicket && !carregandoTicket && dadosTicket && (
            dadosTicket.totalPedidos === 0 ? (
              <div className={estilos.cardTabela}><p className={estilos.vazio}>Nenhuma venda registrada.</p></div>
            ) : (
              <div className="fadeIn">
                <div className={ef.fileirCards2}>
                  <div className={ef.cardEstat}><span className={ef.iconeEstat}><FiTag /></span><div><p className={ef.rotuloEstat}>Ticket Médio Geral</p><p className={ef.valorEstat}>{formatarMoeda(dadosTicket.ticketMedioGeral)}</p></div></div>
                  <div className={ef.cardEstat}><span className={ef.iconeEstat}><FiClipboard /></span><div><p className={ef.rotuloEstat}>Total de Pedidos</p><p className={ef.valorEstat}>{dadosTicket.totalPedidos}</p></div></div>
                </div>
                <div className={estilos.cardTabela}>
                  <h3 className={ef.tituloTabela}>Ticket Médio por Cliente</h3>
                  <table className={estilos.tabela}>
                    <thead><tr>{['Cliente', 'Pedidos', 'Total Gasto', 'Ticket Médio'].map(h => <th key={h} className={estilos.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {dadosTicket.porCliente.map((linha) => (
                        <tr key={linha.clienteId} className={estilos.tr}>
                          <td className={estilos.td} data-label="Cliente">{linha.nomeCliente}</td>
                          <td className={estilos.td} data-label="Pedidos">{linha.totalPedidos}</td>
                          <td className={estilos.td} data-label="Total Gasto">{formatarMoeda(linha.totalReceita)}</td>
                          <td className={`${estilos.td} ${ef.valorLaranja}`} data-label="Ticket Médio">{formatarMoeda(linha.ticketMedio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}

      {abaAtiva === 'produtos-lucrativos' && (
        <>
          <div className={ef.cardFiltro}>
            <div className={ef.acoesFiltr}>
              <button onClick={gerarRelatorioProdutos} disabled={carregandoProdutos} className={ef.botaoGerar}>
                {carregandoProdutos ? 'Gerando...' : 'Gerar Relatório'}
              </button>
            </div>
          </div>
          {carregandoProdutos && (
            <>
              <div style={{ marginBottom: '24px' }}><CardsSkeleton quantidade={2} /></div>
              <div className={estilos.cardTabela}><TabelaSkeleton colunas={5} /></div>
            </>
          )}
          {buscouProdutos && !carregandoProdutos && dadosProdutos && dadosProdutos.produtos.length > 0 && (
            barraExportar('produtos-lucrativos')
          )}
          {buscouProdutos && !carregandoProdutos && dadosProdutos && (
            dadosProdutos.produtos.length === 0 ? (
              <div className={estilos.cardTabela}><p className={estilos.vazio}>Nenhuma venda registrada.</p></div>
            ) : (
              <div className="fadeIn">
                <div className={ef.fileirCards2}>
                  <div className={ef.cardEstat}><span className={ef.iconeEstat}><FiDollarSign /></span><div><p className={ef.rotuloEstat}>Faturamento Total</p><p className={ef.valorEstat}>{formatarMoeda(dadosProdutos.totalReceita)}</p></div></div>
                  <div className={ef.cardEstat}><span className={ef.iconeEstat}><FiPackage /></span><div><p className={ef.rotuloEstat}>Produtos com Vendas</p><p className={ef.valorEstat}>{dadosProdutos.produtos.length}</p></div></div>
                </div>
                <div className={estilos.cardTabela}>
                  <h3 className={ef.tituloTabela}>Ranking de Produtos por Lucratividade</h3>
                  <table className={estilos.tabela}>
                    <thead><tr>{['#', 'Produto', 'Qtd.', 'Faturamento', '% Total'].map(h => <th key={h} className={estilos.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {dadosProdutos.produtos.map((linha) => (
                        <tr key={linha.produtoId} className={estilos.tr}>
                          <td className={`${estilos.td} ${ef.valorLaranja}`} data-label="#">#{linha.posicao}</td>
                          <td className={estilos.td} data-label="Produto">{linha.nomeProduto}</td>
                          <td className={estilos.td} data-label="Qtd.">{linha.totalQuantidade}</td>
                          <td className={`${estilos.td} ${ef.valorVerde}`} data-label="Faturamento">{formatarMoeda(linha.totalReceita)}</td>
                          <td className={estilos.td} data-label="% Total">
                            <div className={ef.barraPercentual}>
                              <div className={ef.preenchimentoPercentual} style={{ width: `${linha.percentual}%` }} />
                              <span className={ef.rotuloPercentual}>{linha.percentual.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}
    </Layout>
  );
}
