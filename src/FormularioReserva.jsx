import React, { useState, useEffect } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";

registerLocale("es", es);

// Feriados oficiales de Chile 2026 (Formato YYYY-MM-DD)
const FERIADOS_CHILE_2026 = [
  "2026-01-01", // Año Nuevo
  "2026-04-03", // Viernes Santo
  "2026-04-04", // Sábado Santo
  "2026-05-01", // Día del Trabajo
  "2026-05-21", // Día de las Glorias Navales
  "2026-06-21", // Día Nacional de los Pueblos Indígenas
  "2026-06-29", // San Pedro y San Pablo
  "2026-07-16", // Día de la Virgen del Carmen
  "2026-08-15", // Asunción de la Virgen
  "2026-09-18", // Fiestas Patrias
  "2026-09-19", // Día de las Glorias del Ejército
  "2026-10-12", // Encuentro de Dos Mundos
  "2026-10-31", // Día de las Iglesias Evangélicas
  "2026-11-01", // Día de Todos los Santos
  "2026-12-08", // Inmaculada Concepción
  "2026-12-25", // Navidad
];

const obtenerSessionId = () => {
  let sId = sessionStorage.getItem("chat_session_id");
  if (!sId) {
    sId = "session_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
    sessionStorage.setItem("chat_session_id", sId);
  }
  return sId;
};

export default function FormularioReserva() {
  const [campusList, setCampusList] = useState([]);
  const [feriados, setFeriados] = useState(FERIADOS_CHILE_2026);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);

  // Estado para los bloques de horas devueltos por el backend
  const [bloquesHorarios, setBloquesHorarios] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    fecha: "",
    hora: "",
    campus_id: "",
  });

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

  // 2. Intentar cargar feriados dinámicos de la API de Chile
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

  // Validar si un día es laboral
  const esDiaLaboral = (date) => {
    const day = date.getDay();
    const esFinDeSemana = day === 0 || day === 6;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");
    const fechaString = `${year}-${month}-${dayOfMonth}`;

    const esFeriado = feriados.includes(fechaString);

    return !esFinDeSemana && !esFeriado;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Si cambia el campus, resetea la hora elegida
      ...(name === "campus_id" ? { hora: "" } : {})
    }));
  };

  const handleFechaChange = (date) => {
    setFechaSeleccionada(date);
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      setFormData((prev) => ({
        ...prev,
        fecha: `${year}-${month}-${day}`,
        hora: "" // Resetea la hora si se cambia la fecha
      }));
    } else {
      setFormData((prev) => ({ ...prev, fecha: "", hora: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fecha) {
      alert("Por favor selecciona una fecha válida.");
      return;
    }

    if (!formData.hora) {
      alert("Por favor selecciona un bloque de horario disponible.");
      return;
    }

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
        }),
      });

      if (response.ok) {
        alert("¡Reserva creada con éxito!");
        setFechaSeleccionada(null);
        setBloquesHorarios([]);
        setFormData({
          nombre: "",
          rut: "",
          fecha: "",
          hora: "",
          campus_id: "",
        });
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Error al crear la reserva");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-amber-50 pt-28 pb-16 px-4">
      <div className="absolute top-20 left-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
            📅 Reserva tu cubículo
          </span>

          <h1 className="mt-6 text-4xl md:text-5xl font-black text-slate-900">
            Agenda tu cubículo en minutos
          </h1>

          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            Completa el formulario y tu reserva quedará registrada
            automáticamente en nuestra plataforma.
          </p>
        </div>

        {/* Card */}
        <div className="mx-auto max-w-2xl rounded-3xl border border-sky-100 bg-white p-8 md:p-10 shadow-[0_20px_60px_rgba(14,165,233,0.15)]">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Campus */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Selecciona el Campus
              </label>

              <select
                name="campus_id"
                required
                value={formData.campus_id}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 bg-white text-slate-800"
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nombre Completo
              </label>

              <input
                type="text"
                name="nombre"
                required
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Juan Pérez"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
              />
            </div>

            {/* RUT */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                RUT
              </label>

              <input
                type="text"
                name="rut"
                required
                value={formData.rut}
                onChange={handleChange}
                placeholder="12.345.678-9"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Fecha de Reserva
              </label>

              <DatePicker
                selected={fechaSeleccionada}
                onChange={handleFechaChange}
                filterDate={esDiaLaboral}
                minDate={new Date()}
                locale="es"
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecciona una fecha"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 bg-white"
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
                        disabled={b.agotado}
                        onClick={() => setFormData((prev) => ({ ...prev, hora: b.hora }))}
                        className={`
                          p-3 rounded-2xl text-left border transition-all flex flex-col justify-between
                          ${b.agotado
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
              className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 py-4 font-semibold text-white shadow-lg hover:scale-[1.02] transition-all active:scale-95"
            >
              Confirmar Reserva
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}