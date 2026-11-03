import React, { useState, useEffect, useRef, useCallback } from "react";
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

const IconCalendar = (p) => (
  <Icon {...p} path={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>} />
);

const IconClock = (p) => (
  <Icon {...p} path={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />
);

const IconUser = (p) => (
  <Icon {...p} path={<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>} />
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

const IconCheck = (p) => <Icon {...p} path={<path d="M20 6L9 17l-5-5" />} />;
const IconAlert = (p) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
      </>
    }
  />
);
const IconClose = (p) => <Icon {...p} path={<path d="M18 6L6 18M6 6l12 12" />} />;
const IconPlus = (p) => <Icon {...p} path={<path d="M12 5v14M5 12h14" />} />;
const IconTrash = (p) => (
  <Icon
    {...p}
    path={
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
    }
  />
);
const IconChat = (p) => (
  <Icon {...p} path={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />} />
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
const IconCompass = (p) => (
  <Icon {...p} path={<><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></>} />
);
const IconSearch = (p) => (
  <Icon {...p} path={<><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>} />
);
const IconQuote = (p) => (
  <Icon {...p} path={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>} />
);
const IconShield = (p) => (
  <Icon {...p} path={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />} />
);
const IconId = (p) => (
  <Icon {...p} path={<><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>} />
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
  {
    tag: "Inducción",
    desc: "Recorrido guiado por colecciones físicas, recursos digitales y servicios esenciales de Biblioteca UCT.",
    duracion: "45 min • Grupal",
    renderIcon: () => <IconCompass className="w-5 h-5" />,
  },
  {
    tag: "Investigación",
    desc: "Estrategias avanzadas en bases de datos científicas, filtros booleanos y selección de fuentes.",
    duracion: "60 min • Grupal",
    renderIcon: () => <IconSearch className="w-5 h-5" />,
  },
  {
    tag: "Citas y Normas",
    desc: "Aplicación práctica de normas APA, gestores bibliográficos y organización de referencias.",
    duracion: "60 min • Grupal",
    renderIcon: () => <IconQuote className="w-5 h-5" />,
  },
  {
    tag: "Integridad",
    desc: "Prevención de plagio, derechos de autor y buenas prácticas éticas en trabajos universitarios.",
    duracion: "45 min • Grupal",
    renderIcon: () => <IconShield className="w-5 h-5" />,
  },
  {
    tag: "Plataforma",
    desc: "Acceso y gestión directa de las bibliografías oficiales de tus asignaturas en Leganto.",
    duracion: "45 min • Grupal",
    renderIcon: () => <IconBook className="w-5 h-5" />,
  },
  {
    tag: "Identidad Digital",
    desc: "Creación, configuración y vinculación de tu registro internacional de investigador ORCID.",
    duracion: "45 min • Grupal",
    renderIcon: () => <IconId className="w-5 h-5" />,
  },
];

export default function SolicitudTalleres() {
  const { user } = useAuth();
  const isNoRegular = Boolean(user && user?.rol !== "admin" && user?.es_regular === false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("pendientes");
  const [paginaActiva, setPaginaActiva] = useState(1);
  const porPagina = 3;
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const porPaginaHistorial = 5;
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

  const fetchMisSolicitudes = useCallback(async () => {
    try {
      const data = await apiGet("/api/talleres/mis-solicitudes");
      setSolicitudes(data?.solicitudes || []);
    } catch {
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchMisSolicitudes();
    const interval = setInterval(() => {
      fetchMisSolicitudes();
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
    if (isNoRegular) {
      setToast({
        tipo: "error",
        texto: "Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente.",
      });
      return;
    }
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
        texto: "¡Solicitud enviada con éxito! Ya fue notificada al equipo de biblioteca y puedes seguir su estado aquí en tiempo real.",
      });
      setModalNuevoOpen(false);
      setFormData({
        taller: TALLERES_DISPONIBLES[0],
        modalidad: "Presencial",
        participantes: "4",
        carrera: user?.carrera || "",
        observaciones: "",
      });
      fetchMisSolicitudes();
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
      fetchMisSolicitudes();
    } catch (err) {
      setToast({ tipo: "error", texto: "No se pudo cancelar la solicitud: " + (err.message || "") });
    }
  };

  const abrirModalNuevaSolicitud = (tallerPreseleccionado) => {
    if (isNoRegular) {
      setToast({
        tipo: "error",
        texto: "Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente.",
      });
      return;
    }
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

  const abrirChat = () => window.dispatchEvent(new CustomEvent("open-chat"));

  const formatearFecha = (strFecha) => {
    if (!strFecha) return "Reciente";
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

  const solicitudesPendientes = solicitudes.filter(
    (s) => s.estado === "pendiente"
  );
  const solicitudesAprobadas = solicitudes.filter(
    (s) => s.estado === "aprobado"
  );
  const solicitudesHistorial = solicitudes.filter(
    (s) => s.estado === "realizado" || s.estado === "rechazado"
  );

  const listaFiltrada =
    filtroEstado === "pendientes" ? solicitudesPendientes : solicitudesAprobadas;

  const totalPaginasActivas = Math.max(
    1,
    Math.ceil(listaFiltrada.length / porPagina)
  );
  const paginaActivaSegura = Math.min(paginaActiva, totalPaginasActivas);
  const solicitudesPaginadas = listaFiltrada.slice(
    (paginaActivaSegura - 1) * porPagina,
    paginaActivaSegura * porPagina
  );

  const cambiarFiltro = (nuevoFiltro) => {
    setFiltroEstado(nuevoFiltro);
    setPaginaActiva(1);
  };

  const totalPaginasHistorial = Math.max(
    1,
    Math.ceil(solicitudesHistorial.length / porPaginaHistorial)
  );
  const historialPaginado = solicitudesHistorial.slice(
    (paginaHistorial - 1) * porPaginaHistorial,
    paginaHistorial * porPaginaHistorial
  );

  const inicial = String(user?.nombre || user?.email || "E").trim().charAt(0).toUpperCase();

  return (
    <div className="st-root min-h-screen pt-16 pb-24">
      <header className="st-hero">
        <div className="st-grid" aria-hidden="true" />
        <div className="st-blob st-blob--sky" aria-hidden="true" />
        <div className="st-blob st-blob--gold" aria-hidden="true" />
        <div className="st-blob st-blob--ocean" aria-hidden="true" />

        <div className="st-container st-hero-layout">
          <div className="st-fade-up">
            <div className="st-eyebrow">
              <span className="st-eyebrow-dot">★</span>
              Portal del Estudiante — Biblioteca UCT
            </div>

            <h1 className="st-title">
              Talleres y{" "}
              <span className="st-gradient-text st-underline">
                Mentorías.
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
              Gestiona tus solicitudes de formación académica, coordina sesiones guiadas por bibliotecólogos UCT para tu grupo de estudio o explora el catálogo disponible.
            </p>

            <div className="st-actions">
              <button
                type="button"
                onClick={() => abrirModalNuevaSolicitud()}
                disabled={isNoRegular}
                className={`st-btn st-btn--gold ${isNoRegular ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <IconPlus className="w-4 h-4" />
                {isNoRegular ? "Bloqueado: No Regular" : "Solicitar Taller"}
                {!isNoRegular && <span className="st-btn-arrow">→</span>}
              </button>
              <button type="button" onClick={abrirChat} className="st-btn st-btn--glass">
                <span>🤖</span> Asistente IA
              </button>
            </div>
          </div>

          <div className="st-profile-stage st-fade-up" style={{ animationDelay: "0.18s" }}>
            <div className="st-profile-card">
              <div className="st-profile-inner">
                <div className="st-profile-top">
                  <div className="st-avatar-wrap">
                    <div className="st-avatar">{inicial}</div>
                    <span
                      className={`st-avatar-status ${isNoRegular ? "is-suspended" : "is-online"}`}
                      title={isNoRegular ? "Estudiante no regular" : "Cuenta habilitada"}
                    />
                  </div>
                  <div className="st-profile-info">
                    <span className="st-profile-tag">Credencial Estudiantil</span>
                    <h2>{user?.nombre || "Estudiante UCT"}</h2>
                    <div className="st-profile-meta">
                      <span>RUT: {user?.rut || "Sin registrar"}</span>
                      {user?.email && <span>• {user.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="st-profile-stats">
                  <div
                    className="st-stat-box transition-all cursor-pointer hover:scale-105 active:scale-95"
                    onClick={() => cambiarFiltro("pendientes")}
                    title="Ver solicitudes sin aprobar"
                  >
                    <strong>{solicitudesPendientes.length}</strong>
                    <span>Sin Aprobar</span>
                  </div>
                  <div
                    className="st-stat-box transition-all cursor-pointer hover:scale-105 active:scale-95"
                    onClick={() => cambiarFiltro("aprobadas")}
                    title="Ver solicitudes aprobadas"
                  >
                    <strong>{solicitudesAprobadas.length}</strong>
                    <span>{solicitudesAprobadas.length === 1 ? "Aprobada" : "Aprobadas"}</span>
                  </div>
                  <div className="st-stat-box">
                    <strong>{solicitudesHistorial.length}</strong>
                    <span>En Historial</span>
                  </div>
                  <div className="st-stat-box" title={user?.carrera || "Estudiante UCT"}>
                    <strong
                      className="text-sky-300 truncate block text-xs sm:text-sm font-extrabold"
                      title={user?.carrera || "Estudiante UCT"}
                    >
                      {user?.carrera || "Estudiante UCT"}
                    </strong>
                    <span>Carrera</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <svg className="st-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,60 C240,100 480,10 720,40 C960,70 1200,20 1440,50 L1440,90 L0,90 Z" />
        </svg>
      </header>

      <main className="st-container st-main">
        {isNoRegular && (
          <div className="st-alert st-alert--danger st-fade-up">
            <div className="st-alert-icon">
              <IconAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                Servicio bloqueado: Estudiante no regular
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Actualmente estás registrado como estudiante no regular. Cuando regularices tu situación académica estarás activo nuevamente.
              </p>
            </div>
          </div>
        )}

        {toast.texto && (
          <div
            className={`st-alert st-fade-up ${toast.tipo === "exito" ? "st-alert--success" : "st-alert--danger"
              }`}
          >
            <div className="st-alert-icon">
              {toast.tipo === "exito" ? <IconCheck className="w-6 h-6" /> : <IconAlert className="w-6 h-6" />}
            </div>
            <div className="flex-1 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold">
                  {toast.tipo === "exito" ? "Operación confirmada" : "Aviso del sistema"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {toast.texto}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setToast({ tipo: "", texto: "" })}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {cargando ? (
          <div className="space-y-5">
            {[1, 2].map((i) => (
              <div key={i} className="st-skeleton">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-52 rounded-lg bg-slate-200/80 dark:bg-slate-700/60" />
                  <div className="h-7 w-28 rounded-full bg-slate-200/60 dark:bg-slate-700/40" />
                </div>
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
                  <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
                  <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
                  <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-14">
            <section aria-labelledby="st-active-heading">
              <div className="st-section-bar">
                <div>
                  <span className="st-kicker">
                    {filtroEstado === "pendientes"
                      ? "⚡ Solicitudes en revisión"
                      : "✓ Sesiones confirmadas"}
                  </span>
                  <h2 id="st-active-heading" className="st-h2">
                    {filtroEstado === "pendientes" ? (
                      <>
                        Solicitudes <em>Sin Aprobar</em>{" "}
                        <span className="st-count-pill">{solicitudesPendientes.length}</span>
                      </>
                    ) : (
                      <>
                        Talleres <em>Aprobados</em>{" "}
                        <span className="st-count-pill">{solicitudesAprobadas.length}</span>
                      </>
                    )}
                  </h2>
                </div>

                <div className="st-tabs" role="tablist" aria-label="Filtro de solicitudes">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filtroEstado === "pendientes"}
                    onClick={() => cambiarFiltro("pendientes")}
                    className={`st-tab-btn ${filtroEstado === "pendientes" ? "is-active" : ""}`}
                  >
                    <span>Sin Aprobar / Actuales</span>
                    <span className="st-tab-badge st-tab-badge--pending">
                      {solicitudesPendientes.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filtroEstado === "aprobadas"}
                    onClick={() => cambiarFiltro("aprobadas")}
                    className={`st-tab-btn ${filtroEstado === "aprobadas" ? "is-active" : ""}`}
                  >
                    <span>Aprobadas</span>
                    <span className="st-tab-badge st-tab-badge--approved">
                      {solicitudesAprobadas.length}
                    </span>
                  </button>
                </div>
              </div>

              {listaFiltrada.length === 0 ? (
                <div className="st-empty-inline">
                  <div className="flex items-center gap-3.5">
                    <span className="st-empty-inline-icon">
                      {filtroEstado === "pendientes" ? (
                        <IconClock className="w-5 h-5 text-amber-500" />
                      ) : (
                        <IconCheck className="w-5 h-5 text-emerald-500" />
                      )}
                    </span>
                    <div>
                      <h4>
                        {filtroEstado === "pendientes"
                          ? "No tienes solicitudes de taller sin aprobar o en revisión"
                          : "No tienes solicitudes de taller aprobadas en este momento"}
                      </h4>
                      <p>
                        {filtroEstado === "pendientes"
                          ? "Elige un tema del catálogo inferior o solicita una sesión grupal en segundos."
                          : "Las solicitudes confirmadas por biblioteca aparecerán aquí con su información de pase."}
                      </p>
                    </div>
                  </div>
                  {filtroEstado === "pendientes" ? (
                    <button
                      type="button"
                      onClick={() => abrirModalNuevaSolicitud()}
                      disabled={isNoRegular}
                      className={`st-btn st-btn--gold ${isNoRegular ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <IconPlus className="w-4 h-4" /> Solicitar ahora
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cambiarFiltro("pendientes")}
                      className="st-btn st-btn--glass"
                    >
                      Ver solicitudes sin aprobar ({solicitudesPendientes.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {solicitudesPaginadas.map((sol) => {
                    const esAprobada = sol.estado === "aprobado";
                    return (
                      <article
                        key={sol.id}
                        className="st-ticket"
                        onMouseMove={handleSpotlight}
                      >
                        <div className="st-ticket-inner">
                          <div className="st-ticket-head">
                            <div className="flex items-center gap-3">
                              <span className="st-ticket-head-icon">
                                <IconAcademic className="w-4 h-4" />
                              </span>
                              <div>
                                <span className="st-ticket-eyebrow">
                                  Universidad Católica de Temuco • Biblioteca
                                </span>
                                <h3>Pase de Taller Especializado</h3>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`st-status-badge ${esAprobada
                                    ? "st-status-badge--active"
                                    : "st-status-badge--pending"
                                  }`}
                              >
                                <span className="st-status-dot" />
                                {esAprobada ? "Taller Aprobado" : "En Revisión"}
                              </span>
                              <span className="st-ticket-id">#TAL-{sol.id}</span>
                            </div>
                          </div>

                          <div className="st-ticket-body">
                            <div className="st-ticket-main">
                              <div className="st-metrics-grid">
                                <div className="st-metric">
                                  <span className="st-metric-label">
                                    <IconBook className="w-3.5 h-3.5 text-[#00A3E0]" /> Taller Solicitado
                                  </span>
                                  <p className="st-metric-value">{sol.taller}</p>
                                </div>

                                <div className="st-metric">
                                  <span className="st-metric-label">
                                    <IconAcademic className="w-3.5 h-3.5 text-[#00A3E0]" /> Modalidad
                                  </span>
                                  <div>
                                    <span className="st-taller-pill">
                                      {sol.modalidad === "Virtual" ? "Virtual" : "Presencial"}
                                    </span>
                                  </div>
                                </div>

                                <div className="st-metric">
                                  <span className="st-metric-label">
                                    <IconUsers className="w-3.5 h-3.5 text-[#00A3E0]" /> Grupo
                                  </span>
                                  <p className="st-metric-value tabular-nums">
                                    {sol.participantes || "4"} participantes
                                  </p>
                                </div>

                                <div className="st-metric">
                                  <span className="st-metric-label">
                                    <IconClock className="w-3.5 h-3.5 text-[#00A3E0]" /> Fecha Solicitud
                                  </span>
                                  <p className="st-metric-value st-metric-value--highlight tabular-nums">
                                    {formatearFecha(sol.created_at)}
                                  </p>
                                </div>
                              </div>

                              <div className="st-people-grid">
                                <div className="st-person-box">
                                  <span className="st-person-label">
                                    <IconUser className="w-3.5 h-3.5 text-[#00A3E0]" /> Estudiante solicitante
                                  </span>
                                  <p className="st-person-name">
                                    {user?.nombre || sol.nombre || "Estudiante"}
                                  </p>
                                  <p className="st-person-rut">
                                    {sol.carrera || user?.carrera || "Carrera registrada"}
                                  </p>
                                </div>

                                <div className="st-person-box">
                                  <span className="st-person-label">
                                    <IconCheck className="w-3.5 h-3.5 text-[#00A3E0]" />{" "}
                                    {esAprobada
                                      ? "Confirmación de Biblioteca"
                                      : "Observaciones / Detalles"}
                                  </span>
                                  <p className="st-person-empty">
                                    {sol.observaciones
                                      ? sol.observaciones
                                      : esAprobada
                                        ? "Tu taller fue aprobado por el equipo de biblioteca."
                                        : "En espera de asignación de bibliotecólogo y confirmación horaria."}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="st-ticket-stub">
                              <div className="st-stub-badge">
                                <span>Folio Asignado</span>
                                <strong>#TAL-{sol.id}</strong>
                                <small>{esAprobada ? "Confirmado" : "Pendiente"}</small>
                              </div>

                              <div className="st-stub-actions">
                                <button
                                  type="button"
                                  onClick={abrirChat}
                                  className="st-action-btn st-action-btn--primary"
                                >
                                  <IconChat className="w-4 h-4" /> Consultar al Asistente
                                </button>
                                {sol.estado === "pendiente" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModalCancelar({
                                        open: true,
                                        id: sol.id,
                                        taller: sol.taller,
                                      })
                                    }
                                    className="st-action-btn st-action-btn--danger"
                                  >
                                    <IconTrash className="w-3.5 h-3.5" /> Cancelar Solicitud
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {totalPaginasActivas > 1 && (
                <div className="st-pagination">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mostrando <strong>{solicitudesPaginadas.length}</strong> de{" "}
                    <strong>{listaFiltrada.length}</strong> solicitudes
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaginaActiva((p) => Math.max(1, p - 1))}
                      disabled={paginaActivaSegura <= 1}
                      className="st-page-btn"
                    >
                      ← Anterior
                    </button>
                    {Array.from({ length: totalPaginasActivas }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPaginaActiva(num)}
                        className={`st-page-btn ${paginaActivaSegura === num ? "is-active" : ""}`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaginaActiva((p) => Math.min(totalPaginasActivas, p + 1))}
                      disabled={paginaActivaSegura >= totalPaginasActivas}
                      className="st-page-btn"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}            </section>

            <section aria-labelledby="st-catalog-heading">
              <div className="st-section-bar">
                <div>
                  <span className="st-kicker">✦ Oferta académica disponible</span>
                  <h2 id="st-catalog-heading" className="st-h2">
                    Catálogo de <em>Talleres</em>{" "}
                    <span className="st-count-pill">{TALLERES_DISPONIBLES.length}</span>
                  </h2>
                </div>
              </div>

              <div className="st-catalog-grid">
                {TALLERES_DISPONIBLES.map((nombreTaller, idx) => {
                  const meta = CATALOGO_META[idx] || CATALOGO_META[0];
                  return (
                    <div key={nombreTaller} className="st-catalog-card">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="st-catalog-icon">{meta.renderIcon()}</div>
                          <span className="st-taller-pill mt-0">{meta.tag}</span>
                        </div>

                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                          {nombreTaller}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                          {meta.desc}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-400">
                          {meta.duracion}
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirModalNuevaSolicitud(nombreTaller)}
                          disabled={isNoRegular}
                          className={`px-3.5 py-2 rounded-xl bg-[#00629B] hover:bg-[#004D7A] text-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${isNoRegular ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        >
                          <IconPlus className="w-3.5 h-3.5" />
                          Solicitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {solicitudesHistorial.length > 0 && (
              <section aria-labelledby="st-history-heading">
                <div className="st-section-bar">
                  <div>
                    <span className="st-kicker">✦ Registro académico</span>
                    <h2 id="st-history-heading" className="st-h2">
                      Historial de <em>Talleres</em>{" "}
                      <span className="st-count-pill">{solicitudesHistorial.length}</span>
                    </h2>
                  </div>

                  {totalPaginasHistorial > 1 && (
                    <span className="text-xs text-slate-500">
                      Página <strong>{paginaHistorial}</strong> de{" "}
                      <strong>{totalPaginasHistorial}</strong>
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {historialPaginado.map((sol) => {
                    const esRechazado = sol.estado === "rechazado";
                    return (
                      <div key={sol.id} className="st-history-item">
                        <div className="flex items-center gap-4">
                          <div
                            className={`st-history-code ${esRechazado ? "is-danger" : "is-done"
                              }`}
                          >
                            #{sol.id}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4>{sol.taller}</h4>
                              <span
                                className={`st-history-status ${esRechazado
                                    ? "st-history-status--danger"
                                    : "st-history-status--done"
                                  }`}
                              >
                                {esRechazado ? "No aprobada" : "Taller Realizado"}
                              </span>
                            </div>

                            <div className="st-history-meta">
                              <span>
                                <IconCalendar className="w-3.5 h-3.5 text-[#00A3E0] inline mr-1" />
                                {formatearFecha(sol.created_at)}
                              </span>
                              <span className="opacity-40">•</span>
                              <span>
                                <IconUsers className="w-3.5 h-3.5 text-[#00A3E0] inline mr-1" />
                                {sol.participantes || "4"} participantes ({sol.modalidad})
                              </span>
                              {sol.observaciones && (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span className="text-slate-500 dark:text-slate-400">
                                    {sol.observaciones}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="st-history-id">#TAL-{sol.id}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPaginasHistorial > 1 && (
                  <div className="st-pagination">
                    <p className="text-xs text-slate-500">
                      Mostrando <strong>{historialPaginado.length}</strong> de{" "}
                      <strong>{solicitudesHistorial.length}</strong> registros
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaginaHistorial((p) => Math.max(1, p - 1))}
                        disabled={paginaHistorial <= 1}
                        className="st-page-btn"
                      >
                        ← Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPaginaHistorial((p) => Math.min(totalPaginasHistorial, p + 1))
                        }
                        disabled={paginaHistorial >= totalPaginasHistorial}
                        className="st-page-btn"
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {modalNuevoOpen && (
        <div className="st-modal-backdrop">
          <div className="st-modal">
            <div className="st-modal-head">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="st-modal-icon shrink-0">
                  <IconAcademic className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="st-modal-kicker">✦ Gestión de Talleres</span>
                  <h3 className="truncate">Solicitar taller especializado</h3>
                  <p className="truncate">Completa los detalles para coordinar la sesión con el equipo</p>
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

            <form onSubmit={handleCrearSolicitud} className="st-modal-body space-y-3.5">
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
                    <option value="Presencial">Presencial (En Sede)</option>
                    <option value="Virtual">Virtual (Microsoft Teams)</option>
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
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    Vinculado a tu perfil
                  </span>
                </div>
                <input
                  type="text"
                  value={user?.carrera || formData.carrera || "Sin carrera registrada"}
                  readOnly
                  tabIndex={-1}
                  className="st-input cursor-not-allowed opacity-80 bg-slate-100/90 dark:bg-slate-800/90 select-none"
                  required
                />
              </div>

              <div>
                <label className="st-label">
                  Comentarios o disponibilidad horaria (opcional)
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Indica fechas tentativas, horario preferido o necesidades de tu grupo..."
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
                  disabled={enviandoSolicitud || isNoRegular}
                  className="st-btn st-btn--gold"
                >
                  {isNoRegular
                    ? "Estudiante no regular"
                    : enviandoSolicitud
                      ? "Enviando..."
                      : "Enviar solicitud →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    #TAL-{modalCancelar.id} • {modalCancelar.taller}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCancelar({ open: false, id: null, taller: "" })}
                className="st-modal-close"
              >
                <IconClose className="w-4 h-4" />
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
