import os
import time
import uuid
import hmac
import hashlib
import base64
from typing import Optional, Dict, Any
import httpx

from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), "backend.env")
load_dotenv(_env_path if os.path.exists(_env_path) else "backend.env")

HIKCENTRAL_HOST = (os.getenv("HIKCENTRAL_HOST") or "").rstrip("/")
HIKCENTRAL_APP_KEY = os.getenv("HIKCENTRAL_APP_KEY") or ""
HIKCENTRAL_APP_SECRET = os.getenv("HIKCENTRAL_APP_SECRET") or ""

def _build_signature(method: str, path: str, app_key: str, app_secret: str, nonce: str, timestamp: str, content_type: str = "application/json", accept: str = "*/*") -> str:
    method_upper = method.upper()
    if method_upper == "POST":
        sign_str = f"{method_upper}\n{accept}\n{content_type}\nx-ca-key:{app_key}\nx-ca-nonce:{nonce}\nx-ca-timestamp:{timestamp}\n{path}"
    else:
        sign_str = f"{method_upper}\n{accept}\nx-ca-key:{app_key}\nx-ca-nonce:{nonce}\nx-ca-timestamp:{timestamp}\n{path}"
    digest = hmac.new(app_secret.encode("utf-8"), sign_str.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("utf-8")

async def request_artemis(method: str, path: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{HIKCENTRAL_HOST}{path}"
    timestamp = str(int(time.time() * 1000))
    nonce = str(uuid.uuid4())
    content_type = "application/json"
    accept = "*/*"

    signature = _build_signature(
        method=method,
        path=path,
        app_key=HIKCENTRAL_APP_KEY,
        app_secret=HIKCENTRAL_APP_SECRET,
        nonce=nonce,
        timestamp=timestamp,
        content_type=content_type,
        accept=accept
    )

    headers = {
        "Accept": accept,
        "x-ca-key": HIKCENTRAL_APP_KEY,
        "x-ca-signature-headers": "x-ca-key,x-ca-nonce,x-ca-timestamp",
        "x-ca-signature": signature,
        "x-ca-timestamp": timestamp,
        "x-ca-nonce": nonce
    }

    if method.upper() == "POST":
        headers["Content-Type"] = content_type

    async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
        if method.upper() == "POST":
            response = await client.post(url, headers=headers, json=data or {}, params=params)
        else:
            response = await client.get(url, headers=headers, params=params)
        
        response.raise_for_status()
        return response.json()

HIKVISION_TERMINAL_IP = os.getenv("HIKVISION_TERMINAL_IP") or ""
HIKVISION_TERMINAL_USER = os.getenv("HIKVISION_TERMINAL_USER") or ""
HIKVISION_TERMINAL_PASS = os.getenv("HIKVISION_TERMINAL_PASS") or ""

async def open_door_direct(door_id: int = 1) -> dict:
    url = f"https://{HIKVISION_TERMINAL_IP}/ISAPI/AccessControl/RemoteControl/door/{door_id}"
    auth = httpx.DigestAuth(HIKVISION_TERMINAL_USER, HIKVISION_TERMINAL_PASS)
    xml_payload = '<RemoteControlDoor xmlns="http://www.isapi.org/ver20/XMLSchema" version="2.0"><cmd>open</cmd></RemoteControlDoor>'
    async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
        r = await client.put(url, content=xml_payload, headers={"Content-Type": "application/xml"}, auth=auth)
        return {"status_code": r.status_code, "success": r.status_code == 200, "text": r.text}

_person_cache: Dict[str, dict] = {}

async def get_person_info(person_id: str) -> dict:
    if not person_id:
        return {}
    if person_id in _person_cache:
        return _person_cache[person_id]
    try:
        res = await request_artemis("POST", "/artemis/api/resource/v1/person/personId/personInfo", {"personId": str(person_id)})
        if res.get("code") == "0" and isinstance(res.get("data"), dict):
            _person_cache[person_id] = res["data"]
            return res["data"]
    except Exception:
        pass
    return {}
