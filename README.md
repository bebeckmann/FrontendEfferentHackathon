# FrontendEfferentHackathon
Frontend for Efferent Hackathon

Test Github connection Benedikt

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The app now uses same-origin Next.js API routes by default, which is the same shape Vercel will deploy. Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_USE_MOCKS=false
OPENROUTER_API_KEY=...
```

## Python Backend

The Python backend is kept for local LangChain integration work. Vercel deployment does not require it because `/api/runs` and `/api/runs/audio` are implemented as Next.js serverless route handlers.

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Create `backend/.env` from `backend/.env.example` and set `OPENROUTER_API_KEY`. The voice endpoint is `POST /api/runs/audio` and uses `openai/whisper-large-v3` through OpenRouter Speech-to-Text.

## Deploy To Vercel

1. Import this repository into Vercel as a Next.js project.
2. Set these Environment Variables in Vercel:

```bash
OPENROUTER_API_KEY=...
OPENROUTER_ASR_MODEL=openai/whisper-large-v3
OPENROUTER_ASR_URL=https://openrouter.ai/api/v1/audio/transcriptions
OPENROUTER_SITE_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=
```

3. Deploy. The production app will call same-origin endpoints:

```text
/api/runs
/api/runs/audio
/api/runs/[runId]
/api/health
```

After deployment, open:

```text
https://your-vercel-domain.vercel.app/api/health
```

The response should include `"configured": true` under `asr`. If it is `false`, the production environment variable `OPENROUTER_API_KEY` is missing or the deployment was not redeployed after setting it.

Vercel Functions have a 4.5 MB request/response body limit, so the app caps uploaded audio at 4 MB and recordings at 45 seconds.

## Planning Documents

- [Framework decision](docs/01-framework-decision.md)
- [Product and UX spec](docs/02-product-ux-spec.md)
- [API contract](docs/03-api-contract.md)
- [Implementation plan](docs/04-implementation-plan.md)
