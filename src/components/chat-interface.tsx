"use client";

import ReactMarkdown from "react-markdown";
import { Download, Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QueryComposer } from "./query-composer";
import { RunStatus } from "./run-status";
import type { AgentRunResponse } from "@/lib/dto";
import { downloadChatHistoryPdf } from "@/lib/pdf-export";

type ChatInterfaceProps = {
  history: AgentRunResponse[];
  selectedRunId: string | null;
  pendingMessage: string | null;
  isRunning: boolean;
  errorMessage: string | null;
  onSelectRun: (runId: string) => void;
  onSubmitText: (query: string) => void;
  onSubmitAudio: (audio: Blob) => void;
  onRetry: () => void;
};

export function ChatInterface({
  history,
  selectedRunId,
  pendingMessage,
  isRunning,
  errorMessage,
  onSelectRun,
  onSubmitText,
  onSubmitAudio,
  onRetry
}: ChatInterfaceProps) {
  const [speakingRunId, setSpeakingRunId] = useState<string | null>(null);
  const selectedRun = useMemo(
    () => history.find((run) => run.runId === selectedRunId) ?? history.at(-1) ?? null,
    [history, selectedRunId]
  );

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  function toggleSpeech(run: AgentRunResponse) {
    const markdown = run.answer?.markdown;
    if (!markdown || !("speechSynthesis" in window)) return;

    if (window.speechSynthesis.speaking && speakingRunId === run.runId) {
      window.speechSynthesis.cancel();
      setSpeakingRunId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(markdownToSpeechText(markdown));
    utterance.lang = "de-DE";
    utterance.onend = () => setSpeakingRunId(null);
    utterance.onerror = () => setSpeakingRunId(null);
    setSpeakingRunId(run.runId);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className="chat-panel surface" aria-label="Chat">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Chat</p>
          <h2>Agent Conversation</h2>
        </div>
        <button type="button" className="icon-button" onClick={() => downloadChatHistoryPdf(history)} disabled={!history.length}>
          <Download size={18} aria-hidden="true" />
          <span className="sr-only">Chatverlauf als PDF herunterladen</span>
        </button>
      </header>

      <div className="chat-messages" aria-live="polite">
        {!history.length && !pendingMessage ? (
          <div className="chat-empty">
            <p>Stelle links unten eine Frage per Text oder Sprache.</p>
          </div>
        ) : null}

        {history.map((run) => {
          const isSelected = selectedRun?.runId === run.runId;
          return (
            <div key={run.runId} className="chat-run">
              <article className="message-row user">
                <div className="message-bubble user-bubble">
                  <p>{run.transcript?.text ?? run.query}</p>
                </div>
              </article>

              <article className="message-row assistant">
                <button
                  type="button"
                  className={`message-bubble assistant-bubble ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectRun(run.runId)}
                >
                  <div className="message-meta">
                    <span>Antwort</span>
                    <span>{run.evidence.length} Quellen</span>
                  </div>
                  <div className="markdown chat-markdown">
                    <ReactMarkdown>{run.answer?.markdown ?? "-"}</ReactMarkdown>
                  </div>
                </button>
                <div className="bubble-actions">
                  <button type="button" className="icon-button" onClick={() => toggleSpeech(run)} disabled={!run.answer?.markdown}>
                    {speakingRunId === run.runId ? (
                      <VolumeX size={17} aria-hidden="true" />
                    ) : (
                      <Volume2 size={17} aria-hidden="true" />
                    )}
                    <span className="sr-only">Antwort vorlesen</span>
                  </button>
                </div>
              </article>
            </div>
          );
        })}

        {pendingMessage ? (
          <>
            <article className="message-row user">
              <div className="message-bubble user-bubble">
                <p>{pendingMessage}</p>
              </div>
            </article>
            <article className="message-row assistant">
              <div className="message-bubble assistant-bubble pending">
                <Loader2 size={18} className="spin" aria-hidden="true" />
                <span>Agent verarbeitet Anfrage.</span>
              </div>
            </article>
          </>
        ) : null}
      </div>

      <div className="chat-footer">
        <RunStatus run={selectedRun} isRunning={isRunning} errorMessage={errorMessage} onRetry={onRetry} />
        <QueryComposer disabled={isRunning} onSubmitText={onSubmitText} onSubmitAudio={onSubmitAudio} />
      </div>
    </section>
  );
}

function markdownToSpeechText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .trim();
}
