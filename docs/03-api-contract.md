# API Contract

## Boundary

The frontend calls same-origin `/api` endpoints. In local Python-agent development those endpoints can be mirrored by the Python backend, but Vercel deployment uses Next.js serverless route handlers. The server side owns:

- OpenRouter API keys.
- Speech-to-text requests.
- LangChain agent execution.
- Docling processing.
- Evidence image generation and storage.

The frontend sends text or audio input and renders the returned answer and evidence.

## Frontend Environment

On Vercel, leave `NEXT_PUBLIC_API_BASE_URL` empty so browser calls resolve to the deployed app origin.

Do not expose `OPENROUTER_API_KEY` in the frontend.

## Submit Text Query

`POST /api/runs`

Request:

```json
{
  "inputType": "text",
  "query": "Welche Risiken werden im Vertrag genannt?",
  "locale": "de-DE",
  "clientRunId": "optional-client-generated-id"
}
```

Response:

```json
{
  "runId": "run_01HX...",
  "status": "completed",
  "query": "Welche Risiken werden im Vertrag genannt?",
  "transcript": null,
  "answer": {
    "markdown": "Die wichtigsten Risiken sind ...",
    "summary": "Risiken im Vertrag"
  },
  "evidence": [
    {
      "id": "ev_001",
      "documentId": "doc_123",
      "documentName": "vertrag.pdf",
      "pageNumber": 4,
      "imageUrl": "https://backend.example/evidence/run_01HX/ev_001.png",
      "width": 1600,
      "height": 2263,
      "highlights": [
        {
          "id": "hl_001",
          "bbox": {
            "x": 240,
            "y": 520,
            "width": 820,
            "height": 150
          },
          "label": "Haftungsbeschränkung",
          "snippet": "Die Haftung ist begrenzt auf ...",
          "confidence": 0.89
        }
      ],
      "rationale": "Diese Passage nennt die Haftungsgrenze."
    }
  ],
  "usage": {
    "asrSeconds": 0,
    "agentLatencyMs": 4200
  },
  "createdAt": "2026-05-07T10:30:00Z"
}
```

## Submit Audio Query

`POST /api/runs/audio`

Use `multipart/form-data`.

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `audio` | file | yes | `webm`, `wav`, `mp3`, or `m4a` |
| `locale` | string | no | Example: `de-DE` |
| `clientRunId` | string | no | For idempotency/debugging |

Response shape is the same as `POST /api/runs`, but `transcript` contains the ASR result.

```json
{
  "runId": "run_01HY...",
  "status": "completed",
  "query": "Welche Risiken werden im Vertrag genannt?",
  "transcript": {
    "text": "Welche Risiken werden im Vertrag genannt?",
    "language": "de",
    "model": "openai/whisper-large-v3"
  },
  "answer": {
    "markdown": "Die wichtigsten Risiken sind ..."
  },
  "evidence": [],
  "createdAt": "2026-05-07T10:30:00Z"
}
```

## Get Existing Run

`GET /api/runs/{runId}`

Use this for deep links and reloads. Return the same response shape as a completed run.

## Error Response

```json
{
  "error": {
    "code": "ASR_FAILED",
    "message": "Die Audioaufnahme konnte nicht transkribiert werden.",
    "details": {
      "provider": "openrouter",
      "requestId": "optional-provider-request-id"
    }
  }
}
```

Recommended error codes:

- `VALIDATION_FAILED`
- `AUDIO_TOO_LARGE`
- `ASR_FAILED`
- `AGENT_FAILED`
- `NO_DOCUMENT_CONTEXT`
- `EVIDENCE_RENDER_FAILED`
- `RATE_LIMITED`
- `TIMEOUT`

## OpenRouter ASR Backend Note

The requested ASR URL is:

```text
https://openrouter.ai/api/v1/chat/completions
```

For this path, send base64-encoded audio inside a chat message using an `input_audio` content part and set `stream: false`. The backend should verify that the selected model supports audio input.

Conceptual payload:

```json
{
  "model": "openai/whisper-large-v3",
  "stream": false,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Transcribe this audio. Return only the transcript."
        },
        {
          "type": "input_audio",
          "input_audio": {
            "data": "BASE64_AUDIO",
            "format": "webm"
          }
        }
      ]
    }
  ]
}
```

Important: OpenRouter currently documents Whisper-style STT most directly via:

```text
POST https://openrouter.ai/api/v1/audio/transcriptions
```

with:

```json
{
  "model": "openai/whisper-large-v3",
  "input_audio": {
    "data": "BASE64_AUDIO",
    "format": "wav"
  },
  "language": "de"
}
```

If the hackathon requirement strictly says chat completions, keep the chat-completions integration. If reliability matters more, prefer `/api/v1/audio/transcriptions`.

## TypeScript DTOs

```ts
export type RunStatus = "queued" | "running" | "completed" | "failed";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EvidenceHighlight = {
  id: string;
  bbox: BoundingBox;
  label?: string;
  snippet?: string;
  confidence?: number;
};

export type EvidenceImage = {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  highlights: EvidenceHighlight[];
  rationale?: string;
};

export type AgentRunResponse = {
  runId: string;
  status: RunStatus;
  query: string;
  transcript?: {
    text: string;
    language?: string;
    model?: string;
  } | null;
  answer?: {
    markdown: string;
    summary?: string;
  };
  evidence: EvidenceImage[];
  usage?: {
    asrSeconds?: number;
    agentLatencyMs?: number;
  };
  createdAt: string;
};
```
