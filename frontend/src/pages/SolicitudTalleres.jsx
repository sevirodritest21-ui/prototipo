import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost, apiDelete } from "../services/api";

const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
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
    if (!formData.taller || !formData.carrera.trim()) {
      setToast({ tipo: "error", texto: "Por favor completa el taller y tu carrera." });
      return;
    }

    setEnviandoSolicitud(true);
    try {
      const payload = {
        taller: formData.taller,
        nombre: user?.nombre || "Estudiante",
        email: user?.email || "",
        rut: user?.rut || "",
        carrera: formData.carrera.trim(),
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

  const abrirModalNuevaSolicitud = () => {
    setFormData((prev) => ({
      ...prev,
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
            </span>
            Pendiente de revisión
          </span>
        );
      case "aprobado":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <IconCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Aprobada
          </span>
        );
      case "rechazado":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300">
            <IconClose className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            No aprobada
          </span>
        );
      case "realizado":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-300">
            <IconAcademic className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            Taller Realizado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {estado}
          </span>
        );
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
    <div className="min-h-screen bg-slate-100/60 pt-16 pb-20 dark:bg-slate-950">
      <header className="border-b border-white/10 bg-[#00629B] text-white">
        <div className="mx-auto max-w-5xl px-5 py-9 sm:py-11">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sky-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/10 text-[#FFC20E]">
                  <IconAcademic className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                  Portal del Estudiante • Biblioteca UCT
                </span>
              </div>

              <h1 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-white sm:text-[2.5rem]">
                Solicitud de talleres
              </h1>

              <p className="mt-2.5 text-[14px] leading-relaxed text-sky-100/90">
                Monitorea en tiempo real el estado de tus solicitudes de talleres de biblioteca. Recibe confirmación de aprobación o motivos directamente desde el equipo administrativo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={abrirChatbotTalleres}
                className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E]"
              >
                <IconChat className="w-4 h-4 text-[#FFC20E]" /> Pedir con Asistente
              </button>

              <button
                type="button"
                onClick={abrirModalNuevaSolicitud}
                className="inline-flex items-center gap-2 rounded-md bg-[#FFC20E] px-4 py-2.5 text-[13px] font-semibold text-slate-900 shadow-sm transition-colors hover:bg-[#FFCA28] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <IconPlus className="w-4 h-4" /> Nueva solicitud
              </button>
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B]" />
      </header>

      <main className="mx-auto max-w-5xl px-5 mt-8 space-y-6">
        {toast.texto && (
          <div
            className={`flex items-center justify-between rounded-xl border p-4 shadow-sm animate-fadeIn ${
              toast.tipo === "exito"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-3 text-sm">
              {toast.tipo === "exito" ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  <IconCheck className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                  <IconClose className="w-3.5 h-3.5" />
                </span>
              )}
              <span className="font-medium">{toast.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast({ tipo: "", texto: "" })}
              className="ml-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Sincronización en tiempo real activa
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {ultimaActualizacion
                  ? `Última comprobación: ${ultimaActualizacion.toLocaleTimeString("es-CL")}`
                  : "Comprobando cambios..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchMisSolicitudes(true)}
              disabled={actualizando}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${actualizando ? "animate-spin text-[#00629B]" : ""}`} />
              {actualizando ? "Actualizando..." : "Actualizar ahora"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Solicitudes
            </span>
            <p className="mt-1 font-serif text-2xl font-bold text-slate-900 dark:text-white">
              {conteo.total}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pendientes
            </span>
            <p className="mt-1 font-serif text-2xl font-bold text-amber-800 dark:text-amber-300">
              {conteo.pendiente}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Aprobadas
            </span>
            <p className="mt-1 font-serif text-2xl font-bold text-emerald-800 dark:text-emerald-300">
              {conteo.aprobado}
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/20">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              No Aprobadas
            </span>
            <p className="mt-1 font-serif text-2xl font-bold text-rose-800 dark:text-rose-300">
              {conteo.rechazado}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "todos", label: `Todas (${conteo.total})` },
              { id: "pendiente", label: `Pendientes (${conteo.pendiente})` },
              { id: "aprobado", label: `Aprobadas (${conteo.aprobado})` },
              { id: "rechazado", label: `Rechazadas (${conteo.rechazado})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFiltroEstado(tab.id);
                  setPaginaActual(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filtroEstado === tab.id
                    ? "bg-[#00629B] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="h-6 w-52 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="h-6 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="mt-4 flex gap-4">
                  <div className="h-4 w-32 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="h-4 w-28 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-14">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-[#00629B] dark:bg-sky-950/50 dark:text-sky-300">
              <IconAcademic className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
              {filtroEstado === "todos"
                ? "No tienes solicitudes de talleres registradas"
                : `No tienes solicitudes en estado "${filtroEstado}"`}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Puedes solicitar cualquiera de los 6 talleres especializados de biblioteca para ti o para tu grupo de estudio (mínimo 4 participantes).
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={abrirModalNuevaSolicitud}
                className="inline-flex items-center gap-2 rounded-md bg-[#00629B] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#004B75]"
              >
                <IconPlus className="w-4 h-4" /> Solicitar un taller ahora
              </button>

              <button
                type="button"
                onClick={abrirChatbotTalleres}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <IconChat className="w-4 h-4 text-[#00629B]" /> Pedir con Asistente Virtual
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {solicitudesPaginadas.map((sol) => (
              <div
                key={sol.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#00629B] dark:text-sky-400">
                        #{sol.id}
                      </span>
                      <h2 className="font-serif text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                        {sol.taller}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <IconClock className="w-3.5 h-3.5 text-slate-400" />
                        {formatearFecha(sol.created_at)}
                      </span>
                      <span>•</span>
                      <span>
                        Modalidad:{" "}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {sol.modalidad || "Presencial"}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <IconUsers className="w-3.5 h-3.5 text-slate-400" />
                        {sol.participantes || "4"} participantes
                      </span>
                      <span>•</span>
                      <span>
                        Carrera:{" "}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {sol.carrera}
                        </strong>
                      </span>
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
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-400"
                      >
                        <IconTrash className="w-3 h-3" /> Cancelar solicitud
                      </button>
                    )}
                  </div>
                </div>

                {sol.observaciones && (
                  <div
                    className={`mt-4 rounded-xl border p-3.5 text-xs leading-relaxed ${
                      sol.estado === "aprobado"
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : sol.estado === "rechazado"
                        ? "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {sol.estado === "aprobado" && <IconCheck className="w-4 h-4 text-emerald-600" />}
                      {sol.estado === "rechazado" && <IconClose className="w-4 h-4 text-rose-600" />}
                      <span>
                        {sol.estado === "aprobado"
                          ? "Respuesta y confirmación de Biblioteca:"
                          : sol.estado === "rechazado"
                          ? "Motivo de rechazo / Observación:"
                          : "Observaciones registradas:"}
                      </span>
                    </div>
                    <p className="whitespace-pre-line">{sol.observaciones}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalSolicitudes > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs text-slate-600 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <select
                value={porPagina}
                onChange={(e) => {
                  setPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-800 outline-none cursor-pointer shadow-2xs hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span className="font-medium">por página</span>
              <span className="ml-2 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                ({(paginaActual - 1) * porPagina + 1} - {Math.min(paginaActual * porPagina, totalSolicitudes)} de {totalSolicitudes})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                ◀ Anterior
              </button>
              <span className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 font-mono text-xs font-bold text-[#00629B] dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-6 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl">
              <h4 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                ¿Necesitas orientación para elegir tu taller?
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                El Asistente Virtual de Biblioteca puede responder dudas sobre los contenidos de cada taller (Leganto, ORCID, citas bibliográficas, bases de datos) y ayudarte a registrar tu solicitud en segundos.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirChatbotTalleres}
              className="inline-flex items-center gap-2 rounded-lg bg-[#00629B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#004B75]"
            >
              <IconChat className="w-3.5 h-3.5 text-[#FFC20E]" /> Abrir Asistente Virtual
            </button>
          </div>
        </div>
      </main>

      {modalNuevoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00629B] text-white">
                  <IconAcademic className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                    Solicitar taller de biblioteca
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Completa los detalles para coordinar con el equipo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearSolicitud} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Taller Especializado *
                </label>
                <select
                  value={formData.taller}
                  onChange={(e) => setFormData({ ...formData, taller: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00629B] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                >
                  {TALLERES_DISPONIBLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Modalidad *
                  </label>
                  <select
                    value={formData.modalidad}
                    onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00629B] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Presencial">Presencial (Sede)</option>
                    <option value="Virtual">Virtual (Teams)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Participantes *
                  </label>
                  <select
                    value={formData.participantes}
                    onChange={(e) => setFormData({ ...formData, participantes: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00629B] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Carrera / Programa *
                  </label>
                  {user?.carrera && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      ✓ Autocompletado desde tu perfil
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.carrera}
                  onChange={(e) => setFormData({ ...formData, carrera: e.target.value })}
                  placeholder="Ej: Ingeniería Civil Informática"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00629B] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Comentarios o temas específicos de interés (opcional)
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Indica fechas tentativas o necesidades particulares de tu grupo..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#00629B] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="rounded-lg bg-sky-50 p-3 text-[11px] text-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                La solicitud será enviada con tu nombre (<strong>{user?.nombre}</strong>) y correo institucional (<strong>{user?.email}</strong>).
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoSolicitud}
                  className="rounded-lg bg-[#00629B] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#004B75] disabled:opacity-50"
                >
                  {enviandoSolicitud ? "Enviando solicitud..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCancelar.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <IconTrash className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                  ¿Cancelar esta solicitud?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  #{modalCancelar.id} • {modalCancelar.taller}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Esta solicitud de taller será removida de la bandeja de revisión de la biblioteca. Puedes volver a solicitarla en cualquier momento si lo necesitas.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalCancelar({ open: false, id: null, taller: "" })}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                No, mantener
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelar}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
              >
                Sí, cancelar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
