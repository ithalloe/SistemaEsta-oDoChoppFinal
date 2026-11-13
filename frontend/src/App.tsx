import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProvedorAutenticacao, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import FormularioCliente from './pages/FormularioCliente';
import Pedidos from './pages/Pedidos';
import FormularioPedido from './pages/FormularioPedido';
import Estoque from './pages/Estoque';
import FormularioProduto from './pages/FormularioProduto';
import Financeiro from './pages/Financeiro';
import Usuarios from './pages/Usuarios';
import FormularioUsuario from './pages/FormularioUsuario';

function RotaPrivada({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth();
  return estaAutenticado ? <>{children}</> : <Navigate to="/login" replace />;
}

function RotaPublica({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth();
  return !estaAutenticado ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function RotaAdmin({ children }: { children: React.ReactNode }) {
  const { estaAutenticado, eAdmin } = useAuth();
  if (!estaAutenticado) return <Navigate to="/login" replace />;
  if (!eAdmin) return <Navigate to="/clientes" replace />;
  return <>{children}</>;
}

function Rotas() {
  return (
    <Routes>
      <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Rotas acessíveis por todos os usuários autenticados */}
      <Route path="/dashboard" element={<RotaPrivada><Dashboard /></RotaPrivada>} />
      <Route path="/clientes" element={<RotaPrivada><Clientes /></RotaPrivada>} />
      <Route path="/clientes/novo" element={<RotaPrivada><FormularioCliente /></RotaPrivada>} />
      <Route path="/clientes/editar/:id" element={<RotaPrivada><FormularioCliente /></RotaPrivada>} />
      <Route path="/pedidos" element={<RotaPrivada><Pedidos /></RotaPrivada>} />
      <Route path="/pedidos/novo" element={<RotaPrivada><FormularioPedido /></RotaPrivada>} />
      <Route path="/pedidos/editar/:id" element={<RotaPrivada><FormularioPedido /></RotaPrivada>} />
      <Route path="/estoque" element={<RotaPrivada><Estoque /></RotaPrivada>} />
      <Route path="/estoque/novo" element={<RotaPrivada><FormularioProduto /></RotaPrivada>} />
      <Route path="/estoque/editar/:id" element={<RotaPrivada><FormularioProduto /></RotaPrivada>} />

      {/* Rotas exclusivas de ADMIN */}
      <Route path="/financeiro" element={<RotaAdmin><Financeiro /></RotaAdmin>} />
      <Route path="/usuarios" element={<RotaAdmin><Usuarios /></RotaAdmin>} />
      <Route path="/usuarios/novo" element={<RotaAdmin><FormularioUsuario /></RotaAdmin>} />
      <Route path="/usuarios/editar/:id" element={<RotaAdmin><FormularioUsuario /></RotaAdmin>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ProvedorAutenticacao>
      <BrowserRouter>
        <Rotas />
      </BrowserRouter>
    </ProvedorAutenticacao>
  );
}
