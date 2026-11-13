import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import Layout from '../components/Layout';
import CampoBusca from '../components/CampoBusca';
import api from '../services/api';
import estilos from '../styles/compartilhado.module.css';
import ep from '../styles/FormularioPedido.module.css';

interface Cliente { id: number; nome: string }
interface Produto { id: number; nome: string; precoUnitario: number; quantidade: number; quantidadeMinima: number }
// quantidade pode ficar vazia ('') enquanto o usuário apaga e digita outro número.
interface ItemPedido { produtoId: number; quantidade: number | ''; precoUnitario: number; precoTotal: number }

const opcoesStatus = [
  { valor: 'PENDENTE', rotulo: 'Pendente' },
  { valor: 'EM_ANDAMENTO', rotulo: 'Em andamento' },
  { valor: 'CONCLUIDO', rotulo: 'Concluído' },
];

export default function FormularioPedido() {
  const { id } = useParams();
  const navegar = useNavigate();
  const modoEdicao = !!id;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [status, setStatus] = useState('PENDENTE');
  const [statusOriginal, setStatusOriginal] = useState('PENDENTE');
  const [itens, setItens] = useState<ItemPedido[]>([{ produtoId: 0, quantidade: 1, precoUnitario: 0, precoTotal: 0 }]);
  // Itens como estavam salvos no pedido (só na edição): quantidade e preço da época da venda, por produto.
  const [itensOriginais, setItensOriginais] = useState<Map<number, { quantidade: number; precoUnitario: number }>>(new Map());
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [c, p] = await Promise.all([api.get('/clientes'), api.get('/produtos')]);
        const listaClientes: Cliente[] = c.data;
        const listaProdutos: Produto[] = p.data;

        if (modoEdicao) {
          const { data: pedido } = await api.get(`/pedidos/${id}`);
          setClienteId(String(pedido.clienteId));
          setStatus(pedido.status);
          setStatusOriginal(pedido.status);
          setItens(pedido.itens.map((item: any) => ({ produtoId: item.produtoId, quantidade: item.quantidade, precoUnitario: item.precoUnitario, precoTotal: item.precoTotal })));

          const originais = new Map<number, { quantidade: number; precoUnitario: number }>();
          for (const item of pedido.itens) {
            const anterior = originais.get(item.produtoId);
            originais.set(item.produtoId, { quantidade: (anterior?.quantidade ?? 0) + item.quantidade, precoUnitario: item.precoUnitario });
          }
          setItensOriginais(originais);

          // As listas só trazem cadastros ativos. Se o cliente ou algum produto do pedido
          // foi excluído depois, ele é incluído aqui para não aparecer em branco na edição.
          if (!listaClientes.some((cl) => cl.id === pedido.cliente.id)) {
            listaClientes.push({ id: pedido.cliente.id, nome: `${pedido.cliente.nome} (excluído)` });
          }
          for (const item of pedido.itens) {
            if (!listaProdutos.some((pr) => pr.id === item.produto.id)) {
              listaProdutos.push({ ...item.produto, nome: `${item.produto.nome} (excluído)` });
            }
          }
        }

        setClientes(listaClientes);
        setProdutos(listaProdutos);
      } catch (err: any) {
        setErro(err.response?.data?.error || 'Erro ao carregar os dados. Verifique sua conexão e tente novamente.');
      }
    };
    carregarDados();
  }, [id]);

  const aoAlterarItem = (indice: number, campo: string, valor: string | number) => {
    setItens((prev) => {
      const atualizado = [...prev];
      atualizado[indice] = { ...atualizado[indice], [campo]: valor };
      if (campo === 'produtoId') {
        const produto = produtos.find((p) => p.id === Number(valor));
        // Produto que já estava no pedido mantém o preço da época da venda (igual ao backend).
        const preco = itensOriginais.get(Number(valor))?.precoUnitario ?? produto?.precoUnitario;
        if (preco !== undefined) { atualizado[indice].precoUnitario = preco; atualizado[indice].precoTotal = preco * Number(atualizado[indice].quantidade); }
      }
      if (campo === 'quantidade') {
        atualizado[indice].precoTotal = atualizado[indice].precoUnitario * Number(atualizado[indice].quantidade);
      }
      return atualizado;
    });
  };

  const adicionarItem = () => setItens((prev) => [...prev, { produtoId: 0, quantidade: 1, precoUnitario: 0, precoTotal: 0 }]);
  const removerItem = (indice: number) => { if (itens.length > 1) setItens((prev) => prev.filter((_, i) => i !== indice)); };
  const valorTotalPedido = itens.reduce((soma, item) => soma + item.precoTotal, 0);
  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  // O status só pode avançar: na edição, mostra apenas o atual e os seguintes.
  const statusPermitidos = opcoesStatus.slice(Math.max(0, opcoesStatus.findIndex((s) => s.valor === statusOriginal)));

  // Mesma regra do backend: soma as linhas repetidas do mesmo produto e, se o pedido já
  // estava concluído, o estoque que ele baixou volta a contar como disponível.
  const quantidadePedida = (produtoId: number) =>
    itens.filter((i) => i.produtoId === produtoId).reduce((soma, i) => soma + Number(i.quantidade), 0);
  const estoqueDisponivel = (produto: Produto) =>
    produto.quantidade + (statusOriginal === 'CONCLUIDO' ? itensOriginais.get(produto.id)?.quantidade ?? 0 : 0);

  const aoEnviar = async (e: FormEvent) => {
    e.preventDefault(); setErro(''); setSucesso('');
    if (!clienteId) { setErro('Selecione um cliente'); return; }
    if (itens.some((i) => !i.produtoId || i.quantidade === '' || i.quantidade <= 0)) { setErro('Preencha todos os itens corretamente'); return; }
    setCarregando(true);
    try {
      if (modoEdicao) await api.put(`/pedidos/${id}`, { clienteId: Number(clienteId), status, itens });
      else await api.post('/pedidos', { clienteId: Number(clienteId), itens });
      setSucesso(modoEdicao ? 'Pedido atualizado!' : 'Pedido criado!');
      setTimeout(() => navegar('/pedidos'), 1200);
    } catch (err: any) { setErro(err.response?.data?.error || 'Erro ao salvar pedido'); }
    finally { setCarregando(false); }
  };

  return (
    <Layout>
      <div className={estilos.cabecalhoForm}>
        <button onClick={() => navegar('/pedidos')} className={estilos.botaoVoltar}>← Voltar</button>
        <h1 className={estilos.titulo}>{modoEdicao ? 'Editar Pedido' : 'Novo Pedido'}</h1>
      </div>

      <form onSubmit={aoEnviar}>
        <div className={ep.cardPedido}>
          <h2 className={ep.tituloSecao}>Dados do Pedido</h2>
          <div className={ep.grade2}>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Cliente *</label>
              <CampoBusca
                opcoes={clientes.map((c) => ({ id: c.id, rotulo: c.nome }))}
                valorSelecionado={clienteId ? Number(clienteId) : ''}
                aoSelecionar={(id) => setClienteId(String(id))}
                placeholder="Buscar cliente..."
              />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Status</label>
              {modoEdicao ? (
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={estilos.selecao}>
                  {statusPermitidos.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
                </select>
              ) : (
                <input type="text" value="Pendente" readOnly className={estilos.entrada} style={{ opacity: 0.6 }} />
              )}
            </div>
          </div>
        </div>

        <div className={ep.cardPedido} style={{ marginTop: '16px' }}>
          <div className={ep.cabecalhoItens}>
            <h2 className={ep.tituloSecao}>Produtos / Itens</h2>
            <button type="button" onClick={adicionarItem} className={ep.botaoAdicionar}>+ Adicionar Item</button>
          </div>

          {itens.map((item, indice) => {
            const produto = produtos.find((p) => p.id === item.produtoId);
            const disponivel = produto ? estoqueDisponivel(produto) : 0;
            const estoqueInsuficiente = produto && quantidadePedida(produto.id) > disponivel;
            return (
              <div key={indice} className={ep.linhaItem} style={{ borderColor: estoqueInsuficiente ? '#ef4444' : '#2a2a2a' }}>
                <div className={estilos.campo} style={{ flex: 1 }}>
                  <label className={estilos.rotulo}>Produto *</label>
                  <CampoBusca
                    opcoes={produtos.map((p) => ({ id: p.id, rotulo: `${p.nome} (Estoque: ${p.quantidade})` }))}
                    valorSelecionado={item.produtoId || ''}
                    aoSelecionar={(id) => aoAlterarItem(indice, 'produtoId', id)}
                    placeholder="Buscar produto..."
                  />
                </div>
                <div className={estilos.campo} style={{ flex: 0.5 }}>
                  <label className={estilos.rotulo}>Qtd *</label>
                  <input type="number" min="1" value={item.quantidade} onChange={(e) => aoAlterarItem(indice, 'quantidade', e.target.value === '' ? '' : Number(e.target.value))} className={estilos.entrada} style={estoqueInsuficiente ? { borderColor: '#ef4444' } : {}} />
                  {estoqueInsuficiente && <span className={ep.erroEstoque}>Insuficiente ({disponivel})</span>}
                </div>
                <div className={estilos.campo} style={{ flex: 0.5 }}>
                  <label className={estilos.rotulo}>Valor Unit.</label>
                  <input type="text" value={formatarMoeda(item.precoUnitario)} readOnly className={estilos.entrada} style={{ opacity: 0.6 }} />
                </div>
                <div className={estilos.campo} style={{ flex: 0.5 }}>
                  <label className={estilos.rotulo}>Total</label>
                  <input type="text" value={formatarMoeda(item.precoTotal)} readOnly className={estilos.entrada} style={{ opacity: 0.6 }} />
                </div>
                <button type="button" onClick={() => removerItem(indice)} className={ep.botaoRemover} disabled={itens.length === 1}><FiX /></button>
              </div>
            );
          })}

          <div className={ep.linhaTotal}>
            <span className={ep.rotuloTotal}>Valor Total:</span>
            <span className={ep.valorTotal}>{formatarMoeda(valorTotalPedido)}</span>
          </div>
        </div>

        {erro && <div className={estilos.mensagemErro} style={{ marginTop: '12px' }}>{erro}</div>}
        {sucesso && <div className={estilos.mensagemSucesso} style={{ marginTop: '12px' }}>{sucesso}</div>}

        <div className={estilos.acoesFormulario} style={{ marginTop: '20px' }}>
          <button type="button" onClick={() => navegar('/pedidos')} className={estilos.botaoCancelar}>Cancelar</button>
          <button type="submit" disabled={carregando} className={estilos.botaoSalvar}>{carregando ? 'Salvando...' : 'Salvar Pedido'}</button>
        </div>
      </form>
    </Layout>
  );
}
