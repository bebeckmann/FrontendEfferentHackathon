const DEFAULT_ASR_URL = "https://openrouter.ai/api/v1/audio/transcriptions";
const DEFAULT_ASR_MODEL = "openai/whisper-large-v3";

export type TranscriptionResult = {
  text: string;
  language?: string;
  model: string;
  generationId?: string;
  usage?: {
    seconds?: number;
  };
};

export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export async function transcribeAudio({
  audio,
  audioFormat,
  language
}: {
  audio: ArrayBuffer;
  audioFormat: string;
  language?: string;
}): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new TranscriptionError("OPENROUTER_API_KEY is not configured.");
  }

  const model = process.env.OPENROUTER_ASR_MODEL ?? DEFAULT_ASR_MODEL;
  const url = process.env.OPENROUTER_ASR_URL ?? DEFAULT_ASR_URL;
  const encodedAudio = Buffer.from(audio).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input_audio: {
        data: encodedAudio,
        format: audioFormat
      },
      ...(language ? { language } : {})
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new TranscriptionError(`OpenRouter ASR failed with ${response.status}: ${safeJson(payload)}`);
  }

  if (!payload || typeof payload.text !== "string" || !payload.text.trim()) {
    throw new TranscriptionError("OpenRouter ASR response did not contain transcript text.");
  }

  return {
    text: payload.text.trim(),
    language,
    model,
    generationId: response.headers.get("X-Generation-Id") ?? undefined,
    usage: typeof payload.usage === "object" && payload.usage ? payload.usage : undefined
  };
}

export function audioFormatFromFile(file: File) {
  const contentType = file.type.split(";")[0].toLowerCase();
  const byContentType: Record<string, string> = {
    "audio/webm": "webm",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/aiff": "aiff",
    "audio/x-aiff": "aiff"
  };

  if (byContentType[contentType]) {
    return byContentType[contentType];
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "aif") return "aiff";
  if (extension && ["webm", "wav", "mp3", "mp4", "m4a", "aac", "ogg", "flac", "aiff"].includes(extension)) {
    return extension;
  }

  return "webm";
}

export function languageFromLocale(locale: FormDataEntryValue | null) {
  if (typeof locale !== "string") {
    return undefined;
  }

  const language = locale.split("-", 1)[0].toLowerCase().trim();
  return /^[a-z]{2}$/.test(language) ? language : undefined;
}

function safeJson(payload: unknown) {
  try {
    return JSON.stringify(payload).slice(0, 600);
  } catch {
    return "unreadable response";
  }
}
