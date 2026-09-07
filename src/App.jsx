import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";

// IMPORTACIÓN DEL LOGO DESDE SRC/ASSETS
import logoUCT from "./assets/logo.png";

import PaginaInicio from "./PaginaInicio";
import FormularioReserva from "./FormularioReserva";
import ChatbotFlotante from "./ChatBotFlotante";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

function PaginaContacto() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] px-4 font-sans">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-md border-t-4 border-[#00A3E0]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00629B]/10 text-2xl text-[#00629B]">
          ✉️
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[#00629B]">Soporte y Contacto</h2>
        <p className="mt-2 text-xs text-slate-600">
          Dirección de Bibliotecas UCT. Soporte técnico disponible para consultas sobre reservas.
        </p>
        <p className="mt-4 text-sm font-bold text-[#00A3E0]">soporte.biblioteca@uct.cl</p>
      </div>
    </div>
  );
}

function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b-4 border-[#00A3E0] bg-[#00629B] text-white shadow-md">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">

          {/* LOGO E IDENTIDAD INSTITUCIONAL */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logoUCT}
              alt="Logo Universidad Católica de Temuco"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base leading-none tracking-tight">
                Biblioteca
                <span className="text-[#00A3E0]">U</span>
                <span className="text-white">C</span>
                <span className="text-[#FFC20E]">T</span>
              </span>

            </div>
          </Link>

          {/* MENÚ DE NAVEGACIÓN Y PERFIL */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold">
              <Link
                to="/"
                className="rounded px-3 py-1.5 text-white hover:bg-[#00A3E0] transition"
              >
                Inicio
              </Link>
              <Link
                to="/reservar"
                className="rounded px-3 py-1.5 text-white hover:bg-[#00A3E0] transition"
              >
                Reservar
              </Link>
              <Link
                to="/contacto"
                className="rounded px-3 py-1.5 text-white hover:bg-[#00A3E0] transition hidden sm:inline-block"
              >
                Contacto
              </Link>

              <div className="flex items-center gap-2 border-l border-sky-400/40 pl-3">
                <span className="text-sky-100 font-semibold hidden md:inline">
                  {user.nombre}
                </span>

                {user.rol === "admin" ? (
                  <Link
                    to="/dashboard"
                    className="rounded px-2.5 py-1 text-[#00629B] bg-[#FFC20E] hover:bg-yellow-400 transition font-black flex items-center gap-1 uppercase tracking-wider"
                  >
                    🛡️ Admin
                  </Link>
                ) : (
                  <span className="rounded px-2.5 py-1 text-white bg-[#7AB800] font-bold flex items-center gap-1 uppercase tracking-wider">
                    🎓 Estudiante
                  </span>
                )}

                <button
                  id="nav-logout"
                  onClick={logout}
                  className="rounded px-2.5 py-1 text-sky-200 hover:bg-red-600 hover:text-white transition cursor-pointer ml-1"
                  title="Cerrar sesión"
                >
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded px-3 py-1.5 text-white bg-[#00A3E0] text-xs font-bold">
                🔒 Inicia sesión
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

          {/* Rutas para cualquier usuario autenticado (Estudiante o Admin) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<PaginaInicio />} />
            <Route path="/reservar" element={<FormularioReserva />} />
            <Route path="/contacto" element={<PaginaContacto />} />
          </Route>

          {/* Ruta protegida EXCLUSIVA para Administradores */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
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