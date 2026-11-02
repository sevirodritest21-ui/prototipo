import asyncio
import os
import sys
from datetime import date, time

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
import sqlserver_adapter as asyncpg

ESTUDIANTES = [
    ("Valentina Paz Morales Soto", "19.821.432-1", "Derecho"),
    ("Cristóbal Ignacio Benítez Ramos", "20.145.892-3", "Derecho"),
    ("Camila Andrea Navarro Silva", "18.992.341-K", "Derecho"),
    ("Matías Alejandro Fuentes Pérez", "21.034.789-5", "Derecho"),
    ("Florencia Sofía Valenzuela Castro", "19.554.218-7", "Derecho"),
    ("Sebastián Alonso Riquelme Díaz", "20.671.324-9", "Derecho"),
    ("Isidora Constanza Toledo Muñoz", "18.776.432-0", "Derecho"),
    ("Felipe Andrés Carrasco Vergara", "20.453.811-2", "Derecho"),
    ("Catalina Ignacia San Martín Jara", "19.123.654-8", "Derecho"),
    ("Joaquín Eduardo Vera Quintana", "21.229.405-6", "Derecho"),
]

ACOMPANANTES = [
    [("Macarena Ríos", "20.111.222-3")],
    [("Rodrigo Baeza", "19.333.444-5"), ("Lucía Araya", "20.555.666-7")],
    [],
    [("Pablo Henríquez", "19.777.888-9")],
    [],
    [("Francisca Loyola", "20.888.999-1")],
    [],
    [("Tomás Garrido", "19.000.111-2")],
    [],
    [("Javiera Cárdenas", "20.222.333-4")],
]

async def seed():
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgre@localhost:5432/reservas_db")
    pool = await asyncpg.create_pool(db_url)
    async with pool.acquire() as conn:
        campus_id = 2
        campus_row = await conn.fetchrow("SELECT id, nombre FROM campus WHERE id = 2")
        campus_nombre = campus_row["nombre"] if campus_row else "Derecho"
        print(f"Campus ID {campus_id}: {campus_nombre}")

        cubs = await conn.fetch("SELECT id, codigo FROM cubiculos WHERE campus_id = 2 ORDER BY id ASC")
        print(f"Total cubículos en {campus_nombre}: {len(cubs)}")

        fecha_hoy = date.today()
        hora_bloque = time(10, 0)
        hora_str = "10:00"

        await conn.execute(
            f"DELETE FROM reserva_acompanantes WHERE reserva_id IN (SELECT id FROM reservas WHERE campus_id = 2 AND fecha = '{fecha_hoy}' AND hora = '{hora_bloque}')"
        )
        await conn.execute(
            f"DELETE FROM reservas WHERE campus_id = 2 AND fecha = '{fecha_hoy}' AND hora = '{hora_bloque}'"
        )

        for i, cub in enumerate(cubs):
            est = ESTUDIANTES[i % len(ESTUDIANTES)]
            acomps = ACOMPANANTES[i % len(ACOMPANANTES)]

            row = await conn.fetchrow(
                """
                INSERT INTO reservas (nombre, rut, fecha, hora, campus_id, session_id, cubiculo_id, carrera)
                VALUES ($1, $2, $3, $4, 2, $5, $6, $7)
                RETURNING id
                """,
                est[0], est[1], fecha_hoy, hora_bloque,
                f"session-derecho-{i+1}", cub["id"], est[2]
            )
            res_id = row["id"]

            await conn.execute(
                """
                INSERT INTO historial_reservas (reserva_id, nombre, rut, campus_id, fecha, hora, estado, carrera)
                VALUES ($1, $2, $3, 2, $4, $5, 'activa', $6)
                """,
                res_id, est[0], est[1], fecha_hoy, hora_str, est[2]
            )

            for ac in acomps:
                await conn.execute(
                    """
                    INSERT INTO reserva_acompanantes (reserva_id, nombre, rut)
                    VALUES ($1, $2, $3)
                    """,
                    res_id, ac[0], ac[1]
                )

            print(f"  [OK] Cubículo {cub['codigo']}: Reserva #{res_id} para {est[0]} ({len(acomps)} acompañantes)")

        print(f"\nBloque {hora_str} en {campus_nombre} llenado con éxito: {len(cubs)}/10 cubículos ocupados.")

    await pool.close()

if __name__ == "__main__":
    asyncio.run(seed())
