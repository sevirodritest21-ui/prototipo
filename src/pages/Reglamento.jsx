import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Reglamento() {
  const [categoriaAbierta, setCategoriaAbierta] = useState(0);

  const horarios = [
    {
      sede: "Biblioteca Central (San Francisco)",
      campus: "Campus San Francisco",
      icono: "🏛️",
      colorBorde: "border-sky-500",
      bloques: [
        { dias: "Lunes a Viernes", horas: "8:30 – 18:00 hrs" }
      ]
    },
    {
      sede: "Biblioteca San Juan Pablo II",
      campus: "Campus San Juan Pablo II",
      icono: "🎓",
      colorBorde: "border-[#FFC20E]",
      bloques: [
        { dias: "Lunes a Viernes", horas: "8:30 – 20:00 hrs" },
        { dias: "Sábados", horas: "10:30 – 13:30 hrs" }
      ]
    }
  ];

  const categoriasReglamento = [
    {
      id: "tolerancia",
      icono: "⏱️",
      titulo: "Tolerancia y Validación de Asistencia (15 Minutos)",
      subtitulo: "Reglas de presentación presencial y liberación automática de cubículos",
      badge: "Puntualidad",
      colorBadge: "bg-sky-100 text-sky-800 border-sky-200",
      colorBorde: "border-sky-500",
      puntos: [
        {
          titulo: "Margen de tolerancia estricto de 15 minutos",
          detalle: "Dispones de hasta 15 minutos a contar desde la hora de inicio de tu bloque reservado para presentarte en el mesón de atención de la biblioteca y validar tu ingreso.",
          alerta: "Si tu bloque inicia a las 10:00 hrs, el plazo límite de presentación es a las 10:15 hrs."
        },
        {
          titulo: "Liberación automática del cubículo",
          detalle: "Transcurridos los 15 minutos sin registrar asistencia en el mesón, el sistema cancela la reserva en tiempo real y libera el cubículo inmediatamente para otros estudiantes en espera."
        },
        {
          titulo: "Validación mediante credencial institucional",
          detalle: "La asistencia debe validarse presentando la credencial universitaria TUI (física o digital) o cédula de identidad del titular de la reserva."
        }
      ]
    },
    {
      id: "sanciones",
      icono: "🚫",
      titulo: "Sistema de Inasistencias y Suspensión (2 Faltas / 3 Días)",
      subtitulo: "Mecanismo disciplinario automático para garantizar la equidad de acceso",
      badge: "Sanciones",
      colorBadge: "bg-rose-100 text-rose-800 border-rose-200",
      colorBorde: "border-rose-500",
      puntos: [
        {
          titulo: "Acumulación de inasistencias",
          detalle: "No presentarse dentro de los 15 minutos de tolerancia o no cancelar oportunamente genera 1 inasistencia registrada en la ficha del estudiante.",
          alerta: "Al acumular la primera inasistencia (1/2), el sistema emite una advertencia preventiva en tu panel de usuario."
        },
        {
          titulo: "Suspensión automática por 3 días continuos",
          detalle: "Al sumar 2 inasistencias en el periodo académico, la cuenta queda bloqueada automáticamente por 3 días consecutivos para realizar nuevas reservas por web o chatbot.",
          alerta: "El desbloqueo es automático una vez cumplidos los 3 días de sanción."
        },
        {
          titulo: "Cancelación oportuna sin penalización",
          detalle: "Si no podrás asistir, debes cancelar tu reserva en 'Mis Reservas' o mediante el Chatbot IA antes del inicio del bloque para no incurrir en inasistencias."
        }
      ]
    },
    {
      id: "convivencia",
      icono: "🤝",
      titulo: "Normas de Convivencia y Cuidado de Espacios",
      subtitulo: "Pautas obligatorias de uso, higiene y respeto al estudio compartido",
      badge: "Convivencia",
      colorBadge: "bg-amber-100 text-amber-900 border-amber-300",
      colorBorde: "border-[#FFC20E]",
      puntos: [
        {
          titulo: "Prohibición de consumo de alimentos y bebidas no embotelladas",
          detalle: "No está permitido consumir comidas ni bebidas calientes dentro de los cubículos para preservar la higiene, mobiliario y ventilación de las salas."
        },
        {
          titulo: "Cuidado del mobiliario y respeto al aforo",
          detalle: "No está permitido trasladar sillas ni mesas entre cubículos. Cada sala cuenta con un aforo máximo debidamente delimitado que no debe ser sobrepasado."
        },
        {
          titulo: "Clima de estudio y tono de voz moderado",
          detalle: "Los cubículos son salas de trabajo colaborativo y estudio grupal. Se debe mantener un volumen de conversación moderado que no perturbe las salas contiguas ni el silencio general de la biblioteca."
        },
        {
          titulo: "Uso exclusivo para la comunidad UC Temuco",
          detalle: "El servicio está destinado a estudiantes regulares con matrícula vigente. En reservas grupales, cada integrante debe estar registrado institucionalmente."
        }
      ]
    },
    {
      id: "canales",
      icono: "💻",
      titulo: "Canales de Reserva y Políticas de Asignación",
      subtitulo: "Límites por usuario, modalidades y trazabilidad",
      badge: "Plataforma",
      colorBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      colorBorde: "border-emerald-500",
      puntos: [
        {
          titulo: "Límite de 1 reserva activa por usuario",
          detalle: "Cada estudiante puede mantener únicamente 1 reserva activa a la vez en el sistema, permitiendo que la totalidad de la comunidad tenga acceso equitativo a los cubículos."
        },
        {
          titulo: "Reserva web y asistente virtual IA",
          detalle: "Las reservas pueden gestionarse tanto desde el formulario web oficial como a través del Asistente Virtual Inteligente 24/7 de la biblioteca."
        },
        {
          titulo: "Registro de acompañantes para aforo institucional",
          detalle: "En modalidad grupal, es requisito completar los nombres de los acompañantes para asegurar la trazabilidad del espacio ante incidentes o controles de aforo."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50/40 to-amber-50/30 pt-16 font-sans text-slate-800">
      <section className="bg-gradient-to-r from-[#004B75] via-[#00629B] to-[#007AB8] text-white py-12 px-6 shadow-md border-b-4 border-[#FFC20E]">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 border border-white/20">
              <span>🏛️</span> Normativa Universitaria • Biblioteca UCT
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Reglamento y Horarios de Cubículos
            </h1>
            <p className="mt-3 text-sky-100 text-sm md:text-base max-w-2xl leading-relaxed">
              Conoce las pautas vigentes sobre tolerancia de asistencia, sanciones por inasistencias y normas de convivencia para garantizar un uso equitativo de los espacios de estudio.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              to="/reservar"
              className="px-6 py-3.5 bg-gradient-to-r from-[#FFC20E] to-[#FFA000] hover:from-[#FFA000] hover:to-[#FF8F00] text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all text-center"
            >
              📅 Reservar Cubículo
            </Link>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm rounded-2xl shadow transition-all cursor-pointer text-center backdrop-blur-md"
            >
              💬 Consultar con IA
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-12">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 bg-[#00629B] text-white rounded-2xl flex items-center justify-center text-lg shadow-sm">
              🕒
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Horario de Atención por Sede
              </h2>
              <p className="text-xs md:text-sm text-slate-500">
                Horarios oficiales habilitados para el uso y reserva de salas de estudio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {horarios.map((h, i) => (
              <div
                key={i}
                className={`bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border-l-8 ${h.colorBorde} border border-slate-100 flex flex-col justify-between gap-6 transition-all hover:shadow-2xl`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl p-2.5 bg-sky-50 rounded-2xl border border-sky-100">
                      {h.icono}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                      Presencial
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-900">
                      {h.sede}
                    </h3>
                    <p className="text-xs font-semibold text-sky-700">
                      {h.campus}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  {h.bloques.map((b, bi) => (
                    <div
                      key={bi}
                      className="flex items-center justify-between px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-100 text-xs"
                    >
                      <span className="font-bold text-slate-700">{b.dias}:</span>
                      <span className="font-extrabold text-[#00629B] bg-white px-3 py-1 rounded-xl shadow-xs border border-slate-200">
                        {b.horas}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-[#FFC20E] text-slate-950 rounded-2xl flex items-center justify-center text-lg shadow-sm">
                📜
              </span>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Reglamento General de Cubículos
                </h2>
                <p className="text-xs md:text-sm text-slate-500">
                  Haz clic en cada sección para desplegar los detalles de la normativa.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCategoriaAbierta(categoriaAbierta !== null ? null : 0)}
                className="text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                {categoriaAbierta !== null ? "Contraer Todo" : "Expandir Todo"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {categoriasReglamento.map((cat, idx) => {
              const estaAbierto = categoriaAbierta === idx;
              return (
                <div
                  key={cat.id}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm ${
                    estaAbierto
                      ? `border-l-8 ${cat.colorBorde} border-slate-200 shadow-md`
                      : "border-slate-200/80 hover:border-sky-300 hover:shadow-md"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCategoriaAbierta(estaAbierto ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                        {cat.icono}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                            {cat.titulo}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${cat.colorBadge}`}>
                            {cat.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 sm:line-clamp-none">
                          {cat.subtitulo}
                        </p>
                      </div>
                    </div>

                    <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 transition-transform duration-300 ${
                      estaAbierto ? "rotate-180 bg-sky-50 text-sky-700" : ""
                    }`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {estaAbierto && (
                    <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cat.puntos.map((punto, pIdx) => (
                          <div
                            key={pIdx}
                            className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                                {punto.titulo}
                              </h4>
                              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                                {punto.detalle}
                              </p>
                            </div>

                            {punto.alerta && (
                              <div className="mt-2 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-1.5 flex items-start gap-1.5">
                                <span className="shrink-0">⚠️</span>
                                <span>{punto.alerta}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-gradient-to-r from-[#004B75] via-[#00629B] to-[#007AB8] rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-[#FFC20E]/40">
          <div className="space-y-2 max-w-2xl">
            <span className="bg-[#FFC20E] text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              ¿DUDAS SOBRE EL REGLAMENTO O UNA SANCIÓN?
            </span>
            <h3 className="text-2xl font-black tracking-tight">
              Consulta en vivo con nuestro Asistente Virtual
            </h3>
            <p className="text-xs md:text-sm text-sky-100 leading-relaxed">
              El chatbot con IA de la biblioteca conoce los tiempos de tolerancia, el estado de tus inasistencias y los horarios de cada sede en tiempo real.
            </p>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
            className="px-6 py-3.5 bg-gradient-to-r from-[#FFC20E] to-[#FFA000] hover:from-[#FFA000] hover:to-[#FF8F00] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Abrir Asistente IA →
          </button>
        </section>
      </main>
    </div>
  );
}
