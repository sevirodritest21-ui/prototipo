import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useCmsAnunciosQuery, useCmsTarjetasQuery } from "./services/queries";
import logoChatbot from "./assets/logoredondo.png";

export default function PaginaInicio() {
  const { user } = useAuth();
  const { data: anuncios = [] } = useCmsAnunciosQuery();
  const { data: tarjetas = [] } = useCmsTarjetasQuery();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [tutorialStep, setTutorialStep] = useState(0);

  const tutorialSteps = [
    {
      paso: 1,
      titulo: "Toca el Asistente IA",
      desc: "Presiona el botón flotante del chatbot para agendar o consultar.",
      tipo: "chatbot"
    },
    {
      paso: 2,
      titulo: "Elige Fecha y Campus",
      desc: "Selecciona tu sede, fecha y horario de estudio.",
      icono: "📍"
    },
    {
      paso: 3,
      titulo: "Selecciona Cubículo",
      desc: "Revisa capacidad, pantallas y disponibilidad.",
      icono: "🚪"
    },
    {
      paso: 4,
      titulo: "Confirma tu Espacio",
      desc: "Agrega compañeros y asegura tu reserva al instante.",
      icono: "✅"
    }
  ];

  useEffect(() => {
    const tutorialTimer = setInterval(() => {
      setTutorialStep((prev) => (prev + 1) % tutorialSteps.length);
    }, 4500);
    return () => clearInterval(tutorialTimer);
  }, [tutorialSteps.length]);

  useEffect(() => {
    if (anuncios.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % anuncios.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [anuncios.length]);

  const slideDefault = {
    titulo: "RESERVA INTELIGENTE CON ASISTENCIA IA",
    subtitulo: "¿Sabías que puedes consultar disponibilidad y agendar tu espacio directamente desde el chat flotante?",
    badge: "NUEVO SERVICIO",
    boton_texto: "Abrir Chatbot Ahora",
    boton_link: "open-chat",
    color_fondo: "#00A3E0"
  };

  const slides = anuncios.length > 0 ? anuncios : [slideDefault];

  const handleBotonClick = (link) => {
    if (link === "open-chat") {
      window.dispatchEvent(new CustomEvent("open-chat"));
    }
  };

  const heroPattern = "url(\"data:image/svg+xml,%3Csvg width='90' height='90' viewBox='0 0 90 90' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.11' fill-rule='evenodd'%3E%3Cpath d='M16 18h10v10H16zm35 8l3 7h7l-5 4 2 7-5-4-5 4 2-7-5-4h7zm-27 38c0-5 4-8 8-8s8 3 8 8-3 8-8 8-8-3-8-8zm50 10h12v4H74zm-4 6h10v2H70zm12-32a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm-58-4a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm40-20h6v6h-6zm-12 50l3 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z'/%3E%3C/g%3E%3C/svg%3E\")";

  return (
    <div className="min-h-screen bg-white pt-16 font-sans text-slate-800">
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#FFC20E] to-transparent shadow-xs" />
      <section
        className="relative text-white py-14 sm:py-20 lg:py-24 px-6 overflow-hidden border-b-4 border-[#FFC20E]"
        style={{
          background: "linear-gradient(180deg, #004D7A 0%, #00629B 15%, #0082B8 45%, #00A3E0 100%)"
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: heroPattern }}
        />
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center relative z-10">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-bold uppercase tracking-wider border border-white/30">
              <span className="w-2 h-2 rounded-full bg-[#FFC20E] animate-pulse" />
              Biblioteca UCT — Portal de Reservas
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Tus cubículos.<br />
              Organizados. Sin<br />
              esfuerzo
            </h1>

            <p className="text-base sm:text-lg text-white/95 font-normal leading-relaxed max-w-xl">
              Reserva cubículos de estudio donde te encuentres. Encuentra rápidamente la disponibilidad en tiempo real en la Biblioteca UCT. Gestiona tus horarios o consulta con nuestro asistente inteligente sin complicaciones.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                to="/reservar"
                className="px-8 py-4 bg-white text-[#00A3E0] hover:bg-sky-50 font-black text-sm uppercase tracking-wider rounded-md shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
              >
                Reservar Cubículo
              </Link>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                className="px-7 py-4 bg-[#FFC20E] hover:bg-[#E5AC00] text-slate-950 font-black text-sm uppercase tracking-wider rounded-md shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <span>🤖</span> Asistente IA
              </button>
            </div>

            {user && (
              <p className="text-xs text-white/90 font-medium pt-1">
                Conectado como <span className="font-bold text-[#FFC20E]">{user.nombre || user.correo}</span>
              </p>
            )}
          </div>

          <div className="lg:col-span-7 relative flex justify-center lg:justify-end">
            <div className="absolute -top-7 -right-3 sm:-top-9 sm:-right-4 md:-top-11 md:-right-6 z-30 pointer-events-none transform rotate-12">
              <svg
                viewBox="0 0 100 100"
                className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
              >
                <path
                  d="M50 4 L62.5 32 L94 34.5 L70 55 L77.5 86 L50 70 L22.5 86 L30 55 L6 34.5 L37.5 32 Z"
                  fill="#FFC20E"
                  stroke="#E5AC00"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="relative w-full max-w-[540px] lg:max-w-[580px]">
              <div className="relative bg-[#1E293B] rounded-t-2xl p-2.5 sm:p-3 pb-0 shadow-2xl border border-slate-700">
                <div className="flex items-center justify-center gap-3 py-1.5 bg-[#0F172A] rounded-t-xl mb-1 text-slate-400">
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                    aria-label="Anterior anuncio"
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-[#FFC20E] flex items-center justify-center transition-all cursor-pointer hover:scale-110"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="w-2 h-2 rounded-full bg-slate-950 ring-1 ring-slate-700 inline-block" />
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                    aria-label="Siguiente anuncio"
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-[#FFC20E] flex items-center justify-center transition-all cursor-pointer hover:scale-110"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="relative bg-white rounded-t-lg overflow-hidden min-h-[260px] sm:min-h-[300px] flex flex-col justify-between p-5 sm:p-6 text-slate-800">
                  <div className="relative z-10 space-y-2.5 max-w-full sm:max-w-[62%] md:max-w-[64%]">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#FFC20E] text-slate-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                        {slides[currentSlide]?.badge || "AVISO UCT"}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {currentSlide + 1} de {slides.length}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                      {slides[currentSlide]?.titulo}
                    </h2>

                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed line-clamp-3">
                      {slides[currentSlide]?.subtitulo}
                    </p>
                  </div>

                  <div className="relative z-10 pt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 mt-2 max-w-full sm:max-w-[62%] md:max-w-[64%]">
                    <div>
                      {slides[currentSlide]?.boton_texto && (
                        slides[currentSlide]?.boton_link === "open-chat" ? (
                          <button
                            onClick={() => handleBotonClick(slides[currentSlide]?.boton_link)}
                            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            {slides[currentSlide]?.boton_texto}
                          </button>
                        ) : (
                          <Link
                            to={slides[currentSlide]?.boton_link || "/reservar"}
                            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all text-center inline-flex items-center gap-1.5"
                          >
                            {slides[currentSlide]?.boton_texto}
                          </Link>
                        )
                      )}
                    </div>

                    {slides.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        {slides.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            aria-label={`Slide ${idx + 1}`}
                            className={`h-2 rounded-full transition-all cursor-pointer ${idx === currentSlide ? "w-5 bg-[#00A3E0]" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                              }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative bg-gradient-to-b from-[#334155] to-[#1E293B] h-4 sm:h-5 rounded-b-xl shadow-xl flex items-center justify-center border-t border-slate-600">
                <div className="w-16 sm:w-24 h-1.5 bg-[#475569] rounded-b-md" />
              </div>
              <div className="mx-auto w-[92%] h-2 bg-black/30 blur-xs rounded-full" />

              <div className="absolute -bottom-8 -right-2 sm:-bottom-10 sm:-right-4 md:-right-8 lg:-right-10 w-44 sm:w-48 md:w-52 bg-[#0F172A] rounded-[2.2rem] p-2.5 shadow-2xl border-2 border-slate-700 z-20 hidden sm:block">
                <div className="w-14 h-1.5 bg-slate-800 rounded-full mx-auto mb-2.5" />
                <div className="bg-white rounded-[1.6rem] p-3.5 text-slate-800 flex flex-col justify-between h-56 sm:h-64 shadow-inner text-left overflow-hidden relative">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00A3E0]" />
                      <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">¿Cómo reservar?</span>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#FFC20E] text-slate-950">
                      Paso {tutorialSteps[tutorialStep].paso}/{tutorialSteps.length}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1 py-1">
                    {tutorialSteps[tutorialStep].tipo === "chatbot" ? (
                      <div
                        className="relative inline-flex items-center justify-center my-1.5 cursor-pointer group"
                        onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                      >
                        <span className="absolute -inset-2 rounded-full bg-[#00A3E0]/25 animate-ping pointer-events-none" />
                        <div className="w-13 h-13 rounded-full bg-white border-2 border-[#FFC20E] shadow-md p-1 relative z-10 overflow-hidden ring-4 ring-[#00629B]/15 group-hover:scale-105 transition-transform">
                          <img
                            src={logoChatbot}
                            alt="Chatbot UCT"
                            className="w-full h-full object-cover scale-125 rounded-full"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-2.5 text-2xl z-20 transform -rotate-12 animate-bounce pointer-events-none drop-shadow-md">
                          👆
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-[#00A3E0]/10 text-[#00A3E0] flex items-center justify-center text-2xl mb-1.5 shadow-xs">
                        {tutorialSteps[tutorialStep].icono}
                      </div>
                    )}
                    <h3 className="text-xs font-black text-slate-900 leading-tight mb-1">
                      {tutorialSteps[tutorialStep].titulo}
                    </h3>
                    <p className="text-[10px] text-slate-600 leading-snug">
                      {tutorialSteps[tutorialStep].desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-center gap-1.5">
                      {tutorialSteps.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setTutorialStep(idx)}
                          aria-label={`Paso ${idx + 1}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === tutorialStep ? "w-5 bg-[#00A3E0]" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                            }`}
                        />
                      ))}
                    </div>

                    {tutorialStep === 0 ? (
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                        className="w-full py-1.5 bg-[#FFC20E] hover:bg-[#E5AC00] text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg text-center shadow-xs cursor-pointer transition-colors"
                      >
                        ¡Abrir Chatbot!
                      </button>
                    ) : tutorialStep === tutorialSteps.length - 1 ? (
                      <Link
                        to="/reservar"
                        className="w-full py-1.5 bg-[#FFC20E] hover:bg-[#E5AC00] text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg text-center shadow-xs block transition-colors"
                      >
                        ¡Reservar Cubículo!
                      </Link>
                    ) : (
                      <button
                        onClick={() => setTutorialStep((prev) => (prev + 1) % tutorialSteps.length)}
                        className="w-full py-1.5 bg-[#00A3E0] hover:bg-[#0082B3] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg text-center shadow-xs cursor-pointer transition-colors"
                      >
                        Siguiente →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 px-6 border-t border-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00A3E0] bg-[#00A3E0]/10 px-3 py-1 rounded-full">
              Servicios Disponibles
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
              Todo lo que necesitas para tu jornada de estudio
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Herramientas diseñadas para facilitar tu experiencia académica en la Biblioteca UCT.
            </p>
          </div>

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
              <div
                key={tj.id || idx}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#00A3E0]/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-12 h-12 bg-[#00A3E0]/10 text-[#00A3E0] font-bold text-2xl flex items-center justify-center rounded-xl mb-4 group-hover:scale-105 transition-transform">
                    {tj.icono || "📚"}
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">
                    {tj.titulo}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    {tj.descripcion}
                  </p>
                </div>

                {tj.link_url === "open-chat" ? (
                  <button
                    onClick={() => handleBotonClick(tj.link_url)}
                    className="text-xs font-bold text-[#00A3E0] hover:text-[#0082B3] flex items-center gap-1.5 cursor-pointer text-left"
                  >
                    <span>{tj.link_texto || "Abrir Chatbot"}</span>
                    <span>→</span>
                  </button>
                ) : tj.link_url ? (
                  <Link
                    to={tj.link_url}
                    className="text-xs font-bold text-[#00A3E0] hover:text-[#0082B3] flex items-center gap-1.5"
                  >
                    <span>{tj.link_texto || "Ver más"}</span>
                    <span>→</span>
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
      </section>

      <footer className="bg-slate-900 text-white py-8 px-6 text-xs border-t border-slate-800">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white tracking-tight">
              Biblioteca <span className="text-[#00A3E0]">U</span><span className="text-white">C</span><span className="text-[#FFC20E]">T</span>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Universidad Católica de Temuco</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/preguntas-frecuentes" className="hover:text-[#FFC20E] transition-colors">
              Preguntas Frecuentes
            </Link>
            <span>•</span>
            <Link to="/reglamento" className="hover:text-[#FFC20E] transition-colors">
              Reglamento
            </Link>
          </div>
          <p className="text-slate-400">© {new Date().getFullYear()} Dirección de Bibliotecas — Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  );
}