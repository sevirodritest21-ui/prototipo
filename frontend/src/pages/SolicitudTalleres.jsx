import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost, apiDelete } from "../services/api";
import "./SolicitudTalleres.css";

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

const IconAcademic = (p) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </>
    }
  />
);

const IconClock = (p) => (
  <Icon
    {...p}
    path={
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    }
  />
);

const IconCheck = (p) => (
  <Icon {...p} path={<path d="M20 6L9 17l-5-5" />} />
);

const IconClose = (p) => (
  <Icon {...p} path={<path d="M18 6L6 18M6 6l12 12" />} />
);

const IconPlus = (p) => (
  <Icon {...p} path={<path d="M12 5v14M5 12h14" />} />
);

const IconTrash = (p) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
      </>
    }
  />
);

const IconChat = (p) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </>
    }
  />
);

const IconRefresh = (p) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
      </>
    }
  />
);

const IconUsers = (p) => (
  <Icon
    {...p}
    path={
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2 21a7 7 0 0114 0" />
        <path d="M16 4.5a3.5 3.5 0 010 7M17.5 21a7 7 0 00-2-4.9" />
      </>
    }
  />
);

const IconBook = (p) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </>
    }
  />
);

const TALLERES_DISPONIBLES = [
  "Conoce tu biblioteca: Taller de inicio",
  "Búsqueda y evaluación de información",
  "Gestión de referencias y estilo de citas",
  "Uso ético de la información",
  "Introducción a Leganto",
  "ORCID",
];

const CATALOGO_META = [
  { icono: "🧭", tag: "Inducción", desc: "Recorrido por recursos físicos, digitales y servicios clave." },
  { icono: "🔎", tag: "Investigación", desc: "Estrategias avanzadas en bases de datos científicas." },
  { icono: "📑", tag: "Citas y Normas", desc: "APA, gestores bibliográficos y organización de fuentes." },
  { icono: "⚖️", tag: "Integridad", desc: "Prevención de plagio, derechos de autor y buenas prácticas." },
  { icono: "📚", tag: "Plataforma", desc: "Acceso y gestión de bibliografías de tus asignaturas." },
  { icono: "🆔", tag: "Identidad Digital", desc: "Crea y vincula tu identificador de investigador único." },
];

