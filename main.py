import os
import re
from typing import List, Optional
from datetime import datetime, date, time
import httpx
import asyncpg
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

app = FastAPI(title="API de Reservas y Chatbot (PostgreSQL)")

# Carga de variables de entorno con respaldos por defecto
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/crear-reserva-chat")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgre@localhost:5432/reservas_db")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pool: Optional[asyncpg.Pool] = None

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
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL)


@app.on_event("shutdown")
async def shutdown():
    global pool
    if pool:
        await pool.close()


# --- Esquemas de Pydantic ---

class AcompananteBase(BaseModel):
    nombre: str
    rut: Optional[str] = None

class ReservaBase(BaseModel):
    nombre: str
    rut: str
    fecha: str
    hora: str
    campus_id: Optional[int] = None 
    campus: Optional[str] = None     
    sessionId: Optional[str] = None
    acompanantes: Optional[List[AcompananteBase]] = []

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

class EsquemaEliminar(BaseModel):
    rut: Optional[str] = None
    sessionId: Optional[str] = None

class EsquemaConsulta(BaseModel):
    rut: Optional[str] = None
    sessionId: Optional[str] = None


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


@app.get("/api/dashboard/resumen")
async def obtener_resumen_dashboard(campus_id: Optional[int] = None):
    try:
        fecha_hoy = date.today()
        CAPACIDAD_TOTAL_DIARIA = len(BLOQUES_HORARIOS) * CAPACIDAD_MAXIMA_POR_HORA

        async with pool.acquire() as conn:
            if not campus_id:
                first_campus = await conn.fetchrow("SELECT id FROM campus ORDER BY id ASC LIMIT 1")
                if not first_campus:
                    return {
                        "campus_id": 0,
                        "fecha": fecha_hoy.strftime("%Y-%m-%d"),
                        "ocupados": 0,
                        "disponibles": CAPACIDAD_TOTAL_DIARIA,
                        "capacidad_total": CAPACIDAD_TOTAL_DIARIA,
                        "porcentaje_ocupacion": 0.0
                    }
                campus_id = first_campus["id"]

            reservas_hoy = await conn.fetchval(
                """
                SELECT COUNT(*) 
                FROM reservas 
                WHERE campus_id = $1 AND fecha = $2
                """,
                campus_id, fecha_hoy
            )

            ocupados = reservas_hoy or 0
            disponibles = max(0, CAPACIDAD_TOTAL_DIARIA - ocupados)
            porcentaje = round((ocupados / CAPACIDAD_TOTAL_DIARIA) * 100, 1)

            return {
                "campus_id": campus_id,
                "fecha": fecha_hoy.strftime("%Y-%m-%d"),
                "ocupados": ocupados,
                "disponibles": disponibles,
                "capacidad_total": CAPACIDAD_TOTAL_DIARIA,
                "porcentaje_ocupacion": porcentaje
            }
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

        return {
            "campus_id": campus_id,
            "fecha": fecha_parsed.strftime("%Y-%m-%d"),
            "bloques": resultado
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar disponibilidad: {str(e)}"
        )


