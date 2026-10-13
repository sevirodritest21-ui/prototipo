import asyncio
from hikcentral import request_artemis

async def main():
    print("Probando conexion con HikCentral (Access Control)...")
    try:
        res = await request_artemis("POST", "/artemis/api/acs/v1/door/doControl", {"doorIndexCodes": ["1"], "controlType": 0})
        print("Respuesta recibida:", res)
        if res.get("code") == "0":
            print("Conexion y autorizacion exitosas con HikCentral!")
        else:
            print("Respuesta con codigo:", res.get("code"), res.get("msg"))
    except Exception as e:
        print("Error al conectar:", e)

if __name__ == "__main__":
    asyncio.run(main())
