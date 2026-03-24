import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMutation } from '@apollo/client';
import { ADMIN_LOGIN, ADMIN_LOGOUT } from '../lib/queries';

interface AuthContextType {
  isLoggedIn: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('accessToken'));

  const [adminLogin] = useMutation(ADMIN_LOGIN);
  const [adminLogout] = useMutation(ADMIN_LOGOUT);

  const login = async (loginId: string, password: string) => {
    const { data } = await adminLogin({ variables: { loginInput: { loginId, password } } });
    const token = data?.adminLogin?.accessToken;
    if (token) {
      localStorage.setItem('accessToken', token);
      setIsLoggedIn(true);
    }
  };

  const logout = async () => {
    await adminLogout();
    localStorage.removeItem('accessToken');
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
