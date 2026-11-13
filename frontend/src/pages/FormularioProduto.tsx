import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import estilos from '../styles/compartilhado.module.css';

export default function FormularioProduto() {
  const { id } = useParams();
  const navegar = useNavigate();
  const modoEdicao = !!id;

  const [formulario, setFormulario] = useState({ nome: '', tamanho: 'BARRIL_30L', quantidade: '', quantidadeMinima: '', precoUnitario: '' });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (modoEdicao) {
      const carregarProduto = async () => {
        try {
          const { data: p } = await api.get(`/produtos/${id}`);
          setFormulario({ nome: p.nome, tamanho: p.tamanho, quantidade: String(p.quantidade), quantidadeMinima: String(p.quantidadeMinima), precoUnitario: String(p.precoUnitario) });
        } catch (err: any) {
          setErro(err.response?.data?.error || 'Erro ao carregar o produto. Verifique sua conexão e tente novamente.');
        }
      };
      carregarProduto();
    }
  }, [id]);

  const aoAlterar = (campo: string, valor: string) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const aoEnviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(''); setSucesso('');

    if (!formulario.nome || !formulario.quantidade || !formulario.quantidadeMinima || !formulario.precoUnitario) {
      setErro('Todos os campos são obrigatórios');
      return;
    }
    // O usuário pode digitar "10,50" (padrão brasileiro); o Number() do JS só entende "10.50".
    const preco = Number(formulario.precoUnitario.replace(',', '.'));
    if (!Number.isFinite(preco)) {
      setErro('Valor unitário inválido');
      return;
    }
    if (Number(formulario.quantidade) < 0 || Number(formulario.quantidadeMinima) < 0 || preco <= 0) {
      setErro('Valores devem ser positivos');
      return;
    }

    setCarregando(true);
    try {
      const dados = { nome: formulario.nome, tamanho: formulario.tamanho, quantidade: Number(formulario.quantidade), quantidadeMinima: Number(formulario.quantidadeMinima), precoUnitario: preco };
      if (modoEdicao) {
        await api.put(`/produtos/${id}`, dados);
        setSucesso('Produto atualizado com sucesso!');
      } else {
        await api.post('/produtos', dados);
        setSucesso('Produto cadastrado com sucesso!');
      }
      setTimeout(() => navegar('/estoque'), 1200);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar produto');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Layout>
      <div className={estilos.cabecalhoForm}>
        <button onClick={() => navegar('/estoque')} className={estilos.botaoVoltar}>← Voltar</button>
        <h1 className={estilos.titulo}>{modoEdicao ? 'Editar Produto' : 'Novo Produto'}</h1>
      </div>

      <div className={estilos.card}>
        <form onSubmit={aoEnviar} className={estilos.formulario}>
          <div className={estilos.grade}>
            <div className={`${estilos.campo} ${estilos.campoLargo}`}>
              <label className={estilos.rotulo}>Nome do produto *</label>
              <input type="text" value={formulario.nome} onChange={(e) => aoAlterar('nome', e.target.value)} placeholder="Ex: Chopp Pilsen" className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Tamanho do barril *</label>
              <select value={formulario.tamanho} onChange={(e) => aoAlterar('tamanho', e.target.value)} className={estilos.selecao}>
                <option value="BARRIL_30L">Barril 30L</option>
                <option value="BARRIL_50L">Barril 50L</option>
              </select>
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Quantidade em estoque *</label>
              <input type="text" inputMode="numeric" value={formulario.quantidade} onChange={(e) => aoAlterar('quantidade', e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Estoque mínimo *</label>
              <input type="text" inputMode="numeric" value={formulario.quantidadeMinima} onChange={(e) => aoAlterar('quantidadeMinima', e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" className={estilos.entrada} />
            </div>
            <div className={estilos.campo}>
              <label className={estilos.rotulo}>Valor unitário (R$) *</label>
              <input type="text" inputMode="decimal" value={formulario.precoUnitario} onChange={(e) => aoAlterar('precoUnitario', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0,00" className={estilos.entrada} />
            </div>
          </div>

          {erro && <div className={estilos.mensagemErro}>{erro}</div>}
          {sucesso && <div className={estilos.mensagemSucesso}>{sucesso}</div>}

          <div className={estilos.acoesFormulario}>
            <button type="button" onClick={() => navegar('/estoque')} className={estilos.botaoCancelar}>Cancelar</button>
            <button type="submit" disabled={carregando} className={estilos.botaoSalvar}>{carregando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
