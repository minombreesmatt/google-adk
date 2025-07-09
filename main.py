import os
import google.genai as genai
import asyncio
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.adk.tools import FunctionTool, ToolContext
from typing import Dict, Any

# Cargar variables de entorno del archivo .env
from dotenv import load_dotenv
load_dotenv()

import warnings
warnings.filterwarnings("ignore")

import logging
logging.basicConfig(level=logging.ERROR)

print("Libraries imported.")
print(f"GOOGLE_API_KEY configurada: {'✅' if os.getenv('GOOGLE_API_KEY') else '❌'}")
print(f"GOOGLE_APPLICATION_CREDENTIALS configurada: {'✅' if os.getenv('GOOGLE_APPLICATION_CREDENTIALS') else '❌'}")

from google.genai import types
from google.cloud import speech

print("Gemini and Speech-to-Text imports: OK")

from google.cloud import speech

def transcribe_audio(audio_path: str) -> str:
    from google.cloud import speech
    client = speech.SpeechClient()
    with open(audio_path, "rb") as audio_file:
        content = audio_file.read()

    audio = speech.RecognitionAudio(content=content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="es-ES",
    )

    try:
        response = client.recognize(config=config, audio=audio)
        print("API response:", response)
        transcript = " ".join([result.alternatives[0].transcript for result in response.results])
        return transcript
    except Exception as e:
        print("Error en transcripción:", e)
        return ""

# Esta parte se movió abajo para evitar duplicación
# Example usage:
# print(transcribe_audio("test_audio.wav"))

import json
import re

import google.genai as genai
import json
import re

def parsear_con_gemini(texto: str) -> dict:
    prompt = f"""
Analiza el siguiente texto. Si es un pedido de cliente, devuelve un JSON con los campos:
tipo: "orden", cliente, items: [{{producto, cantidad, unidad}}].
Si es un ingreso de mercadería, devuelve:
tipo: "ingreso", proveedor, items: [{{producto, cantidad, unidad}}].
Si no entiende, devuelve tipo: "desconocido".
Texto: '{texto}'
Solo responde con el JSON, sin explicaciones.
"""
    
    try:
        import litellm
        
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
            return json.loads(json_match.group())
        else:
            return {"tipo": "error", "error": "No se encontró JSON", "raw": response_text}
            
    except Exception as e:
        return {"tipo": "error", "error": str(e)}

# =============================================================================
# TOOLS PARA EL AGENTE ADK
# =============================================================================

# Variables globales para mantener estado entre tools
session_state = {}

@FunctionTool
def transcribe_audio_tool(audio_path: str) -> str:
    """
    Transcribe audio from a file to text using Google Speech-to-Text.
    
    Args:
        audio_path: Path to the audio file to transcribe
        
    Returns:
        Transcribed text in Spanish
    """
    from google.cloud import speech
    client = speech.SpeechClient()
    
    try:
        with open(audio_path, "rb") as audio_file:
            content = audio_file.read()

        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="es-ES",
        )

        response = client.recognize(config=config, audio=audio)
        transcript = " ".join([result.alternatives[0].transcript for result in response.results])
        
        # Guardar el transcript en el estado global
        session_state["last_transcript"] = transcript
        
        return transcript
        
    except Exception as e:
        return f"Error en transcripción: {str(e)}"

@FunctionTool
def parse_order_tool(texto: str) -> Dict[str, Any]:
    """
    Parse transcribed text into structured order data using Gemini.
    
    Args:
        texto: Text to parse (usually from transcription)
        
    Returns:
        Structured order data as dictionary with prices and totals
    """
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

Texto a analizar: '{texto}'

Responde SOLO con el JSON, sin explicaciones.
"""
    
    try:
        import litellm
        
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
            parsed_data = json.loads(json_match.group())
            
            # Guardar la orden parseada en el estado global
            session_state["last_order"] = parsed_data
            
            return parsed_data
        else:
            return {"tipo": "error", "error": "No se encontró JSON", "raw": response_text}
            
    except Exception as e:
        return {"tipo": "error", "error": str(e)}

@FunctionTool
def send_order_tool(order_data: Dict[str, Any]) -> str:
    """
    Send order data to the sales endpoint (mocked for now).
    
    Args:
        order_data: Structured order data from parse_order_tool
        
    Returns:
        Confirmation message
    """
    # Por ahora, solo mockeamos la respuesta
    if order_data.get("tipo") == "orden":
        ticket_id = f"TKT-{hash(str(order_data)) % 10000:04d}"
        session_state["last_ticket_id"] = ticket_id
        return f"✅ Orden creada exitosamente. Ticket ID: {ticket_id}"
    elif order_data.get("tipo") == "ingreso":
        receipt_id = f"RCP-{hash(str(order_data)) % 10000:04d}"
        session_state["last_receipt_id"] = receipt_id
        return f"✅ Ingreso de mercadería registrado. Recibo ID: {receipt_id}"
    else:
        return "❌ Error: No se pudo procesar la orden"

# =============================================================================
# AGENTE ADK
# =============================================================================

async def create_and_run_agent():
    """
    Crea y ejecuta el agente ADK con los tools configurados.
    """
    
    # 1. Configurar el modelo LiteLLM con Gemini
    model = LiteLlm(
        model="gemini/gemini-1.5-flash",
        api_key=os.getenv("GOOGLE_API_KEY")
    )
    
    # 2. Crear el servicio de sesiones
    session_service = InMemorySessionService()
    
    # 3. Crear el agente con los tools
    agent = Agent(
        model=model,
        name='audio_processor_agent',
        instruction="""
Eres un asistente especializado en procesar pedidos de audio para una empresa de ventas.

Tu trabajo es:
1. Recibir archivos de audio con pedidos de clientes
2. Transcribir el audio a texto
3. Parsear el texto para extraer información estructurada
4. Enviar la orden al sistema de ventas

