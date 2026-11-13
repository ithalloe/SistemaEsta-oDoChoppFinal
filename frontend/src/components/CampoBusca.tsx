import { useState, useRef, useEffect } from 'react';
import estilos from '../styles/CampoBusca.module.css';

interface Opcao {
  id: number;
  rotulo: string;
}

interface CampoBuscaProps {
  opcoes: Opcao[];
  valorSelecionado: number | '';
  aoSelecionar: (id: number) => void;
  placeholder?: string;
}

// Campo de seleção com busca: em vez de listar todas as opções de uma vez num
// <select> (que não escala com muitos registros), o usuário digita para filtrar.
export default function CampoBusca({ opcoes, valorSelecionado, aoSelecionar, placeholder }: CampoBuscaProps) {
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mostra o rótulo da opção selecionada quando o dropdown está fechado.
  const opcaoSelecionada = opcoes.find((o) => o.id === valorSelecionado);

  useEffect(() => {
    const aoClicarFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const opcoesFiltradas = texto.trim()
    ? opcoes.filter((o) => o.rotulo.toLowerCase().includes(texto.toLowerCase()))
    : opcoes;

  const selecionar = (opcao: Opcao) => {
    aoSelecionar(opcao.id);
    setTexto('');
    setAberto(false);
  };

  return (
    <div className={estilos.container} ref={containerRef}>
      <input
        type="text"
        className={estilos.entrada}
        placeholder={placeholder ?? 'Buscar...'}
        value={aberto ? texto : opcaoSelecionada?.rotulo ?? ''}
        onChange={(e) => { setTexto(e.target.value); setAberto(true); }}
        onFocus={() => { setTexto(''); setAberto(true); }}
      />
      {aberto && (
        <ul className={estilos.lista}>
          {opcoesFiltradas.length === 0 ? (
            <li className={estilos.vazio}>Nenhum resultado</li>
          ) : (
            opcoesFiltradas.map((opcao) => (
              <li key={opcao.id} className={estilos.item} onClick={() => selecionar(opcao)}>
                {opcao.rotulo}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
