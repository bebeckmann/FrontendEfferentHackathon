from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from typing import Any

import requests


DEFAULT_ASR_URL = "https://openrouter.ai/api/v1/audio/transcriptions"
DEFAULT_ASR_MODEL = "openai/whisper-large-v3"


class TranscriptionError(RuntimeError):
    pass


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    language: str | None
    model: str
    usage: dict[str, Any] | None
    generation_id: str | None


def transcribe_audio(audio_bytes: bytes, audio_format: str, language: str | None = None) -> TranscriptionResult:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise TranscriptionError("OPENROUTER_API_KEY is not configured.")

    model = os.getenv("OPENROUTER_ASR_MODEL", DEFAULT_ASR_MODEL)
    url = os.getenv("OPENROUTER_ASR_URL", DEFAULT_ASR_URL)
    encoded_audio = base64.b64encode(audio_bytes).decode("ascii")

    payload: dict[str, Any] = {
        "model": model,
        "input_audio": {
            "data": encoded_audio,
            "format": audio_format,
        },
    }
    if language:
        payload["language"] = language

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
        raise TranscriptionError(f"OpenRouter request failed: {exc}") from exc

    if response.status_code >= 400:
        raise TranscriptionError(f"OpenRouter ASR failed with {response.status_code}: {safe_response_text(response)}")

    try:
        data = response.json()
    except ValueError as exc:
        raise TranscriptionError("OpenRouter returned invalid JSON.") from exc

    transcript = data.get("text")
    if not isinstance(transcript, str) or not transcript.strip():
        raise TranscriptionError("OpenRouter ASR response did not contain transcript text.")

    return TranscriptionResult(
        text=transcript.strip(),
        language=language,
        model=model,
        usage=data.get("usage") if isinstance(data.get("usage"), dict) else None,
        generation_id=response.headers.get("X-Generation-Id"),
    )


def audio_format_from_content_type(content_type: str | None, filename: str | None) -> str:
    normalized = (content_type or "").split(";")[0].lower().strip()
    by_content_type = {
        "audio/webm": "webm",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/mp4": "mp4",
        "audio/m4a": "m4a",
        "audio/aac": "aac",
        "audio/ogg": "ogg",
        "audio/flac": "flac",
        "audio/aiff": "aiff",
        "audio/x-aiff": "aiff",
    }
    if normalized in by_content_type:
        return by_content_type[normalized]

    extension = (filename or "").rsplit(".", 1)[-1].lower()
    if extension in {"webm", "wav", "mp3", "mp4", "m4a", "aac", "ogg", "flac", "aiff", "aif"}:
        if extension == "aif":
            return "aiff"
        return extension

    return "webm"


def language_from_locale(locale: str | None) -> str | None:
    if not locale:
        return None

    language = locale.split("-", 1)[0].lower().strip()
    if len(language) == 2 and language.isalpha():
        return language

    return None


def safe_response_text(response: requests.Response) -> str:
    text = response.text.strip()
    if len(text) > 600:
        return f"{text[:600]}..."
    return text
