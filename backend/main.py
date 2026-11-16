import os
import asyncio
import re
import json
import uuid
import hmac
import hashlib
import math
import html
from typing import List, Optional, Any, Dict
from datetime import datetime, date, time, timedelta
import httpx
try:
    from backend import sqlserver_adapter as asyncpg
except ImportError:
    import sqlserver_adapter as asyncpg
from fastapi import FastAPI, HTTPException, status, Depends, Request, Response, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, root_validator
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
import holidays
try:
    from backend.hikcentral import request_artemis, open_door_direct, get_person_info, HIKVISION_TERMINAL_IP, HIKVISION_TERMINAL_USER, HIKVISION_TERMINAL_PASS
except ImportError:
    from hikcentral import request_artemis, open_door_direct, get_person_info, HIKVISION_TERMINAL_IP, HIKVISION_TERMINAL_USER, HIKVISION_TERMINAL_PASS

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

import time as _time
if hasattr(_time, "tzset"):
    os.environ["TZ"] = os.getenv("TZ", "America/Santiago")
    _time.tzset()

app = FastAPI(title="API de Reservas y Chatbot UCT (SQL Server)")

_cors_env = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]
if _cors_env:
    for _orig in _cors_env.split(","):
        _orig_clean = _orig.strip()
        if _orig_clean and _orig_clean != "*" and _orig_clean not in _allowed_origins:
            _allowed_origins.append(_orig_clean)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"^https?://([a-zA-Z0-9-]+\.)*uct\.cl(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    headers = getattr(exc, "headers", None)
    detail_content = exc.detail
    message_content = detail_content if isinstance(detail_content, str) else str(detail_content)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail_content, "message": message_content, "error": message_content},
        headers=headers
    )


@app.get("/api/health")
async def health_check():
    pool_created = getattr(pool, "_created", 0) if pool else 0
    pool_host = getattr(pool, "host", None) if pool else None
    pool_err = getattr(pool, "_last_error", None) if pool else None
    db_err = getattr(app.state, "db_error", None) or pool_err
    return {
        "status": "ok",
        "db_connected": pool is not None and pool_created > 0 and db_err is None,
        "db_error": db_err,
        "db_host": pool_host,
        "pool_conns": pool_created
    }

if os.path.exists("/.dockerenv") or os.getenv("RUNNING_IN_DOCKER"):
    for _n8n_k in ["N8N_WEBHOOK_URL", "N8N_CANCELACION_WEBHOOK_URL", "N8N_CREACION_WEBHOOK_URL", "N8N_EDICION_WEBHOOK_URL", "N8N_CONTACTO_WEBHOOK_URL", "N8N_REGLAMENTO_WEBHOOK_URL", "N8N_TALLER_WEBHOOK_URL", "N8N_TALLER_RESPUESTA_WEBHOOK_URL", "N8N_ADMIN_WEBHOOK_URL"]:
        _n8n_v = os.getenv(_n8n_k)
        if _n8n_v:
            os.environ[_n8n_k] = _n8n_v.replace("://localhost:5678", "://uct-botsbiblioteca-dev-n8n-1:5678").replace("://127.0.0.1:5678", "://uct-botsbiblioteca-dev-n8n-1:5678").replace("://n8n:5678", "://uct-botsbiblioteca-dev-n8n-1:5678")

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
N8N_CANCELACION_WEBHOOK_URL = os.getenv("N8N_CANCELACION_WEBHOOK_URL")
N8N_CREACION_WEBHOOK_URL = os.getenv("N8N_CREACION_WEBHOOK_URL")
N8N_EDICION_WEBHOOK_URL = os.getenv("N8N_EDICION_WEBHOOK_URL")
N8N_REGLAMENTO_WEBHOOK_URL = os.getenv("N8N_REGLAMENTO_WEBHOOK_URL", os.getenv("N8N_ADMIN_WEBHOOK_URL", "http://uct-botsbiblioteca-dev-n8n-1:5678/webhook/consultar-reglamento"))
N8N_SECRET_KEY = os.getenv("N8N_SECRET_KEY") or "uct_n8n_shared_secret_webhook_2026"
N8N_API_KEY = os.getenv("N8N_API_KEY", "").strip()
N8N_API_BASE = os.getenv("N8N_API_BASE", "").strip()
N8N_STUDENT_WORKFLOW_ID = os.getenv("N8N_STUDENT_WORKFLOW_ID", "NfpOMbAbZ9S7CAEk").strip()
N8N_ADMIN_WORKFLOW_ID = os.getenv("N8N_ADMIN_WORKFLOW_ID", "OYl1cwAIqZb9alG4").strip()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and (os.path.exists("/.dockerenv") or os.getenv("RUNNING_IN_DOCKER")):
    DATABASE_URL = DATABASE_URL.replace("@localhost:", "@host.docker.internal:").replace("@127.0.0.1:", "@host.docker.internal:")
ALLOWED_ORIGINS = _allowed_origins
SECRET_KEY = os.getenv("SECRET_KEY") or "87efb2c92bdaaa93b2b34cee6924b26dac35d774d7996019f58458cd7e24a697"

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
            "carrera": detalle.get("carrera") or "General",
            "fecha": str(detalle.get("fecha", "")),
            "hora": str(detalle.get("hora", "")),
            "campus": detalle.get("campus") or "Campus UCT",
            "cubiculo_codigo": detalle.get("cubiculo_codigo") or "N/A",
            "acompanantes": detalle.get("acompanantes") or []
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
            "carrera": detalle.get("carrera") or "General",
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


async def notificar_contacto_n8n(detalle: dict):
    webhook_url = os.getenv("N8N_CONTACTO_WEBHOOK_URL") or os.getenv("N8N_CREACION_WEBHOOK_URL") or os.getenv("N8N_WEBHOOK_URL")
    if not webhook_url or not httpx_client or not detalle:
        return

    try:
        payload = {
            "event": "contacto_soporte",
            "id": detalle.get("id"),
            "nombre": detalle.get("nombre", "Estudiante"),
            "email": detalle.get("email", ""),
            "rut": detalle.get("rut") or "",
            "asunto": detalle.get("asunto") or "Consulta / Soporte",
            "mensaje": detalle.get("mensaje", ""),
            "created_at": str(detalle.get("created_at") or "")
        }
        payload_bytes, headers = generar_headers_webhook_n8n(payload)
        await httpx_client.post(webhook_url, content=payload_bytes, headers=headers, timeout=5.0)
        print(f"📧 Notificación de contacto enviada a n8n (Asunto: {payload['asunto']}, Email: {payload['email']})")
    except Exception as e:
        print(f"⚠️ Error notificando contacto a n8n: {e}")


async def notificar_taller_n8n(detalle: dict):
    webhook_url = os.getenv("N8N_TALLER_WEBHOOK_URL") or os.getenv("N8N_CREACION_WEBHOOK_URL") or os.getenv("N8N_WEBHOOK_URL")
    if not webhook_url or not httpx_client or not detalle:
        return

    try:
        payload = {
            "event": "solicitud_taller",
            "id": detalle.get("id"),
            "taller": detalle.get("taller"),
            "nombre": detalle.get("nombre"),
            "email": detalle.get("email"),
            "rut": detalle.get("rut"),
            "carrera": detalle.get("carrera"),
            "modalidad": detalle.get("modalidad"),
            "participantes": detalle.get("participantes"),
            "created_at": str(detalle.get("created_at") or "")
        }
        payload_bytes, headers = generar_headers_webhook_n8n(payload)
        await httpx_client.post(webhook_url, content=payload_bytes, headers=headers, timeout=5.0)
        print(f"📧 Notificación de taller enviada a n8n (Taller: {payload['taller']}, Email: {payload['email']})")
    except Exception as e:
        print(f"⚠️ Error notificando taller a n8n: {e}")


async def notificar_respuesta_taller_n8n(detalle: dict):
    webhook_url = os.getenv("N8N_TALLER_RESPUESTA_WEBHOOK_URL") or "http://uct-botsbiblioteca-dev-n8n-1:5678/webhook/responder-taller"
    if not webhook_url or not httpx_client or not detalle:
        return

    try:
        payload_bytes, headers = generar_headers_webhook_n8n(detalle)
        await httpx_client.post(webhook_url, content=payload_bytes, headers=headers, timeout=10.0)
    except Exception as e:
        print(f"⚠️ Error notificando respuesta de taller a n8n: {e}")



@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    asyncpg.clear_rls_context()
    try:
        response = await call_next(request)
    finally:
        asyncpg.clear_rls_context()
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
tarea_monitor_terminal_bg: Optional[asyncio.Task] = None

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


async def _init_database_and_services():
    global tarea_limpieza_bg, tarea_monitor_terminal_bg
    for _ in range(60):
        if pool is not None and getattr(pool, "_created", 0) > 0:
            break
        await asyncio.sleep(1)

    try:
        try:
            from backend.db_seeder import auto_seed_if_empty
        except ImportError:
            from db_seeder import auto_seed_if_empty
        await auto_seed_if_empty()
    except Exception as e:
        print(f"[Startup Warning] Error en auto-seeder: {e}", flush=True)

    if pool is not None and getattr(pool, "_created", 0) > 0:
        try:
            async with pool.acquire() as conn:
                await conn.execute("""
                    UPDATE historial_reservas
                    SET estado = 'cancelada'
                    WHERE estado = 'activa'
                      AND reserva_id IS NOT NULL
                      AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.id = historial_reservas.reserva_id)
                """)
                await conn.execute("""
                    UPDATE historial_reservas
                    SET estado = 'completada'
                    WHERE (fecha < CAST(GETDATE() AS DATE) OR (fecha = CAST(GETDATE() AS DATE) AND DATEDIFF(minute, TRY_CAST(LEFT(CAST(hora AS VARCHAR(10)), 5) AS TIME), CAST(GETDATE() AS TIME)) >= 60))
                      AND estado NOT IN ('cancelada', 'liberada', 'inasistencia', 'justificada')
                """)
                await conn.execute("""
                    UPDATE historial_reservas
                    SET estado = 'completada'
                    WHERE estado = 'expirada'
                """)
                await conn.execute("""
                    UPDATE reservas
                    SET created_at = CASE
                        WHEN fecha >= CAST(GETDATE() AS DATE) THEN GETDATE()
                        ELSE CAST(fecha AS DATETIME2)
                    END
                    WHERE created_at IS NULL
                """)
                await conn.execute("""
                    UPDATE historial_reservas
                    SET fecha_registro = CASE
                        WHEN fecha >= CAST(GETDATE() AS DATE) THEN GETDATE()
                        ELSE CAST(fecha AS DATETIME2)
                    END
                    WHERE fecha_registro IS NULL
                """)
                await conn.execute("DELETE FROM sesiones WHERE updated_at < DATEADD(day, -7, GETDATE())")
                await conn.execute("DELETE FROM rate_limits WHERE created_at < DATEADD(day, -1, GETDATE())")
                await conn.execute("""
                    IF OBJECT_ID('contacto_mensajes', 'U') IS NULL
                    CREATE TABLE contacto_mensajes (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        nombre NVARCHAR(150) NOT NULL,
                        email NVARCHAR(255) NOT NULL,
                        rut NVARCHAR(50),
                        asunto NVARCHAR(255) DEFAULT 'Consulta / Soporte',
                        mensaje NVARCHAR(MAX) NOT NULL,
                        estado NVARCHAR(50) DEFAULT 'pendiente',
                        created_at DATETIME2 DEFAULT GETDATE()
                    );
                """)
                await conn.execute("""
                    IF OBJECT_ID('solicitudes_talleres', 'U') IS NULL
                    CREATE TABLE solicitudes_talleres (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        taller NVARCHAR(255) NOT NULL,
                        nombre NVARCHAR(150) NOT NULL,
                        email NVARCHAR(255) NOT NULL,
                        rut NVARCHAR(50) NOT NULL,
                        carrera NVARCHAR(150) NOT NULL,
                        modalidad NVARCHAR(50) NOT NULL,
                        participantes NVARCHAR(50) NOT NULL,
                        estado NVARCHAR(50) DEFAULT 'pendiente',
                        observaciones NVARCHAR(MAX),
                        created_at DATETIME2 DEFAULT GETDATE()
                    );
                """)
                await conn.execute("""
                    IF COL_LENGTH('usuarios', 'carrera') IS NULL
                        ALTER TABLE usuarios ADD carrera NVARCHAR(150) NULL;
                    IF COL_LENGTH('usuarios', 'terminos_aceptados') IS NULL
                        ALTER TABLE usuarios ADD terminos_aceptados BIT DEFAULT 0;
                    IF COL_LENGTH('usuarios', 'fecha_terminos') IS NULL
                        ALTER TABLE usuarios ADD fecha_terminos DATETIME2 NULL;
                    IF COL_LENGTH('estudiante', 'carrera') IS NULL
                        ALTER TABLE estudiante ADD carrera NVARCHAR(150) NULL;
                    IF COL_LENGTH('reservas', 'carrera') IS NULL
                        ALTER TABLE reservas ADD carrera NVARCHAR(150) NULL;
                    IF COL_LENGTH('historial_reservas', 'carrera') IS NULL
                        ALTER TABLE historial_reservas ADD carrera NVARCHAR(150) NULL;
                """)
                await conn.execute("""
                    UPDATE r
                    SET r.carrera = COALESCE(
                        NULLIF(TRIM(u.carrera), ''),
                        NULLIF(TRIM(e.carrera), ''),
                        NULLIF(TRIM(cp.carr_nombre), ''),
                        'Otras Carreras / General'
                    )
                    FROM reservas r
                    LEFT JOIN usuarios u ON REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', ''), ' ', '')
                    LEFT JOIN estudiante e ON REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', ''), ' ', '') = CONCAT(e.estd_rut, e.estd_dv)
                    LEFT JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
                    LEFT JOIN carrera_programa cp ON ec.carr_codigo = cp.carr_codigo
                    WHERE r.carrera IS NULL;

                    UPDATE h
                    SET h.carrera = COALESCE(
                        NULLIF(TRIM(u.carrera), ''),
                        NULLIF(TRIM(e.carrera), ''),
                        NULLIF(TRIM(cp.carr_nombre), ''),
                        'Otras Carreras / General'
                    )
                    FROM historial_reservas h
                    LEFT JOIN usuarios u ON REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER(h.rut), '.', ''), '-', ''), ' ', '')
                    LEFT JOIN estudiante e ON REPLACE(REPLACE(REPLACE(UPPER(h.rut), '.', ''), '-', ''), ' ', '') = CONCAT(e.estd_rut, e.estd_dv)
                    LEFT JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
                    LEFT JOIN carrera_programa cp ON ec.carr_codigo = cp.carr_codigo
                    WHERE h.carrera IS NULL;
                """)
                await conn.execute("""
                    IF OBJECT_ID('estadisticas_reservas_carrera', 'U') IS NULL
                    CREATE TABLE estadisticas_reservas_carrera (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        reserva_id INT NULL,
                        carrera NVARCHAR(150) NOT NULL,
                        campus_id INT NULL,
                        fecha DATE NULL,
                        created_at DATETIME2 DEFAULT GETDATE()
                    );
                    IF OBJECT_ID('configuracion_ia', 'U') IS NULL
                    CREATE TABLE configuracion_ia (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        provider NVARCHAR(60) NOT NULL,
                        base_url NVARCHAR(500) NOT NULL,
                        model NVARCHAR(150) NOT NULL,
                        credential_id NVARCHAR(100) NULL,
                        n8n_api_base NVARCHAR(500) NULL,
                        n8n_api_key NVARCHAR(1000) NULL,
                        updated_by NVARCHAR(255) NULL,
                        updated_at DATETIME2 DEFAULT GETDATE()
                    );
                """)
                cnt_est = await conn.fetchval("SELECT COUNT(*) FROM estadisticas_reservas_carrera")
                if not cnt_est or cnt_est == 0:
                    await conn.execute("""
                        WITH todas_reservas AS (
                            SELECT id as reserva_id, rut, campus_id, fecha, created_at
                            FROM reservas
                            UNION ALL
                            SELECT COALESCE(reserva_id, id) as reserva_id, rut, campus_id, fecha, fecha_registro as created_at
                            FROM historial_reservas
                            WHERE NOT EXISTS (SELECT 1 FROM reservas r2 WHERE r2.id = historial_reservas.reserva_id)
                        )
                        INSERT INTO estadisticas_reservas_carrera (reserva_id, carrera, campus_id, fecha, created_at)
                        SELECT 
                            tr.reserva_id,
                            COALESCE(
                                NULLIF(TRIM(u.carrera), ''),
                                NULLIF(TRIM(e.carrera), ''),
                                NULLIF(TRIM(cp.carr_nombre), ''),
                                'Otras Carreras / General'
                            ) AS carrera,
                            tr.campus_id,
                            tr.fecha,
                            COALESCE(tr.created_at, GETDATE())
                        FROM todas_reservas tr
                        LEFT JOIN usuarios u ON REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER(tr.rut), '.', ''), '-', ''), ' ', '')
                        LEFT JOIN estudiante e ON REPLACE(REPLACE(REPLACE(UPPER(tr.rut), '.', ''), '-', ''), ' ', '') = CONCAT(e.estd_rut, e.estd_dv)
                        LEFT JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
                        LEFT JOIN carrera_programa cp ON ec.carr_codigo = cp.carr_codigo
                    """)
        except Exception as e:
            print(f"[Startup Warning] Error en SQL inicial: {e}", flush=True)

    tarea_limpieza_bg = asyncio.create_task(tarea_limpieza_sesiones_periodica())
    tarea_monitor_terminal_bg = asyncio.create_task(background_terminal_watcher())
    try:
        try:
            from backend.tests.tunnel import start_tunnel_server
        except ImportError:
            from backend.tunnel import start_tunnel_server
        asyncio.create_task(start_tunnel_server())
    except Exception as e:
        print(f"Error al iniciar tunel: {e}")


@app.on_event("startup")
async def startup():
    global pool, httpx_client
    app.state.db_error = None
    try:
        pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=15,
            max_size=80,
            max_queries=50000,
            command_timeout=15.0
        )
    except Exception as e:
        app.state.db_error = str(e)
        print(f"[Startup Error] Error creando pool de base de datos: {e}", flush=True)
    httpx_client = httpx.AsyncClient(
        limits=httpx.Limits(max_keepalive_connections=100, max_connections=500),
        timeout=60.0
    )
    asyncio.create_task(_init_database_and_services())


@app.on_event("shutdown")
async def shutdown():
    global pool, httpx_client, tarea_limpieza_bg, tarea_monitor_terminal_bg
    if tarea_limpieza_bg:
        tarea_limpieza_bg.cancel()
    if tarea_monitor_terminal_bg:
        tarea_monitor_terminal_bg.cancel()
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


def obtener_ip_cliente(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "anon"


async def check_rate_limit(key_prefix: str, identifier: str, max_requests: int = 15, window_seconds: int = 60, increment: bool = True) -> bool:
    key = f"{key_prefix}:{identifier}"
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
    return {"suspendido": False, "total_inasistencias": 0, "dias_restantes": 0, "fecha_desbloqueo": None, "mensaje": ""}

    rut_limpio = str(rut).replace(".", "").replace("-", "").replace(" ", "").upper().strip()

    rows = await conn.fetch(
        """
        WITH raw_inasistencias AS (
            SELECT id, reserva_id, fecha, hora, fecha_registro,
                   ROW_NUMBER() OVER (PARTITION BY COALESCE(reserva_id, id) ORDER BY fecha_registro DESC, id DESC) AS rn
            FROM historial_reservas
            WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $1 
              AND estado = 'inasistencia'
        ),
        inasistencias_unicas AS (
            SELECT id, reserva_id, fecha, hora, fecha_registro
            FROM raw_inasistencias
            WHERE rn = 1
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


async def verificar_estudiante_regular(conn, rut: str) -> dict:
    if not rut:
        return {"es_regular": False, "situacion": "Sin identificación", "mensaje": "No se proporcionó RUT de estudiante."}
    rut_limpio = str(rut).replace(".", "").replace("-", "").replace(" ", "").upper().strip()
    row = await conn.fetchrow(
        """
        SELECT sa.salu_codigo, sa.salu_nombre
        FROM estudiante e
        JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
        JOIN situacion_alumno sa ON ec.salu_codigo = sa.salu_codigo
        WHERE CONCAT(e.estd_rut, e.estd_dv) = $1
        ORDER BY CASE WHEN sa.salu_codigo = 1 OR UPPER(sa.salu_nombre) = 'REGULAR' THEN 0 ELSE 1 END
        LIMIT 1
        """,
        rut_limpio
    )
    if not row:
        return {
            "es_regular": False,
            "situacion": "No regular",
            "mensaje": "Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente."
        }
    es_reg = (row["salu_codigo"] == 1) or (str(row["salu_nombre"]).upper() == "REGULAR")
    situacion = row["salu_nombre"] or "No regular"
    return {
        "es_regular": es_reg,
        "situacion": situacion,
        "mensaje": "Estudiante regular activo." if es_reg else "Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente."
    }


_disponibilidad_cache: Dict[str, tuple] = {}
_static_cache: Dict[str, tuple] = {}


async def invalidar_caches_disponibilidad(campus_id: Optional[int] = None, fecha_str: Optional[str] = None):
    _disponibilidad_cache.clear()
    _static_cache.clear()


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


class ContactoRequest(BaseModel):
    nombre: str
    email: str
    rut: Optional[str] = None
    asunto: Optional[str] = "Consulta / Soporte"
    mensaje: str


class TallerSolicitudRequest(BaseModel):
    taller: Optional[str] = None
    nombre: Optional[str] = None
    email: Optional[str] = None
    rut: Optional[str] = None
    carrera: Optional[str] = None
    modalidad: Optional[str] = "Presencial"
    participantes: Optional[str] = "4"
    sessionId: Optional[str] = None
    observaciones: Optional[str] = None

    @root_validator(pre=True)
    def parse_taller_fields(cls, values: Dict[str, Any]):
        if not isinstance(values, dict):
            return values
        for k, v in list(values.items()):
            k_low = k.lower()
            if "taller" in k_low and not values.get("taller"):
                values["taller"] = v
            elif "carrera" in k_low and not values.get("carrera"):
                values["carrera"] = v
            elif "modalidad" in k_low and not values.get("modalidad"):
                values["modalidad"] = v
            elif "participante" in k_low and not values.get("participantes"):
                values["participantes"] = str(v)
        return values


class ActualizarEstadoTallerRequest(BaseModel):
    estado: str
    observaciones: Optional[str] = None


class ResponderSolicitudTallerRequest(BaseModel):
    asunto: str
    mensaje: str
    nuevo_estado: Optional[str] = None


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
    rol: Optional[str] = None


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
    idmatricula: Optional[str] = None
    carrera: Optional[str] = None
    situacion: Optional[str] = None
    es_regular: Optional[bool] = True
    terminos_aceptados: Optional[bool] = False


class CrearUsuarioRequest(BaseModel):
    email: str
    password: str
    nombre: str
    rut: Optional[str] = None
    rol: str = "estudiante"
    carrera: Optional[str] = None

    @root_validator(pre=True)
    def sanitizar_usuario(cls, values):
        if isinstance(values, dict):
            if "nombre" in values and values["nombre"] is not None:
                values["nombre"] = sanitizar_texto(values["nombre"], max_length=150)
            if "carrera" in values and values["carrera"] is not None:
                values["carrera"] = sanitizar_texto(values["carrera"], max_length=150)
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


_user_auth_cache: Dict[str, tuple] = {}


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

    now_ts = _time.time()
    cached = _user_auth_cache.get(email)
    if cached and (now_ts - cached[0] < 120):
        d_row = dict(cached[1])
        asyncpg.set_rls_context(
            rol=d_row.get("rol"),
            rut=d_row.get("rut"),
            email=d_row.get("email"),
            enforced=True
        )
        return d_row

    user_query = """
        SELECT 
            u.id, 
            u.email, 
            u.nombre, 
            u.rut, 
            u.rol, 
            COALESCE(u.idmatricula, CAST(ec.estu_registro AS VARCHAR(50))) AS idmatricula,
            COALESCE(u.carrera, cp.carr_nombre) AS carrera,
            sa.salu_nombre AS situacion,
            CASE WHEN u.rol = 'admin' OR sa.salu_codigo = 1 OR UPPER(sa.salu_nombre) = 'REGULAR' THEN 1 ELSE 0 END AS es_regular,
            ISNULL(u.terminos_aceptados, 0) AS terminos_aceptados
        FROM usuarios u
        LEFT JOIN estudiante e ON e.estd_rut = TRY_CAST(LEFT(REPLACE(REPLACE(REPLACE(u.rut, '.', ''), '-', ''), ' ', ''), CASE WHEN LEN(REPLACE(REPLACE(REPLACE(u.rut, '.', ''), '-', ''), ' ', '')) > 1 THEN LEN(REPLACE(REPLACE(REPLACE(u.rut, '.', ''), '-', ''), ' ', '')) - 1 ELSE 0 END) AS INT)
        LEFT JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
        LEFT JOIN carrera_programa cp ON ec.carr_codigo = cp.carr_codigo
        LEFT JOIN situacion_alumno sa ON ec.salu_codigo = sa.salu_codigo
        WHERE u.email = $1
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(user_query, email)
        if row is None:
            raise credentials_exception
        d_row = dict(row)
        d_row["es_regular"] = bool(row.get("es_regular"))
        d_row["terminos_aceptados"] = bool(row.get("terminos_aceptados"))
        _user_auth_cache[email] = (now_ts, d_row)
        asyncpg.set_rls_context(
            rol=d_row.get("rol"),
            rut=d_row.get("rut"),
            email=d_row.get("email"),
            enforced=True
        )
        return d_row


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
        user_query = """
            SELECT 
                u.id, 
                u.email, 
                u.nombre, 
                u.rut, 
                u.rol, 
                COALESCE(u.idmatricula, CAST(ec.estu_registro AS VARCHAR(50))) AS idmatricula,
                COALESCE(u.carrera, cp.carr_nombre) AS carrera,
                sa.salu_nombre AS situacion,
                CASE WHEN u.rol = 'admin' OR sa.salu_codigo = 1 OR UPPER(sa.salu_nombre) = 'REGULAR' THEN 1 ELSE 0 END AS es_regular,
                ISNULL(u.terminos_aceptados, 0) AS terminos_aceptados
            FROM usuarios u
            LEFT JOIN estudiante e ON REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = CONCAT(e.estd_rut, e.estd_dv)
            LEFT JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
            LEFT JOIN carrera_programa cp ON ec.carr_codigo = cp.carr_codigo
            LEFT JOIN situacion_alumno sa ON ec.salu_codigo = sa.salu_codigo
            WHERE u.email = $1
        """
        async with pool.acquire() as conn:
            row = await conn.fetchrow(user_query, email)
            if not row:
                return None
            d_row = dict(row)
            d_row["es_regular"] = bool(row.get("es_regular"))
            d_row["terminos_aceptados"] = bool(row.get("terminos_aceptados"))
            return d_row
    except Exception:
        return None


# --- Endpoints de Autenticación ---

@app.post("/api/auth/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def registrar_usuario(data: CrearUsuarioRequest, request: Request):
    client_ip = obtener_ip_cliente(request)
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
                INSERT INTO usuarios (email, hashed_password, nombre, rut, rol, carrera, terminos_aceptados, fecha_terminos)
                VALUES ($1, $2, $3, $4, $5, $6, 1, GETDATE())
                RETURNING id, email, nombre, rut, rol, carrera, terminos_aceptados
                """,
                data.email, hashed, data.nombre, data.rut, data.rol, data.carrera
            )
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un usuario con el email '{data.email}'."
            )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, response: Response):
    client_ip = obtener_ip_cliente(request)
    
    if not await check_rate_limit("login_failed", client_ip, max_requests=5, window_seconds=60, increment=False):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos de inicio de sesión desde esta IP. Por favor, espera 1 minuto antes de reintentar."
        )

    if data.rol and data.rol.strip().lower() == "estudiante":
        if not data.email.strip().lower().endswith("@alu.uct.cl"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo institucional de estudiante debe pertenecer al dominio @alu.uct.cl.",
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

    if data.rol:
        req_rol = data.rol.strip().lower()
        user_rol = (row["rol"] or "").strip().lower()
        if req_rol == "admin" and user_rol != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Esta cuenta no tiene permisos de Administrador. Por favor selecciona Estudiante.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        elif req_rol == "estudiante" and user_rol == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Esta cuenta es de Administrador. Por favor selecciona la pestaña Administrador.",
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


@app.post("/api/auth/aceptar-terminos")
async def aceptar_terminos(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    email = current_user.get("email")
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE usuarios
            SET terminos_aceptados = 1, fecha_terminos = GETDATE()
            WHERE id = $1
            """,
            user_id
        )
    if email and email in _user_auth_cache:
        del _user_auth_cache[email]
    return {"status": "ok", "terminos_aceptados": True}


# --- Endpoints de Gestión de Cubículos ---

@app.get("/api/cubiculos")
async def obtener_cubiculos(campus_id: Optional[int] = None, fecha: Optional[str] = None):
    cache_key = f"cub:{campus_id}:{fecha}"
    cached = _disponibilidad_cache.get(cache_key)
    if cached and (_time.time() - cached[0] < 5.0):
        return cached[1]

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
                           cm.fecha as mantenimiento_fecha,
                           CASE WHEN (cm.id IS NOT NULL OR cb.estado = 'mantenimiento') THEN 1 ELSE 0 END as en_mantenimiento
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
                           cm.fecha as mantenimiento_fecha,
                           CASE WHEN (cm.id IS NOT NULL OR cb.estado = 'mantenimiento') THEN 1 ELSE 0 END as en_mantenimiento
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
        res_list = [dict(f) for f in filas]
        _disponibilidad_cache[cache_key] = (_time.time(), res_list)
        return res_list


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
                    IF NOT EXISTS (SELECT 1 FROM historial_reservas WHERE reserva_id = $1)
                        INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado, fecha_registro)
                        VALUES ($1, $2, $3, $4, $5, $6, 'inasistencia', GETDATE())
                    ELSE
                        UPDATE historial_reservas SET estado = 'inasistencia', fecha_registro = GETDATE() WHERE reserva_id = $1
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
                cached = _user_auth_cache.get(email)
                if cached and (_time.time() - cached[0] < 120):
                    row_u = cached[1]
                    if row_u and (row_u.get("rol") != "admin" or not rut_target):
                        rut_target = row_u.get("rut")
                else:
                    async with pool.acquire() as conn:
                        row_u = await conn.fetchrow("SELECT rut, rol FROM usuarios WHERE email = $1", email)
                        if row_u and (row_u["rol"] != "admin" or not rut_target):
                            rut_target = row_u["rut"]
        except Exception:
            pass

    if not rut_target:
        return {"suspendido": False, "total_inasistencias": 0, "dias_restantes": 0, "fecha_desbloqueo": None, "mensaje": ""}

    return await verificar_sancion_usuario(None, rut_target)


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
            LEFT JOIN cubiculos cb ON i.cubiculo_id = cb.id
            LEFT JOIN campus c ON cb.campus_id = c.id
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
    cached = _static_cache.get("cms_anuncios")
    if cached and (_time.time() - cached[0] < 15.0):
        return cached[1]
    async with pool.acquire() as conn:
        filas = await conn.fetch("SELECT * FROM anuncios_cms ORDER BY orden ASC, id ASC")
        res = [dict(f) for f in filas]
        _static_cache["cms_anuncios"] = (_time.time(), res)
        return res


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
    cached = _static_cache.get("cms_tarjetas")
    if cached and (_time.time() - cached[0] < 15.0):
        return cached[1]
    async with pool.acquire() as conn:
        filas = await conn.fetch("SELECT * FROM tarjetas_cms ORDER BY orden ASC, id ASC")
        res = [dict(f) for f in filas]
        _static_cache["cms_tarjetas"] = (_time.time(), res)
        return res


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
    cached = _static_cache.get("cms_faqs")
    if cached and (_time.time() - cached[0] < 15.0):
        return cached[1]
    async with pool.acquire() as conn:
        filas = await conn.fetch("SELECT * FROM faqs_cms ORDER BY orden ASC, id ASC")
        res = [dict(f) for f in filas]
        _static_cache["cms_faqs"] = (_time.time(), res)
        return res


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
        await conn.execute("DELETE FROM dias_bloqueados WHERE fecha < CURRENT_DATE")
        if campus_id:
            filas = await conn.fetch(
                """
                SELECT b.id, b.fecha::text, b.motivo, b.campus_id, b.creado_por, b.created_at::text, c.nombre AS campus_nombre
                FROM dias_bloqueados b
                LEFT JOIN campus c ON b.campus_id = c.id
                WHERE b.fecha >= CURRENT_DATE AND (b.campus_id IS NULL OR b.campus_id = $1)
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
                WHERE b.fecha >= CURRENT_DATE
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

    if f_parsed < datetime.now().date():
        raise HTTPException(status_code=400, detail="No se pueden bloquear fechas pasadas.")

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


# --- Endpoints de Carreras y Estudiantes ---

@app.get("/api/carreras")
async def obtener_carreras():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT carr_codigo, carr_nombre FROM carrera_programa ORDER BY carr_nombre ASC")
        return [dict(r) for r in rows]


@app.get("/api/estudiantes/buscar")
async def buscar_estudiantes(q: str, current_user: dict = Depends(get_current_user)):
    q_clean = sanitizar_texto(q, max_length=100)
    q_rut = re.sub(r'[^0-9]', '', q_clean)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT TOP 10
                e.estd_rut,
                e.estd_dv,
                CONCAT(e.estd_rut, '-', e.estd_dv) AS rut_completo,
                RTRIM(CONCAT(e.estd_nombre1, ' ', COALESCE(e.estd_nombre2, ''), ' ', e.estd_paterno, ' ', COALESCE(e.estd_materno, ''))) AS nombre_completo,
                e.estd_email_inst AS email,
                ec.estu_registro AS idmatricula,
                COALESCE(e.carrera, cp.carr_nombre) AS carrera,
                sa.salu_nombre AS situacion
            FROM estudiante e
            LEFT JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
            LEFT JOIN carrera_programa cp ON ec.carr_codigo = cp.carr_codigo
            LEFT JOIN situacion_alumno sa ON ec.salu_codigo = sa.salu_codigo
            WHERE e.estd_email_inst LIKE $1 
               OR e.estd_paterno LIKE $1 
               OR CAST(e.estd_rut AS VARCHAR(50)) = $2
               OR CAST(ec.estu_registro AS VARCHAR(50)) = $2
            """,
            f"%{q_clean}%", q_rut or q_clean
        )
        return [dict(r) for r in rows]


# --- Endpoints Públicos y Admin ---

@app.get("/api/campus")
async def obtener_campus():
    cached = _static_cache.get("campus_list")
    if cached and (_time.time() - cached[0] < 15.0):
        return cached[1]
    try:
        async with pool.acquire() as conn:
            filas = await conn.fetch(
                """
                SELECT c.id, c.nombre, 
                       COALESCE(COUNT(cb.id), c.cubiculas_fisicos) AS cubiculas_fisicos
                FROM campus c
                LEFT JOIN cubiculos cb ON c.id = cb.campus_id
                GROUP BY c.id, c.nombre, c.cubiculas_fisicos ORDER BY c.id ASC
                """
            )
            res = [dict(f) for f in filas]
            _static_cache["campus_list"] = (_time.time(), res)
            return res
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
async def obtener_metricas_dashboard(
    campus_id: Optional[int] = None,
    periodo: Optional[str] = "dia",
    fecha: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")
    try:
        import calendar

        if fecha and fecha.strip():
            try:
                target_date = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
            except Exception:
                target_date = date.today()
        else:
            target_date = date.today()

        periodo_limpio = (periodo or "dia").lower().strip()
        if periodo_limpio not in ("dia", "semana", "mes"):
            periodo_limpio = "dia"

        meses_nom = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        dias_semana_esp = {
            0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves",
            4: "Viernes", 5: "Sábado", 6: "Domingo"
        }

        if periodo_limpio == "dia":
            f_inicio = target_date
            f_fin = target_date
            dias_habiles = 1
            etiqueta_periodo = f"{dias_semana_esp.get(target_date.weekday(), '')} {target_date.day} de {meses_nom[target_date.month - 1]} de {target_date.year}"
        elif periodo_limpio == "semana":
            f_inicio = target_date - timedelta(days=target_date.weekday())
            f_fin = f_inicio + timedelta(days=6)
            dias_habiles = 5
            etiqueta_periodo = f"Semana del {f_inicio.day} de {meses_nom[f_inicio.month - 1]} al {f_fin.day} de {meses_nom[f_fin.month - 1]} ({f_fin.year})"
        else:
            f_inicio = target_date.replace(day=1)
            ultimo_dia = calendar.monthrange(target_date.year, target_date.month)[1]
            f_fin = target_date.replace(day=ultimo_dia)
            dias_habiles = sum(1 for d in range(1, ultimo_dia + 1) if date(target_date.year, target_date.month, d).weekday() < 5)
            etiqueta_periodo = f"{meses_nom[target_date.month - 1]} de {target_date.year}"

        async with pool.acquire() as conn:
            if campus_id:
                capacidad_cub = await conn.fetchval(
                    "SELECT COUNT(*) FROM cubiculos WHERE campus_id = $1 AND (estado IS NULL OR estado = 'disponible')",
                    campus_id
                ) or 0
                row_c = await conn.fetchrow("SELECT nombre, cubiculas_fisicos FROM campus WHERE id = $1", campus_id)
                if capacidad_cub == 0 and row_c:
                    capacidad_cub = row_c["cubiculas_fisicos"] or 10
                nombre_campus_sel = row_c["nombre"] if row_c else f"Sede #{campus_id}"
            else:
                capacidad_cub = await conn.fetchval(
                    "SELECT COUNT(*) FROM cubiculos WHERE (estado IS NULL OR estado = 'disponible')"
                ) or 0
                if capacidad_cub == 0:
                    capacidad_cub = await conn.fetchval("SELECT COALESCE(SUM(cubiculas_fisicos), 22) FROM campus") or 22
                nombre_campus_sel = "Todas las sedes"

            capacidad_max_bloque = max(1, capacidad_cub * max(1, dias_habiles))

            filas_res = await conn.fetch(
                """
                SELECT id, TO_CHAR(hora, 'HH24:MI') as hora_str, fecha, campus_id
                FROM reservas
                WHERE fecha >= $1 AND fecha <= $2
                  AND ($3::int IS NULL OR campus_id = $3)
                """,
                f_inicio, f_fin, campus_id
            )

            filas_hist = await conn.fetch(
                """
                SELECT reserva_id, SUBSTRING(hora, 1, 5) as hora_str, fecha, campus_id
                FROM historial_reservas
                WHERE estado NOT IN ('cancelada', 'liberada')
                  AND fecha >= $1 AND fecha <= $2
                  AND ($3::int IS NULL OR campus_id = $3)
                """,
                f_inicio, f_fin, campus_id
            )

            ids_vistos = set(f["id"] for f in filas_res if f.get("id"))
            conteo_horas = {b["hora"]: 0 for b in BLOQUES_HORARIOS}

            for r in filas_res:
                h = (r.get("hora_str") or "").strip()
                if h in conteo_horas:
                    conteo_horas[h] += 1
                elif (h[:2] + ":00") in conteo_horas:
                    conteo_horas[h[:2] + ":00"] += 1
                elif h:
                    conteo_horas[h] = conteo_horas.get(h, 0) + 1

            for h_row in filas_hist:
                res_id = h_row.get("reserva_id")
                if res_id and res_id in ids_vistos:
                    continue
                h = (h_row.get("hora_str") or "").strip()
                if h in conteo_horas:
                    conteo_horas[h] += 1
                elif (h[:2] + ":00") in conteo_horas:
                    conteo_horas[h[:2] + ":00"] += 1
                elif h:
                    conteo_horas[h] = conteo_horas.get(h, 0) + 1

            ocupacion_bloques = []
            total_reservas_periodo = 0
            for b in BLOQUES_HORARIOS:
                h = b["hora"]
                cant = conteo_horas.get(h, 0)
                total_reservas_periodo += cant
                pct = round((cant / capacidad_max_bloque) * 100, 1)
                if pct >= 80:
                    demanda = "Pico"
                elif pct >= 50:
                    demanda = "Alta"
                elif pct >= 20:
                    demanda = "Media"
                else:
                    demanda = "Baja"
                ocupacion_bloques.append({
                    "hora": h,
                    "rango": b["rango"],
                    "total_reservas": cant,
                    "capacidad_total": capacidad_max_bloque,
                    "cupos_disponibles": max(0, capacidad_max_bloque - cant),
                    "porcentaje_ocupacion": pct,
                    "nivel_demanda": demanda
                })

            bloque_pico = max(ocupacion_bloques, key=lambda x: x["total_reservas"]) if ocupacion_bloques else None
            promedio_bloque = round(total_reservas_periodo / max(1, len(ocupacion_bloques)), 1)
            promedio_ocupacion_pct = round(sum(b["porcentaje_ocupacion"] for b in ocupacion_bloques) / max(1, len(ocupacion_bloques)), 1)

            info_periodo = {
                "periodo": periodo_limpio,
                "fecha_seleccionada": target_date.strftime("%Y-%m-%d"),
                "fecha_inicio": f_inicio.strftime("%Y-%m-%d"),
                "fecha_fin": f_fin.strftime("%Y-%m-%d"),
                "etiqueta": etiqueta_periodo,
                "campus_id": campus_id,
                "campus_nombre": nombre_campus_sel,
                "capacidad_por_bloque": capacidad_max_bloque,
                "dias_habiles": dias_habiles,
                "total_reservas_periodo": total_reservas_periodo,
                "promedio_por_bloque": promedio_bloque,
                "promedio_ocupacion_pct": promedio_ocupacion_pct,
                "bloque_pico": bloque_pico
            }

            filas_pico = await conn.fetch(
                """
                WITH base_horas AS (
                    SELECT SUBSTRING(LTRIM(RTRIM(CAST(hora AS VARCHAR(20)))), 1, 5) as hora_str, campus_id
                    FROM historial_reservas
                    WHERE estado NOT IN ('cancelada', 'liberada')
                      AND ($1::int IS NULL OR campus_id = $1)
                    UNION ALL
                    SELECT TO_CHAR(hora, 'HH24:MI') as hora_str, campus_id
                    FROM reservas r
                    WHERE ($1::int IS NULL OR r.campus_id = $1)
                      AND NOT EXISTS (SELECT 1 FROM historial_reservas h WHERE h.reserva_id = r.id)
                )
                SELECT TOP 5 hora_str, COUNT(*) as total_reservas
                FROM base_horas
                GROUP BY hora_str
                ORDER BY total_reservas DESC
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
                WITH base_dias AS (
                    SELECT TO_CHAR(fecha, 'Day') as dia_nombre, EXTRACT(ISODOW FROM fecha) as dia_num
                    FROM historial_reservas
                    WHERE estado NOT IN ('cancelada', 'liberada')
                      AND ($1::int IS NULL OR campus_id = $1)
                    UNION ALL
                    SELECT TO_CHAR(r.fecha, 'Day') as dia_nombre, EXTRACT(ISODOW FROM r.fecha) as dia_num
                    FROM reservas r
                    WHERE ($1::int IS NULL OR r.campus_id = $1)
                      AND NOT EXISTS (SELECT 1 FROM historial_reservas h WHERE h.reserva_id = r.id)
                )
                SELECT dia_nombre, dia_num, COUNT(*) as total
                FROM base_dias
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
                WITH base_sedes AS (
                    SELECT campus_id
                    FROM historial_reservas
                    WHERE estado NOT IN ('cancelada', 'liberada')
                    UNION ALL
                    SELECT r.campus_id
                    FROM reservas r
                    WHERE NOT EXISTS (SELECT 1 FROM historial_reservas h WHERE h.reserva_id = r.id)
                )
                SELECT c.nombre, COUNT(bs.campus_id) as total
                FROM campus c
                LEFT JOIN base_sedes bs ON c.id = bs.campus_id
                GROUP BY c.id, c.nombre
                ORDER BY total DESC
                """
            )
            demanda_sedes = [{"campus": f["nombre"], "total": f["total"]} for f in filas_sedes]

            filas_canc_dia = await conn.fetch(
                """
                WITH base_canc AS (
                    SELECT TO_CHAR(fecha, 'Day') as dia_nombre, EXTRACT(ISODOW FROM fecha) as dia_num
                    FROM historial_reservas
                    WHERE estado IN ('cancelada', 'liberada')
                      AND ($1::int IS NULL OR campus_id = $1)
                )
                SELECT dia_nombre, dia_num, COUNT(*) as total_canceladas
                FROM base_canc
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
                """
                SELECT (
                    (SELECT COUNT(*) FROM historial_reservas WHERE ($1::int IS NULL OR campus_id = $1)) +
                    (SELECT COUNT(*) FROM reservas r WHERE ($1::int IS NULL OR r.campus_id = $1) AND NOT EXISTS (SELECT 1 FROM historial_reservas h WHERE h.reserva_id = r.id))
                )
                """,
                campus_id
            ) or 0

            total_canceladas_general = await conn.fetchval(
                "SELECT COUNT(*) FROM historial_reservas WHERE estado IN ('cancelada', 'liberada') AND ($1::int IS NULL OR campus_id = $1)",
                campus_id
            ) or 0

            dias_distintos = await conn.fetchval(
                "SELECT COUNT(DISTINCT fecha) FROM historial_reservas WHERE ($1::int IS NULL OR campus_id = $1)",
                campus_id
            ) or 1

            promedio_diario = round(total_canceladas_general / max(1, dias_distintos), 1)
            tasa_cancelacion_pct = round((total_canceladas_general / max(1, total_registros_hist)) * 100, 1)

            filas_carreras = await conn.fetch(
                """
                WITH base_carreras AS (
                    SELECT LTRIM(RTRIM(h.carrera)) AS carrera, 0 AS es_actual
                    FROM historial_reservas h
                    WHERE h.carrera IS NOT NULL AND LTRIM(RTRIM(h.carrera)) <> ''
                      AND ($1::int IS NULL OR h.campus_id = $1)
                    UNION ALL
                    SELECT LTRIM(RTRIM(erc.carrera)) AS carrera,
                           CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS es_actual
                    FROM estadisticas_reservas_carrera erc
                    LEFT JOIN reservas r ON erc.reserva_id = r.id
                    WHERE erc.carrera IS NOT NULL AND LTRIM(RTRIM(erc.carrera)) <> ''
                      AND ($1::int IS NULL OR erc.campus_id = $1)
                      AND NOT EXISTS (
                          SELECT 1 FROM historial_reservas h2
                          WHERE h2.reserva_id = erc.reserva_id
                            AND h2.carrera IS NOT NULL AND LTRIM(RTRIM(h2.carrera)) <> ''
                      )
                )
                SELECT
                    carrera,
                    COUNT(*) as total_reservas,
                    SUM(es_actual) as total_actuales,
                    SUM(CASE WHEN es_actual = 0 THEN 1 ELSE 0 END) as total_historicas
                FROM base_carreras
                GROUP BY carrera
                ORDER BY total_reservas DESC
                """,
                campus_id
            )
            reservas_por_carrera = [
                {
                    "carrera": f["carrera"],
                    "total": int(f["total_reservas"] or 0),
                    "actuales": int(f["total_actuales"] or 0),
                    "historicas": int(f["total_historicas"] or 0)
                }
                for f in filas_carreras
            ]

            return {
                "ocupacion_bloques": ocupacion_bloques,
                "info_periodo": info_periodo,
                "horarios_pico": horarios_pico,
                "dias_demanda": dias_demanda,
                "demanda_sedes": demanda_sedes,
                "cancelaciones_por_dia": cancelaciones_por_dia,
                "reservas_por_carrera": reservas_por_carrera,
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
    client_ip = obtener_ip_cliente(request)
    await enforce_rate_limit(
        "disponibilidad",
        client_ip,
        max_requests=120,
        window_seconds=60,
        custom_message="Límite de consultas de disponibilidad alcanzado. Por favor espera un momento."
    )
    try:
        fecha_parsed = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
        fecha_str = fecha_parsed.strftime("%Y-%m-%d")
        disp_key = f"disp:{campus_id}:{fecha_str}"
        cached_disp = _disponibilidad_cache.get(disp_key)
        if cached_disp and (_time.time() - cached_disp[0] < 5.0):
            return cached_disp[1]

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
            _disponibilidad_cache[disp_key] = (_time.time(), respuesta)

        return respuesta
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error inesperado en consultar_disponibilidad: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo consultar la disponibilidad de cubículos en este momento. Por favor intenta nuevamente."
        )


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

        ac_regular = await verificar_estudiante_regular(conn, rut_ac_clean)
        if not ac_regular["es_regular"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"El acompañante {nombre_ac} figura como estudiante no regular, cuando resuelva esa situación estará activo nuevamente."
            )

        sancion_ac = await verificar_sancion_usuario(conn, rut_ac_clean)
        if sancion_ac.get("suspendido"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"El acompañante {nombre_ac} se encuentra con una sanción activa: {sancion_ac.get('mensaje')}"
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
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios para agendar tu reserva (RUT, fecha u hora).")

    rut_limpio = re.sub(r'[\.\-\s]', '', str(rut_final)).upper().strip()
    if "[" in rut_limpio or "RUT_" in rut_limpio or len(rut_limpio) > 12:
        raise HTTPException(status_code=400, detail="El formato del RUT proporcionado no es válido.")

    client_id = rut_limpio or reserva.sessionId or obtener_ip_cliente(request)
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

                if not current_user or current_user.get("rol") != "admin":
                    reg_check = await verificar_estudiante_regular(conn, rut_limpio)
                    if not reg_check["es_regular"]:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente."
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

                row_carr = await conn.fetchrow(
                    """
                    SELECT COALESCE(
                        NULLIF(TRIM(u.carrera), ''),
                        NULLIF(TRIM(e.carrera), ''),
                        NULLIF(TRIM(cp.carr_nombre), ''),
                        'Otras Carreras / General'
                    ) AS carrera
                    FROM (SELECT $1 AS rut) t
                    LEFT JOIN usuarios u ON REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER(t.rut), '.', ''), '-', ''), ' ', '')
                    LEFT JOIN estudiante e ON REPLACE(REPLACE(REPLACE(UPPER(t.rut), '.', ''), '-', ''), ' ', '') = CONCAT(e.estd_rut, e.estd_dv)
                    LEFT JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
                    LEFT JOIN carrera_programa cp ON ec.carr_codigo = cp.carr_codigo
                    """,
                    rut_limpio
                )
                carr_detectada = row_carr["carrera"] if row_carr and row_carr["carrera"] else "Otras Carreras / General"

                row = await conn.fetchrow(
                    """
                    INSERT INTO reservas (nombre, rut, fecha, hora, campus_id, session_id, cubiculo_id, carrera, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, GETDATE())
                    RETURNING id, nombre, rut, fecha, hora, campus_id, session_id, carrera
                    """,
                    nombre_final or "Usuario Chatbot", rut_limpio, fecha_parsed, hora_parsed,
                    target_campus_id, reserva.sessionId, cubiculo_id_asignado, carr_detectada
                )
                reserva_id_creada = row["id"]

                await conn.execute(
                    """
                    INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado, carrera, fecha_registro)
                    VALUES ($1, $2, $3, $4, $5, $6, 'activa', $7, GETDATE())
                    """,
                    reserva_id_creada, nombre_final or "Usuario Chatbot", rut_limpio, target_campus_id, fecha_parsed, hora_parsed.strftime("%H:%M"), carr_detectada
                )

                try:
                    await conn.execute(
                        """
                        INSERT INTO estadisticas_reservas_carrera (reserva_id, carrera, campus_id, fecha, created_at)
                        VALUES ($1, $2, $3, $4, GETDATE())
                        """,
                        reserva_id_creada, carr_detectada, target_campus_id, fecha_parsed
                    )
                except Exception as ex_carr:
                    print(f"⚠️ Error registrando carrera para estadísticas: {ex_carr}")

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
                        IF EXISTS (SELECT 1 FROM sesiones WHERE session_id = $1)
                            UPDATE sesiones SET rut = $2, nombre = $3, updated_at = GETDATE() WHERE session_id = $1
                        ELSE
                            INSERT INTO sesiones (session_id, rut, nombre, updated_at) VALUES ($1, $2, $3, GETDATE())
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
            "carrera": carr_detectada,
            "acompanantes": acompanantes_guardados
        }
        background_tasks.add_task(notificar_creacion_n8n, res_data)

        return res_data

    except HTTPException:
        raise
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una reserva previa para el RUT {rut_limpio} en esta fecha y hora."
        )
    except Exception as e:
        print(f"⚠️ Error inesperado en crear_reserva: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo procesar la reserva en este momento debido a un inconveniente con el sistema. Por favor intenta nuevamente."
        )


@app.post("/api/contacto")
async def recibir_mensaje_contacto(data: ContactoRequest, request: Request, background_tasks: BackgroundTasks):
    try:
        nombre_limpio = sanitizar_texto(data.nombre, max_length=150)
        email_limpio = sanitizar_texto(data.email, max_length=255)
        rut_limpio = sanitizar_texto(data.rut, max_length=50) if data.rut else None
        asunto_limpio = sanitizar_texto(data.asunto or "Consulta / Soporte", max_length=255)
        mensaje_limpio = sanitizar_texto(data.mensaje, max_length=2000)

        if not nombre_limpio or not email_limpio or not mensaje_limpio:
            raise HTTPException(status_code=400, detail="Nombre, correo electrónico y mensaje son obligatorios.")

        client_ip = obtener_ip_cliente(request)
        await enforce_rate_limit("contacto_min", client_ip, max_requests=5, window_seconds=60)

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO contacto_mensajes (nombre, email, rut, asunto, mensaje, estado, created_at)
                OUTPUT INSERTED.id
                VALUES ($1, $2, $3, $4, $5, 'pendiente', GETDATE())
                """,
                nombre_limpio, email_limpio, rut_limpio, asunto_limpio, mensaje_limpio
            )
            nuevo_id = row["id"] if row else None

        detalle_contacto = {
            "id": nuevo_id,
            "nombre": nombre_limpio,
            "email": email_limpio,
            "rut": rut_limpio,
            "asunto": asunto_limpio,
            "mensaje": mensaje_limpio,
            "created_at": datetime.now().isoformat()
        }
        background_tasks.add_task(notificar_contacto_n8n, detalle_contacto)

        return {
            "status": "ok",
            "message": "Tu mensaje ha sido recibido con éxito. El equipo de soporte de la biblioteca te responderá a la brevedad.",
            "id": nuevo_id
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error inesperado en recibir_mensaje_contacto: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar tu mensaje de contacto en este momento. Por favor intenta nuevamente más tarde."
        )


