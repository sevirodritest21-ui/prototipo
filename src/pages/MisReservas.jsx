import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../services/api";
import { useCampusQuery, useDiasBloqueadosQuery, useFeriadosQuery, queryClient } from "../services/queries";

registerLocale("es", es);

// Feriados oficiales de Chile 2026
const FERIADOS_CHILE_2026 = [
  "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01",
  "2026-05-21", "2026-06-21", "2026-06-29", "2026-07-16",
  "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12",
  "2026-10-31", "2026-11-01", "2026-12-08", "2026-12-25"
];

const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
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

const obtenerSessionId = (rut) => {
  if (rut) {
    return `session_rut_${String(rut).replace(/\./g, '').trim().toUpperCase()}`;
  }
  let sId = sessionStorage.getItem("chat_session_id");
  if (!sId) {
    sId = "session_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
    sessionStorage.setItem("chat_session_id", sId);
  }
  return sId;
};

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
  const { data: feriados = FERIADOS_CHILE_2026 } = useFeriadosQuery();
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

  const reservasActivas = reservas.filter((r) => r.activa);
  const reservasPasadas = reservas.filter((r) => !r.activa);

  return (
    <div className="min-h-screen bg-[#F4F6F9] pt-16 pb-20 font-sans text-slate-800">

      <header className="bg-[#00629B] text-white shadow-md">
        <div className="mx-auto max-w-5xl px-5 py-9 sm:py-11">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sky-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 border border-white/15 text-[#FFC20E]">
                  <IconList className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                  Portal del Estudiante • Biblioteca UCT
                </span>
              </div>

              <h1 className="mt-4 font-serif text-3xl sm:text-[2.5rem] leading-tight tracking-tight text-white">
                Mis reservas de cubículos
              </h1>

              <p className="mt-2.5 text-[14px] leading-relaxed text-sky-100/90">
                Gestiona, modifica o cancela tus espacios de estudio agendados en las bibliotecas de la universidad.
              </p>
            </div>

            <Link
              to="/reservar"
              className="inline-flex items-center gap-2 rounded-md bg-[#FFC20E] px-4 py-2.5 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-[#FFCA28] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <IconPlus className="w-4 h-4" /> Nueva reserva
            </Link>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B]" />
      </header>

      <main className="mx-auto max-w-5xl px-5 mt-8 space-y-6">

        {sancion?.suspendido && (
          <div className="rounded-xl border border-slate-200 border-l-[4px] border-l-rose-600 bg-white p-5 shadow-sm text-slate-800">
            <div className="flex items-center gap-2 text-rose-700">
              <IconAlert className="w-4 h-4" />
              <h3 className="text-[14px] font-semibold">Cuenta suspendida temporalmente ({sancion.inasistencias_periodo || 2}/2 inasistencias)</h3>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Has alcanzado el límite de 2 inasistencias a cubículos reservados. Por reglamento institucional, no podrás realizar nuevas reservas durante 3 días.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-[12px] font-medium text-rose-800">
              <IconClock className="w-3.5 h-3.5" /> Desbloqueo: {sancion.fecha_desbloqueo || `${sancion.dias_restantes || 3} días restantes`}
            </p>
          </div>
        )}

        {sancion && !sancion.suspendido && sancion.inasistencias_periodo === 1 && (
          <div className="rounded-xl border border-slate-200 border-l-[4px] border-l-amber-500 bg-white p-5 shadow-sm text-slate-800">
            <div className="flex items-center gap-2 text-amber-700">
              <IconAlert className="w-4 h-4" />
              <h3 className="text-[14px] font-semibold">Aviso de asistencia: Tienes 1 inasistencia acumulada</h3>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Asiste puntualmente o cancela con anticipación. Al acumular 2 inasistencias, el sistema suspenderá tu cuenta por 3 días.
            </p>
          </div>
        )}

        {cargando ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-44 rounded bg-slate-200/80" />
                  <div className="h-6 w-24 rounded-full bg-slate-200/60" />
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  <div className="h-4 w-32 rounded bg-slate-200/60" />
                  <div className="h-4 w-28 rounded bg-slate-200/60" />
                  <div className="h-4 w-24 rounded bg-slate-200/60" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 to-transparent animate-shimmer" />
              </div>
            ))}
          </div>
        ) : reservas.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-sky-50 text-[#00629B] flex items-center justify-center mx-auto mb-3">
              <IconCalendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif text-slate-900">No tienes reservas registradas</h3>
            <p className="text-[13px] text-slate-500 mt-1 max-w-md mx-auto">
              Aún no has agendado cubículos de estudio. Selecciona sede, fecha y bloque horario para reservar tu espacio.
            </p>
            <Link
              to="/reservar"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#00629B] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#004B75] transition-colors"
            >
              Agendar cubículo ahora
            </Link>
          </div>
        ) : (
          <div className="space-y-8">

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="font-serif text-xl text-slate-900">Reserva activa ({reservasActivas.length})</h2>
                </div>
              </div>

              {reservasActivas.length === 0 ? (
                <div className="p-5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-500">
                  No tienes reservas activas en este momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {reservasActivas.map((res) => (
                    <div
                      key={res.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="bg-[#00629B] px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3 border-b border-sky-800">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 border border-white/15 text-[#FFC20E]">
                            <IconTicket className="w-4 h-4" />
                          </span>
                          <div>
                            <span className="text-[11px] font-medium tracking-wide uppercase text-sky-200/90">
                              Universidad Católica de Temuco • Biblioteca
                            </span>
                            <h3 className="text-sm font-semibold tracking-tight text-white">
                              Pase digital de estudio
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-semibold ${res.es_titular === false
                              ? "border-sky-400/30 bg-sky-500/20 text-sky-200"
                              : "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                            }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${res.es_titular === false ? "bg-sky-300" : "bg-emerald-400 animate-ping"}`} />
                            {res.es_titular === false ? "Acompañante" : "Pase activo"}
                          </span>
                          <span className="rounded bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-white border border-white/15">
                            #RES-{res.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row">
                        <div className="flex-1 p-6 space-y-5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                                <IconPin className="w-3.5 h-3.5 text-[#00629B]" /> Sede
                              </span>
                              <p className="font-semibold text-slate-900 text-sm">
                                {res.campus}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                                <IconTicket className="w-3.5 h-3.5 text-[#00629B]" /> Cubículo
                              </span>
                              <div className="inline-flex items-center rounded bg-sky-50 px-2.5 py-0.5 font-mono text-sm font-bold text-[#00629B] border border-sky-200/60">
                                {res.cubiculo_codigo}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                                <IconCalendar className="w-3.5 h-3.5 text-[#00629B]" /> Fecha
                              </span>
                              <p className="font-semibold tabular-nums text-slate-800 text-sm">
                                {res.fecha}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                                <IconClock className="w-3.5 h-3.5 text-[#00629B]" /> Horario
                              </span>
                              <p className="font-bold tabular-nums text-[#00629B] text-sm">
                                {res.hora} hrs
                              </p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-0.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Estudiante titular
                              </span>
                              <p className="font-semibold text-slate-900 text-sm">
                                {res.es_titular === false ? (res.titular_nombre || res.nombre) : (user?.nombre || res.nombre || "Estudiante")}
                              </p>
                              <p className="font-mono text-slate-500 text-[11px]">
                                RUT: {res.es_titular === false ? (res.titular_rut || res.rut) : (user?.rut || res.rut || "N/A")}
                              </p>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Acompañantes registrados
                              </span>
                              {res.acompanantes && res.acompanantes.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {res.acompanantes.map((ac, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-block px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700"
                                    >
                                      • {ac.nombre} {ac.rut ? `(${ac.rut})` : ""}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-[11px] pt-0.5">
                                  Sin acompañantes registrados (uso individual)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="relative border-t lg:border-t-0 lg:border-l border-dashed border-slate-200 bg-slate-50/60 p-6 flex flex-col items-center justify-between gap-4 lg:w-64">
                          <div className="text-center space-y-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Espacio Asignado
                            </span>
                            <p className="font-mono text-2xl font-bold text-[#00629B]">
                              {res.cubiculo_codigo}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Pase ID #{res.id}
                            </p>
                          </div>

                          <div className="w-full space-y-2 pt-2 border-t border-slate-200">
                            {res.es_titular !== false ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => abrirModalEdicion(res)}
                                  className="w-full py-2.5 px-3 bg-[#00629B] hover:bg-[#004B75] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E]"
                                >
                                  <IconEdit className="w-3.5 h-3.5" /> Modificar
                                </button>
                                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelarReserva(res)}
                                    className="w-full py-2 px-2.5 border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    <IconTrash className="w-3.5 h-3.5" /> Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirModalIncidencia(res)}
                                    className="w-full py-2 px-2 border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-[11px] font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                                    title="Reportar avería o problemas del cubículo"
                                  >
                                    <IconAlert className="w-3.5 h-3.5 text-amber-600" /> Incidencia
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCancelarReserva(res)}
                                  className="w-full py-2 px-2.5 border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <IconTrash className="w-3.5 h-3.5" /> Desvincularme
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAbrirModalIncidencia(res)}
                                  className="w-full py-2 px-2 border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-[11px] font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                                  title="Reportar avería o problemas del cubículo"
                                >
                                  <IconAlert className="w-3.5 h-3.5 text-amber-600" /> Incidencia
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(reservasPasadas.length > 0 || paginacionHistorial.total_items > 0) && (
              <div className="pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <IconList className="w-4 h-4 text-slate-500" />
                    <h2 className="font-serif text-xl text-slate-900">
                      Historial de reservas anteriores ({paginacionHistorial.total_items || reservasPasadas.length})
                    </h2>
                  </div>
                  {paginacionHistorial.total_paginas > 1 && (
                    <span className="text-[12px] text-slate-500 font-medium">
                      Página {paginacionHistorial.pagina} de {paginacionHistorial.total_paginas}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {reservasPasadas.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-[14px]">{res.campus}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            {res.cubiculo_codigo}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${res.estado === "inasistencia"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : res.estado === "cancelada"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                            {res.estado === "inasistencia" ? "Inasistencia" : res.estado || "Finalizada"}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-500 flex items-center gap-3">
                          <span className="flex items-center gap-1"><IconCalendar className="w-3.5 h-3.5 text-slate-400" /> {res.fecha}</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1"><IconClock className="w-3.5 h-3.5 text-slate-400" /> {res.hora} hrs</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {paginacionHistorial.total_paginas > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <p className="text-[12px] text-slate-500">
                      Mostrando {reservasPasadas.length} de {paginacionHistorial.total_items} registros
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => cambiarPaginaHistorial(paginacionHistorial.pagina - 1)}
                        disabled={paginacionHistorial.pagina <= 1}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <div className="flex items-center gap-1">
                        {obtenerNumerosPaginacion(paginacionHistorial.pagina, paginacionHistorial.total_paginas).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => cambiarPaginaHistorial(num)}
                            className={`min-w-[32px] h-8 rounded-md text-[12px] font-medium transition ${num === paginacionHistorial.pagina
                                ? "bg-[#00629B] text-white shadow-xs"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => cambiarPaginaHistorial(paginacionHistorial.pagina + 1)}
                        disabled={paginacionHistorial.pagina >= paginacionHistorial.total_paginas}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {modalEdicionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-fadeIn">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-[#00629B] px-6 py-4 text-white flex items-start justify-between shrink-0">
              <div>
                <h3 className="font-serif text-xl text-white">Editar reserva</h3>
                <p className="mt-0.5 text-[13px] text-sky-200/90">
                  Modifica la sede, fecha o horario de tu reserva activa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicionOpen(false)}
                className="cursor-pointer rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                title="Cerrar"
              >
                <IconClose />
              </button>
            </div>
            <div className="h-[2px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B] shrink-0" />

            <form onSubmit={handleGuardarEdicion} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><IconLock className="w-3.5 h-3.5" /> Titular</span>
                  <strong className="font-medium text-slate-900">{user?.nombre || "Estudiante"}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><IconLock className="w-3.5 h-3.5" /> RUT</span>
                  <strong className="font-medium tabular-nums text-slate-900">{user?.rut || "N/A"}</strong>
                </div>
                <p className="mt-2 border-t border-slate-200 pt-2 text-[12px] text-slate-500">
                  Los datos personales del titular no son modificables.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Sede / Campus
                </label>
                <select
                  required
                  value={editFormData.campus_id}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, campus_id: e.target.value, hora: "" }))}
                  className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[14px] text-slate-900 focus:border-[#00629B] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20"
                >
                  <option value="">Selecciona Campus</option>
                  {campusList.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Nueva fecha
                </label>
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
                  className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[14px] tabular-nums text-slate-900 focus:border-[#00629B] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Nuevo horario
                </label>
                {cargandoEditBloques ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="relative h-[54px] overflow-hidden rounded-md border border-slate-200 bg-white p-2.5"
                      >
                        <div className="h-3 w-16 rounded bg-slate-200/80" />
                        <div className="mt-2 h-2.5 w-12 rounded bg-slate-200/60" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 to-transparent animate-shimmer" />
                      </div>
                    ))}
                  </div>
                ) : editBloques.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[13px] text-slate-500">
                    Selecciona sede y fecha para ver bloques disponibles.
                  </p>
                ) : (
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {editBloques.map((b) => {
                      const esPasado = b.pasado || calcularEsBloquePasado(editFormData.fecha, b.hora);
                      const esSeleccionado = editFormData.hora === b.hora && !esPasado;
                      const deshabilitado = (b.disponibles === 0 && !esSeleccionado) || esPasado;
                      return (
                        <button
                          key={b.hora}
                          type="button"
                          disabled={deshabilitado}
                          onClick={() => !deshabilitado && setEditFormData((prev) => ({ ...prev, hora: b.hora }))}
                          className={`flex flex-col justify-between rounded-lg border p-2.5 text-left text-[13px] transition-all ${deshabilitado
                              ? "cursor-not-allowed border-slate-200 bg-slate-100/70 text-slate-400 opacity-60"
                              : esSeleccionado
                                ? "cursor-pointer border-[#00629B] bg-[#00629B] text-white shadow-sm"
                                : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-[#00629B] hover:bg-sky-50/50"
                            }`}
                          title={esPasado ? "Horario ya finalizado hoy" : ""}
                        >
                          <span className="font-medium tabular-nums">{b.rango}</span>
                          <span className={`mt-1 text-[12px] ${esPasado ? "text-slate-400" : esSeleccionado ? "text-sky-100" : "text-slate-500"}`}>
                            {esPasado ? "Finalizado" : `${b.disponibles} libres`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                    <IconUsers className="w-4 h-4 text-[#00629B]" /> Acompañantes ({editFormData.acompanantes?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAcompanante}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#00629B] hover:text-[#004B75] bg-sky-50 px-2.5 py-1 rounded border border-sky-200 transition-colors"
                  >
                    <IconPlus className="w-3.5 h-3.5" /> Añadir acompañante
                  </button>
                </div>

                {!editFormData.acompanantes || editFormData.acompanantes.length === 0 ? (
                  <p className="text-[12px] text-slate-400 italic">No hay acompañantes registrados.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {editFormData.acompanantes.map((ac, idx) => {
                      const acRutClean = ac.rut ? ac.rut.replace(/[.\-\s]/g, "").toUpperCase().trim() : "";
                      const titRutClean = String(user?.rut || "").replace(/[.\-\s]/g, "").toUpperCase().trim();
                      const esMismoTitular = Boolean(acRutClean && titRutClean && acRutClean === titRutClean);
                      const esDuplicado = Boolean(
                        acRutClean &&
                        editFormData.acompanantes.some((otro, i) => i !== idx && otro.rut && otro.rut.replace(/[.\-\s]/g, "").toUpperCase().trim() === acRutClean)
                      );

                      return (
                        <div key={idx} className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Nombre acompañante"
                              value={ac.nombre || ""}
                              onChange={(e) => handleAcompananteChange(idx, "nombre", e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium focus:outline-none focus:border-[#00629B]"
                            />
                            <input
                              type="text"
                              placeholder="RUT (ej: 12345678-9)"
                              value={ac.rut || ""}
                              onChange={(e) => handleAcompananteChange(idx, "rut", e.target.value)}
                              className={`w-32 px-2.5 py-1.5 bg-white border rounded text-xs font-medium focus:outline-none ${esMismoTitular || esDuplicado
                                  ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500"
                                  : "border-slate-300 focus:border-[#00629B]"
                                }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveAcompanante(idx)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer text-xs font-bold"
                              title="Eliminar acompañante"
                            >
                              <IconClose className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {esMismoTitular && (
                            <p className="text-[11px] font-medium text-rose-600">
                              ⚠️ No puedes agregarte a ti mismo como acompañante.
                            </p>
                          )}
                          {esDuplicado && !esMismoTitular && (
                            <p className="text-[11px] font-medium text-rose-600">
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

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2 shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={() => setModalEdicionOpen(false)}
                  className="cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-md bg-[#00629B] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#004B75]"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-fadeIn">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1 bg-rose-600" />

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700">
                  <IconAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-serif text-lg text-slate-900">
                    {confirmModal.reserva?.es_titular === false
                      ? "¿Deseas desvincularte de la reserva?"
                      : "¿Confirmas la cancelación de tu reserva?"}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                    {confirmModal.reserva?.es_titular === false
                      ? "Te retirarás como acompañante de esta reserva y tu cuenta quedará habilitada para reservar tu propio cubículo."
                      : "Esta acción liberará el espacio inmediatamente para otros estudiantes."}
                  </p>
                </div>
              </div>

              {confirmModal.reserva && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-medium text-slate-600">
                      {confirmModal.reserva.es_titular === false ? "Pase de acompañante:" : "Pase a cancelar:"}
                    </span>
                    <span className="font-mono font-semibold text-[#00629B] bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
                      ID #{confirmModal.reserva.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <p className="text-slate-400">Sede / Campus:</p>
                      <p className="font-semibold text-slate-800">{confirmModal.reserva.campus}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Cubículo:</p>
                      <p className="font-semibold text-slate-800">{confirmModal.reserva.cubiculo_codigo}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Fecha:</p>
                      <p className="font-semibold text-slate-800">{confirmModal.reserva.fecha}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Horario:</p>
                      <p className="font-semibold text-slate-800">{confirmModal.reserva.hora} hrs</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-md bg-amber-50 border border-amber-200/80 p-3 text-[12px] text-amber-900 flex items-start gap-2">
                <span className="font-semibold">Nota:</span>
                <span>
                  Cancelar con anticipación no acumula inasistencias ni genera suspensiones.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: false, reserva: null, onConfirm: null })}
                  className="cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {confirmModal.reserva?.es_titular === false ? "Conservar lugar" : "Conservar reserva"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                    setConfirmModal({ open: false, reserva: null, onConfirm: null });
                  }}
                  className="cursor-pointer rounded-md bg-rose-700 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-rose-800"
                >
                  {confirmModal.reserva?.es_titular === false ? "Sí, desvincularme" : "Sí, cancelar cupo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalIncidencia.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px]">
          <div className="my-8 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-amber-600 px-6 py-4 text-white flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl text-white flex items-center gap-2">
                  <IconAlert className="w-5 h-5 text-amber-200" /> Reportar problema en cubículo
                </h3>
                <p className="mt-0.5 text-[13px] text-amber-100">
                  Cubículo {modalIncidencia.reserva?.cubiculo_codigo} • {modalIncidencia.reserva?.campus}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalIncidencia({ open: false, reserva: null, categoria: "electricidad", descripcion: "", enviando: false })}
                className="cursor-pointer rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="Cerrar"
              >
                <IconClose />
              </button>
            </div>
            <div className="h-[2px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-700" />

            <form onSubmit={handleEnviarIncidencia} className="p-6 space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[12px] text-amber-900 leading-relaxed">
                Informa al personal técnico y bibliotecario sobre desperfectos físicos o técnicos para que puedan revisarlo o ponerlo en mantenimiento.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tipo de problema / Categoría
                </label>
                <select
                  value={modalIncidencia.categoria}
                  onChange={(e) => setModalIncidencia((prev) => ({ ...prev, categoria: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-[#00629B] focus:outline-none focus:ring-1 focus:ring-[#00629B]"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Descripción del problema
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ej: El enchufe de la pared izquierda no tiene corriente y una de las sillas tiene la rueda rota..."
                  value={modalIncidencia.descripcion}
                  onChange={(e) => setModalIncidencia((prev) => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-xs focus:border-[#00629B] focus:outline-none focus:ring-1 focus:ring-[#00629B]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalIncidencia({ open: false, reserva: null, categoria: "electricidad", descripcion: "", enviando: false })}
                  className="cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                  disabled={modalIncidencia.enviando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalIncidencia.enviando}
                  className="cursor-pointer rounded-md bg-amber-600 hover:bg-amber-700 px-5 py-2 text-[13px] font-semibold text-white shadow-xs transition disabled:opacity-50"
                >
                  {modalIncidencia.enviando ? "Enviando reporte..." : "Enviar reporte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastNotificacion.texto && (
        <div className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-md border-l-[3px] bg-white px-4 py-3.5 text-[13px] shadow-xl animate-slideUp ${toastNotificacion.tipo === "error"
            ? "border-l-rose-600 border border-slate-200"
            : "border-l-emerald-600 border border-slate-200"
          }`}>
          <span className={toastNotificacion.tipo === "error" ? "text-rose-600" : "text-emerald-600"}>
            {toastNotificacion.tipo === "error" ? <IconAlert /> : <IconCheck />}
          </span>
          <p className="flex-1 text-slate-800 font-medium">{toastNotificacion.texto}</p>
          <button
            onClick={() => setToastNotificacion({ tipo: "", texto: "" })}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
