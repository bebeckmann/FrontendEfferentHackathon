export type RunStatus = "queued" | "running" | "completed" | "failed";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EvidenceHighlight = {
  id: string;
  bbox: BoundingBox;
  label?: string;
  snippet?: string;
  confidence?: number;
};

export type EvidenceImage = {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  highlights: EvidenceHighlight[];
  rationale?: string;
};

export type AgentRunResponse = {
  runId: string;
  status: RunStatus;
  query: string;
  transcript?: {
    text: string;
    language?: string;
    model?: string;
  } | null;
  answer?: {
    markdown: string;
    summary?: string;
  };
  evidence: EvidenceImage[];
  usage?: {
    asrSeconds?: number;
    agentLatencyMs?: number;
  };
  createdAt: string;
};

export type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};
