import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";

import PaginaInicio from "./PaginaInicio";
import FormularioReserva from "./FormularioReserva";
import ChatbotFlotante from "./ChatBotFlotante";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

function PaginaContacto() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 text-2xl" />
        <h2 className="mt-4 text-3xl font-bold text-white">Contacto</h2>
        <p className="mt-3 text-slate-400">
          Soporte técnico disponible para ayudarte con reservas y consultas.
        </p>
        <p className="mt-5 font-semibold text-sky-400">soporte@tudominio.com</p>
      </div>
    </div>
  );
}

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white font-bold">
              R
            </div>
            <span className="font-bold text-white text-lg">BibliotecaIA</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3 text-sm font-medium">
              <Link to="/" className="rounded-xl px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition">
                Inicio
              </Link>
              <Link to="/reservar" className="rounded-xl px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition">
                Reservar
              </Link>
              <Link to="/contacto" className="rounded-xl px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition">
                Contacto
              </Link>
              <div className="flex items-center gap-2 border-l border-white/15 pl-3">
                <span className="text-xs text-slate-300 font-semibold hidden sm:inline">
                  {user.nombre}
                </span>
                {user.rol === "admin" ? (
                  <Link to="/dashboard" className="rounded-xl px-3 py-1.5 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                    🛡️ Admin
                  </Link>
                ) : (
                  <span className="rounded-xl px-2.5 py-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                    🎓 Estudiante
                  </span>
                )}
                <button id="nav-logout" onClick={logout} className="rounded-xl px-3 py-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition text-xs font-medium cursor-pointer">
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-xl px-3 py-1.5 text-amber-300 bg-amber-500/10 border border-amber-500/30 text-xs font-semibold">
                🔒 Inicia sesión para acceder
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NavBar />
        <Routes>
          {/* Ruta Pública de Login */}
          <Route path="/login" element={<Login />} />

          {/* Todas las demás páginas requieren estar autenticado */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<PaginaInicio />} />
            <Route path="/reservar" element={<FormularioReserva />} />
            <Route path="/contacto" element={<PaginaContacto />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Redirección por defecto a /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ChatbotFlotante />
      </AuthProvider>
    </Router>
  );
}