@app.post("/api/reservas", status_code=status.HTTP_201_CREATED, response_model=ReservaResponse)
async def crear_reserva(reserva: ReservaBase):
    print(">>> JSON RECIBIDO DE N8N:", reserva.dict())
    try:
        # 1. Normalización de RUT
        rut_limpio = reserva.rut.replace(".", "").upper().strip()

        # 2. Normalización de Fecha
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

        # 3. Normalización de Hora
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
                # 4. Resolución Robusta de Campus
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

                # 5. Validación de Capacidad Máxima (Límite 10 cubículos)
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

                # Insertar reserva principal en PostgreSQL
                row = await conn.fetchrow(
                    """
                    INSERT INTO reservas (nombre, rut, fecha, hora, campus_id, session_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, nombre, rut, fecha, hora, campus_id, session_id
                    """,
                    reserva.nombre, rut_limpio, fecha_parsed, hora_parsed, target_campus_id, reserva.sessionId
                )
                reserva_id_creada = row["id"]

                # Insertar acompañantes si fueron proporcionados
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
                            reserva_id_creada, ac.nombre, rut_ac_limpio
                        )
                        acompanantes_guardados.append({
                            "nombre": row_ac["nombre"],
                            "rut": row_ac["rut"]
                        })

                # Guardar o actualizar datos de la sesión
                if reserva.sessionId:
                    await conn.execute(
                        """
                        INSERT INTO sesiones (session_id, rut, nombre, updated_at)
                        VALUES ($1, $2, $3, NOW())
                        ON CONFLICT (session_id) 
                        DO UPDATE SET rut = EXCLUDED.rut, nombre = EXCLUDED.nombre, updated_at = NOW()
                        """,
                        reserva.sessionId, rut_limpio, reserva.nombre
                    )

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
async def hablar_con_bot(input_data: MessageInput):
    try:
        if input_data.sessionId and input_data.message:
            patron_rut = r'(\d{7,8}-[\dkK])'
            match = re.search(patron_rut, input_data.message)
            if match:
                rut_extraido = match.group(1).replace(".", "").upper().strip()
                async with pool.acquire() as conn:
                    await conn.execute(
                        """
                        INSERT INTO sesiones (session_id, rut, updated_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (session_id) 
                        DO UPDATE SET rut = EXCLUDED.rut, updated_at = NOW()
                        """,
                        input_data.sessionId, rut_extraido
                    )

        async with httpx.AsyncClient() as client:
            payload = {"message": input_data.message}
            if input_data.sessionId:
                payload["sessionId"] = input_data.sessionId
                
            response = await client.post(
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
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error de conexión con el flujo de n8n: {str(e)}"
        )


@app.delete("/api/reservas")
async def eliminar_reserva(data: EsquemaEliminar):
    try:
        rut_consulta = None
        
        async with pool.acquire() as conn:
            if data.rut and data.rut.strip():
                rut_consulta = data.rut.strip()
            elif data.sessionId:
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

            rut_limpio = rut_consulta.replace(".", "").upper().strip()
            resultado = await conn.execute("DELETE FROM reservas WHERE rut = $1", rut_limpio)
            
            deleted_count = int(resultado.split(" ")[1])
            if deleted_count >= 1:
                return {"message": f"Reserva asociada al RUT {rut_limpio} eliminada con éxito"}
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"No se encontró ninguna reserva asociada al RUT {rut_limpio}"
        )
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reservas/consultar")
async def consultar_reservas(data: EsquemaConsulta):
    try:
        texto_recibido = data.rut
        sessionId = data.sessionId
        rut_consulta = None

        async with pool.acquire() as conn:
            if texto_recibido and texto_recibido.strip():
                patron_rut = r'(\d{7,8}-[\dkK])'
                match = re.search(patron_rut, texto_recibido)
                if match:
                    rut_consulta = match.group(1).replace(".", "").upper().strip()
                else:
                    rut_consulta = texto_recibido.replace(".", "").upper().strip()
                
                if sessionId:
                    await conn.execute(
                        """
                        INSERT INTO sesiones (session_id, rut, updated_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (session_id) 
                        DO UPDATE SET rut = EXCLUDED.rut, updated_at = NOW()
                        """,
                        sessionId, rut_consulta
                    )
            elif sessionId:
                row_sesion = await conn.fetchrow("SELECT rut FROM sesiones WHERE session_id = $1", sessionId)
                if row_sesion:
                    rut_consulta = row_sesion["rut"]

            if not rut_consulta:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debe proporcionar un RUT o tener una sesión activa con RUT asociado."
                )

            reservas_usuario = await conn.fetch(
                """
                SELECT r.id, r.nombre, r.rut, r.fecha, r.hora, c.nombre AS campus_nombre, r.campus_id
                FROM reservas r
                LEFT JOIN campus c ON r.campus_id = c.id
                WHERE r.rut = $1 
                ORDER BY r.fecha ASC, r.hora ASC
                """, 
                rut_consulta
            )

            if not reservas_usuario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No se encontraron reservas para el RUT {rut_consulta}"
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
        raise HTTPException(status_code=500, detail=str(e))