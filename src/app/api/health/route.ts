export const runtime = "nodejs";

export function GET() {
  return Response.json({
    status: "ok",
    asr: {
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      model: process.env.OPENROUTER_ASR_MODEL ?? "openai/whisper-large-v3",
      runtime: "nodejs",
      vercel: Boolean(process.env.VERCEL)
    }
  });
}
