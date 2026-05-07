import type { AgentRunResponse } from "@/lib/dto";

export function completedRunResponse({
  query,
  transcript,
  answerMarkdown,
  latencyMs,
  asrSeconds,
  runId
}: {
  query: string;
  transcript: AgentRunResponse["transcript"];
  answerMarkdown: string;
  latencyMs: number;
  asrSeconds?: number;
  runId?: string;
}): AgentRunResponse {
  return {
    runId: runId ?? `run_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    status: "completed",
    query,
    transcript,
    answer: {
      summary: "Voice Pipeline",
      markdown: answerMarkdown
    },
    evidence: [],
    usage: {
      asrSeconds: asrSeconds ?? 0,
      agentLatencyMs: latencyMs
    },
    createdAt: new Date().toISOString()
  };
}

export function errorResponse(status: number, code: string, message: string, cause?: string) {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(cause ? { details: { cause } } : {})
      }
    },
    { status }
  );
}

export function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}