@app.post("/api/talleres/solicitar")
async def solicitar_taller(data: TallerSolicitudRequest, background_tasks: BackgroundTasks, current_user: Optional[dict] = Depends(get_current_user_optional)):
    taller_limpio = sanitizar_texto(data.taller, max_length=255)
    nombre_limpio = sanitizar_texto(data.nombre, max_length=150)
    email_limpio = sanitizar_texto(data.email, max_length=255)
    rut_limpio = sanitizar_texto(data.rut, max_length=50)
    carrera_limpia = sanitizar_texto(data.carrera, max_length=150)
    modalidad_limpia = sanitizar_texto(data.modalidad, max_length=50)
    participantes_limpio = sanitizar_texto(data.participantes, max_length=50)

    rut_verif = str(rut_limpio).replace(".", "").replace("-", "").strip().upper()
    if not current_user or current_user.get("rol") != "admin":
        async with pool.acquire() as conn:
            reg_check = await verificar_estudiante_regular(conn, rut_verif)
            if not reg_check["es_regular"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente."
                )

    if not carrera_limpia and (email_limpio or rut_limpio):
        async with pool.acquire() as conn:
            row_u = await conn.fetchrow(
                """
                SELECT carrera FROM usuarios 
                WHERE email = $1 
                   OR REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER($2), '.', ''), '-', ''), ' ', '')
                """,
                email_limpio, rut_limpio
            )
            if row_u and row_u["carrera"]:
                carrera_limpia = row_u["carrera"]

    if not taller_limpio or not nombre_limpio or not email_limpio or not rut_limpio or not carrera_limpia:
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios para la solicitud del taller (taller, nombre, email, rut o carrera).")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO solicitudes_talleres (taller, nombre, email, rut, carrera, modalidad, participantes, estado, observaciones, created_at)
            OUTPUT INSERTED.id, INSERTED.created_at
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', $8, GETDATE())
            """,
            taller_limpio, nombre_limpio, email_limpio, rut_limpio, carrera_limpia, modalidad_limpia, participantes_limpio, data.observaciones
        )
        nuevo_id = row["id"] if row else None
        created_at_val = row["created_at"] if row else datetime.now()

    detalle = {
        "id": nuevo_id,
        "taller": taller_limpio,
        "nombre": nombre_limpio,
        "email": email_limpio,
        "rut": rut_limpio,
        "carrera": carrera_limpia,
        "modalidad": modalidad_limpia,
        "participantes": participantes_limpio,
        "created_at": created_at_val.isoformat() if hasattr(created_at_val, "isoformat") else str(created_at_val)
    }
    background_tasks.add_task(notificar_taller_n8n, detalle)

    return {
        "status": "ok",
        "id": nuevo_id,
        "message": f"Solicitud para el taller '{taller_limpio}' registrada exitosamente con el ID #{nuevo_id} para {participantes_limpio} participantes en modalidad {modalidad_limpia}.",
        "detalle": detalle
    }


@app.get("/api/talleres/solicitudes")
async def listar_solicitudes_talleres(estado: Optional[str] = None, busqueda: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        query = """
            SELECT id, taller, nombre, email, rut, carrera, modalidad, participantes, estado, observaciones, created_at
            FROM solicitudes_talleres
            WHERE ($1::text IS NULL OR $1::text = '' OR estado = $1)
              AND ($2::text IS NULL OR $2::text = '' OR LOWER(nombre) LIKE '%' || LOWER($2) || '%' OR LOWER(taller) LIKE '%' || LOWER($2) || '%' OR LOWER(rut) LIKE '%' || LOWER($2) || '%' OR LOWER(carrera) LIKE '%' || LOWER($2) || '%')
            ORDER BY created_at DESC
        """
        filas = await conn.fetch(query, estado, busqueda)
        resultado = []
        for f in filas:
            resultado.append({
                "id": f["id"],
                "taller": f["taller"],
                "nombre": f["nombre"],
                "email": f["email"],
                "rut": f["rut"],
                "carrera": f["carrera"],
                "modalidad": f["modalidad"],
                "participantes": f["participantes"],
                "estado": f["estado"],
                "observaciones": f["observaciones"],
                "created_at": str(f["created_at"]) if f["created_at"] else ""
            })
        return {"solicitudes": resultado}


@app.put("/api/talleres/solicitudes/{solicitud_id}/estado")
async def actualizar_estado_solicitud_taller(solicitud_id: int, data: ActualizarEstadoTallerRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    nuevo_estado = sanitizar_texto(data.estado, max_length=50)
    if nuevo_estado not in ["pendiente", "aprobado", "rechazado", "realizado"]:
        raise HTTPException(status_code=400, detail="Estado no válido. Use: pendiente, aprobado, rechazado, realizado.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE solicitudes_talleres
            SET estado = $1, observaciones = COALESCE($2, observaciones)
            WHERE id = $3
            RETURNING id, taller, nombre, estado, observaciones
            """,
            nuevo_estado, data.observaciones, solicitud_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Solicitud de taller no encontrada.")
        return {"status": "ok", "solicitud": dict(row)}


