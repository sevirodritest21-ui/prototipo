import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import { useAuth } from "./context/AuthContext";
import { API_URL } from "./services/api";
import { useCampusQuery, useDiasBloqueadosQuery, useFeriadosQuery, queryClient } from "./services/queries";
import { obtenerSessionId } from "./utils/session";
import "./FormularioReserva.css";

registerLocale("es", es);

/* ── Iconografía (solo presentación) ─────────────────────────────── */
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
const IconBook = (p) => <Icon {...p} path={<><path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 22z" /><path d="M8 7h8M8 11h6" /></>} />;

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
  const isNoRegular = Boolean(user && !isAdmin && user?.es_regular === false);

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

    if (isNoRegular) {
      setToastNotificacion({
        tipo: "error",
        texto: "Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente."
      });
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

  const abrirChat = () => window.dispatchEvent(new CustomEvent("open-chat"));

  /* Valores derivados solo para presentación */
  const campusSeleccionado = campusList.find((c) => String(c.id) === String(formData.campus_id));
  const listo = Boolean(formData.campus_id && formData.fecha && formData.hora);
  const tieneReservaActiva = Boolean(reservaActivaUser);
  const formularioDeshabilitado = isAdmin || tieneReservaActiva || Boolean(sancionUsuario?.suspendido) || isNoRegular;

  const paso1Completo = Boolean(formData.campus_id && formData.nombre && formData.rut);
  const paso2Completo = paso1Completo && (!tieneAcompanantes || listAcompanantes.some((a) => a.nombre.trim()));
  const paso3Completo = Boolean(paso1Completo && formData.fecha && formData.hora);

  return (
    <div className="fr-root min-h-screen pt-16 pb-24">
      {/* Fondos ambientales */}
      <div className="fr-ambient" aria-hidden="true">
        <div className="fr-orb fr-orb--navy" />
        <div className="fr-orb fr-orb--sky" />
        <div className="fr-orb fr-orb--gold" />
        <div className="fr-mesh" />
      </div>

      {/* HERO DE RESERVA + STEPPER INTERACTIVO */}
      <header className="fr-hero">
        <div className="fr-hero-grid-bg" aria-hidden="true" />
        <div className="fr-container">
          <div className="fr-hero-top">
            <div className="fr-fade-up">
              <div className="fr-eyebrow">
                <span className="fr-eyebrow-dot">★</span>
                Biblioteca Central Universitaria • UCT
              </div>

              <h1 className="fr-title">
                Reserva tu{" "}
                <span className="fr-gradient-text fr-underline">
                  Cubículo.
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

              <p className="fr-lead">
                {isEstudiante
                  ? `Hola, ${user.nombre}. Configura tu sede, modalidad y horario en tres simples pasos para obtener tu pase de estudio.`
                  : "Selecciona tu sede universitaria, modalidad de trabajo y bloque horario con disponibilidad verificada al instante."}
              </p>
            </div>

            <div className="fr-hero-badges fr-fade-up" style={{ animationDelay: "0.15s" }}>
              <div className="fr-live-pill">
                <span className="fr-live-dot" />
                <span>Disponibilidad en tiempo real</span>
              </div>
              <button type="button" onClick={abrirChat} className="fr-chat-pill">
                <span>🤖</span> ¿Prefieres agendar por voz/texto con IA?
              </button>
            </div>
          </div>

          {/* Barra de Progreso / Stepper Visual */}
          <div className="fr-stepper-bar fr-fade-up" style={{ animationDelay: "0.25s" }}>
            <div className={`fr-step-item ${paso1Completo ? "is-done" : "is-active"}`}>
              <span className="fr-step-Index">{paso1Completo ? "✓" : "01"}</span>
              <div>
                <small>Paso 1</small>
                <strong>Sede y Titular</strong>
              </div>
            </div>

            <div className={`fr-step-divider ${paso1Completo ? "is-done" : ""}`} />

            <div className={`fr-step-item ${paso2Completo ? "is-done" : paso1Completo ? "is-active" : ""}`}>
              <span className="fr-step-Index">{paso2Completo ? "✓" : "02"}</span>
              <div>
                <small>Paso 2</small>
                <strong>Modalidad ({tieneAcompanantes ? "Grupal" : "Individual"})</strong>
              </div>
            </div>

            <div className={`fr-step-divider ${paso3Completo ? "is-done" : ""}`} />

            <div className={`fr-step-item ${paso3Completo ? "is-done" : paso2Completo ? "is-active" : ""}`}>
              <span className="fr-step-Index">{paso3Completo ? "✓" : "03"}</span>
              <div>
                <small>Paso 3</small>
                <strong>Fecha y Bloque Horario</strong>
              </div>
            </div>
          </div>
        </div>

        <svg className="fr-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,60 C240,100 480,10 720,40 C960,70 1200,20 1440,50 L1440,90 L0,90 Z" />
        </svg>
      </header>

      {/* WORKSPACE PRINCIPAL: FORMULARIO + PASE DIGITAL EN VIVO */}
      <main className="fr-container fr-workspace">
        <form
          onSubmit={handleSubmit}
          className={`fr-form-card ${tieneReservaActiva ? "is-locked" : ""}`}
        >
          {/* Banner de bloqueo si ya posee reserva activa */}
          {tieneReservaActiva && (
            <div className="fr-lock-banner">
              <div className="flex items-start gap-3.5">
                <div className="fr-lock-icon">
                  <IconLock className="w-5 h-5" />
                </div>
                <div>
                  <h3>
                    {reservaActivaUser.es_titular === false
                      ? "Estás registrado como acompañante en una reserva activa"
                      : "Ya posees una reserva activa registrada"}
                  </h3>
                  <p>
                    {reservaActivaUser.es_titular === false
                      ? `Figuras como acompañante en la reserva de ${reservaActivaUser.titular_nombre || "otro estudiante"} (${reservaActivaUser.fecha} a las ${reservaActivaUser.hora} hrs en ${reservaActivaUser.campus}). Solo se permite 1 reserva activa por estudiante. Para agendar por tu cuenta, primero debes desvincularte.`
                      : `Solo se permite 1 reserva simultánea por estudiante (${reservaActivaUser.fecha} a las ${reservaActivaUser.hora}:00 hrs en ${reservaActivaUser.campus}). Para reservar otro bloque, primero debes cancelar o editar tu reserva actual.`}
                  </p>
                </div>
              </div>
              <Link to="/mis-reservas" className="fr-btn fr-btn--gold shrink-0">
                <IconList className="w-4 h-4" />
                Ir a Mis Reservas
              </Link>
            </div>
          )}

          <fieldset
            disabled={formularioDeshabilitado}
            className={`fr-fieldset ${tieneReservaActiva ? "is-disabled" : ""}`}
          >
            {/* ── PASO 1: SEDE Y TITULAR ─────────────────────────────── */}
            <section className="fr-section">
              <div className="fr-section-head">
                <span className="fr-step-badge">01</span>
                <div>
                  <span className="fr-kicker">✦ Ubicación e Identidad</span>
                  <h2>Sede universitaria y titular</h2>
                  <p>Selecciona el campus donde estudiarás. La reserva quedará asociada a tu credencial.</p>
                </div>
              </div>

              {/* Tarjetas de Campus con Spotlight */}
              <div className="fr-campus-grid">
                {campusList.map((c) => {
                  const isSelected = String(formData.campus_id) === String(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={isAdmin}
                      onMouseMove={handleSpotlight}
                      onClick={() => setFormData((prev) => ({ ...prev, campus_id: String(c.id), hora: "" }))}
                      className={`fr-campus-card ${isSelected ? "is-selected" : ""}`}
                    >
                      <div className="fr-campus-inner">
                        <div className="flex items-start justify-between gap-2">
                          <span className="fr-campus-icon">
                            <IconPin className="w-4 h-4" />
                          </span>
                          {c.cubiculas_fisicos ? (
                            <span className="fr-campus-cap">
                              {c.cubiculas_fisicos} cubículos
                            </span>
                          ) : null}
                        </div>

                        <h3>{c.nombre}</h3>

                        <div className="fr-campus-foot">
                          <span>Sede #{c.id}</span>
                          {isSelected ? (
                            <span className="fr-campus-status is-active">
                              <IconCheck className="w-3.5 h-3.5" /> Seleccionada
                            </span>
                          ) : (
                            <span className="fr-campus-status">Elegir →</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Inputs de Titular */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="fr-label">
                    <span>Nombre del titular</span>
                    {isEstudiante && (
                      <span className="fr-verified-pill">
                        <IconCheck className="w-3 h-3" /> Verificado
                      </span>
                    )}
                  </label>
                  <div className="fr-input-wrap">
                    <span className="fr-input-icon">
                      <IconUser className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      name="nombre"
                      required
                      disabled={isAdmin || isEstudiante}
                      value={formData.nombre}
                      onChange={handleChange}
                      placeholder="Juan Pérez"
                      className="fr-input fr-input--with-icon"
                    />
                  </div>
                </div>

                <div>
                  <label className="fr-label">
                    <span>RUT del titular</span>
                    {isEstudiante && (
                      <span className="fr-verified-pill">
                        <IconCheck className="w-3 h-3" /> Verificado
                      </span>
                    )}
                  </label>
                  <div className="fr-input-wrap">
                    <span className="fr-input-icon">
                      <IconLock className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      name="rut"
                      required
                      disabled={isAdmin || isEstudiante}
                      value={formData.rut}
                      onChange={handleChange}
                      placeholder="12.345.678-9"
                      className="fr-input fr-input--with-icon tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── PASO 2: MODALIDAD DE USO ───────────────────────────── */}
            <section className="fr-section">
              <div className="fr-section-head">
                <span className="fr-step-badge">02</span>
                <div>
                  <span className="fr-kicker">✦ Trabajo Colaborativo</span>
                  <h2>Modalidad de estudio</h2>
                  <p>Indica si utilizarás el cubículo de forma individual o junto a tus compañeros.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mt-6">
                <button
                  type="button"
                  disabled={isAdmin}
                  onMouseMove={handleSpotlight}
                  onClick={() => {
                    if (tieneAcompanantes) {
                      setTieneAcompanantes(false);
                      setListAcompanantes([]);
                      setFormData((prev) => ({ ...prev, acompanantes: [] }));
                    }
                  }}
                  className={`fr-mode-card ${!tieneAcompanantes ? "is-selected" : ""}`}
                >
                  <div className="fr-mode-inner">
                    <span className="fr-mode-icon">
                      <IconUser className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3>Estudio Individual</h3>
                        {!tieneAcompanantes && <span className="fr-mode-check">✓</span>}
                      </div>
                      <p>Solo tú utilizarás el espacio asignado</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isAdmin}
                  onMouseMove={handleSpotlight}
                  onClick={() => {
                    if (!tieneAcompanantes) {
                      setTieneAcompanantes(true);
                      setListAcompanantes([{ nombre: "", rut: "" }]);
                    }
                  }}
                  className={`fr-mode-card ${tieneAcompanantes ? "is-selected" : ""}`}
                >
                  <div className="fr-mode-inner">
                    <span className="fr-mode-icon">
                      <IconUsers className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3>Estudio en Grupo</h3>
                        {tieneAcompanantes && <span className="fr-mode-check">✓</span>}
                      </div>
                      <p>Registra a uno o más compañeros acompañantes</p>
                    </div>
                  </div>
                </button>
              </div>

              {tieneAcompanantes && (
                <div className="fr-companions-panel">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#00629B] dark:text-[#00A3E0]">
                        👥 Registro de acompañantes ({listAcompanantes.length})
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Permite validar el aforo y el acceso de tu equipo en biblioteca.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isAdmin}
                      onClick={handleAgregarAcompanante}
                      className="fr-add-companion-btn"
                    >
                      <IconPlus className="w-3.5 h-3.5" /> Agregar compañero
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {listAcompanantes.map((ac, index) => {
                      const acRutClean = ac.rut ? ac.rut.replace(/[.\-\s]/g, "").toUpperCase().trim() : "";
                      const titRutClean = String(isEstudiante ? user?.rut : formData.rut).replace(/[.\-\s]/g, "").toUpperCase().trim();
                      const esMismoTitular = Boolean(acRutClean && titRutClean && acRutClean === titRutClean);
                      const esDuplicado = Boolean(
                        acRutClean &&
                        listAcompanantes.some(
                          (otro, idx) =>
                            idx !== index &&
                            otro.rut &&
                            otro.rut.replace(/[.\-\s]/g, "").toUpperCase().trim() === acRutClean
                        )
                      );

                      return (
                        <div key={index} className="fr-companion-row">
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                            <span className="fr-companion-num">{index + 1}</span>
                            <input
                              type="text"
                              required
                              disabled={isAdmin}
                              placeholder={`Nombre completo acompañante ${index + 1}`}
                              value={ac.nombre}
                              onChange={(e) => handleAcompananteChange(index, "nombre", e.target.value)}
                              className="fr-input sm:flex-1"
                            />
                            <input
                              type="text"
                              disabled={isAdmin}
                              placeholder="RUT (opcional)"
                              value={ac.rut}
                              onChange={(e) => handleAcompananteChange(index, "rut", e.target.value)}
                              className={`fr-input tabular-nums sm:w-44 ${esMismoTitular || esDuplicado ? "is-invalid" : ""
                                }`}
                            />
                            <button
                              type="button"
                              disabled={isAdmin}
                              onClick={() => handleRemoverAcompanante(index)}
                              title="Quitar acompañante"
                              className="fr-remove-btn"
                            >
                              <IconClose className="w-4 h-4" />
                              <span className="sm:hidden text-xs font-bold">Quitar</span>
                            </button>
                          </div>

                          {esMismoTitular && (
                            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 pl-1">
                              ⚠️ No puedes agregarte a ti mismo como acompañante.
                            </p>
                          )}
                          {esDuplicado && !esMismoTitular && (
                            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 pl-1">
                              ⚠️ Este RUT está repetido en la lista de acompañantes.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* ── PASO 3: FECHA Y BLOQUE HORARIO ─────────────────────── */}
            <section className="fr-section">
              <div className="fr-section-head">
                <span className="fr-step-badge">03</span>
                <div>
                  <span className="fr-kicker">✦ Disponibilidad en Vivo</span>
                  <h2>Día y bloque horario</h2>
                  <p>Atención de lunes a viernes en días hábiles académicos.</p>
                </div>
              </div>

              <div className="mt-6 sm:max-w-xs">
                <label className="fr-label">
                  <span>Día de la reserva</span>
                </label>
                <div className="fr-datepicker-wrap">
                  <DatePicker
                    selected={fechaSeleccionada}
                    onChange={handleFechaChange}
                    disabled={isAdmin}
                    filterDate={esDiaLaboral}
                    minDate={new Date()}
                    locale="es"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Selecciona una fecha en el calendario"
                    required
                    className="fr-input cursor-pointer font-bold"
                  />
                </div>
              </div>

              <div className="mt-7">
                <div className="flex flex-wrap items-end justify-between gap-2 mb-3.5">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <IconClock className="w-4 h-4 text-[#00A3E0]" />
                      Línea de tiempo y matriz de bloques
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Toca cualquier bloque disponible en la barra rápida o en las tarjetas detalladas.
                    </p>
                  </div>

                  {formData.campus_id && formData.fecha && !cargandoHorarios && bloquesHorarios.length > 0 && (
                    <span className="fr-slots-counter">
                      {
                        bloquesHorarios.filter(
                          (b) => !b.agotado && !(b.pasado || calcularEsBloquePasado(formData.fecha, b.hora))
                        ).length
                      }{" "}
                      de {bloquesHorarios.length} bloques libres
                    </span>
                  )}
                </div>

                {!formData.campus_id || !formData.fecha ? (
                  <div className="fr-empty-slots">
                    <div className="fr-empty-slots-icon">
                      <IconCalendar className="w-6 h-6" />
                    </div>
                    <h4>Selecciona una sede y una fecha</h4>
                    <p>
                      Al elegir campus y día consultaremos en tiempo real los cubículos libres de cada turno horario.
                    </p>
                  </div>
                ) : cargandoHorarios ? (
                  <div className="space-y-3">
                    <div className="h-11 w-full rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="h-28 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Barra Cronológica Rápida */}
                    <div className="fr-timeline-box">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-75">
                          Jornada Diaria ({bloquesHorarios[0]?.hora || "08"}:00 -{" "}
                          {parseInt(bloquesHorarios[bloquesHorarios.length - 1]?.hora || "19", 10) + 1}:00 hrs)
                        </span>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold opacity-80">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Libre
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#FFC20E]" /> Tu selección
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500" /> Agotado
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-400" /> Pasado
                          </span>
                        </div>
                      </div>

                      <div className="fr-timeline-strip">
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
                              title={`${b.rango} — ${esPasado ? "Pasado" : b.agotado ? "Sin cupos" : `${b.disponibles} disponibles`
                                }`}
                              className={`fr-timeline-Segment ${esSeleccionado
                                  ? "is-selected"
                                  : esPasado
                                    ? "is-past"
                                    : b.agotado
                                      ? "is-full"
                                      : "is-free"
                                }`}
                            >
                              <span>{b.hora}h</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grid de Tarjetas de Bloques Horarios */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                            onMouseMove={handleSpotlight}
                            onClick={() => !deshabilitado && setFormData((prev) => ({ ...prev, hora: b.hora }))}
                            className={`fr-slot-card ${esSeleccionado
                                ? "is-selected"
                                : deshabilitado
                                  ? "is-disabled"
                                  : ""
                              }`}
                            title={
                              esPasado
                                ? "Horario ya transcurrido el día de hoy"
                                : b.agotado
                                  ? "Sin cubículos disponibles para este bloque"
                                  : "Disponible para agendar"
                            }
                          >
                            <div className="fr-slot-inner">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="fr-slot-kicker">Bloque Horario</span>
                                  <strong className="fr-slot-time tabular-nums">{b.rango}</strong>
                                </div>

                                {esSeleccionado ? (
                                  <span className="fr-slot-pill fr-slot-pill--selected">
                                    <IconCheck className="w-3 h-3" /> Elegido
                                  </span>
                                ) : esPasado ? (
                                  <span className="fr-slot-pill fr-slot-pill--past">Pasado</span>
                                ) : b.agotado ? (
                                  <span className="fr-slot-pill fr-slot-pill--full">Agotado</span>
                                ) : (
                                  <span className="fr-slot-pill fr-slot-pill--free">
                                    <span className="fr-slot-dot" /> Libre
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="opacity-75">Disponibilidad</span>
                                  <span className="tabular-nums">
                                    {esPasado
                                      ? "Finalizado"
                                      : b.agotado
                                        ? "0 cupos"
                                        : `${b.disponibles} de ${totalCap} libres`}
                                  </span>
                                </div>

                                <div className="fr-slot-bar">
                                  <div
                                    className={`fr-slot-bar-fill ${esSeleccionado
                                        ? "is-selected"
                                        : esPasado
                                          ? "is-past"
                                          : b.agotado
                                            ? "is-full"
                                            : "is-free"
                                      }`}
                                    style={{
                                      width: `${deshabilitado && !b.agotado ? 0 : b.agotado ? 100 : pctCupos}%`
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </fieldset>

          {/* Pie de Envío del Formulario */}
          <footer className="fr-form-footer">
            {listo && (
              <div className="fr-ready-banner">
                <div className="flex items-center gap-3">
                  <span className="fr-ready-icon">
                    <IconCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#00A3E0] block">
                      Selección lista para confirmar
                    </span>
                    <p className="text-sm font-extrabold">
                      {campusSeleccionado?.nombre || "Sede"} • {formData.fecha} •{" "}
                      <span className="text-[#00629B] dark:text-[#FFC20E]">
                        {formData.hora}:00 - {parseInt(formData.hora, 10) + 1}:00 hrs
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={formularioDeshabilitado}
              className={`fr-submit-btn ${formularioDeshabilitado ? "is-disabled" : ""}`}
            >
              {isAdmin ? (
                <>
                  <IconLock className="w-4 h-4" /> Formulario bloqueado para administradores
                </>
              ) : isNoRegular ? (
                <>
                  <IconLock className="w-4 h-4" /> Bloqueado: Estudiante no regular
                </>
              ) : tieneReservaActiva ? (
                <>
                  <IconLock className="w-4 h-4" /> Ya tienes una reserva activa registrada
                </>
              ) : sancionUsuario?.suspendido ? (
                <>
                  <IconLock className="w-4 h-4" /> Cuenta suspendida por inasistencias
                </>
              ) : (
                <>
                  Confirmar Reserva de Cubículo
                  <span className="fr-submit-arrow">→</span>
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs opacity-65">
              Se permite mantener 1 reserva activa simultánea por estudiante.
            </p>
          </footer>
        </form>

        {/* ── COLUMNA LATERAL: BOLETO EN VIVO + ESTADO DE CUENTA ─────── */}
        <aside className="fr-sidebar">
          {isNoRegular && (
            <div className="fr-side-alert fr-side-alert--danger" style={{ borderLeft: "4px solid #EA3829" }}>
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <IconAlert className="w-4 h-4" />
                <h3>Estudiante no regular</h3>
              </div>
              <p>
                Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente.
              </p>
            </div>
          )}

          {/* Alerta de Cuenta Suspendida */}
          {sancionUsuario?.suspendido && (
            <div className="fr-side-alert fr-side-alert--danger">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <IconAlert className="w-4 h-4" />
                <h3>Cuenta suspendida</h3>
              </div>
              <p>
                Registras {sancionUsuario.inasistencias_periodo || 2} de 2 inasistencias. Por reglamento, no puedes reservar durante 3 días.
              </p>
              <span className="fr-side-alert-pill">
                <IconClock className="w-3.5 h-3.5" />
                Desbloqueo: {sancionUsuario.fecha_desbloqueo || `${sancionUsuario.dias_restantes || 3} días restantes`}
              </span>
            </div>
          )}

          {/* Alerta de 1 Inasistencia */}
          {sancionUsuario && !sancionUsuario.suspendido && sancionUsuario.inasistencias_periodo === 1 && (
            <div className="fr-side-alert fr-side-alert--warn">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <IconAlert className="w-4 h-4" />
                <h3>Tienes 1 inasistencia acumulada</h3>
              </div>
              <p>
                Recuerda asistir puntualmente o cancelar con anticipación. Con 2 inasistencias tu cuenta se suspende por 3 días.
              </p>
            </div>
          )}

          {/* Tarjeta de Reserva Activa Existente */}
          {reservaActivaUser && (
            <div className="fr-active-pass">
              <div className="fr-active-pass-head">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-200 block">
                    Pase Registrado
                  </span>
                  <h3>
                    {reservaActivaUser.es_titular === false
                      ? "Reserva como acompañante"
                      : "Tu reserva activa"}
                  </h3>
                </div>
                <span className="fr-active-pass-badge">
                  {reservaActivaUser.es_titular === false ? "Acompañante" : "Confirmada"}
                </span>
              </div>

              <dl className="fr-active-pass-list">
                {reservaActivaUser.es_titular === false && (
                  <div>
                    <dt>Titular</dt>
                    <dd>{reservaActivaUser.titular_nombre}</dd>
                  </div>
                )}
                <div>
                  <dt>Sede</dt>
                  <dd>{reservaActivaUser.campus}</dd>
                </div>
                <div>
                  <dt>Cubículo</dt>
                  <dd className="font-mono text-[#00A3E0] font-black">
                    {reservaActivaUser.cubiculo_codigo}
                  </dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd className="tabular-nums">{reservaActivaUser.fecha}</dd>
                </div>
                <div>
                  <dt>Horario</dt>
                  <dd className="tabular-nums font-black">{reservaActivaUser.hora} hrs</dd>
                </div>
              </dl>

              <div className="fr-active-pass-actions">
                <Link to="/mis-reservas" className="fr-side-btn fr-side-btn--ghost">
                  <IconList className="w-3.5 h-3.5" /> Mis reservas
                </Link>
                {reservaActivaUser.es_titular !== false ? (
                  <button
                    type="button"
                    onClick={() => abrirModalEdicion(reservaActivaUser)}
                    className="fr-side-btn fr-side-btn--primary"
                  >
                    <IconEdit className="w-3.5 h-3.5" /> Editar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelarReservaActiva}
                    className="fr-side-btn fr-side-btn--danger"
                  >
                    Salir de reserva
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PASE DIGITAL EN VIVO (LIVE BOARDING PASS PREVIEW) */}
          <div className="fr-live-ticket">
            <div className="fr-live-ticket-head">
              <div className="flex items-center justify-between">
                <span className="fr-live-ticket-kicker">✦ Vista Previa del Pase</span>
                <span className={`fr-live-ticket-status ${listo ? "is-ready" : ""}`}>
                  {listo ? "Completo" : "En configuración"}
                </span>
              </div>
              <h3>Resumen de tu Solicitud</h3>
            </div>

            <div className="fr-live-ticket-notch" aria-hidden="true">
              <span className="fr-notch-circle fr-notch-circle--left" />
              <span className="fr-notch-line" />
              <span className="fr-notch-circle fr-notch-circle--right" />
            </div>

            <div className="fr-live-ticket-body">
              <div className="fr-ticket-row">
                <span className="fr-ticket-label">
                  <IconPin className="w-3.5 h-3.5 text-[#00A3E0]" /> Sede
                </span>
                <strong className={campusSeleccionado ? "" : "is-placeholder"}>
                  {campusSeleccionado ? campusSeleccionado.nombre : "Por elegir"}
                </strong>
              </div>

              <div className="fr-ticket-row">
                <span className="fr-ticket-label">
                  <IconCalendar className="w-3.5 h-3.5 text-[#00A3E0]" /> Fecha
                </span>
                <strong className={`tabular-nums ${formData.fecha ? "" : "is-placeholder"}`}>
                  {formData.fecha || "Por elegir"}
                </strong>
              </div>

              <div className="fr-ticket-row">
                <span className="fr-ticket-label">
                  <IconClock className="w-3.5 h-3.5 text-[#00A3E0]" /> Bloque
                </span>
                <strong className={`tabular-nums ${formData.hora ? "text-[#00629B] dark:text-[#FFC20E]" : "is-placeholder"}`}>
                  {formData.hora ? `${formData.hora}:00 - ${parseInt(formData.hora, 10) + 1}:00 hrs` : "Por elegir"}
                </strong>
              </div>

              <div className="fr-ticket-row">
                <span className="fr-ticket-label">
                  {tieneAcompanantes ? (
                    <IconUsers className="w-3.5 h-3.5 text-[#00A3E0]" />
                  ) : (
                    <IconUser className="w-3.5 h-3.5 text-[#00A3E0]" />
                  )}{" "}
                  Modalidad
                </span>
                <strong>
                  {tieneAcompanantes ? `Grupo (${listAcompanantes.length + 1} pers.)` : "Individual"}
                </strong>
              </div>

              <div className="fr-ticket-row">
                <span className="fr-ticket-label">
                  <IconUser className="w-3.5 h-3.5 text-[#00A3E0]" /> Titular
                </span>
                <strong className="truncate max-w-[11rem]">
                  {formData.nombre || "Estudiante"}
                </strong>
              </div>
            </div>

            {isEstudiante && (
              <div className="fr-live-ticket-foot">
                <IconCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Sesión verificada: <strong>{user.rut}</strong>
                </span>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="fr-side-alert fr-side-alert--warn">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <IconLock className="w-4 h-4" />
                <h3>Vista de administrador</h3>
              </div>
              <p>
                El formulario está en modo lectura: las reservas de cubículos están destinadas a cuentas estudiantiles.
              </p>
            </div>
          )}

          {!user && (
            <div className="fr-login-card">
              <h3>¿Eres estudiante UCT?</h3>
              <p>
                Inicia sesión con tu cuenta institucional para autocompletar tu nombre y RUT al instante.
              </p>
              <Link to="/login" className="fr-btn fr-btn--gold w-full justify-center mt-3">
                Iniciar sesión →
              </Link>
            </div>
          )}
        </aside>
      </main>

      {/* MODAL 1: EDITAR RESERVA ACTIVA */}
      {modalEdicionOpen && (
        <div className="fr-modal-backdrop">
          <div className="fr-modal">
            <div className="fr-modal-head">
              <div>
                <span className="fr-modal-kicker">✦ Gestión de Reserva</span>
                <h3>Editar reserva activa</h3>
                <p>Cambia la sede, el día o el bloque horario de tu pase.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicionOpen(false)}
                className="fr-modal-close"
                title="Cerrar"
              >
                <IconClose />
              </button>
            </div>
            <div className="fr-modal-bar" />

            <form onSubmit={handleGuardarEdicion} className="fr-modal-body space-y-4">
              <div className="fr-readonly-box">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 opacity-75">
                    <IconLock className="w-3.5 h-3.5 text-[#00A3E0]" /> Titular
                  </span>
                  <strong>
                    {isEstudiante ? user?.nombre || "Estudiante" : formData.nombre || "Estudiante"}
                  </strong>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 opacity-75">
                    <IconLock className="w-3.5 h-3.5 text-[#00A3E0]" /> RUT
                  </span>
                  <strong className="tabular-nums">
                    {isEstudiante ? user?.rut || "N/A" : formData.rut || "N/A"}
                  </strong>
                </div>
              </div>

              <div>
                <label className="fr-label">Sede</label>
                <select
                  required
                  value={editFormData.campus_id}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, campus_id: e.target.value, hora: "" }))
                  }
                  className="fr-input"
                >
                  <option value="">Selecciona una sede</option>
                  {campusList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="fr-label">Nueva fecha</label>
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
                  className="fr-input tabular-nums"
                />
              </div>

              <div>
                <label className="fr-label">Nuevo bloque horario</label>
                {cargandoEditBloques ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                      />
                    ))}
                  </div>
                ) : editBloques.length === 0 ? (
                  <p className="text-xs opacity-70 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    Elige sede y fecha para ver los bloques disponibles.
                  </p>
                ) : (
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
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
                          className={`fr-edit-slot ${esSeleccionado
                              ? "is-selected"
                              : deshabilitado
                                ? "is-disabled"
                                : ""
                            }`}
                        >
                          <span className="font-bold tabular-nums">{b.rango}</span>
                          <small>{esPasado ? "Finalizado" : `${b.disponibles} libres`}</small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="fr-modal-foot">
                <button
                  type="button"
                  onClick={() => setModalEdicionOpen(false)}
                  className="fr-modal-btn fr-modal-btn--ghost"
                >
                  Descartar
                </button>
                <button type="submit" className="fr-btn fr-btn--gold">
                  Guardar cambios →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR CANCELACIÓN */}
      {confirmModal.open && (
        <div className="fr-modal-backdrop">
          <div className="fr-modal max-w-md">
            <div className="fr-modal-head fr-modal-head--danger">
              <div>
                <span className="fr-modal-kicker">✦ Confirmación</span>
                <h3>{confirmModal.titulo || "Confirmación"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null })}
                className="fr-modal-close"
              >
                <IconClose />
              </button>
            </div>

            <div className="fr-modal-body space-y-5">
              <p className="text-sm leading-relaxed opacity-85">{confirmModal.mensaje}</p>
              <div className="fr-modal-foot">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null })}
                  className="fr-modal-btn fr-modal-btn--ghost"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                    setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null });
                  }}
                  className="fr-modal-btn fr-modal-btn--danger"
                >
                  Cancelar reserva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESUMEN FINAL Y CONFIRMACIÓN DE RESERVA */}
      {modalConfirmacionReservaOpen && (
        <div className="fr-modal-backdrop">
          <div className="fr-modal">
            <div className="fr-modal-head">
              <div>
                <span className="fr-modal-kicker">✦ Paso Final</span>
                <h3>Confirmar tu reserva</h3>
                <p>Verifica los detalles de tu pase digital antes de agendar.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmacionReservaOpen(false)}
                className="fr-modal-close"
                title="Cerrar"
              >
                <IconClose />
              </button>
            </div>
            <div className="fr-modal-bar" />

            <div className="fr-modal-body space-y-4">
              <div className="fr-confirm-summary">
                <div className="fr-confirm-row">
                  <span>
                    <IconPin className="w-4 h-4 text-[#00A3E0]" /> Sede / Campus
                  </span>
                  <strong>{campusSeleccionado?.nombre || "Sede"}</strong>
                </div>

                <div className="fr-confirm-row">
                  <span>
                    <IconCalendar className="w-4 h-4 text-[#00A3E0]" /> Fecha
                  </span>
                  <strong className="tabular-nums">{formData.fecha}</strong>
                </div>

                <div className="fr-confirm-row">
                  <span>
                    <IconClock className="w-4 h-4 text-[#00A3E0]" /> Bloque Horario
                  </span>
                  <span className="fr-confirm-time">
                    {formData.hora}:00 - {parseInt(formData.hora, 10) + 1}:00 hrs
                  </span>
                </div>

                <div className="fr-confirm-row">
                  <span>
                    <IconUser className="w-4 h-4 text-[#00A3E0]" /> Titular
                  </span>
                  <div className="text-right">
                    <strong className="block">{formData.nombre}</strong>
                    <small className="opacity-65 tabular-nums">RUT: {formData.rut}</small>
                  </div>
                </div>

                <div className="fr-confirm-row border-b-0 pb-0">
                  <span>
                    <IconUsers className="w-4 h-4 text-[#00A3E0]" /> Modalidad
                  </span>
                  <div className="text-right">
                    <strong>
                      {tieneAcompanantes && listAcompanantes.length > 0
                        ? `Grupal (${listAcompanantes.length + 1} personas)`
                        : "Individual"}
                    </strong>
                    {tieneAcompanantes && listAcompanantes.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[11px] opacity-75">
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

              <div className="fr-tolerance-note">
                <span>⚠️</span>
                <p>
                  <strong>Recordatorio:</strong> Dispones de <strong>15 minutos de tolerancia</strong> para presentarte al cubículo. En caso contrario, se registrará una inasistencia sujeta a suspensión temporal.
                </p>
              </div>

              <div className="fr-modal-foot">
                <button
                  type="button"
                  disabled={cargandoEnvioReserva}
                  onClick={() => setModalConfirmacionReservaOpen(false)}
                  className="fr-modal-btn fr-modal-btn--ghost"
                >
                  Modificar datos
                </button>
                <button
                  type="button"
                  disabled={cargandoEnvioReserva}
                  onClick={handleConfirmarYCrearReserva}
                  className="fr-btn fr-btn--gold"
                >
                  {cargandoEnvioReserva ? (
                    "Agendando cubículo..."
                  ) : (
                    <>
                      <IconCheck className="w-4 h-4" /> Confirmar y Agendar →
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE NOTIFICACIÓN */}
      {toastNotificacion.texto && (
        <div
          className={`fr-toast ${toastNotificacion.tipo === "error" ? "fr-toast--error" : "fr-toast--success"
            }`}
        >
          <span className="fr-toast-icon">
            {toastNotificacion.tipo === "error" ? <IconAlert /> : <IconCheck />}
          </span>
          <p className="flex-1 font-semibold">{toastNotificacion.texto}</p>
          <button
            type="button"
            onClick={() => setToastNotificacion({ tipo: "", texto: "" })}
            className="opacity-60 hover:opacity-100"
            title="Cerrar"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}