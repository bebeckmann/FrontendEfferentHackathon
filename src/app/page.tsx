"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AnswerPanel } from "@/components/answer-panel";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { QueryComposer } from "@/components/query-composer";
import { RunStatus } from "@/components/run-status";
import { submitAudioRun, submitTextRun } from "@/lib/api-client";
import type { AgentRunResponse } from "@/lib/dto";

export default function Home() {
  const [activeRun, setActiveRun] = useState<AgentRunResponse | null>(null);
  const [runHistory, setRunHistory] = useState<AgentRunResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  function handleRunSuccess(run: AgentRunResponse) {
    setActiveRun(run);
    setRunHistory((history) => [...history, run]);
  }

  const textRun = useMutation({
    mutationFn: submitTextRun,
    onMutate: () => setErrorMessage(null),
    onSuccess: handleRunSuccess,
    onError: (error) => setErrorMessage(formatError(error))
  });

  const audioRun = useMutation({
    mutationFn: submitAudioRun,
    onMutate: () => setErrorMessage(null),
    onSuccess: handleRunSuccess,
    onError: (error) => setErrorMessage(formatError(error))
  });

  const isRunning = textRun.isPending || audioRun.isPending;

  useEffect(() => {
    if (activeRun?.status === "completed") {
      answerRef.current?.focus();
    }
  }, [activeRun]);

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

      <section className="workspace-grid">
        <aside className="control-panel">
          <QueryComposer
            disabled={isRunning}
            onSubmitText={(query) => textRun.mutate(query)}
            onSubmitAudio={(audio) => audioRun.mutate(audio)}
          />
          <RunStatus
            run={activeRun}
            isRunning={isRunning}
            errorMessage={errorMessage}
            onRetry={() => {
              if (activeRun?.query) {
                textRun.mutate(activeRun.query);
              }
            }}
          />
        </aside>

        <section className="result-panel">
          <div ref={answerRef} tabIndex={-1} className="focus-anchor">
            <AnswerPanel run={activeRun} history={runHistory} isRunning={isRunning} />
          </div>
          <EvidenceGallery evidence={activeRun?.evidence ?? []} isRunning={isRunning} />
        </section>
      </section>
    </main>
  );
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Die Anfrage konnte nicht verarbeitet werden.";
}
