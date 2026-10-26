import asyncio
import datetime
import httpx
import pymssql
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

terminal_ip = os.getenv("HIKVISION_TERMINAL_IP")
terminal_user = os.getenv("HIKVISION_TERMINAL_USER")
terminal_pass = os.getenv("HIKVISION_TERMINAL_PASS")

auth = httpx.DigestAuth(terminal_user, terminal_pass)
TERMINAL_URL = f"https://{terminal_ip}"

async def test_live_scanner():
    print("Iniciando monitor en vivo del terminal por ISAPI...")
    seen_serials = set()
    
    # 1. Obtener eventos recientes para inicializar
    now = datetime.datetime.now()
    start = (now - datetime.timedelta(seconds=10)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
    end = (now + datetime.timedelta(seconds=30)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
    
    async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
        # Pre-cargar seriales viejos
        payload = {
            "AcsEventCond": {
                "searchID": "init",
                "searchResultPosition": 0,
                "maxResults": 30,
                "major": 5,
                "minor": 75,
                "startTime": (now - datetime.timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S-03:00"),
                "endTime": (now + datetime.timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
            }
        }
        r = await client.post(f"{TERMINAL_URL}/ISAPI/AccessControl/AcsEvent?format=json", json=payload, auth=auth)
        if r.status_code == 200:
            for ev in r.json().get("AcsEvent", {}).get("InfoList", []):
                seen_serials.add(ev.get("serialNo"))
        print(f"Monitor listo. {len(seen_serials)} eventos anteriores ignorados. Monitoreando escaneos en vivo...")

        for i in range(30):
            now = datetime.datetime.now()
            start = (now - datetime.timedelta(seconds=10)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
            end = (now + datetime.timedelta(seconds=10)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
            payload = {
                "AcsEventCond": {
                    "searchID": f"scan_{i}",
                    "searchResultPosition": 0,
                    "maxResults": 10,
                    "major": 5,
                    "minor": 75,
                    "startTime": start,
                    "endTime": end
                }
            }
            try:
                r = await client.post(f"{TERMINAL_URL}/ISAPI/AccessControl/AcsEvent?format=json", json=payload, auth=auth)
                if r.status_code == 200:
                    events = r.json().get("AcsEvent", {}).get("InfoList", [])
                    for ev in events:
                        serial = ev.get("serialNo")
                        if serial not in seen_serials:
                            seen_serials.add(serial)
                            name = ev.get("name")
                            emp = ev.get("employeeNoString")
                            time_ev = ev.get("time")
                            print(f"\n🎯 [NUEVO ESCANEO DETECTADO]: {name} (ID: {emp}) a las {time_ev}")
            except Exception as e:
                pass
            await asyncio.sleep(1.0)
    print("Prueba de monitor finalizada.")

if __name__ == "__main__":
    asyncio.run(test_live_scanner())
