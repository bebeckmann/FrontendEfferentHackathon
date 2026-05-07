"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type AudioRecorderProps = {
  disabled: boolean;
  onTranscript: (text: string) => void;
};

type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionLike = EventTarget & {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function AudioRecorder({ disabled, onTranscript }: AudioRecorderProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "error">("idle");

  function startRecording() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setRecordingState("error");
      return;
    }

    try {
      const recognition = new Recognition();
      finalTranscriptRef.current = "";
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        finalTranscriptRef.current = transcript;
      };

      recognition.onend = () => {
        setRecordingState("idle");
        const transcript = finalTranscriptRef.current.trim();
        recognitionRef.current = null;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      recognition.onerror = () => {
        setRecordingState("error");
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      setRecordingState("recording");
      recognition.start();
    } catch {
      setRecordingState("error");
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop();
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
