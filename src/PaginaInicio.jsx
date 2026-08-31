import React from "react";
import { Link } from "react-router-dom";

export default function PaginaInicio() {
  return (
    <div className="min-h-screen overflow-hidden bg-white pt-16">

      
      <section className="relative min-h-[90vh] flex items-center">

      
        <div className="absolute inset-0 bg-gradient-to-br from-white via-sky-50 to-amber-50" />

        <div className="absolute top-10 left-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 w-full">

          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* COLUMNA IZQUIERDA */}
            <div>

              <span className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
                📚 Sistema Inteligente de Reserva de Cubículos
              </span>

              <h1 className="mt-6 text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight">
                Reserva tu espacio de estudio con

                <span className="block bg-gradient-to-r from-sky-600 via-sky-500 to-amber-500 bg-clip-text text-transparent">
                  Inteligencia Artificial
                </span>
              </h1>

              <p className="mt-8 max-w-xl text-lg md:text-xl text-slate-600">
                Encuentra y reserva cubículos de estudio en la biblioteca de forma rápida y sencilla.
                Utiliza nuestro formulario tradicional o conversa con el asistente virtual
                para gestionar tu reserva en segundos.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">

                <Link
                  to="/reservar"
                  className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-2xl
                  bg-gradient-to-r
                  from-amber-400
                  to-amber-500
                  px-8
                  py-4
                  font-semibold
                  text-slate-900
                  shadow-xl
                  hover:scale-105
                  transition-all
                  "
                >
                  Reservar Cubículo
                </Link>

                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("open-chat")
                    )
                  }
                  className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-sky-200
                  bg-white
                  px-8
                  py-4
                  font-semibold
                  text-sky-700
                  shadow-md
                  hover:bg-sky-50
                  transition-all
                  "
                >
                  Probar Asistente IA
                </button>

              </div>

              {/* Estadísticas */}

              <div className="mt-14 grid grid-cols-3 gap-6">

                <div>
                  <p className="text-4xl font-black text-slate-900">
                    500+
                  </p>
                  <p className="text-slate-500">
                    Reservas Mensuales
                  </p>
                </div>

                <div>
                  <p className="text-4xl font-black text-slate-900">
                    20
                  </p>
                  <p className="text-slate-500">
                    Cubículos
                  </p>
                </div>

                <div>
                  <p className="text-4xl font-black text-slate-900">
                    24/7
                  </p>
                  <p className="text-slate-500">
                    Gestión IA
                  </p>
                </div>

              </div>

            </div>

            {/* COLUMNA DERECHA */}

            <div className="flex justify-center">

              <div
                className="
                w-full
                max-w-xl
                rounded-3xl
                border
                border-sky-100
                bg-white
                p-8
                shadow-[0_20px_60px_rgba(14,165,233,0.15)]
                "
              >

                <div className="flex items-center justify-between">

                  <h3 className="text-xl font-bold text-slate-900">
                    Estado de la Biblioteca
                  </h3>

                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />

                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Información actualizada en tiempo real.
                </p>

                <div className="mt-8 space-y-4">

                  <div className="h-3 rounded-full bg-sky-400" />
                  <div className="h-3 rounded-full bg-sky-100" />
                  <div className="h-3 w-2/3 rounded-full bg-amber-300" />

                </div>

                <div className="mt-10 grid grid-cols-3 gap-4">

                  <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      14
                    </p>
                    <p className="text-xs text-slate-500">
                      Disponibles
                    </p>
                  </div>

                  <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      6
                    </p>
                    <p className="text-xs text-slate-500">
                      Ocupados
                    </p>
                  </div>

                  <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      IA
                    </p>
                    <p className="text-xs text-slate-500">
                      Asistente
                    </p>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      <section className="relative py-24 bg-gradient-to-b from-white to-sky-50">

        <div className="mx-auto max-w-7xl px-6">

          <div className="text-center">

            <h2 className="text-4xl font-bold text-slate-900">
              ¿Cómo funciona la reserva?
            </h2>

            <p className="mt-4 max-w-2xl mx-auto text-slate-600">
              Diseñado para estudiantes que necesitan encontrar espacios de estudio
              de forma rápida, cómoda y organizada.
            </p>

          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">

            <div className="rounded-3xl bg-white border border-sky-100 p-8 shadow-lg hover:-translate-y-2 hover:shadow-xl transition-all">
              <div className="text-sky-600 font-black text-4xl">
                01
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Selecciona un Cubículo
              </h3>

              <p className="mt-3 text-slate-600">
                Elige el espacio disponible que mejor se adapte a tu estudio individual o grupal.
              </p>
            </div>

            <div className="rounded-3xl bg-white border border-sky-100 p-8 shadow-lg hover:-translate-y-2 hover:shadow-xl transition-all">
              <div className="text-amber-500 font-black text-4xl">
                02
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Reserva con IA
              </h3>

              <p className="mt-3 text-slate-600">
                Conversa con nuestro asistente inteligente para completar tu reserva automáticamente.
              </p>
            </div>

            <div className="rounded-3xl bg-white border border-sky-100 p-8 shadow-lg hover:-translate-y-2 hover:shadow-xl transition-all">
              <div className="text-sky-600 font-black text-4xl">
                03
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                Confirma y Estudia
              </h3>

              <p className="mt-3 text-slate-600">
                Recibe la confirmación y utiliza tu cubículo durante el horario reservado.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="border-t border-sky-100 bg-white py-8 text-center text-slate-500">
        © {new Date().getFullYear()} Biblioteca Inteligente. Todos los derechos reservados.
      </footer>

    </div>
  );
}

