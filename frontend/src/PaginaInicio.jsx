import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useCmsAnunciosQuery, useCmsTarjetasQuery } from "./services/queries";
import logoChatbot from "./assets/logoredondo.png";
import "./PaginaInicio.css";

const IconChatSvg = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);

const IconPinSvg = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconDoorSvg = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M15 12h.01" />
  </svg>
);

const IconCheckSvg = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const IconBookSvg = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);

const IconUsersSvg = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const renderCardSvg = (icono, idx) => {
  const val = String(icono || "").toLowerCase();
  if (val.includes("chat") || val.includes("\u{1F916}") || idx === 1) return <IconChatSvg className="w-6 h-6" />;
  if (val.includes("user") || val.includes("\u{1F465}") || idx === 2) return <IconUsersSvg className="w-6 h-6" />;
  return <IconBookSvg className="w-6 h-6" />;
};

const tutorialSteps = [
  {
    paso: 1,
    titulo: "Toca el Asistente IA",
    desc: "Presiona el botón flotante del chatbot para agendar o consultar.",
    tipo: "chatbot",
    icono: <IconChatSvg className="w-6 h-6" />
  },
  {
    paso: 2,
    titulo: "Elige Fecha y Campus",
    desc: "Selecciona tu sede, fecha y horario de estudio.",
    icono: <IconPinSvg className="w-6 h-6" />
  },
  {
    paso: 3,
    titulo: "Selecciona Cubículo",
    desc: "Revisa capacidad, pantallas y disponibilidad.",
    icono: <IconDoorSvg className="w-6 h-6" />
  },
  {
    paso: 4,
    titulo: "Confirma tu Espacio",
    desc: "Agrega compañeros y asegura tu reserva al instante.",
    icono: <IconCheckSvg className="w-6 h-6" />
  }
];

const tarjetasDefault = [
  {
    icono: "book",
    titulo: "Reserva de Cubículos",
    descripcion: "Selecciona la sede, fecha y bloque horario que necesitas para tu jornada de estudio individual o en equipo.",
    link_texto: "Ir al Formulario",
    link_url: "/reservar"
  },
  {
    icono: "chat",
    titulo: "Asistente Virtual",
    descripcion: "Interactúa en lenguaje natural para realizar o cancelar reservas sin llenar formularios extensos.",
    link_texto: "Probar Chatbot",
    link_url: "open-chat"
  },
  {
    icono: "users",
    titulo: "Trabajo Colaborativo",
    descripcion: "Registra a tus compañeros acompañantes al momento de realizar la reserva de tu espacio.",
    link_texto: "Hasta 10 espacios por bloque",
    link_url: ""
  }
];

const slideDefault = {
  titulo: "RESERVA INTELIGENTE CON ASISTENCIA IA",
  subtitulo: "¿Sabías que puedes consultar disponibilidad y agendar tu espacio directamente desde el chat flotante?",
  badge: "NUEVO SERVICIO",
  boton_texto: "Abrir Chatbot Ahora",
  boton_link: "open-chat",
  color_fondo: "#00A3E0"
};

const abrirChat = () => window.dispatchEvent(new CustomEvent("open-chat"));

const limpiarFlecha = (texto) => String(texto || "").trimEnd().replace(/→$/, "").trimEnd();

