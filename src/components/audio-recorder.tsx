"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type AudioRecorderProps = {
  disabled: boolean;
  onSubmitAudio: (audio: Blob) => void;
};

const MAX_RECORDING_MS = 45_000;

export function AudioRecorder({ disabled, onSubmitAudio }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);

  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "error"
  >("idle");

  useEffect(() => {
    if (recordingState !== "recording") return;

    const timer = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;

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
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setRecordingState("idle");
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        startedAtRef.current = null;

        onSubmitAudio(blob);
      };

      startedAtRef.current = Date.now();
      setRecordingState("recording");
      recorder.start();
    } catch {
      setRecordingState("error");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const isRecording = recordingState === "recording";

  return isRecording ? (
    <button
      type="button"
      className="chat-icon-button recording"
      onClick={stopRecording}
      aria-label="Aufnahme stoppen"
      title="Aufnahme stoppen"
    >
      <Square size={20} aria-hidden="true" />
    </button>
  ) : (
    <button
      type="button"
      className="chat-icon-button"
      onClick={startRecording}
      disabled={disabled}
      aria-label="Audio aufnehmen"
      title="Audio aufnehmen"
    >
      <Mic size={22} aria-hidden="true" />
    </button>
  );
}

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/wav",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}