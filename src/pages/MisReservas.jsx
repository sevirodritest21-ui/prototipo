import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import { useAuth } from "../context/AuthContext";

registerLocale("es", es);

// Feriados oficiales de Chile 2026
const FERIADOS_CHILE_2026 = [
  "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01",
  "2026-05-21", "2026-06-21", "2026-06-29", "2026-07-16",
  "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12",
  "2026-10-31", "2026-11-01", "2026-12-08", "2026-12-25"
];

const obtenerSessionId = () => {
  let sId = sessionStorage.getItem("chat_session_id");
  if (!sId) {
    sId = "session_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
    sessionStorage.setItem("chat_session_id", sId);
  }
  return sId;
};

export default function MisReservas() {
  const { user } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [campusList, setCampusList] = useState([]);
  const [feriados, setFeriados] = useState(FERIADOS_CHILE_2026);

  // Estado Modal Edición
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

  // Cargar lista de campus
  useEffect(() => {
    fetch("http://localhost:8000/api/campus")
      .then((res) => res.json())
      .then((data) => setCampusList(data || []))
      .catch(console.error);
  }, []);

  // Cargar feriados
  useEffect(() => {
    const yearActual = new Date().getFullYear();
    fetch(`https://api.feriadosdev.com/api/v1/feriados/${yearActual}`)
      .then((res) => res.json())
      .then((resData) => {
        const lista = resData?.data?.feriados || resData?.feriados || resData;
        if (Array.isArray(lista) && lista.length > 0) {
          setFeriados(lista.map((f) => f.fecha));
        }
      })
      .catch(() => {});
  }, []);

  // Cargar reservas del usuario
  const cargarReservas = async () => {
    if (!user || !user.rut) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/reservas/consultar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ rut: user.rut, sessionId: obtenerSessionId() })
      });
      if (res.ok) {
        const data = await res.json();
        setReservas(data.reservas || []);
      } else {
        setReservas([]);
      }
    } catch (err) {
      console.error(err);
      setReservas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, [user?.rut]);

  const esDiaLaboral = (date) => {
    const day = date.getDay();
    const esFinDeSemana = day === 0 || day === 6;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");
    const fechaString = `${year}-${month}-${dayOfMonth}`;
    return !esFinDeSemana && !feriados.includes(fechaString);
  };

  const handleCancelarReserva = async (reservaId) => {
    if (!window.confirm(`¿Estás seguro de que deseas cancelar la reserva ID ${reservaId}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/api/reservas/${reservaId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        alert("Reserva cancelada exitosamente.");
        cargarReservas();
      } else {
        const data = await res.json();
        alert("Error al cancelar la reserva: " + (data.detail || ""));
      }
    } catch (e) {
      alert("No se pudo conectar con el servidor.");
    }
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
      alert("Por favor selecciona campus, fecha y hora.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
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
          sessionId: obtenerSessionId()
        })
      });

      if (res.ok) {
        alert("¡Reserva modificada exitosamente!");
        setModalEdicionOpen(false);
        cargarReservas();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Error al modificar la reserva");
      }
    } catch (err) {
      alert("No se pudo conectar con el servidor.");
    }
  };

  const reservasActivas = reservas.filter((r) => r.activa);
  const reservasPasadas = reservas.filter((r) => !r.activa);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-amber-50 pt-28 pb-16 px-4">
      <div className="mx-auto max-w-4xl">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3.5 py-1 text-xs font-semibold text-sky-700 shadow-sm mb-2">
              🎓 Mi Historial Estudiantil
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900">
              Mis Reservas de Cubículos
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Gestiona, edita o cancela tus reservas agendadas en la biblioteca UCT.
            </p>
          </div>
          <Link
            to="/reservar"
            className="self-start md:self-center px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5"
          >
            <span>➕</span> Nueva Reserva
          </Link>
        </div>

        {cargando ? (
          <div className="rounded-3xl border border-sky-100 bg-white p-12 text-center shadow-lg">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
            <p className="mt-4 text-xs font-semibold text-slate-500">Cargando tus reservas...</p>
          </div>
        ) : reservas.length === 0 ? (
          <div className="rounded-3xl border border-sky-100 bg-white p-12 text-center shadow-lg">
            <span className="text-5xl">📅</span>
            <h3 className="mt-4 text-lg font-bold text-slate-800">No tienes reservas registradas</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Aún no has agendado cubículos de estudio. Haz clic a continuación para seleccionar sede, fecha y hora.
            </p>
            <Link
              to="/reservar"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Agendar Cubículo Ahora →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* RESERVAS ACTIVAS */}
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
                <span>🟢</span> Reserva Activa ({reservasActivas.length})
              </h2>

              {reservasActivas.length === 0 ? (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white text-xs text-slate-500 italic">
                  No tienes reservas activas en este momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {reservasActivas.map((res) => (
                    <div
                      key={res.id}
                      className="rounded-3xl border border-sky-200 bg-white p-6 shadow-md hover:shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-base">{res.campus}</span>
                          <span className="text-xs px-2.5 py-1 rounded-lg font-mono bg-sky-100 text-sky-800 font-bold border border-sky-200">
                            Cubículo {res.cubiculo_codigo}
                          </span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Activa
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span>📅 <strong>{res.fecha}</strong></span>
                          <span>⏰ <strong>{res.hora} hrs</strong></span>
                        </div>
                        {res.acompanantes && res.acompanantes.length > 0 && (
                          <div className="text-xs text-slate-500 pt-1">
                            👥 <strong>Acompañantes:</strong> {res.acompanantes.map((a) => a.nombre).join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => abrirModalEdicion(res)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>✏️</span> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelarReserva(res.id)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>🗑️</span> Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTORIAL PASADO */}
            {reservasPasadas.length > 0 && (
              <div>
                <h2 className="text-lg font-black text-slate-700 mb-3 flex items-center gap-2">
                  <span>📜</span> Historial de Reservas Anteriores ({reservasPasadas.length})
                </h2>
                <div className="space-y-3">
                  {reservasPasadas.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-80"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">{res.campus}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-slate-200 text-slate-700 font-semibold">
                            {res.cubiculo_codigo}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-200 text-slate-600">
                            Finalizada
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          📅 {res.fecha} • ⏰ {res.hora} hrs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL EDICIÓN DE RESERVA */}
      {modalEdicionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-sky-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>✏️</span> Editar Reserva
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modifica la sede, fecha o horario de tu reserva activa.
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
              {/* Datos Titular Inmutables */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>🔒 Titular:</span>
                  <strong className="text-slate-800">{user?.nombre || "Estudiante"}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>🔒 RUT:</span>
                  <strong className="text-slate-800">{user?.rut || "N/A"}</strong>
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
                  filterDate={esDiaLaboral}
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

              {/* Botones Accion */}
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
    </div>
  );
}
