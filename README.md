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
```

## Deploy To Vercel

1. Import this repository into Vercel as a Next.js project.
2. Set these Environment Variables in Vercel:

```bash
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=https://backendefferenthackathon.onrender.com
NEXT_PUBLIC_FAST_MODEL=openai/gpt-4o-mini
NEXT_PUBLIC_REASONING_MODEL=openai/o3
```

3. Deploy.

The frontend calls `https://backendefferenthackathon.onrender.com/api/chat` with `multipart/form-data` fields `message`, `session_id`, `model`, and `model_profile`. The response can contain `answer` plus either `sources` or the older `images` field.
Voice input and answer playback run in the browser via Web Speech APIs, so the Vercel frontend does not need an `OPENROUTER_API_KEY`.

Make sure the Render backend has `FRONTEND_ORIGIN` set to your deployed Vercel origin, otherwise browser CORS will block requests. Example:

```bash
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
```

## Planning Documents

- [Framework decision](docs/01-framework-decision.md)
- [Product and UX spec](docs/02-product-ux-spec.md)
- [API contract](docs/03-api-contract.md)
- [Implementation plan](docs/04-implementation-plan.md)
