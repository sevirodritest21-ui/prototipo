import os
import re
import json
from typing import List, Optional, Any, Dict
from datetime import datetime, date, time, timedelta
import httpx
import asyncpg
import redis.asyncio as aioredis
from redis.exceptions import RedisError
from fastapi import FastAPI, HTTPException, status, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, root_validator
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

# Cargar variables de entorno desde backend.env
load_dotenv("backend.env")

app = FastAPI(title="API de Reservas y Chatbot (PostgreSQL + Redis)")

# Carga de variables de entorno
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

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

# Configuración de Bloques Horarios y Límite de Capacidad
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
CAPACIDAD_MAXIMA_POR_HORA = 10


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
        print("✅ Conexión con Redis establecida exitosamente para Caching y Rate Limiting.")
    except Exception as e:
        redis_client = None
        print(f"⚠️ Redis no está activo ({e}). Ejecutando en modo Fallback directo a PostgreSQL.")

    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_reservas_campus_fecha_hora 
            ON reservas (campus_id, fecha, hora);
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


# --- Funciones de Apoyo para Redis ---

async def check_rate_limit(key_prefix: str, identifier: str, max_requests: int = 15, window_seconds: int = 60) -> bool:
    if not redis_client:
        return True
    try:
        key = f"rate_limit:{key_prefix}:{identifier}"
        requests = await redis_client.incr(key)
        if requests == 1:
            await redis_client.expire(key, window_seconds)
        return requests <= max_requests
    except Exception as e:
        print(f"⚠️ Fallback Rate Limit (Redis Error): {e}")
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
        print(f"⚠️ Error al invalidar caché en Redis: {e}")


# --- Esquemas de Pydantic ---

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

        if "acompanantes[0]" in values and not values.get("acompanantes"):
            ac_raw = values["acompanantes[0]"]
            if isinstance(ac_raw, dict):
                values["acompanantes"] = [
                    {
                        "nombre": str(ac_raw.get("nombre", "Acompañante")),
                        "rut": str(ac_raw.get("rut", "")) if ac_raw.get("rut") else None
                    }
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


# --- Esquemas de Autenticación ---

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

class CrearCampusRequest(BaseModel):
    nombre: str

class CrearUsuarioRequest(BaseModel):
    email: str
    password: str
    nombre: str
    rut: Optional[str] = None
    rol: str = "estudiante"


# --- Lógica de Seguridad JWT ---

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
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, nombre, rut, rol FROM usuarios WHERE email = $1", email
        )
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


# --- Endpoints de la API ---

@app.get("/api/campus")
async def obtener_campus():
    try:
        async with pool.acquire() as conn:
            filas = await conn.fetch("SELECT id, nombre FROM campus ORDER BY id ASC")
            return [{"id": f["id"], "nombre": f["nombre"]} for f in filas]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener la lista de campus: {str(e)}"
        )


@app.post("/api/campus", status_code=status.HTTP_201_CREATED)
async def crear_campus(
    data: CrearCampusRequest, 
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los usuarios con rol Administrador pueden crear sedes o campus."
        )

    nombre_limpio = data.nombre.strip()
    if not nombre_limpio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre del campus no puede estar vacío."
        )

    async with pool.acquire() as conn:
        row_exist = await conn.fetchrow(
            "SELECT id FROM campus WHERE LOWER(nombre) = LOWER($1)", 
            nombre_limpio
        )
        if row_exist:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una sede o campus registrada con el nombre '{nombre_limpio}'."
            )

        row = await conn.fetchrow(
            "INSERT INTO campus (nombre) VALUES ($1) RETURNING id, nombre",
            nombre_limpio
        )
    
    await invalidar_caches_disponibilidad()
    return {"id": row["id"], "nombre": row["nombre"]}


