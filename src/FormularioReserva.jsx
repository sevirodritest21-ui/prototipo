import React, { useState, useEffect } from "react";

const obtenerSessionId = () => {
  let sId = sessionStorage.getItem('chat_session_id');
  if (!sId) {
    sId = 'session_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    sessionStorage.setItem('chat_session_id', sId);
  }
  return sId;
};

export default function FormularioReserva() {
  const [campusList, setCampusList] = useState([]);
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    fecha: "",
    hora: "",
    campus_id: "",
  });

  useEffect(() => {
    fetch("http://localhost:8000/api/campus")
      .then((res) => {
        if (!res.ok) throw new Error("Error al obtener la lista de campus");
        return res.json();
      })
      .then((data) => setCampusList(data))
      .catch((err) => console.error(err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:8000/api/reservas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            campus_id: parseInt(formData.campus_id, 10),
            sessionId: obtenerSessionId()
          }),
        }
      );

      if (response.ok) {
        alert("¡Reserva creada con éxito!");

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

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Selector de Campus */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Fecha de Reserva
                </label>

                <input
                  type="date"
                  name="fecha"
                  required
                  value={formData.fecha}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Hora de Reserva
                </label>

                <input
                  type="time"
                  name="hora"
                  required
                  value={formData.hora}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="
              w-full
              rounded-2xl
              bg-gradient-to-r
              from-sky-500
              to-sky-600
              py-4
              font-semibold
              text-white
              shadow-lg
              hover:scale-[1.02]
              transition-all
              "
            >
              Confirmar Reserva
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}