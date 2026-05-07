from __future__ import annotations

import os
import time
import uuid
from datetime import datetime, timezone
from typing import Annotated

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from .openrouter_asr import (
    TranscriptionError,
    audio_format_from_content_type,
    language_from_locale,
    transcribe_audio,
)
from .openai_tts import TextToSpeechError, text_to_speech

load_dotenv()

MAX_AUDIO_BYTES = 20 * 1024 * 1024
MAX_TTS_TEXT_LENGTH = 4096

app = FastAPI(title="Efferent Agent Backend", version="0.1.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://www.sepsis-analysis.online").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextToSpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TTS_TEXT_LENGTH)
    voice: str | None = None
    format: str | None = "mp3"
    instructions: str | None = None
    speed: float | None = Field(default=None, ge=0.25, le=4.0)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
            }
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/runs")
def create_text_run(payload: dict) -> dict:
    query = str(payload.get("query", "")).strip()
    if not query:
        raise api_error(400, "VALIDATION_FAILED", "Query is required.")

    started_at = time.perf_counter()

    return completed_run_response(
        query=query,
        transcript=None,
        answer_markdown=(
            "Text-Backend ist erreichbar. Die LangChain-Agent-Antwort ist hier noch ein Platzhalter. "
            "Die Voice-Pipeline verwendet bereits OpenRouter Whisper fuer ASR."
        ),
        latency_ms=elapsed_ms(started_at),
    )


@app.post("/api/runs/audio")
async def create_audio_run(
    audio: Annotated[UploadFile, File()],
    locale: Annotated[str | None, Form()] = None,
    clientRunId: Annotated[str | None, Form()] = None,
) -> dict:
    started_at = time.perf_counter()
    audio_bytes = await audio.read()

    if not audio_bytes:
        raise api_error(400, "AUDIO_EMPTY", "Die Audioaufnahme ist leer.")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise api_error(413, "AUDIO_TOO_LARGE", "Die Audioaufnahme ist zu gross.")

    audio_format = audio_format_from_content_type(audio.content_type, audio.filename)
    language = language_from_locale(locale)

    try:
        transcript = transcribe_audio(audio_bytes, audio_format, language)
    except TranscriptionError as exc:
        raise api_error(
            502,
            "ASR_FAILED",
            "Die Audioaufnahme konnte nicht transkribiert werden.",
            str(exc),
        ) from exc

    answer_markdown = (
        "Die ASR-Pipeline ist verbunden. Sobald der LangChain-Agent angeschlossen ist, "
        "wird das oben angezeigte echte Transkript als Query an den Agenten uebergeben und die Docling-Belege werden hier angezeigt."
    )

    return completed_run_response(
        query=transcript.text,
        transcript={
            "text": transcript.text,
            "language": transcript.language,
            "model": transcript.model,
            "generationId": transcript.generation_id,
        },
        answer_markdown=answer_markdown,
        latency_ms=elapsed_ms(started_at),
        asr_seconds=transcript.usage.get("seconds") if transcript.usage else None,
        run_id=clientRunId or None,
    )


@app.post("/api/tts")
def create_tts_audio(payload: TextToSpeechRequest) -> Response:
    text = payload.text.strip()

    if not text:
        raise api_error(400, "TTS_TEXT_EMPTY", "Der vorzulesende Text ist leer.")

    try:
        result = text_to_speech(
            text=text,
            voice=payload.voice,
            response_format=payload.format,
            instructions=payload.instructions,
            speed=payload.speed,
        )
    except TextToSpeechError as exc:
        raise api_error(
            502,
            "TTS_FAILED",
            "Die Audioantwort konnte nicht erzeugt werden.",
            str(exc),
        ) from exc

    return Response(
        content=result.audio_bytes,
        media_type=result.content_type,
        headers={
            "Cache-Control": "no-store",
            "X-TTS-Model": result.model,
            "X-TTS-Voice": result.voice,
            "X-TTS-Format": result.response_format,
        },
    )


@app.get("/api/runs/{run_id}")
def get_run(run_id: str) -> dict:
    return completed_run_response(
        query=f"Run {run_id}",
        transcript=None,
        answer_markdown="Persistente Run-History ist im Backend noch nicht implementiert.",
        latency_ms=0,
        run_id=run_id,
    )


def completed_run_response(
    query: str,
    transcript: dict | None,
    answer_markdown: str,
    latency_ms: int,
    asr_seconds: float | None = None,
    run_id: str | None = None,
) -> dict:
    return {
        "runId": run_id or f"run_{uuid.uuid4().hex[:16]}",
        "status": "completed",
        "query": query,
        "transcript": transcript,
        "answer": {
            "summary": "Voice Pipeline",
            "markdown": answer_markdown,
        },
        "evidence": [],
        "usage": {
            "asrSeconds": asr_seconds or 0,
            "agentLatencyMs": latency_ms,
        },
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


def api_error(status_code: int, code: str, message: str, detail: str | None = None) -> HTTPException:
    payload = {
        "error": {
            "code": code,
            "message": message,
        }
    }

    if detail:
        payload["error"]["details"] = {"cause": detail}

    return HTTPException(status_code=status_code, detail=payload)


def elapsed_ms(started_at: float) -> int:
    return int((time.perf_counter() - started_at) * 1000)