@app.delete("/api/campus/{campus_id}")
async def eliminar_campus_por_id(
    campus_id: int, 
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los usuarios con rol Administrador pueden eliminar sedes o campus."
        )

    async with pool.acquire() as conn:
        async with conn.transaction():
            row_c = await conn.fetchrow("SELECT nombre FROM campus WHERE id = $1", campus_id)
            if not row_c:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No se encontró ninguna sede o campus con el ID {campus_id}."
                )

            nombre_campus = row_c["nombre"]

            await conn.execute(
                """
                DELETE FROM reserva_acompanantes 
                WHERE reserva_id IN (SELECT id FROM reservas WHERE campus_id = $1)
                """,
                campus_id
            )
            await conn.execute("DELETE FROM reservas WHERE campus_id = $1", campus_id)
            await conn.execute("DELETE FROM campus WHERE id = $1", campus_id)

    await invalidar_caches_disponibilidad()
    return {"message": f"El campus '{nombre_campus}' y todas sus reservas registradas fueron eliminados con éxito."}


@app.get("/api/dashboard/resumen")
async def obtener_resumen_dashboard(
    campus_id: Optional[int] = None,
    fecha: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        if fecha and fecha.strip():
            try:
                target_fecha = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
            except ValueError:
                target_fecha = date.today()
        else:
            target_fecha = date.today()

        CUBICULOS_FISICOS = CAPACIDAD_MAXIMA_POR_HORA
        CUPOS_TOTALES_DIARIOS = len(BLOQUES_HORARIOS) * CUBICULOS_FISICOS

        if redis_client and campus_id:
            cache_key = f"dashboard:{campus_id}:{target_fecha.strftime('%Y-%m-%d')}"
            try:
                cached_data = await redis_client.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception:
                pass

        async with pool.acquire() as conn:
            if not campus_id:
                first_campus = await conn.fetchrow("SELECT id FROM campus ORDER BY id ASC LIMIT 1")
                if not first_campus:
                    return {
                        "campus_id": 0,
                        "fecha": target_fecha.strftime("%Y-%m-%d"),
                        "cubiculas_fisicos": CUBICULOS_FISICOS,
                        "total_reservas_dia": 0,
                        "cupos_disponibles_dia": CUPOS_TOTALES_DIARIOS,
                        "cupos_totales_diarios": CUPOS_TOTALES_DIARIOS,
                        "porcentaje_ocupacion": 0.0,
                        "bloques": []
                    }
                campus_id = first_campus["id"]

            reservas_dia = await conn.fetchval(
                """
                SELECT COUNT(*) 
                FROM reservas 
                WHERE campus_id = $1 AND fecha = $2
                """,
                campus_id, target_fecha
            )

            total_reservas = reservas_dia or 0
            cupos_disponibles = max(0, CUPOS_TOTALES_DIARIOS - total_reservas)
            porcentaje = round((total_reservas / CUPOS_TOTALES_DIARIOS) * 100, 1)

            filas_bloques = await conn.fetch(
                """
                SELECT TO_CHAR(hora, 'HH24:MI') as hora_str, COUNT(*) as ocupados
                FROM reservas
                WHERE campus_id = $1 AND fecha = $2
                GROUP BY hora
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
                    "disponibles": max(0, CUBICULOS_FISICOS - b_ocu)
                })

            respuesta_resumen = {
                "campus_id": campus_id,
                "fecha": target_fecha.strftime("%Y-%m-%d"),
                "cubiculas_fisicos": CUBICULOS_FISICOS,
                "total_reservas_dia": total_reservas,
                "cupos_disponibles_dia": cupos_disponibles,
                "cupos_totales_diarios": CUPOS_TOTALES_DIARIOS,
                "porcentaje_ocupacion": porcentaje,
                "bloques": desglose_bloques
            }

            if redis_client:
                cache_key = f"dashboard:{campus_id}:{target_fecha.strftime('%Y-%m-%d')}"
                try:
                    await redis_client.setex(cache_key, 300, json.dumps(respuesta_resumen))
                except Exception:
                    pass

            return respuesta_resumen

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener métricas del dashboard: {str(e)}"
        )


@app.get("/api/disponibilidad")
async def consultar_disponibilidad(campus_id: int, fecha: str):
    try:
        try:
            fecha_parsed = datetime.strptime(fecha.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de fecha inválido. Usa YYYY-MM-DD."
            )

        fecha_str = fecha_parsed.strftime("%Y-%m-%d")
        cache_key = f"disponibilidad:{campus_id}:{fecha_str}"

        if redis_client:
            try:
                cached_data = await redis_client.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception:
                pass

        async with pool.acquire() as conn:
            filas = await conn.fetch(
                """
                SELECT TO_CHAR(hora, 'HH24:MI') as hora_str, COUNT(*) as ocupados
                FROM reservas
                WHERE campus_id = $1 AND fecha = $2
                GROUP BY hora
                """,
                campus_id, fecha_parsed
            )

            ocupacion_map = {f["hora_str"]: f["ocupados"] for f in filas}

        resultado = []
        for bloque in BLOQUES_HORARIOS:
            hora_key = bloque["hora"]
            ocupados = ocupacion_map.get(hora_key, 0)
            disponibles = max(0, CAPACIDAD_MAXIMA_POR_HORA - ocupados)

            resultado.append({
                "hora": hora_key,
                "rango": bloque["rango"],
                "ocupados": ocupados,
                "disponibles": disponibles,
                "agotado": disponibles == 0
            })

        respuesta_disponibilidad = {
            "campus_id": campus_id,
            "fecha": fecha_str,
            "bloques": resultado
        }

        if redis_client:
            try:
                await redis_client.setex(cache_key, 300, json.dumps(respuesta_disponibilidad))
            except Exception:
                pass

        return respuesta_disponibilidad

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar disponibilidad: {str(e)}"
        )


@app.post("/api/reservas", status_code=status.HTTP_201_CREATED, response_model=ReservaResponse)
async def crear_reserva(
    reserva: ReservaBase, 
    request: Request
):
    # 1. Recuperar RUT y Nombre enviados desde n8n/Pydantic
    rut_final = reserva.rut
    nombre_final = reserva.nombre

    # Si no vienen en la reserva, intentar rescatarlos de la sesión activa
    if (not rut_final or "[" in str(rut_final)) and reserva.sessionId:
        async with pool.acquire() as conn:
            row_s = await conn.fetchrow("SELECT rut, nombre FROM sesiones WHERE session_id = $1", reserva.sessionId)
            if row_s:
                rut_final = row_s["rut"]
                if not nombre_final or nombre_final == "Usuario Chatbot":
                    nombre_final = row_s["nombre"]

    if not rut_final or not reserva.fecha or not reserva.hora:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faltan datos obligatorios para crear la reserva (RUT, fecha u hora)."
        )

    # Validar RUT para descartar etiquetas basura
    rut_limpio = str(rut_final).replace(".", "").upper().strip()
    if "[" in rut_limpio or "RUT_" in rut_limpio or len(rut_limpio) > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha proporcionado un RUT válido."
        )

    # ... RESTO DEL CÓDIGO DEL ENDPOINT PERMANECE IGUAL ...

    # Limpiar y Validar RUT para descartar etiquetas basura ([RUT_DEL_USUARIO_AUTENTICADO])
    rut_limpio = str(rut_final).replace(".", "").upper().strip()
    if "[" in rut_limpio or "RUT_" in rut_limpio or len(rut_limpio) > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha proporcionado un RUT válido."
        )

    client_id = rut_limpio or reserva.sessionId or (request.client.host if request.client else "anon")
    if not await check_rate_limit("reserva", client_id, max_requests=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Has alcanzado el límite de intentos de reserva por minuto. Por favor intenta nuevamente en breve."
        )

    try:
        # Normalización de Fecha
        fecha_original = reserva.fecha.strip()
        fecha_parsed = None
        formatos_fecha = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]
        for fmt in formatos_fecha:
            try:
                fecha_parsed = datetime.strptime(fecha_original, fmt).date()
                break
            except ValueError:
                continue

        if not fecha_parsed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato de fecha inválido: '{fecha_original}'. Usa YYYY-MM-DD o DD/MM/YYYY."
            )

        # Normalización de Hora
        hora_original = reserva.hora.strip()
        hora_parsed = None
        formatos_hora = ["%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"]
        for fmt in formatos_hora:
            try:
                hora_parsed = datetime.strptime(hora_original, fmt).time()
                break
            except ValueError:
                continue

        if not hora_parsed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato de hora inválido: '{hora_original}'. Usa HH:MM."
            )

        async with pool.acquire() as conn:
            async with conn.transaction():
                # Resolución Robusta de Campus
                target_campus_id = None
                target_campus_nombre = None

                if not reserva.campus_id and reserva.campus and reserva.campus.strip().isdigit():
                    reserva.campus_id = int(reserva.campus.strip())

                if reserva.campus_id:
                    row_c = await conn.fetchrow("SELECT id, nombre FROM campus WHERE id = $1", reserva.campus_id)
                    if row_c:
                        target_campus_id = row_c["id"]
                        target_campus_nombre = row_c["nombre"]

                if not target_campus_id and reserva.campus:
                    nombre_clean = reserva.campus.strip().lower()
                    nombre_sin_prefijo = re.sub(r'^campus\s+', '', nombre_clean, flags=re.IGNORECASE).strip()

                    row_c = await conn.fetchrow(
                        """
                        SELECT id, nombre FROM campus 
                        WHERE LOWER(nombre) = $1 
                           OR LOWER(nombre) LIKE $2
                        LIMIT 1
                        """,
                        nombre_clean, f"%{nombre_sin_prefijo}%"
                    )
                    if row_c:
                        target_campus_id = row_c["id"]
                        target_campus_nombre = row_c["nombre"]

                if not target_campus_id:
                    filas_c = await conn.fetch("SELECT nombre FROM campus ORDER BY id ASC")
                    campus_disponibles = [f["nombre"] for f in filas_c]
                    nombres_formateados = ", ".join(campus_disponibles)
                    campus_recibido = reserva.campus or reserva.campus_id or "desconocido"

                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El campus '{campus_recibido}' no coincide con ninguna sede registrada. Campus disponibles: {nombres_formateados}."
                    )

                # Bloqueo Pesimista
                await conn.fetchrow("SELECT id FROM campus WHERE id = $1 FOR UPDATE", target_campus_id)

                # Validación de Capacidad
                total_reservas = await conn.fetchval(
                    """
                    SELECT COUNT(*) 
                    FROM reservas 
                    WHERE campus_id = $1 AND fecha = $2 AND hora = $3
                    """,
                    target_campus_id, fecha_parsed, hora_parsed
                )

                if total_reservas >= CAPACIDAD_MAXIMA_POR_HORA:
                    hora_str = hora_parsed.strftime("%H:%M")
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"El bloque de las {hora_str} hrs en {target_campus_nombre} ya alcanzó su capacidad máxima de {CAPACIDAD_MAXIMA_POR_HORA} cubículos."
                    )

                # Guardar reserva asociada estrictamente al usuario logueado
                row = await conn.fetchrow(
                    """
                    INSERT INTO reservas (nombre, rut, fecha, hora, campus_id, session_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, nombre, rut, fecha, hora, campus_id, session_id
                    """,
                    nombre_final or "Usuario Chatbot", rut_limpio, fecha_parsed, hora_parsed, target_campus_id, reserva.sessionId
                )
                reserva_id_creada = row["id"]

                # Acompañantes
                acompanantes_guardados = []
                if reserva.acompanantes:
                    for ac in reserva.acompanantes:
                        rut_ac_limpio = ac.rut.replace(".", "").upper().strip() if ac.rut else ""
                        row_ac = await conn.fetchrow(
                            """
                            INSERT INTO reserva_acompanantes (reserva_id, nombre, rut)
                            VALUES ($1, $2, $3)
                            RETURNING nombre, rut
                            """,
                            reserva_id_creada, ac.nombre or "Acompañante", rut_ac_limpio
                        )
                        acompanantes_guardados.append({
                            "nombre": row_ac["nombre"],
                            "rut": row_ac["rut"]
                        })

                # Actualizar la sesión con el RUT real autenticado
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

        return {
            "id": str(row["id"]),
            "nombre": row["nombre"],
            "rut": row["rut"],
            "fecha": row["fecha"].strftime("%Y-%m-%d"),
            "hora": row["hora"].strftime("%H:%M"),
            "campus_id": target_campus_id,
            "campus": target_campus_nombre,
            "sessionId": row["session_id"],
            "acompanantes": acompanantes_guardados
        }

    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una reserva previa para el RUT {rut_limpio} en ese mismo campus, fecha y hora."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar en PostgreSQL: {str(e)}"
        )


@app.post("/api/chat")
async def hablar_con_bot(
    input_data: MessageInput, 
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    client_id = input_data.sessionId or current_user.get("rut") or (request.client.host if request.client else "anon")
    if not await check_rate_limit("chat", client_id, max_requests=15, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Has realizado demasiadas consultas al chatbot en poco tiempo. Por favor espera 1 minuto."
        )

    try:
        # Prioridad absoluta al usuario en sesión
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
            
        response = await httpx_client.post(
            N8N_WEBHOOK_URL,
            json=payload,
            timeout=30.0
        )
            
        if response.status_code != 200:
            raise HTTPException(
                status_code=500, 
                detail="n8n no respondió correctamente al mensaje."
            )
            
        data = response.json()
        bot_response = data.get("output", "Reserva procesada con éxito.")
        return {"response": bot_response}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error de conexión con el flujo de n8n: {str(e)}"
        )


@app.delete("/api/reservas")
async def eliminar_reserva(
    data: EsquemaEliminar,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
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
                row_sesion = await conn.fetchrow(
                    "SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId
                )
                if row_sesion:
                    rut_consulta = row_sesion["rut"]

            if not rut_consulta:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debe proporcionar un RUT o tener una sesión activa con RUT asociado."
                )

            rut_limpio = str(rut_consulta).replace(".", "").upper().strip()
            
            async with conn.transaction():
                # 1. Eliminar acompañantes vinculados primero
                await conn.execute(
                    """
                    DELETE FROM reserva_acompanantes 
                    WHERE reserva_id IN (SELECT id FROM reservas WHERE rut = $1)
                    """, 
                    rut_limpio
                )
                # 2. Eliminar la reserva principal
                resultado = await conn.execute("DELETE FROM reservas WHERE rut = $1", rut_limpio)
            
            deleted_count = int(resultado.split(" ")[1])
            if deleted_count >= 1:
                await invalidar_caches_disponibilidad()
                return {"message": f"Reserva asociada al RUT {rut_limpio} eliminada con éxito"}
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"No se encontró ninguna reserva asociada al RUT {rut_limpio}"
        )
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al eliminar la reserva: {str(e)}"
        )

@app.post("/api/reservas/consultar")
async def consultar_reservas(
    data: EsquemaConsulta,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
):
    try:
        rut_consulta = data.rut
        current_user = None

        # 1. Verificar si viene un Token JWT válido
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

        # Si el Token JWT es válido y tiene RUT, se le da prioridad
        if current_user and current_user.get("rut"):
            rut_consulta = current_user.get("rut")

        async with pool.acquire() as conn:
            # 2. Si no hay RUT explícito en el JSON ni en el token, buscar en la tabla 'sesiones'
            if not rut_consulta and data.sessionId:
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", data.sessionId)
                if row_sesion:
                    rut_consulta = row_sesion["rut"]

            if not rut_consulta or "[" in str(rut_consulta):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debe proporcionar un RUT válido o tener una sesión activa con RUT asociado."
                )

            rut_limpio = str(rut_consulta).replace(".", "").upper().strip()

            # 3. Buscar las reservas asociadas en PostgreSQL
            reservas_usuario = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, c.nombre AS campus_nombre, r.campus_id
                FROM reservas r
                LEFT JOIN campus c ON r.campus_id = c.id
                WHERE r.rut = $1 
                ORDER BY r.fecha ASC, r.hora ASC
                """, 
                rut_limpio
            )

            if not reservas_usuario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No se encontraron reservas registradas para el RUT {rut_limpio}."
                )

            respuesta = []
            for r in reservas_usuario:
                filas_ac = await conn.fetch(
                    "SELECT nombre, rut FROM reserva_acompanantes WHERE reserva_id = $1",
                    r["id"]
                )
                lista_ac = [{"nombre": ac["nombre"], "rut": ac["rut"]} for ac in filas_ac]

                respuesta.append({
                    "id": str(r["id"]),
                    "nombre": r["nombre"],
                    "rut": r["rut"],
                    "fecha": r["fecha"].strftime("%Y-%m-%d"),
                    "hora": r["hora"].strftime("%H:%M"),
                    "campus_id": r["campus_id"],
                    "campus": r["campus_nombre"] or "Sin asignación",
                    "acompanantes": lista_ac
                })

            return {"success": True, "reservas": respuesta}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error interno al consultar reservas: {str(e)}"
        )