import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import Sidebar from './Sidebar';
import estilos from '../styles/Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

// Lembra no navegador se o usuário deixou a barra lateral recolhida.
const CHAVE_RECOLHIDO = 'menuRecolhido';

function lerRecolhido(): boolean {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDO) === 'true';
  } catch {
    return false;
  }
}

export default function Layout({ children }: LayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhido, setRecolhido] = useState(lerRecolhido);

  const alternarRecolhido = () => {
    setRecolhido((atual) => {
      const novo = !atual;
      try {
        localStorage.setItem(CHAVE_RECOLHIDO, String(novo));
      } catch {
        // sem acesso ao armazenamento: a escolha vale só até recarregar a página
      }
      return novo;
    });
  };

  return (
    <div className={estilos.container}>
      <Sidebar
        aberto={menuAberto}
        aoFechar={() => setMenuAberto(false)}
        recolhido={recolhido}
        aoAlternarRecolhido={alternarRecolhido}
      />

      {menuAberto && (
        <div className={estilos.overlay} onClick={() => setMenuAberto(false)} />
      )}

      <div className={estilos.conteudo}>
        <div className={estilos.topbar}>
          <button
            className={estilos.botaoMenu}
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <FiMenu />
          </button>
          <img src="/logo.png" alt="Estação do Chopp" className={estilos.logoTopbar} />
        </div>

        <main className={estilos.principal}>{children}</main>
      </div>
    </div>
  );
}
