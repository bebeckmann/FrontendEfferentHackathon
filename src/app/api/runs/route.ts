import { completedRunResponse, elapsedMs, errorResponse } from "@/server/run-response";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const startedAt = performance.now();
  const payload = await request.json().catch(() => null);
  const query = typeof payload?.query === "string" ? payload.query.trim() : "";

  if (!query) {
    return errorResponse(400, "VALIDATION_FAILED", "Query is required.");
  }

  return Response.json(
    completedRunResponse({
      query,
      transcript: null,
      answerMarkdown:
        "Vercel API ist erreichbar. Die LangChain-Agent-Antwort ist hier noch ein Platzhalter. Die Voice-Pipeline verwendet serverseitig OpenRouter Whisper fuer ASR.",
      latencyMs: elapsedMs(startedAt)
    })
  );
}
