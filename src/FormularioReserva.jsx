import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import { useAuth } from "./context/AuthContext";

registerLocale("es", es);

// Feriados oficiales de Chile 2026 (Formato YYYY-MM-DD)
const FERIADOS_CHILE_2026 = [
  "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01",
  "2026-05-21", "2026-06-21", "2026-06-29", "2026-07-16",
  "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12",
  "2026-10-31", "2026-11-01", "2026-12-08", "2026-12-25"
];

/* ── Iconografía (solo presentación) ─────────────────────────────── */
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
const IconBook = (p) => <Icon {...p} path={<><path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 22z" /><path d="M8 7h8M8 11h6" /></>} />;

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

export default function FormularioReserva() {
  const { user } = useAuth();
  const isAdmin = user?.rol === "admin";
  const isEstudiante = user?.rol === "estudiante";

  const [campusList, setCampusList] = useState([]);
  const [feriados, setFeriados] = useState(FERIADOS_CHILE_2026);
  const [diasBloqueados, setDiasBloqueados] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);

  // Estado para los bloques de horas devueltos por el backend
  const [bloquesHorarios, setBloquesHorarios] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);

  // Estado para gestión de acompañantes
  const [tieneAcompanantes, setTieneAcompanantes] = useState(false);
  const [listAcompanantes, setListAcompanantes] = useState([]);

  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    fecha: "",
    hora: "",
    campus_id: "",
  });

  const [reservaActivaUser, setReservaActivaUser] = useState(null);
  const [todasLasReservas, setTodasLasReservas] = useState([]);
  const [cargandoReservaActiva, setCargandoReservaActiva] = useState(false);
  const [sancionUsuario, setSancionUsuario] = useState(null);

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
  const [confirmModal, setConfirmModal] = useState({ open: false, titulo: "", mensaje: "", onConfirm: null });
  const [toastNotificacion, setToastNotificacion] = useState({ tipo: "", texto: "" });

  const consultarReservaActiva = async (rutConsultar) => {
    if (!rutConsultar) {
      setReservaActivaUser(null);
      setTodasLasReservas([]);
      setSancionUsuario(null);
      return;
    }
    setCargandoReservaActiva(true);
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/reservas/consultar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ rut: rutConsultar, sessionId: obtenerSessionId(rutConsultar) })
      });
      if (res.ok) {
        const data = await res.json();
        const lista = data.reservas || [];
        setTodasLasReservas(lista);
        const activa = lista.find((r) => r.activa);
        setReservaActivaUser(activa || null);
        setSancionUsuario(data.sancion || null);
      } else {
        setReservaActivaUser(null);
        setTodasLasReservas([]);
        setSancionUsuario(null);
      }
    } catch (e) {
      setReservaActivaUser(null);
      setTodasLasReservas([]);
      setSancionUsuario(null);
    } finally {
      setCargandoReservaActiva(false);
    }
  };

  const ejecutarCancelacionId = async (resId) => {
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const rutTarget = isEstudiante ? user?.rut : formData.rut;
      const sessionId = obtenerSessionId(rutTarget);
      const url = `http://localhost:8000/api/reservas/${resId}${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        setToastNotificacion({ tipo: "exito", texto: "Reserva cancelada exitosamente." });
        const rutTarget = isEstudiante ? user.rut : formData.rut;
        if (rutTarget) consultarReservaActiva(rutTarget.trim());
        if (formData.campus_id && formData.fecha) {
          fetch(`http://localhost:8000/api/disponibilidad?campus_id=${formData.campus_id}&fecha=${formData.fecha}`)
            .then((res) => res.json())
            .then((data) => setBloquesHorarios(data.bloques || []));
        }
      } else {
        const data = await res.json();
        setToastNotificacion({ tipo: "error", texto: "Error al cancelar reserva: " + (data.detail || "") });
      }
    } catch (e) {
      setToastNotificacion({ tipo: "error", texto: "Error al conectar con el servidor." });
    }
  };

  const handleCancelarReservaId = (resId) => {
    setConfirmModal({
      open: true,
      titulo: "Cancelar Reserva",
      mensaje: `¿Estás seguro de que deseas cancelar la reserva ID ${resId}?`,
      onConfirm: () => ejecutarCancelacionId(resId)
    });
  };

  const handleCancelarReservaActiva = async () => {
    if (!reservaActivaUser) return;
    handleCancelarReservaId(reservaActivaUser.id);
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

  useEffect(() => {
    if (modalEdicionOpen && editFormData.campus_id && editFormData.fecha) {
      setCargandoEditBloques(true);
      fetch(`http://localhost:8000/api/disponibilidad?campus_id=${editFormData.campus_id}&fecha=${editFormData.fecha}`)
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
    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const rutTarget = isEstudiante ? user?.rut : formData.rut;
      const res = await fetch(`http://localhost:8000/api/reservas/${editFormData.id}`, {
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
          sessionId: obtenerSessionId(rutTarget)
        })
      });

      if (res.ok) {
        setToastNotificacion({ tipo: "exito", texto: "¡Reserva modificada exitosamente!" });
        setModalEdicionOpen(false);
        const rutTarget = isEstudiante ? user.rut : formData.rut;
        if (rutTarget) consultarReservaActiva(rutTarget.trim());
      } else {
        const errorData = await res.json();
        setToastNotificacion({ tipo: "error", texto: errorData.detail || "Error al modificar la reserva" });
      }
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "No se pudo conectar con el servidor." });
    }
  };

  // Autocompletar datos del estudiante autenticado automáticamente
  useEffect(() => {
    if (user && isEstudiante) {
      setFormData((prev) => ({
        ...prev,
        nombre: user.nombre || "",
        rut: user.rut || "",
      }));
    }
  }, [user, isEstudiante]);

  useEffect(() => {
    if (formData.rut && formData.rut.trim().length >= 7) {
      consultarReservaActiva(formData.rut.trim());
    } else {
      setReservaActivaUser(null);
    }
  }, [formData.rut]);

  // 1. Cargar campus desde el backend
  useEffect(() => {
    fetch("http://localhost:8000/api/campus")
      .then((res) => {
        if (!res.ok) throw new Error("Error al obtener la lista de campus");
        return res.json();
      })
      .then((data) => setCampusList(data))
      .catch((err) => console.error(err));
  }, []);

  // 2. Cargar feriados dinámicos de la API de Chile
  useEffect(() => {
    const yearActual = new Date().getFullYear();

    fetch(`https://api.feriadosdev.com/api/v1/feriados/${yearActual}`)
      .then((res) => res.json())
      .then((resData) => {
        const lista = resData?.data?.feriados || resData?.feriados || resData;
        if (Array.isArray(lista) && lista.length > 0) {
          const fechasApi = lista.map((f) => f.fecha);
          setFeriados(fechasApi);
        }
      })
      .catch((err) => {
        console.warn("Usando feriados estáticos de respaldo debido a:", err);
      });

    fetch("http://localhost:8000/api/calendario/bloqueos")
      .then((res) => res.json())
      .then((data) => setDiasBloqueados(Array.isArray(data) ? data : []))
      .catch(() => setDiasBloqueados([]));
  }, []);

  // 3. Consultar disponibilidad al cambiar Campus o Fecha
  useEffect(() => {
    if (formData.campus_id && formData.fecha) {
      setCargandoHorarios(true);
      fetch(`http://localhost:8000/api/disponibilidad?campus_id=${formData.campus_id}&fecha=${formData.fecha}`)
        .then((res) => {
          if (!res.ok) throw new Error("Error al obtener disponibilidad");
          return res.json();
        })
        .then((data) => {
          setBloquesHorarios(data.bloques || []);
          setCargandoHorarios(false);
        })
        .catch((err) => {
          console.error("Error al cargar disponibilidad:", err);
          setCargandoHorarios(false);
        });
    } else {
      setBloquesHorarios([]);
    }
  }, [formData.campus_id, formData.fecha]);

  // Escuchar eventos globales de sincronización en tiempo real (Chatbot / Formulario)
  useEffect(() => {
    const handleActualizar = () => {
      const rutGuardado = isEstudiante ? user?.rut : formData.rut;
      if (rutGuardado) {
        consultarReservaActiva(rutGuardado);
      }
      if (formData.campus_id && formData.fecha) {
        fetch(`http://localhost:8000/api/disponibilidad?campus_id=${formData.campus_id}&fecha=${formData.fecha}`)
          .then((res) => res.json())
          .then((data) => setBloquesHorarios(data.bloques || []));
      }
      fetch("http://localhost:8000/api/calendario/bloqueos")
        .then((res) => res.json())
        .then((data) => setDiasBloqueados(Array.isArray(data) ? data : []))
        .catch(() => { });
    };

    window.addEventListener("reservaActualizada", handleActualizar);
    window.addEventListener("focus", handleActualizar);
    return () => {
      window.removeEventListener("reservaActualizada", handleActualizar);
      window.removeEventListener("focus", handleActualizar);
    };
  }, [user?.rut, formData.rut, formData.campus_id, formData.fecha]);

  const esDiaLaboral = (date) => {
    const day = date.getDay();
    const esFinDeSemana = day === 0 || day === 6;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");
    const fechaString = `${year}-${month}-${dayOfMonth}`;

    const esFeriado = feriados.includes(fechaString);
    const esBloqueado = diasBloqueados.some((b) => {
      if (b.fecha !== fechaString) return false;
      if (!b.campus_id) return true;
      if (!formData.campus_id) return true;
      return parseInt(formData.campus_id, 10) === parseInt(b.campus_id, 10);
    });

    return !esFinDeSemana && !esFeriado && !esBloqueado;
  };

  const esDiaLaboralEdicion = (date) => {
    const day = date.getDay();
    const esFinDeSemana = day === 0 || day === 6;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");
    const fechaString = `${year}-${month}-${dayOfMonth}`;

    const esFeriado = feriados.includes(fechaString);
    const esBloqueado = diasBloqueados.some((b) => {
      if (b.fecha !== fechaString) return false;
      if (!b.campus_id) return true;
      if (!editFormData.campus_id) return true;
      return parseInt(editFormData.campus_id, 10) === parseInt(b.campus_id, 10);
    });

    return !esFinDeSemana && !esFeriado && !esBloqueado;
  };

  const handleChange = (e) => {
    if (isAdmin) return;
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "campus_id" ? { hora: "" } : {})
    }));
  };

  const handleFechaChange = (date) => {
    if (isAdmin) return;
    setFechaSeleccionada(date);
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      setFormData((prev) => ({
        ...prev,
        fecha: `${year}-${month}-${day}`,
        hora: ""
      }));
    } else {
      setFormData((prev) => ({ ...prev, fecha: "", hora: "" }));
    }
  };

  // --- Funciones para Acompañantes ---
  const handleToggleAcompanantes = (e) => {
    if (isAdmin) return;
    const quiereAcompanantes = e.target.value === "si";
    setTieneAcompanantes(quiereAcompanantes);
    if (quiereAcompanantes && listAcompanantes.length === 0) {
      setListAcompanantes([{ nombre: "", rut: "" }]);
    } else if (!quiereAcompanantes) {
      setListAcompanantes([]);
    }
  };

  const handleAgregarAcompanante = () => {
    if (isAdmin) return;
    setListAcompanantes((prev) => [...prev, { nombre: "", rut: "" }]);
  };

  const handleRemoverAcompanante = (index) => {
    if (isAdmin) return;
    setListAcompanantes((prev) => prev.filter((_, i) => i !== index));
    if (listAcompanantes.length === 1) {
      setTieneAcompanantes(false);
    }
  };

  const handleAcompananteChange = (index, field, value) => {
    if (isAdmin) return;
    setListAcompanantes((prev) => {
      const nuevaLista = [...prev];
      nuevaLista[index][field] = value;
      return nuevaLista;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isAdmin) {
      setToastNotificacion({ tipo: "error", texto: "Los administradores no pueden realizar reservas." });
      return;
    }

    if (sancionUsuario?.suspendido) {
      setToastNotificacion({
        tipo: "error",
        texto: `Tu cuenta se encuentra suspendida por inasistencias (${sancionUsuario.inasistencias_periodo || 2}/2). No puedes reservar hasta: ${sancionUsuario.fecha_desbloqueo || "3 días"}.`
      });
      return;
    }

    if (!formData.campus_id) {
      setToastNotificacion({ tipo: "error", texto: "Por favor selecciona una sede universitaria." });
      return;
    }

    if (!formData.fecha) {
      setToastNotificacion({ tipo: "error", texto: "Por favor selecciona una fecha válida." });
      return;
    }

    if (!formData.hora) {
      setToastNotificacion({ tipo: "error", texto: "Por favor selecciona un bloque de horario disponible." });
      return;
    }

    const acompanantesPayload = tieneAcompanantes
      ? listAcompanantes.filter((ac) => ac.nombre.trim() !== "")
      : [];

    try {
      const response = await fetch("http://localhost:8000/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          campus_id: parseInt(formData.campus_id, 10),
          sessionId: obtenerSessionId(),
          acompanantes: acompanantesPayload,
        }),
      });

      if (response.ok) {
        setToastNotificacion({ tipo: "exito", texto: `¡Reserva creada con éxito para ${formData.nombre}!` });
        setFechaSeleccionada(null);
        setBloquesHorarios([]);
        setTieneAcompanantes(false);
        setListAcompanantes([]);
        const rutGuardado = isEstudiante ? user.rut : formData.rut;
        setFormData({
          nombre: isEstudiante ? user.nombre : "",
          rut: isEstudiante ? user.rut : "",
          fecha: "",
          hora: "",
          campus_id: "",
        });
        if (rutGuardado) {
          consultarReservaActiva(rutGuardado);
        }
        window.dispatchEvent(new CustomEvent("reservaActualizada"));
      } else {
        const errorData = await response.json();
        setToastNotificacion({ tipo: "error", texto: errorData.detail || "Error al crear la reserva" });
      }
    } catch (error) {
      console.error(error);
      setToastNotificacion({ tipo: "error", texto: "No se pudo conectar con el servidor" });
    }
  };

  /* Valores derivados solo para presentación */
  const campusSeleccionado = campusList.find((c) => String(c.id) === String(formData.campus_id));
  const listo = formData.campus_id && formData.fecha && formData.hora;

  return (
    <div className="min-h-screen bg-slate-100/70 pt-24 pb-20 font-sans text-slate-800">

      {/* ENCABEZADO INSTITUCIONAL */}
      <header className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 text-slate-500">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-amber-400">
                  <IconBook className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium tracking-wide text-slate-600">
                  Biblioteca Central Universitaria
                </span>
              </div>

              <h1 className="mt-5 font-serif text-3xl sm:text-[2.6rem] leading-[1.1] tracking-tight text-slate-900">
                Reserva de cubículos de estudio
              </h1>

              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                {isEstudiante
                  ? `Hola, ${user.nombre}. Tus datos ya están cargados; elige sede, día y bloque horario para confirmar.`
                  : "Elige sede, día y bloque horario. La disponibilidad se actualiza con cada reserva registrada."}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              Disponibilidad en tiempo real
            </div>
          </div>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-[#FFC20E] via-[#FFA000] to-sky-700" />
      </header>

      <main className="mx-auto max-w-6xl px-5 mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] items-start">

        {/* ── COLUMNA PRINCIPAL: FORMULARIO ───────────────────────── */}
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-200">

          {/* Paso 1 */}
          <section className="p-6 sm:p-8">
            <div className="flex items-baseline gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-400 text-[12px] font-semibold text-amber-700">1</span>
              <div>
                <h2 className="font-serif text-xl text-slate-900">Sede y titular</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">La reserva queda a nombre de quien figura aquí.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {campusList.map((c) => {
                const isSelected = String(formData.campus_id) === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isAdmin}
                    onClick={() => setFormData((prev) => ({ ...prev, campus_id: String(c.id) }))}
                    className={`group relative rounded-md border p-4 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${isSelected
                        ? "border-sky-700 bg-sky-50/60"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      } ${isAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r ${isSelected ? "bg-sky-700" : "bg-transparent"}`} />
                    <div className="flex items-start justify-between gap-2">
                      <IconPin className={`w-4 h-4 mt-0.5 ${isSelected ? "text-sky-700" : "text-slate-400"}`} />
                      {c.cubiculas_fisicos ? (
                        <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {c.cubiculas_fisicos} cubículos
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-[15px] font-semibold leading-snug text-slate-900">
                      {c.nombre}
                    </h3>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[12px]">
                      <span className="text-slate-400">Sede {c.id}</span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 font-medium text-sky-700">
                          <IconCheck className="w-3.5 h-3.5" /> Seleccionada
                        </span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-slate-600">Elegir</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="flex items-center justify-between text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Nombre del titular</span>
                  {isEstudiante && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-normal text-emerald-700">
                      <IconCheck className="w-3.5 h-3.5" /> Verificado
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  disabled={isAdmin || isEstudiante}
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>RUT del titular</span>
                  {isEstudiante && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-normal text-emerald-700">
                      <IconCheck className="w-3.5 h-3.5" /> Verificado
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="rut"
                  required
                  disabled={isAdmin || isEstudiante}
                  value={formData.rut}
                  onChange={handleChange}
                  placeholder="12.345.678-9"
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] tabular-nums text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>
            </div>
          </section>

          {/* Paso 2 */}
          <section className="p-6 sm:p-8">
            <div className="flex items-baseline gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-400 text-[12px] font-semibold text-amber-700">2</span>
              <div>
                <h2 className="font-serif text-xl text-slate-900">Modalidad de uso</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">Si estudias en grupo, registra a quienes te acompañan.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isAdmin}
                onClick={() => {
                  if (tieneAcompanantes) {
                    setTieneAcompanantes(false);
                    setListAcompanantes([]);
                    setFormData((prev) => ({ ...prev, acompanantes: [] }));
                  }
                }}
                className={`flex items-center gap-3 rounded-md border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${!tieneAcompanantes
                    ? "border-sky-700 bg-sky-50/60"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  } ${isAdmin ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${!tieneAcompanantes ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                  <IconUser />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-slate-900">Individual</span>
                  <span className="block text-[13px] text-slate-500">Solo tú usarás el cubículo</span>
                </span>
              </button>

              <button
                type="button"
                disabled={isAdmin}
                onClick={() => {
                  if (!tieneAcompanantes) {
                    setTieneAcompanantes(true);
                    setListAcompanantes([{ nombre: "", rut: "" }]);
                  }
                }}
                className={`flex items-center gap-3 rounded-md border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${tieneAcompanantes
                    ? "border-sky-700 bg-sky-50/60"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  } ${isAdmin ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tieneAcompanantes ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                  <IconUsers />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-slate-900">En grupo</span>
                  <span className="block text-[13px] text-slate-500">Con uno o más acompañantes</span>
                </span>
              </button>
            </div>

            {tieneAcompanantes && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[13px] text-slate-600">
                  El registro de acompañantes permite controlar el aforo del cubículo.
                </p>

                <div className="mt-3 space-y-2">
                  {listAcompanantes.map((ac, index) => (
                    <div key={index} className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-2.5 sm:flex-row sm:items-center">
                      <span className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-500">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        required
                        disabled={isAdmin}
                        placeholder={`Nombre acompañante ${index + 1}`}
                        value={ac.nombre}
                        onChange={(e) => handleAcompananteChange(index, "nombre", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-[14px] focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700 disabled:cursor-not-allowed disabled:bg-slate-50 sm:flex-1"
                      />
                      <input
                        type="text"
                        disabled={isAdmin}
                        placeholder="RUT (opcional)"
                        value={ac.rut}
                        onChange={(e) => handleAcompananteChange(index, "rut", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-[14px] tabular-nums focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-40"
                      />
                      <button
                        type="button"
                        disabled={isAdmin}
                        onClick={() => handleRemoverAcompanante(index)}
                        title="Quitar acompañante"
                        className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-[13px] text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <IconClose className="w-4 h-4" />
                        <span className="sm:hidden">Quitar</span>
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={isAdmin}
                  onClick={handleAgregarAcompanante}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-sky-700 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconPlus className="w-4 h-4" /> Agregar acompañante
                </button>
              </div>
            )}
          </section>

          {/* Paso 3 */}
          <section className="p-6 sm:p-8">
            <div className="flex items-baseline gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-400 text-[12px] font-semibold text-amber-700">3</span>
              <div>
                <h2 className="font-serif text-xl text-slate-900">Día y bloque horario</h2>
                <p className="text-[13px] text-slate-500 mt-0.5">Atención de lunes a viernes, sin feriados.</p>
              </div>
            </div>

            <div className="mt-6 sm:max-w-xs">
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Día de la reserva
              </label>
              <DatePicker
                selected={fechaSeleccionada}
                onChange={handleFechaChange}
                disabled={isAdmin}
                filterDate={esDiaLaboral}
                minDate={new Date()}
                locale="es"
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecciona una fecha"
                required
                className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 transition-colors focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between mb-2">
                <label className="text-[13px] font-medium text-slate-700">
                  Bloque horario
                </label>
                {formData.campus_id && formData.fecha && !cargandoHorarios && bloquesHorarios.length > 0 && (
                  <span className="text-[12px] text-slate-500">
                    {bloquesHorarios.filter((b) => !b.agotado).length} de {bloquesHorarios.length} bloques con cupo
                  </span>
                )}
              </div>

              {!formData.campus_id || !formData.fecha ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center">
                  <IconCalendar className="w-5 h-5 mx-auto text-slate-400" />
                  <p className="mt-2 text-[14px] font-medium text-slate-700">Elige una sede y un día</p>
                  <p className="mt-0.5 text-[13px] text-slate-500">Con esos datos calculamos los cupos reales de cada bloque.</p>
                </div>
              ) : cargandoHorarios ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="relative h-[68px] overflow-hidden rounded-md border border-slate-200 bg-white p-3"
                    >
                      <div className="h-3.5 w-20 rounded bg-slate-200/80" />
                      <div className="mt-3 h-2.5 w-16 rounded bg-slate-200/60" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 to-transparent animate-shimmer" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {bloquesHorarios.map((b) => {
                    const esSeleccionado = formData.hora === b.hora;
                    return (
                      <button
                        key={b.hora}
                        type="button"
                        disabled={b.agotado || isAdmin}
                        onClick={() => setFormData((prev) => ({ ...prev, hora: b.hora }))}
                        className={`
                          flex flex-col justify-between rounded-md border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
                          ${b.agotado || isAdmin
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                            : esSeleccionado
                              ? "cursor-pointer border-sky-700 bg-sky-700 text-white"
                              : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-sky-700 hover:bg-sky-50/50"
                          }
                        `}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-[14px] font-semibold tabular-nums tracking-tight">{b.rango}</span>
                          {esSeleccionado ? (
                            <IconCheck className="w-4 h-4 text-white" />
                          ) : (
                            <span className={`h-1.5 w-1.5 rounded-full ${b.agotado ? "bg-rose-400" : "bg-emerald-600"}`} />
                          )}
                        </span>
                        <span className={`mt-2 text-[12px] ${b.agotado ? "text-rose-500" : esSeleccionado ? "text-sky-100" : "text-slate-500"
                          }`}>
                          {b.agotado ? "Sin cupos" : `${b.disponibles} disponibles`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Confirmación */}
          <section className="bg-slate-50/80 p-6 sm:px-8">
            {listo && (
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-200 bg-white px-4 py-3 text-[13px]">
                <IconCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-900">{campusSeleccionado?.nombre || "Sede"}</span>
                <span className="text-slate-300">|</span>
                <span className="tabular-nums text-slate-700">{formData.fecha}</span>
                <span className="text-slate-300">|</span>
                <span className="tabular-nums font-medium text-sky-800">{formData.hora}:00 hrs</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAdmin || sancionUsuario?.suspendido}
              className={`flex w-full items-center justify-center gap-2 rounded-md py-3.5 text-[15px] font-semibold transition-colors ${isAdmin || sancionUsuario?.suspendido
                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                  : "cursor-pointer bg-sky-800 text-white hover:bg-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                }`}
            >
              {isAdmin ? (
                <><IconLock className="w-4 h-4" /> Formulario bloqueado para administradores</>
              ) : sancionUsuario?.suspendido ? (
                <><IconLock className="w-4 h-4" /> Cuenta suspendida por inasistencias</>
              ) : (
                "Confirmar reserva"
              )}
            </button>

            <p className="mt-3 text-center text-[12px] text-slate-500">
              Se permite una reserva activa por estudiante.
            </p>
          </section>
        </form>

        {/* ── COLUMNA LATERAL: ESTADO DE LA CUENTA ────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-28">

          {sancionUsuario?.suspendido && (
            <div className="rounded-lg border-l-[3px] border-l-rose-600 border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-rose-700">
                <IconAlert className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold">Cuenta suspendida</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                Registras {sancionUsuario.inasistencias_periodo || 2} de 2 inasistencias. Por reglamento, no puedes reservar durante 3 días.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-[12px] font-medium text-rose-800">
                <IconClock className="w-3.5 h-3.5" />
                Desbloqueo: {sancionUsuario.fecha_desbloqueo || `${sancionUsuario.dias_restantes || 3} días restantes`}
              </p>
            </div>
          )}

          {sancionUsuario && !sancionUsuario.suspendido && sancionUsuario.inasistencias_periodo === 1 && (
            <div className="rounded-lg border-l-[3px] border-l-amber-500 border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-700">
                <IconAlert className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold">Tienes 1 inasistencia</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                Con 2 inasistencias tu cuenta se suspende automáticamente por 3 días.
              </p>
            </div>
          )}

          {reservaActivaUser && (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <h3 className="text-[13px] font-semibold text-slate-800">Tu reserva activa</h3>
              </div>
              <dl className="divide-y divide-slate-100 px-4 text-[13px]">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Sede</dt>
                  <dd className="font-medium text-slate-900">{reservaActivaUser.campus}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Cubículo</dt>
                  <dd className="font-medium tabular-nums text-slate-900">{reservaActivaUser.cubiculo_codigo}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Fecha</dt>
                  <dd className="font-medium tabular-nums text-slate-900">{reservaActivaUser.fecha}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500">Hora</dt>
                  <dd className="font-medium tabular-nums text-slate-900">{reservaActivaUser.hora} hrs</dd>
                </div>
              </dl>
              <div className="flex gap-2 border-t border-slate-100 p-3">
                <Link
                  to="/mis-reservas"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  <IconList className="w-3.5 h-3.5" /> Mis reservas
                </Link>
                <button
                  type="button"
                  onClick={() => abrirModalEdicion(reservaActivaUser)}
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-sky-800 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-sky-900"
                >
                  <IconEdit className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
              <p className="border-t border-slate-100 px-4 py-2.5 text-[12px] leading-relaxed text-slate-500">
                Para agendar otro bloque, primero cancela o edita esta reserva.
              </p>
            </div>
          )}

          {/* Resumen en construcción */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h3 className="text-[13px] font-semibold text-slate-800">Resumen de la solicitud</h3>
            </div>
            <dl className="divide-y divide-slate-100 px-4 text-[13px]">
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-slate-500"><IconPin className="w-3.5 h-3.5" /> Sede</dt>
                <dd className={`text-right ${campusSeleccionado ? "font-medium text-slate-900" : "text-slate-400"}`}>
                  {campusSeleccionado ? campusSeleccionado.nombre : "Por elegir"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-slate-500"><IconCalendar className="w-3.5 h-3.5" /> Fecha</dt>
                <dd className={`text-right tabular-nums ${formData.fecha ? "font-medium text-slate-900" : "text-slate-400"}`}>
                  {formData.fecha || "Por elegir"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-slate-500"><IconClock className="w-3.5 h-3.5" /> Bloque</dt>
                <dd className={`text-right tabular-nums ${formData.hora ? "font-medium text-slate-900" : "text-slate-400"}`}>
                  {formData.hora ? `${formData.hora}:00 hrs` : "Por elegir"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-slate-500">
                  {tieneAcompanantes ? <IconUsers className="w-3.5 h-3.5" /> : <IconUser className="w-3.5 h-3.5" />} Modalidad
                </dt>
                <dd className="text-right font-medium text-slate-900">
                  {tieneAcompanantes ? `Grupo (${listAcompanantes.length + 1})` : "Individual"}
                </dd>
              </div>
            </dl>
          </div>

          {isEstudiante && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700">
                <IconCheck className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold">Sesión verificada</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                {user.nombre} · RUT {user.rut}. Tus datos de titular se completaron automáticamente.
              </p>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-lg border-l-[3px] border-l-amber-500 border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-700">
                <IconLock className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold">Vista de administrador</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                El formulario está en solo lectura: las reservas las realizan los estudiantes.
              </p>
            </div>
          )}

          {!user && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-[14px] font-semibold text-slate-900">¿Eres estudiante?</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                Inicia sesión y completaremos tu nombre y RUT automáticamente.
              </p>
              <Link
                to="/login"
                className="mt-3 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-sky-800 transition-colors hover:border-sky-700 hover:bg-sky-50"
              >
                Iniciar sesión
              </Link>
            </div>
          )}
        </aside>
      </main>

      {/* MODAL DE EDICIÓN DE RESERVA */}
      {modalEdicionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px]">
          <div className="my-8 w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-serif text-xl text-slate-900">Editar reserva</h3>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Cambia la sede, el día o el bloque horario.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicionOpen(false)}
                className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Cerrar"
              >
                <IconClose />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-5 px-6 py-5">
              {/* Datos del Titular (Inmutables) */}
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><IconLock className="w-3.5 h-3.5" /> Titular</span>
                  <strong className="font-medium text-slate-900">{isEstudiante ? user.nombre : formData.nombre || "Estudiante"}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><IconLock className="w-3.5 h-3.5" /> RUT</span>
                  <strong className="font-medium tabular-nums text-slate-900">{isEstudiante ? user.rut : formData.rut || "N/A"}</strong>
                </div>
                <p className="mt-2 border-t border-slate-200 pt-2 text-[12px] text-slate-500">
                  Los datos del titular no se pueden modificar.
                </p>
              </div>

              {/* Sede / Campus */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Sede
                </label>
                <select
                  required
                  value={editFormData.campus_id}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, campus_id: e.target.value, hora: "" }))}
                  className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[14px] text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700"
                >
                  <option value="">Selecciona una sede</option>
                  {campusList.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
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
                  filterDate={esDiaLaboralEdicion}
                  minDate={new Date()}
                  dateFormat="yyyy-MM-dd"
                  locale="es"
                  className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[14px] tabular-nums text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700"
                />
              </div>

              {/* Bloque Horario */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Nuevo bloque horario
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
                    Elige sede y fecha para ver los bloques disponibles.
                  </p>
                ) : (
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {editBloques.map((b) => {
                      const esSeleccionado = editFormData.hora === b.hora;
                      return (
                        <button
                          key={b.hora}
                          type="button"
                          disabled={b.disponibles === 0 && !esSeleccionado}
                          onClick={() => setEditFormData((prev) => ({ ...prev, hora: b.hora }))}
                          className={`flex flex-col justify-between rounded-md border p-2.5 text-left text-[13px] transition-colors ${b.disponibles === 0 && !esSeleccionado
                              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                              : esSeleccionado
                                ? "cursor-pointer border-sky-700 bg-sky-700 text-white"
                                : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-sky-700 hover:bg-sky-50/50"
                            }`}
                        >
                          <span className="font-medium tabular-nums">{b.rango}</span>
                          <span className={`mt-1 text-[12px] ${esSeleccionado ? "text-sky-100" : "text-slate-500"}`}>
                            {b.disponibles} libres
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botones Modal */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalEdicionOpen(false)}
                  className="cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-md bg-sky-800 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-sky-900"
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
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <IconAlert />
              </span>
              <div>
                <h3 className="font-serif text-lg text-slate-900">{confirmModal.titulo || "Confirmación"}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{confirmModal.mensaje}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null })}
                className="cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null });
                }}
                className="cursor-pointer rounded-md bg-rose-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-rose-800"
              >
                Cancelar reserva
              </button>
            </div>
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
          <p className="flex-1 leading-relaxed text-slate-700">{toastNotificacion.texto}</p>
          <button
            onClick={() => setToastNotificacion({ tipo: "", texto: "" })}
            className="cursor-pointer text-slate-400 transition-colors hover:text-slate-700"
            title="Cerrar"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}