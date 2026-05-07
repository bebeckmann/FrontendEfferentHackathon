from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

import requests


DEFAULT_TTS_URL = "https://openrouter.ai/api/v1/audio/speech"
DEFAULT_TTS_MODEL = "openai/gpt-4o-mini-tts"
DEFAULT_TTS_VOICE = "marin"
DEFAULT_TTS_FORMAT = "mp3"

AudioFormat = Literal["mp3", "wav", "opus", "aac", "flac"]


class TextToSpeechError(RuntimeError):
    pass


@dataclass(frozen=True)
class TextToSpeechResult:
    audio_bytes: bytes
    content_type: str
    model: str
    voice: str
    format: str
    generation_id: str | None


def synthesize_speech(
    text: str,
    *,
    voice: str | None = None,
    audio_format: AudioFormat = DEFAULT_TTS_FORMAT,
) -> TextToSpeechResult:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise TextToSpeechError("OPENROUTER_API_KEY is not configured.")

    cleaned_text = text.strip()
    if not cleaned_text:
        raise TextToSpeechError("TTS input text is empty.")

    model = os.getenv("OPENROUTER_TTS_MODEL", DEFAULT_TTS_MODEL)
    url = os.getenv("OPENROUTER_TTS_URL", DEFAULT_TTS_URL)
    selected_voice = voice or os.getenv("OPENROUTER_TTS_VOICE", DEFAULT_TTS_VOICE)

    payload = {
        "model": model,
        "voice": selected_voice,
        "input": cleaned_text,
        "response_format": audio_format,
    }

    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=90,
        )
    except requests.RequestException as exc:
        raise TextToSpeechError(f"OpenRouter request failed: {exc}") from exc

    if response.status_code >= 400:
        raise TextToSpeechError(
            f"OpenRouter TTS failed with {response.status_code}: {safe_response_text(response)}"
        )

    audio_bytes = response.content
    if not audio_bytes:
        raise TextToSpeechError("OpenRouter TTS returned empty audio.")

    return TextToSpeechResult(
        audio_bytes=audio_bytes,
        content_type=content_type_for_audio_format(audio_format),
        model=model,
        voice=selected_voice,
        format=audio_format,
        generation_id=response.headers.get("X-Generation-Id"),
    )


def content_type_for_audio_format(audio_format: str) -> str:
    by_format = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "opus": "audio/opus",
        "aac": "audio/aac",
        "flac": "audio/flac",
    }
    return by_format.get(audio_format, "application/octet-stream")


def safe_response_text(response: requests.Response) -> str:
    text = response.text.strip()
    if len(text) > 600:
        return f"{text[:600]}..."
    return text