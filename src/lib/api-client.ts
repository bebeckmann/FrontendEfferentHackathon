import type { AgentModelOption, AgentRunResponse, ApiErrorResponse } from "./dto";
import { createMockRun } from "./mock-data";

const API_BASE_URL = "https://backendefferenthackathon.onrender.com";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export const AGENT_MODELS = [
  {
    id: process.env.NEXT_PUBLIC_FAST_MODEL ?? "openai/gpt-4o-mini",
    label: "ChatGPT 4o mini",
    shortLabel: "4o mini",
    profile: "fast"
  },
  {
    id: process.env.NEXT_PUBLIC_REASONING_MODEL ?? "openai/o3",
    label: "Reasoning model",
    shortLabel: "Reasoning",
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
