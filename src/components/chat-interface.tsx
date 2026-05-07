"use client";

import ReactMarkdown from "react-markdown";
import { Download, Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QueryComposer } from "./query-composer";
import { RunStatus } from "./run-status";
import type { AgentModelOption, AgentRunResponse } from "@/lib/dto";
import { synthesizeSpeech } from "@/lib/api-client";
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
  const [loadingSpeechRunId, setLoadingSpeechRunId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);

  const selectedRun = useMemo(
    () => history.find((run) => run.runId === selectedRunId) ?? history.at(-1) ?? null,
    [history, selectedRunId]
  );

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  function stopSpeech() {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setSpeakingRunId(null);
    setLoadingSpeechRunId(null);
  }

  async function toggleSpeech(run: AgentRunResponse) {
    const markdown = run.answer?.markdown;
    if (!markdown) return;

    if (speakingRunId === run.runId || loadingSpeechRunId === run.runId) {
      stopSpeech();
      return;
    }

    if (speakingRunId || loadingSpeechRunId) {
      stopSpeech();
    }

    const text = markdownToSpeechText(markdown);
    if (!text) return;

    const abortController = new AbortController();
    speechAbortRef.current = abortController;
    setLoadingSpeechRunId(run.runId);

    try {
      const speech = await synthesizeSpeech(text, abortController.signal);
      const audioUrl = URL.createObjectURL(speech.blob);
      const audio = new Audio(audioUrl);

      audioUrlRef.current = audioUrl;
      audioRef.current = audio;
      audio.onended = stopSpeech;
      audio.onerror = stopSpeech;

      await audio.play();
      setLoadingSpeechRunId(null);
      setSpeakingRunId(run.runId);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("TTS playback failed:", error);
      stopSpeech();
    }
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
          const isThisRunLoadingSpeech = loadingSpeechRunId === run.runId;

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
                    aria-pressed={isThisRunSpeaking || isThisRunLoadingSpeech}
                  >
                    {isThisRunLoadingSpeech ? (
                      <Loader2 size={17} aria-hidden="true" className="spin" />
                    ) : isThisRunSpeaking ? (
                      <VolumeX size={17} aria-hidden="true" />
                    ) : (
                      <Volume2 size={17} aria-hidden="true" />
                    )}

                    <span className="sr-only">
                      {isThisRunSpeaking || isThisRunLoadingSpeech ? "Vorlesen stoppen" : "Antwort vorlesen"}
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
