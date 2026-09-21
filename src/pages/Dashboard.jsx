import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
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
    fetchDiasBloqueados();
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
  }, [activeTab]);

  const [metricas, setMetricas] = useState(null);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [mostrarGraficoMetricas, setMostrarGraficoMetricas] = useState(false);

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [mostrarHistorial, setMostrarHistorial] = useState(true);
  const [campusFiltroHistorial, setCampusFiltroHistorial] = useState("todos");
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
      setDiasBloqueados(Array.isArray(data) ? data : []);
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

  const handleDescargarExcelHistorial = async () => {
    setExportandoExcel(true);
    try {
      const params = new URLSearchParams();
      if (campusFiltroHistorial && campusFiltroHistorial !== "todos") {
        params.append("campus_id", campusFiltroHistorial);
      }
      if (busquedaHistorial) params.append("busqueda", busquedaHistorial);
      params.append("limite", "10000");

      const data = await apiGet(`/api/dashboard/historial?${params.toString()}`);
      const registros = Array.isArray(data) && data.length > 0 ? data : historial;

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
      fetchHistorial();
    }
  }, [campusFiltroHistorial, busquedaHistorial, activeTab]);

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

  const fetchCubiculos = async (campusId) => {
    if (!campusId) return;
    setCargandoCubiculosCampus(true);
    try {
      const data = await apiGet(`/api/cubiculos?campus_id=${campusId}`);
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
  }, [campusDestinoCubiculo, campusSeleccionado]);

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
      const reservasActualizadas = reservasBloque.filter((r) => r.id !== reservaId);
      setReservasBloque(reservasActualizadas);
      await fetchResumen();
      if (activeTab === "historial") {
        await fetchHistorial();
      }
      if (reservasActualizadas.length === 0) {
        setBloqueSeleccionado(null);
      }
      const detalleSancion = resp.sancion?.suspendido
        ? ` Alumno sancionado por 3 días (${resp.sancion.inasistencias_periodo}/2 inasistencias).`
        : ` Inasistencias registradas: ${resp.sancion?.inasistencias_periodo || 1}/2.`;
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

  return (
    <div className="min-h-screen bg-[#F6F8FB] pt-20 pb-16 px-4 font-sans text-slate-800 selection:bg-[#00629B]/15">
      <main className="relative mx-auto max-w-7xl w-full">
        {/* Encabezado principal */}
        <div className={`${CARD} overflow-hidden mb-8`}>
          <div className="relative overflow-hidden bg-gradient-to-br from-[#004E7C] via-[#00629B] to-[#0284C7] text-white p-6 sm:p-9">
            <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[#00A3E0]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-[#FFC20E]/20 blur-3xl" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFC20E] px-3 py-1 text-[11px] font-bold text-slate-950 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse"></span>
                    Panel Administrador
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-medium text-sky-50 backdrop-blur-sm">
                    Sede activa: <strong className="text-white font-semibold">{campusSeleccionadoObj?.nombre || "General"}</strong>
                  </span>
                </div>
                <h1 className="text-2xl md:text-[2rem] leading-tight font-serif font-bold text-white tracking-tight">
                  Centro de Control Universitario
                </h1>
                <p className="text-xs md:text-sm text-sky-100/90">
                  Bienvenido/a, <strong className="text-white font-semibold">{user?.nombre}</strong> · {user?.email}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="dashboard-logout"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-xs font-semibold text-white hover:bg-white hover:text-rose-700 hover:border-white transition-all cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          <div className="h-[3px] bg-gradient-to-r from-[#FFC20E] via-[#00A3E0] to-[#00629B]" />

          {/* Navegación por pestañas */}
          <div className="p-3 bg-white">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none rounded-2xl bg-slate-100/70 p-1.5">
              {[
                { id: "monitoreo", label: "Monitoreo y Bloques", icon: "📊" },
                { id: "metricas", label: "Métricas y Análisis", icon: "📈" },
                { id: "calendario", label: "Calendario y Bloqueos", icon: "📅" },
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
                      if (tab.id === "cms") fetchCMS();
                      if (tab.id === "calendario") fetchDiasBloqueados();
                      if (tab.id === "historial") fetchHistorial();
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${isSelected
                      ? "bg-white text-[#00629B] font-bold shadow-[0_2px_8px_-2px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                      }`}
                  >
                    <span className="text-sm">{tab.icon}</span>
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

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#00629B] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                Registrar nueva sede
              </h3>
              <form onSubmit={handleCrearCampus} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={nuevoCampusNombre}
                    onChange={(e) => setNuevoCampusNombre(e.target.value)}
                    placeholder="Nombre de la nueva sede (ej: Campus San Miguel)..."
                    className={INPUT}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creandoCampus || !nuevoCampusNombre.trim()}
                  className={BTN_PRIMARY}
                >
                  {creandoCampus ? "Guardando..." : "➕ Añadir sede"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#00629B] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                Crear cubículo y asignar sede
              </h3>
              <form onSubmit={handleCrearCubiculo} className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-1/3">
                  <select
                    value={campusDestinoCubiculo}
                    onChange={(e) => setCampusDestinoCubiculo(e.target.value)}
                    className={`${INPUT} font-semibold cursor-pointer`}
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
                    placeholder="Código del cubículo (ej: CUB01-SF, CUB02-JP)..."
                    className={INPUT}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creandoCubiculo || !nuevoCodigoCubiculo.trim() || !campusDestinoCubiculo}
                  className={BTN_ACCENT}
                >
                  {creandoCubiculo ? "Añadiendo..." : "🚪 Crear cubículo"}
                </button>
              </form>

              <div className="pt-2">
                {cargandoCubiculosCampus ? (
                  <p className="text-[11px] font-semibold text-[#00629B] animate-pulse">
                    Cargando cubículos de la sede seleccionada...
                  </p>
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
                            className="group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-white border border-slate-200 hover:border-[#00629B]/40 rounded-xl text-xs font-semibold text-slate-800 shadow-xs transition-all"
                          >
                            <span>🚪 {cb.codigo}</span>
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
                    <div className="py-6 text-center text-xs text-slate-500">
                      Cargando cubículos...
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
                            <span className="font-semibold text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
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
            <div className={`${CARD} p-5 md:p-6 mb-6 flex flex-col gap-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[96px]">
                  Sede / Campus
                </span>
                <div className="flex flex-wrap gap-2">
                  {campus.map((c) => {
                    const esActivo = campusSeleccionado === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCampusSeleccionado(c.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${esActivo
                          ? "bg-[#00629B] text-white shadow-[0_6px_16px_-8px_rgba(0,98,155,0.9)] scale-[1.02]"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        🏛️ {c.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-slate-100 w-full" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[96px]">
                    Fecha
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {proximosDias.map((d) => {
                      const esActivo = fechaSeleccionada === d.fechaStr;
                      return (
                        <button
                          key={d.fechaStr}
                          onClick={() => setFechaSeleccionada(d.fechaStr)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${esActivo
                            ? "bg-[#FFC20E] text-slate-950 font-bold shadow-[0_6px_16px_-8px_rgba(255,194,14,0.9)] scale-[1.02]"
                            : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-auto">
                  <span className="text-[11px] font-medium text-slate-500">Otra fecha</span>
                  <input
                    type="date"
                    value={fechaSeleccionada}
                    onChange={(e) => e.target.value && setFechaSeleccionada(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#00629B] focus:ring-4 focus:ring-[#00629B]/10 shadow-xs cursor-pointer transition-all"
                  />
                </div>
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
                    <div className={`${CARD} p-5 flex flex-col justify-between group hover:border-[#00629B]/30 transition-all`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agendadas</span>
                        <span className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sm">📋</span>
                      </div>
                      <div className="my-3">
                        <span className="text-3xl font-extrabold text-[#00629B] tracking-tight">{resumen.total_reservas_dia}</span>
                        <p className="text-[11px] text-slate-500 mt-1">Reservas activas para hoy</p>
                      </div>
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-100 px-2 py-1 rounded-lg w-fit">
                        Confirmadas
                      </span>
                    </div>

                    <div className={`${CARD} p-5 flex flex-col justify-between group hover:border-emerald-300 transition-all`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Disponibles</span>
                        <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm">🟢</span>
                      </div>
                      <div className="my-3">
                        <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{resumen.cupos_disponibles_dia}</span>
                        <p className="text-[11px] text-slate-500 mt-1">Cupos libres de reserva</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg w-fit">
                        Para agendar
                      </span>
                    </div>

                    <div className={`${CARD} p-5 flex flex-col justify-between group hover:border-slate-300 transition-all`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capacidad</span>
                        <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-sm">🏢</span>
                      </div>
                      <div className="my-3">
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{resumen.cubiculas_fisicos}</span>
                        <p className="text-[11px] text-slate-500 mt-1">Cubículos en la sede</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg w-fit">
                        Simultáneos
                      </span>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1.5">
                <span className={EYEBROW}>📈 Análisis estratégico y métricas</span>
                <h2 className={SECTION_TITLE}>Inteligencia de Ocupación y Comportamiento</h2>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  Monitoreo de frecuencias históricas por sede, horarios de máxima afluencia y retención de reservas.
                </p>
              </div>
              <button
                onClick={() => setMostrarGraficoMetricas(true)}
                className={`${BTN_PRIMARY} self-start md:self-auto shadow-[0_6px_20px_-6px_rgba(0,98,155,0.8)]`}
              >
                📊 Abrir gráfico interactivo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-sm">🔥</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Horarios Pico</h3>
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
                  <div className="py-14 text-center text-slate-500 space-y-3">
                    <div className="w-6 h-6 border-2 border-[#00629B] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-medium">Cargando detalles de los alumnos...</p>
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

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 font-semibold shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            ← Volver a la página de inicio
          </Link>
          <span>© {new Date().getFullYear()} Biblioteca Inteligente — Panel Admin</span>
        </div>
      </main>
    </div>
  );
}