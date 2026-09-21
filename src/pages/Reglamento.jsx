import React, { useState } from "react";
import { Link } from "react-router-dom";

const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {path}
  </svg>
);

const IconClock = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />;
const IconDoc = (p) => <Icon {...p} path={<><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>} />;
const IconCalendar = (p) => <Icon {...p} path={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>} />;
const IconChat = (p) => <Icon {...p} path={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />} />;
const IconAlert = (p) => <Icon {...p} path={<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" /></>} />;
const IconChevron = (p) => <Icon {...p} path={<path d="M6 9l6 6 6-6" />} />;
const IconBuilding = (p) => <Icon {...p} path={<><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" /></>} />;

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
    <div className="min-h-screen bg-[#F4F6F9] pt-16 pb-20 font-sans text-slate-800">
      
      <header className="bg-[#00629B] text-white shadow-md">
        <div className="mx-auto max-w-6xl px-5 py-9 sm:py-11">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sky-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 border border-white/15 text-[#FFC20E]">
                  <IconDoc className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                  Normativa Universitaria • Biblioteca UCT
                </span>
              </div>

              <h1 className="mt-4 font-serif text-3xl sm:text-[2.5rem] leading-tight tracking-tight text-white">
                Reglamento y horarios de cubículos
              </h1>

              <p className="mt-2.5 text-[14px] leading-relaxed text-sky-100/90">
                Conoce las pautas vigentes sobre tolerancia de asistencia, sanciones por inasistencias y normas de convivencia para garantizar un uso equitativo de los espacios de estudio.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Link
                to="/reservar"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FFC20E] px-4 py-2.5 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-[#FFCA28] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <IconCalendar className="w-4 h-4" /> Reservar cubículo
              </Link>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[13px] font-semibold transition-colors cursor-pointer"
              >
                <IconChat className="w-4 h-4" /> Consultar con IA
              </button>
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B]" />
      </header>

      <main className="mx-auto max-w-6xl px-5 mt-8 space-y-10">
        
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#00629B] text-white shadow-sm">
              <IconClock className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                Horario de atención por sede
              </h2>
              <p className="text-[13px] text-slate-500">
                Horarios oficiales habilitados para el uso y reserva de salas de estudio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {horarios.map((h, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-5 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-xl border border-sky-100">
                      {h.icono}
                    </span>
                    <span className="rounded px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                      Presencial
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-900">
                      {h.sede}
                    </h3>
                    <p className="text-[13px] font-medium text-[#00629B]">
                      {h.campus}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {h.bloques.map((b, bi) => (
                    <div
                      key={bi}
                      className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 flex items-center justify-between text-[13px]"
                    >
                      <span className="font-medium text-slate-700">{b.dias}:</span>
                      <span className="rounded-md bg-white px-2.5 py-1 font-bold text-[#00629B] border border-slate-200/80 shadow-xs tabular-nums">
                        {b.horas}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FFC20E] text-slate-900 shadow-sm">
                <IconDoc className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                  Reglamento general de cubículos
                </h2>
                <p className="text-[13px] text-slate-500">
                  Haz clic en cada sección para desplegar los detalles de la normativa.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCategoriaAbierta(categoriaAbierta !== null ? null : 0)}
                className="text-[12px] font-medium text-[#00629B] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                {categoriaAbierta !== null ? "Contraer todo" : "Expandir todo"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {categoriasReglamento.map((cat, idx) => {
              const estaAbierto = categoriaAbierta === idx;
              return (
                <div
                  key={cat.id}
                  className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200 ${
                    estaAbierto
                      ? "border-l-4 border-l-[#00629B] shadow-md"
                      : "hover:border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCategoriaAbierta(estaAbierto ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/40"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                        {cat.icono}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 leading-snug">
                            {cat.titulo}
                          </h3>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${cat.colorBadge}`}>
                            {cat.badge}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-500 line-clamp-1 sm:line-clamp-none">
                          {cat.subtitulo}
                        </p>
                      </div>
                    </div>

                    <span className={`flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 shrink-0 transition-transform duration-200 ${
                      estaAbierto ? "rotate-180 bg-[#00629B] text-white" : ""
                    }`}>
                      <IconChevron className="w-4 h-4" />
                    </span>
                  </button>

                  {estaAbierto && (
                    <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-3 border-t border-slate-100 space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cat.puntos.map((punto, pIdx) => (
                          <div
                            key={pIdx}
                            className="rounded-lg bg-slate-50 border border-slate-200/80 p-4 space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <h4 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#00629B]" />
                                {punto.titulo}
                              </h4>
                              <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">
                                {punto.detalle}
                              </p>
                            </div>

                            {punto.alerta && (
                              <div className="mt-2 text-[12px] font-medium text-amber-900 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2 flex items-start gap-2">
                                <IconAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
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

        <section className="rounded-xl bg-[#00629B] p-7 md:p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6 border-b-2 border-[#FFC20E]">
          <div className="space-y-2 max-w-2xl">
            <span className="bg-[#FFC20E] text-slate-900 font-bold text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider">
              ¿Dudas sobre el reglamento o una sanción?
            </span>
            <h3 className="font-serif text-2xl font-bold tracking-tight text-white">
              Consulta en vivo con nuestro asistente virtual
            </h3>
            <p className="text-[13px] text-sky-100/90 leading-relaxed">
              El chatbot con IA de la biblioteca conoce los tiempos de tolerancia, el estado de tus inasistencias y los horarios de cada sede en tiempo real.
            </p>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
            className="inline-flex items-center gap-2 rounded-md bg-[#FFC20E] px-5 py-2.5 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-[#FFCA28] shadow-sm cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            <IconChat className="w-4 h-4" /> Abrir Asistente IA
          </button>
        </section>
      </main>
    </div>
  );
}
