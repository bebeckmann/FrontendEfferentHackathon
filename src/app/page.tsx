"use client";

import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { AGENT_MODELS, submitTextRun } from "@/lib/api-client";
import type { AgentRunResponse } from "@/lib/dto";

export default function Home() {
  const [runHistory, setRunHistory] = useState<AgentRunResponse[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(AGENT_MODELS[0]);

  function handleRunSuccess(run: AgentRunResponse) {
    setPendingMessage(null);
    setSelectedRunId(run.runId);
    setRunHistory((history) => [...history, run]);
  }

  const textRun = useMutation({
    mutationFn: submitTextRun,
    onMutate: ({ query }) => {
      setErrorMessage(null);
      setPendingMessage(query);
    },
    onSuccess: handleRunSuccess,
    onError: (error) => {
      setPendingMessage(null);
      setErrorMessage(formatError(error));
    }
  });

  const isRunning = textRun.isPending;
  const selectedRun = useMemo(
    () => runHistory.find((run) => run.runId === selectedRunId) ?? runHistory.at(-1) ?? null,
    [runHistory, selectedRunId]
  );

  return (
    <main className="workspace-shell">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">LangChain + Docling</p>
          <h1>Efferent Agent</h1>
        </div>
        <div className="header-meta">
          <span>{process.env.NEXT_PUBLIC_USE_MOCKS === "true" ? "Mock API" : "Backend API"}</span>
        </div>
      </section>

      <section className="split-workspace">
        <ChatInterface
          history={runHistory}
          selectedRunId={selectedRun?.runId ?? null}
          pendingMessage={pendingMessage}
          isRunning={isRunning}
          errorMessage={errorMessage}
          models={AGENT_MODELS}
          selectedModel={selectedModel}
          onSelectRun={setSelectedRunId}
          onModelChange={setSelectedModel}
          onSubmitText={(query) => textRun.mutate({ query, model: selectedModel })}
          onRetry={() => {
            if (selectedRun?.query) {
              textRun.mutate({ query: selectedRun.query, model: selectedRun.model ?? selectedModel });
            }
          }}
        />

        <aside className="sources-panel">
          <EvidenceGallery
            evidence={selectedRun?.evidence ?? []}
            isRunning={isRunning}
            selectedRun={selectedRun}
          />
        </aside>
      </section>
    </main>
  );
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "The request could not be processed.";
}
