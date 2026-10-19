import asyncio
import os
import json
import asyncpg
import pymssql
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

PG_URL = os.getenv("DATABASE_URL")
MSSQL_HOST = os.getenv("MSSQL_HOST", "localhost")
MSSQL_PORT = int(os.getenv("MSSQL_PORT", "1433"))
MSSQL_USER = os.getenv("MSSQL_USER", "")
MSSQL_PASSWORD = os.getenv("MSSQL_PASSWORD", "")
MSSQL_DB = os.getenv("MSSQL_DB", "")

DDL = """
IF OBJECT_ID('reserva_acompanantes', 'U') IS NOT NULL DROP TABLE reserva_acompanantes;
IF OBJECT_ID('incidencias_cubiculos', 'U') IS NOT NULL DROP TABLE incidencias_cubiculos;
IF OBJECT_ID('reservas', 'U') IS NOT NULL DROP TABLE reservas;
IF OBJECT_ID('historial_reservas', 'U') IS NOT NULL DROP TABLE historial_reservas;
IF OBJECT_ID('cubiculos_mantenimiento', 'U') IS NOT NULL DROP TABLE cubiculos_mantenimiento;
IF OBJECT_ID('dias_bloqueados', 'U') IS NOT NULL DROP TABLE dias_bloqueados;
IF OBJECT_ID('cubiculos', 'U') IS NOT NULL DROP TABLE cubiculos;
IF OBJECT_ID('campus', 'U') IS NOT NULL DROP TABLE campus;
IF OBJECT_ID('usuarios', 'U') IS NOT NULL DROP TABLE usuarios;
IF OBJECT_ID('sesiones', 'U') IS NOT NULL DROP TABLE sesiones;
IF OBJECT_ID('anuncios_cms', 'U') IS NOT NULL DROP TABLE anuncios_cms;
IF OBJECT_ID('tarjetas_cms', 'U') IS NOT NULL DROP TABLE tarjetas_cms;
IF OBJECT_ID('faqs_cms', 'U') IS NOT NULL DROP TABLE faqs_cms;
IF OBJECT_ID('rate_limits', 'U') IS NOT NULL DROP TABLE rate_limits;
IF OBJECT_ID('n8n_chat_histories', 'U') IS NOT NULL DROP TABLE n8n_chat_histories;

CREATE TABLE campus (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL,
    cubiculas_fisicos INT DEFAULT 5
);

CREATE TABLE cubiculos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    codigo NVARCHAR(20) NOT NULL UNIQUE,
    campus_id INT NOT NULL REFERENCES campus(id) ON DELETE CASCADE,
    estado NVARCHAR(20) DEFAULT 'disponible'
);

CREATE TABLE usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    hashed_password NVARCHAR(255) NOT NULL,
    nombre NVARCHAR(150) NOT NULL,
    rol NVARCHAR(50) DEFAULT 'estudiante',
    created_at DATETIME2 DEFAULT GETDATE(),
    rut NVARCHAR(50),
    carrera NVARCHAR(150)
);

CREATE TABLE reservas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(150) NOT NULL,
    rut NVARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    session_id NVARCHAR(255),
    created_at DATETIME2 DEFAULT GETDATE(),
    campus_id INT REFERENCES campus(id),
    cubiculo_id INT REFERENCES cubiculos(id)
);

CREATE TABLE reserva_acompanantes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    reserva_id INT NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    nombre NVARCHAR(150) NOT NULL,
    rut NVARCHAR(50) NOT NULL
);

CREATE TABLE historial_reservas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    reserva_id INT,
    nombre NVARCHAR(150) NOT NULL,
    rut NVARCHAR(50) NOT NULL,
    campus_id INT,
    fecha DATE NOT NULL,
    hora NVARCHAR(50) NOT NULL,
    estado NVARCHAR(50) DEFAULT 'activa',
    fecha_registro DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE sesiones (
    session_id NVARCHAR(255) PRIMARY KEY,
    rut NVARCHAR(50) NOT NULL,
    nombre NVARCHAR(150),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE dias_bloqueados (
    id INT IDENTITY(1,1) PRIMARY KEY,
    fecha DATE NOT NULL,
    motivo NVARCHAR(255),
    campus_id INT REFERENCES campus(id) ON DELETE CASCADE,
    creado_por NVARCHAR(255),
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE cubiculos_mantenimiento (
    id INT IDENTITY(1,1) PRIMARY KEY,
    cubiculo_id INT NOT NULL REFERENCES cubiculos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    motivo NVARCHAR(255),
    creado_por NVARCHAR(255),
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE incidencias_cubiculos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    cubiculo_id INT NOT NULL REFERENCES cubiculos(id) ON DELETE CASCADE,
    reserva_id INT,
    estudiante_rut NVARCHAR(50),
    estudiante_nombre NVARCHAR(150),
    categoria NVARCHAR(100),
    descripcion NVARCHAR(MAX) NOT NULL,
    estado NVARCHAR(50) DEFAULT 'pendiente',
    solucion NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE anuncios_cms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    titulo NVARCHAR(255) NOT NULL,
    subtitulo NVARCHAR(MAX),
    badge NVARCHAR(100),
    boton_texto NVARCHAR(100),
    boton_link NVARCHAR(255),
    color_fondo NVARCHAR(100),
    orden INT DEFAULT 0
);

CREATE TABLE tarjetas_cms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    icono NVARCHAR(100),
    titulo NVARCHAR(255) NOT NULL,
    descripcion NVARCHAR(MAX),
    link_texto NVARCHAR(100),
    link_url NVARCHAR(255),
    orden INT DEFAULT 0
);

CREATE TABLE faqs_cms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    pregunta NVARCHAR(MAX) NOT NULL,
    respuesta NVARCHAR(MAX) NOT NULL,
    categoria NVARCHAR(100),
    orden INT DEFAULT 0
);

CREATE TABLE rate_limits (
    id INT IDENTITY(1,1) PRIMARY KEY,
    [key] NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE n8n_chat_histories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    session_id NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL
);
"""

