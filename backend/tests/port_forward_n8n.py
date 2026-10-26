import subprocess
import time
import sys
import urllib.request
import threading

CMD = ["kubectl", "port-forward", "svc/n8n", "5678:5678"]

def health_monitor(proc, stop_event):
    time.sleep(3)
    consecutive_failures = 0
    while not stop_event.is_set():
        if proc.poll() is not None:
            break
        try:
            req = urllib.request.Request("http://127.0.0.1:5678/healthz", headers={"User-Agent": "HealthCheck"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status in (200, 301, 302):
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
        except Exception:
            consecutive_failures += 1

        if consecutive_failures >= 12:
            print("[port-forward] El servicio n8n no responde en localhost:5678. Reiniciando túnel...")
            try:
                proc.terminate()
            except Exception:
                pass
            break
        time.sleep(5)

def main():
    while True:
        proc = None
        stop_event = threading.Event()
        try:
            print("[port-forward] Iniciando túnel hacia svc/n8n (5678:5678)...")
            proc = subprocess.Popen(CMD)
            monitor = threading.Thread(target=health_monitor, args=(proc, stop_event), daemon=True)
            monitor.start()
            proc.wait()
            stop_event.set()
            print(f"[port-forward] Túnel finalizado. Reconectando en 2 segundos...")
            time.sleep(2)
        except KeyboardInterrupt:
            print("\n[port-forward] Deteniendo túnel...")
            stop_event.set()
            if proc and proc.poll() is None:
                proc.terminate()
            sys.exit(0)
        except Exception as e:
            print(f"[port-forward] Error: {e}. Reintentando en 3 segundos...")
            time.sleep(3)

if __name__ == "__main__":
    main()
