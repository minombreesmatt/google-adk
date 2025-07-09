import os
import time
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

import aiofiles
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Importar nuestras funciones del agente ADK
from main import process_audio_for_api, transcribe_audio, parsear_con_gemini

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURACIÓN DE LA APP
# =============================================================================

app = FastAPI(
    title="Tibo AI - Procesamiento de Audio",
    description="API para procesar pedidos de audio y convertirlos en órdenes estructuradas",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS para el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, cambiar por dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# CONFIGURACIÓN Y CONSTANTES
# =============================================================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac"}
REQUEST_TIMEOUT = 30  # 30 segundos

# Estado global para métricas
app_stats = {
    "requests_total": 0,
    "requests_success": 0,
    "requests_error": 0,
    "startup_time": datetime.now(timezone.utc).isoformat()
}

# =============================================================================
# MODELOS PYDANTIC
# =============================================================================

class ProcessTextRequest(BaseModel):
    text: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str

class StatsResponse(BaseModel):
    requests_total: int
    requests_success: int
    requests_error: int
    success_rate: float
    uptime_seconds: int
    startup_time: str

# =============================================================================
# FUNCIONES AUXILIARES
# =============================================================================

def validate_audio_file(file: UploadFile) -> None:
    """
    Valida que el archivo sea válido para procesamiento.
    
    Raises:
        HTTPException: Si el archivo no es válido
    """
    # Validar extensión
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de archivo no soportado. Formatos permitidos: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validar tamaño (esto se hace después de leer el archivo)
    if hasattr(file, 'size') and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Archivo muy grande. Tamaño máximo: {MAX_FILE_SIZE // (1024*1024)} MB"
        )

async def save_upload_file(upload_file: UploadFile) -> Path:
    """
    Guarda el archivo subido temporalmente.
    
    Returns:
        Path al archivo guardado
    """
    # Generar nombre único
    file_extension = Path(upload_file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Guardar archivo
    async with aiofiles.open(file_path, 'wb') as f:
        content = await upload_file.read()
        
        # Validar tamaño después de leer
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Archivo muy grande. Tamaño máximo: {MAX_FILE_SIZE // (1024*1024)} MB"
            )
        
        await f.write(content)
    
    return file_path

def cleanup_file(file_path: Path) -> None:
    """
    Elimina archivo temporal de forma segura.
    """
    try:
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Archivo temporal eliminado: {file_path}")
    except Exception as e:
        logger.warning(f"No se pudo eliminar archivo temporal {file_path}: {e}")

# =============================================================================
# MIDDLEWARE PARA MÉTRICAS
# =============================================================================

@app.middleware("http")
async def stats_middleware(request: Request, call_next):
    """
    Middleware para contar requests y manejar timeouts.
    """
    app_stats["requests_total"] += 1
    start_time = time.time()
    
    try:
        # Agregar timeout a requests largos
        response = await asyncio.wait_for(call_next(request), timeout=REQUEST_TIMEOUT)
        app_stats["requests_success"] += 1
        return response
    except asyncio.TimeoutError:
        app_stats["requests_error"] += 1
        logger.error(f"Request timeout en {request.url}")
        return JSONResponse(
            status_code=408,
            content={"status": "error", "error": "Request timeout"}
        )
    except Exception as e:
        app_stats["requests_error"] += 1
        logger.error(f"Error en request {request.url}: {e}")
        raise

# =============================================================================
# ENDPOINTS PRINCIPALES
# =============================================================================

@app.get("/", response_model=HealthResponse)
async def health_check():
    """
    Health check básico de la API.
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0"
    )

@app.get("/health", response_model=HealthResponse)
async def detailed_health():
    """
    Health check detallado con verificación de dependencias.
    """
    # Verificar que las credenciales estén configuradas
    google_api_key = os.getenv("GOOGLE_API_KEY")
    google_credentials = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    
    if not google_api_key or not google_credentials:
        raise HTTPException(
            status_code=503,
            detail="Credenciales de Google no configuradas correctamente"
        )
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0"
    )

@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """
    Estadísticas de la API.
    """
    total = app_stats["requests_total"]
    success_rate = (app_stats["requests_success"] / total * 100) if total > 0 else 0
    
    startup_time = datetime.fromisoformat(app_stats["startup_time"])
    uptime_seconds = int((datetime.now(timezone.utc) - startup_time).total_seconds())
    
    return StatsResponse(
        requests_total=total,
        requests_success=app_stats["requests_success"],
        requests_error=app_stats["requests_error"],
        success_rate=round(success_rate, 2),
        uptime_seconds=uptime_seconds,
        startup_time=app_stats["startup_time"]
    )

@app.post("/process-audio")
async def process_audio_endpoint(audio_file: UploadFile = File(...)):
    """
    Endpoint principal: procesa un archivo de audio y retorna la orden estructurada.
    
    Args:
        audio_file: Archivo de audio (WAV, MP3, M4A, FLAC) máximo 10MB
        
    Returns:
        JSON con transcripción, orden estructurada, ticket ID y métricas
    """
    file_path = None
    
    try:
        # 1. Validar archivo
        validate_audio_file(audio_file)
        
        # 2. Guardar archivo temporalmente
        file_path = await save_upload_file(audio_file)
        logger.info(f"Archivo guardado: {file_path}")
        
        # 3. Procesar con nuestro agente ADK
        result = await process_audio_for_api(str(file_path))
        
        # 4. Log del resultado
        if result.get("status") == "success":
            logger.info(f"Audio procesado exitosamente. Ticket: {result.get('ticket_id')}")
        else:
            logger.warning(f"Error procesando audio: {result.get('error')}")
        
        return result
        
    except HTTPException:
        # Re-lanzar HTTPExceptions tal como están
        raise
    except Exception as e:
        logger.error(f"Error inesperado procesando audio: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor: {str(e)}"
        )
    finally:
        # 5. Limpiar archivo temporal
        if file_path:
            cleanup_file(file_path)

@app.post("/process-text")
async def process_text_endpoint(request: ProcessTextRequest):
    """
    Endpoint para testing: procesa texto directamente sin audio.
    Útil para probar el parsing sin necesidad de archivos de audio.
    
    Args:
        request: Objeto con el texto a procesar
        
    Returns:
        JSON con la orden estructurada
    """
    try:
        start_time = time.time()
        
        # Parsear con Gemini usando el prompt mejorado
        import re
        import json
        import litellm
        
        prompt = f"""
Analiza el siguiente texto y extrae TODA la información disponible.

Si es un pedido de cliente, devuelve un JSON con:
{{
  "tipo": "orden",
  "cliente": "nombre del cliente",
  "items": [{{
    "producto": "nombre del producto",
    "cantidad": número,
    "unidad": "cajones/kilos/unidades/etc",
    "precio_unitario": precio por unidad (si se menciona),
    "precio_total": cantidad × precio_unitario (si se puede calcular)
  }}]
}}

Si es un ingreso de mercadería, devuelve:
{{
  "tipo": "ingreso", 
  "proveedor": "nombre del proveedor",
  "items": [{{
    "producto": "nombre del producto",
    "cantidad": número,
    "unidad": "cajones/kilos/unidades/etc",
    "precio_unitario": precio por unidad (si se menciona),
    "precio_total": cantidad × precio_unitario (si se puede calcular)
  }}]
}}

Si no entiendes el texto, devuelve: {{"tipo": "desconocido"}}

IMPORTANTE: 
- Si se menciona un precio, siempre inclúyelo como número sin símbolos ($)
- Calcula precio_total = cantidad × precio_unitario cuando sea posible
- Si no se menciona precio, omite los campos precio_unitario y precio_total

Texto a analizar: '{request.text}'

Responde SOLO con el JSON, sin explicaciones.
"""
        
        # Usar LiteLLM para llamar a Gemini
        response = litellm.completion(
            model="gemini/gemini-1.5-flash",
            messages=[{"role": "user", "content": prompt}],
            api_key=os.getenv("GOOGLE_API_KEY")
        )
        
        # Extraer el texto de la respuesta
        response_text = response.choices[0].message.content.strip()
        
        # Buscar JSON en la respuesta
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            order_data = json.loads(json_match.group())
        else:
            order_data = {"tipo": "error", "error": "No se encontró JSON", "raw": response_text}
        
        if order_data.get("tipo") == "error":
            return {
                "status": "error",
                "transcript": request.text,
                "error": order_data.get("error", "Error desconocido en el parsing"),
                "processing_time_ms": int((time.time() - start_time) * 1000)
            }
        
        # Agregar timestamp
        order_data["fecha"] = datetime.now(timezone.utc).isoformat()
        
        # Generar ticket ID
        ticket_id = f"TKT-{hash(str(order_data)) % 10000:04d}"
        
        # Calcular tiempo de procesamiento
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return {
            "status": "success",
            "transcript": request.text,
            "order": order_data,
            "ticket_id": ticket_id,
            "processing_time_ms": processing_time_ms
        }
        
    except Exception as e:
        logger.error(f"Error procesando texto: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando texto: {str(e)}"
        )

# =============================================================================
# MANEJADORES DE ERRORES GLOBALES
# =============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Manejador personalizado para HTTPExceptions.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": exc.detail,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Manejador para errores no controlados.
    """
    logger.error(f"Error no controlado en {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "error": "Error interno del servidor",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

# =============================================================================
# EVENTOS DE STARTUP/SHUTDOWN
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Evento de inicio de la aplicación.
    """
    logger.info("🚀 API de Tibo AI iniciada correctamente")
    logger.info(f"📁 Directorio de uploads: {UPLOAD_DIR.absolute()}")
    
    # Verificar credenciales
    google_api_key = os.getenv("GOOGLE_API_KEY")
    google_credentials = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    
    if google_api_key:
        logger.info("✅ GOOGLE_API_KEY configurada")
    else:
        logger.warning("❌ GOOGLE_API_KEY no configurada")
    
    if google_credentials:
        logger.info("✅ GOOGLE_APPLICATION_CREDENTIALS configurada")
    else:
        logger.warning("❌ GOOGLE_APPLICATION_CREDENTIALS no configurada")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Evento de cierre de la aplicación.
    """
    logger.info("🛑 API de Tibo AI cerrándose...")
    
    # Limpiar archivos temporales
    try:
        for file_path in UPLOAD_DIR.glob("*"):
            if file_path.is_file():
                file_path.unlink()
        logger.info("🧹 Archivos temporales limpiados")
    except Exception as e:
        logger.warning(f"Error limpiando archivos temporales: {e}")

# =============================================================================
# PUNTO DE ENTRADA
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Cargar variables de entorno
    from dotenv import load_dotenv
    load_dotenv()
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 