@app.post("/api/talleres/solicitudes/{solicitud_id}/responder")
async def responder_solicitud_taller(
    solicitud_id: int,
    data: ResponderSolicitudTallerRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    asunto_limpio = sanitizar_texto(data.asunto, max_length=255)
    mensaje_limpio = sanitizar_texto(data.mensaje, max_length=5000)
    if not asunto_limpio or not mensaje_limpio:
        raise HTTPException(status_code=400, detail="El asunto y el mensaje son obligatorios.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, taller, nombre, email, rut, carrera, modalidad, participantes, estado FROM solicitudes_talleres WHERE id = $1",
            solicitud_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Solicitud de taller no encontrada.")

        nuevo_estado = data.nuevo_estado if data.nuevo_estado in ["pendiente", "aprobado", "rechazado", "realizado"] else row["estado"]
        if nuevo_estado != row["estado"]:
            await conn.execute("UPDATE solicitudes_talleres SET estado = $1 WHERE id = $2", nuevo_estado, solicitud_id)

    detalle = {
        "event": "respuesta_solicitud_taller",
        "solicitud_id": row["id"],
        "taller": row["taller"],
        "estudiante_nombre": row["nombre"],
        "estudiante_email": row["email"],
        "estudiante_rut": row["rut"],
        "carrera": row["carrera"],
        "modalidad": row["modalidad"],
        "participantes": row["participantes"],
        "asunto": asunto_limpio,
        "mensaje": mensaje_limpio,
        "estado": nuevo_estado,
        "respondido_por": current_user.get("email"),
        "fecha_respuesta": datetime.now().isoformat()
    }
    background_tasks.add_task(notificar_respuesta_taller_n8n, detalle)

    return {
        "status": "ok",
        "message": f"Respuesta enviada con éxito a {row['email']}.",
        "detalle": detalle
    }


@app.get("/api/talleres/mis-solicitudes")
async def listar_mis_solicitudes_talleres(current_user: dict = Depends(get_current_user)):
    user_rut = str(current_user.get("rut") or "").replace(".", "").replace("-", "").replace(" ", "").upper().strip()
    user_email = str(current_user.get("email") or "").strip().lower()
    t_key = f"talleres:{user_rut}:{user_email}"
    cached = _static_cache.get(t_key)
    if cached and (_time.time() - cached[0] < 15.0):
        return cached[1]

    async with pool.acquire() as conn:
        query = """
            SELECT id, taller, nombre, email, rut, carrera, modalidad, participantes, estado, observaciones, created_at
            FROM solicitudes_talleres
            WHERE (
                REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = $1
                OR LOWER(email) = $2
            )
            ORDER BY created_at DESC
        """
        filas = await conn.fetch(query, user_rut, user_email)
        resultado = []
        for f in filas:
            resultado.append({
                "id": f["id"],
                "taller": f["taller"],
                "nombre": f["nombre"],
                "email": f["email"],
                "rut": f["rut"],
                "carrera": f["carrera"],
                "modalidad": f["modalidad"],
                "participantes": f["participantes"],
                "estado": f["estado"],
                "observaciones": f["observaciones"],
                "created_at": str(f["created_at"]) if f["created_at"] else ""
            })
        resp = {"solicitudes": resultado}
        _static_cache[t_key] = (_time.time(), resp)
        return resp


@app.delete("/api/talleres/mis-solicitudes/{solicitud_id}")
async def cancelar_mi_solicitud_taller(solicitud_id: int, current_user: dict = Depends(get_current_user)):
    user_rut = str(current_user.get("rut") or "").replace(".", "").replace("-", "").replace(" ", "").upper().strip()
    user_email = str(current_user.get("email") or "").strip().lower()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, estado, rut, email
            FROM solicitudes_talleres
            WHERE id = $1
            """,
            solicitud_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

        sol_rut = str(row["rut"] or "").replace(".", "").replace("-", "").replace(" ", "").upper().strip()
        sol_email = str(row["email"] or "").strip().lower()

        if current_user.get("rol") != "admin" and (sol_rut != user_rut and sol_email != user_email):
            raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta solicitud.")

        if row["estado"] != "pendiente":
            raise HTTPException(status_code=400, detail="Solo se pueden cancelar solicitudes en estado pendiente.")

        await conn.execute("DELETE FROM solicitudes_talleres WHERE id = $1", solicitud_id)
        return {"status": "ok", "message": f"Solicitud #{solicitud_id} cancelada con éxito."}


@app.delete("/api/talleres/solicitudes/{solicitud_id}")
async def eliminar_solicitud_taller(solicitud_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM solicitudes_talleres WHERE id = $1", solicitud_id)
        return {"status": "ok", "message": f"Solicitud #{solicitud_id} eliminada."}


_session_saved_cache: Dict[str, float] = {}


def formatear_error_amigable_chatbot(raw: str) -> str:
    if not raw:
        return "Lo siento, ocurrió un inconveniente momentáneo al procesar tu solicitud con el sistema de reservas. Por favor intenta consultarme nuevamente."
    txt = str(raw).strip()
    patrones_tecnicos = [
        r'(?i)Forbidden\s*-\s*perhaps\s+check\s+your\s+credentials\??\s*',
        r'(?i)Forbidden\s*-\s*check\s+your\s+credentials\??\s*',
        r'(?i)Unauthorized\s*-\s*perhaps\s+check\s+your\s+credentials\??\s*',
        r'(?i)Unauthorized\s*-\s*check\s+your\s+credentials\??\s*',
        r'(?i)Bad\s+request\s*-\s*please\s+check\s+your\s+parameters\s*',
        r'(?i)NodeApiError:\s*',
        r'(?i)Workflow\s+execution\s+failed\s*(with\s+error:)?\s*',
        r'(?i)There\s+was\s+an\s+error\s+in\s+workflow\s+execution:?\s*',
        r'(?i)Error\s+running\s+workflow:?\s*',
        r'(?i)Workflow\s+was\s+started\s+but\s+encountered\s+an\s+error:?\s*',
        r'(?i)Calling\s+[a-zA-Z0-9_\-]+(\s*with\s+input:)?\s*\{[\s\S]*?\}',
        r'(?i)\[Usuario autenticado:[^\]]*\]\s*',
        r'(?i)\[Fecha y hora actual:[^\]]*\]\s*',
        r'(?i)\[Contexto temporal:[^\]]*\]\s*',
        r'^\s*40[0-9]\s*-\s*',
        r'^\s*50[0-9]\s*-\s*'
    ]
    for p in patrones_tecnicos:
        txt = re.sub(p, '', txt).strip()
    if txt.startswith('{') and txt.endswith('}'):
        try:
            parsed = json.loads(txt)
            if isinstance(parsed, dict):
                txt = parsed.get("detail") or parsed.get("message") or parsed.get("mensaje") or parsed.get("response") or txt
        except Exception:
            pass
    for p in patrones_tecnicos:
        txt = re.sub(p, '', txt).strip()
    frases_tecnicas = [
        "connection refused", "econnrefused", "internal server error",
        "bad gateway", "service unavailable", "unknown error", "failed to fetch",
        "workflow execution", "workflow error", "error in workflow", "nodeapierror", "http error"
    ]
    txt_lower = txt.lower().strip()
    if not txt or any(inv in txt_lower for inv in frases_tecnicas):
        return "Lo siento, ocurrió un inconveniente momentáneo al procesar tu solicitud con el sistema de reservas. Por favor intenta consultarme nuevamente o reformular tu consulta."
    return txt


@app.post("/api/chat")
async def hablar_con_bot(input_data: MessageInput, request: Request, current_user: dict = Depends(get_current_user)):
    user_rut = (current_user.get("rut") or "").replace(".", "").upper().strip()
    client_ip = obtener_ip_cliente(request)
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
            "response": "Como asistente de Biblioteca UCT, puedo responder consultas sobre reservas de cubículos, talleres de biblioteca, normas de uso y horarios de la biblioteca. ¿En qué te puedo orientar?"
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

        now_s_ts = _time.time()
        if input_data.sessionId and rut_a_guardar:
            if now_s_ts - _session_saved_cache.get(input_data.sessionId, 0) > 300:
                async with pool.acquire() as conn:
                    await conn.execute(
                        """
                        IF EXISTS (SELECT 1 FROM sesiones WHERE session_id = $1)
                            UPDATE sesiones SET rut = $2, nombre = COALESCE($3, nombre), updated_at = GETDATE() WHERE session_id = $1
                        ELSE
                            INSERT INTO sesiones (session_id, rut, nombre, updated_at) VALUES ($1, $2, $3, GETDATE())
                        """,
                        input_data.sessionId, rut_a_guardar, nombre_a_guardar
                    )
                _session_saved_cache[input_data.sessionId] = now_s_ts
        elif input_data.sessionId and not rut_a_guardar:
            async with pool.acquire() as conn:
                row_recup = await conn.fetchrow("SELECT rut, nombre FROM sesiones WHERE session_id = $1", input_data.sessionId)
                if row_recup:
                    rut_a_guardar = row_recup["rut"]
                    nombre_a_guardar = row_recup["nombre"]

        if rut_a_guardar and (not current_user or current_user.get("rol") != "admin"):
            if current_user and "es_regular" in current_user:
                if not current_user.get("es_regular"):
                    return {
                        "response": "Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente."
                    }
            else:
                async with pool.acquire() as conn:
                    reg_check = await verificar_estudiante_regular(conn, rut_a_guardar)
                    if not reg_check["es_regular"]:
                        return {
                            "response": "Actualmente estás como estudiante no regular, cuando resuelvas esa situación estarás activo nuevamente."
                        }

        now_dt = datetime.now()
        fecha_actual = now_dt.strftime("%Y-%m-%d")
        hora_actual = now_dt.strftime("%H:%M")
        now_dt_str = f"{fecha_actual} {hora_actual}"

        contexto_fecha = f"[Contexto temporal: Hoy es {fecha_actual} (año {now_dt.year}, mes {now_dt.month:02d}, día {now_dt.day:02d}) y la hora actual es {hora_actual}. Si el usuario pide agendar para 'hoy', 'mañana' o fechas relativas, usa siempre {fecha_actual} como referencia base. No uses fechas pasadas.]"

        carrera_usuario = current_user.get("carrera") if current_user else None
        matricula_usuario = current_user.get("idmatricula") if current_user else None

        nombre_pila = (nombre_a_guardar.strip().split()[0] if nombre_a_guardar and nombre_a_guardar.strip() else "Estudiante")
        mensaje_enriquecido = f"{contexto_fecha}\n{input_data.message}"
        if rut_a_guardar:
            detalles_auth = f"Usuario: {nombre_pila} | Rol: Estudiante regular"
            if carrera_usuario:
                detalles_auth += f" | Carrera: {carrera_usuario}"
            mensaje_enriquecido = f"[{detalles_auth}]\n{contexto_fecha}\n{input_data.message}"

        payload = {
            "message": mensaje_enriquecido,
            "original_message": input_data.message,
            "sessionId": input_data.sessionId,
            "rut": rut_a_guardar,
            "nombre": nombre_a_guardar,
            "email": email_a_guardar,
            "carrera": carrera_usuario,
            "matricula": matricula_usuario,
            "idmatricula": matricula_usuario,
            "fecha_actual": fecha_actual,
            "hora_actual": hora_actual
        }

        payload_bytes, headers = generar_headers_webhook_n8n(payload)
        timeout_n8n = float(os.getenv("N8N_CHATBOT_TIMEOUT", "120.0"))
        try:
            response = await httpx_client.post(N8N_WEBHOOK_URL, content=payload_bytes, headers=headers, timeout=timeout_n8n)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.RequestError):
            return {
                "response": "El asistente está tardando más de lo habitual en responder. Por favor intenta consultar nuevamente en unos momentos."
            }

        if response.status_code != 200:
            try:
                err_data = response.json()
                raw_err = str(err_data.get("message") or err_data.get("errorMessage") or err_data.get("detail") or err_data.get("output") or "")
            except Exception:
                raw_err = response.text or ""

            clean_err = formatear_error_amigable_chatbot(raw_err)
            return {"response": clean_err}

        data = response.json()
        bot_response = data.get("output") or data.get("message") or data.get("response") or "Reserva procesada con éxito."
        bot_response = formatear_error_amigable_chatbot(bot_response)
        if not bot_response:
            bot_response = "Estoy procesando tu solicitud de cubículos. ¿En qué fecha, hora y sede te gustaría agendar?"
        return {"response": bot_response}

    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error en hablar_con_bot: {e}")
        return {
            "response": "Lo siento, ocurrió un inconveniente momentáneo al procesar tu solicitud con el sistema de reservas. Por favor intenta consultarme nuevamente."
        }


class AdminChatMessageInput(BaseModel):
    message: str
    tipo: Optional[str] = "reglamento"


@app.post("/api/chat/admin")
async def hablar_con_bot_admin(input_data: AdminChatMessageInput, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado. Este chatbot es exclusivo para asistentes y administradores.")

    client_ip = obtener_ip_cliente(request)
    ident = f"admin_chat_{current_user.get('id') or client_ip}"

    if not await check_rate_limit("chat_admin_min", ident, max_requests=30, window_seconds=60, increment=True):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Has superado el límite de 30 consultas por minuto. Por favor espera un momento.",
            headers={"Retry-After": "60"}
        )

    if not input_data.message or not input_data.message.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    if len(input_data.message.strip()) > 600:
        raise HTTPException(status_code=400, detail="La consulta no puede superar los 600 caracteres.")

    payload = {
        "message": input_data.message.strip(),
        "query": input_data.message.strip(),
        "admin_nombre": current_user.get("nombre") or "Asistente Biblioteca",
        "admin_email": current_user.get("email") or "",
        "rol": current_user.get("rol") or "admin",
        "contexto": "reglamento_biblioteca_uct",
        "fecha_actual": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

    try:
        payload_bytes, headers = generar_headers_webhook_n8n(payload)
        timeout_n8n = float(os.getenv("N8N_CHATBOT_TIMEOUT", "120.0"))
        target_url = N8N_REGLAMENTO_WEBHOOK_URL or "http://uct-botsbiblioteca-dev-n8n-1:5678/webhook/consultar-reglamento"

        try:
            response = await httpx_client.post(target_url, content=payload_bytes, headers=headers, timeout=timeout_n8n)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.RequestError):
            return {
                "response": "El servicio de reglamento tardó más de lo esperado en responder. Por favor intenta nuevamente en unos momentos."
            }

        if response.status_code == 200:
            data = response.json()
            bot_response = data.get("output") or data.get("message") or data.get("response") or "Consulta sobre reglamento procesada con éxito."
            bot_response = formatear_error_amigable_chatbot(bot_response)
            return {"response": bot_response}
        elif response.status_code == 404:
            return {
                "response": "ℹ️ El webhook de n8n para reglamento (`/webhook/consultar-reglamento`) está configurado pero aún no se encuentra activo en tu instancia de n8n. Una vez que actives el flujo con los PDFs de reglamento en n8n, responderé tus dudas normativas aquí."
            }
        else:
            try:
                err_data = response.json()
                raw_err = str(err_data.get("message") or err_data.get("errorMessage") or err_data.get("detail") or err_data.get("output") or "")
            except Exception:
                raw_err = response.text or ""
            return {"response": formatear_error_amigable_chatbot(raw_err)}
    except Exception as e:
        print(f"⚠️ Error en hablar_con_bot_admin: {e}")
        return {
            "response": "⚠️ No se pudo comunicar con el webhook de reglamento en este momento. Por favor verifica que el flujo en n8n esté activo e intenta nuevamente."
        }


async def validar_recordatorios_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> dict:
    webhook_token = request.headers.get("X-Webhook-Token") or request.headers.get("X-API-Key")
    if webhook_token and hmac.compare_digest(webhook_token.strip(), N8N_SECRET_KEY.strip()):
        return {"source": "n8n", "rol": "admin"}
    if credentials and credentials.credentials:
        user = await get_current_user(credentials)
        if user.get("rol") == "admin":
            return user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Acceso restringido. Se requiere autenticación de administrador o cabecera X-Webhook-Token."
    )


@app.get("/api/reservas/recordatorios")
@app.get("/api/reservas/recordatorios-manana")
async def obtener_recordatorios_manana(dias: int = 1, auth: dict = Depends(validar_recordatorios_auth)):
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
                WHERE r.fecha = DATEADD(day, $1, CAST(GETDATE() AS DATE))
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
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error inesperado en obtener_recordatorios_manana: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudieron consultar los recordatorios en este momento."
        )


@app.delete("/api/reservas")
async def eliminar_reserva(data: EsquemaEliminar, request: Request, background_tasks: BackgroundTasks, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    client_id = data.sessionId or obtener_ip_cliente(request)
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
                raise HTTPException(status_code=400, detail="Para cancelar tu reserva por favor indica el RUT del titular.")

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
                raise HTTPException(status_code=404, detail=f"No se encontró ninguna reserva activa vigente para el RUT {rut_limpio}. Puedes revisar tus reservas diciendo 'ver mis reservas'.")

            ids_a_borrar = [f["id"] for f in filas_canceladas]

            async with conn.transaction():
                for res in filas_canceladas:
                    res_upd = await conn.execute("UPDATE historial_reservas SET estado = 'liberada', fecha_registro = GETDATE() WHERE reserva_id = $1", res["id"])
                    if res_upd == "UPDATE 0":
                        await conn.execute(
                            """
                            INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado, fecha_registro)
                            VALUES ($1, $2, $3, $4, $5, $6, 'liberada', GETDATE())
                            """,
                            res["id"], res["nombre"], res["rut"], res.get("campus_id"), res["fecha"], str(res["hora"])[:5]
                        )
                await conn.execute("DELETE FROM reserva_acompanantes WHERE reserva_id IN ($1)", ids_a_borrar)
                await conn.execute("DELETE FROM reservas WHERE id IN ($1)", ids_a_borrar)

            await invalidar_caches_disponibilidad()
            background_tasks.add_task(notificar_cancelacion_n8n, filas_canceladas)
            return {"message": f"Reserva del RUT {rut_limpio} cancelada con éxito."}

    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error inesperado en eliminar_reserva: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo cancelar la reserva en este momento. Por favor intenta nuevamente."
        )


@app.delete("/api/reservas/{reserva_id}")
async def eliminar_reserva_por_id(
    reserva_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    sessionId: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    client_id = sessionId or obtener_ip_cliente(request)
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

        es_admin = bool(current_user and current_user.get("rol") == "admin")
        nuevo_estado = "cancelada" if es_admin else "liberada"

        async with conn.transaction():
            res_upd = await conn.execute("UPDATE historial_reservas SET estado = $1, fecha_registro = GETDATE() WHERE reserva_id = $2", nuevo_estado, reserva_id)
            if res_upd == "UPDATE 0":
                await conn.execute(
                    """
                    INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado, fecha_registro)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, GETDATE())
                    """,
                    res_detalle["id"], res_detalle["nombre"], res_detalle["rut"], res_detalle["campus_id"], res_detalle["fecha"], str(res_detalle["hora"])[:5], nuevo_estado
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
    estado: Optional[str] = None,
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

    estado_filtro = None if (not estado or estado.lower() == "todos") else estado.lower().strip()

    async with pool.acquire() as conn:
        cte_base = """
        WITH base_historial AS (
            SELECT 
                r.id, r.id AS reserva_id, r.nombre, r.rut, r.fecha::text, CONVERT(VARCHAR(5), r.hora, 108) AS hora,
                COALESCE(r.carrera, 'Otras Carreras / General') AS carrera,
                CASE 
                    WHEN (r.fecha < CAST(GETDATE() AS DATE)) OR (r.fecha = CAST(GETDATE() AS DATE) AND DATEDIFF(minute, TRY_CAST(CONVERT(VARCHAR(5), r.hora, 108) AS TIME), CAST(GETDATE() AS TIME)) >= 60) THEN 'completada'
                    ELSE 'activa'
                END AS estado,
                COALESCE(r.created_at, CAST(r.fecha AS DATETIME2)) AS sort_ts,
                COALESCE(r.created_at, CAST(r.fecha AS DATETIME2))::text AS fecha_registro,
                c.nombre AS campus_nombre
            FROM reservas r
            LEFT JOIN campus c ON r.campus_id = c.id
            WHERE ($1::int IS NULL OR $1::int = 0 OR r.campus_id = $1)
              AND ($2::text IS NULL OR $2::text = '' OR LOWER(r.nombre) LIKE '%' || LOWER($2) || '%' OR LOWER(r.rut) LIKE '%' || LOWER($2) || '%' OR LOWER(COALESCE(r.carrera, '')) LIKE '%' || LOWER($2) || '%')

            UNION ALL

            SELECT 
                h.id, h.reserva_id, h.nombre, h.rut, h.fecha::text, LEFT(h.hora::text, 5) AS hora,
                COALESCE(h.carrera, 'Otras Carreras / General') AS carrera,
                CASE 
                    WHEN h.estado = 'cancelada' THEN 'cancelada'
                    WHEN h.estado = 'liberada' THEN 'liberada'
                    WHEN h.estado = 'inasistencia' THEN 'inasistencia'
                    WHEN h.estado = 'justificada' THEN 'justificada'
                    WHEN (h.fecha < CAST(GETDATE() AS DATE)) OR (h.fecha = CAST(GETDATE() AS DATE) AND DATEDIFF(minute, TRY_CAST(LEFT(CAST(h.hora AS VARCHAR(10)), 5) AS TIME), CAST(GETDATE() AS TIME)) >= 60) THEN 'completada'
                    WHEN h.estado = 'expirada' THEN 'completada'
                    ELSE h.estado
                END AS estado,
                COALESCE(h.fecha_registro, CAST(h.fecha AS DATETIME2)) AS sort_ts,
                COALESCE(h.fecha_registro, CAST(h.fecha AS DATETIME2))::text AS fecha_registro,
                c.nombre AS campus_nombre
            FROM historial_reservas h
            LEFT JOIN campus c ON h.campus_id = c.id
            WHERE ($1::int IS NULL OR $1::int = 0 OR h.campus_id = $1)
              AND ($2::text IS NULL OR $2::text = '' OR LOWER(h.nombre) LIKE '%' || LOWER($2) || '%' OR LOWER(h.rut) LIKE '%' || LOWER($2) || '%' OR LOWER(COALESCE(h.carrera, '')) LIKE '%' || LOWER($2) || '%')
              AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.id = h.reserva_id)
        )
        """

        total_row = await conn.fetchrow(
            f"""
            {cte_base}
            SELECT COUNT(*) AS total 
            FROM base_historial
            WHERE ($3::text IS NULL OR $3::text = '' OR LOWER(estado) = LOWER($3))
            """,
            campus_id, busqueda, estado_filtro
        )
        total = int(total_row["total"]) if total_row else 0

        filas = await conn.fetch(
            f"""
            {cte_base}
            SELECT 
                id, reserva_id, nombre, rut, fecha, hora, carrera, estado, fecha_registro, campus_nombre
            FROM base_historial
            WHERE ($3::text IS NULL OR $3::text = '' OR LOWER(estado) = LOWER($3))
            ORDER BY sort_ts DESC, COALESCE(reserva_id, 0) DESC, id DESC
            LIMIT $4 OFFSET $5
            """,
            campus_id, busqueda, estado_filtro, lim, off
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
    try:
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
                    res_existente = await conn.fetchrow("SELECT id, nombre, rut, fecha, hora, campus_id, cubiculo_id, session_id FROM reservas WHERE id = $1", target_id)
                elif rut_consulta:
                    rut_limpio = str(rut_consulta).replace(".", "").upper().strip()
                    res_existente = await conn.fetchrow(
                        """
                        SELECT id, nombre, rut, fecha, hora, campus_id, cubiculo_id, session_id 
                        FROM reservas 
                        WHERE rut = $1 
                          AND (fecha > CURRENT_DATE OR (fecha = CURRENT_DATE AND hora + INTERVAL '1 hour' > CURRENT_TIME))
                        ORDER BY id DESC LIMIT 1
                        """,
                        rut_limpio
                    )
                else:
                    raise HTTPException(status_code=400, detail="Para modificar tu reserva se requiere tu RUT o el identificador de la reserva.")

                if not res_existente:
                    raise HTTPException(status_code=404, detail="No se encontró ninguna reserva activa vigente asociada a tus datos para modificar.")

                reserva_id = res_existente["id"]
                rut_reserva = res_existente["rut"]

                if rut_consulta and (not current_user or current_user.get("rol") != "admin"):
                    rut_res_clean = str(rut_reserva).replace(".", "").replace("-", "").upper().strip()
                    rut_con_clean = str(rut_consulta).replace(".", "").replace("-", "").upper().strip()
                    if rut_res_clean != rut_con_clean:
                        raise HTTPException(status_code=403, detail="No tienes permisos para modificar esta reserva ya que pertenece a otro estudiante.")

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
                RETURNING id, nombre, rut, fecha, hora, campus_id, session_id, carrera
                """,
                nueva_fecha, nueva_hora, nuevo_campus_id, nuevo_cubiculo_id, reserva_id
            )

            await conn.execute(
                """
                UPDATE historial_reservas
                SET fecha = $1, hora = $2, campus_id = $3, fecha_registro = GETDATE()
                WHERE reserva_id = $4 AND estado = 'activa'
                """,
                nueva_fecha, nueva_hora.strftime("%H:%M"), nuevo_campus_id, reserva_id
            )

            if data.sessionId:
                await conn.execute(
                    """
                    IF EXISTS (SELECT 1 FROM sesiones WHERE session_id = $1)
                        UPDATE sesiones SET rut = $2, nombre = $3, updated_at = GETDATE() WHERE session_id = $1
                    ELSE
                        INSERT INTO sesiones (session_id, rut, nombre, updated_at) VALUES ($1, $2, $3, GETDATE())
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
            "carrera": row_upd.get("carrera") or "General",
            "acompanantes": acompanantes_guardados
        }

        if background_tasks:
            background_tasks.add_task(notificar_edicion_n8n, res_data)
        else:
            await notificar_edicion_n8n(res_data)

        return res_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error inesperado en procesar_edicion_reserva: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo modificar la reserva en este momento. Por favor intenta nuevamente."
        )


@app.put("/api/reservas/{reserva_id}", response_model=ReservaResponse)
async def editar_reserva_por_id(reserva_id: int, data: EsquemaEditarReserva, background_tasks: BackgroundTasks, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    return await procesar_edicion_reserva(reserva_id, data, credentials, background_tasks)


@app.put("/api/reservas", response_model=ReservaResponse)
async def editar_reserva(data: EsquemaEditarReserva, background_tasks: BackgroundTasks, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    return await procesar_edicion_reserva(None, data, credentials, background_tasks)


@app.post("/api/reservas/consultar")
async def consultar_reservas(data: EsquemaConsulta, request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    client_id = data.rut or data.sessionId or obtener_ip_cliente(request)
    await enforce_rate_limit(
        "consultar_reservas",
        client_id,
        max_requests=60,
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
                    cached = _user_auth_cache.get(email)
                    if cached and (_time.time() - cached[0] < 120):
                        current_user = dict(cached[1])
                    else:
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
            asyncpg.set_rls_context(
                rol=current_user.get("rol"),
                rut=current_user.get("rut"),
                enforced=True
            )

        pagina = max(1, data.pagina_historial or 1)
        limite = max(1, min(data.limite_historial or 5, 50))
        if not rut_consulta and data.sessionId:
            rut_consulta = extraer_rut_de_session(data.sessionId)
        if rut_consulta and "[" not in str(rut_consulta):
            rut_limpio_pre = re.sub(r'[\.\-\s]', '', str(rut_consulta)).upper().strip()
            cons_key = f"cons:{rut_limpio_pre}:{pagina}:{limite}"
            cached_cons = _disponibilidad_cache.get(cons_key)
            if cached_cons and (_time.time() - cached_cons[0] < 10.0):
                return cached_cons[1]

        async with pool.acquire() as conn:
            if not rut_consulta and data.sessionId:
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId)
                if row_sesion and row_sesion["rut"]:
                    rut_consulta = row_sesion["rut"]

            if not rut_consulta or "[" in str(rut_consulta):
                raise HTTPException(status_code=400, detail="Para consultar tus reservas por favor proporciona un RUT válido.")

            rut_limpio = re.sub(r'[\.\-\s]', '', str(rut_consulta)).upper().strip()
            cons_key = f"cons:{rut_limpio}:{pagina}:{limite}"

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
            MAX_HISTORIAL = 25

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
            total_historial_real = int(total_historial_row["total"]) if total_historial_row else 0
            total_historial = min(total_historial_real, MAX_HISTORIAL)
            total_paginas = max(1, (total_historial + limite - 1) // limite) if total_historial > 0 else 1

            if not respuesta and total_historial == 0:
                sancion = await verificar_sancion_usuario(conn, rut_limpio)
                empty_res = {
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
                _disponibilidad_cache[cons_key] = (_time.time(), empty_res)
                return empty_res

            if offset >= MAX_HISTORIAL:
                historial_pasadas = []
            else:
                limite_efectivo = min(limite, MAX_HISTORIAL - offset)
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
                    ORDER BY h.fecha_registro DESC, h.id DESC
                    LIMIT $2 OFFSET $3
                    """,
                    rut_limpio,
                    limite_efectivo,
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
                    "estado": "completada" if (h["estado"] or "").lower() in ["expirada", "inactiva", "finalizada", "activa", ""] else h["estado"],
                    "acompanantes": []
                })

            sancion = await verificar_sancion_usuario(conn, rut_limpio)
            full_res = {
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
            _disponibilidad_cache[cons_key] = (_time.time(), full_res)
            return full_res

    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error inesperado en consultar_reservas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudieron consultar las reservas en este momento. Por favor intenta nuevamente."
        )


