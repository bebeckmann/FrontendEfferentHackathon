"use client";

import ReactMarkdown from "react-markdown";
import { Download, Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QueryComposer } from "./query-composer";
import { RunStatus } from "./run-status";
import type { AgentModelOption, AgentRunResponse } from "@/lib/dto";
import { downloadChatHistoryPdf } from "@/lib/pdf-export";

type ChatInterfaceProps = {
  history: AgentRunResponse[];
  selectedRunId: string | null;
  pendingMessage: string | null;
  isRunning: boolean;
  errorMessage: string | null;
  models: AgentModelOption[];
  selectedModel: AgentModelOption;
  onSelectRun: (runId: string) => void;
  onModelChange: (model: AgentModelOption) => void;
  onSubmitText: (query: string) => void;
  onRetry: () => void;
};

export function ChatInterface({
  history,
  selectedRunId,
  pendingMessage,
  isRunning,
  errorMessage,
  models,
  selectedModel,
  onSelectRun,
  onModelChange,
  onSubmitText,
  onRetry
}: ChatInterfaceProps) {
  const [speakingRunId, setSpeakingRunId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const selectedRun = useMemo(
    () => history.find((run) => run.runId === selectedRunId) ?? history.at(-1) ?? null,
    [history, selectedRunId]
  );

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function stopSpeech() {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setSpeakingRunId(null);
  }

  function toggleSpeech(run: AgentRunResponse) {
    const markdown = run.answer?.markdown;
    if (!markdown) return;

    if (speakingRunId === run.runId) {
      stopSpeech();
      return;
    }

    if (speakingRunId) {
      stopSpeech();
    }

    const text = markdownToSpeechText(markdown);
    if (!text || !("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = guessSpeechLocale(text);
    utterance.rate = 0.95;
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setSpeakingRunId(null);
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setSpeakingRunId(null);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeakingRunId(run.runId);
  }

  return (
    <section className="chat-panel surface" aria-label="Chat">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Chat</p>
          <h2>Agent Conversation</h2>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={() => downloadChatHistoryPdf(history)}
          disabled={!history.length}
        >
          <Download size={18} aria-hidden="true" />
          <span className="sr-only">Chatverlauf als PDF herunterladen</span>
        </button>
      </header>

      <div className="chat-messages" aria-live="polite">
        {!history.length && !pendingMessage ? (
          <div className="chat-empty">
            <p>Ask a question on the bottom via voice or text.</p>
          </div>
        ) : null}

        {history.map((run) => {
          const isSelected = selectedRun?.runId === run.runId;
          const isThisRunSpeaking = speakingRunId === run.runId;

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
                    <span>{run.model?.shortLabel ?? "Answer"}</span>
                    <span>{run.evidence.length} Sources</span>
                  </div>

                  <div className="markdown chat-markdown">
                    <ReactMarkdown>{run.answer?.markdown ?? "-"}</ReactMarkdown>
                  </div>
                </button>

                <div className="bubble-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => toggleSpeech(run)}
                    disabled={!run.answer?.markdown}
                    aria-pressed={isThisRunSpeaking}
                  >
                    {isThisRunSpeaking ? (
                      <VolumeX size={17} aria-hidden="true" />
                    ) : (
                      <Volume2 size={17} aria-hidden="true" />
                    )}

                    <span className="sr-only">
                      {isThisRunSpeaking ? "Vorlesen stoppen" : "Antwort vorlesen"}
                    </span>
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
                <span>Agent processes the request.</span>
              </div>
            </article>
          </>
        ) : null}
      </div>

      <div className="chat-footer">
        <RunStatus
          run={selectedRun}
          isRunning={isRunning}
          errorMessage={errorMessage}
          onRetry={onRetry}
        />

        <QueryComposer
          disabled={isRunning}
          models={models}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          onSubmitText={onSubmitText}
        />
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
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function guessSpeechLocale(text: string) {
  return /[äöüß]|(\b(und|oder|nicht|mit|für|auf|der|die|das|eine|einen)\b)/i.test(text)
    ? "de-DE"
    : "en-US";
}
