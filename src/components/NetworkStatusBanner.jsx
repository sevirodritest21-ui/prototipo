import React, { useState, useEffect } from "react";

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <aside aria-label="Estado de la conexión" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto">
      {!isOnline ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 text-white shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5)] border border-amber-500/30 backdrop-blur-md animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <div className="text-xs">
            <p className="font-bold text-amber-300">Conexión inestable o sin internet</p>
            <p className="text-slate-300 text-[11px]">Reintentando automáticamente al volver la señal...</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="ml-2 text-[11px] font-bold px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg cursor-pointer transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-900/95 text-emerald-100 shadow-[0_12px_36px_-10px_rgba(5,150,105,0.4)] border border-emerald-500/30 backdrop-blur-md">
          <span className="text-sm">✓</span>
          <span className="text-xs font-semibold">Conexión a internet restablecida</span>
        </div>
      )}
    </aside>
  );
}
