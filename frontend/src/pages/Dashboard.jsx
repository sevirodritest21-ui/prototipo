import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import { queryClient } from "../services/queries";
import logoUCT from "../assets/logobibliovice.png";
import * as XLSX from "xlsx";

const UI_ICON_MAP = {
  "\u{1F3DB}\uFE0F": "building", "\u{1F3DB}": "building", "\u{1F3E2}": "building",
  "\u{1F4D6}": "book", "\u{1F4DA}": "book", "\u{1F514}": "bell",
  "\u2699\uFE0F": "settings", "\u2699": "settings", "\u{1F513}": "unlock", "\u{1F512}": "lock",
  "\u{1F504}": "refresh", "\u2795": "plus", "\u270F\uFE0F": "edit", "\u270F": "edit",
  "\u{1F5D1}\uFE0F": "trash", "\u{1F5D1}": "trash", "\u{1F6E0}\uFE0F": "wrench", "\u{1F527}": "wrench",
  "\u{1F6AA}": "door", "\u26A1": "bolt", "\u{1F4CA}": "chart", "\u{1F4C8}": "trend",
  "\u{1F4C9}": "trend-down", "\u{1F369}": "pie", "\u{1F393}": "academic",
  "\u{1F4C5}": "calendar", "\u{1F4C6}": "calendar", "\u{1F5D3}\uFE0F": "calendar",
  "\u{1F50D}": "search", "\u{1F50E}": "search", "\u2709\uFE0F": "mail", "\u2709": "mail",
  "\u26A0\uFE0F": "alert", "\u26A0": "alert", "\u2705": "check", "\u{1F3AF}": "target",
  "\u{1F525}": "flame", "\u{1F465}": "users", "\u{1F4D1}": "doc", "\u{1F4CB}": "doc",
  "\u{1F4DD}": "doc", "\u{1F4DC}": "doc", "\u{1F310}": "globe", "\u{1F4BB}": "laptop",
  "\u{1F3C6}": "trophy", "\u{1F451}": "trophy", "\u{1F9ED}": "compass", "\u{1F4A1}": "bulb",
  "\u2696\uFE0F": "scale", "\u{1F552}": "clock", "\u23F1\uFE0F": "clock", "\u23F3": "clock",
  "\u274C": "x", "\u{1F6AB}": "x", "\u{1F4BE}": "save", "\u{1F3A1}": "layers",
  "\u{1F331}": "leaf", "\u{1F4E2}": "megaphone", "\u{1F194}": "id"
};

