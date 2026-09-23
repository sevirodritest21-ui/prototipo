import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import logoRedondo from "../assets/logoredondo.png";
import logoUct from "../assets/logo.png";

export default function Login() {
  const { user, loading: authLoading, login } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  // Limpiar credenciales temporales previa al montar la vista de Login
  useEffect(() => {
    sessionStorage.clear();
  }, []);

  // Redirigir automáticamente si el usuario ya tiene sesión iniciada
  useEffect(() => {
    if (user && !authLoading) {
      if (user.rol === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // Selector de perfil: 'estudiante' (por defecto) o 'admin'
  const [tipoUsuario, setTipoUsuario] = useState("estudiante");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleTabChange = (nuevoTipo) => {
    setTipoUsuario(nuevoTipo);
    setError("");
    if (nuevoTipo === "estudiante") {
      setForm({ email: "juan.perez@alumnos.cl", password: "admin1234" });
    } else {
      setForm({ email: "admin@biblioteca.cl", password: "admin1234" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Por favor, completa todos los campos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const userData = await login(form.email, form.password);

      if (userData.rol === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/reservar", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Credenciales incorrectas. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const esEstudiante = tipoUsuario === "estudiante";

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center px-4 py-16 relative overflow-hidden font-sans">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur-md transition hover:bg-white hover:text-slate-950 focus:outline-none dark:border-slate-700 dark:bg-slate-800/90 dark:text-amber-400 dark:hover:bg-slate-800"
        title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>
      {/* Textura de fondo sutil: retícula fina, sin orbes difusos */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(7,89,133,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(7,89,133,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-900/10 to-transparent" />

      <div className="w-full max-w-[920px] grid md:grid-cols-[1.05fr_1fr] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-12px_rgba(15,23,42,0.14)] relative z-10">

        {/* Panel institucional izquierdo */}
        <div className="hidden md:flex flex-col justify-between bg-sky-800 text-white p-10 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div
            className={`absolute -bottom-24 -right-16 h-72 w-72 rounded-full blur-3xl transition-colors duration-500 ${esEstudiante ? "bg-sky-400/25" : "bg-amber-400/20"
              }`}
          />

          <div className="relative">
            <div className="mb-12">
              <img
                src={logoUct}
                alt="Universidad Católica de Temuco"
                className="h-16 w-auto"
              />
            </div>

            <h1 className="font-serif text-[34px] leading-[1.15] text-white mb-4">
              Gestión de reservas<br />de cubiculos.
            </h1>
            <p className="text-sm leading-relaxed text-sky-200/80 max-w-[30ch]">
              Ingresa a tu cuenta para reservar cubiculos, ademas de gestionar todo lo relacionado a tus reservas.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-[12px] text-sky-200/70 border-t border-white/10 pt-5">
            <svg className="w-3.5 h-3.5 text-sky-300/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Portal seguro de acceso &middot; BibliotecaIA
          </div>
        </div>

        {/* Panel del formulario */}
        <div className="p-8 sm:p-10 md:p-12 flex flex-col justify-center">

          <div className="mb-8">
            <img
              src={logoRedondo}
              alt="Universidad Católica de Temuco"
              className="md:hidden h-12 w-12 rounded-full bg-white shadow-sm shadow-black/10 mb-5"
            />
            <h2 className="font-serif text-2xl text-slate-900 mb-1.5">
              Iniciar sesión
            </h2>
            <p className="text-sm text-slate-500">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Switcher de Perfil: Estudiante vs Administrador */}
          <div className="flex border-b border-slate-200 mb-7">
            <button
              type="button"
              onClick={() => handleTabChange("estudiante")}
              className={`relative pb-3 px-1 mr-7 text-sm font-medium transition-colors cursor-pointer ${esEstudiante ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                }`}
            >
              Estudiante
              <span
                className={`absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-sky-600 transition-opacity ${esEstudiante ? "opacity-100" : "opacity-0"
                  }`}
              />
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("admin")}
              className={`relative pb-3 px-1 text-sm font-medium transition-colors cursor-pointer ${!esEstudiante ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                }`}
            >
              Administrador
              <span
                className={`absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-amber-500 transition-opacity ${!esEstudiante ? "opacity-100" : "opacity-0"
                  }`}
              />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={esEstudiante ? "alumno@alumnos.cl" : "admin@biblioteca.cl"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-[13px] text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Botón Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1 ${esEstudiante
                ? "bg-sky-700 hover:bg-sky-800 text-white shadow-sm shadow-sky-900/10"
                : "bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-sm shadow-amber-900/10"
                }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  {esEstudiante ? "Ingresar como estudiante" : "Ingresar como administrador"}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-[12px] text-slate-400 md:hidden">
            Portal seguro de acceso &middot; BibliotecaIA
          </p>
        </div>
      </div>
    </div>
  );
}