export default function PaginaInicio() {
  const { user } = useAuth();
  const { data: anuncios = [] } = useCmsAnunciosQuery();
  const { data: tarjetas = [] } = useCmsTarjetasQuery();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [tutorialStep, setTutorialStep] = useState(0);
  const rootRef = useRef(null);

  const slides = anuncios.length > 0 ? anuncios : [slideDefault];
  const listaTarjetas = tarjetas.length > 0 ? tarjetas : tarjetasDefault;
  const slide = slides[currentSlide] || slides[0];
  const paso = tutorialSteps[tutorialStep];

  useEffect(() => {
    const timer = setInterval(() => {
      setTutorialStep((prev) => (prev + 1) % tutorialSteps.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length, currentSlide]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elementos = root.querySelectorAll(".pi-reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      elementos.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [listaTarjetas.length]);

  const handleSpotlight = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  const irSlide = (delta) => setCurrentSlide((prev) => (prev + delta + slides.length) % slides.length);

  const inicial = String(user?.nombre || user?.correo || "U").trim().charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className="pi-root min-h-screen pt-16">
      <section className="pi-hero" aria-labelledby="pi-hero-title">
        <div className="pi-grid" aria-hidden="true" />
        <div className="pi-blob pi-blob--sky" aria-hidden="true" />
        <div className="pi-blob pi-blob--ocean" aria-hidden="true" />
        <div className="pi-blob pi-blob--gold" aria-hidden="true" />

        <div className="pi-container pi-hero-grid">
          <div>
            <div className="pi-eyebrow pi-fade-up">
              <span className="pi-eyebrow-dot" />
              Biblioteca UCT — Portal de Reservas
            </div>

            <h1 id="pi-hero-title" className="pi-title">
              <span className="pi-title-line"><span>Tus cubículos.</span></span>
              <span className="pi-title-line"><span>Organizados.</span></span>
              <span className="pi-title-line">
                <span className="pi-gradient-text pi-underline">
                  Sin esfuerzo.
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
              </span>
            </h1>

            <p className="pi-lead pi-fade-up" style={{ animationDelay: "0.45s" }}>
              Reserva cubículos de estudio donde te encuentres. Revisa la disponibilidad en tiempo real en la Biblioteca UCT, gestiona tus horarios o conversa con nuestro asistente inteligente sin complicaciones.
            </p>

            <div className="pi-actions pi-fade-up" style={{ animationDelay: "0.6s" }}>
              <Link id="pi-btn-reservar" to="/reservar" className="pi-btn pi-btn--gold">
                Reservar Cubículo
                <span className="pi-btn-arrow">→</span>
              </Link>
              <button id="pi-btn-chat" type="button" onClick={abrirChat} className="pi-btn pi-btn--glass">
                <IconChatSvg className="w-4 h-4" /> Hablar con el Asistente IA
              </button>
            </div>

            {user && (
              <div className="pi-user-chip pi-fade-up" style={{ animationDelay: "0.75s" }}>
                <span className="pi-user-avatar">{inicial}</span>
                Conectado como <strong style={{ color: "#FFC20E" }}>{user.nombre || user.correo}</strong>
              </div>
            )}

            <div className="pi-mini-stats pi-fade-up" style={{ animationDelay: "0.9s" }}>
              <div className="pi-mini-stat">
                <strong>24/7</strong>
                <span>Asistente IA</span>
              </div>
              <div className="pi-mini-stat">
                <strong>4</strong>
                <span>Pasos simples</span>
              </div>
              <div className="pi-mini-stat">
                <strong style={{ color: "#FFC20E" }}>0</strong>
                <span>Papeleo</span>
              </div>
            </div>
          </div>

          <div
            className="pi-stage pi-fade-up"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="pi-tilt">

              <div className="pi-chip pi-chip--a">
                <span className="pi-chip-icon"><span className="pi-live" /></span>
                <div>
                  Disponibilidad en vivo
                  <small>Biblioteca UCT</small>
                </div>
              </div>

              <div className="pi-glass-card">
                <div className="pi-glass-inner">
                  <div className="pi-window-bar">
                    <div className="pi-window-dots"><i /><i /><i /></div>
                    <div className="pi-window-url">biblioteca.uct.cl / anuncios</div>
                    <div className="flex gap-1.5">
                      <button type="button" className="pi-nav-btn" aria-label="Anterior anuncio" onClick={() => irSlide(-1)}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button type="button" className="pi-nav-btn" aria-label="Siguiente anuncio" onClick={() => irSlide(1)}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="pi-slide">
                    <div className="pi-slide-deco" aria-hidden="true" />
                    <div key={currentSlide} className="pi-slide-content">
                      <div className="flex items-center gap-3">
                        <span className="pi-slide-badge">✦ {slide?.badge || "AVISO UCT"}</span>
                        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
                          {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                        </span>
                      </div>
                      <h2 className="pi-slide-title">{slide?.titulo}</h2>
                      <p className="pi-slide-text">{slide?.subtitulo}</p>
                    </div>

                    <div>
                      {slides.length > 1 && (
                        <div className="pi-progress" style={{ marginTop: "1.4rem" }}>
                          <span key={`p-${currentSlide}`} />
                        </div>
                      )}
                      <div className="pi-slide-footer">
                        {slide?.boton_texto ? (
                          slide?.boton_link === "open-chat" ? (
                            <button type="button" onClick={abrirChat} className="pi-slide-cta">
                              {slide.boton_texto} <span>→</span>
                            </button>
                          ) : (
                            <Link to={slide?.boton_link || "/reservar"} className="pi-slide-cta">
                              {slide.boton_texto} <span>→</span>
                            </Link>
                          )
                        ) : <span />}

                        {slides.length > 1 && (
                          <div className="pi-slide-dots">
                            {slides.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                aria-label={`Anuncio ${idx + 1}`}
                                onClick={() => setCurrentSlide(idx)}
                                className={idx === currentSlide ? "is-active" : ""}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              <div className="pi-phone">
                <div className="pi-phone-notch" />
                <div className="pi-phone-screen">
                  <div className="pi-phone-head">
                    <span>¿Cómo reservar?</span>
                    <span className="pi-phone-step">Paso {paso.paso}/{tutorialSteps.length}</span>
                  </div>

                  <div key={tutorialStep} className="pi-phone-body">
                    {paso.tipo === "chatbot" ? (
                      <button type="button" className="pi-phone-bot" onClick={abrirChat} aria-label="Abrir chatbot">
                        <img src={logoChatbot} alt="Chatbot UCT" />
                      </button>
                    ) : (
                      <div className="pi-phone-icon">{paso.icono}</div>
                    )}
                    <h3>{paso.titulo}</h3>
                    <p>{paso.desc}</p>
                  </div>

                  <div className="pi-phone-foot">
                    <div className="pi-phone-dots">
                      {tutorialSteps.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          aria-label={`Paso ${idx + 1}`}
                          onClick={() => setTutorialStep(idx)}
                          className={idx === tutorialStep ? "is-active" : ""}
                        />
                      ))}
                    </div>
                    {tutorialStep === 0 ? (
                      <button type="button" onClick={abrirChat} className="pi-phone-btn pi-phone-btn--gold">
                        ¡Abrir Chatbot!
                      </button>
                    ) : tutorialStep === tutorialSteps.length - 1 ? (
                      <Link to="/reservar" className="pi-phone-btn pi-phone-btn--gold">
                        ¡Reservar Cubículo!
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTutorialStep((prev) => (prev + 1) % tutorialSteps.length)}
                        className="pi-phone-btn pi-phone-btn--sky"
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

        <div className="pi-scroll-hint hidden lg:flex" aria-hidden="true"><span /></div>

        <svg className="pi-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,60 C240,100 480,10 720,40 C960,70 1200,20 1440,50 L1440,90 L0,90 Z" />
        </svg>
      </section>

      <section className="pi-section" aria-labelledby="pi-steps-title">
        <div className="pi-container">
          <div className="pi-section-head pi-reveal">
            <span className="pi-kicker">✦ Así de simple</span>
            <h2 id="pi-steps-title" className="pi-h2">
              Tu cubículo listo en <em>cuatro pasos</em>
            </h2>
            <p className="pi-sub">
              Desde el chatbot o el formulario, reservar tu espacio de estudio toma menos de un minuto.
            </p>
          </div>

          <div className="pi-steps">
            {tutorialSteps.map((s, idx) => (
              <div key={s.paso} className="pi-step pi-reveal" style={{ "--d": `${idx * 0.12}s` }}>
                <div className="pi-step-num">
                  {s.icono}
                  <b>{s.paso}</b>
                </div>
                <h3>{s.titulo}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pi-section pi-services" aria-labelledby="pi-services-title">
        <div className="pi-container">
          <div className="pi-section-head pi-reveal">
            <span className="pi-kicker">✦ Servicios disponibles</span>
            <h2 id="pi-services-title" className="pi-h2">
              Todo lo que necesitas para tu <em>jornada de estudio</em>
            </h2>
            <p className="pi-sub">
              Herramientas diseñadas para facilitar tu experiencia académica en la Biblioteca UCT.
            </p>
          </div>

          <div className="pi-cards">
            {listaTarjetas.map((tj, idx) => (
              <article
                key={tj.id || idx}
                className="pi-card pi-reveal"
                style={{ "--d": `${(idx % 3) * 0.12}s` }}
                onMouseMove={handleSpotlight}
              >
                <div className="pi-card-inner">
                  <span className="pi-card-num" aria-hidden="true">{String(idx + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="pi-card-icon">{renderCardSvg(tj.icono, idx)}</div>
                    <h3>{tj.titulo}</h3>
                    <p>{tj.descripcion}</p>
                  </div>

                  {tj.link_url === "open-chat" ? (
                    <button type="button" onClick={abrirChat} className="pi-card-link">
                      <span>{limpiarFlecha(tj.link_texto) || "Abrir Chatbot"}</span>
                      <span>→</span>
                    </button>
                  ) : tj.link_url ? (
                    <Link to={tj.link_url} className="pi-card-link">
                      <span>{limpiarFlecha(tj.link_texto) || "Ver más"}</span>
                      <span>→</span>
                    </Link>
                  ) : (
                    <span className="pi-card-note">✦ {tj.link_texto}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pi-section" style={{ paddingTop: "5rem" }} aria-labelledby="pi-cta-title">
        <div className="pi-container">
          <div className="pi-cta pi-reveal">
            <div className="pi-cta-grid">
              <div>
                <span className="pi-eyebrow" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <span className="pi-eyebrow-dot"><IconChatSvg className="w-3.5 h-3.5" /></span>
                  Asistente inteligente UCT
                </span>
                <h2 id="pi-cta-title" style={{ marginTop: "1.4rem" }}>
                  ¿Sin tiempo para formularios? <span>Solo pregúntale.</span>
                </h2>
                <p>
                  Escribe algo como “quiero un cubículo mañana a las 10” y nuestro asistente se encarga del resto: disponibilidad, reserva y confirmación.
                </p>
                <div className="pi-actions">
                  <button type="button" onClick={abrirChat} className="pi-btn pi-btn--gold">
                    Abrir Chatbot <span className="pi-btn-arrow">→</span>
                  </button>
                  <Link to="/reservar" className="pi-btn pi-btn--glass">
                    Prefiero el formulario
                  </Link>
                </div>
              </div>

              <div className="pi-cta-bot">
                <button type="button" onClick={abrirChat} aria-label="Abrir chatbot">
                  <img src={logoChatbot} alt="Chatbot UCT" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="pi-footer">
        <div className="pi-container">
          <div className="pi-footer-top">
            <div className="pi-footer-brand">
              Biblioteca <span style={{ color: "#00A3E0" }}>U</span>C<span style={{ color: "#FFC20E" }}>T</span>
              <p>Universidad Católica de Temuco</p>
            </div>
            <nav className="pi-footer-links" aria-label="Enlaces del pie de página">
              <Link to="/reservar">Reservar</Link>
              <Link to="/preguntas-frecuentes">Preguntas Frecuentes</Link>
              <Link to="/reglamento">Reglamento</Link>
            </nav>
          </div>
          <p className="pi-footer-bottom">
            © {new Date().getFullYear()} Dirección de Bibliotecas — Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}