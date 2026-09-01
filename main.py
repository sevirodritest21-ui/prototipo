import os
import re
from typing import List, Optional
from datetime import datetime, date, time
import httpx
import asyncpg
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="API de Reservas y Chatbot (PostgreSQL)")

N8N_WEBHOOK_URL = "http://localhost:5678/webhook/crear-reserva-chat"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "postgresql://postgres:postgre@localhost:5432/reservas_db"

pool: Optional[asyncpg.Pool] = None


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

class ReservaBase(BaseModel):
    nombre: str
    rut: str
    fecha: str
    hora: str
    campus_id: Optional[int] = None  # Para solicitudes desde el formulario React
    campus: Optional[str] = None     # Para solicitudes desde el Chatbot (ej: "Campus A")
    sessionId: Optional[str] = None

class ReservaResponse(BaseModel):
    id: str
    nombre: str
    rut: str
    fecha: str
    hora: str
    campus_id: int
    campus: str
    sessionId: Optional[str] = None

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
    """
    Endpoint utilizado tanto por el formulario web (para poblar el select)
    como por el AI Agent de n8n para consultar dinámicamente qué campus existen.
    """
    try:
        async with pool.acquire() as conn:
            filas = await conn.fetch("SELECT id, nombre FROM campus ORDER BY id ASC")
            return [{"id": f["id"], "nombre": f["nombre"]} for f in filas]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener la lista de campus: {str(e)}"
        )


@app.post("/api/reservas", status_code=status.HTTP_201_CREATED, response_model=ReservaResponse)
async def crear_reserva(reserva: ReservaBase):
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
            target_campus_id = None
            target_campus_nombre = None

            if reserva.campus_id:
                row_c = await conn.fetchrow("SELECT id, nombre FROM campus WHERE id = $1", reserva.campus_id)
                if row_c:
                    target_campus_id = row_c["id"]
                    target_campus_nombre = row_c["nombre"]
            elif reserva.campus:
                nombre_clean = reserva.campus.strip()
                row_c = await conn.fetchrow("SELECT id, nombre FROM campus WHERE LOWER(nombre) = LOWER($1)", nombre_clean)
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
                    detail=f"El campus '{campus_recibido}' no es válido. Los campus disponibles para reservar son: {nombres_formateados}."
                )

            # Insertar reserva en PostgreSQL
            row = await conn.fetchrow(
                """
                INSERT INTO reservas (nombre, rut, fecha, hora, campus_id, session_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, nombre, rut, fecha, hora, campus_id, session_id
                """,
                reserva.nombre, rut_limpio, fecha_parsed, hora_parsed, target_campus_id, reserva.sessionId
            )

            # Guardar o actualizar datos de la sesión si viene un sessionId
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
            "sessionId": row["session_id"]
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

            # Consulta con JOIN para obtener el nombre legible del campus
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
                respuesta.append({
                    "id": str(r["id"]),
                    "nombre": r["nombre"],
                    "rut": r["rut"],
                    "fecha": r["fecha"].strftime("%Y-%m-%d"),
                    "hora": r["hora"].strftime("%H:%M"),
                    "campus_id": r["campus_id"],
                    "campus": r["campus_nombre"] or "Sin asignación"
                })

            return {"success": True, "reservas": respuesta}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))