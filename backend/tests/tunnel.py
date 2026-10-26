import os
import asyncio
import json
import uuid

TARGETS = {
    8443: (os.getenv("HIKCENTRAL_TARGET_HOST") or ".".join(["192", "168", "200", "50"]), 443),
    8444: (os.getenv("TERMINAL_TARGET_HOST") or ".".join(["172", "29", "0", "70"]), 443),
    8080: (os.getenv("TERMINAL_TARGET_HOST") or ".".join(["172", "29", "0", "70"]), 80),
}

pending_conns = {}
control_writer = None

async def _pipe(reader, writer):
    try:
        while True:
            data = await reader.read(65536)
            if not data:
                break
            writer.write(data)
            await writer.drain()
    except Exception:
        pass
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass

async def _handle_connection(reader, writer):
    global control_writer
    try:
        line = await reader.readline()
        cmd = line.decode().strip()
        if cmd == "CONTROL":
            control_writer = writer
            print("[Tunnel] Cliente de túnel conectado desde PC.")
            try:
                while True:
                    heartbeat = await reader.readline()
                    if not heartbeat:
                        break
            except Exception:
                pass
            finally:
                control_writer = None
                print("[Tunnel] Cliente de túnel desconectado.")
        elif cmd.startswith("DATA "):
            cid = cmd.split(" ")[1]
            pair = pending_conns.pop(cid, None)
            if pair:
                app_r, app_w = pair
                await asyncio.gather(_pipe(reader, app_w), _pipe(app_r, writer))
            else:
                writer.close()
    except Exception:
        pass

async def _handle_app(port, reader, writer):
    global control_writer
    if not control_writer:
        writer.close()
        return
    host, target_port = TARGETS[port]
    cid = uuid.uuid4().hex[:8]
    pending_conns[cid] = (reader, writer)
    msg = json.dumps({"id": cid, "host": host, "port": target_port}) + "\n"
    try:
        control_writer.write(msg.encode())
        await control_writer.drain()
    except Exception:
        pending_conns.pop(cid, None)
        writer.close()

async def start_tunnel_server():
    try:
        server = await asyncio.start_server(_handle_connection, "0.0.0.0", 9090)
        for p in TARGETS:
            await asyncio.start_server(lambda r, w, port=p: _handle_app(port, r, w), "127.0.0.1", p)
        print("[Tunnel] Servidor de túnel escuchando en puerto 9090 (8443, 8444, 8080).")
        async with server:
            await server.serve_forever()
    except Exception as e:
        print(f"[Tunnel] Error al iniciar servidor de túnel: {e}")
