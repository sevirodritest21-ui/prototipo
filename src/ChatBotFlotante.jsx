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

export default function ChatbotFlotante() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  // Referencia para el Auto-Scroll al final de la conversación
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Efecto para bajar automáticamente el scroll cada vez que cambien los mensajes o se abra el chat
  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [mensajes, isChatOpen]);

  // Cargar saludo inicial solo si el estudiante está autenticado
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
            texto: `¡Hola, ${user.nombre}! 👋 Soy tu asistente de biblioteca.\n\n✅ Estás autenticado como ${user.rol} (RUT: ${user.rut || 'Registrado'}).\n\n📅 Dime qué fecha, hora y campus (Disponibles: ${nombresCampus || 'Campus San Juan Pablo II, Campus San Francisco'}) deseas para agendar tu cubículo.`,
            esBot: true
          }
        ]);
      })
      .catch(() => {
        setMensajes([
          {
            id: 1,
            texto: `¡Hola, ${user.nombre}! 👋 Estás autenticado. Dime la fecha, hora y campus que necesitas para tu reserva.`,
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

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!user) {
      setIsChatOpen(false);
      navigate('/login');
      return;
    }
    if (!nuevoMensaje.trim()) return;

    const mensajeTexto = nuevoMensaje;
    const mensajeUsuario = { id: Date.now(), texto: mensajeTexto, esBot: false };
    setMensajes((prev) => [...prev, mensajeUsuario]);
    setNuevoMensaje('');

    const botPensandoId = Date.now() + 1;
    setMensajes((prev) => [...prev, { id: botPensandoId, texto: 'Escribiendo...', esBot: true }]);

    try {
      const payload = {
        message: mensajeTexto,
        sessionId: obtenerSessionId(user.rut),
        rut: user.rut,
        nombre: user.nombre,
        email: user.email,
      };

      const data = await apiPost('/api/chat', payload);
      setMensajes((prev) =>
        prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: data.response } : msg)
      );
      window.dispatchEvent(new CustomEvent("reservaActualizada"));
    } catch (error) {
      console.error('Error al conectar con el bot:', error);
      let errorMsg = 'Lo siento, tuve un problema al procesar tu mensaje. Inténtalo de nuevo.';
      
      if (error?.message?.includes('401')) {
        errorMsg = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
      } else if (error?.detail) {
        errorMsg = error.detail;
      } else if (error?.message && !error.message.includes('HTTP error')) {
        errorMsg = error.message;
      }

      setMensajes((prev) =>
        prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: errorMsg } : msg)
      );
    }
  };

  const irALogin = () => {
    setIsChatOpen(false);
    navigate('/login');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isChatOpen && (
        <div className="mb-4 w-[calc(100vw-2rem)] sm:w-96 h-[520px] rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right">
          {/* Header del Chatbot */}
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

          {/* Cuerpo del Chatbot */}
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
              {mensajes.map((msg) => (
                <div key={msg.id} className={`flex ${msg.esBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${msg.esBot
                    ? 'bg-white text-slate-700 rounded-tl-none border border-slate-200/60 shadow-sm shadow-slate-100'
                    : 'bg-[#00629B] text-white rounded-tr-none shadow-md'
                    } ${msg.texto === 'Escribiendo...' ? 'text-slate-400 italic bg-slate-100/50 animate-pulse' : ''}`}>
                    {msg.texto}
                  </div>
                </div>
              ))}
              {/* Elemento invisible para forzar el autoscroll hacia abajo */}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Formulario de Entrada */}
          <form onSubmit={handleEnviarMensaje} className="p-3 border-t border-slate-100 bg-white flex space-x-2">
            <input
              type="text"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              disabled={!user}
              placeholder={user ? "Pídeme una reserva (ej: mañana a las 10:00)..." : "Debes iniciar sesión para chatear..."}
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A3E0] bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!user}
              className="bg-[#00A3E0] hover:bg-[#0082B3] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* Botón Flotante con la imagen del Logo UCT */}
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