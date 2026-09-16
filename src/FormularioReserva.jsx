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
        .catch(() => {});
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-amber-50 pt-28 pb-16 px-4">
      <div className="absolute top-20 left-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
            📅 Reserva Inteligente
          </span>

          <h1 className="mt-4 text-4xl md:text-5xl font-black text-slate-900">
            Agenda tu cubículo en segundos
          </h1>

          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            {isEstudiante
              ? `Hola, ${user.nombre}. Tus datos han sido autocompletados. Selecciona sede, fecha y hora.`
              : "Completa el formulario para registrar tu reserva en el sistema de la biblioteca."}
          </p>
        </div>

        {/* Card Formulario */}
        <div className="mx-auto max-w-2xl rounded-3xl border border-sky-100 bg-white p-8 md:p-10 shadow-[0_20px_60px_rgba(14,165,233,0.15)]">

          {sancionUsuario?.suspendido && (
            <div className="rounded-2xl border border-rose-300 bg-gradient-to-r from-rose-50 to-red-50 p-4 text-slate-800 text-sm shadow-sm mb-6 flex items-start gap-3">
              <span className="text-2xl shrink-0">🚫</span>
              <div className="space-y-1">
                <strong className="block font-bold text-rose-900">
                  Cuenta suspendida temporalmente ({sancionUsuario.inasistencias_periodo || 2}/2 inasistencias)
                </strong>
                <p className="text-xs text-slate-700">
                  Has acumulado el límite de 2 inasistencias a cubículos reservados. Por reglamento universitario, tu cuenta está inhabilitada para reservar por 3 días.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold mt-1">
                  <span>⏳</span> Desbloqueo: {sancionUsuario.fecha_desbloqueo || `${sancionUsuario.dias_restantes || 3} días restantes`}
                </div>
              </div>
            </div>
          )}

          {sancionUsuario && !sancionUsuario.suspendido && sancionUsuario.inasistencias_periodo === 1 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-slate-800 text-xs shadow-sm mb-6 flex items-start gap-2.5">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <strong className="font-bold text-amber-900">Aviso de asistencia: Tienes 1 inasistencia registrada</strong>
                <p className="mt-0.5 text-slate-700">
                  Recuerda que al sumar 2 inasistencias tu cuenta será suspendida automáticamente por 3 días.
                </p>
              </div>
            </div>
          )}

          {/* Banner de Reserva Activa Existente */}
          {reservaActivaUser && (
            <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-slate-800 text-sm shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">⚠️</span>
                <div>
                  <strong className="block font-bold text-amber-900">Tienes 1 reserva activa registrada</strong>
                  <p className="mt-0.5 text-slate-700">
                    Sede: <strong>{reservaActivaUser.campus}</strong> • Cubículo: <strong>{reservaActivaUser.cubiculo_codigo}</strong><br />
                    Fecha: <strong>{reservaActivaUser.fecha}</strong> a las <strong>{reservaActivaUser.hora} hrs</strong>.
                  </p>
                  <span className="inline-block mt-1 text-xs text-amber-800 font-medium">
                    (Solo se permite 1 reserva activa por usuario. Para agendar otro bloque, primero debes cancelar la reserva actual).
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Link
                  to="/mis-reservas"
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  📋 Mis Reservas
                </Link>
                <button
                  type="button"
                  onClick={() => abrirModalEdicion(reservaActivaUser)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          )}

          {/* Banner para Estudiante Autenticado */}
          {isEstudiante && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-slate-800 text-sm flex items-start gap-3 shadow-sm mb-6">
              <span className="text-xl flex-shrink-0">🎓</span>
              <div>
                <strong className="block font-bold text-emerald-900">Sesión Estudiantil Activa</strong>
                <span>Estás autenticado como <strong>{user.nombre}</strong> (RUT: {user.rut}). Tus datos principales se completaron automáticamente para agilizar la reserva.</span>
              </div>
            </div>
          )}

          {/* Banner para Administrador */}
          {isAdmin && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-slate-800 text-sm flex items-start gap-3 shadow-sm mb-6">
              <span className="text-xl flex-shrink-0">🔒</span>
              <div>
                <strong className="block font-bold text-amber-900">Modo Administrador (Vista Previa)</strong>
                <span>Has iniciado sesión como administrador. El formulario está bloqueado ya que las reservas corresponden a los estudiantes.</span>
              </div>
            </div>
          )}

          {/* Banner para Usuario Invitado no logueado */}
          {!user && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-slate-800 text-xs flex items-center justify-between gap-3 shadow-sm mb-6">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <span>¿Eres estudiante? <strong className="text-sky-800">Inicia sesión</strong> para autocompletar tus datos.</span>
              </div>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-xl bg-white border border-sky-300 text-sky-700 font-bold hover:bg-sky-100 transition-all text-xs shrink-0"
              >
                Iniciar sesión →
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Campus */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecciona el Campus
              </label>

              <select
                name="campus_id"
                required
                disabled={isAdmin}
                value={formData.campus_id}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <option value="">-- Selecciona un Campus --</option>
                {campusList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between items-center">
                <span>Nombre Completo (Titular)</span>
                {isEstudiante && <span className="text-[11px] text-emerald-600 font-bold">✓ Autocompletado</span>}
              </label>

              <input
                type="text"
                name="nombre"
                required
                disabled={isAdmin || isEstudiante}
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Juan Pérez"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-700 font-medium disabled:cursor-not-allowed"
              />
            </div>

            {/* RUT */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between items-center">
                <span>RUT (Titular)</span>
                {isEstudiante && <span className="text-[11px] text-emerald-600 font-bold">✓ Autocompletado</span>}
              </label>

              <input
                type="text"
                name="rut"
                required
                disabled={isAdmin || isEstudiante}
                value={formData.rut}
                onChange={handleChange}
                placeholder="12.345.678-9"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-700 font-medium disabled:cursor-not-allowed"
              />
            </div>

            {/* Pregunta Acompañantes */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-800 mb-3">
                ¿Asistirás con acompañantes?
              </label>
              <div className="flex items-center gap-6">
                <label className={`inline-flex items-center ${isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="tiene_acompanantes"
                    value="no"
                    disabled={isAdmin}
                    checked={!tieneAcompanantes}
                    onChange={handleToggleAcompanantes}
                    className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <span className="ml-2 text-sm text-slate-700 font-medium">No (Asistiré solo)</span>
                </label>
                <label className={`inline-flex items-center ${isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="tiene_acompanantes"
                    value="si"
                    disabled={isAdmin}
                    checked={tieneAcompanantes}
                    onChange={handleToggleAcompanantes}
                    className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <span className="ml-2 text-sm text-slate-700 font-medium">Sí</span>
                </label>
              </div>

              {/* Lista Dinámica de Acompañantes */}
              {tieneAcompanantes && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500 font-medium">
                    Registra los datos de cada acompañante para el aforo y trazabilidad:
                  </p>
                  {listAcompanantes.map((ac, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <input
                        type="text"
                        required
                        disabled={isAdmin}
                        placeholder={`Nombre acompañante ${index + 1}`}
                        value={ac.nombre}
                        onChange={(e) => handleAcompananteChange(index, "nombre", e.target.value)}
                        className="w-full sm:flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        disabled={isAdmin}
                        placeholder="RUT (Opcional)"
                        value={ac.rut}
                        onChange={(e) => handleAcompananteChange(index, "rut", e.target.value)}
                        className="w-full sm:w-36 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        disabled={isAdmin}
                        onClick={() => handleRemoverAcompanante(index)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✕ Quitar
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={isAdmin}
                    onClick={handleAgregarAcompanante}
                    className="mt-2 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-100/60 px-3 py-2 rounded-xl border border-sky-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Agregar otro acompañante
                  </button>
                </div>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Fecha de Reserva
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
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
              />
            </div>

            {/* Bloques de Horarios Dinámicos */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecciona el Horario (Bloques de 1 Hora)
              </label>

              {!formData.campus_id || !formData.fecha ? (
                <p className="text-sm text-slate-400 bg-slate-50 p-4 rounded-2xl text-center border border-dashed border-slate-200">
                  👈 Primero selecciona un campus y una fecha para ver los bloques disponibles.
                </p>
              ) : cargandoHorarios ? (
                <p className="text-sm text-sky-600 bg-sky-50 p-4 rounded-2xl text-center animate-pulse">
                  Cargando disponibilidad de cubículos...
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {bloquesHorarios.map((b) => {
                    const esSeleccionado = formData.hora === b.hora;
                    return (
                      <button
                        key={b.hora}
                        type="button"
                        disabled={b.agotado || isAdmin}
                        onClick={() => setFormData((prev) => ({ ...prev, hora: b.hora }))}
                        className={`
                          p-3 rounded-2xl text-left border transition-all flex flex-col justify-between cursor-pointer
                          ${b.agotado || isAdmin
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                            : esSeleccionado
                              ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-200 ring-2 ring-sky-300 ring-offset-1"
                              : "bg-white border-slate-200 text-slate-700 hover:border-sky-400 hover:bg-sky-50/50"
                          }
                        `}
                      >
                        <span className="font-bold text-sm">{b.rango}</span>
                        <span className={`text-[11px] mt-1 font-medium ${b.agotado
                          ? "text-rose-500"
                          : esSeleccionado
                            ? "text-sky-100"
                            : "text-emerald-600"
                          }`}>
                          {b.agotado ? "Agotado (0/10)" : `${b.disponibles} libres`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isAdmin || sancionUsuario?.suspendido}
              className={`w-full rounded-2xl py-4 font-semibold text-white transition-all ${
                isAdmin || sancionUsuario?.suspendido
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-sky-500 to-sky-600 shadow-lg hover:scale-[1.02] active:scale-95 cursor-pointer"
              }`}
            >
              {isAdmin
                ? "🔒 Formulario Bloqueado para Administradores"
                : sancionUsuario?.suspendido
                  ? "🚫 Suspendido por Inasistencias (3 días)"
                  : "Confirmar Reserva"}
            </button>
          </form>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE RESERVA */}
      {modalEdicionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-sky-100 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>✏️</span> Editar Reserva
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modifica la sede, fecha, hora o acompañantes de tu reserva.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicionOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-sm flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-5">
              {/* Datos del Titular (Inmutables) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>🔒 Titular:</span>
                  <strong className="text-slate-800">{isEstudiante ? user.nombre : formData.nombre || "Estudiante"}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>🔒 RUT:</span>
                  <strong className="text-slate-800">{isEstudiante ? user.rut : formData.rut || "N/A"}</strong>
                </div>
                <span className="block text-[10px] text-amber-700 font-medium italic pt-1">
                  * Los datos personales del titular no son modificables.
                </span>
              </div>

              {/* Sede / Campus */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selecciona Campus
                </label>
                <select
                  required
                  value={editFormData.campus_id}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, campus_id: e.target.value, hora: "" }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none bg-white"
                >
                  <option value="">-- Selecciona Campus --</option>
                  {campusList.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selecciona Nueva Fecha
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none bg-white cursor-pointer"
                />
              </div>

              {/* Bloque Horario */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selecciona Nuevo Horario
                </label>
                {cargandoEditBloques ? (
                  <p className="text-xs text-sky-600 animate-pulse font-medium">Cargando disponibilidad...</p>
                ) : editBloques.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Selecciona sede y fecha para ver bloques disponibles.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {editBloques.map((b) => {
                      const esSeleccionado = editFormData.hora === b.hora;
                      return (
                        <button
                          key={b.hora}
                          type="button"
                          disabled={b.disponibles === 0 && !esSeleccionado}
                          onClick={() => setEditFormData((prev) => ({ ...prev, hora: b.hora }))}
                          className={`p-2 rounded-xl text-left border text-xs transition-all flex flex-col justify-between cursor-pointer ${
                            b.disponibles === 0 && !esSeleccionado
                              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                              : esSeleccionado
                                ? "bg-sky-600 border-sky-600 text-white font-bold shadow-sm"
                                : "bg-white border-slate-200 text-slate-700 hover:border-sky-400"
                          }`}
                        >
                          <span>{b.rango}</span>
                          <span className={`text-[10px] ${esSeleccionado ? "text-sky-100" : "text-emerald-600"}`}>
                            {b.disponibles} libres
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botones Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEdicionOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 text-xl flex items-center justify-center mx-auto shadow-inner">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-slate-900">{confirmModal.titulo || "Confirmación"}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.mensaje}</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null })}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null });
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNotificacion.texto && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-800 animate-slideUp">
          <span>{toastNotificacion.tipo === "error" ? "❌" : "✅"}</span>
          <p>{toastNotificacion.texto}</p>
          <button
            onClick={() => setToastNotificacion({ tipo: "", texto: "" })}
            className="ml-2 text-slate-400 hover:text-white font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
