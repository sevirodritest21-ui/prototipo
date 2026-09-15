import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  const savedToken = localStorage.getItem('auth_token');
  let tokenExpirado = false;
  if (savedToken) {
    try {
      const payloadBase64 = savedToken.split('.')[1];
      if (payloadBase64) {
        const decoded = JSON.parse(atob(payloadBase64));
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          tokenExpirado = true;
        }
      }
    } catch {
      tokenExpirado = true;
    }
  }

  if (tokenExpirado) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    window.location.href = '/login';
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-slate-400 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}