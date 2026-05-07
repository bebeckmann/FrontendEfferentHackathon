# Product and UX Spec

## Product Goal

Build a focused frontend for a LangChain agent that accepts a user question by text or speech and returns:

1. A natural-language answer.
2. Evidence images generated from Docling with highlighted regions that support the answer.
3. Enough metadata to inspect what document/page/region each highlight came from.

The experience should feel like an expert document assistant, not a chat toy.

## Primary User Flow

1. User lands on the workspace.
2. User enters a question via text input or records speech.
3. If speech is used, the backend transcribes the audio and returns the transcript.
4. User submits or confirms the transcript.
5. Frontend shows a loading state while the backend runs ASR, LangChain, retrieval, and Docling evidence generation.
6. Frontend displays the final answer and evidence gallery.
7. User can inspect evidence images, zoom in, copy the answer, and submit a follow-up question.

## Main Screen Layout

Use a dense two-column workspace on desktop and a stacked layout on mobile.

Desktop:

- Left rail: input, run status, small run metadata.
- Main area: answer at top, evidence viewer below.
- Optional right drawer: selected evidence details.

Mobile:

- Query input first.
- Status and answer.
- Evidence cards stacked with tap-to-open detail viewer.

## UI Components

### Query Composer

- Multiline text area.
- Microphone icon button.
- Stop recording button while active.
- Submit button.
- Clear/reset button.
- Transcript preview when audio is transcribed.

States:

- Idle.
- Recording.
- Uploading/transcribing.
- Ready to submit transcript.
- Agent running.
- Error.

### Answer Panel

- Render Markdown safely.
- Show answer title only if backend provides one.
- Show copy button.
- Show generated-at timestamp and run id in subdued metadata.
- Do not stream partial tokens.

### Evidence Gallery

Each evidence item should show:

- Highlighted image.
- Document name.
- Page number.
- Short snippet or rationale if returned.
- Confidence score if returned.
- Button to open detail viewer.

Images should be real generated artifacts from the backend. The frontend should not re-run Docling. It may render additional overlay boxes if the backend returns coordinates.

### Evidence Detail Viewer

Minimum controls:

- Zoom in/out.
- Fit to width.
- Previous/next evidence.
- Open source metadata drawer.

Expected interactions:

- Hover or focus on a highlight shows its snippet.
- Click a highlight selects the related citation.
- Keyboard navigation works for previous/next.

## Visual Design Direction

Use a quiet, utilitarian interface:

- Neutral background.
- Clear contrast.
- Small-radius cards, max 8px.
- Icons for recorder, submit, copy, zoom, and navigation.
- Avoid oversized hero sections, decorative gradients, and marketing copy.
- Optimize for scanning evidence quickly.

## Accessibility Requirements

- Audio recorder controls must be keyboard accessible.
- Recording state must be announced through visible text and `aria-live`.
- Evidence images need alt text containing document name, page, and highlight summary.
- Error messages must be visible and associated with the relevant control.
- Focus should move to the answer panel after a successful run.

## Error States

| Error | UI behavior |
| --- | --- |
| Microphone permission denied | Show inline permission message and keep text input usable |
| Audio too large | Explain max duration/size and allow retry |
| ASR failure | Keep audio submit state recoverable and allow text fallback |
| Agent timeout | Show retry button and preserve query |
| No evidence returned | Show answer plus "Keine Belege gefunden" state |
| Image failed to load | Show metadata and retry image load button |

## MVP Scope

Build first:

- Text query submit.
- Audio record and upload.
- Non-streaming answer display.
- Evidence image gallery.
- Evidence detail modal/viewer.
- Basic run error handling.

Defer:

- User accounts.
- Persistent run history.
- Multi-document upload UI.
- Collaborative annotations.
- Streaming tokens.
