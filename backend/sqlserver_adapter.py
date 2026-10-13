import re
import os
import json
import time
import asyncio
from typing import Optional, List, Any, Dict, Union
import pymssql
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

class UniqueViolationError(Exception):
    pass

class Record(dict):
    def __init__(self, d: dict, row_tuple: tuple = ()):
        super().__init__(d)
        self._tuple = row_tuple

    def __getitem__(self, item):
        if isinstance(item, int):
            return self._tuple[item]
        return super().__getitem__(item)

def _adapt_returning(sql: str) -> str:
    m_ins = re.search(r'INSERT\s+INTO\s+([^\s\(]+)\s*(\([^\)]+\))\s*VALUES\s*(\([^\)]+\))\s*RETURNING\s+(.*)', sql, re.IGNORECASE | re.DOTALL)
    if m_ins:
        tbl = m_ins.group(1).strip()
        cols = m_ins.group(2).strip()
        vals = m_ins.group(3).strip()
        ret = m_ins.group(4).strip()
        ret_out = []
        for r in ret.split(','):
            r = r.strip()
            if r == '*':
                ret_out.append('INSERTED.*')
            elif ' as ' in r.lower():
                parts = re.split(r'\s+as\s+', r, flags=re.IGNORECASE)
                col_name = parts[0].strip().split('.')[-1]
                ret_out.append(f'INSERTED.{col_name} AS {parts[1].strip()}')
            else:
                col_name = r.split('.')[-1]
                ret_out.append(f'INSERTED.{col_name}')
        output_clause = "OUTPUT " + ", ".join(ret_out)
        return f"INSERT INTO {tbl} {cols} {output_clause} VALUES {vals}"

    m_upd = re.search(r'UPDATE\s+([^\s]+)\s+SET\s+(.*?)\s+WHERE\s+(.*?)\s+RETURNING\s+(.*)', sql, re.IGNORECASE | re.DOTALL)
    if m_upd:
        tbl = m_upd.group(1).strip()
        sets = m_upd.group(2).strip()
        where = m_upd.group(3).strip()
        ret = m_upd.group(4).strip()
        ret_out = []
        for r in ret.split(','):
            r = r.strip()
            if r == '*':
                ret_out.append('INSERTED.*')
            elif ' as ' in r.lower():
                parts = re.split(r'\s+as\s+', r, flags=re.IGNORECASE)
                col_name = parts[0].strip().split('.')[-1]
                ret_out.append(f'INSERTED.{col_name} AS {parts[1].strip()}')
            else:
                col_name = r.split('.')[-1]
                ret_out.append(f'INSERTED.{col_name}')
        output_clause = "OUTPUT " + ", ".join(ret_out)
        return f"UPDATE {tbl} SET {sets} {output_clause} WHERE {where}"

    m_del = re.search(r'DELETE\s+FROM\s+([^\s]+)\s+WHERE\s+(.*?)\s+RETURNING\s+(.*)', sql, re.IGNORECASE | re.DOTALL)
    if m_del:
        tbl = m_del.group(1).strip()
        where = m_del.group(2).strip()
        ret = m_del.group(3).strip()
        ret_out = []
        for r in ret.split(','):
            r = r.strip()
            if r == '*':
                ret_out.append('DELETED.*')
            elif ' as ' in r.lower():
                parts = re.split(r'\s+as\s+', r, flags=re.IGNORECASE)
                col_name = parts[0].strip().split('.')[-1]
                ret_out.append(f'DELETED.{col_name} AS {parts[1].strip()}')
            else:
                col_name = r.split('.')[-1]
                ret_out.append(f'DELETED.{col_name}')
        output_clause = "OUTPUT " + ", ".join(ret_out)
        return f"DELETE FROM {tbl} {output_clause} WHERE {where}"

    return sql

