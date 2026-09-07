import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleTabChange = (nuevoTipo) => {
    setTipoUsuario(nuevoTipo);
    setError("");
    // Limpiar o poner placeholder sugerido para facilitar pruebas
    if (nuevoTipo === "estudiante") {
      setForm({ email: "juan.perez@alumnos.cl", password: "estudiante1234" });
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

      // Redirección basada en el ROL REAL devuelto por el servidor
      if (userData.rol === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        // Estudiante redirige a la página de reserva para autocompletar sus datos
        navigate("/reservar", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Credenciales incorrectas. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-amber-50 flex items-center justify-center px-4 relative overflow-hidden font-sans pt-16">
      {/* Orbs decorativos de fondo */}
      <div className="absolute top-10 left-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white/90 backdrop-blur-xl p-8 md:p-10 shadow-[0_20px_60px_rgba(14,165,233,0.15)] relative z-10">

        {/* Logo e Identidad */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white font-black text-2xl shadow-lg shadow-sky-500/30 mb-3">
            R
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Biblioteca Inteligente
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ingresa a tu cuenta para gestionar tus reservas
          </p>
        </div>

        {/* Switcher de Perfil: Estudiante vs Administrador */}
        <div className="flex rounded-2xl bg-sky-50 p-1.5 border border-sky-100 mb-6">
          <button
            type="button"
            onClick={() => handleTabChange("estudiante")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tipoUsuario === "estudiante"
                ? "bg-white text-sky-700 shadow-md shadow-sky-900/5 border border-sky-200/60"
                : "text-slate-500 hover:text-slate-800"
              }`}
          >
            <span>🎓</span> Estudiante
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("admin")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tipoUsuario === "admin"
                ? "bg-white text-amber-700 shadow-md shadow-amber-900/5 border border-amber-200/60"
                : "text-slate-500 hover:text-slate-800"
              }`}
          >
            <span>🛡️</span> Administrador
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
                placeholder={tipoUsuario === "estudiante" ? "alumno@alumnos.cl" : "admin@biblioteca.cl"}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
                className="w-full pl-11 pr-11 py-3 rounded-2xl border border-sky-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all shadow-sm"
              />
              <button
                type="button"
                id="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2 hover:scale-[1.02] active:scale-[0.98] ${tipoUsuario === "estudiante"
                ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sky-500/25"
                : "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow-amber-500/20"
              }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              <>
                {tipoUsuario === "estudiante" ? "Ingresar como Estudiante" : "Ingresar como Administrador"}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer Text */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            🔒 Portal Seguro de Acceso a BibliotecaIA
          </span>
        </div>

      </div>
    </div>
  );
}