TABLE_ORDER = [
    ("campus", True),
    ("cubiculos", True),
    ("usuarios", True),
    ("reservas", True),
    ("reserva_acompanantes", True),
    ("historial_reservas", True),
    ("sesiones", False),
    ("dias_bloqueados", True),
    ("cubiculos_mantenimiento", True),
    ("incidencias_cubiculos", True),
    ("anuncios_cms", True),
    ("tarjetas_cms", True),
    ("faqs_cms", True),
    ("rate_limits", True),
    ("n8n_chat_histories", True),
]

async def migrate():
    pg_conn = await asyncpg.connect(PG_URL)
    conn_params = {
        "server": MSSQL_HOST,
        "port": MSSQL_PORT,
        "user": MSSQL_USER,
        "password": MSSQL_PASSWORD,
        "database": MSSQL_DB,
        "autocommit": False
    }
    ms_conn = pymssql.connect(**conn_params)
    ms_cur = ms_conn.cursor()

    for cmd in DDL.strip().split(";"):
        cmd_clean = cmd.strip()
        if cmd_clean:
            ms_cur.execute(cmd_clean, ())
    ms_conn.commit()
    print("Tablas creadas exitosamente en SQL Server 2019.")

    for table_name, has_identity in TABLE_ORDER:
        pg_rows = await pg_conn.fetch(f"SELECT * FROM {table_name}")
        if not pg_rows:
            print(f"{table_name}: 0 filas migradas.")
            continue

        cols = list(pg_rows[0].keys())
        col_list = ", ".join(f"[{c}]" if c == "key" else c for c in cols)
        val_placeholders = ", ".join(["%s"] * len(cols))

        if has_identity:
            ms_cur.execute(f"SET IDENTITY_INSERT {table_name} ON", ())

        for row in pg_rows:
            vals = []
            for c in cols:
                v = row[c]
                if isinstance(v, (dict, list)):
                    v = json.dumps(v, ensure_ascii=False)
                elif hasattr(v, "isoformat"):
                    if hasattr(v, "tzinfo") and v.tzinfo:
                        v = v.replace(tzinfo=None)
                vals.append(v)
            ms_cur.execute(f"INSERT INTO {table_name} ({col_list}) VALUES ({val_placeholders})", tuple(vals))

        if has_identity:
            ms_cur.execute(f"SET IDENTITY_INSERT {table_name} OFF", ())

        ms_conn.commit()
        print(f"{table_name}: {len(pg_rows)} filas migradas exitosamente.")

    await pg_conn.close()
    ms_conn.close()
    print("MIGRACION COMPLETA Y EXITOSA.")

if __name__ == "__main__":
    asyncio.run(migrate())
