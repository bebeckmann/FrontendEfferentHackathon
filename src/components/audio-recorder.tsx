"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type AudioRecorderProps = {
  disabled: boolean;
  onSubmitAudio: (audio: Blob) => void;
};

const MAX_RECORDING_MS = 60_000;

export function AudioRecorder({ disabled, onSubmitAudio }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "error">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (recordingState !== "recording") return;

    const timer = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);

      if (elapsed >= MAX_RECORDING_MS) {
        stopRecording();
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [recordingState]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    setMessage(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingState("error");
      setMessage("Audioaufnahme wird in diesem Browser nicht unterstuetzt.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordingState("idle");
        setMessage("Transkription startet automatisch.");
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        onSubmitAudio(blob);
      };

      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setRecordingState("recording");
      recorder.start();
    } catch {
      setRecordingState("error");
      setMessage("Mikrofonzugriff wurde verweigert oder ist nicht verfuegbar.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const isRecording = recordingState === "recording";
  const helperText = isRecording
    ? `Aufnahme laeuft ${formatDuration(elapsedMs)}`
    : disabled
      ? "Transkription oder Agent-Antwort laeuft."
      : message ?? "Optional per Mikrofon fragen.";

  return (
    <section className="audio-recorder" aria-labelledby="audio-title">
      <div>
        <p id="audio-title" className="field-label">
          Sprache
        </p>
        <p className="helper-text" aria-live="polite">
          {helperText}
        </p>
      </div>

      <div className="audio-actions">
        {isRecording ? (
          <button type="button" className="danger-button" onClick={stopRecording}>
            <Square size={16} aria-hidden="true" />
            Stop
          </button>
        ) : (
          <button type="button" className="secondary-button" onClick={startRecording} disabled={disabled}>
            <Mic size={16} aria-hidden="true" />
            Aufnehmen
          </button>
        )}
      </div>
    </section>
  );
}

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}