def translate_query(query: str, args: tuple):
    q = query.strip()
    q = re.sub(r'::[a-zA-Z_]+(?:\(\d+\))?(?:\[\])?', '', q)
    q = re.sub(r'\s+FOR\s+UPDATE(?:\s+OF\s+[a-zA-Z0-9_]+)?', '', q, flags=re.IGNORECASE)
    q = _adapt_returning(q)

    m_offset = re.search(r'LIMIT\s+(\$\d+|\d+)\s+OFFSET\s+(\$\d+|\d+)', q, re.IGNORECASE)
    if m_offset:
        lim_part = m_offset.group(1)
        off_part = m_offset.group(2)
        q = q[:m_offset.start()] + f"OFFSET {off_part} ROWS FETCH NEXT {lim_part} ROWS ONLY" + q[m_offset.end():]
    else:
        m_lim = re.search(r'\bLIMIT\s+(\d+)\b', q, re.IGNORECASE)
        if m_lim and not re.search(r'\bTOP\b', q, re.IGNORECASE):
            lim_val = m_lim.group(1)
            q = q[:m_lim.start()] + q[m_lim.end():]
            q = re.sub(r'^(SELECT\s+(?:DISTINCT\s+)?)', rf'\1TOP {lim_val} ', q, count=1, flags=re.IGNORECASE)

    q = re.sub(r'\|\|', '+', q)
    q = re.sub(r'=\s*ANY\s*\(\s*(\$[0-9]+)\s*\)', r'IN (\1)', q, flags=re.IGNORECASE)
    q = re.sub(r'\bCURRENT_DATE\b', 'CAST(GETDATE() AS DATE)', q, flags=re.IGNORECASE)
    q = re.sub(r'\bCURRENT_TIME\b', 'CAST(GETDATE() AS TIME)', q, flags=re.IGNORECASE)
    q = re.sub(r'\bNOW\(\)', 'GETDATE()', q, flags=re.IGNORECASE)
    q = re.sub(r'\bTRUE\b', '1', q, flags=re.IGNORECASE)
    q = re.sub(r'\bFALSE\b', '0', q, flags=re.IGNORECASE)
    q = re.sub(r"TO_CHAR\(\s*([a-zA-Z0-9_\.]+)\s*,\s*'HH24:MI'\s*\)", r"CONVERT(VARCHAR(5), \1, 108)", q, flags=re.IGNORECASE)
    q = re.sub(r"TO_CHAR\(\s*([a-zA-Z0-9_\.]+)\s*,\s*'Day'\s*\)", r"DATENAME(weekday, \1)", q, flags=re.IGNORECASE)
    q = re.sub(r"EXTRACT\(ISODOW\s+FROM\s+([a-zA-Z0-9_\.]+)\)", r"DATEPART(weekday, \1)", q, flags=re.IGNORECASE)
    q = re.sub(r"([a-zA-Z0-9_\.\(\)]+)\s*-\s*INTERVAL\s+'(\d+)\s+minutes?'", r"DATEADD(minute, -\2, \1)", q, flags=re.IGNORECASE)
    q = re.sub(r"([a-zA-Z0-9_\.\(\)]+)\s*\+\s*INTERVAL\s+'(\d+)\s+minutes?'", r"DATEADD(minute, \2, \1)", q, flags=re.IGNORECASE)
    q = re.sub(r"([a-zA-Z0-9_\.\(\)]+)\s*-\s*INTERVAL\s+'(\d+)\s+hours?'", r"DATEADD(hour, -\2, \1)", q, flags=re.IGNORECASE)
    q = re.sub(r"([a-zA-Z0-9_\.\(\)]+)\s*\+\s*INTERVAL\s+'(\d+)\s+hours?'", r"DATEADD(hour, \2, \1)", q, flags=re.IGNORECASE)
    q = re.sub(r"([a-zA-Z0-9_\.\(\)]+)\s*-\s*INTERVAL\s+'(\d+)\s+days?'", r"DATEADD(day, -\2, \1)", q, flags=re.IGNORECASE)
    q = re.sub(r"([a-zA-Z0-9_\.\(\)]+)\s*\+\s*INTERVAL\s+'(\d+)\s+days?'", r"DATEADD(day, \2, \1)", q, flags=re.IGNORECASE)
    q = re.sub(r"GETDATE\(\)\s*-\s*\(\s*(\$\d+|\%s)\s*\+\s*' seconds'\)", r"DATEADD(second, -\1, GETDATE())", q, flags=re.IGNORECASE)
    q = re.sub(r"INTERVAL\s+'1\s+day'", "1", q, flags=re.IGNORECASE)
    q = re.sub(r"GETDATE\(\)\s*-\s*1", "DATEADD(day, -1, GETDATE())", q, flags=re.IGNORECASE)

    param_pattern = re.compile(r'\$(\d+)')
    matches = param_pattern.findall(q)

    if matches:
        new_args = []
        for idx in matches:
            val = args[int(idx) - 1]
            if isinstance(val, (list, tuple)):
                val = list(val)
            new_args.append(val)
        
        parts = []
        last_end = 0
        for m in param_pattern.finditer(q):
            parts.append(q[last_end:m.start()])
            idx_num = int(m.group(1))
            val = args[idx_num - 1]
            if isinstance(val, (list, tuple)):
                placeholders = ", ".join(["%s"] * len(val))
                parts.append(placeholders)
            else:
                parts.append("%s")
            last_end = m.end()
        parts.append(q[last_end:])
        translated_q = "".join(parts)

        expanded_args = []
        for idx in matches:
            val = args[int(idx) - 1]
            if isinstance(val, (list, tuple)):
                expanded_args.extend(val)
            else:
                expanded_args.append(val)
        new_args_tuple = tuple(expanded_args)
    else:
        translated_q = q
        new_args_tuple = args

    translated_q = re.sub(r'=\s*ANY\s*\(\s*%s\s*\)', r'IN (%s)', translated_q, flags=re.IGNORECASE)
    return translated_q, new_args_tuple