export default function SolicitudTalleres() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(5);
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalCancelar, setModalCancelar] = useState({ open: false, id: null, taller: "" });
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [toast, setToast] = useState({ tipo: "", texto: "" });

  const [formData, setFormData] = useState({
    taller: TALLERES_DISPONIBLES[0],
    modalidad: "Presencial",
    participantes: "4",
    carrera: user?.carrera || "",
    observaciones: "",
  });

  const timerRef = useRef(null);

  const handleSpotlight = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  const fetchMisSolicitudes = useCallback(async (mostrarSpinner = false) => {
    if (mostrarSpinner) setActualizando(true);
    try {
      const data = await apiGet("/api/talleres/mis-solicitudes");
      setSolicitudes(data?.solicitudes || []);
      setUltimaActualizacion(new Date());
    } catch (err) {
      if (mostrarSpinner) {
        setToast({ tipo: "error", texto: "No se pudieron cargar las solicitudes: " + (err.message || "") });
      }
    } finally {
      setCargando(false);
      if (mostrarSpinner) setActualizando(false);
    }
  }, []);

  useEffect(() => {
    fetchMisSolicitudes(true);
    const interval = setInterval(() => {
      fetchMisSolicitudes(false);
    }, 7000);

    return () => clearInterval(interval);
  }, [fetchMisSolicitudes]);

  useEffect(() => {
    if (user?.carrera) {
      setFormData((prev) => ({ ...prev, carrera: user.carrera }));
    }
  }, [user]);

  useEffect(() => {
    if (toast.texto) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setToast({ tipo: "", texto: "" });
      }, 6000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.texto]);

  const handleCrearSolicitud = async (e) => {
    e.preventDefault();
    const carreraFinal = (user?.carrera || formData.carrera || "").trim();
    if (!formData.taller || !carreraFinal) {
      setToast({ tipo: "error", texto: "Por favor completa el taller y verifica tu carrera." });
      return;
    }

    setEnviandoSolicitud(true);
    try {
      const payload = {
        taller: formData.taller,
        nombre: user?.nombre || "Estudiante",
        email: user?.email || "",
        rut: user?.rut || "",
        carrera: carreraFinal,
        modalidad: formData.modalidad,
        participantes: String(formData.participantes),
        observaciones: formData.observaciones.trim() || null,
      };

      await apiPost("/api/talleres/solicitar", payload);
      setToast({
        tipo: "exito",
        texto: `¡Solicitud enviada con éxito! Ya fue notificada al equipo de biblioteca y puedes seguir su estado aquí en tiempo real.`,
      });
      setModalNuevoOpen(false);
      setFormData({
        taller: TALLERES_DISPONIBLES[0],
        modalidad: "Presencial",
        participantes: "4",
        carrera: user?.carrera || "",
        observaciones: "",
      });
      fetchMisSolicitudes(true);
    } catch (err) {
      setToast({ tipo: "error", texto: "Error al enviar la solicitud: " + (err.message || "") });
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const handleConfirmarCancelar = async () => {
    if (!modalCancelar.id) return;
    try {
      await apiDelete(`/api/talleres/mis-solicitudes/${modalCancelar.id}`);
      setToast({ tipo: "exito", texto: "Solicitud de taller cancelada correctamente." });
      setModalCancelar({ open: false, id: null, taller: "" });
      fetchMisSolicitudes(true);
    } catch (err) {
      setToast({ tipo: "error", texto: "No se pudo cancelar la solicitud: " + (err.message || "") });
    }
  };

  const abrirModalNuevaSolicitud = (tallerPreseleccionado) => {
    const tallerElegido =
      typeof tallerPreseleccionado === "string" && TALLERES_DISPONIBLES.includes(tallerPreseleccionado)
        ? tallerPreseleccionado
        : formData.taller || TALLERES_DISPONIBLES[0];

    setFormData((prev) => ({
      ...prev,
      taller: tallerElegido,
      carrera: user?.carrera || prev.carrera || "",
    }));
    setModalNuevoOpen(true);
  };

  const abrirChatbotTalleres = () => {
    window.dispatchEvent(new CustomEvent("open-chat"));
  };

  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtroEstado === "todos") return true;
    return s.estado === filtroEstado;
  });

  const totalSolicitudes = solicitudesFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalSolicitudes / porPagina));
  const solicitudesPaginadas = solicitudesFiltradas.slice(
    (paginaActual - 1) * porPagina,
    paginaActual * porPagina
  );

  const conteo = {
    total: solicitudes.length,
    pendiente: solicitudes.filter((s) => s.estado === "pendiente").length,
    aprobado: solicitudes.filter((s) => s.estado === "aprobado").length,
    rechazado: solicitudes.filter((s) => s.estado === "rechazado").length,
    realizado: solicitudes.filter((s) => s.estado === "realizado").length,
  };

  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case "pendiente":
        return (
          <span className="st-badge st-badge--pending">
            <span className="st-badge-ping" />
            Pendiente de revisión
          </span>
        );
      case "aprobado":
        return (
          <span className="st-badge st-badge--approved">
            <IconCheck className="w-3.5 h-3.5" />
            Aprobada
          </span>
        );
      case "rechazado":
        return (
          <span className="st-badge st-badge--rejected">
            <IconClose className="w-3.5 h-3.5" />
            No aprobada
          </span>
        );
      case "realizado":
        return (
          <span className="st-badge st-badge--done">
            <IconAcademic className="w-3.5 h-3.5" />
            Taller Realizado
          </span>
        );
      default:
        return <span className="st-badge">{estado}</span>;
    }
  };

  const formatearFecha = (strFecha) => {
    if (!strFecha) return "";
    try {
      const d = new Date(strFecha);
      if (isNaN(d.getTime())) return strFecha;
      return d.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return strFecha;
    }
  };

  return (
    <div className="st-root min-h-screen pt-20 pb-24">
      {/* Fondos ambientales flotantes */}
      <div className="st-ambient" aria-hidden="true">
        <div className="st-orb st-orb--navy" />
        <div className="st-orb st-orb--sky" />
        <div className="st-orb st-orb--gold" />
        <div className="st-mesh" />
      </div>

      <div className="st-container">
        {/* BENTO HERO FLOTANTE (Sin barra clásica) */}
        <section className="st-hero-bento st-fade-up" aria-labelledby="st-page-title">
          {/* Panel Principal Izquierdo: Identidad + Acciones */}
          <div className="st-hero-main">
            <div className="st-hero-glow" aria-hidden="true" />

            <div className="st-hero-top">
              <span className="st-eyebrow">
                <span className="st-eyebrow-dot">🎓</span>
                Formación Académica • Biblioteca UCT
              </span>

              <div className="st-sync-pill" title="Sincronización automática cada 7 segundos">
                <span className="st-sync-dot" />
                <span className="st-sync-text">
                  {ultimaActualizacion
                    ? ultimaActualizacion.toLocaleTimeString("es-CL")
                    : "Conectando..."}
                </span>
                <button
                  type="button"
                  onClick={() => fetchMisSolicitudes(true)}
                  disabled={actualizando}
                  className="st-sync-btn"
                  aria-label="Actualizar solicitudes ahora"
                >
                  <IconRefresh className={`w-3.5 h-3.5 ${actualizando ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <h1 id="st-page-title" className="st-title">
              Talleres y Mentorías{" "}
              <span className="st-gradient-text st-underline">
                Especializadas.
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

            <p className="st-lead">
              Impulsa tus trabajos de investigación, tesis o asignaturas con sesiones guiadas por bibliotecólogos UCT. Solicita un taller grupal y sigue su aprobación en tiempo real.
            </p>

            <div className="st-hero-actions">
              <button
                type="button"
                onClick={() => abrirModalNuevaSolicitud()}
                className="st-btn st-btn--gold"
              >
                <IconPlus className="w-4 h-4" />
                Solicitar Taller
                <span className="st-btn-arrow">→</span>
              </button>

              <button
                type="button"
                onClick={abrirChatbotTalleres}
                className="st-btn st-btn--glass"
              >
                <IconChat className="w-4 h-4 text-[#FFC20E]" />
                Pedir con Asistente IA
              </button>
            </div>
          </div>

          {/* Panel Derecho: Telemetría y KPIs interactivos */}
          <div className="st-kpi-grid">
            <button
              type="button"
              onClick={() => {
                setFiltroEstado("todos");
                setPaginaActual(1);
              }}
              className={`st-kpi-card st-kpi-card--total ${filtroEstado === "todos" ? "is-selected" : ""}`}
            >
              <div className="st-kpi-head">
                <span>Total Solicitudes</span>
                <span className="st-kpi-icon">📊</span>
              </div>
              <strong>{conteo.total}</strong>
              <small>Historial completo</small>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroEstado("pendiente");
                setPaginaActual(1);
              }}
              className={`st-kpi-card st-kpi-card--pending ${filtroEstado === "pendiente" ? "is-selected" : ""}`}
            >
              <div className="st-kpi-head">
                <span>En Revisión</span>
                <span className="st-kpi-icon">⏳</span>
              </div>
              <strong>{conteo.pendiente}</strong>
              <small>Pendientes de respuesta</small>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroEstado("aprobado");
                setPaginaActual(1);
              }}
              className={`st-kpi-card st-kpi-card--approved ${filtroEstado === "aprobado" ? "is-selected" : ""}`}
            >
              <div className="st-kpi-head">
                <span>Aprobadas</span>
                <span className="st-kpi-icon">✅</span>
              </div>
              <strong>{conteo.aprobado}</strong>
              <small>Confirmadas por biblioteca</small>
            </button>

            <button
              type="button"
              onClick={() => {
                setFiltroEstado("rechazado");
                setPaginaActual(1);
              }}
              className={`st-kpi-card st-kpi-card--rejected ${filtroEstado === "rechazado" ? "is-selected" : ""}`}
            >
              <div className="st-kpi-head">
                <span>No Aprobadas</span>
                <span className="st-kpi-icon">📌</span>
              </div>
              <strong>{conteo.rechazado}</strong>
              <small>Con observaciones</small>
            </button>
          </div>
        </section>

        {/* NOTIFICACIÓN BANNER */}
        {toast.texto && (
          <div
            className={`st-toast-banner st-fade-up ${toast.tipo === "exito" ? "st-toast-banner--success" : "st-toast-banner--error"
              }`}
          >
            <div className="flex items-center gap-3">
              <span className="st-toast-icon">
                {toast.tipo === "exito" ? <IconCheck className="w-4 h-4" /> : <IconClose className="w-4 h-4" />}
              </span>
              <span className="font-semibold text-sm">{toast.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast({ tipo: "", texto: "" })}
              className="st-toast-close"
              aria-label="Cerrar notificación"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* WORKSPACE DE 2 COLUMNAS: SOLICITUDES + CATÁLOGO INTERACTIVO */}
        <div className="st-workspace">
          {/* COLUMNA PRINCIPAL: Seguimiento de Solicitudes */}
          <main className="st-feed">
            {/* Barra de Filtros y Estado de Sincronización */}
            <div className="st-toolbar">
              <div className="st-tabs" role="tablist" aria-label="Filtrar solicitudes por estado">
                {[
                  { id: "todos", label: "Todas", count: conteo.total },
                  { id: "pendiente", label: "Pendientes", count: conteo.pendiente },
                  { id: "aprobado", label: "Aprobadas", count: conteo.aprobado },
                  { id: "rechazado", label: "Rechazadas", count: conteo.rechazado },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={filtroEstado === tab.id}
                    onClick={() => {
                      setFiltroEstado(tab.id);
                      setPaginaActual(1);
                    }}
                    className={`st-tab ${filtroEstado === tab.id ? "is-active" : ""}`}
                  >
                    <span>{tab.label}</span>
                    <b>{tab.count}</b>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => fetchMisSolicitudes(true)}
                disabled={actualizando}
                className="st-refresh-pill"
              >
                <IconRefresh className={`w-3.5 h-3.5 ${actualizando ? "animate-spin text-[#00A3E0]" : ""}`} />
                <span>{actualizando ? "Sincronizando..." : "Actualizar"}</span>
              </button>
            </div>

            {/* Listado / Skeleton / Estado Vacío */}
            {cargando ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="st-skeleton">
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-60 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
                      <div className="h-7 w-32 rounded-full bg-slate-200/70 dark:bg-slate-800" />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="h-10 rounded-xl bg-slate-200/50 dark:bg-slate-800/60" />
                      <div className="h-10 rounded-xl bg-slate-200/50 dark:bg-slate-800/60" />
                      <div className="h-10 rounded-xl bg-slate-200/50 dark:bg-slate-800/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : solicitudesFiltradas.length === 0 ? (
              <div className="st-empty-state st-fade-up">
                <div className="st-empty-icon">
                  <IconAcademic className="w-8 h-8" />
                </div>
                <span className="st-kicker">✦ Bandeja de solicitudes</span>
                <h3>
                  {filtroEstado === "todos"
                    ? "Aún no tienes solicitudes de talleres"
                    : `No hay solicitudes en estado "${filtroEstado}"`}
                </h3>
                <p>
                  Elige cualquiera de los 6 talleres especializados desde el catálogo lateral o presiona el botón para programar una sesión con tu grupo (mínimo 4 participantes).
                </p>
                <div className="st-hero-actions justify-center">
                  <button
                    type="button"
                    onClick={() => abrirModalNuevaSolicitud()}
                    className="st-btn st-btn--gold"
                  >
                    <IconPlus className="w-4 h-4" /> Solicitar un taller ahora
                  </button>
                  <button
                    type="button"
                    onClick={abrirChatbotTalleres}
                    className="st-btn st-btn--sky"
                  >
                    <IconChat className="w-4 h-4" /> Consultar al Asistente IA
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {solicitudesPaginadas.map((sol) => {
                  const metaIndex = TALLERES_DISPONIBLES.indexOf(sol.taller);
                  const iconoTaller = metaIndex >= 0 ? CATALOGO_META[metaIndex].icono : "🎓";

                  return (
                    <article
                      key={sol.id}
                      className={`st-card st-card--${sol.estado || "pendiente"}`}
                      onMouseMove={handleSpotlight}
                    >
                      <div className="st-card-inner">
                        {/* Cabecera de la tarjeta */}
                        <div className="st-card-top">
                          <div className="flex items-start gap-3.5">
                            <div className="st-card-avatar" aria-hidden="true">
                              {iconoTaller}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="st-card-id">FOLIO #{sol.id}</span>
                                <span className="st-card-date">
                                  <IconClock className="w-3.5 h-3.5 text-[#00A3E0]" />
                                  {formatearFecha(sol.created_at)}
                                </span>
                              </div>
                              <h2 className="st-card-title">{sol.taller}</h2>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {renderBadgeEstado(sol.estado)}
                            {sol.estado === "pendiente" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalCancelar({ open: true, id: sol.id, taller: sol.taller })
                                }
                                className="st-cancel-link"
                              >
                                <IconTrash className="w-3.5 h-3.5" /> Cancelar solicitud
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Píldoras de Metadatos */}
                        <div className="st-meta-strip">
                          <div className="st-meta-box">
                            <span>Modalidad</span>
                            <strong>
                              {sol.modalidad === "Virtual" ? "💻 Virtual (Teams)" : "🏛️ Presencial"}
                            </strong>
                          </div>

                          <div className="st-meta-box">
                            <span>Grupo de estudio</span>
                            <strong>
                              <IconUsers className="w-3.5 h-3.5 text-[#00A3E0] inline mr-1" />
                              {sol.participantes || "4"} participantes
                            </strong>
                          </div>

                          <div className="st-meta-box">
                            <span>Carrera / Programa</span>
                            <strong className="truncate">{sol.carrera}</strong>
                          </div>
                        </div>

                        {/* Barra de progreso de seguimiento */}
                        <div className="st-stepper" aria-label="Progreso de la solicitud">
                          <div className="st-step is-complete">
                            <span className="st-step-dot">✓</span>
                            <span>Solicitud enviada</span>
                          </div>
                          <div className="st-step-line is-complete" />
                          <div
                            className={`st-step ${sol.estado === "pendiente" ? "is-current" : "is-complete"
                              }`}
                          >
                            <span className="st-step-dot">
                              {sol.estado === "pendiente" ? "•" : "✓"}
                            </span>
                            <span>Revisión Biblioteca</span>
                          </div>
                          <div
                            className={`st-step-line ${sol.estado !== "pendiente" ? "is-complete" : ""
                              }`}
                          />
                          <div
                            className={`st-step ${sol.estado === "aprobado" || sol.estado === "realizado"
                                ? "is-approved"
                                : sol.estado === "rechazado"
                                  ? "is-rejected"
                                  : ""
                              }`}
                          >
                            <span className="st-step-dot">
                              {sol.estado === "aprobado" || sol.estado === "realizado"
                                ? "✓"
                                : sol.estado === "rechazado"
                                  ? "✕"
                                  : "3"}
                            </span>
                            <span>
                              {sol.estado === "aprobado"
                                ? "Aprobada"
                                : sol.estado === "rechazado"
                                  ? "No aprobada"
                                  : sol.estado === "realizado"
                                    ? "Realizado"
                                    : "Resolución"}
                            </span>
                          </div>
                        </div>

                        {/* Respuesta / Observaciones */}
                        {sol.observaciones && (
                          <div
                            className={`st-feedback-box ${sol.estado === "aprobado"
                                ? "st-feedback-box--approved"
                                : sol.estado === "rechazado"
                                  ? "st-feedback-box--rejected"
                                  : "st-feedback-box--neutral"
                              }`}
                          >
                            <div className="st-feedback-title">
                              {sol.estado === "aprobado" && <IconCheck className="w-4 h-4" />}
                              {sol.estado === "rechazado" && <IconClose className="w-4 h-4" />}
                              <span>
                                {sol.estado === "aprobado"
                                  ? "Respuesta y confirmación de Biblioteca:"
                                  : sol.estado === "rechazado"
                                    ? "Motivo de rechazo / Observación:"
                                    : "Observaciones registradas:"}
                              </span>
                            </div>
                            <p>{sol.observaciones}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Paginación */}
            {totalSolicitudes > 0 && (
              <div className="st-pagination">
                <div className="flex items-center gap-2 text-xs">
                  <span>Mostrar</span>
                  <select
                    value={porPagina}
                    onChange={(e) => {
                      setPorPagina(Number(e.target.value));
                      setPaginaActual(1);
                    }}
                    className="st-page-select"
                  >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>por página</span>
                  <span className="st-page-range">
                    ({(paginaActual - 1) * porPagina + 1} -{" "}
                    {Math.min(paginaActual * porPagina, totalSolicitudes)} de {totalSolicitudes})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={paginaActual <= 1}
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    className="st-page-btn"
                  >
                    ← Anterior
                  </button>
                  <span className="st-page-counter">
                    {paginaActual} / {totalPaginas}
                  </span>
                  <button
                    type="button"
                    disabled={paginaActual >= totalPaginas}
                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                    className="st-page-btn"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* COLUMNA LATERAL: Catálogo Interactivo + Tarjeta Chatbot */}
          <aside className="st-sidebar" aria-label="Catálogo de talleres disponibles">
            <div className="st-catalog-card">
              <div className="st-catalog-head">
                <span className="st-kicker">✦ Catálogo Directo</span>
                <h3>Talleres Disponibles</h3>
                <p>Toca cualquier taller para preseleccionarlo y abrir tu solicitud al instante.</p>
              </div>

              <div className="st-catalog-list">
                {TALLERES_DISPONIBLES.map((nombreTaller, idx) => {
                  const meta = CATALOGO_META[idx] || CATALOGO_META[0];
                  return (
                    <button
                      key={nombreTaller}
                      type="button"
                      onClick={() => abrirModalNuevaSolicitud(nombreTaller)}
                      className="st-catalog-item"
                    >
                      <span className="st-catalog-emoji">{meta.icono}</span>
                      <div className="st-catalog-info">
                        <span className="st-catalog-tag">{meta.tag}</span>
                        <h4>{nombreTaller}</h4>
                        <p>{meta.desc}</p>
                      </div>
                      <span className="st-catalog-arrow">→</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta de Orientación con Chatbot */}
            <div className="st-ai-card">
              <div className="st-ai-badge">🤖 Asistente Virtual UCT</div>
              <h4>¿Dudas sobre qué taller elegir?</h4>
              <p>
                Pregúntale al chatbot sobre contenidos de Leganto, ORCID, estilo APA o bases de datos científicas y agenda en segundos.
              </p>
              <button
                type="button"
                onClick={abrirChatbotTalleres}
                className="st-btn st-btn--gold w-full justify-center"
              >
                <IconChat className="w-4 h-4" /> Abrir Asistente Virtual
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* MODAL 1: NUEVA SOLICITUD DE TALLER */}
      {modalNuevoOpen && (
        <div className="st-modal-backdrop">
          <div className="st-modal">
            <div className="st-modal-head">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="st-modal-icon shrink-0">
                  <IconAcademic className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="st-modal-kicker">✦ Biblioteca UCT</span>
                  <h3 className="truncate">Solicitar taller especializado</h3>
                  <p className="text-xs opacity-90 truncate">Completa los detalles para coordinar la sesión con el equipo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoOpen(false)}
                className="st-modal-close shrink-0"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <div className="st-modal-bar" />

            <form onSubmit={handleCrearSolicitud} className="st-modal-body space-y-3">
              <div>
                <label className="st-label">Taller Especializado *</label>
                <select
                  value={formData.taller}
                  onChange={(e) => setFormData({ ...formData, taller: e.target.value })}
                  className="st-input"
                  required
                >
                  {TALLERES_DISPONIBLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="st-label">Modalidad *</label>
                  <select
                    value={formData.modalidad}
                    onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                    className="st-input"
                  >
                    <option value="Presencial">🏛️ Presencial (Sede)</option>
                    <option value="Virtual">💻 Virtual (Teams)</option>
                  </select>
                </div>

                <div>
                  <label className="st-label">Participantes *</label>
                  <select
                    value={formData.participantes}
                    onChange={(e) => setFormData({ ...formData, participantes: e.target.value })}
                    className="st-input"
                  >
                    <option value="4">4 personas (mínimo)</option>
                    <option value="5">5 personas</option>
                    <option value="6">6 personas</option>
                    <option value="7">7 personas</option>
                    <option value="8">8 personas</option>
                    <option value="9">9 personas</option>
                    <option value="10+">10 o más personas</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="st-label mb-0">Carrera / Programa</label>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    🔒 Vinculado a tu perfil
                  </span>
                </div>
                <input
                  type="text"
                  value={user?.carrera || formData.carrera || "Sin carrera registrada"}
                  readOnly
                  tabIndex={-1}
                  placeholder="Carrera del estudiante"
                  className="st-input cursor-not-allowed opacity-80 bg-slate-100/90 dark:bg-slate-800/90 select-none border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="st-label">
                  Comentarios o temas específicos de interés (opcional)
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Indica fechas tentativas, horario preferido o necesidades particulares de tu grupo..."
                  rows={2}
                  className="st-input"
                />
              </div>

              <div className="st-user-summary">
                La solicitud quedará asociada a <strong>{user?.nombre || "Estudiante"}</strong> (
                <strong>{user?.email || "correo institucional"}</strong>).
              </div>

              <div className="st-modal-foot">
                <button
                  type="button"
                  onClick={() => setModalNuevoOpen(false)}
                  className="st-modal-btn st-modal-btn--ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoSolicitud}
                  className="st-btn st-btn--gold"
                >
                  {enviandoSolicitud ? "Enviando solicitud..." : "Enviar solicitud →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCELAR SOLICITUD */}
      {modalCancelar.open && (
        <div className="st-modal-backdrop">
          <div className="st-modal max-w-md">
            <div className="st-modal-head st-modal-head--danger">
              <div className="flex items-center gap-3">
                <span className="st-modal-icon">
                  <IconTrash className="w-5 h-5" />
                </span>
                <div>
                  <span className="st-modal-kicker">✦ Confirmación</span>
                  <h3>¿Cancelar esta solicitud?</h3>
                  <p>
                    #{modalCancelar.id} • {modalCancelar.taller}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCancelar({ open: false, id: null, taller: "" })}
                className="st-modal-close"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="st-modal-body space-y-5">
              <p className="text-sm leading-relaxed opacity-85">
                Esta solicitud de taller será retirada de la bandeja de revisión del equipo de biblioteca. Puedes volver a crear una nueva solicitud cuando quieras.
              </p>

              <div className="st-modal-foot pt-2">
                <button
                  type="button"
                  onClick={() => setModalCancelar({ open: false, id: null, taller: "" })}
                  className="st-modal-btn st-modal-btn--ghost"
                >
                  No, mantener
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarCancelar}
                  className="st-modal-btn st-modal-btn--danger"
                >
                  Sí, cancelar solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}