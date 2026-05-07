"use client";

import ReactMarkdown from "react-markdown";
import { Download, Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const TTS_ENDPOINT = "/api/tts";

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
  const [loadingSpeechRunId, setLoadingSpeechRunId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedRun = useMemo(
    () => history.find((run) => run.runId === selectedRunId) ?? history.at(-1) ?? null,
    [history, selectedRunId]
  );

  useEffect(() => {
    console.info("[TTS] ChatInterface mounted", {
      endpoint: TTS_ENDPOINT,
      origin: typeof window !== "undefined" ? window.location.origin : null,
      speechSynthesisAvailable:
        typeof window !== "undefined" && "speechSynthesis" in window,
    });

    return () => {
      console.info("[TTS] ChatInterface unmounted. Stopping audio.");
      stopSpeech();
    };
  }, []);

  function stopSpeech() {
    console.info("[TTS] stopSpeech called", {
      speakingRunId,
      loadingSpeechRunId,
      hasAudio: Boolean(audioRef.current),
      hasObjectUrl: Boolean(audioUrlRef.current),
      hasAbortController: Boolean(abortControllerRef.current),
    });

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setSpeakingRunId(null);
    setLoadingSpeechRunId(null);
  }

  async function toggleSpeech(run: AgentRunResponse) {
    const markdown = run.answer?.markdown;

    console.info("[TTS] toggleSpeech clicked", {
      runId: run.runId,
      hasMarkdown: Boolean(markdown),
      currentSpeakingRunId: speakingRunId,
      currentLoadingSpeechRunId: loadingSpeechRunId,
      endpoint: TTS_ENDPOINT,
    });

    if (!markdown) {
      console.warn("[TTS] No markdown found. Aborting.");
      return;
    }

    if (speakingRunId === run.runId || loadingSpeechRunId === run.runId) {
      console.info("[TTS] Same run is already speaking/loading. Stopping.");
      stopSpeech();
      return;
    }

    if (speakingRunId || loadingSpeechRunId) {
      console.info("[TTS] Another run is active. Stopping it before starting new one.", {
        previousSpeakingRunId: speakingRunId,
        previousLoadingSpeechRunId: loadingSpeechRunId,
        nextRunId: run.runId,
      });
      stopSpeech();
    }

    const text = markdownToSpeechText(markdown);

    console.info("[TTS] Prepared speech text", {
      runId: run.runId,
      markdownLength: markdown.length,
      textLength: text.length,
      textPreview: text.slice(0, 160),
    });

    if (!text) {
      console.warn("[TTS] Speech text is empty after markdown cleanup. Aborting.");
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoadingSpeechRunId(run.runId);

      const requestBody = {
        text,
        voice: "marin",
        format: "mp3",
        instructions:
          "Sprich auf Deutsch klar, natürlich und ruhig. Nutze eine sachliche Stimme und passende kurze Pausen.",
      };

      console.info("[TTS] Sending OpenRouter TTS request through backend", {
        url: TTS_ENDPOINT,
        absoluteUrl:
          typeof window !== "undefined"
            ? new URL(TTS_ENDPOINT, window.location.origin).toString()
            : TTS_ENDPOINT,
        method: "POST",
        voice: requestBody.voice,
        format: requestBody.format,
        instructions: requestBody.instructions,
        textLength: text.length,
      });

      const response = await fetch(TTS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
        body: JSON.stringify(requestBody),
      });

      console.info("[TTS] Backend response received", {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
        generationId: response.headers.get("x-generation-id"),
        ttsModel: response.headers.get("x-tts-model"),
        ttsVoice: response.headers.get("x-tts-voice"),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("[TTS] Backend returned error", {
          status: response.status,
          errorText,
        });
        throw new Error(errorText || `TTS failed with status ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.startsWith("audio/")) {
        const responseText = await response.text().catch(() => "");
        console.error("[TTS] Expected audio response but received non-audio content", {
          contentType,
          responsePreview: responseText.slice(0, 500),
        });
        throw new Error(`Expected audio response, got ${contentType}`);
      }

      const audioBlob = await response.blob();

      console.info("[TTS] Audio blob created", {
        size: audioBlob.size,
        type: audioBlob.type,
      });

      if (!audioBlob.size) {
        throw new Error("TTS response contained empty audio blob.");
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        console.info("[TTS] Audio metadata loaded", {
          duration: audio.duration,
          src: audio.src.slice(0, 80),
        });
      };

      audio.onplay = () => {
        console.info("[TTS] Audio playback started", {
          runId: run.runId,
        });
      };

      audio.onended = () => {
        console.info("[TTS] Audio playback ended", {
          runId: run.runId,
        });
        stopSpeech();
      };

      audio.onerror = () => {
        console.error("[TTS] Audio playback error", {
          runId: run.runId,
          error: audio.error,
        });
        stopSpeech();
      };

      await audio.play();

      setLoadingSpeechRunId(null);
      setSpeakingRunId(run.runId);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.info("[TTS] TTS request aborted");
        return;
      }

      console.error("[TTS] TTS playback failed", error);
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
                    <span>Answer</span>
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
                      {isThisRunSpeaking || isThisRunLoadingSpeech
                        ? "Vorlesen stoppen"
                        : "Antwort vorlesen"}
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
          onSubmitText={onSubmitText}
          onSubmitAudio={onSubmitAudio}
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