@app.get("/api/dashboard/reservas-bloque")
async def obtener_reservas_bloque(campus_id: int, fecha: str, hora: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores.")

    try:
        fecha_parsed = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
        hora_parsed = datetime.strptime(hora.strip()[:5], "%H:%M").time()
        ahora = datetime.now()
        fin_bloque_dt = datetime.combine(fecha_parsed, hora_parsed) + timedelta(hours=1)
        es_completada = (fecha_parsed < ahora.date()) or (fecha_parsed == ahora.date() and ahora >= fin_bloque_dt)
        estado_bloque = "completada" if es_completada else "activa"

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

            if es_completada and filas_reservas:
                ids_completadas = [r["id"] for r in filas_reservas]
                await conn.execute(
                    "UPDATE historial_reservas SET estado = 'completada' WHERE reserva_id = ANY($1) AND estado = 'activa'",
                    ids_completadas
                )

            resultado = []
            for r in filas_reservas:
                filas_ac = await conn.fetch("SELECT nombre, rut FROM reserva_acompanantes WHERE reserva_id = $1", r["id"])
                resultado.append({
                    "id": str(r["id"]),
                    "campus_id": campus_id,
                    "nombre": r["nombre"],
                    "rut": r["rut"],
                    "sessionId": r["session_id"],
                    "fecha": fecha.strip(),
                    "hora": hora.strip(),
                    "estado": estado_bloque,
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


@app.post("/api/hikcentral/door/open")
async def abrir_puerta_manual(door_code: str = "1", current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso restringido a administradores.")
    try:
        direct_res = await open_door_direct(1)
        if direct_res.get("success"):
            return {"status": "ok", "mode": "direct_isapi", "result": direct_res}
    except Exception:
        pass
    res = await request_artemis(
        "POST",
        "/artemis/api/acs/v1/door/doControl",
        {"doorIndexCodes": [str(door_code)], "controlType": 0}
    )
    return res


async def verificar_acceso_camara(
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> dict:
    tok = credentials.credentials if credentials and credentials.credentials else token
    if not tok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación para acceder a la cámara.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if await is_token_blacklisted(tok):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revocado.")
    try:
        payload = jwt.decode(tok, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") and payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token no válido.")
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token no válido.")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado.")

    cached = _user_auth_cache.get(email)
    if cached and (_time.time() - cached[0] < 120):
        d_row = dict(cached[1])
    else:
        async with pool.acquire() as conn:
            row_u = await conn.fetchrow("SELECT id, email, rol FROM usuarios WHERE email = $1", email)
            if not row_u:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado.")
            d_row = dict(row_u)
    if d_row.get("rol") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso restringido a administradores.")
    return d_row


async def _generar_mjpeg_stream():
    auth = httpx.DigestAuth(HIKVISION_TERMINAL_USER, HIKVISION_TERMINAL_PASS)
    async with httpx.AsyncClient(verify=False, timeout=4.0, auth=auth) as client:
        while True:
            try:
                r = await client.get(f"https://{HIKVISION_TERMINAL_IP}/ISAPI/Streaming/channels/102/picture")
                if r.status_code != 200:
                    r = await client.get(f"https://{HIKVISION_TERMINAL_IP}/ISAPI/Streaming/channels/101/picture")
                if r.status_code == 200 and len(r.content) > 1000:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + r.content + b"\r\n"
                    )
                await asyncio.sleep(0.05)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(0.2)


@app.get("/api/terminal/camara/stream")
async def stream_camara_terminal(auth: dict = Depends(verificar_acceso_camara)):
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        _generar_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers=headers
    )


@app.get("/api/terminal/camara/snapshot")
async def snapshot_camara_terminal(auth: dict = Depends(verificar_acceso_camara)):
    auth = httpx.DigestAuth(HIKVISION_TERMINAL_USER, HIKVISION_TERMINAL_PASS)
    async with httpx.AsyncClient(verify=False, timeout=4.0, auth=auth) as client:
        try:
            r = await client.get(f"https://{HIKVISION_TERMINAL_IP}/ISAPI/Streaming/channels/102/picture")
            if r.status_code != 200:
                r = await client.get(f"https://{HIKVISION_TERMINAL_IP}/ISAPI/Streaming/channels/101/picture")
            if r.status_code == 200:
                headers = {
                    "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0",
                }
                return Response(content=r.content, media_type="image/jpeg", headers=headers)
            raise HTTPException(status_code=r.status_code, detail="No se pudo obtener imagen")
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))



