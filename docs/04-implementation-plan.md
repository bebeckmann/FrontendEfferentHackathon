# Implementation Plan

## Phase 1: App Foundation

Create the app with:

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Add:

```bash
npm install @tanstack/react-query zustand zod react-hook-form @hookform/resolvers lucide-react react-markdown
```

Optional UI layer:

```bash
npx shadcn@latest init
npx shadcn@latest add button textarea card dialog sheet tabs tooltip badge progress scroll-area
```

## Phase 2: File Structure

```text
frontend/
  src/
    app/
      layout.tsx
      page.tsx
      runs/
        [runId]/
          page.tsx
    components/
      query-composer.tsx
      audio-recorder.tsx
      answer-panel.tsx
      evidence-gallery.tsx
      evidence-viewer.tsx
      run-status.tsx
    lib/
      api-client.ts
      dto.ts
      errors.ts
      markdown.ts
    stores/
      composer-store.ts
```

## Phase 3: API Client

Implement:

- `submitTextRun(query: string): Promise<AgentRunResponse>`
- `submitAudioRun(audio: Blob): Promise<AgentRunResponse>`
- `getRun(runId: string): Promise<AgentRunResponse>`

Use TanStack Query mutations:

- One mutation for text.
- One mutation for audio.
- Shared success path that stores current run and focuses the answer.

## Phase 4: Audio Recorder

Use browser `MediaRecorder`.

Requirements:

- Ask microphone permission only when user clicks record.
- Prefer `audio/webm` in Chromium-compatible browsers.
- Limit recording duration, for example 60 seconds for MVP.
- Show elapsed time.
- Allow cancel and retry.
- Submit `Blob` as multipart form data to the Python backend.

## Phase 5: Evidence Rendering

Render evidence images using natural dimensions from the backend.

Overlay option:

- Place image inside a relatively positioned viewport.
- Render highlight boxes as absolutely positioned elements.
- Convert backend pixel coordinates to percentages:

```ts
const left = `${(bbox.x / image.width) * 100}%`;
const top = `${(bbox.y / image.height) * 100}%`;
const width = `${(bbox.width / image.width) * 100}%`;
const height = `${(bbox.height / image.height) * 100}%`;
```

If Docling already returns pre-highlighted images, still keep `highlights` in the response for tooltips, citations, and accessibility.

## Phase 6: Loading and Error States

Because there is no streaming, use a single pending state:

- Disable submit while running.
- Keep query visible.
- Show step labels if backend exposes them later, but do not require them for MVP.
- On failure, preserve input and show retry.

## Phase 7: Testing

Minimum tests:

- Text query submit calls `POST /api/chat` with `message`, `session_id`, and the selected `model`.
- Voice transcript submit uses the same `POST /api/chat` path after browser speech recognition completes.
- Completed response renders Markdown answer.
- Evidence images render with correct highlight positions.
- Empty evidence state renders cleanly.
- Microphone permission denied state is recoverable.

Use Playwright for:

- Desktop workspace layout.
- Mobile stacked layout.
- Evidence viewer zoom and next/previous behavior.

## Phase 8: Backend Alignment Checklist

Agree with the Python backend on:

- Maximum audio size and duration.
- Accepted audio formats.
- Timeout budget for agent runs.
- Evidence image hosting path.
- Whether images are signed URLs, static URLs, or proxied.
- Coordinate system for bounding boxes.
- Whether page numbers are 1-based. Recommended: 1-based for UI.
- Whether Docling returns snippets per highlight or only per image.

## Suggested MVP Milestones

1. Static mock response rendered in the UI.
2. Real text endpoint connected.
3. Real audio recorder connected to backend.
4. Evidence gallery connected with sample images.
5. Detail viewer and highlight interactions.
6. Polish error states and mobile layout.
