import React, { createContext, useContext, useState } from 'react';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: 'ADMIN' | 'FUNCIONARIO';
}

interface ContextoAutenticacao {
  usuario: Usuario | null;
  token: string | null;
  entrar: (token: string, usuario: Usuario) => void;
  sair: () => void;
  estaAutenticado: boolean;
  eAdmin: boolean;
}

const ContextoAuth = createContext<ContextoAutenticacao>({} as ContextoAutenticacao);

export function ProvedorAutenticacao({ children }: { children: React.ReactNode }) {
  // A sessão salva é lida já no estado inicial (e não num useEffect). Se fosse lida depois,
  // a primeira renderização acharia que não há login e redirecionaria para /login ao dar F5.
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    try {
      const usuarioSalvo = localStorage.getItem('usuario');
      return localStorage.getItem('token') && usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => (usuario ? localStorage.getItem('token') : null));

  const entrar = (token: string, usuario: Usuario) => {
    setToken(token);
    setUsuario(usuario);
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  };

  const sair = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  };

  return (
    <ContextoAuth.Provider
      value={{
        usuario,
        token,
        entrar,
        sair,
        estaAutenticado: !!token,
        eAdmin: usuario?.papel === 'ADMIN',
      }}
    >
      {children}
    </ContextoAuth.Provider>
  );
}

export const useAuth = () => useContext(ContextoAuth);
