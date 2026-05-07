import type { AgentRunResponse, ApiErrorResponse } from "./dto";
import { createMockRun } from "./mock-data";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export async function submitTextRun(query: string): Promise<AgentRunResponse> {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    throw new Error("Bitte gib zuerst eine Frage ein.");
  }

  if (USE_MOCKS) {
    await delay(550);
    return createMockRun(cleanedQuery);
  }

  const response = await fetch(apiPath("/api/runs"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputType: "text",
      query: cleanedQuery,
      locale: navigator.language || "de-DE"
    })
  });

  return parseJsonResponse(response);
}

export async function submitAudioRun(audio: Blob): Promise<AgentRunResponse> {
  if (audio.size === 0) {
    throw new Error("Die Aufnahme ist leer.");
  }

  if (USE_MOCKS) {
    await delay(800);
    return createMockRun("Welche Risiken werden im Vertrag genannt?", "Welche Risiken werden im Vertrag genannt?");
  }

  const formData = new FormData();
  formData.append("audio", audio, `query.${audioExtension(audio.type)}`);
  formData.append("locale", navigator.language || "de-DE");

  const response = await fetch(apiPath("/api/runs/audio"), {
    method: "POST",
    body: formData
  });

  return parseJsonResponse(response);
}

export async function getRun(runId: string): Promise<AgentRunResponse> {
  if (USE_MOCKS) {
    await delay(350);
    return createMockRun(`Geladener Run ${runId}`);
  }

  const response = await fetch(apiPath(`/api/runs/${runId}`));
  return parseJsonResponse(response);
}

async function parseJsonResponse(response: Response): Promise<AgentRunResponse> {
  const payload = (await response.json().catch(() => null)) as AgentRunResponse | ApiErrorResponse | null;

  if (!response.ok) {
    const message =
      payload && "error" in payload && payload.error?.message
        ? payload.error.message
        : "Die Anfrage konnte nicht verarbeitet werden.";
    throw new Error(message);
  }

  if (!payload || !("runId" in payload)) {
    throw new Error("Das Backend hat eine unerwartete Antwort geliefert.");
  }

  return payload;
}

function audioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function apiPath(path: string) {
  return `${API_BASE_URL}${path}`;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
