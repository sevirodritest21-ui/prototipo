import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { apiPost } from './services/api';

// Reemplaza la función obtenerSessionId por esta:
const obtenerSessionId = (userId) => {
  const claveStorage = `chat_session_id_${userId || 'anon'}`;
  let sId = sessionStorage.getItem(claveStorage);
  if (!sId) {
    sId = 'session_' + (userId || 'anon') + '_' + Date.now();
    sessionStorage.setItem(claveStorage, sId);
  }
  return sId;
};

export default function ChatbotFlotante() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');

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
      setMensajes([]); // Reinicia la conversación visual del bot
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
        sessionId: obtenerSessionId(user.id || user.rut),
        rut: user.rut,
        nombre: user.nombre,
        email: user.email,
      };

      // Utilizar apiPost que inyecta automáticamente el token JWT en Authorization Header
      const data = await apiPost('/api/chat', payload);
      setMensajes((prev) =>
        prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: data.response } : msg)
      );
    } catch (error) {
      console.error('Error al conectar con el bot:', error);
      const errorMsg = error.message.includes('401')
        ? 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
        : 'Lo siento, tuve un problema al procesar tu mensaje. Inténtalo de nuevo.';

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
          <div className="bg-sky-600 p-4 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center space-x-3">
              <div className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${user ? 'bg-amber-300' : 'bg-rose-300'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${user ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
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
              className="text-sky-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-sky-700/50 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cuerpo del Chatbot: Si NO está logueado, muestra tarjeta de bloqueo */}
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
                className="w-full max-w-xs py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-sky-500/20 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>🔑 Iniciar Sesión</span>
              </button>
            </div>
          ) : (
            /* Lista de Mensajes cuando el usuario está Autenticado */
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/80">
              {mensajes.map((msg) => (
                <div key={msg.id} className={`flex ${msg.esBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${msg.esBot
                    ? 'bg-white text-slate-700 rounded-tl-none border border-slate-200/60 shadow-sm shadow-slate-100'
                    : 'bg-sky-600 text-white rounded-tr-none shadow-md shadow-sky-100'
                    } ${msg.texto === 'Escribiendo...' ? 'text-slate-400 italic bg-slate-100/50 animate-pulse' : ''}`}>
                    {msg.texto}
                  </div>
                </div>
              ))}
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
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!user}
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* Botón Flotante de Apertura */}
      <button
        onClick={() => setIsChatOpen((prev) => !prev)}
        className="bg-gradient-to-r from-sky-500 to-sky-700 hover:from-sky-600 hover:to-sky-800 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center space-x-2 border-2 border-white/20 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.81-.54.75.75 0 01.144-.792 4.004 4.004 0 00.973-2.122A8.134 8.134 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </button>
    </div>
  );
}

