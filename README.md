# FrontendEfferentHackathon
Frontend for Efferent Hackathon

Test Github connection Benedikt

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The app uses mock responses by default so the frontend is usable before the Python backend exists. To connect the backend, copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=false
```

## Python Backend

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Create `backend/.env` from `backend/.env.example` and set `OPENROUTER_API_KEY`. The voice endpoint is `POST /api/runs/audio` and uses `openai/whisper-large-v3` through OpenRouter Speech-to-Text.

## Planning Documents

- [Framework decision](docs/01-framework-decision.md)
- [Product and UX spec](docs/02-product-ux-spec.md)
- [API contract](docs/03-api-contract.md)
- [Implementation plan](docs/04-implementation-plan.md)
