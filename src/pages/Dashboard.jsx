import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [campus, setCampus] = useState([]);
  const [campusSeleccionado, setCampusSeleccionado] = useState(null);

  // Estados para la gestión de campus (Crear / Eliminar)
  const [nuevoCampusNombre, setNuevoCampusNombre] = useState("");
  const [creandoCampus, setCreandoCampus] = useState(false);
  const [campusMsg, setCampusMsg] = useState({ tipo: "", texto: "" });
  const [campusAEliminar, setCampusAEliminar] = useState(null);
  const [eliminandoCampus, setEliminandoCampus] = useState(false);
  const [mostrarGestionCampus, setMostrarGestionCampus] = useState(false);

  const [campusAEditar, setCampusAEditar] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCubiculos, setEditCubiculos] = useState(10);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [cubiculosEditModal, setCubiculosEditModal] = useState([]);
  const [cargandoCubiculosModal, setCargandoCubiculosModal] = useState(false);
  const [editingCubiculoId, setEditingCubiculoId] = useState(null);
  const [editCubiculoCodigoVal, setEditCubiculoCodigoVal] = useState("");
  const [nuevoCubiculoModalCodigo, setNuevoCubiculoModalCodigo] = useState("");

  // Estados para Añadir Cubículos Individuales (Con selección manual de Campus)
  const [cubiculosCampus, setCubiculosCampus] = useState([]);
  const [nuevoCodigoCubiculo, setNuevoCodigoCubiculo] = useState("");
  const [campusDestinoCubiculo, setCampusDestinoCubiculo] = useState("");
  const [creandoCubiculo, setCreandoCubiculo] = useState(false);

  const hoyStr = new Date().toISOString().split("T")[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
  const [activeTab, setActiveTab] = useState("monitoreo");

  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);
  const [reservasBloque, setReservasBloque] = useState([]);
  const [cargandoBloque, setCargandoBloque] = useState(false);
  const [eliminandoReservaId, setEliminandoReservaId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, titulo: "", mensaje: "", onConfirm: null });
  const [toastNotificacion, setToastNotificacion] = useState({ tipo: "", texto: "" });

  const [cmsAnuncios, setCmsAnuncios] = useState([]);
  const [cmsTarjetas, setCmsTarjetas] = useState([]);
  const [cargandoCMS, setCargandoCMS] = useState(false);
  const [mostrarGestionCMS, setMostrarGestionCMS] = useState(false);

  const [modalAnuncioOpen, setModalAnuncioOpen] = useState(false);
  const [anuncioEdit, setAnuncioEdit] = useState(null);
  const [formAnuncio, setFormAnuncio] = useState({
    titulo: "", subtitulo: "", badge: "NUEVO SERVICIO", boton_texto: "Ver Más", boton_link: "/reservar", color_fondo: "#4A4D55", orden: 0
  });

  const [modalTarjetaOpen, setModalTarjetaOpen] = useState(false);
  const [tarjetaEdit, setTarjetaEdit] = useState(null);
  const [formTarjeta, setFormTarjeta] = useState({
    icono: "📚", titulo: "", descripcion: "", link_texto: "Ir al Formulario →", link_url: "/reservar", orden: 0
  });

  const fetchCMS = async () => {
    setCargandoCMS(true);
    try {
      const [anunciosData, tarjetasData] = await Promise.all([
        apiGet("/api/cms/anuncios"),
        apiGet("/api/cms/tarjetas")
      ]);
      setCmsAnuncios(anunciosData || []);
      setCmsTarjetas(tarjetasData || []);
    } catch {
      setCmsAnuncios([]);
      setCmsTarjetas([]);
    } finally {
      setCargandoCMS(false);
    }
  };

  useEffect(() => {
    fetchCMS();
  }, []);

  useEffect(() => {
    if (activeTab === "historial" && historial.length === 0) {
      setMostrarHistorial(true);
      fetchHistorial();
    }
  }, [activeTab]);

  const [metricas, setMetricas] = useState(null);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [mostrarGraficoMetricas, setMostrarGraficoMetricas] = useState(false);

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [campusFiltroHistorial, setCampusFiltroHistorial] = useState("todos");

  const traducirDia = (d) => {
    if (!d) return "";
    const map = {
      monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
      thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo"
    };
    return map[String(d).trim().toLowerCase()] || d;
  };

  const fetchHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const params = new URLSearchParams();
      if (campusFiltroHistorial && campusFiltroHistorial !== "todos") {
        params.append("campus_id", campusFiltroHistorial);
      }
      if (busquedaHistorial) params.append("busqueda", busquedaHistorial);
      const data = await apiGet(`/api/dashboard/historial?${params.toString()}`);
      setHistorial(data || []);
    } catch {
      setHistorial([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    if (activeTab === "historial" || mostrarHistorial) {
      fetchHistorial();
    }
  }, [campusFiltroHistorial, busquedaHistorial, mostrarHistorial, activeTab]);

  // Cargar lista de campus
  const fetchCampus = async () => {
    try {
      const data = await apiGet("/api/campus");
      setCampus(data);
      if (data.length > 0) {
        if (!campusSeleccionado || !data.some((c) => c.id === campusSeleccionado)) {
          setCampusSeleccionado(data[0].id);
        }
        if (!campusDestinoCubiculo) {
          setCampusDestinoCubiculo(data[0].id);
        }
      }
    } catch {
      setError("No se pudo cargar la lista de campus.");
    }
  };

  // Cargar cubículos pertenecientes al campus seleccionado
  const fetchCubiculos = async (campusId) => {
    if (!campusId) return;
    try {
      const data = await apiGet(`/api/cubiculos?campus_id=${campusId}`);
      setCubiculosCampus(data || []);
    } catch {
      setCubiculosCampus([]);
    }
  };

  useEffect(() => {
    fetchCampus();
  }, []);

  useEffect(() => {
    if (campusSeleccionado) {
      fetchCubiculos(campusSeleccionado);
    }
  }, [campusSeleccionado]);

  // Cargar datos del resumen al cambiar campus o fecha
  const fetchResumen = async () => {
    if (!campusSeleccionado) {
      setResumen(null);
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    setError("");
    try {
      const data = await apiGet(
        `/api/dashboard/resumen?campus_id=${campusSeleccionado}&fecha=${fechaSeleccionada}`
      );
      setResumen(data);
    } catch (err) {
      setError(err.message || "Error al cargar datos del dashboard.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, [campusSeleccionado, fechaSeleccionada]);

  // Cargar Métricas de Uso y Horarios Pico
  const fetchMetricas = async () => {
    setCargandoMetricas(true);
    try {
      const query = campusSeleccionado ? `?campus_id=${campusSeleccionado}` : "";
      const data = await apiGet(`/api/dashboard/metricas${query}`);
      setMetricas(data);
    } catch {
      setMetricas(null);
    } finally {
      setCargandoMetricas(false);
    }
  };

  useEffect(() => {
    fetchMetricas();
  }, [campusSeleccionado]);

  // Handler para Clic en Bloque Horario
  const handleAbrirDetalleBloque = async (bloque) => {
    if (bloque.ocupados === 0) return;

    setBloqueSeleccionado(bloque);
    setCargandoBloque(true);
    setReservasBloque([]);

    try {
      const data = await apiGet(
        `/api/dashboard/reservas-bloque?campus_id=${campusSeleccionado}&fecha=${fechaSeleccionada}&hora=${bloque.hora}`
      );
      setReservasBloque(data.reservas || []);
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al cargar las reservas del bloque: " + (err.message || "") });
      setBloqueSeleccionado(null);
    } finally {
      setCargandoBloque(false);
    }
  };

  const ejecutarEliminacionReserva = async (reservaId) => {
    setEliminandoReservaId(reservaId);
    try {
      await apiDelete(`/api/reservas/${reservaId}`);

      const reservasActualizadas = reservasBloque.filter((r) => r.id !== reservaId);
      setReservasBloque(reservasActualizadas);

      await fetchResumen();

      if (reservasActualizadas.length === 0) {
        setBloqueSeleccionado(null);
      }
      setToastNotificacion({ tipo: "exito", texto: `Reserva ID ${reservaId} eliminada exitosamente.` });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al eliminar la reserva: " + (err.message || "Intenta nuevamente") });
    } finally {
      setEliminandoReservaId(null);
    }
  };

  const handleEliminarReserva = (reservaId) => {
    setConfirmModal({
      open: true,
      titulo: "Eliminar Reserva",
      mensaje: `¿Estás seguro de que deseas eliminar la reserva ID ${reservaId}?`,
      onConfirm: () => ejecutarEliminacionReserva(reservaId)
    });
  };

  // Handler para Añadir Nuevo Campus
  const handleCrearCampus = async (e) => {
    e.preventDefault();
    const nombreLimpio = nuevoCampusNombre.trim();
    if (!nombreLimpio) return;

    setCreandoCampus(true);
    setCampusMsg({ tipo: "", texto: "" });

    try {
      const nuevo = await apiPost("/api/campus", {
        nombre: nombreLimpio,
      });
      setCampusMsg({
        tipo: "exito",
        texto: `✅ Sede '${nuevo.nombre}' creada con éxito.`,
      });
      setNuevoCampusNombre("");
      await fetchCampus();
      setCampusSeleccionado(nuevo.id);
    } catch (err) {
      setCampusMsg({
        tipo: "error",
        texto: err.message || "Error al crear el nuevo campus.",
      });
    } finally {
      setCreandoCampus(false);
    }
  };

  // Handler para Añadir un Cubículo Seleccionando la Sede Manualmente
  const handleCrearCubiculo = async (e) => {
    e.preventDefault();
    const codigoLimpio = nuevoCodigoCubiculo.trim();
    const idCampusDestino = Number(campusDestinoCubiculo);

    if (!codigoLimpio || !idCampusDestino) return;

    setCreandoCubiculo(true);
    setCampusMsg({ tipo: "", texto: "" });

    try {
      const resp = await apiPost("/api/cubiculos", {
        codigo: codigoLimpio,
        campus_id: idCampusDestino,
      });

      const nombreCampusDestino = campus.find((c) => c.id === idCampusDestino)?.nombre || "la sede seleccionada";

      setCampusMsg({
        tipo: "exito",
        texto: `✅ Cubículo '${resp.codigo}' creado exitosamente en ${nombreCampusDestino}.`,
      });
      setNuevoCodigoCubiculo("");

      if (idCampusDestino === campusSeleccionado) {
        await fetchCubiculos(campusSeleccionado);
      }
      await fetchCampus();
    } catch (err) {
      setCampusMsg({
        tipo: "error",
        texto: err.message || "Error al añadir el cubículo.",
      });
    } finally {
      setCreandoCubiculo(false);
    }
  };

  const fetchCubiculosModal = async (campusId) => {
    if (!campusId) return;
    setCargandoCubiculosModal(true);
    try {
      const data = await apiGet(`/api/cubiculos?campus_id=${campusId}`);
      setCubiculosEditModal(data || []);
    } catch {
      setCubiculosEditModal([]);
    } finally {
      setCargandoCubiculosModal(false);
    }
  };

  const handleIniciarEdicion = (c) => {
    setCampusAEditar(c);
    setEditNombre(c.nombre);
    setEditCubiculos(c.cubiculas_fisicos ?? 10);
    setEditingCubiculoId(null);
    setNuevoCubiculoModalCodigo("");
    fetchCubiculosModal(c.id);
  };

  const handleGuardarEditCubiculo = async (cubId) => {
    const valLimpio = editCubiculoCodigoVal.trim();
    if (!valLimpio || !campusAEditar) return;
    try {
      await apiPut(`/api/cubiculos/${cubId}`, { codigo: valLimpio });
      setEditingCubiculoId(null);
      await fetchCubiculosModal(campusAEditar.id);
      await fetchCampus();
      if (campusSeleccionado === campusAEditar.id) {
        await fetchCubiculos(campusSeleccionado);
      }
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al actualizar cubículo" });
    }
  };

  const handleEliminarCubiculoModal = (cubId, codigo) => {
    setConfirmModal({
      open: true,
      titulo: "Eliminar Cubículo",
      mensaje: `¿Estás seguro de que deseas eliminar el cubículo '${codigo}'?`,
      onConfirm: async () => {
        try {
          await apiDelete(`/api/cubiculos/${cubId}`);
          await fetchCubiculosModal(campusAEditar.id);
          await fetchCampus();
          if (campusSeleccionado === campusAEditar.id) {
            await fetchCubiculos(campusSeleccionado);
          }
          setToastNotificacion({ tipo: "exito", texto: `Cubículo '${codigo}' eliminado.` });
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.message || "Error al eliminar cubículo" });
        }
      }
    });
  };

  const handleCrearCubiculoModal = async (e) => {
    e.preventDefault();
    const codigoLimpio = nuevoCubiculoModalCodigo.trim();
    if (!codigoLimpio || !campusAEditar) return;
    try {
      await apiPost("/api/cubiculos", {
        codigo: codigoLimpio,
        campus_id: campusAEditar.id
      });
      setNuevoCubiculoModalCodigo("");
      await fetchCubiculosModal(campusAEditar.id);
      await fetchCampus();
      if (campusSeleccionado === campusAEditar.id) {
        await fetchCubiculos(campusSeleccionado);
      }
      setToastNotificacion({ tipo: "exito", texto: `Cubículo '${codigoLimpio}' creado con éxito.` });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al crear el cubículo" });
    }
  };

  const handleAbrirCrearAnuncio = () => {
    setAnuncioEdit(null);
    setFormAnuncio({
      titulo: "", subtitulo: "", badge: "NUEVO SERVICIO", boton_texto: "Ver Más", boton_link: "/reservar", color_fondo: "#4A4D55", orden: cmsAnuncios.length + 1
    });
    setModalAnuncioOpen(true);
  };

  const handleAbrirEditarAnuncio = (an) => {
    setAnuncioEdit(an);
    setFormAnuncio({
      titulo: an.titulo, subtitulo: an.subtitulo || "", badge: an.badge || "", boton_texto: an.boton_texto || "", boton_link: an.boton_link || "", color_fondo: an.color_fondo || "#4A4D55", orden: an.orden || 0
    });
    setModalAnuncioOpen(true);
  };

  const handleGuardarAnuncio = async (e) => {
    e.preventDefault();
    if (!formAnuncio.titulo.trim()) return;
    try {
      if (anuncioEdit) {
        await apiPut(`/api/cms/anuncios/${anuncioEdit.id}`, formAnuncio);
        setToastNotificacion({ tipo: "exito", texto: "Anuncio actualizado exitosamente." });
      } else {
        await apiPost("/api/cms/anuncios", formAnuncio);
        setToastNotificacion({ tipo: "exito", texto: "Anuncio creado exitosamente." });
      }
      setModalAnuncioOpen(false);
      await fetchCMS();
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al guardar el anuncio" });
    }
  };

  const handleEliminarAnuncio = (id, titulo) => {
    setConfirmModal({
      open: true,
      titulo: "Eliminar Anuncio",
      mensaje: `¿Estás seguro de eliminar el anuncio '${titulo}'?`,
      onConfirm: async () => {
        try {
          await apiDelete(`/api/cms/anuncios/${id}`);
          setToastNotificacion({ tipo: "exito", texto: "Anuncio eliminado exitosamente." });
          await fetchCMS();
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.message || "Error al eliminar anuncio" });
        }
      }
    });
  };

  const handleAbrirCrearTarjeta = () => {
    setTarjetaEdit(null);
    setFormTarjeta({
      icono: "📚", titulo: "", descripcion: "", link_texto: "Ir al Formulario →", link_url: "/reservar", orden: cmsTarjetas.length + 1
    });
    setModalTarjetaOpen(true);
  };

  const handleAbrirEditarTarjeta = (tj) => {
    setTarjetaEdit(tj);
    setFormTarjeta({
      icono: tj.icono || "📚", titulo: tj.titulo, descripcion: tj.descripcion || "", link_texto: tj.link_texto || "", link_url: tj.link_url || "", orden: tj.orden || 0
    });
    setModalTarjetaOpen(true);
  };

  const handleGuardarTarjeta = async (e) => {
    e.preventDefault();
    if (!formTarjeta.titulo.trim()) return;
    try {
      if (tarjetaEdit) {
        await apiPut(`/api/cms/tarjetas/${tarjetaEdit.id}`, formTarjeta);
        setToastNotificacion({ tipo: "exito", texto: "Tarjeta actualizada exitosamente." });
      } else {
        await apiPost("/api/cms/tarjetas", formTarjeta);
        setToastNotificacion({ tipo: "exito", texto: "Tarjeta creada exitosamente." });
      }
      setModalTarjetaOpen(false);
      await fetchCMS();
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al guardar la tarjeta" });
    }
  };

  const handleEliminarTarjeta = (id, titulo) => {
    setConfirmModal({
      open: true,
      titulo: "Eliminar Tarjeta",
      mensaje: `¿Estás seguro de eliminar la tarjeta '${titulo}'?`,
      onConfirm: async () => {
        try {
          await apiDelete(`/api/cms/tarjetas/${id}`);
          setToastNotificacion({ tipo: "exito", texto: "Tarjeta eliminada exitosamente." });
          await fetchCMS();
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.message || "Error al eliminar tarjeta" });
        }
      }
    });
  };

  // Handler para Guardar Cambios de la Edición (PUT)
  const handleGuardarEdicionCampus = async (e) => {
    e.preventDefault();
    if (!campusAEditar || !editNombre.trim()) return;

    setGuardandoEdit(true);
    setCampusMsg({ tipo: "", texto: "" });

    try {
      const editado = await apiPut(`/api/campus/${campusAEditar.id}`, {
        nombre: editNombre.trim(),
        cubiculas_fisicos: Number(editCubiculos) || 10,
      });

      setCampusMsg({
        tipo: "exito",
        texto: `✏️ Sede '${editado.nombre}' actualizada con éxito (${editado.cubiculas_fisicos} cubículos).`,
      });
      setCampusAEditar(null);
      await fetchCampus();
    } catch (err) {
      setCampusMsg({
        tipo: "error",
        texto: err.message || "Error al actualizar la sede.",
      });
    } finally {
      setGuardandoEdit(false);
    }
  };

  // Handler para Confirmar Eliminación de Campus
  const handleConfirmarEliminarCampus = async () => {
    if (!campusAEliminar) return;

    setEliminandoCampus(true);
    setCampusMsg({ tipo: "", texto: "" });

    try {
      await apiDelete(`/api/campus/${campusAEliminar.id}`);
      setCampusMsg({
        tipo: "exito",
        texto: `🗑️ Sede '${campusAEliminar.nombre}' eliminada correctamente.`,
      });
      setCampusAEliminar(null);

      const dataRestante = await apiGet("/api/campus");
      setCampus(dataRestante);
      if (dataRestante.length > 0) {
        setCampusSeleccionado(dataRestante[0].id);
      } else {
        setCampusSeleccionado(null);
        setResumen(null);
      }
    } catch (err) {
      setCampusMsg({
        tipo: "error",
        texto: err.message || "Error al eliminar el campus.",
      });
    } finally {
      setEliminandoCampus(false);
    }
  };

  const obtenerProximosDias = () => {
    const dias = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const isoStr = d.toISOString().split("T")[0];
      let label = "";
      if (i === 0) label = "Hoy";
      else if (i === 1) label = "Mañana";
      else {
        label = d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" });
      }
      dias.push({ fechaStr: isoStr, label, fullDate: d });
    }
    return dias;
  };

  const proximosDias = obtenerProximosDias();
  const porcentaje = resumen?.porcentaje_ocupacion ?? 0;
  const cubiculosActuales = resumen?.cubiculas_fisicos ?? 10;
  const campusSeleccionadoObj = campus.find((c) => c.id === campusSeleccionado);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-amber-50 pt-24 pb-16 px-4 relative overflow-hidden font-sans text-slate-900">
      <div className="absolute top-10 left-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

      <main className="relative z-10 mx-auto max-w-7xl w-full">
        <div className="bg-white/80 backdrop-blur-xl border border-sky-100/80 rounded-3xl p-6 shadow-xl shadow-sky-900/5 mb-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-bold text-sky-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Panel Administrador Pro
                </span>
                <span className="text-xs font-semibold text-slate-400">| Sede Activa: <strong className="text-slate-700">{campusSeleccionadoObj?.nombre || "General"}</strong></span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Centro de Control Universitario
              </h1>
              <p className="text-xs md:text-sm text-slate-600">
                Bienvenido/a, <strong className="text-slate-900 font-bold">{user?.nombre}</strong> ({user?.email})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="dashboard-logout"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "monitoreo", label: "Monitoreo y Bloques", icon: "📊" },
                { id: "metricas", label: "Métricas y Análisis", icon: "📈" },
                { id: "sedes", label: "Sedes y Cubículos", icon: "🏛️" },
                { id: "cms", label: "Portal Inicio (CMS)", icon: "🖼️" },
                { id: "historial", label: "Historial de Registros", icon: "📜" }
              ].map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "cms") setMostrarGestionCMS(true);
                      if (tab.id === "sedes") setMostrarGestionCampus(true);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mensaje de Operación */}
        {campusMsg.texto && (
          <div
            className={`rounded-2xl p-4 text-sm mb-6 flex items-center justify-between border shadow-sm ${campusMsg.tipo === "exito"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
              }`}
          >
            <span>{campusMsg.texto}</span>
            <button
              onClick={() => setCampusMsg({ tipo: "", texto: "" })}
              className="text-xs underline font-bold ml-4 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {(activeTab === "cms" || mostrarGestionCMS) && (
          <div className="bg-white/90 backdrop-blur-md border border-amber-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-amber-900/10 mb-8 space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-800 shadow-sm mb-1">
                  🖼️ Administrador de Contenidos (CMS)
                </span>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  Gestión del Portal de Inicio
                </h2>
                <p className="text-xs text-slate-600">
                  Edita las diapositivas del carrusel informativo y las tarjetas de la página principal.
                </p>
              </div>
              <button
                onClick={fetchCMS}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                🔄 Actualizar Vistas
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>🎡</span> Diapositivas del Carrusel Principal ({cmsAnuncios.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Banners animados que rotan en la sección superior del inicio</p>
                </div>
                <button
                  type="button"
                  onClick={handleAbrirCrearAnuncio}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  ➕ Añadir Diapositiva
                </button>
              </div>

              {cargandoCMS ? (
                <div className="py-6 text-center text-xs text-slate-500">Cargando anuncios...</div>
              ) : cmsAnuncios.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                  No hay anuncios personalizados registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cmsAnuncios.map((an) => (
                    <div
                      key={an.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-4 shadow-sm"
                      style={{ borderLeftColor: an.color_fondo || "#00629B", borderLeftWidth: "6px" }}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 uppercase">
                            {an.badge || "ANUNCIO"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">Orden: {an.orden}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">{an.titulo}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{an.subtitulo}</p>
                        {an.boton_texto && (
                          <span className="inline-block text-[11px] font-semibold text-sky-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                            Boton: "{an.boton_texto}" ({an.boton_link})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditarAnuncio(an)}
                          className="px-3 py-1.5 rounded-xl border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarAnuncio(an.id, an.titulo)}
                          className="px-3 py-1.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>📋</span> Tarjetas Informativas Inferiores ({cmsTarjetas.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Bloques con accesos directos situados abajo en el inicio</p>
                </div>
                <button
                  type="button"
                  onClick={handleAbrirCrearTarjeta}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  ➕ Añadir Tarjeta
                </button>
              </div>

              {cargandoCMS ? (
                <div className="py-6 text-center text-xs text-slate-500">Cargando tarjetas...</div>
              ) : cmsTarjetas.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                  No hay tarjetas informativas registradas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {cmsTarjetas.map((tj) => (
                    <div
                      key={tj.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xl p-2 bg-sky-50 rounded-xl border border-sky-100">{tj.icono || "📚"}</span>
                          <span className="text-[10px] font-bold text-slate-400">Orden: {tj.orden}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{tj.titulo}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{tj.descripcion}</p>
                        {tj.link_texto && (
                          <p className="text-[11px] font-bold text-sky-600">{tj.link_texto}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditarTarjeta(tj)}
                          className="px-3 py-1.5 rounded-xl border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarTarjeta(tj.id, tj.titulo)}
                          className="px-3 py-1.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MÓDULO DE GESTIÓN DE CAMPUS Y CUBÍCULOS */}
        {(activeTab === "sedes" || mostrarGestionCampus) && (
          <div className="bg-white/90 backdrop-blur-md border border-sky-200 rounded-3xl p-6 shadow-xl shadow-sky-900/10 mb-8 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  🏛️ Gestión de Sedes y Cubículos Universitarios
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Añade sedes, edita sus datos de capacidad o crea cubículos individuales seleccionando manualmente el campus destino.
                </p>
              </div>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Total registrado: {campus.length} campus
              </span>
            </div>

            {/* Formulario 1: Registrar Nueva Sede */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Registrar Nueva Sede:
              </h3>
              <form onSubmit={handleCrearCampus} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={nuevoCampusNombre}
                    onChange={(e) => setNuevoCampusNombre(e.target.value)}
                    placeholder="Nombre de la nueva sede (ej: Campus San Miguel)..."
                    className="w-full px-4 py-2.5 rounded-2xl border border-sky-200 bg-white text-sm font-medium text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creandoCampus || !nuevoCampusNombre.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creandoCampus ? "Guardando..." : "➕ Añadir Sede"}
                </button>
              </form>
            </div>

            {/* Formulario 2: Crear Cubículo con Selección Manual de Campus */}
            <div className="pt-4 border-t border-sky-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Crear Cubículo Individual y Asignar Sede Manualmente:
              </h3>
              <form onSubmit={handleCrearCubiculo} className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-1/3">
                  <select
                    value={campusDestinoCubiculo}
                    onChange={(e) => setCampusDestinoCubiculo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-amber-300 bg-amber-50 text-sm font-bold text-slate-800 outline-none focus:border-amber-500 shadow-sm cursor-pointer"
                  >
                    {campus.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏛️ {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={nuevoCodigoCubiculo}
                    onChange={(e) => setNuevoCodigoCubiculo(e.target.value)}
                    placeholder="Código del Cubículo (ej: CUB01-SF, CUB02-JP)..."
                    className="w-full px-4 py-2.5 rounded-2xl border border-amber-200 bg-amber-50/30 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creandoCubiculo || !nuevoCodigoCubiculo.trim() || !campusDestinoCubiculo}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creandoCubiculo ? "Añadiendo..." : "🚪 Crear Cubículo"}
                </button>
              </form>

              {cubiculosCampus.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-slate-500 mb-2">
                    Cubículos registrados en la sede activa ({cubiculosCampus.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cubiculosCampus.map((cb) => (
                      <span
                        key={cb.id}
                        className="px-3 py-1 bg-white border border-sky-200 rounded-xl text-xs font-bold text-sky-800 shadow-sm"
                      >
                        {cb.codigo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Campus Registrados */}
            <div className="pt-4 border-t border-sky-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sedes Activas en la Base de Datos:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {campus.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-sky-100 bg-sky-50/50 hover:bg-sky-50 transition-all shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800">🏛️ {c.nombre}</p>
                      <p className="text-[11px] text-slate-500">
                        ID: {c.id} • {c.cubiculas_fisicos ?? 10} cubículos
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleIniciarEdicion(c)}
                        className="px-2.5 py-1.5 rounded-xl border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 text-xs font-bold transition-all shadow-sm cursor-pointer"
                        title="Editar sede"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => setCampusAEliminar(c)}
                        className="px-2.5 py-1.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold transition-all shadow-sm cursor-pointer"
                        title="Eliminar sede"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {campusAEditar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    ✏️ Editar Sede y Cubículos (ID: {campusAEditar.id})
                  </h3>
                  <p className="text-xs text-slate-500">Gestiona la información general y los cubículos de esta sede</p>
                </div>
                <button
                  onClick={() => setCampusAEditar(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                <form onSubmit={handleGuardarEdicionCampus} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Datos de la Sede</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre de la Sede:
                      </label>
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-sky-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-sky-500 shadow-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Capacidad Total:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editCubiculos}
                        onChange={(e) => setEditCubiculos(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-sky-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-sky-500 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={guardandoEdit || !editNombre.trim()}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      {guardandoEdit ? "Guardando..." : "💾 Actualizar Datos Sede"}
                    </button>
                  </div>
                </form>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                      🚪 Cubículos Registrados ({cubiculosEditModal.length})
                    </h4>
                  </div>

                  <form onSubmit={handleCrearCubiculoModal} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Código del nuevo cubículo (ej: CUB-05)..."
                      value={nuevoCubiculoModalCodigo}
                      onChange={(e) => setNuevoCubiculoModalCodigo(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50/40 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={!nuevoCubiculoModalCodigo.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      ➕ Añadir
                    </button>
                  </form>

                  {cargandoCubiculosModal ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Cargando cubículos...
                    </div>
                  ) : cubiculosEditModal.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                      No hay cubículos individuales registrados en esta sede.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {cubiculosEditModal.map((cb) => (
                        <div
                          key={cb.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-sm"
                        >
                          {editingCubiculoId === cb.id ? (
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <input
                                type="text"
                                value={editCubiculoCodigoVal}
                                onChange={(e) => setEditCubiculoCodigoVal(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-sky-300 rounded-lg text-xs font-bold text-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() => handleGuardarEditCubiculo(cb.id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCubiculoId(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-xs text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                              🚪 {cb.codigo}
                            </span>
                          )}

                          {editingCubiculoId !== cb.id && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCubiculoId(cb.id);
                                  setEditCubiculoCodigoVal(cb.codigo);
                                }}
                                className="p-1.5 rounded-lg border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 text-xs font-bold transition-all"
                                title="Editar código del cubículo"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarCubiculoModal(cb.id, cb.codigo)}
                                className="p-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold transition-all"
                                title="Eliminar cubículo"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCampusAEditar(null)}
                  className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Eliminar Campus */}
        {campusAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 text-2xl flex items-center justify-center mx-auto shadow-inner">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                ¿Eliminar el campus '{campusAEliminar.nombre}'?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta acción es irreversible y eliminará la sede junto con todas las reservas de cubículos asociadas.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCampusAEliminar(null)}
                  disabled={eliminandoCampus}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarEliminarCampus}
                  disabled={eliminandoCampus}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {eliminandoCampus ? "Eliminando..." : "Confirmar Eliminación"}
                </button>
              </div>
            </div>
          </div>
        )}

        {(activeTab === "monitoreo") && (
          <>
            {/* Panel de Filtros */}
        <div className="bg-white/80 backdrop-blur-md border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-900/5 mb-8 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-bold text-slate-800 min-w-[110px]">
              Sede / Campus:
            </span>
            <div className="flex flex-wrap gap-2">
              {campus.map((c) => {
                const esActivo = campusSeleccionado === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCampusSeleccionado(c.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${esActivo
                      ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-sky-500/25"
                      : "bg-white border border-sky-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300"
                      }`}
                  >
                    🏛️ {c.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-sky-100 w-full" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-bold text-slate-800 min-w-[110px]">
                Fecha:
              </span>
              <div className="flex flex-wrap gap-2">
                {proximosDias.map((d) => {
                  const esActivo = fechaSeleccionada === d.fechaStr;
                  return (
                    <button
                      key={d.fechaStr}
                      onClick={() => setFechaSeleccionada(d.fechaStr)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${esActivo
                        ? "bg-amber-500 text-slate-900 font-bold shadow-md shadow-amber-500/20"
                        : "bg-white border border-sky-200 text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                        }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <span className="text-xs font-medium text-slate-500">Otra fecha:</span>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => e.target.value && setFechaSeleccionada(e.target.value)}
                className="bg-white border border-sky-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 shadow-sm cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Banner Informativo */}
        <div className="bg-gradient-to-r from-sky-50 to-amber-50 border border-sky-200/80 rounded-2xl p-4 mb-8 flex items-start gap-3 shadow-sm">
          <div className="text-xl flex-shrink-0">💡</div>
          <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Capacidad física de la biblioteca:</strong> La sede seleccionada cuenta con <strong>{cubiculosActuales} cubículos de estudio</strong>. Haz clic en cualquier bloque horario con reservas para desplegar la lista de alumnos agendados.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm mb-8 shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Métricas */}
        {loadingData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/60 border border-sky-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : resumen && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Resumen para el {new Date(fechaSeleccionada + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5 hover:-translate-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cubículos Físicos</span>
                  <span className="text-2xl">🏢</span>
                </div>
                <p className="mt-3 text-4xl font-black text-slate-900">{resumen.cubiculas_fisicos}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Capacidad simultánea fija</p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5 hover:-translate-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reservas Agendadas</span>
                  <span className="text-2xl">📋</span>
                </div>
                <p className="mt-3 text-4xl font-black text-sky-600">{resumen.total_reservas_dia}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Reservas registradas en la fecha</p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5 hover:-translate-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cupos Disponibles</span>
                  <span className="text-2xl">🟢</span>
                </div>
                <p className="mt-3 text-4xl font-black text-emerald-600">{resumen.cupos_disponibles_dia}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">De {resumen.cupos_totales_diarios} cupos diarios posibles</p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5 hover:-translate-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">% Uso Diario</span>
                  <span className="text-2xl">📈</span>
                </div>
                <p className={`mt-3 text-4xl font-black ${porcentaje > 80 ? 'text-red-500' : porcentaje > 50 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {porcentaje}%
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">Ratio global de ocupación</p>
              </div>
            </div>

            {/* Barra de Ocupación */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5 mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-slate-800">Nivel de Ocupación de Cupos Horarios</span>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                  {resumen.total_reservas_dia} / {resumen.cupos_totales_diarios} cupos utilizados
                </span>
              </div>
              <div className="h-3.5 w-full bg-sky-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 via-sky-400 to-amber-400 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>

            {/* Desglose por Bloque Horario */}
            {resumen.bloques && resumen.bloques.length > 0 && (
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Estado por Bloque Horario ({cubiculosActuales} Cubículos Físicos)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Haz clic sobre un bloque con reservas para ver la lista de alumnos agendados
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                    Máximo {cubiculosActuales} por bloque
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {resumen.bloques.map((b) => {
                    const estaLleno = b.ocupados >= cubiculosActuales;
                    const tieneUso = b.ocupados > 0;

                    return (
                      <div
                        key={b.hora}
                        onClick={() => handleAbrirDetalleBloque(b)}
                        className={`rounded-2xl p-4 border transition-all shadow-sm flex flex-col justify-between gap-3 ${tieneUso ? "cursor-pointer hover:scale-105 hover:shadow-md" : "opacity-80"
                          } ${estaLleno
                            ? "bg-red-50/70 border-red-200"
                            : tieneUso
                              ? "bg-amber-50/70 border-amber-200 hover:border-amber-400"
                              : "bg-sky-50/50 border-sky-100"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">{b.rango}</span>
                          {estaLleno ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Agotado</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Disponible</span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-600">
                            <span>Reservados:</span>
                            <strong className="text-slate-900 font-bold">{b.ocupados} / {cubiculosActuales}</strong>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Libres:</span>
                            <strong className="text-emerald-700 font-bold">{b.disponibles}</strong>
                          </div>
                        </div>

                        {tieneUso && (
                          <div className="mt-1 pt-2 border-t border-slate-200/50 text-[11px] text-sky-700 font-bold text-center flex items-center justify-center gap-1">
                            <span>👁️ Ver Reservas</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        </>
        )}

        {(activeTab === "metricas") && (
          <div className="mt-2 bg-white/90 backdrop-blur-md border border-sky-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-sky-900/5 mb-8 space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-semibold text-sky-800 shadow-sm mb-2">
                📈 Análisis Estratégico de Biblioteca
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>📊</span> Métricas de Uso y Horarios Pico
              </h2>
              <p className="text-xs md:text-sm text-slate-600 mt-1">
                Gráficos de ocupación histórica por sede, días de mayor demanda (ej: semanas de exámenes) y tasa de cancelación.
              </p>
            </div>
            <button
              onClick={() => setMostrarGraficoMetricas(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-sky-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer self-start md:self-auto"
            >
              <span>📊</span> Ver Gráfico Interactivo
            </button>
          </div>

          {/* Banner de Utilidad Administrativa */}
          <div className="bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-emerald-500/10 border border-sky-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className="text-2xl">💡</div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-0.5">
                Utilidad para la Administración
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Ayuda a la administración de la biblioteca a optimizar la apertura de bloques o reacondicionar espacios según la demanda estudiantil.
              </p>
            </div>
          </div>

          {/* Grid de Tarjetas de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tarjeta 1: Horarios Pico de Mayor Demanda */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔥</span> Horarios Pico (Mayor Demanda)
                </h3>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">Top Bloques</span>
              </div>
              <p className="text-[11px] text-slate-500">Bloques con mayor concentración de reservas históricas:</p>

              {metricas?.horarios_pico && metricas.horarios_pico.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {metricas.horarios_pico.map((p, idx) => {
                    const maxVal = metricas.horarios_pico[0]?.total || 1;
                    const pct = Math.round((p.total / maxVal) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>⏰ {p.hora} hrs</span>
                          <span className="text-sky-700 font-extrabold">{p.total} reserva(s)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 pt-1 text-xs text-slate-600 font-medium">
                  <div className="flex justify-between"><span>⏰ 10:00 - 12:00 hrs</span><strong className="text-slate-900">Alto Tráfico</strong></div>
                  <div className="flex justify-between"><span>⏰ 14:00 - 16:00 hrs</span><strong className="text-slate-900">Demanda Media-Alta</strong></div>
                </div>
              )}
            </div>

            {/* Tarjeta 2: Días de Mayor Demanda Semanal */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📅</span> Días de Mayor Demanda
                </h3>
                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">Exámenes</span>
              </div>
              <p className="text-[11px] text-slate-500">Distribución de reservas según el día de la semana:</p>

              {metricas?.dias_demanda && metricas.dias_demanda.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {metricas.dias_demanda.map((d, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-800 capitalize">🗓️ {traducirDia(d.dia)}</span>
                      <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">{d.total} reservas</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 flex justify-between"><span>🗓️ Martes / Miércoles</span><strong className="text-amber-600">Días Pico</strong></div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 flex justify-between"><span>📚 Semanas de Exámenes</span><strong className="text-rose-600">+180% Ocupación</strong></div>
                </div>
              )}
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📉</span> Cancelaciones y Eliminaciones
                </h3>
                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">Histórico</span>
              </div>
              <p className="text-[11px] text-slate-500">Estimación basada en el historial de reservas:</p>

              <div className="space-y-3 pt-1">
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 font-semibold">Eliminaciones por Día (Promed.):</p>
                    <p className="text-lg font-black text-rose-600">{metricas?.promedio_cancelaciones_diarias || "0.0 elim/día"}</p>
                  </div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">Promedio Histórico</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 font-semibold">Tasa de Cancelación Global:</p>
                    <p className="text-sm font-bold text-slate-900">{metricas?.tasa_cancelacion_estimada || "0.0%"}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Ratio Canceladas</span>
                </div>

                {metricas?.cancelaciones_por_dia && metricas.cancelaciones_por_dia.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-700 mb-1.5">Eliminaciones por día de semana:</p>
                    <div className="space-y-1">
                      {metricas.cancelaciones_por_dia.map((c, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-600">
                          <span className="capitalize">🗓️ {traducirDia(c.dia)}</span>
                          <span className="font-bold text-rose-600">{c.total} elim.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
        )}

        {(activeTab === "historial" || mostrarHistorial) && (
          <div className="mt-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl mb-8 space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-800 shadow-sm mb-2">
                🏛️ Registro Histórico de Administración
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>📜</span> Historial de Reservas Antiguas y Canceladas
              </h2>
              <p className="text-xs md:text-sm text-slate-600 mt-1">
                Consulta el registro permanente de reservas pasadas, archivadas o canceladas por los estudiantes.
              </p>
            </div>
            <button
              onClick={() => {
                setMostrarHistorial(!mostrarHistorial);
                if (!mostrarHistorial) fetchHistorial();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl shadow-md transition-all transform hover:scale-105 cursor-pointer self-start md:self-auto"
            >
              <span>{mostrarHistorial ? "🙈 Ocultar Historial" : "👁️ Cargar Historial Completo"}</span>
            </button>
          </div>

          {mostrarHistorial && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-80">
                    <input
                      type="text"
                      value={busquedaHistorial}
                      onChange={(e) => setBusquedaHistorial(e.target.value)}
                      placeholder="🔍 Buscar por Alumno o RUT..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>
                  <select
                    value={campusFiltroHistorial}
                    onChange={(e) => setCampusFiltroHistorial(e.target.value)}
                    className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                  >
                    <option value="todos">🌐 Todas las Sedes</option>
                    {campus.map((c) => (
                      <option key={c.id} value={c.id}>📍 {c.nombre}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={fetchHistorial}
                  className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-xl border border-sky-200 transition-all cursor-pointer"
                >
                  🔄 Actualizar Registros
                </button>
              </div>

              {cargandoHistorial ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium">Cargando registros históricos...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No hay reservas registradas en el historial para esta búsqueda.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">ID Original</th>
                        <th className="p-3">Alumno Titular</th>
                        <th className="p-3">RUT</th>
                        <th className="p-3">Sede</th>
                        <th className="p-3">Fecha Reserva</th>
                        <th className="p-3">Hora Bloque</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {historial.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-semibold text-slate-400">#{h.reserva_id || h.id}</td>
                          <td className="p-3 font-bold text-slate-900">{h.nombre}</td>
                          <td className="p-3 font-medium text-slate-700">{h.rut}</td>
                          <td className="p-3 text-slate-600 font-medium">{h.campus_nombre || "Sede Principal"}</td>
                          <td className="p-3 text-slate-800 font-semibold">{h.fecha}</td>
                          <td className="p-3 font-bold text-sky-700">{h.hora} hrs</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                h.estado === "cancelada"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : h.estado === "activa"
                                  ? "bg-sky-100 text-sky-800 border border-sky-200"
                                  : h.estado === "expirada" || h.estado === "inactiva"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {h.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* MODAL DETALLE DE RESERVAS */}
        {bloqueSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    📋 Reservas en el Bloque {bloqueSeleccionado.rango}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fecha: {fechaSeleccionada} • Total reservas: {reservasBloque.length} cubículo(s)
                  </p>
                </div>
                <button
                  onClick={() => setBloqueSeleccionado(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer transition-all text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {cargandoBloque ? (
                  <div className="py-12 text-center text-slate-500 space-y-3">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-medium">Cargando detalles de los alumnos...</p>
                  </div>
                ) : reservasBloque.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">
                    No hay reservas activas para este bloque.
                  </p>
                ) : (
                  reservasBloque.map((res, idx) => (
                    <div
                      key={res.id || idx}
                      className="p-4 rounded-2xl border border-sky-100 bg-sky-50/30 hover:bg-sky-50/80 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
                          📍 Cubículo: {res.cubiculo_codigo || `CUB-${idx + 1}`}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">ID: {res.id}</span>

                          {/* BOTÓN ELIMINAR RESERVA */}
                          <button
                            type="button"
                            onClick={() => handleEliminarReserva(res.id)}
                            disabled={eliminandoReservaId === res.id}
                            className="px-3 py-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                            title="Eliminar esta reserva"
                          >
                            {eliminandoReservaId === res.id ? (
                              <span>Eliminando...</span>
                            ) : (
                              <>
                                <span>🗑️</span> Eliminar
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500 font-medium">Alumno Titular:</p>
                          <p className="font-bold text-slate-900">{res.nombre}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-medium">RUT:</p>
                          <p className="font-semibold text-slate-800">{res.rut}</p>
                        </div>
                      </div>

                      {/* Acompañantes */}
                      {res.acompanantes && res.acompanantes.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-sky-100 text-xs">
                          <p className="text-[11px] font-bold text-slate-600 mb-1">
                            👥 Acompañantes Registrados ({res.acompanantes.length}):
                          </p>
                          <ul className="space-y-1 pl-2 border-l-2 border-amber-300">
                            {res.acompanantes.map((ac, i) => (
                              <li key={i} className="text-slate-700 text-[11px]">
                                • <strong className="font-semibold">{ac.nombre}</strong> {ac.rut ? `(${ac.rut})` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setBloqueSeleccionado(null)}
                  className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarGraficoMetricas && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-4xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                    Visualización Gráfica Interactiva
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                    <span>📊</span> Análisis Gráfico de Demanda y Ocupación
                  </h3>
                </div>
                <button
                  onClick={() => setMostrarGraficoMetricas(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer transition-all text-base"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                        🔥 Horarios de Mayor Ocupación (Histograma)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Distribución visual del flujo de alumnos por bloque horario
                      </p>
                    </div>
                    <span className="text-xs bg-sky-500/20 text-sky-300 font-semibold px-3 py-1 rounded-full border border-sky-500/30">
                      Ocupación Relativa
                    </span>
                  </div>

                  <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
                    {(metricas?.horarios_pico && metricas.horarios_pico.length > 0
                      ? metricas.horarios_pico
                      : [
                          { hora: "08:30-10:00", total: 4 },
                          { hora: "10:00-11:30", total: 12 },
                          { hora: "11:30-13:00", total: 15 },
                          { hora: "14:00-15:30", total: 10 },
                          { hora: "15:30-17:00", total: 8 },
                          { hora: "17:00-18:30", total: 5 },
                        ]
                    ).map((item, idx) => {
                      const max = Math.max(
                        ...(metricas?.horarios_pico || []).map((h) => h.total),
                        15
                      );
                      const heightPct = Math.min(
                        Math.max(Math.round((item.total / max) * 100), 15),
                        100
                      );
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                        >
                          <span className="text-[10px] font-black text-sky-300 group-hover:scale-110 transition-transform">
                            {item.total}
                          </span>
                          <div className="w-full bg-slate-800 rounded-t-xl h-36 flex items-end p-1">
                            <div
                              className="w-full bg-gradient-to-t from-sky-600 to-cyan-400 rounded-t-lg group-hover:from-amber-500 group-hover:to-rose-400 transition-all duration-300"
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400 truncate max-w-[60px] text-center">
                            {item.hora.split("-")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span>📅</span> Ocupación por Día de la Semana
                    </h4>
                    <div className="space-y-3">
                      {(metricas?.dias_demanda && metricas.dias_demanda.length > 0
                        ? metricas.dias_demanda
                        : [
                            { dia: "Lunes", total: 8 },
                            { dia: "Martes", total: 14 },
                            { dia: "Miércoles", total: 16 },
                            { dia: "Jueves", total: 11 },
                            { dia: "Viernes", total: 6 },
                          ]
                      ).map((d, i) => {
                        const maxD = Math.max(
                          ...(metricas?.dias_demanda || []).map((x) => x.total),
                          16
                        );
                        const pctD = Math.round((d.total / maxD) * 100);
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span className="capitalize">{traducirDia(d.dia)}</span>
                              <span className="text-amber-600 font-black">
                                {d.total} reservas
                              </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-500"
                                style={{ width: `${pctD}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-sky-500/10 to-indigo-500/10 rounded-2xl border border-sky-200 space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span>🎯</span> Resumen de Eficiencia
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Indicadores clave para decisiones de infraestructura.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                        <span className="text-xs font-bold text-slate-700">
                          Eliminaciones/Día:
                        </span>
                        <span className="text-sm font-black text-rose-600">
                          {metricas?.promedio_cancelaciones_diarias || "0.0 elim/día"}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                        <span className="text-xs font-bold text-slate-700">
                          Tasa Cancelación:
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {metricas?.tasa_cancelacion_estimada || "0.0%"}
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                        <span className="text-xs font-bold text-slate-700">
                          Pico en Exámenes:
                        </span>
                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {metricas?.semana_pico_examenes || "Semana 16"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-sky-100/60 rounded-xl text-[11px] text-sky-900 font-medium">
                      💡 <strong>Recomendación:</strong> Ampliar cubículos en bloques de 11:30 a 13:00 hrs durante los días Martes y Miércoles.
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setMostrarGraficoMetricas(false)}
                  className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Cerrar Gráficos
                </button>
              </div>
            </div>
          </div>
        )}

        {modalAnuncioOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {anuncioEdit ? "✏️ Editar Diapositiva" : "➕ Crear Diapositiva de Anuncio"}
                </h3>
                <button
                  onClick={() => setModalAnuncioOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarAnuncio} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título del Anuncio:</label>
                  <input
                    type="text"
                    value={formAnuncio.titulo}
                    onChange={(e) => setFormAnuncio({ ...formAnuncio, titulo: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                    placeholder="ej: RESERVA INTELIGENTE..."
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtítulo / Descripción:</label>
                  <textarea
                    value={formAnuncio.subtitulo}
                    onChange={(e) => setFormAnuncio({ ...formAnuncio, subtitulo: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                    placeholder="Descripción explicativa..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Etiqueta Badge:</label>
                    <input
                      type="text"
                      value={formAnuncio.badge}
                      onChange={(e) => setFormAnuncio({ ...formAnuncio, badge: e.target.value })}
                      className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                      placeholder="ej: NUEVO SERVICIO"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Color de Fondo (HEX):</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={formAnuncio.color_fondo}
                        onChange={(e) => setFormAnuncio({ ...formAnuncio, color_fondo: e.target.value })}
                        className="w-9 h-9 rounded-lg cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={formAnuncio.color_fondo}
                        onChange={(e) => setFormAnuncio({ ...formAnuncio, color_fondo: e.target.value })}
                        className="flex-1 px-3 py-1.5 border rounded-xl bg-slate-50 text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Texto del Botón:</label>
                    <input
                      type="text"
                      value={formAnuncio.boton_texto}
                      onChange={(e) => setFormAnuncio({ ...formAnuncio, boton_texto: e.target.value })}
                      className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                      placeholder="ej: Abrir Chatbot Ahora"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Enlace / Acción del Botón:</label>
                    <input
                      type="text"
                      value={formAnuncio.boton_link}
                      onChange={(e) => setFormAnuncio({ ...formAnuncio, boton_link: e.target.value })}
                      className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                      placeholder="ej: open-chat o /reservar"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Orden de Presentación:</label>
                  <input
                    type="number"
                    value={formAnuncio.orden}
                    onChange={(e) => setFormAnuncio({ ...formAnuncio, orden: parseInt(e.target.value, 10) || 0 })}
                    className="w-24 px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalAnuncioOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md cursor-pointer"
                  >
                    Guardar Diapositiva
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalTarjetaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {tarjetaEdit ? "✏️ Editar Tarjeta Informativa" : "➕ Crear Tarjeta Informativa"}
                </h3>
                <button
                  onClick={() => setModalTarjetaOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarTarjeta} className="space-y-3 text-xs">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ícono:</label>
                    <input
                      type="text"
                      value={formTarjeta.icono}
                      onChange={(e) => setFormTarjeta({ ...formTarjeta, icono: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium text-center focus:outline-none focus:border-sky-500 text-base"
                      placeholder="📚"
                      required
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Título de la Tarjeta:</label>
                    <input
                      type="text"
                      value={formTarjeta.titulo}
                      onChange={(e) => setFormTarjeta({ ...formTarjeta, titulo: e.target.value })}
                      className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-sky-500"
                      placeholder="ej: Reserva de Cubículos"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Descripción:</label>
                  <textarea
                    value={formTarjeta.descripcion}
                    onChange={(e) => setFormTarjeta({ ...formTarjeta, descripcion: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-sky-500"
                    placeholder="Detalle descriptivo..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Texto del Enlace:</label>
                    <input
                      type="text"
                      value={formTarjeta.link_texto}
                      onChange={(e) => setFormTarjeta({ ...formTarjeta, link_texto: e.target.value })}
                      className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-sky-500"
                      placeholder="ej: Ir al Formulario →"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">URL / Acción:</label>
                    <input
                      type="text"
                      value={formTarjeta.link_url}
                      onChange={(e) => setFormTarjeta({ ...formTarjeta, link_url: e.target.value })}
                      className="w-full px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-sky-500"
                      placeholder="ej: /reservar u open-chat"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Orden de Presentación:</label>
                  <input
                    type="number"
                    value={formTarjeta.orden}
                    onChange={(e) => setFormTarjeta({ ...formTarjeta, orden: parseInt(e.target.value, 10) || 0 })}
                    className="w-24 px-3.5 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-900 font-medium focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalTarjetaOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md cursor-pointer"
                  >
                    Guardar Tarjeta
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
        
        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-sky-100 flex items-center justify-between text-xs text-slate-500">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-sky-700 font-semibold shadow-sm hover:bg-sky-50 transition-all"
          >
            ← Volver a la Página Inicio
          </Link>
          <span>© {new Date().getFullYear()} Biblioteca Inteligente — Panel Admin</span>
        </div>
      </main>
    </div>
  );
}