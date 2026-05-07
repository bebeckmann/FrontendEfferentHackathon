"use client";

import ReactMarkdown from "react-markdown";
import { Download, Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AgentRunResponse } from "@/lib/dto";
import { downloadChatHistoryPdf } from "@/lib/pdf-export";

type AnswerPanelProps = {
  run: AgentRunResponse | null;
  history: AgentRunResponse[];
  isRunning: boolean;
};

export function AnswerPanel({ run, history, isRunning }: AnswerPanelProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const markdown = run?.answer?.markdown;

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function stopSpeech() {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }

  function toggleSpeech() {
    if (!markdown) return;

    if (isSpeaking) {
      stopSpeech();
      return;
    }

    const text = markdownToSpeechText(markdown);
    if (!text || !("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = guessSpeechLocale(text);
    utterance.rate = 0.95;
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setIsSpeaking(false);
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setIsSpeaking(false);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
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
            aria-pressed={isSpeaking}
          >
            {isSpeaking ? (
              <VolumeX size={18} aria-hidden="true" />
            ) : (
              <Volume2 size={18} aria-hidden="true" />
            )}

            <span className="sr-only">
              {isSpeaking ? "Vorlesen stoppen" : "Antwort vorlesen"}
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
            <ReactMarkdown>{markdown}</ReactMarkdown>
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

function guessSpeechLocale(text: string) {
  return /[äöüß]|(\b(und|oder|nicht|mit|für|auf|der|die|das|eine|einen)\b)/i.test(text)
    ? "de-DE"
    : "en-US";
}
