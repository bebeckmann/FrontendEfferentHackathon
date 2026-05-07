import { completedRunResponse } from "@/server/run-response";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  return Response.json(
    completedRunResponse({
      query: `Run ${runId}`,
      transcript: null,
      answerMarkdown: "Persistente Run-History ist in der Vercel-API noch nicht implementiert.",
      latencyMs: 0,
      runId
    })
  );
}
