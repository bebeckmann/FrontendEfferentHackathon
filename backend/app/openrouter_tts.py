from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import requests


DEFAULT_TTS_URL = "https://api.openai.com/v1/audio/speech"
DEFAULT_TTS_MODEL = "gpt-4o-mini-tts"
DEFAULT_TTS_VOICE = "marin"
DEFAULT_TTS_FORMAT = "mp3"


class TextToSpeechError(RuntimeError):
    pass


@dataclass(frozen=True)
class TextToSpeechResult:
    audio_bytes: bytes
    content_type: str
    model: str
    voice: str
    response_format: str
    usage: dict[str, Any] | None
    generation_id: str | None


def text_to_speech(
    text: str,
    voice: str | None = None,
    response_format: str | None = None,
    instructions: str | None = None,
    speed: float | None = None,
) -> TextToSpeechResult:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise TextToSpeechError("OPENAI_API_KEY is not configured.")

    normalized_text = text.strip()
    if not normalized_text:
        raise TextToSpeechError("Text is empty.")

    model = os.getenv("OPENAI_TTS_MODEL", DEFAULT_TTS_MODEL)
    url = os.getenv("OPENAI_TTS_URL", DEFAULT_TTS_URL)
    selected_voice = voice or os.getenv("OPENAI_TTS_VOICE", DEFAULT_TTS_VOICE)
    selected_format = response_format or os.getenv("OPENAI_TTS_FORMAT", DEFAULT_TTS_FORMAT)

    payload: dict[str, Any] = {
        "model": model,
        "voice": selected_voice,
        "input": normalized_text,
        "response_format": selected_format,
    }

    if instructions:
        payload["instructions"] = instructions

    if speed is not None:
        payload["speed"] = speed

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
        raise TextToSpeechError(f"OpenAI TTS request failed: {exc}") from exc

    if response.status_code >= 400:
        raise TextToSpeechError(f"OpenAI TTS failed with {response.status_code}: {safe_response_text(response)}")

    audio_bytes = response.content
    if not audio_bytes:
        raise TextToSpeechError("OpenAI TTS response did not contain audio bytes.")

    return TextToSpeechResult(
        audio_bytes=audio_bytes,
        content_type=content_type_from_audio_format(selected_format),
        model=model,
        voice=selected_voice,
        response_format=selected_format,
        usage=None,
        generation_id=response.headers.get("X-Generation-Id"),
    )


def content_type_from_audio_format(audio_format: str) -> str:
    normalized = audio_format.lower().strip()

    by_format = {
        "mp3": "audio/mpeg",
        "opus": "audio/opus",
        "aac": "audio/aac",
        "flac": "audio/flac",
        "wav": "audio/wav",
        "pcm": "audio/pcm",
    }

    return by_format.get(normalized, "application/octet-stream")


def safe_response_text(response: requests.Response) -> str:
    text = response.text.strip()
    if len(text) > 600:
        return f"{text[:600]}..."
    return text