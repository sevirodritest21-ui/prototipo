import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCmsFaqsQuery } from "../services/queries";
import "./PreguntasFrecuentes.css";

const IconChevron = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

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
        (faq.pregunta && faq.pregunta.toLowerCase().includes(q)) ||
        (faq.respuesta && faq.respuesta.toLowerCase().includes(q));

      return coincideCat && coincideTexto;
    });
  }, [faqs, categoriaSeleccionada, busqueda]);

  const toggleAccordion = (id) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="pf-root">
      <div className="pf-ambient" aria-hidden="true">
        <div className="pf-orb pf-orb--1" />
        <div className="pf-orb pf-orb--2" />
        <div className="pf-orb pf-orb--3" />
      </div>

      <div>
        <header className="pf-hero">
          <div className="pf-hero-grid" aria-hidden="true" />
          <div className="pf-hero-content">
            <div className="pf-eyebrow">
              <span className="pf-pulse-dot" />
              <span>Centro de Ayuda • Biblioteca UCT</span>
            </div>

            <h1 className="pf-title">
              Preguntas{" "}
              <span className="pf-gradient-text pf-underline">
                Frecuentes.
                <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                  <path
                    d="M4 14 C 60 4, 120 4, 170 10 S 260 18, 296 6"
                    fill="none"
                    stroke="#FFC20E"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="pf-lead">
              Encuentra respuestas inmediatas sobre reserva de cubículos, normativas de uso, horarios y resolución de dudas con nuestro asistente inteligente.
            </p>

            <div className="pf-search-wrap">
              <span className="pf-search-icon">🔍</span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribe una palabra clave (ej. tiempo, cancelar, acompañantes)..."
                className="pf-search-input"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="pf-clear-btn"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="pf-body-container">
          <div className="pf-categories-bar">
            {categorias.map((cat) => {
              const activa = categoriaSeleccionada.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className={`pf-cat-pill ${activa ? "is-active" : ""}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="pf-faqs-list">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-20 bg-white dark:bg-[#131d33] rounded-2xl animate-pulse border border-slate-200 dark:border-slate-800"
                />
              ))}
            </div>
          ) : faqsFiltradas.length === 0 ? (
            <div className="pf-empty-state">
              <span className="text-4xl block mb-2">🔎</span>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No se encontraron preguntas coincidentes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                Intenta con otros términos o pregúntale directamente a nuestro Asistente Virtual 24/7.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setCategoriaSeleccionada("Todas");
                }}
                className="pf-reset-btn"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="pf-faqs-list">
              {faqsFiltradas.map((faq) => {
                const isOpen = openIds.includes(faq.id);
                return (
                  <div
                    key={faq.id}
                    className={`pf-card ${isOpen ? "is-open" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleAccordion(faq.id)}
                      className="pf-card-btn"
                    >
                      <div>
                        <span className="pf-card-badge">
                          {faq.categoria || "General"}
                        </span>
                        <h2 className="pf-card-q">
                          {faq.pregunta}
                        </h2>
                      </div>

                      <div className="pf-chevron">
                        <IconChevron className="w-4 h-4" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="pf-answer">
                        {faq.respuesta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="pf-cta-banner">
            <div className="flex items-center gap-4">
              <div className="pf-cta-icon">
                🤖
              </div>
              <div>
                <h3 className="pf-cta-title">
                  ¿Aún tienes dudas sobre tu reserva?
                </h3>
                <p className="pf-cta-desc">
                  Nuestro Asistente Virtual inteligente responde tus preguntas en tiempo real y gestiona tus cupos automáticamente.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
              className="pf-cta-btn"
            >
              Abrir Asistente IA
            </button>
          </div>
        </main>
      </div>

      <footer className="pf-footer">
        <div className="pf-footer-content">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white tracking-tight">
              Biblioteca <span className="text-[#00A3E0]">U</span><span className="text-white">C</span><span className="text-[#FFC20E]">T</span>
            </span>
            <span className="text-slate-600">|</span>
            <span>Universidad Católica de Temuco</span>
          </div>
          <p>© {new Date().getFullYear()} Dirección de Bibliotecas — Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  );
}
