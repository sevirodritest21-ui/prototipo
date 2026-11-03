const fs = require('fs');

const content = fs.readFileSync('frontend/src/pages/Dashboard.jsx', 'utf8');
const lines = content.split(/\r?\n/);

lines.forEach((l, idx) => {
  if (l.includes('estado_atencion') || l.includes('proyeccion_diaria') || l.includes('diaPrediccionSeleccionado') || l.includes('Cerrado')) {
    console.log(`[Dashboard.jsx:${idx+1}] ${l.trim()}`);
  }
});

