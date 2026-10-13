import os
import httpx
import time
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

terminal_ip = os.getenv("HIKVISION_TERMINAL_IP")
terminal_user = os.getenv("HIKVISION_TERMINAL_USER")
terminal_pass = os.getenv("HIKVISION_TERMINAL_PASS")

auth = httpx.DigestAuth(terminal_user, terminal_pass)
url = f"https://{terminal_ip}/ISAPI/Event/notification/alertStream"

print(f"Conectando a alertStream en {terminal_ip}...")
with httpx.Client(verify=False, timeout=None) as client:
    with client.stream("GET", url, auth=auth) as response:
        print("Conectado con status:", response.status_code)
        print("Escuchando eventos durante 15 segundos...")
        start = time.time()
        for chunk in response.iter_raw():
            text = chunk.decode("utf-8", errors="replace")
            print("CHUNK RECIBIDO:\n", text[:300])
            if time.time() - start > 15:
                break
