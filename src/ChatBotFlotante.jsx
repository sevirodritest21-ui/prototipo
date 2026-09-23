import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { apiPost, API_URL } from './services/api';

// Importar el logo desde la carpeta assets
import logoUCT from './assets/logoredondo.png';

// Generar sessionId determinista por RUT sin persistencia cruzada
const obtenerSessionId = (rut) => {
  if (!rut) return `anon_${Date.now()}`;
  const rutLimpio = String(rut).replace(/\./g, '').trim().toUpperCase();
  return `session_rut_${rutLimpio}`;
};

const extraerDatosReserva = (texto) => {
  if (!texto) return null;

  const esConfirmada = /reserva\s+(creada|confirmada|agendada|registrada|exitosa)|confirmada con éxito|agendado con éxito/i.test(texto);
  const esPreguntaConfirmar = /¿deseas confirmar|para confirmar|¿confirmas|deseas que confirme|¿estás seguro de (cancelar|eliminar)|¿deseas cancelar/i.test(texto);
  const esCancelada = /reserva\s+(cancelada|eliminada)|cancelada con éxito|eliminada con éxito/i.test(texto);

  if (!esConfirmada && !esPreguntaConfirmar && !esCancelada) {
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
  const cubMatch = texto.match(/cub[íi]culo\s*:?\s*([A-Za-z0-9\-_]+)/i) || texto.match(/\b(CUB[0-9A-Za-z\-_]*)\b/i);
  if (cubMatch) cubiculo = cubMatch[1];

  let fecha = null;
  const fechaMatch = texto.match(/\b(\d{4}-\d{2}-\d{2})\b/) || texto.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/) || texto.match(/\b(\d{1,2}\s+de\s+[a-zA-Z]+(?:\s+de\s+\d{4})?)\b/i);
  if (fechaMatch) fecha = fechaMatch[0];

  let hora = null;
  const horaMatch = texto.match(/\b(\d{1,2}:\d{2}(?:\s*(?:a|-)\s*\d{1,2}:\d{2})?)\s*(?:hrs|horas)?\b/i);
  if (horaMatch) hora = horaMatch[0];

  let id = null;
  const idMatch = texto.match(/reserva\s*(?:id|#|n[úu]mero)?\s*:?\s*(\d+)/i) || texto.match(/#(\d+)/);
  if (idMatch) id = idMatch[1];

  return {
    tipo: esConfirmada ? "confirmada" : esCancelada ? "cancelada" : "pendiente_confirmacion",
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [cargandoBot, setCargandoBot] = useState(false);
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const recognitionRef = useRef(null);

  // Referencia para el Auto-Scroll al final de la conversación
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Bajar automáticamente el scroll cada vez que cambien los mensajes o se abra el chat
  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [mensajes, isChatOpen]);

  useEffect(() => {
    if (!user) return;

    fetch(`${API_URL}/api/campus`)
      .then((res) => {
        if (!res.ok) throw new Error('Error al obtener los campus');
        return res.json();
      })
      .then((data) => {
        const nombresCampus = data.map((c) => c.nombre).join(', ');
        setMensajes([
          {
            id: 1,
            texto: `¡Hola, ${user.nombre}! 👋 Soy tu asistente de biblioteca UCT.\n\nPuedo ayudarte con lo siguiente:\n• 📅 Reservar un cubículo (indica fecha, horario y campus).\n• 🔍 Consultar disponibilidad de horarios y cubículos.\n• 📋 Ver tus reservas activas o historial.\n• ✏️ Modificar la fecha, hora o cubículo de una reserva.\n• ❌ Cancelar o liberar una reserva existente.\n• ℹ️ Resolver dudas sobre normas y horarios de biblioteca.\n\nCampus habilitados: ${nombresCampus || 'Campus San Juan Pablo II, Campus San Francisco'}.\n\n¿Qué te gustaría gestionar hoy?`,
            esBot: true
          }
        ]);
      })
      .catch(() => {
        setMensajes([
          {
            id: 1,
            texto: `¡Hola, ${user.nombre}! 👋 Soy tu asistente de biblioteca UCT.\n\nPuedo ayudarte con:\n• 📅 Reservar un cubículo de estudio.\n• 🔍 Consultar horarios y cubículos disponibles.\n• 📋 Revisar tus reservas activas.\n• ✏️ Modificar una reserva ya agendada.\n• ❌ Cancelar o liberar una reserva.\n• ℹ️ Información y normas de uso de la biblioteca.\n\n¿En qué te puedo ayudar hoy?`,
            esBot: true
          }
        ]);
      });
  }, [user]);

  useEffect(() => {
    const abrirChat = () => setIsChatOpen(true);
    window.addEventListener('open-chat', abrirChat);
    return () => window.removeEventListener('open-chat', abrirChat);
  }, []);

  // Limpiar historial de mensajes en pantalla cuando cambia el usuario autenticado
  useEffect(() => {
    if (user) {
      setMensajes([]);
    }
  }, [user?.id, user?.rut]);

  const enviarMensajeTexto = async (textoAEnviar) => {
    if (!user) {
      setIsChatOpen(false);
      navigate('/login');
      return;
    }
    if (!textoAEnviar.trim() || cargandoBot) return;

    const mensajeTexto = textoAEnviar;
    const mensajeUsuario = { id: Date.now(), texto: mensajeTexto, esBot: false };
    setMensajes((prev) => [...prev, mensajeUsuario]);
    setNuevoMensaje('');
    setCargandoBot(true);

    const botPensandoId = Date.now() + 1;
    setMensajes((prev) => [...prev, { id: botPensandoId, texto: 'Escribiendo...', esBot: true }]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const payload = {
        message: mensajeTexto,
        sessionId: obtenerSessionId(user.rut),
        rut: user.rut,
        nombre: user.nombre,
        email: user.email,
      };

      const data = await apiPost('/api/chat', payload, { 
        signal: controller.signal,
        timeout: 120000 
      });
      clearTimeout(timeoutId);

      let textoRespuesta = (data.response || '').replace(/Calling\s+[a-zA-Z0-9_\-]+(\s*with\s+input:)?\s*\{[\s\S]*?\}/gi, '').trim();
      if (!textoRespuesta) {
        textoRespuesta = 'Estoy procesando tu solicitud de cubículos. ¿En qué fecha, hora y sede te gustaría agendar?';
      }

      setMensajes((prev) =>
        prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: textoRespuesta } : msg)
      );
      window.dispatchEvent(new CustomEvent("reservaActualizada"));
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error al conectar con el bot:', error);

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

  const toggleDictadoPorVoz = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta entrada por voz.');
      return;
    }

    if (escuchandoVoz && recognitionRef.current) {
      recognitionRef.current.stop();
      setEscuchandoVoz(false);
      return;
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
    recognition.start();
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
        <div className="mb-4 w-[calc(100vw-2rem)] sm:w-[400px] h-[540px] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,98,155,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-sky-100 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right">
          <div className="bg-gradient-to-r from-[#004B75] via-[#00629B] to-[#007AB8] p-4 text-white flex justify-between items-center shadow-md relative border-b-2 border-[#FFC20E]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-inner">
                <img src={logoUCT} alt="UCT" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-extrabold text-sm tracking-tight text-white">Asistente Virtual</p>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-[#FFC20E] text-slate-900 tracking-wider">UCT</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${user ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${user ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
                  </span>
                  <p className="text-[11px] text-sky-100/90 font-medium">
                    {user ? user.nombre : 'Acceso Restringido'}
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
                let cardData = msg.esBot && msg.texto !== 'Escribiendo...' ? extraerDatosReserva(msg.texto) : null;

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
                    <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line backdrop-blur-md transition-all ${
                      msg.esBot
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-200/70 dark:border-slate-700/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                        : 'bg-gradient-to-r from-[#00629B] to-[#007AB8] text-white rounded-tr-sm shadow-[0_4px_16px_rgba(0,98,155,0.25)] border border-sky-400/30'
                    } ${msg.texto === 'Escribiendo...' ? 'text-slate-400 italic bg-white/50 dark:bg-slate-800/50 dark:text-slate-400 animate-pulse' : ''}`}>
                      {msg.texto}
                    </div>

                    {cardData && (
                      <div className={`max-w-[90%] mt-2 rounded-2xl border p-3.5 shadow-lg shadow-sky-950/5 text-xs space-y-2.5 backdrop-blur-lg ${
                        cardData.tipo === 'cancelada'
                          ? 'border-rose-200/90 bg-rose-50/40 dark:bg-rose-950/40 dark:border-rose-900/70'
                          : 'border-sky-200/80 bg-white/90 dark:bg-slate-800/95 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-700/60">
                          <span className={`font-bold flex items-center gap-1.5 ${
                            cardData.tipo === 'confirmada' ? 'text-emerald-700 dark:text-emerald-400' : cardData.tipo === 'cancelada' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            <span>{cardData.tipo === 'confirmada' ? '✅' : cardData.tipo === 'cancelada' ? '🗑️' : '⚡'}</span>
                            <span>{cardData.tipo === 'confirmada' ? 'Reserva Confirmada' : cardData.tipo === 'cancelada' ? 'Reserva Cancelada' : 'Confirmar Reserva'}</span>
                          </span>
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                            cardData.tipo === 'cancelada'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
                          }`}>
                            {cardData.tipo === 'cancelada' ? 'Liberada' : 'UCT'}
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
                          <div className={`grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl border ${
                            cardData.tipo === 'cancelada'
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

                        {cardData.tipo === 'pendiente_confirmacion' && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => enviarMensajeTexto("Sí, confirmo la reserva")}
                              disabled={cargandoBot}
                              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              ✓ Sí, Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => enviarMensajeTexto("No, deseo cancelar la solicitud")}
                              disabled={cargandoBot}
                              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-xl font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              ✕ Cancelar
                            </button>
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
              {[
                { label: "📅 Agendar cubículo", texto: "Quiero agendar un cubículo" },
                { label: "🔍 Ver mis reservas", texto: "Muéstrame mis reservas activas" },
                { label: "❓ Disponibilidad", texto: "Consultar disponibilidad para hoy" },
                { label: "❌ Cancelar reserva", texto: "Deseo cancelar mi reserva" }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => enviarMensajeTexto(chip.texto)}
                  className="px-2.5 py-1 bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200/70 hover:border-[#FFC20E] rounded-full text-[11px] font-semibold text-slate-700 hover:text-sky-900 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:border-[#FFC20E] dark:text-slate-200 dark:hover:text-white whitespace-nowrap transition-all cursor-pointer shadow-2xs"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleEnviarMensaje} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md flex items-center space-x-2">
            <input
              type="text"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              disabled={!user || cargandoBot}
              placeholder={
                !user
                  ? "Debes iniciar sesión para chatear..."
                  : escuchandoVoz
                    ? "🎙️ Escuchando... habla ahora..."
                    : cargandoBot
                      ? "Esperando respuesta del asistente..."
                      : "Pídeme una reserva (ej: mañana a las 10:00)..."
              }
              className={`flex-1 px-4 py-2.5 text-sm border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00629B] transition-all ${
                escuchandoVoz
                  ? "border-red-400 bg-red-50/50 text-red-900 placeholder:text-red-500 font-medium dark:bg-red-950/40 dark:text-red-200 dark:placeholder:text-red-400"
                  : "border-slate-200 bg-slate-50/70 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/80 dark:focus:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-600"
              }`}
            />
            {user && (
              <button
                type="button"
                onClick={toggleDictadoPorVoz}
                disabled={cargandoBot}
                title={escuchandoVoz ? "Detener dictado" : "Dictar mensaje por voz"}
                className={`p-2.5 rounded-2xl transition-all flex items-center justify-center cursor-pointer shadow-sm ${
                  escuchandoVoz
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    : "bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={!user || cargandoBot || !nuevoMensaje.trim()}
              className="bg-gradient-to-r from-[#00629B] to-[#0082B3] hover:from-[#004B75] hover:to-[#00629B] text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-md shadow-sky-900/15 cursor-pointer disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed"
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