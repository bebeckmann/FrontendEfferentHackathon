import type { AgentModelOption, AgentRunResponse, ApiErrorResponse } from "./dto";
import { createMockRun } from "./mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const TTS_MODEL = process.env.NEXT_PUBLIC_TTS_MODEL ?? "openai/gpt-4o-mini-tts-2025-12-15";
const TTS_VOICE = process.env.NEXT_PUBLIC_TTS_VOICE ?? "nova";
const TTS_RESPONSE_FORMAT = "mp3";

export const AGENT_MODELS = [
  {
    id: process.env.NEXT_PUBLIC_FAST_MODEL ?? "openai/gpt-4o-mini",
    label: "ChatGPT 4o mini",
    shortLabel: "Fast Mode",
    profile: "fast"
  },
  {
    id: process.env.NEXT_PUBLIC_REASONING_MODEL ?? "google/gemini-3-pro-preview",
    label: "Reasoning model",
    shortLabel: "Precise Mode",
    profile: "reasoning"
  }
] satisfies AgentModelOption[];

export type SubmitRunInput = {
  query: string;
  model: AgentModelOption;
};

export type SpeechAudio = {
  blob: Blob;
  generationId?: string;
  model?: string;
  voice?: string;
};

type AgentApiResponse = {
  answer: string;
  images?: Array<{
    data?: string;      // Backend: data:image/png;base64,...
    url?: string;       // optional weiter unterstützen
    caption?: string;
    source?: string;
    kind?: string;
  }>;
  warnings?: string[];
};

type SuccessImageResponse =
  | {
      filename: string;
      mime_type: string;
      base64: string;
      data_url: string;
    }
  | {
      images: SuccessImageItem[];
    }
  | {
      sources: SuccessImageItem[];
    }
  | SuccessImageItem[]
  | {
      error: string;
      path?: string;
    };

type SuccessImageItem = {
  filename?: string;
  mime_type?: string;
  base64?: string;
  data_url?: string;
  url?: string;
  label?: string;
  caption?: string;
  source?: string;
  type?: string;
};

export async function submitTextRun({ query, model }: SubmitRunInput): Promise<AgentRunResponse> {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    throw new Error("Bitte gib zuerst eine Frage ein.");
  }

  if (USE_MOCKS) {
    await delay(550);
    return createMockRun(cleanedQuery, undefined, model);
  }

  const formData = new FormData();
  formData.append("message", cleanedQuery);
  formData.append("session_id", sessionId());

  const response = await fetch(apiPath("/api/chat"), {
    method: "POST",
    body: formData
  });

  const apiResponse = await parseAgentChatResponse(response);
  return mapAgentResponse(cleanedQuery, model, apiResponse);
}

export async function fetchSuccessImageRun(): Promise<AgentRunResponse> {
  const response = await fetch(apiPath("/api/success-image"), {
    method: "GET"
  });
  const payload = (await response.json().catch(() => null)) as SuccessImageResponse | null;

  if (!response.ok) {
    throw new Error("The success image request could not be processed.");
  }

  if (!payload) {
    throw new Error("The success image API returned an empty response.");
  }

  if (!Array.isArray(payload) && "error" in payload) {
    throw new Error([payload.error, payload.path].filter(Boolean).join(" "));
  }

  const images = extractSuccessImages(payload);
  if (!images.length) {
    throw new Error("The success image API returned an unexpected image response.");
  }

  return {
    runId: `success_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    status: "completed",
    query: "Success image test source",
    transcript: null,
    answer: {
      summary: "Success Images",
      markdown: `${images.length} test source image${images.length === 1 ? "" : "s"} loaded from \`/api/success-image\`.`
    },
    evidence: images.map((image, index) => ({
      id: `success_image_${index + 1}`,
      documentId: image.filename ?? image.source ?? image.label ?? `success_image_${index + 1}`,
      documentName: image.label ?? image.caption ?? image.filename ?? image.source ?? `Success image ${index + 1}`,
      pageNumber: 1,
      imageUrl: image.data_url ?? normalizeSourceUrl(image.url ?? ""),
      width: 1200,
      height: 900,
      highlights: [],
      rationale: image.mime_type ?? image.type
    })),
    usage: {
      agentLatencyMs: 0,
      asrSeconds: 0
    },
    createdAt: new Date().toISOString()
  };
}