class ConnectionWrapper:
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def _execute_sync(self, query: str, args: tuple):
        t_query, t_args = translate_query(query, args)
        cur = self._conn.cursor()
        try:
            cur.execute(t_query, t_args if t_args else None)
            return cur
        except Exception as e:
            msg = str(e)
            if "2627" in msg or "2601" in msg or "duplicate key" in msg.lower() or "PRIMARY KEY" in msg or "UNIQUE KEY" in msg:
                raise UniqueViolationError(msg) from e
            raise

    async def fetch(self, query: str, *args) -> List[Record]:
        def _do():
            cur = self._execute_sync(query, args)
            rows = cur.fetchall()
            if not rows or not cur.description:
                return []
            col_names = [d[0] if d[0] else f"col_{i}" for i, d in enumerate(cur.description)]
            result = []
            for r in rows:
                d = dict(zip(col_names, r))
                result.append(Record(d, r))
            return result
        return await asyncio.to_thread(_do)

    async def fetchrow(self, query: str, *args) -> Optional[Record]:
        def _do():
            cur = self._execute_sync(query, args)
            r = cur.fetchone()
            if not r or not cur.description:
                return None
            col_names = [d[0] if d[0] else f"col_{i}" for i, d in enumerate(cur.description)]
            d = dict(zip(col_names, r))
            return Record(d, r)
        return await asyncio.to_thread(_do)

    async def fetchval(self, query: str, *args) -> Any:
        def _do():
            cur = self._execute_sync(query, args)
            r = cur.fetchone()
            if not r:
                return None
            return r[0]
        return await asyncio.to_thread(_do)

    async def execute(self, query: str, *args) -> str:
        def _do():
            cur = self._execute_sync(query, args)
            self._conn.commit()
            return f"ROWCOUNT {cur.rowcount}"
        return await asyncio.to_thread(_do)

    def transaction(self):
        class _Tx:
            def __init__(self, conn):
                self.conn = conn
            async def __aenter__(self):
                return self
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                if exc_type:
                    await asyncio.to_thread(self.conn.rollback)
                else:
                    await asyncio.to_thread(self.conn.commit)
        return _Tx(self._conn)

