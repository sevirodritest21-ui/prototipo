import os
from typing import List
import httpx
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime 
import re

app = FastAPI(title="API de Reservas y Chatbot")

N8N_WEBHOOK_URL = "http://localhost:5678/webhook/crear-reserva-chat"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = "mongodb://localhost:27017"
client_db = AsyncIOMotorClient(MONGO_URI)
db = client_db["reservas"]
coleccion = db["reserva"]
sesiones = db["sesiones"]


class ReservaBase(BaseModel):
    nombre: str
    rut: str
    fecha: str
    sessionId: str = None

class ReservaResponse(ReservaBase):
    id: str

class MessageInput(BaseModel):
    message: str
    sessionId: str = None


@app.post("/api/reservas", status_code=status.HTTP_201_CREATED, response_model=ReservaResponse)
async def crear_reserva(reserva: ReservaBase):
    try:
        nueva_reserva = reserva.model_dump()
        fecha_original = reserva.fecha.strip()
        fecha_estandar = None
        formatos_a_probar = [
            "%Y-%m-%d",  
            "%d/%m/%Y",  
            "%d-%m-%Y", 
        ]

        for formato in formatos_a_probar:
            try:
                objeto_fecha = datetime.strptime(fecha_original, formato)
                fecha_estandar = objeto_fecha.strftime("%Y-%m-%d")
                break 
            except ValueError:
                continue

        if fecha_estandar:
            nueva_reserva["fecha"] = fecha_estandar
        else:
            print(f"No se pudo formatear la fecha: '{fecha_original}'. Se guardará como texto original.")

        resultado = await coleccion.insert_one(nueva_reserva)
        reserva_creada = await coleccion.find_one({"_id": resultado.inserted_id})

        # Guardar en la colección de sesiones si se proporciona un sessionId
        if reserva.sessionId:
            rut_limpio = reserva.rut.replace(".", "").upper().strip()
            await sesiones.update_one(
                {"sessionId": reserva.sessionId},
                {
                    "$set": {
                        "rut": rut_limpio,
                        "nombre": reserva.nombre,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            print(f"Sesión guardada desde formulario para {reserva.sessionId}: RUT {rut_limpio}")
        
        return {
            "id": str(reserva_creada["_id"]),
            "nombre": reserva_creada["nombre"],
            "rut": reserva_creada["rut"],
            "fecha": reserva_creada["fecha"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar en MongoDB: {str(e)}"
        )


@app.post("/api/chat")
async def hablar_con_bot(input_data: MessageInput):
    try:
        # Intentar extraer RUT del mensaje del chat y asociarlo al sessionId
        if input_data.sessionId and input_data.message:
            patron_rut = r'(\d{7,8}-[\dkK])'
            match = re.search(patron_rut, input_data.message)
            if match:
                rut_extraido = match.group(1).replace(".", "").upper().strip()
                await sesiones.update_one(
                    {"sessionId": input_data.sessionId},
                    {
                        "$set": {
                            "rut": rut_extraido,
                            "updated_at": datetime.utcnow()
                        }
                    },
                    upsert=True
                )
                print(f"RUT extraído del chat y guardado para {input_data.sessionId}: {rut_extraido}")

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



class EsquemaEliminar(BaseModel):
    rut: str = None
    sessionId: str = None

@app.delete("/api/reservas")
async def eliminar_reserva(data: EsquemaEliminar):
    try:
        rut_consulta = None
        if data.rut and data.rut.strip():
            rut_consulta = data.rut.strip()
        elif data.sessionId:
            registro_sesion = await sesiones.find_one({"sessionId": data.sessionId})
            if registro_sesion and "rut" in registro_sesion:
                rut_consulta = registro_sesion["rut"]
                print(f"RUT recuperado de sesión para eliminar: {rut_consulta}")

        if not rut_consulta:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe proporcionar un RUT o tener una sesión activa con RUT asociado."
            )

        rut_limpio = rut_consulta.replace(".", "").upper().strip()
        resultado = await coleccion.delete_one({"rut": rut_limpio})
        
        if resultado.deleted_count == 1:
            return {"message": f"Reserva asociada al RUT {rut_limpio} eliminada con éxito"}
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"No se encontró ninguna reserva con el RUT {rut_limpio}"
        )
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Error interno real: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

class EsquemaConsulta(BaseModel):
    rut: str = None
    sessionId: str = None

@app.post("/api/reservas/consultar")
async def consultar_reservas(data: EsquemaConsulta):
    try:
        texto_recibido = data.rut
        sessionId = data.sessionId

        rut_consulta = None
        if texto_recibido and texto_recibido.strip():
            # Si se proporciona RUT directamente, lo usamos
            patron_rut = r'(\d{7,8}-[\dkK])'
            match = re.search(patron_rut, texto_recibido)
            if match:
                rut_consulta = match.group(1).replace(".", "").upper().strip()
            else:
                rut_consulta = texto_recibido.replace(".", "").upper().strip()
            
            # Si además hay sessionId, actualizamos la sesión con este RUT
            if sessionId:
                await sesiones.update_one(
                    {"sessionId": sessionId},
                    {
                        "$set": {
                            "rut": rut_consulta,
                            "updated_at": datetime.utcnow()
                        }
                    },
                    upsert=True
                )
        elif sessionId:
            # Si no hay RUT directo pero sí sessionId, buscamos el RUT en la sesión
            registro_sesion = await sesiones.find_one({"sessionId": sessionId})
            if registro_sesion and "rut" in registro_sesion:
                rut_consulta = registro_sesion["rut"]
                print(f"RUT recuperado de sesión para consulta: {rut_consulta}")

        if not rut_consulta:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe proporcionar un RUT o tener una sesión activa con RUT asociado."
            )

        print("================================")
        print("RUT A CONSULTAR:", repr(rut_consulta))
        print("================================")

        reservas_usuario = await coleccion.find(
            {"rut": rut_consulta}
        ).to_list(length=100)

        if not reservas_usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontraron reservas para el RUT {rut_consulta}"
            )

        respuesta = []

        for r in reservas_usuario:
            respuesta.append({
                "id": str(r["_id"]),
                "nombre": r["nombre"],
                "rut": r["rut"],
                "fecha": r["fecha"]
            })

        return {
            "success": True,
            "reservas": respuesta
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )