"use client";

import ReactMarkdown from "react-markdown";
import { Download, Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentRunResponse } from "@/lib/dto";
import { downloadChatHistoryPdf } from "@/lib/pdf-export";

type AnswerPanelProps = {
  run: AgentRunResponse | null;
  history: AgentRunResponse[];
  isRunning: boolean;
};

export function AnswerPanel({ run, history, isRunning }: AnswerPanelProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const markdown = run?.answer?.markdown;

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function toggleSpeech() {
    if (!markdown) return;

    if (!("speechSynthesis" in window)) {
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(markdownToSpeechText(markdown));
    utterance.lang = "de-DE";
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className="answer-panel surface" aria-labelledby="answer-title" aria-busy={isRunning}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Antwort</p>
          <h2 id="answer-title">{run?.answer?.summary ?? "Agent Output"}</h2>
        </div>
        <div className="answer-actions">
          <button type="button" className="icon-button" onClick={toggleSpeech} disabled={!markdown}>
            {isSpeaking ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            <span className="sr-only">{isSpeaking ? "Vorlesen stoppen" : "Antwort vorlesen"}</span>
          </button>
          <button type="button" className="icon-button" onClick={() => downloadChatHistoryPdf(history)} disabled={!history.length}>
            <Download size={18} aria-hidden="true" />
            <span className="sr-only">Chatverlauf als PDF herunterladen</span>
          </button>
        </div>
      </div>

      {isRunning ? (
        <div className="loading-state">
          <Loader2 size={22} aria-hidden="true" className="spin" />
          <span>Agent verarbeitet Anfrage und sammelt Belege.</span>
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
          <p>Stelle eine Frage per Text oder Sprache, um die Antwort und Docling-Belege zu sehen.</p>
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
    .trim();
}
