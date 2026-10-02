import os
import asyncio
import re
import json
import hmac
import hashlib
import math
import html
from typing import List, Optional, Any, Dict
from datetime import datetime, date, time, timedelta
import httpx
import asyncpg
from fastapi import FastAPI, HTTPException, status, Depends, Request, Response, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, root_validator
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
import holidays

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

import time as _time
if hasattr(_time, "tzset"):
    os.environ["TZ"] = os.getenv("TZ", "America/Santiago")
    _time.tzset()

app = FastAPI(title="API de Reservas y Chatbot UCT (PostgreSQL)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
N8N_CANCELACION_WEBHOOK_URL = os.getenv("N8N_CANCELACION_WEBHOOK_URL")
N8N_CREACION_WEBHOOK_URL = os.getenv("N8N_CREACION_WEBHOOK_URL")
N8N_EDICION_WEBHOOK_URL = os.getenv("N8N_EDICION_WEBHOOK_URL")
N8N_SECRET_KEY = os.getenv("N8N_SECRET_KEY")
if not N8N_SECRET_KEY or not N8N_SECRET_KEY.strip():
    raise RuntimeError("CRITICAL ERROR: N8N_SECRET_KEY no está definido en backend.env.")
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and (os.path.exists("/.dockerenv") or os.getenv("RUNNING_IN_DOCKER")):
    DATABASE_URL = DATABASE_URL.replace("@localhost:", "@host.docker.internal:").replace("@127.0.0.1:", "@host.docker.internal:")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or not SECRET_KEY.strip():
    raise RuntimeError("CRITICAL ERROR: SECRET_KEY no está definido en backend.env. El servidor no puede iniciar sin una clave secreta segura.")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def generar_headers_webhook_n8n(payload: dict) -> tuple:
    payload_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    signature = hmac.new(
        N8N_SECRET_KEY.encode("utf-8"),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Signature": signature,
        "X-Webhook-Token": N8N_SECRET_KEY
    }
    return payload_bytes, headers


def extraer_rut_de_session(session_id: Optional[str]) -> Optional[str]:
    if not session_id:
        return None
    match = re.search(r'session_rut_([a-zA-Z0-9\-]+)', str(session_id))
    if match:
        return match.group(1).replace(".", "").upper().strip()
    return None


async def notificar_cancelacion_n8n(detalles: List[dict]):
    webhook_url = os.getenv("N8N_CANCELACION_WEBHOOK_URL")
    if not webhook_url or not httpx_client or not detalles:
        return

    for item in detalles:
        try:
            email_encontrado = item.get("email")
            rut_item = item.get("rut", "")
            rut_limpio = str(rut_item).replace(".", "").replace("-", "").upper().strip() if rut_item else ""

            if not email_encontrado and pool and rut_limpio:
                try:
                    async with pool.acquire() as conn:
                        row_u = await conn.fetchrow(
                            "SELECT email FROM usuarios WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $1 LIMIT 1",
                            rut_limpio
                        )
                        if row_u:
                            email_encontrado = row_u["email"]
                except Exception as ex_db:
                    print(f"⚠️ Error al buscar email de usuario: {ex_db}")
            payload = {
                "event": "reserva_cancelada",
                "reserva_id": str(item.get("id", "")),
                "nombre": item.get("nombre", "Estudiante"),
                "email": email_encontrado or "",
                "rut": rut_item,
                "fecha": item.get("fecha").strftime("%Y-%m-%d") if item.get("fecha") else "",
                "hora": item.get("hora").strftime("%H:%M") if item.get("hora") else "",
                "campus": item.get("campus_nombre") or "Campus UCT",
                "cubiculo_codigo": item.get("cubiculo_codigo") or "N/A"
            }
            payload_bytes, headers = generar_headers_webhook_n8n(payload)
            await httpx_client.post(webhook_url, content=payload_bytes, headers=headers, timeout=5.0)
            print(f"📧 Notificación de cancelación enviada a n8n para reserva ID {payload['reserva_id']} (Email: {payload['email']})")
        except Exception as e:
            print(f"⚠️ Error notificando cancelación a n8n: {e}")


async def notificar_creacion_n8n(detalle: dict):
    webhook_url = os.getenv("N8N_CREACION_WEBHOOK_URL") or os.getenv("N8N_CANCELACION_WEBHOOK_URL") or os.getenv("N8N_WEBHOOK_URL")
    if not webhook_url or not httpx_client or not detalle:
        return
    try:
        email_encontrado = detalle.get("email")
        rut_item = detalle.get("rut", "")
        rut_limpio = str(rut_item).replace(".", "").replace("-", "").upper().strip() if rut_item else ""

        if not email_encontrado and pool and rut_limpio:
            try:
                async with pool.acquire() as conn:
                    row_u = await conn.fetchrow(
                        "SELECT email FROM usuarios WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $1 LIMIT 1",
                        rut_limpio
                    )
                    if row_u:
                        email_encontrado = row_u["email"]
            except Exception as ex_db:
                print(f"⚠️ Error al buscar email de usuario: {ex_db}")

        payload = {
            "event": "reserva_creada",
            "reserva_id": str(detalle.get("id", "")),
            "nombre": detalle.get("nombre", "Estudiante"),
            "email": email_encontrado or "",
            "rut": rut_item,
            "fecha": str(detalle.get("fecha", "")),
            "hora": str(detalle.get("hora", "")),
            "campus": detalle.get("campus") or "Campus UCT",
            "cubiculo_codigo": detalle.get("cubiculo_codigo") or "N/A"
        }
        payload_bytes, headers = generar_headers_webhook_n8n(payload)
        await httpx_client.post(webhook_url, content=payload_bytes, headers=headers, timeout=5.0)
        print(f"📧 Notificación de creación enviada a n8n para reserva ID {payload['reserva_id']} (Email: {payload['email']})")
    except Exception as e:
        print(f"⚠️ Error notificando creación a n8n: {e}")


async def notificar_edicion_n8n(detalle: dict):
    webhook_url = os.getenv("N8N_EDICION_WEBHOOK_URL") or os.getenv("N8N_CREACION_WEBHOOK_URL") or os.getenv("N8N_CANCELACION_WEBHOOK_URL") or os.getenv("N8N_WEBHOOK_URL")
    if not webhook_url or not httpx_client or not detalle:
        return

    try:
        email_encontrado = detalle.get("email")
        rut_item = detalle.get("rut", "")
        rut_limpio = str(rut_item).replace(".", "").replace("-", "").upper().strip() if rut_item else ""

        if not email_encontrado and pool and rut_limpio:
            try:
                async with pool.acquire() as conn:
                    row_u = await conn.fetchrow(
                        "SELECT email FROM usuarios WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $1 LIMIT 1",
                        rut_limpio
                    )
                    if row_u:
                        email_encontrado = row_u["email"]
            except Exception as ex_db:
                print(f"⚠️ Error al buscar email de usuario: {ex_db}")

        payload = {
            "event": "reserva_editada",
            "reserva_id": str(detalle.get("id", "")),
            "nombre": detalle.get("nombre", "Estudiante"),
            "email": email_encontrado or "",
            "rut": rut_item,
            "fecha": str(detalle.get("fecha", "")),
            "hora": str(detalle.get("hora", "")),
            "campus": detalle.get("campus") or "Campus UCT",
            "cubiculo_codigo": detalle.get("cubiculo_codigo") or "N/A",
            "acompanantes": detalle.get("acompanantes") or []
        }
        payload_bytes, headers = generar_headers_webhook_n8n(payload)
        await httpx_client.post(webhook_url, content=payload_bytes, headers=headers, timeout=5.0)
        print(f"📧 Notificación de edición enviada a n8n para reserva ID {payload['reserva_id']} (Email: {payload['email']})")
    except Exception as e:
        print(f"⚠️ Error notificando edición a n8n: {e}")



@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: https:; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "connect-src 'self' http: https: data:; "
        "frame-ancestors 'none';"
    )
    return response


def sanitizar_texto(texto: Optional[str], max_length: int = 500) -> str:
    if not texto:
        return ""
    limpio = html.escape(str(texto).strip())
    return limpio[:max_length]


pool: Optional[asyncpg.Pool] = None
httpx_client: Optional[httpx.AsyncClient] = None
tarea_limpieza_bg: Optional[asyncio.Task] = None

async def tarea_limpieza_sesiones_periodica():
    while True:
        try:
            await asyncio.sleep(21600)
            if pool:
                async with pool.acquire() as conn:
                    await conn.execute("DELETE FROM sesiones WHERE updated_at < NOW() - INTERVAL '7 days'")
                    await conn.execute("DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 day'")
        except asyncio.CancelledError:
            break
        except Exception:
            pass

BLOQUES_HORARIOS = [
    {"hora": "09:00", "rango": "09:00 - 10:00"},
    {"hora": "10:00", "rango": "10:00 - 11:00"},
    {"hora": "11:00", "rango": "11:00 - 12:00"},
    {"hora": "12:00", "rango": "12:00 - 13:00"},
    {"hora": "13:00", "rango": "13:00 - 14:00"},
    {"hora": "14:00", "rango": "14:00 - 15:00"},
    {"hora": "15:00", "rango": "15:00 - 16:00"},
    {"hora": "16:00", "rango": "16:00 - 17:00"},
    {"hora": "17:00", "rango": "17:00 - 18:00"},
]

def es_feriado_chile(fecha_val: Any) -> tuple[bool, Optional[str]]:
    try:
        if isinstance(fecha_val, str):
            f = datetime.strptime(fecha_val.strip(), "%Y-%m-%d").date()
        elif isinstance(fecha_val, datetime):
            f = fecha_val.date()
        elif isinstance(fecha_val, date):
            f = fecha_val
        else:
            return False, None
        cl = holidays.country_holidays("CL", language="es", years=f.year)
        if f in cl:
            return True, cl.get(f)
        return False, None
    except Exception:
        return False, None

class FeriadosChileContainer(set):
    def __contains__(self, item):
        es_fer, _ = es_feriado_chile(item)
        return es_fer

FERIADOS_CHILE = FeriadosChileContainer()


