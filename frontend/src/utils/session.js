export const obtenerSessionId = (rut) => {
  if (rut) {
    return `session_rut_${String(rut).replace(/\./g, "").trim().toUpperCase()}`;
  }
  let sId = sessionStorage.getItem("chat_session_id");
  if (!sId) {
    const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
    sId = `session_${rnd}_${Date.now()}`;
    sessionStorage.setItem("chat_session_id", sId);
  }
  return sId;
};

export const enmascararRut = (rut) => {
  if (!rut) return "";
  const s = String(rut).trim();
  if (s === "N/A" || s === "Sin registrar") return s;
  if (s.includes("*")) return s;
  if (s.includes("-")) {
    const [cuerpo, dv] = s.split("-");
    const cuerpoLimpio = cuerpo.replace(/\./g, "");
    if (cuerpoLimpio.length <= 3) return s;
    const ultimosTres = cuerpoLimpio.slice(-3);
    const dvUpper = dv ? dv.toUpperCase() : "";
    if (cuerpo.includes(".")) {
      if (cuerpoLimpio.length === 8) {
        return `**.***.${ultimosTres}-${dvUpper}`;
      } else if (cuerpoLimpio.length === 7) {
        return `*.***.${ultimosTres}-${dvUpper}`;
      }
      const maskedLen = cuerpoLimpio.length - 3;
      return `${"*".repeat(maskedLen)}.${ultimosTres}-${dvUpper}`;
    }
    const maskedLen = cuerpoLimpio.length - 3;
    return `${"*".repeat(maskedLen)}${ultimosTres}-${dvUpper}`;
  }
  const limpio = s.replace(/\./g, "");
  if (limpio.length >= 5) {
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1).toUpperCase();
    const ultimosTres = cuerpo.slice(-3);
    const maskedLen = cuerpo.length - 3;
    return `${"*".repeat(maskedLen)}${ultimosTres}-${dv}`;
  }
  return s;
};
