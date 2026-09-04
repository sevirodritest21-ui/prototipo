import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost, apiDelete } from "../services/api";

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

  // Fecha seleccionada YYYY-MM-DD (por defecto hoy)
  const hoyStr = new Date().toISOString().split("T")[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);

  // Cargar lista de campus
  const fetchCampus = async () => {
    try {
      const data = await apiGet("/api/campus");
      setCampus(data);
      if (data.length > 0 && (!campusSeleccionado || !data.some((c) => c.id === campusSeleccionado))) {
        setCampusSeleccionado(data[0].id);
      }
    } catch {
      setError("No se pudo cargar la lista de campus.");
    }
  };

  useEffect(() => {
    fetchCampus();
  }, []);

  // Cargar datos del resumen al cambiar campus o fecha
  useEffect(() => {
    if (!campusSeleccionado) {
      setResumen(null);
      setLoadingData(false);
      return;
    }
    const fetchResumen = async () => {
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
    fetchResumen();
  }, [campusSeleccionado, fechaSeleccionada]);

  // Handler para Añadir Nuevo Campus
  const handleCrearCampus = async (e) => {
    e.preventDefault();
    const nombreLimpio = nuevoCampusNombre.trim();
    if (!nombreLimpio) return;

    setCreandoCampus(true);
    setCampusMsg({ tipo: "", texto: "" });

    try {
      const nuevo = await apiPost("/api/campus", { nombre: nombreLimpio });
      setCampusMsg({
        tipo: "exito",
        texto: `✅ Sede '${nuevo.nombre}' creada con éxito. Tiene 10 cubículos de capacidad asignados.`,
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

      // Recargar campus
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

  // Generar lista de los próximos 7 días para accesos rápidos
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-amber-50 pt-24 pb-16 px-4 relative overflow-hidden font-sans text-slate-900">
      {/* Orbs de fondo */}
      <div className="absolute top-10 left-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

      <main className="relative z-10 mx-auto max-w-7xl w-full">
        {/* Sub-header con información del usuario */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white/70 backdrop-blur-md border border-sky-100 rounded-3xl p-6 shadow-sm">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3.5 py-1 text-xs font-semibold text-sky-700 shadow-sm">
              📊 Panel Administrativo
            </span>
            <h1 className="mt-3 text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Monitoreo de Ocupación
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Bienvenido/a, <strong className="text-slate-800">{user?.nombre}</strong> ({user?.email})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarGestionCampus((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-800 shadow-sm hover:bg-sky-100 transition-all cursor-pointer"
            >
              <span>🏛️</span> {mostrarGestionCampus ? "Ocultar Gestión de Campus" : "Añadir / Eliminar Campus"}
            </button>

            <button
              id="dashboard-logout"
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Mensaje de operaciones sobre Campus */}
        {campusMsg.texto && (
          <div
            className={`rounded-2xl p-4 text-sm mb-6 flex items-center justify-between border shadow-sm ${
              campusMsg.tipo === "exito"
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

        {/* MÓDULO DE GESTIÓN DE CAMPUS (Añadir / Eliminar Sede) */}
        {mostrarGestionCampus && (
          <div className="bg-white/90 backdrop-blur-md border border-sky-200 rounded-3xl p-6 shadow-xl shadow-sky-900/10 mb-8 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  🏛️ Gestión de Sedes y Campus Universitarios
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Añade nuevas sedes con 10 cubículos de capacidad o elimina sedes existentes.
                </p>
              </div>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Total registrado: {campus.length} campus
              </span>
            </div>

            {/* Formulario de Adición */}
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
                {creandoCampus ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>➕ Añadir Nueva Sede</>
                )}
              </button>
            </form>

            {/* Lista de Campus Registrados */}
            <div className="space-y-2">
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
                      <p className="text-[11px] text-slate-500">ID: {c.id} • 10 cubículos de capacidad</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCampusAEliminar(c)}
                      className="px-2.5 py-1.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                      title="Eliminar esta sede"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación de Eliminación */}
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
                Esta acción es irreversible y eliminará la sede junto con todas las reservas de cubículos asociadas a este campus en PostgreSQL.
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
                  {eliminandoCampus ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    "Confirmar Eliminación"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Filtros: Campus + Fecha */}
        <div className="bg-white/80 backdrop-blur-md border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-900/5 mb-8 flex flex-col gap-5">
          {/* Selector de Campus */}
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      esActivo
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

          {/* Selector de Fecha */}
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
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                        esActivo
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

        {/* Banner Informativo explicativo */}
        <div className="bg-gradient-to-r from-sky-50 to-amber-50 border border-sky-200/80 rounded-2xl p-4 mb-8 flex items-start gap-3 shadow-sm">
          <div className="text-xl flex-shrink-0">💡</div>
          <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Capacidad física de la biblioteca:</strong> Cada sede registrada cuenta con <strong>10 cubículos de estudio individuales/grupales</strong>. Como se organizan en 10 bloques horarios de 1 hora (08:00 a 18:00 hrs), se ofrecen en total <strong>100 cupos de reserva por día</strong> por campus (10 cubículos × 10 horas).
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm mb-8 shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Métricas e Indicadores */}
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
              {/* Tarjeta 1 */}
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5 hover:-translate-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cubículos Físicos</span>
                  <span className="text-2xl">🏢</span>
                </div>
                <p className="mt-3 text-4xl font-black text-slate-900">{resumen.cubiculas_fisicos}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Capacidad simultánea fija</p>
              </div>

              {/* Tarjeta 2 */}
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5 hover:-translate-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reservas Agendadas</span>
                  <span className="text-2xl">📋</span>
                </div>
                <p className="mt-3 text-4xl font-black text-sky-600">{resumen.total_reservas_dia}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Reservas registradas en la fecha</p>
              </div>

              {/* Tarjeta 3 */}
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-md shadow-sky-900/5 hover:-translate-y-1 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cupos Disponibles</span>
                  <span className="text-2xl">🟢</span>
                </div>
                <p className="mt-3 text-4xl font-black text-emerald-600">{resumen.cupos_disponibles_dia}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">De {resumen.cupos_totales_diarios} cupos diarios posibles</p>
              </div>

              {/* Tarjeta 4 */}
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

            {/* Barra de Ocupación Global */}
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
                      Estado por Bloque Horario (10 Cubículos Físicos)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Consulta la disponibilidad específica para cada rango de 1 hora
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                    Máximo 10 por bloque
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {resumen.bloques.map((b) => {
                    const estaLleno = b.ocupados >= 10;
                    const tieneUso = b.ocupados > 0;

                    return (
                      <div
                        key={b.hora}
                        className={`rounded-2xl p-4 border transition-all shadow-sm flex flex-col justify-between gap-3 ${
                          estaLleno
                            ? "bg-red-50/70 border-red-200"
                            : tieneUso
                            ? "bg-amber-50/70 border-amber-200"
                            : "bg-sky-50/50 border-sky-100 hover:border-sky-300"
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
                            <strong className="text-slate-900 font-bold">{b.ocupados} / 10</strong>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Libres:</span>
                            <strong className="text-emerald-700 font-bold">{b.disponibles}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer link al sitio público */}
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

