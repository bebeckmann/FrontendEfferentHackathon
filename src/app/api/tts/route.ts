export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const body = await request.json();

  const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "Efferon Agent"
    },
    body: JSON.stringify({
      model: body.model,
      voice: body.voice ?? "nova",
      input: body.input ?? body.text,
      response_format: body.response_format ?? "mp3"
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return Response.json(
      { error: "TTS failed", details: errorText },
      { status: response.status }
    );
  }

  const audio = await response.arrayBuffer();

  return new Response(audio, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "audio/mpeg"
    }
  });
}
