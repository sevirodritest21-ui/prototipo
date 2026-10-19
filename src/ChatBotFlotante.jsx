import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { apiPost, API_URL } from './services/api';
import logoUCT from './assets/logoredondo.png';
const obtenerSessionId = (rut) => {
  if (!rut) return `anon_${Date.now()}`;
  const rutLimpio = String(rut).replace(/\./g, '').trim().toUpperCase();
  return `session_rut_${rutLimpio}`;
};

const detectarPreguntaEliminar = (texto) => {
  if (!texto) return false;
  const t = texto.toLowerCase();
  if (t.includes("soy tu asistente") || t.includes("¿qué te gustaría gestionar hoy?")) {
    return false;
  }
  const accionCancel = ["cancelar", "eliminar", "anular", "liberar"].some((p) => t.includes(p));
  const tieneContexto = ["¿", "?", "deseas", "quieres", "confirmas", "seguro de", "para confirmar"].some((c) => t.includes(c));
  return accionCancel && tieneContexto;
};

const extraerDatosReserva = (texto) => {
  if (!texto) return null;

  const esConfirmada = /reserva\s+(creada|confirmada|agendada|registrada|exitosa)|confirmada con éxito|agendado con éxito/i.test(texto);
  const esCancelada = /reserva\s+(cancelada|eliminada|anulada|liberada)|cancelada con éxito|eliminada con éxito/i.test(texto);

  if (!esConfirmada && !esCancelada) {
    return null;
  }

  let campus = null;
  if (/san\s*juan\s*pablo\s*ii/i.test(texto)) campus = "Campus San Juan Pablo II";
  else if (/san\s*francisco/i.test(texto)) campus = "Campus San Francisco";
  else {
    const campusMatch = texto.match(/campus\s+([A-Za-zÁÉÍÓÚáéíóú\s]+)/i);
    if (campusMatch) campus = campusMatch[0].trim();
  }

  let cubiculo = null;
  const cubMatch = texto.match(/cub[íi]culo[:\s]+([A-Za-z0-9_-]+)/i) || texto.match(/\b(CUB[0-9A-Za-z_-]*)\b/i);
  if (cubMatch) cubiculo = cubMatch[1];

  let fecha = null;
  const fechaMatch = texto.match(/\b(\d{4}-\d{2}-\d{2})\b/) || texto.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/) || texto.match(/\b(\d{1,2}\s+de\s+[a-zA-Z]+(?:\s+de\s+\d{4})?)\b/i);
  if (fechaMatch) fecha = fechaMatch[0];

  let hora = null;
  const horaMatch = texto.match(/\b(\d{1,2}:\d{2}(?:\s*(?:a|-)\s*\d{1,2}:\d{2})?)\s*(?:hrs|horas)?\b/i);
  if (horaMatch) hora = horaMatch[0];

  let id = null;
  const idMatch = texto.match(/#(\d+)/) || texto.match(/(?:reserva|número|id)[:\s#]+(\d+)/i);
  if (idMatch) id = idMatch[1];

  return {
    tipo: esConfirmada ? "confirmada" : "cancelada",
    id,
    campus,
    cubiculo,
    fecha,
    hora,
  };
};

