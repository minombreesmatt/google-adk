import os
import asyncio
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

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

print("Antes de transcribir")
print(transcribe_audio("test_audio.wav"))
print("Después de transcribir")
# Example usage:
# print(transcribe_audio("test_audio.wav"))