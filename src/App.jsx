import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";

// IMPORTACIÓN DEL LOGO DESDE SRC/ASSETS
import logoUCT from "./assets/logo.png";

// Code Splitting mediante React.lazy para reducir el tamaño del bundle inicial y acelerar carga
const PaginaInicio = lazy(() => import("./PaginaInicio"));
const FormularioReserva = lazy(() => import("./FormularioReserva"));
const ChatbotFlotante = lazy(() => import("./ChatBotFlotante"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MisReservas = lazy(() => import("./pages/MisReservas"));
const Reglamento = lazy(() => import("./pages/Reglamento"));

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import NetworkStatusBanner from "./components/NetworkStatusBanner";

const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {path}
  </svg>
);

const IconChevron = (p) => <Icon {...p} path={<path d="M6 9l6 6 6-6" />} />;
const IconDashboard = (p) => <Icon {...p} path={<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>} />;
const IconList = (p) => <Icon {...p} path={<><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>} />;
const IconCalendar = (p) => <Icon {...p} path={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>} />;
const IconDoc = (p) => <Icon {...p} path={<><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>} />;
const IconLogout = (p) => <Icon {...p} path={<><path d="M15 17l5-5-5-5" /><path d="M20 12H9" /><path d="M11 3H6a2 2 0 00-2 2v14a2 2 0 002 2h5" /></>} />;
const IconLogin = (p) => <Icon {...p} path={<><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M13 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5" /></>} />;
const IconSun = (p) => (
  <Icon {...p} path={<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>} />
);
const IconMoon = (p) => (
  <Icon {...p} path={<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />} />
);

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/70 pt-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#00629B] border-t-transparent" />
        <span className="text-[13px] text-slate-500">Cargando contenido</span>
      </div>
    </div>
  );
}


function NavBar() {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
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

  if (location.pathname.toLowerCase() === "/login") {
    return null;
  }

  const getLinkStyle = (path) => {
    const isActive = location.pathname === path;
    return `relative px-1 py-5 text-[14px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#00629B] ${isActive
        ? "font-semibold text-white after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-[#FFC20E] after:content-['']"
        : "text-sky-100/80 hover:text-white"
      }`;
  };

  const userInitial = user?.nombre ? user.nombre.charAt(0).toUpperCase() : "U";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#00629B] text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">

          <Link to="/" className="group flex items-center gap-3">
            <img
              src={logoUCT}
              alt="Logo Universidad Católica de Temuco"
              className="h-9 w-auto object-contain"
            />
            <span className="hidden sm:block h-7 w-px bg-white/20" />
            <span className="hidden sm:flex flex-col leading-tight">
              <span className="font-serif text-[17px] tracking-tight text-white">
                Biblioteca
                <span className="text-[#00A3E0]">U</span>
                <span className="text-white">C</span>
                <span className="text-[#FFC20E]">T</span>
              </span>
              <span className="text-[11px] text-sky-200/80">Reserva de cubículos</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden md:flex items-center gap-7">
              <Link to="/" className={getLinkStyle("/")}>
                Inicio
              </Link>
              <Link to="/reservar" className={getLinkStyle("/reservar")}>
                Reservar
              </Link>
              <Link to="/reglamento" className={getLinkStyle("/reglamento")}>
                Reglamento
              </Link>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E]"
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDark ? <IconSun className="w-4 h-4 text-[#FFC20E]" /> : <IconMoon className="w-4 h-4 text-sky-200" />}
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex cursor-pointer select-none items-center gap-2.5 rounded-md border border-white/15 bg-white/5 py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FFC20E] text-[13px] font-semibold text-slate-900">
                    {userInitial}
                  </span>
                  <span className="hidden sm:flex flex-col text-left">
                    <span className="max-w-[130px] truncate text-[13px] font-medium leading-tight text-white">
                      {user.nombre}
                    </span>
                    <span className="text-[11px] leading-tight text-sky-200/90">
                      {user.rol === "admin" ? "Administrador" : "Estudiante"}
                    </span>
                  </span>
                  <IconChevron className={`w-3.5 h-3.5 text-sky-200 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-800 shadow-xl animate-fadeIn">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="truncate text-[14px] font-semibold text-slate-900">{user.nombre}</p>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                        <span className={`h-1.5 w-1.5 rounded-full ${user.rol === "admin" ? "bg-[#FFC20E]" : "bg-emerald-600"}`} />
                        {user.rol === "admin" ? "Administrador" : "Estudiante UCT"}
                      </span>
                    </div>

                    <div className="py-1">
                      {user.rol === "admin" && (
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#00629B]"
                        >
                          <IconDashboard className="w-4 h-4 text-slate-400" /> Panel de administración
                        </Link>
                      )}

                      <Link
                        to="/mis-reservas"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#00629B]"
                      >
                        <IconList className="w-4 h-4 text-slate-400" /> Mis reservas
                      </Link>

                      <Link
                        to="/reservar"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#00629B] md:hidden"
                      >
                        <IconCalendar className="w-4 h-4 text-slate-400" /> Reservar cubículo
                      </Link>

                      <Link
                        to="/reglamento"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#00629B] md:hidden"
                      >
                        <IconDoc className="w-4 h-4 text-slate-400" /> Reglamento y horarios
                      </Link>

                    </div>

                    <div className="border-t border-slate-200 py-1">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 hover:text-[#00629B]"
                      >
                        <span className="flex items-center gap-2.5">
                          {isDark ? <IconSun className="w-4 h-4 text-[#FFC20E]" /> : <IconMoon className="w-4 h-4 text-slate-400" />}
                          Modo {isDark ? "claro" : "oscuro"}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {isDark ? "Activado" : "Desactivado"}
                        </span>
                      </button>
                      <button
                        id="nav-logout"
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        <IconLogout className="w-4 h-4" /> Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex cursor-pointer items-center gap-2 rounded-md bg-[#FFC20E] px-4 py-2 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-[#FFCA28] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <IconLogin className="w-4 h-4" /> Iniciar sesión
              </Link>
            )}
          </div>

        </div>
      </div>
      <div className="h-[2px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B]" />
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NavBar />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<PaginaInicio />} />
                <Route path="/reservar" element={<FormularioReserva />} />
                <Route path="/mis-reservas" element={<MisReservas />} />
                <Route path="/reglamento" element={<Reglamento />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <ChatbotFlotante />
            <NetworkStatusBanner />
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}