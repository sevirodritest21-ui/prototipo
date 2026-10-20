import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCmsFaqsQuery } from "../services/queries";

export default function PreguntasFrecuentes() {
  const { data: faqs = [], isLoading } = useCmsFaqsQuery();
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");
  const [openIds, setOpenIds] = useState([1]);

  const categorias = useMemo(() => {
    const cats = new Set(faqs.map((f) => f.categoria || "General"));
    return ["Todas", ...Array.from(cats)];
  }, [faqs]);

  const faqsFiltradas = useMemo(() => {
    return faqs.filter((faq) => {
      const coincideCat =
        categoriaSeleccionada === "Todas" ||
        (faq.categoria || "General").toLowerCase() === categoriaSeleccionada.toLowerCase();

      const q = busqueda.toLowerCase().trim();
      const coincideTexto =
        !q ||
        faq.pregunta.toLowerCase().includes(q) ||
        faq.respuesta.toLowerCase().includes(q);

      return coincideCat && coincideTexto;
    });
  }, [faqs, categoriaSeleccionada, busqueda]);

  const toggleAccordion = (id) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pt-16 font-sans text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      <div>
        <section className="bg-gradient-to-r from-[#004D7A] via-[#00629B] to-[#0082B8] text-white py-14 px-6 relative overflow-hidden border-b-4 border-[#FFC20E]">
          <div className="mx-auto max-w-5xl relative z-10 text-center">
            <span className="inline-flex items-center gap-2 bg-[#00A3E0]/30 border border-white/20 text-white text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-[#FFC20E] animate-pulse" />
              Centro de Ayuda — Biblioteca UCT
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Preguntas Frecuentes
            </h1>

            <p className="text-sky-100 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
              Encuentra respuestas inmediatas sobre el uso de cubículos de estudio, normativas de biblioteca y el funcionamiento de nuestro asistente virtual.
            </p>

            <div className="max-w-xl mx-auto relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribe una palabra clave (ej. tiempo, cancelar, acompañantes)..."
                className="w-full px-5 py-3.5 pl-12 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium shadow-xl focus:outline-none focus:ring-4 focus:ring-[#FFC20E]/50 border border-slate-200 transition-all"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                🔍
              </span>
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 px-2 py-1 rounded-md"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
            {categorias.map((cat) => {
              const activa = categoriaSeleccionada.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                    activa
                      ? "bg-[#00A3E0] text-white shadow-md shadow-[#00A3E0]/20"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-20 bg-white dark:bg-slate-800 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-700" />
              ))}
            </div>
          ) : faqsFiltradas.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
              <span className="text-4xl block mb-3">🔎</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                No se encontraron preguntas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                No hay coincidencias para tu búsqueda. Intenta con otros términos o pregúntale directamente a nuestro chatbot flotante.
              </p>
              <button
                onClick={() => {
                  setBusqueda("");
                  setCategoriaSeleccionada("Todas");
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {faqsFiltradas.map((faq) => {
                const isOpen = openIds.includes(faq.id);
                return (
                  <div
                    key={faq.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all overflow-hidden"
                  >
                    <button
                      onClick={() => toggleAccordion(faq.id)}
                      className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 cursor-pointer focus:outline-none"
                    >
                      <div className="space-y-1.5 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#00A3E0]/10 text-[#00629B] dark:text-[#00A3E0] dark:bg-[#00A3E0]/20">
                            {faq.categoria || "General"}
                          </span>
                        </div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {faq.pregunta}
                        </h2>
                      </div>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-transform duration-200 shrink-0 ${
                          isOpen ? "rotate-180 bg-[#00A3E0]/15 text-[#00629B] dark:text-[#00A3E0]" : ""
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 mt-1">
                        {faq.respuesta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 bg-gradient-to-r from-sky-50 via-white to-amber-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/80 border-2 border-[#00A3E0]/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-14 h-14 rounded-2xl bg-[#00A3E0] text-white flex items-center justify-center text-3xl shadow-md shrink-0 mx-auto md:mx-0">
                🤖
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ¿Aún tienes dudas específicas sobre tu reserva?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Nuestro Asistente Virtual responde tus preguntas en tiempo real y puede gestionar tus reservas automáticamente.
                </p>
              </div>
            </div>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
              className="px-6 py-3.5 bg-[#FFC20E] hover:bg-[#E5AC00] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              Abrir Asistente IA
            </button>
          </div>
        </main>
      </div>

      <footer className="bg-slate-900 text-white py-8 px-6 text-center text-xs border-t border-slate-800 mt-12">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white tracking-tight">
              Biblioteca <span className="text-[#00A3E0]">U</span><span className="text-white">C</span><span className="text-[#FFC20E]">T</span>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Universidad Católica de Temuco</span>
          </div>
          <p className="text-slate-400">© {new Date().getFullYear()} Dirección de Bibliotecas — Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  );
}
