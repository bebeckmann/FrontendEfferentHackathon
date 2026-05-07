# FrontendEfferentHackathon
Frontend for Efferent Hackathon

Test Github connection Benedikt

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The app calls the Render backend directly. Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_API_BASE_URL=https://backendefferenthackathon.onrender.com
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_FAST_MODEL=openai/gpt-4o-mini
NEXT_PUBLIC_REASONING_MODEL=openai/o3
NEXT_PUBLIC_TTS_MODEL=openai/gpt-4o-mini-tts-2025-12-15
NEXT_PUBLIC_TTS_VOICE=nova
```

## Deploy To Vercel

1. Import this repository into Vercel as a Next.js project.
2. Set these Environment Variables in Vercel:

```bash
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=https://backendefferenthackathon.onrender.com
NEXT_PUBLIC_FAST_MODEL=openai/gpt-4o-mini
NEXT_PUBLIC_REASONING_MODEL=openai/o3
NEXT_PUBLIC_TTS_MODEL=openai/gpt-4o-mini-tts-2025-12-15
NEXT_PUBLIC_TTS_VOICE=nova
```

3. Deploy.

The frontend calls `https://backendefferenthackathon.onrender.com/api/chat` with `multipart/form-data` fields `message`, `session_id`, `model`, and `model_profile`. The response can contain `answer` plus either `sources` or the older `images` field.

Answer playback calls `POST /api/tts` on the same Agent API with English text plus `model`, `voice`, and `response_format`. That backend route should call OpenRouter server-side, for example `POST https://openrouter.ai/api/v1/audio/speech`, and return either raw `audio/*` bytes or JSON with `data_url`/`base64`.

Make sure the Render backend has `FRONTEND_ORIGIN` set to your deployed Vercel origin, otherwise browser CORS will block requests. Example:

```bash
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
```

## Planning Documents

- [Framework decision](docs/01-framework-decision.md)
- [Product and UX spec](docs/02-product-ux-spec.md)
- [API contract](docs/03-api-contract.md)
- [Implementation plan](docs/04-implementation-plan.md)
