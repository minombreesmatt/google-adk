# Deploy Guide: FastAPI + React a Fly.io

## 📋 Estado Actual del Proyecto

### Estructura actual:
```
Google ADK/
├── api.py               # FastAPI backend
├── main.py              # Lógica de procesamiento
├── requirements.txt     # Dependencies Python
├── uploads/             # Archivos temporales
└── frontend/
    ├── src/
    │   ├── App.jsx      # React app principal
    │   └── main.jsx
    ├── package.json
    └── ...
```

### Funcionamiento actual:
- **Backend FastAPI**: `http://localhost:8000`
- **Frontend React**: `http://localhost:3000` (vite dev server)
- **API calls**: Frontend llama a `http://localhost:8000/process-audio`

## 🎯 Objetivo: Una sola URL para la demo

**Resultado final**: `tu-app.fly.dev`
- Frontend: `tu-app.fly.dev/` (tu página React)
- API: `tu-app.fly.dev/api/process-audio` (tu backend)

## 🔧 Cambios Necesarios

### 1. Modificar `api.py`

**Agregar al inicio (después de los imports):**
```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
```

**Agregar después de crear la app (después de `app = FastAPI(...)`):**
```python
# Servir archivos estáticos del frontend
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")
```

**Cambiar todas las rutas de API (agregar prefijo `/api/`):**
```python
# Cambiar de:
@app.post("/process-audio")
# A:
@app.post("/api/process-audio")

# Cambiar de:
@app.post("/process-text")
# A:
@app.post("/api/process-text")

# Cambiar de:
@app.get("/health")
# A:
@app.get("/api/health")

# Cambiar de:
@app.get("/stats")
# A:
@app.get("/api/stats")
```

**Reemplazar el endpoint `@app.get("/")` actual:**
```python
@app.get("/")
async def serve_frontend():
    return FileResponse("static/index.html")

# Manejar todas las rutas que no sean API (para React Router)
@app.get("/{path:path}")
async def serve_spa(path: str):
    # Si es una ruta de API, no interceptar
    if path.startswith("api/") or path.startswith("docs") or path.startswith("redoc"):
        raise HTTPException(status_code=404)
    return FileResponse("static/index.html")
```

### 2. Modificar `frontend/src/App.jsx`

**Cambiar la configuración de API:**
```javascript
// Cambiar de:
const API_BASE_URL = 'http://localhost:8000';

// A:
const API_BASE_URL = '';  // Usar URL relativa
```

**Actualizar las llamadas fetch:**
```javascript
// Cambiar de:
fetch(`${API_BASE_URL}/process-text`, {
// A:
fetch(`${API_BASE_URL}/api/process-text`, {

// Cambiar de:
fetch(`${API_BASE_URL}/process-audio`, {
// A:
fetch(`${API_BASE_URL}/api/process-audio`, {
```

## 📁 Archivos Nuevos a Crear

### 1. Crear `Dockerfile` (en raíz del proyecto):
```dockerfile
# Construir frontend
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Configurar backend
FROM python:3.11-slim
WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código backend
COPY *.py ./

# Copiar frontend compilado
COPY --from=frontend-build /app/frontend/dist ./static

# Crear directorio uploads
RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Crear `fly.toml` (en raíz del proyecto):
```toml
app = "tu-nombre-app"
primary_region = "mia"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1

[mounts]
  source = "uploads_vol"
  destination = "/app/uploads"
```

## 🚀 Pasos para Deploy

### 1. Instalar flyctl
```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Login a Fly.io
```bash
flyctl auth login
```

### 3. Modificar archivos
- [ ] Modificar `api.py` según los cambios arriba
- [ ] Modificar `frontend/src/App.jsx` según los cambios arriba
- [ ] Crear `Dockerfile` en la raíz
- [ ] Crear `fly.toml` en la raíz

### 4. Probar localmente (opcional)
```bash
# Construir y probar el contenedor
docker build -t tu-app .
docker run -p 8000:8000 tu-app
```

### 5. Deploy a Fly.io
```bash
# Inicializar (cambiar tu-nombre-app por el nombre que querés)
flyctl launch --name tu-nombre-app --no-deploy

# Configurar secretos
flyctl secrets set GOOGLE_API_KEY="tu-clave-de-google"
flyctl secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", "project_id": "tu-proyecto", ...}'

# Crear volumen para uploads
flyctl volumes create uploads_vol --region mia --size 1

# Deploy
flyctl deploy
```

## 🔑 Variables de Entorno Necesarias

### GOOGLE_API_KEY
Tu clave de API de Google para Gemini.

### GOOGLE_APPLICATION_CREDENTIALS_JSON
El contenido completo del archivo JSON de credenciales de Google Cloud. Ejemplo:
```json
{
  "type": "service_account",
  "project_id": "tu-proyecto",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## 🎉 Resultado Final

Una vez deployado:
- **URL única**: `tu-nombre-app.fly.dev`
- **Frontend**: Se abre directamente en esa URL
- **API**: Funciona en `tu-nombre-app.fly.dev/api/process-audio`
- **Funciona en el celular**: Abrís la URL desde cualquier dispositivo
- **Tu amigo puede probar**: Solo le pasás el link

## 🔧 Comandos Útiles Post-Deploy

```bash
# Ver logs
flyctl logs

# Ver estado
flyctl status

# Redeploy después de cambios
flyctl deploy

# Abrir la app en el navegador
flyctl open
```

## 🐛 Troubleshooting

### Si algo no funciona:
1. **Revisar logs**: `flyctl logs`
2. **Verificar secretos**: `flyctl secrets list`
3. **Probar endpoints**: `curl https://tu-app.fly.dev/api/health`

### Errores comunes:
- **404 en rutas**: Verificar que el catch-all esté configurado
- **API no responde**: Verificar que las rutas tengan prefijo `/api/`
- **Credenciales**: Verificar que `GOOGLE_API_KEY` esté configurado

## 📱 Demo Ready

Una vez completado:
- [ ] Abrís `tu-app.fly.dev` en tu celular
- [ ] Probás que funcione la transcripción
- [ ] Le mandás el link a tu amigo
- [ ] ¡Listo para la demo!

---

**Tiempo estimado**: 30-45 minutos para todo el proceso. 