async def validar_y_abrir_acceso(matricula_limpio: str = None, nombre_limpio: str = None, rut_limpio: str = None, door_code: str = "1") -> dict:
    now_dt = datetime.now()
    hoy = now_dt.date()

    if matricula_limpio and len(matricula_limpio) <= 8 and matricula_limpio.isdigit():
        p_info = await get_person_info(matricula_limpio)
        if p_info:
            matricula_limpio = p_info.get("personCode") or matricula_limpio
            nombre_limpio = nombre_limpio or p_info.get("personName")
            if not rut_limpio and p_info.get("certificateNo"):
                rut_limpio = str(p_info.get("certificateNo")).replace(".", "").replace("-", "").upper().strip()

    def _es_horario_valido(hora_val) -> bool:
        if not hora_val:
            return False
        if isinstance(hora_val, str):
            parts = hora_val.split(":")
            t_val = time(int(parts[0]), int(parts[1]))
        elif isinstance(hora_val, time):
            t_val = hora_val
        elif isinstance(hora_val, datetime):
            t_val = hora_val.time()
        else:
            return False
        dt_r = datetime.combine(hoy, t_val)
        return (dt_r - timedelta(minutes=15)) <= now_dt <= (dt_r + timedelta(minutes=60))

    async with pool.acquire() as conn:
        reserva = None
        ids_a_buscar = [x for x in [rut_limpio, matricula_limpio] if x]
        for id_val in ids_a_buscar:
            if reserva:
                break
            candidatos_rut = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, r.cubiculo_id
                FROM reservas r
                LEFT JOIN usuarios u ON REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', ''), ' ', '')
                LEFT JOIN estudiante e ON REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', ''), ' ', '') = CONCAT(e.estd_rut, e.estd_dv)
                LEFT JOIN estudiante_carrera ec ON e.estd_rut = ec.estd_rut
                WHERE (
                    REPLACE(REPLACE(REPLACE(UPPER(r.rut), '.', ''), '-', ''), ' ', '') = $1
                    OR u.idmatricula = $1
                    OR CAST(ec.estu_registro AS VARCHAR(50)) = $1
                    OR EXISTS (
                        SELECT 1 FROM reserva_acompanantes ra
                        WHERE ra.reserva_id = r.id
                          AND (
                              REPLACE(REPLACE(REPLACE(UPPER(ra.rut), '.', ''), '-', ''), ' ', '') = $1
                              OR EXISTS (
                                  SELECT 1 FROM estudiante e2
                                  JOIN estudiante_carrera ec2 ON e2.estd_rut = ec2.estd_rut
                                  WHERE CONCAT(e2.estd_rut, e2.estd_dv) = REPLACE(REPLACE(REPLACE(UPPER(ra.rut), '.', ''), '-', ''), ' ', '')
                                    AND CAST(ec2.estu_registro AS VARCHAR(50)) = $1
                              )
                          )
                    )
                )
                AND r.fecha = $2
                ORDER BY r.hora ASC
                """,
                id_val, hoy
            )
            for cand in candidatos_rut:
                if _es_horario_valido(cand["hora"]):
                    reserva = cand
                    break

        if not reserva and nombre_limpio:
            candidatos_nom = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, r.cubiculo_id
                FROM reservas r
                WHERE (
                    LOWER(TRIM(r.nombre)) = LOWER(TRIM($1))
                    OR EXISTS (
                        SELECT 1 FROM reserva_acompanantes ra
                        WHERE ra.reserva_id = r.id
                          AND LOWER(TRIM(ra.nombre)) = LOWER(TRIM($1))
                    )
                )
                AND r.fecha = $2
                ORDER BY r.hora ASC
                """,
                nombre_limpio, hoy
            )
            for cand in candidatos_nom:
                if _es_horario_valido(cand["hora"]):
                    reserva = cand
                    break

        if reserva:
            print(f"✅ RESERVA ENCONTRADA: ID={reserva['id']}, Estudiante={reserva['nombre']}, Hora={reserva['hora']}. ABRIENDO PUERTA...", flush=True)
            try:
                direct_res = await open_door_direct(1)
                control_res = direct_res if direct_res.get("success") else await request_artemis(
                    "POST",
                    "/artemis/api/acs/v1/door/doControl",
                    {"doorIndexCodes": [door_code], "controlType": 0}
                )
                return {"doorIndexCode": door_code, "status": "opened", "reserva_id": reserva["id"], "estudiante": reserva["nombre"], "response": control_res}
            except Exception as ex:
                return {"doorIndexCode": door_code, "status": "error_opening", "error": str(ex), "reserva_id": reserva["id"]}
        else:
            ident = matricula_limpio or rut_limpio or nombre_limpio
            print(f"❌ ACCESO DENEGADO: {ident}. Sin reserva activa hoy a esta hora.", flush=True)
            return {"doorIndexCode": door_code, "status": "denied", "reason": "Sin reserva activa en este horario", "identificador": ident}


