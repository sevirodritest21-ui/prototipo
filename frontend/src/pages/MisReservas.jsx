import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../services/api";
import { useCampusQuery, useDiasBloqueadosQuery, useFeriadosQuery, queryClient } from "../services/queries";
import { obtenerSessionId } from "../utils/session";
import "./MisReservas.css";

registerLocale("es", es);

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

const IconPin = (p) => <Icon {...p} path={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" /><circle cx="12" cy="10" r="3" /></>} />;
const IconCalendar = (p) => <Icon {...p} path={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>} />;
const IconClock = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />;
const IconUser = (p) => <Icon {...p} path={<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>} />;
const IconUsers = (p) => <Icon {...p} path={<><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0114 0" /><path d="M16 4.5a3.5 3.5 0 010 7M17.5 21a7 7 0 00-2-4.9" /></>} />;
const IconCheck = (p) => <Icon {...p} path={<path d="M20 6L9 17l-5-5" />} />;
const IconAlert = (p) => <Icon {...p} path={<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" /></>} />;
const IconLock = (p) => <Icon {...p} path={<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 118 0v3" /></>} />;
const IconClose = (p) => <Icon {...p} path={<path d="M18 6L6 18M6 6l12 12" />} />;
const IconPlus = (p) => <Icon {...p} path={<path d="M12 5v14M5 12h14" />} />;
const IconEdit = (p) => <Icon {...p} path={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></>} />;
const IconList = (p) => <Icon {...p} path={<><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>} />;
const IconTrash = (p) => <Icon {...p} path={<><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></>} />;
const IconTicket = (p) => <Icon {...p} path={<><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 6v12M2 12h2M20 12h2" /></>} />;

const calcularEsBloquePasado = (fechaStr, horaStr) => {
  if (!fechaStr || !horaStr) return false;
  const hoy = new Date();
  const yr = hoy.getFullYear();
  const mo = String(hoy.getMonth() + 1).padStart(2, "0");
  const dy = String(hoy.getDate()).padStart(2, "0");
  const hoyStr = `${yr}-${mo}-${dy}`;
  if (fechaStr !== hoyStr) return false;

  const [h, m] = horaStr.split(":").map(Number);
  const minBloque = h * 60 + (m || 0);
  const minActual = hoy.getHours() * 60 + hoy.getMinutes();
  return minBloque <= minActual;
};

export default function MisReservas() {
  const { user } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sancion, setSancion] = useState(null);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [paginacionHistorial, setPaginacionHistorial] = useState({
    pagina: 1,
    limite: 5,
    total_items: 0,
    total_paginas: 1
  });
  const { data: campusList = [] } = useCampusQuery();
  const { data: feriados = [] } = useFeriadosQuery();
  const { data: diasBloqueados = [] } = useDiasBloqueadosQuery();

  const [modalEdicionOpen, setModalEdicionOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    campus_id: "",
    fecha: "",
    hora: "",
    fechaObj: null,
    acompanantes: []
  });
  const [editBloques, setEditBloques] = useState([]);
  const [cargandoEditBloques, setCargandoEditBloques] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, reserva: null, onConfirm: null });
  const [modalIncidencia, setModalIncidencia] = useState({
    open: false,
    reserva: null,
    categoria: "electricidad",
    descripcion: "",
    enviando: false
  });
  const [toastNotificacion, setToastNotificacion] = useState({ tipo: "", texto: "" });

  const handleSpotlight = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  useEffect(() => {
    if (toastNotificacion.texto) {
      const timer = setTimeout(() => {
        setToastNotificacion({ tipo: "", texto: "" });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [toastNotificacion.texto]);

  const cargarReservas = async (pagina = paginaHistorial) => {
    if (!user || !user.rut) {
      setCargando(false);
      setSancion(null);
      return;
    }
    setCargando(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/reservas/consultar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rut: user.rut,
          sessionId: obtenerSessionId(user.rut),
          pagina_historial: pagina,
          limite_historial: 5
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReservas(data.reservas || []);
        setSancion(data.sancion || null);
        if (data.paginacion_historial) {
          setPaginacionHistorial(data.paginacion_historial);
          setPaginaHistorial(data.paginacion_historial.pagina);
        }
      } else {
        setReservas([]);
        setSancion(null);
      }
    } catch (err) {
      console.error(err);
      setReservas([]);
      setSancion(null);
    } finally {
      setCargando(false);
    }
  };

  const cambiarPaginaHistorial = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > paginacionHistorial.total_paginas) return;
    setPaginaHistorial(nuevaPagina);
    cargarReservas(nuevaPagina);
  };

  const obtenerNumerosPaginacion = (actual, total) => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (actual <= 3) return [1, 2, 3, 4, 5];
    if (actual >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
    return [actual - 2, actual - 1, actual, actual + 1, actual + 2];
  };

  useEffect(() => {
    cargarReservas();

    const handleActualizar = () => {
      cargarReservas();
      queryClient.invalidateQueries({ queryKey: ["calendario", "bloqueos"] });
    };

    window.addEventListener("reservaActualizada", handleActualizar);
    window.addEventListener("focus", handleActualizar);
    return () => {
      window.removeEventListener("reservaActualizada", handleActualizar);
      window.removeEventListener("focus", handleActualizar);
    };
  }, [user?.rut]);

  const esDiaLaboral = (date) => {
    const day = date.getDay();
    const esFinDeSemana = day === 0 || day === 6;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");
    const fechaString = `${year}-${month}-${dayOfMonth}`;
    const esBloqueado = diasBloqueados.some((b) => {
      if (b.fecha !== fechaString) return false;
      if (!b.campus_id) return true;
      if (!editFormData.campus_id) return true;
      return parseInt(editFormData.campus_id, 10) === parseInt(b.campus_id, 10);
    });
    return !esFinDeSemana && !feriados.includes(fechaString) && !esBloqueado;
  };

  const ejecutarCancelacion = async (reservaId) => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const sessionId = obtenerSessionId(user?.rut);
      const url = `${API_URL}/api/reservas/${reservaId}${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setToastNotificacion({ tipo: "exito", texto: data.mensaje || "Operación realizada exitosamente." });
        cargarReservas();
        window.dispatchEvent(new CustomEvent("reservaActualizada"));
      } else {
        const data = await res.json();
        setToastNotificacion({ tipo: "error", texto: "Error al procesar la reserva: " + (data.detail || "") });
      }
    } catch (e) {
      setToastNotificacion({ tipo: "error", texto: "No se pudo conectar con el servidor." });
    }
  };

  const handleCancelarReserva = (reserva) => {
    setConfirmModal({
      open: true,
      reserva,
      onConfirm: () => ejecutarCancelacion(reserva.id)
    });
  };

  const abrirModalEdicion = (reserva) => {
    const [yr, mo, dy] = reserva.fecha.split("-").map(Number);
    setEditFormData({
      id: reserva.id,
      campus_id: String(reserva.campus_id || ""),
      fecha: reserva.fecha,
      hora: reserva.hora,
      fechaObj: new Date(yr, mo - 1, dy),
      acompanantes: reserva.acompanantes ? JSON.parse(JSON.stringify(reserva.acompanantes)) : []
    });
    setModalEdicionOpen(true);
  };

  const handleAddAcompanante = () => {
    setEditFormData((prev) => ({
      ...prev,
      acompanantes: [...(prev.acompanantes || []), { nombre: "", rut: "" }]
    }));
  };

  const handleRemoveAcompanante = (index) => {
    setEditFormData((prev) => ({
      ...prev,
      acompanantes: prev.acompanantes.filter((_, i) => i !== index)
    }));
  };

  const handleAcompananteChange = (index, field, value) => {
    setEditFormData((prev) => {
      const list = [...(prev.acompanantes || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, acompanantes: list };
    });
  };

  useEffect(() => {
    if (modalEdicionOpen && editFormData.campus_id && editFormData.fecha) {
      setCargandoEditBloques(true);
      fetch(`${API_URL}/api/disponibilidad?campus_id=${editFormData.campus_id}&fecha=${editFormData.fecha}`)
        .then((res) => res.json())
        .then((data) => {
          setEditBloques(data.bloques || []);
          setCargandoEditBloques(false);
        })
        .catch(() => setCargandoEditBloques(false));
    }
  }, [modalEdicionOpen, editFormData.campus_id, editFormData.fecha]);

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!editFormData.fecha || !editFormData.hora || !editFormData.campus_id) {
      setToastNotificacion({ tipo: "error", texto: "Por favor selecciona campus, fecha y hora." });
      return;
    }
    if (calcularEsBloquePasado(editFormData.fecha, editFormData.hora)) {
      setToastNotificacion({ tipo: "error", texto: "El bloque seleccionado ya ha finalizado hoy. Elige un horario futuro." });
      return;
    }

    if (editFormData.acompanantes && editFormData.acompanantes.length > 0) {
      const titRut = String(user?.rut || "").replace(/[.\-\s]/g, "").toUpperCase().trim();
      const rutsVistos = new Set();
      for (let i = 0; i < editFormData.acompanantes.length; i++) {
        const ac = editFormData.acompanantes[i];
        if (ac.rut && ac.rut.trim()) {
          const acRut = ac.rut.replace(/[.\-\s]/g, "").toUpperCase().trim();
          if (titRut && acRut === titRut) {
            setToastNotificacion({ tipo: "error", texto: "No puedes agregarte a ti mismo como acompañante." });
            return;
          }
          if (rutsVistos.has(acRut)) {
            setToastNotificacion({ tipo: "error", texto: `El RUT ${ac.rut} está repetido en la lista de acompañantes.` });
            return;
          }
          rutsVistos.add(acRut);
        }
      }
    }
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/reservas/${editFormData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          campus_id: parseInt(editFormData.campus_id, 10),
          fecha: editFormData.fecha,
          hora: editFormData.hora,
          acompanantes: editFormData.acompanantes,
          sessionId: obtenerSessionId(user?.rut)
        })
      });

      if (res.ok) {
        setToastNotificacion({ tipo: "exito", texto: "¡Reserva modificada exitosamente!" });
        setModalEdicionOpen(false);
        cargarReservas();
        window.dispatchEvent(new CustomEvent("reservaActualizada"));
      } else {
        const errorData = await res.json();
        setToastNotificacion({ tipo: "error", texto: errorData.detail || "Error al modificar la reserva" });
      }
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "No se pudo conectar con el servidor." });
    }
  };

  const handleAbrirModalIncidencia = (reserva) => {
    setModalIncidencia({
      open: true,
      reserva,
      categoria: "electricidad",
      descripcion: "",
      enviando: false
    });
  };

  const handleEnviarIncidencia = async (e) => {
    e.preventDefault();
    if (!modalIncidencia.descripcion.trim()) {
      setToastNotificacion({ tipo: "error", texto: "Por favor describe el problema del cubículo." });
      return;
    }
    setModalIncidencia((prev) => ({ ...prev, enviando: true }));
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const body = {
        cubiculo_id: modalIncidencia.reserva?.cubiculo_id || null,
        reserva_id: modalIncidencia.reserva?.id ? parseInt(modalIncidencia.reserva.id, 10) : null,
        estudiante_rut: user?.rut || modalIncidencia.reserva?.rut || "",
        estudiante_nombre: user?.nombre || modalIncidencia.reserva?.nombre || "",
        categoria: modalIncidencia.categoria,
        descripcion: modalIncidencia.descripcion.trim()
      };
      const res = await fetch(`${API_URL}/api/incidencias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setToastNotificacion({
          tipo: "exito",
          texto: data.mensaje || "Reporte de incidencia enviado con éxito."
        });
        setModalIncidencia({ open: false, reserva: null, categoria: "electricidad", descripcion: "", enviando: false });
      } else {
        setToastNotificacion({
          tipo: "error",
          texto: data.detail || "Error al enviar el reporte de incidencia."
        });
        setModalIncidencia((prev) => ({ ...prev, enviando: false }));
      }
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "No se pudo conectar con el servidor." });
      setModalIncidencia((prev) => ({ ...prev, enviando: false }));
    }
  };

  const abrirChat = () => window.dispatchEvent(new CustomEvent("open-chat"));

  const reservasActivas = reservas.filter((r) => r.activa);
  const reservasPasadas = reservas.filter((r) => !r.activa);
  const inicial = String(user?.nombre || user?.correo || "E").trim().charAt(0).toUpperCase();
  const totalHistorialCount = paginacionHistorial.total_items || reservasPasadas.length;

  return (
    <div className="mr-root min-h-screen pt-16 pb-24">
      {/* HERO / PERFIL DEL ESTUDIANTE */}
      <header className="mr-hero">
        <div className="mr-grid" aria-hidden="true" />
        <div className="mr-blob mr-blob--sky" aria-hidden="true" />
        <div className="mr-blob mr-blob--gold" aria-hidden="true" />
        <div className="mr-blob mr-blob--ocean" aria-hidden="true" />

        <div className="mr-container mr-hero-layout">
          {/* Columna izquierda: Título y Acciones */}
          <div className="mr-fade-up">
            <div className="mr-eyebrow">
              <span className="mr-eyebrow-dot">★</span>
              Portal del Estudiante — Biblioteca UCT
            </div>

            <h1 className="mr-title">
              Mi Espacio de{" "}
              <span className="mr-gradient-text mr-underline">
                Estudio.
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

            <p className="mr-lead">
              Gestiona tus pases digitales activos, modifica horarios, registra a tu equipo de estudio o revisa tu historial en las bibliotecas de la universidad.
            </p>

            <div className="mr-actions">
              <Link to="/reservar" className="mr-btn mr-btn--gold">
                <IconPlus className="w-4 h-4" />
                Nueva Reserva
                <span className="mr-btn-arrow">→</span>
              </Link>
              <button type="button" onClick={abrirChat} className="mr-btn mr-btn--glass">
                <span>🤖</span> Asistente IA
              </button>
            </div>
          </div>

          {/* Columna derecha: Tarjeta Glassmorphism de Perfil Estudiante */}
          <div className="mr-profile-stage mr-fade-up" style={{ animationDelay: "0.18s" }}>
            <div className="mr-profile-card">
              <div className="mr-profile-inner">
                <div className="mr-profile-top">
                  <div className="mr-avatar-wrap">
                    <div className="mr-avatar">{inicial}</div>
                    <span
                      className={`mr-avatar-status ${sancion?.suspendido ? "is-suspended" : "is-online"
                        }`}
                      title={sancion?.suspendido ? "Cuenta suspendida" : "Cuenta habilitada"}
                    />
                  </div>
                  <div className="mr-profile-info">
                    <span className="mr-profile-tag">Credencial Estudiantil</span>
                    <h2>{user?.nombre || "Estudiante UCT"}</h2>
                    <div className="mr-profile-meta">
                      <span>RUT: {user?.rut || "Sin registrar"}</span>
                      {user?.correo && <span>• {user.correo}</span>}
                    </div>
                  </div>
                </div>

                <div className="mr-profile-stats">
                  <div className="mr-stat-box">
                    <strong>{reservasActivas.length}</strong>
                    <span>{reservasActivas.length === 1 ? "Pase Activo" : "Pases Activos"}</span>
                  </div>
                  <div className="mr-stat-box">
                    <strong>{totalHistorialCount}</strong>
                    <span>En Historial</span>
                  </div>
                  <div className="mr-stat-box" title={user?.carrera || "Estudiante UCT"}>
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

        <svg className="mr-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,60 C240,100 480,10 720,40 C960,70 1200,20 1440,50 L1440,90 L0,90 Z" />
        </svg>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="mr-container mr-main">
        {/* Alertas de Sanción / Inasistencia */}
        {sancion?.suspendido && (
          <div className="mr-alert mr-alert--danger mr-fade-up">
            <div className="mr-alert-icon">
              <IconAlert className="w-6 h-6" />
            </div>
            <div className="mr-alert-body">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3>
                  Cuenta suspendida temporalmente ({sancion.inasistencias_periodo || 2}/2 inasistencias)
                </h3>
                <span className="mr-alert-pill">
                  <IconClock className="w-3.5 h-3.5" /> Desbloqueo:{" "}
                  {sancion.fecha_desbloqueo || `${sancion.dias_restantes || 3} días restantes`}
                </span>
              </div>
              <p>
                Has alcanzado el límite de 2 inasistencias a cubículos reservados. Por reglamento institucional, no podrás realizar nuevas reservas durante 3 días.
              </p>
            </div>
          </div>
        )}

        {sancion && !sancion.suspendido && sancion.inasistencias_periodo === 1 && (
          <div className="mr-alert mr-alert--warning mr-fade-up">
            <div className="mr-alert-icon">
              <IconAlert className="w-6 h-6" />
            </div>
            <div className="mr-alert-body">
              <h3>Aviso de asistencia: Tienes 1 inasistencia acumulada</h3>
              <p>
                Asiste puntualmente o cancela con anticipación. Al acumular 2 inasistencias, el sistema suspenderá tu cuenta por 3 días.
              </p>
            </div>
          </div>
        )}

        {/* Estado Cargando */}
        {cargando ? (
          <div className="space-y-5">
            {[1, 2].map((i) => (
              <div key={i} className="mr-skeleton">
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
        ) : reservas.length === 0 ? (
          /* Estado Vacío General */
          <div className="mr-empty-card mr-fade-up">
            <div className="mr-empty-icon">
              <IconCalendar className="w-8 h-8" />
            </div>
            <span className="mr-kicker">✦ Sin actividad registrada</span>
            <h3>Aún no tienes reservas registradas</h3>
            <p>
              Reserva tu primer cubículo de estudio individual o grupal eligiendo sede, fecha y bloque horario, o pídele a nuestro chatbot que lo agende por ti.
            </p>
            <div className="mr-actions justify-center">
              <Link to="/reservar" className="mr-btn mr-btn--gold">
                Agendar cubículo ahora <span className="mr-btn-arrow">→</span>
              </Link>
              <button type="button" onClick={abrirChat} className="mr-btn mr-btn--sky">
                <span>🤖</span> Reservar con IA
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-14">
            {/* SECCIÓN 1: RESERVAS ACTIVAS */}
            <section aria-labelledby="mr-active-heading">
              <div className="mr-section-bar">
                <div>
                  <span className="mr-kicker">⚡ En curso y próximas</span>
                  <h2 id="mr-active-heading" className="mr-h2">
                    Pases <em>Activos</em>{" "}
                    <span className="mr-count-pill">{reservasActivas.length}</span>
                  </h2>
                </div>
              </div>

              {reservasActivas.length === 0 ? (
                <div className="mr-empty-inline">
                  <div className="flex items-center gap-3.5">
                    <span className="mr-empty-inline-icon">
                      <IconTicket className="w-5 h-5" />
                    </span>
                    <div>
                      <h4>No tienes reservas activas en este momento</h4>
                      <p>¿Necesitas un espacio para estudiar hoy o mañana? Agenda en segundos.</p>
                    </div>
                  </div>
                  <Link to="/reservar" className="mr-btn mr-btn--gold">
                    <IconPlus className="w-4 h-4" /> Reservar ahora
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {reservasActivas.map((res) => (
                    <article
                      key={res.id}
                      className="mr-ticket"
                      onMouseMove={handleSpotlight}
                    >
                      <div className="mr-ticket-inner">
                        {/* Cabecera del Pase Digital */}
                        <div className="mr-ticket-head">
                          <div className="flex items-center gap-3">
                            <span className="mr-ticket-head-icon">
                              <IconTicket className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="mr-ticket-eyebrow">
                                Universidad Católica de Temuco • Biblioteca
                              </span>
                              <h3>Pase Digital de Estudio</h3>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`mr-status-badge ${res.es_titular === false
                                  ? "mr-status-badge--guest"
                                  : "mr-status-badge--active"
                                }`}
                            >
                              <span className="mr-status-dot" />
                              {res.es_titular === false ? "Acompañante" : "Pase Activo"}
                            </span>
                            <span className="mr-ticket-id">#RES-{res.id}</span>
                          </div>
                        </div>

                        {/* Cuerpo dividido estilo Boarding Pass */}
                        <div className="mr-ticket-body">
                          <div className="mr-ticket-main">
                            <div className="mr-metrics-grid">
                              <div className="mr-metric">
                                <span className="mr-metric-label">
                                  <IconPin className="w-3.5 h-3.5 text-[#00A3E0]" /> Sede / Campus
                                </span>
                                <p className="mr-metric-value">{res.campus}</p>
                              </div>

                              <div className="mr-metric">
                                <span className="mr-metric-label">
                                  <IconTicket className="w-3.5 h-3.5 text-[#00A3E0]" /> Cubículo
                                </span>
                                <div>
                                  <span className="mr-cubiculo-pill">{res.cubiculo_codigo}</span>
                                </div>
                              </div>

                              <div className="mr-metric">
                                <span className="mr-metric-label">
                                  <IconCalendar className="w-3.5 h-3.5 text-[#00A3E0]" /> Fecha
                                </span>
                                <p className="mr-metric-value tabular-nums">{res.fecha}</p>
                              </div>

                              <div className="mr-metric">
                                <span className="mr-metric-label">
                                  <IconClock className="w-3.5 h-3.5 text-[#00A3E0]" /> Horario
                                </span>
                                <p className="mr-metric-value mr-metric-value--highlight tabular-nums">
                                  {res.hora} hrs
                                </p>
                              </div>
                            </div>

                            {/* Titular y Acompañantes */}
                            <div className="mr-people-grid">
                              <div className="mr-person-box">
                                <span className="mr-person-label">
                                  <IconUser className="w-3.5 h-3.5 text-[#00A3E0]" /> Estudiante titular
                                </span>
                                <p className="mr-person-name">
                                  {res.es_titular === false
                                    ? res.titular_nombre || res.nombre
                                    : user?.nombre || res.nombre || "Estudiante"}
                                </p>
                                <p className="mr-person-rut">
                                  RUT:{" "}
                                  {res.es_titular === false
                                    ? res.titular_rut || res.rut
                                    : user?.rut || res.rut || "N/A"}
                                </p>
                              </div>

                              <div className="mr-person-box">
                                <span className="mr-person-label">
                                  <IconUsers className="w-3.5 h-3.5 text-[#00A3E0]" /> Acompañantes registrados (
                                  {res.acompanantes?.length || 0})
                                </span>
                                {res.acompanantes && res.acompanantes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {res.acompanantes.map((ac, idx) => (
                                      <span key={idx} className="mr-companion-chip">
                                        <span className="mr-companion-dot" />
                                        {ac.nombre} {ac.rut ? <small>({ac.rut})</small> : ""}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mr-person-empty">
                                    Sin acompañantes registrados (jornada individual)
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Talón Derecho del Ticket (Acciones y Código Grande) */}
                          <div className="mr-ticket-stub">
                            <div className="mr-stub-badge">
                              <span>Espacio Asignado</span>
                              <strong>{res.cubiculo_codigo}</strong>
                              <small>Pase ID #{res.id}</small>
                            </div>

                            <div className="mr-stub-actions">
                              {res.es_titular !== false ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => abrirModalEdicion(res)}
                                    className="mr-action-btn mr-action-btn--primary"
                                  >
                                    <IconEdit className="w-4 h-4" /> Modificar Reserva
                                  </button>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleCancelarReserva(res)}
                                      className="mr-action-btn mr-action-btn--danger"
                                    >
                                      <IconTrash className="w-3.5 h-3.5" /> Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirModalIncidencia(res)}
                                      className="mr-action-btn mr-action-btn--warn"
                                      title="Reportar avería o problemas del cubículo"
                                    >
                                      <IconAlert className="w-3.5 h-3.5" /> Incidencia
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="grid grid-cols-2 gap-2 w-full">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelarReserva(res)}
                                    className="mr-action-btn mr-action-btn--danger"
                                  >
                                    <IconTrash className="w-3.5 h-3.5" /> Desvincularme
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirModalIncidencia(res)}
                                    className="mr-action-btn mr-action-btn--warn"
                                    title="Reportar avería o problemas del cubículo"
                                  >
                                    <IconAlert className="w-3.5 h-3.5" /> Incidencia
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* SECCIÓN 2: HISTORIAL DE RESERVAS */}
            {(reservasPasadas.length > 0 || paginacionHistorial.total_items > 0) && (
              <section aria-labelledby="mr-history-heading">
                <div className="mr-section-bar">
                  <div>
                    <span className="mr-kicker">✦ Registro académico</span>
                    <h2 id="mr-history-heading" className="mr-h2">
                      Historial de <em>Reservas</em>{" "}
                      <span className="mr-count-pill">{totalHistorialCount}</span>
                    </h2>
                  </div>

                  {paginacionHistorial.total_paginas > 1 && (
                    <span className="mr-page-indicator">
                      Página <strong>{paginacionHistorial.pagina}</strong> de{" "}
                      <strong>{paginacionHistorial.total_paginas}</strong>
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {reservasPasadas.map((res) => {
                    const est = (res.estado || "").toLowerCase();
                    const esInasistencia = est === "inasistencia";
                    const esCancelada = est === "cancelada";
                    const esLiberada = est === "liberada";

                    let labelTexto = "Completada";
                    let codeClass = "is-done";
                    let statusClass = "mr-history-status--done";

                    if (esInasistencia) {
                      labelTexto = "Inasistencia";
                      codeClass = "is-danger";
                      statusClass = "mr-history-status--danger";
                    } else if (esCancelada) {
                      labelTexto = "Cancelada por admin";
                      codeClass = "is-warn";
                      statusClass = "mr-history-status--warn";
                    } else if (esLiberada) {
                      labelTexto = "Liberada";
                      codeClass = "is-warn";
                      statusClass = "mr-history-status--warn";
                    } else {
                      labelTexto = "Completada con éxito";
                      codeClass = "is-done";
                      statusClass = "mr-history-status--done";
                    }

                    return (
                      <div key={res.id} className="mr-history-item">
                        <div className="flex items-center gap-4">
                          <div className={`mr-history-code ${codeClass}`}>
                            {res.cubiculo_codigo}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4>{res.campus}</h4>
                              <span className={`mr-history-status ${statusClass}`}>
                                {labelTexto}
                              </span>
                            </div>

                            <div className="mr-history-meta">
                              <span>
                                <IconCalendar className="w-3.5 h-3.5 text-[#00A3E0]" /> {res.fecha}
                              </span>
                              <span className="opacity-40">•</span>
                              <span>
                                <IconClock className="w-3.5 h-3.5 text-[#00A3E0]" /> {res.hora} hrs
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mr-history-right">
                          <span className="mr-history-id">#RES-{res.id}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {paginacionHistorial.total_paginas > 1 && (
                  <div className="mr-pagination">
                    <p className="mr-pagination-info">
                      Mostrando <strong>{reservasPasadas.length}</strong> de{" "}
                      <strong>{paginacionHistorial.total_items}</strong> registros
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => cambiarPaginaHistorial(paginacionHistorial.pagina - 1)}
                        disabled={paginacionHistorial.pagina <= 1}
                        className="mr-page-btn mr-page-btn--nav"
                      >
                        ← Anterior
                      </button>
                      <div className="flex items-center gap-1">
                        {obtenerNumerosPaginacion(
                          paginacionHistorial.pagina,
                          paginacionHistorial.total_paginas
                        ).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => cambiarPaginaHistorial(num)}
                            className={`mr-page-btn ${num === paginacionHistorial.pagina ? "is-active" : ""
                              }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => cambiarPaginaHistorial(paginacionHistorial.pagina + 1)}
                        disabled={
                          paginacionHistorial.pagina >= paginacionHistorial.total_paginas
                        }
                        className="mr-page-btn mr-page-btn--nav"
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

      {/* MODAL 1: EDITAR RESERVA */}
      {modalEdicionOpen && (
        <div className="mr-modal-backdrop">
          <div className="mr-modal">
            <div className="mr-modal-head">
              <div>
                <span className="mr-modal-kicker">✦ Gestión de Reserva</span>
                <h3>Editar reserva activa</h3>
                <p>Modifica la sede, fecha, horario o integrantes de tu grupo.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicionOpen(false)}
                className="mr-modal-close"
                title="Cerrar"
              >
                <IconClose />
              </button>
            </div>
            <div className="mr-modal-bar" />

            <form onSubmit={handleGuardarEdicion} className="flex flex-col flex-1 overflow-hidden">
              <div className="mr-modal-body space-y-5">
                <div className="mr-readonly-box">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <IconLock className="w-3.5 h-3.5 text-[#00A3E0]" /> Titular
                    </span>
                    <strong>{user?.nombre || "Estudiante"}</strong>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <IconLock className="w-3.5 h-3.5 text-[#00A3E0]" /> RUT
                    </span>
                    <strong className="tabular-nums">{user?.rut || "N/A"}</strong>
                  </div>
                  <p className="mr-readonly-note">
                    Los datos personales del estudiante titular no son modificables.
                  </p>
                </div>

                <div>
                  <label className="mr-label">Sede / Campus</label>
                  <select
                    required
                    value={editFormData.campus_id}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        campus_id: e.target.value,
                        hora: ""
                      }))
                    }
                    className="mr-input"
                  >
                    <option value="">Selecciona Campus</option>
                    {campusList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mr-label">Nueva fecha</label>
                  <DatePicker
                    selected={editFormData.fechaObj}
                    onChange={(date) => {
                      if (!date) return;
                      const yr = date.getFullYear();
                      const mo = String(date.getMonth() + 1).padStart(2, "0");
                      const dy = String(date.getDate()).padStart(2, "0");
                      setEditFormData((prev) => ({
                        ...prev,
                        fechaObj: date,
                        fecha: `${yr}-${mo}-${dy}`,
                        hora: ""
                      }));
                    }}
                    filterDate={esDiaLaboral}
                    minDate={new Date()}
                    dateFormat="yyyy-MM-dd"
                    locale="es"
                    className="mr-input tabular-nums"
                  />
                </div>

                <div>
                  <label className="mr-label">Nuevo horario</label>
                  {cargandoEditBloques ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/50 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : editBloques.length === 0 ? (
                    <p className="mr-empty-slots">
                      Selecciona sede y fecha para consultar los bloques disponibles.
                    </p>
                  ) : (
                    <div className="grid max-h-48 grid-cols-2 gap-2.5 overflow-y-auto pr-1">
                      {editBloques.map((b) => {
                        const esPasado =
                          b.pasado || calcularEsBloquePasado(editFormData.fecha, b.hora);
                        const esSeleccionado = editFormData.hora === b.hora && !esPasado;
                        const deshabilitado =
                          (b.disponibles === 0 && !esSeleccionado) || esPasado;
                        return (
                          <button
                            key={b.hora}
                            type="button"
                            disabled={deshabilitado}
                            onClick={() =>
                              !deshabilitado &&
                              setEditFormData((prev) => ({ ...prev, hora: b.hora }))
                            }
                            className={`mr-slot-btn ${deshabilitado
                                ? "is-disabled"
                                : esSeleccionado
                                  ? "is-selected"
                                  : ""
                              }`}
                            title={esPasado ? "Horario ya finalizado hoy" : ""}
                          >
                            <span className="font-bold tabular-nums">{b.rango}</span>
                            <small>
                              {esPasado ? "Finalizado" : `${b.disponibles} libres`}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-slate-200 dark:border-slate-700/80 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="mr-label mb-0 flex items-center gap-1.5">
                      <IconUsers className="w-4 h-4 text-[#00A3E0]" /> Acompañantes (
                      {editFormData.acompanantes?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAcompanante}
                      className="mr-add-companion-btn"
                    >
                      <IconPlus className="w-3.5 h-3.5" /> Añadir acompañante
                    </button>
                  </div>

                  {!editFormData.acompanantes || editFormData.acompanantes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No hay acompañantes registrados en esta reserva.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {editFormData.acompanantes.map((ac, idx) => {
                        const acRutClean = ac.rut
                          ? ac.rut.replace(/[.\-\s]/g, "").toUpperCase().trim()
                          : "";
                        const titRutClean = String(user?.rut || "")
                          .replace(/[.\-\s]/g, "")
                          .toUpperCase()
                          .trim();
                        const esMismoTitular = Boolean(
                          acRutClean && titRutClean && acRutClean === titRutClean
                        );
                        const esDuplicado = Boolean(
                          acRutClean &&
                          editFormData.acompanantes.some(
                            (otro, i) =>
                              i !== idx &&
                              otro.rut &&
                              otro.rut.replace(/[.\-\s]/g, "").toUpperCase().trim() ===
                              acRutClean
                          )
                        );

                        return (
                          <div key={idx} className="mr-companion-row">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Nombre acompañante"
                                value={ac.nombre || ""}
                                onChange={(e) =>
                                  handleAcompananteChange(idx, "nombre", e.target.value)
                                }
                                className="mr-input mr-input--sm flex-1"
                              />
                              <input
                                type="text"
                                placeholder="RUT (12345678-9)"
                                value={ac.rut || ""}
                                onChange={(e) =>
                                  handleAcompananteChange(idx, "rut", e.target.value)
                                }
                                className={`mr-input mr-input--sm w-36 ${esMismoTitular || esDuplicado ? "is-invalid" : ""
                                  }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveAcompanante(idx)}
                                className="mr-remove-companion-btn"
                                title="Eliminar acompañante"
                              >
                                <IconClose className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {esMismoTitular && (
                              <p className="text-[11px] font-semibold text-rose-600">
                                ⚠️ No puedes agregarte a ti mismo como acompañante.
                              </p>
                            )}
                            {esDuplicado && !esMismoTitular && (
                              <p className="text-[11px] font-semibold text-rose-600">
                                ⚠️ Este RUT ya fue ingresado en otro acompañante.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mr-modal-foot">
                <button
                  type="button"
                  onClick={() => setModalEdicionOpen(false)}
                  className="mr-modal-btn mr-modal-btn--ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="mr-btn mr-btn--gold">
                  Guardar cambios <span className="mr-btn-arrow">→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR CANCELACIÓN / DESVINCULACIÓN */}
      {confirmModal.open && (
        <div className="mr-modal-backdrop">
          <div className="mr-modal max-w-md">
            <div className="mr-modal-head mr-modal-head--danger">
              <div className="flex items-center gap-3">
                <span className="mr-modal-danger-icon">
                  <IconAlert className="w-5 h-5" />
                </span>
                <div>
                  <span className="mr-modal-kicker">✦ Confirmación requerida</span>
                  <h3>
                    {confirmModal.reserva?.es_titular === false
                      ? "¿Desvincularte de la reserva?"
                      : "¿Cancelar tu reserva?"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, reserva: null, onConfirm: null })}
                className="mr-modal-close"
              >
                <IconClose />
              </button>
            </div>

            <div className="mr-modal-body space-y-4">
              <p className="text-sm leading-relaxed opacity-85">
                {confirmModal.reserva?.es_titular === false
                  ? "Te retirarás como acompañante de esta reserva y tu cuenta quedará habilitada inmediatamente para reservar tu propio cubículo."
                  : "Esta acción liberará el cubículo de inmediato para que otros estudiantes de la universidad puedan utilizarlo."}
              </p>

              {confirmModal.reserva && (
                <div className="mr-confirm-summary">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-700">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {confirmModal.reserva.es_titular === false
                        ? "Pase de acompañante"
                        : "Pase a cancelar"}
                    </span>
                    <span className="mr-cubiculo-pill">
                      ID #{confirmModal.reserva.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2.5 text-xs">
                    <div>
                      <span className="opacity-60 block">Sede / Campus</span>
                      <strong className="text-sm">{confirmModal.reserva.campus}</strong>
                    </div>
                    <div>
                      <span className="opacity-60 block">Cubículo</span>
                      <strong className="text-sm">{confirmModal.reserva.cubiculo_codigo}</strong>
                    </div>
                    <div>
                      <span className="opacity-60 block">Fecha</span>
                      <strong className="text-sm tabular-nums">{confirmModal.reserva.fecha}</strong>
                    </div>
                    <div>
                      <span className="opacity-60 block">Horario</span>
                      <strong className="text-sm tabular-nums">
                        {confirmModal.reserva.hora} hrs
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="mr-confirm-tip">
                <strong>Nota:</strong> Cancelar con anticipación no acumula inasistencias ni genera sanciones en el sistema.
              </div>
            </div>

            <div className="mr-modal-foot">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, reserva: null, onConfirm: null })}
                className="mr-modal-btn mr-modal-btn--ghost"
              >
                {confirmModal.reserva?.es_titular === false
                  ? "Conservar lugar"
                  : "Conservar reserva"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ open: false, reserva: null, onConfirm: null });
                }}
                className="mr-modal-btn mr-modal-btn--danger"
              >
                {confirmModal.reserva?.es_titular === false
                  ? "Sí, desvincularme"
                  : "Sí, cancelar cupo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REPORTAR INCIDENCIA */}
      {modalIncidencia.open && (
        <div className="mr-modal-backdrop">
          <div className="mr-modal">
            <div className="mr-modal-head mr-modal-head--warn">
              <div>
                <span className="mr-modal-kicker">⚠️ Soporte Biblioteca UCT</span>
                <h3>Reportar problema en cubículo</h3>
                <p>
                  Cubículo {modalIncidencia.reserva?.cubiculo_codigo} •{" "}
                  {modalIncidencia.reserva?.campus}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setModalIncidencia({
                    open: false,
                    reserva: null,
                    categoria: "electricidad",
                    descripcion: "",
                    enviando: false
                  })
                }
                className="mr-modal-close"
                title="Cerrar"
              >
                <IconClose />
              </button>
            </div>

            <form onSubmit={handleEnviarIncidencia}>
              <div className="mr-modal-body space-y-4">
                <div className="mr-confirm-tip">
                  Informa al equipo técnico y bibliotecario sobre desperfectos físicos o de equipamiento para que puedan revisarlo a la brevedad.
                </div>

                <div>
                  <label className="mr-label">Tipo de problema / Categoría</label>
                  <select
                    value={modalIncidencia.categoria}
                    onChange={(e) =>
                      setModalIncidencia((prev) => ({ ...prev, categoria: e.target.value }))
                    }
                    className="mr-input"
                  >
                    <option value="electricidad">⚡ Enchufes / Electricidad / Iluminación</option>
                    <option value="mobiliario">🪑 Sillas / Mesa / Mobiliario dañado</option>
                    <option value="limpieza">🧹 Limpieza / Higiene / Residuos</option>
                    <option value="tecnologia">🖥️ Pantalla / Conexión HDMI / Monitor</option>
                    <option value="clima">❄️ Climatización / Ventilación / Ruido</option>
                    <option value="otro">📌 Otro problema técnico</option>
                  </select>
                </div>

                <div>
                  <label className="mr-label">Descripción del problema</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Ej: El enchufe de la pared izquierda no tiene corriente y una de las sillas tiene la rueda rota..."
                    value={modalIncidencia.descripcion}
                    onChange={(e) =>
                      setModalIncidencia((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                    className="mr-input"
                  />
                </div>
              </div>

              <div className="mr-modal-foot">
                <button
                  type="button"
                  onClick={() =>
                    setModalIncidencia({
                      open: false,
                      reserva: null,
                      categoria: "electricidad",
                      descripcion: "",
                      enviando: false
                    })
                  }
                  className="mr-modal-btn mr-modal-btn--ghost"
                  disabled={modalIncidencia.enviando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalIncidencia.enviando}
                  className="mr-btn mr-btn--gold"
                >
                  {modalIncidencia.enviando ? "Enviando reporte..." : "Enviar reporte →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST DE NOTIFICACIÓN */}
      {toastNotificacion.texto && (
        <div
          className={`mr-toast ${toastNotificacion.tipo === "error" ? "mr-toast--error" : "mr-toast--success"
            }`}
        >
          <span className="mr-toast-icon">
            {toastNotificacion.tipo === "error" ? <IconAlert /> : <IconCheck />}
          </span>
          <p className="flex-1 font-semibold">{toastNotificacion.texto}</p>
          <button
            type="button"
            onClick={() => setToastNotificacion({ tipo: "", texto: "" })}
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}