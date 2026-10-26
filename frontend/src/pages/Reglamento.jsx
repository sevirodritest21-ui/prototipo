import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./Reglamento.css";

const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
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
const IconAlert = (p) => <Icon {...p} path={<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" /></>} />;
const IconCheck = (p) => <Icon {...p} path={<path d="M20 6L9 17l-5-5" />} />;
const IconCross = (p) => <Icon {...p} path={<path d="M18 6L6 18M6 6l12 12" />} />;
const IconShield = (p) => <Icon {...p} path={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />} />;
const IconArrowRight = (p) => <Icon {...p} path={<path d="M5 12h14M12 5l7 7-7 7" />} />;

export default function Reglamento() {
  const [sedeSeleccionada, setSedeSeleccionada] = useState("san-francisco");
  const [busqueda, setBusqueda] = useState("");
  const [seccionActiva, setSeccionActiva] = useState("todas");

  const sedesData = {
    "san-francisco": {
      nombre: "Biblioteca Central (San Francisco)",
      campus: "Campus San Francisco",
      ubicacion: "Manuel Montt 56, Temuco",
      icono: "🏛️",
      horarios: [
        { dias: "Lunes a Viernes", horas: "8:30 – 18:00 hrs" },
        { dias: "Sábados y Domingos", horas: "Cerrado" }
      ],
      servicios: ["Atención presencial en mesón", "Cubículos individuales y grupales", "Préstamo de material impreso"],
      checkOpen: () => {
        const now = new Date();
        const dia = now.getDay();
        const minutos = now.getHours() * 60 + now.getMinutes();
        return dia >= 1 && dia <= 5 && minutos >= 8 * 60 + 30 && minutos <= 18 * 60;
      }
    },
    "juan-pablo": {
      nombre: "Biblioteca San Juan Pablo II",
      campus: "Campus San Juan Pablo II",
      ubicacion: "Rudecindo Ortega 02950, Temuco",
      icono: "🎓",
      horarios: [
        { dias: "Lunes a Viernes", horas: "8:30 – 20:00 hrs" },
        { dias: "Sábados", horas: "10:30 – 13:30 hrs" },
        { dias: "Domingos", horas: "Cerrado" }
      ],
      servicios: ["Horario extendido vespertino", "Control de acceso HikCentral", "Salas de trabajo colaborativo"],
      checkOpen: () => {
        const now = new Date();
        const dia = now.getDay();
        const minutos = now.getHours() * 60 + now.getMinutes();
        if (dia >= 1 && dia <= 5) return minutos >= 8 * 60 + 30 && minutos <= 20 * 60;
        if (dia === 6) return minutos >= 10 * 60 + 30 && minutos <= 13 * 60 + 30;
        return false;
      }
    }
  };

  const sedeActual = sedesData[sedeSeleccionada];
  const estaAbierto = sedeActual.checkOpen();

  const scrollToSection = (id) => {
    setSeccionActiva(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const matchesSearch = (textos) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return textos.some((t) => t && t.toLowerCase().includes(q));
  };

  return (
    <div className="rg-root">
      <div className="rg-ambient" aria-hidden="true">
        <div className="rg-orb rg-orb--1" />
        <div className="rg-orb rg-orb--2" />
        <div className="rg-orb rg-orb--3" />
      </div>

      <header className="rg-header">
        <div className="rg-header-grid" aria-hidden="true" />
        <div className="rg-container">
          <div className="rg-header-content">
            <div>
              <div className="rg-tag-hub">
                <span>✦</span> Portal Oficial de Convivencia y Políticas • Biblioteca UCT
              </div>
              <h1 className="rg-title-hub">
                Reglamento y Horarios de Atención
              </h1>
              <p className="rg-lead-hub">
                Infórmate sobre los márgenes de puntualidad, el sistema disciplinario automático y las pautas para asegurar un entorno de estudio armónico en todas las salas.
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
                Asistente IA 24/7
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="rg-container">
        <div className="rg-split-layout">
          <aside className="rg-sidebar">
            <div className="rg-card-panel">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                🏛️ Sedes y Horarios
              </div>

              <div className="rg-campus-switcher">
                <button
                  type="button"
                  onClick={() => setSedeSeleccionada("san-francisco")}
                  className={`rg-campus-tab ${sedeSeleccionada === "san-francisco" ? "is-active" : ""}`}
                >
                  San Francisco
                </button>
                <button
                  type="button"
                  onClick={() => setSedeSeleccionada("juan-pablo")}
                  className={`rg-campus-tab ${sedeSeleccionada === "juan-pablo" ? "is-active" : ""}`}
                >
                  San Juan Pablo II
                </button>
              </div>

              <div className="rg-live-status-row">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  {sedeActual.campus}
                </span>
                <span className={`rg-live-pill ${estaAbierto ? "rg-live-pill--open" : "rg-live-pill--closed"}`}>
                  <span className="rg-live-dot" />
                  {estaAbierto ? "Abierto Ahora" : "Cerrado"}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {sedeActual.horarios.map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">{h.dias}</span>
                    <span className="font-bold text-[#00629B] dark:text-[#38BDF8]">{h.horas}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                {sedeActual.servicios.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <IconCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rg-card-panel">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                📑 Navegación por Artículos
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => scrollToSection("norma-tolerancia")}
                  className={`w-full text-left rg-nav-item ${seccionActiva === "norma-tolerancia" ? "is-selected" : ""}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>⏱️</span> 1. Tolerancia 15 Min
                  </span>
                  <IconArrowRight className="w-3.5 h-3.5 opacity-40" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("norma-sanciones")}
                  className={`w-full text-left rg-nav-item ${seccionActiva === "norma-sanciones" ? "is-selected" : ""}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>🚫</span> 2. Inasistencias y Faltas
                  </span>
                  <IconArrowRight className="w-3.5 h-3.5 opacity-40" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("norma-convivencia")}
                  className={`w-full text-left rg-nav-item ${seccionActiva === "norma-convivencia" ? "is-selected" : ""}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>🤝</span> 3. Convivencia e Higiene
                  </span>
                  <IconArrowRight className="w-3.5 h-3.5 opacity-40" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("norma-canales")}
                  className={`w-full text-left rg-nav-item ${seccionActiva === "norma-canales" ? "is-selected" : ""}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>💻</span> 4. Canales y Aforo
                  </span>
                  <IconArrowRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-white dark:from-slate-900 dark:to-slate-800 border border-sky-100 dark:border-sky-950 flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  ¿Tienes dudas con el reglamento?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Consulta de inmediato con el chatbot institucional.
                </p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                  className="text-xs font-black text-[#00629B] dark:text-[#38BDF8] mt-1 hover:underline cursor-pointer block"
                >
                  Preguntar a la IA →
                </button>
              </div>
            </div>
          </aside>

          <section className="rg-main-canvas">
            <div className="rg-search-bar">
              <span className="text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Buscar por palabra clave (ej. 15 minutos, comida, sanción, acompañantes...)"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="rg-search-input"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2"
                >
                  ✕
                </button>
              )}
            </div>

            {matchesSearch(["tolerancia", "15 minutos", "asistencia", "liberacion", "cancelacion", "retraso"]) && (
              <article id="norma-tolerancia" className="rg-hero-visual-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider">
                    Artículo 1 • Puntualidad
                  </span>
                  <span className="text-xs font-bold text-slate-400">Tolerancia Máxima</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white">
                  Margen de Tolerancia de 15 Minutos y Validación
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Para asegurar que los cubículos no permanezcan desocupados con demanda en espera, rige un protocolo automatizado de liberación presencial:
                </p>

                <div className="rg-visual-timeline">
                  <div className="rg-timeline-node">
                    <span className="rg-timeline-badge bg-emerald-100 text-emerald-800">00:00 Min</span>
                    <strong className="text-xs font-extrabold text-slate-900 dark:text-white">Inicio del Bloque</strong>
                    <p className="text-[11px] text-slate-500">Comienza tu hora reservada. Puedes ingresar de inmediato validando en mesón.</p>
                  </div>

                  <div className="rg-timeline-node">
                    <span className="rg-timeline-badge bg-amber-100 text-amber-800">15:00 Min</span>
                    <strong className="text-xs font-extrabold text-slate-900 dark:text-white">Fin de Tolerancia</strong>
                    <p className="text-[11px] text-slate-500">Último minuto para presentar tu credencial TUI física o digital en el mesón.</p>
                  </div>

                  <div className="rg-timeline-node">
                    <span className="rg-timeline-badge bg-rose-100 text-rose-800">15:01 Min</span>
                    <strong className="text-xs font-extrabold text-slate-900 dark:text-white">Liberación Automática</strong>
                    <p className="text-[11px] text-slate-500">El sistema cancela el cupo, lo asigna a la comunidad y genera 1 inasistencia.</p>
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <IconAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Ejemplo práctico:</strong> Si tu reserva fue fijada a las 11:00 hrs, tu plazo improrrogable de presentación culmina a las 11:15 hrs. A las 11:16 hrs el cubículo pasa a estar disponible para cualquier otro estudiante.
                  </div>
                </div>
              </article>
            )}

            {matchesSearch(["sancion", "sanciones", "inasistencia", "inasistencias", "suspension", "bloqueo", "faltas", "dias"]) && (
              <article id="norma-sanciones" className="rg-hero-visual-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
                    Artículo 2 • Disciplina
                  </span>
                  <span className="text-xs font-bold text-slate-400">Régimen Automático</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white">
                  Sistema de Inasistencias y Suspensión (2 Faltas = 3 Días)
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Las faltas injustificadas perjudican al resto del estudiantado. El sistema aplica suspensiones automáticas y graduales en la cuenta del titular:
                </p>

                <div className="rg-strike-grid">
                  <div className="rg-strike-card rg-strike-card--warning">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-800 uppercase">Falta 1 de 2</span>
                      <span className="text-xl">⚠️</span>
                    </div>
                    <strong className="text-sm font-bold text-amber-900 dark:text-amber-300">
                      Advertencia Preventiva
                    </strong>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      Se registra en tu ficha estudiantil y se notifica en tu panel de control. Puedes seguir reservando, pero una segunda falta detonará la sanción temporal.
                    </p>
                  </div>

                  <div className="rg-strike-card rg-strike-card--danger">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-800 uppercase">Falta 2 de 2</span>
                      <span className="text-xl">🚫</span>
                    </div>
                    <strong className="text-sm font-bold text-rose-900 dark:text-rose-300">
                      Suspensión por 3 Días Continuos
                    </strong>
                    <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                      Bloqueo automático en plataforma web y chatbot IA. No podrás agendar cubículos durante 72 horas corridas contadas desde la infracción.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                  <IconCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <strong>Cómo evitar sanciones:</strong> Si no podrás asistir, ingresa a la sección <em>Mis Reservas</em> o pídele al Chatbot que cancele tu cita antes de que comience el horario. Las cancelaciones previas no generan falta.
                  </div>
                </div>
              </article>
            )}

            {matchesSearch(["convivencia", "comida", "alimentos", "silencio", "ruido", "sillas", "mesas", "mobiliario", "bebidas", "cuidado"]) && (
              <article id="norma-convivencia" className="rg-hero-visual-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
                    Artículo 3 • Convivencia
                  </span>
                  <span className="text-xs font-bold text-slate-400">Uso de Espacios</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white">
                  Normas de Convivencia, Higiene y Cuidado Material
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Los cubículos son áreas diseñadas para la concentración y el trabajo colaborativo de alto rendimiento. Respeta las siguientes disposiciones:
                </p>

                <div className="rg-dos-donts-grid">
                  <div className="rg-dos-card">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
                      <IconCheck className="w-4 h-4 text-emerald-600" /> Conductas Permitidas
                    </div>
                    <ul className="rg-list-checks">
                      <li>
                        <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Consumo de botellas de agua o termos con cierre hermético.</span>
                      </li>
                      <li>
                        <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Diálogo en tono moderado orientado a materias académicas.</span>
                      </li>
                      <li>
                        <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Uso de computadores personales y pizarras asignadas a la sala.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rg-donts-card">
                    <div className="flex items-center gap-2 text-xs font-black text-rose-800 uppercase tracking-wider">
                      <IconCross className="w-4 h-4 text-rose-600" /> Prohibiciones Estrictas
                    </div>
                    <ul className="rg-list-checks">
                      <li>
                        <IconCross className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>Consumo de alimentos calientes, platos preparados o snacks ruidosos.</span>
                      </li>
                      <li>
                        <IconCross className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>Trasladar sillas o mesas desde otras salas o pasillos.</span>
                      </li>
                      <li>
                        <IconCross className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>Sobrepasar el aforo delimitado en la señalética exterior del cubículo.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </article>
            )}

            {matchesSearch(["canales", "aforo", "acompanantes", "reserva", "chatbot", "credencial", "tui", "limite"]) && (
              <article id="norma-canales" className="rg-hero-visual-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                    Artículo 4 • Gestión Digital
                  </span>
                  <span className="text-xs font-bold text-slate-400">Políticas de Asignación</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white">
                  Límites de Reserva, Acompañantes y Trazabilidad
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-lg mb-1">🎯</div>
                    <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">1 Reserva Activa</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Cada estudiante puede mantener solo un cupo agendado simultáneo para evitar acaparamientos.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-lg mb-1">👥</div>
                    <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Registro de Acompañantes</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">En reservas grupales es obligatorio indicar RUT y nombre de los integrantes por seguridad institucional.</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-lg mb-1">🪪</div>
                    <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Validación TUI</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">La credencial universitaria (física o desde la App UCT) es indispensable para validar el ingreso.</p>
                  </div>
                </div>
              </article>
            )}

            <div className="rg-scenario-hub">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                  Casos de Aplicación Rápida
                </h3>
              </div>

              <div className="rg-scenario-grid">
                <div className="rg-scenario-item">
                  <div className="rg-scenario-q">
                    <span>✦</span> ¿Qué ocurre si llego a las 10:16 a un bloque de las 10:00?
                  </div>
                  <p className="rg-scenario-a">
                    El sistema libera el cubículo a las 10:15 en punto. A las 10:16 la sala ya fue reasignada y se te computa 1 inasistencia.
                  </p>
                </div>

                <div className="rg-scenario-item">
                  <div className="rg-scenario-q">
                    <span>✦</span> ¿Puedo cederle mi cubículo a un amigo?
                  </div>
                  <p className="rg-scenario-a">
                    No. Las reservas son personales e intransferibles. Debe validarse presencialmente la identidad del titular.
                  </p>
                </div>

                <div className="rg-scenario-item">
                  <div className="rg-scenario-q">
                    <span>✦</span> ¿Cómo se cuentan los 3 días de suspensión?
                  </div>
                  <p className="rg-scenario-a">
                    Corren de forma continua (72 horas) desde la segunda inasistencia. Al término del plazo, el acceso se reanuda automáticamente.
                  </p>
                </div>

                <div className="rg-scenario-item">
                  <div className="rg-scenario-q">
                    <span>✦</span> ¿Puedo cancelar desde el celular?
                  </div>
                  <p className="rg-scenario-a">
                    Sí, desde la sección "Mis Reservas" o solicitándolo directamente al Chatbot antes de que inicie la hora reservada.
                  </p>
                </div>
              </div>
            </div>

            <div className="rg-footer-banner">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-bold uppercase tracking-wider mb-2">
                  <IconShield className="w-3.5 h-3.5 text-[#FFC20E]" />
                  Espacios Compartidos de Excelencia
                </div>
                <h3 className="text-xl font-serif font-black text-white">¿Listo para estudiar en tu cubículo?</h3>
                <p className="text-xs text-sky-100 max-w-xl mt-1 leading-relaxed">
                  Selecciona tu sede, revisa la disponibilidad horaria en tiempo real y asegura tu espacio cumpliendo con el protocolo institucional.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link to="/reservar" className="rg-btn-cta rg-btn-cta--gold text-xs">
                  <IconCalendar className="w-4 h-4" />
                  Ir al Formulario
                </Link>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                  className="rg-btn-cta rg-btn-cta--glass text-xs"
                >
                  <IconChat className="w-4 h-4" />
                  Hablar con Asistente
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
