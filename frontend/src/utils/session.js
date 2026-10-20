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
