import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ConsentModal() {
  const { user, aceptarTerminos, logout } = useAuth();
  const navigate = useNavigate();
  const [leido, setLeido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  if (!user || user.terminos_aceptados === true) {
    return null;
  }

  const handleAceptar = async () => {
    if (!leido || guardando) return;
    try {
      setGuardando(true);
      setError(null);
      await aceptarTerminos();
    } catch {
      setError("No se pudo registrar la aceptación. Por favor intenta nuevamente.");
      setGuardando(false);
    }
  };

  const handleRechazar = async () => {
    try {
      setGuardando(true);
      await logout();
      navigate("/login", { replace: true });
    } catch {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
        <div className="bg-gradient-to-r from-[#003B5C] via-[#00629B] to-[#0082B8] px-6 py-5 text-white">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[#FFC20E] text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>⚖️</span> Ley N° 21.719 — Chile
          </div>
          <h2 className="text-xl font-bold leading-tight">
            Términos y Política de Privacidad
          </h2>
          <p className="text-xs text-sky-100 mt-1">
            Dirección de Sistema de Bibliotecas — Universidad Católica de Temuco
          </p>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Estimado/a <strong>{user.nombre}</strong>, para garantizar un uso seguro, transparente y equitativo de los servicios de biblioteca y cubículos de estudio, te informamos las condiciones bajo las cuales se tratan tus datos:
          </p>

          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
            <div className="flex items-start gap-2.5">
              <span className="text-sm shrink-0">🏛️</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 font-semibold">Finalidad Educativa:</strong> Tus datos institucionales (nombre, RUT, correo y carrera) se tratan exclusivamente para la reserva, control de aforo y gestión de cubículos y talleres.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-sm shrink-0">🤖</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 font-semibold">Asistente Virtual IA:</strong> Las consultas son procesadas en la nube mediante modelos de lenguaje con datos disociados. Tu RUT y apellidos nunca se envían a servidores de IA externos.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-sm shrink-0">🛡️</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 font-semibold">Tus Derechos ARCO+P:</strong> Puedes acceder, rectificar o solicitar la supresión de tus registros de reserva en cualquier momento desde tu perfil o contactando a <a href="mailto:biblioteca@uct.cl" className="text-[#00629B] dark:text-[#38BDF8] underline">biblioteca@uct.cl</a>.
              </div>
            </div>
          </div>

          <div className="text-center pt-1">
            <Link
              to="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00629B] dark:text-[#38BDF8] font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
            >
              <span>📄</span> Leer la Política de Privacidad completa (abre en nueva pestaña) <span>↗</span>
            </Link>
          </div>
        </div>

        <div className="p-6 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={leido}
              onChange={(e) => setLeido(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#00629B] focus:ring-[#00629B] cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">
              He leído y acepto los Términos de Servicio y la Política de Privacidad de Datos.
            </span>
          </label>

          {error && (
            <p className="text-xs text-rose-600 font-medium">{error}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleRechazar}
              disabled={guardando}
              className="w-full sm:w-1/3 py-2.5 px-4 rounded-xl font-bold text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer text-center"
            >
              Rechazar y salir
            </button>
            <button
              type="button"
              onClick={handleAceptar}
              disabled={!leido || guardando}
              className="w-full sm:w-2/3 py-2.5 px-4 rounded-xl font-bold text-xs text-slate-900 bg-[#FFC20E] hover:bg-[#FFD13B] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer text-center"
            >
              {guardando ? "Procesando..." : "Aceptar y continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

