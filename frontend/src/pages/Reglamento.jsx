import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Reglamento.css";

const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {path}
  </svg>
);

const IconClock = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />;
const IconCalendar = (p) => <Icon {...p} path={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>} />;
const IconChat = (p) => <Icon {...p} path={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />} />;
const IconCheck = (p) => <Icon {...p} path={<path d="M20 6L9 17l-5-5" />} />;
const IconCross = (p) => <Icon {...p} path={<path d="M18 6L6 18M6 6l12 12" />} />;
const IconShield = (p) => <Icon {...p} path={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />} />;
const IconUsers = (p) => <Icon {...p} path={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>} />;
const IconCard = (p) => <Icon {...p} path={<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>} />;
const IconBuilding = (p) => <Icon {...p} path={<><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" /></>} />;
const IconSearch = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>} />;

export default function Reglamento() {
  const [categoriaActiva, setCategoriaActiva] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  const sedes = [
    {
      id: "san-francisco",
      nombre: "Biblioteca Central",
      campus: "Campus San Francisco",
      ubicacion: "Manuel Montt 56, Temuco",
      horarios: [
        { dias: "Lunes a Viernes", horas: "08:30 – 18:00 hrs" },
        { dias: "Sábados y Domingos", horas: "Cerrado" }
      ],
      servicios: [
        "Atención presencial y validación en mesón",
        "Cubículos individuales y salas grupales",
        "Préstamo de bibliografía y equipamiento"
      ],
      checkOpen: () => {
        const now = new Date();
        const dia = now.getDay();
        const min = now.getHours() * 60 + now.getMinutes();
        return dia >= 1 && dia <= 5 && min >= 8 * 60 + 30 && min <= 18 * 60;
      }
    },
    {
      id: "juan-pablo",
      nombre: "Biblioteca San Juan Pablo II",
      campus: "Campus San Juan Pablo II",
      ubicacion: "Rudecindo Ortega 02950, Temuco",
      horarios: [
        { dias: "Lunes a Viernes", horas: "08:30 – 20:00 hrs" },
        { dias: "Sábados", horas: "10:30 – 13:30 hrs" },
        { dias: "Domingos", horas: "Cerrado" }
      ],
      servicios: [
        "Horario vespertino extendido",
        "Control de acceso inteligente y mesón",
        "Salas de estudio colaborativo equipadas"
      ],
      checkOpen: () => {
        const now = new Date();
        const dia = now.getDay();
        const min = now.getHours() * 60 + now.getMinutes();
        if (dia >= 1 && dia <= 5) return min >= 8 * 60 + 30 && min <= 20 * 60;
        if (dia === 6) return min >= 10 * 60 + 30 && min <= 13 * 60 + 30;
        return false;
      }
    }
  ];

  const pilares = [
    {
      titulo: "15 Min de Tolerancia",
      desc: "Plazo máximo desde el inicio del bloque para validar tu ingreso en mesón.",
      icon: <IconClock className="w-5 h-5 text-[#00629B] dark:text-[#38BDF8]" />,
      bg: "bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900"
    },
    {
      titulo: "1 Reserva Activa",
      desc: "Cada estudiante puede mantener un cupo vigente a la vez para uso equitativo.",
      icon: <IconCalendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900"
    },
    {
      titulo: "Credencial TUI",
      desc: "Presentación obligatoria de credencial física o digital (App UCT) al ingresar.",
      icon: <IconCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900"
    },
    {
      titulo: "Aforo y Registro",
      desc: "Respeto estricto de la capacidad de la sala y registro de acompañantes.",
      icon: <IconUsers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      bg: "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900"
    }
  ];

  const preguntasFrecuentes = [
    {
      q: "¿Qué ocurre si llego pasados los 15 minutos de inicio?",
      a: "El cubículo se libera automáticamente en el minuto 15 para que otros estudiantes que esperan sala puedan ocuparlo."
    },
    {
      q: "¿Puedo cancelar mi reserva si surge un imprevisto?",
      a: "Sí. Puedes liberarla en cualquier momento desde la pestaña 'Mis Reservas' o solicitándolo directamente en el asistente virtual."
    },
    {
      q: "¿Las reservas son transferibles a otro compañero?",
      a: "No. La reserva está asociada al RUT del estudiante titular, quien debe presentarse con su credencial TUI para activar la ocupación."
    },
    {
      q: "¿Puedo reservar otro bloque el mismo día?",
      a: "Una vez finalizado o liberado tu bloque activo, el sistema te habilita nuevamente para agendar otro horario disponible."
    }
  ];

  const coincideBusqueda = (palabras) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return palabras.some((p) => p && p.toLowerCase().includes(q));
  };

  const mostrarSeccion = (id, palabras) => {
    const pasaTab = categoriaActiva === "todas" || categoriaActiva === id;
    return pasaTab && coincideBusqueda(palabras);
  };

  return (
    <div className="rg-root">
      <div className="rg-ambient" aria-hidden="true">
        <div className="rg-orb rg-orb--1" />
        <div className="rg-orb rg-orb--2" />
      </div>

      <header className="rg-header">
        <div className="rg-header-grid" aria-hidden="true" />
        <div className="rg-container">
          <div className="rg-header-content">
            <div>
              <div className="rg-tag-hub">
                <span className="rg-eyebrow-dot">★</span>
                Portal del Estudiante — Biblioteca UCT
              </div>
              <h1 className="rg-title-hub">
                Reglamento y{" "}
                <span className="rg-gradient-text rg-underline">
                  Horarios.
                  <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                    <path
                      d="M4 14 C 60 4, 120 4, 170 10 S 260 18, 296 6"
                      fill="none"
                      stroke="#FFC20E"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="rg-lead-hub">
                Conoce los tiempos de validación, las normas de convivencia en sala y los horarios de funcionamiento de cada campus para aprovechar al máximo tu espacio de estudio.
              </p>
            </div>

            <div className="rg-header-tools">
              <Link to="/reservar" className="rg-btn-cta rg-btn-cta--gold">
                <IconCalendar className="w-4 h-4" />
                Reservar Cubículo
              </Link>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                className="rg-btn-cta rg-btn-cta--glass"
              >
                <IconChat className="w-4 h-4" />
                Consultar Asistente
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="rg-container">
        <section className="rg-pillars-grid" aria-label="Resumen de normas principales">
          {pilares.map((p, idx) => (
            <div key={idx} className="rg-pillar-card">
              <div className={`rg-pillar-icon ${p.bg}`}>
                {p.icon}
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                  {p.titulo}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        <div className="rg-toolbar">
          <div className="rg-tabs-row" role="tablist">
            {[
              { id: "todas", label: "Vista General" },
              { id: "puntualidad", label: "Puntualidad y Reservas" },
              { id: "convivencia", label: "Convivencia en Sala" },
              { id: "horarios", label: "Horarios por Sede" },
              { id: "faq", label: "Preguntas Frecuentes" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoriaActiva(tab.id)}
                className={`rg-tab-btn ${categoriaActiva === tab.id ? "is-active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rg-search-box">
            <IconSearch className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Filtrar norma o palabra clave..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="rg-search-input"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="rg-sections-stack">
          {mostrarSeccion("puntualidad", [
            "puntualidad", "tolerancia", "15 minutos", "reserva", "liberacion", "tui", "credencial", "acompanantes", "cancelar"
          ]) && (
            <section className="rg-section-card">
              <div className="rg-section-header">
                <div>
                  <span className="rg-section-badge bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    Sección 01 • Gestión de Cupos
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                    Protocolo de Puntualidad, Validación y Reservas
                  </h2>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  Control presencial en mesón de biblioteca
                </p>
              </div>

              <div className="rg-steps-grid">
                <div className="rg-step-box">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Minuto 00:00
                    </span>
                    <span className="text-xs font-bold text-slate-400">Paso 1</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                    Inicio del Bloque Reservado
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Acércate al mesón de tu sede al comenzar tu hora agendada para registrar tu ingreso y habilitar el cubículo.
                  </p>
                </div>

                <div className="rg-step-box">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Hasta Min 15:00
                    </span>
                    <span className="text-xs font-bold text-slate-400">Paso 2</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                    Ventana de Tolerancia
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Dispones de 15 minutos desde el inicio del bloque para validar tu asistencia presentando tu credencial TUI física o digital.
                  </p>
                </div>

                <div className="rg-step-box">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Minuto 15:01
                    </span>
                    <span className="text-xs font-bold text-slate-400">Paso 3</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                    Liberación del Espacio
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Si no se registra el ingreso dentro del margen de tolerancia, el cubículo se libera automáticamente para otro estudiante.
                  </p>
                </div>
              </div>

              <div className="rg-rules-subgrid">
                <div className="rg-rule-mini">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-[#00629B] dark:text-[#38BDF8]">
                    <IconCalendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Límite de 1 Reserva Activa
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Solo puedes mantener un horario vigente a la vez. Al finalizar tu bloque podrás agendar uno nuevo.
                    </p>
                  </div>
                </div>

                <div className="rg-rule-mini">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-[#00629B] dark:text-[#38BDF8]">
                    <IconUsers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Registro de Acompañantes
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      En cubículos grupales es requisito indicar el RUT de los integrantes del equipo al realizar la solicitud.
                    </p>
                  </div>
                </div>

                <div className="rg-rule-mini">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-[#00629B] dark:text-[#38BDF8]">
                    <IconCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Cancelación Anticipada
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Si no podrás asistir, libera tu cupo desde "Mis Reservas" o mediante el asistente virtual para apoyar a la comunidad.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {mostrarSeccion("convivencia", [
            "convivencia", "comida", "alimentos", "agua", "silencio", "ruido", "mobiliario", "sillas", "pizarras", "aforo", "limpieza"
          ]) && (
            <section className="rg-section-card">
              <div className="rg-section-header">
                <div>
                  <span className="rg-section-badge bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    Sección 02 • Cuidado del Entorno
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                    Normas de Convivencia, Higiene y Uso de Equipamiento
                  </h2>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  Espacios compartidos de concentración académica
                </p>
              </div>

              <div className="rg-convivencia-grid">
                <div className="rg-conv-panel rg-conv-panel--do">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <IconCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-300">
                        Conductas Permitidas
                      </h3>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80">
                        Prácticas que favorecen el estudio colaborativo
                      </p>
                    </div>
                  </div>

                  <ul className="rg-check-list">
                    <li>
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Ingresar botellas de agua o termos personales con tapa hermética antiderrame.</span>
                    </li>
                    <li>
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Mantener conversación y debate académico en un volumen moderado dentro del cubículo.</span>
                    </li>
                    <li>
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Utilizar pizarras, pantallas y enchufes dejando la sala limpia y ordenada al retirarse.</span>
                    </li>
                    <li>
                      <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Reportar cualquier desperfecto técnico o de mobiliario desde el portal o en mesón.</span>
                    </li>
                  </ul>
                </div>

                <div className="rg-conv-panel rg-conv-panel--dont">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <IconCross className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-rose-950 dark:text-rose-300">
                        Acciones No Permitidas
                      </h3>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400/80">
                        Restricciones para preservar las instalaciones
                      </p>
                    </div>
                  </div>

                  <ul className="rg-check-list">
                    <li>
                      <IconCross className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Consumir alimentos preparados, comidas calientes o snacks que generen olores o residuos.</span>
                    </li>
                    <li>
                      <IconCross className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Retirar o trasladar sillas y mesas desde otros cubículos o áreas comunes de lectura.</span>
                    </li>
                    <li>
                      <IconCross className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Exceder la capacidad máxima de personas establecida para cada sala de estudio.</span>
                    </li>
                    <li>
                      <IconCross className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Dejar objetos de valor sin supervisión o abandonar el cubículo por más de 20 minutos.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {mostrarSeccion("horarios", [
            "horarios", "sedes", "san francisco", "juan pablo", "sabado", "abierto", "cerrado", "campus", "ubicacion"
          ]) && (
            <section className="rg-section-card">
              <div className="rg-section-header">
                <div>
                  <span className="rg-section-badge bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
                    Sección 03 • Sedes y Atención
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                    Horarios de Funcionamiento por Campus
                  </h2>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  Estado de apertura en tiempo real
                </p>
              </div>

              <div className="rg-sedes-grid">
                {sedes.map((sede) => {
                  const abierto = sede.checkOpen();
                  return (
                    <div key={sede.id} className="rg-sede-card">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#004D7A] text-white flex items-center justify-center shrink-0">
                              <IconBuilding className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-slate-900 dark:text-white">
                                {sede.nombre}
                              </h3>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {sede.campus} • {sede.ubicacion}
                              </p>
                            </div>
                          </div>

                          <span className={`rg-live-pill shrink-0 ${abierto ? "rg-live-pill--open" : "rg-live-pill--closed"}`}>
                            <span className="rg-live-dot" />
                            {abierto ? "Abierto Ahora" : "Cerrado"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {sede.horarios.map((h, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs"
                            >
                              <span className="font-bold text-slate-600 dark:text-slate-300">{h.dias}</span>
                              <span className="font-extrabold text-[#00629B] dark:text-[#38BDF8]">{h.horas}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap gap-2">
                        {sede.servicios.map((srv, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                          >
                            <IconCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                            {srv}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {mostrarSeccion("faq", [
            "preguntas", "dudas", "frecuentes", "retraso", "cancelar", "amigo", "transferir", "mismo día", "mismo dia"
          ]) && (
            <section className="rg-section-card">
              <div className="rg-section-header">
                <div>
                  <span className="rg-section-badge bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    Sección 04 • Resolución Rápida
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                    Preguntas Frecuentes sobre el Reglamento
                  </h2>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  Casos habituales de uso diario
                </p>
              </div>

              <div className="rg-faq-grid">
                {preguntasFrecuentes.map((item, idx) => (
                  <div key={idx} className="rg-faq-card">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {item.q}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="rg-footer-banner">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-[11px] font-bold uppercase tracking-wider mb-2">
                <IconShield className="w-3.5 h-3.5 text-[#FFC20E]" />
                Sistema de Gestión de Espacios UCT
              </span>
              <h3 className="text-xl font-black text-white">
                ¿Todo claro para agendar tu próximo bloque de estudio?
              </h3>
              <p className="text-xs text-sky-100/90 max-w-xl mt-1 leading-relaxed">
                Elige tu campus, selecciona un cubículo disponible en tiempo real o resuelve cualquier consulta adicional con el asistente virtual.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link to="/reservar" className="rg-btn-cta rg-btn-cta--gold">
                <IconCalendar className="w-4 h-4" />
                Ir a Reservar Cubículo
              </Link>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                className="rg-btn-cta rg-btn-cta--glass"
              >
                <IconChat className="w-4 h-4" />
                Hablar con el Asistente
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