Usa los tools disponibles en este orden:
- transcribe_audio_tool: para convertir audio a texto
- parse_order_tool: para extraer datos estructurados del texto
- send_order_tool: para enviar la orden al sistema

Siempre sé amigable y confirmá los detalles con el usuario antes de enviar la orden.
Responde en español.
""",
        description="Agente especializado en procesar pedidos de audio para empresas de ventas",
        tools=[transcribe_audio_tool, parse_order_tool, send_order_tool]
    )
    
    # 4. Crear el runner
    runner = Runner(agent=agent, app_name="audio_processor_app", session_service=session_service)
    
    return runner

async def process_audio_with_agent(audio_path: str, user_message: str = None):
    """
    Procesa un archivo de audio usando el agente ADK.
    
    Args:
        audio_path: Path al archivo de audio
        user_message: Mensaje opcional del usuario
    """
    
    # Crear el runner del agente
    runner = await create_and_run_agent()
    
    # Mensaje del usuario
    if user_message is None:
        user_message = f"Por favor procesa este archivo de audio: {audio_path}"
    
    # Ejecutar el agente
    print(f"🎯 Procesando con agente ADK: {audio_path}")
    print(f"💬 Mensaje del usuario: {user_message}")
    print("-" * 50)
    
    try:
        # Crear una sesión
        session = await runner.session_service.create_session(
            app_name="audio_processor_app",
            user_id="user123",
            session_id="session123"
        )
        
        # Preparar el contenido del mensaje
        from google.genai import types
        content = types.Content(role='user', parts=[types.Part(text=user_message)])
        
        # Ejecutar el agente con el mensaje del usuario
        events = runner.run_async(
            user_id="user123",
            session_id="session123",
            new_message=content
        )
        
        print("🤖 Respuesta del agente:")
        
        # Procesar los eventos
        final_response = ""
        async for event in events:
            if event.content and event.content.parts:
                if text := ''.join(part.text or '' for part in event.content.parts):
                    print(f'[{event.author}]: {text}')
                    if event.author == 'model':
                        final_response = text
        
        return final_response
        
    except Exception as e:
        print(f"❌ Error ejecutando el agente: {e}")
        return None

# =============================================================================
# TESTING DE FUNCIONES ORIGINALES
# =============================================================================

# Comentado para evitar ejecución automática
# texto_transcripto = transcribe_audio("test_audio.wav")
# print("Parseo Gemini:", parsear_con_gemini(texto_transcripto))

# =============================================================================
# FUNCIÓN WRAPPER PARA LA API
# =============================================================================

async def process_audio_for_api(audio_path: str) -> dict:
    """
    Wrapper que procesa audio y retorna JSON completo para la API.
    Incluye transcript, order, ticket_id, timestamp y tiempo de procesamiento.
    
    Args:
        audio_path: Path al archivo de audio a procesar
        
    Returns:
        JSON completo con toda la información para la API
    """
    import time
    import json
    import re
    from datetime import datetime, timezone
    
    start_time = time.time()
    
    try:
        # 1. Transcribir el audio
        transcript = transcribe_audio(audio_path)
        if not transcript:
            return {
                "status": "error",
                "error": "No se pudo transcribir el audio",
                "processing_time_ms": int((time.time() - start_time) * 1000)
            }
        
        # 2. Parsear con Gemini (usando el prompt mejorado)
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

Texto a analizar: '{transcript}'

Responde SOLO con el JSON, sin explicaciones.
"""
        
        try:
            import litellm
            
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
                
        except Exception as e:
            order_data = {"tipo": "error", "error": str(e)}
        
        if order_data.get("tipo") == "error":
            return {
                "status": "error", 
                "transcript": transcript,
                "error": order_data.get("error", "Error desconocido en el parsing"),
                "processing_time_ms": int((time.time() - start_time) * 1000)
            }
        
        # 3. Agregar timestamp
        order_data["fecha"] = datetime.now(timezone.utc).isoformat()
        
        # 4. Generar ticket ID
        ticket_id = f"TKT-{hash(str(order_data)) % 10000:04d}"
        
        # 5. Calcular tiempo de procesamiento
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # 6. Retornar JSON completo
        return {
            "status": "success",
            "transcript": transcript,
            "order": order_data,
            "ticket_id": ticket_id,
            "processing_time_ms": processing_time_ms
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": f"Error inesperado: {str(e)}",
            "processing_time_ms": int((time.time() - start_time) * 1000)
        }

# =============================================================================
# FUNCIÓN MAIN PARA TESTING
# =============================================================================

async def main():
    """
    Función principal para probar el agente ADK.
    """
    print("🚀 Iniciando prueba del agente ADK...")
    print("=" * 60)
    
    # Probar el agente con el archivo de audio
    result = await process_audio_with_agent("test_audio.wav")
    
    if result:
        print("=" * 60)
        print("✅ Agente ADK funcionando correctamente!")
    else:
        print("=" * 60)
        print("❌ Error en el agente ADK")
        
    # NUEVO: Probar la función wrapper para la API
    print("\n" + "=" * 60)
    print("🧪 Probando función wrapper para API...")
    print("=" * 60)
    
    api_result = await process_audio_for_api("test_audio.wav")
    print("📄 Resultado JSON para API:")
    import json
    print(json.dumps(api_result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    # Comentar estas líneas para evitar que se ejecuten automáticamente
    # print("Testing funciones originales...")
    # texto_transcripto = transcribe_audio("test_audio.wav")
    # print("Parseo Gemini:", parsear_con_gemini(texto_transcripto))
    
    # Ejecutar el agente ADK
    print("🔥 Ejecutando agente ADK...")
    asyncio.run(main())