export async function synthesizeSpeech(text: string, signal?: AbortSignal): Promise<SpeechAudio> {
  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error("There is no answer text to read.");
  }

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal,
    body: JSON.stringify({
      input: cleanedText,
      text: cleanedText,
      language: "en",
      model: TTS_MODEL,
      voice: TTS_VOICE,
      response_format: TTS_RESPONSE_FORMAT
    })
  });

  if (!response.ok) {
    const message = await extractOpenRouterErrorMessage(response);
    throw new Error(message || "The text-to-speech request could not be processed.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const blob = contentType.startsWith("audio/")
    ? await response.blob()
    : speechPayloadToBlob(
        (await response.json().catch(() => null)) as {
          data_url?: string;
          base64?: string;
          mime_type?: string;
        } | null
      );

  if (!blob.size) {
    throw new Error("The text-to-speech API returned empty audio.");
  }

  return {
    blob,
    generationId: response.headers.get("x-generation-id") ?? undefined,
    model: TTS_MODEL,
    voice: TTS_VOICE
  };
}

async function extractOpenRouterErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string | { message?: string };
          message?: string;
          detail?: string;
        }
      | null;

    if (!payload) return "";

    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.error === "object" && payload.error?.message) return payload.error.message;
    if (typeof payload.message === "string") return payload.message;
    if (typeof payload.detail === "string") return payload.detail;

    return "";
  }

  return await response.text().catch(() => "");
}

function extractSuccessImages(payload: SuccessImageResponse): SuccessImageItem[] {
  let rawImages: SuccessImageItem[];
  if (Array.isArray(payload)) {
    rawImages = payload;
  } else if ("images" in payload) {
    rawImages = payload.images;
  } else if ("sources" in payload) {
    rawImages = payload.sources;
  } else if ("error" in payload) {
    rawImages = [];
  } else {
    rawImages = [payload];
  }

  return rawImages.filter((image) => {
    const imageUrl = image.data_url ?? image.url;
    return typeof imageUrl === "string" && (imageUrl.startsWith("data:image/") || imageUrl.length > 0);
  });
}

async function parseAgentChatResponse(response: Response): Promise<AgentApiResponse> {
  const payload = (await response.json().catch(() => null)) as AgentApiResponse | ApiErrorResponse | null;

  if (!response.ok) {
    const message =
      payload && "error" in payload && payload.error?.message
        ? payload.error.message
        : payload && "detail" in payload && typeof payload.detail === "string"
          ? payload.detail
        : "The agent request could not be processed.";
    throw new Error(message);
  }

  if (!payload || !("answer" in payload) || typeof payload.answer !== "string") {
    throw new Error("The agent API returned an unexpected response.");
  }

  return payload;
}

function speechPayloadToBlob(payload: { data_url?: string; base64?: string; mime_type?: string } | null) {
  if (!payload) {
    throw new Error("The text-to-speech API returned an unexpected audio response.");
  }

  const mimeType = payload.mime_type ?? "audio/mpeg";
  const base64 = payload.data_url?.includes(",") ? payload.data_url.split(",", 2)[1] : payload.base64;
  if (!base64) {
    throw new Error("The text-to-speech API returned an unexpected audio response.");
  }

  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function apiPath(path: string) {
  return `${API_BASE_URL}${path}`;
}

function mapAgentResponse(query: string, model: AgentModelOption, response: AgentApiResponse): AgentRunResponse {
  const warningText = response.warnings?.length ? `\n\n${response.warnings.map((warning) => `> ${warning}`).join("\n")}` : "";

  const imageEvidence = (response.images ?? [])
  .map((image, index) => {
    const rawImageUrl = image.data ?? image.url ?? "";

    return {
      id: `ev_${index + 1}`,
      documentId: image.source ?? `image_${index + 1}`,
      documentName: image.caption ?? image.source ?? `Evidence ${index + 1}`,
      pageNumber: index + 1,
      imageUrl: normalizeSourceUrl(rawImageUrl),
      width: 1200,
      height: 900,
      highlights: [],
      rationale: image.caption ?? image.kind
    };
  })
  .filter((evidence) => evidence.imageUrl.length > 0);

  return {
    runId: `run_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    status: "completed",
    query,
    model,
    transcript: null,
    answer: {
      summary: `${model.shortLabel} Answer`,
      markdown: `${response.answer}${warningText}`
    },
    evidence: imageEvidence,
    usage: {
      agentLatencyMs: 0,
      asrSeconds: 0
    },
    createdAt: new Date().toISOString()
  };
}

function normalizeSourceUrl(url: string) {
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (url.startsWith("data/")) {
    return `${API_BASE_URL}/static/${url}`;
  }

  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

function sessionId() {
  const storageKey = "efferent-session-id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const created = `session_${crypto.randomUUID()}`;
  window.localStorage.setItem(storageKey, created);
  return created;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
