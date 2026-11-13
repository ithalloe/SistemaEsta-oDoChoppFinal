import estilos from '../styles/compartilhado.module.css';

interface ModalConfirmacaoProps {
  aberto: boolean;
  titulo: string;
  mensagem: React.ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** 'perigo' usa o botão vermelho (exclusões/cancelamentos); 'primario' usa o laranja da marca. */
  variante?: 'perigo' | 'primario';
  carregando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

export default function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'perigo',
  carregando = false,
  aoConfirmar,
  aoCancelar,
}: ModalConfirmacaoProps) {
  if (!aberto) return null;

  const classeConfirmar =
    variante === 'perigo' ? estilos.botaoConfirmarExclusao : estilos.botaoSalvar;

  return (
    <div className={estilos.sobreposicaoModal} onClick={aoCancelar}>
      <div className={`${estilos.modal} fadeIn`} onClick={(e) => e.stopPropagation()}>
        <h3 className={estilos.tituloModal}>{titulo}</h3>
        <p className={estilos.textoModal}>{mensagem}</p>
        <div className={estilos.acoesModal}>
          <button onClick={aoCancelar} disabled={carregando} className={estilos.botaoCancelar}>
            {textoCancelar}
          </button>
          <button onClick={aoConfirmar} disabled={carregando} className={classeConfirmar}>
            {carregando ? 'Aguarde...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
