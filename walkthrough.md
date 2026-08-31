# Walkthrough: Persistencia de Sesión y Datos en el Chatbot

Hemos implementado con éxito la funcionalidad de conservación y persistencia de los datos del usuario (RUT y Nombre) en el chatbot. Esto permite que una vez que el usuario proporciona sus datos en la sesión, no tenga que volver a ingresarlos al realizar consultas o eliminaciones de reservas.

---

## Resumen de Cambios Realizados

### 1. Backend (`main.py`)
*   **Nueva Colección de MongoDB (`sesiones`)**: Se introdujo una colección para almacenar dinámicamente la relación entre el `sessionId` del usuario y su `rut` y `nombre`.
*   **Actualización de Modelos Pydantic**: Se agregaron los campos opcionales `sessionId` a `MessageInput`, `ReservaBase`, `EsquemaConsulta` y `EsquemaEliminar`.
*   **Intercepción y Extracción de RUT en el Chat (`/api/chat`)**: Cada mensaje entrante es escaneado mediante una expresión regular. Si el mensaje contiene un RUT y un `sessionId`, este se extrae y se persiste automáticamente en la base de datos de sesiones *antes* de enviar el mensaje a n8n.
*   **Reenvío de Sesión a n8n**: El `sessionId` ahora se reenvía en el payload JSON hacia el webhook de n8n para que este pueda gestionar su propia memoria conversacional.
*   **Asociación de Formulario Manual (`/api/reservas` POST)**: Al crear una reserva, si se incluye un `sessionId`, el backend vincula inmediatamente el RUT y el nombre a esa sesión.
*   **Consultas y Eliminaciones Inteligentes (`/api/reservas/consultar` POST y `/api/reservas` DELETE)**: Si no se proporciona un RUT en los parámetros de la solicitud, pero sí un `sessionId`, el backend recupera el RUT directamente desde la base de datos de sesiones.

### 2. Frontend (`src/`)
*   **Generador de Sesiones Únicas (`ChatBotFlotante.jsx` y `FormularioReserva.jsx`)**: Se incorporó un helper en ambos componentes que genera un identificador de sesión único (`session_xxxx`) por cada pestaña del navegador usando `sessionStorage`. Esto asegura la separación de datos entre diferentes pestañas o navegadores.
*   **Transmisión de Sesión en Peticiones**:
    *   El chatbot flotante ahora incluye el `sessionId` en su llamada a `/api/chat`.
    *   El formulario de reservas manual ahora incluye el `sessionId` en su llamada a `/api/reservas`. Esto crea una experiencia integrada: si el usuario reserva en el formulario manual, el chatbot ya sabrá quién es y recordará sus datos al instante.
*   **Integración de Experiencia de Usuario (`ChatBotFlotante.jsx`)**: Se agregó un listener para el evento personalizado `"open-chat"`. Cuando el usuario hace clic en **"Probar Asistente IA"** en la página de inicio, el chatbot se despliega automáticamente.

---

## Verificación y Resultados

Para garantizar la robustez de los cambios, creamos y ejecutamos un script de pruebas de integración directa (`test_backend.py`) que simula todos los flujos de interacción del cliente con el servidor y la base de datos MongoDB.

### Resultados de las Pruebas
Todas las pruebas de integración pasaron con éxito:
1.  **Limpieza de datos de prueba**: Correcta.
2.  **Extracción de RUT en Chat**: El backend detectó correctamente el RUT `"19876543-2"` en el texto de entrada y lo guardó en la colección `sesiones` bajo el `sessionId` de prueba.
3.  **Consulta por Sesión (Sin RUT directo)**: Al realizar una consulta `/api/reservas/consultar` enviando solo el `sessionId` (RUT vacío), el backend resolvió exitosamente el RUT y retornó la reserva correspondiente.
4.  **Asociación desde Formulario**: Al crear una reserva usando el payload del formulario junto con el `sessionId`, el backend guardó la reserva y simultáneamente actualizó la sesión con el RUT y nombre.
5.  **Eliminación por Sesión (Sin RUT directo)**: Al enviar una solicitud de eliminación `/api/reservas` (DELETE) con solo el `sessionId`, el backend recuperó el RUT asociado, eliminó la reserva y confirmó la remoción física en la colección `reserva`.

---

## Guía de Integración para n8n

Para que tu flujo en n8n saque el máximo provecho de esta persistencia, te sugerimos realizar las siguientes configuraciones en tu panel de n8n:

1.  **En el Nodo Webhook de Entrada**:
    *   El webhook ahora recibe un objeto JSON que incluye tanto `message` como `sessionId`.
2.  **En el Nodo del Agente de IA o Cadena**:
    *   Asegúrate de tener un nodo de **Memory** (como *Window Buffer Memory* o *Redis Chat Memory*) conectado a tu nodo de Agente.
    *   En el campo **Session ID** de ese nodo de memoria, escribe la expresión:
        `{{ $json.body.sessionId }}` (o el path correspondiente al sessionId que llega del webhook).
    *   *¿Cómo funciona esto?* n8n mantendrá el historial de la conversación ligado a ese ID de sesión. Cuando el usuario diga *"quiero consultar mis reservas"*, el LLM en n8n mirará su memoria, verá el RUT mencionado anteriormente, y llamará a la herramienta de consulta pasándole ese RUT.
3.  **Configuración de Herramientas (Tools)**:
    *   **Herramienta de Consulta**: Debe llamar a `POST http://localhost:8000/api/reservas/consultar`. Gracias a nuestra solución de doble capa, puedes configurar esta herramienta para que envíe el `sessionId` en lugar del `rut`, y el backend resolverá el RUT automáticamente.
    *   **Herramienta de Eliminación**: Debe llamar a `DELETE http://localhost:8000/api/reservas` enviando el `sessionId`.

---

## Cómo Probarlo en tu Navegador Localmente

1.  Asegúrate de que tu servidor de base de datos **MongoDB** esté activo.
2.  Inicia tu backend de FastAPI:
    ```bash
    uvicorn main:app --reload
    ```
3.  Inicia el servidor de desarrollo del frontend:
    ```bash
    npm run dev
    ```
4.  Abre el sitio web (`http://localhost:5173`) y prueba los siguientes escenarios:
    *   **Escenario A (Todo en Chat)**: Abre el chat, dile tu nombre y tu RUT para crear una reserva. Luego, pídele consultar tus reservas. El bot te mostrará la información sin volver a pedirte el RUT.
    *   **Escenario B (Formulario a Chat)**: Ve a la pestaña **Reservar**, llena tus datos manualmente y confirma la reserva. Abre el chat en la misma pestaña y escribe *"¿Qué cubículos tengo reservados?"*. Verás que el asistente ya sabe quién eres y te da la respuesta directamente.
