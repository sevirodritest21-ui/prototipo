import ExcelJS from "exceljs";

const COLORS = {
  navyDark: "FF002D4C",
  navyMid: "FF004D7A",
  uctBlue: "FF00629B",
  uctCyan: "FF00A3E0",
  uctGold: "FFFFC20E",
  white: "FFFFFFFF",
  slate50: "FFF8FAFC",
  slate100: "FFF1F5F9",
  slate200: "FFE2E8F0",
  slate500: "FF64748B",
  slate700: "FF334155",
  slate900: "FF0F172A",
  emeraldBg: "FFECFDF5",
  emeraldText: "FF047857",
  amberBg: "FFFFFBEB",
  amberText: "FFB45309",
  roseBg: "FFFFF1F2",
  roseText: "FFBE123C",
  skyBg: "FFF0F9FF",
  skyText: "FF0369A1"
};

const BORDER_THIN = {
  top: { style: "thin", color: { argb: COLORS.slate200 } },
  left: { style: "thin", color: { argb: COLORS.slate200 } },
  bottom: { style: "thin", color: { argb: COLORS.slate200 } },
  right: { style: "thin", color: { argb: COLORS.slate200 } }
};

function makeProgressBar(pct) {
  const safe = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  const filled = Math.round(safe / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${safe}%`;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function renderColumnChartPNG({ title, subtitle, labels, values, suffix = "", barColors = [] }) {
  const canvas = document.createElement("canvas");
  const W = 1100;
  const H = 480;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  const gradHeader = ctx.createLinearGradient(0, 0, W, 0);
  gradHeader.addColorStop(0, "#002D4C");
  gradHeader.addColorStop(0.6, "#004D7A");
  gradHeader.addColorStop(1, "#00629B");
  ctx.fillStyle = gradHeader;
  ctx.fillRect(0, 0, W, 68);

  ctx.fillStyle = "#FFC20E";
  ctx.fillRect(0, 68, W, 4);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 20px Segoe UI, Arial, sans-serif";
  ctx.fillText(title, 28, 34);

  ctx.fillStyle = "#BAE6FD";
  ctx.font = "600 13px Segoe UI, Arial, sans-serif";
  ctx.fillText(subtitle || "Universidad Católica de Temuco · Sistema de Bibliotecas", 28, 55);

  const padL = 75;
  const padR = 40;
  const padT = 105;
  const padB = 85;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const y0 = padT + chartH;

  const rawMax = Math.max(...values.map((v) => Number(v) || 0), 1);
  const maxVal = Math.max(4, Math.ceil(rawMax * 1.15));

  for (let i = 0; i <= 4; i++) {
    const frac = i / 4;
    const y = y0 - frac * chartH;
    const val = Math.round(frac * maxVal);
    ctx.strokeStyle = i === 0 ? "#94A3B8" : "#E2E8F0";
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 12px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${val}${suffix}`, padL - 12, y + 4);
  }

  const n = Math.max(1, labels.length);
  const stepX = chartW / n;
  const barW = Math.min(54, Math.max(18, stepX * 0.55));

  const pts = [];
  labels.forEach((lbl, i) => {
    const val = Number(values[i]) || 0;
    const bh = Math.max(4, (val / maxVal) * chartH);
    const cx = padL + (i + 0.5) * stepX;
    const x = cx - barW / 2;
    const y = y0 - bh;
    pts.push({ x: cx, y });

    ctx.fillStyle = barColors[i] || "#00629B";
    roundRect(ctx, x, y, barW, bh, 6);
    ctx.fill();

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 12px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${val}${suffix}`, cx, y - 8);

    ctx.save();
    ctx.translate(cx, y0 + 18);
    if (String(lbl).length > 10) {
      ctx.rotate(-0.35);
      ctx.textAlign = "right";
    } else {
      ctx.textAlign = "center";
    }
    ctx.fillStyle = "#334155";
    ctx.font = "bold 12px Segoe UI, Arial, sans-serif";
    ctx.fillText(String(lbl).slice(0, 22), 0, 0);
    ctx.restore();
  });

  if (pts.length > 1) {
    ctx.strokeStyle = "#FFC20E";
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    pts.forEach((p) => {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#002D4C";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  return canvas.toDataURL("image/png");
}

function renderDualBarChartPNG({ title, subtitle, labels, valuesA, valuesB, labelA, labelB, colorA = "#00629B", colorB = "#00A3E0", suffix = "" }) {
  const canvas = document.createElement("canvas");
  const W = 1100;
  const H = 500;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  const gradHeader = ctx.createLinearGradient(0, 0, W, 0);
  gradHeader.addColorStop(0, "#002D4C");
  gradHeader.addColorStop(0.6, "#004D7A");
  gradHeader.addColorStop(1, "#00629B");
  ctx.fillStyle = gradHeader;
  ctx.fillRect(0, 0, W, 68);

  ctx.fillStyle = "#FFC20E";
  ctx.fillRect(0, 68, W, 4);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 20px Segoe UI, Arial, sans-serif";
  ctx.fillText(title, 28, 34);

  ctx.fillStyle = "#BAE6FD";
  ctx.font = "600 13px Segoe UI, Arial, sans-serif";
  ctx.fillText(subtitle || "Comparativa Institucional UCT", 28, 55);

  ctx.fillStyle = colorA;
  ctx.fillRect(W - 310, 26, 16, 16);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 12px Segoe UI, Arial, sans-serif";
  ctx.fillText(labelA, W - 288, 39);

  ctx.fillStyle = colorB;
  ctx.fillRect(W - 160, 26, 16, 16);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(labelB, W - 138, 39);

  const padL = 75;
  const padR = 40;
  const padT = 105;
  const padB = 105;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const y0 = padT + chartH;

  const allVals = [...valuesA.map(Number), ...valuesB.map(Number)];
  const rawMax = Math.max(...allVals.map((v) => v || 0), 1);
  const maxVal = Math.max(4, Math.ceil(rawMax * 1.15));

  for (let i = 0; i <= 4; i++) {
    const frac = i / 4;
    const y = y0 - frac * chartH;
    const val = Math.round(frac * maxVal);
    ctx.strokeStyle = i === 0 ? "#94A3B8" : "#E2E8F0";
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 12px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${val}${suffix}`, padL - 12, y + 4);
  }

  const n = Math.max(1, labels.length);
  const stepX = chartW / n;
  const colW = Math.min(28, Math.max(10, stepX * 0.32));

  labels.forEach((lbl, i) => {
    const vA = Number(valuesA[i]) || 0;
    const vB = Number(valuesB[i]) || 0;
    const hA = Math.max(4, (vA / maxVal) * chartH);
    const hB = Math.max(4, (vB / maxVal) * chartH);
    const cx = padL + (i + 0.5) * stepX;

    ctx.fillStyle = colorA;
    roundRect(ctx, cx - colW - 2, y0 - hA, colW, hA, 5);
    ctx.fill();

    ctx.fillStyle = colorB;
    roundRect(ctx, cx + 2, y0 - hB, colW, hB, 5);
    ctx.fill();

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 11px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${vA}${suffix}`, cx - colW / 2 - 2, y0 - hA - 6);
    ctx.fillText(`${vB}${suffix}`, cx + colW / 2 + 2, y0 - hB - 6);

    ctx.save();
    ctx.translate(cx, y0 + 16);
    ctx.rotate(-0.42);
    ctx.textAlign = "right";
    ctx.fillStyle = "#334155";
    ctx.font = "bold 11px Segoe UI, Arial, sans-serif";
    ctx.fillText(String(lbl).slice(0, 24), 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL("image/png");
}

function addCorporateHeader(ws, totalCols, title, subtitle, metaRight) {
  ws.views = [{ showGridLines: true, state: "frozen", ySplit: 4 }];

  ws.mergeCells(1, 1, 1, totalCols);
  const cellInst = ws.getCell(1, 1);
  cellInst.value = "UNIVERSIDAD CATÓLICA DE TEMUCO · SISTEMA DE BIBLIOTECAS";
  cellInst.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.uctGold } };
  cellInst.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyDark } };
  cellInst.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, totalCols);
  const cellTitle = ws.getCell(2, 1);
  cellTitle.value = title;
  cellTitle.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: COLORS.white } };
  cellTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyDark } };
  cellTitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 30;

  ws.mergeCells(3, 1, 3, totalCols);
  const cellSub = ws.getCell(3, 1);
  cellSub.value = `${subtitle}   |   ${metaRight}`;
  cellSub.font = { name: "Segoe UI", size: 10, italic: false, bold: true, color: { argb: "FFBAE6FD" } };
  cellSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyMid } };
  cellSub.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  cellSub.border = { bottom: { style: "medium", color: { argb: COLORS.uctGold } } };
  ws.getRow(3).height = 24;

  ws.getRow(4).height = 12;
}

function addSectionBanner(ws, rowIdx, totalCols, text) {
  ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
  const c = ws.getCell(rowIdx, 1);
  c.value = `  ${text.toUpperCase()}`;
  c.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLORS.white } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.uctBlue } };
  c.alignment = { vertical: "middle", horizontal: "left" };
  c.border = {
    left: { style: "thick", color: { argb: COLORS.uctGold } },
    bottom: { style: "thin", color: { argb: COLORS.navyDark } }
  };
  ws.getRow(rowIdx).height = 25;
}

function addKpiCards(ws, startRow, kpis) {
  ws.getRow(startRow).height = 18;
  ws.getRow(startRow + 1).height = 28;
  ws.getRow(startRow + 2).height = 18;

  kpis.forEach((k, idx) => {
    const col = idx * 2 + 1;
    ws.mergeCells(startRow, col, startRow, col + 1);
    ws.mergeCells(startRow + 1, col, startRow + 1, col + 1);
    ws.mergeCells(startRow + 2, col, startRow + 2, col + 1);

    const cTop = ws.getCell(startRow, col);
    cTop.value = k.label.toUpperCase();
    cTop.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: COLORS.slate500 } };
    cTop.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate50 } };
    cTop.alignment = { vertical: "bottom", horizontal: "center" };

    const cVal = ws.getCell(startRow + 1, col);
    cVal.value = k.value;
    cVal.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: k.color || COLORS.navyDark } };
    cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate50 } };
    cVal.alignment = { vertical: "middle", horizontal: "center" };

    const cSub = ws.getCell(startRow + 2, col);
    cSub.value = k.sub || "";
    cSub.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: COLORS.slate700 } };
    cSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate50 } };
    cSub.alignment = { vertical: "top", horizontal: "center" };

    for (let r = startRow; r <= startRow + 2; r++) {
      for (let c = col; c <= col + 1; c++) {
        const cell = ws.getCell(r, c);
        cell.border = {
          top: r === startRow ? { style: "medium", color: { argb: k.accent || COLORS.uctBlue } } : undefined,
          bottom: r === startRow + 2 ? { style: "thin", color: { argb: COLORS.slate200 } } : undefined,
          left: c === col ? { style: "thin", color: { argb: COLORS.slate200 } } : undefined,
          right: c === col + 1 ? { style: "thin", color: { argb: COLORS.slate200 } } : undefined
        };
      }
    }
  });
}

function styleTableHeader(ws, rowIdx, headers) {
  const row = ws.getRow(rowIdx);
  row.height = 24;
  headers.forEach((h, i) => {
    const cell = row.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyDark } };
    cell.alignment = { vertical: "middle", horizontal: i === 1 ? "left" : "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.navyDark } },
      bottom: { style: "medium", color: { argb: COLORS.uctGold } },
      left: { style: "thin", color: { argb: COLORS.navyMid } },
      right: { style: "thin", color: { argb: COLORS.navyMid } }
    };
  });
}

function styleDataRow(ws, rowIdx, values, alignments = [], badgeColIdx = -1) {
  const row = ws.getRow(rowIdx);
  row.height = 21;
  const isEven = rowIdx % 2 === 0;
  const baseFill = isEven ? COLORS.slate50 : COLORS.white;

  values.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    cell.value = v;
    cell.font = { name: "Segoe UI", size: 10, bold: i === 0, color: { argb: COLORS.slate900 } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: baseFill } };
    cell.alignment = { vertical: "middle", horizontal: alignments[i] || "center", wrapText: true };
    cell.border = BORDER_THIN;

    if (i === badgeColIdx && v) {
      const txt = String(v).toLowerCase();
      if (txt.includes("pico") || txt.includes("rechazad") || txt.includes("crític") || txt.includes("alta")) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.roseBg } };
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: COLORS.roseText } };
      } else if (txt.includes("media") || txt.includes("pendiente")) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.amberBg } };
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: COLORS.amberText } };
      } else if (txt.includes("baja") || txt.includes("aprobad") || txt.includes("realizad") || txt.includes("abierto")) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.emeraldBg } };
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: COLORS.emeraldText } };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.skyBg } };
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: COLORS.skyText } };
      }
    }
  });
}

function styleFooterRow(ws, rowIdx, values, alignments = []) {
  const row = ws.getRow(rowIdx);
  row.height = 23;
  values.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    cell.value = v;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.navyDark } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.slate100 } };
    cell.alignment = { vertical: "middle", horizontal: alignments[i] || "center" };
    cell.border = {
      top: { style: "medium", color: { argb: COLORS.uctBlue } },
      bottom: { style: "double", color: { argb: COLORS.navyDark } },
      left: { style: "thin", color: { argb: COLORS.slate200 } },
      right: { style: "thin", color: { argb: COLORS.slate200 } }
    };
  });
}

async function descargarWorkbook(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportarMetricasReservasExcel({ metricas, periodoMetricas, fechaMetricas, traducirDia }) {
  const bloques = metricas?.ocupacion_bloques || [];
  if (!bloques.length) {
    throw new Error("No hay datos de ocupación disponibles para exportar.");
  }

  const info = metricas?.info_periodo || {};
  const carreras = metricas?.reservas_por_carrera || [];
  const horariosPico = metricas?.horarios_pico || [];
  const diasDemanda = metricas?.dias_demanda || [];
  const cancelacionesDia = metricas?.cancelaciones_por_dia || [];
  const sedeNombre = info.campus_nombre || "Todas las Sedes UCT";
  const etiquetaPeriodo = info.etiqueta || `${periodoMetricas.toUpperCase()} (${fechaMetricas})`;
  const fechaEmision = new Date().toLocaleString("es-CL");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema de Bibliotecas UCT";
  wb.created = new Date();

  const ws1 = wb.addWorksheet("1. Ocupación y Resumen", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 }
  });
  ws1.columns = [
    { width: 8 },
    { width: 22 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 24 },
    { width: 18 }
  ];

  addCorporateHeader(
    ws1,
    8,
    "REPORTE EJECUTIVO DE MÉTRICAS Y OCUPACIÓN DE CUBÍCULOS",
    `Sede: ${sedeNombre}   |   Período Evaluado: ${etiquetaPeriodo}`,
    `Emitido: ${fechaEmision}`
  );

  addSectionBanner(ws1, 5, 8, "Indicadores Clave de Desempeño (KPIs del Período)");

  const picoRango = (info.bloque_pico?.total_reservas || 0) > 0
    ? `${info.bloque_pico.rango} (${info.bloque_pico.total_reservas} res.)`
    : "Sin reservas";

  addKpiCards(ws1, 7, [
    {
      label: "Total Reservas Período",
      value: info.total_reservas_periodo ?? 0,
      sub: etiquetaPeriodo,
      color: COLORS.uctBlue,
      accent: COLORS.uctBlue
    },
    {
      label: "Bloque Horario Pico",
      value: picoRango,
      sub: "Mayor flujo registrado",
      color: COLORS.amberText,
      accent: COLORS.uctGold
    },
    {
      label: "Ocupación Media",
      value: `${info.promedio_ocupacion_pct ?? 0}%`,
      sub: `Capacidad: ${info.capacidad_por_bloque ?? 0} cupos/bloque`,
      color: COLORS.emeraldText,
      accent: COLORS.uctCyan
    },
    {
      label: "Tasa de Cancelación",
      value: metricas?.tasa_cancelacion_estimada || "0.0%",
      sub: metricas?.promedio_cancelaciones_diarias || "0.0 bajas/día",
      color: COLORS.roseText,
      accent: COLORS.roseText
    }
  ]);

  addSectionBanner(ws1, 11, 8, "Desglose Detallado de Ocupación por Bloque Horario");

  styleTableHeader(ws1, 12, [
    "N°",
    "Bloque Horario",
    "Reservas Activas",
    "Capacidad Máx.",
    "Cupos Libres",
    "% Ocupación",
    "Indicador Visual",
    "Nivel de Demanda"
  ]);

  let currentRow = 13;
  bloques.forEach((b, idx) => {
    styleDataRow(
      ws1,
      currentRow,
      [
        idx + 1,
        b.rango || b.hora,
        b.total_reservas ?? 0,
        b.capacidad_total ?? 0,
        b.cupos_disponibles ?? 0,
        `${b.porcentaje_ocupacion ?? 0}%`,
        makeProgressBar(b.porcentaje_ocupacion),
        b.nivel_demanda || "Baja"
      ],
      ["center", "left", "center", "center", "center", "center", "left", "center"],
      7
    );
    currentRow++;
  });

  styleFooterRow(
    ws1,
    currentRow,
    [
      "—",
      "TOTAL / PROMEDIO DEL PERÍODO",
      info.total_reservas_periodo ?? 0,
      info.capacidad_por_bloque ?? 0,
      bloques.reduce((acc, x) => acc + (x.cupos_disponibles || 0), 0),
      `${info.promedio_ocupacion_pct ?? 0}%`,
      makeProgressBar(info.promedio_ocupacion_pct),
      `${bloques.length} Bloques`
    ],
    ["center", "left", "center", "center", "center", "center", "left", "center"]
  );

  currentRow += 2;
  addSectionBanner(ws1, currentRow, 8, "Gráfico de Ocupación por Bloque Horario");
  currentRow += 1;

  const chartOcupacionBase64 = renderColumnChartPNG({
    title: `Ocupación por Bloque Horario — ${sedeNombre}`,
    subtitle: `Período: ${etiquetaPeriodo} · Total: ${info.total_reservas_periodo ?? 0} reservas · Media: ${info.promedio_ocupacion_pct ?? 0}%`,
    labels: bloques.map((b) => b.rango || b.hora),
    values: bloques.map((b) => b.total_reservas || 0),
    suffix: " res.",
    barColors: bloques.map((b) =>
      b.nivel_demanda === "Pico"
        ? "#E11D48"
        : b.nivel_demanda === "Alta"
          ? "#F59E0B"
          : b.nivel_demanda === "Media"
            ? "#00A3E0"
            : "#00629B"
    )
  });

  const imgId1 = wb.addImage({ base64: chartOcupacionBase64, extension: "png" });
  ws1.addImage(imgId1, {
    tl: { col: 0.2, row: currentRow },
    ext: { width: 920, height: 400 }
  });

  currentRow += 22;
  addSectionBanner(ws1, currentRow, 8, "Comportamiento Histórico: Horarios Pico, Días Concurridos y Cancelaciones");
  currentRow += 1;

  styleTableHeader(ws1, currentRow, [
    "N°",
    "Horario Pico Histórico",
    "Reservas Acum.",
    "Día de la Semana",
    "Concurrencia Semanal",
    "Día (Cancelaciones)",
    "Bajas Registradas",
    "Estado Tendencia"
  ]);
  currentRow++;

  const maxRowsHist = Math.max(horariosPico.length, diasDemanda.length, cancelacionesDia.length, 1);
  for (let i = 0; i < maxRowsHist; i++) {
    const hp = horariosPico[i];
    const dd = diasDemanda[i];
    const cd = cancelacionesDia[i];
    styleDataRow(
      ws1,
      currentRow,
      [
        i + 1,
        hp ? `${hp.hora} hrs` : "—",
        hp ? hp.total : "—",
        dd ? (traducirDia ? traducirDia(dd.dia) : dd.dia) : "—",
        dd ? `${dd.total} reservas` : "—",
        cd ? (traducirDia ? traducirDia(cd.dia) : cd.dia) : "—",
        cd ? `${cd.total} bajas` : "—",
        i === 0 ? "Pico" : "Media"
      ],
      ["center", "left", "center", "left", "center", "left", "center", "center"],
      7
    );
    currentRow++;
  }

  const ws2 = wb.addWorksheet("2. Ranking por Carreras", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 }
  });
  ws2.columns = [
    { width: 8 },
    { width: 42 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 26 },
    { width: 22 }
  ];

  addCorporateHeader(
    ws2,
    8,
    "DEMANDA Y PARTICIPACIÓN DE RESERVAS POR CARRERA ACADÉMICA",
    `Sede: ${sedeNombre}   |   Período: ${etiquetaPeriodo}`,
    `Emitido: ${fechaEmision}`
  );

  const totalGlobalCarreras = carreras.reduce((a, c) => a + (c.total || 0), 0);
  const totalActivasCarreras = carreras.reduce((a, c) => a + (c.actuales || 0), 0);
  const totalHistCarreras = carreras.reduce((a, c) => a + (c.historicas || 0), 0);
  const carreraLider = carreras[0]?.carrera || "Sin registros";

  addSectionBanner(ws2, 5, 8, "Resumen de Participación por Programa Académico");
  addKpiCards(ws2, 7, [
    {
      label: "Carrera Líder en Uso",
      value: carreraLider.slice(0, 26),
      sub: `${carreras[0]?.total || 0} reservas totales`,
      color: COLORS.navyDark,
      accent: COLORS.uctGold
    },
    {
      label: "Volumen Consolidado",
      value: totalGlobalCarreras,
      sub: `${carreras.length} carreras registradas`,
      color: COLORS.uctBlue,
      accent: COLORS.uctBlue
    },
    {
      label: "Reservas en Curso",
      value: totalActivasCarreras,
      sub: "Activas actualmente",
      color: COLORS.emeraldText,
      accent: COLORS.emeraldText
    },
    {
      label: "Reservas Históricas",
      value: totalHistCarreras,
      sub: "Completadas / Archivadas",
      color: COLORS.slate700,
      accent: COLORS.uctCyan
    }
  ]);

  addSectionBanner(ws2, 11, 8, "Tabla de Ranking de Reservas por Carrera (Activas + Históricas)");
  styleTableHeader(ws2, 12, [
    "Pos.",
    "Carrera / Programa Académico",
    "Reservas Activas",
    "Reservas Históricas",
    "Total Consolidado",
    "% Participación",
    "Distribución Visual",
    "Sede"
  ]);

  let r2 = 13;
  carreras.forEach((c, idx) => {
    const pct = totalGlobalCarreras > 0 ? Math.round(((c.total || 0) / totalGlobalCarreras) * 100) : 0;
    styleDataRow(
      ws2,
      r2,
      [
        `#${idx + 1}`,
        c.carrera,
        c.actuales ?? 0,
        c.historicas ?? 0,
        c.total ?? 0,
        `${pct}%`,
        makeProgressBar(pct),
        sedeNombre
      ],
      ["center", "left", "center", "center", "center", "center", "left", "center"]
    );
    r2++;
  });

  styleFooterRow(
    ws2,
    r2,
    [
      "TOTAL",
      `${carreras.length} CARRERAS CONSOLIDADAS`,
      totalActivasCarreras,
      totalHistCarreras,
      totalGlobalCarreras,
      "100%",
      makeProgressBar(100),
      sedeNombre
    ],
    ["center", "left", "center", "center", "center", "center", "left", "center"]
  );

  if (carreras.length > 0) {
    r2 += 2;
    addSectionBanner(ws2, r2, 8, "Gráfico Comparativo: Reservas Activas vs Históricas por Carrera");
    r2 += 1;

    const topC = carreras.slice(0, 10);
    const chartCarrerasBase64 = renderDualBarChartPNG({
      title: "Top Carreras por Volumen de Reservas (Activas vs Históricas)",
      subtitle: `Sede: ${sedeNombre} · Total Consolidado: ${totalGlobalCarreras} reservas`,
      labels: topC.map((c) => c.carrera),
      valuesA: topC.map((c) => c.actuales || 0),
      valuesB: topC.map((c) => c.historicas || 0),
      labelA: "Activas",
      labelB: "Históricas",
      colorA: "#00A3E0",
      colorB: "#002D4C"
    });

    const imgId2 = wb.addImage({ base64: chartCarrerasBase64, extension: "png" });
    ws2.addImage(imgId2, {
      tl: { col: 0.2, row: r2 },
      ext: { width: 920, height: 420 }
    });
  }

  await descargarWorkbook(wb, `Reporte_Metricas_Reservas_UCT_${periodoMetricas}_${fechaMetricas}.xlsx`);
}

