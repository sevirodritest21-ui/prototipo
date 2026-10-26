import os
import httpx
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

terminal_ip = os.getenv("HIKVISION_TERMINAL_IP")
terminal_user = os.getenv("HIKVISION_TERMINAL_USER")
terminal_pass = os.getenv("HIKVISION_TERMINAL_PASS")

auth = httpx.DigestAuth(terminal_user, terminal_pass)
xml_payload = '<RemoteControlDoor xmlns="http://www.isapi.org/ver20/XMLSchema" version="2.0"><cmd>open</cmd></RemoteControlDoor>'

r = httpx.put(
    f"https://{terminal_ip}/ISAPI/AccessControl/RemoteControl/door/1",
    content=xml_payload,
    headers={"Content-Type": "application/xml"},
    auth=auth,
    verify=False,
    timeout=5.0
)
print("Status:", r.status_code)
print("Response:\n", r.text)
