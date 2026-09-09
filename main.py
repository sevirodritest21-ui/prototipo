import os
import re
import json
from typing import List, Optional, Any, Dict
from datetime import datetime, date, time, timedelta
import httpx
import asyncpg
import redis.asyncio as aioredis
from redis.exceptions import RedisError
from fastapi import FastAPI, HTTPException, status, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, root_validator
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv("backend.env")

app = FastAPI(title="API de Reservas y Chatbot UCT (PostgreSQL + Redis)")

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
N8N_CANCELACION_WEBHOOK_URL = os.getenv("N8N_CANCELACION_WEBHOOK_URL")
N8N_CREACION_WEBHOOK_URL = os.getenv("N8N_CREACION_WEBHOOK_URL")
N8N_EDICION_WEBHOOK_URL = os.getenv("N8N_EDICION_WEBHOOK_URL")
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))


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
            await httpx_client.post(webhook_url, json=payload, timeout=5.0)
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
        await httpx_client.post(webhook_url, json=payload, timeout=5.0)
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
        await httpx_client.post(webhook_url, json=payload, timeout=5.0)
        print(f"📧 Notificación de edición enviada a n8n para reserva ID {payload['reserva_id']} (Email: {payload['email']})")
    except Exception as e:
        print(f"⚠️ Error notificando edición a n8n: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pool: Optional[asyncpg.Pool] = None
httpx_client: Optional[httpx.AsyncClient] = None
redis_client: Optional[aioredis.Redis] = None

BLOQUES_HORARIOS = [
    {"hora": "08:00", "rango": "08:00 - 09:00"},
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


@app.on_event("startup")
async def startup():
    global pool, httpx_client, redis_client
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
    try:
        r_client = aioredis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=1.5)
        await r_client.ping()
        redis_client = r_client
        print("✅ Conexión con Redis establecida exitosamente.")
    except Exception as e:
        redis_client = None
        print(f"⚠️ Redis no activo ({e}). Modo Fallback PostgreSQL.")

    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS cubiculos (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(20) NOT NULL UNIQUE,
                campus_id INT NOT NULL REFERENCES campus(id) ON DELETE CASCADE,
                estado VARCHAR(20) DEFAULT 'disponible'
            );
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
            INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado)
            SELECT id, nombre, rut, campus_id, fecha, hora, 'activa'
            FROM reservas r
            WHERE NOT EXISTS (
                SELECT 1 FROM historial_reservas h WHERE h.reserva_id = r.id AND h.estado = 'activa'
            );
        """)


@app.on_event("shutdown")
async def shutdown():
    global pool, httpx_client, redis_client
    if httpx_client:
        await httpx_client.aclose()
    if pool:
        await pool.close()
    if redis_client:
        await redis_client.close()


async def check_rate_limit(key_prefix: str, identifier: str, max_requests: int = 15, window_seconds: int = 60) -> bool:
    if not redis_client:
        return True
    try:
        key = f"rate_limit:{key_prefix}:{identifier}"
        requests = await redis_client.incr(key)
        if requests == 1:
            await redis_client.expire(key, window_seconds)
        return requests <= max_requests
    except Exception:
        return True


async def invalidar_caches_disponibilidad(campus_id: Optional[int] = None, fecha_str: Optional[str] = None):
    if not redis_client:
        return
    try:
        if campus_id and fecha_str:
            await redis_client.delete(
                f"disponibilidad:{campus_id}:{fecha_str}",
                f"dashboard:{campus_id}:{fecha_str}"
            )
        else:
            keys = await redis_client.keys("disponibilidad:*")
            d_keys = await redis_client.keys("dashboard:*")
            all_keys = keys + d_keys
            if all_keys:
                await redis_client.delete(*all_keys)
    except Exception as e:
        print(f"⚠️ Error invalidando caché: {e}")


# --- Esquemas Pydantic ---

class AcompananteBase(BaseModel):
    nombre: Optional[str] = "Acompañante"
    rut: Optional[str] = None

    @root_validator(pre=True)
    def force_string_acompanante(cls, values):
        if isinstance(values, dict):
            for field in ["nombre", "rut"]:
                if field in values and values[field] is not None:
                    values[field] = str(values[field])
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


class EsquemaEliminar(BaseModel):
    rut: Optional[str] = None
    sessionId: Optional[str] = None


class EsquemaConsulta(BaseModel):
    rut: Optional[str] = None
    sessionId: Optional[str] = None


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


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


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
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or not credentials.credentials:
        raise credentials_exception

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
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


# --- Endpoints de Autenticación ---

@app.post("/api/auth/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def registrar_usuario(data: CrearUsuarioRequest):
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
async def login(data: LoginRequest):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, hashed_password, nombre, rut, rol FROM usuarios WHERE email = $1",
            data.email
        )
    if not row or not verify_password(data.password, row["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": row["email"]})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UsuarioResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


# --- Endpoints de Gestión de Cubículos ---

@app.get("/api/cubiculos")
async def obtener_cubiculos(campus_id: Optional[int] = None):
    async with pool.acquire() as conn:
        if campus_id:
            filas = await conn.fetch(
                "SELECT id, codigo, campus_id, estado FROM cubiculos WHERE campus_id = $1 ORDER BY codigo ASC", campus_id
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

            total_reservas_historico = await conn.fetchval("SELECT COUNT(*) FROM reservas") or 0

            return {
                "horarios_pico": horarios_pico,
                "dias_demanda": dias_demanda,
                "demanda_sedes": demanda_sedes,
                "total_historico": total_reservas_historico,
                "tasa_cancelacion_estimada": "4.2%",
                "semana_pico_examenes": "Semana 16 (Junio / Noviembre)",
                "utilidad": "Ayuda a la administración de la biblioteca a optimizar la apertura de bloques o reacondicionar espacios."
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/resumen")
async def obtener_resumen_dashboard(campus_id: Optional[int] = None, fecha: Optional[str] = None, current_user: dict = Depends(get_current_user)):
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

            total_cub_bd = await conn.fetchval("SELECT COUNT(*) FROM cubiculos WHERE campus_id = $1", campus_id)
            if not total_cub_bd or total_cub_bd == 0:
                row_c = await conn.fetchrow("SELECT cubiculas_fisicos FROM campus WHERE id = $1", campus_id)
                total_cub_bd = row_c["cubiculas_fisicos"] if row_c else 10

            CUPOS_TOTALES_DIARIOS = len(BLOQUES_HORARIOS) * total_cub_bd

            if redis_client:
                cache_key = f"dashboard:{campus_id}:{target_fecha.strftime('%Y-%m-%d')}"
                cached_data = await redis_client.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)

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

            if redis_client:
                await redis_client.setex(f"dashboard:{campus_id}:{target_fecha.strftime('%Y-%m-%d')}", 300, json.dumps(respuesta))

            return respuesta
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/disponibilidad")
async def consultar_disponibilidad(campus_id: int, fecha: str):
    try:
        fecha_parsed = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
        fecha_str = fecha_parsed.strftime("%Y-%m-%d")

        if redis_client:
            cached_data = await redis_client.get(f"disponibilidad:{campus_id}:{fecha_str}")
            if cached_data:
                return json.loads(cached_data)

        async with pool.acquire() as conn:
            capacidad_campus = await conn.fetchval("SELECT COUNT(*) FROM cubiculos WHERE campus_id = $1", campus_id)
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

            resultado = []
            for bloque in BLOQUES_HORARIOS:
                hora_key = bloque["hora"]
                ocupados = ocupacion_map.get(hora_key, 0)
                disponibles = max(0, capacidad_campus - ocupados)
                resultado.append({
                    "hora": hora_key,
                    "rango": bloque["rango"],
                    "ocupados": ocupados,
                    "disponibles": disponibles,
                    "capacidad_total": capacidad_campus,
                    "agotado": disponibles == 0
                })

            respuesta = {
                "campus_id": campus_id,
                "fecha": fecha_str,
                "cubiculas_fisicos": capacidad_campus,
                "bloques": resultado
            }

        if redis_client:
            await redis_client.setex(f"disponibilidad:{campus_id}:{fecha_str}", 300, json.dumps(respuesta))

        return respuesta
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reservas", status_code=status.HTTP_201_CREATED, response_model=ReservaResponse)
async def crear_reserva(reserva: ReservaBase, request: Request, background_tasks: BackgroundTasks):
    rut_final = reserva.rut
    nombre_final = reserva.nombre

    if (not rut_final or "[" in str(rut_final)) and reserva.sessionId:
        async with pool.acquire() as conn:
            row_s = await conn.fetchrow("SELECT rut, nombre FROM sesiones WHERE session_id = $1", reserva.sessionId)
            if row_s:
                rut_final = row_s["rut"]
                if not nombre_final or nombre_final == "Usuario Chatbot":
                    nombre_final = row_s["nombre"]

    if not rut_final or not reserva.fecha or not reserva.hora:
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios (RUT, fecha u hora).")

    rut_limpio = str(rut_final).replace(".", "").upper().strip()
    if "[" in rut_limpio or "RUT_" in rut_limpio or len(rut_limpio) > 12:
        raise HTTPException(status_code=400, detail="El RUT proporcionado no es válido.")

    client_id = rut_limpio or reserva.sessionId or (request.client.host if request.client else "anon")
    if not await check_rate_limit("reserva", client_id, max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Límite de solicitudes alcanzado. Intenta de nuevo en un minuto.")

    try:
        fecha_parsed = datetime.strptime(reserva.fecha.strip(), "%Y-%m-%d").date()
        hora_parsed = datetime.strptime(reserva.hora.strip(), "%H:%M").time()

        if fecha_parsed.weekday() >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se permite agendar reservas los fines de semana (Sábado o Domingo). La fecha {reserva.fecha} corresponde a un día no hábil."
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

                # VERIFICACIÓN DE RESERVA ACTIVA (Máximo 1 reserva activa por usuario)
                reserva_activa = await conn.fetchrow(
                    """
                    SELECT r.id, r.fecha, r.hora, c.nombre AS campus_nombre, cb.codigo AS cubiculo_codigo
                    FROM reservas r
                    LEFT JOIN campus c ON r.campus_id = c.id
                    LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                    WHERE r.rut = $1
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

                # ASIGNACIÓN DINÁMICA DE CUBÍCULO FÍSICO LIBRE
                cubiculo_libre = await conn.fetchrow(
                    """
                    SELECT cb.id, cb.codigo 
                    FROM cubiculos cb
                    WHERE cb.campus_id = $1 
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
                    reserva_id_creada, nombre_final or "Usuario Chatbot", rut_limpio, target_campus_id, fecha_parsed, hora_parsed
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
    client_id = input_data.sessionId or current_user.get("rut") or (request.client.host if request.client else "anon")
    if not await check_rate_limit("chat", client_id, max_requests=15, window_seconds=60):
        raise HTTPException(status_code=429, detail="Límite de solicitudes alcanzado. Por favor espera un minuto.")

    try:
        rut_a_guardar = current_user.get("rut") or input_data.rut
        nombre_a_guardar = current_user.get("nombre") or input_data.nombre
        email_a_guardar = current_user.get("email") or input_data.email

        if rut_a_guardar:
            rut_a_guardar = rut_a_guardar.replace(".", "").upper().strip()

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

        payload = {"message": input_data.message}
        if input_data.sessionId:
            payload["sessionId"] = input_data.sessionId
        if rut_a_guardar:
            payload["rut"] = rut_a_guardar
        if nombre_a_guardar:
            payload["nombre"] = nombre_a_guardar
        if email_a_guardar:
            payload["email"] = email_a_guardar

        response = await httpx_client.post(N8N_WEBHOOK_URL, json=payload, timeout=30.0)
        if response.status_code != 200:
            try:
                err_data = response.json()
                err_detail = err_data.get("message") or err_data.get("detail") or err_data.get("output") or f"Error {response.status_code} desde el servicio n8n."
            except Exception:
                err_detail = f"Error {response.status_code} al comunicarse con n8n."
            raise HTTPException(status_code=response.status_code, detail=err_detail)

        data = response.json()
        bot_response = data.get("output", "Reserva procesada con éxito.")
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
async def eliminar_reserva(data: EsquemaEliminar, background_tasks: BackgroundTasks, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
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
            if not rut_consulta and data.sessionId:
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId)
                if row_sesion:
                    rut_consulta = row_sesion["rut"]

            if not rut_consulta:
                raise HTTPException(status_code=400, detail="RUT no especificado.")

            rut_limpio = str(rut_consulta).replace(".", "").upper().strip()

            # Obtener datos de la reserva antes de eliminar para notificar por email vía n8n
            reservas_a_eliminar = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, c.nombre AS campus_nombre, cb.codigo AS cubiculo_codigo, u.email
                FROM reservas r
                LEFT JOIN campus c ON r.campus_id = c.id
                LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                LEFT JOIN usuarios u ON (REPLACE(REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(UPPER($1), '.', ''), '-', ''), ' ', '') OR LOWER(u.nombre) = LOWER(r.nombre))
                WHERE r.rut = $1
                """,
                rut_limpio
            )
            filas_canceladas = [dict(f) for f in reservas_a_eliminar]

            async with conn.transaction():
                await conn.execute("DELETE FROM reserva_acompanantes WHERE reserva_id IN (SELECT id FROM reservas WHERE rut = $1)", rut_limpio)
                resultado = await conn.execute("DELETE FROM reservas WHERE rut = $1", rut_limpio)

            deleted_count = int(resultado.split(" ")[1])
            if deleted_count >= 1:
                await invalidar_caches_disponibilidad()
                background_tasks.add_task(notificar_cancelacion_n8n, filas_canceladas)
                return {"message": f"Reserva del RUT {rut_limpio} eliminada con éxito."}

        raise HTTPException(status_code=404, detail=f"No hay reservas asociadas al RUT {rut_limpio}.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/reservas/{reserva_id}")
