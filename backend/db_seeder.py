import os
import gzip
import json
import asyncio
import pymssql

TABLE_ORDER = [
    'campus',
    'campus_institucional',
    'carrera_programa',
    'carrera_campus',
    'cubiculos',
    'usuarios',
    'estudiante',
    'situacion_alumno',
    'estudiante_carrera',
    'sesiones',
    'dias_bloqueados',
    'cubiculos_mantenimiento',
    'reservas',
    'reserva_acompanantes',
    'historial_reservas',
    'incidencias_cubiculos',
    'anuncios_cms',
    'tarjetas_cms',
    'faqs_cms',
    'contacto_mensajes',
    'solicitudes_talleres',
    'estadisticas_reservas_carrera',
    'rate_limits',
    'n8n_chat_histories',
    'predicciones_aforo_log'
]

def _run_seeder():
    env_host = os.getenv("MSSQL_HOST")
    is_docker = os.path.exists("/.dockerenv") or bool(os.getenv("RUNNING_IN_DOCKER"))
    hosts_to_try = []
    if env_host and (not is_docker or env_host not in ('localhost', '127.0.0.1')):
        hosts_to_try.append(env_host)
    for fallback in ["sqlserver", "botsbiblioteca-sqlserver-dev", "host.docker.internal", "localhost"]:
        if fallback not in hosts_to_try:
            hosts_to_try.append(fallback)

    port = int(os.getenv("MSSQL_PORT", "1433"))
    user = os.getenv("MSSQL_USER", "sa")
    password = os.getenv("MSSQL_PASSWORD", "SqlAdmin2026!")
    db = os.getenv("MSSQL_DB", "reservas_db")

    conn = None
    for h in hosts_to_try:
        try:
            conn = pymssql.connect(
                server=h,
                port=port,
                user=user,
                password=password,
                database=db,
                autocommit=True,
                login_timeout=4
            )
            break
        except Exception:
            continue

    if not conn:
        return

    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'campus'")
        campus_exists = cur.fetchone()
        if campus_exists:
            cur.execute("SELECT COUNT(*) FROM [campus]")
            cnt = cur.fetchone()[0]
            if cnt > 0:
                conn.close()
                return

        base_dir = os.path.dirname(__file__)
        ddl_path = os.path.join(base_dir, "schema_ddl.sql")
        if os.path.exists(ddl_path):
            with open(ddl_path, "r", encoding="utf-8") as f:
                ddl_content = f.read()
            for stmt in ddl_content.split(";"):
                stmt_clean = stmt.strip()
                if stmt_clean:
                    try:
                        cur.execute(stmt_clean)
                    except Exception:
                        pass

        seed_path = os.path.join(base_dir, "seed_data.json.gz")
        if not os.path.exists(seed_path):
            conn.close()
            return

        with gzip.open(seed_path, "rt", encoding="utf-8") as f:
            data = json.load(f)

        tables_to_insert = [t for t in TABLE_ORDER if t in data]
        for t in data:
            if t not in tables_to_insert:
                tables_to_insert.append(t)

        for table in tables_to_insert:
            rows = data.get(table, [])
            if not rows:
                continue

            cur.execute(f"SELECT 1 FROM sys.columns WHERE object_id = object_id('{table}') AND is_identity = 1")
            has_identity = bool(cur.fetchone())

            if has_identity:
                try:
                    cur.execute(f"SET IDENTITY_INSERT [{table}] ON")
                except Exception:
                    has_identity = False

            cols = list(rows[0].keys())
            col_list = ", ".join(f"[{c}]" for c in cols)
            val_placeholders = ", ".join(["%s"] * len(cols))
            insert_sql = f"INSERT INTO [{table}] ({col_list}) VALUES ({val_placeholders})"

            batch_size = 500
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                batch_vals = []
                for row in batch:
                    row_vals = []
                    for c in cols:
                        v = row.get(c)
                        if isinstance(v, (dict, list)):
                            v = json.dumps(v, ensure_ascii=False)
                        row_vals.append(v)
                    batch_vals.append(tuple(row_vals))

                for item in batch_vals:
                    try:
                        cur.execute(insert_sql, item)
                    except Exception:
                        pass

            if has_identity:
                try:
                    cur.execute(f"SET IDENTITY_INSERT [{table}] OFF")
                except Exception:
                    pass

        conn.close()
    except Exception:
        try:
            conn.close()
        except Exception:
            pass

async def auto_seed_if_empty():
    await asyncio.to_thread(_run_seeder)