async def background_terminal_watcher():
    await asyncio.sleep(4)
    auth = httpx.DigestAuth(HIKVISION_TERMINAL_USER, HIKVISION_TERMINAL_PASS)
    terminal_url = f"https://{HIKVISION_TERMINAL_IP}/ISAPI/AccessControl/AcsEvent?format=json"

    last_serial = 0
    try:
        now = datetime.now()
        payload = {
            "AcsEventCond": {
                "searchID": f"init_{uuid.uuid4().hex[:6]}",
                "searchResultPosition": 0,
                "maxResults": 30,
                "major": 5,
                "minor": 75,
                "startTime": (now - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S-03:00"),
                "endTime": (now + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
            }
        }
        async with httpx.AsyncClient(verify=False, timeout=4.0) as client:
            r = await client.post(terminal_url, json=payload, auth=auth)
            if r.status_code == 200:
                for ev in r.json().get("AcsEvent", {}).get("InfoList", []):
                    s = ev.get("serialNo", 0)
                    if s > last_serial:
                        last_serial = s
        print(f"[Watcher] Monitor de terminal ISAPI inicializado en serial {last_serial}", flush=True)
    except Exception as e:
        print(f"[Watcher] Error inicializando monitor ISAPI: {e}", flush=True)

    while True:
        try:
            now = datetime.now()
            payload = {
                "AcsEventCond": {
                    "searchID": f"live_{uuid.uuid4().hex[:6]}",
                    "searchResultPosition": 0,
                    "maxResults": 15,
                    "major": 5,
                    "minor": 75,
                    "startTime": (now - timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%S-03:00"),
                    "endTime": (now + timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
                }
            }
            async with httpx.AsyncClient(verify=False, timeout=3.0) as client:
                r = await client.post(terminal_url, json=payload, auth=auth)
                if r.status_code == 200:
                    events = r.json().get("AcsEvent", {}).get("InfoList", [])
                    for ev in events:
                        serial = ev.get("serialNo", 0)
                        if serial > last_serial:
                            last_serial = serial
                            name = ev.get("name")
                            emp = ev.get("employeeNoString")
                            print(f"🎯 ESCANEO EN VIVO (ISAPI): {name} (ID: {emp}) - Serial {serial}", flush=True)
                            asyncio.create_task(validar_y_abrir_acceso(matricula_limpio=emp, nombre_limpio=name))
        except Exception as e:
            if not isinstance(e, (httpx.TimeoutException, httpx.NetworkError)):
                print(f"[Watcher] Error en ciclo ISAPI: {e}", flush=True)
        await asyncio.sleep(0.8)


@app.post("/api/hikcentral/event")
async def recibir_evento_hikcentral(request: Request):
    raw_body = await request.body()
    if not raw_body or raw_body.strip() == b"":
        return {"status": "ok", "message": "Ping"}

    raw_text = raw_body.decode("utf-8", errors="replace")
    body = None
    try:
        body = json.loads(raw_text)
    except Exception:
        if "{" in raw_text and "}" in raw_text:
            try:
                start_idx = raw_text.find("{")
                end_idx = raw_text.rfind("}")
                body = json.loads(raw_text[start_idx:end_idx+1])
            except Exception:
                body = None

    if not body:
        return {"status": "ok", "message": "Non-json packet ignored"}

    raw_events = body.get("events") if isinstance(body, dict) else []
    if not raw_events and isinstance(body, dict) and "params" in body and isinstance(body["params"], dict):
        raw_events = body["params"].get("events") or []
    if not raw_events and isinstance(body, dict):
        raw_events = [body]

    resultados = []
    for ev in raw_events:
        data = ev.get("data") if isinstance(ev.get("data"), dict) else ev
        ev_ace = ev.get("AccessControllerEvent", {})
        first_name = data.get("firstName") or ev.get("firstName") or ""
        last_name = data.get("lastName") or ev.get("lastName") or ""
        person_name = (
            ev_ace.get("name") or
            data.get("personName") or
            data.get("person_name") or
            ev.get("personName") or
            (f"{first_name} {last_name}".strip() or None)
        )
        door_code = str(ev_ace.get("doorNo") or data.get("doorIndexCode") or data.get("door_code") or ev.get("srcIndex") or "1")

        person_id = str(data.get("personId") or ev.get("personId") or "")
        p_info = {}
        if person_id:
            p_info = await get_person_info(person_id)

        matricula_raw = (
            ev_ace.get("employeeNoString") or
            ev_ace.get("cardNo") or
            data.get("personCode") or
            p_info.get("personCode") or
            data.get("employeeNo") or
            data.get("employee_no") or
            data.get("extEventEmployeeNo") or
            data.get("extEventPersonNo") or
            ev.get("employeeNo") or
            ev.get("personCode") or
            data.get("personId") or
            data.get("ID") or
            data.get("id") or
            data.get("jobNo") or
            ev.get("ID") or
            ev.get("id") or
            ev.get("jobNo")
        )
        matricula_limpio = str(matricula_raw).strip() if matricula_raw else None
        rut = data.get("certificateNo") or data.get("rut") or ev.get("certificateNo") or p_info.get("certificateNo")
        rut_limpio = str(rut).replace(".", "").replace("-", "").upper().strip() if rut else None
        nombre_limpio = str(person_name or p_info.get("personName") or "").strip() or None

        if matricula_limpio and (matricula_limpio.startswith("{$") or matricula_limpio.startswith("${")):
            matricula_limpio = None
        if rut_limpio and (rut_limpio.startswith("{$") or rut_limpio.startswith("${")):
            rut_limpio = None

        res = await validar_y_abrir_acceso(matricula_limpio, nombre_limpio, rut_limpio, door_code)
        resultados.append(res)

    return {"processed": len(resultados), "results": resultados}


class EsquemaConfigIA(BaseModel):
    provider: str = "openai"
    base_url: str
    api_key: Optional[str] = None
    model: str
    n8n_api_base: Optional[str] = None
    n8n_api_key: Optional[str] = None


class EsquemaModelosIA(BaseModel):
    base_url: str
    api_key: Optional[str] = None


async def _ensure_configuracion_ia_table(conn):
    await conn.execute("""
        IF OBJECT_ID('configuracion_ia', 'U') IS NULL
        CREATE TABLE configuracion_ia (
            id INT IDENTITY(1,1) PRIMARY KEY,
            provider NVARCHAR(60) NOT NULL,
            base_url NVARCHAR(500) NOT NULL,
            model NVARCHAR(150) NOT NULL,
            credential_id NVARCHAR(100) NULL,
            n8n_api_base NVARCHAR(500) NULL,
            n8n_api_key NVARCHAR(1000) NULL,
            updated_by NVARCHAR(255) NULL,
            updated_at DATETIME2 DEFAULT GETDATE()
        );
    """)


def _normalizar_url_proveedor(raw_url: str) -> str:
    url = (raw_url or "").strip().rstrip("/")
    if not re.match(r'^https?://[a-zA-Z0-9\.\-:_]+', url):
        raise HTTPException(status_code=400, detail="URL base del proveedor inválida. Debe iniciar con http:// o https://.")
    if "169.254.169.254" in url or "metadata.google.internal" in url:
        raise HTTPException(status_code=400, detail="URL no permitida por políticas de seguridad.")
    return url


def _normalizar_n8n_api_base(raw_base: Optional[str]) -> str:
    base = (raw_base or "").strip().rstrip("/")
    if not base:
        if N8N_API_BASE:
            base = N8N_API_BASE.rstrip("/")
        elif N8N_WEBHOOK_URL and "/webhook" in N8N_WEBHOOK_URL:
            base = N8N_WEBHOOK_URL.split("/webhook")[0].rstrip("/")
        else:
            base = "http://uct-botsbiblioteca-dev-n8n-1:5678"
    if os.path.exists("/.dockerenv") or os.getenv("RUNNING_IN_DOCKER"):
        base = base.replace("://localhost:5678", "://uct-botsbiblioteca-dev-n8n-1:5678").replace("://127.0.0.1:5678", "://uct-botsbiblioteca-dev-n8n-1:5678")
    return base.rstrip("/")


async def _obtener_n8n_conexion(conn, override_base: Optional[str] = None, override_key: Optional[str] = None) -> tuple:
    row = await conn.fetchrow("SELECT TOP 1 n8n_api_base, n8n_api_key FROM configuracion_ia ORDER BY id DESC")
    db_base = row["n8n_api_base"] if row else None
    db_key = row["n8n_api_key"] if row else None
    api_base = _normalizar_n8n_api_base(override_base or db_base)
    api_key = (override_key or N8N_API_KEY or db_key or "").strip()
    return api_base, api_key


async def _consultar_modelos_proveedor(base_url: str, api_key: str) -> List[str]:
    clean_url = _normalizar_url_proveedor(base_url)
    try:
        resp = await httpx_client.get(
            f"{clean_url}/models",
            headers={"Authorization": f"Bearer {api_key.strip()}"},
            timeout=12.0
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo conectar con {clean_url}: {e}")

    if resp.status_code in (401, 403):
        raise HTTPException(status_code=400, detail="La API Key ingresada fue rechazada por el proveedor (401/403).")
    if resp.status_code >= 400:
        raise HTTPException(status_code=400, detail=f"El proveedor respondió con error {resp.status_code} al verificar la clave.")

    try:
        payload = resp.json()
        modelos = [m.get("id") for m in payload.get("data", []) if isinstance(m, dict) and m.get("id")]
        return sorted(set(modelos))
    except Exception:
        return []


def _extraer_info_llm_workflow(wf: dict) -> dict:
    nodes = wf.get("nodes") or []
    connections = wf.get("connections") or {}
    conectado_nombre = None
    for src_name, targets in connections.items():
        if "ai_languageModel" in targets:
            for n in nodes:
                if n.get("name") == src_name and "lmChat" in (n.get("type") or ""):
                    conectado_nombre = src_name
                    break
        if conectado_nombre:
            break

    nodo_activo = None
    for n in nodes:
        if conectado_nombre and n.get("name") == conectado_nombre:
            nodo_activo = n
            break
    if not nodo_activo:
        for n in nodes:
            if "lmChat" in (n.get("type") or ""):
                nodo_activo = n
                break

    if not nodo_activo:
        return {"workflow_name": wf.get("name"), "node_type": None, "model": None, "credential_id": None}

    params = nodo_activo.get("parameters") or {}
    raw_model = params.get("model")
    if isinstance(raw_model, dict):
        model_val = raw_model.get("value")
    else:
        model_val = raw_model

    creds = nodo_activo.get("credentials") or {}
    cred_id = None
    for c_val in creds.values():
        if isinstance(c_val, dict) and c_val.get("id"):
            cred_id = c_val.get("id")
            break

    return {
        "workflow_id": wf.get("id"),
        "workflow_name": wf.get("name"),
        "active": bool(wf.get("active")),
        "node_name": nodo_activo.get("name"),
        "node_type": nodo_activo.get("type"),
        "model": model_val,
        "credential_id": cred_id
    }


async def _upsert_credencial_openai_n8n(api_base: str, headers: dict, api_key: str, base_url: str, saved_cred_id: Optional[str]) -> tuple:
    cred_name = "IA Chatbot Dinámica"
    target_id = saved_cred_id
    if not target_id:
        r_list = await httpx_client.get(f"{api_base}/api/v1/credentials", headers=headers, timeout=15.0)
        if r_list.status_code == 200:
            for c in r_list.json().get("data", []):
                if c.get("type") == "openAiApi" and c.get("name") == cred_name:
                    target_id = c.get("id")
                    break

    payload = {
        "name": cred_name,
        "type": "openAiApi",
        "data": {
            "apiKey": api_key,
            "url": base_url
        }
    }

    if target_id:
        r_upd = await httpx_client.patch(f"{api_base}/api/v1/credentials/{target_id}", headers=headers, json=payload, timeout=15.0)
        if r_upd.status_code == 404:
            target_id = None
        elif r_upd.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Error actualizando credencial en n8n ({r_upd.status_code}): {r_upd.text}")

    if not target_id:
        r_new = await httpx_client.post(f"{api_base}/api/v1/credentials", headers=headers, json=payload, timeout=15.0)
        if r_new.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Error creando credencial en n8n ({r_new.status_code}): {r_new.text}")
        target_id = r_new.json().get("id")

    await httpx_client.post(f"{api_base}/api/v1/credentials/{target_id}/test", headers=headers, json={}, timeout=15.0)
    return target_id, cred_name


async def _actualizar_workflow_llm_n8n(api_base: str, headers: dict, wf_id: str, agent_names: List[str], cred_id: str, cred_name: str, model_name: str) -> dict:
    r_get = await httpx_client.get(f"{api_base}/api/v1/workflows/{wf_id}", headers=headers, timeout=15.0)
    if r_get.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"No se pudo leer workflow {wf_id} en n8n ({r_get.status_code}).")

    wf = r_get.json()
    was_active = bool(wf.get("active"))
    nodes = wf.get("nodes") or []
    connections = wf.get("connections") or {}

    target_agent = None
    for a_name in agent_names:
        if any(n.get("name") == a_name for n in nodes):
            target_agent = a_name
            break
    if not target_agent:
        for n in nodes:
            if "langchain.agent" in (n.get("type") or ""):
                target_agent = n.get("name")
                break
    if not target_agent:
        raise HTTPException(status_code=500, detail=f"No se encontró el nodo AI Agent en workflow {wf_id}.")

    openai_node = None
    fallback_pos = [320, 272]
    for n in nodes:
        if n.get("type") == "@n8n/n8n-nodes-langchain.lmChatOpenAi":
            openai_node = n
            break
        if "lmChat" in (n.get("type") or "") and n.get("position"):
            fallback_pos = [n["position"][0] + 140, n["position"][1]]

    if not openai_node:
        openai_node = {
            "id": str(uuid.uuid4()),
            "name": "OpenAI Chat Model",
            "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
            "typeVersion": 1.3,
            "position": fallback_pos,
            "parameters": {},
            "credentials": {}
        }
        nodes.append(openai_node)

    openai_node["type"] = "@n8n/n8n-nodes-langchain.lmChatOpenAi"
    openai_node["typeVersion"] = 1.3
    openai_node["parameters"] = {
        "model": {
            "__rl": True,
            "mode": "id",
            "value": model_name
        },
        "responsesApiEnabled": False,
        "builtInTools": {},
        "options": {
            "temperature": 0,
            "maxRetries": 3
        }
    }
    openai_node["credentials"] = {
        "openAiApi": {
            "id": cred_id,
            "name": cred_name
        }
    }

    lm_node_name = openai_node["name"]
    for n in nodes:
        n_name = n.get("name")
        if n_name != lm_node_name and "lmChat" in (n.get("type") or ""):
            if n_name in connections and "ai_languageModel" in connections[n_name]:
                del connections[n_name]["ai_languageModel"]
                if not connections[n_name]:
                    del connections[n_name]

    connections[lm_node_name] = {
        "ai_languageModel": [[{"node": target_agent, "type": "ai_languageModel", "index": 0}]]
    }

    allowed_settings = wf.get("settings") or {}
    clean_settings = {k: v for k, v in allowed_settings.items() if k in ("executionOrder", "timezone", "saveManualExecutions", "callerPolicy", "errorWorkflow", "binaryMode")}
    update_payload = {
        "name": wf.get("name"),
        "nodes": nodes,
        "connections": connections,
        "settings": clean_settings
    }

    r_put = await httpx_client.put(f"{api_base}/api/v1/workflows/{wf_id}", headers=headers, json=update_payload, timeout=20.0)
    if r_put.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Error actualizando workflow {wf_id} en n8n ({r_put.status_code}): {r_put.text}")

    if was_active:
        r_pub = await httpx_client.post(f"{api_base}/api/v1/workflows/{wf_id}/publish", headers=headers, json={}, timeout=15.0)
        if r_pub.status_code >= 400:
            await httpx_client.post(f"{api_base}/api/v1/workflows/{wf_id}/activate", headers=headers, json={}, timeout=15.0)

    return {"id": wf_id, "name": wf.get("name"), "model": model_name, "active": was_active}


@app.get("/api/admin/ia-config")
async def obtener_config_ia(current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    async with pool.acquire() as conn:
        await _ensure_configuracion_ia_table(conn)
        row = await conn.fetchrow("SELECT TOP 1 provider, base_url, model, credential_id, n8n_api_base, n8n_api_key, updated_by, updated_at FROM configuracion_ia ORDER BY id DESC")
        api_base, api_key = await _obtener_n8n_conexion(conn)

    n8n_connected = False
    workflows_info = []
    detected_model = row["model"] if row else None
    detected_node_type = None
    has_openai_cred = bool(row and row["credential_id"])

    if api_key:
        headers = {"X-N8N-API-KEY": api_key}
        try:
            for wf_id in [N8N_STUDENT_WORKFLOW_ID, N8N_ADMIN_WORKFLOW_ID]:
                if not wf_id:
                    continue
                r = await httpx_client.get(f"{api_base}/api/v1/workflows/{wf_id}", headers=headers, timeout=10.0)
                if r.status_code == 200:
                    n8n_connected = True
                    info = _extraer_info_llm_workflow(r.json())
                    workflows_info.append(info)
                    if wf_id == N8N_STUDENT_WORKFLOW_ID and info.get("model"):
                        detected_model = info["model"]
                        detected_node_type = info.get("node_type")
                        if info.get("node_type") == "@n8n/n8n-nodes-langchain.lmChatOpenAi" and info.get("credential_id"):
                            has_openai_cred = True
        except Exception:
            pass

    return {
        "n8n_api_configured": bool(api_key),
        "n8n_api_base": api_base,
        "n8n_connected": n8n_connected,
        "provider": (row["provider"] if row else "deepseek"),
        "base_url": (row["base_url"] if row else "https://api.deepseek.com/v1"),
        "model": detected_model or "deepseek-flash",
        "node_type": detected_node_type,
        "has_api_key": has_openai_cred,
        "workflows": workflows_info,
        "updated_by": row["updated_by"] if row else None,
        "updated_at": row["updated_at"].strftime("%Y-%m-%d %H:%M") if row and row["updated_at"] else None
    }


@app.post("/api/admin/ia-config/models")
async def listar_modelos_ia(data: EsquemaModelosIA, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    if not data.api_key or not data.api_key.strip():
        raise HTTPException(status_code=400, detail="Ingresa la API Key del proveedor para consultar los modelos disponibles.")
    modelos = await _consultar_modelos_proveedor(data.base_url, data.api_key)
    return {"modelos": modelos}


@app.put("/api/admin/ia-config")
async def actualizar_config_ia(data: EsquemaConfigIA, current_user: dict = Depends(get_current_user)):
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    base_url = _normalizar_url_proveedor(data.base_url)
    model_name = (data.model or "").strip()
    if not model_name:
        raise HTTPException(status_code=400, detail="Debes indicar o seleccionar un modelo válido.")

    async with pool.acquire() as conn:
        await _ensure_configuracion_ia_table(conn)
        row = await conn.fetchrow("SELECT TOP 1 credential_id, base_url FROM configuracion_ia ORDER BY id DESC")
        saved_cred_id = row["credential_id"] if row else None
        prev_base_url = row["base_url"] if row else None
        api_base, n8n_key = await _obtener_n8n_conexion(conn, data.n8n_api_base, data.n8n_api_key)

    if not n8n_key:
        raise HTTPException(status_code=400, detail="Falta configurar la n8n API Key (N8N_API_KEY) en el servidor o en las opciones avanzadas.")

    n8n_headers = {"X-N8N-API-KEY": n8n_key}
    raw_api_key = (data.api_key or "").strip()

    if raw_api_key:
        await _consultar_modelos_proveedor(base_url, raw_api_key)
        cred_id, cred_name = await _upsert_credencial_openai_n8n(api_base, n8n_headers, raw_api_key, base_url, saved_cred_id)
    else:
        if not saved_cred_id:
            raise HTTPException(status_code=400, detail="Debes ingresar la API Key del proveedor la primera vez que configuras el módulo OpenAI.")
        if prev_base_url and prev_base_url.rstrip("/") != base_url:
            raise HTTPException(status_code=400, detail="Si cambias la URL del proveedor debes ingresar la API Key correspondiente.")
        cred_id = saved_cred_id
        cred_name = "IA Chatbot Dinámica"

    synced = []
    for wf_id, agents in [(N8N_STUDENT_WORKFLOW_ID, ["AI Agent1", "AI Agent"]), (N8N_ADMIN_WORKFLOW_ID, ["AI Agent", "AI Agent1"])]:
        if wf_id:
            res_wf = await _actualizar_workflow_llm_n8n(api_base, n8n_headers, wf_id, agents, cred_id, cred_name, model_name)
            synced.append(res_wf)

    async with pool.acquire() as conn:
        await _ensure_configuracion_ia_table(conn)
        existing_id = await conn.fetchval("SELECT TOP 1 id FROM configuracion_ia ORDER BY id DESC")
        n8n_base_save = (data.n8n_api_base or "").strip() or None
        n8n_key_save = (data.n8n_api_key or "").strip() or None
        if existing_id:
            await conn.execute(
                """
                UPDATE configuracion_ia
                SET provider = $1,
                    base_url = $2,
                    model = $3,
                    credential_id = $4,
                    n8n_api_base = COALESCE($5, n8n_api_base),
                    n8n_api_key = COALESCE($6, n8n_api_key),
                    updated_by = $7,
                    updated_at = GETDATE()
                WHERE id = $8
                """,
                data.provider.strip(),
                base_url,
                model_name,
                cred_id,
                n8n_base_save,
                n8n_key_save,
                current_user.get("email") or current_user.get("nombre") or "admin",
                existing_id
            )
        else:
            await conn.execute(
                """
                INSERT INTO configuracion_ia (provider, base_url, model, credential_id, n8n_api_base, n8n_api_key, updated_by, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, GETDATE())
                """,
                data.provider.strip(),
                base_url,
                model_name,
                cred_id,
                n8n_base_save,
                n8n_key_save,
                current_user.get("email") or current_user.get("nombre") or "admin"
            )

    return {
        "ok": True,
        "message": f"Configuración aplicada en n8n ({len(synced)} flujos actualizados con el modelo {model_name}).",
        "provider": data.provider.strip(),
        "base_url": base_url,
        "model": model_name,
        "workflows": synced
    }
