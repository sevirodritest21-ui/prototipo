import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./PoliticaPrivacidad.css";

const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {path}
  </svg>
);

const IconShield = (p) => <Icon {...p} path={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />} />;
const IconLock = (p) => <Icon {...p} path={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>} />;
const IconBot = (p) => <Icon {...p} path={<><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" /></>} />;
const IconUserCheck = (p) => <Icon {...p} path={<><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></>} />;
const IconFileText = (p) => <Icon {...p} path={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>} />;
const IconMail = (p) => <Icon {...p} path={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>} />;
const IconSearch = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>} />;
const IconCheck = (p) => <Icon {...p} path={<polyline points="20 6 9 17 4 12" />} />;

export default function PoliticaPrivacidad() {
  const [busqueda, setBusqueda] = useState("");
  const [seccionAbierta, setSeccionAbierta] = useState(null);

  const toggleSeccion = (idx) => {
    setSeccionAbierta(seccionAbierta === idx ? null : idx);
  };

  const secciones = [
    {
      id: "responsable",
      titulo: "1. Responsable del Tratamiento de Datos",
      icono: <IconShield className="w-5 h-5 text-[#00629B] dark:text-[#38BDF8]" />,
      contenido: (
        <>
          <p>
            El responsable del tratamiento de los datos personales recabados mediante esta plataforma es la <strong>Dirección de Sistema de Bibliotecas de la Universidad Católica de Temuco (UCT)</strong>, persona jurídica de derecho público, con domicilio en Manuel Montt 56, Temuco, Región de La Araucanía, Chile.
          </p>
          <p>
            Para cualquier consulta, solicitud de ejercicio de derechos o aclaración respecto al tratamiento de tus datos, puedes dirigirte formalmente al correo institucional:{" "}
            <a href="mailto:biblioteca@uct.cl" className="pp-link">biblioteca@uct.cl</a>.
          </p>
        </>
      )
    },
    {
      id: "marco-legal",
      titulo: "2. Marco Regulatorio y Principios de Tratamiento",
      icono: <IconFileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      contenido: (
        <>
          <p>
            El tratamiento de datos personales en esta plataforma se rige estrictamente por la <strong>Ley N° 21.719 sobre Protección de Datos Personales en Chile</strong> (que moderniza y actualiza la Ley N° 19.628), supervisada por la <strong>Agencia de Protección de Datos Personales (APDP)</strong>.
          </p>
          <p>
            Garantizamos la aplicación de los principios rectores de:
          </p>
          <ul className="pp-list">
            <li><strong>Licitud y Lealtad:</strong> Tus datos son tratados de manera legal, transparente y proporcionada.</li>
            <li><strong>Finalidad Específica:</strong> Los datos se recaban únicamente para prestar y gestionar servicios de biblioteca y reserva de espacios.</li>
            <li><strong>Minimización:</strong> Solo solicitamos y conservamos los datos estrictamente necesarios para el propósito educativo.</li>
            <li><strong>Seguridad y Confidencialidad:</strong> Medidas técnicas de cifrado, Row-Level Security y protección perimetral.</li>
          </ul>
        </>
      )
    },
    {
      id: "datos-recopilados",
      titulo: "3. Datos Objeto de Tratamiento y Finalidad",
      icono: <IconUserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      contenido: (
        <>
          <p>Tratamos las siguientes categorías de información:</p>
          <ul className="pp-list">
            <li><strong>Datos de Identificación Universitaria:</strong> Nombre de pila, apellidos, RUT institucional, correo institucional (<code>@alu.uct.cl</code>), carrera académica y número de matrícula.</li>
            <li><strong>Datos de Uso de Espacios:</strong> Historial de reservas de cubículos, campus asignado, bloque horario seleccionado, asistencias e inasistencias reportadas.</li>
            <li><strong>Comunicaciones y Soporte:</strong> Mensajes enviados a través del formulario de contacto y solicitudes de talleres de capacitación.</li>
          </ul>
          <p>
            <strong>Finalidades:</strong> Permitir la autogestión de cubículos, garantizar el aforo equitativo entre estudiantes, coordinar talleres de habilidades informacionales y mantener la trazabilidad de seguridad en las dependencias universitarias.
          </p>
        </>
      )
    },
    {
      id: "ia-transferencia",
      titulo: "4. Asistente con Inteligencia Artificial y Procesamiento en la Nube",
      icono: <IconBot className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      contenido: (
        <>
          <p>
            La biblioteca pone a disposición de la comunidad un Asistente Virtual Inteligente para resolver consultas sobre normativas, horarios, talleres y reserva de cubículos.
          </p>
          <div className="pp-alert-box">
            <h4 className="pp-alert-title">Garantía de Disociación y Privacidad</h4>
            <p>
              El procesamiento de lenguaje natural se apoya en modelos de IA alojados en infraestructura en la nube. En estricto cumplimiento con la Ley N° 21.719 sobre transferencias internacionales:
            </p>
            <ul className="pp-list pp-list--compact">
              <li>Tu <strong>RUT, apellidos y cédula de identidad civil nunca son transmitidos</strong> al modelo de lenguaje externo.</li>
              <li>El asistente opera únicamente con identificadores de sesión opacos y nombre de pila para fines de redacción cordial.</li>
              <li>La resolución de reservas y confirmación en base de datos se ejecuta exclusivamente en servidores institucionales protegidos en Chile.</li>
            </ul>
          </div>
        </>
      )
    },
    {
      id: "biometria",
      titulo: "5. Control de Acceso y Tecnologías Biométricas (Alternativa Garantizada)",
      icono: <IconLock className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      contenido: (
        <>
          <p>
            En determinados campus y salas de estudio, la biblioteca dispone de terminales de validación de acceso automatizado. Respecto a estas tecnologías:
          </p>
          <ul className="pp-list">
            <li>
              <strong>Carácter Voluntario y Optativo:</strong> El uso de reconocimiento facial o sensores biométricos es complementario y voluntario conforme a la normativa sobre datos sensibles.
            </li>
            <li>
              <strong>Alternativa No Biométrica Garantizada:</strong> Todo estudiante tiene el derecho inalienable de optar por la validación presencial mediante su <strong>Credencial TUI física o digital (App UCT)</strong> o mediante el personal en el mesón de atención, sin restricción alguna ni menoscabo en el acceso al cubículo asignado.
            </li>
            <li>
              <strong>Finalidad Exclusiva de Seguridad:</strong> Las imágenes o registros de terminal se emplean únicamente para verificación de acceso puntual durante el bloque reservado y no son cedidas a terceros.
            </li>
          </ul>
        </>
      )
    },
    {
      id: "derechos-arco",
      titulo: "6. Derechos del Titular (Derechos ARCO+P)",
      icono: <IconShield className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
      contenido: (
        <>
          <p>
            Conforme a la Ley N° 21.719, como titular de datos personales tienes derecho a ejercer en cualquier momento y de forma totalmente gratuita:
          </p>
          <div className="pp-grid-arco">
            <div className="pp-card-arco">
              <strong>Acceso</strong>
              <span>Conocer qué datos personales tuyos están registrados y cómo son utilizados.</span>
            </div>
            <div className="pp-card-arco">
              <strong>Rectificación</strong>
              <span>Actualizar o corregir información inexacta, desactualizada o incompleta.</span>
            </div>
            <div className="pp-card-arco">
              <strong>Supresión (Cancelación)</strong>
              <span>Solicitar la eliminación de tu historial de reservas o mensajes cuando ya no sean requeridos.</span>
            </div>
            <div className="pp-card-arco">
              <strong>Oposición</strong>
              <span>Negarte al tratamiento o perfilamiento automatizado en situaciones particulares.</span>
            </div>
            <div className="pp-card-arco">
              <strong>Portabilidad</strong>
              <span>Recibir una copia digital estructurada de tu historial de reservas.</span>
            </div>
            <div className="pp-card-arco">
              <strong>Bloqueo</strong>
              <span>Suspender temporalmente el uso de datos en caso de controversia o reclamo.</span>
            </div>
          </div>
          <p className="mt-4">
            Para ejercer estos derechos, puedes utilizar el panel de <strong>Mis Reservas</strong> en la plataforma o remitir una solicitud por correo a <a href="mailto:biblioteca@uct.cl" className="pp-link">biblioteca@uct.cl</a> indicando tu nombre y RUT institucional.
          </p>
        </>
      )
    },
    {
      id: "retencion",
      titulo: "7. Conservación y Depuración de Datos",
      icono: <IconFileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      contenido: (
        <>
          <p>
            Los registros de reservas, asistencias y mensajes de soporte se conservan durante el período lectivo y hasta el cierre del ciclo académico correspondiente para fines de control de uso, auditoría académica y estadísticas institucionales.
          </p>
          <p>
            Al finalizar el ciclo correspondiente o transcurridos los plazos legales, la información no requerida es depurada o sometida a procesos irreversibles de anonimización para análisis estadístico de ocupación general de la biblioteca.
          </p>
        </>
      )
    }
  ];

  const seccionesFiltradas = secciones.filter((s) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return s.titulo.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
  });

  return (
    <div className="pp-root">
      <div className="pp-ambient" aria-hidden="true">
        <div className="pp-orb pp-orb--1" />
        <div className="pp-orb pp-orb--2" />
      </div>

      <header className="pp-header" style={{ paddingTop: "7.5rem", paddingBottom: "4rem" }}>
        <div className="pp-header-grid" aria-hidden="true" />
        <div className="pp-container">
          <div className="pp-header-content">
            <div>
              <div className="pp-tag-hub">
                <span className="pp-eyebrow-dot">★</span>
                Marco Legal y Transparencia — Ley N° 21.719
              </div>
              <h1 className="pp-title-hub">
                Política de{" "}
                <span className="pp-gradient-text pp-underline">
                  Privacidad.
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
              <p className="pp-lead-hub">
                Conoce cómo protegemos tus datos personales, las garantías de privacidad de nuestro asistente de Inteligencia Artificial y tus derechos como estudiante de la Universidad Católica de Temuco.
              </p>
            </div>

            <div className="pp-header-tools">
              <Link to="/reglamento" className="pp-btn-cta pp-btn-cta--gold">
                <IconFileText className="w-4 h-4" />
                Ver Reglamento
              </Link>
              <Link to="/reservar" className="pp-btn-cta pp-btn-cta--ghost">
                <IconCheck className="w-4 h-4" />
                Reservar Cubículo
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pp-container pp-content-wrap">
        <div className="pp-search-bar">
          <IconSearch className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en la política de privacidad (ej: IA, biometría, derechos, RUT, cancelación)..."
            className="pp-search-input"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="pp-search-clear"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="pp-accordion-list">
          {seccionesFiltradas.length > 0 ? (
            seccionesFiltradas.map((sec, idx) => {
              const isOpen = seccionAbierta === idx || busqueda.trim().length > 0;
              return (
                <div key={sec.id} className={`pp-card ${isOpen ? "pp-card--open" : ""}`}>
                  <button
                    type="button"
                    onClick={() => toggleSeccion(idx)}
                    className="pp-card-header"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      <div className="pp-card-icon">{sec.icono}</div>
                      <h2 className="pp-card-title">{sec.titulo}</h2>
                    </div>
                    <span className="pp-card-chevron">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && <div className="pp-card-body">{sec.contenido}</div>}
                </div>
              );
            })
          ) : (
            <div className="pp-empty">
              <p>No se encontraron secciones para tu búsqueda "{busqueda}".</p>
              <button type="button" onClick={() => setBusqueda("")} className="pp-link">
                Restablecer búsqueda
              </button>
            </div>
          )}
        </div>

        <footer className="pp-contact-card">
          <div className="flex items-start gap-4">
            <div className="pp-contact-icon">
              <IconMail className="w-6 h-6 text-[#00629B] dark:text-[#38BDF8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ¿Dudas sobre el tratamiento de tus datos?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Puedes contactar directamente al equipo de gestión de la Dirección de Bibliotecas UCT a través del canal oficial de privacidad:
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href="mailto:biblioteca@uct.cl?subject=Consulta%20sobre%20Privacidad%20y%20Datos%20Personales%20(Ley%2021.719)"
                  className="pp-btn-contact"
                >
                  <IconMail className="w-4 h-4" />
                  biblioteca@uct.cl
                </a>
                <span className="text-xs text-slate-400">
                  Temuco, Región de La Araucanía, Chile
                </span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

