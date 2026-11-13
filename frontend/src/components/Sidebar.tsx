import { NavLink, useNavigate } from 'react-router-dom';
import { FiGrid, FiUsers, FiClipboard, FiPackage, FiDollarSign, FiKey, FiLogOut, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import estilos from '../styles/Sidebar.module.css';

const todosItensNav = [
  { caminho: '/dashboard', rotulo: 'Dashboard', Icone: FiGrid, apenasAdmin: false },
  { caminho: '/clientes', rotulo: 'Clientes', Icone: FiUsers, apenasAdmin: false },
  { caminho: '/pedidos', rotulo: 'Pedidos', Icone: FiClipboard, apenasAdmin: false },
  { caminho: '/estoque', rotulo: 'Estoque', Icone: FiPackage, apenasAdmin: false },
  { caminho: '/financeiro', rotulo: 'Financeiro', Icone: FiDollarSign, apenasAdmin: true },
  { caminho: '/usuarios', rotulo: 'Usuários', Icone: FiKey, apenasAdmin: true },
];

interface SidebarProps {
  aberto?: boolean;              // menu aberto no celular
  aoFechar?: () => void;
  recolhido?: boolean;           // barra recolhida (só ícones) no computador
  aoAlternarRecolhido?: () => void;
}

export default function Sidebar({ aberto = false, aoFechar, recolhido = false, aoAlternarRecolhido }: SidebarProps) {
  const { sair, usuario, eAdmin } = useAuth();
  const navegar = useNavigate();

  const aoSair = () => {
    sair();
    navegar('/login');
  };

  const itensNav = todosItensNav.filter((item) => !item.apenasAdmin || eAdmin);

  return (
    <aside
      className={`${estilos.sidebar} ${aberto ? estilos.sidebarAberta : ''} ${recolhido ? estilos.sidebarRecolhida : ''}`}
    >
      <div className={estilos.areaLogo}>
        <img src="/logo.png" alt="Estação do Chopp" className={estilos.logo} />
      </div>

      <nav className={estilos.nav}>
        {itensNav.map((item) => (
          <NavLink
            key={item.caminho}
            to={item.caminho}
            onClick={aoFechar}
            title={recolhido ? item.rotulo : undefined}
            className={({ isActive }) =>
              `${estilos.itemNav} ${isActive ? estilos.itemNavAtivo : ''}`
            }
          >
            <span className={estilos.iconeNav}><item.Icone /></span>
            <span className={estilos.rotulo}>{item.rotulo}</span>
          </NavLink>
        ))}
      </nav>

      <div className={estilos.rodape}>
        <button
          type="button"
          onClick={aoAlternarRecolhido}
          className={estilos.botaoRecolher}
          title={recolhido ? 'Expandir menu' : 'Recolher menu'}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!recolhido}
        >
          {recolhido ? <FiChevronsRight /> : <FiChevronsLeft />}
          <span className={estilos.rotulo}>Recolher menu</span>
        </button>

        {usuario && (
          <div className={estilos.infoUsuario}>
            <p className={estilos.nomeUsuario}>{usuario.nome}</p>
            <span
              className={estilos.badgePapel}
              style={{
                backgroundColor: usuario.papel === 'ADMIN' ? 'rgba(170,90,33,0.2)' : 'rgba(59,130,246,0.2)',
                color: usuario.papel === 'ADMIN' ? '#AA5A21' : '#3b82f6',
                border: `1px solid ${usuario.papel === 'ADMIN' ? 'rgba(170,90,33,0.4)' : 'rgba(59,130,246,0.4)'}`,
              }}
            >
              {usuario.papel === 'ADMIN' ? 'Administrador' : 'Funcionário'}
            </span>
          </div>
        )}
        <button onClick={aoSair} className={estilos.botaoSair} title={recolhido ? 'Deslogar' : undefined}>
          <FiLogOut />
          <span className={estilos.rotulo}>Deslogar</span>
        </button>
      </div>
    </aside>
  );
}
