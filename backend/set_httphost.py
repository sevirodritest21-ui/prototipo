import os
import httpx
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

terminal_ip = os.getenv("HIKVISION_TERMINAL_IP")
terminal_user = os.getenv("HIKVISION_TERMINAL_USER")
terminal_pass = os.getenv("HIKVISION_TERMINAL_PASS")

auth = httpx.DigestAuth(terminal_user, terminal_pass)
xml = """<?xml version="1.0" encoding="UTF-8"?>
<HttpHostNotification version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
<id>1</id>
<url>/api/hikcentral/event</url>
<protocolType>HTTP</protocolType>
<parameterFormatType>JSON</parameterFormatType>
<addressingFormatType>ipaddress</addressingFormatType>
<ipAddress>172.35.10.107</ipAddress>
<portNo>8000</portNo>
<httpAuthenticationMethod>none</httpAuthenticationMethod>
<SubscribeEvent>
<heartbeat>30</heartbeat>
<eventMode>list</eventMode>
<EventList>
<Event>
<type>AccessControllerEvent</type>
<minorEvent>0x4b,0x1</minorEvent>
</Event>
</EventList>
</SubscribeEvent>
</HttpHostNotification>"""

r = httpx.put(
    f"https://{terminal_ip}/ISAPI/Event/notification/httpHosts/1",
    content=xml,
    headers={"Content-Type": "application/xml"},
    auth=auth,
    verify=False,
    timeout=5.0
)
print("Status:", r.status_code)
print("Response:\n", r.text)
