import os
import google.genai as genai
import asyncio
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner


import warnings
warnings.filterwarnings("ignore")

import logging
logging.basicConfig(level=logging.ERROR)

print("Libraries imported.")

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

# Usar el texto real transcripto
texto_transcripto = transcribe_audio("test_audio.wav")
print("Parseo Gemini:", parsear_con_gemini(texto_transcripto))