export default function ChatbotFlotante() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const esModoAdmin = user?.rol === 'admin' || location.pathname.startsWith('/dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [cargandoBot, setCargandoBot] = useState(false);
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState('menu');
  const [nombreContacto, setNombreContacto] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [asuntoContacto, setAsuntoContacto] = useState('Guías temáticas');
  const [mensajeContacto, setMensajeContacto] = useState('');
  const [enviandoContacto, setEnviandoContacto] = useState(false);
  const recognitionRef = useRef(null);
  const pressTimerRef = useRef(null);
  const isHoldingRef = useRef(false);

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [mensajes, isChatOpen]);

  const getSaludo = () => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return '¡Buenos días';
    if (hora >= 12 && hora < 20) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  useEffect(() => {
    if (!user) return;
    setNombreContacto(user.nombre || '');
    setEmailContacto(user.email || '');
    setSeccionActiva('menu');
    if (esModoAdmin) {
      setMensajes([
        {
          id: 1,
          texto: `${getSaludo()}, ${user.nombre || 'asistente'}! 🛡️ Te doy la bienvenida al Asistente de Reglamento y Normativas de Biblioteca UCT.\n\nPuedes hacerme consultas directas sobre el reglamento oficial, políticas de sanciones, liberación de cubículos y normativas institucionales basadas en los documentos oficiales:`,
          esBot: true,
          esMenuAdmin: true
        }
      ]);
    } else {
      setMensajes([
        {
          id: 1,
          texto: `${getSaludo()}, ${user.nombre || 'estudiante'}! 👋 Te doy la bienvenida al asistente virtual de Biblioteca UCT.\n\n¿Qué deseas hacer hoy? Selecciona una de las siguientes opciones:`,
          esBot: true,
          esMenuOpciones: true
        }
      ]);
    }
  }, [user, esModoAdmin]);

  useEffect(() => {
    const abrirChat = () => setIsChatOpen(true);
    window.addEventListener('open-chat', abrirChat);
    return () => window.removeEventListener('open-chat', abrirChat);
  }, []);

  const seleccionarOpcion = (opcion) => {
    if (opcion === 'reservas') {
      setSeccionActiva('reservas');
      setMensajes((prev) => [
        ...prev,
        { id: Date.now(), texto: '🏢 Gestionar reserva', esBot: false },
        {
          id: Date.now() + 1,
          texto: `¡Excelente! Estoy listo para ayudarte con la gestión de cubículos de estudio.\n\n🏛️ Sedes disponibles:\n• Campus San Juan Pablo II\n• Campus Derecho\n• Campus Jaime Arellano\n\nPuedes pedirme agendar directamente indicando sede, fecha y horario (ej: "Quiero un cubículo en San Juan Pablo II hoy a las 11:00"), consultar disponibilidad o revisar tus reservas activas.`,
          esBot: true
        }
      ]);
    } else if (opcion === 'contacto') {
      setSeccionActiva('contacto');
      setNombreContacto(user?.nombre || '');
      setEmailContacto(user?.email || '');
      setAsuntoContacto('Guías temáticas');
      setMensajeContacto('');
      setMensajes((prev) => [
        ...prev,
        { id: Date.now(), texto: '📩 Contactar al soporte', esBot: false },
        {
          id: Date.now() + 1,
          texto: `📩 Formulario de contacto y soporte:\nCompleta los campos a continuación para remitir tu consulta directamente al soporte de Biblioteca UCT:`,
          esBot: true,
          esFormContacto: true
        }
      ]);
    } else if (opcion === 'taller') {
      setSeccionActiva('taller');
      setMensajes((prev) => [
        ...prev,
        { id: Date.now(), texto: '🎓 Gestionar un taller', esBot: false },
        {
          id: Date.now() + 1,
          texto: `¡Excelente! Te puedo ayudar a solicitar y coordinar cualquiera de nuestros 6 talleres especializados de biblioteca:\n\n1️⃣ Conoce tu biblioteca: Taller de inicio\n2️⃣ Búsqueda y evaluación de información\n3️⃣ Gestión de referencias y estilo de citas\n4️⃣ Uso ético de la información\n5️⃣ Introducción a Leganto\n6️⃣ ORCID\n\n📌 Requisitos generales:\n• Grupo mínimo: 4 personas (hasta 9 o más)\n• Modalidad: Presencial o Virtual\n\n¿Cuál de estos talleres te gustaría solicitar y cuál es tu carrera?`,
          esBot: true
        }
      ]);
    } else if (opcion === 'prestamos') {
      setMensajes((prev) => [
        ...prev,
        { id: Date.now(), texto: '📚 Préstamos interbibliotecarios', esBot: false },
        {
          id: Date.now() + 1,
          texto: `📚 El servicio de préstamos interbibliotecarios estará habilitado muy pronto para coordinar libros y material entre sedes.\n\nPor ahora puedes gestionar reservas de cubículos o contactar a soporte.`,
          esBot: true,
          mostrarBotonMenu: true
        }
      ]);
    }
  };

  const volverAlMenuPrincipal = () => {
    setSeccionActiva('menu');
    setMensajes((prev) => [
      ...prev,
      {
        id: Date.now(),
        texto: `${getSaludo()}, ${user?.nombre || 'estudiante'}! 👋\n\n¿Qué deseas hacer? Selecciona una opción:`,
        esBot: true,
        esMenuOpciones: true
      }
    ]);
  };

  const enviarFormularioContacto = async (e) => {
    if (e) e.preventDefault();
    if (!mensajeContacto.trim() || enviandoContacto) return;

    setEnviandoContacto(true);
    try {
      const resp = await apiPost('/api/contacto', {
        nombre: nombreContacto.trim() || user?.nombre || 'Estudiante',
        email: emailContacto.trim() || user?.email || '',
        rut: user?.rut || '',
        asunto: asuntoContacto,
        mensaje: mensajeContacto.trim()
      });

      setMensajeContacto('');
      setSeccionActiva('menu');
      setMensajes((prev) => [
        ...prev,
        {
          id: Date.now(),
          texto: `✅ ¡Tu mensaje ha sido enviado al soporte de la universidad!\n\nSe derivó tu consulta sobre "${asuntoContacto}". El equipo de soporte te responderá a tu correo institucional (${emailContacto.trim() || user?.email || 'registrado'}).`,
          esBot: true,
          mostrarBotonMenu: true
        }
      ]);
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: Date.now(),
          texto: `⚠️ No se pudo enviar el mensaje: ${err.message || 'Error de conexión'}. Por favor intenta nuevamente.`,
          esBot: true
        }
      ]);
    } finally {
      setEnviandoContacto(false);
    }
  };

  const enviarMensajeTexto = async (textoAEnviar) => {
    if (!user) {
      setIsChatOpen(false);
      navigate('/login');
      return;
    }
    if (!textoAEnviar.trim() || cargandoBot) return;

    const mensajeTexto = textoAEnviar.trim().slice(0, 300);
    const mensajeUsuario = { id: Date.now(), texto: mensajeTexto, esBot: false };
    setMensajes((prev) => [...prev, mensajeUsuario]);
    setNuevoMensaje('');
    setCargandoBot(true);

    const botPensandoId = Date.now() + 1;
    setMensajes((prev) => [...prev, { id: botPensandoId, texto: 'Escribiendo...', esBot: true }]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const endpoint = esModoAdmin ? '/api/chat/admin' : '/api/chat';
      const payload = esModoAdmin
        ? {
            message: mensajeTexto,
            tipo: 'reglamento',
          }
        : {
            message: mensajeTexto,
            sessionId: obtenerSessionId(user.rut),
            rut: user.rut,
            nombre: user.nombre,
            email: user.email,
          };

      const data = await apiPost(endpoint, payload, {
        signal: controller.signal,
        timeout: 120000
      });
      clearTimeout(timeoutId);

      let textoRespuesta = (data.response || '').replace(/Calling\s+[a-zA-Z0-9_\-]+(\s*with\s+input:)?\s*\{[\s\S]*?\}/gi, '').trim();
      if (!textoRespuesta) {
        textoRespuesta = esModoAdmin
          ? 'Consulta sobre el reglamento procesada con éxito.'
          : 'Estoy procesando tu solicitud de cubículos. ¿En qué fecha, hora y sede te gustaría agendar?';
      }

      setMensajes((prev) =>
        prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: textoRespuesta } : msg)
      );
      if (!esModoAdmin) {
        window.dispatchEvent(new CustomEvent("reservaActualizada"));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error al conectar con el bot:', error);

      if (error?.message?.includes('límite') || error?.message?.includes('Límite') || error?.message?.includes('429')) {
        setMensajes((prev) =>
          prev.map((msg) => (msg.id === botPensandoId ? { ...msg, texto: error.message } : msg))
        );
        return;
      }

      let fallbackTexto = null;
      try {
        const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
        const resCheck = await fetch(`${API_URL}/api/reservas/consultar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ rut: user.rut, sessionId: obtenerSessionId(user.rut) })
        });
        if (resCheck.ok) {
          const resData = await resCheck.json();
          const activas = (resData.reservas || []).filter((r) => r.activa);
          const ultimaActiva = activas.length > 0 ? activas[activas.length - 1] : null;

          const textoMin = mensajeTexto.toLowerCase().trim();
          const ultimoBotTexto = (mensajes.slice().reverse().find((m) => m.esBot)?.texto || '').toLowerCase();
          const eraConfirmacionCancelar = /cancelar|eliminar|borrar/.test(ultimoBotTexto) && /^(s[íi]|claro|confirmo|eliminar|cancelar|ok|dale)/.test(textoMin);
          const pideCancelar = /cancelar|eliminar|borrar|anular/.test(textoMin);
          const pideConsultar = /mis reservas|consultar|ver reserva|tengo reserva|cu[aá]l.*reserva|estado/.test(textoMin);

          if (eraConfirmacionCancelar || (pideCancelar && activas.length === 0)) {
            fallbackTexto = '¡Reserva cancelada con éxito! 🗑️\n\nTu cubículo ha sido liberado correctamente en el sistema.';
            window.dispatchEvent(new CustomEvent("reservaActualizada"));
          } else if (pideConsultar) {
            if (ultimaActiva) {
              fallbackTexto = `Consulté el sistema y tu reserva activa es:\n\n• Sede: ${ultimaActiva.campus || "Campus UCT"}\n• Cubículo: ${ultimaActiva.cubiculo_codigo || "Asignado"}\n• Fecha: ${ultimaActiva.fecha}\n• Hora: ${ultimaActiva.hora} hrs`;
            } else {
              fallbackTexto = 'Consulté el sistema y actualmente no tienes ninguna reserva activa registrada.';
            }
          } else if (ultimaActiva) {
            fallbackTexto = `¡Tu reserva fue confirmada con éxito en el sistema! ✅\n\n• Sede: ${ultimaActiva.campus || "Campus UCT"}\n• Cubículo: ${ultimaActiva.cubiculo_codigo || "Asignado"}\n• Fecha: ${ultimaActiva.fecha}\n• Hora: ${ultimaActiva.hora} hrs\n\nEl comprobante fue enviado a tu correo institucional.`;
            window.dispatchEvent(new CustomEvent("reservaActualizada"));
          }
        }
      } catch (checkErr) {
        console.warn("No se pudo verificar estado tras error:", checkErr);
      }

      if (fallbackTexto) {
        setMensajes((prev) =>
          prev.map((msg) => (msg.id === botPensandoId ? { ...msg, texto: fallbackTexto } : msg))
        );
      } else {
        let errorMsg = 'Lo siento, tuve un problema al procesar tu mensaje. Inténtalo de nuevo.';
        if (
          error?.message?.includes('401') ||
          error?.status === 401 ||
          error?.detail?.toLowerCase().includes('expirad') ||
          error?.message?.toLowerCase().includes('expirad') ||
          error?.detail?.toLowerCase().includes('token') ||
          error?.message?.toLowerCase().includes('token')
        ) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        } else if (error.name === 'AbortError') {
          errorMsg = 'La respuesta del asistente está tomando más tiempo del habitual. La solicitud continúa procesándose, te sugiero revisar tus reservas en unos momentos.';
        } else if (error?.detail) {
          errorMsg = error.detail;
        } else if (error?.message && !error.message.includes('HTTP error')) {
          errorMsg = error.message;
        }

        setMensajes((prev) =>
          prev.map((msg) => (msg.id === botPensandoId ? { ...msg, texto: errorMsg } : msg))
        );
      }
    } finally {
      setCargandoBot(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta entrada por voz.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.continuous = false;
    recognition.interimResults = true;
    let transcritoFinal = '';

    recognition.onstart = () => {
      setEscuchandoVoz(true);
      setNuevoMensaje('');
    };

    recognition.onresult = (event) => {
      transcritoFinal = Array.from(event.results)
        .map((res) => res[0].transcript)
        .join('');
      setNuevoMensaje(transcritoFinal);
    };

    recognition.onerror = () => {
      setEscuchandoVoz(false);
    };

    recognition.onend = () => {
      setEscuchandoVoz(false);
      const textoParaEnviar = transcritoFinal.trim();
      if (textoParaEnviar) {
        setNuevoMensaje('');
        enviarMensajeTexto(textoParaEnviar);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch { }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }
    setEscuchandoVoz(false);
  };

  const handleMicMouseDown = () => {
    pressTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      if (!escuchandoVoz) {
        startListening();
      }
    }, 180);
  };

  const handleMicMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      stopListening();
    }
  };

  const toggleDictadoPorVoz = () => {
    if (isHoldingRef.current) return;
    if (escuchandoVoz) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleEnviarMensaje = (e) => {
    e.preventDefault();
    if (escuchandoVoz && recognitionRef.current) {
      recognitionRef.current.stop();
      setEscuchandoVoz(false);
    }
    enviarMensajeTexto(nuevoMensaje);
  };

  const irALogin = () => {
    setIsChatOpen(false);
    navigate('/login');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isChatOpen && (
        <div className="mb-4 w-[calc(100vw-2rem)] sm:w-[400px] h-[495px] max-h-[calc(100vh-6.5rem)] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,98,155,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-sky-100 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right">
          <div className="bg-gradient-to-r from-[#004B75] via-[#00629B] to-[#007AB8] dark:from-slate-900 dark:via-sky-950 dark:to-slate-900 p-4 text-white flex justify-between items-center shadow-md relative border-b-2 border-[#FFC20E]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-inner">
                <img src={logoUCT} alt="UCT" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-extrabold text-sm tracking-tight text-white">
                    {esModoAdmin ? "Asistente de Reglamento" : "Asistente Virtual"}
                  </p>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-[#FFC20E] text-slate-900 tracking-wider">
                    {esModoAdmin ? "ADMIN" : "UCT"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${user ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${user ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
                  </span>
                  <p className="text-[11px] text-sky-100/90 font-medium">
                    {user ? (esModoAdmin ? `${user.nombre} • Normativas` : user.nombre) : 'Acceso Restringido'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-white/80 hover:text-white transition-all p-1.5 rounded-xl hover:bg-white/15 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!user ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 border border-amber-300/80 dark:border-amber-600/40 flex items-center justify-center mb-4 text-2xl shadow-inner">
                🔒
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">
                Chatbot Institucional
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-relaxed">
                Inicia sesión con tu cuenta universitaria para consultar disponibilidad o reservar cubículos con inteligencia artificial.
              </p>
              <button
                onClick={irALogin}
                className="w-full max-w-xs py-3 px-4 bg-gradient-to-r from-[#00629B] to-[#0082B3] hover:from-[#004B75] hover:to-[#00629B] text-white rounded-2xl font-bold text-xs tracking-wide transition-all shadow-lg shadow-sky-900/20 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>🔑 Iniciar Sesión</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-sky-50/30 via-slate-50/50 to-white/80 dark:from-slate-950/70 dark:via-slate-900/80 dark:to-slate-950/90 backdrop-blur-md">
              {mensajes.map((msg, index) => {
                const esMensajeBienvenida = index === 0 && (msg.texto || '').includes('asistente de biblioteca');
                let cardData = msg.esBot && msg.texto !== 'Escribiendo...' && !esMensajeBienvenida ? extraerDatosReserva(msg.texto) : null;

                if (cardData && cardData.tipo === 'cancelada' && !cardData.campus && !cardData.fecha) {
                  for (let i = index - 1; i >= 0; i--) {
                    const prev = mensajes[i];
                    if (prev?.texto) {
                      const prevData = extraerDatosReserva(prev.texto);
                      if (prevData && (prevData.campus || prevData.fecha || prevData.cubiculo)) {
                        cardData = {
                          ...cardData,
                          campus: prevData.campus,
                          cubiculo: prevData.cubiculo,
                          fecha: prevData.fecha,
                          hora: prevData.hora,
                          id: prevData.id || cardData.id
                        };
                        break;
                      }
                    }
                  }
                }

                const tieneDetalles = cardData && Boolean(cardData.campus || cardData.fecha || cardData.hora || cardData.cubiculo);

                return (
                  <div key={msg.id} className={`flex flex-col ${msg.esBot ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line backdrop-blur-md transition-all ${msg.esBot
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-200/70 dark:border-slate-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                      : 'bg-gradient-to-r from-[#00629B] to-[#007AB8] text-white rounded-tr-sm shadow-[0_4px_16px_rgba(0,98,155,0.25)] border border-sky-400/30'
                      } ${msg.texto === 'Escribiendo...' ? 'text-slate-400 italic bg-white/50 dark:bg-slate-800/50 dark:text-slate-400 animate-pulse' : ''}`}>
                      {msg.texto}
                    </div>

                    {msg.esMenuAdmin && (
                      <div className="w-full max-w-[95%] mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fadeIn">
                        {[
                          {
                            icono: "⏱️",
                            titulo: "Tolerancia de 15 minutos",
                            sub: "Margen de llegada y liberación",
                            pregunta: "¿Cuál es el margen de tolerancia y cómo funciona la liberación automática de cubículos según el reglamento?"
                          },
                          {
                            icono: "🚫",
                            titulo: "Inasistencias y Sanción",
                            sub: "Suspensión de 3 días y causales",
                            pregunta: "¿Qué sanciones se aplican a los estudiantes por acumulación de inasistencias a cubículos y cuánto tiempo duran?"
                          },
                          {
                            icono: "👥",
                            titulo: "Reglas de acompañantes",
                            sub: "Registro y límites por cubículo",
                            pregunta: "¿Cuáles son las normas y requisitos para los acompañantes en las reservas de cubículos?"
                          },
                          {
                            icono: "🛠️",
                            titulo: "Incidencias técnicas",
                            sub: "Protocolo de reporte y mantención",
                            pregunta: "¿Cuál es el protocolo de atención para asistentes ante fallas técnicas o daños en los cubículos?"
                          },
                          {
                            icono: "🏛️",
                            titulo: "Horarios y sedes",
                            sub: "Horarios de apertura oficiales",
                            pregunta: "¿Cuáles son los horarios de atención y normativas generales de las bibliotecas de la universidad?"
                          },
                          {
                            icono: "🎓",
                            titulo: "Talleres especializados",
                            sub: "Requisitos de grupos y modalidades",
                            pregunta: "¿Cuáles son los requisitos y modalidades de talleres especializados de biblioteca disponibles para estudiantes?"
                          }
                        ].map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => enviarMensajeTexto(item.pregunta)}
                            className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/95 dark:bg-slate-800/90 border border-sky-200/80 dark:border-slate-700 hover:border-[#00629B] dark:hover:border-sky-400 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer group"
                          >
                            <span className="text-xl p-1.5 rounded-xl bg-sky-100/70 dark:bg-sky-950/60 group-hover:scale-110 transition-transform">
                              {item.icono}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="block font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-[#00629B] dark:group-hover:text-sky-300">
                                {item.titulo}
                              </span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                {item.sub}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.esMenuOpciones && (
                      <div className="w-full max-w-[95%] mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => seleccionarOpcion('reservas')}
                          className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/95 dark:bg-slate-800/90 border border-sky-200/80 dark:border-slate-700 hover:border-[#00629B] dark:hover:border-sky-400 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer group"
                        >
                          <span className="text-xl p-1.5 rounded-xl bg-sky-100/70 dark:bg-sky-950/60 group-hover:scale-110 transition-transform">🏢</span>
                          <div className="flex-1 min-w-0">
                            <span className="block font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-[#00629B] dark:group-hover:text-sky-300">
                              Gestionar reserva
                            </span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                              Cubículos de estudio, agendar o cancelar
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => seleccionarOpcion('contacto')}
                          className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/95 dark:bg-slate-800/90 border border-sky-200/80 dark:border-slate-700 hover:border-[#00629B] dark:hover:border-sky-400 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer group"
                        >
                          <span className="text-xl p-1.5 rounded-xl bg-sky-100/70 dark:bg-sky-950/60 group-hover:scale-110 transition-transform">📩</span>
                          <div className="flex-1 min-w-0">
                            <span className="block font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-[#00629B] dark:group-hover:text-sky-300">
                              Contactar al soporte
                            </span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                              Envía un mensaje o consulta a biblioteca
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => seleccionarOpcion('taller')}
                          className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/95 dark:bg-slate-800/90 border border-sky-200/80 dark:border-slate-700 hover:border-[#00629B] dark:hover:border-sky-400 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer group"
                        >
                          <span className="text-xl p-1.5 rounded-xl bg-sky-100/70 dark:bg-sky-950/60 group-hover:scale-110 transition-transform">🎓</span>
                          <div className="flex-1 min-w-0">
                            <span className="block font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-[#00629B] dark:group-hover:text-sky-300">
                              Gestionar un taller
                            </span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                              Solicita talleres presenciales o virtuales
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => seleccionarOpcion('prestamos')}
                          className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer group"
                        >
                          <span className="text-xl p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/50">📚</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-700 dark:text-slate-200">
                                Préstamos interbibliotecarios
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                                Pronto
                              </span>
                            </div>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                              Solicitud de libros entre sedes
                            </span>
                          </div>
                        </button>
                      </div>
                    )}

                    {msg.esFormContacto && (
                      <form
                        onSubmit={enviarFormularioContacto}
                        className="w-full max-w-[95%] mt-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-sky-200/80 dark:border-slate-700 shadow-md space-y-3 animate-fadeIn"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                              <span>Nombre</span>
                              <span className="text-[10px] text-slate-400 font-normal">🔒 Cuenta</span>
                            </label>
                            <input
                              type="text"
                              value={nombreContacto}
                              readOnly
                              tabIndex={-1}
                              placeholder="Tu nombre completo"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 cursor-not-allowed select-none focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                              <span>Correo institucional</span>
                              <span className="text-[10px] text-slate-400 font-normal">🔒 Cuenta</span>
                            </label>
                            <input
                              type="email"
                              value={emailContacto}
                              readOnly
                              tabIndex={-1}
                              placeholder="tu_correo@uct.cl"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 cursor-not-allowed select-none focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Asunto
                          </label>
                          <select
                            value={asuntoContacto}
                            onChange={(e) => setAsuntoContacto(e.target.value)}
                            disabled={enviandoContacto}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00629B]"
                          >
                            <option value="Guías temáticas">1. Guías temáticas</option>
                            <option value="Sugerencias">2. Sugerencias</option>
                            <option value="Reclamos">3. Reclamos</option>
                            <option value="Bases de datos">4. Bases de datos</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Mensaje
                          </label>
                          <textarea
                            rows={3}
                            maxLength={500}
                            value={mensajeContacto}
                            onChange={(e) => setMensajeContacto(e.target.value)}
                            placeholder="Escribe tu mensaje para el soporte..."
                            disabled={enviandoContacto}
                            required
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00629B] resize-none"
                          />
                          <div className="flex justify-end text-[10px] text-slate-400 mt-0.5">
                            <span>{mensajeContacto.length}/500</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={!mensajeContacto.trim() || enviandoContacto}
                            className="flex-1 py-2 px-3 bg-gradient-to-r from-[#00629B] to-[#0082B3] hover:from-[#004B75] hover:to-[#00629B] disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {enviandoContacto ? (
                              <span>Enviando al soporte...</span>
                            ) : (
                              <>
                                <span>📧</span>
                                <span>Enviar correo al soporte</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={volverAlMenuPrincipal}
                            disabled={enviandoContacto}
                            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}

                    {msg.mostrarBotonMenu && (
                      <div className="mt-2.5 animate-fadeIn">
                        <button
                          type="button"
                          onClick={volverAlMenuPrincipal}
                          className="py-1.5 px-3 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#00629B] dark:text-sky-300 border border-sky-200 dark:border-slate-700 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>🏠</span>
                          <span>Volver al menú principal</span>
                        </button>
                      </div>
                    )}

                    {(() => {
                      const esUltimo = index === mensajes.length - 1;
                      if (!esUltimo || !msg.esBot || msg.texto === 'Escribiendo...') return null;

                      if (detectarPreguntaEliminar(msg.texto) && (!cardData || cardData.tipo !== 'cancelada')) {
                        return (
                          <div className="flex items-center gap-2 mt-2 pt-1 animate-fadeIn">
                            <button
                              type="button"
                              onClick={() => enviarMensajeTexto("Sí, deseo cancelar la reserva")}
                              disabled={cargandoBot}
                              className="py-2 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <span>🗑️</span>
                              <span>Sí</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => enviarMensajeTexto("No, no deseo cancelarla")}
                              disabled={cargandoBot}
                              className="py-2 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                              No
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {cardData && (cardData.tipo === 'confirmada' || cardData.tipo === 'cancelada') && (
                      <div className={`max-w-[90%] mt-2 rounded-2xl border p-3.5 shadow-lg shadow-sky-950/5 text-xs space-y-2.5 backdrop-blur-lg ${cardData.tipo === 'cancelada'
                        ? 'border-rose-200/90 bg-rose-50/40 dark:bg-rose-950/40 dark:border-rose-900/70'
                        : 'border-sky-200/80 bg-white/90 dark:bg-slate-800/95 dark:border-slate-700'
                        }`}>
                        <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-700/60">
                          <span className={`font-bold flex items-center gap-1.5 ${cardData.tipo === 'confirmada'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                            }`}>
                            <span>{cardData.tipo === 'confirmada' ? '✅' : '🗑️'}</span>
                            <span>{cardData.tipo === 'confirmada' ? 'Reserva Confirmada' : 'Reserva Cancelada'}</span>
                          </span>
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${cardData.tipo === 'cancelada'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                            }`}>
                            {cardData.tipo === 'cancelada' ? 'Liberada' : 'Confirmada'}
                          </span>
                        </div>

                        {cardData.tipo === 'cancelada' && !tieneDetalles ? (
                          <div className="rounded-xl border border-rose-100 bg-white/80 dark:bg-slate-900/80 dark:border-rose-900/50 p-3 text-[11px] text-slate-700 dark:text-slate-200 space-y-1.5 shadow-xs">
                            <p className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                              <span>✓</span> Cubículo liberado en el sistema
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                              La reserva fue eliminada con éxito. Tu cupo quedó libre para que puedas agendar un nuevo bloque cuando lo requieras.
                            </p>
                          </div>
                        ) : (
                          <div className={`grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl border ${cardData.tipo === 'cancelada'
                            ? 'bg-white/80 border-rose-100 dark:bg-slate-900/80 dark:border-rose-900/50'
                            : 'bg-slate-50/80 border-slate-100 dark:bg-slate-900/80 dark:border-slate-700/70'
                            }`}>
                            <div>
                              <p className="text-slate-400 dark:text-slate-400 font-medium">Sede / Campus:</p>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{cardData.campus || (cardData.tipo === 'cancelada' ? "Liberada" : "Sede seleccionada")}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 dark:text-slate-400 font-medium">Cubículo:</p>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{cardData.cubiculo || (cardData.tipo === 'cancelada' ? "Liberado" : "Asignado")}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 dark:text-slate-400 font-medium">Fecha:</p>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{cardData.fecha || (cardData.tipo === 'cancelada' ? "Cancelada" : "Fecha solicitada")}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 dark:text-slate-400 font-medium">Horario:</p>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{cardData.hora || (cardData.tipo === 'cancelada' ? "Cancelado" : "Bloque agendado")}</p>
                            </div>
                          </div>
                        )}

                        {cardData.tipo === 'confirmada' && (
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setIsChatOpen(false);
                                navigate('/mis-reservas');
                              }}
                              className="w-full py-2 px-3 bg-[#00629B] hover:bg-[#004B75] text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>📋</span> Ver en Mis Reservas
                            </button>
                          </div>
                        )}

                        {cardData.tipo === 'cancelada' && (
                          <div className="pt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => enviarMensajeTexto("Quiero agendar un cubículo")}
                              className="flex-1 py-2 px-3 bg-[#00629B] hover:bg-[#004B75] text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>📅</span> Agendar nueva reserva
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsChatOpen(false);
                                navigate('/mis-reservas');
                              }}
                              className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                            >
                              Mis reservas
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}

          {user && !cargandoBot && (
            <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 scrollbar-none">
              {esModoAdmin && (
                <>
                  {[
                    { label: "⏱️ Tolerancia 15m", texto: "¿Cuál es el margen de tolerancia para la validación presencial de cubículos?" },
                    { label: "🚫 Sanciones", texto: "¿Cuáles son las causales y duración de las suspensiones por inasistencia?" },
                    { label: "👥 Acompañantes", texto: "¿Qué normas aplican a los acompañantes de cubículos?" },
                    { label: "🛠️ Incidencias", texto: "¿Cómo se gestiona una incidencia técnica en un cubículo?" },
                    { label: "🏛️ Sedes y Horarios", texto: "¿Cuáles son los horarios de atención oficiales de las bibliotecas?" },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => enviarMensajeTexto(chip.texto)}
                      className="px-2.5 py-1 bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200/70 hover:border-[#FFC20E] rounded-full text-[11px] font-semibold text-slate-700 hover:text-sky-900 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:border-[#FFC20E] dark:text-slate-200 dark:hover:text-white whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                      {chip.label}
                    </button>
                  ))}
                </>
              )}
              {!esModoAdmin && seccionActiva === 'menu' && (
                <>
                  <button
                    type="button"
                    onClick={() => seleccionarOpcion('reservas')}
                    className="px-2.5 py-1 bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200/70 hover:border-[#FFC20E] rounded-full text-[11px] font-semibold text-slate-700 hover:text-sky-900 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:border-[#FFC20E] dark:text-slate-200 dark:hover:text-white whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    🏢 Gestionar reserva
                  </button>
                  <button
                    type="button"
                    onClick={() => seleccionarOpcion('contacto')}
                    className="px-2.5 py-1 bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200/70 hover:border-[#FFC20E] rounded-full text-[11px] font-semibold text-slate-700 hover:text-sky-900 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:border-[#FFC20E] dark:text-slate-200 dark:hover:text-white whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    📩 Contactar soporte
                  </button>
                  <button
                    type="button"
                    onClick={() => seleccionarOpcion('taller')}
                    className="px-2.5 py-1 bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200/70 hover:border-[#FFC20E] rounded-full text-[11px] font-semibold text-slate-700 hover:text-sky-900 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:border-[#FFC20E] dark:text-slate-200 dark:hover:text-white whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    🎓 Talleres
                  </button>
                  <button
                    type="button"
                    onClick={() => seleccionarOpcion('prestamos')}
                    className="px-2.5 py-1 bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200/70 hover:border-[#FFC20E] rounded-full text-[11px] font-semibold text-slate-700 hover:text-sky-900 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:border-[#FFC20E] dark:text-slate-200 dark:hover:text-white whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    📚 Préstamos
                  </button>
                </>
              )}
              {seccionActiva === 'reservas' && (
                <>
                  <button
                    type="button"
                    onClick={volverAlMenuPrincipal}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-full text-[11px] font-bold text-amber-900 dark:bg-amber-950/60 dark:hover:bg-amber-900 dark:border-amber-700 dark:text-amber-200 whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    🏠 Menú principal
                  </button>
                  {[
                    { label: "📍 San Juan Pablo II", texto: "Consultar disponibilidad en Campus San Juan Pablo II para hoy" },
                    { label: "📍 Derecho", texto: "Consultar disponibilidad en Campus Derecho para hoy" },
                    { label: "📍 Jaime Arellano", texto: "Consultar disponibilidad en Campus Jaime Arellano para hoy" },
                    { label: "🔍 Mis reservas", texto: "Muéstrame mis reservas activas" },
                    { label: "❌ Cancelar reserva", texto: "Deseo cancelar mi reserva" }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => enviarMensajeTexto(chip.texto)}
                      className="px-2.5 py-1 bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200/70 hover:border-[#FFC20E] rounded-full text-[11px] font-semibold text-slate-700 hover:text-sky-900 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:border-[#FFC20E] dark:text-slate-200 dark:hover:text-white whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                      {chip.label}
                    </button>
                  ))}
                </>
              )}
              {seccionActiva === 'contacto' && (
                <button
                  type="button"
                  onClick={volverAlMenuPrincipal}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-full text-[11px] font-bold text-amber-900 dark:bg-amber-950/60 dark:hover:bg-amber-900 dark:border-amber-700 dark:text-amber-200 whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-2xs"
                >
                  🏠 Menú principal
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleEnviarMensaje} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md flex items-center space-x-2">
            {escuchandoVoz ? (
              <div className="flex-1 flex items-center justify-between px-3.5 py-2.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 rounded-2xl shadow-inner min-w-0">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 truncate">
                    {nuevoMensaje ? nuevoMensaje : "Escuchando... habla ahora"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 h-6">
                  {[4, 12, 18, 8, 22, 14, 24, 7, 16, 10, 20].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full animate-audio-wave"
                      style={{
                        animationDelay: `${i * 90}ms`,
                        height: `${h}px`
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  maxLength={300}
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  disabled={!user || cargandoBot}
                  placeholder={
                    !user
                      ? "Debes iniciar sesión para chatear..."
                      : cargandoBot
                        ? "Esperando respuesta del asistente..."
                        : esModoAdmin
                          ? "Consulta sobre el reglamento o normativas oficiales..."
                          : seccionActiva === 'contacto'
                            ? "Escribe o usa el formulario arriba..."
                            : "Ej: Reservar en San Juan Pablo II hoy a las 11:00..."
                  }
                  className="w-full px-4 py-2.5 pr-14 text-sm border border-slate-200 bg-slate-50/70 focus:bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00629B] transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/80 dark:focus:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-600"
                />
                {nuevoMensaje.length >= 200 && (
                  <span className="absolute right-3 text-[10px] font-mono text-slate-400 dark:text-slate-500 pointer-events-none">
                    {nuevoMensaje.length}/300
                  </span>
                )}
              </div>
            )}

            {user && (
              <div className="relative flex items-center justify-center shrink-0">
                {escuchandoVoz && (
                  <>
                    <span className="absolute -inset-1 rounded-2xl bg-rose-500/40 animate-audio-ripple pointer-events-none" />
                    <span className="absolute -inset-2 rounded-2xl bg-rose-500/25 animate-audio-ripple pointer-events-none" style={{ animationDelay: "450ms" }} />
                  </>
                )}
                <button
                  type="button"
                  onClick={toggleDictadoPorVoz}
                  onMouseDown={handleMicMouseDown}
                  onMouseUp={handleMicMouseUp}
                  onMouseLeave={handleMicMouseUp}
                  onTouchStart={handleMicMouseDown}
                  onTouchEnd={handleMicMouseUp}
                  disabled={cargandoBot}
                  title={escuchandoVoz ? "Soltar o presionar para enviar" : "Mantén presionado o presiona para hablar"}
                  className={`relative p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center cursor-pointer ${escuchandoVoz
                    ? "bg-rose-500 text-white scale-110 shadow-[0_0_24px_rgba(244,63,94,0.7)] ring-4 ring-rose-400/40"
                    : "bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 shadow-sm hover:scale-105 active:scale-95"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <svg className={`w-5 h-5 transition-transform ${escuchandoVoz ? "scale-110" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
                  </svg>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={!user || cargandoBot || !nuevoMensaje.trim()}
              className="bg-gradient-to-r from-[#00629B] to-[#0082B3] hover:from-[#004B75] hover:to-[#00629B] text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-md shadow-sky-900/15 cursor-pointer disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed shrink-0"
            >
              {cargandoBot ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setIsChatOpen((prev) => !prev)}
        className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-2 border-[#FFC20E] shadow-[0_10px_30px_rgba(0,98,155,0.3)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:scale-110 flex items-center justify-center p-1.5 cursor-pointer overflow-hidden group ring-4 ring-[#00629B]/10 dark:ring-sky-400/20"
        title="Abrir Asistente Virtual UCT"
      >
        <img
          src={logoUCT}
          alt="Logo UCT Asistente Virtual"
          className="w-full h-full object-cover scale-125 rounded-full transition-transform group-hover:rotate-6"
        />
      </button>
    </div>
  );
}