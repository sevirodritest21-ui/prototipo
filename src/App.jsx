import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";

// IMPORTACIÓN DEL LOGO DESDE SRC/ASSETS
import logoUCT from "./assets/logo.png";

// Code Splitting mediante React.lazy para reducir el tamaño del bundle inicial y acelerar carga
const PaginaInicio = lazy(() => import("./PaginaInicio"));
const FormularioReserva = lazy(() => import("./FormularioReserva"));
const ChatbotFlotante = lazy(() => import("./ChatBotFlotante"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MisReservas = lazy(() => import("./pages/MisReservas"));

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <span className="text-xs font-semibold text-slate-500">Cargando contenido...</span>
      </div>
    </div>
  );
}

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

                <div className="relative" ref={dropdownRef}>
                  {user.rol === "admin" ? (
                    <Link
                      to="/dashboard"
                      className="rounded px-2.5 py-1 text-[#00629B] bg-[#FFC20E] hover:bg-yellow-400 transition font-black flex items-center gap-1 uppercase tracking-wider"
                    >
                      🛡️ Admin
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="rounded px-2.5 py-1 text-white bg-[#7AB800] hover:bg-[#689c00] font-bold flex items-center gap-1.5 uppercase tracking-wider transition cursor-pointer shadow-sm select-none"
                    >
                      <span>🎓 Estudiante</span>
                      <span className={`text-[10px] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}>
                        ▼
                      </span>
                    </button>
                  )}

                  {/* Menú Desplegable */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white text-slate-800 shadow-2xl border border-sky-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-slate-100 text-[11px] text-slate-500 font-normal">
                        Conectado como <strong className="block text-slate-800 font-bold truncate">{user.nombre}</strong>
                      </div>
                      <Link
                        to="/mis-reservas"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition"
                      >
                        <span>📋</span> Mis Reservas
                      </Link>
                      <Link
                        to="/reservar"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition"
                      >
                        <span>📅</span> Reservar Cubículo
                      </Link>
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <span>🚪</span> Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Ruta Pública de Login */}
            <Route path="/login" element={<Login />} />

            {/* Rutas para cualquier usuario autenticado (Estudiante o Admin) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<PaginaInicio />} />
              <Route path="/reservar" element={<FormularioReserva />} />
              <Route path="/mis-reservas" element={<MisReservas />} />
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
        </Suspense>
      </AuthProvider>
    </Router>
  );
} 