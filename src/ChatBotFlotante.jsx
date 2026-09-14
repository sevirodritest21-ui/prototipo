import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { apiPost } from './services/api';

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

  return {
    tipo: esConfirmada ? "confirmada" : esCancelada ? "cancelada" : "pendiente_confirmacion",
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

    fetch('http://localhost:8000/api/campus')
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

      const data = await apiPost('/api/chat', payload, { signal: controller.signal });
      clearTimeout(timeoutId);

      setMensajes((prev) =>
        prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: data.response } : msg)
      );
      window.dispatchEvent(new CustomEvent("reservaActualizada"));
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error al conectar con el bot:', error);
      let errorMsg = 'Lo siento, tuve un problema al procesar tu mensaje. Inténtalo de nuevo.';

      if (error.name === 'AbortError') {
        errorMsg = 'La respuesta del asistente está tomando más tiempo del habitual. La solicitud continúa procesándose, te sugiero revisar tus reservas en unos momentos.';
      } else if (error?.message?.includes('401')) {
        errorMsg = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
      } else if (error?.detail) {
        errorMsg = error.detail;
      } else if (error?.message && !error.message.includes('HTTP error')) {
        errorMsg = error.message;
      }

      setMensajes((prev) =>
        prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: errorMsg } : msg)
      );
    } finally {
      setCargandoBot(false);
    }
  };

  const handleEnviarMensaje = (e) => {
    e.preventDefault();
    enviarMensajeTexto(nuevoMensaje);
  };

  const irALogin = () => {
    setIsChatOpen(false);
    navigate('/login');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isChatOpen && (
        <div className="mb-4 w-[calc(100vw-2rem)] sm:w-96 h-[520px] rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right">
          <div className="bg-[#00629B] p-4 text-white flex justify-between items-center shadow-md border-b-2 border-[#00A3E0]">
            <div className="flex items-center space-x-3">
              <div className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${user ? 'bg-[#7AB800]' : 'bg-rose-300'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${user ? 'bg-[#7AB800]' : 'bg-rose-400'}`}></span>
              </div>
              <div>
                <p className="font-semibold text-sm tracking-wide leading-tight">Asistente Virtual IA</p>
                <p className="text-[11px] text-sky-100">
                  {user ? `${user.nombre}` : 'Acceso Restringido (Requiere Login)'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-sky-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-[#00A3E0]/50 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!user ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-slate-50">
              <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center mb-4 text-2xl shadow-inner">
                🔒
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Chatbot Bloqueado
              </h3>
              <p className="text-xs text-slate-500 mb-6 max-w-xs leading-relaxed">
                Debes iniciar sesión con tu cuenta institucional para utilizar el asistente virtual IA y solicitar reservas de cubículos.
              </p>
              <button
                onClick={irALogin}
                className="w-full max-w-xs py-2.5 px-4 bg-[#00A3E0] hover:bg-[#0082B3] text-white rounded-xl font-semibold text-sm transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>🔑 Iniciar Sesión</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/80">
              {mensajes.map((msg) => {
                const cardData = msg.esBot && msg.texto !== 'Escribiendo...' ? extraerDatosReserva(msg.texto) : null;

                return (
                  <div key={msg.id} className={`flex flex-col ${msg.esBot ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${msg.esBot
                      ? 'bg-white text-slate-700 rounded-tl-none border border-slate-200/60 shadow-sm shadow-slate-100'
                      : 'bg-[#00629B] text-white rounded-tr-none shadow-md'
                      } ${msg.texto === 'Escribiendo...' ? 'text-slate-400 italic bg-slate-100/50 animate-pulse' : ''}`}>
                      {msg.texto}
                    </div>

                    {cardData && (
                      <div className="max-w-[88%] mt-2 rounded-2xl border p-3.5 shadow-md text-xs space-y-2.5 bg-gradient-to-br from-white to-slate-50 border-sky-200">
                        <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                          <span className={`font-bold flex items-center gap-1.5 ${cardData.tipo === 'confirmada' ? 'text-emerald-700' : cardData.tipo === 'cancelada' ? 'text-rose-600' : 'text-amber-700'}`}>
                            <span>{cardData.tipo === 'confirmada' ? '✅' : cardData.tipo === 'cancelada' ? '🗑️' : '⚡'}</span>
                            <span>{cardData.tipo === 'confirmada' ? 'Reserva Confirmada' : cardData.tipo === 'cancelada' ? 'Reserva Cancelada' : 'Confirmar Reserva'}</span>
                          </span>
                          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Biblioteca UCT
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-slate-400 font-medium">Sede / Campus:</p>
                            <p className="font-bold text-slate-800">{cardData.campus || "Sede seleccionada"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-medium">Cubículo:</p>
                            <p className="font-bold text-slate-800">{cardData.cubiculo || "Asignado"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-medium">Fecha:</p>
                            <p className="font-bold text-slate-800">{cardData.fecha || "Fecha solicitada"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-medium">Horario:</p>
                            <p className="font-bold text-slate-800">{cardData.hora || "Bloque agendado"}</p>
                          </div>
                        </div>

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
                              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
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
                              className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>📋</span> Ver en Mis Reservas
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
            <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto bg-white border-t border-slate-100 scrollbar-none">
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
                  className="px-2.5 py-1 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-full text-[11px] font-semibold text-slate-700 hover:text-sky-700 whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleEnviarMensaje} className="p-3 border-t border-slate-100 bg-white flex space-x-2">
            <input
              type="text"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              disabled={!user || cargandoBot}
              placeholder={
                !user
                  ? "Debes iniciar sesión para chatear..."
                  : cargandoBot
                    ? "Esperando respuesta del asistente..."
                    : "Pídeme una reserva (ej: mañana a las 10:00)..."
              }
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A3E0] bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!user || cargandoBot}
              className="bg-[#00A3E0] hover:bg-[#0082B3] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {cargandoBot ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsChatOpen((prev) => !prev)}
        className="w-16 h-16 rounded-full bg-white border-2 border-[#00A3E0] shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center p-1.5 cursor-pointer overflow-hidden group"
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