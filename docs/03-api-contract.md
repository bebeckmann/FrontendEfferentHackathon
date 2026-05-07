# API Contract

## Boundary

The Vercel frontend calls the Render FastAPI backend directly:

```text
https://backendefferenthackathon.onrender.com
```

The backend owns LangChain execution, OpenRouter credentials, text-to-speech synthesis, uploaded-image handling, and source generation. The frontend owns the chat UI, browser speech recognition, audio playback, PDF export, and rendering the returned answer and sources.

## Frontend Environment

```bash
NEXT_PUBLIC_API_BASE_URL=https://backendefferenthackathon.onrender.com
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_FAST_MODEL=openai/gpt-4o-mini
NEXT_PUBLIC_REASONING_MODEL=openai/o3
NEXT_PUBLIC_TTS_MODEL=openai/gpt-4o-mini-tts-2025-12-15
NEXT_PUBLIC_TTS_VOICE=nova
```

Do not expose `OPENROUTER_API_KEY` in the frontend.

## Health

`GET /health`

Expected backend response:

```json
{
  "status": "ok"
}
```

The frontend does not define local API routes.

## Submit Chat Query

`POST /api/chat`

Use `multipart/form-data`.

Fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `message` | string | yes | User text or browser-generated transcript |
| `session_id` | string | no | Stable browser session id |
| `model` | string | no | `openai/gpt-4o-mini` or `openai/o3` |
| `model_profile` | string | no | `fast` or `reasoning` |
| `images` | file[] | no | Optional research images |

Current backend response shape:

```json
{
  "answer": "The agent answer as markdown-compatible text.",
  "sources": [
    {
      "type": "image",
      "url": "data/success.png",
      "label": "Proof-of-concept image source"
    }
  ]
}
```

The frontend also remains compatible with the previous image response shape:

```json
{
  "answer": "The agent answer.",
  "images": [
    {
      "url": "https://backend.example/static/evidence/page.png",
      "caption": "Highlighted source image",
      "source": "page.png",
      "kind": "docling"
    }
  ],
  "warnings": [
    "Research-use only. Not for clinical diagnosis, triage, or treatment decisions."
  ]
}
```

Relative source URLs are resolved against the Render backend. A response URL like `data/success.png` is rendered as:

```text
https://backendefferenthackathon.onrender.com/static/data/success.png
```

## Model Selection

The UI exposes two modes:

| UI label | OpenRouter model id | Use |
| --- | --- | --- |
| `4o mini` | `openai/gpt-4o-mini` | Fast, lower-cost answers |
| `Reasoning` | `openai/o3` | Stronger multi-step reasoning |

For the model switch to affect generation, the backend should read the optional `model` form field and pass it into `build_agent`, instead of only using `OPENROUTER_MODEL` from the environment.

## Text To Speech

`POST /api/tts`

Request body:

```json
{
  "input": "English answer text to synthesize.",
  "text": "English answer text to synthesize.",
  "language": "en",
  "model": "openai/gpt-4o-mini-tts-2025-12-15",
  "voice": "nova",
  "response_format": "mp3"
}
```

The backend should call OpenRouter server-side, for example:

```text
POST https://openrouter.ai/api/v1/audio/speech
```

with the OpenRouter API key kept in backend environment variables. The frontend accepts either raw audio bytes:

```http
Content-Type: audio/mpeg
```

or JSON:

```json
{
  "mime_type": "audio/mpeg",
  "base64": "...",
  "data_url": "data:audio/mpeg;base64,...",
  "model": "openai/gpt-4o-mini-tts-2025-12-15",
  "voice": "nova"
}
```

## Frontend DTO

The frontend maps backend responses into an internal chat-run DTO:

```ts
export type AgentModelProfile = "fast" | "reasoning";

export type AgentModelOption = {
  id: string;
  label: string;
  shortLabel: string;
  profile: AgentModelProfile;
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
  status: "queued" | "running" | "completed" | "failed";
  query: string;
  model?: AgentModelOption;
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
