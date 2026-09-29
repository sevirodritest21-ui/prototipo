import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import { useAuth } from "./context/AuthContext";
import { API_URL } from "./services/api";
import { useCampusQuery, useDiasBloqueadosQuery, useFeriadosQuery, queryClient } from "./services/queries";

registerLocale("es", es);


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

export default function FormularioReserva() {
  const { user } = useAuth();
  const isAdmin = user?.rol === "admin";
  const isEstudiante = user?.rol === "estudiante";

  const { data: campusList = [] } = useCampusQuery();
  const { data: feriados = [] } = useFeriadosQuery();
  const { data: diasBloqueados = [] } = useDiasBloqueadosQuery();
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
  const [modalConfirmacionReservaOpen, setModalConfirmacionReservaOpen] = useState(false);
  const [cargandoEnvioReserva, setCargandoEnvioReserva] = useState(false);
  const [toastNotificacion, setToastNotificacion] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    if (toastNotificacion.texto) {
      const timer = setTimeout(() => {
        setToastNotificacion({ tipo: "", texto: "" });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [toastNotificacion.texto]);

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
      const res = await fetch(`${API_URL}/api/reservas/consultar`, {
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
      const url = `${API_URL}/api/reservas/${resId}${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setToastNotificacion({ tipo: "exito", texto: data.mensaje || "Operación realizada exitosamente." });
        const rutTarget = isEstudiante ? user.rut : formData.rut;
        if (rutTarget) consultarReservaActiva(rutTarget.trim());
        if (formData.campus_id && formData.fecha) {
          fetch(`${API_URL}/api/disponibilidad?campus_id=${formData.campus_id}&fecha=${formData.fecha}`)
            .then((res) => res.json())
            .then((data) => setBloquesHorarios(data.bloques || []));
        }
      } else {
        const data = await res.json();
        setToastNotificacion({ tipo: "error", texto: "Error al procesar reserva: " + (data.detail || "") });
      }
    } catch (e) {
      setToastNotificacion({ tipo: "error", texto: "Error al conectar con el servidor." });
    }
  };

  const handleCancelarReservaId = (resId) => {
    const esAcomp = reservaActivaUser && reservaActivaUser.es_titular === false;
    setConfirmModal({
      open: true,
      titulo: esAcomp ? "Desvincularme de la Reserva" : "Cancelar Reserva",
      mensaje: esAcomp
        ? `¿Deseas desvincularte de la reserva ID ${resId} del titular ${reservaActivaUser.titular_nombre || "otro estudiante"}? Quedarás habilitado para agendar tu propio cubículo.`
        : `¿Estás seguro de que deseas cancelar la reserva ID ${resId}?`,
      onConfirm: () => ejecutarCancelacionId(resId)
    });
  };

  const handleCancelarReservaActiva = async () => {
    if (!reservaActivaUser) return;
    handleCancelarReservaId(reservaActivaUser.id);
  };

  const abrirModalEdicion = (reserva) => {
    if (!reserva) return;
    const [yr, mo, dy] = (reserva.fecha || "").split("-").map(Number);
    setEditFormData({
      id: reserva.id,
      campus_id: String(reserva.campus_id || ""),
      fecha: reserva.fecha || "",
      hora: reserva.hora || "",
      fechaObj: yr && mo && dy ? new Date(yr, mo - 1, dy) : null,
      acompanantes: reserva.acompanantes ? JSON.parse(JSON.stringify(reserva.acompanantes)) : []
    });
    setModalEdicionOpen(true);
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
      setToastNotificacion({ tipo: "error", texto: "El bloque seleccionado ya ha transcurrido hoy. Elige un horario futuro." });
      return;
    }

    if (editFormData.acompanantes && editFormData.acompanantes.length > 0) {
      const rutTarget = isEstudiante ? user?.rut : formData.rut;
      const titRut = String(rutTarget || "").replace(/[.\-\s]/g, "").toUpperCase().trim();
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
      const rutTarget = isEstudiante ? user?.rut : formData.rut;
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



  useEffect(() => {
    if (formData.campus_id && formData.fecha) {
      setCargandoHorarios(true);
      fetch(`${API_URL}/api/disponibilidad?campus_id=${formData.campus_id}&fecha=${formData.fecha}`)
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

  useEffect(() => {
    const handleActualizar = () => {
      const rutGuardado = isEstudiante ? user?.rut : formData.rut;
      if (rutGuardado) {
        consultarReservaActiva(rutGuardado);
      }
      if (formData.campus_id && formData.fecha) {
        fetch(`${API_URL}/api/disponibilidad?campus_id=${formData.campus_id}&fecha=${formData.fecha}`)
          .then((res) => res.json())
          .then((data) => setBloquesHorarios(data.bloques || []));
      }
      queryClient.invalidateQueries({ queryKey: ["calendario", "bloqueos"] });
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

    if (reservaActivaUser) {
      setToastNotificacion({
        tipo: "error",
        texto: "Ya tienes una reserva activa registrada. Solo se permite 1 reserva simultánea por estudiante."
      });
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

    if (calcularEsBloquePasado(formData.fecha, formData.hora)) {
      setToastNotificacion({
        tipo: "error",
        texto: "El bloque seleccionado ya ha transcurrido. Por favor elige un horario futuro."
      });
      return;
    }

    if (tieneAcompanantes && listAcompanantes.length > 0) {
      const titRut = String(isEstudiante ? user?.rut : formData.rut).replace(/[.\-\s]/g, "").toUpperCase().trim();
      const rutsVistos = new Set();

      for (let i = 0; i < listAcompanantes.length; i++) {
        const ac = listAcompanantes[i];
        if (!ac.nombre.trim()) {
          setToastNotificacion({ tipo: "error", texto: `Por favor completa el nombre del acompañante ${i + 1}.` });
          return;
        }
        if (ac.rut && ac.rut.trim()) {
          const acRut = ac.rut.replace(/[.\-\s]/g, "").toUpperCase().trim();
          if (titRut && acRut === titRut) {
            setToastNotificacion({ tipo: "error", texto: "No puedes agregarte a ti mismo como acompañante." });
            return;
          }
          if (rutsVistos.has(acRut)) {
            setToastNotificacion({ tipo: "error", texto: `El RUT ${ac.rut} está repetido en la lista de acompañantes. Cada acompañante debe tener un RUT único.` });
            return;
          }
          rutsVistos.add(acRut);
        }
      }
    }

    setModalConfirmacionReservaOpen(true);
  };

  const handleConfirmarYCrearReserva = async () => {
    setCargandoEnvioReserva(true);
    const acompanantesPayload = tieneAcompanantes
      ? listAcompanantes.filter((ac) => ac.nombre.trim() !== "")
      : [];

    try {
      const response = await fetch(`${API_URL}/api/reservas`, {
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
        setModalConfirmacionReservaOpen(false);
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
    } finally {
      setCargandoEnvioReserva(false);
    }
  };

  /* Valores derivados solo para presentación */
  const campusSeleccionado = campusList.find((c) => String(c.id) === String(formData.campus_id));
  const listo = formData.campus_id && formData.fecha && formData.hora;
  const tieneReservaActiva = Boolean(reservaActivaUser);
  const formularioDeshabilitado = isAdmin || tieneReservaActiva || Boolean(sancionUsuario?.suspendido);

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0b1120] pt-16 pb-20 font-sans text-slate-800 dark:text-slate-100">

      <header className="bg-[#00629B] dark:bg-[#0d223a] text-white shadow-md">
        <div className="mx-auto max-w-6xl px-5 py-9 sm:py-11">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sky-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 border border-white/15 text-[#FFC20E]">
                  <IconBook className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                  Biblioteca Central Universitaria
                </span>
              </div>

              <h1 className="mt-4 font-serif text-3xl sm:text-[2.5rem] leading-tight tracking-tight text-white">
                Reserva de cubículos de estudio
              </h1>

              <p className="mt-2.5 text-[14px] leading-relaxed text-sky-100/90">
                {isEstudiante
                  ? `Hola, ${user.nombre}. Selecciona sede, fecha y bloque horario para confirmar tu espacio.`
                  : "Elige sede, día y bloque horario. La disponibilidad se actualiza con cada reserva registrada."}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-2 text-[13px] text-white shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="font-medium">Disponibilidad en tiempo real</span>
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B]" />
      </header>

      <main className="mx-auto max-w-6xl px-5 mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] items-start">

        <form
          onSubmit={handleSubmit}
          className={`relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] shadow-sm overflow-hidden transition-all duration-300 ${tieneReservaActiva ? "border-slate-300 dark:border-slate-700 ring-1 ring-slate-200/80 dark:ring-slate-700 bg-slate-50/90 dark:bg-[#1a2744]/90" : ""
            }`}
        >
          {tieneReservaActiva && (
            <div className="border-b border-amber-200 dark:border-amber-800/60 bg-amber-50/95 dark:bg-amber-950/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
                  <IconLock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {reservaActivaUser.es_titular === false
                      ? "Estás registrado como acompañante en una reserva activa"
                      : "Ya posees una reserva activa"}
                  </h3>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                    {reservaActivaUser.es_titular === false
                      ? `Figuras como acompañante en la reserva de ${reservaActivaUser.titular_nombre || "otro estudiante"} (${reservaActivaUser.fecha} a las ${reservaActivaUser.hora} hrs en ${reservaActivaUser.campus}). Solo se permite 1 reserva activa por estudiante. Para agendar por tu cuenta, primero debes desvincularte.`
                      : `Solo se permite 1 reserva simultánea por estudiante (${reservaActivaUser.fecha} a las ${reservaActivaUser.hora}:00 hrs en ${reservaActivaUser.campus}). Para reservar otro bloque, primero debes cancelar o editar tu reserva actual.`}
                  </p>
                </div>
              </div>
              <Link
                to="/mis-reservas"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 whitespace-nowrap self-stretch sm:self-auto"
              >
                <IconList className="w-3.5 h-3.5" />
                Ir a Mis Reservas
              </Link>
            </div>
          )}

          <fieldset
            disabled={formularioDeshabilitado}
            className={`divide-y divide-slate-100 dark:divide-slate-800 transition-all duration-300 ${tieneReservaActiva ? "opacity-50 grayscale pointer-events-none select-none bg-slate-100/50 dark:bg-slate-900/50" : ""
              }`}
          >
            <section className="p-6 sm:p-8">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#00629B] dark:bg-[#00A3E0] text-[13px] font-bold text-white dark:text-slate-950 shadow-sm">1</span>
                <div>
                  <h2 className="font-serif text-xl text-slate-900 dark:text-slate-100">Sede y titular</h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">La reserva queda a nombre de quien figura aquí.</p>
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
                      className={`group relative rounded-lg border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E] focus-visible:ring-offset-2 ${isSelected
                        ? "border-[#00629B] dark:border-[#00A3E0] bg-sky-50/70 dark:bg-sky-950/40 shadow-sm ring-1 ring-[#00629B] dark:ring-[#00A3E0]"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2744] hover:border-[#00629B]/40 dark:hover:border-sky-500/50 hover:bg-slate-50/80 dark:hover:bg-[#1e2f52]"
                        } ${isAdmin ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span className={`absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r ${isSelected ? "bg-[#FFC20E]" : "bg-transparent"}`} />
                      <div className="flex items-start justify-between gap-2">
                        <IconPin className={`w-4 h-4 mt-0.5 ${isSelected ? "text-[#00629B] dark:text-[#00A3E0]" : "text-slate-400 dark:text-slate-500"}`} />
                        {c.cubiculas_fisicos ? (
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${isSelected ? "bg-[#00629B]/10 dark:bg-sky-900/40 text-[#00629B] dark:text-sky-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                            {c.cubiculas_fisicos} cubículos
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
                        {c.nombre}
                      </h3>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[12px]">
                        <span className="text-slate-400 dark:text-slate-500">Sede {c.id}</span>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#00629B] dark:text-[#00A3E0]">
                            <IconCheck className="w-3.5 h-3.5" /> Seleccionada
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300">Elegir</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="flex items-center justify-between text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>Nombre del titular</span>
                    {isEstudiante && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
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
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] px-3.5 py-2.5 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:border-[#00629B] dark:focus:border-[#00A3E0] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20 disabled:cursor-not-allowed disabled:border-slate-200 dark:disabled:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-900/60 disabled:text-slate-600 dark:disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>RUT del titular</span>
                    {isEstudiante && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
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
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] px-3.5 py-2.5 text-[15px] tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:border-[#00629B] dark:focus:border-[#00A3E0] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20 disabled:cursor-not-allowed disabled:border-slate-200 dark:disabled:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-900/60 disabled:text-slate-600 dark:disabled:text-slate-400"
                  />
                </div>
              </div>
            </section>

            <section className="p-6 sm:p-8">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#00629B] dark:bg-[#00A3E0] text-[13px] font-bold text-white dark:text-slate-950 shadow-sm">2</span>
                <div>
                  <h2 className="font-serif text-xl text-slate-900 dark:text-slate-100">Modalidad de uso</h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Si estudias en grupo, registra a quienes te acompañan.</p>
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
                  className={`flex items-center gap-3.5 rounded-lg border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E] focus-visible:ring-offset-2 ${!tieneAcompanantes
                    ? "border-[#00629B] dark:border-[#00A3E0] bg-sky-50/70 dark:bg-sky-950/40 shadow-sm ring-1 ring-[#00629B] dark:ring-[#00A3E0]"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2744] hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-[#1e2f52]"
                    } ${isAdmin ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${!tieneAcompanantes ? "bg-[#00629B] dark:bg-[#00A3E0] text-white dark:text-slate-950 shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}>
                    <IconUser />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-slate-900 dark:text-slate-100">Individual</span>
                    <span className="block text-[13px] text-slate-500 dark:text-slate-400">Solo tú usarás el cubículo</span>
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
                  className={`flex items-center gap-3.5 rounded-lg border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E] focus-visible:ring-offset-2 ${tieneAcompanantes
                    ? "border-[#00629B] dark:border-[#00A3E0] bg-sky-50/70 dark:bg-sky-950/40 shadow-sm ring-1 ring-[#00629B] dark:ring-[#00A3E0]"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2744] hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-[#1e2f52]"
                    } ${isAdmin ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tieneAcompanantes ? "bg-[#00629B] dark:bg-[#00A3E0] text-white dark:text-slate-950 shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}>
                    <IconUsers />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-slate-900 dark:text-slate-100">En grupo</span>
                    <span className="block text-[13px] text-slate-500 dark:text-slate-400">Con uno o más acompañantes</span>
                  </span>
                </button>
              </div>

              {tieneAcompanantes && (
                <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#16223b]/60 p-4">
                  <p className="text-[13px] text-slate-600 dark:text-slate-300">
                    El registro de acompañantes permite controlar el aforo del cubículo.
                  </p>

                  <div className="mt-3 space-y-2">
                    {listAcompanantes.map((ac, index) => {
                      const acRutClean = ac.rut ? ac.rut.replace(/[.\-\s]/g, "").toUpperCase().trim() : "";
                      const titRutClean = String(isEstudiante ? user?.rut : formData.rut).replace(/[.\-\s]/g, "").toUpperCase().trim();
                      const esMismoTitular = Boolean(acRutClean && titRutClean && acRutClean === titRutClean);
                      const esDuplicado = Boolean(
                        acRutClean &&
                        listAcompanantes.some((otro, idx) => idx !== index && otro.rut && otro.rut.replace(/[.\-\s]/g, "").toUpperCase().trim() === acRutClean)
                      );

                      return (
                        <div key={index} className="flex flex-col gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131d33] p-2.5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <span className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              required
                              disabled={isAdmin}
                              placeholder={`Nombre acompañante ${index + 1}`}
                              value={ac.nombre}
                              onChange={(e) => handleAcompananteChange(index, "nombre", e.target.value)}
                              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] px-3 py-2 text-[14px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#00629B] dark:focus:border-[#00A3E0] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-850 sm:flex-1"
                            />
                            <input
                              type="text"
                              disabled={isAdmin}
                              placeholder="RUT (opcional)"
                              value={ac.rut}
                              onChange={(e) => handleAcompananteChange(index, "rut", e.target.value)}
                              className={`w-full rounded-md border px-3 py-2 text-[14px] tabular-nums focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-850 sm:w-40 ${
                                esMismoTitular || esDuplicado
                                  ? "border-rose-400 dark:border-rose-600 bg-rose-50/40 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-900"
                                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#00629B] dark:focus:border-[#00A3E0] focus:ring-[#00629B]/20"
                              }`}
                            />
                            <button
                              type="button"
                              disabled={isAdmin}
                              onClick={() => handleRemoverAcompanante(index)}
                              title="Quitar acompañante"
                              className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-[13px] text-slate-400 dark:text-slate-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <IconClose className="w-4 h-4" />
                              <span className="sm:hidden">Quitar</span>
                            </button>
                          </div>
                          {esMismoTitular && (
                            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 pl-0 sm:pl-9">
                              ⚠️ No puedes agregarte a ti mismo como acompañante.
                            </p>
                          )}
                          {esDuplicado && !esMismoTitular && (
                            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 pl-0 sm:pl-9">
                              ⚠️ Este RUT está repetido en la lista de acompañantes.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={isAdmin}
                    onClick={handleAgregarAcompanante}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2744] px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-200 transition-colors hover:border-[#00629B] dark:hover:border-[#00A3E0] hover:text-[#00629B] dark:hover:text-[#00A3E0] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconPlus className="w-4 h-4" /> Agregar acompañante
                  </button>
                </div>
              )}
            </section>

            <section className="p-6 sm:p-8">
              <div className="flex items-baseline gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#00629B] dark:bg-[#00A3E0] text-[13px] font-bold text-white dark:text-slate-950 shadow-sm">3</span>
                <div>
                  <h2 className="font-serif text-xl text-slate-900 dark:text-slate-100">Día y bloque horario</h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Atención de lunes a viernes, sin feriados.</p>
                </div>
              </div>

              <div className="mt-6 sm:max-w-xs">
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                  className="w-full cursor-pointer rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] px-3.5 py-2.5 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:border-[#00629B] dark:focus:border-[#00A3E0] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-900/60 disabled:text-slate-500 dark:disabled:text-slate-500"
                />
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <label className="text-[13px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <IconClock className="w-4 h-4 text-[#00629B] dark:text-[#00A3E0]" />
                      Línea de tiempo de horarios
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Haz clic en la barra cronológica o en las tarjetas para seleccionar tu bloque.
                    </p>
                  </div>
                  {formData.campus_id && formData.fecha && !cargandoHorarios && bloquesHorarios.length > 0 && (
                    <span className="text-[11px] font-bold text-[#00629B] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-800/70 whitespace-nowrap">
                      {bloquesHorarios.filter((b) => !b.agotado && !(b.pasado || calcularEsBloquePasado(formData.fecha, b.hora))).length} de {bloquesHorarios.length} bloques libres
                    </span>
                  )}
                </div>

                {!formData.campus_id || !formData.fecha ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-[#131d33]/50 px-5 py-8 text-center">
                    <IconCalendar className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500" />
                    <p className="mt-2 text-[14px] font-medium text-slate-700 dark:text-slate-200">Elige una sede y un día</p>
                    <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">Con esos datos calculamos los cupos reales de cada bloque en tiempo real.</p>
                  </div>
                ) : cargandoHorarios ? (
                  <div className="space-y-3">
                    <div className="h-9 w-full rounded-xl bg-slate-200/60 dark:bg-slate-800 animate-pulse" />
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="relative h-24 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] p-3.5"
                        >
                          <div className="h-4 w-24 rounded bg-slate-200/80 dark:bg-slate-700" />
                          <div className="mt-3 h-2 w-full rounded bg-slate-200/60 dark:bg-slate-700/60" />
                          <div className="mt-2.5 h-3 w-16 rounded bg-slate-200/50 dark:bg-slate-700/40" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 dark:via-slate-800/40 to-transparent animate-shimmer" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] p-3 sm:p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Jornada diaria ({bloquesHorarios[0]?.hora || "08"}:00 - {parseInt(bloquesHorarios[bloquesHorarios.length - 1]?.hora || "19", 10) + 1}:00 hrs)
                        </span>
                        <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Libre
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#FFC20E] ring-1 ring-[#00629B] dark:ring-[#00A3E0]" /> Tu selección
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-400" /> Lleno
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Pasado
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-flow-col auto-cols-fr gap-1 sm:gap-1.5 h-8 p-1 rounded-lg bg-slate-50 dark:bg-[#0b1120] border border-slate-200/80 dark:border-slate-800">
                        {bloquesHorarios.map((b) => {
                          const esPasado = b.pasado || calcularEsBloquePasado(formData.fecha, b.hora);
                          const deshabilitado = b.agotado || esPasado || isAdmin;
                          const esSeleccionado = formData.hora === b.hora && !esPasado;
                          return (
                            <button
                              key={b.hora}
                              type="button"
                              disabled={deshabilitado}
                              onClick={() => !deshabilitado && setFormData((prev) => ({ ...prev, hora: b.hora }))}
                              title={`${b.rango} — ${esPasado ? "Pasado" : b.agotado ? "Sin cupos" : `${b.disponibles} disponibles`}`}
                              className={`h-full rounded-md text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer select-none ${
                                esSeleccionado
                                  ? "bg-[#FFC20E] text-slate-950 font-black shadow-md ring-2 ring-[#00629B] dark:ring-[#00A3E0] scale-105 z-10"
                                  : esPasado
                                  ? "bg-slate-200/70 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                  : b.agotado
                                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 cursor-not-allowed"
                                  : "bg-white dark:bg-[#16223b] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 hover:border-emerald-400 dark:hover:border-emerald-500 hover:scale-105 active:scale-95 shadow-2xs"
                              }`}
                            >
                              <span className="truncate">{b.hora}h</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {bloquesHorarios.map((b) => {
                        const esPasado = b.pasado || calcularEsBloquePasado(formData.fecha, b.hora);
                        const deshabilitado = b.agotado || esPasado || isAdmin;
                        const esSeleccionado = formData.hora === b.hora && !esPasado;
                        const totalCap = campusSeleccionado?.cubiculas_fisicos || 5;
                        const pctCupos = Math.min(100, Math.max(0, (b.disponibles / totalCap) * 100));

                        return (
                          <button
                            key={b.hora}
                            type="button"
                            disabled={deshabilitado}
                            onClick={() => !deshabilitado && setFormData((prev) => ({ ...prev, hora: b.hora }))}
                            className={`
                              relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E] focus-visible:ring-offset-2
                              ${deshabilitado
                                ? "cursor-not-allowed border-slate-200 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 opacity-60"
                                : esSeleccionado
                                  ? "cursor-pointer border-[#00629B] dark:border-[#00A3E0] bg-gradient-to-br from-[#00629B] to-[#004D7A] dark:from-[#004D7A] dark:to-[#002e4d] text-white shadow-lg shadow-[#00629B]/25 ring-2 ring-[#FFC20E] scale-[1.01]"
                                  : "cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2744] text-slate-800 dark:text-slate-100 hover:border-[#00629B]/70 dark:hover:border-sky-400/60 hover:shadow-md hover:-translate-y-0.5"
                                }
                            `}
                            title={esPasado ? "Horario ya transcurrido el día de hoy" : b.agotado ? "Sin cubículos disponibles para este bloque" : "Disponible para agendar"}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${esSeleccionado ? "text-sky-200" : "text-slate-400 dark:text-slate-400"}`}>
                                  Bloque horario
                                </span>
                                <span className="text-[15px] font-extrabold tabular-nums tracking-tight">
                                  {b.rango}
                                </span>
                              </div>

                              {esSeleccionado ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFC20E] text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs animate-fadeIn">
                                  <IconCheck className="w-3 h-3 text-slate-950" />
                                  Elegido
                                </span>
                              ) : esPasado ? (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Pasado
                                </span>
                              ) : b.agotado ? (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                  Lleno
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Libre
                                </span>
                              )}
                            </div>

                            <div className="mt-3.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-medium">
                                <span className={esSeleccionado ? "text-sky-100" : "text-slate-500 dark:text-slate-400"}>
                                  Disponibilidad
                                </span>
                                <span className={`font-bold tabular-nums ${
                                  esSeleccionado
                                    ? "text-[#FFC20E]"
                                    : esPasado
                                    ? "text-slate-400 dark:text-slate-500"
                                    : b.agotado
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-emerald-700 dark:text-emerald-400"
                                }`}>
                                  {esPasado ? "No aplica" : b.agotado ? "0 cupos" : `${b.disponibles} de ${totalCap} libres`}
                                </span>
                              </div>

                              <div className={`h-1.5 w-full rounded-full overflow-hidden ${esSeleccionado ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    esSeleccionado
                                      ? "bg-[#FFC20E]"
                                      : esPasado
                                      ? "bg-slate-300 dark:bg-slate-600"
                                      : b.agotado
                                      ? "bg-rose-400"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${deshabilitado && !b.agotado ? 0 : b.agotado ? 100 : pctCupos}%` }}
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {formData.hora && !calcularEsBloquePasado(formData.fecha, formData.hora) && (
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-sky-50 dark:bg-[#13233e] border border-sky-200 dark:border-sky-800/70 text-slate-800 dark:text-slate-100 shadow-xs animate-fadeIn">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00629B] dark:bg-[#00A3E0] text-[#FFC20E] dark:text-slate-950 shadow-xs">
                            <IconClock className="w-5 h-5" />
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                              Bloque seleccionado: <span className="text-[#00629B] dark:text-[#00A3E0]">{formData.hora}:00 - {parseInt(formData.hora, 10) + 1}:00 hrs</span>
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {campusSeleccionado?.nombre || "Campus"} · {formData.fecha}
                            </p>
                          </div>
                        </div>
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFC20E] text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs">
                          <IconCheck className="w-3.5 h-3.5 text-slate-950" />
                          Listo para reservar
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </fieldset>

          <section className="bg-slate-50/90 dark:bg-[#0f172a] p-6 sm:px-8 border-t border-slate-200 dark:border-slate-800">
            {listo && (
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-sky-200 dark:border-sky-800/70 bg-sky-50/90 dark:bg-[#13233e] px-4 py-3 text-[13px]">
                <IconCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-slate-900 dark:text-white">{campusSeleccionado?.nombre || "Sede"}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="tabular-nums text-slate-700 dark:text-slate-300">{formData.fecha}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="tabular-nums font-bold text-[#00629B] dark:text-sky-300">{formData.hora}:00 hrs</span>
              </div>
            )}

            <button
              type="submit"
              disabled={formularioDeshabilitado}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-[15px] font-semibold transition-all ${formularioDeshabilitado
                ? "cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-none"
                : "cursor-pointer bg-[#00629B] dark:bg-[#0072B2] text-white hover:bg-[#004B75] dark:hover:bg-[#005c8f] shadow-md shadow-[#00629B]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC20E] focus-visible:ring-offset-2 active:scale-[0.99]"
                }`}
            >
              {isAdmin ? (
                <><IconLock className="w-4 h-4" /> Formulario bloqueado para administradores</>
              ) : tieneReservaActiva ? (
                <><IconLock className="w-4 h-4" /> Ya tienes una reserva activa registrada</>
              ) : sancionUsuario?.suspendido ? (
                <><IconLock className="w-4 h-4" /> Cuenta suspendida por inasistencias</>
              ) : (
                "Confirmar reserva"
              )}
            </button>

            <p className="mt-3 text-center text-[12px] text-slate-500 dark:text-slate-400">
              Se permite una reserva activa por estudiante.
            </p>
          </section>
        </form>

        {/* ── COLUMNA LATERAL: ESTADO DE LA CUENTA ────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-28">

          {sancionUsuario?.suspendido && (
            <div className="rounded-lg border-l-[3px] border-l-rose-600 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <IconAlert className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold">Cuenta suspendida</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                Registras {sancionUsuario.inasistencias_periodo || 2} de 2 inasistencias. Por reglamento, no puedes reservar durante 3 días.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 text-[12px] font-medium text-rose-800 dark:text-rose-300">
                <IconClock className="w-3.5 h-3.5" />
                Desbloqueo: {sancionUsuario.fecha_desbloqueo || `${sancionUsuario.dias_restantes || 3} días restantes`}
              </p>
            </div>
          )}

          {sancionUsuario && !sancionUsuario.suspendido && sancionUsuario.inasistencias_periodo === 1 && (
            <div className="rounded-lg border-l-[3px] border-l-amber-500 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <IconAlert className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold">Tienes 1 inasistencia</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                Con 2 inasistencias tu cuenta se suspende automáticamente por 3 días.
              </p>
            </div>
          )}

          {reservaActivaUser && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] shadow-sm overflow-hidden">
              <div className="border-b border-sky-900 bg-[#00629B] dark:bg-[#0d223a] px-4 py-3 flex items-center justify-between text-white">
                <h3 className="text-[13px] font-semibold text-white">
                  {reservaActivaUser.es_titular === false ? "Tu reserva como acompañante" : "Tu reserva activa"}
                </h3>
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                  reservaActivaUser.es_titular === false ? "bg-sky-100 text-sky-900" : "bg-[#FFC20E] text-slate-900"
                }`}>
                  {reservaActivaUser.es_titular === false ? "Acompañante" : "Confirmada"}
                </span>
              </div>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800 px-4 text-[13px]">
                {reservaActivaUser.es_titular === false && (
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500 dark:text-slate-400">Titular</dt>
                    <dd className="font-semibold text-slate-900 dark:text-slate-100">{reservaActivaUser.titular_nombre}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500 dark:text-slate-400">Sede</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">{reservaActivaUser.campus}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500 dark:text-slate-400">Cubículo</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{reservaActivaUser.cubiculo_codigo}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500 dark:text-slate-400">Fecha</dt>
                  <dd className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{reservaActivaUser.fecha}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-slate-500 dark:text-slate-400">Hora</dt>
                  <dd className="font-bold tabular-nums text-[#00629B] dark:text-[#00A3E0]">{reservaActivaUser.hora} hrs</dd>
                </div>
              </dl>
              <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-[#0f172a]/50">
                <Link
                  to="/mis-reservas"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2744] px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-200 transition-colors hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-[#1e2f52]"
                >
                  <IconList className="w-3.5 h-3.5" /> Mis reservas
                </Link>
                {reservaActivaUser.es_titular !== false ? (
                  <button
                    type="button"
                    onClick={() => abrirModalEdicion(reservaActivaUser)}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#00629B] px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#004B75]"
                  >
                    <IconEdit className="w-3.5 h-3.5" /> Editar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelarReservaActiva}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#1a2744] px-3 py-2 text-[13px] font-medium text-rose-700 dark:text-rose-300 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    Salir de reserva
                  </button>
                )}
              </div>
              <p className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                {reservaActivaUser.es_titular === false
                  ? "Para agendar tu propio cubículo, primero debes desvincularte de esta reserva."
                  : "Para agendar otro bloque, primero cancela o edita esta reserva."}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#16223b] px-4 py-3">
              <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Resumen de la solicitud</h3>
            </div>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800 px-4 text-[13px]">
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><IconPin className="w-3.5 h-3.5 text-[#00629B] dark:text-[#00A3E0]" /> Sede</dt>
                <dd className={`text-right ${campusSeleccionado ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}`}>
                  {campusSeleccionado ? campusSeleccionado.nombre : "Por elegir"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><IconCalendar className="w-3.5 h-3.5 text-[#00629B] dark:text-[#00A3E0]" /> Fecha</dt>
                <dd className={`text-right tabular-nums ${formData.fecha ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}`}>
                  {formData.fecha || "Por elegir"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><IconClock className="w-3.5 h-3.5 text-[#00629B] dark:text-[#00A3E0]" /> Bloque</dt>
                <dd className={`text-right tabular-nums ${formData.hora ? "font-bold text-[#00629B] dark:text-sky-300" : "text-slate-400 dark:text-slate-500"}`}>
                  {formData.hora ? `${formData.hora}:00 hrs` : "Por elegir"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  {tieneAcompanantes ? <IconUsers className="w-3.5 h-3.5 text-[#00629B] dark:text-[#00A3E0]" /> : <IconUser className="w-3.5 h-3.5 text-[#00629B] dark:text-[#00A3E0]" />} Modalidad
                </dt>
                <dd className="text-right font-medium text-slate-900 dark:text-slate-100">
                  {tieneAcompanantes ? `Grupo (${listAcompanantes.length + 1})` : "Individual"}
                </dd>
              </div>
            </dl>
          </div>

          {isEstudiante && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <IconCheck className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold">Sesión verificada</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                {user.nombre} · RUT {user.rut}. Tus datos de titular se completaron automáticamente.
              </p>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-xl border-l-[3px] border-l-amber-500 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <IconLock className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold">Vista de administrador</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                El formulario está en solo lectura: las reservas las realizan los estudiantes.
              </p>
            </div>
          )}

          {!user && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] p-4 shadow-sm">
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">¿Eres estudiante?</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                Inicia sesión y completaremos tu nombre y RUT automáticamente.
              </p>
              <Link
                to="/login"
                className="mt-3 inline-flex items-center justify-center rounded-md bg-[#FFC20E] px-4 py-2 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-[#FFCA28]"
              >
                Iniciar sesión
              </Link>
            </div>
          )}
        </aside>
      </main>

      {modalEdicionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-[2px]">
          <div className="my-8 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] shadow-2xl">
            <div className="bg-[#00629B] dark:bg-[#0d223a] px-6 py-4 text-white flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl text-white">Editar reserva</h3>
                <p className="mt-0.5 text-[13px] text-sky-200/90">
                  Cambia la sede, el día o el bloque horario.
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
            <div className="h-[2px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B]" />

            <form onSubmit={handleGuardarEdicion} className="space-y-5 px-6 py-5">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] px-3.5 py-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><IconLock className="w-3.5 h-3.5" /> Titular</span>
                  <strong className="font-medium text-slate-900 dark:text-slate-100">{isEstudiante ? (user?.nombre || "Estudiante") : (formData.nombre || "Estudiante")}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><IconLock className="w-3.5 h-3.5" /> RUT</span>
                  <strong className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{isEstudiante ? (user?.rut || "N/A") : (formData.rut || "N/A")}</strong>
                </div>
                <p className="mt-2 border-t border-slate-200 dark:border-slate-800 pt-2 text-[12px] text-slate-500 dark:text-slate-400">
                  Los datos del titular no se pueden modificar.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Sede
                </label>
                <select
                  required
                  value={editFormData.campus_id}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, campus_id: e.target.value, hora: "" }))}
                  className="w-full cursor-pointer rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] px-3 py-2.5 text-[14px] text-slate-900 dark:text-slate-100 focus:border-[#00629B] dark:focus:border-[#00A3E0] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20"
                >
                  <option value="">Selecciona una sede</option>
                  {campusList.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
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
                  className="w-full cursor-pointer rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] px-3 py-2.5 text-[14px] tabular-nums text-slate-900 dark:text-slate-100 focus:border-[#00629B] dark:focus:border-[#00A3E0] focus:outline-none focus:ring-2 focus:ring-[#00629B]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Nuevo bloque horario
                </label>
                {cargandoEditBloques ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="relative h-[54px] overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-2.5"
                      >
                        <div className="h-3 w-16 rounded bg-slate-200/80 dark:bg-slate-700" />
                        <div className="mt-2 h-2.5 w-12 rounded bg-slate-200/60 dark:bg-slate-700/60" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 dark:via-slate-800/40 to-transparent animate-shimmer" />
                      </div>
                    ))}
                  </div>
                ) : editBloques.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] px-3 py-3 text-[13px] text-slate-500 dark:text-slate-400">
                    Elige sede y fecha para ver los bloques disponibles.
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
                              ? "cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-slate-400 dark:text-slate-600 opacity-60"
                              : esSeleccionado
                                ? "cursor-pointer border-[#00629B] dark:border-[#00A3E0] bg-[#00629B] dark:bg-[#0072B2] text-white shadow-sm"
                                : "cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2744] text-slate-700 dark:text-slate-200 hover:border-[#00629B] dark:hover:border-[#00A3E0] hover:bg-sky-50/50 dark:hover:bg-[#1f3156]"
                            }`}
                          title={esPasado ? "Horario ya transcurrido el día de hoy" : ""}
                        >
                          <span className="font-medium tabular-nums">{b.rango}</span>
                          <span className={`mt-1 text-[12px] ${esPasado ? "text-slate-400 dark:text-slate-500" : esSeleccionado ? "text-sky-100" : "text-slate-500 dark:text-slate-400"}`}>
                            {esPasado ? "Finalizado" : `${b.disponibles} libres`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setModalEdicionOpen(false)}
                  className="cursor-pointer rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2744] px-4 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-[#1e2f52]"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-md bg-[#00629B] dark:bg-[#0072B2] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#004B75] dark:hover:bg-[#005c8f]"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px] animate-fadeIn">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                <IconAlert />
              </span>
              <div>
                <h3 className="font-serif text-lg text-slate-900 dark:text-slate-100">{confirmModal.titulo || "Confirmación"}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{confirmModal.mensaje}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null })}
                className="cursor-pointer rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2744] px-4 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-[#1e2f52]"
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

      {modalConfirmacionReservaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-[2px] animate-fadeIn">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131d33] shadow-2xl animate-scaleUp">
            <div className="bg-[#00629B] dark:bg-[#0d223a] px-6 py-5 text-white flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-sky-100 uppercase tracking-wider mb-1.5">
                  Confirmación de reserva
                </span>
                <h3 className="font-serif text-xl font-bold text-white">Resumen de tu solicitud</h3>
                <p className="mt-0.5 text-xs text-sky-200/90">
                  Verifica que los datos sean correctos antes de agendar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmacionReservaOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                title="Cerrar"
              >
                <IconClose />
              </button>
            </div>
            <div className="h-[3px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B]" />

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f172a] p-4 space-y-3 text-xs sm:text-[13px]">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <IconPin className="w-4 h-4 text-[#00629B] dark:text-[#00A3E0]" /> Sede / Campus
                  </span>
                  <strong className="font-bold text-slate-900 dark:text-slate-100 text-right">{campusSeleccionado?.nombre || "Sede"}</strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <IconCalendar className="w-4 h-4 text-[#00629B] dark:text-[#00A3E0]" /> Fecha
                  </span>
                  <strong className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{formData.fecha}</strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <IconClock className="w-4 h-4 text-[#00629B] dark:text-[#00A3E0]" /> Bloque Horario
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-[#00629B] dark:text-sky-300 font-bold tabular-nums text-xs">
                    {formData.hora}:00 - {parseInt(formData.hora, 10) + 1}:00 hrs
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <IconUser className="w-4 h-4 text-[#00629B] dark:text-[#00A3E0]" /> Titular
                  </span>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{formData.nombre}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">RUT: {formData.rut}</p>
                  </div>
                </div>

                <div className="flex items-start justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium mt-0.5">
                    <IconUsers className="w-4 h-4 text-[#00629B] dark:text-[#00A3E0]" /> Modalidad
                  </span>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {tieneAcompanantes && listAcompanantes.length > 0
                        ? `Grupal (${listAcompanantes.length + 1} personas)`
                        : "Individual"}
                    </span>
                    {tieneAcompanantes && listAcompanantes.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        {listAcompanantes.map((ac, idx) => (
                          <li key={idx}>
                            + {ac.nombre} {ac.rut ? `(${ac.rut})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/40 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <span className="text-base leading-none">⚠️</span>
                <p className="leading-relaxed">
                  <strong>Recordatorio:</strong> Dispones de <strong>15 minutos de tolerancia</strong> para presentarte al cubículo. En caso contrario, se registrará una inasistencia sujeta a suspensión de reservas.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={cargandoEnvioReserva}
                  onClick={() => setModalConfirmacionReservaOpen(false)}
                  className="w-full sm:w-auto cursor-pointer rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2744] px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-[#1e2f52] disabled:opacity-50"
                >
                  Modificar datos
                </button>
                <button
                  type="button"
                  disabled={cargandoEnvioReserva}
                  onClick={handleConfirmarYCrearReserva}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00629B] dark:bg-[#0072B2] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#00629B]/25 hover:bg-[#004B75] dark:hover:bg-[#005c8f] transition-all cursor-pointer disabled:opacity-60 active:scale-98"
                >
                  {cargandoEnvioReserva ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Agendando cubículo...
                    </>
                  ) : (
                    <>
                      <IconCheck className="w-4 h-4 text-[#FFC20E]" />
                      Confirmar y Agendar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastNotificacion.texto && (
        <div className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-md border-l-[3px] bg-white dark:bg-[#131d33] px-4 py-3.5 text-[13px] shadow-xl animate-slideUp ${toastNotificacion.tipo === "error"
          ? "border-l-rose-600 border border-slate-200 dark:border-slate-800"
          : "border-l-emerald-600 border border-slate-200 dark:border-slate-800"
          }`}>
          <span className={toastNotificacion.tipo === "error" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
            {toastNotificacion.tipo === "error" ? <IconAlert /> : <IconCheck />}
          </span>
          <p className="flex-1 leading-relaxed text-slate-700 dark:text-slate-200">{toastNotificacion.texto}</p>
          <button
            onClick={() => setToastNotificacion({ tipo: "", texto: "" })}
            className="cursor-pointer text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
            title="Cerrar"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}