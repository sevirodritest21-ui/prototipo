import asyncio
import json
import subprocess
import time
import sys

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 9090

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

async def _handle_data(cid, host, port):
    try:
        target_r, target_w = await asyncio.open_connection(host, port)
        srv_r, srv_w = await asyncio.open_connection(SERVER_HOST, SERVER_PORT)
        srv_w.write(f"DATA {cid}\n".encode())
        await srv_w.drain()
        await asyncio.gather(_pipe(srv_r, target_w), pipe_from_target := _pipe(target_r, srv_w))
    except Exception as e:
        print(f"[Puente] Error al conectar con {host}:{port} -> {e}")

def _ensure_port_forward():
    # Verifica si el puerto 9090 ya está abierto localmente
    import socket
    s = socket.socket()
    s.settimeout(0.5)
    res = s.connect_ex(("127.0.0.1", 9090))
    s.close()
    if res == 0:
        return None
    print("[Túnel] Iniciando port-forward hacia el clúster...")
    return subprocess.Popen(
        ["kubectl", "port-forward", "svc/backend", "9090:9090"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

async def main():
    print("=" * 60)
    print("  PUENTE DE RED HARDWARE (HIKVISION / HIKCENTRAL) <-> CLÚSTER")
    print("=" * 60)
    pf_proc = None

    while True:
        try:
            if not pf_proc or pf_proc.poll() is not None:
                pf_proc = _ensure_port_forward()
                await asyncio.sleep(1.5)

            r, w = await asyncio.open_connection(SERVER_HOST, SERVER_PORT)
            w.write(b"CONTROL\n")
            await w.drain()
            print("\n>>> ¡TÚNEL CONECTADO CON ÉXITO! <<<")
            print("El backend en el clúster ahora puede alcanzar la cámara, el relé y HikCentral.")
            print("(Mantén esta ventana abierta mientras utilices la cámara o el relé).\n")

            while True:
                line = await r.readline()
                if not line:
                    break
                data = json.loads(line.decode().strip())
                cid = data["id"]
                thost = data["host"]
                tport = data["port"]
                asyncio.create_task(_handle_data(cid, thost, tport))

        except Exception as e:
            print(f"[Túnel] Reconectando al clúster en 2 segundos... ({e})")
            await asyncio.sleep(2)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nTúnel cerrado.")
