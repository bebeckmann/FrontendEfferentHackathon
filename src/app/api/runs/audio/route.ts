import { audioFormatFromFile, languageFromLocale, transcribeAudio, TranscriptionError } from "@/server/openrouter-asr";
import { completedRunResponse, elapsedMs, errorResponse } from "@/server/run-response";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const startedAt = performance.now();
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return errorResponse(400, "VALIDATION_FAILED", "Multipart form data is required.");
  }

  const audio = formData?.get("audio");

  if (!(audio instanceof File)) {
    return errorResponse(400, "VALIDATION_FAILED", "Audio file is required.");
  }

  if (audio.size === 0) {
    return errorResponse(400, "AUDIO_EMPTY", "Die Audioaufnahme ist leer.");
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return errorResponse(413, "AUDIO_TOO_LARGE", "Die Audioaufnahme ist fuer das Hosting zu gross. Bitte kuerzer aufnehmen.");
  }

  try {
    const audioFormat = audioFormatFromFile(audio);
    const transcript = await transcribeAudio({
      audio: await audio.arrayBuffer(),
      audioFormat,
      language: languageFromLocale(formData.get("locale"))
    });

    return Response.json(
      completedRunResponse({
        query: transcript.text,
        transcript: {
          text: transcript.text,
          language: transcript.language,
          model: transcript.model
        },
        answerMarkdown:
          "Die ASR-Pipeline laeuft jetzt als Vercel Serverless Route. Sobald der LangChain-Agent angeschlossen ist, wird das oben angezeigte echte Transkript an den Agenten uebergeben und die Docling-Belege werden hier angezeigt.",
        latencyMs: elapsedMs(startedAt),
        asrSeconds: transcript.usage?.seconds
      })
    );
  } catch (error) {
    const cause = error instanceof Error ? error.message : undefined;
    const status = error instanceof TranscriptionError ? 502 : 500;
    console.error("ASR_FAILED", {
      cause,
      providerStatus: error instanceof TranscriptionError ? error.status : undefined,
      audioSize: audio.size,
      audioType: audio.type,
      audioName: audio.name
    });
    return errorResponse(status, "ASR_FAILED", "Die Audioaufnahme konnte nicht transkribiert werden.", cause);
  }
}
