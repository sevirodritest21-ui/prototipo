import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

export default function PaginaInicio() {
  const { user } = useAuth();
  const [anuncios, setAnuncios] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetch("http://localhost:8000/api/cms/anuncios")
      .then((res) => res.json())
      .then((data) => setAnuncios(data || []))
      .catch(() => setAnuncios([]));

    fetch("http://localhost:8000/api/cms/tarjetas")
      .then((res) => res.json())
      .then((data) => setTarjetas(data || []))
      .catch(() => setTarjetas([]));
  }, []);

  useEffect(() => {
    if (anuncios.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % anuncios.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [anuncios.length]);

  const slideActual = anuncios[currentSlide] || {
    titulo: "RESERVA INTELIGENTE CON ASISTENCIA IA",
    subtitulo: "¿Sabías que puedes consultar disponibilidad y agendar tu espacio directamente desde el chat flotante?",
    badge: "NUEVO SERVICIO",
    boton_texto: "Abrir Chatbot Ahora",
    boton_link: "open-chat",
    color_fondo: "#4A4D55"
  };

  const handleBotonClick = (link) => {
    if (link === "open-chat") {
      window.dispatchEvent(new CustomEvent("open-chat"));
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pt-16 font-sans text-slate-800">

      <section className="bg-[#00629B] text-white py-12 px-6 shadow-md border-b-4 border-[#00A3E0]">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <span className="inline-block bg-[#00A3E0] text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider mb-3">
              Portal del Estudiante — Biblioteca UCT
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              ¡Bienvenido/a, {user?.nombre || "Estudiante"}!
            </h1>
            <p className="mt-3 text-sky-100 text-sm md:text-base max-w-2xl">
              Sistema de reserva de cubículos de estudio. Gestiona tus horarios de forma rápida utilizando nuestro formulario o interactuando con el chatbot de IA.
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
              className="px-6 py-3 bg-[#FFC20E] hover:bg-[#689B00] text-white font-bold text-sm rounded shadow transition-all cursor-pointer text-center"
            >
              Asistente IA
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10">

        <div className="relative mb-10 overflow-hidden rounded-2xl shadow-xl border-l-8 border-[#00A3E0] transition-all duration-500" style={{ backgroundColor: slideActual.color_fondo || "#4A4D55" }}>
          <div className="p-6 md:p-8 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="bg-[#00A3E0] text-white text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                  {slideActual.badge || "ANUNCIO"}
                </span>
              </div>
              <h2 className="text-xl md:text-3xl font-black text-white tracking-tight leading-snug">
                {slideActual.titulo}
              </h2>
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
                {slideActual.subtitulo}
              </p>
            </div>

            {slideActual.boton_texto && (
              slideActual.boton_link === "open-chat" ? (
                <button
                  onClick={() => handleBotonClick(slideActual.boton_link)}
                  className="px-6 py-3 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  {slideActual.boton_texto}
                </button>
              ) : (
                <Link
                  to={slideActual.boton_link || "/reservar"}
                  className="px-6 py-3 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-lg transition-all text-center whitespace-nowrap"
                >
                  {slideActual.boton_texto}
                </Link>
              )
            )}
          </div>

          {anuncios.length > 1 && (
            <div className="flex items-center justify-between px-6 pb-4 pt-1 border-t border-white/10 relative z-10">
              <div className="flex items-center gap-2">
                {anuncios.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${idx === currentSlide ? "w-8 bg-[#00A3E0]" : "w-2 bg-white/40 hover:bg-white/60"}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + anuncios.length) % anuncios.length)}
                  className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white text-xs flex items-center justify-center transition"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % anuncios.length)}
                  className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white text-xs flex items-center justify-center transition"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#00629B] border-b-2 border-[#00629B] pb-2 inline-block mb-6">
            Servicios <span className="text-[#00A3E0]">Disponibles</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(tarjetas.length > 0 ? tarjetas : [
              {
                icono: "📚",
                titulo: "Reserva de Cubículos",
                descripcion: "Selecciona la sede, fecha y bloque horario que necesitas para tu jornada de estudio individual o en equipo.",
                link_texto: "Ir al Formulario →",
                link_url: "/reservar"
              },
              {
                icono: "🤖",
                titulo: "Asistente Virtual",
                descripcion: "Interactúa en lenguaje natural para realizar o cancelar reservas sin llenar formularios extensos.",
                link_texto: "Probar Chatbot →",
                link_url: "open-chat"
              },
              {
                icono: "👥",
                titulo: "Trabajo Colaborativo",
                descripcion: "Registra a tus compañeros acompañantes al momento de realizar la reserva de tu espacio.",
                link_texto: "Hasta 10 espacios por bloque",
                link_url: ""
              }
            ]).map((tj, idx) => (
              <div key={tj.id || idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 bg-[#00629B]/10 text-[#00629B] font-bold text-xl flex items-center justify-center rounded-xl mb-4">
                    {tj.icono || "📚"}
                  </div>
                  <h3 className="font-bold text-[#00629B] text-base mb-2">
                    {tj.titulo}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {tj.descripcion}
                  </p>
                </div>

                {tj.link_url === "open-chat" ? (
                  <button
                    onClick={() => handleBotonClick(tj.link_url)}
                    className="text-xs font-bold text-[#FFC20E] hover:underline text-left cursor-pointer"
                  >
                    {tj.link_texto || "Abrir →"}
                  </button>
                ) : tj.link_url ? (
                  <Link
                    to={tj.link_url}
                    className="text-xs font-bold text-[#00A3E0] hover:text-[#00629B] flex items-center gap-1"
                  >
                    {tj.link_texto || "Ver más →"}
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    {tj.link_texto}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="bg-[#00629B] text-white py-6 border-t-4 border-[#00A3E0] text-center text-xs">
        <p>© {new Date().getFullYear()} Universidad Católica de Temuco — Dirección de Bibliotecas</p>
      </footer>
    </div>
  );
}