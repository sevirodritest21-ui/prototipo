import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiPost, apiGet } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  // Al montar: si hay token guardado, validarlo con /api/auth/me
  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const userData = await apiGet('/api/auth/me');
        setUser(userData);
        setToken(savedToken);
      } catch {
        // Token inválido o expirado — limpiar
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email, password, rol = null) => {
    const payload = { email, password };
    if (rol) payload.rol = rol;
    const data = await apiPost('/api/auth/login', payload);
    localStorage.setItem('auth_token', data.access_token);
    setToken(data.access_token);
    const userData = await apiGet('/api/auth/me');
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/api/auth/logout');
    } catch {}
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  const aceptarTerminos = useCallback(async () => {
    await apiPost('/api/auth/aceptar-terminos');
    setUser((prev) => (prev ? { ...prev, terminos_aceptados: true } : prev));
  }, []);

  const value = { user, token, loading, login, logout, aceptarTerminos };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export default AuthContext;