@app.on_event("startup")
async def startup():
    global pool, httpx_client
    pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=5,
        max_size=30,
        max_queries=50000,
        command_timeout=10.0
    )
    httpx_client = httpx.AsyncClient(
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
        timeout=30.0
    )

    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS cubiculos (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(20) NOT NULL UNIQUE,
                campus_id INT NOT NULL REFERENCES campus(id) ON DELETE CASCADE,
                estado VARCHAR(20) DEFAULT 'disponible'
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_cubiculos_codigo_upper ON cubiculos (UPPER(codigo));
            CREATE TABLE IF NOT EXISTS historial_reservas (
                id SERIAL PRIMARY KEY,
                reserva_id INT,
                nombre VARCHAR(100) NOT NULL,
                rut VARCHAR(20) NOT NULL,
                campus_id INT REFERENCES campus(id) ON DELETE SET NULL,
                fecha DATE NOT NULL,
                hora VARCHAR(20) NOT NULL,
                estado VARCHAR(30) DEFAULT 'completada',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            DELETE FROM historial_reservas
            WHERE reserva_id IS NOT NULL
              AND id NOT IN (
                  SELECT MIN(id)
                  FROM historial_reservas
                  WHERE reserva_id IS NOT NULL
                  GROUP BY reserva_id
              );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_historial_reservas_unique_reserva_id 
            ON historial_reservas (reserva_id) 
            WHERE reserva_id IS NOT NULL;
            INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado)
            SELECT id, nombre, rut, campus_id, fecha, hora, 'activa'
            FROM reservas r
            WHERE NOT EXISTS (
                SELECT 1 FROM historial_reservas h WHERE h.reserva_id = r.id
            );
            UPDATE historial_reservas
            SET estado = 'cancelada'
            WHERE estado = 'activa'
              AND reserva_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.id = historial_reservas.reserva_id);
            UPDATE historial_reservas
            SET estado = 'expirada'
            WHERE (fecha < CURRENT_DATE OR (fecha = CURRENT_DATE AND hora::time < CURRENT_TIME))
              AND estado NOT IN ('cancelada', 'inasistencia');

            CREATE TABLE IF NOT EXISTS anuncios_cms (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(200) NOT NULL,
                subtitulo TEXT,
                badge VARCHAR(50) DEFAULT 'NUEVO SERVICIO',
                boton_texto VARCHAR(50) DEFAULT 'Ver Más',
                boton_link VARCHAR(200) DEFAULT '/reservar',
                color_fondo VARCHAR(50) DEFAULT '#4A4D55',
                orden INT DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS tarjetas_cms (
                id SERIAL PRIMARY KEY,
                icono VARCHAR(50) DEFAULT '📚',
                titulo VARCHAR(100) NOT NULL,
                descripcion TEXT,
                link_texto VARCHAR(50) DEFAULT 'Ir al Formulario →',
                link_url VARCHAR(200) DEFAULT '/reservar',
                orden INT DEFAULT 0
            );

            INSERT INTO anuncios_cms (titulo, subtitulo, badge, boton_texto, boton_link, color_fondo, orden)
            SELECT 'RESERVA INTELIGENTE CON ASISTENCIA IA', '¿Sabías que puedes consultar disponibilidad y agendar tu espacio directamente desde el chat flotante?', 'NUEVO SERVICIO', 'Abrir Chatbot Ahora', 'open-chat', '#4A4D55', 1
            WHERE NOT EXISTS (SELECT 1 FROM anuncios_cms);

            INSERT INTO anuncios_cms (titulo, subtitulo, badge, boton_texto, boton_link, color_fondo, orden)
            SELECT 'SEMANA DE EXÁMENES — EXTENSIÓN DE HORARIOS', 'Recuerda que durante el periodo de evaluaciones la biblioteca extiende sus bloques de atención.', 'AVISO INSTITUCIONAL', 'Reservar Tu Espacio', '/reservar', '#00629B', 2
            WHERE NOT EXISTS (SELECT 1 FROM anuncios_cms OFFSET 1);

            INSERT INTO tarjetas_cms (icono, titulo, descripcion, link_texto, link_url, orden)
            SELECT '📚', 'Reserva de Cubículos', 'Selecciona la sede, fecha y bloque horario que necesitas para tu jornada de estudio individual o en equipo.', 'Ir al Formulario →', '/reservar', 1
            WHERE NOT EXISTS (SELECT 1 FROM tarjetas_cms);

            INSERT INTO tarjetas_cms (icono, titulo, descripcion, link_texto, link_url, orden)
            SELECT '🤖', 'Asistente Virtual', 'Interactúa en lenguaje natural para realizar o cancelar reservas sin llenar formularios extensos.', 'Probar Chatbot →', 'open-chat', 2
            WHERE NOT EXISTS (SELECT 1 FROM tarjetas_cms OFFSET 1);

            INSERT INTO tarjetas_cms (icono, titulo, descripcion, link_texto, link_url, orden)
            SELECT '👥', 'Trabajo Colaborativo', 'Registra a tus compañeros acompañantes al momento de realizar la reserva de tu espacio.', 'Hasta 10 espacios por bloque', '', 3
            WHERE NOT EXISTS (SELECT 1 FROM tarjetas_cms OFFSET 2);

            CREATE TABLE IF NOT EXISTS faqs_cms (
                id SERIAL PRIMARY KEY,
                pregunta VARCHAR(300) NOT NULL,
                respuesta TEXT NOT NULL,
                categoria VARCHAR(100) DEFAULT 'General',
                orden INT DEFAULT 0
            );

            INSERT INTO faqs_cms (pregunta, respuesta, categoria, orden)
            SELECT '¿Con cuánta anticipación puedo reservar un cubículo?', 'Puedes reservar cubículos con hasta 7 días de anticipación y un mínimo de 15 minutos antes del bloque deseado, según disponibilidad en cada campus.', 'Reservas', 1
            WHERE NOT EXISTS (SELECT 1 FROM faqs_cms);

            INSERT INTO faqs_cms (pregunta, respuesta, categoria, orden)
            SELECT '¿Cuál es el tiempo máximo de reserva por estudiante?', 'Cada estudiante puede reservar hasta un máximo de 2 horas continuas por jornada para asegurar la rotación justa de los espacios de estudio.', 'Reservas', 2
            WHERE NOT EXISTS (SELECT 1 FROM faqs_cms OFFSET 1);

            INSERT INTO faqs_cms (pregunta, respuesta, categoria, orden)
            SELECT '¿Puedo reservar a través del asistente virtual (Chatbot)?', 'Sí, puedes abrir el chatbot flotante desde cualquier página del portal y pedirle en lenguaje natural que reserve un cubículo indicando sede, fecha y hora.', 'Asistente IA', 3
            WHERE NOT EXISTS (SELECT 1 FROM faqs_cms OFFSET 2);

            INSERT INTO faqs_cms (pregunta, respuesta, categoria, orden)
            SELECT '¿Qué pasa si no puedo asistir a mi reserva?', 'Debes cancelar tu reserva con al menos 30 minutos de anticipación desde la sección Mis Reservas o mediante el Asistente IA para evitar sanciones por inasistencia.', 'Reglamento y Sanciones', 4
            WHERE NOT EXISTS (SELECT 1 FROM faqs_cms OFFSET 3);

            INSERT INTO faqs_cms (pregunta, respuesta, categoria, orden)
            SELECT '¿Cuántos acompañantes pueden ingresar al cubículo?', 'Depende de la capacidad de la sala (entre 2 y 8 personas según el cubículo). Puedes registrar a tus compañeros al realizar la solicitud.', 'Reglamento y Sanciones', 5
            WHERE NOT EXISTS (SELECT 1 FROM faqs_cms OFFSET 4);

            CREATE TABLE IF NOT EXISTS dias_bloqueados (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL,
                motivo VARCHAR(255) DEFAULT 'Día bloqueado administrativamente',
                campus_id INT REFERENCES campus(id) ON DELETE CASCADE,
                creado_por VARCHAR(100) DEFAULT 'Administrador',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS cubiculos_mantenimiento (
                id SERIAL PRIMARY KEY,
                cubiculo_id INT NOT NULL REFERENCES cubiculos(id) ON DELETE CASCADE,
                fecha DATE NOT NULL,
                motivo VARCHAR(255) DEFAULT 'Mantenimiento / Fuera de servicio',
                creado_por VARCHAR(100) DEFAULT 'Administrador',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (cubiculo_id, fecha)
            );
            CREATE INDEX IF NOT EXISTS idx_cubiculos_mantenimiento_fecha ON cubiculos_mantenimiento (fecha);

            CREATE TABLE IF NOT EXISTS incidencias_cubiculos (
                id SERIAL PRIMARY KEY,
                cubiculo_id INT NOT NULL REFERENCES cubiculos(id) ON DELETE CASCADE,
                reserva_id INT,
                estudiante_rut VARCHAR(20),
                estudiante_nombre VARCHAR(100),
                categoria VARCHAR(50) DEFAULT 'otro',
                descripcion TEXT NOT NULL,
                estado VARCHAR(20) DEFAULT 'pendiente',
                solucion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_incidencias_cubiculos_estado ON incidencias_cubiculos (estado);
            CREATE INDEX IF NOT EXISTS idx_incidencias_cubiculos_cubiculo ON incidencias_cubiculos (cubiculo_id);
            CREATE INDEX IF NOT EXISTS idx_sesiones_updated_at ON sesiones (updated_at);
            DELETE FROM sesiones WHERE updated_at < NOW() - INTERVAL '7 days';

            CREATE TABLE IF NOT EXISTS rate_limits (
                id SERIAL PRIMARY KEY,
                key VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON rate_limits (key, created_at);
            DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 day';
        """)

    global tarea_limpieza_bg
    tarea_limpieza_bg = asyncio.create_task(tarea_limpieza_sesiones_periodica())


@app.on_event("shutdown")
async def shutdown():
    global pool, httpx_client, tarea_limpieza_bg
    if tarea_limpieza_bg:
        tarea_limpieza_bg.cancel()
    if httpx_client:
        await httpx_client.aclose()
    if pool:
        await pool.close()


rate_limit_fallback_store: Dict[str, List[float]] = {}
token_blacklist_fallback: Dict[str, float] = {}


def get_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def blacklist_token(token: str, expires_in_seconds: int = 3600):
    if not token:
        return
    token_hash = get_token_hash(token)
    token_blacklist_fallback[token_hash] = datetime.utcnow().timestamp() + expires_in_seconds


async def is_token_blacklisted(token: str) -> bool:
    if not token:
        return False
    token_hash = get_token_hash(token)
    exp = token_blacklist_fallback.get(token_hash)
    if exp:
        if datetime.utcnow().timestamp() < exp:
            return True
        else:
            del token_blacklist_fallback[token_hash]
    return False


async def check_rate_limit(key_prefix: str, identifier: str, max_requests: int = 15, window_seconds: int = 60, increment: bool = True) -> bool:
    key = f"{key_prefix}:{identifier}"
    if pool:
        try:
            async with pool.acquire() as conn:
                count = await conn.fetchval(
                    """
                    SELECT COUNT(*) FROM rate_limits 
                    WHERE key = $1 AND created_at >= NOW() - ($2 || ' seconds')::INTERVAL
                    """,
                    key, str(window_seconds)
                )
                if count >= max_requests:
                    return False
                if increment:
                    await conn.execute("INSERT INTO rate_limits (key) VALUES ($1)", key)
                return True
        except Exception:
            pass

    now = datetime.utcnow().timestamp()
    timestamps = rate_limit_fallback_store.get(key, [])
    timestamps = [t for t in timestamps if now - t < window_seconds]
    rate_limit_fallback_store[key] = timestamps
    if len(timestamps) >= max_requests:
        return False
    if increment:
        timestamps.append(now)
        rate_limit_fallback_store[key] = timestamps
    return True


async def enforce_rate_limit(key_prefix: str, identifier: str, max_requests: int = 15, window_seconds: int = 60, custom_message: Optional[str] = None):
    allowed = await check_rate_limit(key_prefix, identifier, max_requests=max_requests, window_seconds=window_seconds, increment=True)
    if not allowed:
        msg = custom_message or f"Demasiadas solicitudes ({max_requests} por cada {window_seconds}s). Por favor espera un momento antes de reintentar."
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=msg,
            headers={"Retry-After": str(window_seconds)}
        )


async def verificar_sancion_usuario(conn, rut: str) -> dict:
    if not rut:
        return {"suspendido": False, "total_inasistencias": 0, "dias_restantes": 0, "fecha_desbloqueo": None, "mensaje": ""}

    rut_limpio = str(rut).replace(".", "").replace("-", "").replace(" ", "").upper().strip()

    rows = await conn.fetch(
        """
        WITH inasistencias_unicas AS (
            SELECT DISTINCT ON (COALESCE(reserva_id, id)) id, reserva_id, fecha, hora, fecha_registro
            FROM historial_reservas
            WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $1 
              AND estado = 'inasistencia'
            ORDER BY COALESCE(reserva_id, id), fecha_registro DESC, id DESC
        )
        SELECT id, reserva_id, fecha, hora, fecha_registro
        FROM inasistencias_unicas
        ORDER BY fecha_registro DESC, id DESC
        """,
        rut_limpio
    )

    total_inasistencias = len(rows)
    if total_inasistencias < 2:
        return {
            "suspendido": False,
            "total_inasistencias": total_inasistencias,
            "dias_restantes": 0,
            "fecha_desbloqueo": None,
            "mensaje": f"Tienes {total_inasistencias} inasistencia(s) registrada(s)." if total_inasistencias > 0 else ""
        }

    ultima = rows[0]
    fecha_ref = ultima["fecha_registro"] or datetime.combine(ultima["fecha"], datetime.min.time())

    fecha_fin_suspension = fecha_ref + timedelta(days=3)
    ahora = datetime.utcnow()

    if ahora < fecha_fin_suspension:
        tiempo_restante = fecha_fin_suspension - ahora
        dias_restantes = max(1, int(math.ceil(tiempo_restante.total_seconds() / 86400)))
        fecha_desbloqueo_str = fecha_fin_suspension.strftime("%d/%m/%Y a las %H:%M")
        return {
            "suspendido": True,
            "total_inasistencias": total_inasistencias,
            "dias_restantes": dias_restantes,
            "fecha_desbloqueo": fecha_desbloqueo_str,
            "mensaje": f"Has acumulado {total_inasistencias} inasistencias. Tu cuenta está suspendida por 3 días y no puedes realizar reservas hasta el {fecha_desbloqueo_str}."
        }

    return {
        "suspendido": False,
        "total_inasistencias": total_inasistencias,
        "dias_restantes": 0,
        "fecha_desbloqueo": None,
        "mensaje": "Sanción previa cumplida."
    }


async def invalidar_caches_disponibilidad(campus_id: Optional[int] = None, fecha_str: Optional[str] = None):
    pass


# --- Esquemas Pydantic ---

class AcompananteBase(BaseModel):
    nombre: Optional[str] = "Acompañante"
    rut: Optional[str] = None

    @root_validator(pre=True)
    def force_string_acompanante(cls, values):
        if isinstance(values, dict):
            if "nombre" in values and values["nombre"] is not None:
                values["nombre"] = sanitizar_texto(values["nombre"], max_length=120)
            if "rut" in values and values["rut"] is not None:
                values["rut"] = sanitizar_texto(values["rut"], max_length=20)
        return values


class ReservaBase(BaseModel):
    nombre: Optional[str] = "Usuario Chatbot"
    rut: Optional[str] = None
    fecha: Optional[str] = None
    hora: Optional[str] = None
    campus_id: Optional[int] = None 
    campus: Optional[str] = None     
    sessionId: Optional[str] = None
    acompanantes: Optional[List[AcompananteBase]] = []

    @root_validator(pre=True)
    def parse_n8n_and_types(cls, values: Dict[str, Any]):
        if not isinstance(values, dict):
            return values

        if "nombre" in values and values["nombre"] is not None:
            values["nombre"] = sanitizar_texto(values["nombre"], max_length=150)

        if "parameters2_Value" in values and not values.get("fecha"):
            values["fecha"] = values["parameters2_Value"]

        if "parameters4_Value" in values and not values.get("hora"):
            values["hora"] = values["parameters4_Value"]

        if "parameters5_Value" in values and not values.get("campus_id") and not values.get("campus"):
            raw_campus = str(values["parameters5_Value"]).strip()
            if raw_campus.isdigit():
                values["campus_id"] = int(raw_campus)
            else:
                values["campus"] = raw_campus

        if "acompanantes" in values and values["acompanantes"] is not None:
            raw_ac = values["acompanantes"]
            if isinstance(raw_ac, str):
                if "[object Object]" in raw_ac or not raw_ac.strip():
                    values["acompanantes"] = None
                else:
                    try:
                        values["acompanantes"] = json.loads(raw_ac)
                    except Exception:
                        values["acompanantes"] = None
            elif isinstance(raw_ac, dict):
                values["acompanantes"] = [raw_ac]

        if not values.get("acompanantes"):
            ac_dict_by_idx = {}
            for k in list(values.keys()):
                if k.startswith("acompanantes["):
                    match = re.match(r'acompanantes\[(\d+)\](?:\.(.+))?', k)
                    if match:
                        idx = match.group(1)
                        subprop = match.group(2)
                        val = values[k]
                        if idx not in ac_dict_by_idx:
                            ac_dict_by_idx[idx] = {}
                        if subprop:
                            ac_dict_by_idx[idx][subprop] = val
                        elif isinstance(val, dict):
                            ac_dict_by_idx[idx].update(val)
                        elif isinstance(val, str):
                            ac_dict_by_idx[idx]["nombre"] = val

            if ac_dict_by_idx:
                values["acompanantes"] = [
                    {"nombre": v.get("nombre", "Acompañante"), "rut": v.get("rut")}
                    for idx, v in sorted(ac_dict_by_idx.items(), key=lambda x: int(x[0]))
                ]

        for field in ["nombre", "rut", "fecha", "hora", "campus", "sessionId"]:
            if field in values and values[field] is not None:
                values[field] = str(values[field])

        return values


class ReservaResponse(BaseModel):
    id: str
    nombre: str
    rut: str
    fecha: str
    hora: str
    campus_id: int
    campus: str
    cubiculo_codigo: str
    sessionId: Optional[str] = None
    acompanantes: Optional[List[AcompananteBase]] = []


class MessageInput(BaseModel):
    message: str
    sessionId: Optional[str] = None
    rut: Optional[str] = None
    nombre: Optional[str] = None
    email: Optional[str] = None

    @root_validator(pre=True)
    def sanitizar_mensaje(cls, values):
        if isinstance(values, dict):
            if "message" in values and values["message"] is not None:
                msg = str(values["message"]).strip()
                if len(msg) > 300:
                    raise ValueError("El mensaje no puede superar los 300 caracteres.")
                values["message"] = sanitizar_texto(msg, max_length=300)
            if "nombre" in values and values["nombre"] is not None:
                values["nombre"] = sanitizar_texto(values["nombre"], max_length=150)
        return values


PATRONES_INYECCION = [
    r"(?i)\b(ignora|olvida|desestima)\s+(todas?\s+)?(las?\s+)?(instrucciones|reglas|indicaciones)\b",
    r"(?i)\bignore\s+(all\s+)?(previous\s+)?(instructions|rules|prompts?)\b",
    r"(?i)\b(muestra|revela|dame|imprime|display|print|show)\s+(el\s+|tu\s+)?(system\s*prompt|prompt\s*inicial|prompt\s*del\s*sistema)\b",
    r"(?i)\b(act[uú]a|comportate|pretend|act)\s+como\s+(un\s+)?(dan|hacker|root|admin|ia\s+sin\s+restricciones)\b",
    r"(?i)\b(developer\s+mode|jailbreak|modo\s+desarrollador)\b",
    r"(?i)\b(dame|revela|muestra)\s+(las?\s+)?(claves?|contrase[ñn]as?|api\s*keys?|secret\s*keys?|tokens?)\b",
    r"(?i)<\s*script\b",
    r"(?i)\b(drop\s+table|delete\s+from\s+usuarios|union\s+select)\b"
]


def es_mensaje_sospechoso(texto: str) -> bool:
    if not texto:
        return False
    texto_norm = str(texto).strip()
    return any(re.search(pat, texto_norm) for pat in PATRONES_INYECCION)


class EsquemaEliminar(BaseModel):
    rut: Optional[str] = None
    sessionId: Optional[str] = None
    reserva_id: Optional[int] = None


class EsquemaConsulta(BaseModel):
    rut: Optional[str] = None
    sessionId: Optional[str] = None
    pagina_historial: Optional[int] = 1
    limite_historial: Optional[int] = 5


class EsquemaEditarReserva(BaseModel):
    reserva_id: Optional[int] = None
    fecha: Optional[str] = None
    hora: Optional[str] = None
    campus_id: Optional[int] = None
    campus: Optional[str] = None
    sessionId: Optional[str] = None
    rut: Optional[str] = None
    acompanantes: Optional[List[AcompananteBase]] = None

    @root_validator(pre=True)
    def parse_n8n_and_types(cls, values: Dict[str, Any]):
        if not isinstance(values, dict):
            return values

        if "parameters2_Value" in values and not values.get("fecha"):
            values["fecha"] = values["parameters2_Value"]

        if "parameters4_Value" in values and not values.get("hora"):
            values["hora"] = values["parameters4_Value"]

        if "parameters5_Value" in values and not values.get("campus_id") and not values.get("campus"):
            raw_campus = str(values["parameters5_Value"]).strip()
            if raw_campus.isdigit():
                values["campus_id"] = int(raw_campus)
            else:
                values["campus"] = raw_campus

        if "reserva_id" in values and values["reserva_id"]:
            try:
                values["reserva_id"] = int(values["reserva_id"])
            except (ValueError, TypeError):
                pass

        if "acompanantes" in values and values["acompanantes"] is not None:
            raw_ac = values["acompanantes"]
            if isinstance(raw_ac, str):
                if "[object Object]" in raw_ac or not raw_ac.strip():
                    values["acompanantes"] = None
                else:
                    try:
                        values["acompanantes"] = json.loads(raw_ac)
                    except Exception:
                        values["acompanantes"] = None
            elif isinstance(raw_ac, dict):
                values["acompanantes"] = [raw_ac]

        if not values.get("acompanantes"):
            ac_dict_by_idx = {}
            for k in list(values.keys()):
                if k.startswith("acompanantes["):
                    match = re.match(r'acompanantes\[(\d+)\](?:\.(.+))?', k)
                    if match:
                        idx = match.group(1)
                        subprop = match.group(2)
                        val = values[k]
                        if idx not in ac_dict_by_idx:
                            ac_dict_by_idx[idx] = {}
                        if subprop:
                            ac_dict_by_idx[idx][subprop] = val
                        elif isinstance(val, dict):
                            ac_dict_by_idx[idx].update(val)
                        elif isinstance(val, str):
                            ac_dict_by_idx[idx]["nombre"] = val

            if ac_dict_by_idx:
                values["acompanantes"] = [
                    {"nombre": v.get("nombre", "Acompañante"), "rut": v.get("rut")}
                    for idx, v in sorted(ac_dict_by_idx.items(), key=lambda x: int(x[0]))
                ]

        for field in ["rut", "fecha", "hora", "campus", "sessionId"]:
            if field in values and values[field] is not None:
                values[field] = str(values[field])

        return values


class CrearCampusRequest(BaseModel):
    nombre: str
    cubiculas_fisicos: Optional[int] = 0


class ActualizarCampusRequest(BaseModel):
    nombre: Optional[str] = None
    cubiculas_fisicos: Optional[int] = None


class CrearCubiculoRequest(BaseModel):
    codigo: str
    campus_id: int


class ActualizarCubiculoRequest(BaseModel):
    codigo: Optional[str] = None
    estado: Optional[str] = None


class CrearMantenimientoCubiculoRequest(BaseModel):
    fecha: str
    motivo: Optional[str] = "Mantenimiento / Fuera de servicio"


class LevantarSancionRequest(BaseModel):
    rut: str
    motivo: Optional[str] = "Sanción perdonada / justificada por administrador"


class CrearIncidenciaRequest(BaseModel):
    cubiculo_id: Optional[int] = None
    reserva_id: Optional[int] = None
    estudiante_rut: Optional[str] = None
    estudiante_nombre: Optional[str] = None
    categoria: str = "otro"
    descripcion: str


class ActualizarEstadoIncidenciaRequest(BaseModel):
    estado: str
    solucion: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class AnuncioCMSRequest(BaseModel):
    titulo: str
    subtitulo: Optional[str] = ""
    badge: Optional[str] = "NUEVO SERVICIO"
    boton_texto: Optional[str] = "Ver Más"
    boton_link: Optional[str] = "/reservar"
    color_fondo: Optional[str] = "#4A4D55"
    orden: Optional[int] = 0


class TarjetaCMSRequest(BaseModel):
    icono: Optional[str] = "📚"
    titulo: str
    descripcion: Optional[str] = ""
    link_texto: Optional[str] = "Ir al Formulario →"
    link_url: Optional[str] = "/reservar"
    orden: Optional[int] = 0


class FaqCMSRequest(BaseModel):
    pregunta: str
    respuesta: str
    categoria: Optional[str] = "General"
    orden: Optional[int] = 0


class BloqueoDiaRequest(BaseModel):
    fecha: str
    motivo: Optional[str] = "Día bloqueado administrativamente"
    campus_id: Optional[int] = None

    @root_validator(pre=True)
    def sanitizar_motivo(cls, values):
        if isinstance(values, dict) and "motivo" in values and values["motivo"] is not None:
            values["motivo"] = sanitizar_texto(values["motivo"], max_length=250)
        return values


class UsuarioResponse(BaseModel):
    id: int
    email: str
    nombre: str
    rut: Optional[str] = None
    rol: str


class CrearUsuarioRequest(BaseModel):
    email: str
    password: str
    nombre: str
    rut: Optional[str] = None
    rol: str = "estudiante"

    @root_validator(pre=True)
    def sanitizar_usuario(cls, values):
        if isinstance(values, dict):
            if "nombre" in values and values["nombre"] is not None:
                values["nombre"] = sanitizar_texto(values["nombre"], max_length=150)
            if "email" in values and values["email"] is not None:
                values["email"] = str(values["email"]).strip().lower()
        return values


# --- Autenticación JWT ---

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or not credentials.credentials:
        raise credentials_exception

    if await is_token_blacklisted(credentials.credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revocado. Por favor inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") and payload.get("type") != "access":
            raise credentials_exception
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, email, nombre, rut, rol FROM usuarios WHERE email = $1", email)
        if row is None:
            raise credentials_exception
        return dict(row)


async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Optional[dict]:
    if not credentials or not credentials.credentials:
        return None
    try:
        if await is_token_blacklisted(credentials.credentials):
            return None
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            return None
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT id, email, nombre, rut, rol FROM usuarios WHERE email = $1", email)
            return dict(row) if row else None
    except Exception:
        return None


# --- Endpoints de Autenticación ---

@app.post("/api/auth/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def registrar_usuario(data: CrearUsuarioRequest, request: Request):
    client_ip = request.client.host if request.client else "anon"
    await enforce_rate_limit(
        "register",
        client_ip,
        max_requests=5,
        window_seconds=300,
        custom_message="Límite de registros alcanzado para esta IP. Por favor espera 5 minutos."
    )
    hashed = get_password_hash(data.password)
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                """
                INSERT INTO usuarios (email, hashed_password, nombre, rut, rol)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, email, nombre, rut, rol
                """,
                data.email, hashed, data.nombre, data.rut, data.rol
            )
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un usuario con el email '{data.email}'."
            )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, response: Response):
    client_ip = request.client.host if request.client else "anon"
    
    if not await check_rate_limit("login_failed", client_ip, max_requests=5, window_seconds=60, increment=False):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos de inicio de sesión desde esta IP. Por favor, espera 1 minuto antes de reintentar."
        )

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, hashed_password, nombre, rut, rol FROM usuarios WHERE email = $1",
            data.email
        )
    if not row or not verify_password(data.password, row["hashed_password"]):
        await check_rate_limit("login_failed", client_ip, max_requests=5, window_seconds=60, increment=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": row["email"]})
    refresh_token = create_refresh_token(data={"sub": row["email"]})

    cookie_max_age = REFRESH_TOKEN_EXPIRE_DAYS * 86400
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=cookie_max_age,
        expires=cookie_max_age,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@app.post("/api/auth/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, data: Optional[RefreshTokenRequest] = None):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token inválido, revocado o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_candidate = None
    if data and data.refresh_token:
        token_candidate = data.refresh_token
    if not token_candidate:
        token_candidate = request.cookies.get("refresh_token")

    if not token_candidate:
        raise credentials_exception

    if await is_token_blacklisted(token_candidate):
        raise credentials_exception

    try:
        payload = jwt.decode(token_candidate, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise credentials_exception
        email: str = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT email FROM usuarios WHERE email = $1", email)
        if not row:
            raise credentials_exception

    await blacklist_token(token_candidate, expires_in_seconds=REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    new_access_token = create_access_token(data={"sub": email})
    new_refresh_token = create_refresh_token(data={"sub": email})

    cookie_max_age = REFRESH_TOKEN_EXPIRE_DAYS * 86400
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        max_age=cookie_max_age,
        expires=cookie_max_age,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@app.post("/api/auth/logout")
async def logout(
    request: Request,
    response: Response,
    data: Optional[LogoutRequest] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    if credentials and credentials.credentials:
        await blacklist_token(credentials.credentials, expires_in_seconds=ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    rf_token = None
    if data and data.refresh_token:
        rf_token = data.refresh_token
    if not rf_token:
        rf_token = request.cookies.get("refresh_token")
    if rf_token:
        await blacklist_token(rf_token, expires_in_seconds=REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    response.delete_cookie(key="refresh_token", path="/")
    return {"mensaje": "Sesión cerrada y tokens revocados exitosamente."}


@app.get("/api/auth/me", response_model=UsuarioResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


# --- Endpoints de Gestión de Cubículos ---

@app.get("/api/cubiculos")
async def obtener_cubiculos(campus_id: Optional[int] = None, fecha: Optional[str] = None):
    fecha_dt = None
    if fecha:
        try:
            fecha_dt = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
        except ValueError:
            pass

    async with pool.acquire() as conn:
        if fecha_dt:
            if campus_id:
                filas = await conn.fetch(
                    """
                    SELECT cb.id, cb.codigo, cb.campus_id, cb.estado,
                           cm.id as mantenimiento_id,
                           cm.motivo as mantenimiento_motivo,
                           cm.fecha::text as mantenimiento_fecha,
                           (cm.id IS NOT NULL OR cb.estado = 'mantenimiento') as en_mantenimiento
                    FROM cubiculos cb
                    LEFT JOIN cubiculos_mantenimiento cm 
                      ON cb.id = cm.cubiculo_id AND cm.fecha = $2
                    WHERE cb.campus_id = $1
                    ORDER BY cb.codigo ASC
                    """,
                    campus_id, fecha_dt
                )
            else:
                filas = await conn.fetch(
                    """
                    SELECT cb.id, cb.codigo, cb.campus_id, cb.estado,
                           cm.id as mantenimiento_id,
                           cm.motivo as mantenimiento_motivo,
                           cm.fecha::text as mantenimiento_fecha,
                           (cm.id IS NOT NULL OR cb.estado = 'mantenimiento') as en_mantenimiento
                    FROM cubiculos cb
                    LEFT JOIN cubiculos_mantenimiento cm 
                      ON cb.id = cm.cubiculo_id AND cm.fecha = $1
                    ORDER BY cb.campus_id, cb.codigo ASC
                    """,
                    fecha_dt
                )
        else:
            if campus_id:
                filas = await conn.fetch(
                    "SELECT id, codigo, campus_id, estado FROM cubiculos WHERE campus_id = $1 ORDER BY codigo ASC",
                    campus_id
                )
            else:
                filas = await conn.fetch("SELECT id, codigo, campus_id, estado FROM cubiculos ORDER BY campus_id, codigo ASC")
        return [dict(f) for f in filas]


@app.post("/api/cubiculos", status_code=status.HTTP_201_CREATED)
async def crear_cubiculo(data: CrearCubiculoRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    codigo_clean = data.codigo.strip().upper()
    async with pool.acquire() as conn:
        existente = await conn.fetchval(
            "SELECT id FROM cubiculos WHERE UPPER(codigo) = $1",
            codigo_clean
        )
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un cubículo registrado con el código '{codigo_clean}'."
            )

        try:
            row = await conn.fetchrow(
                "INSERT INTO cubiculos (codigo, campus_id) VALUES ($1, $2) RETURNING id, codigo, campus_id, estado",
                codigo_clean, data.campus_id
            )
            await conn.execute(
                "UPDATE campus SET cubiculas_fisicos = (SELECT COUNT(*) FROM cubiculos WHERE campus_id = $1) WHERE id = $1",
                data.campus_id
            )
            await invalidar_caches_disponibilidad()
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un cubículo registrado con el código '{codigo_clean}'."
            )


@app.put("/api/cubiculos/{cubiculo_id}")
async def actualizar_cubiculo(cubiculo_id: int, data: ActualizarCubiculoRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row_cub = await conn.fetchrow("SELECT id, codigo, campus_id, estado FROM cubiculos WHERE id = $1", cubiculo_id)
        if not row_cub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cubículo no encontrado.")

        codigo_clean = data.codigo.strip().upper() if data.codigo else row_cub["codigo"]
        estado_clean = data.estado.strip().lower() if data.estado else (row_cub["estado"] or "disponible")

        if estado_clean not in ["disponible", "mantenimiento"]:
            estado_clean = "disponible"

        if data.codigo and codigo_clean != row_cub["codigo"]:
            existente = await conn.fetchval(
                "SELECT id FROM cubiculos WHERE UPPER(codigo) = $1 AND id != $2",
                codigo_clean, cubiculo_id
            )
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe un cubículo registrado con el código '{codigo_clean}'."
                )

        try:
            row = await conn.fetchrow(
                "UPDATE cubiculos SET codigo = $1, estado = $2 WHERE id = $3 RETURNING id, codigo, campus_id, estado",
                codigo_clean, estado_clean, cubiculo_id
            )
            await invalidar_caches_disponibilidad()
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un cubículo registrado con el código '{codigo_clean}'."
            )


@app.delete("/api/cubiculos/{cubiculo_id}")
async def eliminar_cubiculo(cubiculo_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT campus_id FROM cubiculos WHERE id = $1", cubiculo_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cubículo no encontrado.")
        
        campus_id = row["campus_id"]
        await conn.execute("DELETE FROM cubiculos WHERE id = $1", cubiculo_id)
        await conn.execute(
            "UPDATE campus SET cubiculas_fisicos = (SELECT COUNT(*) FROM cubiculos WHERE campus_id = $1) WHERE id = $1",
            campus_id
        )
        await invalidar_caches_disponibilidad()
        return {"mensaje": "Cubículo eliminado exitosamente", "campus_id": campus_id}


@app.get("/api/cubiculos/{cubiculo_id}/mantenimientos")
async def obtener_mantenimientos_cubiculo(cubiculo_id: int):
    async with pool.acquire() as conn:
        filas = await conn.fetch(
            """
            SELECT id, cubiculo_id, fecha::text as fecha, motivo, creado_por, created_at::text as created_at
            FROM cubiculos_mantenimiento
            WHERE cubiculo_id = $1
            ORDER BY fecha ASC
            """,
            cubiculo_id
        )
        return [dict(f) for f in filas]


@app.post("/api/cubiculos/{cubiculo_id}/mantenimientos", status_code=status.HTTP_201_CREATED)
async def programar_mantenimiento_cubiculo(
    cubiculo_id: int, 
    data: CrearMantenimientoCubiculoRequest, 
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    try:
        fecha_dt = datetime.strptime(data.fecha.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de fecha inválido. Use YYYY-MM-DD.")

    motivo = (data.motivo or "Mantenimiento / Fuera de servicio").strip()
    admin_nombre = current_user.get("nombre") or "Administrador"

    async with pool.acquire() as conn:
        cub = await conn.fetchrow("SELECT id, codigo, campus_id FROM cubiculos WHERE id = $1", cubiculo_id)
        if not cub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cubículo no encontrado.")

        existente = await conn.fetchval(
            "SELECT id FROM cubiculos_mantenimiento WHERE cubiculo_id = $1 AND fecha = $2",
            cubiculo_id, fecha_dt
        )
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El cubículo '{cub['codigo']}' ya tiene mantenimiento programado para el día {data.fecha}."
            )

        reservas_activas = await conn.fetch(
            "SELECT id, nombre, hora FROM reservas WHERE cubiculo_id = $1 AND fecha = $2",
            cubiculo_id, fecha_dt
        )
        if reservas_activas:
            for res in reservas_activas:
                otro_cub = await conn.fetchrow(
                    """
                    SELECT cb.id, cb.codigo 
                    FROM cubiculos cb
                    WHERE cb.campus_id = $1 
                      AND cb.id != $2
                      AND (cb.estado IS NULL OR cb.estado = 'disponible')
                      AND cb.id NOT IN (
                          SELECT cm.cubiculo_id FROM cubiculos_mantenimiento cm WHERE cm.fecha = $3
                      )
                      AND cb.id NOT IN (
                          SELECT r.cubiculo_id 
                          FROM reservas r 
                          WHERE r.campus_id = $1 AND r.fecha = $3 AND r.hora = $4 AND r.cubiculo_id IS NOT NULL AND r.id != $5
                      )
                    ORDER BY cb.codigo ASC
                    LIMIT 1
                    """,
                    cub["campus_id"], cubiculo_id, fecha_dt, res["hora"], res["id"]
                )
                if otro_cub:
                    await conn.execute("UPDATE reservas SET cubiculo_id = $1 WHERE id = $2", otro_cub["id"], res["id"])
                else:
                    hora_str = res["hora"].strftime("%H:%M") if hasattr(res["hora"], "strftime") else str(res["hora"])[:5]
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"No se puede programar mantenimiento para el {data.fecha}: la reserva de '{res['nombre']}' a las {hora_str} hrs está asignada a este cubículo y no hay cubículos libres alternativos."
                    )

        row = await conn.fetchrow(
            """
            INSERT INTO cubiculos_mantenimiento (cubiculo_id, fecha, motivo, creado_por)
            VALUES ($1, $2, $3, $4)
            RETURNING id, cubiculo_id, fecha::text as fecha, motivo, creado_por, created_at::text as created_at
            """,
            cubiculo_id, fecha_dt, motivo, admin_nombre
        )
        await invalidar_caches_disponibilidad()
        return dict(row)


@app.delete("/api/cubiculos/mantenimientos/{mantenimiento_id}")
async def eliminar_mantenimiento_cubiculo(mantenimiento_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "DELETE FROM cubiculos_mantenimiento WHERE id = $1 RETURNING id, cubiculo_id, fecha::text as fecha",
            mantenimiento_id
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro de mantenimiento no encontrado.")
        
        await invalidar_caches_disponibilidad()
        return {"mensaje": "Mantenimiento eliminado exitosamente", "mantenimiento": dict(row)}


@app.post("/api/reservas/{reserva_id}/inasistencia")
async def marcar_inasistencia_reserva(reserva_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Solo administradores pueden registrar inasistencias."
        )

    async with pool.acquire() as conn:
        async with conn.transaction():
            res = await conn.fetchrow(
                "SELECT id, nombre, rut, campus_id, fecha, hora, cubiculo_id FROM reservas WHERE id = $1",
                reserva_id
            )
            if not res:
                h_row = await conn.fetchrow("SELECT id, estado, rut FROM historial_reservas WHERE reserva_id = $1 LIMIT 1", reserva_id)
                if h_row and h_row["estado"] == "inasistencia":
                    sancion = await verificar_sancion_usuario(conn, h_row["rut"])
                    return {
                        "success": True,
                        "reserva_id": reserva_id,
                        "estado": "inasistencia",
                        "total_inasistencias": sancion.get("total_inasistencias", 0),
                        "suspendido": sancion.get("suspendido", False),
                        "fecha_desbloqueo": sancion.get("fecha_desbloqueo"),
                        "mensaje": "La reserva ya había sido registrada como inasistencia.",
                        "sancion": {
                            "suspendido": sancion.get("suspendido", False),
                            "inasistencias_periodo": sancion.get("total_inasistencias", 0),
                            "fecha_desbloqueo": sancion.get("fecha_desbloqueo")
                        }
                    }
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No se encontró la reserva activa ID {reserva_id}.")

            rut_estudiante = res["rut"]
            nombre_estudiante = res["nombre"]
            campus_id = res["campus_id"]
            fecha_res = res["fecha"]
            hora_res = str(res["hora"])

            res_upd = await conn.execute(
                """
                UPDATE historial_reservas
                SET estado = 'inasistencia', fecha_registro = NOW()
                WHERE reserva_id = $1
                """,
                reserva_id
            )
            if res_upd == "UPDATE 0":
                await conn.execute(
                    """
                    INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado, fecha_registro)
                    VALUES ($1, $2, $3, $4, $5, $6, 'inasistencia', NOW())
                    ON CONFLICT (reserva_id) DO UPDATE SET estado = 'inasistencia', fecha_registro = NOW()
                    """,
                    reserva_id, nombre_estudiante, rut_estudiante, campus_id, fecha_res, hora_res
                )
            else:
                await conn.execute(
                    """
                    DELETE FROM historial_reservas
                    WHERE reserva_id = $1
                      AND id NOT IN (
                          SELECT MIN(id) FROM historial_reservas WHERE reserva_id = $1
                      )
                    """,
                    reserva_id
                )

            await conn.execute("DELETE FROM reserva_acompanantes WHERE reserva_id = $1", reserva_id)
            await conn.execute("DELETE FROM reservas WHERE id = $1", reserva_id)

            sancion = await verificar_sancion_usuario(conn, rut_estudiante)
            total_inasistencias = sancion.get("total_inasistencias", 1)
            suspendido = sancion.get("suspendido", False)

            mensaje = f"Inasistencia registrada para {nombre_estudiante} (RUT: {rut_estudiante}). Cubículo liberado con éxito."
            if suspendido:
                mensaje += f" Acumula {total_inasistencias} inasistencias y su cuenta fue suspendida por 3 días (hasta {sancion.get('fecha_desbloqueo')})."
            else:
                mensaje += f" Acumula {total_inasistencias} inasistencia(s)."

            await invalidar_caches_disponibilidad()

            return {
                "success": True,
                "reserva_id": reserva_id,
                "estado": "inasistencia",
                "total_inasistencias": total_inasistencias,
                "suspendido": suspendido,
                "fecha_desbloqueo": sancion.get("fecha_desbloqueo"),
                "mensaje": mensaje,
                "sancion": {
                    "suspendido": suspendido,
                    "inasistencias_periodo": total_inasistencias,
                    "fecha_desbloqueo": sancion.get("fecha_desbloqueo")
                }
            }


@app.get("/api/usuarios/sancion")
async def consultar_sancion_usuario(
    rut: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    rut_target = rut
    if credentials and credentials.credentials:
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email:
                async with pool.acquire() as conn:
                    row_u = await conn.fetchrow("SELECT rut, rol FROM usuarios WHERE email = $1", email)
                    if row_u and (row_u["rol"] != "admin" or not rut_target):
                        rut_target = row_u["rut"]
        except Exception:
            pass

    if not rut_target:
        return {"suspendido": False, "total_inasistencias": 0, "dias_restantes": 0, "fecha_desbloqueo": None, "mensaje": ""}

    async with pool.acquire() as conn:
        return await verificar_sancion_usuario(conn, rut_target)


@app.get("/api/admin/sancionados")
async def listar_estudiantes_sancionados(current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        filas = await conn.fetch(
            """
            SELECT 
                h.rut,
                MAX(h.nombre) as nombre,
                COUNT(DISTINCT COALESCE(h.reserva_id, h.id)) as total_inasistencias,
                MAX(h.fecha_registro) as ultima_fecha_registro,
                MAX(h.fecha) as ultima_fecha
            FROM historial_reservas h
            WHERE h.estado = 'inasistencia'
            GROUP BY h.rut
            ORDER BY COUNT(DISTINCT COALESCE(h.reserva_id, h.id)) DESC, MAX(h.fecha_registro) DESC
            """
        )

        resultado = []
        for f in filas:
            sancion = await verificar_sancion_usuario(conn, f["rut"])
            resultado.append({
                "rut": f["rut"],
                "nombre": f["nombre"],
                "total_inasistencias": sancion.get("total_inasistencias", f["total_inasistencias"]),
                "suspendido": sancion.get("suspendido", False),
                "dias_restantes": sancion.get("dias_restantes", 0),
                "fecha_desbloqueo": sancion.get("fecha_desbloqueo"),
                "ultima_inasistencia": str(f["ultima_fecha"]),
                "mensaje": sancion.get("mensaje", "")
            })

        return resultado


@app.post("/api/admin/sancionados/levantar")
async def levantar_sancion_estudiante(data: LevantarSancionRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    rut_limpio = str(data.rut).replace(".", "").replace("-", "").replace(" ", "").upper().strip()
    if not rut_limpio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RUT inválido.")

    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE historial_reservas 
            SET estado = 'justificada'
            WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $1 
              AND estado = 'inasistencia'
            """,
            rut_limpio
        )
        return {
            "mensaje": f"Sanción levantada con éxito para el RUT {data.rut}. Las inasistencias acumuladas han sido justificadas.",
            "rut": data.rut
        }


@app.post("/api/incidencias", status_code=status.HTTP_201_CREATED)
async def reportar_incidencia(
    data: CrearIncidenciaRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    if not data.descripcion or not data.descripcion.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La descripción de la incidencia es requerida.")

    async with pool.acquire() as conn:
        cid = data.cubiculo_id
        est_rut = data.estudiante_rut
        est_nombre = data.estudiante_nombre

        if current_user:
            if not est_rut:
                est_rut = current_user.get("rut")
            if not est_nombre:
                est_nombre = current_user.get("nombre")

        if data.reserva_id:
            row_res = await conn.fetchrow(
                "SELECT cubiculo_id, rut, nombre FROM reservas WHERE id = $1",
                data.reserva_id
            )
            if row_res:
                if not cid:
                    cid = row_res["cubiculo_id"]
                if not est_rut:
                    est_rut = row_res["rut"]
                if not est_nombre:
                    est_nombre = row_res["nombre"]
            else:
                row_h = await conn.fetchrow(
                    "SELECT rut, nombre FROM historial_reservas WHERE reserva_id = $1 OR id = $1 LIMIT 1",
                    data.reserva_id
                )
                if row_h:
                    if not est_rut:
                        est_rut = row_h["rut"]
                    if not est_nombre:
                        est_nombre = row_h["nombre"]

        if not cid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe indicar el cubículo asociado al problema.")

        cub_existe = await conn.fetchrow("SELECT id, codigo FROM cubiculos WHERE id = $1", cid)
        if not cub_existe:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El cubículo indicado no existe.")

        est_rut_limpio = html.escape(est_rut.strip()) if est_rut else None
        est_nombre_limpio = html.escape(est_nombre.strip()) if est_nombre else None
        cat_limpia = html.escape((data.categoria or "otro").strip())
        desc_limpia = html.escape(data.descripcion.strip())

        row = await conn.fetchrow(
            """
            INSERT INTO incidencias_cubiculos (
                cubiculo_id, reserva_id, estudiante_rut, estudiante_nombre, categoria, descripcion, estado
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
            RETURNING id, cubiculo_id, reserva_id, estudiante_rut, estudiante_nombre, categoria, descripcion, estado, created_at
            """,
            cid,
            data.reserva_id,
            est_rut_limpio,
            est_nombre_limpio,
            cat_limpia,
            desc_limpia
        )
        return {
            "mensaje": "Reporte de incidencia registrado correctamente. Nuestro equipo lo revisará a la brevedad.",
            "incidencia": dict(row)
        }


@app.get("/api/admin/incidencias")
async def listar_incidencias(
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        query = """
            SELECT 
                i.id,
                i.cubiculo_id,
                cb.codigo AS cubiculo_codigo,
                c.id AS campus_id,
                c.nombre AS campus_nombre,
                i.reserva_id,
                i.estudiante_rut,
                i.estudiante_nombre,
                i.categoria,
                i.descripcion,
                i.estado,
                i.solucion,
                i.created_at
            FROM incidencias_cubiculos i
            JOIN cubiculos cb ON i.cubiculo_id = cb.id
            JOIN campus c ON cb.campus_id = c.id
        """
        params = []
        if estado and estado != "todos":
            query += " WHERE i.estado = $1"
            params.append(estado)

        query += " ORDER BY i.created_at DESC"

        filas = await conn.fetch(query, *params)
        return [
            {
                "id": f["id"],
                "cubiculo_id": f["cubiculo_id"],
                "cubiculo_codigo": f["cubiculo_codigo"],
                "campus_id": f["campus_id"],
                "campus_nombre": f["campus_nombre"],
                "reserva_id": f["reserva_id"],
                "estudiante_rut": f["estudiante_rut"],
                "estudiante_nombre": f["estudiante_nombre"],
                "categoria": f["categoria"],
                "descripcion": f["descripcion"],
                "estado": f["estado"],
                "solucion": f["solucion"],
                "created_at": f["created_at"].strftime("%Y-%m-%d %H:%M:%S") if f["created_at"] else ""
            }
            for f in filas
        ]


@app.put("/api/admin/incidencias/{incidencia_id}/estado")
async def actualizar_estado_incidencia(
    incidencia_id: int,
    data: ActualizarEstadoIncidenciaRequest,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    estados_validos = ["pendiente", "en_revision", "resuelta"]
    if data.estado not in estados_validos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Estado inválido. Opciones: {', '.join(estados_validos)}")

    solucion_limpia = html.escape(data.solucion.strip()) if data.solucion else None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE incidencias_cubiculos
            SET estado = $1, solucion = $2
            WHERE id = $3
            RETURNING id, cubiculo_id, estado, solucion
            """,
            data.estado,
            solucion_limpia,
            incidencia_id
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidencia no encontrada.")
        return {"mensaje": "Estado de incidencia actualizado correctamente.", "incidencia": dict(row)}


@app.get("/api/cms/anuncios")
async def obtener_anuncios_cms():
    async with pool.acquire() as conn:
        filas = await conn.fetch("SELECT * FROM anuncios_cms ORDER BY orden ASC, id ASC")
        return [dict(f) for f in filas]


@app.post("/api/cms/anuncios", status_code=status.HTTP_201_CREATED)
async def crear_anuncio_cms(data: AnuncioCMSRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO anuncios_cms (titulo, subtitulo, badge, boton_texto, boton_link, color_fondo, orden)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            """,
            data.titulo.strip(), data.subtitulo.strip(), data.badge.strip(),
            data.boton_texto.strip(), data.boton_link.strip(), data.color_fondo.strip(), data.orden
        )
        return dict(row)


@app.put("/api/cms/anuncios/{anuncio_id}")
async def actualizar_anuncio_cms(anuncio_id: int, data: AnuncioCMSRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE anuncios_cms
            SET titulo = $1, subtitulo = $2, badge = $3, boton_texto = $4, boton_link = $5, color_fondo = $6, orden = $7
            WHERE id = $8
            RETURNING *
            """,
            data.titulo.strip(), data.subtitulo.strip(), data.badge.strip(),
            data.boton_texto.strip(), data.boton_link.strip(), data.color_fondo.strip(), data.orden, anuncio_id
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anuncio no encontrado.")
        return dict(row)


@app.delete("/api/cms/anuncios/{anuncio_id}")
async def eliminar_anuncio_cms(anuncio_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM anuncios_cms WHERE id = $1", anuncio_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anuncio no encontrado.")
        return {"mensaje": "Anuncio eliminado exitosamente"}


@app.get("/api/cms/tarjetas")
async def obtener_tarjetas_cms():
    async with pool.acquire() as conn:
        filas = await conn.fetch("SELECT * FROM tarjetas_cms ORDER BY orden ASC, id ASC")
        return [dict(f) for f in filas]


@app.post("/api/cms/tarjetas", status_code=status.HTTP_201_CREATED)
async def crear_tarjeta_cms(data: TarjetaCMSRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO tarjetas_cms (icono, titulo, descripcion, link_texto, link_url, orden)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            data.icono.strip(), data.titulo.strip(), data.descripcion.strip(),
            data.link_texto.strip(), data.link_url.strip(), data.orden
        )
        return dict(row)


@app.put("/api/cms/tarjetas/{tarjeta_id}")
async def actualizar_tarjeta_cms(tarjeta_id: int, data: TarjetaCMSRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE tarjetas_cms
            SET icono = $1, titulo = $2, descripcion = $3, link_texto = $4, link_url = $5, orden = $6
            WHERE id = $7
            RETURNING *
            """,
            data.icono.strip(), data.titulo.strip(), data.descripcion.strip(),
            data.link_texto.strip(), data.link_url.strip(), data.orden, tarjeta_id
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarjeta no encontrada.")
        return dict(row)


@app.delete("/api/cms/tarjetas/{tarjeta_id}")
async def eliminar_tarjeta_cms(tarjeta_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM tarjetas_cms WHERE id = $1", tarjeta_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarjeta no encontrada.")
        return {"mensaje": "Tarjeta eliminada exitosamente"}


@app.get("/api/cms/faqs")
async def obtener_faqs_cms():
    async with pool.acquire() as conn:
        filas = await conn.fetch("SELECT * FROM faqs_cms ORDER BY orden ASC, id ASC")
        return [dict(f) for f in filas]


@app.post("/api/cms/faqs", status_code=status.HTTP_201_CREATED)
async def crear_faq_cms(data: FaqCMSRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO faqs_cms (pregunta, respuesta, categoria, orden)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            data.pregunta.strip(), data.respuesta.strip(), data.categoria.strip(), data.orden
        )
        return dict(row)


@app.put("/api/cms/faqs/{faq_id}")
async def actualizar_faq_cms(faq_id: int, data: FaqCMSRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE faqs_cms
            SET pregunta = $1, respuesta = $2, categoria = $3, orden = $4
            WHERE id = $5
            RETURNING *
            """,
            data.pregunta.strip(), data.respuesta.strip(), data.categoria.strip(), data.orden, faq_id
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta frecuente no encontrada.")
        return dict(row)


@app.delete("/api/cms/faqs/{faq_id}")
async def eliminar_faq_cms(faq_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM faqs_cms WHERE id = $1", faq_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta frecuente no encontrada.")
        return {"mensaje": "Pregunta frecuente eliminada exitosamente"}


@app.get("/api/feriados")
async def obtener_feriados(year: Optional[int] = Query(None)):
    y = year or date.today().year
    years = [y - 1, y, y + 1] if not year else [y, y + 1]
    cl_holidays = holidays.country_holidays("CL", language="es", years=years)
    lista = [
        {"fecha": d.strftime("%Y-%m-%d"), "nombre": nombre}
        for d, nombre in sorted(cl_holidays.items())
    ]
    fechas = [item["fecha"] for item in lista]
    return {"feriados": fechas, "detalles": lista}


@app.get("/api/calendario/bloqueos")
async def obtener_dias_bloqueados(campus_id: Optional[int] = None):
    async with pool.acquire() as conn:
        if campus_id:
            filas = await conn.fetch(
                """
                SELECT b.id, b.fecha::text, b.motivo, b.campus_id, b.creado_por, b.created_at::text, c.nombre AS campus_nombre
                FROM dias_bloqueados b
                LEFT JOIN campus c ON b.campus_id = c.id
                WHERE b.campus_id IS NULL OR b.campus_id = $1
                ORDER BY b.fecha ASC
                """,
                campus_id
            )
        else:
            filas = await conn.fetch(
                """
                SELECT b.id, b.fecha::text, b.motivo, b.campus_id, b.creado_por, b.created_at::text, c.nombre AS campus_nombre
                FROM dias_bloqueados b
                LEFT JOIN campus c ON b.campus_id = c.id
                ORDER BY b.fecha ASC
                """
            )
        return [dict(f) for f in filas]


@app.post("/api/calendario/bloqueos", status_code=status.HTTP_201_CREATED)
async def crear_dia_bloqueado(data: BloqueoDiaRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")
    try:
        f_parsed = datetime.strptime(data.fecha.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usa YYYY-MM-DD.")

    async with pool.acquire() as conn:
        existe = await conn.fetchrow(
            "SELECT id FROM dias_bloqueados WHERE fecha = $1 AND (($2::int IS NULL AND campus_id IS NULL) OR campus_id = $2)",
            f_parsed, data.campus_id
        )
        if existe:
            raise HTTPException(status_code=400, detail="La fecha ya se encuentra bloqueada para esa sede.")
        
        row = await conn.fetchrow(
            """
            INSERT INTO dias_bloqueados (fecha, motivo, campus_id, creado_por)
            VALUES ($1, $2, $3, $4)
            RETURNING id, fecha::text, motivo, campus_id, creado_por, created_at::text
            """,
            f_parsed, data.motivo.strip() if data.motivo else "Día bloqueado administrativamente", data.campus_id, current_user.get("nombre", "Admin")
        )
        await invalidar_caches_disponibilidad(data.campus_id, data.fecha.strip())
        return dict(row)


@app.delete("/api/calendario/bloqueos/{bloqueo_id}")
async def eliminar_dia_bloqueado(bloqueo_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")
    async with pool.acquire() as conn:
        row = await conn.fetchrow("DELETE FROM dias_bloqueados WHERE id = $1 RETURNING fecha::text, campus_id", bloqueo_id)
        if not row:
            raise HTTPException(status_code=404, detail="Bloqueo no encontrado.")
        await invalidar_caches_disponibilidad(row["campus_id"], row["fecha"])
        return {"mensaje": "Día desbloqueado con éxito."}


# --- Endpoints Públicos y Admin ---

@app.get("/api/campus")
async def obtener_campus():
    try:
        async with pool.acquire() as conn:
            filas = await conn.fetch(
                """
                SELECT c.id, c.nombre, 
                       COALESCE(COUNT(cb.id), c.cubiculas_fisicos) AS cubiculas_fisicos
                FROM campus c
                LEFT JOIN cubiculos cb ON c.id = cb.campus_id
                GROUP BY c.id ORDER BY c.id ASC
                """
            )
            return [dict(f) for f in filas]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/campus", status_code=status.HTTP_201_CREATED)
async def crear_campus(data: CrearCampusRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso restringido a administradores.")

    nombre_limpio = data.nombre.strip()
    capacidad = data.cubiculas_fisicos if data.cubiculas_fisicos and data.cubiculas_fisicos > 0 else 0

    async with pool.acquire() as conn:
        async with conn.transaction():
            row_exist = await conn.fetchrow("SELECT id FROM campus WHERE LOWER(nombre) = LOWER($1)", nombre_limpio)
            if row_exist:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El campus '{nombre_limpio}' ya existe.")

            row = await conn.fetchrow(
                "INSERT INTO campus (nombre, cubiculas_fisicos) VALUES ($1, $2) RETURNING id, nombre, cubiculas_fisicos",
                nombre_limpio, capacidad
            )
            campus_id = row["id"]

            # Generar automáticamente registros en la tabla 'cubiculos' para este campus
            sigla = "".join([palabra[0] for palabra in nombre_limpio.split()]).upper()[:3] or "SED"
            for i in range(1, capacidad + 1):
                codigo_cub = f"CUB{i:02d}-{sigla}"
                await conn.execute("INSERT INTO cubiculos (codigo, campus_id) VALUES ($1, $2)", codigo_cub, campus_id)

    await invalidar_caches_disponibilidad()
    return {"id": campus_id, "nombre": nombre_limpio, "cubiculas_fisicos": capacidad}


@app.delete("/api/campus/{campus_id}")
async def eliminar_campus_por_id(campus_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso restringido a administradores.")

    async with pool.acquire() as conn:
        async with conn.transaction():
            row_c = await conn.fetchrow("SELECT nombre FROM campus WHERE id = $1", campus_id)
            if not row_c:
                raise HTTPException(status_code=404, detail="Campus no encontrado.")

            nombre_campus = row_c["nombre"]
            await conn.execute("DELETE FROM reserva_acompanantes WHERE reserva_id IN (SELECT id FROM reservas WHERE campus_id = $1)", campus_id)
            await conn.execute("DELETE FROM reservas WHERE campus_id = $1", campus_id)
            await conn.execute("DELETE FROM cubiculos WHERE campus_id = $1", campus_id)
            await conn.execute("DELETE FROM campus WHERE id = $1", campus_id)

    await invalidar_caches_disponibilidad()
    return {"message": f"El campus '{nombre_campus}', sus cubículos y reservas asociadas fueron eliminados."}


@app.get("/api/dashboard/metricas")
async def obtener_metricas_dashboard(campus_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")
    try:
        async with pool.acquire() as conn:
            filas_pico = await conn.fetch(
                """
                SELECT TO_CHAR(hora, 'HH24:MI') as hora_str, COUNT(*) as total_reservas
                FROM reservas
                WHERE ($1::int IS NULL OR campus_id = $1)
                GROUP BY hora
                ORDER BY total_reservas DESC
                LIMIT 5
                """,
                campus_id
            )
            horarios_pico = [{"hora": f["hora_str"], "total": f["total_reservas"]} for f in filas_pico]

            dias_map = {
                "Monday": "Lunes",
                "Tuesday": "Martes",
                "Wednesday": "Miércoles",
                "Thursday": "Jueves",
                "Friday": "Viernes",
                "Saturday": "Sábado",
                "Sunday": "Domingo"
            }

            filas_dias = await conn.fetch(
                """
                SELECT TO_CHAR(fecha, 'Day') as dia_nombre, EXTRACT(ISODOW FROM fecha) as dia_num, COUNT(*) as total
                FROM reservas
                WHERE ($1::int IS NULL OR campus_id = $1)
                GROUP BY dia_nombre, dia_num
                ORDER BY total DESC
                """,
                campus_id
            )
            dias_demanda = [
                {
                    "dia": dias_map.get(f["dia_nombre"].strip(), f["dia_nombre"].strip()),
                    "total": f["total"]
                }
                for f in filas_dias
            ]

            filas_sedes = await conn.fetch(
                """
                SELECT c.nombre, COUNT(r.id) as total
                FROM campus c
                LEFT JOIN reservas r ON c.id = r.campus_id
                GROUP BY c.id, c.nombre
                ORDER BY total DESC
                """
            )
            demanda_sedes = [{"campus": f["nombre"], "total": f["total"]} for f in filas_sedes]

            filas_canc_dia = await conn.fetch(
                """
                SELECT TO_CHAR(fecha, 'Day') as dia_nombre, EXTRACT(ISODOW FROM fecha) as dia_num, COUNT(*) as total_canceladas
                FROM historial_reservas
                WHERE estado = 'cancelada'
                  AND ($1::int IS NULL OR campus_id = $1)
                GROUP BY dia_nombre, dia_num
                ORDER BY dia_num ASC
                """,
                campus_id
            )
            cancelaciones_por_dia = [
                {
                    "dia": dias_map.get(f["dia_nombre"].strip(), f["dia_nombre"].strip()),
                    "total": f["total_canceladas"]
                }
                for f in filas_canc_dia
            ]

            total_registros_hist = await conn.fetchval(
                "SELECT COUNT(*) FROM historial_reservas WHERE ($1::int IS NULL OR campus_id = $1)",
                campus_id
            ) or 0

            total_canceladas_general = await conn.fetchval(
                "SELECT COUNT(*) FROM historial_reservas WHERE estado = 'cancelada' AND ($1::int IS NULL OR campus_id = $1)",
                campus_id
            ) or 0

            dias_distintos = await conn.fetchval(
                "SELECT COUNT(DISTINCT fecha) FROM historial_reservas WHERE ($1::int IS NULL OR campus_id = $1)",
                campus_id
            ) or 1

            promedio_diario = round(total_canceladas_general / max(1, dias_distintos), 1)
            tasa_cancelacion_pct = round((total_canceladas_general / max(1, total_registros_hist)) * 100, 1)

            return {
                "horarios_pico": horarios_pico,
                "dias_demanda": dias_demanda,
                "demanda_sedes": demanda_sedes,
                "cancelaciones_por_dia": cancelaciones_por_dia,
                "promedio_cancelaciones_diarias": f"{promedio_diario} elim/día",
                "total_canceladas": total_canceladas_general,
                "total_historico": total_registros_hist,
                "tasa_cancelacion_estimada": f"{tasa_cancelacion_pct}%",
                "semana_pico_examenes": "Semana 16 (Junio / Noviembre)",
                "utilidad": "Ayuda a la administración de la biblioteca a optimizar la apertura de bloques o reacondicionar espacios."
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/resumen")
async def obtener_resumen_dashboard(campus_id: Optional[int] = None, fecha: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")
    try:
        target_fecha = datetime.strptime(fecha.strip(), "%Y-%m-%d").date() if fecha and fecha.strip() else date.today()

        async with pool.acquire() as conn:
            if not campus_id:
                first_campus = await conn.fetchrow("SELECT id FROM campus ORDER BY id ASC LIMIT 1")
                if not first_campus:
                    return {
                        "campus_id": 0, "fecha": target_fecha.strftime("%Y-%m-%d"),
                        "cubiculas_fisicos": 0, "total_reservas_dia": 0,
                        "cupos_disponibles_dia": 0, "cupos_totales_diarios": 0,
                        "porcentaje_ocupacion": 0.0, "bloques": []
                    }
                campus_id = first_campus["id"]

            total_cub_bd = await conn.fetchval(
                """
                SELECT COUNT(*) FROM cubiculos cb
                WHERE cb.campus_id = $1 
                  AND (cb.estado IS NULL OR cb.estado = 'disponible')
                  AND cb.id NOT IN (
                      SELECT cm.cubiculo_id FROM cubiculos_mantenimiento cm WHERE cm.fecha = $2
                  )
                """,
                campus_id, target_fecha
            )
            if not total_cub_bd or total_cub_bd == 0:
                row_c = await conn.fetchrow("SELECT cubiculas_fisicos FROM campus WHERE id = $1", campus_id)
                total_cub_bd = row_c["cubiculas_fisicos"] if row_c else 10

            CUPOS_TOTALES_DIARIOS = len(BLOQUES_HORARIOS) * total_cub_bd

            total_reservas = await conn.fetchval(
                "SELECT COUNT(*) FROM reservas WHERE campus_id = $1 AND fecha = $2",
                campus_id, target_fecha
            ) or 0

            cupos_disponibles = max(0, CUPOS_TOTALES_DIARIOS - total_reservas)
            porcentaje = round((total_reservas / CUPOS_TOTALES_DIARIOS) * 100, 1) if CUPOS_TOTALES_DIARIOS > 0 else 0.0

            filas_bloques = await conn.fetch(
                """
                SELECT TO_CHAR(hora, 'HH24:MI') as hora_str, COUNT(*) as ocupados
                FROM reservas WHERE campus_id = $1 AND fecha = $2 GROUP BY hora
                """,
                campus_id, target_fecha
            )
            mapa_ocupacion = {f["hora_str"]: f["ocupados"] for f in filas_bloques}

            desglose_bloques = []
            for bloque in BLOQUES_HORARIOS:
                h_key = bloque["hora"]
                b_ocu = mapa_ocupacion.get(h_key, 0)
                desglose_bloques.append({
                    "hora": h_key,
                    "rango": bloque["rango"],
                    "ocupados": b_ocu,
                    "disponibles": max(0, total_cub_bd - b_ocu)
                })

            respuesta = {
                "campus_id": campus_id,
                "fecha": target_fecha.strftime("%Y-%m-%d"),
                "cubiculas_fisicos": total_cub_bd,
                "total_reservas_dia": total_reservas,
                "cupos_disponibles_dia": cupos_disponibles,
                "cupos_totales_diarios": CUPOS_TOTALES_DIARIOS,
                "porcentaje_ocupacion": porcentaje,
                "bloques": desglose_bloques
            }

            return respuesta
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/disponibilidad")
async def consultar_disponibilidad(campus_id: int, fecha: str, request: Request):
    client_ip = request.client.host if request.client else "anon"
    await enforce_rate_limit(
        "disponibilidad",
        client_ip,
        max_requests=60,
        window_seconds=60,
        custom_message="Límite de consultas de disponibilidad alcanzado. Por favor espera un momento."
    )
    try:
        fecha_parsed = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
        fecha_str = fecha_parsed.strftime("%Y-%m-%d")

        hoy = date.today()
        es_fer, nombre_fer = es_feriado_chile(fecha_parsed)
        if fecha_parsed < hoy or fecha_parsed.weekday() >= 5 or es_fer:
            motivo = "Fecha pasada" if fecha_parsed < hoy else ("Fin de semana (día no hábil)" if fecha_parsed.weekday() >= 5 else f"Feriado oficial ({nombre_fer or 'Feriado'})")
            resultado = [
                {
                    "hora": b["hora"],
                    "rango": b["rango"],
                    "ocupados": 0,
                    "disponibles": 0,
                    "capacidad_total": 0,
                    "agotado": True,
                    "bloqueado": True,
                    "motivo": motivo
                }
                for b in BLOQUES_HORARIOS
            ]
            return {
                "campus_id": campus_id,
                "fecha": fecha_str,
                "cubiculas_fisicos": 0,
                "bloqueado": True,
                "motivo": motivo,
                "bloques": resultado
            }

        async with pool.acquire() as conn:
            bloqueo = await conn.fetchrow(
                "SELECT motivo FROM dias_bloqueados WHERE fecha = $1 AND (campus_id IS NULL OR campus_id = $2) LIMIT 1",
                fecha_parsed, campus_id
            )
            if bloqueo:
                motivo = bloqueo["motivo"]
                resultado = [
                    {
                        "hora": b["hora"],
                        "rango": b["rango"],
                        "ocupados": 0,
                        "disponibles": 0,
                        "capacidad_total": 0,
                        "agotado": True,
                        "bloqueado": True,
                        "motivo": motivo
                    }
                    for b in BLOQUES_HORARIOS
                ]
                return {
                    "campus_id": campus_id,
                    "fecha": fecha_str,
                    "cubiculas_fisicos": 0,
                    "bloqueado": True,
                    "motivo": motivo,
                    "bloques": resultado
                }

            capacidad_campus = await conn.fetchval(
                """
                SELECT COUNT(*) FROM cubiculos cb
                WHERE cb.campus_id = $1 
                  AND (cb.estado IS NULL OR cb.estado = 'disponible')
                  AND cb.id NOT IN (
                      SELECT cm.cubiculo_id FROM cubiculos_mantenimiento cm WHERE cm.fecha = $2
                  )
                """,
                campus_id, fecha_parsed
            )
            if not capacidad_campus or capacidad_campus == 0:
                row_c = await conn.fetchrow("SELECT cubiculas_fisicos FROM campus WHERE id = $1", campus_id)
                capacidad_campus = row_c["cubiculas_fisicos"] if row_c else 10

            filas = await conn.fetch(
                """
                SELECT TO_CHAR(hora, 'HH24:MI') as hora_str, COUNT(*) as ocupados
                FROM reservas WHERE campus_id = $1 AND fecha = $2 GROUP BY hora
                """,
                campus_id, fecha_parsed
            )
            ocupacion_map = {f["hora_str"]: f["ocupados"] for f in filas}

            now_dt = datetime.now()
            hora_actual_str = now_dt.strftime("%H:%M")
            es_hoy = fecha_parsed == hoy

            resultado = []
            for bloque in BLOQUES_HORARIOS:
                hora_key = bloque["hora"]
                ocupados = ocupacion_map.get(hora_key, 0)
                disponibles = max(0, capacidad_campus - ocupados)
                es_pasado = es_hoy and (hora_key <= hora_actual_str)
                resultado.append({
                    "hora": hora_key,
                    "rango": bloque["rango"],
                    "ocupados": ocupados,
                    "disponibles": 0 if es_pasado else disponibles,
                    "capacidad_total": capacidad_campus,
                    "agotado": (disponibles == 0) or es_pasado,
                    "pasado": es_pasado
                })

            respuesta = {
                "campus_id": campus_id,
                "fecha": fecha_str,
                "cubiculas_fisicos": capacidad_campus,
                "bloques": resultado
            }

        return respuesta
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def validar_acompanantes_cruzados(conn, rut_titular: str, fecha_parsed: date, hora_parsed: time, acompanantes, reserva_id_excluir: Optional[int] = None):
    if not acompanantes:
        return

    rut_tit_clean = re.sub(r'[\.\-\s]', '', str(rut_titular)).upper()
    ruts_acompanantes_vistos = set()
    ruts_a_consultar = []

    for ac in acompanantes:
        raw_rut = ac.rut if hasattr(ac, 'rut') else (ac.get('rut') if isinstance(ac, dict) else None)
        raw_nombre = ac.nombre if hasattr(ac, 'nombre') else (ac.get('nombre') if isinstance(ac, dict) else None)
        if not raw_rut or not str(raw_rut).strip():
            continue

        rut_ac_clean = re.sub(r'[\.\-\s]', '', str(raw_rut)).upper()
        if not rut_ac_clean:
            continue

        if rut_ac_clean == rut_tit_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No puedes ingresarte a ti mismo como acompañante (RUT {raw_rut})."
            )

        if rut_ac_clean in ruts_acompanantes_vistos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El RUT {raw_rut} está duplicado en la lista de acompañantes. Cada integrante debe tener un RUT único."
            )
        ruts_acompanantes_vistos.add(rut_ac_clean)
        ruts_a_consultar.append((rut_ac_clean, raw_nombre or "Acompañante", raw_rut))

    for rut_ac_clean, nombre_ac, rut_orig in ruts_a_consultar:
        reserva_titular = await conn.fetchrow(
            """
            SELECT r.id, r.fecha, r.hora, c.nombre AS campus_nombre
            FROM reservas r
            LEFT JOIN campus c ON r.campus_id = c.id
            WHERE REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', '') = $1
              AND (r.fecha > CURRENT_DATE OR (r.fecha = CURRENT_DATE AND r.hora + INTERVAL '1 hour' > CURRENT_TIME))
              AND ($2::int IS NULL OR r.id != $2)
            LIMIT 1
            """,
            rut_ac_clean, reserva_id_excluir
        )
        if reserva_titular:
            fecha_str = reserva_titular["fecha"].strftime("%Y-%m-%d")
            hora_str = reserva_titular["hora"].strftime("%H:%M")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El acompañante {nombre_ac} ya posee una reserva activa en el sistema ({fecha_str} a las {hora_str} hrs). Solo se permite 1 reserva activa por estudiante."
            )

        reserva_como_ac = await conn.fetchrow(
            """
            SELECT r.id, r.fecha, r.hora, r.nombre AS titular_nombre
            FROM reserva_acompanantes ra
            JOIN reservas r ON ra.reserva_id = r.id
            WHERE REPLACE(REPLACE(UPPER(ra.rut), '.', ''), '-', '') = $1
              AND (r.fecha > CURRENT_DATE OR (r.fecha = CURRENT_DATE AND r.hora + INTERVAL '1 hour' > CURRENT_TIME))
              AND ($2::int IS NULL OR r.id != $2)
            LIMIT 1
            """,
            rut_ac_clean, reserva_id_excluir
        )
        if reserva_como_ac:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El acompañante {nombre_ac} ya está registrado como acompañante en otra reserva activa (Titular: {reserva_como_ac['titular_nombre']})."
            )

    titular_como_ac = await conn.fetchrow(
        """
        SELECT r.id, r.fecha, r.hora, r.nombre AS titular_nombre
        FROM reserva_acompanantes ra
        JOIN reservas r ON ra.reserva_id = r.id
        WHERE REPLACE(REPLACE(UPPER(ra.rut), '.', ''), '-', '') = $1
          AND (r.fecha > CURRENT_DATE OR (r.fecha = CURRENT_DATE AND r.hora + INTERVAL '1 hour' > CURRENT_TIME))
          AND ($2::int IS NULL OR r.id != $2)
        LIMIT 1
        """,
        rut_tit_clean, reserva_id_excluir
    )
    if titular_como_ac:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya estás registrado como acompañante en una reserva activa (Titular: {titular_como_ac['titular_nombre']}). No puedes registrar otra reserva."
        )


@app.post("/api/reservas", status_code=status.HTTP_201_CREATED, response_model=ReservaResponse)
async def crear_reserva(
    reserva: ReservaBase,
    request: Request,
    background_tasks: BackgroundTasks,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    current_user = None
    if credentials and credentials.credentials:
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email:
                async with pool.acquire() as conn:
                    row_u = await conn.fetchrow("SELECT id, email, nombre, rut, rol FROM usuarios WHERE email = $1", email)
                    if row_u:
                        current_user = dict(row_u)
        except JWTError:
            pass

    rut_final = reserva.rut
    nombre_final = reserva.nombre

    if current_user:
        user_rut_limpio = str(current_user.get("rut", "")).replace(".", "").upper().strip()
        req_rut_limpio = str(rut_final).replace(".", "").upper().strip() if rut_final else ""
        if current_user.get("rol") != "admin":
            if req_rut_limpio and req_rut_limpio != user_rut_limpio:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para crear reservas a nombre de otro RUT de estudiante."
                )
            rut_final = user_rut_limpio
            nombre_final = current_user.get("nombre") or nombre_final

    if reserva.sessionId:
        rut_ses = extraer_rut_de_session(reserva.sessionId)
        async with pool.acquire() as conn:
            row_s = await conn.fetchrow("SELECT rut, nombre FROM sesiones WHERE session_id = $1", reserva.sessionId)
            if row_s and row_s["rut"]:
                rut_ses = row_s["rut"]
                if row_s["nombre"] and (not nombre_final or nombre_final == "Usuario Chatbot"):
                    nombre_final = row_s["nombre"]
        if rut_ses and (not current_user or current_user.get("rol") != "admin"):
            rut_final = rut_ses

    if not rut_final or not reserva.fecha or not reserva.hora:
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios (RUT, fecha u hora).")

    rut_limpio = re.sub(r'[\.\-\s]', '', str(rut_final)).upper().strip()
    if "[" in rut_limpio or "RUT_" in rut_limpio or len(rut_limpio) > 12:
        raise HTTPException(status_code=400, detail="El RUT proporcionado no es válido.")

    client_id = rut_limpio or reserva.sessionId or (request.client.host if request.client else "anon")
    if not await check_rate_limit("reserva", client_id, max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Límite de solicitudes alcanzado. Intenta de nuevo en un minuto.")

    try:
        fecha_parsed = datetime.strptime(reserva.fecha.strip(), "%Y-%m-%d").date()
        hora_parsed = datetime.strptime(reserva.hora.strip(), "%H:%M").time()

        hoy = date.today()
        ahora = datetime.now().time()

        if fecha_parsed < hoy:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se permite agendar reservas en fechas pasadas ({reserva.fecha})."
            )

        if fecha_parsed == hoy and hora_parsed <= ahora:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El bloque de las {reserva.hora} hrs para el día de hoy ya ha transcurrido."
            )

        if fecha_parsed.weekday() >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se permite agendar reservas los fines de semana (Sábado o Domingo). La fecha {reserva.fecha} corresponde a un día no hábil."
            )

        es_fer, nombre_fer = es_feriado_chile(reserva.fecha)
        if es_fer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha {reserva.fecha} corresponde a un feriado oficial no laboral ({nombre_fer})."
            )

        async with pool.acquire() as conn:
            async with conn.transaction():
                # Resolución de campus
                target_campus_id, target_campus_nombre = None, None
                if reserva.campus_id:
                    row_c = await conn.fetchrow("SELECT id, nombre FROM campus WHERE id = $1", reserva.campus_id)
                    if row_c:
                        target_campus_id, target_campus_nombre = row_c["id"], row_c["nombre"]

                if not target_campus_id and reserva.campus:
                    nombre_clean = reserva.campus.strip().lower()
                    nombre_sin_prefijo = re.sub(r'^campus\s+', '', nombre_clean, flags=re.IGNORECASE).strip()
                    row_c = await conn.fetchrow(
                        "SELECT id, nombre FROM campus WHERE LOWER(nombre) = $1 OR LOWER(nombre) LIKE $2 LIMIT 1",
                        nombre_clean, f"%{nombre_sin_prefijo}%"
                    )
                    if row_c:
                        target_campus_id, target_campus_nombre = row_c["id"], row_c["nombre"]

                if not target_campus_id:
                    filas_c = await conn.fetch("SELECT nombre FROM campus ORDER BY id ASC")
                    nombres_formateados = ", ".join([f["nombre"] for f in filas_c])
                    raise HTTPException(status_code=400, detail=f"Sede no válida. Disponibles: {nombres_formateados}.")

                bloqueo = await conn.fetchrow(
                    "SELECT motivo FROM dias_bloqueados WHERE fecha = $1 AND (campus_id IS NULL OR campus_id = $2) LIMIT 1",
                    fecha_parsed, target_campus_id
                )
                if bloqueo:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"No se permite agendar reservas en la fecha {reserva.fecha}: {bloqueo['motivo']}."
                    )

                sancion = await verificar_sancion_usuario(conn, rut_limpio)
                if sancion.get("suspendido"):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=sancion.get("mensaje")
                    )

                reserva_activa = await conn.fetchrow(
                    """
                    SELECT r.id, r.fecha, r.hora, c.nombre AS campus_nombre, cb.codigo AS cubiculo_codigo
                    FROM reservas r
                    LEFT JOIN campus c ON r.campus_id = c.id
                    LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                    WHERE REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', ''), ' ', '') = $1
                      AND (r.fecha > CURRENT_DATE OR (r.fecha = CURRENT_DATE AND r.hora + INTERVAL '1 hour' > CURRENT_TIME))
                    LIMIT 1
                    """,
                    rut_limpio
                )
                if reserva_activa:
                    fecha_fmt = reserva_activa["fecha"].strftime("%Y-%m-%d")
                    hora_fmt = reserva_activa["hora"].strftime("%H:%M")
                    campus_nom = reserva_activa["campus_nombre"] or "Campus"
                    cub_cod = reserva_activa["cubiculo_codigo"] or "N/A"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El usuario con RUT {rut_limpio} ya posee una reserva activa para el día {fecha_fmt} a las {hora_fmt} hrs en {campus_nom} (Cubículo {cub_cod}). Solo se permite 1 reserva activa por usuario."
                    )

                reserva_como_ac = await conn.fetchrow(
                    """
                    SELECT r.id, r.fecha, r.hora, c.nombre AS campus_nombre, cb.codigo AS cubiculo_codigo, r.nombre AS titular_nombre
                    FROM reserva_acompanantes ra
                    JOIN reservas r ON ra.reserva_id = r.id
                    LEFT JOIN campus c ON r.campus_id = c.id
                    LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                    WHERE REPLACE(REPLACE(REPLACE(UPPER(ra.rut), '.', ''), '-', ''), ' ', '') = $1
                      AND (r.fecha > CURRENT_DATE OR (r.fecha = CURRENT_DATE AND r.hora + INTERVAL '1 hour' > CURRENT_TIME))
                    LIMIT 1
                    """,
                    rut_limpio
                )
                if reserva_como_ac:
                    fecha_fmt = reserva_como_ac["fecha"].strftime("%Y-%m-%d")
                    hora_fmt = reserva_como_ac["hora"].strftime("%H:%M")
                    campus_nom = reserva_como_ac["campus_nombre"] or "Campus"
                    cub_cod = reserva_como_ac["cubiculo_codigo"] or "N/A"
                    titular_nom = reserva_como_ac["titular_nombre"] or "otro estudiante"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El usuario con RUT {rut_limpio} ya está registrado como acompañante en una reserva activa (Titular: {titular_nom}) para el día {fecha_fmt} a las {hora_fmt} hrs en {campus_nom} (Cubículo {cub_cod}). Solo se permite 1 reserva activa por usuario."
                    )

                await validar_acompanantes_cruzados(conn, rut_limpio, fecha_parsed, hora_parsed, reserva.acompanantes)

                cubiculo_libre = await conn.fetchrow(
                    """
                    SELECT cb.id, cb.codigo 
                    FROM cubiculos cb
                    WHERE cb.campus_id = $1 
                      AND (cb.estado IS NULL OR cb.estado = 'disponible')
                      AND cb.id NOT IN (
                          SELECT cm.cubiculo_id FROM cubiculos_mantenimiento cm WHERE cm.fecha = $2
                      )
                      AND cb.id NOT IN (
                          SELECT r.cubiculo_id 
                          FROM reservas r 
                          WHERE r.campus_id = $1 AND r.fecha = $2 AND r.hora = $3 AND r.cubiculo_id IS NOT NULL
                      )
                    ORDER BY cb.codigo ASC
                    LIMIT 1
                    FOR UPDATE OF cb
                    """,
                    target_campus_id, fecha_parsed, hora_parsed
                )

                if not cubiculo_libre:
                    hora_str = hora_parsed.strftime("%H:%M")
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Todos los cubículos de la sede {target_campus_nombre} se encuentran reservados a las {hora_str} hrs."
                    )

                cubiculo_id_asignado = cubiculo_libre["id"]
                cubiculo_codigo_asignado = cubiculo_libre["codigo"]

                # Insertar reserva vinculando el ID del cubículo asignado
                row = await conn.fetchrow(
                    """
                    INSERT INTO reservas (nombre, rut, fecha, hora, campus_id, session_id, cubiculo_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id, nombre, rut, fecha, hora, campus_id, session_id
                    """,
                    nombre_final or "Usuario Chatbot", rut_limpio, fecha_parsed, hora_parsed,
                    target_campus_id, reserva.sessionId, cubiculo_id_asignado
                )
                reserva_id_creada = row["id"]

                await conn.execute(
                    """
                    INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado)
                    VALUES ($1, $2, $3, $4, $5, $6, 'activa')
                    """,
                    reserva_id_creada, nombre_final or "Usuario Chatbot", rut_limpio, target_campus_id, fecha_parsed, hora_parsed.strftime("%H:%M")
                )

                acompanantes_guardados = []
                if reserva.acompanantes:
                    for ac in reserva.acompanantes:
                        rut_ac_limpio = ac.rut.replace(".", "").upper().strip() if ac.rut else ""
                        row_ac = await conn.fetchrow(
                            "INSERT INTO reserva_acompanantes (reserva_id, nombre, rut) VALUES ($1, $2, $3) RETURNING nombre, rut",
                            reserva_id_creada, ac.nombre or "Acompañante", rut_ac_limpio
                        )
                        acompanantes_guardados.append({"nombre": row_ac["nombre"], "rut": row_ac["rut"]})

                if reserva.sessionId:
                    await conn.execute(
                        """
                        INSERT INTO sesiones (session_id, rut, nombre, updated_at)
                        VALUES ($1, $2, $3, NOW())
                        ON CONFLICT (session_id) 
                        DO UPDATE SET rut = EXCLUDED.rut, nombre = EXCLUDED.nombre, updated_at = NOW()
                        """,
                        reserva.sessionId, rut_limpio, nombre_final
                    )

        await invalidar_caches_disponibilidad(target_campus_id, row["fecha"].strftime("%Y-%m-%d"))

        res_data = {
            "id": str(row["id"]),
            "nombre": row["nombre"],
            "rut": row["rut"],
            "fecha": row["fecha"].strftime("%Y-%m-%d"),
            "hora": row["hora"].strftime("%H:%M"),
            "campus_id": target_campus_id,
            "campus": target_campus_nombre,
            "cubiculo_codigo": cubiculo_codigo_asignado,
            "sessionId": row["session_id"],
            "acompanantes": acompanantes_guardados
        }
        background_tasks.add_task(notificar_creacion_n8n, res_data)

        return res_data

    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una reserva previa para el RUT {rut_limpio} en esta fecha y hora."
        )


@app.post("/api/chat")
async def hablar_con_bot(input_data: MessageInput, request: Request, current_user: dict = Depends(get_current_user)):
    user_rut = (current_user.get("rut") or "").replace(".", "").upper().strip()
    client_ip = request.client.host if request.client else "anon"
    ident = user_rut or client_ip

    if not await check_rate_limit("chat_min", ident, max_requests=10, window_seconds=60, increment=False):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Has superado el límite de 10 mensajes por minuto. Por favor espera un momento.",
            headers={"Retry-After": "60"}
        )

    if not await check_rate_limit("chat_day", ident, max_requests=50, window_seconds=86400, increment=False):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Has alcanzado el límite diario de 50 mensajes con el chatbot.",
            headers={"Retry-After": "86400"}
        )

    await check_rate_limit("chat_min", ident, max_requests=10, window_seconds=60, increment=True)
    await check_rate_limit("chat_day", ident, max_requests=50, window_seconds=86400, increment=True)

    if input_data.message and len(input_data.message.strip()) > 300:
        raise HTTPException(status_code=400, detail="El mensaje no puede superar los 300 caracteres.")

    if es_mensaje_sospechoso(input_data.message):
        return {
            "response": "Como asistente de Biblioteca UCT, solo puedo responder consultas sobre reservas de cubículos, normas de uso y horarios de la biblioteca. ¿En qué te puedo orientar?"
        }

    try:
        rut_a_guardar = current_user.get("rut") or input_data.rut
        nombre_a_guardar = current_user.get("nombre") or input_data.nombre
        email_a_guardar = current_user.get("email") or input_data.email

        if rut_a_guardar:
            rut_a_guardar = rut_a_guardar.replace(".", "").upper().strip()

        rut_de_session = extraer_rut_de_session(input_data.sessionId)
        if not rut_a_guardar and rut_de_session:
            rut_a_guardar = rut_de_session

        async with pool.acquire() as conn:
            if input_data.sessionId and rut_a_guardar:
                await conn.execute(
                    """
                    INSERT INTO sesiones (session_id, rut, nombre, updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (session_id) 
                    DO UPDATE SET rut = EXCLUDED.rut, nombre = COALESCE(EXCLUDED.nombre, sesiones.nombre), updated_at = NOW()
                    """,
                    input_data.sessionId, rut_a_guardar, nombre_a_guardar
                )
            elif input_data.sessionId and not rut_a_guardar:
                row_recup = await conn.fetchrow("SELECT rut, nombre FROM sesiones WHERE session_id = $1", input_data.sessionId)
                if row_recup:
                    rut_a_guardar = row_recup["rut"]
                    nombre_a_guardar = row_recup["nombre"]

        now_dt = datetime.now()
        fecha_actual = now_dt.strftime("%Y-%m-%d")
        hora_actual = now_dt.strftime("%H:%M")
        now_dt_str = f"{fecha_actual} {hora_actual}"

        contexto_fecha = f"[Contexto temporal: Hoy es {fecha_actual} (año {now_dt.year}, mes {now_dt.month:02d}, día {now_dt.day:02d}) y la hora actual es {hora_actual}. Si el usuario pide agendar para 'hoy', 'mañana' o fechas relativas, usa siempre {fecha_actual} como referencia base. No uses fechas pasadas.]"

        mensaje_enriquecido = f"{contexto_fecha}\n{input_data.message}"
        if rut_a_guardar:
            mensaje_enriquecido = f"[Usuario autenticado: {nombre_a_guardar or 'Estudiante'} | RUT: {rut_a_guardar} | sessionId: {input_data.sessionId}]\n{contexto_fecha}\n{input_data.message}"

        payload = {
            "message": mensaje_enriquecido,
            "original_message": input_data.message,
            "sessionId": input_data.sessionId,
            "rut": rut_a_guardar,
            "nombre": nombre_a_guardar,
            "email": email_a_guardar,
            "fecha_actual": fecha_actual,
            "hora_actual": hora_actual
        }

        payload_bytes, headers = generar_headers_webhook_n8n(payload)
        timeout_n8n = float(os.getenv("N8N_CHATBOT_TIMEOUT", "120.0"))
        response = await httpx_client.post(N8N_WEBHOOK_URL, content=payload_bytes, headers=headers, timeout=timeout_n8n)
        if response.status_code != 200:
            try:
                err_data = response.json()
                raw_err = str(err_data.get("message") or err_data.get("detail") or err_data.get("output") or "")
            except Exception:
                raw_err = response.text or ""

            clean_err = re.sub(r'(?i)Bad request\s*-\s*please check your parameters\s*', '', raw_err).strip()
            clean_err = re.sub(r'(?i)NodeApiError:\s*', '', clean_err).strip()
            if clean_err:
                return {"response": clean_err}
            raise HTTPException(status_code=response.status_code, detail=f"Error {response.status_code} desde el servicio n8n.")

        data = response.json()
        bot_response = data.get("output") or data.get("message") or data.get("response") or "Reserva procesada con éxito."
        bot_response = re.sub(r'\[Usuario autenticado:[^\]]*\]\s*', '', bot_response)
        bot_response = re.sub(r'\[Fecha y hora actual:[^\]]*\]\s*', '', bot_response)
        bot_response = re.sub(r'\[Contexto temporal:[^\]]*\]\s*', '', bot_response)
        bot_response = re.sub(r'(?i)Bad request\s*-\s*please check your parameters\s*', '', bot_response)
        bot_response = re.sub(r'(?i)NodeApiError:\s*', '', bot_response)
        bot_response = re.sub(r'(?i)Calling\s+[a-zA-Z0-9_\-]+(\s*with\s+input:)?\s*\{[\s\S]*?\}', '', bot_response).strip()
        if not bot_response:
            bot_response = "Estoy procesando tu solicitud de cubículos. ¿En qué fecha, hora y sede te gustaría agendar?"
        return {"response": bot_response}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en comunicación con chatbot: {str(e)}")


@app.get("/api/reservas/recordatorios")
@app.get("/api/reservas/recordatorios-manana")
async def obtener_recordatorios_manana(dias: int = 1):
    try:
        async with pool.acquire() as conn:
            filas = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, 
                       c.nombre AS campus_nombre, cb.codigo AS cubiculo_codigo, u.email
                FROM reservas r
                LEFT JOIN campus c ON r.campus_id = c.id
                LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                LEFT JOIN usuarios u ON (
                    REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', ''), ' ', '') 
                    OR LOWER(u.nombre) = LOWER(r.nombre)
                )
                WHERE r.fecha = CURRENT_DATE + ($1 * INTERVAL '1 day')
                ORDER BY r.hora ASC
                """,
                int(dias)
            )

            resultado = []
            for f in filas:
                email_res = f["email"]
                rut_item = f["rut"] or ""
                rut_limpio = str(rut_item).replace(".", "").replace("-", "").upper().strip() if rut_item else ""

                if not email_res and rut_limpio:
                    row_u = await conn.fetchrow(
                        "SELECT email FROM usuarios WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $1 LIMIT 1",
                        rut_limpio
                    )
                    if row_u:
                        email_res = row_u["email"]

                resultado.append({
                    "id": str(f["id"]),
                    "nombre": f["nombre"] or "Estudiante",
                    "email": email_res or "",
                    "rut": rut_item,
                    "fecha": f["fecha"].strftime("%Y-%m-%d") if f["fecha"] else "",
                    "hora": f["hora"].strftime("%H:%M") if f["hora"] else "",
                    "campus": f["campus_nombre"] or "Campus UCT",
                    "cubiculo_codigo": f["cubiculo_codigo"] or "N/A"
                })

            return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/reservas")
async def eliminar_reserva(data: EsquemaEliminar, request: Request, background_tasks: BackgroundTasks, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    client_id = data.sessionId or (request.client.host if request.client else "anon")
    await enforce_rate_limit(
        "eliminar_reserva",
        client_id,
        max_requests=15,
        window_seconds=60,
        custom_message="Demasiadas solicitudes de cancelación. Por favor espera un momento."
    )
    try:
        rut_consulta = data.rut
        current_user = None

        if credentials and credentials.credentials:
            try:
                payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
                email: str = payload.get("sub")
                if email:
                    async with pool.acquire() as conn:
                        row_u = await conn.fetchrow("SELECT rut FROM usuarios WHERE email = $1", email)
                        if row_u:
                            current_user = dict(row_u)
            except JWTError:
                pass

        if current_user and current_user.get("rut"):
            rut_consulta = current_user.get("rut")

        async with pool.acquire() as conn:
            if data.sessionId:
                rut_ses = extraer_rut_de_session(data.sessionId)
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId)
                if row_sesion and row_sesion["rut"]:
                    rut_ses = row_sesion["rut"]
                if rut_ses and (not current_user or current_user.get("rol") != "admin"):
                    rut_consulta = rut_ses

            if not rut_consulta:
                raise HTTPException(status_code=400, detail="RUT no especificado.")

            rut_limpio = re.sub(r'[\.\-\s]', '', str(rut_consulta)).upper().strip()

            condicion_reserva = "WHERE REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', ''), ' ', '') = $1"
            params_fetch = [rut_limpio]
            if data.reserva_id:
                condicion_reserva += " AND r.id = $2"
                params_fetch.append(data.reserva_id)

            reservas_a_eliminar = await conn.fetch(
                f"""
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, c.nombre AS campus_nombre, cb.codigo AS cubiculo_codigo, u.email
                FROM reservas r
                LEFT JOIN campus c ON r.campus_id = c.id
                LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                LEFT JOIN usuarios u ON (REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER($1), '.', ''), '-', ''), ' ', '') OR LOWER(u.nombre) = LOWER(r.nombre))
                {condicion_reserva}
                """,
                *params_fetch
            )
            filas_canceladas = [dict(f) for f in reservas_a_eliminar]

            if not filas_canceladas:
                cond_ac = "WHERE REPLACE(REPLACE(UPPER(ra.rut), '.', ''), '-', '') = $1 AND (r.fecha > CURRENT_DATE OR (r.fecha = CURRENT_DATE AND r.hora + INTERVAL '1 hour' > CURRENT_TIME))"
                params_ac = [rut_limpio]
                if data.reserva_id:
                    cond_ac += " AND ra.reserva_id = $2"
                    params_ac.append(data.reserva_id)
                res_ac = await conn.fetchrow(
                    f"""
                    SELECT ra.id, ra.reserva_id, r.nombre AS titular_nombre, r.fecha, r.hora
                    FROM reserva_acompanantes ra
                    JOIN reservas r ON ra.reserva_id = r.id
                    {cond_ac}
                    LIMIT 1
                    """,
                    *params_ac
                )
                if res_ac:
                    await conn.execute("DELETE FROM reserva_acompanantes WHERE id = $1", res_ac["id"])
                    await invalidar_caches_disponibilidad()
                    return {
                        "ok": True,
                        "mensaje": "Te has desvinculado exitosamente de la reserva.",
                        "reserva_id": res_ac["reserva_id"],
                        "canceladas": 1
                    }
                raise HTTPException(status_code=404, detail=f"No se encontró ninguna reserva activa perteneciente al RUT {rut_limpio}.")

            ids_a_borrar = [f["id"] for f in filas_canceladas]

            async with conn.transaction():
                for res in filas_canceladas:
                    res_upd = await conn.execute("UPDATE historial_reservas SET estado = 'cancelada' WHERE reserva_id = $1", res["id"])
                    if res_upd == "UPDATE 0":
                        await conn.execute(
                            """
                            INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado)
                            VALUES ($1, $2, $3, $4, $5, $6, 'cancelada')
                            """,
                            res["id"], res["nombre"], res["rut"], res.get("campus_id"), res["fecha"], str(res["hora"])
                        )
                await conn.execute("DELETE FROM reserva_acompanantes WHERE reserva_id = ANY($1::int[])", ids_a_borrar)
                await conn.execute("DELETE FROM reservas WHERE id = ANY($1::int[])", ids_a_borrar)

            await invalidar_caches_disponibilidad()
            background_tasks.add_task(notificar_cancelacion_n8n, filas_canceladas)
            return {"message": f"Reserva del RUT {rut_limpio} eliminada con éxito."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/reservas/{reserva_id}")
async def eliminar_reserva_por_id(
    reserva_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    sessionId: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    client_id = sessionId or (request.client.host if request.client else "anon")
    await enforce_rate_limit(
        "eliminar_reserva_id",
        client_id,
        max_requests=15,
        window_seconds=60,
        custom_message="Demasiadas solicitudes de cancelación. Por favor espera un momento."
    )
    current_user = None
    if credentials and credentials.credentials:
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email:
                async with pool.acquire() as conn:
                    row_u = await conn.fetchrow("SELECT rut, rol FROM usuarios WHERE email = $1", email)
                    if row_u:
                        current_user = dict(row_u)
        except JWTError:
            pass

    async with pool.acquire() as conn:
        res_detalle = await conn.fetchrow(
            """
            SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, r.campus_id, c.nombre AS campus_nombre, cb.codigo AS cubiculo_codigo, u.email
            FROM reservas r
            LEFT JOIN campus c ON r.campus_id = c.id
            LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
            LEFT JOIN usuarios u ON (REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '.', ''), ' ', '') OR LOWER(u.nombre) = LOWER(r.nombre))
            WHERE r.id = $1
            """,
            reserva_id
        )
        if not res_detalle:
            raise HTTPException(status_code=404, detail="Reserva no encontrada.")

        rut_res_clean = str(res_detalle["rut"]).replace(".", "").replace("-", "").upper().strip()

        if current_user:
            if current_user.get("rol") != "admin":
                user_rut_clean = str(current_user.get("rut", "")).replace(".", "").replace("-", "").upper().strip()
                if user_rut_clean != rut_res_clean:
                    es_acomp = await conn.fetchrow(
                        "SELECT id FROM reserva_acompanantes WHERE reserva_id = $1 AND REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $2",
                        reserva_id, user_rut_clean
                    )
                    if es_acomp:
                        await conn.execute("DELETE FROM reserva_acompanantes WHERE id = $1", es_acomp["id"])
                        await invalidar_caches_disponibilidad()
                        return {"ok": True, "mensaje": "Te has desvinculado exitosamente de la reserva."}
                    raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta reserva.")
        elif sessionId:
            rut_ses = extraer_rut_de_session(sessionId)
            row_s = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", sessionId)
            if row_s and row_s["rut"]:
                rut_ses = row_s["rut"]
            ses_clean = str(rut_ses or "").replace(".", "").replace("-", "").upper().strip()
            if not ses_clean or ses_clean != rut_res_clean:
                raise HTTPException(status_code=403, detail="Esta reserva no corresponde a tu sesión de usuario.")
        else:
            raise HTTPException(status_code=401, detail="Se requiere autenticación o sessionId para eliminar la reserva.")

        res_dict = [dict(res_detalle)]

        async with conn.transaction():
            res_upd = await conn.execute("UPDATE historial_reservas SET estado = 'cancelada' WHERE reserva_id = $1", reserva_id)
            if res_upd == "UPDATE 0":
                await conn.execute(
                    """
                    INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado)
                    VALUES ($1, $2, $3, $4, $5, $6, 'cancelada')
                    """,
                    res_detalle["id"], res_detalle["nombre"], res_detalle["rut"], res_detalle["campus_id"], res_detalle["fecha"], str(res_detalle["hora"])
                )
            await conn.execute("DELETE FROM reserva_acompanantes WHERE reserva_id = $1", reserva_id)
            await conn.execute("DELETE FROM reservas WHERE id = $1", reserva_id)

    await invalidar_caches_disponibilidad()
    background_tasks.add_task(notificar_cancelacion_n8n, res_dict)
    return {"message": f"Reserva ID {reserva_id} eliminada con éxito."}


@app.get("/api/dashboard/historial")
async def obtener_historial_reservas(
    campus_id: Optional[int] = None,
    busqueda: Optional[str] = None,
    limite: Optional[int] = None,
    limit: Optional[int] = None,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    lim = limit if limit is not None else (limite if limite is not None else 50)
    lim = max(1, min(lim, 10000))
    off = max(0, offset)

    async with pool.acquire() as conn:
        total_row = await conn.fetchrow(
            """
            SELECT COUNT(*) AS total FROM (
                SELECT r.id
                FROM reservas r
                WHERE ($1::int IS NULL OR $1::int = 0 OR r.campus_id = $1)
                  AND ($2::text IS NULL OR $2::text = '' OR LOWER(r.nombre) LIKE '%' || LOWER($2) || '%' OR LOWER(r.rut) LIKE '%' || LOWER($2) || '%')
                UNION ALL
                SELECT h.id
                FROM historial_reservas h
                WHERE ($1::int IS NULL OR $1::int = 0 OR h.campus_id = $1)
                  AND ($2::text IS NULL OR $2::text = '' OR LOWER(h.nombre) LIKE '%' || LOWER($2) || '%' OR LOWER(h.rut) LIKE '%' || LOWER($2) || '%')
                  AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.id = h.reserva_id)
            ) t
            """,
            campus_id, busqueda
        )
        total = int(total_row["total"]) if total_row else 0

        filas = await conn.fetch(
            """
            SELECT 
                r.id, r.id AS reserva_id, r.nombre, r.rut, r.fecha::text, r.hora::text,
                CASE 
                    WHEN (r.fecha < CURRENT_DATE) OR (r.fecha = CURRENT_DATE AND r.hora < CURRENT_TIME) THEN 'expirada'
                    ELSE 'activa'
                END AS estado,
                NOW()::text AS fecha_registro,
                c.nombre AS campus_nombre
            FROM reservas r
            LEFT JOIN campus c ON r.campus_id = c.id
            WHERE ($1::int IS NULL OR $1::int = 0 OR r.campus_id = $1)
              AND ($2::text IS NULL OR $2::text = '' OR LOWER(r.nombre) LIKE '%' || LOWER($2) || '%' OR LOWER(r.rut) LIKE '%' || LOWER($2) || '%')

            UNION ALL

            SELECT 
                h.id, h.reserva_id, h.nombre, h.rut, h.fecha::text, h.hora::text,
                CASE 
                    WHEN h.estado = 'cancelada' THEN 'cancelada'
                    WHEN h.estado = 'inasistencia' THEN 'inasistencia'
                    WHEN (h.fecha < CURRENT_DATE) OR (h.fecha = CURRENT_DATE AND h.hora::time < CURRENT_TIME) THEN 'expirada'
                    ELSE h.estado
                END AS estado,
                h.fecha_registro::text AS fecha_registro,
                c.nombre AS campus_nombre
            FROM historial_reservas h
            LEFT JOIN campus c ON h.campus_id = c.id
            WHERE ($1::int IS NULL OR $1::int = 0 OR h.campus_id = $1)
              AND ($2::text IS NULL OR $2::text = '' OR LOWER(h.nombre) LIKE '%' || LOWER($2) || '%' OR LOWER(h.rut) LIKE '%' || LOWER($2) || '%')
              AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.id = h.reserva_id)

            ORDER BY fecha_registro DESC
            LIMIT $3 OFFSET $4
            """,
            campus_id, busqueda, lim, off
        )
        historial = [dict(f) for f in filas]
        for h in historial:
            if h.get("fecha"):
                h["fecha"] = str(h["fecha"])
            if h.get("fecha_registro"):
                h["fecha_registro"] = str(h["fecha_registro"])

        return {
            "registros": historial,
            "total": total,
            "limit": lim,
            "offset": off
        }


@app.delete("/api/dashboard/historial/limpiar")
async def limpiar_historial_reservas(current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        async with conn.transaction():
            res_h = await conn.execute("DELETE FROM historial_reservas")
            res_r = await conn.execute(
                """
                DELETE FROM reservas 
                WHERE (fecha < CURRENT_DATE) 
                   OR (fecha = CURRENT_DATE AND hora::time < CURRENT_TIME)
                """
            )
            res_s = await conn.execute("DELETE FROM sesiones WHERE updated_at < NOW() - INTERVAL '7 days'")
            count_h = int(res_h.split(" ")[1]) if " " in res_h else 0
            count_r = int(res_r.split(" ")[1]) if " " in res_r else 0
            count_s = int(res_s.split(" ")[1]) if " " in res_s else 0
            total_limpiado = count_h + count_r + count_s
            return {
                "mensaje": f"Historial eliminado con éxito. Se eliminaron {total_limpiado} registros antiguos.",
                "total_eliminados": total_limpiado
            }


async def procesar_edicion_reserva(
    reserva_id_target: Optional[int],
    data: EsquemaEditarReserva,
    credentials: Optional[HTTPAuthorizationCredentials] = None,
    background_tasks: Optional[BackgroundTasks] = None
) -> dict:
    current_user = None
    if credentials and credentials.credentials:
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email:
                async with pool.acquire() as conn:
                    row_u = await conn.fetchrow("SELECT id, email, nombre, rut, rol FROM usuarios WHERE email = $1", email)
                    if row_u:
                        current_user = dict(row_u)
        except JWTError:
            pass

    async with pool.acquire() as conn:
        async with conn.transaction():
            target_id = reserva_id_target or data.reserva_id
            rut_consulta = current_user.get("rut") if (current_user and current_user.get("rut")) else data.rut

            if data.sessionId:
                rut_ses = extraer_rut_de_session(data.sessionId)
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId)
                if row_sesion and row_sesion["rut"]:
                    rut_ses = row_sesion["rut"]
                if rut_ses and (not current_user or current_user.get("rol") != "admin"):
                    rut_consulta = rut_ses

            if target_id:
                res_existente = await conn.fetchrow("SELECT id, nombre, rut, fecha, hora, campus_id, cubiculo_id, session_id FROM reservas WHERE id = $1 FOR UPDATE", target_id)
            elif rut_consulta:
                rut_limpio = str(rut_consulta).replace(".", "").upper().strip()
                res_existente = await conn.fetchrow(
                    """
                    SELECT id, nombre, rut, fecha, hora, campus_id, cubiculo_id, session_id 
                    FROM reservas 
                    WHERE rut = $1 
                      AND (fecha > CURRENT_DATE OR (fecha = CURRENT_DATE AND hora + INTERVAL '1 hour' > CURRENT_TIME))
                    ORDER BY id DESC LIMIT 1
                    FOR UPDATE
                    """,
                    rut_limpio
                )
            else:
                raise HTTPException(status_code=400, detail="Debes especificar el ID de reserva, RUT o sessionId para editar.")

            if not res_existente:
                raise HTTPException(status_code=404, detail="No se encontró ninguna reserva activa para modificar.")

            reserva_id = res_existente["id"]
            rut_reserva = res_existente["rut"]

            if rut_consulta and (not current_user or current_user.get("rol") != "admin"):
                rut_res_clean = str(rut_reserva).replace(".", "").replace("-", "").upper().strip()
                rut_con_clean = str(rut_consulta).replace(".", "").replace("-", "").upper().strip()
                if rut_res_clean != rut_con_clean:
                    raise HTTPException(status_code=403, detail="No tienes permisos para modificar esta reserva.")

            nueva_fecha = datetime.strptime(data.fecha.strip(), "%Y-%m-%d").date() if data.fecha and data.fecha.strip() else res_existente["fecha"]
            nueva_hora = datetime.strptime(data.hora.strip(), "%H:%M").time() if data.hora and data.hora.strip() else res_existente["hora"]

            hoy = date.today()
            ahora = datetime.now().time()

            if nueva_fecha < hoy:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se permite trasladar reservas a fechas pasadas ({nueva_fecha.strftime('%Y-%m-%d')})."
                )

            if nueva_fecha == hoy and nueva_hora <= ahora:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El bloque de las {nueva_hora.strftime('%H:%M')} hrs para el día de hoy ya ha transcurrido."
                )

            if nueva_fecha.weekday() >= 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se permite trasladar reservas a los fines de semana (Sábado o Domingo). La fecha {nueva_fecha.strftime('%Y-%m-%d')} corresponde a un día no hábil."
                )

            if data.fecha:
                es_fer, nombre_fer = es_feriado_chile(data.fecha)
                if es_fer:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"La fecha {data.fecha} corresponde a un feriado oficial no laboral ({nombre_fer})."
                    )

            nuevo_campus_id = res_existente["campus_id"]
            nuevo_campus_nombre = None

            if data.campus_id:
                row_c = await conn.fetchrow("SELECT id, nombre FROM campus WHERE id = $1", data.campus_id)
                if row_c:
                    nuevo_campus_id, nuevo_campus_nombre = row_c["id"], row_c["nombre"]
            elif data.campus:
                nombre_clean = data.campus.strip().lower()
                nombre_sin_prefijo = re.sub(r'^campus\s+', '', nombre_clean, flags=re.IGNORECASE).strip()
                row_c = await conn.fetchrow(
                    "SELECT id, nombre FROM campus WHERE LOWER(nombre) = $1 OR LOWER(nombre) LIKE $2 LIMIT 1",
                    nombre_clean, f"%{nombre_sin_prefijo}%"
                )
                if row_c:
                    nuevo_campus_id, nuevo_campus_nombre = row_c["id"], row_c["nombre"]

            if not nuevo_campus_nombre:
                row_c = await conn.fetchrow("SELECT nombre FROM campus WHERE id = $1", nuevo_campus_id)
                nuevo_campus_nombre = row_c["nombre"] if row_c else "Campus"

            bloqueo = await conn.fetchrow(
                "SELECT motivo FROM dias_bloqueados WHERE fecha = $1 AND (campus_id IS NULL OR campus_id = $2) LIMIT 1",
                nueva_fecha, nuevo_campus_id
            )
            if bloqueo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede trasladar la reserva a la fecha {nueva_fecha.strftime('%Y-%m-%d')}: {bloqueo['motivo']}."
                )

            acompanantes_a_validar = data.acompanantes
            if acompanantes_a_validar is None:
                filas_ac_actuales = await conn.fetch("SELECT nombre, rut FROM reserva_acompanantes WHERE reserva_id = $1", reserva_id)
                acompanantes_a_validar = [{"nombre": r["nombre"], "rut": r["rut"]} for r in filas_ac_actuales]

            await validar_acompanantes_cruzados(conn, rut_reserva, nueva_fecha, nueva_hora, acompanantes_a_validar, reserva_id_excluir=reserva_id)

            cubiculo_libre = await conn.fetchrow(
                """
                SELECT cb.id, cb.codigo 
                FROM cubiculos cb
                WHERE cb.campus_id = $1 
                  AND (cb.estado IS NULL OR cb.estado = 'disponible')
                  AND cb.id NOT IN (
                      SELECT cm.cubiculo_id FROM cubiculos_mantenimiento cm WHERE cm.fecha = $2
                  )
                  AND cb.id NOT IN (
                      SELECT r.cubiculo_id 
                      FROM reservas r 
                      WHERE r.campus_id = $1 AND r.fecha = $2 AND r.hora = $3 
                        AND r.id != $4 AND r.cubiculo_id IS NOT NULL
                  )
                ORDER BY cb.codigo ASC
                LIMIT 1
                FOR UPDATE OF cb
                """,
                nuevo_campus_id, nueva_fecha, nueva_hora, reserva_id
            )

            if not cubiculo_libre:
                hora_str = nueva_hora.strftime("%H:%M")
                fecha_str = nueva_fecha.strftime("%Y-%m-%d")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"No hay cubículos disponibles en {nuevo_campus_nombre} para la fecha {fecha_str} a las {hora_str} hrs."
                )

            nuevo_cubiculo_id = cubiculo_libre["id"]
            nuevo_cubiculo_codigo = cubiculo_libre["codigo"]

            # Mantiene el nombre y rut originales del titular sin cambios
            row_upd = await conn.fetchrow(
                """
                UPDATE reservas
                SET fecha = $1, hora = $2, campus_id = $3, cubiculo_id = $4
                WHERE id = $5
                RETURNING id, nombre, rut, fecha, hora, campus_id, session_id
                """,
                nueva_fecha, nueva_hora, nuevo_campus_id, nuevo_cubiculo_id, reserva_id
            )

            await conn.execute(
                """
                UPDATE historial_reservas
                SET fecha = $1, hora = $2, campus_id = $3
                WHERE reserva_id = $4 AND estado = 'activa'
                """,
                nueva_fecha, nueva_hora.strftime("%H:%M"), nuevo_campus_id, reserva_id
            )

            if data.sessionId:
                await conn.execute(
                    """
                    INSERT INTO sesiones (session_id, rut, nombre, updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (session_id) 
                    DO UPDATE SET rut = EXCLUDED.rut, nombre = EXCLUDED.nombre, updated_at = NOW()
                    """,
                    data.sessionId, row_upd["rut"], row_upd["nombre"]
                )

            if data.acompanantes is not None:
                await conn.execute("DELETE FROM reserva_acompanantes WHERE reserva_id = $1", reserva_id)
                for ac in data.acompanantes:
                    rut_ac_limpio = ac.rut.replace(".", "").upper().strip() if ac.rut else ""
                    row_ac = await conn.fetchrow(
                        "INSERT INTO reserva_acompanantes (reserva_id, nombre, rut) VALUES ($1, $2, $3) RETURNING nombre, rut",
                        reserva_id, ac.nombre or "Acompañante", rut_ac_limpio
                    )
            
            filas_ac = await conn.fetch("SELECT nombre, rut FROM reserva_acompanantes WHERE reserva_id = $1", reserva_id)
            acompanantes_guardados = [{"nombre": ac["nombre"], "rut": ac["rut"]} for ac in filas_ac]

    await invalidar_caches_disponibilidad()

    res_data = {
        "id": str(row_upd["id"]),
        "nombre": row_upd["nombre"],
        "rut": row_upd["rut"],
        "fecha": row_upd["fecha"].strftime("%Y-%m-%d"),
        "hora": row_upd["hora"].strftime("%H:%M"),
        "campus_id": row_upd["campus_id"],
        "campus": nuevo_campus_nombre,
        "cubiculo_codigo": nuevo_cubiculo_codigo,
        "sessionId": row_upd["session_id"],
        "acompanantes": acompanantes_guardados
    }

    if background_tasks:
        background_tasks.add_task(notificar_edicion_n8n, res_data)
    else:
        await notificar_edicion_n8n(res_data)

    return res_data


@app.put("/api/reservas/{reserva_id}", response_model=ReservaResponse)
async def editar_reserva_por_id(reserva_id: int, data: EsquemaEditarReserva, background_tasks: BackgroundTasks, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    return await procesar_edicion_reserva(reserva_id, data, credentials, background_tasks)


@app.put("/api/reservas", response_model=ReservaResponse)
async def editar_reserva(data: EsquemaEditarReserva, background_tasks: BackgroundTasks, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    return await procesar_edicion_reserva(None, data, credentials, background_tasks)


@app.post("/api/reservas/consultar")
async def consultar_reservas(data: EsquemaConsulta, request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    client_id = data.sessionId or (request.client.host if request.client else "anon")
    await enforce_rate_limit(
        "consultar_reservas",
        client_id,
        max_requests=30,
        window_seconds=60,
        custom_message="Límite de consultas de reservas alcanzado. Por favor espera un momento."
    )
    try:
        rut_consulta = data.rut
        current_user = None

        if credentials and credentials.credentials:
            try:
                payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
                email: str = payload.get("sub")
                if email:
                    async with pool.acquire() as conn:
                        row_u = await conn.fetchrow("SELECT rut, rol FROM usuarios WHERE email = $1", email)
                        if row_u:
                            current_user = dict(row_u)
            except JWTError:
                pass

        if current_user:
            user_rut_limpio = str(current_user.get("rut", "")).replace(".", "").upper().strip()
            req_rut_limpio = str(rut_consulta).replace(".", "").upper().strip() if rut_consulta else ""
            if current_user.get("rol") != "admin":
                if req_rut_limpio and req_rut_limpio != user_rut_limpio:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permiso para consultar reservas pertenecientes a otro RUT de estudiante."
                    )
                rut_consulta = user_rut_limpio

        async with pool.acquire() as conn:
            if data.sessionId:
                rut_ses = extraer_rut_de_session(data.sessionId)
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId)
                if row_sesion and row_sesion["rut"]:
                    rut_ses = row_sesion["rut"]
                if rut_ses and (not current_user or current_user.get("rol") != "admin"):
                    rut_consulta = rut_ses

            if not rut_consulta or "[" in str(rut_consulta):
                raise HTTPException(status_code=400, detail="RUT no válido.")

            rut_limpio = re.sub(r'[\.\-\s]', '', str(rut_consulta)).upper().strip()

            reservas_usuario = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, c.nombre AS campus_nombre, r.campus_id, r.cubiculo_id, cb.codigo AS cubiculo_codigo,
                       (CASE WHEN REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', '') = $1 THEN true ELSE false END) AS es_titular
                FROM reservas r
                LEFT JOIN campus c ON r.campus_id = c.id
                LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                WHERE REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', '') = $1 
                   OR r.id IN (
                       SELECT ra.reserva_id 
                       FROM reserva_acompanantes ra 
                       WHERE REPLACE(REPLACE(UPPER(ra.rut), '.', ''), '-', '') = $1
                   )
                ORDER BY r.fecha ASC, r.hora ASC
                """,
                rut_limpio
            )

            now_date = date.today()
            now_time = datetime.now().time()

            respuesta = []
            for r in reservas_usuario:
                filas_ac = await conn.fetch("SELECT nombre, rut FROM reserva_acompanantes WHERE reserva_id = $1", r["id"])
                lista_ac = [{"nombre": ac["nombre"], "rut": ac["rut"]} for ac in filas_ac]

                r_fecha = r["fecha"]
                r_hora = r["hora"]
                hora_fin = (datetime.combine(r_fecha, r_hora) + timedelta(hours=1)).time()
                es_activa = (r_fecha > now_date) or (r_fecha == now_date and hora_fin > now_time)
                es_titular = bool(r["es_titular"])

                if es_activa:
                    respuesta.append({
                        "id": str(r["id"]),
                        "nombre": r["nombre"],
                        "rut": r["rut"],
                        "fecha": r_fecha.strftime("%Y-%m-%d"),
                        "hora": r_hora.strftime("%H:%M"),
                        "campus_id": r["campus_id"],
                        "cubiculo_id": r["cubiculo_id"],
                        "campus": r["campus_nombre"] or "Sin asignación",
                        "cubiculo_codigo": r["cubiculo_codigo"] or "Sin asignación",
                        "activa": True,
                        "acompanantes": lista_ac,
                        "estado": "activa",
                        "es_titular": es_titular,
                        "rol_estudiante": "titular" if es_titular else "acompanante",
                        "titular_nombre": r["nombre"],
                        "titular_rut": r["rut"],
                    })

            pagina = max(1, data.pagina_historial or 1)
            limite = max(1, min(data.limite_historial or 5, 50))
            offset = (pagina - 1) * limite

            total_historial_row = await conn.fetchrow(
                """
                SELECT COUNT(*) AS total
                FROM historial_reservas h
                WHERE REPLACE(REPLACE(REPLACE(UPPER(h.rut), '.', ''), '-', ''), ' ', '') = $1
                  AND NOT EXISTS (
                      SELECT 1 FROM reservas r 
                      WHERE r.id = h.reserva_id 
                        AND (r.fecha > CURRENT_DATE OR (r.fecha = CURRENT_DATE AND (r.hora + interval '1 hour') > CURRENT_TIME))
                  )
                """,
                rut_limpio
            )
            total_historial = int(total_historial_row["total"]) if total_historial_row else 0
            total_paginas = max(1, (total_historial + limite - 1) // limite) if total_historial > 0 else 1

            if not respuesta and total_historial == 0:
                sancion = await verificar_sancion_usuario(conn, rut_limpio)
                return {
                    "success": True,
                    "reservas": [],
                    "sancion": sancion,
                    "paginacion_historial": {
                        "pagina": 1,
                        "limite": limite,
                        "total_items": 0,
                        "total_paginas": 1
                    }
                }

            historial_pasadas = await conn.fetch(
                """
                SELECT h.id, h.reserva_id, h.nombre, h.rut, h.fecha, h.hora, c.nombre AS campus_nombre, h.campus_id, h.estado
                FROM historial_reservas h
                LEFT JOIN campus c ON h.campus_id = c.id
                WHERE REPLACE(REPLACE(REPLACE(UPPER(h.rut), '.', ''), '-', ''), ' ', '') = $1
                  AND NOT EXISTS (
                      SELECT 1 FROM reservas r 
                      WHERE r.id = h.reserva_id 
                        AND (r.fecha > CURRENT_DATE OR (r.fecha = CURRENT_DATE AND (r.hora + interval '1 hour') > CURRENT_TIME))
                  )
                ORDER BY h.fecha_registro DESC
                LIMIT $2 OFFSET $3
                """,
                rut_limpio,
                limite,
                offset
            )
            for h in historial_pasadas:
                h_fecha = h["fecha"]
                h_hora_str = str(h["hora"])
                respuesta.append({
                    "id": str(h["reserva_id"] or h["id"]),
                    "nombre": h["nombre"],
                    "rut": h["rut"],
                    "fecha": h_fecha.strftime("%Y-%m-%d") if isinstance(h_fecha, (date, datetime)) else str(h_fecha),
                    "hora": h_hora_str[:5] if len(h_hora_str) >= 5 else h_hora_str,
                    "campus_id": h["campus_id"],
                    "campus": h["campus_nombre"] or "Campus UCT",
                    "cubiculo_codigo": "Finalizado",
                    "activa": False,
                    "estado": h["estado"],
                    "acompanantes": []
                })

            sancion = await verificar_sancion_usuario(conn, rut_limpio)
            return {
                "success": True,
                "reservas": respuesta,
                "sancion": sancion,
                "paginacion_historial": {
                    "pagina": pagina,
                    "limite": limite,
                    "total_items": total_historial,
                    "total_paginas": total_paginas
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/reservas-bloque")
async def obtener_reservas_bloque(campus_id: int, fecha: str, hora: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores.")

    try:
        fecha_parsed = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
        hora_parsed = datetime.strptime(hora.strip(), "%H:%M").time()

        async with pool.acquire() as conn:
            filas_reservas = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.session_id, cb.codigo AS cubiculo_codigo
                FROM reservas r
                LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                WHERE r.campus_id = $1 AND r.fecha = $2 AND r.hora = $3
                ORDER BY cb.codigo ASC, r.id ASC
                """,
                campus_id, fecha_parsed, hora_parsed
            )

            resultado = []
            for r in filas_reservas:
                filas_ac = await conn.fetch("SELECT nombre, rut FROM reserva_acompanantes WHERE reserva_id = $1", r["id"])
                resultado.append({
                    "id": str(r["id"]),
                    "nombre": r["nombre"],
                    "rut": r["rut"],
                    "sessionId": r["session_id"],
                    "fecha": fecha.strip(),
                    "hora": hora.strip(),
                    "cubiculo_codigo": r["cubiculo_codigo"] or "N/A",
                    "acompanantes": [{"nombre": ac["nombre"], "rut": ac["rut"]} for ac in filas_ac]
                })

            return {"reservas": resultado}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/campus/{campus_id}")
async def actualizar_campus(campus_id: int, data: ActualizarCampusRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores.")

    async with pool.acquire() as conn:
        row_c = await conn.fetchrow("SELECT id, nombre, cubiculas_fisicos FROM campus WHERE id = $1", campus_id)
        if not row_c:
            raise HTTPException(status_code=404, detail="Campus no encontrado.")

        nuevo_nombre = data.nombre.strip() if data.nombre else row_c["nombre"]
        nueva_capacidad = data.cubiculas_fisicos if (data.cubiculas_fisicos and data.cubiculas_fisicos > 0) else row_c["cubiculas_fisicos"]

        row_upd = await conn.fetchrow(
            """
            UPDATE campus 
            SET nombre = $1, cubiculas_fisicos = $2 
            WHERE id = $3 
            RETURNING id, nombre, cubiculas_fisicos
            """,
            nuevo_nombre, nueva_capacidad, campus_id
        )

    await invalidar_caches_disponibilidad()

    return {
        "id": row_upd["id"],
        "nombre": row_upd["nombre"],
        "cubiculas_fisicos": row_upd["cubiculas_fisicos"]
    }