class PoolWrapper:
    def __init__(self, host, port, user, password, db, min_size=5, max_size=20):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.db = db
        self.min_size = min_size
        self.max_size = max_size
        self._pool = asyncio.Queue(maxsize=max_size)
        self._created = 0
        self._lock = asyncio.Lock()

    def _create_raw(self):
        return pymssql.connect(
            server=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.db,
            autocommit=False
        )

    async def init(self):
        for _ in range(self.min_size):
            try:
                conn = await asyncio.to_thread(self._create_raw)
                await self._pool.put((conn, time.time()))
                self._created += 1
            except Exception:
                break

    def acquire(self):
        class _AcquireContext:
            def __init__(self, pool_ref):
                self.pool = pool_ref
                self.raw_conn = None

            async def __aenter__(self):
                while True:
                    try:
                        self.raw_conn, last_used = self.pool._pool.get_nowait()
                    except asyncio.QueueEmpty:
                        async with self.pool._lock:
                            if self.pool._created < self.pool.max_size:
                                self.raw_conn = await asyncio.to_thread(self.pool._create_raw)
                                self.pool._created += 1
                                last_used = time.time()
                            else:
                                self.raw_conn, last_used = await self.pool._pool.get()

                    if time.time() - last_used > 45:
                        def _ping(c):
                            try:
                                cur = c.cursor()
                                cur.execute("SELECT 1")
                                cur.fetchall()
                                return True
                            except Exception:
                                return False
                        alive = await asyncio.to_thread(_ping, self.raw_conn)
                        if not alive:
                            try:
                                await asyncio.to_thread(self.raw_conn.close)
                            except Exception:
                                pass
                            self.raw_conn = await asyncio.to_thread(self.pool._create_raw)
                    break

                return ConnectionWrapper(self.raw_conn)

            async def __aexit__(self, exc_type, exc_val, exc_tb):
                if self.raw_conn:
                    is_broken = False
                    try:
                        if exc_type:
                            await asyncio.to_thread(self.raw_conn.rollback)
                        else:
                            await asyncio.to_thread(self.raw_conn.commit)
                    except Exception:
                        is_broken = True

                    if is_broken:
                        try:
                            await asyncio.to_thread(self.raw_conn.close)
                        except Exception:
                            pass
                        try:
                            new_conn = await asyncio.to_thread(self.pool._create_raw)
                            await self.pool._pool.put((new_conn, time.time()))
                        except Exception:
                            async with self.pool._lock:
                                self.pool._created -= 1
                    else:
                        try:
                            self.pool._pool.put_nowait((self.raw_conn, time.time()))
                        except asyncio.QueueFull:
                            await asyncio.to_thread(self.raw_conn.close)
                            async with self.pool._lock:
                                self.pool._created -= 1

        return _AcquireContext(self)

    async def close(self):
        while not self._pool.empty():
            try:
                conn, _ = self._pool.get_nowait()
                await asyncio.to_thread(conn.close)
            except Exception:
                pass

async def create_pool(*args, **kwargs) -> PoolWrapper:
    is_docker = os.path.exists("/.dockerenv") or bool(os.getenv("RUNNING_IN_DOCKER"))
    env_host = os.getenv("MSSQL_HOST")
    if not is_docker and (not env_host or env_host == "sqlserver"):
        host = "localhost"
    else:
        host = env_host or ("sqlserver" if is_docker else "localhost")
    port = int(os.getenv("MSSQL_PORT", "1433"))
    user = os.getenv("MSSQL_USER", "")
    password = os.getenv("MSSQL_PASSWORD", "")
    db = os.getenv("MSSQL_DB", "")
    pool = PoolWrapper(host=host, port=port, user=user, password=password, db=db)
    await pool.init()
    return pool

Pool = PoolWrapper