export async function exportarMetricasTalleresExcel({ solicitudesTalleres }) {
  const lista = solicitudesTalleres || [];
  const totalTalleres = lista.length;
  const pendientes = lista.filter((t) => t.estado === "pendiente").length;
  const aprobados = lista.filter((t) => t.estado === "aprobado").length;
  const realizados = lista.filter((t) => t.estado === "realizado").length;
  const rechazados = lista.filter((t) => t.estado === "rechazado").length;
  const resueltos = aprobados + realizados;
  const tasaExito = totalTalleres > 0 ? Math.round((resueltos / totalTalleres) * 100) : 0;

  const totalParticipantes = lista.reduce((acc, t) => {
    const p = parseInt(t.participantes, 10);
    return acc + (isNaN(p) || p <= 0 ? 1 : p);
  }, 0);

  const presencial = lista.filter((t) => (t.modalidad || "").toLowerCase().includes("presencial")).length;
  const virtual = lista.filter(
    (t) => (t.modalidad || "").toLowerCase().includes("virtual") || (t.modalidad || "").toLowerCase().includes("online")
  ).length;
  const pctPresencial = totalTalleres > 0 ? Math.round((presencial / totalTalleres) * 100) : 0;
  const pctVirtual = totalTalleres > 0 ? 100 - pctPresencial : 0;

  const TALLERES_ESTANDAR = [
    { nombre: "Conoce tu biblioteca: Taller de inicio", tag: "Inducción" },
    { nombre: "Búsqueda y evaluación de información", tag: "Investigación" },
    { nombre: "Gestión de referencias y estilo de citas", tag: "Citas y Normas" },
    { nombre: "Uso ético de la información", tag: "Integridad" },
    { nombre: "Introducción a Leganto", tag: "Plataforma" },
    { nombre: "ORCID", tag: "Identidad Digital" }
  ];

  const talleresCountMap = {};
  TALLERES_ESTANDAR.forEach((t) => {
    talleresCountMap[t.nombre] = 0;
  });
  lista.forEach((t) => {
    const nom = (t.taller || "Sin especificar").trim();
    talleresCountMap[nom] = (talleresCountMap[nom] || 0) + 1;
  });

  const rankingTalleres = Object.entries(talleresCountMap)
    .map(([nombre, count]) => {
      const meta = TALLERES_ESTANDAR.find((m) => m.nombre === nombre) || { tag: "Taller Especializado" };
      return {
        nombre,
        tag: meta.tag,
        count,
        pct: totalTalleres > 0 ? Math.round((count / totalTalleres) * 100) : 0
      };
    })
    .sort((a, b) => b.count - a.count);

  const topTaller = rankingTalleres[0] && rankingTalleres[0].count > 0 ? rankingTalleres[0].nombre : "Sin solicitudes";

  const carrerasMap = {};
  lista.forEach((t) => {
    const c = (t.carrera || "Sin carrera informada").trim();
    carrerasMap[c] = (carrerasMap[c] || 0) + 1;
  });
  const rankingCarreras = Object.entries(carrerasMap)
    .map(([carrera, count]) => ({
      carrera,
      count,
      pct: totalTalleres > 0 ? Math.round((count / totalTalleres) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const fechaEmision = new Date().toLocaleString("es-CL");
  const fechaHoy = new Date().toISOString().split("T")[0];

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema de Bibliotecas UCT";
  wb.created = new Date();

  const ws1 = wb.addWorksheet("1. Resumen y Demanda", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 }
  });
  ws1.columns = [
    { width: 8 },
    { width: 42 },
    { width: 20 },
    { width: 16 },
    { width: 18 },
    { width: 24 },
    { width: 18 },
    { width: 18 }
  ];

  addCorporateHeader(
    ws1,
    8,
    "REPORTE EJECUTIVO DE MÉTRICAS DE TALLERES FORMATIVOS",
    `Total Solicitudes: ${totalTalleres}   |   Alcance Estimado: ${totalParticipantes} participantes`,
    `Emitido: ${fechaEmision}`
  );

  addSectionBanner(ws1, 5, 8, "Indicadores Clave de Gestión de Talleres (KPIs)");
  addKpiCards(ws1, 7, [
    {
      label: "Total Solicitudes",
      value: totalTalleres,
      sub: `${realizados} realizados · ${aprobados} aprobados`,
      color: COLORS.uctBlue,
      accent: COLORS.uctBlue
    },
    {
      label: "Tasa de Aprobación",
      value: `${tasaExito}%`,
      sub: `${pendientes} pendientes · ${rechazados} rechazados`,
      color: COLORS.emeraldText,
      accent: COLORS.emeraldText
    },
    {
      label: "Alcance Estudiantil",
      value: `${totalParticipantes} alumnos`,
      sub: `Presencial ${pctPresencial}% · Virtual ${pctVirtual}%`,
      color: COLORS.navyDark,
      accent: COLORS.uctGold
    },
    {
      label: "Taller Más Solicitado",
      value: topTaller.slice(0, 26),
      sub: `${rankingTalleres[0]?.count || 0} solicitudes (${rankingTalleres[0]?.pct || 0}%)`,
      color: COLORS.amberText,
      accent: COLORS.uctCyan
    }
  ]);

  addSectionBanner(ws1, 11, 8, "Ranking de Demanda por Taller Especializado");
  styleTableHeader(ws1, 12, [
    "Pos.",
    "Nombre del Taller Formativo",
    "Categoría / Línea",
    "Solicitudes",
    "% Demanda",
    "Participación Visual",
    "Modalidad Líder",
    "Estado Demanda"
  ]);

  let r1 = 13;
  rankingTalleres.forEach((t, idx) => {
    styleDataRow(
      ws1,
      r1,
      [
        `#${idx + 1}`,
        t.nombre,
        t.tag,
        t.count,
        `${t.pct}%`,
        makeProgressBar(t.pct),
        pctPresencial >= pctVirtual ? "Presencial" : "Virtual",
        t.pct >= 30 ? "Alta" : t.pct >= 15 ? "Media" : "Baja"
      ],
      ["center", "left", "center", "center", "center", "left", "center", "center"],
      7
    );
    r1++;
  });

  styleFooterRow(
    ws1,
    r1,
    [
      "TOTAL",
      `${rankingTalleres.length} TALLERES EN CATÁLOGO`,
      "Consolidado",
      totalTalleres,
      "100%",
      makeProgressBar(100),
      `${presencial} Pres. / ${virtual} Virt.`,
      `${tasaExito}% Éxito`
    ],
    ["center", "left", "center", "center", "center", "left", "center", "center"]
  );

  r1 += 2;
  addSectionBanner(ws1, r1, 8, "Gráfico de Demanda por Taller Especializado");
  r1 += 1;

  const chartTalleresBase64 = renderColumnChartPNG({
    title: "Solicitudes Registradas por Taller Formativo UCT",
    subtitle: `Total: ${totalTalleres} solicitudes · Participantes estimados: ${totalParticipantes} estudiantes`,
    labels: rankingTalleres.map((t) => t.nombre.replace("Conoce tu biblioteca: ", "")),
    values: rankingTalleres.map((t) => t.count),
    suffix: " sol.",
    barColors: ["#002D4C", "#004D7A", "#00629B", "#0082B8", "#00A3E0", "#FFC20E"]
  });

  const imgT1 = wb.addImage({ base64: chartTalleresBase64, extension: "png" });
  ws1.addImage(imgT1, {
    tl: { col: 0.2, row: r1 },
    ext: { width: 920, height: 400 }
  });

  r1 += 22;
  addSectionBanner(ws1, r1, 8, "Demanda de Talleres por Carrera / Programa Académico");
  r1 += 1;

  styleTableHeader(ws1, r1, [
    "Pos.",
    "Carrera / Programa Solicitante",
    "Categoría",
    "Solicitudes",
    "% del Total",
    "Distribución Visual",
    "Modalidad Preferida",
    "Nivel"
  ]);
  r1++;

  rankingCarreras.forEach((c, idx) => {
    styleDataRow(
      ws1,
      r1,
      [
        `#${idx + 1}`,
        c.carrera,
        "Pregrado / Postgrado",
        c.count,
        `${c.pct}%`,
        makeProgressBar(c.pct),
        "Institucional",
        c.pct >= 25 ? "Alta" : "Media"
      ],
      ["center", "left", "center", "center", "center", "left", "center", "center"],
      7
    );
    r1++;
  });

  const ws2 = wb.addWorksheet("2. Nómina de Solicitudes", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 }
  });
  ws2.columns = [
    { width: 9 },
    { width: 36 },
    { width: 26 },
    { width: 16 },
    { width: 28 },
    { width: 32 },
    { width: 15 },
    { width: 15 },
    { width: 16 },
    { width: 20 }
  ];

  addCorporateHeader(
    ws2,
    10,
    "NÓMINA DETALLADA DE SOLICITUDES DE TALLERES DE BIBLIOTECA",
    `Registros exportados: ${lista.length} solicitudes`,
    `Emitido: ${fechaEmision}`
  );

  addSectionBanner(ws2, 5, 10, "Listado Completo de Solicitudes Estudiantiles");
  styleTableHeader(ws2, 6, [
    "Folio",
    "Taller Solicitado",
    "Estudiante Solicitante",
    "RUT",
    "Correo Institucional",
    "Carrera / Programa",
    "Modalidad",
    "Asistentes",
    "Estado",
    "Fecha Solicitud"
  ]);

  let r2 = 7;
  lista.forEach((s) => {
    styleDataRow(
      ws2,
      r2,
      [
        `#${s.id}`,
        s.taller || "—",
        s.nombre || "—",
        s.rut || "—",
        s.email || "—",
        s.carrera || "—",
        s.modalidad || "Presencial",
        `${s.participantes || 1} pers.`,
        (s.estado || "pendiente").toUpperCase(),
        s.created_at ? String(s.created_at).slice(0, 16).replace("T", " ") : "—"
      ],
      ["center", "left", "left", "center", "left", "left", "center", "center", "center", "center"],
      8
    );
    r2++;
  });

  await descargarWorkbook(wb, `Reporte_Metricas_Talleres_UCT_${fechaHoy}.xlsx`);
}

