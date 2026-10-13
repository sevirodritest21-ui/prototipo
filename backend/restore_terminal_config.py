import os
import httpx
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

terminal_ip = os.getenv("HIKVISION_TERMINAL_IP")
terminal_user = os.getenv("HIKVISION_TERMINAL_USER")
terminal_pass = os.getenv("HIKVISION_TERMINAL_PASS")

auth = httpx.DigestAuth(terminal_user, terminal_pass)

xml_original = """<?xml version="1.0" encoding="UTF-8"?>
<HttpHostNotification version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
<id>1</id>
<url>/qr-data</url>
<protocolType>HTTP</protocolType>
<parameterFormatType>JSON</parameterFormatType>
<addressingFormatType>ipaddress</addressingFormatType>
<ipAddress>192.168.100.4</ipAddress>
<portNo>8090</portNo>
<httpAuthenticationMethod>none</httpAuthenticationMethod>
<SubscribeEvent>
<heartbeat>30</heartbeat>
<eventMode>all</eventMode>
</SubscribeEvent>
</HttpHostNotification>"""

def restaurar():
    r = httpx.put(
        f"https://{terminal_ip}/ISAPI/Event/notification/httpHosts/1",
        content=xml_original,
        headers={"Content-Type": "application/xml"},
        auth=auth,
        verify=False,
        timeout=5.0
    )
    print("Restauración a configuración previa (192.168.100.4:8090):", r.status_code)

if __name__ == "__main__":
    restaurar()
