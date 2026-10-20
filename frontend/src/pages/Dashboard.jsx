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

      const yaMostrada = sessionStorage.getItem("alerta_incidencias_admin_mostrada");
      if (vencidas.length > 0 && !yaMostrada) {
        setAlertaIncidenciasPopUp(true);
        sessionStorage.setItem("alerta_incidencias_admin_mostrada", "true");
        setToastNotificacion({
          tipo: "error",
          texto: `⚠️ Hay incidencias disponibles: existen ${vencidas.length} reporte(s) con al menos dos días sin resolver.`
        });
      }
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
      setSolicitudesTalleres(data?.solicitudes || []);
      setPaginaTalleres(1);
    } catch {
      setSolicitudesTalleres([]);
    } finally {
      setCargandoTalleres(false);
    }
  };

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
      nuevoEstado: solicitud.estado || "pendiente",
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
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [mostrarGraficoMetricas, setMostrarGraficoMetricas] = useState(false);
  const [periodoMetricas, setPeriodoMetricas] = useState("dia");
  const [fechaMetricas, setFechaMetricas] = useState(hoyStr);
  const [campusFiltroMetricas, setCampusFiltroMetricas] = useState("todos");
  const [bloqueHoverMetricas, setBloqueHoverMetricas] = useState(null);
  const [exportandoGraficoPNG, setExportandoGraficoPNG] = useState(false);
  const [exportandoMetricasExcel, setExportandoMetricasExcel] = useState(false);

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(true);
  const [campusFiltroHistorial, setCampusFiltroHistorial] = useState("todos");
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

  const fetchHistorial = async (pagina = paginaHistorial, limite = limiteHistorial) => {
    setCargandoHistorial(true);
    try {
      const params = new URLSearchParams();
      if (campusFiltroHistorial && campusFiltroHistorial !== "todos") {
        params.append("campus_id", campusFiltroHistorial);
      }
      if (busquedaHistorial) params.append("busqueda", busquedaHistorial);
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
        "Sede / Campus": h.campus_nombre || "General",
        "Fecha Reserva": h.fecha,
        "Horario": h.hora,
        "Estado": h.estado ? h.estado.toUpperCase() : "N/A",
        "Fecha Registro / Archivo": h.fecha_registro || "N/A"
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filasExcel);

      const colWidths = [
        { wch: 6 },
        { wch: 12 },
        { wch: 28 },
        { wch: 14 },
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
  }, [campusFiltroHistorial, busquedaHistorial, limiteHistorial, activeTab]);

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
      XLSX.writeFile(wb, `Reporte_Ocupacion_Horarios_UCT_${periodoMetricas}_${fechaMetricas}.xlsx`);
      setToastNotificacion({ tipo: "exito", texto: "Planilla Excel generada y descargada exitosamente." });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al exportar a Excel: " + err.message });
    } finally {
      setExportandoMetricasExcel(false);
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
      titulo: "Eliminar Reserva",
      mensaje: `¿Estás seguro de que deseas eliminar la reserva ID ${reservaId}?`,
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

  // ---- Tokens visuales reutilizables (solo estilo) ----
  const CARD = "bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-18px_rgba(15,23,42,0.25)]";
  const INPUT = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#00629B] focus:ring-4 focus:ring-[#00629B]/10";
  const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00629B] hover:bg-[#004E7C] text-white text-xs font-semibold shadow-[0_6px_16px_-8px_rgba(0,98,155,0.9)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
  const BTN_ACCENT = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC20E] hover:bg-[#EDB100] text-slate-950 text-xs font-bold shadow-[0_6px_16px_-8px_rgba(255,194,14,0.9)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
  const BTN_GHOST = "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all cursor-pointer";
  const BTN_DANGER = "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const EYEBROW = "inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold text-[#00629B]";
  const SECTION_TITLE = "text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight";
  const LABEL = "block text-[11px] font-semibold text-slate-600 mb-1.5";
  const OVERLAY = "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-4 animate-fadeIn";
  const MODAL = "w-full bg-white rounded-2xl shadow-[0_32px_80px_-24px_rgba(15,23,42,0.5)] border border-white/60 ring-1 ring-slate-900/5";

  const navTabs = [
    { id: "monitoreo", label: "Actividad y Monitoreo", icon: "🌐" },
    { id: "sedes", label: "Sedes y Cubículos", icon: "🏛️" },
    { id: "talleres", label: "Talleres Solicitados", icon: "🎓", badge: solicitudesTalleres.filter((s) => s.estado === "pendiente").length },
    { id: "calendario", label: "Calendario y Bloqueos", icon: "📅" },
    { id: "incidencias", label: "Incidencias de Cubículos", icon: "⚠️", badge: incidencias.filter((i) => i.estado === "pendiente").length },
    { id: "sanciones", label: "Sanciones y Disciplina", icon: "⚖️" },
    { id: "metricas", label: "Métricas y Análisis", icon: "📈" },
    { id: "camara", label: "Cámara Terminal", icon: "📹" },
    { id: "cms", label: "Portal Inicio (CMS)", icon: "🖼️" },
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
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] font-sans text-slate-800 selection:bg-[#00629B]/15 flex flex-col lg:flex-row">
      {sidebarMobileOpen && (
        <div
          onClick={() => setSidebarMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#002D4C] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src={logoUCT}
              alt="Logo Universidad Católica de Temuco"
              className="h-11 w-auto object-contain max-h-12"
            />
          </div>
          <button
            onClick={() => setSidebarMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3 bg-white/[0.04]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FFC20E] to-[#FFA000] text-slate-950 font-bold flex items-center justify-center text-xs shadow-inner shrink-0">
            {user?.nombre ? user.nombre.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate tracking-wide uppercase">
              {user?.nombre || "ADMINISTRADOR"}
            </div>
            <div className="text-[10px] text-sky-200/70 truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{user?.rol || "Administrador"}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link
            to="/"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-sky-100/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-sm">🏛️</span>
            <span>Página de la institución</span>
          </Link>

          <div className="pt-2 pb-1 px-3.5">
            <span className="text-[9px] font-bold text-sky-200/50 uppercase tracking-wider">
              Navegación del Sistema
            </span>
          </div>

          {navTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isSelected
                    ? "bg-[#004E7C] text-white shadow-sm ring-1 ring-white/20"
                    : "text-sky-100/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
                {tab.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                    +{tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3 bg-white/[0.03]">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
          <div className="flex items-center justify-between text-[10px] text-sky-200/60 px-1 pt-1 border-t border-white/5">
            <button onClick={() => setAyudaModalOpen(true)} className="hover:text-white cursor-pointer">
              Privacidad • Condiciones
            </button>
            <button onClick={() => setAyudaModalOpen(true)} className="hover:text-white cursor-pointer">
              Accesibilidad
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
                  {activeTab === "monitoreo" ? "Flujo de actividades" :
                    activeTab === "camara" ? "Cámara Terminal" :
                      activeTab === "incidencias" ? "Incidencias de Cubículos" :
                        activeTab === "talleres" ? "Talleres Solicitados" :
                          activeTab === "metricas" ? "Métricas y Análisis" :
                          activeTab === "sanciones" ? "Sanciones y Disciplina" :
                            activeTab === "calendario" ? "Calendario y Bloqueos" :
                              activeTab === "sedes" ? "Sedes y Cubículos" :
                                activeTab === "cms" ? "Portal Inicio (CMS)" :
                                  activeTab === "faqs" ? "Preguntas Frecuentes" : "Historial de Registros"}
                </h1>
                {activeTab === "monitoreo" && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En vivo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {campusSeleccionadoObj?.nombre ? `Sede actual: ${campusSeleccionadoObj.nombre} · ` : ""}Centro de Control Universitario
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="relative">
              <label className="absolute -top-2 left-2.5 px-1 bg-white text-[9px] font-bold uppercase tracking-wider text-slate-500 z-10">
                Filtrar Sede
              </label>
              <div className="relative flex items-center">
                <select
                  value={campusSeleccionado || ""}
                  onChange={(e) => setCampusSeleccionado(Number(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:border-[#00629B] focus:border-[#00629B] focus:ring-2 focus:ring-[#00629B]/20 outline-none transition-all cursor-pointer min-w-[170px]"
                >
                  {campus.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 text-slate-400 text-xs">▼</span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center text-sm shadow-2xs transition-all cursor-pointer"
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${esActivo
                            ? "bg-[#00629B] text-white font-bold shadow-xs scale-[1.02]"
                            : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
                    className="bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus:border-[#00629B] focus:ring-2 focus:ring-[#00629B]/10 shadow-2xs cursor-pointer transition-all ml-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("camara")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00629B] to-[#0284C7] hover:from-[#004E7C] hover:to-[#00629B] text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
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

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
                    <div className={`lg:col-span-6 ${CARD} p-6 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden`}>
                      <div className="flex-1 space-y-4 text-center sm:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-[#00629B] animate-pulse" />
                          OCUPACIÓN TOTAL DEL DÍA
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                            <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{porcentaje}%</span>
                            <span className="text-xs font-semibold text-slate-500">del aforo diario</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {resumen.total_reservas_dia} reservas registradas sobre {resumen.cupos_totales_diarios} cupos totales posibles
                          </p>
                        </div>
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Cupos agendados</span>
                            <span className="font-bold text-[#00629B]">{resumen.total_reservas_dia}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#00629B] via-[#00A3E0] to-[#FFC20E] rounded-full transition-all duration-700"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Cupos libres restantes</span>
                            <span className="font-bold text-emerald-600">{resumen.cupos_disponibles_dia}</span>
                          </div>
                        </div>
                      </div>

                      <div className="relative flex-shrink-0 flex items-center justify-center">
                        <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            className="text-slate-100"
                            strokeWidth="10"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            className="text-[#00629B] transition-all duration-1000 ease-out"
                            strokeWidth="10"
                            strokeDasharray={301.6}
                            strokeDashoffset={301.6 - (301.6 * Math.min(porcentaje, 100)) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-black text-slate-900">{porcentaje}%</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demanda</span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`${CARD} p-5 flex flex-col justify-between group hover:border-[#00629B]/30 hover:shadow-md transition-all`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agendadas</span>
                          <span className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sm shadow-2xs">📋</span>
                        </div>
                        <div className="my-3">
                          <span className="text-3xl font-extrabold text-[#00629B] tracking-tight">{resumen.total_reservas_dia}</span>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">Reservas activas para hoy</p>
                        </div>
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-lg w-fit">
                          Confirmadas
                        </span>
                      </div>

                      <div className={`${CARD} p-5 flex flex-col justify-between group hover:border-emerald-300 hover:shadow-md transition-all`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Disponibles</span>
                          <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm shadow-2xs">🟢</span>
                        </div>
                        <div className="my-3">
                          <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{resumen.cupos_disponibles_dia}</span>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">Cupos libres de reserva</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg w-fit">
                          Para agendar
                        </span>
                      </div>

                      <div className={`${CARD} p-5 flex flex-col justify-between group hover:border-amber-300 hover:shadow-md transition-all`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capacidad</span>
                          <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-sm shadow-2xs">🏢</span>
                        </div>
                        <div className="my-3">
                          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{resumen.cubiculas_fisicos}</span>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">Cubículos en la sede</p>
                        </div>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg w-fit">
                          Simultáneos
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`${CARD} p-6 md:p-8 space-y-6 mb-8`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#00629B] block">Supervisión en Línea</span>
                        <h3 className="text-lg font-serif font-bold text-slate-900">Flujo de Actividades y Novedades</h3>
                        <p className="text-xs text-slate-500">Línea de tiempo de eventos críticos, incidencias reportadas y actividad horaria de la sede.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            fetchIncidencias();
                            fetchResumen();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <span>🔄 Actualizar flujo</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative pl-6 sm:pl-32 space-y-8 before:absolute before:left-2 sm:before:left-28 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                      <div className="space-y-4">
                        <div className="relative flex items-center">
                          <span className="absolute -left-6 sm:-left-32 w-5 h-5 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center text-[10px] text-rose-600 font-bold z-10 translate-x-[2px] sm:translate-x-[102px]">
                            !
                          </span>
                          <h4 className="text-sm font-bold text-rose-600 uppercase tracking-wider ml-2 sm:ml-4">
                            Importante
                          </h4>
                        </div>

                        {incidencias.filter((i) => i.estado === "pendiente").length > 0 ? (
                          incidencias
                            .filter((i) => i.estado === "pendiente")
                            .slice(0, 3)
                            .map((inc) => (
                              <div key={inc.id} className="relative group flex items-start">
                                <span className="hidden sm:block absolute -left-28 top-3 text-[11px] font-medium text-slate-400 text-right w-24 pr-4">
                                  {inc.created_at ? String(inc.created_at).split(" ")[0] : "Reciente"}
                                </span>

                                <div className="absolute -left-6 sm:-left-6 top-3 w-5 h-5 rounded-md bg-rose-50 border border-rose-300 flex items-center justify-center text-xs text-rose-600 shadow-2xs z-10 -translate-x-1 sm:translate-x-[2px]">
                                  ⚠️
                                </div>

                                <div className="ml-2 sm:ml-4 flex-1 bg-white border border-slate-200/80 border-l-4 border-l-rose-500 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-slate-900 bg-rose-50 text-rose-700 px-2 py-0.5 rounded">
                                        {inc.cubiculo_codigo}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800">
                                        Incidencia: {inc.categoria}
                                      </span>
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                        Pendiente
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-2">
                                      {inc.descripcion}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      Reportado por {inc.estudiante_nombre} · {inc.campus_nombre}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handleSelectTab("incidencias")}
                                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                                    >
                                      Revisar
                                    </button>
                                    <button
                                      onClick={() => handleCambiarEstadoIncidencia(inc.id, "resuelta")}
                                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all cursor-pointer"
                                    >
                                      Descartar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="relative group flex items-start">
                            <span className="hidden sm:block absolute -left-28 top-3 text-[11px] font-medium text-slate-400 text-right w-24 pr-4">
                              Hoy
                            </span>
                            <div className="absolute -left-6 sm:-left-6 top-3 w-5 h-5 rounded-md bg-emerald-50 border border-emerald-300 flex items-center justify-center text-xs text-emerald-600 shadow-2xs z-10 -translate-x-1 sm:translate-x-[2px]">
                              ✓
                            </div>
                            <div className="ml-2 sm:ml-4 flex-1 bg-white border border-slate-200/80 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-800">Sin incidencias críticas pendientes</p>
                                <p className="text-[11px] text-slate-500">Todos los cubículos reportados se encuentran operativos o atendidos.</p>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                Operativo
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 pt-4">
                        <div className="relative flex items-center">
                          <span className="absolute -left-6 sm:-left-32 w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-400 flex items-center justify-center text-[10px] text-slate-600 font-bold z-10 translate-x-[2px] sm:translate-x-[102px]">
                            •
                          </span>
                          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-2 sm:ml-4">
                            Reciente
                          </h4>
                        </div>

                        {resumen?.bloques && resumen.bloques.filter((b) => b.ocupados > 0).length > 0 ? (
                          resumen.bloques
                            .filter((b) => b.ocupados > 0)
                            .slice(0, 4)
                            .map((b, idx) => (
                              <div key={idx} className="relative group flex items-start">
                                <span className="hidden sm:block absolute -left-28 top-3 text-[11px] font-semibold text-slate-500 text-right w-24 pr-4">
                                  {(b.rango || b.hora || "").split("-")[0]?.trim() || "Turno"}
                                </span>
                                <div className="absolute -left-6 sm:-left-6 top-3 w-5 h-5 rounded-md bg-sky-50 border border-sky-300 flex items-center justify-center text-xs text-[#00629B] shadow-2xs z-10 -translate-x-1 sm:translate-x-[2px]">
                                  📋
                                </div>
                                <div className="ml-2 sm:ml-4 flex-1 bg-white border border-slate-200/80 border-l-4 border-l-[#00A3E0] rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-900">
                                        Turno: {b.rango || b.hora || "Horario"}
                                      </span>
                                      <span className="text-[10px] font-bold text-[#00629B] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                                        {b.ocupados} cubículo{b.ocupados > 1 ? "s" : ""} reservado{b.ocupados > 1 ? "s" : ""}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                      Disponibilidad: {b.disponibles} cupos libres de un aforo de {cubiculosActuales} unidades.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleAbrirDetalleBloque(b)}
                                    className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-[#00629B] hover:text-[#00629B] text-slate-700 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                                  >
                                    Auditar alumnos →
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="relative group flex items-start">
                            <span className="hidden sm:block absolute -left-28 top-3 text-[11px] font-medium text-slate-400 text-right w-24 pr-4">
                              Hoy
                            </span>
                            <div className="absolute -left-6 sm:-left-6 top-3 w-5 h-5 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center text-xs text-slate-500 shadow-2xs z-10 -translate-x-1 sm:translate-x-[2px]">
                              🕒
                            </div>
                            <div className="ml-2 sm:ml-4 flex-1 bg-white border border-slate-200/80 border-l-4 border-l-slate-300 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                              <p className="text-xs text-slate-600">No hay reservas registradas aún para los bloques de hoy en esta sede.</p>
                              <span className="text-[11px] text-slate-400 font-medium">Libre demanda</span>
                            </div>
                          </div>
                        )}
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
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
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
            </div>
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
                    </div>
                    <button onClick={fetchHistorial} className={BTN_GHOST}>
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
                                <td className="p-3.5 text-slate-600 font-medium">{h.campus_nombre || "Sede Principal"}</td>
                                <td className="p-3.5 text-slate-800 font-semibold">{h.fecha}</td>
                                <td className="p-3.5 font-bold text-[#00629B]">{h.hora} hrs</td>
                                <td className="p-3.5">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${h.estado === "cancelada"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : h.estado === "inasistencia"
                                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                                        : h.estado === "activa"
                                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                                          : h.estado === "expirada" || h.estado === "inactiva"
                                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      }`}
                                  >
                                    {h.estado === "inasistencia" ? "⚠️ Inasistencia" : h.estado}
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
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              s.modalidad?.toLowerCase().includes("virtual")
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
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              s.estado === "aprobado"
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
                              {s.estado !== "aprobado" && (
                                <button
                                  type="button"
                                  onClick={() => handleCambiarEstadoTaller(s.id, "aprobado")}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Aprobar solicitud de taller"
                                >
                                  Aprobar
                                </button>
                              )}
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
                              {s.estado !== "rechazado" && (
                                <button
                                  type="button"
                                  onClick={() => handleCambiarEstadoTaller(s.id, "rechazado")}
                                  className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Rechazar solicitud"
                                >
                                  Rechazar
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
          <div className={`${MODAL} max-w-lg p-6 md:p-7 space-y-5 animate-slideUp border-2 border-amber-300 shadow-2xl`}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl shadow-xs">
                  ⚠️
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider mb-1">
                    🚨 Alerta Administrativa
                  </div>
                  <h3 className="font-serif font-bold text-lg text-slate-900 leading-tight">
                    Hay incidencias disponibles
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setAlertaIncidenciasPopUp(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Se han detectado <strong>{incidenciasCriticasVencidas.length} {incidenciasCriticasVencidas.length === 1 ? "incidencia disponible" : "incidencias disponibles"}</strong> en cubículos que ya han superado <strong>al menos dos días sin resolver</strong>. Requieren revisión o mantenimiento inmediato:
              </p>

              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                {incidenciasCriticasVencidas.map((inc) => {
                  const diasSinResolver = calcularDiasSinResolverIncidencia(inc.created_at);
                  return (
                    <div
                      key={inc.id}
                      className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>🚪</span> {inc.cubiculo_codigo} • {inc.campus_nombre}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          {diasSinResolver} días pendiente
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        {inc.descripcion || "Sin descripción"}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>Categoría: <strong>{inc.categoria || "General"}</strong></span>
                        <span className="capitalize font-bold text-amber-800">Estado: {inc.estado}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAlertaIncidenciasPopUp(false)}
                className={`${BTN_GHOST} w-full sm:w-auto text-xs py-2.5 px-4`}
              >
                Cerrar alerta
              </button>
              <button
                type="button"
                onClick={() => {
                  setAlertaIncidenciasPopUp(false);
                  handleSelectTab("incidencias");
                }}
                className={`${BTN_PRIMARY} w-full sm:w-auto text-xs py-2.5 px-5 bg-gradient-to-r from-[#00629B] to-[#004E7C] shadow-md`}
              >
                🔧 Ir a gestionar incidencias ({incidenciasCriticasVencidas.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
