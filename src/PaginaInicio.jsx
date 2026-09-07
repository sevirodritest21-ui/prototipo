import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

export default function PaginaInicio() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F4F6F9] pt-16 font-sans text-slate-800">

      {/* CABECERA / HERO ESTILO PORTAL UCT */}
      <section className="bg-[#00629B] text-white py-12 px-6 shadow-md border-b-4 border-[#00A3E0]">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <span className="inline-block bg-[#00A3E0] text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider mb-3">
              Portal del Estudiante — Biblioteca UCT
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              ¡Bienvenido/a, {user?.nombre || "Estudiante"}!
            </h1>
            <p className="mt-3 text-sky-100 text-sm md:text-base max-w-2xl">
              Sistema de reserva de cubículos de estudio. Gestiona tus horarios de forma rápida utilizando nuestro formulario o interactuando con el chatbot de IA.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              to="/reservar"
              className="px-6 py-3 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-bold text-sm rounded shadow transition-all text-center"
            >
              Reservar Cubículo
            </Link>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
              className="px-6 py-3 bg-[#FFC20E] hover:bg-[#689B00] text-white font-bold text-sm rounded shadow transition-all cursor-pointer text-center"
            >
              Asistente IA
            </button>
          </div>
        </div>
      </section>

      {/* CUERPO PRINCIPAL (Layout similar a los bloques del portal) */}
      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* BANNER INFORMATIVO TIPO 2FA */}
        <div className="mb-10 rounded-lg bg-[#4A4D55] text-white p-6 md:p-8 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-6 border-l-8 border-[#00A3E0]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-[#00A3E0] text-white text-[10px] font-black px-2 py-0.5 rounded">
                NUEVO SERVICIO
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white">
                RESERVA INTELIGENTE CON ASISTENCIA IA
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-300">
              ¿Sabías que puedes consultar disponibilidad y agendar tu espacio directamente desde el chat flotante?
            </p>
            <ul className="text-xs text-sky-300 space-y-1 pt-1">
              <li>✓ Consulta inmediata de bloques libres por sede</li>
              <li>✓ Registro rápido con tu RUT institucional</li>
            </ul>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
            className="px-6 py-3 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            Abrir Chatbot Ahora
          </button>
        </div>

        {/* SECCIÓN ACCESOS DIRECTOS */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#00629B] border-b-2 border-[#00629B] pb-2 inline-block mb-6">
            Servicios <span className="text-[#00A3E0]">Disponibles</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Tarjeta 1 */}
            <div className="bg-white border border-slate-200 rounded p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-[#00629B]/10 text-[#00629B] font-bold text-lg flex items-center justify-center rounded mb-4">
                  📚
                </div>
                <h3 className="font-bold text-[#00629B] text-base mb-2">
                  Reserva de Cubículos
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Selecciona la sede, fecha y bloque horario que necesitas para tu jornada de estudio individual o en equipo.
                </p>
              </div>
              <Link
                to="/reservar"
                className="text-xs font-bold text-[#00A3E0] hover:text-[#00629B] flex items-center gap-1"
              >
                Ir al Formulario →
              </Link>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-white border border-slate-200 rounded p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-[#7AB800]/10 text-[#7AB800] font-bold text-lg flex items-center justify-center rounded mb-4">
                  🤖
                </div>
                <h3 className="font-bold text-[#00629B] text-base mb-2">
                  Asistente Virtual
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Interactúa en lenguaje natural para realizar o cancelar reservas sin llenar formularios extensos.
                </p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                className="text-xs font-bold text-[#FFC20E] hover:underline text-left cursor-pointer"
              >
                Probar Chatbot →
              </button>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-white border border-slate-200 rounded p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-[#FFC20E]/20 text-[#00629B] font-bold text-lg flex items-center justify-center rounded mb-4">
                  👥
                </div>
                <h3 className="font-bold text-[#00629B] text-base mb-2">
                  Trabajo Colaborativo
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Registra a tus compañeros acompañantes al momento de realizar la reserva de tu espacio.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Hasta 10 espacios por bloque
              </span>
            </div>

          </div>
        </div>

      </main>

      <footer className="bg-[#00629B] text-white py-6 border-t-4 border-[#00A3E0] text-center text-xs">
        <p>© {new Date().getFullYear()} Universidad Católica de Temuco — Dirección de Bibliotecas</p>
      </footer>

    </div>
  );
}