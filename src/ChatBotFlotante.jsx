import React, { useState, useEffect } from 'react';

const obtenerSessionId = () => {
  let sId = sessionStorage.getItem('chat_session_id');
  if (!sId) {
    sId = 'session_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    sessionStorage.setItem('chat_session_id', sId);
  }
  return sId;
};

export default function ChatbotFlotante() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mensajes, setMensajes] = useState([
    {
      id: 1,
      texto: '¡Hola! 👋 Soy tu asistente virtual de biblioteca.\n\n📅 Para agendar un cubículo, necesitaré los siguientes datos:\n• Nombre completo\n• RUT\n• Campus de preferencia\n• Fecha de reserva\n• Hora de reserva\n\n🏫 Cargando campus disponibles...',
      esBot: true
    }
  ]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');


  useEffect(() => {
    fetch('http://localhost:8000/api/campus')
      .then((res) => {
        if (!res.ok) throw new Error('Error al obtener los campus');
        return res.json();
      })
      .then((data) => {
        const nombresCampus = data.map((c) => c.nombre).join(', ');

        setMensajes((prev) => [
          {
            id: 1,
            texto: `¡Hola! 👋 Soy tu asistente virtual de biblioteca.\n\n📅 Para agendar un cubículo, necesitaré los siguientes datos:\n• Nombre completo\n• RUT\n• Campus de preferencia (Disponibles: ${nombresCampus || 'Campus A, Campus B'})\n• Fecha de reserva\n• Hora de reserva\n\n💬 Si ya tienes una reserva y deseas consultarla o eliminarla, o si tienes alguna pregunta general sobre la biblioteca, ¡solo escríbeme y te ayudaré!`,
            esBot: true
          }
        ]);
      })
      .catch((err) => {
        console.error('Error al cargar la lista de campus:', err);
        setMensajes((prev) => [
          {
            id: 1,
            texto: `¡Hola! 👋 Soy tu asistente virtual de biblioteca.\n\n📅 Para agendar un cubículo, necesitaré los siguientes datos:\n• Nombre completo\n• RUT\n• Campus de preferencia (Disponibles: Campus A, Campus B)\n• Fecha de reserva\n• Hora de reserva\n\n💬 Si ya tienes una reserva y deseas consultarla o eliminarla, o si tienes alguna pregunta general, ¡escríbeme y te responderé!`,
            esBot: true
          }
        ]);
      });
  }, []);

  useEffect(() => {
    const abrirChat = () => setIsChatOpen(true);
    window.addEventListener('open-chat', abrirChat);
    return () => window.removeEventListener('open-chat', abrirChat);
  }, []);

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    const mensajeTexto = nuevoMensaje;
    const mensajeUsuario = { id: Date.now(), texto: mensajeTexto, esBot: false };
    setMensajes((prev) => [...prev, mensajeUsuario]);
    setNuevoMensaje('');

    const botPensandoId = Date.now() + 1;
    setMensajes((prev) => [...prev, { id: botPensandoId, texto: 'Escribiendo...', esBot: true }]);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: mensajeTexto,
          sessionId: obtenerSessionId()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMensajes((prev) =>
          prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: data.response } : msg)
        );
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error al conectar con el bot:', error);
      setMensajes((prev) =>
        prev.map((msg) => msg.id === botPensandoId ? { ...msg, texto: 'Lo siento, tuve un problema al procesar tu mensaje. Inténtalo de nuevo.' } : msg)
      );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isChatOpen && (
        <div className="mb-4 w-[calc(100vw-2rem)] sm:w-96 h-[520px] rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right">
          <div className="bg-sky-600 p-4 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center space-x-3">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              </div>
              <div>
                <p className="font-semibold text-sm tracking-wide leading-tight">Asistente Virtual</p>
                <p className="text-[11px] text-sky-100">En línea</p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-sky-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-sky-700/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

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

          <form onSubmit={handleEnviarMensaje} className="p-3 border-t border-slate-100 bg-white flex space-x-2">
            <input
              type="text"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-50"
            />
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center shadow-md shadow-sky-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-xl shadow-sky-200 hover:bg-sky-700 hover:border-2 hover:border-amber-400 transition-all duration-300 transform hover:scale-105 active:scale-95"
      >
        {isChatOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        )}
      </button>
    </div>
  );
}