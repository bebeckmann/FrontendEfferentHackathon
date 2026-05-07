import type { AgentModelOption, AgentRunResponse, ApiErrorResponse } from "./dto";
import { createMockRun } from "./mock-data";

const API_BASE_URL = "https://backendefferenthackathon.onrender.com"
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

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

type AgentApiResponse = {
  answer: string;
  sources?: Array<{
    type?: string;
    url: string;
    label?: string;
  }>;
  images?: Array<{
    url: string;
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
  formData.append("model", model.id);
  formData.append("model_profile", model.profile);

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

function apiPath(path: string) {
  return `${API_BASE_URL}${path}`;
}

function mapAgentResponse(query: string, model: AgentModelOption, response: AgentApiResponse): AgentRunResponse {
  const warningText = response.warnings?.length ? `\n\n${response.warnings.map((warning) => `> ${warning}`).join("\n")}` : "";
  const sourceEvidence = (response.sources ?? []).map((source, index) => ({
    id: `src_${index + 1}`,
    documentId: source.url || `source_${index + 1}`,
    documentName: source.label ?? source.type ?? `Source ${index + 1}`,
    pageNumber: 1,
    imageUrl: normalizeSourceUrl(source.url),
    width: 1200,
    height: 900,
    highlights: [],
    rationale: source.type
  }));

  const imageEvidence = (response.images ?? []).map((image, index) => ({
    id: `ev_${index + 1}`,
    documentId: image.source ?? `image_${index + 1}`,
    documentName: image.source ?? image.caption ?? `Evidence ${index + 1}`,
    pageNumber: 1,
    imageUrl: normalizeSourceUrl(image.url),
    width: 1200,
    height: 900,
    highlights: [],
    rationale: image.caption ?? image.kind
  }));

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
    evidence: [...sourceEvidence, ...imageEvidence],
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