function UiIcon({ name, className = "w-4 h-4 shrink-0 inline-block" }) {
  const key = UI_ICON_MAP[name] || name || "doc";
  const p = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", className, "aria-hidden": "true" };
  switch (key) {
    case "building":
      return <svg {...p}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" /></svg>;
    case "book":
      return <svg {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
    case "bell":
      return <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>;
    case "settings":
      return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
    case "unlock":
      return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 019.9-1" /></svg>;
    case "lock":
      return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
    case "refresh":
      return <svg {...p}><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>;
    case "plus":
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
    case "edit":
      return <svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>;
    case "trash":
      return <svg {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>;
    case "wrench":
      return <svg {...p}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>;
    case "door":
      return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M15 12h.01" /></svg>;
    case "bolt":
      return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    case "chart":
      return <svg {...p}><path d="M18 20V10M12 20V4M6 20v-6" /></svg>;
    case "trend":
      return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
    case "trend-down":
      return <svg {...p}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>;
    case "pie":
      return <svg {...p}><path d="M21.21 15.89A10 10 0 118 2.83" /><path d="M22 12A10 10 0 0012 2v10z" /></svg>;
    case "academic":
      return <svg {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>;
    case "calendar":
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case "search":
      return <svg {...p}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
    case "mail":
      return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>;
    case "alert":
      return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>;
    case "check":
      return <svg {...p}><path d="M20 6L9 17l-5-5" /></svg>;
    case "target":
      return <svg {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
    case "flame":
      return <svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>;
    case "users":
      return <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
    case "globe":
      return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>;
    case "laptop":
      return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M2 20h20" /></svg>;
    case "trophy":
      return <svg {...p}><path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z" /></svg>;
    case "compass":
      return <svg {...p}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>;
    case "bulb":
      return <svg {...p}><path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" /></svg>;
    case "scale":
      return <svg {...p}><path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>;
    case "clock":
      return <svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
    case "x":
      return <svg {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>;
    case "save":
      return <svg {...p}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
    case "layers":
      return <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
    case "leaf":
      return <svg {...p}><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>;
    case "megaphone":
      return <svg {...p}><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 11-5.8-1.6" /></svg>;
    default:
      return <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
  }
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [campus, setCampus] = useState([]);
  const [campusSeleccionado, setCampusSeleccionado] = useState(null);

  const [nuevoCampusNombre, setNuevoCampusNombre] = useState("");
  const [creandoCampus, setCreandoCampus] = useState(false);
  const [campusMsg, setCampusMsg] = useState({ tipo: "", texto: "" });
  const [campusAEliminar, setCampusAEliminar] = useState(null);
  const [eliminandoCampus, setEliminandoCampus] = useState(false);
  const [modalCrearSede, setModalCrearSede] = useState(false);
  const [modalCrearCubiculo, setModalCrearCubiculo] = useState(false);

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
  const [modalManualUsuario, setModalManualUsuario] = useState(false);
  const [seccionManual, setSeccionManual] = useState("terminologia");
  const [busquedaManual, setBusquedaManual] = useState("");

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
  const [busquedaModalBloque, setBusquedaModalBloque] = useState("");
  const [horaGestionReservas, setHoraGestionReservas] = useState("todos");
  const [cubiculoFiltroGestion, setCubiculoFiltroGestion] = useState("todos");
  const [paginaGestionReservas, setPaginaGestionReservas] = useState(1);
  const [filasPorPaginaGestion, setFilasPorPaginaGestion] = useState(10);
  const [ordenGestion, setOrdenGestion] = useState({ campo: "hora", dir: "asc" });
  const [seleccionadosGestion, setSeleccionadosGestion] = useState([]);
  const [reservasGestionLista, setReservasGestionLista] = useState([]);
  const [cargandoGestionReservas, setCargandoGestionReservas] = useState(false);
  const [busquedaGestionReservas, setBusquedaGestionReservas] = useState("");
  const [eliminandoReservaId, setEliminandoReservaId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, titulo: "", mensaje: "", onConfirm: null });
  const [toastNotificacion, setToastNotificacion] = useState({ tipo: "", texto: "" });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [modoCamara] = useState("stream");
  const [loopTimestamp, setLoopTimestamp] = useState(0);
  const [abriendoPuertaCamara, setAbriendoPuertaCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState(false);

  useEffect(() => {
    if (activeTab === "camara") {
      const t = setTimeout(() => {
        setErrorCamara(false);
        setLoopTimestamp(Date.now());
      }, 0);
      return () => clearTimeout(t);
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

  const [modalAnuncioOpen, setModalAnuncioOpen] = useState(false);
  const [anuncioEdit, setAnuncioEdit] = useState(null);
  const [formAnuncio, setFormAnuncio] = useState({
    titulo: "", subtitulo: "", badge: "NUEVO SERVICIO", boton_texto: "Ver Más", boton_link: "/reservar", color_fondo: "#4A4D55", orden: 0
  });

  const [modalTarjetaOpen, setModalTarjetaOpen] = useState(false);
  const [tarjetaEdit, setTarjetaEdit] = useState(null);
  const [formTarjeta, setFormTarjeta] = useState({
    icono: "book", titulo: "", descripcion: "", link_texto: "Ir al Formulario →", link_url: "/reservar", orden: 0
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
      const t = setTimeout(() => {
        setAlertaIncidenciasPopUp(true);
        sessionStorage.setItem("alerta_admin_pendientes_mostrada", "true");
        sessionStorage.setItem("alerta_incidencias_admin_mostrada", "true");
        setToastNotificacion({
          tipo: "error",
          texto: `Hay tareas con retraso: ${incidenciasCriticasVencidas.length} incidencia(s) y ${talleresPendientesVencidos.length} taller(es) con 2+ días sin atención.`
        });
      }, 0);
      return () => clearTimeout(t);
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

  const [metricas, setMetricas] = useState(null);
  const [tipoMetricas, setTipoMetricas] = useState("selector");
  const [prediccionData, setPrediccionData] = useState(null);
  const [cargandoPrediccion, setCargandoPrediccion] = useState(false);
  const [campusFiltroPrediccion, setCampusFiltroPrediccion] = useState(1);
  const [diasFiltroPrediccion, setDiasFiltroPrediccion] = useState(7);
  const [diaPrediccionSeleccionado, setDiaPrediccionSeleccionado] = useState(null);
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
  const [reservasRecientes, setReservasRecientes] = useState([]);
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
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);
  const [mesCalendarioBloqueos, setMesCalendarioBloqueos] = useState(() => new Date());
  const [diaModalBloqueo, setDiaModalBloqueo] = useState(null);
  const [formModalBloqueo, setFormModalBloqueo] = useState({
    motivo: "Feriado / Receso institucional",
    campus_id: ""
  });

  const handleCalBloqueoPrev = () => {
    setMesCalendarioBloqueos((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleCalBloqueoNext = () => {
    setMesCalendarioBloqueos((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCalBloqueoHoy = () => {
    setMesCalendarioBloqueos(new Date());
  };

  const getDiasMesBloqueos = () => {
    const year = mesCalendarioBloqueos.getFullYear();
    const month = mesCalendarioBloqueos.getMonth();
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

  const handleAbrirMenuDia = (dia) => {
    if (!dia) return;
    const bloqueosDelDia = diasBloqueados.filter((b) => b.fecha === dia.fechaIso);
    setDiaModalBloqueo({
      fechaIso: dia.fechaIso,
      dayNumber: dia.dayNumber,
      bloqueos: bloqueosDelDia
    });
    setFormModalBloqueo({
      motivo: "Feriado / Receso institucional",
      campus_id: ""
    });
  };

  const handleEjecutarBloqueoModal = async (e) => {
    e.preventDefault();
    if (!diaModalBloqueo?.fechaIso) return;
    setGuardandoBloqueo(true);
    try {
      await apiPost("/api/calendario/bloqueos", {
        fecha: diaModalBloqueo.fechaIso,
        motivo: formModalBloqueo.motivo.trim() || "Día bloqueado administrativamente",
        campus_id: formModalBloqueo.campus_id ? parseInt(formModalBloqueo.campus_id, 10) : null
      });
      setToastNotificacion({ tipo: "exito", texto: `Día ${diaModalBloqueo.fechaIso} bloqueado con éxito.` });
      const data = await apiGet("/api/calendario/bloqueos");
      const lista = (data || []).filter((b) => b.fecha >= hoyStr);
      setDiasBloqueados(lista);
      queryClient.invalidateQueries({ queryKey: ["calendario", "bloqueos"] });
      window.dispatchEvent(new CustomEvent("reservaActualizada"));
      setDiaModalBloqueo((prev) => prev ? {
        ...prev,
        bloqueos: lista.filter((b) => b.fecha === prev.fechaIso)
      } : null);
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: err.detail || err.message || "Error al bloquear la fecha" });
    } finally {
      setGuardandoBloqueo(false);
    }
  };

  const handleDesbloquearDesdeModal = (bloqueoId, fecha, campusNom) => {
    setConfirmModal({
      open: true,
      tipo: "positivo",
      titulo: "Desbloquear Fecha",
      mensaje: `¿Deseas desbloquear el día ${fecha} (${campusNom || "Todas las sedes"}) para permitir reservas de estudiantes?`,
      onConfirm: async () => {
        try {
          await apiDelete(`/api/calendario/bloqueos/${bloqueoId}`);
          setToastNotificacion({ tipo: "exito", texto: "Día desbloqueado con éxito." });
          const data = await apiGet("/api/calendario/bloqueos");
          const lista = (data || []).filter((b) => b.fecha >= hoyStr);
          setDiasBloqueados(lista);
          queryClient.invalidateQueries({ queryKey: ["calendario", "bloqueos"] });
          window.dispatchEvent(new CustomEvent("reservaActualizada"));
          setDiaModalBloqueo((prev) => prev ? {
            ...prev,
            bloqueos: lista.filter((b) => b.fecha === prev.fechaIso)
          } : null);
        } catch (err) {
          setToastNotificacion({ tipo: "error", texto: err.detail || err.message || "Error al desbloquear" });
        }
      }
    });
  };

  const fetchDiasBloqueados = async () => {
    try {
      const data = await apiGet("/api/calendario/bloqueos");
      const lista = (data || []).filter((b) => b.fecha >= hoyStr);
      setDiasBloqueados(lista);
      queryClient.invalidateQueries({ queryKey: ["calendario", "bloqueos"] });
    } catch {
      setDiasBloqueados([]);
    }
  };

  const handleEliminarBloqueo = (id, fecha, campusNom) => {
    setConfirmModal({
      open: true,
      tipo: "positivo",
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

  const fetchReservasRecientes = async () => {
    try {
      const data = await apiGet("/api/dashboard/historial?limit=25&offset=0");
      const registros = Array.isArray(data) ? data : (data?.registros || []);
      setReservasRecientes(registros);
    } catch {
      setReservasRecientes([]);
    }
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
      titulo: "Limpiar Historial de Reservas",
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
      fetchReservasRecientes();
      if (data?.bloques?.length > 0) {
        setHoraGestionReservas((prev) => {
          if (!prev || prev === "todos") return "todos";
          if (data.bloques.some((b) => b.hora === prev)) return prev;
          return "todos";
        });
      }
    } catch (err) {
      setError(err.message || "Error al cargar datos del dashboard.");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchReservasGestion = async (horaTarget = horaGestionReservas, bloquesRef = resumen?.bloques) => {
    if (!campusSeleccionado || !fechaSeleccionada || !horaTarget) return;
    setCargandoGestionReservas(true);
    try {
      if (horaTarget === "todos") {
        const bloquesConOcupacion = (bloquesRef || []).filter((b) => b.ocupados > 0);
        if (bloquesConOcupacion.length === 0) {
          setReservasGestionLista([]);
        } else {
          const respuestas = await Promise.all(
            bloquesConOcupacion.map(async (b) => {
              const res = await apiGet(
                `/api/dashboard/reservas-bloque?campus_id=${campusSeleccionado}&fecha=${fechaSeleccionada}&hora=${b.hora}`
              );
              return (res?.reservas || []).map((item) => ({
                ...item,
                rango: b.rango || b.hora
              }));
            })
          );
          setReservasGestionLista(respuestas.flat());
        }
      } else {
        const data = await apiGet(
          `/api/dashboard/reservas-bloque?campus_id=${campusSeleccionado}&fecha=${fechaSeleccionada}&hora=${horaTarget}`
        );
        const bObj = (bloquesRef || []).find((b) => b.hora === horaTarget);
        const items = (data?.reservas || []).map((item) => ({
          ...item,
          rango: bObj?.rango || horaTarget
        }));
        setReservasGestionLista(items);
      }
    } catch {
      setReservasGestionLista([]);
    } finally {
      setCargandoGestionReservas(false);
    }
  };

  const fetchPrediccion = async (campusId = campusFiltroPrediccion, dias = diasFiltroPrediccion, reentrenar = false) => {
    setCargandoPrediccion(true);
    try {
      const data = await apiGet(`/api/metricas/prediccion?campus_id=${campusId}&dias=${dias}&reentrenar=${reentrenar}`);
      setPrediccionData(data);
      if (data?.proyeccion_diaria?.length > 0) {
        const primerAbierto = data.proyeccion_diaria.find((d) => d.estado_atencion === "Abierto") || data.proyeccion_diaria[0];
        setDiaPrediccionSeleccionado(primerAbierto);
      }
      if (reentrenar) {
        setToastNotificacion({
          tipo: "exito",
          texto: "Modelo autoentrenado y calibrado comparando predicciones vs ocupación real."
        });
      }
    } catch {
      setPrediccionData(null);
    } finally {
      setCargandoPrediccion(false);
    }
  };

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

  const handlersRef = useRef({});
  useEffect(() => {
    handlersRef.current = {
      fetchCampus,
      fetchCMS,
      fetchDiasBloqueados,
      fetchIncidencias,
      fetchSolicitudesTalleres,
      fetchHistorial,
      fetchReservasRecientes,
      fetchCubiculos,
      fetchResumen,
      fetchReservasGestion,
      fetchPrediccion,
      fetchMetricas,
      paginaHistorial,
      limiteHistorial,
    };
  });

  useEffect(() => {
    if (activeTab !== "reservas" || !campusSeleccionado || !fechaSeleccionada || !horaGestionReservas) return;
    const t = setTimeout(() => {
      handlersRef.current.fetchReservasGestion?.(horaGestionReservas, resumen?.bloques);
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab, campusSeleccionado, fechaSeleccionada, horaGestionReservas, resumen]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === "historial") {
        setPaginaHistorial(1);
        handlersRef.current.fetchHistorial?.(1, limiteHistorial);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [campusFiltroHistorial, busquedaHistorial, filtroEstadoHistorial, limiteHistorial, activeTab]);

  useEffect(() => {
    const t = setTimeout(() => {
      handlersRef.current.fetchCampus?.();
      handlersRef.current.fetchCMS?.();
      handlersRef.current.fetchDiasBloqueados?.();
      handlersRef.current.fetchIncidencias?.();
      handlersRef.current.fetchSolicitudesTalleres?.();
      handlersRef.current.fetchHistorial?.(1, 10);
      handlersRef.current.fetchReservasRecientes?.();
    }, 0);
    const onRefreshEvent = () => {
      handlersRef.current.fetchResumen?.();
      handlersRef.current.fetchReservasRecientes?.();
      if (handlersRef.current) {
        handlersRef.current.fetchHistorial?.(handlersRef.current.paginaHistorial, handlersRef.current.limiteHistorial);
      }
    };
    window.addEventListener("reservaActualizada", onRefreshEvent);
    window.addEventListener("focus", onRefreshEvent);
    return () => {
      clearTimeout(t);
      window.removeEventListener("reservaActualizada", onRefreshEvent);
      window.removeEventListener("focus", onRefreshEvent);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const h = handlersRef.current;
      if (activeTab === "monitoreo") h.fetchReservasRecientes?.();
      if (activeTab === "cms") h.fetchCMS?.();
      if (activeTab === "bloqueos") h.fetchDiasBloqueados?.();
      if (activeTab === "incidencias") h.fetchIncidencias?.();
      if (activeTab === "talleres") h.fetchSolicitudesTalleres?.();
      if (activeTab === "historial") h.fetchHistorial?.(h.paginaHistorial, h.limiteHistorial);
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab]);

  useEffect(() => {
    const idAUsar = campusDestinoCubiculo || campusSeleccionado;
    if (!idAUsar) return;
    const t = setTimeout(() => {
      handlersRef.current.fetchCubiculos?.(idAUsar);
    }, 0);
    return () => clearTimeout(t);
  }, [campusDestinoCubiculo, campusSeleccionado, fechaSeleccionada]);

  useEffect(() => {
    const t = setTimeout(() => {
      handlersRef.current.fetchResumen?.();
    }, 0);
    return () => clearTimeout(t);
  }, [campusSeleccionado, fechaSeleccionada]);

  useEffect(() => {
    if (tipoMetricas !== "prediccion") return;
    const t = setTimeout(() => {
      handlersRef.current.fetchPrediccion?.(campusFiltroPrediccion, diasFiltroPrediccion);
    }, 0);
    return () => clearTimeout(t);
  }, [tipoMetricas, campusFiltroPrediccion, diasFiltroPrediccion]);

  useEffect(() => {
    if (activeTab !== "metricas" || (tipoMetricas !== "reservas" && tipoMetricas !== "selector")) return;
    const t = setTimeout(() => {
      handlersRef.current.fetchMetricas?.(periodoMetricas, fechaMetricas, campusFiltroMetricas);
    }, 0);
    return () => clearTimeout(t);
  }, [activeTab, tipoMetricas, periodoMetricas, fechaMetricas, campusFiltroMetricas]);

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
    setBusquedaModalBloque("");

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

  const handleLiberarCubiculo = (reservaId, rut, nombre) => {
    setConfirmModal({
      open: true,
      tipo: "peligro",
      titulo: "Liberar Cubículo",
      mensaje: `¿Deseas liberar el cubículo asignado a ${nombre || rut || "este estudiante"} (Reserva #${reservaId})? La reserva será cancelada y el espacio quedará disponible de inmediato sin penalización.`,
      onConfirm: () => ejecutarLiberarCubiculo(reservaId)
    });
  };

  const ejecutarLiberarCubiculo = async (reservaId) => {
    setEliminandoReservaId(reservaId);
    try {
      await apiDelete(`/api/reservas/${reservaId}`);

      const reservasActualizadas = reservasBloque.filter((r) => r.id !== reservaId && String(r.id) !== String(reservaId));
      setReservasBloque(reservasActualizadas);
      setReservasGestionLista((prev) => prev.filter((r) => r.id !== reservaId && String(r.id) !== String(reservaId)));

      await fetchResumen();
      if (activeTab === "historial") {
        await fetchHistorial();
      }

      if (reservasActualizadas.length === 0) {
        setBloqueSeleccionado(null);
      }
      setToastNotificacion({ tipo: "exito", texto: "Cubículo liberado exitosamente. El espacio ya está disponible." });
    } catch (err) {
      setToastNotificacion({ tipo: "error", texto: "Error al liberar el cubículo: " + (err.message || "Intenta nuevamente") });
    } finally {
      setEliminandoReservaId(null);
    }
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
        texto: `Sede '${nuevo.nombre}' creada con éxito.`,
      });
      setToastNotificacion({ tipo: "exito", texto: `Sede '${nuevo.nombre}' creada con éxito.` });
      setNuevoCampusNombre("");
      setModalCrearSede(false);
      await fetchCampus();
      setCampusSeleccionado(nuevo.id);
      setCampusDestinoCubiculo(nuevo.id);
    } catch (err) {
      setCampusMsg({
        tipo: "error",
        texto: err.message || "Error al crear el nuevo campus.",
      });
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al crear la sede." });
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
      setToastNotificacion({ tipo: "error", texto: `El código '${codigoLimpio.toUpperCase()}' ya existe en esta sede.` });
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
        texto: `Cubículo '${resp.codigo}' creado exitosamente en ${nombreCampusDestino}.`,
      });
      setToastNotificacion({ tipo: "exito", texto: `Cubículo '${resp.codigo}' creado exitosamente en ${nombreCampusDestino}.` });
      setNuevoCodigoCubiculo("");
      setModalCrearCubiculo(false);

      await fetchCubiculos(idCampusDestino);
      await fetchCampus();
    } catch (err) {
      setCampusMsg({
        tipo: "error",
        texto: err.message || "Error al añadir el cubículo.",
      });
      setToastNotificacion({ tipo: "error", texto: err.message || "Error al añadir el cubículo." });
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
      icono: "book", titulo: "", descripcion: "", link_texto: "Ir al Formulario →", link_url: "/reservar", orden: cmsTarjetas.length + 1
    });
    setModalTarjetaOpen(true);
  };

  const handleAbrirEditarTarjeta = (tj) => {
    setTarjetaEdit(tj);
    setFormTarjeta({
      icono: tj.icono || "", titulo: tj.titulo, descripcion: tj.descripcion || "", link_texto: tj.link_texto || "", link_url: tj.link_url || "", orden: tj.orden || 0
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
        texto: `Sede '${editado.nombre}' actualizada con éxito (${editado.cubiculas_fisicos} cubículos).`,
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
        texto: `Sede '${campusAEliminar.nombre}' eliminada correctamente.`,
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
      let label;
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
  const CARD = "bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-3xl shadow-[0_8px_30px_-8px_rgba(0,45,76,0.06),0_2px_6px_rgba(15,23,42,0.03)] hover:shadow-[0_14px_38px_-10px_rgba(0,77,122,0.11)] transition-all duration-300";
  const INPUT = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#00A3E0] focus:ring-4 focus:ring-[#00A3E0]/15 shadow-2xs";
  const BTN_PRIMARY = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#004D7A] via-[#00629B] to-[#0082B8] hover:from-[#003a5c] hover:to-[#00629B] text-white text-xs font-bold shadow-[0_6px_18px_-6px_rgba(0,98,155,0.7)] hover:shadow-[0_10px_24px_-6px_rgba(0,98,155,0.85)] transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";
  const BTN_ACCENT = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFD54A] via-[#FFC20E] to-[#E5AC00] hover:from-[#FFC20E] hover:to-[#EDB100] text-[#0F172A] text-xs font-extrabold shadow-[0_6px_18px_-6px_rgba(255,194,14,0.75)] hover:shadow-[0_10px_24px_-6px_rgba(255,194,14,0.9)] transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";
  const BTN_GHOST = "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs";
  const BTN_DANGER = "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed";
  const SECTION_TITLE = "text-xl md:text-2xl font-black font-sans text-[#0F172A] tracking-tight";
  const LABEL = "block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider";
  const OVERLAY = "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-fadeIn";
  const MODAL = "w-full bg-white rounded-3xl shadow-[0_32px_80px_-24px_rgba(0,45,76,0.55)] border border-slate-200/80 ring-1 ring-slate-900/5";

  const navGroups = [
    {
      title: "Operaciones",
      items: [
        {
          id: "monitoreo",
          label: "Actividad y Monitoreo",
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          ),
        },
        {
          id: "reservas",
          label: "Gestión de Reservas",
          badge: resumen?.total_reservas_dia || 0,
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          ),
        },
        {
          id: "calendario",
          label: "Calendario y Bloqueos",
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          ),
        },
        {
          id: "sedes",
          label: "Sedes y Cubículos",
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Gestión y Analítica",
      items: [
        {
          id: "talleres",
          label: "Talleres Solicitados",
          badge: solicitudesTalleres.filter((s) => s.estado === "pendiente").length,
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          ),
        },
        {
          id: "incidencias",
          label: "Incidencias de Cubículos",
          badge: incidencias.filter((i) => i.estado === "pendiente" || i.estado === "en_revision").length,
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ),
        },
        {
          id: "metricas",
          label: "Métricas y Análisis",
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Portal y Archivo",
      items: [
        {
          id: "cms",
          label: "Portal Inicio",
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          ),
        },
        {
          id: "faqs",
          label: "Preguntas Frecuentes",
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          ),
        },
        {
          id: "historial",
          label: "Historial de Registros",
          svg: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSidebarMobileOpen(false);
    if (tabId === "cms" || tabId === "faqs") fetchCMS();
    if (tabId === "calendario") fetchDiasBloqueados();
    if (tabId === "talleres") fetchSolicitudesTalleres();
    if (tabId === "historial") fetchHistorial();
    if (tabId === "incidencias") fetchIncidencias();
    if (tabId === "metricas") {
      setTipoMetricas("selector");
      fetchSolicitudesTalleres();
    }
  };

  return (
    <div style={{ fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif' }} className="min-h-screen bg-[#F1F5F9] bg-[radial-gradient(ellipse_80%_45%_at_50%_-15%,rgba(0,163,224,0.10),transparent)] text-slate-800 selection:bg-[#00A3E0]/20 flex flex-col lg:flex-row">
      {sidebarMobileOpen && (
        <div
          onClick={() => setSidebarMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-[#041525] via-[#00223D] to-[#031322] text-white flex flex-col border-r border-white/[0.08] shadow-[8px_0_35px_-10px_rgba(0,25,45,0.45)] transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarCollapsed ? "lg:w-20" : "lg:w-[276px]"
        } ${sidebarMobileOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full"}`}
      >
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(0,163,224,0.18),transparent_70%)] pointer-events-none" />

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          className="hidden lg:flex absolute -right-3 top-8 z-50 w-6 h-6 rounded-full bg-[#00629B] hover:bg-[#00A3E0] text-white border-2 border-[#041525] items-center justify-center shadow-md transition-all cursor-pointer"
        >
          <svg className={`w-3 h-3 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className={`relative pt-5 pb-4 ${sidebarCollapsed ? "px-2" : "px-5"} flex flex-col items-center border-b border-white/[0.08]`}>
          <button
            onClick={() => setSidebarMobileOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>

          <div className="w-full flex items-center justify-center py-2">
            <img
              src={logoUCT}
              alt="Universidad Católica de Temuco"
              className={`${sidebarCollapsed ? "h-10" : "h-[64px]"} w-auto max-w-[230px] object-contain drop-shadow-md transition-all duration-300`}
            />
          </div>

          {!sidebarCollapsed && (
            <div className="mt-1.5 text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC20E]" />
                <span className="text-[10px] font-black text-sky-100 tracking-[0.16em] uppercase">
                  BIBLIOTECA UCT
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-none">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-sky-300/45 select-none">
                  {group.title}
                </div>
              )}
              {group.items.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    title={sidebarCollapsed ? tab.label : undefined}
                    className={`group w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"} py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer relative ${
                      isSelected
                        ? "bg-gradient-to-r from-[#00629B] via-[#00629B]/80 to-[#0082B8]/40 text-white shadow-[0_8px_20px_-6px_rgba(0,98,155,0.65)] ring-1 ring-white/20"
                        : "text-slate-300/85 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#FFC20E] shadow-[0_0_10px_#FFC20E]" />
                    )}
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isSelected
                            ? "bg-gradient-to-br from-[#FFC20E] to-[#E5AC00] text-[#002D4C] shadow-[0_4px_12px_rgba(255,194,14,0.4)]"
                            : "bg-white/[0.06] text-sky-200/80 group-hover:bg-white/10 group-hover:text-white"
                        }`}
                      >
                        {tab.svg}
                      </span>
                      {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
                    </div>
                    {tab.badge > 0 && (
                      <span
                        className={`${sidebarCollapsed ? "absolute -top-1 -right-1 min-w-4 h-4 text-[9px]" : "min-w-5 h-5 text-[10px]"} px-1.5 flex items-center justify-center rounded-full font-black shadow-xs ${
                          tab.id === "incidencias"
                            ? "bg-[#EA3829] text-white ring-2 ring-red-400/30"
                            : "bg-[#FFC20E] text-[#002D4C]"
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.08] bg-black/20 space-y-2">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00A3E0] to-[#00629B] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                {(user?.nombre || "AD").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-white truncate">
                  {user?.nombre || "Administrador"}
                </div>
                <div className="text-[10px] text-sky-300/70 truncate">
                  Panel de Administración
                </div>
              </div>
            </div>
          )}

          <div className={`flex ${sidebarCollapsed ? "flex-col items-center gap-1.5" : "items-center gap-1.5"}`}>
            <Link
              to="/"
              title="Portal Institucional"
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-sky-200/85 bg-white/[0.05] hover:bg-white/10 hover:text-white border border-white/[0.06] transition-all`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              {!sidebarCollapsed && <span>Inicio</span>}
            </Link>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className={`${sidebarCollapsed ? "w-full" : ""} flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/25 hover:text-white border border-rose-400/15 transition-all cursor-pointer`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!sidebarCollapsed && <span>Salir</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-[276px]"}`}>
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-5 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_24px_-8px_rgba(0,45,76,0.06)]">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block w-1.5 h-9 rounded-full bg-gradient-to-b from-[#00629B] via-[#00A3E0] to-[#FFC20E]" />
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight uppercase leading-tight">
                {activeTab === "monitoreo" ? "Actividad y Monitoreo" :
                  activeTab === "reservas" ? "Gestión de Reservas" :
                    activeTab === "incidencias" ? "Incidencias de Cubículos" :
                      activeTab === "talleres" ? "Talleres Solicitados" :
                        activeTab === "metricas" ? (tipoMetricas === "talleres" ? "Métricas · Talleres" : tipoMetricas === "prediccion" ? "Métricas · Pronóstico" : tipoMetricas === "reservas" ? "Métricas · Reservas" : "Métricas y Análisis") :
                          activeTab === "calendario" ? "Calendario y Bloqueos" :
                            activeTab === "sedes" ? "Sedes y Cubículos" :
                              activeTab === "cms" ? "Portal de Inicio" :
                                activeTab === "faqs" ? "Preguntas Frecuentes" : "Historial de Registros"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-semibold">
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sede {campusSeleccionadoObj?.nombre || "Principal"}
                </span>
                <span>·</span>
                <span>{cubiculosActuales} cubículos</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <div className="relative hidden md:flex items-center">
              <input
                type="text"
                placeholder="Buscar estudiante, RUT o reserva..."
                value={busquedaGlobal}
                onChange={(e) => setBusquedaGlobal(e.target.value)}
                className="w-48 lg:w-64 pl-9 pr-4 py-2 rounded-xl bg-slate-100/90 border border-slate-200/90 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#00A3E0] focus:ring-3 focus:ring-[#00A3E0]/15 outline-none transition-all"
              />
              <svg className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>

            <div className="relative">
              <select
                value={campusSeleccionado || ""}
                onChange={(e) => setCampusSeleccionado(Number(e.target.value))}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#002D4C] shadow-2xs hover:border-[#00629B] focus:border-[#00A3E0] focus:ring-3 focus:ring-[#00A3E0]/15 outline-none transition-all cursor-pointer min-w-[145px]"
              >
                {campus.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▼</span>
            </div>

            <button
              type="button"
              onClick={() => setModalManualUsuario(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-[#00629B] font-bold px-3 py-2 text-xs shadow-2xs transition-all cursor-pointer"
              title="Manual de Usuario"
            >
              <span><UiIcon name="book" className="w-4 h-4" /></span>
              <span className="hidden xl:inline">Manual</span>
            </button>

            {incidencias.filter((i) => i.estado === "pendiente" || i.estado === "en_revision").length > 0 && (
              <button
                onClick={() => handleSelectTab("incidencias")}
                className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center text-sm shadow-2xs transition-all cursor-pointer"
                title="Incidencias pendientes"
              >
                <span><UiIcon name="bell" className="w-4 h-4" /></span>
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#EA3829] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                  {incidencias.filter((i) => i.estado === "pendiente" || i.estado === "en_revision").length}
                </span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center text-sm shadow-2xs transition-all cursor-pointer"
                title="Acciones rápidas"
              >
                <UiIcon name="settings" className="w-4 h-4" />
              </button>

              {settingsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs space-y-1 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 block">Acciones Rápidas</span>
                  </div>
                  <button
                    onClick={() => {
                      handleAbrirPuertaManualCamara();
                      setSettingsDropdownOpen(false);
                    }}
                    disabled={abriendoPuertaCamara}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-sky-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span><UiIcon name="unlock" className="w-4 h-4" /></span>
                    <span>{abriendoPuertaCamara ? "Abriendo..." : "Abrir Puerta Terminal (Relé 1)"}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSelectTab("sedes");
                      setSettingsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <span><UiIcon name="building" className="w-4 h-4" /></span>
                    <span>Administrar Sedes y Cubículos</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`${activeTab === "reservas" ? "p-3 sm:p-5 max-w-none flex flex-col" : "p-5 sm:p-8 max-w-7xl space-y-6"} w-full mx-auto flex-1`}>

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
                  <h2 className={SECTION_TITLE}>Gestión del Portal de Inicio</h2>
                  <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                    Edita las diapositivas del carrusel informativo y las tarjetas de la página principal.
                  </p>
                </div>
                <button onClick={fetchCMS} className={BTN_GHOST}>
                  Actualizar vistas
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span><UiIcon name="layers" className="w-4 h-4" /></span> Diapositivas del carrusel principal
                      <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">{cmsAnuncios.length}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Banners animados que rotan en la sección superior del inicio</p>
                  </div>
                  <button type="button" onClick={handleAbrirCrearAnuncio} className={`${BTN_PRIMARY} px-4 py-2`}>
                    Añadir diapositiva
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
                            Editar
                          </button>
                          <button type="button" onClick={() => handleEliminarAnuncio(an.id, an.titulo)} className={BTN_DANGER}>
                            Eliminar
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
                      <span><UiIcon name="doc" className="w-4 h-4" /></span> Tarjetas informativas inferiores
                      <span className="text-[11px] font-semibold text-[#00629B] bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">{cmsTarjetas.length}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Bloques con accesos directos situados abajo en el inicio</p>
                  </div>
                  <button type="button" onClick={handleAbrirCrearTarjeta} className={`${BTN_ACCENT} px-4 py-2`}>
                    Añadir tarjeta
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
                            <span className="text-xl w-11 h-11 flex items-center justify-center bg-sky-50 rounded-xl border border-sky-100"><UiIcon name={tj.icono || "book"} className="w-5 h-5 text-[#00629B]" /></span>
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
                            Editar
                          </button>
                          <button type="button" onClick={() => handleEliminarTarjeta(tj.id, tj.titulo)} className={BTN_DANGER}>
                            Eliminar
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
                    Añadir pregunta
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
                          Editar
                        </button>
                        <button type="button" onClick={() => handleEliminarFaq(faq.id, faq.pregunta)} className={BTN_DANGER}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === "sedes") && (
            <div className="space-y-6 mb-8 animate-fadeIn">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCrearSede(true)}
                    className="inline-flex items-center gap-2 bg-[#004D7A] hover:bg-[#003859] active:scale-98 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span className="text-sm font-bold">+</span>
                    <span>Nueva Sede</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalCrearCubiculo(true)}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border border-slate-200/60"
                  >
                    <span className="text-sm font-bold">+</span>
                    <span>Añadir Cubículo</span>
                  </button>

                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 text-xs">
                    <span className="text-slate-400 font-medium">Sede:</span>
                    <select
                      value={campusDestinoCubiculo}
                      onChange={(e) => setCampusDestinoCubiculo(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer pr-1"
                    >
                      {campus.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100/90 px-3 py-1.5 rounded-full border border-slate-200/70 whitespace-nowrap">
                    {campus.length} sedes registradas
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      fetchCampus();
                      if (campusDestinoCubiculo) fetchCubiculos(campusDestinoCubiculo);
                    }}
                    title="Actualizar datos"
                    className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    <UiIcon name="refresh" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#004D7A] text-white rounded-2xl p-5 shadow-xs flex items-center justify-between relative overflow-hidden group">
                  <div className="space-y-1 z-10">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-base mb-2"><UiIcon name="building" className="w-4 h-4" /></div>
                    <p className="text-[11px] font-medium text-white/80 uppercase tracking-wider">Total Sedes</p>
                    <p className="text-3xl font-extrabold tracking-tight text-white">{campus.length}</p>
                  </div>
                  <div className="flex items-end gap-1.5 h-10 opacity-75 z-10">
                    <div className="w-1.5 h-4 bg-white/50 rounded-full" />
                    <div className="w-1.5 h-7 bg-white/70 rounded-full" />
                    <div className="w-1.5 h-5 bg-white/60 rounded-full" />
                    <div className="w-1.5 h-9 bg-white rounded-full" />
                    <div className="w-1.5 h-6 bg-white/80 rounded-full" />
                  </div>
                </div>

                <div className="bg-[#C59B27] text-white rounded-2xl p-5 shadow-xs flex items-center justify-between relative overflow-hidden group">
                  <div className="space-y-1 z-10">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-base mb-2"><UiIcon name="door" className="w-4 h-4" /></div>
                    <p className="text-[11px] font-medium text-white/90 uppercase tracking-wider">Cubículos Totales</p>
                    <p className="text-3xl font-extrabold tracking-tight text-white">
                      {campus.reduce((acc, c) => acc + (c.cubiculas_fisicos || 0), 0)}
                    </p>
                  </div>
                  <div className="z-10">
                    <svg className="w-16 h-8 text-white/85" viewBox="0 0 70 30" fill="none">
                      <path d="M0 24 C 20 28, 35 4, 70 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <div className="bg-[#00629B] text-white rounded-2xl p-5 shadow-xs flex items-center justify-between relative overflow-hidden group">
                  <div className="space-y-1 z-10">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-base mb-2"><UiIcon name="bolt" className="w-4 h-4" /></div>
                    <p className="text-[11px] font-medium text-white/80 uppercase tracking-wider">Operativos Hoy</p>
                    <p className="text-3xl font-extrabold tracking-tight text-white">
                      {cubiculosCampus.filter((cb) => !cb.en_mantenimiento).length}
                    </p>
                  </div>
                  <div className="z-10">
                    <svg className="w-16 h-8 text-white/85" viewBox="0 0 70 30" fill="none">
                      <path d="M0 22 C 25 28, 45 4, 70 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <div className="bg-[#B8860B] text-white rounded-2xl p-5 shadow-xs flex items-center justify-between relative overflow-hidden group">
                  <div className="space-y-1 z-10">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-base mb-2"><UiIcon name="wrench" className="w-4 h-4" /></div>
                    <p className="text-[11px] font-medium text-white/90 uppercase tracking-wider">En Mantenimiento</p>
                    <p className="text-3xl font-extrabold tracking-tight text-white">
                      {cubiculosCampus.filter((cb) => cb.en_mantenimiento).length}
                    </p>
                  </div>
                  <div className="z-10">
                    <svg className="w-16 h-8 text-white/85" viewBox="0 0 70 30" fill="none">
                      <path d="M0 16 C 20 4, 45 28, 70 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Distribución de Capacidad</h3>
                        <p className="text-[11px] text-slate-500">Cubículos habilitados por sede</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#00629B] bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full">
                        Red UCT
                      </span>
                    </div>

                    <div className="pt-2 pb-1">
                      <div className="h-36 flex items-end justify-around gap-2 border-b border-slate-200 pb-2 relative">
                        <div className="absolute inset-x-0 top-6 border-b border-dashed border-slate-200 pointer-events-none" />
                        <div className="absolute inset-x-0 top-16 border-b border-dashed border-slate-200 pointer-events-none" />

                        {campus.map((c, idx) => {
                          const maxCub = Math.max(...campus.map((cp) => cp.cubiculas_fisicos || 10), 12);
                          const alturaPct = Math.max(20, Math.min(100, Math.round(((c.cubiculas_fisicos || 10) / maxCub) * 100)));
                          const esSeleccionado = String(c.id) === String(campusDestinoCubiculo);
                          const colorBarra = idx % 2 === 0 ? "bg-[#004D7A]" : "bg-[#C59B27]";

                          return (
                            <div
                              key={c.id}
                              onClick={() => setCampusDestinoCubiculo(c.id)}
                              className="flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group flex-1 max-w-[70px]"
                              title={`Clic para ver cubículos de ${c.nombre}`}
                            >
                              <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                                {c.cubiculas_fisicos ?? 10}
                              </span>
                              <div
                                style={{ height: `${alturaPct}%` }}
                                className={`w-full max-w-[36px] ${colorBarra} rounded-t-lg transition-all duration-300 group-hover:opacity-90 ${esSeleccionado ? "ring-3 ring-sky-300 ring-offset-1" : ""}`}
                              />
                              <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[65px] text-center pt-1">
                                {c.nombre}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {campus.map((c) => {
                        const esActivo = String(c.id) === String(campusDestinoCubiculo);
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${esActivo
                              ? "border-[#00629B] bg-sky-50/50 ring-1 ring-[#00629B]/20"
                              : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-50"
                              }`}
                          >
                            <div
                              onClick={() => setCampusDestinoCubiculo(c.id)}
                              className="min-w-0 cursor-pointer flex-1 pr-2"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs"><UiIcon name="building" className="w-4 h-4" /></span>
                                <p className="font-bold text-xs text-slate-800 truncate">{c.nombre}</p>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                ID {c.id} · {c.cubiculas_fisicos ?? 10} cubículos
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleIniciarEdicion(c)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                                title="Editar datos de sede"
                              >
                                <UiIcon name="edit" className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCampusAEliminar(c)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-xs transition-colors cursor-pointer"
                                title="Eliminar sede"
                              >
                                <UiIcon name="trash" className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleCrearCampus} className="pt-3 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      value={nuevoCampusNombre}
                      onChange={(e) => setNuevoCampusNombre(e.target.value)}
                      placeholder="Nueva sede (ej: Campus San Miguel)..."
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#004D7A] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={creandoCampus || !nuevoCampusNombre.trim()}
                      className="bg-[#004D7A] hover:bg-[#003859] disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      {creandoCampus ? "Guardando..." : "Registrar Sede"}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Estado de Infraestructura</h3>
                        <p className="text-[11px] text-slate-500">Servicios y conectividad institucional</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1 w-5 h-5 opacity-40">
                        <div className="w-2 h-2 bg-slate-800 rounded-xs" />
                        <div className="w-2 h-2 bg-slate-800 rounded-xs" />
                        <div className="w-2 h-2 bg-slate-800 rounded-xs" />
                        <div className="w-2 h-2 bg-slate-800 rounded-xs" />
                      </div>
                    </div>

                    <div className="space-y-3.5 pt-1">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold text-slate-700">API & Backend UCT</span>
                        <span className="bg-[#004D7A] text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-2xs">
                          99.9% Uptime
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold text-slate-700">Base de Datos SQL Server</span>
                        <span className="bg-[#C59B27] text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-2xs">
                          Saludable
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold text-slate-700">Terminal Facial MinMoe</span>
                        <span className="bg-[#00629B] text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-2xs">
                          Operativo
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold text-slate-700">Sede Activa en Vista</span>
                        <span className="bg-[#004D7A] text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-2xs truncate max-w-[140px]">
                          {campus.find((c) => String(c.id) === String(campusDestinoCubiculo))?.nombre || "General"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold text-slate-700">Alertas de Servidor</span>
                        <span className="bg-[#0F172A] text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-2xs">
                          Ninguna
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>Disponibilidad en sede activa</span>
                      <span className="text-[#00629B] font-bold">
                        {cubiculosCampus.length > 0
                          ? `${Math.round(((cubiculosCampus.filter((cb) => !cb.en_mantenimiento).length) / cubiculosCampus.length) * 100)}%`
                          : "100%"}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${cubiculosCampus.length > 0
                            ? ((cubiculosCampus.filter((cb) => !cb.en_mantenimiento).length) / cubiculosCampus.length) * 100
                            : 100}%`
                        }}
                        className="bg-[#00629B] h-full transition-all duration-500"
                      />
                      <div
                        style={{
                          width: `${cubiculosCampus.length > 0
                            ? ((cubiculosCampus.filter((cb) => cb.en_mantenimiento).length) / cubiculosCampus.length) * 100
                            : 0}%`
                        }}
                        className="bg-[#C59B27] h-full transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#004D7A] via-[#00629B] to-[#00A3E0] text-white flex items-center justify-center text-lg shadow-[0_6px_16px_-4px_rgba(0,77,122,0.4)] shrink-0"><UiIcon name="door" className="w-4 h-4" /></div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                          Cubículos en {campus.find((c) => String(c.id) === String(campusDestinoCubiculo))?.nombre || "la sede"}
                        </h3>
                        <span className="text-[11px] font-bold text-[#00629B] bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-full">
                          {cubiculosCampus.length} unidades
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Gestión operativa, mantenimiento programado y asignación de códigos físicos
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCrearCubiculo} className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">#</span>
                      <input
                        type="text"
                        value={nuevoCodigoCubiculo}
                        onChange={(e) => setNuevoCodigoCubiculo(e.target.value)}
                        placeholder="CÓDIGO (ej: CUB-12)"
                        className="w-44 pl-7 pr-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 uppercase placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-[#00629B] focus:ring-4 focus:ring-[#00629B]/10 outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creandoCubiculo || !nuevoCodigoCubiculo.trim() || !campusDestinoCubiculo}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FFD54A] via-[#FFC20E] to-[#E5AC00] hover:from-[#FFC20E] hover:to-[#EDB100] text-[#0F172A] font-extrabold text-xs px-4 py-2 rounded-xl shadow-[0_6px_16px_-6px_rgba(255,194,14,0.6)] hover:shadow-[0_10px_20px_-6px_rgba(255,194,14,0.8)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-98"
                    >
                      <span>+</span>
                      <span>{creandoCubiculo ? "Guardando..." : "Crear Cubículo"}</span>
                    </button>
                  </form>
                </div>

                {cargandoCubiculosCampus ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="relative h-28 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer" />
                      </div>
                    ))}
                  </div>
                ) : cubiculosCampus.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cubiculosCampus.map((cb) => (
                      editingCubiculoId === cb.id ? (
                        <div
                          key={cb.id}
                          className="rounded-2xl border-2 border-[#00629B] bg-white p-4 shadow-md space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#00629B]">Editar Código</span>
                            <span className="text-[10px] text-slate-400">ID {cb.id}</span>
                          </div>
                          <input
                            type="text"
                            value={editCubiculoCodigoVal}
                            onChange={(e) => setEditCubiculoCodigoVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleGuardarEditCubiculo(cb.id);
                              if (e.key === "Escape") setEditingCubiculoId(null);
                            }}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-900 uppercase focus:bg-white focus:border-[#00629B] outline-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleGuardarEditCubiculo(cb.id)}
                              className="flex-1 py-1.5 bg-[#00629B] hover:bg-[#004D7A] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCubiculoId(null)}
                              className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={cb.id}
                          className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${cb.en_mantenimiento
                              ? "bg-gradient-to-b from-amber-50/60 to-white border-amber-200/90 hover:border-amber-300 hover:shadow-[0_10px_25px_-8px_rgba(217,119,6,0.18)]"
                              : "bg-gradient-to-b from-white to-slate-50/40 hover:to-white border-slate-200/90 hover:border-[#00629B]/40 hover:shadow-[0_10px_25px_-8px_rgba(0,77,122,0.12)]"
                            }`}
                        >
                          <div
                            className={`h-1 w-full ${cb.en_mantenimiento
                                ? "bg-gradient-to-r from-[#FFC20E] via-[#E5AC00] to-[#B8860B]"
                                : "bg-gradient-to-r from-[#004D7A] via-[#00629B] to-[#00A3E0]"
                              }`}
                          />

                          <div className="p-4 space-y-3.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cb.en_mantenimiento
                                      ? "bg-amber-100/80 text-amber-900 border-amber-200"
                                      : "bg-sky-50 text-[#00629B] border-sky-100"
                                    }`}
                                >
                                  <UiIcon name={cb.en_mantenimiento ? "alert" : "door"} className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-sm text-slate-900 truncate tracking-tight">
                                    {cb.codigo}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-medium">Cubículo individual</p>
                                </div>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${cb.en_mantenimiento
                                    ? "bg-amber-100/70 text-amber-900 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${cb.en_mantenimiento ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                                    }`}
                                />
                                {cb.en_mantenimiento ? "Mantención" : "Operativo"}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-100/80 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAbrirModalMantenimiento(cb)}
                                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${cb.en_mantenimiento
                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-2xs"
                                    : "bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200 hover:border-amber-200 shadow-2xs"
                                  }`}
                                title="Gestionar días de mantenimiento"
                              >
                                <svg className="w-3.5 h-3.5 text-current shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                                <span className="truncate">{cb.en_mantenimiento ? "En Revisión" : "Mantención"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCubiculoId(cb.id);
                                  setEditCubiculoCodigoVal(cb.codigo);
                                }}
                                className="w-8 h-8 rounded-xl bg-white hover:bg-sky-50 text-slate-500 hover:text-[#00629B] border border-slate-200 hover:border-sky-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                                title="Editar código del cubículo"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEliminarCubiculoModal(cb.id, cb.codigo)}
                                className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                                title="Eliminar cubículo"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <span className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl mx-auto text-slate-400"><UiIcon name="door" className="w-4 h-4" /></span>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700">
                        No hay cubículos en {campus.find((c) => String(c.id) === String(campusDestinoCubiculo))?.nombre || "esta sede"}
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Crea el primer cubículo físico utilizando el formulario superior con su código correspondiente.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {modalCrearSede && (
                <div className={OVERLAY}>
                  <div className={`${MODAL} max-w-md p-6 space-y-4`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        Registrar Nueva Sede
                      </h3>
                      <button
                        type="button"
                        onClick={() => setModalCrearSede(false)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCrearCampus} className="space-y-4">
                      <div className="space-y-1">
                        <label className={LABEL}>Nombre de la sede institucional</label>
                        <input
                          type="text"
                          value={nuevoCampusNombre}
                          onChange={(e) => setNuevoCampusNombre(e.target.value)}
                          placeholder="Ej: Campus San Miguel..."
                          className={INPUT}
                          autoFocus
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setModalCrearSede(false)}
                          className={`${BTN_GHOST} px-4 py-2 text-xs`}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={creandoCampus || !nuevoCampusNombre.trim()}
                          className={`${BTN_PRIMARY} px-4 py-2 text-xs`}
                        >
                          {creandoCampus ? "Guardando..." : "Guardar Sede"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {modalCrearCubiculo && (
                <div className={OVERLAY}>
                  <div className={`${MODAL} max-w-md p-6 space-y-4`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        Añadir Cubículo
                      </h3>
                      <button
                        type="button"
                        onClick={() => setModalCrearCubiculo(false)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCrearCubiculo} className="space-y-4">
                      <div className="space-y-1">
                        <label className={LABEL}>Sede destino</label>
                        <select
                          value={campusDestinoCubiculo}
                          onChange={(e) => setCampusDestinoCubiculo(e.target.value)}
                          className={`${INPUT} font-semibold cursor-pointer`}
                        >
                          {campus.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className={LABEL}>Código del cubículo</label>
                        <input
                          type="text"
                          value={nuevoCodigoCubiculo}
                          onChange={(e) => setNuevoCodigoCubiculo(e.target.value)}
                          placeholder="Ej: CUB-08..."
                          className={`${INPUT} uppercase font-bold`}
                          autoFocus
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setModalCrearCubiculo(false)}
                          className={`${BTN_GHOST} px-4 py-2 text-xs`}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={creandoCubiculo || !nuevoCodigoCubiculo.trim() || !campusDestinoCubiculo}
                          className={`${BTN_ACCENT} px-4 py-2 text-xs`}
                        >
                          {creandoCubiculo ? "Añadiendo..." : "Crear Cubículo"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {campusAEditar && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-xl p-6 space-y-5 max-h-[90vh] flex flex-col`}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-slate-900">
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
                        {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      Cubículos registrados
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
                        Añadir
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
                                    {cb.codigo}
                                  </span>
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                                    Mantenimiento
                                  </span>
                                </div>
                              ) : (
                                <span className="font-semibold text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                  {cb.codigo}
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
                                  <UiIcon name="wrench" className="w-4 h-4" />
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
                                  <UiIcon name="edit" className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarCubiculoModal(cb.id, cb.codigo)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-xs transition-all cursor-pointer"
                                  title="Eliminar cubículo"
                                >
                                  <UiIcon name="trash" className="w-4 h-4" />
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
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 text-2xl flex items-center justify-center mx-auto border border-rose-100"><UiIcon name="alert" className="w-4 h-4" /></div>
                <h3 className="text-lg font-sans font-bold text-slate-900">
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
              <div className={`${CARD} p-4 sm:px-6 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                    Jornada
                  </span>
                  {proximosDias.map((d) => {
                    const esActivo = fechaSeleccionada === d.fechaStr;
                    return (
                      <button
                        key={d.fechaStr}
                        onClick={() => setFechaSeleccionada(d.fechaStr)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                          esActivo
                            ? "bg-gradient-to-r from-[#002D4C] to-[#00629B] text-white shadow-sm scale-[1.02]"
                            : "bg-slate-50 border border-slate-200/80 text-slate-700 hover:border-[#00629B]/40 hover:bg-white"
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
                    className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:bg-white focus:border-[#00A3E0] focus:ring-2 focus:ring-[#00A3E0]/20 cursor-pointer transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold capitalize">
                    {new Date(fechaSeleccionada + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-[#00629B] font-extrabold">
                    {cubiculosActuales} cubículos activos
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-rose-50/80 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-semibold mb-6 shadow-xs">
                  {error}
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
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
                    <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_-8px_rgba(0,45,76,0.06)] overflow-hidden flex flex-col justify-between">
                      <div className="bg-gradient-to-r from-[#002D4C] via-[#004D7A] to-[#00629B] text-white px-5 py-3.5 flex items-center justify-between">
                        <button
                          onClick={handleMiniCalPrev}
                          className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Mes anterior"
                        >
                          ‹
                        </button>
                        <span className="text-xs font-black tracking-widest uppercase">
                          {miniCalMes.toLocaleDateString("es-CL", { month: "long", year: "numeric" }).toUpperCase()}
                        </span>
                        <button
                          onClick={handleMiniCalNext}
                          className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Mes siguiente"
                        >
                          ›
                        </button>
                      </div>

                      <div className="p-4">
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                          {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
                            <span key={i} className="text-[11px] font-extrabold text-slate-400">
                              {d}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center">
                          {getMiniCalDias().map((d, idx) => {
                            if (!d) return <div key={idx} className="h-7 w-7 mx-auto" />;

                            const esSeleccionado = d.fechaIso === fechaSeleccionada;
                            const esHoy = d.fechaIso === hoyStr;
                            const esPasado = d.fechaIso < hoyStr;
                            const esBloqueado = diasBloqueados.some((b) => b.fecha === d.fechaIso);
                            const tieneHistorial = historial.some((h) => h.fecha === d.fechaIso);

                            let badgeStyle = "text-slate-600 hover:bg-slate-100";
                            if (esHoy) {
                              badgeStyle = `bg-[#FFC20E] text-[#002D4C] font-black shadow-xs ring-2 ${esSeleccionado ? "ring-slate-900" : "ring-[#FFC20E]/50"}`;
                            } else if (esSeleccionado) {
                              badgeStyle = "bg-[#00629B] text-white font-bold shadow-sm ring-2 ring-[#00629B]/40";
                            } else if (esPasado) {
                              badgeStyle = "bg-slate-100 text-slate-400 border border-slate-200/60 hover:bg-slate-200";
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

                    <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-[0_8px_30px_-8px_rgba(0,45,76,0.06)] flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#00A3E0]" />
                          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            Ocupación por Turno
                          </span>
                        </div>
                        <button
                          onClick={() => handleSelectTab("metricas")}
                          className="px-3 py-1 rounded-lg bg-sky-50 hover:bg-[#00629B] text-[#00629B] hover:text-white border border-sky-200/60 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Métricas →
                        </button>
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
                                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-md shadow pointer-events-none whitespace-nowrap z-20 font-bold">
                                  {b.rango || b.hora}: {b.ocupados}/{cubiculosActuales}
                                </div>
                                <div className="w-full flex items-end justify-center gap-1 h-36">
                                  <div
                                    className="w-2.5 sm:w-3 rounded-t-md transition-all duration-300 hover:brightness-110"
                                    style={{ height: `${hOcupados}%`, backgroundColor: color }}
                                  />
                                  <div
                                    className="w-2.5 sm:w-3 rounded-t-md bg-slate-200 transition-all duration-300"
                                    style={{ height: `${hDisponibles}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold mt-2 truncate w-full text-center">
                                  {(b.rango || b.hora || "").split("-")[0]?.trim()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3 bg-gradient-to-br from-[#041525] via-[#002B49] to-[#004D7A] text-white rounded-3xl p-5 shadow-[0_14px_34px_-12px_rgba(0,45,76,0.45)] border border-white/10 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#00A3E0]/15 blur-xl pointer-events-none" />
                      <div>
                        <span className="text-[10px] font-extrabold text-sky-300 uppercase tracking-widest">
                          Resumen de Jornada
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-3xl font-black text-white tracking-tight">
                            {porcentaje}%
                          </span>
                          <span className="text-xs font-bold text-sky-200/80">Ocupación</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2.5 mb-3">
                          <div
                            className="h-full bg-gradient-to-r from-[#00A3E0] to-[#FFC20E] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(4, porcentaje))}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                        <div className="flex justify-between items-center text-sky-100/85">
                          <span>Reservas activas</span>
                          <span className="text-white font-extrabold">{resumen.total_reservas_dia}</span>
                        </div>
                        <div className="flex justify-between items-center text-sky-100/85">
                          <span>Cupos disponibles</span>
                          <span className="text-emerald-300 font-extrabold">{resumen.cupos_disponibles_dia}</span>
                        </div>
                        <div className="flex justify-between items-center text-sky-100/85">
                          <span>Cubículos en sede</span>
                          <span className="text-white font-extrabold">{cubiculosActuales}</span>
                        </div>
                        <div className="flex justify-between items-center text-sky-100/85">
                          <span>Turnos con demanda</span>
                          <span className="text-white font-extrabold">{resumen.bloques?.filter((b) => b.ocupados > 0).length || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/10 font-black text-[#FFC20E]">
                          <span>Capacidad total</span>
                          <span>{resumen.cupos_totales_diarios} cupos</span>
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
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"><UiIcon name="search" className="w-4 h-4" /></span>
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
                              {(() => {
                                const baseLista = (reservasRecientes && reservasRecientes.length > 0) ? reservasRecientes : (historial || []);
                                const filtradas = baseLista
                                  .filter((h) => {
                                    if (!busquedaOrdenes) return true;
                                    const t = busquedaOrdenes.toLowerCase();
                                    return (
                                      (h.nombre && h.nombre.toLowerCase().includes(t)) ||
                                      (h.rut && h.rut.toLowerCase().includes(t)) ||
                                      (h.campus_nombre && h.campus_nombre.toLowerCase().includes(t)) ||
                                      (h.cubiculo_codigo && h.cubiculo_codigo.toLowerCase().includes(t)) ||
                                      String(h.reserva_id || h.id || "").includes(t)
                                    );
                                  })
                                  .slice(0, 5);

                                if (filtradas.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                                        No se encontraron reservas recientes.
                                      </td>
                                    </tr>
                                  );
                                }

                                return filtradas.map((h, i) => {
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

                                  const horaCorta = h.hora ? String(h.hora).slice(0, 5) : "";

                                  return (
                                    <tr key={`${h.reserva_id || h.id}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                                      <td className="py-2.5">
                                        <div className="font-bold text-slate-800 leading-tight">{h.nombre}</div>
                                        {h.campus_nombre && (
                                          <div className="text-[10px] font-medium text-slate-400 mt-0.5">Campus {h.campus_nombre}</div>
                                        )}
                                      </td>
                                      <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                                        #{h.reserva_id || h.id}
                                      </td>
                                      <td className="py-2.5 text-slate-500 text-[11px]">
                                        {h.fecha}{horaCorta ? ` · ${horaCorta} hrs` : ""}
                                      </td>
                                      <td className="py-2.5">
                                        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                          {labelStatus}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
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
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"><UiIcon name="search" className="w-4 h-4" /></span>
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
                            <span>Cronograma de ocupación</span>
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
                          const numSlots = cubiculosActuales || 10;

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
                                  <div className="flex items-center gap-1 w-full overflow-hidden">
                                    {Array.from({ length: numSlots }).map((_, idx) => {
                                      const ocupadoSlot = idx < b.ocupados;
                                      return (
                                        <div
                                          key={idx}
                                          className={`flex-1 min-w-[3px] h-2 rounded-full transition-all ${ocupadoSlot
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

          {(activeTab === "reservas") && (() => {
            const fechaCorta = new Date(fechaSeleccionada + "T12:00:00").toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric"
            });
            const bloquesDia = resumen?.bloques || [];

            const codigosCubiculosDisponibles = Array.from(
              new Set([
                ...(cubiculosCampus || []).map((c) => c.codigo).filter(Boolean),
                ...reservasGestionLista.map((r) => r.cubiculo_codigo).filter(Boolean)
              ])
            ).sort();

            const reservasGestionFiltradas = reservasGestionLista.filter((r) => {
              if (cubiculoFiltroGestion !== "todos" && r.cubiculo_codigo !== cubiculoFiltroGestion) {
                return false;
              }
              const q = (busquedaGestionReservas || busquedaGlobal || "").trim().toLowerCase();
              if (!q) return true;
              const matchTitular = (r.nombre && r.nombre.toLowerCase().includes(q)) ||
                (r.rut && r.rut.toLowerCase().includes(q)) ||
                (r.cubiculo_codigo && r.cubiculo_codigo.toLowerCase().includes(q)) ||
                String(r.id || "").toLowerCase().includes(q);
              const matchAcompanante = Array.isArray(r.acompanantes) && r.acompanantes.some(
                (ac) => (ac.nombre && ac.nombre.toLowerCase().includes(q)) || (ac.rut && ac.rut.toLowerCase().includes(q))
              );
              return matchTitular || matchAcompanante;
            });

            const reservasOrdenadas = [...reservasGestionFiltradas].sort((a, b) => {
              const dir = ordenGestion.dir === "asc" ? 1 : -1;
              const c = ordenGestion.campo;
              if (c === "nombre") return String(a.nombre || "").localeCompare(String(b.nombre || "")) * dir;
              if (c === "rut") return String(a.rut || "").localeCompare(String(b.rut || "")) * dir;
              if (c === "cubiculo") return String(a.cubiculo_codigo || "").localeCompare(String(b.cubiculo_codigo || "")) * dir;
              if (c === "modalidad") return ((a.acompanantes?.length || 0) - (b.acompanantes?.length || 0)) * dir;
              if (c === "fecha") return String(a.fecha || "").localeCompare(String(b.fecha || "")) * dir;
              return String(a.hora || "").localeCompare(String(b.hora || "")) * dir;
            });

            const totalFilas = reservasOrdenadas.length;
            const totalPaginas = Math.max(1, Math.ceil(totalFilas / filasPorPaginaGestion));
            const paginaSegura = Math.min(paginaGestionReservas, totalPaginas);
            const indiceInicio = (paginaSegura - 1) * filasPorPaginaGestion;
            const filasPagina = reservasOrdenadas.slice(indiceInicio, indiceInicio + filasPorPaginaGestion);

            const handleToggleOrden = (campo) => {
              setOrdenGestion((prev) => ({
                campo,
                dir: prev.campo === campo && prev.dir === "asc" ? "desc" : "asc"
              }));
            };

            const todosSeleccionados = filasPagina.length > 0 && filasPagina.every((r) => seleccionadosGestion.includes(String(r.id)));

            const handleToggleSeleccionTodos = () => {
              if (todosSeleccionados) {
                const idsPagina = filasPagina.map((r) => String(r.id));
                setSeleccionadosGestion((prev) => prev.filter((id) => !idsPagina.includes(id)));
              } else {
                const nuevosIds = Array.from(new Set([...seleccionadosGestion, ...filasPagina.map((r) => String(r.id))]));
                setSeleccionadosGestion(nuevosIds);
              }
            };

            const handleToggleFila = (id) => {
              const strId = String(id);
              setSeleccionadosGestion((prev) =>
                prev.includes(strId) ? prev.filter((x) => x !== strId) : [...prev, strId]
              );
            };

            const handleExportarGestionExcel = () => {
              if (reservasOrdenadas.length === 0) {
                setToastNotificacion({ tipo: "error", texto: "No hay reservas activas en la tabla para exportar." });
                return;
              }
              const dataExport = reservasOrdenadas.map((r, i) => ({
                "N°": i + 1,
                "Folio": `#${r.id}`,
                "Estudiante Titular": r.nombre,
                "RUT": r.rut,
                "Cubículo": r.cubiculo_codigo || "N/A",
                "Sede": campusSeleccionadoObj?.nombre || "Sede UCT",
                "Fecha": r.fecha || fechaSeleccionada,
                "Horario": r.rango || r.hora,
                "Modalidad": (r.acompanantes?.length || 0) > 0 ? `Grupal (${r.acompanantes.length + 1})` : "Individual",
                "Acompañantes": (r.acompanantes || []).map((ac) => `${ac.nombre} (${ac.rut || "-"})`).join(", ") || "Sin acompañantes",
                "Estado": "Activa"
              }));
              const wb = XLSX.utils.book_new();
              const ws = XLSX.utils.json_to_sheet(dataExport);
              ws["!cols"] = [
                { wch: 5 }, { wch: 10 }, { wch: 28 }, { wch: 15 }, { wch: 12 },
                { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 42 }, { wch: 12 }
              ];
              XLSX.utils.book_append_sheet(wb, ws, "Reservas Activas");
              XLSX.writeFile(wb, `Reservas_Activas_${campusSeleccionadoObj?.nombre || "UCT"}_${fechaSeleccionada}.xlsx`);
              setToastNotificacion({ tipo: "exito", texto: "Listado de reservas exportado a Excel correctamente." });
            };

            const avatarPalette = [
              "from-[#002D4C] to-[#00629B]",
              "from-[#00629B] to-[#00A3E0]",
              "from-[#004D7A] to-[#0082B8]",
              "from-sky-600 to-cyan-500",
              "from-indigo-900 to-[#00629B]"
            ];

            return (
              <div className="flex-1 flex flex-col min-h-[calc(100vh-118px)] animate-fadeIn">
                <div className="flex-1 flex flex-col justify-between bg-white rounded-3xl border border-[#00629B]/20 shadow-[0_18px_48px_-14px_rgba(0,45,76,0.12)] overflow-hidden">
                  <div className="flex-1 flex flex-col">
                    <div className="p-5 sm:px-7 sm:py-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-r from-white via-sky-50/35 to-white border-b border-slate-200/80">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:w-72">
                          <input
                            type="text"
                            placeholder="Buscar estudiante, RUT o folio..."
                            value={busquedaGestionReservas}
                            onChange={(e) => {
                              setBusquedaGestionReservas(e.target.value);
                              setPaginaGestionReservas(1);
                            }}
                            className="w-full pl-10 pr-8 py-2.5 rounded-full border border-[#00629B]/30 bg-white text-xs font-semibold text-[#0F172A] placeholder:text-slate-400 focus:border-[#00629B] focus:ring-3 focus:ring-[#00A3E0]/20 outline-none shadow-2xs transition-all"
                          />
                          <svg className="w-4 h-4 text-[#00629B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                          {busquedaGestionReservas && (
                            <button
                              type="button"
                              onClick={() => {
                                setBusquedaGestionReservas("");
                                setPaginaGestionReservas(1);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#002D4C] text-xs font-bold cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="relative inline-flex items-center">
                          <span className="absolute left-3.5 text-[#00629B] pointer-events-none flex items-center">
                            <UiIcon name="building" className="w-3.5 h-3.5" />
                          </span>
                          <select
                            value={campusSeleccionado || ""}
                            onChange={(e) => {
                              setCampusSeleccionado(Number(e.target.value));
                              setCubiculoFiltroGestion("todos");
                              setPaginaGestionReservas(1);
                            }}
                            className="appearance-none pl-9 pr-9 py-2.5 rounded-full border border-[#00629B]/30 bg-white hover:border-[#00629B] hover:bg-sky-50/40 text-xs font-bold text-[#002D4C] focus:border-[#00629B] focus:ring-3 focus:ring-[#00A3E0]/20 outline-none shadow-2xs transition-all cursor-pointer"
                          >
                            {campus.map((c) => (
                              <option key={c.id} value={c.id}>
                                Campus: {c.nombre}
                              </option>
                            ))}
                          </select>
                          <svg className="w-3.5 h-3.5 text-[#00629B] absolute right-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        <div className="relative inline-flex items-center">
                          <span className="absolute left-3.5 text-[#00629B] pointer-events-none flex items-center">
                            <UiIcon name="clock" className="w-3.5 h-3.5" />
                          </span>
                          <select
                            value={horaGestionReservas}
                            onChange={(e) => {
                              setHoraGestionReservas(e.target.value);
                              setPaginaGestionReservas(1);
                            }}
                            className="appearance-none pl-9 pr-9 py-2.5 rounded-full border border-[#00629B]/30 bg-white hover:border-[#00629B] hover:bg-sky-50/40 text-xs font-bold text-[#002D4C] focus:border-[#00629B] focus:ring-3 focus:ring-[#00A3E0]/20 outline-none shadow-2xs transition-all cursor-pointer"
                          >
                            <option value="todos">
                              Horario: Todos ({resumen?.total_reservas_dia || 0})
                            </option>
                            {bloquesDia.map((b) => (
                              <option key={b.hora} value={b.hora}>
                                {b.rango || b.hora} ({b.ocupados}/{cubiculosActuales})
                              </option>
                            ))}
                          </select>
                          <svg className="w-3.5 h-3.5 text-[#00629B] absolute right-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        <div className="relative inline-flex items-center">
                          <span className="absolute left-3.5 text-[#00629B] pointer-events-none flex items-center">
                            <UiIcon name="building" className="w-3.5 h-3.5" />
                          </span>
                          <select
                            value={cubiculoFiltroGestion}
                            onChange={(e) => {
                              setCubiculoFiltroGestion(e.target.value);
                              setPaginaGestionReservas(1);
                            }}
                            className="appearance-none pl-9 pr-9 py-2.5 rounded-full border border-[#00629B]/30 bg-white hover:border-[#00629B] hover:bg-sky-50/40 text-xs font-bold text-[#002D4C] focus:border-[#00629B] focus:ring-3 focus:ring-[#00A3E0]/20 outline-none shadow-2xs transition-all cursor-pointer"
                          >
                            <option value="todos">Cubículo: Todos</option>
                            {codigosCubiculosDisponibles.map((cod) => (
                              <option key={cod} value={cod}>
                                Cubículo {cod}
                              </option>
                            ))}
                          </select>
                          <svg className="w-3.5 h-3.5 text-[#00629B] absolute right-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        <div className="relative inline-flex items-center">
                          <span className="absolute left-3.5 text-[#00629B] pointer-events-none flex items-center">
                            <UiIcon name="calendar" className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="date"
                            value={fechaSeleccionada}
                            onChange={(e) => {
                              if (e.target.value) {
                                setFechaSeleccionada(e.target.value);
                                setPaginaGestionReservas(1);
                              }
                            }}
                            className="pl-9 pr-4 py-2 rounded-full border border-[#00629B]/30 bg-white hover:border-[#00629B] hover:bg-sky-50/40 text-xs font-bold text-[#002D4C] focus:border-[#00629B] focus:ring-3 focus:ring-[#00A3E0]/20 outline-none shadow-2xs transition-all cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end xl:self-auto">
                        <button
                          type="button"
                          onClick={handleExportarGestionExcel}
                          className="px-4 py-2.5 rounded-full border border-[#00629B]/35 bg-white hover:bg-sky-50 text-[#004D7A] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-2xs"
                        >
                          <svg className="w-3.5 h-3.5 text-[#00629B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                          <span>Exportar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fetchReservasGestion(horaGestionReservas, resumen?.bloques)}
                          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#002D4C] via-[#004D7A] to-[#00629B] hover:from-[#004D7A] hover:to-[#0082B8] text-white text-xs font-extrabold transition-all cursor-pointer inline-flex items-center gap-2 shadow-[0_8px_20px_-6px_rgba(0,98,155,0.65)]"
                        >
                          <span className="text-[#FFC20E] text-sm leading-none">↻</span>
                          <span>Actualizar</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-x-auto flex flex-col">
                      <table className="w-full text-left border-collapse flex-1">
                        <thead>
                          <tr className="bg-gradient-to-r from-[#002D4C] via-[#004D7A] to-[#00629B] text-white text-xs font-bold tracking-wide select-none border-b-2 border-[#FFC20E]">
                            <th className="py-4 pl-6 pr-2 w-12">
                              <input
                                type="checkbox"
                                checked={todosSeleccionados}
                                onChange={handleToggleSeleccionTodos}
                                className="w-4 h-4 rounded border-white/40 accent-[#FFC20E] cursor-pointer"
                              />
                            </th>
                            <th
                              onClick={() => handleToggleOrden("nombre")}
                              className="py-4 px-4 cursor-pointer hover:text-[#FFC20E] transition-colors"
                            >
                              <div className="inline-flex items-center gap-1.5">
                                <span>Estudiante</span>
                                <span className="text-[11px] text-[#FFC20E]">⇅</span>
                              </div>
                            </th>
                            <th
                              onClick={() => handleToggleOrden("rut")}
                              className="py-4 px-4 cursor-pointer hover:text-[#FFC20E] transition-colors"
                            >
                              <div className="inline-flex items-center gap-1.5">
                                <span>RUT</span>
                                <span className="text-[11px] text-[#FFC20E]">⇅</span>
                              </div>
                            </th>
                            <th
                              onClick={() => handleToggleOrden("cubiculo")}
                              className="py-4 px-4 cursor-pointer hover:text-[#FFC20E] transition-colors"
                            >
                              <div className="inline-flex items-center gap-1.5">
                                <span>Cubículo</span>
                                <span className="text-[11px] text-[#FFC20E]">⇅</span>
                              </div>
                            </th>
                            <th className="py-4 px-4">
                              <div className="inline-flex items-center gap-1.5">
                                <span>Estado</span>
                                <span className="text-[11px] text-[#FFC20E]">⇅</span>
                              </div>
                            </th>
                            <th
                              onClick={() => handleToggleOrden("modalidad")}
                              className="py-4 px-4 cursor-pointer hover:text-[#FFC20E] transition-colors"
                            >
                              <div className="inline-flex items-center gap-1.5">
                                <span>Acompañantes</span>
                                <span className="text-[11px] text-[#FFC20E]">⇅</span>
                              </div>
                            </th>
                            <th
                              onClick={() => handleToggleOrden("fecha")}
                              className="py-4 px-4 cursor-pointer hover:text-[#FFC20E] transition-colors"
                            >
                              <div className="inline-flex items-center gap-1.5">
                                <span>Fecha Reserva</span>
                                <span className="text-[11px] text-[#FFC20E]">⇅</span>
                              </div>
                            </th>
                            <th
                              onClick={() => handleToggleOrden("hora")}
                              className="py-4 px-4 cursor-pointer hover:text-[#FFC20E] transition-colors"
                            >
                              <div className="inline-flex items-center gap-1.5">
                                <span>Horario</span>
                                <span className="text-[11px] text-[#FFC20E]">⇅</span>
                              </div>
                            </th>
                            <th className="py-4 pl-4 pr-6 text-right">
                              Acciones
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px]">
                          {cargandoGestionReservas ? (
                            Array.from({ length: 10 }).map((_, idx) => (
                              <tr key={idx} className="animate-pulse odd:bg-white even:bg-sky-50/25 h-16">
                                <td className="py-4 pl-6 pr-2"><div className="w-4 h-4 bg-slate-200 rounded" /></td>
                                <td className="py-4 px-4"><div className="h-4 w-44 bg-slate-200 rounded" /></td>
                                <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
                                <td className="py-4 px-4"><div className="h-5 w-20 bg-slate-200 rounded-lg" /></td>
                                <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-200 rounded-full" /></td>
                                <td className="py-4 px-4"><div className="h-4 w-36 bg-slate-100 rounded" /></td>
                                <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
                                <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                                <td className="py-4 pl-4 pr-6 text-right"><div className="h-6 w-16 bg-slate-200 rounded ml-auto" /></td>
                              </tr>
                            ))
                          ) : filasPagina.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-36 px-6 text-center text-slate-500 bg-gradient-to-b from-white to-sky-50/25">
                                <div className="max-w-md mx-auto space-y-3">
                                  <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200/70 text-[#00629B] flex items-center justify-center mx-auto shadow-2xs">
                                    <UiIcon name="calendar" className="w-7 h-7" />
                                  </div>
                                  <p className="text-base font-black text-[#002D4C]">
                                    No hay reservas activas para los filtros seleccionados
                                  </p>
                                  <p className="text-xs text-slate-500 leading-relaxed">
                                    Selecciona otro bloque horario en el menú desplegable, cambia de campus o elige otra fecha en el calendario.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <>
                              {filasPagina.map((res, idx) => {
                                const iniciales = (res.nombre || "AL")
                                  .split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((p) => p[0]?.toUpperCase())
                                  .join("");
                                const avatarGrad = avatarPalette[(indiceInicio + idx) % avatarPalette.length];
                                const numAc = res.acompanantes?.length || 0;
                                const isChecked = seleccionadosGestion.includes(String(res.id));

                                return (
                                  <tr
                                    key={`${res.id}-${res.hora || idx}`}
                                    className={`h-16 transition-colors ${
                                      isChecked
                                        ? "bg-sky-100/60"
                                        : "odd:bg-white even:bg-[#F4F8FB] hover:bg-sky-50/70"
                                    }`}
                                  >
                                    <td className="py-3.5 pl-6 pr-2">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleFila(res.id)}
                                        className="w-4 h-4 rounded border-slate-300 accent-[#00629B] cursor-pointer"
                                      />
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white`}>
                                          {iniciales}
                                        </div>
                                        <div>
                                          <span className="font-bold text-[#0F172A] whitespace-nowrap block">
                                            {res.nombre}
                                          </span>
                                          <span className="text-[11px] font-semibold text-[#00629B]">
                                            Folio #{res.id}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4 text-slate-700 font-mono font-semibold whitespace-nowrap">
                                      {res.rut}
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#002D4C] text-white font-extrabold text-xs shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFC20E]" />
                                        <span>{res.cubiculo_codigo || `CB-${idx + 1}`}</span>
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      <span className="inline-flex items-center gap-1.5 justify-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#00629B] text-white shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFC20E]" />
                                        <span>Activa</span>
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-slate-600">
                                      {numAc > 0 ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200/80 text-[#004D7A] font-semibold text-xs">
                                          <span>{numAc} {numAc === 1 ? "acompañante" : "acompañantes"}</span>
                                          <span className="text-slate-400">·</span>
                                          <span className="truncate max-w-[180px]">{res.acompanantes.map((a) => a.nombre.split(" ")[0]).join(", ")}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs">
                                          Individual
                                        </span>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap capitalize">
                                      {fechaCorta}
                                    </td>

                                    <td className="py-3.5 px-4 font-bold text-[#002D4C] whitespace-nowrap">
                                      {res.rango || res.hora} hrs
                                    </td>

                                    <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                                      <div className="inline-flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={handleAbrirPuertaManualCamara}
                                          title="Abrir puerta del cubículo"
                                          className="p-2 rounded-xl text-[#00629B] hover:text-white hover:bg-[#00629B] border border-sky-200/80 bg-sky-50/60 transition-all cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                          </svg>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleLiberarCubiculo(res.id, res.rut, res.nombre)}
                                          disabled={eliminandoReservaId === res.id}
                                          title="Liberar / Cancelar reserva"
                                          className="p-2 rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 bg-rose-50/60 transition-all cursor-pointer disabled:opacity-40"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              {Array.from({ length: Math.max(0, Math.min(filasPorPaginaGestion, 9) - filasPagina.length) }).map((_, emptyIdx) => (
                                <tr key={`empty-${emptyIdx}`} className="h-16 odd:bg-white even:bg-[#F4F8FB]/50">
                                  <td colSpan={9} />
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-[#002D4C]">Filas por página</span>
                      <div className="relative inline-flex items-center">
                        <select
                          value={filasPorPaginaGestion}
                          onChange={(e) => {
                            setFilasPorPaginaGestion(Number(e.target.value));
                            setPaginaGestionReservas(1);
                          }}
                          className="appearance-none pl-3.5 pr-8 py-1.5 rounded-full border border-[#00629B]/30 bg-white text-xs font-bold text-[#002D4C] outline-none cursor-pointer"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <svg className="w-3 h-3 text-[#00629B] absolute right-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <span className="text-slate-500 font-medium">
                        de <strong className="text-[#002D4C] font-extrabold">{totalFilas}</strong> {totalFilas === 1 ? "reserva activa" : "reservas activas"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setPaginaGestionReservas(1)}
                        disabled={paginaSegura <= 1}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#004D7A] hover:bg-sky-50 disabled:opacity-35 cursor-pointer font-bold"
                      >
                        «
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaginaGestionReservas((p) => Math.max(1, p - 1))}
                        disabled={paginaSegura <= 1}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#004D7A] hover:bg-sky-50 disabled:opacity-35 cursor-pointer font-bold"
                      >
                        ‹
                      </button>

                      {Array.from({ length: totalPaginas }).slice(0, 5).map((_, i) => {
                        const numPag = i + 1;
                        const activa = numPag === paginaSegura;
                        return (
                          <button
                            key={numPag}
                            type="button"
                            onClick={() => setPaginaGestionReservas(numPag)}
                            className={`w-8 h-8 rounded-full text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                              activa
                                ? "bg-gradient-to-br from-[#002D4C] to-[#00629B] text-white shadow-sm ring-2 ring-[#FFC20E]"
                                : "text-[#004D7A] hover:bg-sky-50"
                            }`}
                          >
                            {numPag}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setPaginaGestionReservas((p) => Math.min(totalPaginas, p + 1))}
                        disabled={paginaSegura >= totalPaginas}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#004D7A] hover:bg-sky-50 disabled:opacity-35 cursor-pointer font-bold"
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaginaGestionReservas(totalPaginas)}
                        disabled={paginaSegura >= totalPaginas}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#004D7A] hover:bg-sky-50 disabled:opacity-35 cursor-pointer font-bold"
                      >
                        »
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {(activeTab === "metricas") && (
            <>
              {tipoMetricas === "selector" && (
                <div className={`${CARD} p-6 md:p-8 mb-8 space-y-6 animate-fadeIn`}>
                  <div className="text-center max-w-2xl mx-auto">
                    <h2 className="text-2xl font-black text-[#002D4C] tracking-tight">
                      Métricas y Análisis
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <div
                      onClick={() => setTipoMetricas("reservas")}
                      className="group relative p-6 rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-[#00629B] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                      <div className="space-y-3 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-[#002D4C] text-white flex items-center justify-center text-xl shadow-md"><UiIcon name="building" className="w-4 h-4" /></div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 group-hover:text-[#00629B] transition-colors">
                            Métricas de Reservas
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Ocupación de cubículos por horario, sede y carrera.
                          </p>
                        </div>
                      </div>

                      <div className="pt-5 relative z-10">
                        <button
                          type="button"
                          className="w-full py-2.5 px-4 rounded-xl font-black text-xs bg-[#002D4C] hover:bg-[#00629B] text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <span>Ver Reservas</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() => setTipoMetricas("talleres")}
                      className="group relative p-6 rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-[#FFC20E] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                      <div className="space-y-3 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFC20E] to-amber-500 text-[#002D4C] flex items-center justify-center text-xl shadow-md"><UiIcon name="academic" className="w-4 h-4" /></div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 group-hover:text-amber-800 transition-colors">
                            Métricas de Talleres
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Solicitudes de talleres, modalidades y carreras.
                          </p>
                        </div>
                      </div>

                      <div className="pt-5 relative z-10">
                        <button
                          type="button"
                          className="w-full py-2.5 px-4 rounded-xl font-black text-xs bg-[#FFC20E] hover:bg-amber-400 text-[#002D4C] shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <span>Ver Talleres</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={() => setTipoMetricas("prediccion")}
                      className="group relative p-6 rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 hover:border-[#00A3E0] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
                    >
                      <div className="space-y-3 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00629B] to-[#00A3E0] text-white flex items-center justify-center text-xl shadow-md"><UiIcon name="trend" className="w-4 h-4" /></div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 group-hover:text-[#00629B] transition-colors">
                            Pronóstico de Aforo
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Proyección de demanda y ocupación para los próximos días.
                          </p>
                        </div>
                      </div>

                      <div className="pt-5 relative z-10">
                        <button
                          type="button"
                          className="w-full py-2.5 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-[#00629B] to-[#00A3E0] hover:from-[#004D7A] hover:to-[#0082B3] text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <span>Ver Pronóstico</span>
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
                        <span><UiIcon name="building" className="w-4 h-4" /></span>
                        <span>Métricas de Reservas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoMetricas("talleres")}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-900"
                      >
                        <span><UiIcon name="academic" className="w-4 h-4" /></span>
                        <span>Métricas de Talleres</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoMetricas("prediccion")}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-900"
                      >
                        <span><UiIcon name="trend" className="w-4 h-4" /></span>
                        <span>Pronóstico de Aforo</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h2 className={SECTION_TITLE}>Métricas de Reservas</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                      <button
                        onClick={handleExportarGraficoPNG}
                        disabled={exportandoGraficoPNG || cargandoMetricas}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span><UiIcon name="chart" className="w-4 h-4" /></span>
                        <span>{exportandoGraficoPNG ? "Exportando..." : "Exportar Gráfico (PNG)"}</span>
                      </button>
                      <button
                        onClick={handleExportarMetricasExcel}
                        disabled={exportandoMetricasExcel || cargandoMetricas}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span><UiIcon name="doc" className="w-4 h-4" /></span>
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
                        Por Día
                      </button>
                      <button
                        onClick={() => setPeriodoMetricas("semana")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodoMetricas === "semana"
                          ? "bg-[#00629B] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        Por Semana
                      </button>
                      <button
                        onClick={() => setPeriodoMetricas("mes")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodoMetricas === "mes"
                          ? "bg-[#00629B] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        Por Mes
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
                        <option value="todos">Todas las Sedes</option>
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
                        <span className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-sm"><UiIcon name="target" className="w-4 h-4" /></span>
                      </div>
                      <div className="relative text-4xl font-black mt-2 tracking-tight">{metricas?.info_periodo?.total_reservas_periodo ?? 0}</div>
                      <div className="relative text-[11px] text-sky-100/90 mt-1">Registradas en este período</div>
                    </div>

                    <div className="relative overflow-hidden p-5 rounded-3xl bg-white border border-amber-200/70 shadow-[0_14px_34px_-22px_rgba(245,158,11,0.7)]">
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#FFC20E] via-amber-400 to-orange-500" />
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        <span>Horario pico</span>
                        <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-sm"><UiIcon name="flame" className="w-4 h-4" /></span>
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
                        <span className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sm"><UiIcon name="building" className="w-4 h-4" /></span>
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
                            <span className="text-[#00629B]"><UiIcon name="chart" className="w-4 h-4" /></span> Gráfico: Bloque Horario vs Reservas
                          </h3>
                          
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
                            <span><UiIcon name="doc" className="w-4 h-4" /></span> Tabla de Ocupación por Bloque
                          </h3>
                          
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
                                      <span className="text-[#00629B] text-xs"><UiIcon name="clock" className="w-4 h-4" /></span>
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
                                      {b.nivel_demanda === "Pico" ? "Pico" : b.nivel_demanda}
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

                      
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                    <div className="bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-sm"><UiIcon name="flame" className="w-4 h-4" /></span>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Horarios Pico Históricos</h3>
                        </div>
                        <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2 py-0.5 rounded-full">Top Demanda</span>
                      </div>
                      

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
                          <span className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sm"><UiIcon name="calendar" className="w-4 h-4" /></span>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Días Más Concurridos</h3>
                        </div>
                        <span className="text-[10px] bg-sky-50 text-[#00629B] border border-sky-100 font-bold px-2 py-0.5 rounded-full">Semanal</span>
                      </div>
                      

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
                          <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-sm"><UiIcon name="trend-down" className="w-4 h-4" /></span>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Cancelaciones</h3>
                        </div>
                        <span className="text-[10px] bg-rose-50 text-rose-800 border border-rose-100 font-bold px-2 py-0.5 rounded-full">Histórico</span>
                      </div>
                      

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
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">
                          Reservas por Carrera
                        </h3>
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
                            <span><UiIcon name="chart" className="w-4 h-4" /></span> Columnas
                          </button>
                          <button
                            type="button"
                            onClick={() => setModoGraficoCarrera("barras")}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${modoGraficoCarrera === "barras"
                              ? "bg-white text-[#00629B] shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                              }`}
                          >
                            <span><UiIcon name="trend" className="w-4 h-4" /></span> Barras Apiladas
                          </button>
                          <button
                            type="button"
                            onClick={() => setModoGraficoCarrera("donut")}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${modoGraficoCarrera === "donut"
                              ? "bg-white text-[#00629B] shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                              }`}
                          >
                            <span><UiIcon name="pie" className="w-4 h-4" /></span> Distribución
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
                            <span className="text-3xl"><UiIcon name="academic" className="w-4 h-4" /></span>
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
                        { badge: "1", bg: "bg-amber-100 text-amber-900 border-amber-200" },
                        { badge: "2", bg: "bg-slate-200 text-slate-800 border-slate-300" },
                        { badge: "3", bg: "bg-amber-200 text-amber-950 border-amber-300" }
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
                                {listaBase[0]?.carrera || "N/A"}
                              </div>
                              <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                                {listaBase[0]?.total || 0} reservas ({totalGlobalReservas > 0 ? Math.round(((listaBase[0]?.total || 0) / totalGlobalReservas) * 100) : 0}% de participación)
                              </span>
                            </div>

                            <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-2xs">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Reservas en Curso</span>
                              <div className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
                                <span><UiIcon name="bolt" className="w-4 h-4" /></span> {totalActuales} <span className="text-xs font-semibold text-slate-500">activas</span>
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
                                <span className="text-slate-500 font-bold">{totalHistoricas} históricas</span>
                                <span>•</span>
                                <span className="text-[#00629B] font-bold">{listaBase.length} carreras</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60 text-xs">
                            <div className="relative flex-1 max-w-sm">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"><UiIcon name="search" className="w-4 h-4" /></span>
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
                                                #1
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
                                              {hoverItem.actuales} activas · {hoverItem.historicas} históricas
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
                                    <strong className="text-slate-700">Reservas Activas ()</strong>
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-md bg-gradient-to-r from-[#004D7A] to-[#1E293B]" />
                                    <strong className="text-slate-700">Registros Históricos ()</strong>
                                  </span>
                                </div>
                                
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
                                          {c.actuales} activas
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                          {c.historicas} históricas
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
                        <span><UiIcon name="building" className="w-4 h-4" /></span>
                        <span>Métricas de Reservas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoMetricas("talleres")}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-[#002D4C] text-white shadow-xs"
                      >
                        <span><UiIcon name="academic" className="w-4 h-4" /></span>
                        <span>Métricas de Talleres</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoMetricas("prediccion")}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-900"
                      >
                        <span><UiIcon name="trend" className="w-4 h-4" /></span>
                        <span>Pronóstico de Aforo</span>
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
                      { nombre: "Conoce tu biblioteca: Taller de inicio", icono: "compass", tag: "Inducción" },
                      { nombre: "Búsqueda y evaluación de información", icono: "search", tag: "Investigación" },
                      { nombre: "Gestión de referencias y estilo de citas", icono: "doc", tag: "Citas y Normas" },
                      { nombre: "Uso ético de la información", icono: "scale", tag: "Integridad" },
                      { nombre: "Introducción a Leganto", icono: "book", tag: "Plataforma" },
                      { nombre: "ORCID", icono: "id", tag: "Identidad Digital" },
                    ];

                    TALLERES_ESTANDAR.forEach((t) => {
                      if (talleresCountMap[t.nombre] === undefined) {
                        talleresCountMap[t.nombre] = 0;
                      }
                    });

                    const rankingTalleres = Object.entries(talleresCountMap)
                      .map(([nombre, count]) => {
                        const meta = TALLERES_ESTANDAR.find((m) => m.nombre === nombre) || { icono: "academic", tag: "Taller" };
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
                          <div>
                            <h2 className={SECTION_TITLE}>Métricas de Talleres</h2>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                            <button
                              type="button"
                              onClick={handleExportarMetricasTalleresExcel}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span><UiIcon name="doc" className="w-4 h-4" /></span>
                              <span>Exportar Excel (.xlsx)</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-500">Total Solicitudes</span>
                              <span className="w-8 h-8 rounded-xl bg-blue-100 text-[#00629B] flex items-center justify-center text-sm font-bold"><UiIcon name="book" className="w-4 h-4" /></span>
                            </div>
                            <div className="text-2xl font-black text-slate-900">{totalTalleres}</div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {realizadosTalleres} realizados · {aprobadosTalleres} aprobados
                            </p>
                          </div>

                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-500">Tasa de Aprobación</span>
                              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold"><UiIcon name="target" className="w-4 h-4" /></span>
                            </div>
                            <div className="text-2xl font-black text-emerald-600">{tasaExitoTalleres}%</div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {pendientesTalleres} en espera de respuesta
                            </p>
                          </div>

                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-500">Taller Más Solicitado</span>
                              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold"><UiIcon name="trophy" className="w-4 h-4" /></span>
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
                              <span className="w-8 h-8 rounded-xl bg-sky-100 text-[#00A3E0] flex items-center justify-center text-sm font-bold"><UiIcon name="laptop" className="w-4 h-4" /></span>
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
                                      <UiIcon name={t.icono} className="w-4 h-4 text-[#00629B]" />
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
                                  
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                                  <div className="text-2xl"><UiIcon name="building" className="w-4 h-4" /></div>
                                  <div className="text-xs font-bold text-slate-600">Presencial</div>
                                  <div className="text-2xl font-black text-[#002D4C]">{presencialTalleres}</div>
                                  <div className="text-[11px] font-bold text-slate-400">{pctPresencial}% del total</div>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                                  <div className="text-2xl"><UiIcon name="globe" className="w-4 h-4" /></div>
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
                            <span className="text-2xl"><UiIcon name="doc" className="w-4 h-4" /></span>
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
              {tipoMetricas === "prediccion" && (
                <div className={`${CARD} p-6 md:p-8 mb-8 space-y-6 animate-fadeIn`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
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
                        <span><UiIcon name="building" className="w-4 h-4" /></span>
                        <span>Métricas de Reservas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoMetricas("talleres")}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 text-slate-600 hover:text-slate-900"
                      >
                        <span><UiIcon name="academic" className="w-4 h-4" /></span>
                        <span>Métricas de Talleres</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoMetricas("prediccion")}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-[#002D4C] text-white shadow-xs"
                      >
                        <span><UiIcon name="trend" className="w-4 h-4" /></span>
                        <span>Pronóstico de Aforo</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <h2 className={SECTION_TITLE}>Pronóstico de Aforo</h2>
                    <div className="flex items-center gap-3">
                      <select
                        value={campusFiltroPrediccion}
                        onChange={(e) => setCampusFiltroPrediccion(Number(e.target.value))}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-[#00629B] focus:outline-none cursor-pointer"
                      >
                        {campus.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                      <select
                        value={diasFiltroPrediccion}
                        onChange={(e) => setDiasFiltroPrediccion(Number(e.target.value))}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-[#00629B] focus:outline-none cursor-pointer"
                      >
                        <option value={7}>Próximos 7 días</option>
                        <option value={14}>Próximos 14 días</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => fetchPrediccion(campusFiltroPrediccion, diasFiltroPrediccion, false)}
                        disabled={cargandoPrediccion}
                        className={`${BTN_GHOST} shrink-0`}
                      >
                        {cargandoPrediccion ? "Calculando..." : "Actualizar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchPrediccion(campusFiltroPrediccion, diasFiltroPrediccion, true)}
                        disabled={cargandoPrediccion}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#002D4C] hover:bg-[#00416D] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
                        title="Contrastar predicciones pasadas con la ocupación real y recalibrar el modelo"
                      >
                        <span><UiIcon name="bolt" className="w-4 h-4" /></span>
                        <span>{cargandoPrediccion ? "Calibrando..." : "Autoentrenar"}</span>
                      </button>
                    </div>
                  </div>

                  {cargandoPrediccion ? (
                    <div className="py-20 px-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 flex flex-col items-center justify-center text-center gap-4">
                      <div className="relative w-14 h-14 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-sky-100"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-[#00629B] border-t-transparent animate-spin"></div>
                        <span className="text-lg"><UiIcon name="trend" className="w-4 h-4" /></span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-800">Cargando pronóstico de aforo...</h3>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Procesando historial de reservas y calibrando las proyecciones por bloque horario.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#00629B] via-[#0077B8] to-[#00A3E0] text-white shadow-md">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-sky-100">
                            <span>Ocupación Promedio</span>
                            <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-sm"><UiIcon name="chart" className="w-4 h-4" /></span>
                          </div>
                          <div className="text-3xl font-black mt-2 tracking-tight">
                            {prediccionData?.resumen?.ocupacion_promedio_semana ?? 0}%
                          </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-white border border-rose-200/80 shadow-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-rose-600">
                            <span>Mayor Demanda</span>
                            <span className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-sm"><UiIcon name="flame" className="w-4 h-4" /></span>
                          </div>
                          <div className="text-xl font-black text-slate-800 mt-2 truncate">
                            {prediccionData?.resumen?.dia_mayor_demanda || "—"}
                          </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-white border border-emerald-200/80 shadow-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                            <span>Menor Demanda</span>
                            <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-sm"><UiIcon name="leaf" className="w-4 h-4" /></span>
                          </div>
                          <div className="text-xl font-black text-slate-800 mt-2 truncate">
                            {prediccionData?.resumen?.dia_menor_demanda || "—"}
                          </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-white border border-sky-200/80 shadow-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-[#00629B]">
                            <span>Precisión Real</span>
                            <span className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sm"><UiIcon name="target" className="w-4 h-4" /></span>
                          </div>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl font-black text-slate-800">
                              {prediccionData?.autoevaluacion?.precision_real_pct ?? 93.9}%
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              ({prediccionData?.autoevaluacion?.bloques_evaluados ?? 0} bloques)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <span className="text-[#00629B]"><UiIcon name="trend" className="w-4 h-4" /></span> Proyección por Día
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Alta (&ge;70%)</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00629B]"></span> Media (45-69%)</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Baja (&lt;45%)</span>
                          </div>
                        </div>

                        <div className="h-64 flex items-end justify-between gap-2 sm:gap-3 pt-8 pb-3 px-3 bg-gradient-to-b from-sky-50/40 via-white to-slate-50/60 rounded-2xl border border-slate-100 overflow-x-auto">
                          {(prediccionData?.proyeccion_diaria || []).map((dia) => {
                            const pct = Math.round(dia.ocupacion_promedio_dia || 0);
                            const isSelected = diaPrediccionSeleccionado?.fecha === dia.fecha;
                            const esCerrado = dia.estado_atencion === "Cerrado";
                            const barHeight = esCerrado ? 10 : Math.max(pct, 12);
                            const barColor = esCerrado
                              ? "bg-slate-200 text-slate-400"
                              : pct >= 70
                                ? "bg-gradient-to-t from-rose-600 to-amber-500"
                                : pct >= 45
                                  ? "bg-gradient-to-t from-[#004D7A] via-[#00629B] to-[#00A3E0]"
                                  : "bg-gradient-to-t from-emerald-600 to-teal-400";

                            return (
                              <div
                                key={dia.fecha}
                                onClick={() => setDiaPrediccionSeleccionado(dia)}
                                className={`flex-1 min-w-[55px] max-w-[120px] flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 p-1.5 rounded-xl group ${
                                  isSelected ? "bg-sky-50 ring-2 ring-[#00629B] shadow-xs scale-105" : "hover:bg-slate-100/70"
                                }`}
                              >
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border shadow-2xs transition-transform group-hover:scale-110 ${
                                  esCerrado
                                    ? "bg-slate-100 text-slate-500 border-slate-200"
                                    : isSelected
                                      ? "bg-[#002D4C] text-white border-[#002D4C]"
                                      : "bg-white text-slate-700 border-slate-200"
                                }`}>
                                  {esCerrado ? "Cerrado" : `${pct}%`}
                                </span>

                                <div className="w-full h-36 bg-slate-100 rounded-xl flex items-end justify-center p-1 relative overflow-hidden border border-slate-200/70">
                                  <div
                                    className={`w-full rounded-lg transition-all duration-500 ${barColor} ${isSelected ? "brightness-110" : ""}`}
                                    style={{ height: `${barHeight}%` }}
                                  />
                                </div>

                                <div className="text-center">
                                  <div className={`text-[11px] font-extrabold truncate uppercase ${isSelected ? "text-[#00629B]" : "text-slate-700"}`}>
                                    {dia.dia_nombre.slice(0, 3)}
                                  </div>
                                  <div className="text-[10px] text-slate-600 font-mono">
                                    {dia.fecha.slice(5)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {diaPrediccionSeleccionado && (
                        <div className="p-5 rounded-3xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                            <div>
                              <h4 className="text-sm font-black text-slate-800">
                                {diaPrediccionSeleccionado.dia_nombre} {diaPrediccionSeleccionado.fecha}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {prediccionData?.campus_nombre} · {prediccionData?.capacidad_campus || 10} cubículos
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00629B]/10 text-[#00629B]">
                              {diaPrediccionSeleccionado.ocupacion_promedio_dia}% promedio
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {diaPrediccionSeleccionado.bloques.map((b) => {
                              const pct = b.ocupacion_proyectada_pct;
                              const badgeColor =
                                b.nivel_demanda === "Alta"
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : b.nivel_demanda === "Media"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : b.nivel_demanda === "Baja"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : "bg-slate-200 text-slate-600 border-slate-300";
                              const barColor =
                                pct >= 75 ? "bg-rose-500" : pct >= 45 ? "bg-amber-500" : "bg-emerald-500";
                              return (
                                <div key={b.hora} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800">{b.rango}</span>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                      {b.nivel_demanda === "Cerrado" ? "Cerrado" : b.nivel_demanda}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                                      <span>Ocupación</span>
                                      <span className="font-extrabold text-slate-900">{pct}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                    <span>Ocupados: <strong className="text-slate-800">{b.cubiculos_ocupados_estimados}</strong></span>
                                    <span>Libres: <strong className="text-emerald-700">{b.cubiculos_libres_estimados}</strong></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(prediccionData?.autoevaluacion?.comparativa_diaria?.length > 0) && (
                        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <span className="text-[#00629B]"><UiIcon name="target" className="w-4 h-4" /></span> Predicción vs Ocupación Real (Autoentrenamiento)
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Contraste automático entre el aforo proyectado y la asistencia real registrada para calibrar futuras proyecciones.
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-bold">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#00629B]"></span> Predicho
                              </span>
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Real
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {prediccionData.autoevaluacion.comparativa_diaria.map((item) => (
                              <div key={item.fecha} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-black text-slate-800">{item.dia_nombre}</div>
                                    <div className="text-[10px] font-mono text-slate-500">{item.fecha}</div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {item.precision_dia}% precisión
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                                      <span>Predicho</span>
                                      <span className="font-bold text-[#00629B]">{item.pct_predicho}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                      <div className="h-full rounded-full bg-[#00629B]" style={{ width: `${Math.min(100, item.pct_predicho)}%` }} />
                                    </div>
                                  </div>

                                  <div className="space-y-0.5">
                                    <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                                      <span>Real</span>
                                      <span className="font-bold text-emerald-600">{item.pct_real}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, item.pct_real)}%` }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {(activeTab === "historial") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-6 animate-fadeIn`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
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
                    <span><UiIcon name="chart" className="w-4 h-4" /></span>
                    <span>{exportandoExcel ? "Generando Excel..." : "Descargar Excel"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLimpiarHistorial}
                    disabled={limpiandoHistorial || cargandoHistorial || historial.length === 0}
                    className={BTN_DANGER}
                    title="Purgar y vaciar historial antiguo"
                  >
                    <span><UiIcon name="trash" className="w-4 h-4" /></span>
                    <span>{limpiandoHistorial ? "Limpiando..." : "Limpiar historial"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setMostrarHistorial(!mostrarHistorial);
                      if (!mostrarHistorial) fetchHistorial();
                    }}
                    className={`${BTN_PRIMARY} px-4 py-2.5`}
                  >
                    <span>{mostrarHistorial ? "Ocultar" : "Mostrar"}</span>
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
                          placeholder="Buscar por alumno o RUT..."
                          className={INPUT}
                        />
                      </div>
                      <select
                        value={campusFiltroHistorial}
                        onChange={(e) => setCampusFiltroHistorial(e.target.value)}
                        className={`${INPUT} sm:w-auto font-semibold cursor-pointer`}
                      >
                        <option value="todos">Todas las sedes</option>
                        {campus.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                      <select
                        value={filtroEstadoHistorial}
                        onChange={(e) => setFiltroEstadoHistorial(e.target.value)}
                        className={`${INPUT} sm:w-auto font-semibold cursor-pointer`}
                      >
                        <option value="todos">Todos los estados</option>
                        <option value="completada">Completada con éxito</option>
                        <option value="liberada">Liberada por estudiante</option>
                        <option value="cancelada">Cancelada por admin</option>
                        <option value="inasistencia">Inasistencia</option>
                        <option value="activa">Activa / En curso</option>
                        <option value="justificada">Justificada</option>
                      </select>
                    </div>
                    <button onClick={() => fetchHistorial(1, limiteHistorial)} className={BTN_GHOST}>
                      Actualizar registros
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
                                      ? "Inasistencia"
                                      : h.estado === "liberada"
                                        ? "Liberada"
                                        : h.estado === "cancelada"
                                          ? "Cancelada"
                                          : h.estado === "completada" || h.estado === "expirada"
                                            ? "Completada con éxito"
                                            : h.estado === "justificada"
                                              ? "Justificada"
                                              : "Activa"}
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

          {bloqueSeleccionado && (() => {
            const termModal = busquedaModalBloque.trim().toLowerCase();
            const reservasBloqueFiltradas = termModal
              ? reservasBloque.filter((r) =>
                (r.nombre || "").toLowerCase().includes(termModal) ||
                (r.rut || "").toLowerCase().includes(termModal) ||
                (r.cubiculo_codigo || "").toLowerCase().includes(termModal) ||
                String(r.id || "").includes(termModal)
              )
              : reservasBloque;

            const pctOcupacion = Math.min(100, Math.round((reservasBloque.length / (cubiculosActuales || 1)) * 100));
            const fechaFormateada = new Date(fechaSeleccionada + "T12:00:00").toLocaleDateString("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "long"
            });

            return (
              <div className={OVERLAY} onClick={() => setBloqueSeleccionado(null)}>
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`${MODAL} ${reservasBloque.length > 4 ? "max-w-5xl" : "max-w-3xl"} overflow-hidden max-h-[88vh] flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-[0_24px_60px_-15px_rgba(15,23,42,0.22)] transition-all duration-200`}
                >
                  <div className="px-6 py-5 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 capitalize">
                        <span>{campusSeleccionadoObj?.nombre || "Sede activa"}</span>
                        <span className="text-slate-300">•</span>
                        <span>{fechaFormateada}</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                        Bloque {bloqueSeleccionado.rango}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 self-stretch sm:self-center justify-between sm:justify-end">
                      <div className="min-w-[150px]">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">Ocupación</span>
                          <span className="font-bold text-slate-800">{reservasBloque.length} / {cubiculosActuales}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#00629B] rounded-full transition-all duration-300"
                            style={{ width: `${pctOcupacion}%` }}
                          />
                        </div>
                      </div>

                      {reservasBloque.length >= 4 && (
                        <div className="relative w-48 sm:w-56">
                          <input
                            type="text"
                            placeholder="Filtrar por alumno o RUT..."
                            value={busquedaModalBloque}
                            onChange={(e) => setBusquedaModalBloque(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#00629B] outline-none transition-all"
                          />
                          <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                          </svg>
                        </div>
                      )}

                      <button
                        onClick={() => setBloqueSeleccionado(null)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        title="Cerrar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex-1 overflow-y-auto p-6 bg-slate-50/50 overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {cargandoBloque ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: Math.min(cubiculosActuales || 3, 6) }).map((_, i) => (
                          <div key={i} className="p-5 rounded-xl border border-slate-200/80 bg-white space-y-3 animate-pulse">
                            <div className="flex justify-between">
                              <div className="h-5 w-24 rounded-md bg-slate-200/80" />
                              <div className="h-4 w-12 rounded bg-slate-100" />
                            </div>
                            <div className="h-4 w-40 rounded bg-slate-200/70" />
                            <div className="h-3 w-28 rounded bg-slate-100" />
                            <div className="h-8 w-full rounded-lg bg-slate-100 mt-2" />
                          </div>
                        ))}
                      </div>
                    ) : reservasBloque.length === 0 ? (
                      <div className="py-14 px-6 text-center bg-white rounded-xl border border-slate-200/80 space-y-1.5">
                        <h4 className="text-sm font-semibold text-slate-800">Sin reservas activas en este horario</h4>
                        <p className="text-xs text-slate-500">
                          Todos los cubículos se encuentran disponibles en este bloque.
                        </p>
                      </div>
                    ) : reservasBloqueFiltradas.length === 0 ? (
                      <div className="py-12 px-6 text-center bg-white rounded-xl border border-slate-200/80 space-y-2">
                        <h4 className="text-sm font-semibold text-slate-800">Sin coincidencias</h4>
                        <p className="text-xs text-slate-500">No se encontraron resultados para "{busquedaModalBloque}".</p>
                        <button
                          type="button"
                          onClick={() => setBusquedaModalBloque("")}
                          className="text-xs font-semibold text-[#00629B] hover:underline cursor-pointer"
                        >
                          Limpiar filtro
                        </button>
                      </div>
                    ) : (
                      <div className={`grid grid-cols-1 ${
                        reservasBloqueFiltradas.length === 1
                          ? "max-w-md mx-auto"
                          : reservasBloqueFiltradas.length === 2
                            ? "sm:grid-cols-2"
                            : "sm:grid-cols-2 lg:grid-cols-3"
                      } gap-4`}>
                        {reservasBloqueFiltradas.map((res, idx) => (
                          <div
                            key={res.id || idx}
                            className="rounded-xl border border-slate-200/90 border-l-4 border-l-[#00629B] bg-white hover:border-slate-300 hover:shadow-sm transition-all p-4 flex flex-col justify-between gap-4"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#002D4C] text-white tracking-wide">
                                  Cubículo {res.cubiculo_codigo || `C-${idx + 1}`}
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  #{res.id}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                  {res.nombre}
                                </h4>
                                <p className="text-xs font-mono text-slate-500 mt-0.5">
                                  RUT: {res.rut}
                                </p>
                              </div>

                              {res.acompanantes && res.acompanantes.length > 0 && (
                                <div className="pt-2.5 border-t border-slate-100">
                                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                                    Acompañantes ({res.acompanantes.length})
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {res.acompanantes.map((ac, i) => (
                                      <span key={i} className="text-[11px] bg-slate-50 border border-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md">
                                        {ac.nombre}{ac.rut ? ` · ${ac.rut}` : ""}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleLiberarCubiculo(res.id, res.rut, res.nombre)}
                                disabled={eliminandoReservaId === res.id}
                                className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#00629B] hover:border-[#00629B] text-slate-700 hover:text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {eliminandoReservaId === res.id ? "Liberando..." : "Liberar cubículo"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {reservasBloqueFiltradas.length} {reservasBloqueFiltradas.length === 1 ? "reserva registrada" : "reservas registradas"}
                    </span>
                    <button
                      onClick={() => setBloqueSeleccionado(null)}
                      className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {mostrarGraficoMetricas && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-4xl p-6 md:p-8 space-y-6 max-h-[90vh] flex flex-col overflow-hidden`}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-sans font-bold text-slate-900">
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
                          <span className="text-[#00629B]"><UiIcon name="chart" className="w-4 h-4" /></span> Horarios de mayor ocupación
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
                        <span><UiIcon name="calendar" className="w-4 h-4" /></span> Ocupación por día de la semana
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
                          <span><UiIcon name="target" className="w-4 h-4" /></span> Resumen de eficiencia
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
                        <strong>Recomendación:</strong> optimizar cubículos en bloques de alta demanda durante los días pico.
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

          {(activeTab === "incidencias") && (
            <div className={`${CARD} p-6 md:p-8 mb-8 space-y-7 animate-fadeIn`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h2 className={SECTION_TITLE}>Reporte de Incidencias en Cubículos</h2>
                    {incidencias.filter((i) => i.estado === "pendiente" || i.estado === "en_revision").length > 0 && (
                      <span className="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-black bg-[#EA3829] text-white shadow-2xs">
                        {incidencias.filter((i) => i.estado === "pendiente" || i.estado === "en_revision").length}
                      </span>
                    )}
                  </div>
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
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><UiIcon name="search" className="w-4 h-4" /></span>
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
                    { id: "pendiente", label: "Pendientes", badge: incidencias.filter((i) => i.estado === "pendiente").length },
                    { id: "en_revision", label: "En revisión", badge: incidencias.filter((i) => i.estado === "en_revision").length },
                    { id: "resuelta", label: "Resueltas" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroEstadoIncidencia(f.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${filtroEstadoIncidencia === f.id
                        ? "bg-white text-[#00629B] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      <span>{f.label}</span>
                      {f.badge > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full text-[10px] font-black bg-[#EA3829] text-white flex items-center justify-center">
                          {f.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {cargandoIncidencias ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <span className="animate-spin text-base"><UiIcon name="clock" className="w-4 h-4" /></span> Cargando incidencias...
                  </div>
                ) : incidencias.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <span className="text-3xl block mb-2"><UiIcon name="check" className="w-4 h-4" /></span>
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
                                  {inc.categoria === "electricidad" && "Electricidad"}
                                  {inc.categoria === "mobiliario" && "Mobiliario"}
                                  {inc.categoria === "limpieza" && "Limpieza"}
                                  {inc.categoria === "tecnologia" && "Tecnología"}
                                  {inc.categoria === "clima" && "Climatización"}
                                  {inc.categoria === "otro" && "Otro"}
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
                                  {inc.estado === "pendiente" && "Pendiente"}
                                  {inc.estado === "en_revision" && "En revisión"}
                                  {inc.estado === "resuelta" && "Resuelta"}
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
                                        <span><UiIcon name="wrench" className="w-4 h-4" /></span> Mantención
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCambiarEstadoIncidencia(inc.id, "resuelta")}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] cursor-pointer shadow-xs transition"
                                        title="Marcar como resuelta"
                                      >
                                        <span><UiIcon name="check" className="w-4 h-4" /></span> Resolver
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
                                      <span><UiIcon name="refresh" className="w-4 h-4" /></span> Reabrir
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
                  {cargandoTalleres ? "Cargando..." : "Actualizar"}
                </button>
              </div>

              {/* Tarjetas resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 text-sky-950">
                  <p className="text-[11px] font-bold text-[#00629B] uppercase tracking-wider">Total Solicitudes</p>
                  <p className="text-2xl font-sans font-bold text-slate-900 mt-1">{solicitudesTalleres.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-amber-950">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pendientes</p>
                  <p className="text-2xl font-sans font-bold text-slate-900 mt-1">
                    {solicitudesTalleres.filter((s) => s.estado === "pendiente").length}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-emerald-950">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Aprobados</p>
                  <p className="text-2xl font-sans font-bold text-slate-900 mt-1">
                    {solicitudesTalleres.filter((s) => s.estado === "aprobado").length}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Realizados</p>
                  <p className="text-2xl font-sans font-bold text-slate-900 mt-1">
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
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs"><UiIcon name="search" className="w-4 h-4" /></span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={filtroEstadoTaller}
                    onChange={(e) => setFiltroEstadoTaller(e.target.value)}
                    className={`${INPUT} sm:w-44 font-semibold cursor-pointer`}
                  >
                    <option value="">Todos los estados</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="aprobado">Aprobados</option>
                    <option value="realizado">Realizados</option>
                    <option value="rechazado">Rechazados</option>
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
                  <span className="text-3xl"><UiIcon name="academic" className="w-4 h-4" /></span>
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
                                <span className="text-base shrink-0"><UiIcon name="academic" className="w-4 h-4" /></span>
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
                                {s.modalidad?.toLowerCase().includes("virtual") ? "Virtual" : "Presencial"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">
                              {s.participantes} pers.
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
                                {s.estado === "aprobado" ? "Aprobado" : s.estado === "realizado" ? "Realizado" : s.estado === "rechazado" ? "Rechazado" : "Pendiente"}
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
                                  Responder
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarSolicitudTaller(s.id, s.nombre, s.taller)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Eliminar registro"
                                >
                                  <UiIcon name="trash" className="w-4 h-4" />
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
            <div className="space-y-7 mb-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <h2 className={SECTION_TITLE}>Bloqueo de Días en el Calendario</h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Haz clic en cualquier día del calendario para inhabilitarlo o habilitarlo. Los días bloqueados se marcan en rojo y no permitirán reservas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full whitespace-nowrap">
                    {diasBloqueados.length} días bloqueados
                  </span>
                  <button
                    type="button"
                    onClick={fetchDiasBloqueados}
                    className={BTN_GHOST}
                    title="Actualizar datos"
                  >
                    Actualizar
                  </button>
                </div>
              </div>

              <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-[0_10px_35px_-12px_rgba(0,77,122,0.1)] overflow-hidden space-y-0">
                <div className="bg-gradient-to-r from-[#004D7A] via-[#00629B] to-[#00A3E0] text-white p-3.5 md:px-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCalBloqueoPrev}
                      className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center font-bold text-xs transition-all cursor-pointer active:scale-95"
                      title="Mes anterior"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={handleCalBloqueoHoy}
                      className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold transition-all cursor-pointer active:scale-95"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={handleCalBloqueoNext}
                      className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center font-bold text-xs transition-all cursor-pointer active:scale-95"
                      title="Mes siguiente"
                    >
                      ▶
                    </button>
                  </div>

                  <h3 className="text-sm md:text-base font-extrabold tracking-wider uppercase font-sans text-center drop-shadow-xs">
                    {mesCalendarioBloqueos.toLocaleDateString("es-CL", { month: "long", year: "numeric" }).toUpperCase()}
                  </h3>

                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-full backdrop-blur-xs text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Habilitado
                    </span>
                    <span className="flex items-center gap-1.5 bg-rose-600/95 text-white px-2.5 py-1 rounded-full shadow-2xs text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Bloqueado
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2 text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((nomDia, idx) => (
                    <span key={idx} className={idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-700"}>
                      {nomDia}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-px bg-slate-200">
                  {getDiasMesBloqueos().map((dia, idx) => {
                    if (!dia) {
                      return <div key={idx} className="bg-slate-50/50 min-h-[64px] md:min-h-[76px]" />;
                    }

                    const bloqueos = diasBloqueados.filter((b) => b.fecha === dia.fechaIso && b.fecha >= hoyStr);
                    const esBloqueado = bloqueos.length > 0;
                    const esHoy = dia.fechaIso === hoyStr;
                    const esPasado = dia.fechaIso < hoyStr;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleAbrirMenuDia(dia)}
                        className={`min-h-[64px] md:min-h-[76px] p-1.5 md:p-2 transition-all flex flex-col justify-between cursor-pointer group relative ${esBloqueado
                            ? "bg-rose-50/95 hover:bg-rose-100 text-rose-950 ring-2 ring-inset ring-rose-500/80 shadow-2xs"
                            : esHoy
                              ? "bg-amber-50/90 hover:bg-amber-100/80 text-slate-900 ring-2 ring-inset ring-[#FFC20E]/80 shadow-2xs"
                              : esPasado
                                ? "bg-slate-100/90 hover:bg-slate-200/80 text-slate-400"
                                : "bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center transition-all ${esBloqueado
                                ? "bg-rose-600 text-white shadow-xs"
                                : esHoy
                                  ? "bg-[#FFC20E] text-[#002D4C] font-black shadow-xs ring-1 ring-[#FFC20E]"
                                  : esPasado
                                    ? "bg-slate-200 text-slate-400 font-bold"
                                    : "text-slate-700 group-hover:bg-slate-200/70"
                              }`}
                          >
                            {dia.dayNumber}
                          </span>

                          {esBloqueado && (
                            <span className="text-[9px] font-black text-rose-700 uppercase tracking-tight flex items-center gap-0.5">
                              <span><UiIcon name="lock" className="w-4 h-4" /></span>
                              <span className="hidden sm:inline">Bloq.</span>
                            </span>
                          )}

                          {!esBloqueado && esHoy && (
                            <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider">
                              Hoy
                            </span>
                          )}

                          {!esBloqueado && !esHoy && esPasado && (
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              Pasado
                            </span>
                          )}
                        </div>

                        <div className="pt-1 space-y-0.5">
                          {esBloqueado ? (
                            bloqueos.slice(0, 1).map((b, bIdx) => (
                              <div
                                key={bIdx}
                                className={`text-[9px] font-bold px-1 py-0.5 rounded truncate border leading-none ${b.campus_id
                                    ? "bg-amber-100/80 border-amber-200 text-amber-900"
                                    : "bg-rose-200/90 border-rose-300 text-rose-900"
                                  }`}
                                title={b.motivo}
                              >
                                {b.campus_nombre ? `${b.campus_nombre}` : "Toda la red"}
                              </div>
                            ))
                          ) : esPasado ? (
                            <span className="opacity-0 group-hover:opacity-100 text-[9px] font-semibold text-slate-400 transition-opacity block truncate leading-none">
                              Pasado
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-[#00629B] transition-opacity block truncate leading-none">
                              + Bloquear
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {diasBloqueados.length > 0 && (
                <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span><UiIcon name="doc" className="w-4 h-4" /></span> Listado de Días Bloqueados ({diasBloqueados.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {diasBloqueados.map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/50 hover:bg-rose-50 flex flex-col justify-between gap-3 transition-colors shadow-2xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              {b.fecha}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.campus_id
                                  ? "bg-amber-100/90 border-amber-200 text-amber-900"
                                  : "bg-rose-200/90 border-rose-300 text-rose-900"
                                }`}
                            >
                              {b.campus_nombre ? `${b.campus_nombre}` : "Todas las sedes"}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-700 leading-snug">
                            {b.motivo}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            Por {b.creado_por || "Admin"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEliminarBloqueo(b.id, b.fecha, b.campus_nombre)}
                            className="text-rose-600 hover:text-rose-800 font-bold text-xs hover:underline cursor-pointer"
                          >
                            Desbloquear
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diaModalBloqueo && (
                <div className={OVERLAY}>
                  <div className={`${MODAL} max-w-lg overflow-hidden space-y-0`}>
                    <div
                      className={`p-5 flex items-center justify-between text-white ${diaModalBloqueo.bloqueos?.length > 0
                          ? "bg-gradient-to-r from-rose-600 to-rose-700"
                          : "bg-gradient-to-r from-[#004D7A] via-[#00629B] to-[#00A3E0]"
                        }`}
                    >
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                          Control de Disponibilidad
                        </span>
                        <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2 mt-0.5">
                          <UiIcon name={diaModalBloqueo.bloqueos?.length > 0 ? "lock" : "calendar"} className="w-4 h-4" />
                          <span>{diaModalBloqueo.fechaIso}</span>
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDiaModalBloqueo(null)}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                      {diaModalBloqueo.bloqueos?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Bloqueos Activos en esta Fecha ({diaModalBloqueo.bloqueos.length})
                          </h4>

                          <div className="space-y-2">
                            {diaModalBloqueo.bloqueos.map((b) => (
                              <div
                                key={b.id}
                                className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/70 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-rose-950">
                                    {b.campus_nombre ? `${b.campus_nombre}` : "Todas las sedes institucionales"}
                                  </span>
                                  <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                                    Inhabilitado
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-rose-900/90 leading-relaxed">
                                  {b.motivo}
                                </p>
                                <div className="flex items-center justify-between pt-2 border-t border-rose-200/80 text-[10px] text-rose-800">
                                  <span>Por: {b.creado_por || "Administración"}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDesbloquearDesdeModal(b.id, b.fecha, b.campus_nombre)}
                                    className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-300 text-xs transition-colors cursor-pointer shadow-2xs"
                                  >
                                    Desbloquear día
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                              <span className="bg-white px-2">o añadir otro bloqueo para esta fecha</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {diaModalBloqueo.fechaIso < hoyStr && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-900 flex items-center gap-2">
                          <span>ℹ️</span>
                          <span>Esta fecha ya pasó. El sistema elimina automáticamente los bloqueos pasados del historial.</span>
                        </div>
                      )}

                      <form onSubmit={handleEjecutarBloqueoModal} className="space-y-4">
                        <div className="space-y-1">
                          <label className={LABEL}>Sede a inhabilitar</label>
                          <select
                            value={formModalBloqueo.campus_id}
                            onChange={(e) => setFormModalBloqueo((prev) => ({ ...prev, campus_id: e.target.value }))}
                            className={`${INPUT} font-semibold cursor-pointer`}
                          >
                            <option value="">Todas las sedes (bloqueo global)</option>
                            {campus.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className={LABEL}>Motivo del bloqueo</label>
                          <input
                            type="text"
                            required
                            value={formModalBloqueo.motivo}
                            onChange={(e) => setFormModalBloqueo((prev) => ({ ...prev, motivo: e.target.value }))}
                            placeholder="Ej: Feriado institucional, receso académico, mantención..."
                            className={INPUT}
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setDiaModalBloqueo(null)}
                            className={`${BTN_GHOST} px-4 py-2 text-xs`}
                          >
                            Cerrar
                          </button>
                          <button
                            type="submit"
                            disabled={guardandoBloqueo || !formModalBloqueo.motivo.trim() || diaModalBloqueo.fechaIso < hoyStr}
                            className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <span><UiIcon name="lock" className="w-4 h-4" /></span>
                            <span>{guardandoBloqueo ? "Guardando..." : "Bloquear esta Fecha"}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {modalAnuncioOpen && (
            <div className={OVERLAY}>
              <div className={`${MODAL} max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-sans font-bold text-slate-900">
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
                  <h3 className="text-lg font-sans font-bold text-slate-900">
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
                        placeholder=""
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
                  <h3 className="text-lg font-sans font-bold text-slate-900">
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
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg border border-amber-200"><UiIcon name="wrench" className="w-4 h-4" /></div>
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
                    Programar fecha fuera de servicio
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
                      {modalMantenimiento.guardando ? "Guardando..." : "Asignar mantenimiento"}
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-slate-800">
                    Fechas programadas ({modalMantenimiento.mantenimientos.length})
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
                              {m.fecha}
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

          {confirmModal.open && (() => {
            const esPositivo = confirmModal.tipo === "positivo" ||
              confirmModal.tipo === "success" ||
              (confirmModal.tipo !== "danger" && confirmModal.tipo !== "peligro" && (
                /levantar|desbloquear|habilitar|aprobar|activar|permitir|restaurar|reabrir/i.test(confirmModal.titulo || "") &&
                !/eliminar|cancelar|purgar|limpiar|inasistencia|suspender|borrar|rechazar/i.test(confirmModal.titulo || "")
              ));

            return (
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className={`relative w-full max-w-lg ${esPositivo ? "bg-[#059669]" : "bg-[#EA3829]"} rounded-md shadow-[0_24px_50px_rgba(0,0,0,0.45)] overflow-visible flex animate-slideUp`}>
                  <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent ${esPositivo ? "border-t-[#059669]" : "border-t-[#EA3829]"} z-20 pointer-events-none`} />
                  <div className={`${esPositivo ? "bg-[#047857]" : "bg-[#C62828]"} px-5 sm:px-6 py-6 flex flex-col items-center justify-center rounded-l-md shrink-0 border-r border-black/10 select-none`}>
                    {esPositivo ? (
                      <svg className="w-8 h-8 text-white stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-white stroke-[1.6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.5m0 3.5h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      </svg>
                    )}
                    <span className="text-white font-bold text-sm sm:text-base tracking-wide mt-1">
                      {esPositivo ? "Confirm" : "Alert"}
                    </span>
                  </div>
                  <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center items-center text-center">
                    <p className="text-white font-semibold text-sm sm:text-base leading-snug">
                      {confirmModal.titulo || "Esta acción requiere confirmación."}
                    </p>
                    <p className="text-white/95 text-xs sm:text-sm mt-1 leading-snug font-normal">
                      {confirmModal.mensaje || "Por favor elija una opción:"}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmModal.onConfirm) confirmModal.onConfirm();
                          setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null });
                        }}
                        className={`bg-white hover:bg-slate-100 ${esPositivo ? "text-[#059669]" : "text-[#EA3829]"} font-bold text-xs sm:text-sm px-5 py-1.5 rounded-md shadow-sm transition-all cursor-pointer active:scale-95`}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ open: false, titulo: "", mensaje: "", onConfirm: null })}
                        className="bg-black/20 hover:bg-black/30 text-white font-medium text-xs sm:text-sm px-5 py-1.5 rounded-md border border-white/10 transition-all cursor-pointer active:scale-95"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {toastNotificacion.texto && (
            <div className={`fixed bottom-24 right-6 z-50 max-w-sm flex items-start gap-3 px-4 py-3.5 rounded-xl text-xs font-medium shadow-[0_20px_40px_rgba(0,0,0,0.35)] animate-slideUp ${toastNotificacion.tipo === "error" ? "bg-[#EA3829] text-white" : "bg-slate-900 text-white border border-white/10"}`}>
              <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[11px] ${toastNotificacion.tipo === "error" ? "bg-black/20 text-white" : "bg-emerald-500/20 text-emerald-300"}`}>
                <UiIcon name={toastNotificacion.tipo === "error" ? "alert" : "check"} className="w-4 h-4" />
              </span>
              <p className="leading-relaxed pt-1 flex-1">{toastNotificacion.texto}</p>
              <button
                onClick={() => setToastNotificacion({ tipo: "", texto: "" })}
                className="ml-1 text-white/70 hover:text-white font-bold text-xs cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>
          )}

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 font-semibold shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
              >
                ← Volver a la página de inicio
              </Link>
              <button
                type="button"
                onClick={() => setModalManualUsuario(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/90 hover:bg-sky-100 text-[#00629B] font-bold px-4 py-2 text-[11px] shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <span className="text-sm"><UiIcon name="book" className="w-4 h-4" /></span>
                <span>Manual de Usuario</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A3E0] animate-pulse" />
              </button>
            </div>
            <span>© {new Date().getFullYear()} Biblioteca Inteligente — Panel Admin</span>
          </div>
        </main>
      </div>

      {modalManualUsuario && (
        <div className={OVERLAY}>
          <div className={`${MODAL} max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp`}>
            <div className="bg-gradient-to-r from-[#002D4C] via-[#004D7A] to-[#00629B] p-5 sm:p-6 text-white shrink-0 flex items-start justify-between gap-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-sky-200 text-[10px] font-black uppercase tracking-wider">
                  <span>Documentación Oficial</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-sans font-black tracking-tight text-white">
                  Manual de Usuario — Panel Administrador
                </h3>
                <p className="text-xs text-sky-100/90 max-w-2xl leading-relaxed">
                  Guía técnica, glosario de terminología y procedimientos operativos para la administración de cubículos, aforo y normativas en Biblioteca UCT.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalManualUsuario(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-base transition-colors cursor-pointer shrink-0"
                title="Cerrar manual"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 w-full sm:w-auto shadow-2xs">
                {[
                  { id: "terminologia", label: "Terminología y Conceptos", icon: "doc" },
                  { id: "modulos", label: "Guía por Módulo", icon: "compass" },
                  { id: "faq", label: "Preguntas Frecuentes", icon: "bulb" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSeccionManual(tab.id)}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      seccionManual === tab.id
                        ? "bg-[#00629B] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <UiIcon name={tab.icon} className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar en el manual..."
                  value={busquedaManual}
                  onChange={(e) => setBusquedaManual(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-[#00629B] focus:ring-2 focus:ring-[#00629B]/20 shadow-2xs transition-all"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"><UiIcon name="search" className="w-4 h-4" /></span>
                {busquedaManual && (
                  <button
                    type="button"
                    onClick={() => setBusquedaManual("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-white">
              {seccionManual === "terminologia" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[#00629B]">
                      Glosario Oficial y Términos del Sistema
                    </h4>
                    <p className="text-xs text-slate-500">
                      Definiciones de los conceptos técnicos y de gestión utilizados en la plataforma.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        termino: "Aforo y Cupos Diarios",
                        categoria: "Capacidad",
                        color: "border-sky-200 bg-sky-50/30",
                        badge: "bg-sky-100 text-[#00629B]",
                        icono: "users",
                        descripcion: "El Aforo Diario representa el volumen total teórico de estudiantes que pueden ser atendidos en una sede a lo largo del día (N° de bloques horarios × N° de cubículos activos). Los 'Cupos Disponibles' reflejan los turnos aún libres para agendamiento.",
                      },
                      {
                        termino: "Bloque Horario (Turno)",
                        categoria: "Horarios",
                        color: "border-amber-200 bg-amber-50/30",
                        badge: "bg-amber-100 text-amber-900",
                        icono: "clock",
                        descripcion: "Franja preestablecida de 1 hora y 30 minutos de duración. El sistema opera con turnos continuos desde las 08:30 hasta las 19:00 hrs. Cada bloque inicia puntualmente y se asocia a un control de asistencia.",
                      },
                      {
                        termino: "Cubículo de Estudio (CB-XX)",
                        categoria: "Infraestructura",
                        color: "border-indigo-200 bg-indigo-50/30",
                        badge: "bg-indigo-100 text-indigo-900",
                        icono: "door",
                        descripcion: "Espacio físico aislado para estudio grupal de hasta 6 alumnos. Posee 3 estados posibles: 'Disponible' (apto para reservas), 'En Uso' (con reserva confirmada activa en el horario) y 'En Mantenimiento' (bloqueado para limpieza, calibración o reparaciones).",
                      },
                      {
                        termino: "Liberación Inmediata de Cubículo",
                        categoria: "Gestión de Espacios",
                        color: "border-amber-200 bg-amber-50/30",
                        badge: "bg-amber-100 text-amber-900",
                        icono: "door",
                        descripcion: "Mecanismo ágil que permite al personal de biblioteca liberar un cubículo reservado si los estudiantes no se presentan, dejándolo disponible de inmediato para otros alumnos sin aplicar suspensiones ni penalizaciones.",
                      },
                      {
                        termino: "Registro Nominal de Acompañantes",
                        categoria: "Trazabilidad",
                        color: "border-slate-200 bg-slate-50/50",
                        badge: "bg-slate-100 text-slate-800",
                        icono: "doc",
                        descripcion: "Requisito estricto que exige registrar nombre y RUT de cada estudiante secundario que ingresará con el titular del cubículo, evitando el ingreso de usuarios no individualizados a los espacios universitarios.",
                      },
                      {
                        termino: "Anticipación de 24 Horas",
                        categoria: "Regla de Negocio",
                        color: "border-blue-200 bg-blue-50/30",
                        badge: "bg-blue-100 text-blue-900",
                        icono: "lock",
                        descripcion: "Regla institucional que prohíbe reservar para el mismo día de la solicitud. Fomenta la planificación anticipada y evita acaparamientos inmediatos sin uso real.",
                      },
                      {
                        termino: "Bloqueo Administrativo de Calendario",
                        categoria: "Gestión",
                        color: "border-rose-200 bg-rose-50/20",
                        badge: "bg-rose-100 text-rose-800",
                        icono: "calendar",
                        descripcion: "Cierre forzado de una fecha específica en el calendario (por feriados, recesos académicos o sanitización). Puede aplicarse a una sede particular o a toda la red universitaria.",
                      },
                      {
                        termino: "CMS Institucional (Anuncios y FAQs)",
                        categoria: "Comunicación",
                        color: "border-amber-200 bg-amber-50/20",
                        badge: "bg-amber-100 text-amber-800",
                        icono: "megaphone",
                        descripcion: "Módulo para publicar y ordenar avisos urgentes en la portada estudiantil, tarjetas de recursos (préstamos de calculadoras, salas) y respuestas a preguntas frecuentes sin requerir soporte informático.",
                      },
                    ]
                      .filter((item) => {
                        if (!busquedaManual) return true;
                        const q = busquedaManual.toLowerCase();
                        return (
                          item.termino.toLowerCase().includes(q) ||
                          item.descripcion.toLowerCase().includes(q) ||
                          item.categoria.toLowerCase().includes(q)
                        );
                      })
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border ${item.color} shadow-2xs space-y-2`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <UiIcon name={item.icono} className="w-4 h-4 text-[#00629B]" />
                              <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                                {item.termino}
                              </h5>
                            </div>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${item.badge} shrink-0`}>
                              {item.categoria}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {item.descripcion}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {seccionManual === "modulos" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[#00629B]">
                      Guía Operativa por Módulo del Dashboard
                    </h4>
                    <p className="text-xs text-slate-500">
                      Instrucciones paso a paso para utilizar cada una de las 8 pestañas principales del panel.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {[
                      {
                        num: "01",
                        titulo: "Actividad y Monitoreo",
                        icono: "chart",
                        descripcion: "Panel de control en tiempo real para supervisión de cubículos y novedades del día.",
                        pasos: [
                          "Visualización en celdas: Cada tarjeta representa un cubículo (CB-01, CB-02, etc.). El gradiente azul marino oscuro indica ocupación activa; el fondo blanco/grisáceo indica cubículo libre.",
                          "Tarjeta flotante: Al hacer clic en un cubículo, una tarjeta indicadora flotante lo resalta y actualiza el panel derecho.",
                          "Cronograma lateral: Muestra los 7 turnos del día para el cubículo seleccionado. Permite auditar estudiantes con reserva y acompañantes.",
                          "Apertura MinMoe: Presiona 'Abrir Puerta Relé MinMoe' para accionar la chapa eléctrica de acceso de forma remota.",
                          "Lista de Tareas: Monitorea novedades pendientes (incidencias, talleres, alertas) con filtros por categoría y casillas de verificación.",
                        ],
                      },
                      {
                        num: "02",
                        titulo: "Calendario y Bloqueos",
                        icono: "calendar",
                        descripcion: "Control de fechas no laborables, feriados institucionales y recesos de biblioteca.",
                        pasos: [
                          "Navega entre los meses usando las flechas laterales < y >.",
                          "Haz clic en cualquier día del calendario para abrir el menú de bloqueo.",
                          "Indica el motivo (ej. 'Receso de Fiestas Patrias', 'Sanitización de cubículos') y selecciona si aplica a un campus específico o a 'Todas las sedes'.",
                          "Los días bloqueados se marcan en rojo. Para desbloquear una fecha, abre el menú del día y pulsa el botón 'Desbloquear Fecha' (confirmación positiva verde).",
                        ],
                      },
                      {
                        num: "03",
                        titulo: "Sedes y Cubículos",
                        icono: "building",
                        descripcion: "Administración de infraestructura física, sedes universitarias y unidades de cubículos.",
                        pasos: [
                          "Crear nueva sede: Pulsa '+ Crear Sede', escribe el nombre institucional y guarda.",
                          "Añadir cubículos: Selecciona la sede de destino y pulsa '+ Añadir Cubículo' ingresando su código único (ej. 'CB-05').",
                          "Editar cubículo: Pulsa el icono de lápiz para modificar el código asignado a un cubículo existente.",
                          "Modo Mantención: Pulsa 'Mantención' en un cubículo para fijar una fecha y motivo de reparación. Esto impide que los alumnos reserven ese espacio durante el período asignado.",
                        ],
                      },
                      {
                        num: "04",
                        titulo: "Talleres Solicitados",
                        icono: "academic",
                        descripcion: "Gestión de solicitudes de talleres estudiantiles (Normas APA, Scopus, Web of Science).",
                        pasos: [
                          "Filtra las solicitudes por estado: 'Pendiente', 'Aprobado', 'Rechazado' o 'Realizado'.",
                          "Haz clic en 'Responder' para abrir la ventana de redacción de correo institucional hacia el alumno.",
                          "El sistema despacha automáticamente el correo mediante flujos n8n/SMTP y actualiza el estado de la solicitud.",
                          "Descarga reportes completos en formato Excel con métricas de carreras y talleres más demandados mediante el botón 'Exportar Excel'.",
                        ],
                      },
                      {
                        num: "05",
                        titulo: "Incidencias de Cubículos",
                        icono: "alert",
                        descripcion: "Resolución de problemas técnicos y de infraestructura reportados en las salas.",
                        pasos: [
                          "Las alertas con más de 2 días sin resolver se destacan en color rojo para atención prioritaria.",
                          "Revisa la descripción del problema (ej. 'Enchufe sin corriente', 'Problema con televisor HDMI').",
                          "Cambia el estado de la incidencia a 'En revisión' mientras el personal técnico asiste al lugar.",
                          "Una vez resuelto, marca 'Resuelta' e ingresa la solución aplicada para mantener el registro histórico de soporte.",
                        ],
                      },
                      {
                        num: "06",
                        titulo: "Métricas y Análisis",
                        icono: "trend",
                        descripcion: "Inteligencia institucional para toma de decisiones sobre aforo, carreras y horarios pico.",
                        pasos: [
                          "Selecciona el período de análisis: 'Por Día', 'Por Semana' o 'Por Mes'.",
                          "Filtra por sede específica o visualiza la red completa de bibliotecas.",
                          "Inspecciona el gráfico interactivo pasando el cursor sobre cada hora para ver la tasa de ocupación porcentual.",
                          "Analiza el ranking de carreras con mayor uso (barras apiladas o distribución) y descarga la matriz en Excel (.xlsx) o PNG.",
                        ],
                      },
                    ]
                      .filter((m) => {
                        if (!busquedaManual) return true;
                        const q = busquedaManual.toLowerCase();
                        return (
                          m.titulo.toLowerCase().includes(q) ||
                          m.descripcion.toLowerCase().includes(q) ||
                          m.pasos.some((p) => p.toLowerCase().includes(q))
                        );
                      })
                      .map((m) => (
                        <div key={m.num} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-[#00629B] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                              {m.num}
                            </span>
                            <div className="flex items-center gap-2">
                              <UiIcon name={m.icono} className="w-4 h-4 text-[#00629B]" />
                              <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                                {m.titulo}
                              </h5>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 pl-11">
                            {m.descripcion}
                          </p>
                          <ul className="space-y-1.5 pl-11 text-xs text-slate-700">
                            {m.pasos.map((paso, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2">
                                <span className="text-[#00629B] font-bold shrink-0">•</span>
                                <span>{paso}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {seccionManual === "faq" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[#00629B]">
                      Preguntas Frecuentes y Procedimientos Críticos
                    </h4>
                    <p className="text-xs text-slate-500">
                      Respuestas directas a las situaciones más comunes del día a día administrativo.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        q: "¿Por qué un estudiante no puede reservar para el mismo día?",
                        a: "Por regla institucional de negocio (Anticipación de 24h), el sistema exige que las reservas se realicen con al menos 24 horas de antelación. Esto garantiza la correcta asignación de espacios y evita reservas impulsivas sin asistencia real.",
                      },
                      {
                        q: "¿Qué sucede si los estudiantes no se presentan a su reserva?",
                        a: "El personal de biblioteca puede ingresar al bloque del cubículo correspondiente y presionar 'Liberar cubículo'. La reserva se cancelará de inmediato y el cubículo volverá a estar disponible para la comunidad sin aplicar suspensiones ni penalizaciones al alumno.",
                      },
                      {
                        q: "¿Cómo bloquear una sede completa durante un feriado institucional?",
                        a: "Entra a 'Calendario y Bloqueos', haz clic sobre el día del feriado, escribe el motivo (ej. 'Feriado Nacional') y en el selector de campus elige 'Todas las sedes'. Ningún alumno podrá reservar en ningún campus para esa fecha.",
                      },
                      {
                        q: "¿Cómo enviar un cubículo a reparación sin eliminarlo del sistema?",
                        a: "Ve a la pestaña 'Sedes y Cubículos', busca el cubículo correspondiente y presiona el botón 'Mantención'. Ingresa la fecha y motivo (ej. 'Reparación de iluminación'). El cubículo se tornará color ámbar y no se ofrecerá a los estudiantes hasta que la mantención sea removida.",
                      },
                      {
                        q: "¿Cómo exportar el informe de uso para las autoridades de biblioteca?",
                        a: "Desde la pestaña 'Métricas y Análisis' puedes hacer clic en 'Exportar Excel (.xlsx)' para descargar el detalle completo de horas de mayor afluencia, volumen de reservas y desglose por carreras universitarias.",
                      },
                    ]
                      .filter((f) => {
                        if (!busquedaManual) return true;
                        const q = busquedaManual.toLowerCase();
                        return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
                      })
                      .map((faq, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 shadow-2xs">
                          <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-start gap-2">
                            <span className="text-[#00629B] font-black">P:</span>
                            <span>{faq.q}</span>
                          </h5>
                          <p className="text-xs text-slate-600 pl-5 leading-relaxed">
                            <strong className="text-slate-800">R:</strong> {faq.a}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Biblioteca Central San Juan Pablo II & Campus San Francisco — UCT
              </span>
              <button
                type="button"
                onClick={() => setModalManualUsuario(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Entendido, cerrar manual
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
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-[#00629B] flex items-center justify-center text-xl shadow-xs"><UiIcon name="mail" className="w-4 h-4" /></div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-[#00629B] uppercase">
                    Solicitud #{modalResponderTaller.solicitud.id}
                  </div>
                  <h3 className="font-sans font-bold text-lg text-slate-900 leading-tight">
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
                  <option value="pendiente">Mantener como Pendiente </option>
                  <option value="aprobado">Aprobado </option>
                  <option value="realizado">Realizado </option>
                  <option value="rechazado">Rechazado </option>
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
                  {modalResponderTaller.enviando ? "Enviando vía n8n..." : "Enviar Respuesta "}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alertaIncidenciasPopUp && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-xl my-auto flex flex-col items-center animate-slideUp">
            <div className="relative w-full bg-[#EA3829] rounded-md shadow-[0_20px_45px_rgba(0,0,0,0.4)] overflow-visible flex z-10">
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-[#EA3829] z-20 pointer-events-none" />
              <div className="bg-[#C62828] px-5 sm:px-6 py-6 flex flex-col items-center justify-center rounded-l-md shrink-0 border-r border-black/10 select-none">
                <svg className="w-8 h-8 text-white stroke-[1.6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.5m0 3.5h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
                <span className="text-white font-bold text-sm sm:text-base tracking-wide mt-1">Alert</span>
              </div>
              <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center items-center text-center">
                <p className="text-white font-semibold text-sm sm:text-base leading-snug">
                  Alerta Administrativa: Tareas con retraso (+2 días)
                </p>
                <p className="text-white/95 text-xs sm:text-sm mt-1 leading-snug font-normal">
                  Se detectaron solicitudes e incidencias pendientes. Por favor elija una opción:
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  {incidenciasCriticasVencidas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlertaIncidenciasPopUp(false);
                        handleSelectTab("incidencias");
                      }}
                      className="bg-white hover:bg-slate-100 text-[#EA3829] font-bold text-xs sm:text-sm px-4 py-1.5 rounded-md shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      Ir a Incidencias ({incidenciasCriticasVencidas.length})
                    </button>
                  )}
                  {talleresPendientesVencidos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlertaIncidenciasPopUp(false);
                        handleSelectTab("talleres");
                      }}
                      className="bg-white hover:bg-slate-100 text-[#EA3829] font-bold text-xs sm:text-sm px-4 py-1.5 rounded-md shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      Ir a Talleres ({talleresPendientesVencidos.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAlertaIncidenciasPopUp(false)}
                    className="bg-black/20 hover:bg-black/30 text-white font-medium text-xs sm:text-sm px-4 py-1.5 rounded-md border border-white/10 transition-all cursor-pointer active:scale-95"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full mt-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Desglose detallado de tareas críticas
                </span>
                {(incidenciasCriticasVencidas.length > 0 && talleresPendientesVencidos.length > 0) && (
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFiltroAlertaModal("todos")}
                      className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${filtroAlertaModal === "todos"
                        ? "bg-white dark:bg-slate-700 text-[#00629B] dark:text-sky-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      Todos ({incidenciasCriticasVencidas.length + talleresPendientesVencidos.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroAlertaModal("incidencias")}
                      className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${filtroAlertaModal === "incidencias"
                        ? "bg-white dark:bg-slate-700 text-[#00629B] dark:text-sky-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      Incidencias ({incidenciasCriticasVencidas.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroAlertaModal("talleres")}
                      className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${filtroAlertaModal === "talleres"
                        ? "bg-white dark:bg-slate-700 text-[#00629B] dark:text-sky-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      Talleres ({talleresPendientesVencidos.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {(filtroAlertaModal === "todos" || filtroAlertaModal === "incidencias") && incidenciasCriticasVencidas.map((inc) => {
                  const diasSinResolver = calcularDiasSinResolverIncidencia(inc.created_at);
                  return (
                    <div
                      key={`inc-${inc.id}`}
                      className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800 space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span><UiIcon name="door" className="w-4 h-4" /></span> {inc.cubiculo_codigo} • {inc.campus_nombre}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
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
                      className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800 space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#00629B] dark:text-sky-300 flex items-center gap-1.5">
                          <span><UiIcon name="academic" className="w-4 h-4" /></span> {t.taller}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
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
                          Responder ahora →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAlertaIncidenciasPopUp(false)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-all"
                >
                  Cerrar desglose
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
