"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AgentRunResponse } from "@/lib/dto";
import { synthesizeSpeech } from "@/lib/api-client";
import { downloadChatHistoryPdf } from "@/lib/pdf-export";

type AnswerPanelProps = {
  run: AgentRunResponse | null;
  history: AgentRunResponse[];
  isRunning: boolean;
};

export function AnswerPanel({ run, history, isRunning }: AnswerPanelProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);

  const markdown = run?.answer?.markdown;

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

    setIsSpeaking(false);
    setIsLoadingSpeech(false);
  }

  async function toggleSpeech() {
    if (!markdown) return;

    if (isSpeaking || isLoadingSpeech) {
      stopSpeech();
      return;
    }

    const text = markdownToSpeechText(markdown);
    if (!text) return;

    const abortController = new AbortController();
    speechAbortRef.current = abortController;
    setIsLoadingSpeech(true);

    try {
      const speech = await synthesizeSpeech(text, abortController.signal);
      const audioUrl = URL.createObjectURL(speech.blob);
      const audio = new Audio(audioUrl);

      audioUrlRef.current = audioUrl;
      audioRef.current = audio;
      audio.onended = stopSpeech;
      audio.onerror = stopSpeech;

      await audio.play();
      setIsLoadingSpeech(false);
      setIsSpeaking(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("TTS playback failed:", error);
      stopSpeech();
    }
  }

  return (
    <section className="answer-panel surface" aria-labelledby="answer-title" aria-busy={isRunning}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Antwort</p>
          <h2 id="answer-title">{run?.answer?.summary ?? "Agent Output"}</h2>
        </div>

        <div className="answer-actions">
          <button
            type="button"
            className="icon-button"
            onClick={toggleSpeech}
            disabled={!markdown}
            aria-pressed={isSpeaking || isLoadingSpeech}
          >
            {isLoadingSpeech ? (
              <Loader2 size={18} aria-hidden="true" className="spin" />
            ) : isSpeaking ? (
              <VolumeX size={18} aria-hidden="true" />
            ) : (
              <Volume2 size={18} aria-hidden="true" />
            )}

            <span className="sr-only">
              {isSpeaking || isLoadingSpeech ? "Vorlesen stoppen" : "Antwort vorlesen"}
            </span>
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={() => downloadChatHistoryPdf(history)}
            disabled={!history.length}
          >
            <Download size={18} aria-hidden="true" />
            <span className="sr-only">Save chat as PDF</span>
          </button>
        </div>
      </div>

      {isRunning ? (
        <div className="loading-state">
          <Loader2 size={22} aria-hidden="true" className="spin" />
          <span>Agent is working on the perfect answer...</span>
        </div>
      ) : markdown ? (
        <>
          {run?.transcript?.text ? (
            <div className="transcript">
              <span>Transkript</span>
              <p>{run.transcript.text}</p>
            </div>
          ) : null}

          <div className="markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="markdown-table-wrapper">
                    <table>{children}</table>
                  </div>
                ),
                th: ({ children }) => <th>{children}</th>,
                td: ({ children }) => <td>{children}</td>,
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>

          <dl className="metadata-list">
            <div>
              <dt>Run</dt>
              <dd>{run?.runId}</dd>
            </div>
            <div>
              <dt>Erstellt</dt>
              <dd>{run ? new Date(run.createdAt).toLocaleString("de-DE") : "-"}</dd>
            </div>
            <div>
              <dt>Latenz</dt>
              <dd>{run?.usage?.agentLatencyMs ? `${run.usage.agentLatencyMs} ms` : "-"}</dd>
            </div>
          </dl>
        </>
      ) : (
        <div className="empty-state">
          <p>Ask a question via voice or text and the agent will answer here.</p>
        </div>
      )}
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
