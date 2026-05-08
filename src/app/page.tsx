"use client";

import { useMutation } from "@tanstack/react-query";
import { ImageIcon, Loader2, Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat-interface";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { AGENT_MODELS, fetchSuccessImageRun, submitTextRun } from "@/lib/api-client";
import type { AgentRunResponse } from "@/lib/dto";

export default function Home() {
  const router = useRouter();

  const [runHistory, setRunHistory] = useState<AgentRunResponse[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(AGENT_MODELS[0]);
  const [sourcePreviewRun, setSourcePreviewRun] = useState<AgentRunResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleRunSuccess(run: AgentRunResponse) {
    setPendingMessage(null);
    setSourcePreviewRun(null);
    setSelectedRunId(run.runId);
    setRunHistory((history) => [...history, run]);
  }

  function navigateTo(path: string) {
    setMenuOpen(false);
    router.push(path);
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

  const successImage = useMutation({
    mutationFn: fetchSuccessImageRun,
    onMutate: () => {
      setErrorMessage(null);
    },
    onSuccess: (run) => {
      setSourcePreviewRun(run);
    },
    onError: (error) => {
      setErrorMessage(formatError(error));
    }
  });

  const isRunning = textRun.isPending;

  const selectedRun = useMemo(
    () => runHistory.find((run) => run.runId === selectedRunId) ?? runHistory.at(-1) ?? null,
    [runHistory, selectedRunId]
  );

  const sourceRun = sourcePreviewRun ?? selectedRun;

  return (
    <main className="workspace-shell">
      <section className="workspace-header">
        <div className="header-title-row">
          <div className="burger-menu-wrapper">
            <button
              type="button"
              className="burger-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Menü öffnen"
              aria-expanded={menuOpen}
            >
              <Menu size={22} aria-hidden="true" />
            </button>

            {menuOpen && (
              <div className="burger-dropdown">
                <button type="button" onClick={() => navigateTo("/datei-upload")}>
                  Data Upload
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo("/counterfactual-mortality-estimation")}
                >
                  Counterfactual Mortality Estimation
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo("/sepsis-phenotype-extraction")}
                >
                  Sepsis Phenotype Extraction
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow">LangChain + Docling</p>
            <h1>Efferon Agent</h1>
          </div>
        </div>

        <div className="header-actions">
          <div className="header-meta">
            <span>{process.env.NEXT_PUBLIC_USE_MOCKS === "true" ? "Mock API" : "Agent API"}</span>
          </div>

          <button
            type="button"
            className="secondary-button compact-button"
            onClick={() => successImage.mutate()}
            disabled={successImage.isPending}
          >
            {successImage.isPending ? (
              <Loader2 size={16} aria-hidden="true" className="spin" />
            ) : (
              <ImageIcon size={16} aria-hidden="true" />
            )}
            Test Source
          </button>
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
          onSelectRun={(runId) => {
            setSourcePreviewRun(null);
            setSelectedRunId(runId);
          }}
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
            evidence={sourceRun?.evidence ?? []}
            isRunning={isRunning || successImage.isPending}
            selectedRun={sourceRun}
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