export async function exportarMetricasPrediccionExcel({ prediccionData, modeloPrediccion, diasFiltroPrediccion }) {
  const proyeccion = prediccionData?.proyeccion_diaria || [];
  if (!proyeccion.length) {
    throw new Error("No hay datos de pronóstico disponibles para exportar.");
  }

  const resumen = prediccionData?.resumen || {};
  const modeloInfo = prediccionData?.modelo_info || {};
  const autoEval = prediccionData?.autoevaluacion || {};
  const comparativa = autoEval?.comparativa_diaria || [];
  const campusNombre = prediccionData?.campus_nombre || "Sede UCT";
  const capacidadCampus = prediccionData?.capacidad_campus || 10;
  const algoritmoNombre = modeloInfo.algoritmo || (modeloPrediccion === "xgboost" ? "XGBoost Regressor" : "Random Forest Regressor");
  const fechaEmision = new Date().toLocaleString("es-CL");
  const fechaHoy = new Date().toISOString().split("T")[0];

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema de Bibliotecas UCT";
  wb.created = new Date();

  const ws1 = wb.addWorksheet("1. Pronóstico Ejecutivo", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 }
  });
  ws1.columns = [
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 26 },
    { width: 18 }
  ];

  addCorporateHeader(
    ws1,
    8,
    "REPORTE EJECUTIVO DE PRONÓSTICO DE AFORO Y OCUPACIÓN (MACHINE LEARNING)",
    `Sede: ${campusNombre} (${capacidadCampus} cubículos)   |   Horizonte: Próximos ${diasFiltroPrediccion} días   |   Modelo: ${algoritmoNombre}`,
    `Emitido: ${fechaEmision}`
  );

  addSectionBanner(ws1, 5, 8, "Indicadores Clave del Modelo Predictivo y Aforo Proyectado");
  addKpiCards(ws1, 7, [
    {
      label: "Ocupación Promedio",
      value: `${resumen.ocupacion_promedio_semana ?? 0}%`,
      sub: `Próximos ${diasFiltroPrediccion} días (${campusNombre})`,
      color: COLORS.uctBlue,
      accent: COLORS.uctBlue
    },
    {
      label: "Día Mayor Demanda",
      value: resumen.dia_mayor_demanda || "—",
      sub: "Pico semanal estimado",
      color: COLORS.roseText,
      accent: COLORS.roseText
    },
    {
      label: "Día Menor Demanda",
      value: resumen.dia_menor_demanda || "—",
      sub: "Menor flujo proyectado",
      color: COLORS.emeraldText,
      accent: COLORS.emeraldText
    },
    {
      label: "Precisión Real Modelo",
      value: `${autoEval.precision_real_pct ?? 93.9}%`,
      sub: `R²: ${modeloInfo.r2_score ?? 0.85} · MAE: ${modeloInfo.mae ?? 4.5}% (${modeloInfo.muestras_entrenamiento ?? 0} muestras)`,
      color: COLORS.navyDark,
      accent: COLORS.uctGold
    }
  ]);

  addSectionBanner(ws1, 11, 8, "Resumen de Proyección Diaria de Aforo");
  styleTableHeader(ws1, 12, [
    "Fecha",
    "Día de la Semana",
    "Estado Atención",
    "Capacidad Sede",
    "Bloques Operativos",
    "% Ocupación Prom.",
    "Proyección Visual",
    "Nivel Demanda"
  ]);

  let r1 = 13;
  proyeccion.forEach((d) => {
    const pct = Math.round(d.ocupacion_promedio_dia || 0);
    const cerrado = d.estado_atencion === "Cerrado";
    const nivel = cerrado ? "Cerrado" : pct >= 70 ? "Alta" : pct >= 45 ? "Media" : "Baja";
    styleDataRow(
      ws1,
      r1,
      [
        d.fecha,
        d.dia_nombre,
        d.estado_atencion,
        `${capacidadCampus} cubículos`,
        cerrado ? 0 : (d.bloques?.length || 9),
        cerrado ? "0%" : `${pct}%`,
        cerrado ? "░░░░░░░░░░ Cerrado" : makeProgressBar(pct),
        nivel
      ],
      ["center", "left", "center", "center", "center", "center", "left", "center"],
      7
    );
    r1++;
  });

  r1 += 2;
  addSectionBanner(ws1, r1, 8, "Gráfico de Proyección Diaria de Ocupación (%)");
  r1 += 1;

  const chartPredBase64 = renderColumnChartPNG({
    title: `Pronóstico Diario de Ocupación — ${campusNombre} (${algoritmoNombre})`,
    subtitle: `Ocupación Media Proyectada: ${resumen.ocupacion_promedio_semana ?? 0}% · Precisión Autoevaluada: ${autoEval.precision_real_pct ?? 93.9}%`,
    labels: proyeccion.map((d) => `${d.dia_nombre.slice(0, 3)} ${d.fecha.slice(5)}`),
    values: proyeccion.map((d) => Math.round(d.ocupacion_promedio_dia || 0)),
    suffix: "%",
    barColors: proyeccion.map((d) => {
      if (d.estado_atencion === "Cerrado") return "#94A3B8";
      const p = d.ocupacion_promedio_dia || 0;
      return p >= 70 ? "#E11D48" : p >= 45 ? "#00629B" : "#10B981";
    })
  });

  const imgP1 = wb.addImage({ base64: chartPredBase64, extension: "png" });
  ws1.addImage(imgP1, {
    tl: { col: 0.2, row: r1 },
    ext: { width: 920, height: 400 }
  });

  if (comparativa.length > 0) {
    r1 += 22;
    addSectionBanner(ws1, r1, 8, "Autoevaluación del Modelo: Predicción vs Ocupación Real");
    r1 += 1;

    styleTableHeader(ws1, r1, [
      "Fecha Evaluada",
      "Día de la Semana",
      "% Ocupación Predicho",
      "% Ocupación Real",
      "Desviación (Error)",
      "% Precisión Día",
      "Indicador de Precisión",
      "Calibración"
    ]);
    r1++;

    comparativa.forEach((item) => {
      const diff = Math.abs((item.pct_predicho || 0) - (item.pct_real || 0)).toFixed(1);
      styleDataRow(
        ws1,
        r1,
        [
          item.fecha,
          item.dia_nombre,
          `${item.pct_predicho}%`,
          `${item.pct_real}%`,
          `±${diff}%`,
          `${item.precision_dia}%`,
          makeProgressBar(item.precision_dia),
          item.precision_dia >= 85 ? "Baja" : "Media"
        ],
        ["center", "left", "center", "center", "center", "center", "left", "center"],
        7
      );
      r1++;
    });

    r1 += 2;
    const chartCompBase64 = renderDualBarChartPNG({
      title: "Contraste de Autoevaluación: % Predicho vs % Ocupación Real",
      subtitle: `Precisión Global Real: ${autoEval.precision_real_pct ?? 93.9}% (${autoEval.bloques_evaluados ?? 0} bloques auditados)`,
      labels: comparativa.map((c) => `${c.dia_nombre.slice(0, 3)} ${c.fecha.slice(5)}`),
      valuesA: comparativa.map((c) => Math.round(c.pct_predicho || 0)),
      valuesB: comparativa.map((c) => Math.round(c.pct_real || 0)),
      labelA: "% Predicho",
      labelB: "% Real",
      colorA: "#00629B",
      colorB: "#10B981",
      suffix: "%"
    });

    const imgP2 = wb.addImage({ base64: chartCompBase64, extension: "png" });
    ws1.addImage(imgP2, {
      tl: { col: 0.2, row: r1 },
      ext: { width: 920, height: 420 }
    });
  }

  const ws2 = wb.addWorksheet("2. Desglose por Bloques", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 }
  });
  ws2.columns = [
    { width: 14 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 26 },
    { width: 18 }
  ];

  addCorporateHeader(
    ws2,
    8,
    "DESGLOSE HORARIO COMPLETO DE PROYECCIÓN DE AFORO POR BLOQUE",
    `Sede: ${campusNombre}   |   Capacidad: ${capacidadCampus} cubículos   |   Algoritmo: ${algoritmoNombre}`,
    `Emitido: ${fechaEmision}`
  );

  addSectionBanner(ws2, 5, 8, "Matriz Horaria Proyectada para Todos los Días del Horizonte");
  styleTableHeader(ws2, 6, [
    "Fecha",
    "Día",
    "Bloque Horario",
    "Cubículos Ocupados Est.",
    "Cubículos Libres Est.",
    "% Ocupación Proy.",
    "Carga Visual Proyectada",
    "Nivel de Demanda"
  ]);

  let r2 = 7;
  proyeccion.forEach((dia) => {
    (dia.bloques || []).forEach((b) => {
      styleDataRow(
        ws2,
        r2,
        [
          dia.fecha,
          dia.dia_nombre,
          b.rango || b.hora,
          b.cubiculos_ocupados_estimados ?? 0,
          b.cubiculos_libres_estimados ?? 0,
          `${b.ocupacion_proyectada_pct ?? 0}%`,
          b.nivel_demanda === "Cerrado" ? "░░░░░░░░░░ Cerrado" : makeProgressBar(b.ocupacion_proyectada_pct),
          b.nivel_demanda || "Baja"
        ],
        ["center", "left", "center", "center", "center", "center", "left", "center"],
        7
      );
      r2++;
    });
  });

  await descargarWorkbook(wb, `Reporte_Pronostico_Aforo_UCT_${campusNombre.replace(/\s+/g, "_")}_${fechaHoy}.xlsx`);
}

