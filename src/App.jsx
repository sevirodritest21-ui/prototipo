import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import PaginaInicio from "./PaginaInicio";
import FormularioReserva from "./FormularioReserva";
import ChatbotFlotante from "./ChatbotFlotante";

function PaginaContacto() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 text-2xl">
          
        </div>

        <h2 className="mt-4 text-3xl font-bold text-white">
          Contacto
        </h2>

        <p className="mt-3 text-slate-400">
          Soporte técnico disponible para ayudarte con reservas y consultas.
        </p>

        <p className="mt-5 font-semibold text-sky-400">
          soporte@tudominio.com
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white font-bold">
                R
              </div>

              <span className="font-bold text-white text-lg">
                BiblotecaIA
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium">
              <Link
                to="/"
                className="rounded-xl px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                Inicio
              </Link>

              <Link
                to="/reservar"
                className="rounded-xl px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                Reservar
              </Link>

              <Link
                to="/contacto"
                className="rounded-xl px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                Contacto
              </Link>
            </div>

          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<PaginaInicio />} />
        <Route path="/reservar" element={<FormularioReserva />} />
        <Route path="/contacto" element={<PaginaContacto />} />
      </Routes>

      <ChatbotFlotante />

    </Router>
  );
}