async def eliminar_reserva_por_id(reserva_id: int, background_tasks: BackgroundTasks, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
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

        if current_user:
            if current_user.get("rol") != "admin" and current_user.get("rut") != res_detalle["rut"]:
                raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta reserva.")

        res_dict = [dict(res_detalle)]

        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado)
                VALUES ($1, $2, $3, $4, $5, $6, 'cancelada')
                """,
                res_detalle["id"], res_detalle["nombre"], res_detalle["rut"], res_detalle["campus_id"], res_detalle["fecha"], res_detalle["hora"]
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
    limite: int = 100
):
    async with pool.acquire() as conn:
        filas = await conn.fetch(
            """
            SELECT 
                r.id, r.id AS reserva_id, r.nombre, r.rut, r.fecha::text, r.hora::text,
                CASE 
                    WHEN (r.fecha < CURRENT_DATE) OR (r.fecha = CURRENT_DATE AND r.hora < CURRENT_TIME) THEN 'completada'
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
                    WHEN (h.fecha < CURRENT_DATE) OR (h.fecha = CURRENT_DATE AND h.hora::time < CURRENT_TIME) THEN 'completada'
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
            LIMIT $3
            """,
            campus_id, busqueda, limite
        )
        historial = [dict(f) for f in filas]
        for h in historial:
            if h.get("fecha"):
                h["fecha"] = str(h["fecha"])
            if h.get("fecha_registro"):
                h["fecha_registro"] = str(h["fecha_registro"])
        return historial


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

            if not rut_consulta and data.sessionId:
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId)
                if row_sesion:
                    rut_consulta = row_sesion["rut"]

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

            if current_user and current_user.get("rol") != "admin":
                if current_user.get("rut") and current_user.get("rut") != rut_reserva:
                    raise HTTPException(status_code=403, detail="No tienes permisos para modificar esta reserva.")

            nueva_fecha = datetime.strptime(data.fecha.strip(), "%Y-%m-%d").date() if data.fecha and data.fecha.strip() else res_existente["fecha"]
            nueva_hora = datetime.strptime(data.hora.strip(), "%H:%M").time() if data.hora and data.hora.strip() else res_existente["hora"]

            if nueva_fecha.weekday() >= 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se permite trasladar reservas a los fines de semana (Sábado o Domingo). La fecha {nueva_fecha.strftime('%Y-%m-%d')} corresponde a un día no hábil."
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

            cubiculo_libre = await conn.fetchrow(
                """
                SELECT cb.id, cb.codigo 
                FROM cubiculos cb
                WHERE cb.campus_id = $1 
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
async def consultar_reservas(data: EsquemaConsulta, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
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
            if not rut_consulta and data.sessionId:
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId)
                if row_sesion:
                    rut_consulta = row_sesion["rut"]

            if not rut_consulta or "[" in str(rut_consulta):
                raise HTTPException(status_code=400, detail="RUT no válido.")

            rut_limpio = str(rut_consulta).replace(".", "").upper().strip()

            reservas_usuario = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, c.nombre AS campus_nombre, r.campus_id, cb.codigo AS cubiculo_codigo
                FROM reservas r
                LEFT JOIN campus c ON r.campus_id = c.id
                LEFT JOIN cubiculos cb ON r.cubiculo_id = cb.id
                WHERE r.rut = $1 
                ORDER BY r.fecha ASC, r.hora ASC
                """,
                rut_limpio
            )

            if not reservas_usuario:
                raise HTTPException(status_code=404, detail=f"No hay reservas registradas para el RUT {rut_limpio}.")

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

                respuesta.append({
                    "id": str(r["id"]),
                    "nombre": r["nombre"],
                    "rut": r["rut"],
                    "fecha": r_fecha.strftime("%Y-%m-%d"),
                    "hora": r_hora.strftime("%H:%M"),
                    "campus_id": r["campus_id"],
                    "campus": r["campus_nombre"] or "Sin asignación",
                    "cubiculo_codigo": r["cubiculo_codigo"] or "Sin asignación",
                    "activa": es_activa,
                    "acompanantes": lista_ac
                })

            return {"success": True, "reservas": respuesta}

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