# 🚀 Plan: Microservicio/API HTTP para Procesamiento de Audio

## 📋 **OBJETIVO**
Crear una API HTTP con FastAPI que procese archivos de audio y retorne órdenes estructuradas usando nuestro agente ADK.

---

## 🎯 **ESPECIFICACIONES FINALES**

### **Respuesta JSON Objetivo:**
```json
{
  "status": "success",
  "transcript": "le acabo de vender 20 cajones de tomates almita a Juan Carlos a 5.500 pesos el cajón",
  "order": {
    "tipo": "orden",
    "cliente": "Juan Carlos", 
    "items": [
      {
        "producto": "tomates almita",
        "cantidad": 20,
        "unidad": "cajones",
        "precio_unitario": 5500,
        "precio_total": 110000
      }
    ],
    "fecha": "2025-01-27T10:30:00Z"
  },
  "ticket_id": "TKT-1234",
  "processing_time_ms": 2340
}
```

---

## 📋 **PLAN PASO A PASO**

### **FASE 1: Preparación del Entorno (30 min)**

#### **Paso 1.1: Instalar dependencias**
```bash
pip install fastapi uvicorn python-multipart aiofiles
```

**¿Qué hace cada una?**
- `fastapi`: Framework web moderno y async
- `uvicorn`: Servidor ASGI para correr FastAPI
- `python-multipart`: Para manejar file uploads
- `aiofiles`: Para manejo asíncrono de archivos

#### **Paso 1.2: Estructura del proyecto**
```
Google ADK/
├── main.py                 # Agente ADK (existente)
├── api.py                  # Nueva: API HTTP con FastAPI  
├── .env                    # Credenciales (existente)
├── next-steps.md          # Este archivo
├── requirements.txt       # Nueva: Dependencias
└── uploads/               # Nueva: Carpeta temporal para archivos
```

---

### **FASE 2: Mejorar el Agente ADK (45 min)**

#### **Paso 2.1: Modificar parse_order_tool**
**Problema actual:** No extrae precios ni fecha

**Solución:** Mejorar el prompt de Gemini para extraer:
- Precio unitario
- Cantidad × precio = precio total  
- Fecha actual (timestamp)

#### **Paso 2.2: Crear función wrapper para la API**
```python
async def process_audio_for_api(audio_path: str) -> dict:
    """
    Wrapper que procesa audio y retorna JSON completo para la API
    """
    # 1. Usar agente ADK existente
    # 2. Calcular pricing
    # 3. Agregar timestamp
    # 4. Retornar JSON estructurado
```

---

### **FASE 3: Crear API con FastAPI (60 min)**

#### **Paso 3.1: Endpoint principal**
```python
@app.post("/process-audio")
async def process_audio_endpoint(audio_file: UploadFile = File(...)):
    # 1. Validar archivo (WAV, tamaño < 10MB)
    # 2. Guardar temporalmente
    # 3. Procesar con agente ADK  
    # 4. Cleanup archivo temporal
    # 5. Retornar JSON
```

#### **Paso 3.2: Endpoints auxiliares**
```python
@app.get("/")                    # Health check
@app.get("/health")              # Status de la API
@app.post("/process-text")       # Para testing sin audio
```

#### **Paso 3.3: Manejo de errores**
- Archivos no válidos
- Errores de transcripción
- Fallos del agente ADK
- Timeouts

---

### **FASE 4: Testing Local (30 min)**

#### **Paso 4.1: Correr la API**
```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

#### **Paso 4.2: Testing con curl**
```bash
curl -X POST "http://localhost:8000/process-audio" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "audio_file=@test_audio.wav"
```

#### **Paso 4.3: Documentación automática**
- Abrir: `http://localhost:8000/docs` (Swagger UI)
- Probar endpoints interactivamente

---

### **FASE 5: Preparación para Deploy (45 min)**

#### **Paso 5.1: Crear Dockerfile**
```dockerfile
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### **Paso 5.2: Configurar fly.io**
```bash
fly launch
fly deploy
```

#### **Paso 5.3: Variables de entorno en fly.io**
```bash
fly secrets set GOOGLE_API_KEY=...
fly secrets set GOOGLE_APPLICATION_CREDENTIALS=...
```

---

## ⚡ **ORDEN DE EJECUCIÓN**

### **Sesión 1 (2 horas):**
1. ✅ Instalar dependencias
2. ✅ Modificar agente ADK (precios + fecha)
3. ✅ Crear api.py básico
4. ✅ Testing local

### **Sesión 2 (1 hora):**
1. ✅ Pulir manejo de errores
2. ✅ Deploy en fly.io
3. ✅ Testing en producción

---

## 🔧 **CONSIDERACIONES TÉCNICAS**

### **Archivos temporales:**
- Guardar en `/tmp` o `uploads/`
- Cleanup automático después de procesar

### **Performance:**
- Async/await en toda la cadena
- Streaming de archivos grandes
- Timeout de 30s por request

### **Monitoreo:**
- Logs estructurados
- Tiempo de procesamiento
- Rate de errores

### **Límites:**
- Archivos WAV < 10MB
- 60 requests/minuto por IP

---

## 📋 **CHECKLIST FINAL**

- [ ] FastAPI instalado y funcionando
- [ ] Endpoint `/process-audio` operativo
- [ ] JSON response con precios y fecha
- [ ] Testing local exitoso
- [ ] Dockerfile creado
- [ ] Deploy en fly.io
- [ ] Health checks funcionando
- [ ] Documentación en `/docs`

---

**🚀 ¿Listo para empezar con la Fase 1?** 