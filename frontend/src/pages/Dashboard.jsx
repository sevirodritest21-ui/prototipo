import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete, BASE_URL } from "../services/api";
import { queryClient } from "../services/queries";
import logoUCT from "../assets/logobibliovice.png";
import * as XLSX from "xlsx";

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

  const [cubiculosCampus, setCubiculosCampus] = useState([]);
  const [cargandoCubiculosCampus, setCargandoCubiculosCampus] = useState(false);
  const [nuevoCodigoCubiculo, setNuevoCodigoCubiculo] = useState("");
  const [campusDestinoCubiculo, setCampusDestinoCubiculo] = useState("");
  const [creandoCubiculo, setCreandoCubiculo] = useState(false);

  const hoyStr = new Date().toISOString().split("T")[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
  const [activeTab, setActiveTab] = useState("monitoreo");
  const [busquedaOrdenes, setBusquedaOrdenes] = useState("");
  const [busquedaCubiculos, setBusquedaCubiculos] = useState("");
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [miniCalMes, setMiniCalMes] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [mostrarCronogramaCompleto, setMostrarCronogramaCompleto] = useState(true);

  const [modalMantenimiento, setModalMantenimiento] = useState({
    open: false,
    cubiculo: null,
    fecha: hoyStr,
    motivo: "",
    mantenimientos: [],
    cargando: false,
    guardando: false,
  });

  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);
  const [reservasBloque, setReservasBloque] = useState([]);
  const [cargandoBloque, setCargandoBloque] = useState(false);
  const [eliminandoReservaId, setEliminandoReservaId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, titulo: "", mensaje: "", onConfirm: null });
  const [toastNotificacion, setToastNotificacion] = useState({ tipo: "", texto: "" });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [ayudaModalOpen, setAyudaModalOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [modoCamara, setModoCamara] = useState("stream");
  const [camaraTimestamp, setCamaraTimestamp] = useState(Date.now());
  const [loopTimestamp, setLoopTimestamp] = useState(Date.now());
  const [abriendoPuertaCamara, setAbriendoPuertaCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState(false);

  useEffect(() => {
    if (activeTab === "camara") {
      setErrorCamara(false);
      setCamaraTimestamp(Date.now());
      setLoopTimestamp(Date.now());
    }
  }, [activeTab]);

  useEffect(() => {
    if (modoCamara !== "loop" || activeTab !== "camara") return;
    const watchdog = setTimeout(() => {
      setLoopTimestamp(Date.now());
    }, 3000);
    return () => clearTimeout(watchdog);
  }, [loopTimestamp, modoCamara, activeTab]);

  useEffect(() => {
    if (errorCamara && activeTab === "camara") {
      const timer = setTimeout(() => {
        setErrorCamara(false);
        setCamaraTimestamp(Date.now());
        setLoopTimestamp(Date.now());
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [errorCamara, activeTab]);

  const handleAbrirPuertaManualCamara = async () => {
    setAbriendoPuertaCamara(true);
    try {
      await apiPost("/api/hikcentral/door/open", { door_code: "1" });
      setToastNotificacion({ tipo: "exito", texto: "Comando de apertura ejecutado con éxito en el relé 1." });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al abrir puerta: " + (err.message || "Error") });
    } finally {
      setAbriendoPuertaCamara(false);
    }
  };

  useEffect(() => {
    if (toastNotificacion.texto) {
      const timer = setTimeout(() => {
        setToastNotificacion({ tipo: "", texto: "" });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [toastNotificacion.texto]);

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

  const [cmsFaqs, setCmsFaqs] = useState([]);
  const [modalFaqOpen, setModalFaqOpen] = useState(false);
  const [faqEdit, setFaqEdit] = useState(null);
  const [formFaq, setFormFaq] = useState({
    pregunta: "", respuesta: "", categoria: "Reservas", orden: 0
  });

  const fetchCMS = async () => {
    setCargandoCMS(true);
    try {
      const [anunciosData, tarjetasData, faqsData] = await Promise.all([
        apiGet("/api/cms/anuncios"),
        apiGet("/api/cms/tarjetas"),
        apiGet("/api/cms/faqs")
      ]);
      setCmsAnuncios(anunciosData || []);
      setCmsTarjetas(tarjetasData || []);
      setCmsFaqs(faqsData || []);
      queryClient.invalidateQueries({ queryKey: ["cms"] });
    } catch {
      setCmsAnuncios([]);
      setCmsTarjetas([]);
      setCmsFaqs([]);
    } finally {
      setCargandoCMS(false);
    }
  };

  useEffect(() => {
    fetchCMS();
    fetchDiasBloqueados();
    fetchIncidencias();
    fetchSolicitudesTalleres();
    fetchHistorial(1, 10);
  }, []);

  useEffect(() => {
    if (activeTab === "historial" && historial.length === 0) {
      fetchHistorial();
    }
    if (activeTab === "calendario" && diasBloqueados.length === 0) {
      fetchDiasBloqueados();
    }
    if (activeTab === "cms" && cmsAnuncios.length === 0 && cmsTarjetas.length === 0) {
      fetchCMS();
    }
    if (activeTab === "sanciones") {
      fetchSancionados();
    }
    if (activeTab === "incidencias" || activeTab === "sedes") {
      fetchIncidencias();
    }
    if (activeTab === "talleres") {
      fetchSolicitudesTalleres();
    }
  }, [activeTab]);

  const [sancionados, setSancionados] = useState([]);
  const [cargandoSancionados, setCargandoSancionados] = useState(false);
  const [busquedaSancionados, setBusquedaSancionados] = useState("");

  const [incidencias, setIncidencias] = useState([]);
  const [cargandoIncidencias, setCargandoIncidencias] = useState(false);
  const [filtroEstadoIncidencia, setFiltroEstadoIncidencia] = useState("todos");
  const [busquedaIncidencia, setBusquedaIncidencia] = useState("");
  const [alertaIncidenciasPopUp, setAlertaIncidenciasPopUp] = useState(false);
  const [incidenciasCriticasVencidas, setIncidenciasCriticasVencidas] = useState([]);
  const [talleresPendientesVencidos, setTalleresPendientesVencidos] = useState([]);
  const [filtroAlertaModal, setFiltroAlertaModal] = useState("todos");

  const calcularDiasSinResolverIncidencia = (fechaStr) => {
    if (!fechaStr) return 0;
    const iso = fechaStr.includes("T") ? fechaStr : fechaStr.replace(" ", "T");
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 0;
    const ahora = new Date();
    const diffMs = ahora.getTime() - d.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);
    const fechaIncDia = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const hoyDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    const diasCalendario = Math.round((hoyDia - fechaIncDia) / (1000 * 60 * 60 * 24));
    return Math.max(diasCalendario, Math.floor(diffHoras / 24));
  };

  const fetchIncidencias = async () => {
    setCargandoIncidencias(true);
    try {
      const data = await apiGet("/api/admin/incidencias");
      const lista = data || [];
      setIncidencias(lista);

      const vencidas = lista.filter((inc) => {
        if (inc.estado === "resuelta") return false;
        return calcularDiasSinResolverIncidencia(inc.created_at) >= 2;
      });

      setIncidenciasCriticasVencidas(vencidas);
    } catch {
      setIncidencias([]);
      setIncidenciasCriticasVencidas([]);
    } finally {
      setCargandoIncidencias(false);
    }
  };

  const handleCambiarEstadoIncidencia = async (incidenciaId, nuevoEstado) => {
    try {
      await apiPut(`/api/admin/incidencias/${incidenciaId}/estado`, {
        estado: nuevoEstado,
        solucion: nuevoEstado === "resuelta" ? "Incidencia revisada y resuelta por administración." : null
      });
      setToastNotificacion({ tipo: "exito", texto: `Incidencia marcada como ${nuevoEstado === "resuelta" ? "resuelta" : nuevoEstado}.` });
      fetchIncidencias();
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al actualizar la incidencia." });
    }
  };

  const [solicitudesTalleres, setSolicitudesTalleres] = useState([]);
  const [cargandoTalleres, setCargandoTalleres] = useState(false);
  const [filtroEstadoTaller, setFiltroEstadoTaller] = useState("");
  const [busquedaTaller, setBusquedaTaller] = useState("");
  const [paginaTalleres, setPaginaTalleres] = useState(1);
  const [limiteTalleres, setLimiteTalleres] = useState(10);

  const fetchSolicitudesTalleres = async () => {
    setCargandoTalleres(true);
    try {
      const q = new URLSearchParams();
      if (filtroEstadoTaller) q.append("estado", filtroEstadoTaller);
      if (busquedaTaller.trim()) q.append("busqueda", busquedaTaller.trim());
      const data = await apiGet(`/api/talleres/solicitudes?${q.toString()}`);
      const lista = data?.solicitudes || [];
      setSolicitudesTalleres(lista);
      setPaginaTalleres(1);

      const vencidos = lista.filter((t) => {
        if (t.estado !== "pendiente") return false;
        return calcularDiasSinResolverIncidencia(t.created_at) >= 2;
      });
      setTalleresPendientesVencidos(vencidos);
    } catch {
      setSolicitudesTalleres([]);
      setTalleresPendientesVencidos([]);
    } finally {
      setCargandoTalleres(false);
    }
  };

  useEffect(() => {
    const yaMostrada = sessionStorage.getItem("alerta_admin_pendientes_mostrada") || sessionStorage.getItem("alerta_incidencias_admin_mostrada");
    const totalVencidos = incidenciasCriticasVencidas.length + talleresPendientesVencidos.length;
    if (totalVencidos > 0 && !yaMostrada) {
      setAlertaIncidenciasPopUp(true);
      sessionStorage.setItem("alerta_admin_pendientes_mostrada", "true");
      sessionStorage.setItem("alerta_incidencias_admin_mostrada", "true");
      setToastNotificacion({
        tipo: "error",
        texto: `⚠️ Hay tareas con retraso: ${incidenciasCriticasVencidas.length} incidencia(s) y ${talleresPendientesVencidos.length} taller(es) con 2+ días sin atención.`
      });
    }
  }, [incidenciasCriticasVencidas, talleresPendientesVencidos]);

  const handleCambiarEstadoTaller = async (id, nuevoEstado) => {
    try {
      await apiPut(`/api/talleres/solicitudes/${id}/estado`, { estado: nuevoEstado });
      setToastNotificacion({ tipo: "exito", texto: `Solicitud #${id} marcada como ${nuevoEstado}.` });
      fetchSolicitudesTalleres();
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: `Error al actualizar: ${err.message || "Error"}` });
    }
  };

  const handleEliminarSolicitudTaller = (id, nombreEstudiante, nombreTaller) => {
    setConfirmModal({
      open: true,
      titulo: "¿Eliminar solicitud de taller?",
      mensaje: `¿Deseas eliminar la solicitud #${id} de "${nombreTaller}" realizada por ${nombreEstudiante}?`,
      onConfirm: async () => {
        try {
          await apiDelete(`/api/talleres/solicitudes/${id}`);
          setToastNotificacion({ tipo: "exito", texto: `Solicitud #${id} eliminada exitosamente.` });
          fetchSolicitudesTalleres();
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: `Error al eliminar: ${err.message || "Error"}` });
        }
      }
    });
  };

  const [modalResponderTaller, setModalResponderTaller] = useState({
    open: false,
    solicitud: null,
    asunto: "",
    mensaje: "",
    nuevoEstado: "pendiente",
    enviando: false,
  });

  const handleAbrirModalResponder = (solicitud) => {
    setModalResponderTaller({
      open: true,
      solicitud,
      asunto: `Coordinación Taller #${solicitud.id}: ${solicitud.taller}`,
      mensaje: `Estimado/a ${solicitud.nombre},\n\nNos comunicamos desde el equipo de Biblioteca de la Universidad Católica de Temuco en relación a tu solicitud para el taller "${solicitud.taller}".\n\n`,
      nuevoEstado: solicitud.estado === "pendiente" ? "aprobado" : (solicitud.estado || "aprobado"),
      enviando: false,
    });
  };

  const handleEnviarRespuestaTaller = async (e) => {
    e.preventDefault();
    if (!modalResponderTaller.solicitud) return;
    if (!modalResponderTaller.asunto.trim() || !modalResponderTaller.mensaje.trim()) {
      setToastNotificacion({ tipo: "error", texto: "Debes completar el asunto y el mensaje." });
      return;
    }
    setModalResponderTaller((prev) => ({ ...prev, enviando: true }));
    try {
      await apiPost(`/api/talleres/solicitudes/${modalResponderTaller.solicitud.id}/responder`, {
        asunto: modalResponderTaller.asunto.trim(),
        mensaje: modalResponderTaller.mensaje.trim(),
        nuevo_estado: modalResponderTaller.nuevoEstado,
      });
      setToastNotificacion({
        tipo: "exito",
        texto: `Respuesta enviada exitosamente a ${modalResponderTaller.solicitud.email} mediante n8n.`,
      });
      setModalResponderTaller({
        open: false,
        solicitud: null,
        asunto: "",
        mensaje: "",
        nuevoEstado: "pendiente",
        enviando: false,
      });
      fetchSolicitudesTalleres();
    } catch (err) {
      setToastNotificacion({
        tipo: "error",
        texto: `Error al enviar respuesta: ${err.message || "Error"}`,
      });
      setModalResponderTaller((prev) => ({ ...prev, enviando: false }));
    }
  };

  const handleMantenimientoDesdeIncidencia = async (inc) => {
    const cubEncontrado = cubiculosCampus.find((c) => c.id === inc.cubiculo_id) || {
      id: inc.cubiculo_id,
      codigo: inc.cubiculo_codigo,
      campus_id: inc.campus_id,
      campus_nombre: inc.campus_nombre
    };
    handleAbrirModalMantenimiento(cubEncontrado);
  };

  const fetchSancionados = async () => {
    setCargandoSancionados(true);
    try {
      const data = await apiGet("/api/admin/sancionados");
      setSancionados(data || []);
    } catch {
      setSancionados([]);
    } finally {
      setCargandoSancionados(false);
    }
  };

  const handleLevantarSancion = (estudiante) => {
    setConfirmModal({
      open: true,
      titulo: "⚖️ Levantar Sanción Disciplinaria",
      mensaje: `¿Estás seguro de que deseas levantar la sanción y justificar las inasistencias de ${estudiante.nombre} (${estudiante.rut})? El estudiante podrá volver a reservar inmediatamente.`,
      onConfirm: async () => {
        try {
          const resp = await apiPost("/api/admin/sancionados/levantar", { rut: estudiante.rut });
          setToastNotificacion({ tipo: "exito", texto: resp.mensaje || "Sanción levantada con éxito." });
          await fetchSancionados();
          if (activeTab === "historial") fetchHistorial();
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.message || "Error al levantar la sanción." });
        }
      },
    });
  };

  const [metricas, setMetricas] = useState(null);
  const [tipoMetricas, setTipoMetricas] = useState("selector");
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [mostrarGraficoMetricas, setMostrarGraficoMetricas] = useState(false);
  const [periodoMetricas, setPeriodoMetricas] = useState("dia");
  const [fechaMetricas, setFechaMetricas] = useState(hoyStr);
  const [campusFiltroMetricas, setCampusFiltroMetricas] = useState("todos");
  const [bloqueHoverMetricas, setBloqueHoverMetricas] = useState(null);
  const [exportandoGraficoPNG, setExportandoGraficoPNG] = useState(false);
  const [exportandoMetricasExcel, setExportandoMetricasExcel] = useState(false);
  const [limiteCarrerasMetricas, setLimiteCarrerasMetricas] = useState(8);
  const [modoGraficoCarrera, setModoGraficoCarrera] = useState("columnas");
  const [carreraHoverMetricas, setCarreraHoverMetricas] = useState(null);
  const [busquedaCarreraMetricas, setBusquedaCarreraMetricas] = useState("");
  const [ordenCarrerasMetricas, setOrdenCarrerasMetricas] = useState("total");

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(true);
  const [campusFiltroHistorial, setCampusFiltroHistorial] = useState("todos");
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState("todos");
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [limiteHistorial, setLimiteHistorial] = useState(25);
  const [totalHistorial, setTotalHistorial] = useState(0);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [limpiandoHistorial, setLimpiandoHistorial] = useState(false);

  const [diasBloqueados, setDiasBloqueados] = useState([]);
  const [cargandoBloqueos, setCargandoBloqueos] = useState(false);
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);
  const [formBloqueo, setFormBloqueo] = useState({
    fecha: "",
    motivo: "Día bloqueado administrativamente",
    campus_id: ""
  });

  const fetchDiasBloqueados = async () => {
    setCargandoBloqueos(true);
    try {
      const data = await apiGet("/api/calendario/bloqueos");
      setDiasBloqueados(data || []);
      queryClient.invalidateQueries({ queryKey: ["calendario", "bloqueos"] });
    } catch {
      setDiasBloqueados([]);
    } finally {
      setCargandoBloqueos(false);
    }
  };

  const handleCrearBloqueo = async (e) => {
    e.preventDefault();
    if (!formBloqueo.fecha) return;
    setGuardandoBloqueo(true);
    try {
      await apiPost("/api/calendario/bloqueos", {
        fecha: formBloqueo.fecha,
        motivo: formBloqueo.motivo.trim() || "Día bloqueado administrativamente",
        campus_id: formBloqueo.campus_id ? parseInt(formBloqueo.campus_id, 10) : null
      });
      setToastNotificacion({ tipo: "exito", texto: "Día bloqueado exitosamente en el calendario." });
      setFormBloqueo({ fecha: "", motivo: "Día bloqueado administrativamente", campus_id: "" });
      await fetchDiasBloqueados();
      window.dispatchEvent(new CustomEvent("reservaActualizada"));
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.detail || err.message || "Error al bloquear la fecha" });
    } finally {
      setGuardandoBloqueo(false);
    }
  };

  const handleEliminarBloqueo = (id, fecha, campusNom) => {
    setConfirmModal({
      open: true,
      titulo: "Desbloquear Fecha",
      mensaje: `¿Deseas desbloquear el día ${fecha} (${campusNom || "Todas las sedes"}) para permitir reservas de estudiantes?`,
      onConfirm: async () => {
        try {
          await apiDelete(`/api/calendario/bloqueos/${id}`);
          setToastNotificacion({ tipo: "exito", texto: "Día desbloqueado con éxito." });
          await fetchDiasBloqueados();
          window.dispatchEvent(new CustomEvent("reservaActualizada"));
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.detail || err.message || "Error al desbloquear" });
        }
      }
    });
  };

  const traducirDia = (d) => {
    if (!d) return "";
    const map = {
      monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles",
      thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo"
    };
    return map[String(d).trim().toLowerCase()] || d;
  };

  const fetchHistorial = async (pagina = paginaHistorial, limite = limiteHistorial, estadoFiltro = filtroEstadoHistorial) => {
    setCargandoHistorial(true);
    try {
      const params = new URLSearchParams();
      if (campusFiltroHistorial && campusFiltroHistorial !== "todos") {
        params.append("campus_id", campusFiltroHistorial);
      }
      if (busquedaHistorial) params.append("busqueda", busquedaHistorial);
      if (estadoFiltro && estadoFiltro !== "todos") {
        params.append("estado", estadoFiltro);
      }
      params.append("limit", String(limite));
      params.append("offset", String((pagina - 1) * limite));

      const data = await apiGet(`/api/dashboard/historial?${params.toString()}`);
      const registros = Array.isArray(data) ? data : (data?.registros || []);
      const total = typeof data?.total === "number" ? data.total : registros.length;
      setHistorial(registros);
      setTotalHistorial(total);
    } catch {
      setHistorial([]);
      setTotalHistorial(0);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const handleDescargarExcelHistorial = async () => {
    setExportandoExcel(true);
    try {
      const params = new URLSearchParams();
      if (campusFiltroHistorial && campusFiltroHistorial !== "todos") {
        params.append("campus_id", campusFiltroHistorial);
      }
      if (busquedaHistorial) params.append("busqueda", busquedaHistorial);
      if (filtroEstadoHistorial && filtroEstadoHistorial !== "todos") {
        params.append("estado", filtroEstadoHistorial);
      }
      params.append("limit", "10000");
      params.append("offset", "0");

      const data = await apiGet(`/api/dashboard/historial?${params.toString()}`);
      const registros = Array.isArray(data) ? data : (data?.registros || []);

      if (!registros || registros.length === 0) {
        setToastNotificacion({ tipo: "error", texto: "No hay registros en el historial para exportar." });
        return;
      }

      const filasExcel = registros.map((h, index) => ({
        "N°": index + 1,
        "ID Reserva": h.reserva_id || h.id,
        "Estudiante": h.nombre,
        "RUT": h.rut,
        "Carrera": h.carrera || "General",
        "Sede / Campus": h.campus_nombre || "General",
        "Fecha Reserva": h.fecha,
        "Horario": h.hora,
        "Estado": (() => {
          const est = (h.estado || "").toLowerCase();
          if (est === "inasistencia") return "INASISTENCIA";
          if (est === "cancelada") return "CANCELADA POR ADMIN";
          if (est === "liberada") return "LIBERADA POR ESTUDIANTE";
          if (est === "completada" || est === "expirada") return "COMPLETADA CON ÉXITO";
          if (est === "justificada") return "JUSTIFICADA";
          if (est === "activa") return "ACTIVA";
          return (h.estado || "N/A").toUpperCase();
        })(),
        "Fecha Registro / Archivo": h.fecha_registro || "N/A"
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filasExcel);

      const colWidths = [
        { wch: 6 },
        { wch: 12 },
        { wch: 28 },
        { wch: 14 },
        { wch: 32 },
        { wch: 22 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 24 }
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Historial Reservas");

      const fechaHoy = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Historial_Reservas_UCT_${fechaHoy}.xlsx`);

      setToastNotificacion({ tipo: "exito", texto: `Se descargaron exitosamente ${registros.length} registros en Excel.` });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al exportar el archivo Excel." });
    } finally {
      setExportandoExcel(false);
    }
  };

  const handleLimpiarHistorial = () => {
    setConfirmModal({
      open: true,
      titulo: "⚠️ Limpiar Historial de Reservas",
      mensaje: "¿Estás seguro de que deseas purgar el historial de reservas antiguas y canceladas? Se recomienda descargar el archivo Excel previamente como respaldo. Esta acción no afectará las reservas activas futuras.",
      onConfirm: async () => {
        setLimpiandoHistorial(true);
        try {
          const resp = await apiDelete("/api/dashboard/historial/limpiar");
          setToastNotificacion({ tipo: "exito", texto: resp.mensaje || "Historial purgado con éxito." });
          await fetchHistorial();
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.message || "Error al limpiar el historial." });
        } finally {
          setLimpiandoHistorial(false);
        }
      }
    });
  };

  useEffect(() => {
    if (activeTab === "historial") {
      setPaginaHistorial(1);
      fetchHistorial(1, limiteHistorial);
    }
  }, [campusFiltroHistorial, busquedaHistorial, filtroEstadoHistorial, limiteHistorial, activeTab]);

  // Cargar lista de campus
  const fetchCampus = async () => {
    try {
      const data = await apiGet("/api/campus");
      setCampus(data);
      queryClient.invalidateQueries({ queryKey: ["campus"] });
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

  const fetchCubiculos = async (campusId) => {
    if (!campusId) return;
    setCargandoCubiculosCampus(true);
    try {
      const data = await apiGet(`/api/cubiculos?campus_id=${campusId}&fecha=${fechaSeleccionada}`);
      setCubiculosCampus(data || []);
    } catch {
      setCubiculosCampus([]);
    } finally {
      setCargandoCubiculosCampus(false);
    }
  };

  useEffect(() => {
    fetchCampus();
  }, []);

  useEffect(() => {
    const idAUsar = campusDestinoCubiculo || campusSeleccionado;
    if (idAUsar) {
      fetchCubiculos(idAUsar);
    }
  }, [campusDestinoCubiculo, campusSeleccionado, fechaSeleccionada]);

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

  const fetchMetricas = async (periodo = periodoMetricas, fecha = fechaMetricas, campusId = campusFiltroMetricas) => {
    setCargandoMetricas(true);
    try {
      const params = new URLSearchParams();
      if (periodo) params.append("periodo", periodo);
      if (fecha) params.append("fecha", fecha);
      if (campusId && campusId !== "todos") params.append("campus_id", campusId);
      const data = await apiGet(`/api/dashboard/metricas?${params.toString()}`);
      setMetricas(data);
    } catch {
      setMetricas(null);
    } finally {
      setCargandoMetricas(false);
    }
  };

  useEffect(() => {
    fetchMetricas(periodoMetricas, fechaMetricas, campusFiltroMetricas);
  }, [periodoMetricas, fechaMetricas, campusFiltroMetricas]);

  const cambiarFechaMetricas = (delta) => {
    try {
      const [y, m, d] = (fechaMetricas || hoyStr).split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      if (periodoMetricas === "dia") {
        dt.setDate(dt.getDate() + delta);
      } else if (periodoMetricas === "semana") {
        dt.setDate(dt.getDate() + (delta * 7));
      } else if (periodoMetricas === "mes") {
        dt.setMonth(dt.getMonth() + delta);
      }
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      setFechaMetricas(`${yy}-${mm}-${dd}`);
    } catch {
      setFechaMetricas(hoyStr);
    }
  };

  const handleExportarGraficoPNG = () => {
    setExportandoGraficoPNG(true);
    try {
      const svgEl = document.getElementById("grafico-ocupacion-svg");
      if (!svgEl) {
        setToastNotificacion({ tipo: "error", texto: "No se encontró el gráfico para exportar." });
        setExportandoGraficoPNG(false);
        return;
      }
      const svgClone = svgEl.cloneNode(true);
      const rect = svgEl.getBoundingClientRect();
      const w = Math.max(900, Math.round(rect.width * 2));
      const h = Math.max(480, Math.round(rect.height * 2));
      svgClone.setAttribute("width", w);
      svgClone.setAttribute("height", h);

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const a = document.createElement("a");
        a.download = `Ocupacion_Horarios_UCT_${periodoMetricas}_${fechaMetricas}.png`;
        a.href = canvas.toDataURL("image/png");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setToastNotificacion({ tipo: "exito", texto: "Gráfico exportado exitosamente como imagen PNG." });
        setExportandoGraficoPNG(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setToastNotificacion({ tipo: "error", texto: "Error al renderizar el gráfico a PNG." });
        setExportandoGraficoPNG(false);
      };
      img.src = url;
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al exportar: " + err.message });
      setExportandoGraficoPNG(false);
    }
  };

  const handleExportarMetricasExcel = () => {
    setExportandoMetricasExcel(true);
    try {
      const bloques = metricas?.ocupacion_bloques || [];
      if (!bloques || bloques.length === 0) {
        setToastNotificacion({ tipo: "error", texto: "No hay datos de ocupación disponibles para exportar." });
        setExportandoMetricasExcel(false);
        return;
      }
      const info = metricas?.info_periodo || {};
      const filasExcel = bloques.map((b, idx) => ({
        "N°": idx + 1,
        "Bloque Horario": b.rango,
        "Reservas Registradas": b.total_reservas,
        "Capacidad Máxima": b.capacidad_total,
        "Cupos Libres": b.cupos_disponibles,
        "% Ocupación": `${b.porcentaje_ocupacion}%`,
        "Nivel Demanda": b.nivel_demanda,
        "Sede": info.campus_nombre || "Todas las sedes",
        "Período Evaluado": info.etiqueta || periodoMetricas
      }));
      const ws = XLSX.utils.json_to_sheet(filasExcel);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 22 },
        { wch: 32 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ocupación por Horas");

      const carrerasData = metricas?.reservas_por_carrera || [];
      if (carrerasData.length > 0) {
        const filasCarreras = carrerasData.map((c, idx) => ({
          "N°": idx + 1,
          "Carrera / Programa": c.carrera,
          "Total Reservas": c.total,
          "Reservas Activas": c.actuales,
          "Reservas Históricas": c.historicas,
          "Sede": info.campus_nombre || "Todas las sedes"
        }));
        const wsCarreras = XLSX.utils.json_to_sheet(filasCarreras);
        wsCarreras["!cols"] = [
          { wch: 6 },
          { wch: 40 },
          { wch: 16 },
          { wch: 18 },
          { wch: 20 },
          { wch: 24 }
        ];
        XLSX.utils.book_append_sheet(wb, wsCarreras, "Reservas por Carrera");
      }

      XLSX.writeFile(wb, `Reporte_Ocupacion_Horarios_UCT_${periodoMetricas}_${fechaMetricas}.xlsx`);
      setToastNotificacion({ tipo: "exito", texto: "Planilla Excel generada y descargada exitosamente." });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al exportar a Excel: " + err.message });
    } finally {
      setExportandoMetricasExcel(false);
    }
  };

  const handleExportarMetricasTalleresExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const totalTalleres = solicitudesTalleres.length;
      const pendientesTalleres = solicitudesTalleres.filter((t) => t.estado === "pendiente").length;
      const aprobadosTalleres = solicitudesTalleres.filter((t) => t.estado === "aprobado").length;
      const realizadosTalleres = solicitudesTalleres.filter((t) => t.estado === "realizado").length;
      const rechazadosTalleres = solicitudesTalleres.filter((t) => t.estado === "rechazado").length;
      const resueltosTalleres = aprobadosTalleres + realizadosTalleres;
      const tasaExitoTalleres = totalTalleres > 0 ? Math.round((resueltosTalleres / totalTalleres) * 100) : 0;
      const totalParticipantesTalleres = solicitudesTalleres.reduce((acc, t) => {
        const p = parseInt(t.participantes, 10);
        return acc + (isNaN(p) || p <= 0 ? 1 : p);
      }, 0);
      const presencialTalleres = solicitudesTalleres.filter((t) => (t.modalidad || "").toLowerCase().includes("presencial")).length;
      const virtualTalleres = solicitudesTalleres.filter((t) => (t.modalidad || "").toLowerCase().includes("virtual") || (t.modalidad || "").toLowerCase().includes("online")).length;
      const pctPresencial = totalTalleres > 0 ? Math.round((presencialTalleres / totalTalleres) * 100) : 0;
      const pctVirtual = totalTalleres > 0 ? 100 - pctPresencial : 0;

      const talleresCountMap = {};
      solicitudesTalleres.forEach((t) => {
        const nombre = (t.taller || "Sin especificar").trim();
        talleresCountMap[nombre] = (talleresCountMap[nombre] || 0) + 1;
      });

      const rankingTalleres = Object.entries(talleresCountMap)
        .map(([nombre, count]) => ({
          nombre,
          count,
          pct: totalTalleres > 0 ? Math.round((count / totalTalleres) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      const topTaller = rankingTalleres[0] && rankingTalleres[0].count > 0 ? rankingTalleres[0].nombre : "Sin datos";

      const carrerasTalleresMap = {};
      solicitudesTalleres.forEach((t) => {
        const c = (t.carrera || "Sin carrera informada").trim();
        carrerasTalleresMap[c] = (carrerasTalleresMap[c] || 0) + 1;
      });
      const rankingCarrerasTalleres = Object.entries(carrerasTalleresMap)
        .map(([carrera, count]) => ({
          carrera,
          count,
          pct: totalTalleres > 0 ? Math.round((count / totalTalleres) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      const resumenData = [
        { "Métrica": "Total de Solicitudes Registradas", "Valor": totalTalleres },
        { "Métrica": "Solicitudes Realizadas", "Valor": realizadosTalleres },
        { "Métrica": "Solicitudes Aprobadas", "Valor": aprobadosTalleres },
        { "Métrica": "Solicitudes Pendientes", "Valor": pendientesTalleres },
        { "Métrica": "Solicitudes Rechazadas", "Valor": rechazadosTalleres },
        { "Métrica": "Tasa de Aprobación/Realización", "Valor": `${tasaExitoTalleres}%` },
        { "Métrica": "Participantes Totales Estimados", "Valor": totalParticipantesTalleres },
        { "Métrica": "Modalidad Presencial", "Valor": `${presencialTalleres} (${pctPresencial}%)` },
        { "Métrica": "Modalidad Virtual", "Valor": `${virtualTalleres} (${pctVirtual}%)` },
        { "Métrica": "Taller Más Solicitado", "Valor": topTaller }
      ];
      const wsResumen = XLSX.utils.json_to_sheet(resumenData);
      wsResumen["!cols"] = [{ wch: 35 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen General");

      const talleresSheetData = rankingTalleres.map((t, idx) => ({
        "N°": idx + 1,
        "Taller Especializado": t.nombre,
        "Total Solicitudes": t.count,
        "Porcentaje Demanda": `${t.pct}%`
      }));
      const wsTalleres = XLSX.utils.json_to_sheet(talleresSheetData);
      wsTalleres["!cols"] = [{ wch: 6 }, { wch: 45 }, { wch: 18 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsTalleres, "Demanda por Taller");

      const carrerasSheetData = rankingCarrerasTalleres.map((c, idx) => ({
        "N°": idx + 1,
        "Carrera / Programa": c.carrera,
        "Solicitudes": c.count,
        "Porcentaje": `${c.pct}%`
      }));
      const wsCarreras = XLSX.utils.json_to_sheet(carrerasSheetData);
      wsCarreras["!cols"] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsCarreras, "Demanda por Carrera");

      if (solicitudesTalleres.length > 0) {
        const detalleData = solicitudesTalleres.map((s) => ({
          "ID": s.id,
          "Taller": s.taller,
          "Solicitante": s.nombre,
          "RUT": s.rut || "-",
          "Email": s.email,
          "Carrera": s.carrera,
          "Modalidad": s.modalidad,
          "Participantes": s.participantes,
          "Estado": s.estado,
          "Fecha Creación": s.created_at || "-"
        }));
        const wsDetalle = XLSX.utils.json_to_sheet(detalleData);
        wsDetalle["!cols"] = [
          { wch: 8 }, { wch: 40 }, { wch: 25 }, { wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 14 }, { wch: 15 }, { wch: 14 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Solicitudes");
      }

      const fechaHoy = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Reporte_Metricas_Talleres_UCT_${fechaHoy}.xlsx`);
      setToastNotificacion({ tipo: "exito", texto: "Reporte de talleres exportado a Excel exitosamente." });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al exportar métricas de talleres: " + err.message });
    }
  };

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
      titulo: "Cancelar Reserva (Administrador)",
      mensaje: `¿Estás seguro de que deseas cancelar la reserva ID ${reservaId}? Se registrará en el historial como 'Cancelada' por administración y el cupo quedará liberado.`,
      onConfirm: () => ejecutarEliminacionReserva(reservaId)
    });
  };

  const haPasadoTolerancia10Min = (fechaStr, horaStr) => {
    if (!fechaStr || !horaStr) return false;
    const horaLimpia = horaStr.split(/[\s-]/)[0].trim();
    const partesHora = horaLimpia.split(":").map(Number);
    const partesFecha = fechaStr.split("-").map(Number);
    if (partesHora.length < 2 || partesFecha.length < 3) return false;
    const [h, m] = partesHora;
    const [year, month, day] = partesFecha;
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(h) || isNaN(m)) return false;
    const limite = new Date(year, month - 1, day, h, m + 10, 0);
    return new Date() >= limite;
  };

  const ejecutarMarcarInasistencia = async (reservaId, rut, nombre) => {
    setEliminandoReservaId(reservaId);
    try {
      const resp = await apiPost(`/api/reservas/${reservaId}/inasistencia`);
      const reservasActualizadas = reservasBloque.filter((r) => r.id !== reservaId && String(r.id) !== String(reservaId));
      setReservasBloque(reservasActualizadas);
      await fetchResumen();
      await fetchSancionados();
      if (activeTab === "historial") {
        await fetchHistorial();
      }
      if (reservasActualizadas.length === 0) {
        setBloqueSeleccionado(null);
      }
      const totalInasistencias = resp.total_inasistencias ?? resp.sancion?.inasistencias_periodo ?? 1;
      const suspendido = resp.suspendido ?? resp.sancion?.suspendido ?? false;
      const detalleSancion = suspendido
        ? ` Alumno sancionado por 3 días (${totalInasistencias}/2 inasistencias).`
        : ` Inasistencias registradas: ${totalInasistencias}/2.`;
      setToastNotificacion({
        tipo: "exito",
        texto: `Reserva eliminada y registrada como inasistencia.${detalleSancion}`
      });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al registrar inasistencia: " + (err.message || "Intenta nuevamente") });
    } finally {
      setEliminandoReservaId(null);
    }
  };

  const handleMarcarInasistencia = (reservaId, rut, nombre) => {
    setConfirmModal({
      open: true,
      titulo: "⚠️ Marcar Inasistencia (+10 min)",
      mensaje: `¿Marcar inasistencia para el alumno ${nombre || rut} (ID ${reservaId})? La reserva será eliminada del bloque y registrada en el historial. Si el alumno acumula 2 inasistencias quedará suspendido por 3 días.`,
      onConfirm: () => ejecutarMarcarInasistencia(reservaId, rut, nombre)
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

    if (cubiculosCampus.some((cb) => cb.codigo.toUpperCase() === codigoLimpio.toUpperCase())) {
      setCampusMsg({
        tipo: "error",
        texto: `El código de cubículo '${codigoLimpio.toUpperCase()}' ya existe en esta sede.`,
      });
      return;
    }

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

      await fetchCubiculos(idCampusDestino);
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
      const data = await apiGet(`/api/cubiculos?campus_id=${campusId}&fecha=${fechaSeleccionada}`);
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
    if (!valLimpio) return;
    try {
      await apiPut(`/api/cubiculos/${cubId}`, { codigo: valLimpio });
      setEditingCubiculoId(null);
      if (campusAEditar) {
        await fetchCubiculosModal(campusAEditar.id);
      }
      await fetchCampus();
      const idAUsar = campusDestinoCubiculo || campusSeleccionado;
      if (idAUsar) {
        await fetchCubiculos(idAUsar);
      }
      setToastNotificacion({ tipo: "exito", texto: "Código de cubículo modificado con éxito." });
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
          if (campusAEditar) {
            await fetchCubiculosModal(campusAEditar.id);
          }
          await fetchCampus();
          const idAUsar = campusDestinoCubiculo || campusSeleccionado;
          if (idAUsar) {
            await fetchCubiculos(idAUsar);
          }
          setToastNotificacion({ tipo: "exito", texto: `Cubículo '${codigo}' eliminado.` });
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.message || "Error al eliminar cubículo" });
        }
      }
    });
  };

  const handleAbrirModalMantenimiento = async (cb) => {
    setModalMantenimiento({
      open: true,
      cubiculo: cb,
      fecha: fechaSeleccionada || hoyStr,
      motivo: "",
      mantenimientos: [],
      cargando: true,
      guardando: false,
    });
    try {
      const data = await apiGet(`/api/cubiculos/${cb.id}/mantenimientos`);
      setModalMantenimiento((prev) => ({
        ...prev,
        mantenimientos: data || [],
        cargando: false,
      }));
    } catch {
      setModalMantenimiento((prev) => ({ ...prev, cargando: false }));
    }
  };

  const handleGuardarMantenimientoCubiculo = async (e) => {
    e.preventDefault();
    if (!modalMantenimiento.cubiculo || !modalMantenimiento.fecha) return;

    setModalMantenimiento((prev) => ({ ...prev, guardando: true }));
    try {
      await apiPost(`/api/cubiculos/${modalMantenimiento.cubiculo.id}/mantenimientos`, {
        fecha: modalMantenimiento.fecha,
        motivo: modalMantenimiento.motivo || "Mantenimiento / Fuera de servicio",
      });

      const data = await apiGet(`/api/cubiculos/${modalMantenimiento.cubiculo.id}/mantenimientos`);
      setModalMantenimiento((prev) => ({
        ...prev,
        mantenimientos: data || [],
        motivo: "",
        guardando: false,
      }));

      const idAUsar = campusDestinoCubiculo || campusSeleccionado;
      if (idAUsar) fetchCubiculos(idAUsar);
      if (campusAEditar) fetchCubiculosModal(campusAEditar.id);
      fetchResumen();

      setToastNotificacion({
        tipo: "exito",
        texto: `Cubículo '${modalMantenimiento.cubiculo.codigo}' puesto en mantenimiento para el ${modalMantenimiento.fecha}.`,
      });
    } catch (err) {
      setModalMantenimiento((prev) => ({ ...prev, guardando: false }));
      setToastNotificacion({
        tipo: "error",
        texto: err.message || "Error al programar mantenimiento.",
      });
    }
  };

  const handleEliminarMantenimiento = async (mantenimientoId) => {
    try {
      await apiDelete(`/api/cubiculos/mantenimientos/${mantenimientoId}`);
      if (modalMantenimiento.cubiculo) {
        const data = await apiGet(`/api/cubiculos/${modalMantenimiento.cubiculo.id}/mantenimientos`);
        setModalMantenimiento((prev) => ({
          ...prev,
          mantenimientos: data || [],
        }));
      }

      const idAUsar = campusDestinoCubiculo || campusSeleccionado;
      if (idAUsar) fetchCubiculos(idAUsar);
      if (campusAEditar) fetchCubiculosModal(campusAEditar.id);
      fetchResumen();

      setToastNotificacion({
        tipo: "exito",
        texto: "Mantenimiento cancelado. El cubículo vuelve a estar disponible en esa fecha.",
      });
    } catch (err) {
      setToastNotificacion({
        tipo: "error",
        texto: err.message || "Error al eliminar mantenimiento.",
      });
    }
  };

  const handleCrearCubiculoModal = async (e) => {
    e.preventDefault();
    const codigoLimpio = nuevoCubiculoModalCodigo.trim();
    if (!codigoLimpio || !campusAEditar) return;

    if (cubiculosEditModal.some((cb) => cb.codigo.toUpperCase() === codigoLimpio.toUpperCase())) {
      setToastNotificacion({ tipo: "error", texto: `El código de cubículo '${codigoLimpio.toUpperCase()}' ya existe en esta sede.` });
      return;
    }
    try {
      await apiPost("/api/cubiculos", {
        codigo: codigoLimpio,
        campus_id: campusAEditar.id
      });
      setNuevoCubiculoModalCodigo("");
      await fetchCubiculosModal(campusAEditar.id);
      await fetchCampus();
      if (campusDestinoCubiculo && Number(campusDestinoCubiculo) === campusAEditar.id) {
        await fetchCubiculos(campusDestinoCubiculo);
      } else if (campusSeleccionado === campusAEditar.id) {
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

  const handleAbrirCrearFaq = () => {
    setFaqEdit(null);
    setFormFaq({
      pregunta: "", respuesta: "", categoria: "Reservas", orden: cmsFaqs.length + 1
    });
    setModalFaqOpen(true);
  };

  const handleAbrirEditarFaq = (faq) => {
    setFaqEdit(faq);
    setFormFaq({
      pregunta: faq.pregunta, respuesta: faq.respuesta, categoria: faq.categoria || "General", orden: faq.orden || 0
    });
    setModalFaqOpen(true);
  };

  const handleGuardarFaq = async (e) => {
    e.preventDefault();
    if (!formFaq.pregunta.trim() || !formFaq.respuesta.trim()) return;
    try {
      if (faqEdit) {
        await apiPut(`/api/cms/faqs/${faqEdit.id}`, formFaq);
        setToastNotificacion({ tipo: "exito", texto: "Pregunta frecuente actualizada exitosamente." });
      } else {
        await apiPost("/api/cms/faqs", formFaq);
        setToastNotificacion({ tipo: "exito", texto: "Pregunta frecuente creada exitosamente." });
      }
      setModalFaqOpen(false);
      await fetchCMS();
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al guardar la pregunta" });
    }
  };

  const handleEliminarFaq = (id, pregunta) => {
    setConfirmModal({
      open: true,
      titulo: "Eliminar Pregunta Frecuente",
      mensaje: `¿Estás seguro de eliminar la pregunta '${pregunta}'?`,
      onConfirm: async () => {
        try {
          await apiDelete(`/api/cms/faqs/${id}`);
          setToastNotificacion({ tipo: "exito", texto: "Pregunta frecuente eliminada exitosamente." });
          await fetchCMS();
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.message || "Error al eliminar pregunta" });
        }
      }
    });
  };

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

  const handleMiniCalPrev = () => {
    setMiniCalMes((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleMiniCalNext = () => {
    setMiniCalMes((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getMiniCalDias = () => {
    const year = miniCalMes.getFullYear();
    const month = miniCalMes.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const fechaIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dayNumber: d, fechaIso });
    }
    return days;
  };

  // ---- Tokens visuales reutilizables (Estilo UCT Premium) ----
  const CARD = "bg-white border border-slate-200/90 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,77,122,0.08),0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_28px_-6px_rgba(0,77,122,0.14)] transition-all duration-200";
  const INPUT = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#00A3E0] focus:ring-4 focus:ring-[#00A3E0]/15 shadow-2xs";
  const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#004D7A] via-[#00629B] to-[#0082B8] hover:from-[#003a5c] hover:to-[#00629B] text-white text-xs font-bold shadow-[0_6px_18px_-6px_rgba(0,98,155,0.7)] hover:shadow-[0_10px_24px_-6px_rgba(0,98,155,0.85)] transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";
  const BTN_ACCENT = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFD54A] via-[#FFC20E] to-[#E5AC00] hover:from-[#FFC20E] hover:to-[#EDB100] text-[#0F172A] text-xs font-extrabold shadow-[0_6px_18px_-6px_rgba(255,194,14,0.75)] hover:shadow-[0_10px_24px_-6px_rgba(255,194,14,0.9)] transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";
  const BTN_GHOST = "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs";
  const BTN_DANGER = "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed";
  const EYEBROW = "inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-sky-50/80 px-3.5 py-1 text-[11px] font-extrabold text-[#00629B] tracking-wide uppercase";
  const SECTION_TITLE = "text-xl md:text-2xl font-bold font-sans text-slate-900 tracking-tight";
  const LABEL = "block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider";
  const OVERLAY = "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fadeIn";
  const MODAL = "w-full bg-white rounded-3xl shadow-[0_32px_80px_-24px_rgba(0,45,76,0.55)] border border-slate-200/80 ring-1 ring-slate-900/5";

  const navTabs = [
    { id: "monitoreo", label: "Actividad y Monitoreo", icon: "📊" },
    { id: "calendario", label: "Calendario y Bloqueos", icon: "📅" },
    { id: "sedes", label: "Sedes y Cubículos", icon: "🏛️" },
    { id: "talleres", label: "Talleres Solicitados", icon: "🎓", badge: solicitudesTalleres.filter((s) => s.estado === "pendiente").length },
    { id: "incidencias", label: "Incidencias de Cubículos", icon: "⚠️", badge: incidencias.filter((i) => i.estado === "pendiente").length },
    { id: "sanciones", label: "Sanciones y Disciplina", icon: "⚖️" },
    { id: "metricas", label: "Métricas y Análisis", icon: "📈" },
    { id: "camara", label: "Cámara Terminal", icon: "📹" },
    { id: "cms", label: "Portal Inicio", icon: "🖼️" },
    { id: "faqs", label: "Preguntas Frecuentes", icon: "❓" },
    { id: "historial", label: "Historial de Registros", icon: "📜" },
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSidebarMobileOpen(false);
    if (tabId === "cms" || tabId === "faqs") fetchCMS();
    if (tabId === "calendario") fetchDiasBloqueados();
    if (tabId === "talleres") fetchSolicitudesTalleres();
    if (tabId === "historial") fetchHistorial();
    if (tabId === "sanciones") fetchSancionados();
    if (tabId === "incidencias") fetchIncidencias();
    if (tabId === "metricas") {
      setTipoMetricas("selector");
      fetchSolicitudesTalleres();
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans text-slate-800 selection:bg-[#00A3E0]/20 flex flex-col lg:flex-row">
      {sidebarMobileOpen && (
        <div
          onClick={() => setSidebarMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#002D4C] text-white flex flex-col border-r border-white/10 transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
      >
        <div className="pt-6 pb-4 px-5 flex flex-col items-center relative border-b border-white/10">
          <button
            onClick={() => setSidebarMobileOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>

          <div className="w-full flex items-center justify-center py-3 px-2">
            <img
              src={logoUCT}
              alt="Universidad Católica de Temuco"
              className="h-[74px] w-auto max-w-[245px] object-contain drop-shadow-md filter brightness-105"
            />
          </div>

          <div className="mt-2 text-center">
            <h2 className="text-xs font-black text-white tracking-widest uppercase">
              BIBLIOTECA UCT
            </h2>
            <p className="text-[10px] text-sky-200/80 font-semibold tracking-wide mt-0.5">
              Centro de Control Universitario
            </p>
            <div className="w-16 h-0.5 mx-auto mt-2 rounded-full bg-gradient-to-r from-[#00A3E0] via-[#FFC20E] to-[#00A3E0]" />
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
                  ? "bg-gradient-to-r from-[#00629B] to-[#0082B8] text-white shadow-md border-l-4 border-[#FFC20E] ring-1 ring-white/20 translate-x-1"
                  : "text-sky-100/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm opacity-90">{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
                {tab.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FFC20E] text-[#002D4C] shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2 bg-black/10">
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-200/80 hover:text-white hover:bg-white/5 transition-all"
          >
            <span>🏛️</span>
            <span>Portal Institucional</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black font-sans text-slate-800 tracking-wider uppercase">
                  {activeTab === "monitoreo" ? "PANEL DE CONTROL" :
                    activeTab === "camara" ? "CÁMARA TERMINAL" :
                      activeTab === "incidencias" ? "INCIDENCIAS" :
                        activeTab === "talleres" ? "TALLERES" :
                          activeTab === "metricas" ? (tipoMetricas === "talleres" ? "MÉTRICAS · TALLERES" : tipoMetricas === "reservas" ? "MÉTRICAS · RESERVAS" : "MÉTRICAS Y ANÁLISIS") :
                            activeTab === "sanciones" ? "SANCIONES" :
                              activeTab === "calendario" ? "CALENDARIO" :
                                activeTab === "sedes" ? "SEDES Y CUBÍCULOS" :
                                  activeTab === "cms" ? "PORTAL INICIO" :
                                    activeTab === "faqs" ? "PREGUNTAS FRECUENTES" : "HISTORIAL"}
                </h1>
                {activeTab === "monitoreo" && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFC20E]/20 text-amber-900 border border-[#FFC20E]/50 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-[#FFC20E] animate-pulse" />
                    En vivo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {campusSeleccionadoObj?.nombre ? `Sede: ${campusSeleccionadoObj.nombre} · ` : ""}Bienvenido/a, {user?.nombre || "Administrador"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="relative hidden md:flex items-center">
              <input
                type="text"
                placeholder="Buscar en el sistema..."
                value={busquedaGlobal}
                onChange={(e) => setBusquedaGlobal(e.target.value)}
                className="w-48 lg:w-64 pl-4 pr-10 py-2 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#00A3E0] focus:ring-2 focus:ring-[#00A3E0]/20 outline-none transition-all"
              />
              <span className="absolute right-3.5 text-slate-400 text-xs pointer-events-none">🔍</span>
            </div>

            <div className="relative">
              <select
                value={campusSeleccionado || ""}
                onChange={(e) => setCampusSeleccionado(Number(e.target.value))}
                className="appearance-none pl-4 pr-8 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:border-[#00629B] focus:border-[#00A3E0] focus:ring-2 focus:ring-[#00A3E0]/20 outline-none transition-all cursor-pointer min-w-[140px]"
              >
                {campus.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center text-sm shadow-2xs transition-all cursor-pointer"
                title="Acciones rápidas"
              >
                ⚙️
              </button>

              {settingsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs space-y-1 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 block">Acciones Rápidas</span>
                    <span className="text-[10px] text-slate-400">Terminal & Sistema</span>
                  </div>
                  <button
                    onClick={() => {
                      handleAbrirPuertaManualCamara();
                      setSettingsDropdownOpen(false);
                    }}
                    disabled={abriendoPuertaCamara}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-sky-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span>🔓</span>
                    <span>{abriendoPuertaCamara ? "Abriendo..." : "Abrir Puerta Terminal (Relé 1)"}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSelectTab("sedes");
                      setSettingsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span>🏛️</span>
                    <span>Administrar Sedes y Cubículos</span>
                  </button>
                  <button
                    onClick={() => {
                      setAyudaModalOpen(true);
                      setSettingsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span>❓</span>
                    <span>Ayuda y Atajos del Sistema</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-6 flex-1">

          {/* Mensaje de Operación */}
          {campusMsg.texto && (
            <div
              className={`rounded-2xl p-4 text-xs font-medium mb-6 flex items-center justify-between border shadow-xs ${campusMsg.tipo === "exito"
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                : "bg-rose-50/80 border-rose-200 text-rose-700"
                }`}
            >
              <span>{campusMsg.texto}</span>
              <button
                onClick={() => setCampusMsg({ tipo: "", texto: "" })}
                className="text-[11px] font-bold ml-4 px-2.5 py-1 rounded-lg bg-white/70 border border-current/20 hover:bg-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {activeTab === "camara" && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>📹 Monitoreo Visual en Vivo</span>
                  <h2 className={SECTION_TITLE}>Cámara del Terminal MinMoe</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Visualización en tiempo real del sensor óptico del dispositivo de reconocimiento facial para los cubículos de biblioteca.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                    Terminal Online (172.29.0.70)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center min-h-[340px] sm:min-h-[420px] group">
                    {errorCamara ? (
                      <div className="text-center p-8 space-y-3 text-slate-400">
                        <span className="text-4xl">⚠️</span>
                        <p className="text-sm font-semibold text-slate-200">Reconectando con la cámara del terminal...</p>
                        <p className="text-xs text-slate-400">Reintentando enlace en 172.29.0.70...</p>
                        <button
                          type="button"
                          onClick={() => { setErrorCamara(false); setCamaraTimestamp(Date.now()); setLoopTimestamp(Date.now()); }}
                          className={`${BTN_PRIMARY} mt-2`}
                        >
                          🔄 Reintentar de inmediato
                        </button>
                      </div>
                    ) : (
                      <img
                        key={modoCamara === "loop" ? loopTimestamp : camaraTimestamp}
                        src={`${BASE_URL}/api/terminal/camara/${modoCamara === "stream" ? "stream" : "snapshot"}?t=${modoCamara === "loop" ? loopTimestamp : camaraTimestamp}`}
                        alt="Cámara Terminal MinMoe"
                        className="w-full h-auto max-h-[500px] object-contain rounded-2xl transition-all"
                        onLoad={() => {
                          if (modoCamara === "loop" && activeTab === "camara") {
                            setTimeout(() => setLoopTimestamp(Date.now()), 70);
                          }
                        }}
                        onError={() => setErrorCamara(true)}
                      />
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white border border-white/10 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        {modoCamara === "stream" ? "EN VIVO · MJPEG" : modoCamara === "loop" ? "EN VIVO · FLUIDO" : "FOTOGRAMA"}
                      </span>
                      <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-sky-300 border border-white/10">
                        Canal 102
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { setErrorCamara(false); setCamaraTimestamp(Date.now()); setLoopTimestamp(Date.now()); }}
                        className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-white hover:bg-slate-800 text-xs font-semibold border border-white/10 transition-all cursor-pointer shadow-lg"
                        title="Refrescar transmisión"
                      >
                        🔄
                      </button>
                      <a
                        href={`${BASE_URL}/api/terminal/camara/snapshot`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-white hover:bg-slate-800 text-xs font-semibold border border-white/10 transition-all cursor-pointer shadow-lg"
                        title="Abrir foto en tamaño completo"
                      >
                        ↗️
                      </a>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
                      <span>MinMoe DS-K1T673DWX</span>
                      <span>Relé: Puerta 1</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Modo de visualización:</span>
                      <button
                        type="button"
                        onClick={() => { setModoCamara("stream"); setErrorCamara(false); setCamaraTimestamp(Date.now()); }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${modoCamara === "stream"
                          ? "bg-[#00629B] text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        Transmisión directa (MJPEG)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setModoCamara("loop"); setErrorCamara(false); setLoopTimestamp(Date.now()); }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${modoCamara === "loop"
                          ? "bg-[#00629B] text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        Secuencia fluida (Auto-recuperable)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setModoCamara("snapshot"); setErrorCamara(false); setCamaraTimestamp(Date.now()); }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${modoCamara === "snapshot"
                          ? "bg-[#00629B] text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        Captura estática
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCamaraTimestamp(Date.now())}
                      className={BTN_GHOST}
                    >
                      📸 Capturar fotograma
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/40 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#00629B] flex items-center gap-2">
                      <span>⚡</span> Control de Acceso Directo
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Abre el cerrojo eléctrico del cubículo directamente desde este panel de control mientras observas la cámara en tiempo real.
                    </p>
                    <button
                      type="button"
                      disabled={abriendoPuertaCamara}
                      onClick={handleAbrirPuertaManualCamara}
                      className={`${BTN_PRIMARY} w-full py-3.5 text-sm font-bold shadow-md`}
                    >
                      {abriendoPuertaCamara ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Abriendo relé...
                        </span>
                      ) : (
                        "🚪 Abrir Puerta (Relé 1)"
                      )}
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-900">Información del Dispositivo</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Modelo</span>
                        <span className="font-semibold text-slate-800">DS-K1T673DWX</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Dirección IP</span>
                        <span className="font-mono font-semibold text-slate-800">172.29.0.70</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Protocolo</span>
                        <span className="font-semibold text-slate-800">ISAPI / HTTP Digest</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Canal de Video</span>
                        <span className="font-semibold text-slate-800">101 (JPEG Snapshot)</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Modo de Autenticación</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[10px]">
                          Verificación 1:N
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "cms") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>🖼️ Administrador de contenidos</span>
                  <h2 className={SECTION_TITLE}>Gestión del Portal de Inicio</h2>
                  <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                    Edita las diapositivas del carrusel informativo y las tarjetas de la página principal.
                  </p>
                </div>
                <button onClick={fetchCMS} className={BTN_GHOST}>
                  🔄 Actualizar vistas
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>🎡</span> Diapositivas del carrusel principal
                      <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">{cmsAnuncios.length}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Banners animados que rotan en la sección superior del inicio</p>
                  </div>
                  <button type="button" onClick={handleAbrirCrearAnuncio} className={`${BTN_PRIMARY} px-4 py-2`}>
                    ➕ Añadir diapositiva
                  </button>
                </div>

                {cargandoCMS ? (
                  <div className="py-8 text-center text-xs text-slate-500">Cargando anuncios...</div>
                ) : cmsAnuncios.length === 0 ? (
                  <div className="p-8 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    Aún no hay anuncios publicados. Crea la primera diapositiva del carrusel.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cmsAnuncios.map((an) => (
                      <div
                        key={an.id}
                        className="group relative p-5 rounded-2xl border border-slate-200/80 bg-white flex flex-col justify-between gap-4 shadow-xs hover:shadow-[0_12px_32px_-20px_rgba(15,23,42,0.4)] transition-shadow overflow-hidden"
                      >
                        <span
                          className="absolute left-0 top-0 h-full w-1.5"
                          style={{ backgroundColor: an.color_fondo || "#00629B" }}
                        />
                        <div className="space-y-2 pl-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-100">
                              {an.badge || "ANUNCIO"}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">Orden {an.orden}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">{an.titulo}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{an.subtitulo}</p>
                          {an.boton_texto && (
                            <span className="inline-block text-[11px] font-semibold text-[#00629B] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                              Botón: "{an.boton_texto}" ({an.boton_link})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 pl-2">
                          <button type="button" onClick={() => handleAbrirEditarAnuncio(an)} className={BTN_GHOST}>
                            ✏️ Editar
                          </button>
                          <button type="button" onClick={() => handleEliminarAnuncio(an.id, an.titulo)} className={BTN_DANGER}>
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>📋</span> Tarjetas informativas inferiores
                      <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">{cmsTarjetas.length}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Bloques con accesos directos situados abajo en el inicio</p>
                  </div>
                  <button type="button" onClick={handleAbrirCrearTarjeta} className={`${BTN_ACCENT} px-4 py-2`}>
                    ➕ Añadir tarjeta
                  </button>
                </div>

                {cargandoCMS ? (
                  <div className="py-8 text-center text-xs text-slate-500">Cargando tarjetas...</div>
                ) : cmsTarjetas.length === 0 ? (
                  <div className="p-8 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    Aún no hay tarjetas informativas. Crea la primera para el inicio.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cmsTarjetas.map((tj) => (
                      <div
                        key={tj.id}
                        className="p-5 rounded-2xl border border-slate-200/80 bg-white flex flex-col justify-between gap-4 shadow-xs hover:shadow-[0_12px_32px_-20px_rgba(15,23,42,0.4)] transition-shadow"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xl w-11 h-11 flex items-center justify-center bg-sky-50 rounded-xl border border-sky-100">{tj.icono || "📚"}</span>
                            <span className="text-[10px] font-semibold text-slate-400">Orden {tj.orden}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">{tj.titulo}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{tj.descripcion}</p>
                          {tj.link_texto && (
                            <p className="text-[11px] font-semibold text-[#00629B]">{tj.link_texto}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                          <button type="button" onClick={() => handleAbrirEditarTarjeta(tj)} className={BTN_GHOST}>
                            ✏️ Editar
                          </button>
                          <button type="button" onClick={() => handleEliminarTarjeta(tj.id, tj.titulo)} className={BTN_DANGER}>
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

          {(activeTab === "faqs") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>❓ Centro de Ayuda & CMS</span>
                  <h2 className={SECTION_TITLE}>Gestión de Preguntas Frecuentes</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Administra las preguntas y respuestas dinámicas visibles para los estudiantes en el portal de Preguntas Frecuentes.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 px-3.5 py-1.5 rounded-full border border-sky-100 whitespace-nowrap">
                    {cmsFaqs.length} preguntas registradas
                  </span>
                  <button type="button" onClick={handleAbrirCrearFaq} className={`${BTN_PRIMARY} px-4 py-2`}>
                    ➕ Añadir pregunta
                  </button>
                </div>
              </div>

              {cargandoCMS ? (
                <div className="py-12 text-center text-xs text-slate-500">Cargando preguntas frecuentes...</div>
              ) : cmsFaqs.length === 0 ? (
                <div className="p-12 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                  Aún no hay preguntas frecuentes registradas. Crea la primera con el botón superior.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cmsFaqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="p-5 rounded-2xl border border-slate-200/80 bg-white flex flex-col justify-between gap-4 shadow-xs hover:shadow-[0_12px_32px_-20px_rgba(15,23,42,0.4)] transition-shadow"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                            {faq.categoria || "General"}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">Orden {faq.orden}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">{faq.pregunta}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{faq.respuesta}</p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button type="button" onClick={() => handleAbrirEditarFaq(faq)} className={BTN_GHOST}>
                          ✏️ Editar
                        </button>
                        <button type="button" onClick={() => handleEliminarFaq(faq.id, faq.pregunta)} className={BTN_DANGER}>
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === "sedes") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>🏛️ Infraestructura</span>
                  <h2 className={SECTION_TITLE}>Gestión de Sedes y Cubículos</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Añade sedes, edita sus datos de capacidad o crea cubículos individuales seleccionando el campus destino.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 px-3.5 py-1.5 rounded-full border border-sky-100 whitespace-nowrap">
                  {campus.length} campus registrados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-sky-100 bg-white p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#00629B] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">1</span>
                      Registrar nueva sede
                    </h3>
                    <span className="text-[10px] font-bold text-[#00629B] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">Campus</span>
                  </div>
                  <form onSubmit={handleCrearCampus} className="space-y-3">
                    <input
                      type="text"
                      value={nuevoCampusNombre}
                      onChange={(e) => setNuevoCampusNombre(e.target.value)}
                      placeholder="Nombre de la nueva sede (ej: Campus San Miguel)..."
                      className={INPUT}
                    />
                    <button
                      type="submit"
                      disabled={creandoCampus || !nuevoCampusNombre.trim()}
                      className={`${BTN_PRIMARY} w-full`}
                    >
                      {creandoCampus ? "Guardando..." : "➕ Añadir sede institucional"}
                    </button>
                  </form>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-white p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#FFC20E] text-slate-950 text-[11px] font-bold flex items-center justify-center shadow-xs">2</span>
                      Crear cubículo y asignar sede
                    </h3>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Cubículo</span>
                  </div>
                  <form onSubmit={handleCrearCubiculo} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <select
                        value={campusDestinoCubiculo}
                        onChange={(e) => setCampusDestinoCubiculo(e.target.value)}
                        className={`${INPUT} sm:w-1/2 font-semibold cursor-pointer`}
                      >
                        {campus.map((c) => (
                          <option key={c.id} value={c.id}>
                            🏛️ {c.nombre}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={nuevoCodigoCubiculo}
                        onChange={(e) => setNuevoCodigoCubiculo(e.target.value)}
                        placeholder="Código (ej: CUB-01)..."
                        className={`${INPUT} sm:w-1/2`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={creandoCubiculo || !nuevoCodigoCubiculo.trim() || !campusDestinoCubiculo}
                      className={`${BTN_ACCENT} w-full`}
                    >
                      {creandoCubiculo ? "Añadiendo..." : "🚪 Crear cubículo"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
                {cargandoCubiculosCampus ? (
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="relative h-8 w-24 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer" />
                      </div>
                    ))}
                  </div>
                ) : cubiculosCampus.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-2.5">
                      Cubículos en {campus.find((c) => String(c.id) === String(campusDestinoCubiculo))?.nombre || "la sede"} ({cubiculosCampus.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cubiculosCampus.map((cb) => (
                        editingCubiculoId === cb.id ? (
                          <div
                            key={cb.id}
                            className="flex items-center gap-1.5 bg-white border border-[#00629B] ring-4 ring-[#00629B]/10 rounded-xl px-2 py-1.5 shadow-xs"
                          >
                            <input
                              type="text"
                              value={editCubiculoCodigoVal}
                              onChange={(e) => setEditCubiculoCodigoVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleGuardarEditCubiculo(cb.id);
                                if (e.key === "Escape") setEditingCubiculoId(null);
                              }}
                              className="w-24 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none uppercase"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleGuardarEditCubiculo(cb.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                              title="Guardar código"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCubiculoId(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            key={cb.id}
                            className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all ${cb.en_mantenimiento
                              ? "bg-amber-50/90 border border-amber-300 text-amber-900"
                              : "bg-white border border-slate-200 hover:border-[#00629B]/40 text-slate-800"
                              }`}
                          >
                            <span>{cb.en_mantenimiento ? "⚠️" : "🚪"} {cb.codigo}</span>
                            {cb.en_mantenimiento && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-800 px-1.5 py-0.5 rounded">
                                Mantenimiento
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAbrirModalMantenimiento(cb)}
                              className={`p-1 rounded-lg cursor-pointer transition-colors ${cb.en_mantenimiento
                                ? "text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                                : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                }`}
                              title="Gestionar días de mantenimiento"
                            >
                              🛠️
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCubiculoId(cb.id);
                                setEditCubiculoCodigoVal(cb.codigo);
                              }}
                              className="text-slate-400 hover:text-[#00629B] hover:bg-sky-50 p-1 rounded-lg cursor-pointer transition-colors"
                              title="Modificar código del cubículo"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarCubiculoModal(cb.id, cb.codigo)}
                              className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg cursor-pointer transition-colors"
                              title="Eliminar cubículo"
                            >
                              🗑️
                            </button>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-slate-400">
                    No hay cubículos registrados en {campus.find((c) => String(c.id) === String(campusDestinoCubiculo))?.nombre || "esta sede"}.
                  </p>
                )}
              </div>

              <div className="pt-2 space-y-3">
                <h3 className="text-xs font-bold text-slate-800">Sedes activas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {campus.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-[0_12px_32px_-20px_rgba(15,23,42,0.4)] transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 shrink-0 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-base">🏛️</span>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">{c.nombre}</p>
                          <p className="text-[11px] text-slate-500">
                            ID {c.id} · {c.cubiculas_fisicos ?? 10} cubículos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleIniciarEdicion(c)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-xs transition-all cursor-pointer"
                          title="Editar sede"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => setCampusAEliminar(c)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-xs transition-all cursor-pointer"
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
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-xl p-6 space-y-5 max-h-[90vh] flex flex-col`}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-slate-900">
                      Editar sede y cubículos
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{campusAEditar.nombre} · ID {campusAEditar.id}</p>
                  </div>
                  <button
                    onClick={() => setCampusAEditar(null)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                  <form onSubmit={handleGuardarEdicionCampus} className="space-y-3 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
                    <h4 className="text-xs font-bold text-slate-800">Datos de la sede</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Nombre de la sede</label>
                        <input
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className={INPUT}
                          required
                        />
                      </div>

                      <div>
                        <label className={LABEL}>Capacidad total</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={editCubiculos}
                          onChange={(e) => setEditCubiculos(e.target.value)}
                          className={INPUT}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={guardandoEdit || !editNombre.trim()}
                        className={`${BTN_PRIMARY} px-4 py-2`}
                      >
                        {guardandoEdit ? "Guardando..." : "💾 Guardar cambios"}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      🚪 Cubículos registrados
                      <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">{cubiculosEditModal.length}</span>
                    </h4>

                    <form onSubmit={handleCrearCubiculoModal} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Código del nuevo cubículo (ej: CUB-05)..."
                        value={nuevoCubiculoModalCodigo}
                        onChange={(e) => setNuevoCubiculoModalCodigo(e.target.value)}
                        className={INPUT}
                      />
                      <button
                        type="submit"
                        disabled={!nuevoCubiculoModalCodigo.trim()}
                        className={`${BTN_ACCENT} px-4 py-2 whitespace-nowrap`}
                      >
                        ➕ Añadir
                      </button>
                    </form>

                    {cargandoCubiculosModal ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="relative h-12 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5">
                            <div className="h-4 w-24 rounded bg-slate-200/80" />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 to-transparent animate-shimmer" />
                          </div>
                        ))}
                      </div>
                    ) : cubiculosEditModal.length === 0 ? (
                      <div className="p-6 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                        Esta sede todavía no tiene cubículos. Añade el primero arriba.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                        {cubiculosEditModal.map((cb) => (
                          <div
                            key={cb.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs"
                          >
                            {editingCubiculoId === cb.id ? (
                              <div className="flex items-center gap-1.5 flex-1 mr-1">
                                <input
                                  type="text"
                                  value={editCubiculoCodigoVal}
                                  onChange={(e) => setEditCubiculoCodigoVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleGuardarEditCubiculo(cb.id);
                                    if (e.key === "Escape") setEditingCubiculoId(null);
                                  }}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none uppercase focus:border-[#00629B]"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleGuardarEditCubiculo(cb.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCubiculoId(null)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              cb.en_mantenimiento ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg">
                                    ⚠️ {cb.codigo}
                                  </span>
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                                    Mantenimiento
                                  </span>
                                </div>
                              ) : (
                                <span className="font-semibold text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                  🚪 {cb.codigo}
                                </span>
                              )
                            )}

                            {editingCubiculoId !== cb.id && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAbrirModalMantenimiento(cb)}
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs transition-all cursor-pointer ${cb.en_mantenimiento
                                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                                    }`}
                                  title="Gestionar días de mantenimiento"
                                >
                                  🛠️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCubiculoId(cb.id);
                                    setEditCubiculoCodigoVal(cb.codigo);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs transition-all cursor-pointer"
                                  title="Editar código del cubículo"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarCubiculoModal(cb.id, cb.codigo)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-xs transition-all cursor-pointer"
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

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCampusAEditar(null)}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Eliminar Campus */}
          {campusAEliminar && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-md p-7 text-center space-y-4`}>
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 text-2xl flex items-center justify-center mx-auto border border-rose-100">
                  ⚠️
                </div>
                <h3 className="text-lg font-serif font-bold text-slate-900">
                  ¿Eliminar el campus «{campusAEliminar.nombre}»?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Esta acción es irreversible y eliminará la sede junto con todas las reservas de cubículos asociadas.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCampusAEliminar(null)}
                    disabled={eliminandoCampus}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarEliminarCampus}
                    disabled={eliminandoCampus}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-[0_6px_16px_-8px_rgba(225,29,72,0.9)] transition-all cursor-pointer"
                  >
                    {eliminandoCampus ? "Eliminando..." : "Eliminar sede"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "monitoreo") && (
            <>
              <div className={`${CARD} p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-2">
                    Fecha:
                  </span>
                  {proximosDias.map((d) => {
                    const esActivo = fechaSeleccionada === d.fechaStr;
                    return (
                      <button
                        key={d.fechaStr}
                        onClick={() => setFechaSeleccionada(d.fechaStr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${esActivo
                          ? "bg-gradient-to-r from-[#FFC20E] via-[#FFD034] to-[#FFC20E] text-slate-950 font-black shadow-[0_4px_12px_-2px_rgba(255,194,14,0.5)] scale-[1.02] border border-[#FFC20E]"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50"
                          }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                  <input
                    type="date"
                    value={fechaSeleccionada}
                    onChange={(e) => e.target.value && setFechaSeleccionada(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[#FFC20E] focus:ring-2 focus:ring-[#FFC20E]/20 shadow-2xs cursor-pointer transition-all ml-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("camara")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFC20E] via-[#FFCA28] to-[#FFC20E] hover:from-[#e5ad0d] hover:to-[#FFC20E] text-slate-950 text-xs font-extrabold shadow-[0_4px_16px_-3px_rgba(255,194,14,0.65)] border border-[#FFC20E] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                    📹 Cámara Terminal
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden bg-white/90 border border-sky-100 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 shadow-xs backdrop-blur-sm">
                <span className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-[#00A3E0] to-[#00629B]" />
                <div className="flex items-center gap-3 pl-2">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-lg flex-shrink-0">
                    💡
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-900 font-semibold">Capacidad de la sede activa:</strong> esta sede dispone de <strong className="text-[#00629B]">{cubiculosActuales} cubículos</strong> de estudio simultáneo. Selecciona cualquier bloque con reservas para auditar los alumnos agendados.
                  </p>
                </div>
                <span className="hidden sm:inline-flex text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                  {cubiculosActuales} unidades
                </span>
              </div>

              {error && (
                <div className="bg-rose-50/80 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-semibold mb-6 shadow-xs">
                  ⚠️ {error}
                </div>
              )}

              {loadingData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-44 bg-white border border-slate-200/80 rounded-3xl animate-pulse" />
                  ))}
                </div>
              ) : resumen && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#00629B]">Reporte en tiempo real</span>
                      <h2 className="text-xl font-serif font-bold text-slate-900 capitalize">
                        {new Date(fechaSeleccionada + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Actualizado para sede {campus.find(c => c.id === campusSeleccionado)?.nombre || "seleccionada"}
                    </span>
                  </div>

                  {/* Layout Superior: 3 Tarjetas (Mini Calendar a la izquierda, Multi-Color Bar Chart al centro, Aforo a la derecha) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
                    <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
                      <div className="bg-gradient-to-r from-[#004D7A] via-[#00629B] to-[#00A3E0] text-white px-4 py-3 flex items-center justify-between">
                        <button
                          onClick={handleMiniCalPrev}
                          className="p-1 hover:bg-white/15 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Mes anterior"
                        >
                          &lt;
                        </button>
                        <span className="text-xs font-black tracking-widest uppercase">
                          {miniCalMes.toLocaleDateString("es-CL", { month: "long", year: "numeric" }).toUpperCase()}
                        </span>
                        <button
                          onClick={handleMiniCalNext}
                          className="p-1 hover:bg-white/15 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Mes siguiente"
                        >
                          &gt;
                        </button>
                      </div>

                      <div className="p-3.5">
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                          {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
                            <span key={i} className="text-[11px] font-bold text-slate-400">
                              {d}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center">
                          {getMiniCalDias().map((d, idx) => {
                            if (!d) return <div key={idx} className="h-7 w-7 mx-auto" />;

                            const esSeleccionado = d.fechaIso === fechaSeleccionada;
                            const esHoy = d.fechaIso === hoyStr;
                            const esBloqueado = diasBloqueados.some((b) => b.fecha === d.fechaIso);
                            const tieneHistorial = historial.some((h) => h.fecha === d.fechaIso);

                            let badgeStyle = "text-slate-600 hover:bg-slate-100";
                            if (esSeleccionado) {
                              badgeStyle = "bg-[#FFC20E] text-[#002D4C] font-black shadow-sm ring-2 ring-[#FFC20E]/40";
                            } else if (esHoy) {
                              badgeStyle = "bg-[#00A3E0] text-white font-bold shadow-xs";
                            } else if (esBloqueado) {
                              badgeStyle = "bg-rose-500 text-white font-bold shadow-xs";
                            } else if (tieneHistorial) {
                              badgeStyle = "bg-[#00629B] text-white font-bold shadow-xs";
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => setFechaSeleccionada(d.fechaIso)}
                                className={`h-7 w-7 mx-auto rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${badgeStyle}`}
                              >
                                {d.dayNumber}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md bg-[#00A3E0] text-white text-[10px] font-bold">
                            Turnos de Hoy
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSelectTab("metricas")}
                            className="px-2.5 py-1 rounded-md bg-[#00629B] hover:bg-[#004D7A] text-white text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Ver Métricas →
                          </button>
                        </div>
                      </div>

                      <div className="relative pt-4 pb-1">
                        <div className="flex items-end justify-between gap-2 h-44 border-b border-slate-200/80 px-2">
                          {(resumen.bloques && resumen.bloques.length > 0 ? resumen.bloques.slice(0, 8) : [
                            { rango: "08:30", ocupados: 4, disponibles: 6 },
                            { rango: "10:00", ocupados: 7, disponibles: 3 },
                            { rango: "11:30", ocupados: 9, disponibles: 1 },
                            { rango: "13:00", ocupados: 3, disponibles: 7 },
                            { rango: "14:30", ocupados: 8, disponibles: 2 },
                            { rango: "16:00", ocupados: 6, disponibles: 4 },
                            { rango: "17:30", ocupados: 5, disponibles: 5 }
                          ]).map((b, idx) => {
                            const barPalette = ["#00A3E0", "#00629B", "#FFC20E", "#0082B8", "#00A3E0", "#004D7A", "#FFC20E", "#0082B8"];
                            const color = barPalette[idx % barPalette.length];
                            const maxVal = Math.max(cubiculosActuales, 10);
                            const hOcupados = Math.max((b.ocupados / maxVal) * 100, 10);
                            const hDisponibles = Math.max((b.disponibles / maxVal) * 100, 6);

                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                                  {b.rango || b.hora}: {b.ocupados} ocupados / {cubiculosActuales} cupos
                                </div>
                                <div className="w-full flex items-end justify-center gap-1 h-36">
                                  <div
                                    className="w-2.5 sm:w-3 rounded-t-sm transition-all duration-300 hover:brightness-110"
                                    style={{ height: `${hOcupados}%`, backgroundColor: color }}
                                  />
                                  <div
                                    className="w-2.5 sm:w-3 rounded-t-sm bg-slate-200 transition-all duration-300"
                                    style={{ height: `${hDisponibles}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium mt-2 truncate w-full text-center">
                                  {(b.rango || b.hora || "").split("-")[0]?.trim()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3 bg-gradient-to-br from-[#002D4C] via-[#00385E] to-[#001D33] text-white rounded-2xl p-5 shadow-sm border border-[#004E7C]/60 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-sky-200/80 uppercase tracking-wider">
                          Aforo & Ocupación Diaria :
                        </span>
                        <div className="text-3xl font-black text-white tracking-tight mt-1 mb-4">
                          {porcentaje}% Ocupación
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-3 border-t border-white/10 text-xs font-mono">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-[11px]">item #1 Reservas activas</span>
                          <span className="text-white font-bold">: {resumen.total_reservas_dia}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-[11px]">item #2 Cupos disponibles</span>
                          <span className="text-white font-bold">: {resumen.cupos_disponibles_dia}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-[11px]">item #3 Cubículos en sede</span>
                          <span className="text-white font-bold">: {cubiculosActuales}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-[11px]">item #4 Turnos con demanda</span>
                          <span className="text-white font-bold">: {resumen.bloques?.filter((b) => b.ocupados > 0).length || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-[11px]">item #5 Incidencias activas</span>
                          <span className="text-white font-bold">: {incidencias.filter((i) => i.estado === "pendiente").length}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2.5 border-t border-white/10 font-bold text-[#FFC20E] text-[11px]">
                          <span>Total aforo diario</span>
                          <span>: {resumen.cupos_totales_diarios}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Layout Inferior: 2 Columnas (Reservas Recientes y Cubículos a la izq, Novedades a la der) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
                    {/* Columna Izquierda: Reservas Recientes + Cubículos */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Reservas Recientes */}
                      <div className={`${CARD} p-5`}>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3">
                          <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                            Reservas Recientes
                          </h3>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Buscar reserva..."
                              value={busquedaOrdenes}
                              onChange={(e) => setBusquedaOrdenes(e.target.value)}
                              className="pl-3 pr-7 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 outline-none w-36 sm:w-44 focus:bg-white focus:border-[#00A3E0] border border-slate-200 transition-all"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">🔍</span>
                          </div>
                        </div>

                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-[11px] text-slate-400 border-b border-slate-100">
                                <th className="py-2.5 font-normal">Estudiante</th>
                                <th className="py-2.5 font-normal">Nº Reserva</th>
                                <th className="py-2.5 font-normal">Fecha y Horario</th>
                                <th className="py-2.5 font-normal">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(historial && historial.length > 0 ? (
                                historial
                                  .filter((h) => {
                                    if (!busquedaOrdenes) return true;
                                    const t = busquedaOrdenes.toLowerCase();
                                    return (
                                      (h.nombre && h.nombre.toLowerCase().includes(t)) ||
                                      (h.rut && h.rut.toLowerCase().includes(t)) ||
                                      (h.cubiculo_codigo && h.cubiculo_codigo.toLowerCase().includes(t)) ||
                                      String(h.reserva_id || h.id || "").includes(t)
                                    );
                                  })
                                  .slice(0, 5)
                              ) : (
                                [
                                  { id: 1, nombre: "Daniel Fuentes", reserva_id: 1293078, fecha: "Hoy · 08:30 hrs", estado: "completada" },
                                  { id: 2, nombre: "Tomas Navarro", reserva_id: 1293079, fecha: "Hoy · 10:00 hrs", estado: "activa" },
                                  { id: 3, nombre: "Valeria Gomez", reserva_id: 1293080, fecha: "Hoy · 11:30 hrs", estado: "liberada" },
                                  { id: 4, nombre: "Diego Silva", reserva_id: 1293081, fecha: "Hoy · 13:00 hrs", estado: "en_curso" },
                                  { id: 5, nombre: "Marcos Soto", reserva_id: 1293082, fecha: "Hoy · 14:30 hrs", estado: "inasistencia" }
                                ]
                              )).map((h, i) => {
                                const est = (h.estado || "").toLowerCase();
                                let dotColor = "bg-slate-400";
                                let labelStatus = "Finalizada";

                                if (est === "activa" || est === "confirmada") {
                                  dotColor = "bg-[#00A3E0]";
                                  labelStatus = "Confirmada";
                                } else if (est === "en_curso" || est === "progress") {
                                  dotColor = "bg-[#FFC20E]";
                                  labelStatus = "En curso";
                                } else if (est === "completada" || est === "completed" || est === "expirada") {
                                  dotColor = "bg-emerald-500";
                                  labelStatus = "Completada";
                                } else if (est === "liberada") {
                                  dotColor = "bg-amber-400";
                                  labelStatus = "Liberada";
                                } else if (est === "cancelada") {
                                  dotColor = "bg-rose-500";
                                  labelStatus = "Cancelada";
                                } else if (est === "inasistencia") {
                                  dotColor = "bg-rose-600";
                                  labelStatus = "Inasistencia";
                                }

                                return (
                                  <tr key={h.id || i} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-2.5 font-bold text-slate-800">
                                      {h.nombre}
                                    </td>
                                    <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                                      #{h.reserva_id || h.id}
                                    </td>
                                    <td className="py-2.5 text-slate-500 text-[11px]">
                                      {h.fecha}{h.hora ? ` · ${h.hora} hrs` : ""}
                                    </td>
                                    <td className="py-2.5">
                                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                                        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                        {labelStatus}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Cubículos de la Sede */}
                      <div className={`${CARD} p-5`}>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3">
                          <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                            Cubículos de la Sede
                          </h3>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Buscar cubículo..."
                              value={busquedaCubiculos}
                              onChange={(e) => setBusquedaCubiculos(e.target.value)}
                              className="pl-3 pr-7 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 outline-none w-36 sm:w-44 focus:bg-white focus:border-[#00A3E0] border border-slate-200 transition-all"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">🔍</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {(cubiculosCampus && cubiculosCampus.length > 0
                            ? cubiculosCampus
                            : [
                              { id: 1, codigo: "CB-01", en_mantenimiento: false },
                              { id: 2, codigo: "CB-02", en_mantenimiento: false },
                              { id: 3, codigo: "CB-03", en_mantenimiento: false },
                              { id: 4, codigo: "CB-04", en_mantenimiento: false }
                            ]
                          )
                            .filter((c) => {
                              if (!busquedaCubiculos) return true;
                              return c.codigo && c.codigo.toLowerCase().includes(busquedaCubiculos.toLowerCase());
                            })
                            .slice(0, 4)
                            .map((c, idx) => {
                              const contactColors = ["#00629B", "#00A3E0", "#FFC20E", "#004E7C"];
                              const color = contactColors[idx % contactColors.length];

                              return (
                                <div key={c.id || idx} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                  <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-xs shrink-0"
                                    style={{ backgroundColor: color, color: color === "#FFC20E" ? "#002D4C" : "#ffffff" }}
                                  >
                                    {c.codigo ? c.codigo.slice(0, 3) : "CB"}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-slate-800 truncate">
                                      Cubículo {c.codigo}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {c.en_mantenimiento ? "En mantenimiento" : "Capacidad 6 estudiantes"}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5">
                      <div className={`${CARD} p-5 h-full flex flex-col justify-between`}>
                        <div>
                          <div className="border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                              Novedades e Incidencias
                            </h3>
                          </div>

                          <div className="space-y-5">
                            {incidencias.filter((i) => i.estado === "pendiente").length > 0 ? (
                              incidencias
                                .filter((i) => i.estado === "pendiente")
                                .slice(0, 2)
                                .map((inc, idx) => (
                                  <div key={inc.id || idx} className="space-y-2 pb-4 border-b border-slate-100 last:border-b-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shadow-xs shrink-0"
                                        style={{ backgroundColor: idx % 2 === 0 ? "#00A3E0" : "#FFC20E", color: idx % 2 === 0 ? "#ffffff" : "#002D4C" }}
                                      >
                                        {inc.estudiante_nombre ? inc.estudiante_nombre.slice(0, 2).toUpperCase() : "AL"}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold text-slate-800 truncate">
                                          {inc.estudiante_nombre || "Estudiante"}{" "}
                                          <span className="font-semibold text-[#00629B] cursor-pointer hover:underline">
                                            en {inc.cubiculo_codigo || "Cubículo"}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {inc.created_at ? String(inc.created_at).split(" ")[0] : "Reciente"}
                                        </div>
                                      </div>
                                    </div>

                                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed pl-12">
                                      {inc.descripcion || "Reporte de incidencia registrado para supervisión técnica en biblioteca."}
                                    </p>

                                    <div className="pl-12 pt-1">
                                      <button
                                        onClick={() => handleSelectTab("incidencias")}
                                        className="px-3.5 py-1 rounded-full bg-[#00629B] hover:bg-[#004D7A] text-white text-[10px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <span>Revisar</span>
                                        <span>➔</span>
                                      </button>
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <div className="space-y-4">
                                <div className="space-y-2 pb-4 border-b border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#00629B] flex items-center justify-center text-white text-[11px] font-bold shadow-xs shrink-0">
                                      SB
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-slate-800 truncate">
                                        Supervisión de Sede{" "}
                                        <span className="font-semibold text-[#00629B] cursor-pointer hover:underline">
                                          en Cubículos de Biblioteca
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        Actualizado hoy
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed pl-12">
                                    Cubículos operativos y con aforo asignado de acuerdo a los turnos horarios del día.
                                  </p>
                                  <div className="pl-12 pt-1">
                                    <button
                                      onClick={() => handleSelectTab("incidencias")}
                                      className="px-3.5 py-1 rounded-full bg-[#00629B] hover:bg-[#004D7A] text-white text-[10px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <span>Revisar</span>
                                      <span>➔</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#00A3E0] flex items-center justify-center text-white text-[11px] font-bold shadow-xs shrink-0">
                                      TM
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-slate-800 truncate">
                                        Terminal MinMoe{" "}
                                        <span className="font-semibold text-[#00629B] cursor-pointer hover:underline">
                                          en Control de Acceso
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        En línea (172.29.0.70)
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed pl-12">
                                    Acceso por reconocimiento facial funcionando con normalidad en relé principal.
                                  </p>
                                  <div className="pl-12 pt-1">
                                    <button
                                      onClick={() => handleSelectTab("camara")}
                                      className="px-3.5 py-1 rounded-full bg-[#00629B] hover:bg-[#004D7A] text-white text-[10px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <span>Ver cámara</span>
                                      <span>➔</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {resumen.bloques && resumen.bloques.length > 0 && (
                    <div className={`${CARD} p-6 md:p-8 space-y-6`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#00629B] mb-1">
                            <span>⏱️ Cronograma de ocupación</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900">
                            Bloques Horarios y Matriz de Cubículos
                          </h3>
                          <p className="text-xs text-slate-500">
                            Cada tarjeta representa un turno horario con su carga de ocupación en tiempo real. Haz clic en bloques con uso para ver detalle de alumnos.
                          </p>
                        </div>
                        <div className="flex items-center gap-3 self-start sm:self-auto">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00629B]" />
                            <span>Ocupado</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                            <span>Libre</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {resumen.bloques.map((b) => {
                          const estaLleno = b.ocupados >= cubiculosActuales;
                          const tieneUso = b.ocupados > 0;
                          const pctUso = Math.min(Math.round((b.ocupados / (cubiculosActuales || 1)) * 100), 100);
                          const numSlots = Math.min(cubiculosActuales, 12);

                          return (
                            <div
                              key={b.hora}
                              onClick={() => tieneUso && handleAbrirDetalleBloque(b)}
                              className={`group relative rounded-3xl p-5 border transition-all flex flex-col justify-between gap-4 overflow-hidden ${tieneUso
                                ? "cursor-pointer bg-white hover:border-[#00629B]/50 hover:shadow-[0_16px_36px_-16px_rgba(15,23,42,0.18)] hover:-translate-y-1"
                                : "bg-slate-50/50 border-slate-200/80"
                                } ${estaLleno
                                  ? "border-rose-200/90 bg-rose-50/20"
                                  : tieneUso
                                    ? "border-sky-200/80"
                                    : ""
                                }`}
                            >
                              <span
                                className="absolute left-0 top-0 h-1.5 w-full"
                                style={{
                                  backgroundColor: estaLleno
                                    ? "#E11D48"
                                    : tieneUso
                                      ? "#00629B"
                                      : "#E2E8F0"
                                }}
                              />

                              <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-slate-900 tracking-tight">{b.rango}</span>
                                  </div>
                                  {estaLleno ? (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                      Agotado
                                    </span>
                                  ) : tieneUso ? (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-100 text-[#00629B] border border-sky-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00629B] animate-pulse" />
                                      {pctUso}%
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                      Disponible
                                    </span>
                                  )}
                                </div>

                                <div className="bg-slate-100/70 p-2.5 rounded-2xl border border-slate-200/60">
                                  <div className="flex items-center justify-between text-[11px] mb-2">
                                    <span className="text-slate-500 font-semibold">Carga de cubículos</span>
                                    <span className="font-extrabold text-slate-800">
                                      {b.ocupados} / {cubiculosActuales}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-6 gap-1.5">
                                    {Array.from({ length: numSlots }).map((_, idx) => {
                                      const ocupadoSlot = idx < b.ocupados;
                                      return (
                                        <div
                                          key={idx}
                                          className={`h-2 rounded-full transition-all ${ocupadoSlot
                                            ? estaLleno
                                              ? "bg-rose-500"
                                              : "bg-[#00629B]"
                                            : "bg-white border border-slate-300"
                                            }`}
                                          title={`Cubículo ${idx + 1}: ${ocupadoSlot ? "Ocupado" : "Libre"}`}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-500 text-[11px]">
                                  <strong className="text-emerald-600 font-bold">{b.disponibles}</strong> libres
                                </span>
                                {tieneUso ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-[11px] text-[#00629B] group-hover:translate-x-0.5 transition-transform">
                                    <span>Auditar reservas</span>
                                    <span>→</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium">Sin reservas</span>
                                )}
                              </div>
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
            <>
              {tipoMetricas === "selector" && (
                <div className={`${CARD} p-6 md:p-10 mb-8 space-y-8 animate-fadeIn`}>
                  <div className="text-center max-w-3xl mx-auto space-y-3">
                    <span className={EYEBROW}>📊 Inteligencia y Analítica Institucional UCT</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-[#002D4C] tracking-tight">
                      Selecciona el Módulo de Métricas
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Elige el tipo de analítica que deseas visualizar para explorar estadísticas en tiempo real, tasas de ocupación o demanda formativa, y generar reportes oficiales.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-2">
                    <div
                      onClick={() => setTipoMetricas("reservas")}
                      className="group relative p-7 rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-[#00629B] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-[#00629B]/10 transition-all pointer-events-none" />
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="w-14 h-14 rounded-2xl bg-[#002D4C] text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform">
                            🏢
                          </div>
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#00629B]/10 text-[#00629B]">
                            Espacios Físicos
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800 group-hover:text-[#00629B] transition-colors">
                            Métricas de Reservas
                          </h3>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            Monitoreo interactivo de ocupación de cubículos por bloque horario versus capacidad instalada, desglose por sede, aforo diario y análisis por carreras.
                          </p>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="text-[#00A3E0]">✓</span>
                            <span>Inteligencia de afluencia por bloques y horas peak</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#00A3E0]">✓</span>
                            <span>Demanda y participación por carreras universitarias</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#00A3E0]">✓</span>
                            <span>Exportación en alta resolución (PNG y Excel .xlsx)</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 relative z-10">
                        <button
                          type="button"
                          className="w-full py-3 px-4 rounded-xl font-black text-xs bg-[#002D4C] hover:bg-[#00629B] text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer group-hover:translate-x-1"
                        >
                          <span>Ver Métricas de Reservas</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() => setTipoMetricas("talleres")}
                      className="group relative p-7 rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-[#FFC20E] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-[#FFC20E]/20 transition-all pointer-events-none" />
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFC20E] to-amber-500 text-[#002D4C] flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform">
                            🎓
                          </div>
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#FFC20E]/20 text-amber-900">
                            Formación & Capacitación
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800 group-hover:text-amber-800 transition-colors">
                            Métricas de Talleres
                          </h3>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            Analítica de solicitudes de formación académica especializada, índice de aprobación, distribución temática de los 6 talleres y modalidades solicitadas.
                          </p>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="text-[#00629B]">✓</span>
                            <span>Demanda por taller temático y temas más solicitados</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#00629B]">✓</span>
                            <span>Distribución por modalidad (Presencial vs Virtual)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#00629B]">✓</span>
                            <span>Tasa de aprobación, estado de solicitudes y exportación Excel</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 relative z-10">
                        <button
                          type="button"
                          className="w-full py-3 px-4 rounded-xl font-black text-xs bg-[#FFC20E] hover:bg-amber-400 text-[#002D4C] shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer group-hover:translate-x-1"
                        >
                          <span>Ver Métricas de Talleres</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tipoMetricas === "reservas" && (
                <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setTipoMetricas("selector")}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <span>←</span>
                      <span>Cambiar tipo de métricas</span>
                    </button>
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setTipoMetricas("reservas")}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-[#002D4C] text-white shadow-xs"
                      >
                        <span>🏢</span>
                        <span>Métricas de Reservas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoMetricas("talleres")}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-900"
                      >
                        <span>🎓</span>
                        <span>Métricas de Talleres</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>📈 Análisis institucional de ocupación</span>
                  <h2 className={SECTION_TITLE}>Inteligencia de Ocupación y Demanda Horaria</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Monitoreo interactivo de afluencia por bloque horario versus capacidad física instalada. Filtra por día, semana o mes y exporta reportes en alta resolución.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                  <button
                    onClick={handleExportarGraficoPNG}
                    disabled={exportandoGraficoPNG || cargandoMetricas}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>📊</span>
                    <span>{exportandoGraficoPNG ? "Exportando..." : "Exportar Gráfico (PNG)"}</span>
                  </button>
                  <button
                    onClick={handleExportarMetricasExcel}
                    disabled={exportandoMetricasExcel || cargandoMetricas}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>📑</span>
                    <span>{exportandoMetricasExcel ? "Generando..." : "Exportar Excel (.xlsx)"}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <button
                    onClick={() => setPeriodoMetricas("dia")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodoMetricas === "dia"
                      ? "bg-[#00629B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    📅 Por Día
                  </button>
                  <button
                    onClick={() => setPeriodoMetricas("semana")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodoMetricas === "semana"
                      ? "bg-[#00629B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    📆 Por Semana
                  </button>
                  <button
                    onClick={() => setPeriodoMetricas("mes")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodoMetricas === "mes"
                      ? "bg-[#00629B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    🗓️ Por Mes
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cambiarFechaMetricas(-1)}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                    title="Período anterior"
                  >
                    ◀
                  </button>
                  <input
                    type="date"
                    value={fechaMetricas}
                    onChange={(e) => setFechaMetricas(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-[#00629B] focus:outline-none"
                  />
                  <button
                    onClick={() => setFechaMetricas(hoyStr)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => cambiarFechaMetricas(1)}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                    title="Período siguiente"
                  >
                    ▶
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={campusFiltroMetricas}
                    onChange={(e) => setCampusFiltroMetricas(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-[#00629B] focus:outline-none cursor-pointer"
                  >
                    <option value="todos">🏛️ Todas las Sedes</option>
                    {campus.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <span className="hidden sm:inline-block text-[11px] bg-sky-50 text-[#00629B] border border-sky-100 font-bold px-3 py-1.5 rounded-xl">
                    {metricas?.info_periodo?.etiqueta || "Cargando período..."}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-[#00629B] via-[#0077B8] to-[#00A3E0] text-white shadow-[0_18px_40px_-20px_rgba(0,98,155,0.9)]">
                  <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
                  <div className="absolute -right-2 bottom-[-28px] w-20 h-20 rounded-full bg-[#FFC20E]/25" />
                  <div className="relative flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-sky-100">
                    <span>Total reservas</span>
                    <span className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-sm">🎯</span>
                  </div>
                  <div className="relative text-4xl font-black mt-2 tracking-tight">{metricas?.info_periodo?.total_reservas_periodo ?? 0}</div>
                  <div className="relative text-[11px] text-sky-100/90 mt-1">Registradas en este período</div>
                </div>

                <div className="relative overflow-hidden p-5 rounded-3xl bg-white border border-amber-200/70 shadow-[0_14px_34px_-22px_rgba(245,158,11,0.7)]">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#FFC20E] via-amber-400 to-orange-500" />
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Horario pico</span>
                    <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-sm">🔥</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-3 truncate">
                    {(metricas?.info_periodo?.bloque_pico?.total_reservas || 0) > 0 ? metricas.info_periodo.bloque_pico.rango : "Sin reservas"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    <span className="font-extrabold text-amber-600">{metricas?.info_periodo?.bloque_pico?.total_reservas || 0}</span> reservas en el bloque
                  </div>
                </div>

                {(() => {
                  const pctMedia = Math.min(100, Math.max(0, Number(metricas?.info_periodo?.promedio_ocupacion_pct ?? 0)));
                  const circ = 2 * Math.PI * 26;
                  return (
                    <div className="relative overflow-hidden p-5 rounded-3xl bg-white border border-slate-200/80 shadow-[0_14px_34px_-22px_rgba(15,23,42,0.45)] flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Ocupación media</div>
                        <div className="text-3xl font-black text-slate-900 mt-2">{pctMedia}%</div>
                        <div className="text-[11px] text-slate-500 mt-1">Afluencia vs cupos</div>
                      </div>
                      <svg viewBox="0 0 64 64" className="w-16 h-16 shrink-0 -rotate-90">
                        <defs>
                          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#00629B" />
                            <stop offset="100%" stopColor="#00A3E0" />
                          </linearGradient>
                        </defs>
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                        <circle cx="32" cy="32" r="26" fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (circ * Math.max(pctMedia, 2)) / 100} className="transition-all duration-700" />
                      </svg>
                    </div>
                  );
                })()}

                <div className="relative overflow-hidden p-5 rounded-3xl bg-white border border-slate-200/80 shadow-[0_14px_34px_-22px_rgba(15,23,42,0.45)]">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#00629B] to-[#00A3E0]" />
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Capacidad / bloque</span>
                    <span className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sm">🏛️</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-2">
                    {metricas?.info_periodo?.capacidad_por_bloque ?? 0}<span className="text-sm font-bold text-slate-400 ml-1">cupos</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">{metricas?.info_periodo?.campus_nombre || "Todas las sedes"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                <div className="xl:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-[#00629B]">📊</span> Gráfico: Bloque Horario vs Reservas
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Pasa el cursor sobre cada columna para inspeccionar el flujo y aforo
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-50 text-[#00629B] border border-sky-100 self-start sm:self-auto">
                      {periodoMetricas === "dia" ? "Vista Diaria" : periodoMetricas === "semana" ? "Vista Semanal" : "Vista Mensual"}
                    </span>
                  </div>

                  <div className="relative w-full rounded-2xl bg-gradient-to-b from-sky-50/60 via-white to-white border border-slate-100 p-2">
                    {(() => {
                      const bloques = metricas?.ocupacion_bloques || [];
                      const n = Math.max(1, bloques.length);
                      const X0 = 56, X1 = 736, YT = 34, YB = 256;
                      const rawMax = Math.max(...bloques.map((b) => b.total_reservas), 0);
                      const maxY = Math.max(4, Math.ceil(rawMax / 4) * 4);
                      const stepX = (X1 - X0) / n;
                      const px = (i) => X0 + stepX * (i + 0.5);
                      const py = (v) => YB - (v / maxY) * (YB - YT);
                      const pts = bloques.map((b, i) => ({ x: px(i), y: py(b.total_reservas) }));
                      const clampY = (y) => Math.min(YB, Math.max(YT, y));
                      let linea = "";
                      if (pts.length > 0) {
                        linea = `M ${pts[0].x} ${pts[0].y}`;
                        for (let i = 0; i < pts.length - 1; i++) {
                          const p0 = pts[i - 1] || pts[i];
                          const p1 = pts[i];
                          const p2 = pts[i + 1];
                          const p3 = pts[i + 2] || p2;
                          const t = 0.18;
                          const c1x = p1.x + (p2.x - p0.x) * t;
                          const c1y = clampY(p1.y + (p2.y - p0.y) * t);
                          const c2x = p2.x - (p3.x - p1.x) * t;
                          const c2y = clampY(p2.y - (p3.y - p1.y) * t);
                          linea += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
                        }
                      }
                      const area = pts.length > 0 ? `${linea} L ${pts[pts.length - 1].x} ${YB} L ${pts[0].x} ${YB} Z` : "";
                      const colorNivel = (nv) => nv === "Pico" ? "#e11d48" : nv === "Alta" ? "#f59e0b" : nv === "Media" ? "#00A3E0" : "#10b981";
                      const idxPico = bloques.reduce((m, b, i) => (b.total_reservas > (bloques[m]?.total_reservas ?? -1) ? i : m), 0);
                      const hoverIdx = bloques.findIndex((b) => b.hora === bloqueHoverMetricas);
                      const hb = hoverIdx >= 0 ? bloques[hoverIdx] : null;
                      const tipW = 150, tipH = 62;
                      const tipX = hb ? Math.min(X1 - tipW, Math.max(X0, pts[hoverIdx].x - tipW / 2)) : 0;
                      const tipY = hb ? Math.max(4, pts[hoverIdx].y - tipH - 16) : 0;

                      return (
                        <svg
                          id="grafico-ocupacion-svg"
                          viewBox="0 0 760 330"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-full h-auto select-none overflow-visible"
                          style={{ fontFamily: "Inter, Segoe UI, Arial, sans-serif" }}
                        >
                          <defs>
                            <linearGradient id="uctAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00A3E0" stopOpacity="0.55" />
                              <stop offset="60%" stopColor="#00629B" stopOpacity="0.14" />
                              <stop offset="100%" stopColor="#00629B" stopOpacity="0.02" />
                            </linearGradient>
                            <linearGradient id="uctLineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#00629B" />
                              <stop offset="55%" stopColor="#00A3E0" />
                              <stop offset="100%" stopColor="#FFC20E" />
                            </linearGradient>
                            <filter id="uctGlow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="3" result="b" />
                              <feMerge>
                                <feMergeNode in="b" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          <rect x="0" y="0" width="760" height="330" fill="#ffffff" rx="14" />

                          {[0, 1, 2, 3, 4].map((g) => {
                            const v = (maxY / 4) * g;
                            const y = py(v);
                            return (
                              <g key={g}>
                                <line x1={X0} y1={y} x2={X1} y2={y} stroke={g === 0 ? "#cbd5e1" : "#e2e8f0"} strokeWidth="1" strokeDasharray={g === 0 ? "0" : "4 5"} />
                                <text x={X0 - 10} y={y + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#94a3b8">{Math.round(v)}</text>
                              </g>
                            );
                          })}

                          <text x="14" y={(YT + YB) / 2} fontSize="9" fontWeight="700" fill="#94a3b8" transform={`rotate(-90 14 ${(YT + YB) / 2})`} textAnchor="middle" letterSpacing="1">RESERVAS</text>

                          {hb && (
                            <g>
                              <rect x={pts[hoverIdx].x - stepX / 2 + 3} y={YT - 6} width={stepX - 6} height={YB - YT + 6} rx="10" fill="#00629B" opacity="0.06" />
                              <line x1={pts[hoverIdx].x} y1={pts[hoverIdx].y} x2={pts[hoverIdx].x} y2={YB} stroke="#00629B" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6" />
                            </g>
                          )}

                          {pts.length > 0 && <path d={area} fill="url(#uctAreaGrad)" />}
                          {pts.length > 0 && (
                            <path d={linea} fill="none" stroke="url(#uctLineGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#uctGlow)" />
                          )}

                          {bloques.map((b, i) => {
                            const activo = hoverIdx === i;
                            const esPico = i === idxPico && b.total_reservas > 0;
                            const col = colorNivel(b.nivel_demanda);
                            return (
                              <g key={i}>
                                {esPico && (
                                  <g>
                                    <circle cx={pts[i].x} cy={pts[i].y} r="13" fill={col} opacity="0.16" />
                                    <rect x={pts[i].x - 26} y={pts[i].y - 32} width="52" height="18" rx="9" fill="#0f172a" />
                                    <text x={pts[i].x} y={pts[i].y - 19.5} textAnchor="middle" fontSize="9" fontWeight="800" fill="#FFC20E" letterSpacing="0.6">PICO</text>
                                  </g>
                                )}
                                <circle cx={pts[i].x} cy={pts[i].y} r={activo ? 8 : 5.5} fill="#ffffff" stroke={col} strokeWidth={activo ? 4 : 3} />
                                <text x={pts[i].x} y={YB + 20} textAnchor="middle" fontSize="11" fontWeight={activo ? "800" : "700"} fill={activo ? "#00629B" : "#334155"}>{b.hora}</text>
                                <rect x={pts[i].x - stepX / 2 + 4} y={YB + 30} width={stepX - 8} height="12" rx="6" fill={col} opacity={activo ? 1 : 0.28 + Math.min(0.55, (b.porcentaje_ocupacion || 0) / 100)} />
                              </g>
                            );
                          })}

                          {hb && (
                            <g>
                              <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="12" fill="#0f172a" opacity="0.96" />
                              <text x={tipX + 12} y={tipY + 19} fontSize="11" fontWeight="800" fill="#ffffff">{hb.rango} hrs</text>
                              <text x={tipX + 12} y={tipY + 37} fontSize="10.5" fontWeight="600" fill="#7dd3fc">{hb.total_reservas} reservas · {hb.porcentaje_ocupacion}%</text>
                              <text x={tipX + 12} y={tipY + 53} fontSize="10" fontWeight="600" fill="#fcd34d">Demanda {hb.nivel_demanda}</text>
                            </g>
                          )}

                          {bloques.map((b, i) => (
                            <rect
                              key={`hit-${i}`}
                              x={pts[i].x - stepX / 2}
                              y={YT - 10}
                              width={stepX}
                              height={YB - YT + 56}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setBloqueHoverMetricas(b.hora)}
                              onMouseLeave={() => setBloqueHoverMetricas(null)}
                            />
                          ))}
                        </svg>
                      );
                    })()}
                  </div>

                  {bloqueHoverMetricas && (
                    <div className="p-3 bg-sky-50/90 rounded-2xl border border-sky-200 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
                      {(() => {
                        const bh = (metricas?.ocupacion_bloques || []).find((x) => x.hora === bloqueHoverMetricas);
                        if (!bh) return null;
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#00629B]" />
                              <span className="font-extrabold text-slate-900">{bh.rango} hrs</span>
                            </div>
                            <div className="flex items-center gap-4 text-slate-700">
                              <span><strong>Reservas:</strong> {bh.total_reservas}</span>
                              <span><strong>Ocupación:</strong> {bh.porcentaje_ocupacion}%</span>
                              <span><strong>Disponibles:</strong> {bh.cupos_disponibles} de {bh.capacidad_total}</span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${bh.nivel_demanda === "Pico" ? "bg-rose-100 text-rose-800" :
                                bh.nivel_demanda === "Alta" ? "bg-amber-100 text-amber-800" :
                                  bh.nivel_demanda === "Media" ? "bg-sky-100 text-sky-800" :
                                    "bg-emerald-100 text-emerald-800"
                                }`}>
                                Demanda {bh.nivel_demanda}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Baja (&lt;20%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00A3E0]" /> Media (20-50%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Alta (50-80%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Pico (≥80%)</span>
                    </div>
                    <span className="font-semibold text-slate-600">
                      Capacidad máxima: {metricas?.info_periodo?.capacidad_por_bloque || 0} cubículos/bloque
                    </span>
                  </div>
                </div>

                <div className="xl:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>📑</span> Tabla de Ocupación por Bloque
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Datos en tiempo real sincronizados con el gráfico
                      </p>
                    </div>
                    <button
                      onClick={handleExportarMetricasExcel}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Descargar XLS
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Bloque</th>
                          <th className="py-2.5 px-3 text-center">Reservas</th>
                          <th className="py-2.5 px-3 text-center">% Ocup.</th>
                          <th className="py-2.5 px-3 text-center">Demanda</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {(metricas?.ocupacion_bloques || []).map((b, i) => {
                          const isHovered = bloqueHoverMetricas === b.hora;
                          return (
                            <tr
                              key={i}
                              onMouseEnter={() => setBloqueHoverMetricas(b.hora)}
                              onMouseLeave={() => setBloqueHoverMetricas(null)}
                              className={`transition-colors cursor-pointer ${isHovered
                                ? "bg-sky-50 text-[#00629B] font-bold"
                                : "hover:bg-slate-50/70"
                                }`}
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[#00629B] text-xs">🕒</span>
                                  <span className="text-slate-800 font-medium">{b.rango}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${b.total_reservas > 0 ? "bg-sky-100 text-[#00629B]" : "bg-slate-100 text-slate-500"
                                  }`}>
                                  {b.total_reservas}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${b.porcentaje_ocupacion >= 80
                                        ? "bg-rose-500"
                                        : b.porcentaje_ocupacion >= 50
                                          ? "bg-amber-500"
                                          : b.porcentaje_ocupacion >= 20
                                            ? "bg-[#00A3E0]"
                                            : "bg-emerald-500"
                                        }`}
                                      style={{ width: `${Math.min(100, b.porcentaje_ocupacion)}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-semibold text-slate-700 w-8 text-right">
                                    {b.porcentaje_ocupacion}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${b.nivel_demanda === "Pico"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : b.nivel_demanda === "Alta"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : b.nivel_demanda === "Media"
                                      ? "bg-sky-50 text-[#00629B] border-sky-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}>
                                  {b.nivel_demanda === "Pico" ? "🔥 Pico" : b.nivel_demanda}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800 text-[11px]">
                        <tr>
                          <td className="py-2.5 px-3">Total / Media</td>
                          <td className="py-2.5 px-3 text-center text-[#00629B] font-black">
                            {metricas?.info_periodo?.total_reservas_periodo || 0}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {metricas?.info_periodo?.promedio_ocupacion_pct || 0}%
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-semibold text-[10px]">
                            {metricas?.ocupacion_bloques?.length || 9} bloques
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>💡</span> Selecciona o pasa el cursor sobre una fila para resaltar en el gráfico.
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                <div className="bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-sm">🔥</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Horarios Pico Históricos</h3>
                    </div>
                    <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2 py-0.5 rounded-full">Top Demanda</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Bloques con mayor volumen acumulado de reservas</p>

                  {metricas?.horarios_pico && metricas.horarios_pico.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {metricas.horarios_pico.slice(0, 5).map((p, idx) => {
                        const maxVal = metricas.horarios_pico[0]?.total || 1;
                        const pct = Math.round((p.total / maxVal) * 100);
                        const medalColors = [
                          "bg-[#FFC20E] text-slate-950",
                          "bg-slate-300 text-slate-900",
                          "bg-amber-700 text-white"
                        ];

                        return (
                          <div key={idx} className="space-y-1.5 p-2.5 rounded-2xl bg-white border border-slate-100 shadow-xs">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${idx < 3 ? medalColors[idx] : "bg-slate-100 text-slate-600"}`}>
                                  {idx + 1}
                                </span>
                                <span className="font-bold text-slate-800">{p.hora} hrs</span>
                              </div>
                              <span className="text-[11px] font-black text-[#00629B] bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                                {p.total} reservas
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#00629B] via-[#00A3E0] to-[#FFC20E] rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 text-xs text-slate-600">
                      <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100"><span>10:00 - 12:00 hrs</span><strong className="text-slate-900">Alto flujo</strong></div>
                      <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100"><span>14:00 - 16:00 hrs</span><strong className="text-slate-900">Demanda media</strong></div>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sm">📅</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Días Más Concurridos</h3>
                    </div>
                    <span className="text-[10px] bg-sky-50 text-[#00629B] border border-sky-100 font-bold px-2 py-0.5 rounded-full">Semanal</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Distribución de estudiantes según día de la semana</p>

                  {metricas?.dias_demanda && metricas.dias_demanda.length > 0 ? (
                    <div className="space-y-2.5 pt-2">
                      {metricas.dias_demanda.map((d, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#00A3E0]" />
                            <span className="font-bold text-slate-800 capitalize">{traducirDia(d.dia)}</span>
                          </div>
                          <span className="font-extrabold text-[#00629B] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                            {d.total} reservas
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="p-3 bg-white rounded-2xl border border-slate-100 flex justify-between"><span>Martes y Miércoles</span><strong className="text-amber-600">Días pico</strong></div>
                      <div className="p-3 bg-white rounded-2xl border border-slate-100 flex justify-between"><span>Semana exámenes</span><strong className="text-rose-600">+180% uso</strong></div>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-sm">📉</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Cancelaciones</h3>
                    </div>
                    <span className="text-[10px] bg-rose-50 text-rose-800 border border-rose-100 font-bold px-2 py-0.5 rounded-full">Histórico</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Métricas de asistencias y cancelaciones de reservas</p>

                  <div className="space-y-3 pt-2">
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Promedio de bajas</p>
                        <p className="text-lg font-black text-rose-600 mt-0.5">{metricas?.promedio_cancelaciones_diarias || "0.0 elim/día"}</p>
                      </div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                        Cancelaciones
                      </span>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Tasa de cancelación</p>
                        <p className="text-lg font-black text-slate-900 mt-0.5">{metricas?.tasa_cancelacion_estimada || "0.0%"}</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                        Índice
                      </span>
                    </div>

                    {metricas?.cancelaciones_por_dia && metricas.cancelaciones_por_dia.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Bajas por día de semana</p>
                        <div className="space-y-1.5">
                          {metricas.cancelaciones_por_dia.map((c, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-slate-600 px-2 py-1 bg-slate-50 rounded-lg">
                              <span className="capitalize">{traducirDia(c.dia)}</span>
                              <span className="font-bold text-rose-600">{c.total} bajas</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gráfico y Ranking de Reservas por Carrera (Histórico + Actuales) */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-[#00629B] border border-sky-100 text-[11px] font-black uppercase tracking-wider">
                      <span>🎓</span> Métricas Académicas
                    </div>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
                      Demanda y Ocupación por Carrera
                    </h3>
                    <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                      Comparativa gráfica de demanda estudiantil segmentada por reservas en curso y registros históricos consolidados.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setModoGraficoCarrera("columnas")}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${modoGraficoCarrera === "columnas"
                          ? "bg-white text-[#00629B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        <span>📊</span> Columnas
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoGraficoCarrera("barras")}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${modoGraficoCarrera === "barras"
                          ? "bg-white text-[#00629B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        <span>📈</span> Barras Apiladas
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoGraficoCarrera("donut")}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${modoGraficoCarrera === "donut"
                          ? "bg-white text-[#00629B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        <span>🍩</span> Distribución
                      </button>
                    </div>

                    <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setLimiteCarrerasMetricas(5)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${limiteCarrerasMetricas === 5
                          ? "bg-white text-[#00629B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        Top 5
                      </button>
                      <button
                        type="button"
                        onClick={() => setLimiteCarrerasMetricas(8)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${limiteCarrerasMetricas === 8
                          ? "bg-white text-[#00629B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        Top 8
                      </button>
                      <button
                        type="button"
                        onClick={() => setLimiteCarrerasMetricas(12)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${limiteCarrerasMetricas === 12
                          ? "bg-white text-[#00629B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        Top 12
                      </button>
                      <button
                        type="button"
                        onClick={() => setLimiteCarrerasMetricas(0)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${limiteCarrerasMetricas === 0
                          ? "bg-white text-[#00629B] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        Todas
                      </button>
                    </div>
                  </div>
                </div>

                {(() => {
                  const listaBase = metricas?.reservas_por_carrera || [];
                  if (listaBase.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                        <span className="text-3xl">🎓</span>
                        <p className="text-xs font-bold text-slate-700">No se registran reservas con carreras asociadas</p>
                        <p className="text-[11px] text-slate-400">Los datos se consolidarán conforme los estudiantes generen reservas en el sistema.</p>
                      </div>
                    );
                  }

                  let listaFiltrada = listaBase;
                  if (busquedaCarreraMetricas.trim()) {
                    const q = busquedaCarreraMetricas.toLowerCase().trim();
                    listaFiltrada = listaFiltrada.filter((c) => (c.carrera || "").toLowerCase().includes(q));
                  }

                  if (ordenCarrerasMetricas === "actuales") {
                    listaFiltrada = [...listaFiltrada].sort((a, b) => (b.actuales || 0) - (a.actuales || 0));
                  } else if (ordenCarrerasMetricas === "alfabetico") {
                    listaFiltrada = [...listaFiltrada].sort((a, b) => (a.carrera || "").localeCompare(b.carrera || ""));
                  } else {
                    listaFiltrada = [...listaFiltrada].sort((a, b) => (b.total || 0) - (a.total || 0));
                  }

                  const totalGlobalReservas = listaBase.reduce((acc, c) => acc + (c.total || 0), 0);
                  const totalActuales = listaBase.reduce((acc, c) => acc + (c.actuales || 0), 0);
                  const totalHistoricas = listaBase.reduce((acc, c) => acc + (c.historicas || 0), 0);
                  const maxReservas = listaBase[0]?.total || 1;
                  const itemsAMostrar = limiteCarrerasMetricas > 0 ? listaFiltrada.slice(0, limiteCarrerasMetricas) : listaFiltrada;

                  const medallas = [
                    { badge: "🥇", bg: "bg-amber-100 text-amber-900 border-amber-200" },
                    { badge: "🥈", bg: "bg-slate-200 text-slate-800 border-slate-300" },
                    { badge: "🥉", bg: "bg-amber-200 text-amber-950 border-amber-300" }
                  ];

                  const paletaColores = [
                    "#00629B", "#00A3E0", "#FFC20E", "#004D7A", "#0082B8",
                    "#10B981", "#6366F1", "#EC4899", "#8B5CF6", "#F97316",
                    "#14B8A6", "#E5AC00", "#64748B"
                  ];

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 shadow-2xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#00629B] block">Carrera Líder</span>
                          <div className="text-sm font-extrabold text-slate-900 mt-1 truncate" title={listaBase[0]?.carrera}>
                            👑 {listaBase[0]?.carrera || "N/A"}
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                            {listaBase[0]?.total || 0} reservas ({totalGlobalReservas > 0 ? Math.round(((listaBase[0]?.total || 0) / totalGlobalReservas) * 100) : 0}% de participación)
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Reservas en Curso</span>
                          <div className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
                            <span>⚡</span> {totalActuales} <span className="text-xs font-semibold text-slate-500">activas</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                            {totalGlobalReservas > 0 ? Math.round((totalActuales / totalGlobalReservas) * 100) : 0}% del volumen total en uso
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-2xs">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Volumen Consolidado</span>
                          <div className="text-xl font-black text-[#00629B] mt-1">
                            {totalGlobalReservas} <span className="text-xs font-semibold text-slate-500">reservas</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-medium text-slate-600">
                            <span className="text-slate-500 font-bold">📜 {totalHistoricas} históricas</span>
                            <span>•</span>
                            <span className="text-[#00629B] font-bold">{listaBase.length} carreras</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60 text-xs">
                        <div className="relative flex-1 max-w-sm">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                          <input
                            type="text"
                            placeholder="Buscar carrera académica..."
                            value={busquedaCarreraMetricas}
                            onChange={(e) => setBusquedaCarreraMetricas(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00629B] focus:ring-1 focus:ring-[#00629B] transition-all"
                          />
                          {busquedaCarreraMetricas && (
                            <button
                              type="button"
                              onClick={() => setBusquedaCarreraMetricas("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-[11px] font-bold text-slate-500 shrink-0">Ordenar:</span>
                          <div className="flex items-center gap-1 p-0.5 bg-slate-200/60 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setOrdenCarrerasMetricas("total")}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${ordenCarrerasMetricas === "total"
                                ? "bg-white text-[#00629B] shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                              Demanda Total
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrdenCarrerasMetricas("actuales")}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${ordenCarrerasMetricas === "actuales"
                                ? "bg-white text-emerald-700 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                              Más Activas
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrdenCarrerasMetricas("alfabetico")}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${ordenCarrerasMetricas === "alfabetico"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                              A - Z
                            </button>
                          </div>
                        </div>
                      </div>

                      {modoGraficoCarrera === "columnas" && (
                        <div className="space-y-4">
                          <div className="relative w-full overflow-x-auto bg-slate-50/60 rounded-3xl p-4 sm:p-6 border border-slate-200/70">
                            {(() => {
                              const svgW = 860;
                              const svgH = 340;
                              const padL = 45;
                              const padR = 25;
                              const padT = 30;
                              const padB = 85;
                              const usableW = svgW - padL - padR;
                              const usableH = svgH - padT - padB;
                              const y0 = svgH - padB;

                              const maxVal = Math.max(
                                ...itemsAMostrar.map((c) => Math.max(c.actuales || 0, c.historicas || 0, c.total || 0)),
                                10
                              );
                              const stepX = usableW / Math.max(1, itemsAMostrar.length);
                              const colW = Math.min(26, Math.max(12, stepX * 0.32));

                              const lineasGuia = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
                                y: y0 - pct * usableH,
                                val: Math.round(pct * maxVal)
                              }));

                              const hoverItem = itemsAMostrar.find((x) => x.carrera === carreraHoverMetricas);

                              return (
                                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none overflow-visible">
                                  <defs>
                                    <linearGradient id="uctColActivas" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#00A3E0" />
                                      <stop offset="100%" stopColor="#00629B" />
                                    </linearGradient>
                                    <linearGradient id="uctColHistoricas" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#004D7A" />
                                      <stop offset="100%" stopColor="#1E293B" />
                                    </linearGradient>
                                    <linearGradient id="uctColOro" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#FFC20E" />
                                      <stop offset="100%" stopColor="#E5AC00" />
                                    </linearGradient>
                                    <filter id="uctSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
                                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
                                    </filter>
                                  </defs>

                                  {lineasGuia.map((g, i) => (
                                    <g key={i}>
                                      <line
                                        x1={padL}
                                        y1={g.y}
                                        x2={svgW - padR}
                                        y2={g.y}
                                        stroke={i === 0 ? "#cbd5e1" : "#e2e8f0"}
                                        strokeWidth="1"
                                        strokeDasharray={i === 0 ? "0" : "4 4"}
                                      />
                                      <text x={padL - 8} y={g.y + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#94a3b8">
                                        {g.val}
                                      </text>
                                    </g>
                                  ))}

                                  {itemsAMostrar.map((c, i) => {
                                    const cx = padL + (i + 0.5) * stepX;
                                    const isHover = carreraHoverMetricas === c.carrera;
                                    const actH = Math.max(3, ((c.actuales || 0) / maxVal) * usableH);
                                    const histH = Math.max(3, ((c.historicas || 0) / maxVal) * usableH);
                                    const xAct = cx - colW - 2;
                                    const yAct = y0 - actH;
                                    const xHist = cx + 2;
                                    const yHist = y0 - histH;

                                    const nombreCorto = c.carrera.length > 18
                                      ? c.carrera.slice(0, 16).trim() + "…"
                                      : c.carrera;

                                    return (
                                      <g
                                        key={i}
                                        className="cursor-pointer transition-opacity"
                                        onMouseEnter={() => setCarreraHoverMetricas(c.carrera)}
                                        onMouseLeave={() => setCarreraHoverMetricas(null)}
                                      >
                                        {isHover && (
                                          <rect
                                            x={cx - stepX / 2 + 2}
                                            y={padT - 6}
                                            width={stepX - 4}
                                            height={usableH + 12}
                                            rx="12"
                                            fill="#00629B"
                                            opacity="0.06"
                                          />
                                        )}

                                        {i === 0 && (
                                          <text
                                            x={cx}
                                            y={Math.min(yAct, yHist) - 18}
                                            textAnchor="middle"
                                            fontSize="13"
                                          >
                                            👑
                                          </text>
                                        )}

                                        <rect
                                          x={xAct}
                                          y={yAct}
                                          width={colW}
                                          height={actH}
                                          rx="5"
                                          fill="url(#uctColActivas)"
                                          filter={isHover ? "url(#uctSoftShadow)" : undefined}
                                          opacity={isHover || !carreraHoverMetricas ? 1 : 0.45}
                                        />
                                        <text
                                          x={xAct + colW / 2}
                                          y={yAct - 4}
                                          textAnchor="middle"
                                          fontSize="9"
                                          fontWeight="800"
                                          fill="#00629B"
                                        >
                                          {c.actuales}
                                        </text>

                                        <rect
                                          x={xHist}
                                          y={yHist}
                                          width={colW}
                                          height={histH}
                                          rx="5"
                                          fill="url(#uctColHistoricas)"
                                          filter={isHover ? "url(#uctSoftShadow)" : undefined}
                                          opacity={isHover || !carreraHoverMetricas ? 1 : 0.45}
                                        />
                                        <text
                                          x={xHist + colW / 2}
                                          y={yHist - 4}
                                          textAnchor="middle"
                                          fontSize="9"
                                          fontWeight="800"
                                          fill="#1e293b"
                                        >
                                          {c.historicas}
                                        </text>

                                        <text
                                          x={cx}
                                          y={y0 + 16}
                                          textAnchor="end"
                                          fontSize="10"
                                          fontWeight={isHover ? "800" : "600"}
                                          fill={isHover ? "#00629B" : "#334155"}
                                          transform={`rotate(-32 ${cx} ${y0 + 16})`}
                                        >
                                          {nombreCorto}
                                        </text>
                                      </g>
                                    );
                                  })}

                                  {hoverItem && (() => {
                                    const hIdx = itemsAMostrar.findIndex((x) => x.carrera === hoverItem.carrera);
                                    if (hIdx === -1) return null;
                                    const hx = padL + (hIdx + 0.5) * stepX;
                                    const boxW = 190;
                                    const boxH = 70;
                                    let bx = hx - boxW / 2;
                                    if (bx < padL) bx = padL + 4;
                                    if (bx + boxW > svgW - padR) bx = svgW - padR - boxW - 4;
                                    const by = padT + 4;

                                    return (
                                      <g className="pointer-events-none animate-fadeIn">
                                        <rect
                                          x={bx}
                                          y={by}
                                          width={boxW}
                                          height={boxH}
                                          rx="12"
                                          fill="#0F172A"
                                          opacity="0.96"
                                        />
                                        <text
                                          x={bx + 12}
                                          y={by + 19}
                                          fontSize="11"
                                          fontWeight="800"
                                          fill="#FFFFFF"
                                        >
                                          {hoverItem.carrera.length > 22
                                            ? hoverItem.carrera.slice(0, 20) + "…"
                                            : hoverItem.carrera}
                                        </text>
                                        <text
                                          x={bx + 12}
                                          y={by + 37}
                                          fontSize="10.5"
                                          fontWeight="700"
                                          fill="#38BDF8"
                                        >
                                          ⚡ {hoverItem.actuales} activas · 📜 {hoverItem.historicas} históricas
                                        </text>
                                        <text
                                          x={bx + 12}
                                          y={by + 53}
                                          fontSize="10"
                                          fontWeight="600"
                                          fill="#FCD34D"
                                        >
                                          Total: {hoverItem.total} reservas ({totalGlobalReservas > 0 ? Math.round((hoverItem.total / totalGlobalReservas) * 100) : 0}% institucional)
                                        </text>
                                      </g>
                                    );
                                  })()}
                                </svg>
                              );
                            })()}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-slate-500">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-md bg-gradient-to-r from-[#00629B] to-[#00A3E0]" />
                                <strong className="text-slate-700">Reservas Activas (⚡)</strong>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-md bg-gradient-to-r from-[#004D7A] to-[#1E293B]" />
                                <strong className="text-slate-700">Registros Históricos (📜)</strong>
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Pasa el cursor sobre cada columna para inspeccionar el desglose exacto
                            </span>
                          </div>
                        </div>
                      )}

                      {modoGraficoCarrera === "barras" && (
                        <div className="space-y-3.5">
                          {itemsAMostrar.map((c, idx) => {
                            const pctRelativo = Math.round((c.total / maxReservas) * 100);
                            const pctAbsoluto = totalGlobalReservas > 0 ? Math.round((c.total / totalGlobalReservas) * 100) : 0;
                            const medalla = idx < 3 && ordenCarrerasMetricas === "total" ? medallas[idx] : null;
                            const isHovered = carreraHoverMetricas === c.carrera;

                            const actPctOfTotal = c.total > 0 ? (c.actuales / c.total) * 100 : 0;
                            const histPctOfTotal = c.total > 0 ? (c.historicas / c.total) * 100 : 0;

                            return (
                              <div
                                key={idx}
                                onMouseEnter={() => setCarreraHoverMetricas(c.carrera)}
                                onMouseLeave={() => setCarreraHoverMetricas(null)}
                                className={`group p-4 rounded-2xl border transition-all space-y-2.5 cursor-pointer ${isHovered
                                  ? "bg-sky-50/70 border-sky-300 shadow-xs"
                                  : "bg-white hover:bg-slate-50/70 border-slate-100 hover:border-slate-200 shadow-2xs"
                                  }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 border ${medalla ? medalla.bg : "bg-slate-100 text-slate-600 border-slate-200"
                                        }`}
                                    >
                                      {medalla ? medalla.badge : idx + 1}
                                    </span>
                                    <span className="font-extrabold text-slate-900 group-hover:text-[#00629B] transition-colors truncate">
                                      {c.carrera}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      ⚡ {c.actuales} activas
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                      📜 {c.historicas} históricas
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-black text-[#00629B] bg-sky-50 border border-sky-100 shadow-2xs">
                                      {c.total} reservas ({pctAbsoluto}%)
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="h-4 w-full bg-slate-100 rounded-xl overflow-hidden p-0.5 flex gap-0.5">
                                    {c.actuales > 0 && (
                                      <div
                                        className="h-full bg-gradient-to-r from-[#00629B] to-[#00A3E0] rounded-l-lg transition-all duration-700 ease-out shadow-xs flex items-center justify-end px-1"
                                        style={{ width: `${Math.max(4, (pctRelativo * actPctOfTotal) / 100)}%` }}
                                        title={`${c.actuales} reservas activas`}
                                      />
                                    )}
                                    {c.historicas > 0 && (
                                      <div
                                        className={`h-full bg-gradient-to-r from-[#004D7A] via-[#1E293B] to-[#334155] ${c.actuales === 0 ? "rounded-l-lg" : ""
                                          } rounded-r-lg transition-all duration-700 ease-out shadow-xs flex items-center justify-end px-1`}
                                        style={{ width: `${Math.max(4, (pctRelativo * histPctOfTotal) / 100)}%` }}
                                        title={`${c.historicas} registros históricos`}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {modoGraficoCarrera === "donut" && (
                        <div className="bg-slate-50/60 rounded-3xl p-6 border border-slate-200/70">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-6 flex items-center justify-center">
                              {(() => {
                                const size = 320;
                                const cx = size / 2;
                                const cy = size / 2;
                                const rOut = 120;
                                const rIn = 72;

                                const topSliceItems = itemsAMostrar.slice(0, 7);
                                const restoTotal = itemsAMostrar.slice(7).reduce((acc, x) => acc + (x.total || 0), 0);
                                const slicesData = [...topSliceItems];
                                if (restoTotal > 0) {
                                  slicesData.push({ carrera: "Otras Carreras", total: restoTotal, actuales: 0, historicas: restoTotal });
                                }

                                const totalSlices = slicesData.reduce((acc, x) => acc + (x.total || 0), 0);
                                let currentAngle = -Math.PI / 2;

                                const hoveredSlice = slicesData.find((x) => x.carrera === carreraHoverMetricas);

                                return (
                                  <div className="relative">
                                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible select-none">
                                      {slicesData.map((s, idx) => {
                                        const fraction = totalSlices > 0 ? (s.total || 0) / totalSlices : 0;
                                        const sliceAngle = fraction * 2 * Math.PI;
                                        const startA = currentAngle;
                                        const endA = currentAngle + sliceAngle;
                                        currentAngle = endA;

                                        const isHover = carreraHoverMetricas === s.carrera;
                                        const color = paletaColores[idx % paletaColores.length];

                                        const x1 = cx + rOut * Math.cos(startA);
                                        const y1 = cy + rOut * Math.sin(startA);
                                        const x2 = cx + rOut * Math.cos(endA);
                                        const y2 = cy + rOut * Math.sin(endA);
                                        const x3 = cx + rIn * Math.cos(endA);
                                        const y3 = cy + rIn * Math.sin(endA);
                                        const x4 = cx + rIn * Math.cos(startA);
                                        const y4 = cy + rIn * Math.sin(startA);

                                        const largeArc = sliceAngle > Math.PI ? 1 : 0;
                                        const pathData = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;

                                        return (
                                          <path
                                            key={idx}
                                            d={pathData}
                                            fill={color}
                                            stroke="#FFFFFF"
                                            strokeWidth={isHover ? "3" : "1.5"}
                                            opacity={isHover || !carreraHoverMetricas ? 1 : 0.4}
                                            className="transition-all cursor-pointer"
                                            onMouseEnter={() => setCarreraHoverMetricas(s.carrera)}
                                            onMouseLeave={() => setCarreraHoverMetricas(null)}
                                          />
                                        );
                                      })}
                                    </svg>

                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                                      {hoveredSlice ? (
                                        <>
                                          <span className="text-[10px] font-black uppercase text-[#00629B] truncate max-w-[120px]">
                                            {hoveredSlice.carrera}
                                          </span>
                                          <span className="text-2xl font-black text-slate-900 mt-0.5">
                                            {hoveredSlice.total}
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-500">
                                            {totalSlices > 0 ? Math.round(((hoveredSlice.total || 0) / totalSlices) * 100) : 0}% del volumen
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-[10px] font-black uppercase text-slate-400">Total</span>
                                          <span className="text-2xl font-black text-slate-900 mt-0.5">{totalGlobalReservas}</span>
                                          <span className="text-[10px] font-bold text-slate-500">Reservas</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="lg:col-span-6 space-y-2 max-h-[320px] overflow-y-auto pr-2">
                              {itemsAMostrar.map((c, idx) => {
                                const color = paletaColores[idx % paletaColores.length];
                                const isHover = carreraHoverMetricas === c.carrera;
                                const pct = totalGlobalReservas > 0 ? Math.round((c.total / totalGlobalReservas) * 100) : 0;

                                return (
                                  <div
                                    key={idx}
                                    onMouseEnter={() => setCarreraHoverMetricas(c.carrera)}
                                    onMouseLeave={() => setCarreraHoverMetricas(null)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${isHover
                                      ? "bg-white border-sky-300 shadow-2xs"
                                      : "bg-white/60 border-slate-100 hover:bg-white"
                                      }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: color }} />
                                      <span className="font-bold text-slate-800 truncate" title={c.carrera}>
                                        {c.carrera}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-black text-slate-900">{c.total}</span>
                                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                        {pct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {tipoMetricas === "talleres" && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setTipoMetricas("selector")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <span>←</span>
                  <span>Cambiar tipo de métricas</span>
                </button>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setTipoMetricas("reservas")}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-900"
                  >
                    <span>🏢</span>
                    <span>Métricas de Reservas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMetricas("talleres")}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-[#002D4C] text-white shadow-xs"
                  >
                    <span>🎓</span>
                    <span>Métricas de Talleres</span>
                  </button>
                </div>
              </div>

              {(() => {
                const totalTalleres = solicitudesTalleres.length;
                const pendientesTalleres = solicitudesTalleres.filter((t) => t.estado === "pendiente").length;
                const aprobadosTalleres = solicitudesTalleres.filter((t) => t.estado === "aprobado").length;
                const realizadosTalleres = solicitudesTalleres.filter((t) => t.estado === "realizado").length;
                const rechazadosTalleres = solicitudesTalleres.filter((t) => t.estado === "rechazado").length;
                const resueltosTalleres = aprobadosTalleres + realizadosTalleres;
                const tasaExitoTalleres = totalTalleres > 0 ? Math.round((resueltosTalleres / totalTalleres) * 100) : 0;

                const totalParticipantesTalleres = solicitudesTalleres.reduce((acc, t) => {
                  const p = parseInt(t.participantes, 10);
                  return acc + (isNaN(p) || p <= 0 ? 1 : p);
                }, 0);

                const presencialTalleres = solicitudesTalleres.filter((t) => (t.modalidad || "").toLowerCase().includes("presencial")).length;
                const virtualTalleres = solicitudesTalleres.filter((t) => (t.modalidad || "").toLowerCase().includes("virtual") || (t.modalidad || "").toLowerCase().includes("online")).length;
                const pctPresencial = totalTalleres > 0 ? Math.round((presencialTalleres / totalTalleres) * 100) : 0;
                const pctVirtual = totalTalleres > 0 ? 100 - pctPresencial : 0;

                const talleresCountMap = {};
                solicitudesTalleres.forEach((t) => {
                  const nombre = (t.taller || "Sin especificar").trim();
                  talleresCountMap[nombre] = (talleresCountMap[nombre] || 0) + 1;
                });

                const TALLERES_ESTANDAR = [
                  { nombre: "Conoce tu biblioteca: Taller de inicio", icono: "🧭", tag: "Inducción" },
                  { nombre: "Búsqueda y evaluación de información", icono: "🔎", tag: "Investigación" },
                  { nombre: "Gestión de referencias y estilo de citas", icono: "📑", tag: "Citas y Normas" },
                  { nombre: "Uso ético de la información", icono: "⚖️", tag: "Integridad" },
                  { nombre: "Introducción a Leganto", icono: "📚", tag: "Plataforma" },
                  { nombre: "ORCID", icono: "🆔", tag: "Identidad Digital" },
                ];

                TALLERES_ESTANDAR.forEach((t) => {
                  if (talleresCountMap[t.nombre] === undefined) {
                    talleresCountMap[t.nombre] = 0;
                  }
                });

                const rankingTalleres = Object.entries(talleresCountMap)
                  .map(([nombre, count]) => {
                    const meta = TALLERES_ESTANDAR.find((m) => m.nombre === nombre) || { icono: "🎓", tag: "Taller" };
                    return {
                      nombre,
                      count,
                      icono: meta.icono,
                      tag: meta.tag,
                      pct: totalTalleres > 0 ? Math.round((count / totalTalleres) * 100) : 0
                    };
                  })
                  .sort((a, b) => b.count - a.count);

                const topTallerObj = rankingTalleres[0] && rankingTalleres[0].count > 0 ? rankingTalleres[0] : null;

                const carrerasTalleresMap = {};
                solicitudesTalleres.forEach((t) => {
                  const c = (t.carrera || "Sin carrera informada").trim();
                  carrerasTalleresMap[c] = (carrerasTalleresMap[c] || 0) + 1;
                });
                const rankingCarrerasTalleres = Object.entries(carrerasTalleresMap)
                  .map(([carrera, count]) => ({
                    carrera,
                    count,
                    pct: totalTalleres > 0 ? Math.round((count / totalTalleres) * 100) : 0
                  }))
                  .sort((a, b) => b.count - a.count);

                return (
                  <div className="space-y-7">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div className="space-y-1.5">
                        <span className={EYEBROW}>🎓 Formación y Competencias en Información</span>
                        <h2 className={SECTION_TITLE}>Inteligencia y Demanda de Talleres Especializados</h2>
                        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                          Estadísticas consolidadas de solicitudes de capacitación, índice de atención, desglose temático por taller, modalidades solicitadas y carreras universitarias con mayor demanda.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                        <button
                          type="button"
                          onClick={handleExportarMetricasTalleresExcel}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span>📑</span>
                          <span>Exportar Excel (.xlsx)</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Total Solicitudes</span>
                          <span className="w-8 h-8 rounded-xl bg-blue-100 text-[#00629B] flex items-center justify-center text-sm font-bold">📚</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">{totalTalleres}</div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {realizadosTalleres} realizados · {aprobadosTalleres} aprobados
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Tasa de Aprobación</span>
                          <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">🎯</span>
                        </div>
                        <div className="text-2xl font-black text-emerald-600">{tasaExitoTalleres}%</div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {pendientesTalleres} en espera de respuesta
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Taller Más Solicitado</span>
                          <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold">🏆</span>
                        </div>
                        <div className="text-sm font-black text-slate-900 line-clamp-1" title={topTallerObj ? topTallerObj.nombre : "Sin datos"}>
                          {topTallerObj ? topTallerObj.nombre : "Sin datos"}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {topTallerObj ? `${topTallerObj.count} solicitudes (${topTallerObj.pct}%)` : "Sin solicitudes"}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Modalidad Preferida</span>
                          <span className="w-8 h-8 rounded-xl bg-sky-100 text-[#00A3E0] flex items-center justify-center text-sm font-bold">💻</span>
                        </div>
                        <div className="text-2xl font-black text-[#00629B]">{pctPresencial}% Presencial</div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {pctVirtual}% Virtual · {totalParticipantesTalleres} participantes est.
                        </p>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Estado del Flujo de Solicitudes</h3>
                          <p className="text-xs text-slate-500">Proporción según el ciclo de atención institucional</p>
                        </div>
                        <span className="text-xs font-bold text-slate-600">{totalTalleres} solicitudes totales</span>
                      </div>

                      {totalTalleres > 0 ? (
                        <>
                          <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                            {realizadosTalleres > 0 && (
                              <div
                                style={{ width: `${(realizadosTalleres / totalTalleres) * 100}%` }}
                                className="bg-emerald-500 transition-all duration-500"
                                title={`Realizados: ${realizadosTalleres}`}
                              />
                            )}
                            {aprobadosTalleres > 0 && (
                              <div
                                style={{ width: `${(aprobadosTalleres / totalTalleres) * 100}%` }}
                                className="bg-[#00A3E0] transition-all duration-500"
                                title={`Aprobados: ${aprobadosTalleres}`}
                              />
                            )}
                            {pendientesTalleres > 0 && (
                              <div
                                style={{ width: `${(pendientesTalleres / totalTalleres) * 100}%` }}
                                className="bg-[#FFC20E] transition-all duration-500"
                                title={`Pendientes: ${pendientesTalleres}`}
                              />
                            )}
                            {rechazadosTalleres > 0 && (
                              <div
                                style={{ width: `${(rechazadosTalleres / totalTalleres) * 100}%` }}
                                className="bg-rose-500 transition-all duration-500"
                                title={`Rechazados: ${rechazadosTalleres}`}
                              />
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-slate-700">Realizados</div>
                                <div className="text-sm font-black text-slate-900">
                                  {realizadosTalleres} <span className="text-[10px] text-slate-400 font-normal">({totalTalleres > 0 ? Math.round((realizadosTalleres / totalTalleres) * 100) : 0}%)</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full bg-[#00A3E0] shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-slate-700">Aprobados</div>
                                <div className="text-sm font-black text-slate-900">
                                  {aprobadosTalleres} <span className="text-[10px] text-slate-400 font-normal">({totalTalleres > 0 ? Math.round((aprobadosTalleres / totalTalleres) * 100) : 0}%)</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full bg-[#FFC20E] shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-slate-700">Pendientes</div>
                                <div className="text-sm font-black text-slate-900">
                                  {pendientesTalleres} <span className="text-[10px] text-slate-400 font-normal">({totalTalleres > 0 ? Math.round((pendientesTalleres / totalTalleres) * 100) : 0}%)</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-slate-700">Rechazados</div>
                                <div className="text-sm font-black text-slate-900">
                                  {rechazadosTalleres} <span className="text-[10px] text-slate-400 font-normal">({totalTalleres > 0 ? Math.round((rechazadosTalleres / totalTalleres) * 100) : 0}%)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic py-2">No se han registrado solicitudes de talleres aún.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Demanda por Taller Temático</h3>
                            <p className="text-xs text-slate-500">Distribución de las solicitudes entre los 6 talleres</p>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-[#00629B] border border-sky-200/60">
                            Catálogo Oficial
                          </span>
                        </div>

                        <div className="space-y-3">
                          {rankingTalleres.map((t, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2 font-bold text-slate-800">
                                  <span>{t.icono}</span>
                                  <span>{t.nombre}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-black text-slate-900">{t.count}</span>
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                                    {t.pct}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${t.pct}%` }}
                                  className="h-full bg-gradient-to-r from-[#00629B] to-[#00A3E0] rounded-full transition-all duration-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Preferencia de Modalidad</h3>
                              <p className="text-xs text-slate-500">Presencialidad vs formato virtual</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                              <div className="text-2xl">🏛️</div>
                              <div className="text-xs font-bold text-slate-600">Presencial</div>
                              <div className="text-2xl font-black text-[#002D4C]">{presencialTalleres}</div>
                              <div className="text-[11px] font-bold text-slate-400">{pctPresencial}% del total</div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                              <div className="text-2xl">🌐</div>
                              <div className="text-xs font-bold text-slate-600">Virtual / En Línea</div>
                              <div className="text-2xl font-black text-[#00A3E0]">{virtualTalleres}</div>
                              <div className="text-[11px] font-bold text-slate-400">{pctVirtual}% del total</div>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Demanda por Carrera / Programa</h3>
                              <p className="text-xs text-slate-500">Programas académicos con mayor participación</p>
                            </div>
                          </div>

                          {rankingCarrerasTalleres.length > 0 ? (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {rankingCarrerasTalleres.slice(0, 6).map((c, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <span className="font-semibold text-slate-800">{c.carrera}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-900">{c.count} sol.</span>
                                    <span className="text-[10px] text-slate-400 font-bold">({c.pct}%)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No hay información de carreras aún.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-sky-50/60 rounded-2xl border border-sky-100">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">¿Deseas gestionar o responder solicitudes?</h4>
                          <p className="text-[11px] text-slate-500">Accede directamente al panel operativo de talleres para responder o gestionar solicitudes.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("talleres")}
                        className="px-4 py-2 bg-[#00629B] hover:bg-[#002D4C] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        Ir a Talleres Solicitados →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

          {(activeTab === "historial") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-6 animate-fadeIn`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>🏛️ Registro histórico</span>
                  <h2 className={SECTION_TITLE}>Historial de Reservas y Cancelaciones</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Consulta el registro permanente de reservas pasadas, archivadas o canceladas por los estudiantes.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={handleDescargarExcelHistorial}
                    disabled={exportandoExcel || cargandoHistorial}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-[0_6px_16px_-8px_rgba(5,150,105,0.9)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Exportar archivo Excel (.xlsx)"
                  >
                    <span>📊</span>
                    <span>{exportandoExcel ? "Generando Excel..." : "Descargar Excel"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLimpiarHistorial}
                    disabled={limpiandoHistorial || cargandoHistorial || historial.length === 0}
                    className={BTN_DANGER}
                    title="Purgar y vaciar historial antiguo"
                  >
                    <span>🗑️</span>
                    <span>{limpiandoHistorial ? "Limpiando..." : "Limpiar historial"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setMostrarHistorial(!mostrarHistorial);
                      if (!mostrarHistorial) fetchHistorial();
                    }}
                    className={`${BTN_PRIMARY} px-4 py-2.5`}
                  >
                    <span>{mostrarHistorial ? "🙈 Ocultar" : "👁️ Mostrar"}</span>
                  </button>
                </div>
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
                          placeholder="🔍 Buscar por alumno o RUT..."
                          className={INPUT}
                        />
                      </div>
                      <select
                        value={campusFiltroHistorial}
                        onChange={(e) => setCampusFiltroHistorial(e.target.value)}
                        className={`${INPUT} sm:w-auto font-semibold cursor-pointer`}
                      >
                        <option value="todos">🌐 Todas las sedes</option>
                        {campus.map((c) => (
                          <option key={c.id} value={c.id}>📍 {c.nombre}</option>
                        ))}
                      </select>
                      <select
                        value={filtroEstadoHistorial}
                        onChange={(e) => setFiltroEstadoHistorial(e.target.value)}
                        className={`${INPUT} sm:w-auto font-semibold cursor-pointer`}
                      >
                        <option value="todos">📋 Todos los estados</option>
                        <option value="completada">✅ Completada con éxito</option>
                        <option value="liberada">🔓 Liberada por estudiante</option>
                        <option value="cancelada">🚫 Cancelada por admin</option>
                        <option value="inasistencia">⚠️ Inasistencia</option>
                        <option value="activa">🔵 Activa / En curso</option>
                        <option value="justificada">⚖️ Justificada</option>
                      </select>
                    </div>
                    <button onClick={() => fetchHistorial(1, limiteHistorial)} className={BTN_GHOST}>
                      🔄 Actualizar registros
                    </button>
                  </div>

                  {cargandoHistorial ? (
                    <div className="py-14 text-center text-slate-500 space-y-3">
                      <div className="w-6 h-6 border-2 border-[#00629B] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-medium">Cargando registros históricos...</p>
                    </div>
                  ) : historial.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                      No hay reservas registradas en el historial para esta búsqueda.
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                              <th className="p-3.5">ID original</th>
                              <th className="p-3.5">Alumno titular</th>
                              <th className="p-3.5">RUT</th>
                              <th className="p-3.5">Carrera</th>
                              <th className="p-3.5">Sede</th>
                              <th className="p-3.5">Fecha reserva</th>
                              <th className="p-3.5">Hora bloque</th>
                              <th className="p-3.5">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {historial.map((h) => (
                              <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3.5 font-semibold text-slate-400">#{h.reserva_id || h.id}</td>
                                <td className="p-3.5 font-bold text-slate-900">{h.nombre}</td>
                                <td className="p-3.5 font-medium text-slate-700">{h.rut}</td>
                                <td className="p-3.5 font-semibold text-[#00629B] max-w-[200px] truncate" title={h.carrera || "General"}>
                                  {h.carrera || "General"}
                                </td>
                                <td className="p-3.5 text-slate-600 font-medium">{h.campus_nombre || "Sede Principal"}</td>
                                <td className="p-3.5 text-slate-800 font-semibold">{h.fecha}</td>
                                <td className="p-3.5 font-bold text-[#00629B]">{h.hora} hrs</td>
                                <td className="p-3.5">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${h.estado === "cancelada"
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : h.estado === "liberada"
                                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                                          : h.estado === "inasistencia"
                                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                                            : h.estado === "completada" || h.estado === "expirada"
                                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                              : h.estado === "justificada"
                                                ? "bg-purple-50 text-purple-800 border border-purple-200"
                                                : "bg-sky-50 text-sky-800 border border-sky-200"
                                      }`}
                                  >
                                    {h.estado === "inasistencia"
                                      ? "⚠️ Inasistencia"
                                      : h.estado === "liberada"
                                        ? "🔓 Liberada"
                                        : h.estado === "cancelada"
                                          ? "🚫 Cancelada"
                                          : h.estado === "completada" || h.estado === "expirada"
                                            ? "✅ Completada con éxito"
                                            : h.estado === "justificada"
                                              ? "⚖️ Justificada"
                                              : "🔵 Activa"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {totalHistorial > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Mostrar</span>
                            <select
                              value={limiteHistorial}
                              onChange={(e) => {
                                const nuevoLim = Number(e.target.value);
                                setLimiteHistorial(nuevoLim);
                                setPaginaHistorial(1);
                                fetchHistorial(1, nuevoLim);
                              }}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer shadow-2xs hover:border-slate-300"
                            >
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                            <span className="font-medium">por página</span>
                            <span className="text-slate-400 ml-2 font-mono text-[11px]">
                              ({(paginaHistorial - 1) * limiteHistorial + 1} - {Math.min(paginaHistorial * limiteHistorial, totalHistorial)} de {totalHistorial})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={paginaHistorial <= 1 || cargandoHistorial}
                              onClick={() => {
                                const prev = paginaHistorial - 1;
                                setPaginaHistorial(prev);
                                fetchHistorial(prev, limiteHistorial);
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                            >
                              ◀ Anterior
                            </button>
                            <span className="px-3 py-1.5 font-bold text-[#00629B] bg-sky-50 rounded-xl border border-sky-100 font-mono text-xs">
                              {paginaHistorial} / {Math.max(1, Math.ceil(totalHistorial / limiteHistorial))}
                            </span>
                            <button
                              type="button"
                              disabled={paginaHistorial >= Math.ceil(totalHistorial / limiteHistorial) || cargandoHistorial}
                              onClick={() => {
                                const sig = paginaHistorial + 1;
                                setPaginaHistorial(sig);
                                fetchHistorial(sig, limiteHistorial);
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                            >
                              Siguiente ▶
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODAL DETALLE DE RESERVAS */}
          {bloqueSeleccionado && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-2xl p-6 space-y-4 max-h-[85vh] flex flex-col`}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-slate-900">
                      Reservas del bloque {bloqueSeleccionado.rango}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fechaSeleccionada} · {reservasBloque.length} cubículo(s) agendado(s)
                    </p>
                  </div>
                  <button
                    onClick={() => setBloqueSeleccionado(null)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {cargandoBloque ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                          <div className="flex justify-between items-center">
                            <div className="h-5 w-32 rounded-lg bg-slate-200/80" />
                            <div className="h-5 w-16 rounded-lg bg-slate-200/60" />
                          </div>
                          <div className="h-4 w-44 rounded bg-slate-200/70" />
                          <div className="h-3 w-28 rounded bg-slate-200/50" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 to-transparent animate-shimmer" />
                        </div>
                      ))}
                    </div>
                  ) : reservasBloque.length === 0 ? (
                    <p className="py-10 text-center text-xs text-slate-500">
                      No hay reservas activas para este bloque.
                    </p>
                  ) : (
                    reservasBloque.map((res, idx) => (
                      <div
                        key={res.id || idx}
                        className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all space-y-3 shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#00629B] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                            📍 Cubículo {res.cubiculo_codigo || `CUB-${idx + 1}`}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">ID {res.id}</span>

                            {haPasadoTolerancia10Min(res.fecha || fechaSeleccionada, res.hora || bloqueSeleccionado?.hora) ? (
                              <button
                                type="button"
                                onClick={() => handleMarcarInasistencia(res.id, res.rut, res.nombre)}
                                disabled={eliminandoReservaId === res.id}
                                className="px-3 py-1.5 rounded-xl bg-[#FFC20E] hover:bg-[#EDB100] text-slate-950 font-bold text-[11px] transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                                title="Pasaron 10 minutos. Eliminar y registrar como inasistencia."
                              >
                                {eliminandoReservaId === res.id ? (
                                  <span>Procesando...</span>
                                ) : (
                                  <>
                                    <span>⚠️</span> Inasistencia (+10m)
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 font-medium text-[11px] flex items-center gap-1 cursor-not-allowed"
                                title="Se activará tras 10 minutos del inicio del bloque"
                              >
                                <span>⏱️</span> Espera 10m
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleEliminarReserva(res.id)}
                              disabled={eliminandoReservaId === res.id}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-semibold text-[11px] transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                          <div>
                            <p className="text-[11px] text-slate-500 font-medium">Alumno titular</p>
                            <p className="font-bold text-slate-900">{res.nombre}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500 font-medium">RUT</p>
                            <p className="font-semibold text-slate-800">{res.rut}</p>
                          </div>
                        </div>

                        {/* Acompañantes */}
                        {res.acompanantes && res.acompanantes.length > 0 && (
                          <div className="pt-1 text-xs">
                            <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
                              👥 Acompañantes registrados ({res.acompanantes.length})
                            </p>
                            <ul className="space-y-1 pl-3 border-l-2 border-[#FFC20E]">
                              {res.acompanantes.map((ac, i) => (
                                <li key={i} className="text-slate-700 text-[11px]">
                                  <strong className="font-semibold">{ac.nombre}</strong> {ac.rut ? `(${ac.rut})` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setBloqueSeleccionado(null)}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {mostrarGraficoMetricas && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-4xl p-6 md:p-8 space-y-6 max-h-[90vh] flex flex-col overflow-hidden`}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1.5">
                    <span className={EYEBROW}>Visualización interactiva</span>
                    <h3 className="text-xl font-serif font-bold text-slate-900">
                      Análisis de demanda y ocupación
                    </h3>
                  </div>
                  <button
                    onClick={() => setMostrarGraficoMetricas(false)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  <div className="bg-white rounded-2xl p-6 space-y-5 border border-slate-200/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span className="text-[#00629B]">📊</span> Horarios de mayor ocupación
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Distribución del flujo de estudiantes agendados por bloque horario
                        </p>
                      </div>
                      <span className="text-[11px] bg-sky-50 text-[#00629B] border border-sky-100 font-semibold px-3 py-1 rounded-full self-start sm:self-auto">
                        Ocupación institucional
                      </span>
                    </div>

                    <div className="h-60 flex items-end justify-between gap-4 pt-10 pb-4 px-4 bg-gradient-to-b from-sky-50/50 via-white to-slate-50/60 rounded-2xl border border-slate-200/80">
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
                          Math.max(Math.round((item.total / max) * 100), 12),
                          100
                        );
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-2.5 group cursor-pointer"
                          >
                            <span className="text-[11px] font-bold text-[#00629B] group-hover:text-[#FFC20E] transition-colors bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs">
                              {item.total}
                            </span>
                            <div className="h-36 w-5 sm:w-6 md:w-7 bg-slate-100 rounded-full flex items-end justify-center p-0.5 relative overflow-hidden border border-slate-200">
                              <div
                                className="w-full rounded-full bg-gradient-to-t from-[#00629B] via-[#00A3E0] to-[#FFC20E] transition-all duration-500 group-hover:brightness-110"
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[65px] text-center">
                              {item.hora.split("-")[0]} hrs
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-4 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>📅</span> Ocupación por día de la semana
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
                            <div key={i} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span className="capitalize">{traducirDia(d.dia)}</span>
                                <span className="text-[#00629B] font-extrabold bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                                  {d.total} reservas
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#00629B] via-[#00A3E0] to-[#FFC20E] rounded-full transition-all duration-500"
                                  style={{ width: `${pctD}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-4 flex flex-col justify-between shadow-xs">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>🎯</span> Resumen de eficiencia
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Indicadores clave para decisiones de infraestructura.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">
                            Eliminaciones por día
                          </span>
                          <span className="text-sm font-extrabold text-rose-600">
                            {metricas?.promedio_cancelaciones_diarias || "0.0 elim/día"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">
                            Tasa de cancelación
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {metricas?.tasa_cancelacion_estimada || "0.0%"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">
                            Pico en exámenes
                          </span>
                          <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 px-2 py-1 rounded-lg border border-sky-100">
                            {metricas?.semana_pico_examenes || "Semana 16"}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-sky-50/70 rounded-xl text-[11px] text-slate-700 border border-sky-100 leading-relaxed">
                        💡 <strong>Recomendación:</strong> optimizar cubículos en bloques de alta demanda durante los días pico.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setMostrarGraficoMetricas(false)}
                    className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Cerrar gráficos
                  </button>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "sanciones") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>⚖️ Asistencia y Disciplina</span>
                  <h2 className={SECTION_TITLE}>Estudiantes Sancionados y Penalizaciones</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Supervisa a los estudiantes con inasistencias acumuladas y suspensiones temporales activas. Puedes levantar sanciones justificando sus inasistencias directamente.
                  </p>
                </div>
                <button onClick={fetchSancionados} className={BTN_GHOST}>
                  🔄 Actualizar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl shrink-0">
                    🚫
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Cuentas Suspendidas</p>
                    <p className="text-2xl font-extrabold text-rose-950">
                      {sancionados.filter((s) => s.suspendido).length}
                    </p>
                    <p className="text-[10px] text-rose-700">Bloqueados temporalmente (≥ 2 inasistencias)</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0">
                    ⚠️
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">En Advertencia</p>
                    <p className="text-2xl font-extrabold text-amber-950">
                      {sancionados.filter((s) => !s.suspendido).length}
                    </p>
                    <p className="text-[10px] text-amber-800">1 inasistencia registrada</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center text-xl shrink-0">
                    👥
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Total Con Inasistencias</p>
                    <p className="text-2xl font-extrabold text-slate-900">
                      {sancionados.length}
                    </p>
                    <p className="text-[10px] text-slate-500">Estudiantes en el registro disciplinario</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Buscar estudiante por nombre o RUT..."
                    value={busquedaSancionados}
                    onChange={(e) => setBusquedaSancionados(e.target.value)}
                    className={`${INPUT} pl-9`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    🔍
                  </span>
                  {busquedaSancionados && (
                    <button
                      type="button"
                      onClick={() => setBusquedaSancionados("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {cargandoSancionados ? (
                  <div className="py-16 text-center text-xs text-[#00629B] font-medium animate-pulse">
                    Cargando estudiantes sancionados...
                  </div>
                ) : sancionados.length === 0 ? (
                  <div className="py-14 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/60 text-xs text-slate-500 space-y-2">
                    <span className="text-3xl block">🎉</span>
                    <p className="font-bold text-slate-700">No hay estudiantes sancionados</p>
                    <p className="text-[11px] text-slate-400">Todos los estudiantes cuentan con su historial de asistencia al día.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Estudiante</th>
                          <th className="py-3 px-4">RUT</th>
                          <th className="py-3 px-4 text-center">Inasistencias</th>
                          <th className="py-3 px-4">Estado Disciplinario</th>
                          <th className="py-3 px-4">Última Inasistencia</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sancionados
                          .filter((s) => {
                            if (!busquedaSancionados.trim()) return true;
                            const q = busquedaSancionados.toLowerCase();
                            return (
                              (s.nombre || "").toLowerCase().includes(q) ||
                              (s.rut || "").toLowerCase().includes(q)
                            );
                          })
                          .map((est) => (
                            <tr key={est.rut} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900">
                                {est.nombre}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                                {est.rut}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold ${est.suspendido
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                                  }`}>
                                  {est.total_inasistencias}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {est.suspendido ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                      Suspendido ({est.dias_restantes}d restantes)
                                    </span>
                                    {est.fecha_desbloqueo && (
                                      <p className="text-[10px] text-slate-500">
                                        Hasta el {est.fecha_desbloqueo}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                    ⚠️ Advertencia (1 falta)
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                                {est.ultima_inasistencia || "Reciente"}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleLevantarSancion(est)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs cursor-pointer shadow-xs transition-all"
                                  title="Justificar inasistencias y levantar sanción"
                                >
                                  <span>🕊️</span> Quitar sanción
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === "incidencias") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>⚠️ Mesa de Ayuda y Mantenimiento</span>
                  <h2 className={SECTION_TITLE}>Reporte de Incidencias en Cubículos</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Problemas técnicos, mobiliario o fallas físicas reportadas por los estudiantes en sus cubículos. Puedes actualizar el estado de cada reporte o programar mantenimiento directo del cubículo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchIncidencias}
                    disabled={cargandoIncidencias}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <svg className={`w-3.5 h-3.5 ${cargandoIncidencias ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por cubículo, sede, alumno o descripción..."
                    value={busquedaIncidencia}
                    onChange={(e) => setBusquedaIncidencia(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00629B]/20 focus:border-[#00629B] transition-all"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                  {[
                    { id: "todos", label: "Todas" },
                    { id: "pendiente", label: "Pendientes" },
                    { id: "en_revision", label: "En revisión" },
                    { id: "resuelta", label: "Resueltas" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroEstadoIncidencia(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${filtroEstadoIncidencia === f.id
                        ? "bg-white text-[#00629B] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {cargandoIncidencias ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <span className="animate-spin text-base">⏳</span> Cargando incidencias...
                  </div>
                ) : incidencias.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <span className="text-3xl block mb-2">🎉</span>
                    <p className="text-sm font-semibold text-slate-700">No hay incidencias registradas</p>
                    <p className="text-xs text-slate-400 mt-1">Todos los cubículos están operando sin reportes de fallas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-4">Cubículo / Sede</th>
                          <th className="py-3 px-4">Categoría</th>
                          <th className="py-3 px-4">Descripción del problema</th>
                          <th className="py-3 px-4">Reportado por</th>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {incidencias
                          .filter((inc) => {
                            if (filtroEstadoIncidencia !== "todos" && inc.estado !== filtroEstadoIncidencia) {
                              return false;
                            }
                            const q = busquedaIncidencia.toLowerCase();
                            if (!q) return true;
                            return (
                              (inc.cubiculo_codigo || "").toLowerCase().includes(q) ||
                              (inc.campus_nombre || "").toLowerCase().includes(q) ||
                              (inc.descripcion || "").toLowerCase().includes(q) ||
                              (inc.estudiante_nombre || "").toLowerCase().includes(q) ||
                              (inc.estudiante_rut || "").toLowerCase().includes(q) ||
                              (inc.categoria || "").toLowerCase().includes(q)
                            );
                          })
                          .map((inc) => (
                            <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-slate-900 bg-sky-50 text-[#00629B] px-2 py-0.5 rounded border border-sky-200/60">
                                  {inc.cubiculo_codigo}
                                </span>
                                <p className="text-[11px] text-slate-500 mt-0.5">{inc.campus_nombre}</p>
                                {inc.reserva_id && (
                                  <p className="text-[10px] text-slate-400">Pase #{inc.reserva_id}</p>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                                  {inc.categoria === "electricidad" && "⚡ Electricidad"}
                                  {inc.categoria === "mobiliario" && "🪑 Mobiliario"}
                                  {inc.categoria === "limpieza" && "🧹 Limpieza"}
                                  {inc.categoria === "tecnologia" && "🖥️ Tecnología"}
                                  {inc.categoria === "clima" && "❄️ Climatización"}
                                  {inc.categoria === "otro" && "📌 Otro"}
                                  {!["electricidad", "mobiliario", "limpieza", "tecnologia", "clima", "otro"].includes(inc.categoria) && inc.categoria}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                                <p className="text-slate-800 text-[12px] font-medium leading-relaxed">
                                  {inc.descripcion}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {inc.created_at || "Fecha no registrada"}
                                </p>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-slate-900">{inc.estudiante_nombre || "Estudiante"}</p>
                                <p className="font-mono text-[11px] text-slate-500">{inc.estudiante_rut || "Sin RUT"}</p>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${inc.estado === "pendiente"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : inc.estado === "en_revision"
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  }`}>
                                  {inc.estado === "pendiente" && "⚠️ Pendiente"}
                                  {inc.estado === "en_revision" && "🔧 En revisión"}
                                  {inc.estado === "resuelta" && "✅ Resuelta"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {inc.estado !== "resuelta" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleMantenimientoDesdeIncidencia(inc)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-[11px] cursor-pointer shadow-xs transition"
                                        title="Poner cubículo en mantenimiento"
                                      >
                                        <span>🛠️</span> Mantención
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCambiarEstadoIncidencia(inc.id, "resuelta")}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] cursor-pointer shadow-xs transition"
                                        title="Marcar como resuelta"
                                      >
                                        <span>✅</span> Resolver
                                      </button>
                                    </>
                                  )}
                                  {inc.estado === "resuelta" && (
                                    <button
                                      type="button"
                                      onClick={() => handleCambiarEstadoIncidencia(inc.id, "en_revision")}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium text-[11px] cursor-pointer transition"
                                      title="Reabrir incidencia"
                                    >
                                      <span>🔄</span> Reabrir
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === "talleres") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>🎓 Asistente Virtual & n8n</span>
                  <h2 className={SECTION_TITLE}>Talleres Especializados Solicitados</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Gestiona las solicitudes de talleres de biblioteca enviadas por los estudiantes a través del asistente virtual.
                  </p>
                </div>
                <button
                  onClick={fetchSolicitudesTalleres}
                  disabled={cargandoTalleres}
                  className={BTN_GHOST}
                >
                  🔄 {cargandoTalleres ? "Cargando..." : "Actualizar"}
                </button>
              </div>

              {/* Tarjetas resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 text-sky-950">
                  <p className="text-[11px] font-bold text-[#00629B] uppercase tracking-wider">Total Solicitudes</p>
                  <p className="text-2xl font-serif font-bold text-slate-900 mt-1">{solicitudesTalleres.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-amber-950">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pendientes</p>
                  <p className="text-2xl font-serif font-bold text-slate-900 mt-1">
                    {solicitudesTalleres.filter((s) => s.estado === "pendiente").length}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-emerald-950">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Aprobados</p>
                  <p className="text-2xl font-serif font-bold text-slate-900 mt-1">
                    {solicitudesTalleres.filter((s) => s.estado === "aprobado").length}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Realizados</p>
                  <p className="text-2xl font-serif font-bold text-slate-900 mt-1">
                    {solicitudesTalleres.filter((s) => s.estado === "realizado").length}
                  </p>
                </div>
              </div>

              {/* Filtros de búsqueda */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    value={busquedaTaller}
                    onChange={(e) => setBusquedaTaller(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchSolicitudesTalleres()}
                    placeholder="Buscar por estudiante, RUT, carrera o taller..."
                    className={`${INPUT} pl-9`}
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={filtroEstadoTaller}
                    onChange={(e) => setFiltroEstadoTaller(e.target.value)}
                    className={`${INPUT} sm:w-44 font-semibold cursor-pointer`}
                  >
                    <option value="">Todos los estados</option>
                    <option value="pendiente">⏳ Pendientes</option>
                    <option value="aprobado">✅ Aprobados</option>
                    <option value="realizado">🎯 Realizados</option>
                    <option value="rechazado">❌ Rechazados</option>
                  </select>
                  <button
                    onClick={fetchSolicitudesTalleres}
                    className={`${BTN_PRIMARY} py-2 px-3.5 shrink-0`}
                  >
                    Filtrar
                  </button>
                </div>
              </div>

              {/* Tabla de talleres */}
              {cargandoTalleres ? (
                <div className="py-16 text-center text-xs text-[#00629B] font-medium animate-pulse">
                  Cargando solicitudes de talleres...
                </div>
              ) : solicitudesTalleres.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/60 space-y-2">
                  <span className="text-3xl">🎓</span>
                  <p className="text-xs font-bold text-slate-800">No hay solicitudes de talleres</p>
                  <p className="text-[11px] text-slate-500">
                    {busquedaTaller || filtroEstadoTaller ? "No se encontraron resultados con los filtros actuales." : "Las solicitudes registradas por los estudiantes desde el chatbot aparecerán aquí."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4"># ID</th>
                        <th className="py-3 px-4">Taller Solicitado</th>
                        <th className="py-3 px-4">Estudiante / Carrera</th>
                        <th className="py-3 px-4">Modalidad</th>
                        <th className="py-3 px-4">Grupo</th>
                        <th className="py-3 px-4">Fecha Solicitud</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {solicitudesTalleres
                        .slice((paginaTalleres - 1) * limiteTalleres, paginaTalleres * limiteTalleres)
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-500">#{s.id}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[220px]">
                              <div className="flex items-center gap-2">
                                <span className="text-base shrink-0">🎓</span>
                                <span className="leading-tight">{s.taller}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{s.nombre}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{s.rut} • {s.email}</div>
                              <div className="text-[11px] text-[#00629B] font-medium mt-0.5">{s.carrera}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${s.modalidad?.toLowerCase().includes("virtual")
                                ? "bg-purple-50 border-purple-200 text-purple-700"
                                : "bg-sky-50 border-sky-200 text-[#00629B]"
                                }`}>
                                {s.modalidad?.toLowerCase().includes("virtual") ? "💻 Virtual" : "🏛️ Presencial"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">
                              👥 {s.participantes} pers.
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                              {s.created_at ? s.created_at.slice(0, 16).replace("T", " ") : "Reciente"}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${s.estado === "aprobado"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : s.estado === "realizado"
                                  ? "bg-sky-50 border-sky-200 text-[#00629B]"
                                  : s.estado === "rechazado"
                                    ? "bg-rose-50 border-rose-200 text-rose-700"
                                    : "bg-amber-50 border-amber-200 text-amber-800"
                                }`}>
                                {s.estado === "aprobado" ? "✅ Aprobado" : s.estado === "realizado" ? "🎯 Realizado" : s.estado === "rechazado" ? "❌ Rechazado" : "⏳ Pendiente"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {s.estado !== "realizado" && (
                                  <button
                                    type="button"
                                    onClick={() => handleCambiarEstadoTaller(s.id, "realizado")}
                                    className="px-2 py-1 rounded-lg bg-sky-50 text-[#00629B] hover:bg-sky-100 border border-sky-200 text-[10px] font-bold cursor-pointer transition-colors"
                                    title="Marcar taller como impartido/realizado"
                                  >
                                    Realizado
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleAbrirModalResponder(s)}
                                  className="px-2 py-1 rounded-lg bg-sky-50 text-[#00629B] hover:bg-sky-100 border border-sky-200 text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                                  title="Responder por correo al estudiante"
                                >
                                  ✉️ Responder
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarSolicitudTaller(s.id, s.nombre, s.taller)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Eliminar registro"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {solicitudesTalleres.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 rounded-b-2xl">
                      <div className="flex items-center gap-2">
                        <span>Mostrar</span>
                        <select
                          value={limiteTalleres}
                          onChange={(e) => {
                            setLimiteTalleres(Number(e.target.value));
                            setPaginaTalleres(1);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer shadow-2xs hover:border-slate-300"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span className="font-medium">por página</span>
                        <span className="text-slate-400 ml-2 font-mono text-[11px]">
                          ({(paginaTalleres - 1) * limiteTalleres + 1} - {Math.min(paginaTalleres * limiteTalleres, solicitudesTalleres.length)} de {solicitudesTalleres.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={paginaTalleres <= 1 || cargandoTalleres}
                          onClick={() => setPaginaTalleres((p) => Math.max(1, p - 1))}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                        >
                          ◀ Anterior
                        </button>
                        <span className="px-3 py-1.5 font-bold text-[#00629B] bg-sky-50 rounded-xl border border-sky-100 font-mono text-xs">
                          {paginaTalleres} / {Math.max(1, Math.ceil(solicitudesTalleres.length / limiteTalleres))}
                        </span>
                        <button
                          type="button"
                          disabled={paginaTalleres >= Math.ceil(solicitudesTalleres.length / limiteTalleres) || cargandoTalleres}
                          onClick={() => setPaginaTalleres((p) => Math.min(Math.ceil(solicitudesTalleres.length / limiteTalleres), p + 1))}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                        >
                          Siguiente ▶
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(activeTab === "calendario") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <span className={EYEBROW}>📅 Control de disponibilidad</span>
                  <h2 className={SECTION_TITLE}>Bloqueo de Días en el Calendario</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Inhabilita fechas específicas para impedir que los estudiantes agenden cubículos (por feriados, mantenimiento o recesos).
                  </p>
                </div>
                <button onClick={fetchDiasBloqueados} className={BTN_GHOST}>
                  🔄 Actualizar
                </button>
              </div>

              <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>🔒</span> Bloquear una nueva fecha
                </h3>
                <form onSubmit={handleCrearBloqueo} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-3">
                    <label className={LABEL}>Fecha a bloquear</label>
                    <input
                      type="date"
                      required
                      value={formBloqueo.fecha}
                      min={hoyStr}
                      onChange={(e) => setFormBloqueo((prev) => ({ ...prev, fecha: e.target.value }))}
                      className={`${INPUT} cursor-pointer`}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className={LABEL}>Sede / campus</label>
                    <select
                      value={formBloqueo.campus_id}
                      onChange={(e) => setFormBloqueo((prev) => ({ ...prev, campus_id: e.target.value }))}
                      className={`${INPUT} font-semibold cursor-pointer`}
                    >
                      <option value="">🌐 Todas las sedes (bloqueo global)</option>
                      {campus.map((c) => (
                        <option key={c.id} value={c.id}>
                          🏛️ {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className={LABEL}>Motivo del bloqueo</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: Receso académico, feriado no programado..."
                      value={formBloqueo.motivo}
                      onChange={(e) => setFormBloqueo((prev) => ({ ...prev, motivo: e.target.value }))}
                      className={INPUT}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={guardandoBloqueo || !formBloqueo.fecha}
                      className={`${BTN_PRIMARY} w-full`}
                    >
                      {guardandoBloqueo ? "Guardando..." : "🔒 Bloquear día"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>📋</span> Días inhabilitados
                  <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">{diasBloqueados.length}</span>
                </h3>

                {cargandoBloqueos ? (
                  <div className="py-12 text-center text-xs text-[#00629B] font-medium animate-pulse">
                    Cargando días bloqueados...
                  </div>
                ) : diasBloqueados.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/60 text-xs text-slate-500">
                    No hay días bloqueados. Todos los días laborales están habilitados para reservas.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {diasBloqueados.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 hover:shadow-[0_12px_32px_-20px_rgba(15,23,42,0.4)] transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              📅 {b.fecha}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${b.campus_id
                                ? "bg-amber-50 border-amber-100 text-amber-900"
                                : "bg-rose-50 border-rose-100 text-rose-900"
                                }`}
                            >
                              {b.campus_nombre ? `🏛️ ${b.campus_nombre}` : "🌐 Todas las sedes"}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-700 leading-relaxed">
                            {b.motivo}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Bloqueado por {b.creado_por || "Admin"}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleEliminarBloqueo(b.id, b.fecha, b.campus_nombre)}
                            className={BTN_GHOST}
                          >
                            🔓 Desbloquear
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {modalAnuncioOpen && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-serif font-bold text-slate-900">
                    {anuncioEdit ? "Editar diapositiva" : "Crear diapositiva de anuncio"}
                  </h3>
                  <button
                    onClick={() => setModalAnuncioOpen(false)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleGuardarAnuncio} className="space-y-3.5 text-xs">
                  <div>
                    <label className={LABEL}>Título del anuncio</label>
                    <input
                      type="text"
                      value={formAnuncio.titulo}
                      onChange={(e) => setFormAnuncio({ ...formAnuncio, titulo: e.target.value })}
                      className={INPUT}
                      placeholder="ej: Reserva inteligente..."
                      required
                    />
                  </div>

                  <div>
                    <label className={LABEL}>Subtítulo / descripción</label>
                    <textarea
                      value={formAnuncio.subtitulo}
                      onChange={(e) => setFormAnuncio({ ...formAnuncio, subtitulo: e.target.value })}
                      rows={2}
                      className={INPUT}
                      placeholder="Descripción explicativa..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Etiqueta badge</label>
                      <input
                        type="text"
                        value={formAnuncio.badge}
                        onChange={(e) => setFormAnuncio({ ...formAnuncio, badge: e.target.value })}
                        className={INPUT}
                        placeholder="ej: NUEVO SERVICIO"
                      />
                    </div>

                    <div>
                      <label className={LABEL}>Color de fondo</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={formAnuncio.color_fondo}
                          onChange={(e) => setFormAnuncio({ ...formAnuncio, color_fondo: e.target.value })}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 bg-white p-1"
                        />
                        <input
                          type="text"
                          value={formAnuncio.color_fondo}
                          onChange={(e) => setFormAnuncio({ ...formAnuncio, color_fondo: e.target.value })}
                          className={`${INPUT} font-mono`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Texto del botón</label>
                      <input
                        type="text"
                        value={formAnuncio.boton_texto}
                        onChange={(e) => setFormAnuncio({ ...formAnuncio, boton_texto: e.target.value })}
                        className={INPUT}
                        placeholder="ej: Abrir chatbot"
                      />
                    </div>

                    <div>
                      <label className={LABEL}>Enlace / acción</label>
                      <input
                        type="text"
                        value={formAnuncio.boton_link}
                        onChange={(e) => setFormAnuncio({ ...formAnuncio, boton_link: e.target.value })}
                        className={INPUT}
                        placeholder="ej: open-chat o /reservar"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Orden de presentación</label>
                    <input
                      type="number"
                      value={formAnuncio.orden}
                      onChange={(e) => setFormAnuncio({ ...formAnuncio, orden: parseInt(e.target.value, 10) || 0 })}
                      className={`${INPUT} w-24`}
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalAnuncioOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`${BTN_PRIMARY} flex-1`}
                    >
                      Guardar diapositiva
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {modalTarjetaOpen && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-serif font-bold text-slate-900">
                    {tarjetaEdit ? "Editar tarjeta informativa" : "Crear tarjeta informativa"}
                  </h3>
                  <button
                    onClick={() => setModalTarjetaOpen(false)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleGuardarTarjeta} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className={LABEL}>Ícono</label>
                      <input
                        type="text"
                        value={formTarjeta.icono}
                        onChange={(e) => setFormTarjeta({ ...formTarjeta, icono: e.target.value })}
                        className={`${INPUT} text-center text-base`}
                        placeholder="📚"
                        required
                      />
                    </div>

                    <div className="col-span-3">
                      <label className={LABEL}>Título de la tarjeta</label>
                      <input
                        type="text"
                        value={formTarjeta.titulo}
                        onChange={(e) => setFormTarjeta({ ...formTarjeta, titulo: e.target.value })}
                        className={INPUT}
                        placeholder="ej: Reserva de cubículos"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Descripción</label>
                    <textarea
                      value={formTarjeta.descripcion}
                      onChange={(e) => setFormTarjeta({ ...formTarjeta, descripcion: e.target.value })}
                      rows={2}
                      className={INPUT}
                      placeholder="Detalle descriptivo..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Texto del enlace</label>
                      <input
                        type="text"
                        value={formTarjeta.link_texto}
                        onChange={(e) => setFormTarjeta({ ...formTarjeta, link_texto: e.target.value })}
                        className={INPUT}
                        placeholder="ej: Ir al formulario"
                      />
                    </div>

                    <div>
                      <label className={LABEL}>URL / acción</label>
                      <input
                        type="text"
                        value={formTarjeta.link_url}
                        onChange={(e) => setFormTarjeta({ ...formTarjeta, link_url: e.target.value })}
                        className={INPUT}
                        placeholder="ej: /reservar u open-chat"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Orden de presentación</label>
                    <input
                      type="number"
                      value={formTarjeta.orden}
                      onChange={(e) => setFormTarjeta({ ...formTarjeta, orden: parseInt(e.target.value, 10) || 0 })}
                      className={`${INPUT} w-24`}
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalTarjetaOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`${BTN_PRIMARY} flex-1`}
                    >
                      Guardar tarjeta
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {modalFaqOpen && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-serif font-bold text-slate-900">
                    {faqEdit ? "Editar pregunta frecuente" : "Crear pregunta frecuente"}
                  </h3>
                  <button
                    onClick={() => setModalFaqOpen(false)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleGuardarFaq} className="space-y-3.5 text-xs">
                  <div>
                    <label className={LABEL}>Pregunta</label>
                    <input
                      type="text"
                      value={formFaq.pregunta}
                      onChange={(e) => setFormFaq({ ...formFaq, pregunta: e.target.value })}
                      className={INPUT}
                      placeholder="ej: ¿Con cuánta anticipación puedo reservar?"
                      required
                    />
                  </div>

                  <div>
                    <label className={LABEL}>Respuesta</label>
                    <textarea
                      value={formFaq.respuesta}
                      onChange={(e) => setFormFaq({ ...formFaq, respuesta: e.target.value })}
                      rows={4}
                      className={INPUT}
                      placeholder="Escribe la respuesta clara y detallada..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Categoría</label>
                      <input
                        type="text"
                        value={formFaq.categoria}
                        onChange={(e) => setFormFaq({ ...formFaq, categoria: e.target.value })}
                        className={INPUT}
                        placeholder="ej: Reservas, Reglamento, Asistente IA"
                      />
                    </div>

                    <div>
                      <label className={LABEL}>Orden de presentación</label>
                      <input
                        type="number"
                        value={formFaq.orden}
                        onChange={(e) => setFormFaq({ ...formFaq, orden: parseInt(e.target.value, 10) || 0 })}
                        className={`${INPUT} w-24`}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModalFaqOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`${BTN_PRIMARY} flex-1`}
                    >
                      Guardar pregunta
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {modalMantenimiento.open && modalMantenimiento.cubiculo && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-lg p-6 space-y-5 animate-slideUp`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg border border-amber-200">
                      🛠️
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Mantenimiento: Cubículo {modalMantenimiento.cubiculo.codigo}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Inhabilita este espacio en días puntuales por reparaciones o limpieza.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalMantenimiento((prev) => ({ ...prev, open: false }))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleGuardarMantenimientoCubiculo} className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-800">
                    📅 Programar fecha fuera de servicio
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Fecha</label>
                      <input
                        type="date"
                        required
                        min={hoyStr}
                        value={modalMantenimiento.fecha}
                        onChange={(e) => setModalMantenimiento((prev) => ({ ...prev, fecha: e.target.value }))}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Motivo</label>
                      <input
                        type="text"
                        placeholder="ej: Limpieza profunda, pintura..."
                        value={modalMantenimiento.motivo}
                        onChange={(e) => setModalMantenimiento((prev) => ({ ...prev, motivo: e.target.value }))}
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={modalMantenimiento.guardando || !modalMantenimiento.fecha}
                      className={`${BTN_PRIMARY} text-xs py-2 px-4`}
                    >
                      {modalMantenimiento.guardando ? "Guardando..." : "➕ Asignar mantenimiento"}
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-slate-800">
                    📋 Fechas programadas ({modalMantenimiento.mantenimientos.length})
                  </p>

                  {modalMantenimiento.cargando ? (
                    <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                      Cargando fechas de mantenimiento...
                    </div>
                  ) : modalMantenimiento.mantenimientos.length === 0 ? (
                    <div className="py-5 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      No hay mantenimientos programados para este cubículo.
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                      {modalMantenimiento.mantenimientos.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-200/80 bg-amber-50/50 text-xs shadow-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">
                              🗓️ {m.fecha}
                            </p>
                            <p className="text-[11px] text-slate-600 truncate">
                              {m.motivo || "Mantenimiento / Fuera de servicio"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleEliminarMantenimiento(m.id)}
                            className="shrink-0 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-[11px] cursor-pointer transition-colors"
                            title="Habilitar cubículo en esta fecha"
                          >
                            Habilitar ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalMantenimiento((prev) => ({ ...prev, open: false }))}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmModal.open && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-md p-7 text-center space-y-4`}>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 text-2xl flex items-center justify-center mx-auto border border-amber-100">
                  ⚠️
                </div>
                <h3 className="text-lg font-serif font-bold text-slate-900">{confirmModal.titulo || "Confirmación"}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.mensaje}</p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null })}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (confirmModal.onConfirm) confirmModal.onConfirm();
                      setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null });
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-[0_6px_16px_-8px_rgba(225,29,72,0.9)] transition-all cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {toastNotificacion.texto && (
            <div className="fixed bottom-6 right-6 z-50 max-w-sm flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-[0_24px_48px_-20px_rgba(15,23,42,0.8)] border border-white/10 animate-slideUp">
              <span className={`w-7 h-7 shrink-0 rounded-xl flex items-center justify-center text-[11px] ${toastNotificacion.tipo === "error" ? "bg-rose-500/20" : "bg-emerald-500/20"}`}>
                {toastNotificacion.tipo === "error" ? "❌" : "✅"}
              </span>
              <p className="leading-relaxed pt-1">{toastNotificacion.texto}</p>
              <button
                onClick={() => setToastNotificacion({ tipo: "", texto: "" })}
                className="ml-1 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 font-semibold shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              ← Volver a la página de inicio
            </Link>
            <span>© {new Date().getFullYear()} Biblioteca Inteligente — Panel Admin</span>
          </div>
        </main>
      </div>

      <button
        onClick={() => setAyudaModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-[#002D4C] hover:bg-[#004E7C] text-white flex items-center justify-center font-bold text-sm shadow-[0_8px_20px_-4px_rgba(0,45,76,0.6)] ring-2 ring-white/80 transition-all cursor-pointer hover:scale-105"
        title="Centro de ayuda y atajos"
      >
        ?
      </button>

      {ayudaModalOpen && (
        <div className={OVERLAY}>
          <div className={`${MODAL} max-w-lg p-6 space-y-5 animate-slideUp`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-sky-50 text-[#00629B] font-bold flex items-center justify-center text-sm">
                  ?
                </span>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900">Guía del Panel Administrador</h3>
                  <p className="text-[11px] text-slate-500">Flujo de actividades y herramientas de biblioteca</p>
                </div>
              </div>
              <button
                onClick={() => setAyudaModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-800 mb-1.5">Leyenda del Flujo de Actividades:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="text-rose-900 font-medium"><strong>Importante:</strong> Incidencias críticas pendientes o cubículos con fallas.</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50 border border-sky-100">
                    <span className="w-3 h-3 rounded-full bg-[#00A3E0] shrink-0"></span>
                    <span className="text-sky-900 font-medium"><strong>Reciente:</strong> Turnos horarios activos, pases reservados y eventos del terminal.</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">Terminal de Reconocimiento Facial:</h4>
                <p className="text-slate-500">
                  Puedes abrir el relé 1 directamente desde el menú de opciones (icono ⚙️ superior) o monitorear la cámara en vivo desde la pestaña de Cámara Terminal.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAyudaModalOpen(false)}
                className={BTN_PRIMARY}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {modalResponderTaller.open && modalResponderTaller.solicitud && (
        <div className={OVERLAY}>
          <div className={`${MODAL} max-w-xl p-6 md:p-7 space-y-5 animate-slideUp`}>
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-[#00629B] flex items-center justify-center text-xl shadow-xs">
                  ✉️
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-[#00629B] uppercase">
                    Solicitud #{modalResponderTaller.solicitud.id}
                  </div>
                  <h3 className="font-serif font-bold text-lg text-slate-900 leading-tight">
                    Responder al Estudiante
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalResponderTaller((prev) => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Estudiante:</span>
                <span className="font-bold text-slate-900">{modalResponderTaller.solicitud.nombre}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Correo:</span>
                <span className="font-mono text-[#00629B] font-semibold">{modalResponderTaller.solicitud.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Taller:</span>
                <span className="font-semibold text-slate-800">{modalResponderTaller.solicitud.taller}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Carrera / Modalidad:</span>
                <span className="text-slate-700">{modalResponderTaller.solicitud.carrera} • {modalResponderTaller.solicitud.modalidad}</span>
              </div>
            </div>

            <form onSubmit={handleEnviarRespuestaTaller} className="space-y-4">
              <div>
                <label className={LABEL}>
                  Asunto del Correo *
                </label>
                <input
                  type="text"
                  required
                  value={modalResponderTaller.asunto}
                  onChange={(e) => setModalResponderTaller((prev) => ({ ...prev, asunto: e.target.value }))}
                  placeholder="Ej: Confirmación y horario de taller de biblioteca..."
                  className={INPUT}
                />
              </div>

              <div>
                <label className={LABEL}>
                  Mensaje para el Estudiante *
                </label>
                <textarea
                  rows={6}
                  required
                  value={modalResponderTaller.mensaje}
                  onChange={(e) => setModalResponderTaller((prev) => ({ ...prev, mensaje: e.target.value }))}
                  placeholder="Escribe la respuesta indicando fecha, lugar o enlace para el taller..."
                  className={`${INPUT} min-h-[130px] font-sans`}
                />
              </div>

              <div>
                <label className={LABEL}>
                  Actualizar estado de la solicitud
                </label>
                <select
                  value={modalResponderTaller.nuevoEstado}
                  onChange={(e) => setModalResponderTaller((prev) => ({ ...prev, nuevoEstado: e.target.value }))}
                  className={INPUT}
                >
                  <option value="pendiente">Mantener como Pendiente ⏳</option>
                  <option value="aprobado">Aprobado ✅</option>
                  <option value="realizado">Realizado 🎯</option>
                  <option value="rechazado">Rechazado ❌</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalResponderTaller((prev) => ({ ...prev, open: false }))}
                  disabled={modalResponderTaller.enviando}
                  className={BTN_GHOST}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalResponderTaller.enviando}
                  className={BTN_PRIMARY}
                >
                  {modalResponderTaller.enviando ? "Enviando vía n8n..." : "Enviar Respuesta ✉️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alertaIncidenciasPopUp && (
        <div className={OVERLAY}>
          <div className={`${MODAL} max-w-xl p-6 md:p-7 space-y-5 animate-slideUp border-2 border-amber-300 dark:border-amber-500/50 shadow-2xl`}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shadow-xs">
                  ⚠️
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-black uppercase tracking-wider mb-1">
                    🚨 Alerta Administrativa
                  </div>
                  <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white leading-tight">
                    Tareas con retraso de atención
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setAlertaIncidenciasPopUp(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Se detectaron solicitudes e incidencias que superan <strong>al menos dos días sin atención</strong>:
              </p>

              {(incidenciasCriticasVencidas.length > 0 && talleresPendientesVencidos.length > 0) && (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setFiltroAlertaModal("todos")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${filtroAlertaModal === "todos"
                      ? "bg-white dark:bg-slate-700 text-[#00629B] dark:text-sky-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                      }`}
                  >
                    Todos ({incidenciasCriticasVencidas.length + talleresPendientesVencidos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroAlertaModal("incidencias")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${filtroAlertaModal === "incidencias"
                      ? "bg-white dark:bg-slate-700 text-[#00629B] dark:text-sky-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                      }`}
                  >
                    ⚠️ Incidencias ({incidenciasCriticasVencidas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroAlertaModal("talleres")}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${filtroAlertaModal === "talleres"
                      ? "bg-white dark:bg-slate-700 text-[#00629B] dark:text-sky-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                      }`}
                  >
                    🎓 Talleres ({talleresPendientesVencidos.length})
                  </button>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                {(filtroAlertaModal === "todos" || filtroAlertaModal === "incidencias") && incidenciasCriticasVencidas.map((inc) => {
                  const diasSinResolver = calcularDiasSinResolverIncidencia(inc.created_at);
                  return (
                    <div
                      key={`inc-${inc.id}`}
                      className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800 space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>🚪</span> {inc.cubiculo_codigo} • {inc.campus_nombre}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          {diasSinResolver} días pendiente
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {inc.descripcion || "Sin descripción"}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>Categoría: <strong>{inc.categoria || "General"}</strong></span>
                        <span className="capitalize font-bold text-amber-800 dark:text-amber-400">Incidencia de Cubículo</span>
                      </div>
                    </div>
                  );
                })}

                {(filtroAlertaModal === "todos" || filtroAlertaModal === "talleres") && talleresPendientesVencidos.map((t) => {
                  const diasSinRespuesta = calcularDiasSinResolverIncidencia(t.created_at);
                  return (
                    <div
                      key={`taller-${t.id}`}
                      className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800 space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#00629B] dark:text-sky-300 flex items-center gap-1.5">
                          <span>🎓</span> {t.taller}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {diasSinRespuesta} días sin respuesta
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        Solicitado por <strong>{t.nombre}</strong> ({t.carrera || "Carrera no esp."})
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>Modalidad: <strong>{t.modalidad || "Presencial"}</strong> • {t.participantes || 1} pers.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAlertaIncidenciasPopUp(false);
                            handleAbrirModalResponder(t);
                          }}
                          className="font-bold text-[#00629B] dark:text-sky-300 hover:underline cursor-pointer"
                        >
                          ✉️ Responder ahora →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAlertaIncidenciasPopUp(false)}
                className={`${BTN_GHOST} text-xs py-2 px-3.5`}
              >
                Cerrar alerta
              </button>
              {incidenciasCriticasVencidas.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAlertaIncidenciasPopUp(false);
                    handleSelectTab("incidencias");
                  }}
                  className={`${BTN_GHOST} text-xs py-2 px-3.5 hover:border-amber-400`}
                >
                  🔧 Ir a incidencias ({incidenciasCriticasVencidas.length})
                </button>
              )}
              {talleresPendientesVencidos.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAlertaIncidenciasPopUp(false);
                    handleSelectTab("talleres");
                  }}
                  className={`${BTN_PRIMARY} text-xs py-2 px-4`}
                >
                  🎓 Ir a talleres ({talleresPendientesVencidos.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
