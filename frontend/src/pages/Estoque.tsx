import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import Layout from '../components/Layout';
import { TabelaSkeleton } from '../components/Skeleton';
import ModalConfirmacao from '../components/ModalConfirmacao';
import api from '../services/api';
import estilos from '../styles/compartilhado.module.css';

interface Produto {
  id: number;
  nome: string;
  tamanho: string;
  quantidade: number;
  quantidadeMinima: number;
  precoUnitario: number;
}

const rotuloTamanho: Record<string, string> = {
  BARRIL_30L: 'Barril 30L',
  BARRIL_50L: 'Barril 50L',
};

function obterStatusEstoque(quantidade: number, quantidadeMinima: number) {
  if (quantidade === 0) return { rotulo: 'Sem estoque', cor: '#ef4444' };
  if (quantidade <= quantidadeMinima) return { rotulo: 'Estoque baixo', cor: '#f59e0b' };
  return { rotulo: 'Normal', cor: '#22c55e' };
}

export default function Estoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [idExcluir, setIdExcluir] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const navegar = useNavigate();

  const buscarProdutos = async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/produtos');
      setProdutos(data);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao carregar produtos. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { buscarProdutos(); }, []);

  const aoExcluir = async (id: number) => {
    try {
      await api.delete(`/produtos/${id}`);
      setIdExcluir(null);
      buscarProdutos();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao excluir produto');
      setIdExcluir(null);
    }
  };

  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Layout>
      <div className={estilos.cabecalho}>
        <h1 className={estilos.titulo}>Estoque</h1>
        <button onClick={() => navegar('/estoque/novo')} className={estilos.botaoPrimario}>
          + Novo Produto
        </button>
      </div>

      {erro && (
        <div className={estilos.caixaErro}>
          {erro}
          <button onClick={() => setErro('')} className={estilos.fecharErro}><FiX /></button>
        </div>
      )}

      <div className={estilos.cardTabela}>
        {carregando ? (
          <TabelaSkeleton colunas={7} />
        ) : produtos.length === 0 ? (
          <p className={estilos.vazio}>Nenhum produto cadastrado</p>
        ) : (
          <table className={`${estilos.tabela} fadeIn`}>
            <thead>
              <tr>
                {['Produto', 'Tamanho', 'Qtd. Estoque', 'Estoque Mínimo', 'Valor Unitário', 'Status', 'Ações'].map((h) => (
                  <th key={h} className={estilos.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => {
                const status = obterStatusEstoque(produto.quantidade, produto.quantidadeMinima);
                return (
                  <tr key={produto.id} className={estilos.tr}>
                    <td className={estilos.td} data-label="Produto">{produto.nome}</td>
                    <td className={estilos.td} data-label="Tamanho">{rotuloTamanho[produto.tamanho] ?? produto.tamanho}</td>
                    <td className={estilos.td} data-label="Qtd. Estoque">{produto.quantidade}</td>
                    <td className={estilos.td} data-label="Estoque Mínimo">{produto.quantidadeMinima}</td>
                    <td className={estilos.td} data-label="Valor Unitário">{formatarMoeda(produto.precoUnitario)}</td>
                    <td className={estilos.td} data-label="Status">
                      <span className={estilos.badge} style={{ backgroundColor: `${status.cor}22`, color: status.cor, border: `1px solid ${status.cor}44` }}>
                        {status.rotulo}
                      </span>
                    </td>
                    <td className={estilos.td} data-label="Ações">
                      <div className={estilos.acoes}>
                        <button onClick={() => navegar(`/estoque/editar/${produto.id}`)} className={estilos.botaoEditar}>Editar</button>
                        <button onClick={() => setIdExcluir(produto.id)} className={estilos.botaoExcluir}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ModalConfirmacao
        aberto={idExcluir !== null}
        titulo="Confirmar exclusão"
        mensagem="Tem certeza que deseja excluir este produto?"
        textoConfirmar="Excluir"
        variante="perigo"
        aoConfirmar={() => idExcluir !== null && aoExcluir(idExcluir)}
        aoCancelar={() => setIdExcluir(null)}
      />
    </Layout>
  );
}
