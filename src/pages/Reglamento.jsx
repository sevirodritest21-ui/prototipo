import React from "react";
import { Link } from "react-router-dom";

export default function Reglamento() {
  const horarios = [
    {
      sede: "Biblioteca Central (San Francisco)",
      campus: "Campus San Francisco",
      icono: "🏛️",
      colorBorde: "border-sky-400",
      bloques: [
        { dias: "Lunes a Viernes", horas: "8:30 – 18:00 hrs" }
      ]
    },
    {
      sede: "Biblioteca San Juan Pablo II",
      campus: "Campus San Juan Pablo II",
      icono: "🎓",
      colorBorde: "border-amber-400",
      bloques: [
        { dias: "Lunes a Viernes", horas: "8:30 – 20:00 hrs" },
        { dias: "Sábados", horas: "10:30 – 13:30 hrs" }
      ]
    }
  ];

  const normas = [
    {
      numero: 1,
      icono: "🪪",
      titulo: "Comunidad Universitaria",
      descripcion: "El acceso a cubículos es exclusivo para estudiantes de la comunidad UC Temuco, quienes deben presentar su credencial universitaria para validar su identidad."
    },
    {
      numero: 2,
      icono: "📅",
      titulo: "Reserva Previa",
      descripcion: "El préstamo es con reserva previa y debe realizarse en https://biblioteca.uct.cl/reservas. La confirmación de las reservas se realizará entre las 9:00 y 17:30 hrs. de lunes a viernes."
    },
    {
      numero: 3,
      icono: "⏰",
      titulo: "Horario de Reserva",
      descripcion: "El horario de reserva de cubículos rige de 9:00 a 18:00 hrs. de lunes a viernes a través de las plataformas oficiales."
    },
    {
      numero: 4,
      icono: "⏳",
      titulo: "Tiempo de Préstamo y Tolerancia",
      descripcion: "El tiempo de préstamo del cubículo es por 2 horas. El tiempo de espera máxima para hacer uso del puesto reservado será de 10 minutos; transcurrido ese lapso, el cupo será liberado."
    },
    {
      numero: 5,
      icono: "🧴",
      titulo: "Bioseguridad e Higiene",
      descripcion: "Al ingresar a los cubículos es obligatorio el uso de mascarilla y alcohol gel. Si necesita desechar mascarillas, hágalo fuera de los cubículos en los contenedores con pedestal."
    },
    {
      numero: 6,
      icono: "🚫",
      titulo: "Alimentos y Bebidas",
      descripcion: "No está permitido consumir alimentos, ni beber líquidos dentro de los cubículos de estudio para resguardar la limpieza y el equipamiento."
    },
    {
      numero: 7,
      icono: "🪑",
      titulo: "Cuidado de Mobiliario",
      descripcion: "No se cambie de puesto, ni traslade mobiliario. Todos los puestos de estudio están debidamente demarcados para garantizar el orden."
    },
    {
      numero: 8,
      icono: "👥",
      titulo: "Distancia y Capacidad Máxima",
      descripcion: "Recuerde mantener la distancia social mínima de 1 mt. con otras personas y respetar estrictamente la capacidad máxima de puestos de estudio en cada cubículo."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] pt-16 font-sans text-slate-800">

      <section className="bg-[#00629B] text-white py-12 px-6 shadow-md border-b-4 border-[#00A3E0]">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <span className="inline-block bg-[#00A3E0] text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider mb-3">
              Normativa Institucional — Biblioteca UCT
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Reglamento y Horarios de Cubículos
            </h1>
            <p className="mt-3 text-sky-100 text-sm md:text-base max-w-2xl">
              Conoce las normas de uso, horarios de funcionamiento por sede y requisitos vigentes para garantizar una experiencia de estudio colaborativa y ordenada.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              to="/reservar"
              className="px-6 py-3 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-bold text-sm rounded shadow transition-all text-center"
            >
              Reservar Cubículo
            </Link>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
              className="px-6 py-3 bg-[#FFC20E] hover:bg-[#e0a800] text-slate-900 font-bold text-sm rounded shadow transition-all cursor-pointer text-center"
            >
              Consultar con IA
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-12">

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#00629B] text-white rounded-2xl text-lg shadow-sm">
              🕒
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Horario de Atención de Cubículos
              </h2>
              <p className="text-xs md:text-sm text-slate-500">
                Horarios oficiales habilitados para el uso y reserva de salas de estudio en las sedes universitarias.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {horarios.map((h, i) => (
              <div
                key={i}
                className={`bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/60 border-l-8 ${h.colorBorde} border-slate-100 flex flex-col justify-between gap-6 transition-all hover:shadow-2xl`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl p-2 bg-sky-50 rounded-2xl border border-sky-100 shadow-2xs">
                      {h.icono}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                      Atención Presencial
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-900">
                      {h.sede}
                    </h3>
                    <p className="text-xs font-medium text-sky-700">
                      {h.campus}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  {h.bloques.map((b, bi) => (
                    <div
                      key={bi}
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs"
                    >
                      <span className="font-bold text-slate-700">{b.dias}:</span>
                      <span className="font-extrabold text-[#00629B] bg-white px-3 py-1 rounded-xl shadow-2xs border border-slate-200">
                        {b.horas}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#00A3E0] text-white rounded-2xl text-lg shadow-sm">
              📜
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Reglamento de Uso de Cubículos
              </h2>
              <p className="text-xs md:text-sm text-slate-500">
                Pautas obligatorias que rigen la solicitud, permanencia y convivencia dentro de los espacios de estudio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {normas.map((n) => (
              <div
                key={n.numero}
                className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#00629B] to-[#00A3E0] text-white text-xs font-black flex items-center justify-center shadow-md">
                      #{n.numero}
                    </span>
                    <span className="text-2xl p-2 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
                      {n.icono}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#00629B] transition-colors">
                    {n.titulo}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {n.descripcion}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Regla Obligatoria</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-r from-[#00629B] to-[#004b75] rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-sky-400/30">
          <div className="space-y-2 max-w-2xl">
            <span className="bg-[#FFC20E] text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              ¿DUDAS SOBRE EL REGLAMENTO?
            </span>
            <h3 className="text-2xl font-black tracking-tight">
              Pregúntale a nuestro Asistente Virtual
            </h3>
            <p className="text-xs md:text-sm text-sky-100 leading-relaxed">
              El chatbot con IA de la biblioteca conoce todos los horarios, sedes y reglamentos. Puedes consultarle sobre disponibilidad o normas en cualquier momento.
            </p>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
            className="px-6 py-3.5 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
          >
            Abrir Asistente IA →
          </button>
        </section>

      </main>
    </div>
  );
}
